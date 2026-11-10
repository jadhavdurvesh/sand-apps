# CAIRN 0.4 implementation notes

## Session persistence
The session snapshot is a JSON-serializable object containing the virtual filesystem, current directory, environment and aliases. The browser adapter stores it under \`sand.cairn.session.v1\`. Jobs and command history are intentionally transient.

## Scripts
\`source\` and \`sh\` execute newline-delimited commands through the same parser and command registry. Blank lines and lines beginning with \`#\` are ignored. Script nesting is limited to eight levels.

## Completion
\`session.complete(input)\` returns command, alias or virtual-path candidates. The terminal UI uses this method for Tab completion.

## Identity metadata
New virtual files and directories receive simulated owner, group and mode metadata. \`stat\`, \`chmod\`, \`groups\` and \`id\` inspect or update this metadata. It is not a security boundary and is not enforced by the host or kernel.

## Native integration
All features in this release are host-preview features. No SAND OS repository or kernel API was changed.
