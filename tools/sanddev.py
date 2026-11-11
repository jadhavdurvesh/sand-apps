#!/usr/bin/env python3
"""SAND developer CLI: scaffold, validate and package first-party app projects."""
import argparse
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
TEMPLATE = ROOT / "templates" / "app"
APP_ID = re.compile(r"^[a-z][a-z0-9-]{1,47}$")
CAPABILITY = re.compile(r"^(?:[a-z]+\.)+[a-z]+$")
SEMVER = re.compile(r"^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$")


def load_manifest(project):
    path = project / "manifest.json"
    if not path.is_file():
        raise ValueError(f"missing manifest: {path}")
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        raise ValueError(f"cannot read manifest: {exc}") from exc
    if not isinstance(data, dict):
        raise ValueError("manifest must be a JSON object")
    return data


def init_project(app_id, name, destination, version, description, capabilities):
    if not APP_ID.fullmatch(app_id):
        raise ValueError("app id must be 2–48 lowercase letters, digits or hyphens and start with a letter")
    if not isinstance(name, str) or not name.strip() or len(name) > 80:
        raise ValueError("app name must contain 1–80 characters")
    if not SEMVER.fullmatch(version):
        raise ValueError("version must be semantic version X.Y.Z")
    if not isinstance(description, str) or len(description) > 500:
        raise ValueError("description must be at most 500 characters")
    if any(not CAPABILITY.fullmatch(item) for item in capabilities):
        raise ValueError("capabilities must be dot-separated identifiers")
    if len(capabilities) != len(set(capabilities)):
        raise ValueError("capabilities must not contain duplicates")
    destination = destination.resolve()
    if destination.exists() and (not destination.is_dir() or any(destination.iterdir())):
        raise ValueError(f"destination is not an empty directory: {destination}")
    destination.mkdir(parents=True, exist_ok=True)
    manifest = {"id": app_id, "name": name, "version": version, "description": description,
                "capabilities": capabilities, "entrypoint": "app.js"}
    (destination / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    source = (TEMPLATE / "app.js").read_text(encoding="utf-8").replace("example-app", app_id)
    source = source.replace("Hello from SAND", f"Hello from {name}")
    (destination / "app.js").write_text(source, encoding="utf-8")
    readme = (
        f"# {name}\n\nSAND application {app_id}.\n\n"
        "## Develop\n\nEdit app.js and keep requested capabilities minimal. "
        "Use the injected currentRuntime for app-scoped storage and approved services.\n\n"
        "## Package\n\nRun python3 tools/sanddev.py build . -o dist/" + app_id +
        "-" + version + ".sandpkg from the SAND Apps repository.\n"
    )
    (destination / "README.md").write_text(readme, encoding="utf-8")
    return destination


def package_module():
    from importlib.util import module_from_spec, spec_from_file_location
    spec = spec_from_file_location("sandpkg", ROOT / "tools" / "sandpkg.py")
    module = module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    sub = parser.add_subparsers(dest="command", required=True)
    init = sub.add_parser("init", help="create a starter application project")
    init.add_argument("id")
    init.add_argument("--name", required=True)
    init.add_argument("--output", default=None, help="project directory (defaults to the app id)")
    init.add_argument("--version", default="0.1.0")
    init.add_argument("--description", default="A SAND application.")
    init.add_argument("--capability", action="append", default=[])
    for command in ("validate", "build"):
        cmd = sub.add_parser(command, help=f"{command} an app project")
        cmd.add_argument("project", nargs="?", default=".")
        if command == "build":
            cmd.add_argument("-o", "--output", required=True)
    args = parser.parse_args()
    try:
        if args.command == "init":
            destination = init_project(args.id, args.name, Path(args.output or args.id),
                                       args.version, args.description, args.capability)
            print(f"Created SAND app project: {destination}")
        else:
            project = Path(args.project).resolve()
            manifest = load_manifest(project)
            module = package_module()
            if args.command == "validate":
                files = [{"path": p.relative_to(project).as_posix(), "content": p.read_text(encoding="utf-8")}
                         for p in sorted(project.rglob("*")) if p.is_file() and p.name != "manifest.json"]
                module.validate_package({"format": "SANDPKG", "formatVersion": 1,
                                         "manifest": manifest, "files": files})
                print(f"Valid SAND app: {manifest['id']} v{manifest['version']}")
            else:
                package = module.create(project, args.output)
                print(f"Built {args.output}: {package['manifest']['id']} v{package['manifest']['version']}")
    except (OSError, UnicodeError, ValueError) as exc:
        print(f"sanddev: error: {exc}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
