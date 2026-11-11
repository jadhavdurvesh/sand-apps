#!/usr/bin/env python3
"""SAND Trust & Code Integrity (STCI): Ed25519 publisher certificates and package signatures.

Requires OpenSSL 3.x on PATH. Private keys are generated locally and are never uploaded.
"""
import argparse
import base64
import hashlib
import json
import os
import re
import subprocess
import sys
import tempfile
from datetime import datetime, timedelta, timezone
from pathlib import Path

FORMAT = "SANDPKG"
ALGORITHM = "Ed25519"
CERT_VERSION = 1


class TrustError(ValueError):
    pass


def canonical(value):
    return json.dumps(value, sort_keys=True, separators=(",", ":"), ensure_ascii=False).encode("utf-8")


def run_openssl(*args, input_bytes=None):
    try:
        result = subprocess.run(["openssl", *args], input=input_bytes, stdout=subprocess.PIPE,
                                stderr=subprocess.PIPE, check=False)
    except FileNotFoundError as exc:
        raise TrustError("OpenSSL is required; install OpenSSL 3.x and add it to PATH") from exc
    if result.returncode:
        message = result.stderr.decode("utf-8", "replace").strip()
        raise TrustError("OpenSSL operation failed: " + (message or "unknown error"))
    return result.stdout


def key_id(public_pem):
    der = run_openssl("pkey", "-pubin", "-outform", "DER", input_bytes=public_pem)
    return hashlib.sha256(der).hexdigest()


def sign_bytes(private_key, data):
    with tempfile.TemporaryDirectory(prefix="sand-stci-") as tmp:
        src, sig = Path(tmp) / "payload.bin", Path(tmp) / "signature.bin"
        src.write_bytes(data)
        run_openssl("pkeyutl", "-sign", "-rawin", "-inkey", str(private_key), "-in", str(src), "-out", str(sig))
        return sig.read_bytes()


def verify_bytes(public_key_pem, data, signature):
    with tempfile.TemporaryDirectory(prefix="sand-stci-") as tmp:
        pub, src, sig = Path(tmp) / "publisher.pem", Path(tmp) / "payload.bin", Path(tmp) / "signature.bin"
        pub.write_bytes(public_key_pem)
        src.write_bytes(data)
        sig.write_bytes(signature)
        try:
            run_openssl("pkeyutl", "-verify", "-pubin", "-inkey", str(pub), "-rawin",
                        "-in", str(src), "-sigfile", str(sig))
            return True
        except TrustError:
            return False


def write_json(path, data):
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


def read_json(path):
    try:
        data = json.loads(Path(path).read_text(encoding="utf-8"))
    except (OSError, UnicodeError, json.JSONDecodeError) as exc:
        raise TrustError(f"cannot read JSON file {path}: {exc}") from exc
    if not isinstance(data, dict):
        raise TrustError(f"{path} must contain a JSON object")
    return data


def utc_now():
    return datetime.now(timezone.utc)


def iso_time(value):
    if not isinstance(value, str):
        raise TrustError("certificate time is missing")
    try:
        parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError as exc:
        raise TrustError("invalid certificate time") from exc
    if parsed.tzinfo is None:
        raise TrustError("certificate times must include a timezone")
    return parsed.astimezone(timezone.utc)


def public_pem(private_key):
    return run_openssl("pkey", "-in", str(private_key), "-pubout")


def authority_init(args):
    out = Path(args.output).resolve()
    out.mkdir(parents=True, exist_ok=True)
    private = out / "root-private.pem"
    public = out / "root-public.pem"
    if private.exists() or public.exists():
        raise TrustError("refusing to overwrite existing authority keys")
    run_openssl("genpkey", "-algorithm", "ED25519", "-out", str(private))
    os.chmod(private, 0o600)
    public.write_bytes(public_pem(private))
    authority = {"format": "SAND-ROOT", "version": 1, "name": args.name,
                 "keyId": key_id(public.read_bytes()), "publicKeyPem": public.read_text(encoding="ascii")}
    write_json(out / "authority.json", authority)
    print(f"Created offline SAND root authority: {out}")
    print(f"Root key ID: {authority['keyId']}")
    print("BACK UP root-private.pem securely. Never distribute or commit the private key.")


