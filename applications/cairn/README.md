## Host prototype — 0.3.1

The shell engine now has corrected pipeline output and conditional short-circuit evaluation across command groups. Pipelines return only the final stage output; `&&` and `||` respect the previous command's exit status. This remains a sandboxed host prototype; job controls are simulated rather than real OS processes.
