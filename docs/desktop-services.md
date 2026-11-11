# SAND Desktop Services 0.1

This is a **host-side reference implementation**, not native SAND OS desktop functionality. It provides a common contract for an application launcher, window lifecycle, notifications, scoped desktop events and app-private virtual text files.

## Usage

```js
const Sand = require("./sdk/runtime/sand-runtime.js");
const Desktop = require("./sdk/runtime/desktop-services.js");
const manifest = {id:"example",name:"Example",version:"1.0.0",capabilities:["platform.window.create"]};
const desktop = Desktop.createDesktopHost({catalog:[manifest]});
const app = desktop.launch("example",{grants:["platform.window.create"]});
app.requestService("window","create",{title:"Example",width:800,height:600},"platform.window.create").then(console.log);
```

## Supported service operations

- `system.info`
- `window.create/focus/minimize/maximize/list/destroy`
- `notifications.create/list/dismiss`
- `files.mkdir/write/read/list/stat/delete`
- `onPlatformEvent(topic, listener)` for `desktop.*` notifications

All platform operations are capability-gated. Apps must request capabilities in their manifest and the host must separately grant them.

## Limitations

Window objects are **metadata only**; no compositor, native window or drawing surface exists. Notifications are host-side records, not OS toasts. Files are in-memory app-private text data, not the SAND filesystem, and are not durable across host restarts. Native integration must authenticate caller identity independently; this JS prototype is not a security sandbox for untrusted code. The desktop host's `adapter` is an integration surface, not a direct app-facing security boundary.

## Persistence update

The host preview persists each application's private virtual filesystem through the supplied runtime storage adapter under the `desktop.files.v1` key. The host preview uses browser local storage; a future native host must provide a durable storage adapter and enforce app identity outside the JavaScript process. LOCUS exercises directory creation, file creation, editing, listing, and deletion against this service.

## Windowed desktop preview

The preview shell in `preview/index.html` provides a launcher (Alt+Space), five-app dock, movable/resizable windows, focus and window-state controls, a notification center, and a clock. Logical window lifecycle operations are mirrored into the desktop service API. This is a browser-hosted desktop experience; it is not yet a kernel compositor or native SAND desktop.