def publisher_issue(args):
    authority = read_json(args.authority)
    root_key = Path(args.root_key)
    if authority.get("format") != "SAND-ROOT" or not root_key.is_file():
        raise TrustError("invalid authority descriptor or missing root private key")
    root_public = authority["publicKeyPem"].encode("ascii")
    if key_id(root_public) != authority.get("keyId"):
        raise TrustError("authority public key fingerprint mismatch")
    out = Path(args.output).resolve()
    out.mkdir(parents=True, exist_ok=True)
    private, public = out / "publisher-private.pem", out / "publisher-public.pem"
    if private.exists() or public.exists():
        raise TrustError("refusing to overwrite existing publisher keys")
    run_openssl("genpkey", "-algorithm", "ED25519", "-out", str(private))
    os.chmod(private, 0o600)
    public_bytes = public_pem(private)
    public.write_bytes(public_bytes)
    now = utc_now()
    cert = {"format": "SAND-PUBLISHER-CERT", "version": CERT_VERSION,
            "publisherId": args.publisher_id, "subject": args.subject,
            "publicKeyPem": public_bytes.decode("ascii"),
            "keyId": key_id(public_bytes), "issuerKeyId": authority["keyId"],
            "notBefore": now.isoformat(), "notAfter": (now + timedelta(days=365 * args.years)).isoformat(),
            "keyUsage": ["codeSigning"]}
    cert["issuerSignature"] = base64.b64encode(sign_bytes(root_key, canonical(cert))).decode("ascii")
    write_json(out / "publisher-cert.json", cert)
    print(f"Issued publisher certificate for {args.subject}")
    print(f"Publisher key ID: {cert['keyId']}")
    print(f"Certificate: {out / 'publisher-cert.json'}")
    print("Keep publisher-private.pem private; give distributors only the certificate and signed packages.")


def trust_root(args):
    authority = read_json(args.authority)
    if authority.get("format") != "SAND-ROOT" or key_id(authority.get("publicKeyPem", "").encode("ascii")) != authority.get("keyId"):
        raise TrustError("invalid root authority descriptor")
    path = Path(args.store)
    store = read_json(path) if path.exists() else {"format": "SAND-TRUST-STORE", "version": 1, "roots": []}
    if store.get("format") != "SAND-TRUST-STORE" or not isinstance(store.get("roots"), list):
        raise TrustError("invalid trust store")
    if any(item.get("keyId") == authority["keyId"] for item in store["roots"]):
        raise TrustError("root is already trusted")
    store["roots"].append({"keyId": authority["keyId"], "name": authority["name"],
                           "publicKeyPem": authority["publicKeyPem"], "status": "trusted"})
    write_json(path, store)
    print(f"Trusted root {authority['name']} ({authority['keyId']}) in {path}")


def unsigned_package(package):
    clean = dict(package)
    clean.pop("signature", None)
    return clean


def sign_package(args):
    package = read_json(args.package)
    if package.get("format") != FORMAT or package.get("formatVersion") != 1:
        raise TrustError("only SANDPKG v1 packages can be signed")
    if "signature" in package:
        raise TrustError("package already contains a signature; rebuild or remove it before signing")
    cert = read_json(args.certificate)
    if cert.get("format") != "SAND-PUBLISHER-CERT" or cert.get("keyUsage") != ["codeSigning"]:
        raise TrustError("invalid publisher code-signing certificate")
    pub = cert.get("publicKeyPem", "").encode("ascii")
    if key_id(pub) != cert.get("keyId"):
        raise TrustError("publisher certificate public key fingerprint mismatch")
    if public_pem(args.private_key) != pub:
        raise TrustError("publisher private key does not match the certificate public key")
    signature = sign_bytes(args.private_key, canonical(unsigned_package(package)))
    package["signature"] = {"algorithm": ALGORITHM, "publisherCertificate": cert,
                            "value": base64.b64encode(signature).decode("ascii")}
    write_json(args.output, package)
    print(f"Signed {args.output} as {cert['subject']} ({cert['keyId']})")


