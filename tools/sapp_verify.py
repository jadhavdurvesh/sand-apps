#!/usr/bin/env python3
"""Verify SAPP v2 Ed25519 signatures against an explicit SAND root trust store."""
import argparse
import base64
import hashlib
import json
import struct
import subprocess
import sys
import tempfile
from datetime import datetime, timezone
from pathlib import Path

HEADER = struct.Struct("<4sHH12I8s")
DOMAIN = b"SAND-SAPP-V2-ED25519\x00"


class VerifyError(ValueError):
    pass


def canonical(value):
    return json.dumps(value, sort_keys=True, separators=(",", ":"), ensure_ascii=False).encode("utf-8")


def openssl(*args, input_bytes=None):
    try:
        result = subprocess.run(["openssl", *args], input=input_bytes, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    except FileNotFoundError as exc:
        raise VerifyError("OpenSSL 3.x is required") from exc
    if result.returncode:
        raise VerifyError(result.stderr.decode("utf-8", "replace").strip() or "OpenSSL failed")
    return result.stdout


def fingerprint(pem):
    der = openssl("pkey", "-pubin", "-outform", "DER", input_bytes=pem)
    return hashlib.sha256(der).hexdigest()


def verify_signature(pem, data, signature):
    with tempfile.TemporaryDirectory(prefix="sapp-verify-") as temp:
        pub, payload, sig = Path(temp) / "pub.pem", Path(temp) / "payload.bin", Path(temp) / "sig.bin"
        pub.write_bytes(pem)
        payload.write_bytes(data)
        sig.write_bytes(signature)
        try:
            openssl("pkeyutl", "-verify", "-pubin", "-inkey", str(pub), "-rawin",
                    "-in", str(payload), "-sigfile", str(sig))
            return True
        except VerifyError:
            return False


def parse_time(value):
    if not isinstance(value, str):
        raise VerifyError("certificate validity timestamp is missing")
    try:
        result = datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError as exc:
        raise VerifyError("invalid certificate validity timestamp") from exc
    if result.tzinfo is None:
        raise VerifyError("certificate timestamps must include a timezone")
    return result.astimezone(timezone.utc)


def verify(path, trust_path):
    data = Path(path).read_bytes()
    if len(data) < HEADER.size:
        raise VerifyError("file is shorter than SAPP header")
    fields = HEADER.unpack_from(data)
    (magic, version, arch, hsize, flags, entry, seg_off, seg_count,
     meta_off, meta_size, file_size, sig_off, sig_size, reloc_off,
     reloc_count, reserved) = fields
    if magic != b"SAPP" or version != 2 or arch != 1 or hsize != 64:
        raise VerifyError("expected SAPP v2 x86-32 executable")
    if flags or reserved != bytes(8) or file_size != len(data):
        raise VerifyError("invalid header flags, reserved bytes, or file size")
    if not sig_size or sig_off < HEADER.size or sig_off + sig_size != len(data):
        raise VerifyError("invalid signature block bounds")
    if sig_off < meta_off + meta_size:
        raise VerifyError("signature block overlaps executable metadata")
    try:
        block = json.loads(data[sig_off:])
    except (UnicodeDecodeError, json.JSONDecodeError) as exc:
        raise VerifyError("signature block is not valid UTF-8 JSON") from exc
    if not isinstance(block, dict) or block.get("format") != "SAND-SAPP-SIGNATURE" or block.get("version") != 1 or block.get("algorithm") != "Ed25519":
        raise VerifyError("unsupported SAPP signature block")
    cert = block.get("publisherCertificate")
    if not isinstance(cert, dict) or cert.get("format") != "SAND-PUBLISHER-CERT" or cert.get("version") != 1:
        raise VerifyError("missing or invalid publisher certificate")
    if cert.get("keyUsage") != ["codeSigning"]:
        raise VerifyError("certificate is not authorized for code signing")
    now = datetime.now(timezone.utc)
    if not parse_time(cert.get("notBefore")) <= now <= parse_time(cert.get("notAfter")):
        raise VerifyError("publisher certificate is expired or not yet valid")
    pub = cert.get("publicKeyPem", "").encode("ascii")
    if fingerprint(pub) != cert.get("keyId"):
        raise VerifyError("publisher public-key fingerprint mismatch")
    trust = json.loads(Path(trust_path).read_text(encoding="utf-8"))
    if not isinstance(trust, dict) or trust.get("format") != "SAND-TRUST-STORE" or not isinstance(trust.get("roots"), list):
        raise VerifyError("invalid SAND trust store")
    root = next((item for item in trust["roots"] if item.get("keyId") == cert.get("issuerKeyId") and item.get("status") == "trusted"), None)
    if not root:
        raise VerifyError("publisher certificate chains to no trusted SAND root")
    root_pem = root.get("publicKeyPem", "").encode("ascii")
    if fingerprint(root_pem) != root.get("keyId"):
        raise VerifyError("trusted root fingerprint mismatch")
    cert_unsigned = dict(cert)
    issuer_sig = cert_unsigned.pop("issuerSignature", None)
    try:
        issuer_sig = base64.b64decode(issuer_sig, validate=True)
        package_sig = base64.b64decode(block.get("signature", ""), validate=True)
    except (ValueError, TypeError) as exc:
        raise VerifyError("malformed base64 signature") from exc
    if len(package_sig) != 64 or not verify_signature(root_pem, canonical(cert_unsigned), issuer_sig):
        raise VerifyError("publisher certificate issuer signature is invalid")
    if not verify_signature(pub, DOMAIN + data[:sig_off], package_sig):
        raise VerifyError("SAPP executable signature is invalid or the image was modified")
    print("SAND TRUST: VERIFIED")
    print(f"SAPP: v2 x86-32, {len(data)} bytes")
    print(f"Publisher: {cert.get('subject')} ({cert.get('publisherId')})")
    print(f"Publisher key: {cert.get('keyId')}")
    print(f"Trusted root: {root.get('name')} ({root.get('keyId')})")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("executable")
    parser.add_argument("--trust-store", required=True)
    args = parser.parse_args()
    try:
        verify(args.executable, args.trust_store)
    except (OSError, UnicodeError, json.JSONDecodeError, KeyError, TypeError, ValueError, struct.error, VerifyError) as exc:
        print(f"sapp-verify: BLOCKED: {exc}", file=sys.stderr)
        return 2
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
