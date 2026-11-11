import importlib.util
import json
import pathlib
import subprocess
import sys
import tempfile
import unittest

ROOT = pathlib.Path(__file__).resolve().parents[1]
def load(name, path):
    spec = importlib.util.spec_from_file_location(name, ROOT / path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module

packer = load("sapp_pack_v2_test", "tools/sapp_pack.py")
inspector = load("sapp_inspect_v2_test", "tools/sapp_inspect.py")
sign_tool = ROOT / "tools" / "sapp_sign.py"
verify_tool = ROOT / "tools" / "sapp_verify.py"
cert_tool = ROOT / "tools" / "sandcert.py"


class SappV2Tests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory(prefix="sand-sapp-v2-test-")
        self.addCleanup(self.tmp.cleanup)
        self.root = pathlib.Path(self.tmp.name)
        self.authority = self.root / "root"
        self.publisher = self.root / "publisher"
        self.trust = self.root / "trust.json"
        self.v1 = self.root / "app-v1.sapp"
        self.v2 = self.root / "app-v2.sapp"
        self.make_authority()
        self.make_v1()

    def run_tool(self, tool, *args, ok=True):
        result = subprocess.run([sys.executable, str(tool), *map(str, args)],
                                stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
        if ok and result.returncode:
            self.fail(result.stdout + result.stderr)
        if not ok and result.returncode == 0:
            self.fail("command unexpectedly succeeded: " + str(tool))
        return result

    def make_authority(self):
        self.run_tool(cert_tool, "authority-init", "--name", "SAPP Test Root", "--output", self.authority)
        self.run_tool(cert_tool, "publisher-issue", "--authority", self.authority / "authority.json",
                      "--root-key", self.authority / "root-private.pem", "--publisher-id", "sapp-test",
                      "--subject", "SAPP Test Publisher", "--output", self.publisher)
        self.run_tool(cert_tool, "trust-root", "--authority", self.authority / "authority.json",
                      "--store", self.trust)

    def make_v1(self):
        ident = b"\x7fELF\x01\x01\x01" + bytes(9)
        header = packer.ELF_HEADER.pack(ident, 2, 3, 1, 0x40000000,
            packer.ELF_HEADER.size, 0, 0, packer.ELF_HEADER.size,
            packer.ELF_PROGRAM.size, 1, 0, 0, 0)
        payload_offset = 4096
        payload = b"\x90\xEB\xFE"
        ph = packer.ELF_PROGRAM.pack(1, payload_offset, 0x40000000, 0,
                                     len(payload), 4096, 5, 4096)
        elf = self.root / "app.elf"
        elf.write_bytes(header + ph + bytes(payload_offset - len(header) - len(ph)) + payload)
        packer.pack(elf, self.v1, "sapp-v2-test", "1.0.0")

    def sign(self):
        self.run_tool(sign_tool, self.v1, "-o", self.v2,
                      "--certificate", self.publisher / "publisher-cert.json",
                      "--private-key", self.publisher / "publisher-private.pem")

    def test_sign_and_verify_sapp_v2(self):
        self.sign()
        parsed = inspector.inspect(self.v2.read_bytes())
        self.assertEqual(parsed["version"], 2)
        self.assertEqual(parsed["signature"]["publisher"], "SAPP Test Publisher")
        result = self.run_tool(verify_tool, self.v2, "--trust-store", self.trust)
        self.assertIn("SAND TRUST: VERIFIED", result.stdout)

    def test_modified_executable_is_rejected(self):
        self.sign()
        data = bytearray(self.v2.read_bytes())
        data[150] ^= 0x01
        self.v2.write_bytes(data)
        self.run_tool(verify_tool, self.v2, "--trust-store", self.trust, ok=False)

    def test_untrusted_root_is_rejected(self):
        self.sign()
        empty = self.root / "empty.json"
        empty.write_text(json.dumps({"format": "SAND-TRUST-STORE", "version": 1, "roots": []}))
        self.run_tool(verify_tool, self.v2, "--trust-store", empty, ok=False)

    def test_v1_remains_unsigned_and_inspectable(self):
        parsed = inspector.inspect(self.v1.read_bytes())
        self.assertEqual(parsed["version"], 1)
        self.assertIsNone(parsed["signature"])
        self.run_tool(verify_tool, self.v1, "--trust-store", self.trust, ok=False)

    def test_v2_rejects_signature_block_truncation(self):
        self.sign()
        self.v2.write_bytes(self.v2.read_bytes()[:-1])
        with self.assertRaises(inspector.FormatError):
            inspector.inspect(self.v2.read_bytes())


if __name__ == "__main__":
    unittest.main()
