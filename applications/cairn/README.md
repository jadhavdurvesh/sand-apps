# CAIRN

**CAIRN** is the command environment for SAND OS. Version 0.7 organizes its command surface into POSIX-inspired utilities, a SAND-native namespace, and CAIRN shell/runtime features.

- **POSIX-inspired:** `ls`, `cd`, `pwd`, `mkdir`, `cp`, `mv`, `find`, `head`, `tail`, `grep`, `which`, `man`, and more.
- **SAND-native:** `sandctl`, `sapp`, `pkg`, `sysinfo`, `services`, `devices`, `session`, `theme`.
- **CAIRN runtime:** pipes, conditionals, aliases, environment variables, scripts, completion, extensions, and simulated jobs.

Run `commands`, `help --category SAND`, `apropos <term>`, and `man <command>`. CAIRN 0.7 adds capability-gated commands and a versioned native platform bridge contract. The command index is also available from the terminal toolbar. See [the 0.5 command architecture](../../docs/cairn-0.7.md).

All commands operate inside the virtual filesystem. Native commands clearly report unavailable kernel APIs rather than inventing live data. CAIRN does not invoke a host shell or access real disks. This is POSIX-inspired, not POSIX-certified.

## Native window (SAND OS)

`native/main.c` is a windowed terminal for the SAND window service (ABI v4): a 60x20 character grid with truecolor output, block cursor and one-line history that runs the sandsh command set (`native/shell_core.h`, shared with the console shell in sand-os). Start it with `open cairn` or from the dock launcher. The searchable registry, manuals and SAND-native namespace above are still host-prototype features.
