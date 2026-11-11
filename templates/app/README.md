# Example SAND application

This is a minimal starter for the SAND host-preview application module API.

## Build a package

From the repository root:

```sh
python3 tools/sandpkg.py create templates/app --output dist/example-app-0.1.0.sandpkg
python3 tools/sandpkg.py validate dist/example-app-0.1.0.sandpkg
```

Change the app ID in `manifest.json` and `app.js` before creating your own app. Request only the capabilities your app needs. Package installation currently stores and validates packages; it does not execute third-party code.
