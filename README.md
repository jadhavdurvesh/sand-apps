# SAND Apps

**The native application ecosystem for SAND OS.** This is a separate SDK, package-tooling and application workspace; it does not modify the OS kernel.

## Phase 1 — Core application prototypes

- **CAIRN** — command environment / terminal
- **LOCUS** — file explorer
- **QUANTA** — calculator
- **CADENCE** — task manager
- **KEYSTONE** — system settings

Run the interactive desktop preview locally:

```sh
python3 -m http.server 8000
```

Then open `http://localhost:8000/preview/`. See [preview usage and shortcuts](docs/preview-usage.md) and [the full app catalogue](docs/application-catalog.md).

## Phase 2 — Extended suite (catalogued)

**PULSE** (system monitor), **GLYPH** (text/code editor), **PRISM** (image viewer), **MORROW** (notes), **CRATE** (archive manager), **CHRONOS** (clock and timers), **SPECTRA** (media player), **BEACON** (network manager).

## Shared application runtime and desktop services

The browser preview now opens a windowed desktop shell with a launcher, dock, draggable/resizable app windows, focus/minimize/maximize/close controls, notification center and clock. LOCUS uses the per-app virtual filesystem; files persist in browser storage. The SDK provides a common host-side runtime plus desktop service contracts for app lifecycle, capability permissions, per-app storage, typed settings, IPC, logical windows, notifications, desktop events and private virtual files. The five-app browser preview launches through the desktop host. See [runtime documentation](docs/app-runtime.md) and [desktop services](docs/desktop-services.md). These are host-preview implementations, not native kernel or desktop services.

## Build and test

Requirements for the SAPP smoke-test: Python 3.10+, GNU Make, GCC with 32-bit code-generation support, and GNU Binutils with i386 ELF support.

```sh
make clean all
make test
make test-js
python3 tools/validate_apps.py
```

The native smoke-test produces `build/hello.elf` and `build/hello.sapp`.

## ABI boundary

SAPP v1 is an early executable container, not a stable application ABI. The current kernel exposes only a test syscall and does not provide public terminal I/O, filesystem, windowing, process, networking or device APIs. The five core apps are interactive host-side prototypes; they do not access real disks or the host shell. Phase 2 apps are catalogued only. Native integration follows only after relevant versioned OS services exist.

Read [docs/abi-compatibility.md](docs/abi-compatibility.md) and [FORMAT.md](FORMAT.md) before changing package generation.

## License

Custom source-available, non-commercial license; not OSI-approved. See [LICENSE](LICENSE).
