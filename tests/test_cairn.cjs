"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const Cairn=require("../preview/cairn.js");
test("quoted arguments",()=>assert.deepEqual(Cairn.tokenize('write "hello world.txt" "a note"'),["write","hello world.txt","a note"]));
test("unclosed quotes rejected",()=>assert.throws(()=>Cairn.tokenize('echo "unfinished')));
test("path normalization",()=>assert.equal(Cairn.normalizePath("/home/guest/Documents","../Desktop"),"/home/guest/Desktop"));
test("filesystem navigation and content",()=>{const s=Cairn.createSession();assert.match(s.run("ls").stdout,/Documents/);s.run("cd Documents");assert.equal(s.cwd,"/home/guest/Documents");s.run('write draft.txt "hello sand"');assert.equal(s.run("cat draft.txt").stdout,"hello sand")});
test("rm requires confirmation",()=>{const s=Cairn.createSession();s.run("touch remove-me.txt");assert.equal(s.run("rm remove-me.txt").exitCode,1);assert.equal(s.run("rm --confirm remove-me.txt").exitCode,0)});
test("cannot traverse outside virtual root",()=>{const s=Cairn.createSession();s.run("cd ../../../../");assert.equal(s.cwd,"/");assert.equal(s.run("ls").stdout,"home/")});
test("pipes transform command output",()=>{const s=Cairn.createSession();assert.equal(s.run("echo hello sand | upper").stdout,"HELLO SAND")});
test("conditional and sequential operators",()=>{const s=Cairn.createSession();assert.equal(s.run("false && echo no || echo yes").stdout,"yes");assert.equal(s.run("echo first ; echo second").stdout,"first\nsecond")});
test("environment variables are session scoped",()=>{const s=Cairn.createSession();s.run("export PROJECT=sand");assert.equal(s.run("echo $PROJECT").stdout,"sand");s.run("unset PROJECT");assert.equal(s.run("echo $PROJECT").stdout,"")});
test("aliases can be registered and removed",()=>{const s=Cairn.createSession();s.run('alias ll="ls -a"');assert.match(s.run("ll").stdout,/Documents/);assert.equal(s.run("unalias ll").exitCode,0);assert.equal(s.run("ll").exitCode,1)});
test("pipeline filters",()=>{const s=Cairn.createSession();assert.equal(s.run("echo alpha beta | upper").stdout,"ALPHA BETA");assert.equal(s.run("echo alpha beta | wc").stdout,"1 2 10")});
test("command extensions are registerable",()=>{const s=Cairn.createSession();s.registerCommand("greet",({args})=>"Hello "+args.join(" "));assert.equal(s.run("greet SAND").stdout,"Hello SAND")});
test("background jobs are simulated and controllable",()=>{const s=Cairn.createSession();assert.match(s.run("echo task &").stdout,/\[1\] started/);assert.equal(s.jobs[0].state,"running");s.run("kill 1");assert.equal(s.jobs[0].state,"stopped");s.run("bg 1");assert.equal(s.jobs[0].state,"running");s.run("fg 1");assert.equal(s.jobs[0].state,"completed")});

test("pipes return only the final command output",()=>{const s=Cairn.createSession();assert.equal(s.run("echo hello sand | upper").stdout,"HELLO SAND")});
test("conditional operators short-circuit across command groups",()=>{const s=Cairn.createSession();assert.equal(s.run("false && echo no || echo yes").stdout,"yes");assert.equal(s.run("true || echo no").stdout,"");assert.equal(s.run("true && echo yes").stdout,"yes")});

test("trailing and leading pipes are rejected",()=>{const s=Cairn.createSession();assert.equal(s.run("echo hello |").exitCode,2);assert.equal(s.run("| upper").exitCode,2)});
test("empty output does not create phantom blank lines",()=>{const s=Cairn.createSession();assert.equal(s.run("false && echo no || echo yes").stdout,"yes")});

test("session snapshot restores filesystem, cwd, environment and aliases",()=>{const first=Cairn.createSession();first.run("mkdir Archive");first.run("cd Archive");first.run("export MODE=restored");first.registerAlias("ll","ls -a");const second=Cairn.createSession({state:first.snapshot()});assert.equal(second.cwd,"/home/guest/Archive");assert.equal(second.environment.MODE,"restored");assert.equal(second.aliases.ll,"ls -a");assert.equal(second.run("pwd").stdout,"/home/guest/Archive")});
test("command completion suggests commands and virtual paths",()=>{const s=Cairn.createSession();assert.ok(s.complete("ech").includes("echo"));assert.ok(s.complete("cat Documents/we").includes("Documents/welcome.txt"))});
test("scripts execute line by line and ignore comments",()=>{const s=Cairn.createSession();s.run("write Documents/demo.csh \"# comment\\nexport SCRIPTED=yes\\necho $SCRIPTED\"");assert.equal(s.run("source Documents/demo.csh").stdout,"yes");assert.equal(s.environment.SCRIPTED,"yes")});
test("scripts reject missing files and excessive nesting",()=>{const s=Cairn.createSession();assert.equal(s.run("source missing.csh").exitCode,1);s.run("write loop.csh \"source loop.csh\"");assert.equal(s.run("source loop.csh").exitCode,1)});
test("chmod and stat expose simulated permission metadata",()=>{const s=Cairn.createSession();s.run("touch private.txt");assert.equal(s.run("chmod 600 private.txt").exitCode,0);assert.match(s.run("stat private.txt").stdout,/Mode: 600/);assert.match(s.run("stat private.txt").stdout,/Owner: guest/)});
test("chmod rejects invalid modes and missing paths",()=>{const s=Cairn.createSession();assert.equal(s.run("chmod 999 missing").exitCode,1);assert.equal(s.run("chmod 640 absent").exitCode,1)});
test("identity commands report simulated user and groups",()=>{const s=Cairn.createSession();assert.equal(s.run("groups").stdout,"users");assert.match(s.run("id").stdout,/uid=1000\\(guest\\)/)});
