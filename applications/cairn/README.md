## Host prototype — 0.3.0

CAIRN now includes a reusable command registry, shell operators (pipe, conditional and sequential), session environment variables, aliases, pipeline filters and simulated background-job controls. It remains a host-side sandbox: commands never execute on the host and jobs are not OS processes. Native integration awaits documented SAND process, filesystem and terminal APIs.

Try: help; export PROJECT=sand; echo Building $PROJECT | upper; alias ll="ls -a"; ll; echo first ; echo second; echo simulated-job &; jobs; kill 1.
