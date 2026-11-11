# SAND application catalogue

## Core eight — implemented host prototypes

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

All eight have independent application modules and interactive host-side prototypes in `preview/`.

## Extended suite — catalogued, not yet implemented

| App | Responsibility |
|---|---|
| **PULSE** | CPU, memory, storage and process monitor |
| **GLYPH** | Text and code editor |
| **PRISM** | Image viewer and metadata |
| **MORROW** | Notes and personal workspace |
| **CRATE** | Archive manager |
| **CHRONOS** | Clock, alarms, timers and stopwatch |
| **SPECTRA** | Local media player and library |
| **BEACON** | Network status and configuration |

## Delivery rules

1. The eight core apps are implemented as host-side prototypes. Extended apps are catalogued, not represented as implemented.
2. Every app has a stable ID and manifest.
3. Host prototypes are development previews, not native SAND OS applications.
4. Native integration requires documented, versioned OS services and a stable application ABI.
5. SAPP v1 packaging must not imply that missing kernel APIs exist.

Names are working project names; trademark availability has not been verified.
