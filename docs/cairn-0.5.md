# CAIRN 0.5 — command layers

CAIRN separates its command surface into three intentional layers.

## POSIX-inspired commands
The prototype includes `pwd`, `ls`, `cd`, `mkdir`, `touch`, `cat`, `write`, `rm`, `cp`, `mv`, `find`, `head`, `tail`, `grep`, `wc`, `sort`, `which`, `man`, `chmod`, and `stat`. This is a practical subset, not POSIX certification. All file operations target the virtual filesystem. `rm` requires explicit `--confirm`; copy and move refuse to overwrite.

## Native SAND commands
- `sandctl status|help` — SAND integration status
- `sapp list|info|verify` and `pkg` — package workflow entry points
- `sysinfo` — OS and runtime information
- `services` and `devices` — service/device manager interfaces
- `session info|save` — session information
- `theme dark|light|system` — theme preference

These commands are registered, but host-preview responses identify unavailable kernel services. No invented CPU, memory, device, service, or package-installation data is presented as live state. Real package verification remains in `tools/sapp_inspect.py`.

## CAIRN runtime
Environment variables, aliases, pipes, `&&` / `||`, sequential `;`, simulated background jobs, scripts (`source` / `sh`), completion, and extension registration.

## Boundary
CAIRN is not a POSIX shell and does not invoke Bash, PowerShell, CMD, or the host OS. It cannot access real disks or kernel services in this preview. File modes and ownership remain simulated metadata. Native integration requires versioned SAND OS terminal, filesystem, process, package, service, device, and system-information APIs.
