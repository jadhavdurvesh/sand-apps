"use strict";
const Sand=require("../runtime/sand-runtime.js");
const manifest={id:"sample-app",name:"Sample App",version:"1.0.0",capabilities:["storage.read","storage.write"]};
const app=Sand.createRuntime({manifest,grants:manifest.capabilities});
app.onLifecycle(event=>{if(event.state===Sand.STATES.READY)console.log("Ready:",event.appId)});
app.init();
app.storage.set("workspace",{lastView:"home"});
console.log(app.storage.get("workspace"));
