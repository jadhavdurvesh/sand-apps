#!/usr/bin/env python3
"""Build and inspect SANDPKG v1 data packages. Packages are not executable."""
import argparse
import json
import re
import sys
from pathlib import Path, PurePosixPath

FORMAT = "SANDPKG"
VERSION = 1
MAX_FILES = 128
MAX_FILE = 1_048_576
MAX_TOTAL = 2_097_152
APP_ID = re.compile(r"^[a-z][a-z0-9-]{1,47}$")
SEMVER = re.compile(r"^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$")


class PackageError(ValueError):
    pass


def validate_manifest(manifest):
    if not isinstance(manifest, dict):
        raise PackageError("manifest must be an object")
    if not APP_ID.fullmatch(str(manifest.get("id", ""))):
        raise PackageError("invalid application id")
    if not isinstance(manifest.get("name"), str) or not manifest["name"].strip() or len(manifest["name"]) > 80:
        raise PackageError("invalid application name")
    if not isinstance(manifest.get("version"), str) or not SEMVER.fullmatch(manifest["version"]):
        raise PackageError("invalid semantic version")
    if not isinstance(manifest.get("description"), str) or len(manifest["description"]) > 500:
        raise PackageError("description is required and must be at most 500 characters")
    caps = manifest.get("capabilities", [])
    if not isinstance(caps, list) or len(caps) > 32 or any(not isinstance(cap, str) for cap in caps) or len(caps) != len(set(caps)):
        raise PackageError("capabilities must be a unique list")
    for cap in caps:
        if not isinstance(cap, str) or not re.fullmatch(r"(?:[a-z]+\.)+[a-z]+", cap):
            raise PackageError(f"invalid capability: {cap!r}")
    entry = manifest.get("entrypoint")
    if entry is not None:
        if not isinstance(entry, str) or not safe_path(entry):
            raise PackageError("invalid entrypoint path")
    return manifest


def safe_path(value):
    if not isinstance(value, str) or not value or len(value) > 180 or value.startswith("/") or "\\" in value:
        return False
    p = PurePosixPath(value)
    return all(part not in ("", ".", "..") for part in value.split("/")) and bool(p.parts)


def validate_package(package):
    if not isinstance(package, dict) or package.get("format") != FORMAT or package.get("formatVersion") != VERSION:
        raise PackageError("expected SANDPKG format version 1")
    manifest = validate_manifest(package.get("manifest"))
    files = package.get("files")
    if not isinstance(files, list) or not 1 <= len(files) <= MAX_FILES:
        raise PackageError("package must contain 1–128 files")
    seen, total = set(), 0
    for item in files:
        if not isinstance(item, dict) or not safe_path(item.get("path")) or not isinstance(item.get("content"), str):
            raise PackageError("each file needs a safe relative path and UTF-8 text content")
        if item["path"] in seen:
            raise PackageError(f"duplicate package path: {item['path']}")
        seen.add(item["path"])
        size = len(item["content"].encode("utf-8"))
        if size > MAX_FILE:
            raise PackageError(f"file exceeds 1 MiB: {item['path']}")
        total += size
    if total > MAX_TOTAL:
        raise PackageError("uncompressed package content exceeds 2 MiB")
    if manifest.get("entrypoint") and manifest["entrypoint"] not in seen:
        raise PackageError("declared entrypoint is missing")
    return package


def create(source, output):
    source = Path(source).resolve()
    manifest_path = source / "manifest.json"
    manifest = validate_manifest(json.loads(manifest_path.read_text(encoding="utf-8")))
    files = []
    for path in sorted(source.rglob("*")):
        if path.is_dir() or path == manifest_path:
            continue
        if path.is_symlink():
            raise PackageError(f"symlinks are not permitted: {path}")
        rel = path.relative_to(source).as_posix()
        if not safe_path(rel):
            raise PackageError(f"unsafe path: {rel}")
        files.append({"path": rel, "content": path.read_text(encoding="utf-8")})
    package = validate_package({"format": FORMAT, "formatVersion": VERSION, "manifest": manifest, "files": files})
    destination = Path(output)
    destination.parent.mkdir(parents=True, exist_ok=True)
    destination.write_text(json.dumps(package, ensure_ascii=False, indent=2) + "\\n", encoding="utf-8")
    return package


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    sub = parser.add_subparsers(dest="command", required=True)
    build = sub.add_parser("create", help="package an app directory")
    build.add_argument("source", help="directory containing manifest.json")
    build.add_argument("-o", "--output", required=True, help="output .sandpkg file")
    for name in ("inspect", "validate"):
        cmd = sub.add_parser(name, help=f"{name} a .sandpkg file")
        cmd.add_argument("package")
    args = parser.parse_args()
    try:
        if args.command == "create":
            package = create(args.source, args.output)
            print(f"Created {args.output}: {package['manifest']['id']} v{package['manifest']['version']} ({len(package['files'])} files)")
        else:
            package = validate_package(json.loads(Path(args.package).read_text(encoding="utf-8")))
            print(f"{FORMAT} v{VERSION}: {package['manifest']['name']} ({package['manifest']['id']}) v{package['manifest']['version']}")
            print(f"{len(package['files'])} files · {sum(len(f['content'].encode('utf-8')) for f in package['files'])} bytes")
            for item in package["files"]:
                print(f"  {item['path']}")
            if args.command == "validate":
                print("Package valid.")
    except (OSError, UnicodeError, json.JSONDecodeError, PackageError) as exc:
        print(f"sandpkg: error: {exc}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
