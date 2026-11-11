# SAND Desktop Preview — Usage

## Start

From the repository root, run:

```sh
python3 -m http.server 8000
```

Open **http://localhost:8000/preview/** in a modern browser. Keep the server running while using the preview.

## Desktop controls

- **SAND button** — open the application launcher.
- **Alt + Space** — toggle the launcher.
- **Dock** — launch or focus one of the five core applications.
- **Drag a title bar** — move a window.
- **Window controls** — minimize, maximize/restore, or close.
- **Notification icon** — open the notification center.
- **Ctrl + Alt + 1–5** — launch CAIRN, LOCUS, QUANTA, CADENCE, or KEYSTONE.
- **Escape** — close the launcher or notification panel.

## Core applications

- **CAIRN:** run commands in its virtual shell. Its filesystem is a simulation and does not access the computer's real shell or disk.
- **LOCUS:** create folders and text files, navigate directories, edit/save files, and delete items. Its private virtual workspace persists in browser storage.
- **QUANTA:** calculate with parentheses, arithmetic operators, keyboard input, recent calculations, and copy-result action.
- **CADENCE:** create tasks with priority and due dates, filter open/completed tasks, track overdue items, and receive completion notifications.
- **KEYSTONE:** change the preview theme, accent color, and reduced-motion preference.

## Persistence

The preview stores application data and desktop window layout in browser local storage for the current browser profile. Clearing site data resets the preview. It does not write to the host filesystem.

## Scope

This is an interactive browser-hosted desktop prototype. It is not yet a native SAND OS compositor, login manager, filesystem, process manager, or hardware service. Native integration requires the versioned OS-side interfaces and kernel support described in the SDK and ABI documentation.
