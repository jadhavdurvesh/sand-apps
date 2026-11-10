# CAIRN

**CAIRN** is the SAND command environment. Version 0.4 expands its host prototype with session persistence, script execution, completion and simulated file metadata.

## CAIRN 0.4

- Persistent browser session: virtual files, working directory, environment and aliases are restored from local browser storage
- Shell scripts: \`source file.csh\` or \`sh file.csh\`; blank lines and comments are skipped, with a nesting limit
- Tab completion for built-in/extension commands, aliases and virtual filesystem paths
- Simulated metadata commands: \`stat\`, \`chmod\`, \`groups\`, \`id\`
- Existing pipelines, conditional operators, command registry and virtual filesystem retained

## Try it

\`\`\`text
mkdir Archive
cd Archive
export PROJECT=SAND
write build.csh "# prepare\\necho Building $PROJECT | upper"
source build.csh
stat build.csh
chmod 600 build.csh
\`\`\`

## Persistence and security boundary

The browser preview stores a JSON snapshot in browser local storage. This is convenience persistence, not secure storage or a real disk filesystem. File ownership, groups and modes are simulated metadata; they are not an enforced kernel security boundary. Shell scripts execute only inside the CAIRN command engine. No host shell or real OS process is invoked.

Native SAPP integration remains pending stable public SAND filesystem, process, terminal and identity APIs.
