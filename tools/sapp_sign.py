#!/usr/bin/env python3
"""Convert an unsigned SAPP v1 image into a signed SAPP v2 image."""
import argparse
import base64
import json
import os
import struct
import sys
import tempfile
import subprocess
from pathlib import Path
from datetime import datetime, timezone

HEADER = struct.Struct("<4sHH12I8s")
DOMAIN = b"SAND-SAPP-V2-ED25519\x00"
ALG = "Ed25519"


class SignError(ValueError):
    pass


def canonical(value):
    return json.dumps(value, sort_keys=True, separators=(",", ":"), ensure_ascii=False).encode("utf-8")


def openssl(*args):
    try:
        result = subprocess.run(["openssl", *args], stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    except FileNotFoundError as exc:
        raise SignError("OpenSSL 3.x is required") from exc
    if result.returncode:
        raise SignError(result.stderr.decode("utf-8", "replace").strip() or "OpenSSL failed")
    return result.stdout


def public_from_private(path):
    return openssl("pkey", "-in", str(path), "-pubout")


def sign(private_key, data):
    with tempfile.TemporaryDirectory(prefix="sapp-v2-") as temp:
        src, sig = Path(temp) / "image.bin", Path(temp) / "signature.bin"
        src.write_bytes(data)
        openssl("pkeyutl", "-sign", "-rawin", "-inkey", str(private_key), "-in", str(src), "-out", str(sig))
        return sig.read_bytes()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("input", help="unsigned SAPP v1 image")
    parser.add_argument("-o", "--output", required=True)
    parser.add_argument("--certificate", required=True)
    parser.add_argument("--private-key", required=True)
    args = parser.parse_args()
    try:
        source = Path(args.input).read_bytes()
        if len(source) < HEADER.size:
            raise SignError("input is shorter than the SAPP header")
        from importlib.util import module_from_spec, spec_from_file_location
        spec = spec_from_file_location("sapp_inspect", Path(__file__).with_name("sapp_inspect.py"))
        inspector = module_from_spec(spec)
        spec.loader.exec_module(inspector)
        inspector.inspect(source)
        fields = list(HEADER.unpack_from(source))
        if fields[0] != b"SAPP" or fields[1] != 1:
            raise SignError("input must be an unsigned SAPP v1 image")
        if fields[11] or fields[12]:
            raise SignError("input already contains signature data")
        cert = json.loads(Path(args.certificate).read_text(encoding="utf-8"))
        if cert.get("format") != "SAND-PUBLISHER-CERT" or cert.get("version") != 1 or cert.get("keyUsage") != ["codeSigning"]:
            raise SignError("invalid publisher code-signing certificate")
        if not isinstance(cert.get("publicKeyPem"), str) or not isinstance(cert.get("keyId"), str) or not isinstance(cert.get("issuerSignature"), str):
            raise SignError("publisher certificate is incomplete")
        if not isinstance(cert.get("notBefore"), str) or not isinstance(cert.get("notAfter"), str):
            raise SignError("publisher certificate validity period is malformed")
        if public_from_private(args.private_key) != cert["publicKeyPem"].encode("ascii"):
            raise SignError("publisher private key does not match certificate")
        now = datetime.now(timezone.utc)
        before = datetime.fromisoformat(cert["notBefore"].replace("Z", "+00:00"))
        after = datetime.fromisoformat(cert["notAfter"].replace("Z", "+00:00"))
        if not before <= now <= after:
            raise SignError("publisher certificate is not currently valid")
        sig_offset = len(source)
        block = {"format": "SAND-SAPP-SIGNATURE", "version": 1, "algorithm": ALG,
                 "publisherCertificate": cert, "signature": base64.b64encode(bytes(64)).decode("ascii")}
        block_bytes = canonical(block)
        fields[1] = 2
        fields[10] = sig_offset + len(block_bytes)
        fields[11] = sig_offset
        fields[12] = len(block_bytes)
        header = HEADER.pack(*fields)
        signed_region = header + source[HEADER.size:]
        signature = sign(args.private_key, DOMAIN + signed_region)
        block["signature"] = base64.b64encode(signature).decode("ascii")
        final_block = canonical(block)
        if len(final_block) != len(block_bytes):
            raise SignError("signature block size changed unexpectedly")
        output = Path(args.output)
        output.parent.mkdir(parents=True, exist_ok=True)
        output.write_bytes(header + source[HEADER.size:] + final_block)
        print(f"Signed SAPP v2: {output} ({fields[10]} bytes)")
        print(f"Publisher: {cert.get('subject')} [{cert.get('keyId')}]")
    except (OSError, UnicodeError, json.JSONDecodeError, KeyError, TypeError, ValueError, struct.error, SignError) as exc:
        print(f"sapp-sign: BLOCKED: {exc}", file=sys.stderr)
        return 2
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
