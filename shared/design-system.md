# SAND Apps design system

Version **1.0.0** · Host application layer

## Principles

Quiet, precise, technical and readable. Prefer deliberate spacing, clear hierarchy, thin borders and restrained contrast over decorative effects. Keyboard operation and visible focus are first-class requirements. Each application may have a small identity accent, but the shared shell remains consistent.

## Tokens

| Token | Value | Use |
|---|---|---|
| Canvas | `#0b0d14` | Desktop and app background |
| Surface | `#131722` | Primary panels |
| Elevated | `#1a2030` | Raised controls and surfaces |
| Border | `#2a3042` | Dividers and outlines |
| Text | `#e9eaf2` | Primary text |
| Muted | `#9299ad` | Secondary text |
| Accent | `#a99bff` | Shared interactive emphasis |
| Success | `#82c8ad` | Positive state |
| Warning | `#d7bd8d` | Caution |
| Danger | `#d98991` | Destructive state |

Application accents: CAIRN violet, LOCUS jade, QUANTA pale lilac, CADENCE muted champagne, KEYSTONE cool silver-blue.

## Shared interaction contracts

- AppShell: owns application window lifecycle and injected runtime.
- PageHeader: title, context and primary actions.
- Panel: content grouping with consistent surface and border.
- ActionButton: primary, secondary and destructive variants.
- StatusPill: state label that never relies on colour alone.
- EmptyState: explains the empty state and offers a useful next action.
- Keyboard focus: every interactive control has a visible `:focus-visible` treatment.

## Module contract

Each first-party application exports a single module on `window.SandApps`:

```js
window.SandApps.example = {
  mount({ workspace, currentRuntime, renderNotifications }) {
    // Mount the app into its host-owned workspace.
  }
};
```

Modules are loaded by the desktop host and receive only the active workspace and app-scoped runtime. Application logic belongs in `applications/<id>/app.js`; the host owns window lifecycle and app discovery. CAIRN delegates its terminal implementation to `preview/cairn.js` until the shell engine is extracted into its own package.

## Platform boundary

The current applications are first-party host applications running against the SAND Apps runtime and desktop service contracts. They are not yet native SAPP binaries. Preview storage is browser-local and app-namespaced. Native persistence and privileged system services require a versioned, independently enforced OS adapter. Never fall back to host shell commands or direct host-disk access.
