"use strict";
const test=require("node:test"),assert=require("node:assert/strict");
const Sand=require("../sdk/runtime/sand-runtime.js"),UI=require("../sdk/ui/app-kit.js");
const manifest={id:"ui-test",name:"UI Test",version:"1.0.0",capabilities:["storage.read","storage.write"]};
test("shared store persists cloned values through app-scoped runtime storage",()=>{const storage=Sand.createMemoryStorageAdapter(),host=Sand.createHost({storage}),app=host.launch(manifest,{grants:manifest.capabilities}),store=UI.createStore(app,"state",{items:[]});store.update(s=>({items:[...s.items,"one"]}));const restored=UI.createStore(app,"state",{items:[]});assert.deepEqual(restored.get(),{items:["one"]});const value=restored.get();value.items.push("outside");assert.deepEqual(restored.get(),{items:["one"]})});
test("shared store validates values and requires app storage permissions",()=>{const app=Sand.createRuntime({manifest,grants:["storage.read"]});app.init();assert.throws(()=>UI.createStore(app,"state",{}).set({a:1}),e=>e.code==="PERMISSION_DENIED");assert.throws(()=>UI.createStore(app,"state",[],v=>{if(!Array.isArray(v))throw Error("array required");return v}).set({}),/array required/)});
test("HTML escaping covers all dangerous text delimiters",()=>{assert.equal(UI.escapeHTML("<tag a=\"x\">&'"),"&lt;tag a=&quot;x&quot;&gt;&amp;&#39;")});
test("byte formatting handles zero, bytes and larger values",()=>{assert.equal(UI.formatBytes(0),"0 B");assert.equal(UI.formatBytes(1024),"1.0 KB");assert.equal(UI.formatBytes(1048576),"1.0 MB")});
