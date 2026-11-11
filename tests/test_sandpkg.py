import importlib.util
import json
import pathlib
import tempfile
import unittest

ROOT = pathlib.Path(__file__).resolve().parents[1]
SPEC = importlib.util.spec_from_file_location("sandpkg", ROOT / "tools" / "sandpkg.py")
sandpkg = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(sandpkg)


def package(files=None, manifest=None):
    return {
        "format": "SANDPKG", "formatVersion": 1,
        "manifest": manifest or {
            "id": "sample-app", "name": "Sample App", "version": "1.0.0",
            "description": "A test package", "capabilities": [], "entrypoint": "app.js"
        },
        "files": files if files is not None else [{"path": "app.js", "content": "export function mount() {}"}]
    }


class SandPackageTests(unittest.TestCase):
    def test_valid_package(self):
        self.assertEqual(sandpkg.validate_package(package())["manifest"]["id"], "sample-app")

    def test_rejects_bad_identity_version_and_capability(self):
        for key, value in [("id", "../escape"), ("version", "latest"), ("capabilities", ["../../bad"])]:
            data = package()
            data["manifest"][key] = value
            with self.subTest(key=key), self.assertRaises(sandpkg.PackageError):
                sandpkg.validate_package(data)

    def test_rejects_traversal_duplicate_and_absolute_paths(self):
        for path in ("../escape", "a/../../escape", "/absolute", "a//b", "a\\\\b"):
            with self.subTest(path=path), self.assertRaises(sandpkg.PackageError):
                sandpkg.validate_package(package([{"path": path, "content": "x"}]))
        with self.assertRaises(sandpkg.PackageError):
            sandpkg.validate_package(package([{"path": "app.js", "content": "x"}, {"path": "app.js", "content": "y"}]))

    def test_rejects_missing_entrypoint_and_oversized_file(self):
        with self.assertRaises(sandpkg.PackageError):
            sandpkg.validate_package(package([{"path": "other.js", "content": ""}]))
        with self.assertRaises(sandpkg.PackageError):
            sandpkg.validate_package(package([{"path": "app.js", "content": "x" * (sandpkg.MAX_FILE + 1)}]))

    def test_builds_and_validates_directory(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = pathlib.Path(tmp)
            (root / "manifest.json").write_text(json.dumps(package()["manifest"]), encoding="utf-8")
            (root / "app.js").write_text("export function mount() {}", encoding="utf-8")
            output = root / "sample.sandpkg"
            built = sandpkg.create(root, output)
            self.assertEqual(built["manifest"]["id"], "sample-app")
            self.assertEqual(sandpkg.validate_package(json.loads(output.read_text(encoding="utf-8")))["files"][0]["path"], "app.js")

    def test_template_manifest_is_valid(self):
        manifest = json.loads((ROOT / "templates" / "app" / "manifest.json").read_text(encoding="utf-8"))
        self.assertEqual(sandpkg.validate_manifest(manifest)["id"], "example-app")


if __name__ == "__main__":
    unittest.main()
