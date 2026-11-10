# Developing SAND applications

## Host requirements

- Python 3.10+
- GNU Make
- GCC with 32-bit code-generation support
- GNU Binutils with i386 ELF support

On Debian/Ubuntu/WSL, install build-essential, binutils, make, and python3.

## Build the first package

    make clean all

This compiles the freestanding x86-32 Hello entry point, links an ELF32 executable, packs it as SAPP v1, then inspects the generated package.

Outputs: build/hello.elf (intermediate ELF32) and build/hello.sapp (native package).

## Use the tools

    python3 tools/sapp_pack.py app.elf app.sapp --name my-app --version 0.1.0
    python3 tools/sapp_inspect.py app.sapp
    python3 -m unittest discover -s tests -v

The packer deliberately rejects ELF files that cannot fit the current kernel loader's constraints. It does not silently rewrite virtual addresses, permissions, or relocations.

## Application status

The Hello program is a loader smoke-test that enters an intentional idle loop. The current SAND kernel has no stable public console, filesystem, GUI, or device syscall API, so this first package cannot print text or behave like a normal desktop application. That API must be implemented and versioned in the separate SAND OS repository before adding higher-level SDK libraries.
