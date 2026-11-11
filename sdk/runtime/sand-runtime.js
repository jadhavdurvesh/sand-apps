(function(root,factory){const api=factory();if(typeof module==="object"&&module.exports)module.exports=api;root.SandRuntime=api;})(typeof globalThis!=="undefined"?globalThis:this,function(){
"use strict";
const VERSION="0.1.0",ABI="sand.app-runtime/0.1";
const STATES=Object.freeze({CREATED:"created",INITIALIZING:"initializing",READY:"ready",SUSPENDED:"suspended",STOPPING:"stopping",STOPPED:"stopped",FAILED:"failed"});
const CAPABILITIES=Object.freeze({"storage.read":"Read private app storage","storage.write":"Write private app storage","storage.delete":"Delete private app storage","settings.read":"Read app settings","settings.write":"Change app settings","ipc.send":"Send app messages","ipc.receive":"Receive app messages","platform.info.read":"Read platform information","platform.window.create":"Request a native window","platform.files.read":"Read through the native file service","platform.files.write":"Write through the native file service","platform.process.read":"Inspect processes","platform.device.read":"Inspect devices","platform.network.read":"Read network information","platform.notifications.create":"Create and manage app notifications","platform.desktop.events":"Subscribe to desktop events"});
const ID=/^[a-z][a-z0-9-]{1,47}$/,KEY=/^[a-zA-Z0-9][a-zA-Z0-9._/-]{0,127}$/,TOPIC=/^[a-z][a-z0-9._:-]{0,63}$/;
const internalDelivery=new WeakMap();
function requiredServiceCapability(service,operation){if(service==="system"&&operation==="info")return "platform.info.read";if(service==="window"&&["create","destroy","focus","minimize","maximize","list"].includes(operation))return "platform.window.create";if(service==="files"&&["read","list","stat"].includes(operation))return "platform.files.read";if(service==="files"&&["write","create","delete","mkdir"].includes(operation))return "platform.files.write";if(service==="process"&&["list","info"].includes(operation))return "platform.process.read";if(service==="device"&&["list","info"].includes(operation))return "platform.device.read";if(service==="network"&&["list","info","status"].includes(operation))return "platform.network.read";if(service==="notifications"&&["create","dismiss","list"].includes(operation))return "platform.notifications.create";return null}
class RuntimeError extends Error{constructor(code,message){super(message);this.name="SandRuntimeError";this.code=code}}
function fail(code,message){throw new RuntimeError(code,message)}
function object(v){return v!==null&&typeof v==="object"&&!Array.isArray(v)}
function clone(v){if(v===undefined)fail("INVALID_DATA","undefined is not serializable");try{return JSON.parse(JSON.stringify(v))}catch(_){fail("INVALID_DATA","Value must be JSON-serializable")}}
function validateManifest(m){
 if(!object(m)||!ID.test(m.id||"")||typeof m.name!=="string"||!m.name.trim()||typeof m.version!=="string"||!/^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/.test(m.version))fail("INVALID_MANIFEST","Manifest requires a valid id, name and semantic version");
 const caps=m.capabilities===undefined?[]:m.capabilities;
 if(!Array.isArray(caps)||new Set(caps).size!==caps.length||caps.some(c=>typeof c!=="string"||!Object.prototype.hasOwnProperty.call(CAPABILITIES,c)))fail("INVALID_MANIFEST","Manifest contains unknown or duplicate capabilities");
 return Object.freeze({id:m.id,name:m.name,version:m.version,capabilities:Object.freeze(caps.slice())});
}
function createMemoryStorageAdapter(){const data=new Map();return Object.freeze({get(id,key){const v=data.get(id+":"+key);return v===undefined?null:clone(v)},set(id,key,v){data.set(id+":"+key,clone(v));return true},remove(id,key){return data.delete(id+":"+key)},keys(id){const p=id+":";return Array.from(data.keys()).filter(k=>k.startsWith(p)).map(k=>k.slice(p.length)).sort()}})}
function createLocalStorageAdapter(storage){
 if(!storage||typeof storage.getItem!=="function"||typeof storage.setItem!=="function"||typeof storage.removeItem!=="function")fail("INVALID_ADAPTER","Storage-compatible object required");
 const prefix="sand.runtime.v1.",key=(id,k)=>prefix+id+":"+k;
 return Object.freeze({get(id,k){const raw=storage.getItem(key(id,k));if(raw===null)return null;try{return JSON.parse(raw)}catch(_){fail("STORAGE_CORRUPT","Invalid stored JSON: "+k)}},set(id,k,v){storage.setItem(key(id,k),JSON.stringify(clone(v)));return true},remove(id,k){storage.removeItem(key(id,k));return true},keys(id){const p=prefix+id+":",out=[];for(let i=0;i<storage.length;i++){const k=storage.key(i);if(k&&k.startsWith(p))out.push(k.slice(p.length))}return out.sort()}});
}
function emitter(){
 const map=new Map();
 return Object.freeze({
  on(name,fn){if(typeof name!=="string"||!TOPIC.test(name)||typeof fn!=="function")fail("INVALID_EVENT","Invalid event or listener");if(!map.has(name))map.set(name,new Set());const set=map.get(name);set.add(fn);let live=true;return()=>{if(!live)return false;live=false;set.delete(fn);if(!set.size)map.delete(name);return true}},
  emit(name,payload){const set=map.get(name);if(!set)return 0;const safe=clone(payload===undefined?null:payload);let n=0;for(const fn of Array.from(set)){fn(safe);n++}return n},
  clear(){map.clear()}
 });
}
function check(grants,cap){if(!Object.prototype.hasOwnProperty.call(CAPABILITIES,cap))fail("UNKNOWN_CAPABILITY","Unknown capability: "+cap);if(!grants.has(cap))fail("PERMISSION_DENIED","Capability not granted: "+cap)}
function matches(value,schema){if(schema.type==="array")return Array.isArray(value);if(schema.type==="object")return object(value);if(schema.type==="integer")return Number.isInteger(value);if(schema.type==="number")return typeof value==="number"&&Number.isFinite(value);return typeof value===schema.type}
function validateSettings(schemas){
 if(!object(schemas))fail("INVALID_SETTINGS","Settings schema must be an object");
 const normalized={};
 for(const [name,s] of Object.entries(schemas)){
  if(!/^[a-z][a-zA-Z0-9._-]{0,63}$/.test(name)||!object(s)||!["string","boolean","number","integer","object","array"].includes(s.type)||!Object.prototype.hasOwnProperty.call(s,"default")||!matches(s.default,s))fail("INVALID_SETTINGS","Invalid setting schema: "+name);
  if(s.enum!==undefined&&(!Array.isArray(s.enum)||!s.enum.length||!s.enum.every(v=>matches(v,s))||!s.enum.some(v=>JSON.stringify(v)===JSON.stringify(s.default))))fail("INVALID_SETTINGS","Invalid setting enum: "+name);
  const safe=clone(s);if(safe.enum)safe.enum=Object.freeze(safe.enum);normalized[name]=Object.freeze(safe);
 }
 return Object.freeze(normalized);
}
function createRuntime(options={}){
 if(!object(options))fail("INVALID_OPTIONS","Runtime options must be an object");
 const manifest=validateManifest(options.manifest),requested=new Set(manifest.capabilities),list=options.grants===undefined?[]:options.grants;
 if(!Array.isArray(list))fail("INVALID_GRANTS","Grants must be an array");
 const grants=new Set(list);for(const c of grants){if(!requested.has(c))fail("CAPABILITY_NOT_REQUESTED","Grant was not requested: "+c);if(!Object.prototype.hasOwnProperty.call(CAPABILITIES,c))fail("UNKNOWN_CAPABILITY","Unknown capability: "+c)}
 const storage=options.storage||createMemoryStorageAdapter();for(const m of ["get","set","remove","keys"])if(typeof storage[m]!=="function")fail("INVALID_ADAPTER","Storage adapter missing "+m);
 const platform=options.platform&&typeof options.platform.request==="function"?options.platform:null,transport=options.transport&&typeof options.transport.send==="function"?options.transport:null;
 const events=emitter(),lifecycle=emitter(),messages=emitter(),schemas=validateSettings(options.settings||{});
 let state=STATES.CREATED,lastError=null,runtime;
 const active=()=>{if(state!==STATES.READY)fail("INVALID_STATE","App must be ready; state is "+state)},usable=()=>{if([STATES.STOPPING,STATES.STOPPED,STATES.FAILED].includes(state))fail("INVALID_STATE","App storage is unavailable in state "+state)};
 const appStorage=Object.freeze({
  get(k){usable();check(grants,"storage.read");if(typeof k!=="string"||!KEY.test(k))fail("INVALID_KEY","Invalid storage key");return storage.get(manifest.id,k)},
  set(k,v){usable();check(grants,"storage.write");if(typeof k!=="string"||!KEY.test(k))fail("INVALID_KEY","Invalid storage key");storage.set(manifest.id,k,clone(v));return true},
  remove(k){usable();check(grants,"storage.delete");if(typeof k!=="string"||!KEY.test(k))fail("INVALID_KEY","Invalid storage key");return storage.remove(manifest.id,k)},
  keys(){usable();check(grants,"storage.read");return storage.keys(manifest.id)}
 });
 const settings=Object.freeze({
  get(name){usable();check(grants,"settings.read");if(!Object.prototype.hasOwnProperty.call(schemas,name))fail("UNKNOWN_SETTING","Unknown setting: "+name);const v=storage.get(manifest.id,"settings."+name);return v===null?clone(schemas[name].default):v},
  set(name,value){usable();check(grants,"settings.write");const s=schemas[name];if(!s)fail("UNKNOWN_SETTING","Unknown setting: "+name);const v=clone(value);if(!matches(v,s)||(Array.isArray(s.enum)&&!s.enum.some(x=>JSON.stringify(x)===JSON.stringify(v))))fail("INVALID_SETTING","Invalid value for setting: "+name);storage.set(manifest.id,"settings."+name,v);events.emit("settings.changed",{name,value:v});return v},
  all(){usable();check(grants,"settings.read");const out={};for(const name of Object.keys(schemas))out[name]=settings.get(name);return out}
 });
 function transition(next,detail){const previous=state;state=next;const event={appId:manifest.id,previous,state:next,detail:detail===undefined?null:clone(detail)};lifecycle.emit("change",event);events.emit("lifecycle."+next,event);return event}
 runtime={
  abi:ABI,version:VERSION,manifest,
  get state(){return state},get error(){return lastError?{name:lastError.name,code:lastError.code||"APP_ERROR",message:lastError.message}:null},
  get capabilities(){return Object.freeze({requested:Object.freeze(Array.from(requested).sort()),granted:Object.freeze(Array.from(grants).sort()),has:c=>grants.has(c),describe:c=>CAPABILITIES[c]||null})},
  on:(name,fn)=>events.on(name,fn),emit(name,payload){active();return events.emit(name,payload)},onLifecycle:fn=>lifecycle.on("change",fn),
  init(context){if(state!==STATES.CREATED)fail("INVALID_STATE","Only created apps can initialize");transition(STATES.INITIALIZING,context||null);try{if(typeof options.onInitialize==="function"){const result=options.onInitialize(runtime,context||null);if(result&&typeof result.then==="function")fail("ASYNC_INITIALIZER","Runtime 0.1 requires a synchronous initializer")}transition(STATES.READY,null);events.emit("app.ready",{appId:manifest.id});return runtime}catch(e){lastError=e;transition(STATES.FAILED,{message:e.message});throw e}},
  suspend(reason){if(state!==STATES.READY)fail("INVALID_STATE","Only ready apps can suspend");transition(STATES.SUSPENDED,{reason:reason||"requested"});return runtime},
  resume(){if(state!==STATES.SUSPENDED)fail("INVALID_STATE","Only suspended apps can resume");transition(STATES.READY,null);events.emit("app.resumed",{appId:manifest.id});return runtime},
  stop(reason){if(state===STATES.STOPPED)return runtime;if(![STATES.READY,STATES.SUSPENDED,STATES.FAILED].includes(state))fail("INVALID_STATE","Cannot stop from state "+state);transition(STATES.STOPPING,{reason:reason||"requested"});events.emit("app.stopping",{appId:manifest.id});if(typeof options.onStop==="function")options.onStop(runtime,reason||"requested");transition(STATES.STOPPED,null);events.clear();lifecycle.clear();messages.clear();return runtime},
  storage:appStorage,settings,
  requestService(service,operation,payload={},capability){active();if(typeof service!=="string"||!/^[a-z][a-z0-9._-]{0,47}$/.test(service)||typeof operation!=="string"||!/^[a-z][a-z0-9._-]{0,63}$/.test(operation))return Promise.reject(new RuntimeError("INVALID_REQUEST","Invalid service or operation"));const required=requiredServiceCapability(service,operation);if(!required||capability!==required)return Promise.reject(new RuntimeError("INVALID_REQUEST","Service operation requires its designated capability"));try{check(grants,required)}catch(e){return Promise.reject(e)}if(!platform)return Promise.reject(new RuntimeError("SERVICE_UNAVAILABLE","Native platform adapter is not connected"));let safe;try{safe=clone(payload)}catch(e){return Promise.reject(e)}return Promise.resolve().then(()=>platform.request({abi:ABI,appId:manifest.id,service,operation,capability:required,payload:safe})).then(clone)},
  onMessage(topic,fn){usable();check(grants,"ipc.receive");if(typeof topic!=="string"||!TOPIC.test(topic))fail("INVALID_TOPIC","Invalid message topic");return messages.on(topic,fn)},\n  onPlatformEvent(topic,fn,capability="platform.desktop.events"){usable();check(grants,capability);if(capability!=="platform.desktop.events")fail("INVALID_CAPABILITY","Desktop event subscriptions require platform.desktop.events");if(!platform||typeof platform.subscribe!=="function")fail("SERVICE_UNAVAILABLE","Desktop event adapter is not connected");if(typeof topic!=="string"||!TOPIC.test(topic)||typeof fn!=="function")fail("INVALID_SUBSCRIPTION","Invalid desktop event subscription");return platform.subscribe({appId:manifest.id,topic,listener:fn,capability})},
  send(target,topic,payload){active();check(grants,"ipc.send");if(!transport)return Promise.reject(new RuntimeError("IPC_UNAVAILABLE","Inter-app transport is not connected"));if(!ID.test(target||"")||typeof topic!=="string"||!TOPIC.test(topic))return Promise.reject(new RuntimeError("INVALID_MESSAGE","Invalid target or topic"));let safe;try{safe=clone(payload)}catch(e){return Promise.reject(e)}return transport.send({from:manifest.id,to:target,topic,payload:safe})},
  
 };
 internalDelivery.set(runtime,message=>{if(state!==STATES.READY)return false;check(grants,"ipc.receive");return messages.emit(message.topic,Object.freeze(clone(message)))});
 return Object.freeze(runtime);
}
function createHost(options={}){
 if(!object(options))fail("INVALID_OPTIONS","Host options must be an object");
 const storage=options.storage||createMemoryStorageAdapter(),platform=options.platform||null,apps=new Map();
 return Object.freeze({
  launch(manifest,launchOptions={}){const clean=validateManifest(manifest);if(apps.has(clean.id))fail("APP_ALREADY_RUNNING","App already running: "+clean.id);const app=createRuntime({manifest,grants:launchOptions.grants===undefined?[]:launchOptions.grants,storage:launchOptions.storage||storage,platform:launchOptions.platform||platform,settings:launchOptions.settings||{},onInitialize:launchOptions.onInitialize,onStop:launchOptions.onStop,transport:{send:message=>{const target=apps.get(message.to);if(!target)return Promise.reject(new RuntimeError("APP_NOT_FOUND","Target app is not running: "+message.to));try{return Promise.resolve(internalDelivery.get(target)(message))}catch(e){return Promise.reject(e)}}}});apps.set(clean.id,app);try{app.init(launchOptions.context||null)}catch(e){apps.delete(clean.id);throw e}return app},
  getApp:id=>apps.get(id)||null,
  listApps:()=>Array.from(apps.values()).map(app=>({id:app.manifest.id,name:app.manifest.name,version:app.manifest.version,state:app.state})),
  stop(id,reason){const app=apps.get(id);if(!app)return false;app.stop(reason);apps.delete(id);return true},
  get count(){return apps.size}
 });
}
return Object.freeze({VERSION,ABI,STATES,CAPABILITIES,RuntimeError,validateManifest,createMemoryStorageAdapter,createLocalStorageAdapter,createRuntime,createHost});
});
