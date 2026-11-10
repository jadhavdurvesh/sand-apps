# CAIRN

**CAIRN** is the command environment for SAND OS. Version 0.5 organizes its command surface into POSIX-inspired utilities, a SAND-native namespace, and CAIRN shell/runtime features.

- **POSIX-inspired:** `ls`, `cd`, `pwd`, `mkdir`, `cp`, `mv`, `find`, `head`, `tail`, `grep`, `which`, `man`, and more.
- **SAND-native:** `sandctl`, `sapp`, `pkg`, `sysinfo`, `services`, `devices`, `session`, `theme`.
- **CAIRN runtime:** pipes, conditionals, aliases, environment variables, scripts, completion, extensions, and simulated jobs.

Run `help` and `man <command>`. See [the 0.5 command architecture](../../docs/cairn-0.5.md).

All commands operate inside the virtual filesystem. Native commands clearly report unavailable kernel APIs rather than inventing live data. CAIRN does not invoke a host shell or access real disks. This is POSIX-inspired, not POSIX-certified.
