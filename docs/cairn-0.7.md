# CAIRN 0.7 — Native Command Architecture

## Purpose

CAIRN is the command environment for SAND OS. Its host preview is a sandboxed development implementation, not a host shell and not a native kernel client. Version 0.7 establishes the security and integration boundaries that future native SAND applications can share.

## Execution layers

1. Parser and shell — tokenization, quoting, expansion, pipes, conditionals, scripts and history.
2. Command registry — metadata, categories, manuals, extension registration and completion.
3. Capability policy — commands declare authority; missing capabilities are rejected before handlers run.
4. Command handlers — virtual filesystem, session, text utilities and SAND command namespaces.
5. Platform bridge — an injected adapter for future native kernel/service APIs. The host preview does not create this adapter and never shells out to the host.

## Capability catalogue

| Capability | Authority |
|---|---|
| `fs.read` | Read virtual files |
| `fs.write` | Create or modify virtual files |
| `fs.delete` | Delete virtual files |
| `session.read` | Read session values |
| `session.write` | Modify session values |
| `shell.alias` | Manage aliases |
| `system.info.read` | Read platform information |
| `system.control.read` | Read control-plane status |
| `service.read` | Inspect native services |
| `device.read` | Inspect native devices |
| `package.read` | Inspect package metadata |

The host preview accepts `createSession({ capabilities: [...] })`. If omitted, a safe preview default is used; native service and device capabilities are not included. These are CAIRN-level checks, not kernel-enforced security.

## Native platform bridge

ABI identifier: `sand.platform/0.1`

An embedding host may provide `createSession({ platform: { request(request) { ... } } })`. CAIRN sends:

```js
{ abi: "sand.platform/0.1", capability: "service.read", operation: "service.list", args: [] }
```

The adapter must independently enforce capabilities. It returns a string or an object with `stdout` and `exitCode`. Async results are not supported in this synchronous prototype. A missing adapter returns an explicit unavailable message and never executes a host command.

- `sandctl status` → `system.control.read / status`
- `sysinfo` → `system.info.read / system.info`
- `services list|status` → `service.read / service.list|service.status`
- `devices list` → `device.read / device.list`

## Reuse across SAND apps

Future apps should request narrowly scoped platform services through a shared runtime interface rather than shelling out or accessing another app's internal state. This is a proposed contract only; it does not claim the kernel or other apps implement it yet.

## Current limitations

- Capability enforcement exists in the CAIRN preview only.
- Filesystem mode/owner metadata remains simulated.
- Native process execution, kernel services, hardware discovery, networking and telemetry remain unavailable until a native adapter and kernel ABI exist.
- This milestone changes only the SAND Apps repository.


## Extension isolation
Extension handlers receive a restricted session facade, not the internal session object or virtual filesystem. File metadata/content is exposed only when `fs.read` is granted; session environment values require `session.read`. The facade does not expose the raw snapshot, command-registration internals, mutable filesystem nodes, or platform adapter. Calls through its command runner still pass through CAIRN's capability checks. Native adapters must independently enforce authorization.
