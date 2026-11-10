# SAND Apps

**The native application ecosystem for SAND OS.**

SAND Apps is the separate SDK, package-tooling, examples, and application workspace for [SAND OS](https://github.com/jadhavdurvesh/sand-os). This repository does not modify the OS kernel.

## Current milestone: SAPP v1 toolchain

- ELF32/i386 to SAPP v1 packer
- SAPP package inspector and structural validator
- Loader-compatibility documentation based on the current kernel implementation
- Unit tests for package generation and rejection cases
- Freestanding x86-32 SAND Hello loader smoke-test
- GitHub Actions build and test workflow

**Target:** SAPP v1, x86-32. The format is an early executable container, not yet a stable application ABI.

## Quick start

Requirements: Python 3.10+, GNU Make, GCC with 32-bit code-generation support, and GNU Binutils with i386 ELF support.

```sh
make clean all
make test
```

The build produces:

- `build/hello.elf` — intermediate ELF32 executable
- `build/hello.sapp` — SAPP v1 package

Inspect a package:

```sh
python3 tools/sapp_inspect.py build/hello.sapp
```

Pack another supported ELF32 executable:

```sh
python3 tools/sapp_pack.py app.elf app.sapp --name my-app --version 0.1.0
```

## Repository layout

```text
applications/hello/   First minimal native application
tools/                SAPP packer and inspector
tests/                Format and validation tests
docs/                 ABI compatibility and developer guides
FORMAT.md             SAPP v1 binary format
```

## Important ABI boundary

The current kernel accepts only one test syscall (number 1 with the SAND test magic value). It does not yet expose stable public APIs for terminal I/O, files, windows, processes, networking, or devices. Therefore SAND Hello is intentionally a loader smoke-test that enters an idle loop; it does not pretend to print to a terminal.

Read [docs/abi-compatibility.md](docs/abi-compatibility.md) and [FORMAT.md](FORMAT.md) before changing package generation. The kernel's implementation in [sand-os/kernel/proc/process.c](https://github.com/jadhavdurvesh/sand-os/blob/main/kernel/proc/process.c) remains authoritative.

## Roadmap

1. Stabilize and test SAPP v1 tooling against the kernel loader.
2. Define a versioned syscall ABI in the separate SAND OS repository.
3. Add SDK headers and runtime helpers only for implemented syscalls.
4. Add app metadata, packaging, signing, and installation once the OS has corresponding support.
5. Build native shell utilities and graphical applications as the OS APIs mature.

## License

This repository currently uses a custom source-available, non-commercial license. It is not OSI-approved. See [LICENSE](LICENSE).
