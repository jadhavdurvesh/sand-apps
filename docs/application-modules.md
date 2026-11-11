# First-party application modules

The eight core SAND apps are maintained as independent source modules under `applications/<app-id>/app.js`.

## Host integration

`preview/index.html` loads the shared runtime, desktop services, CAIRN shell engine, each application module, and finally the desktop host controller. The host owns window creation, focus, suspension, notifications and app-scoped runtime grants. An app module owns its application UI and behavior.

## Application module API

Every module registers one mount function at `window.SandApps[appId].mount`. The host passes:

- `workspace`: the DOM element owned by the app's window.
- `currentRuntime`: the app-scoped SAND runtime with its declared capabilities.
- `renderNotifications`: desktop notification refresh callback.

Modules must not access another app's runtime or storage. They must use the injected runtime for persistent app data and privileged desktop services.

## Current implementations

| App | Source | Implemented behavior |
|---|---|---|
| CAIRN | `applications/cairn/app.js` + `preview/cairn.js` | Command registry, shell, virtual filesystem, runtime-backed private session persistence, bounded command history, exit-status expansion, manuals and capability checks |
| LOCUS | `applications/locus/app.js` | Browse app-private files, navigate folders, create files/folders, edit/save and delete |
| QUANTA | `applications/quanta/app.js` | Arithmetic parser, keyboard/keypad input, history, recall and copy |
| CADENCE | `applications/cadence/app.js` | Persistent tasks, priorities, due dates, filters, completion, deletion and notifications |
| KEYSTONE | `applications/keystone/app.js` | Theme, accent and reduced-motion preferences using typed runtime settings |
| GLYPH | `applications/glyph/app.js` | Browse its app-private file workspace, create, edit, search and save UTF-8 text files |
| MORROW | `applications/morrow/app.js` | Persistent private notes, search, quick capture and editing |
| CHRONOS | `applications/chronos/app.js` | Local clock, stopwatch, countdown timer and persistent alarm definitions; notifications run while the preview app is open |

## Verification

Run:

```sh
make test
make test-js
python3 tools/validate_apps.py
```

`sdk/ui/app-kit.js` provides shared, framework-free UI and app-private storage helpers. QUANTA calculation history and MORROW notes use the app runtime storage; GLYPH uses the capability-gated virtual file service. `tests/test_app_modules.cjs` checks that each module parses, registers independently, exports a mount function and is loaded by the desktop host.
