# SAND Apps design system

## Principles

Quiet, precise, technical and readable. Dark graphite surfaces, restrained cool accents, clear hierarchy, keyboard-first behavior, visible focus and accessible control labels. Avoid decorative complexity that competes with content.

## Tokens

| Token | Value | Use |
|---|---|---|
| Canvas | `#0b0e13` | Background |
| Surface | `#121821` | Panels |
| Elevated | `#192331` | Raised surfaces |
| Border | `#283545` | Dividers |
| Text | `#e8eef5` | Primary text |
| Muted | `#93a2b4` | Secondary text |
| Accent | `#83b7ff` | Interactive emphasis |
| Success | `#74d6aa` | Positive status |

## Components

AppShell, PageHeader, Panel, ActionButton, StatusPill and EmptyState are the initial shared component contracts. The host preview implements these as HTML/CSS patterns, not a native widget toolkit.

## Interaction

Keyboard operation is a requirement. Never communicate state using color alone. Confirm destructive actions. Preview preferences and demo data are browser-local; native persistence awaits the OS filesystem API.
