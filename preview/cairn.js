(function(root,factory){const api=factory();if(typeof module==="object"&&module.exports)module.exports=api;root.Cairn=api;})(typeof globalThis!=="undefined"?globalThis:this,function(){
"use strict";
const VERSION="0.4.0";
const BUILTINS=["help","clear","echo","pwd","ls","cd","mkdir","touch","cat","write","rm","date","whoami","uname","history","version","export","env","unset","alias","unalias","true","false","upper","lower","grep","wc","sort","jobs","fg","bg","kill","source","sh","chmod","stat","groups","id"];
const HELP={
help:"help [command]                 Show command help",clear:"clear                          Clear the terminal",echo:"echo <text>                    Print text",pwd:"pwd                            Print the current directory",ls:"ls [-a] [path]                 List directory contents",cd:"cd [path]                      Change the current directory",mkdir:"mkdir <name>                   Create a directory",touch:"touch <file>                   Create an empty file",cat:"cat <file>                     Print a text file",write:"write <file> <text>            Create or replace a text file",rm:"rm --confirm <file>            Delete a file (explicit confirmation required)",export:"export NAME=value             Set a session environment variable",env:"env                            List session environment variables",unset:"unset NAME                    Remove an environment variable",alias:"alias [name=\"command\"]         List or define a command alias",unalias:"unalias <name>                Remove a command alias",upper:"upper                          Convert input to uppercase (supports pipes)",lower:"lower                          Convert input to lowercase (supports pipes)",grep:"grep <text>                    Filter piped lines by text",wc:"wc                             Count lines and words in piped input",sort:"sort                           Sort piped lines",jobs:"jobs                           List simulated background jobs",fg:"fg [job-id]                    Bring a simulated job to the foreground",bg:"bg [job-id]                    Resume a stopped simulated job",kill:"kill <job-id>                  Stop a simulated job",history:"history                        Show commands entered in this session",version:"version                        Show CAIRN version and target",source:"source <script>                Run a script from the virtual filesystem",sh:"sh <script>                     Run a script from the virtual filesystem",chmod:"chmod <mode> <path>             Change simulated file permissions",stat:"stat <path>                     Show simulated file metadata",groups:"groups                         Show the current user groups",id:"id                             Show simulated user and group identity"};
function lex(input){const out=[];let token="",quote=null,escape=false,started=false;const push=()=>{if(started){out.push(token);token="";started=false}};for(let i=0;i<input.length;i++){const c=input[i];if(escape){token+=c;escape=false;started=true;continue}if(c==="\\"&&quote!=="'"){escape=true;started=true;continue}if(quote){if(c===quote)quote=null;else token+=c;started=true;continue}if(c==="'"||c==='"'){quote=c;started=true;continue}if(/\s/.test(c)){push();continue}const pair=input.slice(i,i+2);if(pair==="&&"||pair==="||"){push();out.push(pair);i++;continue}if(c==="|"||c===";"||c==="&"){push();out.push(c);continue}token+=c;started=true}if(escape)token+="\\";if(quote)throw new Error("Unclosed quote. Close the quoted argument and try again.");push();return out}
function tokenize(input){return lex(input).filter(t=>!["&&","||","|",";","&"].includes(t))}
function normalizePath(cwd,path){if(!path||path===".")return cwd;const parts=path.startsWith("/")?[]:cwd.split("/").filter(Boolean);for(const part of path.split("/")){if(!part||part===".")continue;if(part==="..")parts.pop();else parts.push(part)}return "/"+parts.join("/")}
function createFS(){
 const root={type:"dir",mode:493,owner:"guest",group:"users",children:{}};
 const mkdir=path=>{let n=root;for(const part of path.split("/").filter(Boolean)){if(!n.children[part])n.children[part]={type:"dir",mode:493,owner:"guest",group:"users",children:{}};n=n.children[part];if(n.type!=="dir")throw new Error("Invalid seeded filesystem path");}};
 const put=(path,content)=>{const parts=path.split("/").filter(Boolean),name=parts.pop(),parentPath="/"+parts.join("/");mkdir(parentPath);let parent=root;for(const part of parts)parent=parent.children[part];parent.children[name]={type:"file",mode:420,owner:"guest",group:"users",content};};
 mkdir("/home/guest/Desktop");
 mkdir("/home/guest/Documents");
 mkdir("/home/guest/Projects/sand-apps");
 mkdir("/home/guest/Downloads");
 put("/home/guest/Documents/welcome.txt","Welcome to CAIRN.\nThis is a simulated SAND workspace.\n");
 put("/home/guest/Documents/ideas.md","# Ideas\n\nBuild something thoughtful.\n");
 return {"/":root};
}
function resolve(fs,path){let n=fs["/"];if(path==="/")return n;for(const p of path.split("/").filter(Boolean)){if(!n||n.type!=="dir")return null;n=n.children[p]}return n||null}
function createSession(options={}){const state=options.state||{},fs=state.fs||options.fs||createFS(),history=[],environment=Object.assign({USER:"guest",HOME:"/home/guest",PWD:"/home/guest",SHELL:"/bin/cairn",TERM:"sand-256color"},state.environment||{},options.environment||{}),aliases=new Map(state.aliases||[]),registry=new Map(),jobs=new Map();let cwd=state.cwd&&resolve(fs,state.cwd)?.type==="dir"?state.cwd:"/home/guest",nextJob=1,lastExit=0,lastOutput="";
const result=(stdout="",exitCode=0,extra={})=>{const value=String(stdout);return Object.assign({stdout:value,exitCode,lines:value===""?[]:value.split("\n").map(text=>({text,kind:exitCode?"error":"normal"}))},extra)},target=p=>normalizePath(cwd,p),node=p=>resolve(fs,target(p));
const expand=v=>v.replace(/~(?=\/|$)/g,environment.HOME||"/home/guest").replace(/\$\{([A-Za-z_][A-Za-z0-9_]*)\}|\$([A-Za-z_][A-Za-z0-9_]*)/g,(_,a,b)=>environment[a||b]??"");
function registerCommand(name,handler,description="Extension command"){if(!/^[a-z][a-z0-9_-]*$/.test(name)||typeof handler!=="function")throw new TypeError("Invalid command registration.");registry.set(name,{handler,description});return true}
function registerAlias(name,command){if(!/^[a-zA-Z][a-zA-Z0-9_-]*$/.test(name)||!String(command).trim())throw new TypeError("Invalid alias.");aliases.set(name,String(command));return true}
function invoke(argv,stdin="",context={}){if(!argv.length)return result("");let [cmd,...args]=argv;args=args.map(expand);
if(aliases.has(cmd)){if(context.aliasDepth>8)return result("Alias expansion limit reached.",1);try{return invoke([...lex(aliases.get(cmd)),...args],stdin,Object.assign({},context,{aliasDepth:(context.aliasDepth||0)+1}))}catch(e){return result(e.message,1)}}
if(registry.has(cmd)){try{const v=registry.get(cmd).handler({args,stdin,session:api,environment:Object.assign({},environment),cwd,context});if(v&&typeof v.then==="function")return result("Async extension commands are unavailable in this synchronous prototype.",1);if(typeof v==="string")return result(v);return v&&typeof v==="object"?Object.assign(result(v.stdout??"",v.exitCode??0),v):result(v??"")}catch(e){return result("Command error: "+e.message,1)}}
switch(cmd){
case"help":return args[0]?(HELP[args[0]]?result(HELP[args[0]]):result("No help entry for: "+args[0],1)):result(["CAIRN COMMAND REFERENCE","",...BUILTINS.map(c=>HELP[c]).filter(Boolean),"","Shell operators: |  &&  ||  ;  &"].join("\n"));
case"clear":return result("",0,{clear:true});case"echo":return result(args.join(" ")+(stdin&&args.length===0?stdin:""));case"pwd":return result(cwd);case"whoami":return result(environment.USER);case"date":return result((context.now?new Date(context.now):new Date()).toString());case"uname":return result("SAND host preview · x86-32 target · kernel services unavailable");case"version":return result("CAIRN "+VERSION+" · SAND Apps host prototype · native ABI pending");case"history":return result(history.map((h,i)=>String(i+1).padStart(3," ")+"  "+h).join("\n")||"No commands yet.");
case"export":{if(!args.length)return result(Object.entries(environment).map(([k,v])=>k+"="+v).join("\n"));for(const pair of args){const i=pair.indexOf("=");if(i<1)return result("Usage: export NAME=value",1);const k=pair.slice(0,i);if(!/^[A-Za-z_][A-Za-z0-9_]*$/.test(k))return result("Invalid environment variable: "+k,1);environment[k]=pair.slice(i+1)}return result("")}
case"env":return result(Object.entries(environment).sort(([a],[b])=>a.localeCompare(b)).map(([k,v])=>k+"="+v).join("\n"));case"unset":if(!args[0])return result("Usage: unset NAME",1);delete environment[args[0]];return result("");
case"alias":if(!args.length)return result(Array.from(aliases,([k,v])=>k+"='"+v+"'").join("\n")||"No aliases defined.");{const raw=String(context.raw||""),m=raw.match(/^\s*alias\s+([A-Za-z][A-Za-z0-9_-]*)=(.*)$/);if(!m)return result("Usage: alias name=\"command\"",1);try{registerAlias(m[1],lex(m[2]).join(" "))}catch(e){return result(e.message,1)}return result("Alias defined: "+m[1])}
case"unalias":if(!args[0])return result("Usage: unalias <name>",1);if(!aliases.delete(args[0]))return result("No such alias: "+args[0],1);return result("Alias removed: "+args[0]);
case"true":return result("");case"false":return result("",1);case"upper":return result((stdin||args.join(" ")).toUpperCase());case"lower":return result((stdin||args.join(" ")).toLowerCase());case"grep":if(!args[0])return result("Usage: grep <text>",1);return result((stdin||"").split("\n").filter(line=>line.includes(args.join(" "))).join("\n"));case"wc":{const s=stdin||args.join(" "),lines=s?s.split("\n").length:0,words=(s.match(/\S+/g)||[]).length;return result(lines+" "+words+" "+s.length)}case"sort":return result((stdin||args.join(" ")).split("\n").sort((a,b)=>a.localeCompare(b)).join("\n"));
case"ls":{let p=".",all=false;for(const v of args){if(v==="-a")all=true;else p=v}const n=node(p);if(!n)return result("ls: no such path: "+p,1);if(n.type!=="dir")return result(p);return result(Object.keys(n.children).sort((a,b)=>a.localeCompare(b)).filter(x=>all||!x.startsWith(".")).map(x=>n.children[x].type==="dir"?x+"/":x).join("  ")||"Empty directory")}
case"cd":{const p=args[0]||environment.HOME||"/home/guest",dest=target(p),n=resolve(fs,dest);if(!n||n.type!=="dir")return result("cd: not a directory: "+p,1);cwd=dest;environment.PWD=cwd;return result("")}
case"mkdir":case"touch":{if(!args[0])return result(cmd+": missing path",1);const p=target(args[0]),parts=p.split("/").filter(Boolean),name=parts.pop(),parent=resolve(fs,"/"+parts.join("/"));if(!name||!parent||parent.type!=="dir")return result(cmd+": parent directory does not exist",1);if(parent.children[name])return result(cmd+": already exists: "+name,1);parent.children[name]=cmd==="mkdir"?{type:"dir",mode:493,owner:environment.USER,group:"users",children:{}}:{type:"file",mode:420,owner:environment.USER,group:"users",content:""};return result(cmd+": created "+p)}
case"cat":{if(!args[0])return stdin?result(stdin):result("cat: missing file",1);const n=node(args[0]);if(!n||n.type!=="file")return result("cat: not a file: "+args[0],1);return result(n.content)}
case"write":{if(args.length<2)return result("Usage: write <file> <text>",1);const p=target(args[0]),parts=p.split("/").filter(Boolean),name=parts.pop(),parent=resolve(fs,"/"+parts.join("/"));if(!parent||parent.type!=="dir")return result("write: parent directory does not exist",1);if(parent.children[name]&&parent.children[name].type!=="file")return result("write: target is a directory",1);parent.children[name]={type:"file",mode:420,owner:environment.USER,group:"users",content:args.slice(1).join(" ")};return result("Wrote "+p)}
case"rm":{if(args[0]!=="--confirm"||!args[1])return result("Deletion is disabled without explicit confirmation. Usage: rm --confirm <file>",1);const p=target(args[1]),parts=p.split("/").filter(Boolean),name=parts.pop(),parent=resolve(fs,"/"+parts.join("/"));if(!parent||parent.type!=="dir"||!parent.children[name])return result("rm: no such file: "+args[1],1);if(parent.children[name].type==="dir")return result("rm: directory deletion is not supported in this prototype",1);delete parent.children[name];return result("Removed "+p)}
case"source":case"sh":{
 if(!args[0])return result("Usage: "+cmd+" <script>",1);
 if((context.scriptDepth||0)>=8)return result("Script nesting limit reached.",1);
 const script=node(args[0]);if(!script||script.type!=="file")return result(cmd+": script not found: "+args[0],1);
 const output=[];let code=0;
 for(const rawLine of script.content.split(/\r?\n/)){const line=rawLine.trim();if(!line||line.startsWith("#"))continue;const r=run(line,Object.assign({},context,{scriptDepth:(context.scriptDepth||0)+1}));if(r.stdout)output.push(r.stdout);code=r.exitCode;if(r.clear)output.length=0;}
 return result(output.join("\n"),code);
}
case"groups":return result(environment.GROUPS||"users");
case"id":return result("uid="+(environment.UID||"1000")+"("+environment.USER+") gid="+(environment.GID||"1000")+"(users) groups="+(environment.GROUPS||"users"));
case"stat":{if(!args[0])return result("Usage: stat <path>",1);const n=node(args[0]);if(!n)return result("stat: no such path: "+args[0],1);return result("Path: "+target(args[0])+"\nType: "+n.type+"\nMode: "+Number(n.mode??(n.type==="dir"?493:420)).toString(8).padStart(3,"0")+"\nOwner: "+(n.owner||"guest")+"\nGroup: "+(n.group||"users")+(n.type==="file"?"\nSize: "+n.content.length+" bytes":""))}
case"chmod":{if(args.length<2||!/^[0-7]{3,4}$/.test(args[0]))return result("Usage: chmod <mode> <path> (example: chmod 640 notes.txt)",1);const n=node(args[1]);if(!n)return result("chmod: no such path: "+args[1],1);if(environment.USER!=="root"&&n.owner!==environment.USER)return result("chmod: only the owner or root may change permissions",1);n.mode=parseInt(args[0],8);return result("Changed mode of "+target(args[1])+" to "+args[0])}
case"jobs":return result(Array.from(jobs.values()).map(j=>"["+j.id+"] "+j.state+"  "+j.command).join("\n")||"No background jobs.");
case"fg":case"bg":case"kill":{const id=Number(args[0]||Array.from(jobs.keys()).pop()),job=jobs.get(id);if(!job)return result(cmd+": no such job",1);if(cmd==="kill"){job.state="stopped";return result("["+id+"] stopped  "+job.command)}job.state=cmd==="fg"?"completed":"running";return result("["+id+"] "+job.state+"  "+job.command)}
default:return result("Unknown command: "+cmd+". Type help to see available commands.",1)
}}
function run(line,context={}){
 let tokens;try{tokens=lex(line.trim())}catch(e){return result(e.message,2)}
 if(!tokens.length)return result("");
 history.push(line);
 let groups;try{groups=parseSegments(tokens)}catch(e){lastExit=2;return result(e.message,2)}
 let all=[],exitCode=0,cleared=false,previousOperator=";";
 for(const group of groups){
  if(previousOperator==="&&"&&exitCode!==0){previousOperator=group.operator;continue}
  if(previousOperator==="||"&&exitCode===0){previousOperator=group.operator;continue}
  let pipeOut="",finalResult=result("");
  for(const argv of group.pipeline){
   const r=invoke(argv,pipeOut,Object.assign({},context,{raw:argv.join(" ")}));
   if(r.clear){cleared=true;all=[]}
   pipeOut=r.stdout??"";
   exitCode=r.exitCode??0;
   finalResult=r;
  }
  if(group.background){
   const id=nextJob++;
   jobs.set(id,{id,command:line,state:"running",output:pipeOut});
   all.push({text:"["+id+"] started  "+line,kind:"system"});
  }else if(!finalResult.clear&&finalResult.lines?.length){
   all.push(...finalResult.lines);
  }
  previousOperator=group.operator;
 }
 lastExit=exitCode;
 lastOutput=all.map(x=>x.text).join("\n");
 return {stdout:lastOutput,lines:all,exitCode,clear:cleared,cwd};
}
function snapshot(){return JSON.parse(JSON.stringify({fs,cwd,environment,aliases:Array.from(aliases.entries())}))}
function complete(input){const text=String(input||""),parts=text.split(/\s+/),prefix=parts[parts.length-1]||"";if(parts.length<=1)return Array.from(new Set([...BUILTINS,...registry.keys(),...aliases.keys()])).filter(x=>x.startsWith(prefix)).sort();const slash=prefix.lastIndexOf("/"),dirPart=slash>=0?prefix.slice(0,slash+1):"",namePart=slash>=0?prefix.slice(slash+1):prefix,base=slash>=0?prefix.slice(0,slash)||"/":".";const folder=node(base);if(!folder||folder.type!=="dir")return [];return Object.keys(folder.children).filter(x=>x.startsWith(namePart)).map(x=>dirPart+x+(folder.children[x].type==="dir"?"/":"")).sort()}
const api={run,registerCommand,registerAlias,snapshot,complete,get cwd(){return cwd},get history(){return history.slice()},get commands(){return Array.from(new Set([...BUILTINS,...registry.keys()]))},get environment(){return Object.assign({},environment)},get aliases(){return Object.fromEntries(aliases)},get jobs(){return Array.from(jobs.values()).map(j=>Object.assign({},j))},get lastExit(){return lastExit},get lastOutput(){return lastOutput},getPath(path){return resolve(fs,normalizePath(cwd,path))}};
return api}
function parseSegments(tokens){
 const groups=[];let current=[],pipeline=[];
 const finishCommand=()=>{if(!current.length)throw new Error("Missing command near shell operator.");pipeline.push(current);current=[]};
 const finishGroup=operator=>{finishCommand();groups.push({pipeline:pipeline.slice(),operator:operator==="&"?";":operator,background:operator==="&"});pipeline=[]};
 for(const token of tokens){
  if(token==="|"){finishCommand();continue}
  if(token===";"||token==="&&"||token==="||"||token==="&"){finishGroup(token);continue}
  current.push(token);
 }
 if(current.length)finishGroup(";");
 else if(pipeline.length)throw new Error("Missing command after pipe operator.");
 return groups;
}
function mount(host){let saved=null;try{saved=JSON.parse(localStorage.getItem("sand.cairn.session.v1")||"null")}catch(e){}const session=createSession({state:saved});const persist=()=>{try{localStorage.setItem("sand.cairn.session.v1",JSON.stringify(session.snapshot()))}catch(e){}};host.insertAdjacentHTML("beforeend",'<section class="terminal-shell"><div class="terminal-chrome"><div class="terminal-lights"><i></i><i></i><i></i></div><span>CAIRN · COMMAND SESSION</span><span class="terminal-state">READY</span></div><div class="terminal-body"><div id="cairn-out" class="terminal-output" role="log" aria-live="polite"></div><form id="cairn-form" class="terminal-input"><span id="cairn-prompt">guest@sand:~$</span><input id="cairn-input" autocomplete="off" spellcheck="false" aria-label="Enter a CAIRN command"></form><div class="terminal-hint"><span><kbd>↑</kbd> <kbd>↓</kbd> history</span><span><kbd>Tab</kbd> complete</span><span><kbd>Ctrl</kbd>+<kbd>L</kbd> clear</span></div></div></section><p class="notice">Sandboxed virtual filesystem · simulated shell jobs · no host shell, real disks or kernel syscalls are accessed.</p>');const out=host.querySelector("#cairn-out"),input=host.querySelector("#cairn-input"),prompt=host.querySelector("#cairn-prompt");let historyIndex=0;function pathLabel(p){return p==="/home/guest"?"~":p.replace("/home/guest","~")}function append(text,kind="normal"){const line=document.createElement("div");line.className="terminal-line "+kind;line.textContent=text;out.appendChild(line);out.scrollTop=out.scrollHeight}function updatePrompt(){prompt.textContent="guest@sand:"+pathLabel(session.cwd)+"$"}function execute(line){append("guest@sand:"+pathLabel(session.cwd)+"$ "+line,"command");const r=session.run(line);if(r.clear)out.replaceChildren();for(const x of r.lines)append(x.text,x.kind);persist();updatePrompt()}append("CAIRN "+VERSION+" / SAND COMMAND ENVIRONMENT","system");append("A calm, capable workspace. Type help to explore.","system");append("","normal");updatePrompt();host.querySelector("#cairn-form").addEventListener("submit",e=>{e.preventDefault();const line=input.value.trim();if(!line)return;execute(line);input.value="";historyIndex=session.history.length});input.addEventListener("keydown",e=>{if(e.key==="ArrowUp"){e.preventDefault();historyIndex=Math.max(0,historyIndex-1);input.value=session.history[historyIndex]||""}else if(e.key==="ArrowDown"){e.preventDefault();historyIndex=Math.min(session.history.length,historyIndex+1);input.value=session.history[historyIndex]||""}else if(e.key==="Tab"){e.preventDefault();const matches=session.complete(input.value);if(matches.length===1)input.value=input.value.replace(/[^\s]*$/,matches[0])+(matches[0].endsWith("/")?"":" ");else if(matches.length>1)append(matches.join("    "),"system")}else if(e.key==="l"&&e.ctrlKey){e.preventDefault();out.replaceChildren()}});input.focus()}
return {tokenize,lex,normalizePath,createFS,createSession,mount,commands:BUILTINS.slice(),version:VERSION};
});
