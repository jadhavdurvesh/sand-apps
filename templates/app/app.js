(function(root){
"use strict";
root.SandApps=root.SandApps||{};
root.SandApps["example-app"]={
 mount({workspace,currentRuntime}){
  const heading=document.createElement("h1");heading.textContent="Hello from SAND";
  const message=document.createElement("p");message.textContent="Your first SAND application is running.";
  const button=document.createElement("button");button.type="button";button.textContent="Save a greeting";
  button.addEventListener("click",()=>{
   currentRuntime.storage.set("greeting","Hello, SAND!");
   message.textContent=currentRuntime.storage.get("greeting");
  });
  workspace.append(heading,message,button);
  return ()=>{};
 }
};
})(window);
