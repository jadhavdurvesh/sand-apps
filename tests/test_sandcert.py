import base64
import json
import os
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
TOOL = ROOT / "tools" / "sandcert.py"


class SandCertificateTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(prefix="sand-trust-test-")
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.authority = self.root / "authority"
        self.publisher = self.root / "publisher"
        self.store = self.root / "trust.json"
        self.package = self.root / "sample.sandpkg"
        self.signed = self.root / "sample.signed.sandpkg"
        self.package.write_text(json.dumps({
            "format": "SANDPKG", "formatVersion": 1,
            "manifest": {"id": "sample-app", "name": "Sample App", "version": "1.0.0",
                         "description": "A signed test package", "capabilities": [], "entrypoint": "app.js"},
            "files": [{"path": "app.js", "content": "export function mount() {}"}]
        }), encoding="utf-8")
        self.command("authority-init", "--name", "SAND Test Root", "--output", str(self.authority))
        self.command("publisher-issue", "--authority", str(self.authority / "authority.json"),
                     "--root-key", str(self.authority / "root-private.pem"),
                     "--publisher-id", "test-publisher", "--subject", "SAND Test Publisher",
                     "--output", str(self.publisher))
        self.command("trust-root", "--authority", str(self.authority / "authority.json"),
                     "--store", str(self.store))

    def command(self, *args, ok=True):
        result = subprocess.run([sys.executable, str(TOOL), *args], text=True,
                                stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        if ok and result.returncode:
            self.fail(result.stdout + result.stderr)
        if not ok and result.returncode == 0:
            self.fail("command unexpectedly succeeded: " + " ".join(args))
        return result

    def sign(self):
        self.command("sign", str(self.package),
                     "--certificate", str(self.publisher / "publisher-cert.json"),
                     "--private-key", str(self.publisher / "publisher-private.pem"),
                     "-o", str(self.signed))

    def test_trusted_publisher_package_signs_and_verifies(self):
        self.sign()
        result = self.command("verify", str(self.signed), "--trust-store", str(self.store))
        self.assertIn("SAND TRUST: VERIFIED", result.stdout)
        self.assertIn("SAND Test Publisher", result.stdout)

    def test_unsigned_package_is_blocked(self):
        self.command("verify", str(self.package), "--trust-store", str(self.store), ok=False)

    def test_modified_package_is_blocked(self):
        self.sign()
        package = json.loads(self.signed.read_text(encoding="utf-8"))
        package["files"][0]["content"] += "// tampered"
        self.signed.write_text(json.dumps(package), encoding="utf-8")
        self.command("verify", str(self.signed), "--trust-store", str(self.store), ok=False)

    def test_untrusted_root_is_blocked(self):
        self.sign()
        empty = self.root / "empty-trust.json"
        empty.write_text(json.dumps({"format": "SAND-TRUST-STORE", "version": 1, "roots": []}))
        self.command("verify", str(self.signed), "--trust-store", str(empty), ok=False)

    def test_signature_cannot_be_reused_for_another_package(self):
        self.sign()
        package = json.loads(self.signed.read_text(encoding="utf-8"))
        package["manifest"]["id"] = "other-app"
        self.signed.write_text(json.dumps(package), encoding="utf-8")
        self.command("verify", str(self.signed), "--trust-store", str(self.store), ok=False)

    def test_signing_key_must_match_publisher_certificate(self):
        other = self.root / "other-key.pem"
        subprocess.run(["openssl", "genpkey", "-algorithm", "ED25519", "-out", str(other)], check=True)
        result = self.command("sign", str(self.package),
                              "--certificate", str(self.publisher / "publisher-cert.json"),
                              "--private-key", str(other), "-o", str(self.signed), ok=False)
        self.assertIn("key", result.stderr.lower())


if __name__ == "__main__":
    unittest.main()
