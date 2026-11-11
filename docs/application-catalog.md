# SAND application catalogue

## Core nine — implemented host prototypes

| App | Responsibility |
|---|---|
| **CAIRN** | Command environment and terminal |
| **LOCUS** | File explorer |
| **QUANTA** | Calculator |
| **CADENCE** | Task manager |
| **KEYSTONE** | System settings |
| **GLYPH** | Text and code editor for its private file workspace |
| **MORROW** | Private notes and personal workspace |
| **CHRONOS** | Clock, alarms, timers and stopwatch |
| **FORGE** | Application manager, package installer and permission editor |

All fourteen have independent application modules and interactive host-side prototypes in `preview/`.

## Extended five — implemented host prototypes

| App | Responsibility |
|---|---|
| **PULSE** | Browser-visible runtime, storage estimate and host information; native CPU/process metrics await kernel services |
| **PRISM** | Local image viewer with zoom, rotation and dimensions |
| **CRATE** | SANDPACK bundle creator, inspector and extractor (JSON-based, not ZIP) |
| **SPECTRA** | Local audio/video player and queue |
| **BEACON** | Read-only browser network status; no native configuration |

## Delivery rules

1. The nine core apps and five extended apps have host-side prototypes. Their browser-only limits are documented; native integration requires OS services.
2. Every app has a stable ID and manifest.
3. Host prototypes are development previews, not native SAND OS applications.
4. Native integration requires documented, versioned OS services and a stable application ABI.
5. SAPP v1 packaging must not imply that missing kernel APIs exist.
6. FORGE local package installation validates and stores packages; it does not execute third-party code. See [package system](package-system.md).

Names are working project names; trademark availability has not been verified.
