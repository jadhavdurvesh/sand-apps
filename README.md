# SAND Apps

**The native application ecosystem for SAND OS.** This is a separate SDK, package-tooling and application workspace; it does not modify the OS kernel.

## Core application prototypes

- **CAIRN** — command environment / terminal
- **LOCUS** — file explorer
- **QUANTA** — calculator
- **CADENCE** — task manager
- **KEYSTONE** — system settings
- **GLYPH** — text editor
- **MORROW** — private notes
- **CHRONOS** — clock, stopwatch, countdown and alarms
- **FORGE** — application manager, package installer and permissions

Run the interactive desktop preview locally:

```sh
python3 -m http.server 8000
```

Then open `http://localhost:8000/preview/`. See [preview usage and shortcuts](docs/preview-usage.md) and [the full app catalogue](docs/application-catalog.md).

## Extended application prototypes

**PULSE** (host monitor), **PRISM** (image viewer), **CRATE** (SANDPACK bundles), **SPECTRA** (local media player), **BEACON** (network status).

## FORGE and SAND packages

FORGE manages installed applications and user-approved capabilities. SANDPKG v1 packages can be built, inspected and validated with `tools/sandpkg.py`; `templates/app/` contains a starter. Third-party packages are validated and stored but intentionally not executable until native isolation, trusted signatures and a stable ABI exist. See [the package system guide](docs/package-system.md) and [SAND Trust & Code Integrity](docs/trust-and-signing.md) for publisher certificates and Ed25519 package signing.

## First-party application source

Each application now has its own source module under `applications/<id>/`. The desktop host loads these modules through the shared app runtime; it no longer owns the individual app renderers. CAIRN's shell engine is packaged under `applications/cairn/`. See [application module architecture](docs/application-modules.md).

## Shared application runtime and desktop services

The browser preview now opens a windowed desktop shell with a launcher, dock, draggable/resizable app windows, focus/minimize/maximize/close controls, notification center and clock. LOCUS uses the per-app virtual filesystem; files persist in browser storage. The SDK provides a common host-side runtime plus desktop service contracts for app lifecycle, capability permissions, per-app storage, typed settings, IPC, logical windows, notifications, desktop events and private virtual files. Public TypeScript declarations are available in `sdk/types/sand.d.ts`, with a developer guide at [docs/sdk.md](docs/sdk.md). The fourteen-app browser preview launches through the desktop host. See [runtime documentation](docs/app-runtime.md) and [desktop services](docs/desktop-services.md). These are host-preview implementations, not native kernel or desktop services.

## Build and test

Requirements for the SAPP smoke-test: Python 3.10+, GNU Make, GCC with 32-bit code-generation support, and GNU Binutils with i386 ELF support.

```sh
make clean all
make test
make test-js
python3 tools/validate_apps.py
```

The native smoke-test produces `build/hello.elf` and `build/hello.sapp`.

## Native apps on SAND OS

**LOCUS** now has a native, windowed build (`applications/locus/native/`) that runs on SAND OS through the kernel window service (`run locus` in the shell): browse, preview, create and delete SANDFS files with mouse or keyboard. A console variant lives in `native-console/`. Both target the v3 development ABI in `sdk/native/`. The other apps remain host-side prototypes; porting them to the window service is the next step. See [docs/abi-compatibility.md](docs/abi-compatibility.md).

## ABI boundary

SAPP v1 is an early executable container, not a stable application ABI. The current kernel exposes only a test syscall and does not provide public terminal I/O, filesystem, windowing, process, networking or device APIs. All fourteen apps are interactive host-side prototypes. Browser APIs expose only limited metrics, local user-selected files and browser connectivity; they do not provide native disk, process, network configuration or device access. Native integration follows only after relevant versioned OS services exist.

Read [docs/abi-compatibility.md](docs/abi-compatibility.md) and [FORMAT.md](FORMAT.md) before changing package generation.

## License

Custom source-available, non-commercial license; not OSI-approved. See [LICENSE](LICENSE).


## Signed native applications

SAPP v2 adds Ed25519 publisher signatures and certificate-chain verification in the developer tooling. See [SAPP v2 format](FORMAT.md#sapp-v2-signed-executable-container) and [STCI trust policy](docs/trust-and-signing.md). Native SAND OS loader enforcement remains pending; unsigned v1 images are still the legacy format and must not be described as trusted.
