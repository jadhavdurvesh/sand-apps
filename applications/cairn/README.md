# CAIRN

**CAIRN** is the SAND command environment. Its first milestone is a tested command engine with a sandboxed virtual filesystem, predictable parsing and keyboard-first interaction.

## Host prototype — 0.2.0

- Quoted argument parsing and clear command errors
- `help`, `clear`, `echo`, `pwd`, `ls`, `cd`, `mkdir`, `touch`, `cat`, `write`, `rm`, `date`, `whoami`, `uname`, `history`, `version`
- In-memory virtual filesystem; absolute and relative paths
- Command history (arrow keys), Tab completion and Ctrl+L clear
- Explicit confirmation flag required for file deletion
- No host shell execution, real disk access or undocumented kernel calls

## Try it

Open `preview/index.html` and select CAIRN. Try:

```text
help
pwd
ls
cd Documents
cat welcome.txt
write ideas.txt "Build a beautiful OS"
cat ideas.txt
history
```

## Architecture

- `preview/cairn.js` contains the command parser, session and virtual filesystem.
- The module is usable in browser and Node.js tests.
- The UI is a host preview only. A future native adapter will be added after a documented SAND syscall and application ABI exists.

## Status

Host prototype 0.2.0. Native SAPP integration: blocked on the stable public OS ABI.
