(function(root,factory){const api=factory();if(typeof module==="object"&&module.exports)module.exports=api;root.SandPackages=api;})(typeof globalThis!=="undefined"?globalThis:this,function(){
"use strict";
const FORMAT="SANDPKG",FORMAT_VERSION=1,MAX_FILES=128,MAX_FILE_BYTES=1048576,MAX_TOTAL_BYTES=2097152,ID=/^[a-z][a-z0-9-]{1,47}$/,PATH=/^(?!\/)(?!.*(?:^|\/)\.\.(?:\/|$))[A-Za-z0-9._/-]{1,180}$/;
class PackageError extends Error{constructor(code,message){super(message);this.name="SandPackageError";this.code=code}}
function fail(code,message){throw new PackageError(code,message)}
function obj(v){return v!==null&&typeof v==="object"&&!Array.isArray(v)}
function clone(v){try{return JSON.parse(JSON.stringify(v))}catch(_){fail("INVALID_DATA","Package data must be JSON serializable")}}
function compareVersions(a,b){const parse=v=>v.split(/[+-]/,1)[0].split(".").map(Number);const x=parse(a),y=parse(b);for(let i=0;i<3;i++){if(x[i]!==y[i])return x[i]-y[i]}const ap=a.split("+")[0].split("-")[1],bp=b.split("+")[0].split("-")[1];if(ap===bp)return 0;if(ap===undefined)return 1;if(bp===undefined)return -1;return ap.localeCompare(bp)}
function validateManifest(m){
 if(!obj(m)||!ID.test(m.id||"")||typeof m.name!=="string"||!m.name.trim()||m.name.length>80||typeof m.version!=="string"||!/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/.test(m.version))fail("INVALID_MANIFEST","Manifest requires a valid app ID, name and semantic version");
 if(typeof m.description!=="string"||m.description.length>500)fail("INVALID_MANIFEST","Manifest description is required and must be under 500 characters");
 const caps=m.capabilities===undefined?[]:m.capabilities;if(!Array.isArray(caps)||caps.length>32||new Set(caps).size!==caps.length||caps.some(c=>typeof c!=="string"||!/^([a-z]+\.)+[a-z]+$/.test(c)))fail("INVALID_MANIFEST","Manifest capabilities must be unique capability identifiers");
 if(m.entrypoint!==undefined&&(typeof m.entrypoint!=="string"||!PATH.test(m.entrypoint)))fail("INVALID_MANIFEST","Invalid entrypoint path");
 return clone(m)
}
function validatePackage(pkg){
 if(!obj(pkg)||pkg.format!==FORMAT||pkg.formatVersion!==FORMAT_VERSION)fail("UNSUPPORTED_FORMAT","Expected SANDPKG format version 1");
 const manifest=validateManifest(pkg.manifest);if(!Array.isArray(pkg.files)||pkg.files.length<1||pkg.files.length>MAX_FILES)fail("INVALID_FILES","Package must contain 1–128 files");
 const seen=new Set();let total=0;const files=pkg.files.map(f=>{if(!obj(f)||typeof f.path!=="string"||!PATH.test(f.path)||f.path.startsWith("/")||f.path.split("/").some(p=>!p||p==="."||p==="..")||typeof f.content!=="string")fail("INVALID_FILE","Each file requires a safe relative path and UTF-8 text content");if(seen.has(f.path))fail("DUPLICATE_FILE","Duplicate package path: "+f.path);seen.add(f.path);const bytes=new TextEncoder().encode(f.content).length;if(bytes>MAX_FILE_BYTES)fail("FILE_TOO_LARGE","Package file exceeds 1 MiB: "+f.path);total+=bytes;return {path:f.path,content:f.content}});if(total>MAX_TOTAL_BYTES)fail("PACKAGE_TOO_LARGE","Uncompressed package contents exceed 2 MiB");if(manifest.entrypoint&&!seen.has(manifest.entrypoint))fail("MISSING_ENTRYPOINT","The declared entrypoint is not included in the package");
 return {format:FORMAT,formatVersion:FORMAT_VERSION,manifest,files,createdAt:typeof pkg.createdAt==="string"?pkg.createdAt:null}
}
function createPackage(manifest,files){return validatePackage({format:FORMAT,formatVersion:FORMAT_VERSION,manifest,files,createdAt:new Date().toISOString()})}
function createManager(options={}){
 const storage=options.storage;if(!storage||typeof storage.get!=="function"||typeof storage.set!=="function")fail("INVALID_STORAGE","A namespaced storage adapter is required");
 const catalog=new Map();for(const raw of options.catalog||[]){const m=validateManifest(raw);if(catalog.has(m.id))fail("DUPLICATE_APP","Duplicate catalogue app: "+m.id);catalog.set(m.id,m)}
 const KEY="registry.v1",OWNER="sand-package-manager";
 function read(){const data=storage.get(OWNER,KEY);return obj(data)?data:{packages:{},permissions:{}}}
 function write(data){storage.set(OWNER,KEY,data)}
 function list(){const data=read(),items=[];for(const m of catalog.values())items.push({id:m.id,name:m.name,version:m.version,description:m.description||"",capabilities:m.capabilities||[],source:"system",installed:true,protected:true});for(const p of Object.values(data.packages))items.push({id:p.manifest.id,name:p.manifest.name,version:p.manifest.version,description:p.manifest.description,capabilities:p.manifest.capabilities||[],source:"local-package",installed:true,protected:false,installedAt:p.installedAt});return items.sort((a,b)=>a.name.localeCompare(b.name))}
 function get(id){const m=catalog.get(id);if(m)return {manifest:clone(m),source:"system",protected:true};const p=read().packages[id];return p?{manifest:clone(p.manifest),files:clone(p.files),source:"local-package",protected:false,installedAt:p.installedAt}:null}
 function getPermissions(id){const app=catalog.get(id)||read().packages[id]?.manifest;if(!app)fail("APP_NOT_FOUND","Unknown application: "+id);const saved=read().permissions[id];return saved?{granted:saved.granted.slice(),updatedAt:saved.updatedAt}:{granted:[],updatedAt:null}}
 function setPermissions(id,grants){const app=catalog.get(id)||read().packages[id]?.manifest;if(!app)fail("APP_NOT_FOUND","Unknown application: "+id);if(!Array.isArray(grants)||new Set(grants).size!==grants.length||grants.some(c=>!(app.capabilities||[]).includes(c)))fail("INVALID_GRANTS","Permissions must be selected from the app's requested capabilities");const data=read();data.permissions[id]={granted:grants.slice(),updatedAt:new Date().toISOString()};write(data);return getPermissions(id)}
 function install(input){const pkg=validatePackage(input),id=pkg.manifest.id;if(catalog.has(id))fail("SYSTEM_APP","A system application cannot be replaced by a local package");const data=read(),old=data.packages[id];if(old){const cmp=compareVersions(pkg.manifest.version,old.manifest.version);if(cmp===0)fail("ALREADY_INSTALLED","This exact package version is already installed");if(cmp<0)fail("VERSION_DOWNGRADE","Package downgrade is not allowed")}data.packages[id]={manifest:pkg.manifest,files:pkg.files,installedAt:old?.installedAt||new Date().toISOString(),updatedAt:new Date().toISOString()};write(data);return {id,version:pkg.manifest.version,updated:!!old,launchable:false}}
 function uninstall(id){if(catalog.has(id))fail("SYSTEM_APP","System applications cannot be uninstalled");const data=read();if(!data.packages[id])return false;delete data.packages[id];delete data.permissions[id];write(data);return true}
 function removePermissions(id){const data=read();delete data.permissions[id];write(data);return true}
 function checkUpdates(available=[]){const data=read(),updates=[];for(const pkg of available){const p=validatePackage(pkg),old=data.packages[p.manifest.id];if(old&&compareVersions(p.manifest.version,old.manifest.version)>0)updates.push({id:p.manifest.id,current:old.manifest.version,available:p.manifest.version})}return updates}
 return Object.freeze({format:FORMAT,formatVersion:FORMAT_VERSION,validateManifest,validatePackage,createPackage,compareVersions,list,get,getPermissions,setPermissions,install,uninstall,removePermissions,checkUpdates});
}
return Object.freeze({FORMAT,FORMAT_VERSION,PackageError,validateManifest,validatePackage,createPackage,compareVersions,createManager});
});
