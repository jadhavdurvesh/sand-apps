# SAND application SDK

This directory currently contains only the stable binary-format declarations for the SAPP v1 package. It intentionally does not provide console, filesystem, process, GUI, or device calls: those APIs do not exist as a public kernel ABI yet.

Include headers from sdk/include when building host-side format tooling or an application that needs to inspect SAPP structures. Target applications should wait for a versioned syscall ABI before depending on kernel services.
