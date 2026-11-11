(function(root,factory){const Sand=typeof module==="object"&&module.exports?require("./sand-runtime.js"):root.SandRuntime;const api=factory(Sand);if(typeof module==="object"&&module.exports)module.exports=api;root.SandDesktop=api;})(typeof globalThis!=="undefined"?globalThis:this,function(Sand){
"use strict";
if(!Sand)throw new Error("SAND application runtime must load before desktop services");
const CAP={
 "system.info":"platform.info.read","window.create":"platform.window.create","window.destroy":"platform.window.create","window.focus":"platform.window.create","window.minimize":"platform.window.create","window.maximize":"platform.window.create","window.restore":"platform.window.create","window.list":"platform.window.create",
 "notifications.create":"platform.notifications.create","notifications.dismiss":"platform.notifications.create","notifications.list":"platform.notifications.create",
 "files.read":"platform.files.read","files.list":"platform.files.read","files.stat":"platform.files.read","files.write":"platform.files.write","files.mkdir":"platform.files.write","files.delete":"platform.files.write"
};
class DesktopError extends Error{constructor(code,message){super(message);this.name="SandDesktopError";this.code=code}}
function fail(code,message){throw new DesktopError(code,message)}
function obj(v){return v!==null&&typeof v==="object"&&!Array.isArray(v)}
function clone(v){return JSON.parse(JSON.stringify(v))}
function eventHub(){const listeners=new Map();return {on(topic,fn){if(typeof topic!=="string"||typeof fn!=="function")fail("INVALID_EVENT","Invalid event subscription");if(!listeners.has(topic))listeners.set(topic,new Set());const set=listeners.get(topic);set.add(fn);let live=true;return()=>{if(!live)return false;live=false;set.delete(fn);if(!set.size)listeners.delete(topic);return true}},emit(topic,payload){const set=listeners.get(topic);if(!set)return 0;let n=0;for(const fn of Array.from(set)){fn(clone(payload));n++}return n},clear(){listeners.clear()}}}
function pathOf(input){if(typeof input!=="string"||!input.startsWith("/")||input.includes("\0")||input.length>512)fail("INVALID_PATH","A valid absolute virtual path is required");const raw=input;const parts=raw.split("/").filter(Boolean);if(parts.some(p=>p==="."||p===".."))fail("INVALID_PATH","Relative path segments are not allowed");return "/"+parts.join("/")}
function createDesktopHost(options={}){
 if(!obj(options))fail("INVALID_OPTIONS","Desktop host options must be an object");if(options.catalog!==undefined&&!Array.isArray(options.catalog))fail("INVALID_CATALOG","Desktop app catalogue must be an array");
 const catalog=new Map(),grantTable=new Map(),files=new Map(),windows=new Map(),notifications=new Map(),hub=eventHub();
 const storage=options.storage||Sand.createMemoryStorageAdapter();
 const appHost=Sand.createHost({storage});
 const systemInfo=Object.freeze(Object.assign({name:"SAND OS",desktopServices:"0.1.0",runtime:Sand.VERSION,environment:"host-preview"},options.systemInfo||{}));
 let windowSeq=0,noticeSeq=0;
 for(const raw of options.catalog||[]){const m=Sand.validateManifest(raw);if(catalog.has(m.id))fail("DUPLICATE_APP","Duplicate app in catalogue: "+m.id);catalog.set(m.id,m)}
 function identity(appId,cap){const grants=grantTable.get(appId);if(!grants)fail("APP_NOT_REGISTERED","Application is not registered with desktop services");if(!grants.has(cap))fail("PERMISSION_DENIED","Desktop service capability not granted: "+cap)}
 function appFiles(appId){if(!files.has(appId)){let saved=null;try{saved=storage.get(appId,"desktop.files.v1")}catch(_){}const entries=Array.isArray(saved)?saved:[["/",{type:"directory",modified:0}]];const fs=new Map(entries);if(!fs.has("/"))fs.set("/",{type:"directory",modified:0});files.set(appId,fs)}return files.get(appId)}
 function saveAppFiles(appId,fs){storage.set(appId,"desktop.files.v1",Array.from(fs.entries()))}
 function fileInfo(path,item){return {path,name:path.split("/").pop()||"/",type:item.type,size:item.type==="file"?item.content.length:0,modified:item.modified}}
 function dispatch(req){
  if(!obj(req)||req.abi!==Sand.ABI||typeof req.appId!=="string"||typeof req.service!=="string"||typeof req.operation!=="string")fail("INVALID_REQUEST","Malformed desktop service request");
  const key=req.service+"."+req.operation,cap=CAP[key];if(!cap||req.capability!==cap)fail("INVALID_REQUEST","Unknown service operation or incorrect capability");identity(req.appId,cap);
  const p=obj(req.payload)?req.payload:{};
  if(key==="system.info")return clone(systemInfo);
  if(key==="window.create"){
   const title=typeof p.title==="string"&&p.title.trim()?p.title.trim().slice(0,100):"Untitled";
   const width=Number.isInteger(p.width)?Math.max(240,Math.min(2400,p.width)):800,height=Number.isInteger(p.height)?Math.max(160,Math.min(1600,p.height)):600;
   const owned=Array.from(windows.values()).filter(w=>w.appId===req.appId);if(owned.length>=16)fail("WINDOW_LIMIT","An app may own at most 16 windows");
   const id="window-"+(++windowSeq),win={id,appId:req.appId,title,width,height,state:"normal",createdAt:Date.now()};
   windows.set(id,win);hub.emit("desktop.window.created",win);return clone(win)
  }
  if(key==="window.list")return Array.from(windows.values()).filter(w=>w.appId===req.appId).map(clone);
  if(key.startsWith("window.")){
   const win=windows.get(p.windowId);if(!win||win.appId!==req.appId)fail("WINDOW_NOT_FOUND","Window does not belong to this application");
   if(key==="window.destroy"){windows.delete(win.id);hub.emit("desktop.window.destroyed",{appId:req.appId,windowId:win.id});return {ok:true}}
   if(key==="window.focus"){win.state="focused";hub.emit("desktop.window.focused",win);return clone(win)}
   if(key==="window.minimize"){win.state="minimized";hub.emit("desktop.window.minimized",win);return clone(win)}
   if(key==="window.maximize"){win.state="maximized";hub.emit("desktop.window.maximized",win);return clone(win)}
   if(key==="window.restore"){win.state="normal";hub.emit("desktop.window.restored",win);return clone(win)}
  }
  if(key==="notifications.create"){
   const title=typeof p.title==="string"&&p.title.trim()?p.title.trim().slice(0,100):"Notification";
   const body=typeof p.body==="string"?p.body.slice(0,1000):"";
   const id="notice-"+(++noticeSeq),notice={id,appId:req.appId,title,body,createdAt:Date.now(),read:false};
   notifications.set(id,notice);hub.emit("desktop.notification.created",notice);return clone(notice)
  }
  if(key==="notifications.list")return Array.from(notifications.values()).filter(n=>n.appId===req.appId).map(clone);
  if(key==="notifications.dismiss"){const n=notifications.get(p.notificationId);if(!n||n.appId!==req.appId)fail("NOTIFICATION_NOT_FOUND","Notification does not belong to this application");notifications.delete(n.id);hub.emit("desktop.notification.dismissed",{appId:req.appId,notificationId:n.id});return {ok:true}}
  if(key.startsWith("files.")){
   const fs=appFiles(req.appId),path=pathOf(p.path);
   if(key==="files.write"){if(typeof p.content!=="string"||new TextEncoder().encode(p.content).length>1048576)fail("INVALID_CONTENT","File content must be text no larger than 1 MiB");if(path==="/")fail("INVALID_PATH","Cannot write the filesystem root");if(fs.has(path)&&fs.get(path).type!=="file")fail("IS_DIRECTORY","Cannot replace a directory with a file");const parent=path.slice(0,path.lastIndexOf("/"))||"/";if(!fs.has(parent))fail("DIRECTORY_NOT_FOUND","Parent directory does not exist");if(fs.get(parent).type!=="directory")fail("NOT_A_DIRECTORY","Parent path is not a directory");fs.set(path,{type:"file",content:p.content,modified:Date.now()});saveAppFiles(req.appId,fs);hub.emit("desktop.files.changed",{appId:req.appId,path,operation:"write"});return fileInfo(path,fs.get(path))}
   if(key==="files.mkdir"){if(fs.has(path))fail("ALREADY_EXISTS","Path already exists");const parent=path.slice(0,path.lastIndexOf("/"))||"/";if(!fs.has(parent)||fs.get(parent).type!=="directory")fail("DIRECTORY_NOT_FOUND","Parent directory does not exist");fs.set(path,{type:"directory",modified:Date.now()});saveAppFiles(req.appId,fs);hub.emit("desktop.files.changed",{appId:req.appId,path,operation:"mkdir"});return fileInfo(path,fs.get(path))}
   if(key==="files.read"){const f=fs.get(path);if(!f)fail("FILE_NOT_FOUND","File not found");if(f.type!=="file")fail("IS_DIRECTORY","Cannot read a directory");return f.content}
   if(key==="files.stat"){const f=fs.get(path);if(!f)fail("FILE_NOT_FOUND","Path not found");return fileInfo(path,f)}
   if(key==="files.list"){const dir=fs.get(path);if(!dir||dir.type!=="directory")fail("DIRECTORY_NOT_FOUND","Directory not found");const prefix=path==="/"?"/":path+"/",out=[];for(const [child,item] of fs){if(child!==path&&child.startsWith(prefix)&&!child.slice(prefix.length).includes("/"))out.push(fileInfo(child,item))}return out.sort((a,b)=>a.name.localeCompare(b.name))}
   if(key==="files.delete"){const f=fs.get(path);if(!f)fail("FILE_NOT_FOUND","Path not found");if(f.type==="directory"&&Array.from(fs.keys()).some(k=>k!==path&&k.startsWith(path+"/")))fail("DIRECTORY_NOT_EMPTY","Directory is not empty");fs.delete(path);saveAppFiles(req.appId,fs);hub.emit("desktop.files.changed",{appId:req.appId,path,operation:"delete"});return {ok:true}}
  }
  fail("UNSUPPORTED_OPERATION","Unsupported desktop service operation: "+key)
 }
 const adapter=Object.freeze({request:async req=>dispatch(req),subscribe(args){if(!obj(args)||typeof args.appId!=="string"||typeof args.topic!=="string"||typeof args.listener!=="function")fail("INVALID_SUBSCRIPTION","Invalid desktop event subscription");identity(args.appId,"platform.desktop.events");return hub.on(args.topic,payload=>{if(payload.appId===undefined||payload.appId===args.appId)args.listener(clone(payload))})}});
 const host=Object.freeze({
  version:"0.1.0",abi:"sand.desktop-services/0.1",adapter,
  launch(id,launchOptions={}){const manifest=catalog.get(id);if(!manifest)fail("APP_NOT_FOUND","Application is not in the desktop catalogue: "+id);if(appHost.getApp(id))fail("APP_ALREADY_RUNNING","Application is already running: "+id);const grants=launchOptions.grants===undefined?[]:launchOptions.grants;if(!Array.isArray(grants))fail("INVALID_GRANTS","Grants must be an array");grantTable.set(id,new Set(grants));try{return appHost.launch(manifest,Object.assign({},launchOptions,{platform:adapter}))}catch(e){grantTable.delete(id);throw e}},
  stop(id,reason){const ok=appHost.stop(id,reason);if(ok){grantTable.delete(id);for(const [wid,w] of windows)if(w.appId===id)windows.delete(wid);for(const [nid,n] of notifications)if(n.appId===id)notifications.delete(nid);hub.emit("desktop.app.stopped",{appId:id})}return ok},
  listApps:()=>appHost.listApps(),
  on:(topic,fn)=>hub.on(topic,fn),
  emit(topic,payload){if(typeof topic!=="string"||!topic.startsWith("desktop."))fail("INVALID_EVENT","Only desktop.* events may be emitted");const safe=clone(payload||{});delete safe.appId;delete safe.source;hub.emit(topic,Object.assign(safe,{source:"desktop-host"}));return true},
  listWindows:()=>Array.from(windows.values()).map(clone),
  listNotifications:()=>Array.from(notifications.values()).map(clone),
  get count(){return appHost.count}
 });
 return host
}
return Object.freeze({VERSION:"0.1.0",ABI:"sand.desktop-services/0.1",DesktopError,createDesktopHost});
});
