# SAND application SDK

The SDK contains two deliberately separate layers:

- \`include/sand/sapp.h\` — SAPP v1 binary-format declarations.
- \`runtime/sand-runtime.js\` — host-side application runtime reference implementation.

The runtime ABI is \`sand.app-runtime/0.1\`. It provides app lifecycle, local events, capability checks, namespaced JSON storage, typed settings, host-mediated IPC and an injected platform-service adapter.

The runtime is not a kernel ABI. SAND OS does not yet expose stable public filesystem, process, GUI, networking, device or window syscalls. Native service requests fail explicitly unless an embedding host supplies a compatible adapter. Never infer syscall numbers or fall back to host shell commands.

See [runtime documentation](runtime/README.md) and [the integration contract](../docs/app-runtime.md).
