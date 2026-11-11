"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const vm=require("node:vm");
const root=path.resolve(__dirname,"..");
const apps=["cairn","locus","quanta","cadence","keystone","glyph","morrow","chronos","pulse","prism","crate","spectra","beacon"];

test("first-party application modules parse and register independently",()=>{
 const context={console, setTimeout, clearTimeout};
 context.window=context;
 context.document={};
 context.SandUI=require("../sdk/ui/app-kit.js");
 context.localStorage={getItem(){return null},setItem(){},removeItem(){}};
 vm.createContext(context);
 for(const id of apps){
  const file=path.join(root,"applications",id,"app.js");
  const source=fs.readFileSync(file,"utf8");
  assert.doesNotThrow(()=>new vm.Script(source,{filename:file}),id+" syntax");
  assert.doesNotThrow(()=>vm.runInContext(source,context,{filename:file}),id+" registration");
 }
 assert.deepEqual(Array.from(Object.keys(context.SandApps)).sort(),apps.slice().sort());
 for(const id of apps)assert.equal(typeof context.SandApps[id].mount,"function",id+" mount export");
});

test("desktop host dispatches to application modules, not inline legacy renderers",()=>{
 const source=fs.readFileSync(path.join(root,"preview","app.js"),"utf8");
 assert.match(source,/appModule\.mount/);
 assert.doesNotMatch(source,/render:terminal|render:files|render:calculator|render:tasks|render:settings/);
 const html=fs.readFileSync(path.join(root,"preview","index.html"),"utf8");
 for(const id of apps)assert.ok(html.includes("../applications/"+id+"/app.js"),id+" script included");
 assert.ok(html.includes("../sdk/ui/app-kit.js"),"shared UI kit loaded before apps");
});
