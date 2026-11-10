import importlib.util
import pathlib
import struct
import tempfile
import unittest

ROOT = pathlib.Path(__file__).resolve().parents[1]
def load(name, path):
    spec = importlib.util.spec_from_file_location(name, ROOT / path)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod
packer = load("sapp_pack", "tools/sapp_pack.py")
inspector = load("sapp_inspect", "tools/sapp_inspect.py")

class SappTests(unittest.TestCase):
    def minimal_elf(self):
        ident = b"\x7fELF\x01\x01\x01" + bytes(9)
        header = packer.ELF_HEADER.pack(ident, 2, 3, 1, 0x40000000,
            packer.ELF_HEADER.size, 0, 0, packer.ELF_HEADER.size,
            packer.ELF_PROGRAM.size, 1, 0, 0, 0)
        payload_offset = 4096
        payload = b"\x90\xEB\xFE"
        ph = packer.ELF_PROGRAM.pack(1, payload_offset,
            0x40000000, 0, len(payload), 4096, 5, 4096)
        return header + ph + bytes(payload_offset - len(header) - len(ph)) + payload

    def test_pack_and_inspect(self):
        with tempfile.TemporaryDirectory() as tmp:
            src, dst = pathlib.Path(tmp)/"a.elf", pathlib.Path(tmp)/"a.sapp"
            src.write_bytes(self.minimal_elf())
            packer.pack(src, dst, "unit-test", "1.2.3")
            result = inspector.inspect(dst.read_bytes())
            self.assertEqual(result["metadata"]["name"], "unit-test")
            self.assertEqual(result["architecture"], "x86-32")
            self.assertEqual(len(result["segments"]), 1)

    def test_reject_non_elf(self):
        with self.assertRaises(packer.PackError):
            packer.parse_elf(b"not an elf")

    def test_reject_bad_magic(self):
        with self.assertRaises(inspector.FormatError):
            inspector.inspect(bytes(64))

    def test_reject_writable_executable(self):
        elf = bytearray(self.minimal_elf())
        off = packer.ELF_HEADER.size + 24
        struct.pack_into("<I", elf, off, 7)
        with self.assertRaises(packer.PackError):
            packer.parse_elf(bytes(elf))

if __name__ == "__main__":
    unittest.main()
