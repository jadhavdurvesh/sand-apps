# SAND Application SDK and Desktop Services

Version **0.1.0** · ABI **sand.app-runtime/0.1**

A shared host-side runtime for first-party SAND applications. It is not a kernel ABI, syscall layer, window manager, or claim that native OS services exist.

## Quick start

\`\`\`js
const Sand = require("./sdk/runtime/sand-runtime.js");
const manifest = { id: "sample-app", name: "Sample App", version: "1.0.0", capabilities: ["storage.read", "storage.write"] };
const app = Sand.createRuntime({ manifest, grants: ["storage.read", "storage.write"] });
app.init();
app.storage.set("workspace", { lastView: "home" });
app.on("document.changed", event => console.log(event));
app.suspend("window-hidden");
app.resume();
app.stop();
\`\`\`

## Shared APIs

- Lifecycle: initialize, suspend, resume and stop with validated transitions.
- Events: app-local events with removable subscriptions.
- Permissions: manifest-declared capabilities separately granted by the host.
- Storage: app-ID-namespaced JSON data with memory and browser LocalStorage adapters.
- Settings: typed schemas, defaults, enums and change events.
- IPC: host-mediated topic messaging; sender and receiver need separate grants.
- Platform bridge: asynchronous versioned requests through an injected adapter.
- Shared UI kit: framework-free DOM components, safe text escaping, byte formatting and app-private persistent stores (`sdk/ui/app-kit.js`).

## Security

A declared capability is only a request. The host must grant it explicitly. Storage is isolated by app ID; IPC does not expose another app's runtime or storage. Native adapters must independently authenticate callers, validate payloads and enforce capabilities.

## Platform boundary

No native SAND filesystem, process, GUI, network, device or window API is implemented here. Missing platform adapters return \`SERVICE_UNAVAILABLE\`; there is no host shell or disk fallback. Do not describe these host prototypes as native SAND applications.
