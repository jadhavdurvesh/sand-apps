# CAIRN

**CAIRN** is the SAND command environment. Its host prototype is a reusable command engine with a sandboxed virtual filesystem, command registry, session environment and keyboard-first terminal UI.

## Host prototype — 0.3.1

- Command registry for first-party and extension built-ins
- Quoted argument parsing and environment-variable expansion
- Pipes, conditional execution and sequential command operators
- Session variables through `export`, `env` and `unset`
- Aliases through `alias` and `unalias`
- Pipeline filters: `upper`, `lower`, `grep`, `wc` and `sort`
- Simulated background job table: `jobs`, `fg`, `bg` and `kill`
- Sandboxed virtual filesystem; no host shell or real disk access

## Try it

```text
help
export PROJECT=sand
echo Building $PROJECT | upper
alias ll="ls -a"
ll
false && echo no || echo yes
echo simulated-job &
jobs
kill 1
```

Background jobs are lifecycle simulations, not operating-system processes. Native integration awaits documented SAND process, filesystem and terminal APIs.
