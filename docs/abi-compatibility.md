# SAND OS application compatibility

This document records the executable contract implemented by the current SAND OS loader. It is intentionally conservative: the SDK must not promise services the kernel does not provide.

| Property | Current implementation |
|---|---|
| Container | SAPP |
| Version | 1 |
| Architecture | x86-32 (1) |
| Header / segment / relocation | 64 / 32 / 12 bytes |
| Maximum segments / pages / relocations | 8 / 64 / 256 |
| Metadata | Required, non-empty, at most 4096 bytes |
| Signature | Not supported; offset and size must be zero |
| Relocation | ABS32 (1) only |
| User address range | 0x40000000–0xBFFFFFFF |
| User stack top | 0xBFFFE000 |
| Writable + executable segment | Rejected |

The authoritative implementation is process_create_sapp() in [sand-os/kernel/proc/process.c](https://github.com/jadhavdurvesh/sand-os/blob/main/kernel/proc/process.c).

## SAPP v1 header (little-endian)

The 64-byte header uses struct layout <4sHH12I8s: magic SAPP; version 1; architecture 1; header size; flags (zero); entry address; segment-table offset and count; metadata offset and size; exact file size; signature offset and size (both zero); relocation offset and count; eight reserved zero bytes.

A segment uses <6I8s: virtual address, memory size, file offset, file size, permissions, alignment, and eight reserved zero bytes. Permission bits are read=1, write=2, execute=4. Read permission is mandatory. W+X is forbidden. Segment addresses and alignments must satisfy the kernel page-alignment checks.

A relocation uses <3I: target virtual address, type, addend. Only ABS32 is accepted.

## Known kernel limitations

The current syscall dispatcher accepts only syscall 1 with magic argument 0x53414E44 as a kernel test. There is no stable public syscall ABI for console I/O, files, processes, windows, networking, or devices. The desktop is not yet a full window manager.

This SDK currently builds and validates executable packages; it does not claim that ordinary applications can interact with the OS yet. ABI additions must be made in sand-os first, then documented and versioned here.

## Compatibility policy

- Never infer a syscall number or register convention from examples.
- Never silently change SAPP v1 field layouts.
- Reject unsupported ELF layouts rather than generating packages the kernel rejects.
- Keep host-side build tools separate from the target OS runtime.
- Add tests for every accepted and rejected package condition.