def verify_package(args):
    package = read_json(args.package)
    sig = package.get("signature")
    if not isinstance(sig, dict) or sig.get("algorithm") != ALGORITHM:
        raise TrustError("unsigned or unsupported package: execution must be blocked")
    cert = sig.get("publisherCertificate")
    if not isinstance(cert, dict) or cert.get("format") != "SAND-PUBLISHER-CERT" or cert.get("version") != CERT_VERSION:
        raise TrustError("missing or invalid publisher certificate")
    now = utc_now()
    if not iso_time(cert.get("notBefore")) <= now <= iso_time(cert.get("notAfter")):
        raise TrustError("publisher certificate is not currently valid")
    if cert.get("keyUsage") != ["codeSigning"]:
        raise TrustError("certificate is not authorized for code signing")
    pub = cert.get("publicKeyPem", "").encode("ascii")
    if key_id(pub) != cert.get("keyId"):
        raise TrustError("publisher key fingerprint mismatch")
    store = read_json(args.trust_store)
    if store.get("format") != "SAND-TRUST-STORE" or not isinstance(store.get("roots"), list):
        raise TrustError("invalid trust store")
    root = next((r for r in store["roots"] if r.get("keyId") == cert.get("issuerKeyId") and r.get("status") == "trusted"), None)
    if not root:
        raise TrustError("publisher chain does not terminate at a trusted SAND root")
    root_pem = root.get("publicKeyPem", "").encode("ascii")
    if key_id(root_pem) != root.get("keyId"):
        raise TrustError("trusted root key fingerprint mismatch")
    cert_unsigned = dict(cert)
    issuer_signature = cert_unsigned.pop("issuerSignature", None)
    try:
        cert_sig = base64.b64decode(issuer_signature, validate=True)
        package_sig = base64.b64decode(sig.get("value", ""), validate=True)
    except (ValueError, TypeError) as exc:
        raise TrustError("invalid base64 signature encoding") from exc
    if not verify_bytes(root_pem, canonical(cert_unsigned), cert_sig):
        raise TrustError("publisher certificate issuer signature is invalid")
    if not verify_bytes(pub, canonical(unsigned_package(package)), package_sig):
        raise TrustError("package signature is invalid: package may have been modified")
    manifest = package.get("manifest", {})
    if not isinstance(manifest, dict):
        raise TrustError("package manifest is invalid")
    print("SAND TRUST: VERIFIED")
    print(f"Publisher: {cert.get('subject')} ({cert.get('publisherId')})")
    print(f"Application: {manifest.get('id')} v{manifest.get('version')}")
    print(f"Root: {root.get('name')} ({root.get('keyId')})")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    sub = parser.add_subparsers(dest="command", required=True)
    init = sub.add_parser("authority-init", help="create an offline root authority")
    init.add_argument("--name", required=True)
    init.add_argument("--output", required=True)
    issue = sub.add_parser("publisher-issue", help="issue a publisher code-signing certificate")
    issue.add_argument("--authority", required=True)
    issue.add_argument("--root-key", required=True)
    issue.add_argument("--publisher-id", required=True)
    issue.add_argument("--subject", required=True)
    issue.add_argument("--years", type=int, default=2)
    issue.add_argument("--output", required=True)
    trust = sub.add_parser("trust-root", help="add a root to a local trust store")
    trust.add_argument("--authority", required=True)
    trust.add_argument("--store", required=True)
    sign = sub.add_parser("sign", help="sign a SANDPKG v1 package")
    sign.add_argument("package")
    sign.add_argument("--certificate", required=True)
    sign.add_argument("--private-key", required=True)
    sign.add_argument("-o", "--output", required=True)
    verify = sub.add_parser("verify", help="verify certificate chain and package signature")
    verify.add_argument("package")
    verify.add_argument("--trust-store", required=True)
    args = parser.parse_args()
    try:
        if args.command == "authority-init":
            authority_init(args)
        elif args.command == "publisher-issue":
            if not 1 <= args.years <= 10:
                raise TrustError("certificate lifetime must be 1–10 years")
            publisher_issue(args)
        elif args.command == "trust-root":
            trust_root(args)
        elif args.command == "sign":
            sign_package(args)
        elif args.command == "verify":
            verify_package(args)
    except (OSError, UnicodeError, TrustError, KeyError, TypeError, ValueError) as exc:
        print(f"sandcert: BLOCKED: {exc}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
