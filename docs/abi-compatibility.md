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

## SAND OS syscall ABI v4 (implemented in sand-os)

Applications call `int 0x80` with the number in EAX and arguments in EBX, ECX, EDX; the result is returned in EAX (negative = error). The headers in `sdk/native/include/sand/` are copies of the kernel's `sdk/sapp/include/sand/abi.h` and friends; **sand-os remains the source of truth** and these copies must be refreshed when the ABI changes.

| # | Name | Purpose |
|---|---|---|
| 1 | EXIT | end the process with a status |
| 2 | WRITE | write bytes to the console |
| 3 | GET_TICKS | 100 Hz tick counter |
| 4 | GETPID | current process id |
| 5 | YIELD | give up the CPU |
| 6 | SLEEP_MS | sleep (scheduler-blocked) |
| 7 | READ | blocking console read |
| 8–11 | FS_READ / FS_WRITE / FS_LIST / FS_REMOVE | SANDFS v1 files |
| 12–13 | SPAWN / WAIT | start an embedded app by name; wait for its exit status |
| 14–17 | SYSINFO / PROC_LIST / APP_LIST / DEVICE_LIST | system introspection |
| 18 | WIN_CREATE | `win_create(title, (w<<16)|h)` -> window id; surface 200-520 x 120-380, 3 windows system-wide |
| 19 | WIN_DRAW | `win_draw(id, sand_draw*, count<=64)`: batched draw commands rendered by the kernel in the SAND typeface and shape renderer |
| 20 | WIN_EVENT | `win_event(id, sand_event*)` -> 1 event / 0 none / <0 window gone (key, mouse down/up/move in surface coordinates) |
| 21 | WIN_CLOSE | close the window (it fades out; further calls on it return NOENT) |
| 22 | WIN_BLIT | `win_blit(id, sand_blit*)`: copy an app-owned 0x00RRGGBB pixel buffer into the surface, optional 1-4x integer upscale (a SAPP image is limited to 64 pages, so upscaling lets small buffers fill a window) |
| 23 | WIN_RESIZABLE | `win_resizable(id, (min_w<<16)|min_h)`: opt in to user resizing; the app then receives `SAND_EV_RESIZE` (x,y = new client size, surface cleared) and must redraw |

Shell: `run <app>` launches and waits; `open <app>` launches in the background so several windows can coexist (up to 3 app windows).

Errors: `-1` fail, `-2` bad user pointer, `-3` not found, `-4` no such syscall. A ring-3 fault ends the process with status `-256 - vector`. User pointers are range-validated by the kernel. The ABI is a **development ABI**: not frozen, and still no networking or per-app permission enforcement (window creation is not yet permission-gated). Apps are currently embedded in the kernel image; loading from SANDFS and SAPP v2 signature enforcement are future work.

## Known kernel limitations

Superseded detail: older kernels accepted only syscall 1. Current sand-os has the v2 development ABI above (console, files, processes, introspection). Still missing: a stable ABI, shared (zero-copy) pixel buffers, networking, device access and permission enforcement. The desktop shell (SAND Dusk) now provides the window service above.

This SDK currently builds and validates executable packages; it does not claim that ordinary applications can interact with the OS yet. ABI additions must be made in sand-os first, then documented and versioned here.

## Compatibility policy

- Never infer a syscall number or register convention from examples.
- Never silently change SAPP v1 field layouts.
- Reject unsupported ELF layouts rather than generating packages the kernel rejects.
- Keep host-side build tools separate from the target OS runtime.
- Add tests for every accepted and rejected package condition.

## Native launcher entry (`native.launcher`)

SAND OS builds its dock launcher from app manifests (`tools/gen_app_table.py` in sand-os). The `native.launcher` object here mirrors the entry in sand-os `apps/<name>/manifest.json` (`launcher`): `label` (<=15 ASCII chars), `subtitle` (<=23), `accent` and `accent2` (`#RRGGBB` gradient for the icon tile), `glyph` (one printable ASCII char) and `order`. An app without it is not shown in the launcher; at most 9 apps are listed. The generator fails the build on any malformed value.
