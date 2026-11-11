# SAND applications and packages

## FORGE

FORGE is the host-preview application manager. It lists built-in apps and locally installed packages, exposes a per-app permission editor, and imports validated `.sandpkg` files. Permission decisions are stored in browser local storage and applied when an app is next launched. First launch asks for approval; the user can later change individual grants in FORGE.

The preview uses browser confirmation dialogs and a JavaScript host. This is a developer prototype, not a security boundary. A native SAND host must enforce permissions outside the app process.

## SANDPKG v1

SANDPKG v1 is a UTF-8 JSON package envelope. It is deliberately distinct from the native SAPP executable format.

```json
{
  "format": "SANDPKG",
  "formatVersion": 1,
  "manifest": {
    "id": "example-app",
    "name": "Example App",
    "version": "0.1.0",
    "description": "An example application",
    "capabilities": ["storage.read", "storage.write"],
    "entrypoint": "app.js"
  },
  "files": [
    {"path": "app.js", "content": "/* application source */"}
  ]
}
```

Limits: 128 files, 1 MiB per file, 2 MiB combined UTF-8 file content, 180-character relative paths, and 500-character descriptions. Absolute paths, traversal segments, duplicate paths, invalid app IDs, invalid semantic versions, duplicate capabilities, and missing entrypoints are rejected. File content is text-only UTF-8.

## Developer workflow

Start with `templates/app/`. Change the app ID and name in `manifest.json` and update the registration ID in `app.js`. Keep requested capabilities to the minimum required.

Build and inspect a package:

```sh
python3 tools/sandpkg.py create templates/app --output dist/example-app-0.1.0.sandpkg
python3 tools/sandpkg.py inspect dist/example-app-0.1.0.sandpkg
python3 tools/sandpkg.py validate dist/example-app-0.1.0.sandpkg
```

The JavaScript SDK lives at `sdk/package/package-manager.js` and exports `SandPackages.createManager({storage, catalog})`, package validation, package creation, semantic version comparison, install/update, uninstall, and permission persistence APIs.

## Current execution boundary

FORGE validates and stores third-party packages. It does **not** execute their JavaScript, load arbitrary modules, or grant installed packages access to system services. A local package is shown as `launchable: false`. This is intentional: the current browser preview is not an untrusted-code sandbox, and the kernel does not yet expose a stable app ABI, trusted signature verification, process isolation, or native capability enforcement.

Before enabling third-party execution, SAND needs a native package verifier, signed publisher identity/trust policy, a process boundary, host-owned capability broker, and a versioned app ABI. Do not remove the non-executable boundary as a convenience feature.
