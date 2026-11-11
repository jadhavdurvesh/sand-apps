# SAND Apps SDK — TypeScript API

The public declarations live at \`sdk/types/sand.d.ts\`. They describe the current JavaScript host SDK and browser preview. They are **not** a native SAND OS ABI and do not imply that kernel services exist.

## Include the declarations

In a TypeScript application project:

\`\`\`ts
/// <reference path="../sdk/types/sand.d.ts" />

const manifest: SandManifest = {
  id: "example-app",
  name: "Example App",
  version: "0.1.0",
  capabilities: ["storage.read", "storage.write"]
};

const app: SandAppModule = {
  mount({ workspace, currentRuntime }) {
    const heading = document.createElement("h1");
    heading.textContent = "Hello from SAND";
    workspace.append(heading);
    currentRuntime.storage.set("last-opened", new Date().toISOString());
  }
};
\`\`\`

The declaration file exposes:
- Runtime lifecycle and app-scoped storage/settings.
- Capability declarations and grants.
- Host-mediated IPC and platform service requests.
- Desktop host windows, notifications and events.
- SANDPKG v1 package validation and package-manager contracts.
- The first-party app mount context.

## JavaScript runtime modules

The browser preview loads these scripts in dependency order:

1. \`sdk/runtime/sand-runtime.js\`
2. \`sdk/runtime/desktop-services.js\`
3. \`sdk/package/package-manager.js\`
4. \`sdk/ui/app-kit.js\`
5. Individual app modules under \`applications/<id>/app.js\`

Node consumers can use CommonJS \`require()\` for the runtime, desktop services and package manager.

## App lifecycle

A host creates an app runtime, grants only requested capabilities, and initializes it. App code should use the injected runtime rather than global host objects. Stop the app to release subscriptions and disable further runtime operations.

## Capability boundary

A manifest capability is a request, not an automatic grant. The host chooses grants. The current JavaScript implementation is a host-side reference and is not a process sandbox: do not execute untrusted installed package code. Native implementations must authenticate app identity and enforce capabilities outside the app process.

## Native compatibility

The current SAND OS loader accepts SAPP v1 executable containers, but the kernel does not yet expose a stable public application syscall ABI for files, windows, process control, networking, or devices. Do not map these JavaScript host APIs to invented syscalls. Native integration requires separately versioned OS-side services and conformance tests.
