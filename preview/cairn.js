(function(root,factory){const api=factory();if(typeof module==="object"&&module.exports)module.exports=api;root.Cairn=api;})(typeof globalThis!=="undefined"?globalThis:this,function(){
"use strict";
const COMMANDS=["help","clear","echo","pwd","ls","cd","mkdir","touch","cat","write","rm","date","whoami","uname","history","version"];
const HELP={
help:"help [command]                 Show command help",
clear:"clear                          Clear the terminal",
echo:"echo <text>                    Print text",
pwd:"pwd                            Print the current directory",
ls:"ls [-a] [path]                 List directory contents",
cd:"cd [path]                      Change the current directory",
mkdir:"mkdir <name>                   Create a directory",
touch:"touch <file>                   Create an empty file",
cat:"cat <file>                     Print a text file",
write:"write <file> <text>            Create or replace a text file",
rm:"rm --confirm <file>            Delete a file (explicit confirmation required)",
date:"date                           Show the current date and time",
whoami:"whoami                         Show the preview user",
uname:"uname                          Show the preview environment",
history:"history                        Show commands entered in this session",
version:"version                        Show CAIRN version and target"
};
function tokenize(input){const out=[];let token="",quote=null,escape=false,started=false;for(const c of input){if(escape){token+=c;escape=false;started=true;continue}if(c==="\\"&&quote!=="'"){escape=true;started=true;continue}if(quote){if(c===quote)quote=null;else token+=c;started=true;continue}if(c==="'"||c==='"'){quote=c;started=true;continue}if(/\s/.test(c)){if(started){out.push(token);token="";started=false}continue}token+=c;started=true}if(escape)token+="\\";if(quote)throw new Error("Unclosed quote. Close the quoted argument and try again.");if(started)out.push(token);return out}
function normalizePath(cwd,path){if(!path||path===".")return cwd;const parts=path.startsWith("/")?[]:cwd.split("/").filter(Boolean);for(const part of path.split("/")){if(!part||part===".")continue;if(part==="..")parts.pop();else parts.push(part)}return "/"+parts.join("/")}
function createFS(){return {"/":{type:"dir",children:{home:{type:"dir",children:{guest:{type:"dir",children:{Desktop:{type:"dir",children:{}},Documents:{type:"dir",children:{ "welcome.txt":{type:"file",content:"Welcome to CAIRN.\nThis is a simulated SAND workspace.\n"},"ideas.md":{type:"file",content:"# Ideas\n\nBuild something thoughtful.\n"}},Projects:{type:"dir",children:{"sand-apps":{type:"dir",children:{}}}}}}}}}}}}}
function resolve(fs,path){let node=fs["/"];if(path==="/")return node;for(const part of path.split("/").filter(Boolean)){if(!node||node.type!=="dir")return null;node=node.children[part]}return node||null}
function createSession(options={}){const fs=options.fs||createFS();let cwd="/home/guest";const history=[];function run(line,context={}){let args;try{args=tokenize(line.trim())}catch(e){return {lines:[{text:e.message,kind:"error"}]}}if(!args.length)return {lines:[]};const [cmd,...a]=args;history.push(line);const result=(text,kind="normal")=>({lines:String(text).split("\n").map(t=>({text:t,kind}))});const fail=t=>result(t,"error");const target=p=>normalizePath(cwd,p);const node=p=>resolve(fs,target(p));switch(cmd){
case"help":return a[0]?(HELP[a[0]]?result(HELP[a[0]]):fail("No help entry for: "+a[0])):result(["CAIRN COMMAND REFERENCE","",...COMMANDS.map(c=>HELP[c])].join("\n"),"system");
case"clear":return {clear:true,lines:[]};
case"echo":return result(a.join(" "));
case"pwd":return result(cwd);
case"whoami":return result("guest");
case"date":return result((context.now?new Date(context.now):new Date()).toString());
case"uname":return result("SAND host preview · x86-32 target · kernel services unavailable","system");
case"version":return result("CAIRN 0.2.0 · SAND Apps host prototype · SAPP integration pending","system");
case"history":return result(history.map((h,i)=>String(i+1).padStart(3," ")+"  "+h).join("\n")||"No commands yet.");
case"ls":{let p=".",showAll=false;for(const v of a){if(v==="-a")showAll=true;else p=v}const n=node(p);if(!n)return fail("ls: no such path: "+p);if(n.type!=="dir")return result(p);const names=Object.keys(n.children).sort((x,y)=>x.localeCompare(y));return result(names.filter(x=>showAll||!x.startsWith(".")).map(x=>n.children[x].type==="dir"?x+"/":x).join("  ")||"Empty directory")}
case"cd":{const p=a[0]||"/home/guest",dest=target(p),n=resolve(fs,dest);if(!n||n.type!=="dir")return fail("cd: not a directory: "+p);cwd=dest;return {lines:[],cwd}}
case"mkdir":case"touch":{if(!a[0])return fail(cmd+": missing path");const p=target(a[0]),parts=p.split("/").filter(Boolean),name=parts.pop(),parent=resolve(fs,"/"+parts.join("/"));if(!name||!parent||parent.type!=="dir")return fail(cmd+": parent directory does not exist");if(parent.children[name])return fail(cmd+": already exists: "+name);parent.children[name]=cmd==="mkdir"?{type:"dir",children:{}}:{type:"file",content:""};return result(cmd+": created "+p,"success")}
case"cat":{if(!a[0])return fail("cat: missing file");const n=node(a[0]);if(!n||n.type!=="file")return fail("cat: not a file: "+a[0]);return result(n.content)}
case"write":{if(a.length<2)return fail("Usage: write <file> <text>");const p=target(a[0]),parts=p.split("/").filter(Boolean),name=parts.pop(),parent=resolve(fs,"/"+parts.join("/"));if(!parent||parent.type!=="dir")return fail("write: parent directory does not exist");if(parent.children[name]&&parent.children[name].type!=="file")return fail("write: target is a directory");parent.children[name]={type:"file",content:a.slice(1).join(" ")};return result("Wrote "+p,"success")}
case"rm":{if(a[0]!=="--confirm"||!a[1])return fail("Deletion is disabled without explicit confirmation. Usage: rm --confirm <file>");const p=target(a[1]),parts=p.split("/").filter(Boolean),name=parts.pop(),parent=resolve(fs,"/"+parts.join("/"));if(!parent||parent.type!=="dir"||!parent.children[name])return fail("rm: no such file: "+a[1]);if(parent.children[name].type==="dir")return fail("rm: directory deletion is not supported in this prototype");delete parent.children[name];return result("Removed "+p,"success")}
default:return fail("Unknown command: "+cmd+". Type help to see available commands.")
}}
return {run,get cwd(){return cwd},get history(){return history.slice()},get commands(){return COMMANDS.slice()},getPath(path){return resolve(fs,normalizePath(cwd,path))}};
}
function mount(host){const session=createSession();host.insertAdjacentHTML("beforeend",'<section class="terminal-shell"><div class="terminal-chrome"><div class="terminal-lights"><i></i><i></i><i></i></div><span>CAIRN · COMMAND SESSION</span><span class="terminal-state">READY</span></div><div class="terminal-body"><div id="cairn-out" class="terminal-output" role="log" aria-live="polite"></div><form id="cairn-form" class="terminal-input"><span id="cairn-prompt">guest@sand:~$</span><input id="cairn-input" autocomplete="off" spellcheck="false" aria-label="Enter a CAIRN command"></form><div class="terminal-hint"><span><kbd>↑</kbd> <kbd>↓</kbd> history</span><span><kbd>Tab</kbd> complete</span><span><kbd>Ctrl</kbd>+<kbd>L</kbd> clear</span></div></div></section><p class="notice">Sandboxed virtual filesystem · no host shell, real disks or kernel syscalls are accessed.</p>');
const out=host.querySelector("#cairn-out"),input=host.querySelector("#cairn-input"),prompt=host.querySelector("#cairn-prompt");let historyIndex=0;
function pathLabel(p){return p==="/home/guest"?"~":p.replace("/home/guest","~")}
function append(text,kind="normal"){const line=document.createElement("div");line.className="terminal-line "+kind;line.textContent=text;out.appendChild(line);out.scrollTop=out.scrollHeight}
function updatePrompt(){prompt.textContent="guest@sand:"+pathLabel(session.cwd)+"$"}
function execute(line){append("guest@sand:"+pathLabel(session.cwd)+"$ "+line,"command");const res=session.run(line);if(res.clear)out.replaceChildren();for(const item of res.lines)append(item.text,item.kind);updatePrompt()}
append("CAIRN 0.2.0  /  SAND COMMAND ENVIRONMENT","system");append("A calm, capable workspace. Type help to explore.","system");append("","normal");updatePrompt();
host.querySelector("#cairn-form").addEventListener("submit",e=>{e.preventDefault();const line=input.value.trim();if(!line)return;execute(line);input.value="";historyIndex=session.history.length;});
input.addEventListener("keydown",e=>{if(e.key==="ArrowUp"){e.preventDefault();historyIndex=Math.max(0,historyIndex-1);input.value=session.history[historyIndex]||""}else if(e.key==="ArrowDown"){e.preventDefault();historyIndex=Math.min(session.history.length,historyIndex+1);input.value=session.history[historyIndex]||""}else if(e.key==="Tab"){e.preventDefault();const current=input.value.trim(),matches=session.commands.filter(c=>c.startsWith(current));if(matches.length===1)input.value=matches[0]+" ";else if(matches.length>1)append(matches.join("    "),"system")}else if(e.key==="l"&&e.ctrlKey){e.preventDefault();out.replaceChildren()}});
input.focus();
}
return {tokenize,normalizePath,createFS,createSession,mount,commands:COMMANDS.slice()};
});
