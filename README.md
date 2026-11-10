# SAND Apps

**The native application ecosystem for SAND OS.** This is a separate SDK, package-tooling and application workspace; it does not modify the OS kernel.

## Phase 1 — Core application prototypes

- **CAIRN** — command environment / terminal
- **LOCUS** — file explorer
- **QUANTA** — calculator
- **CADENCE** — task manager
- **KEYSTONE** — system settings

Explore the interactive host preview by opening `preview/index.html` in a browser. See [the full app catalogue](docs/application-catalog.md).

## Phase 2 — Extended suite (catalogued)

**PULSE** (system monitor), **GLYPH** (text/code editor), **PRISM** (image viewer), **MORROW** (notes), **CRATE** (archive manager), **CHRONOS** (clock and timers), **SPECTRA** (media player), **BEACON** (network manager).

## Build and test

Requirements for the SAPP smoke-test: Python 3.10+, GNU Make, GCC with 32-bit code-generation support, and GNU Binutils with i386 ELF support.

```sh
make clean all
make test
python3 tools/validate_apps.py
```

The native smoke-test produces `build/hello.elf` and `build/hello.sapp`.

## ABI boundary

SAPP v1 is an early executable container, not a stable application ABI. The current kernel exposes only a test syscall and does not provide public terminal I/O, filesystem, windowing, process, networking or device APIs. The five core apps are interactive host-side prototypes; they do not access real disks or the host shell. Phase 2 apps are catalogued only. Native integration follows only after relevant versioned OS services exist.

Read [docs/abi-compatibility.md](docs/abi-compatibility.md) and [FORMAT.md](FORMAT.md) before changing package generation.

## License

Custom source-available, non-commercial license; not OSI-approved. See [LICENSE](LICENSE).
