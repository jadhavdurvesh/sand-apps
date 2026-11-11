# SAND UI application kit

Version 0.1.0 · Host-side shared UI helpers

Load after `sand-runtime.js` and before application modules. The kit is deliberately framework-free and has no external dependencies.

- `SandUI.createStore(runtime, key, initial, validate?)`: JSON-cloned, app-private persistent state. All reads and writes use the injected runtime storage API.
- `SandUI.element(tag, attributes?, children?)`: safe DOM element construction; text values use text nodes.
- `SandUI.pageHeader(title, description, actions?)`: shared page heading.
- `SandUI.emptyState(title, description)`: accessible empty-state component.
- `SandUI.statusPill(label, state?)`: text-labelled status.
- `SandUI.announce(host, message)`: create/update a live status region.
- `SandUI.escapeHTML(value)` and `SandUI.formatBytes(bytes)`.

No helper accesses global storage, the host filesystem, or native OS services. Privileged operations remain behind the app-scoped runtime.
