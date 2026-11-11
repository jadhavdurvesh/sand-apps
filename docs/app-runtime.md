# SAND Application Runtime 0.1

## Contract

- ABI: \`sand.app-runtime/0.1\`; SDK version: \`0.1.0\`.
- Manifests define stable lowercase app IDs, display names, semantic versions and requested capabilities.
- Lifecycle: \`created → initializing → ready ↔ suspended → stopping → stopped\`; initialization failures transition to \`failed\`.
- Events are app-local; inter-app messages are host-mediated.
- Storage and settings are namespaced by app ID.
- IPC sender requires \`ipc.send\`; receiver requires \`ipc.receive\`.
- Platform calls require a declared and granted capability and an injected native adapter.

## APIs

- \`createRuntime({ manifest, grants, storage, settings, platform, transport })\`
- \`createHost({ storage, platform })\`
- \`runtime.init(context)\`, \`suspend(reason)\`, \`resume()\`, \`stop(reason)\`
- \`runtime.on(name, handler)\`, \`emit(name, payload)\`, \`onLifecycle(handler)\`
- \`runtime.storage.get/set/remove/keys\`
- \`runtime.settings.get/set/all\`
- \`runtime.send(targetAppId, topic, payload)\`, \`onMessage(topic, handler)\`
- \`runtime.requestService(service, operation, payload, capability)\`

## Manifest example

\`\`\`json
{
  "id": "locus",
  "name": "LOCUS",
  "version": "0.1.0",
  "capabilities": ["storage.read", "storage.write", "platform.files.read", "platform.files.write", "platform.window.create"]
}
\`\`\`

A manifest declaration is only a request. The host separately grants approved capabilities. Unknown and unrequested grants are rejected.

## Native integration

This adapter is not a syscall ABI. The SAND OS integration layer must provide a versioned adapter that authenticates callers, independently enforces capabilities, validates requests and returns documented errors. Do not infer syscalls or use host shell commands as fallback.

## Tests

Run \`node --test tests/test_runtime.cjs\` or \`make test-js\`.
