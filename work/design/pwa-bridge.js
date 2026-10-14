'use strict';
const BRIDGE_URL='https://script.google.com/macros/s/AKfycbxFjuI60yoeUv1PqHywYWBohtZHxsVszK0iEa992qNb7sZd98mJGhGT-i3dkH25c-ys/exec';
const bridgeNonce=crypto.randomUUID();
let bridgePort=null,bridgeNextId=0;
const bridgePending=new Map();
let resolveBridge,rejectBridge;
const bridgeReady=new Promise((resolve,reject)=>{resolveBridge=resolve;rejectBridge=reject;});
window.addEventListener('message',event=>{
  const host=(()=>{try{return new URL(event.origin).hostname}catch{return ''}})();
  if(!host.endsWith('-script.googleusercontent.com')||event.data?.type!=='workshopdesk:bridge-ready'||event.data.nonce!==bridgeNonce||event.ports.length!==1||bridgePort)return;
  bridgePort=event.ports[0];
  bridgePort.onmessage=reply=>{
    const response=reply.data||{},pending=bridgePending.get(response.id);
    if(!pending)return;
    bridgePending.delete(response.id);clearTimeout(pending.timeout);
    response.ok?pending.resolve(response.result):pending.reject(new Error(response.error||'Google Sheets request failed.'));
  };
  bridgePort.start();resolveBridge();
});
const bridgeFrame=document.createElement('iframe');
bridgeFrame.title='Workshop Desk data connection';
bridgeFrame.hidden=true;
bridgeFrame.setAttribute('aria-hidden','true');
bridgeFrame.src=BRIDGE_URL+'?bridge='+encodeURIComponent(bridgeNonce);
document.body.append(bridgeFrame);
setTimeout(()=>{if(!bridgePort)rejectBridge(new Error('Could not connect to Google Sheets. Check your connection and refresh.'));},20000);
function rpc(name,...args){
  return bridgeReady.then(()=>new Promise((resolve,reject)=>{
    const id=++bridgeNextId;
    const timeout=setTimeout(()=>{bridgePending.delete(id);reject(new Error('Google Sheets took too long to respond. Try again.'));},30000);
    bridgePending.set(id,{resolve,reject,timeout});
    bridgePort.postMessage({id,name,args});
  }));
}
