"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const declarations = fs.readFileSync(path.join(root, "sdk", "types", "sand.d.ts"), "utf8");
const docs = fs.readFileSync(path.join(root, "docs", "sdk.md"), "utf8");
const runtime = require("../sdk/runtime/sand-runtime.js");
const desktop = require("../sdk/runtime/desktop-services.js");
const packages = require("../sdk/package/package-manager.js");

test("public SDK declaration file exists and documents the host ABI boundary", () => {
  assert.match(declarations, /interface SandRuntimeInstance/);
  assert.match(declarations, /interface SandDesktopHost/);
  assert.match(declarations, /interface SandPackageManager/);
  assert.match(declarations, /interface SandAppMountContext/);
  assert.match(declarations, /sand\.app-runtime\/0\.1/);
  assert.match(declarations, /sand\.desktop-services\/0\.1/);
  assert.match(docs, /\\*\\*not\\*\\* a native SAND OS ABI/);
  assert.match(docs, /not a process sandbox/);
});

test("runtime declarations cover the implemented public runtime surface", () => {
  const source = fs.readFileSync(path.join(root, "sdk", "runtime", "sand-runtime.js"), "utf8");
  for (const method of ["init", "suspend", "resume", "stop", "onLifecycle", "requestService", "onMessage", "onPlatformEvent", "send"]) {
    assert.ok(source.includes(method), "runtime implementation exposes " + method);
    assert.ok(declarations.includes(method), "declarations include " + method);
  }
  assert.equal(runtime.ABI, "sand.app-runtime/0.1");
});

test("desktop and package declarations match the current host modules", () => {
  for (const method of ["launch", "stop", "listApps", "listWindows", "listNotifications"]) {
    assert.ok(declarations.includes(method), "desktop declarations include " + method);
  }
  for (const method of ["validatePackage", "createPackage", "createManager", "getPermissions", "setPermissions", "checkUpdates"]) {
    assert.ok(declarations.includes(method), "package declarations include " + method);
  }
  const data = new Map();
  const manager = packages.createManager({ storage: { get: (_owner, key) => data.get(key), set: (_owner, key, value) => data.set(key, value) } });
  for (const method of ["getPermissions", "setPermissions", "checkUpdates"]) {
    assert.equal(typeof manager[method], "function", "package manager exposes " + method);
  }
  assert.equal(desktop.ABI, "sand.desktop-services/0.1");
});

test("declarations do not advertise native process, filesystem or syscall APIs as implemented", () => {
  assert.match(docs, /Do not map these JavaScript host APIs to invented syscalls/);
  assert.match(docs, /Native integration requires separately versioned OS-side services/);
});
