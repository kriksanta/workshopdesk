import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const bridge=fs.readFileSync(new URL('./bridge.js',import.meta.url),'utf8');
const runtime=fs.readFileSync(new URL('./runtime.js',import.meta.url),'utf8');
const record=()=>({admin:{name:'Owner'},settings:{name:'Workshop'},employees:[],customers:[],jobs:[],inventory:[],requests:[],attendance:[],invoices:[]});
function deferred(){let resolve;const promise=new Promise(r=>resolve=r);return{promise,resolve}}
function appFixture(seed=async()=>{}){
 const app={innerHTML:''},screens=[],storage=new Map([['workshopdesk.firebase.page.v1',JSON.stringify({page:'Job cards',role:'employer',jobFilter:'All jobs'})]]);
 let authCallback,dataCallback,dataCalls=0;
 const context={console,JSON,Date,setTimeout,clearTimeout,session:null,role:'employer',page:'Dashboard',jobFilter:'All jobs',today:'2026-10-26',state:record(),WD_SEED:{},navItems:[['Dashboard'],['Job cards'],['Inventory']],platform:{owners:[]},
 day:()=> '2026-10-26',esc:x=>String(x),btn:(label,action)=>'<button data-action="'+action+'">'+label+'</button>',
 $:selector=>selector==='#app'?app:null,
 document:{querySelector:()=>null,addEventListener(){},getElementById:()=>null},
 window:{addEventListener(){}},localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)},
 renderLocal(){screens.push(context.session?'workshop:'+context.page:'login')},renderPlatformAdmin(){screens.push('platform')},toastLocal(){},closeModal(){},
 WDF:{stop(){},authError:e=>e.message,watchAuth(cb){authCallback=cb;return()=>{}},seed,
 watchData(cb){dataCallback=cb;dataCalls++;return()=>{}},watchOwners(){return()=>{}},logout:async()=>{}}
 };
 vm.createContext(context);vm.runInContext(bridge+';globalThis.api={firebaseBoot,logoutRemote,render,wd};',context);
 return{context,app,screens,storage,auth:(...args)=>authCallback(...args),data:(...args)=>dataCallback(...args),get dataCallback(){return dataCallback},get dataCalls(){return dataCalls}};
}
const owner={admin:true,workshopId:'demo'},employee={admin:false,employee:'e1',workshopId:'demo'};
for(const user of [owner,employee]){
 const x=appFixture();await x.context.api.firebaseBoot();
 assert.match(x.app.innerHTML,/Opening your workshop/);
 assert.deepEqual(x.screens,[],'no early sign-in screen while auth restores');
 x.context.api.render();assert.deepEqual(x.screens,[]);
 await x.auth(user,null);assert.deepEqual(x.screens,[],'wait for workshop records too');
 x.data(record(),null);assert.deepEqual(x.screens,['workshop:Job cards']);
 assert.equal(JSON.parse(x.storage.get('workshopdesk.firebase.page.v1')).page,'Job cards');
}
// A new sign-in after a confirmed signed-out state loads in the same page, without reload.
{
 const x=appFixture();await x.context.api.firebaseBoot();await x.auth(null,null);
 assert.deepEqual(x.screens,['login']);await x.auth(owner,null);x.data(record(),null);
 assert.equal(x.screens.at(-1),'workshop:Job cards');
}
// A temporary profile/sync failure keeps the restoration screen and saved route.
{
 const x=appFixture();await x.context.api.firebaseBoot();await x.auth(null,new Error('Temporary connection failure'));
 assert.deepEqual(x.screens,[]);assert.match(x.app.innerHTML,/Try again/);
 assert.equal(JSON.parse(x.storage.get('workshopdesk.firebase.page.v1')).page,'Job cards');
 await x.context.api.firebaseBoot();await x.auth(owner,null);x.data(record(),null);
 assert.equal(x.screens.at(-1),'workshop:Job cards');
}
// Sign-out during asynchronous seed/data loading cannot reopen the previous workspace.
{
 const pending=deferred(),x=appFixture(()=>pending.promise);await x.context.api.firebaseBoot();
 const loading=x.auth(owner,null);await x.auth(null,null);pending.resolve();await loading;
 assert.equal(x.dataCalls,0);assert.equal(x.screens.at(-1),'login');
}
{
 const x=appFixture();await x.context.api.firebaseBoot();await x.auth(owner,null);x.data(record(),null);
 const stale=x.dataCallback;await x.context.api.logoutRemote();stale(record(),null);
 assert.equal(x.screens.at(-1),'login');assert.equal(x.context.session,null);
}
// Late identify responses are ignored after a newer auth event or unsubscribe.
function authFixture(){
 let event;const callbacks=[],pending=new Map();
 const c={current:null,profileOff:null,auth:{},stop(){},profile:id=>id,
 onAuthStateChanged(a,cb){event=cb;return()=>{}},
 identify:u=>u?pending.get(u.uid).promise:Promise.resolve(null),
 onSnapshot:()=>()=>{},signOut:async()=>{}};
 vm.createContext(c);
 vm.runInContext(runtime.slice(runtime.indexOf('function watchAuth(cb){'),runtime.indexOf('function stop(){')),c);
 const unsubscribe=c.watchAuth((user,error)=>callbacks.push({user,error}));
 return{c,pending,callbacks,event:(u)=>event(u),unsubscribe};
}
{
 const x=authFixture(),old=deferred();x.pending.set('old',old);
 const first=x.event({uid:'old'});await x.event(null);old.resolve(owner);await first;
 assert.equal(x.callbacks.length,1);assert.equal(x.callbacks[0].user,null);assert.equal(x.c.current,null);
}
{
 const x=authFixture(),old=deferred();x.pending.set('old',old);
 const first=x.event({uid:'old'});x.unsubscribe();old.resolve(owner);await first;
 assert.equal(x.callbacks.length,0);assert.equal(x.c.current,null);
}
assert.doesNotMatch(bridge,/location\.reload\(/);
console.log('Session restoration passed: owner/employee refresh, saved route, no reload after login, retry, and stale callbacks after sign-out.');


// Each tab restores its visible route even when another tab last saved Invoices.
{
 const x=appFixture();const local=x.storage;
 local.set('workshopdesk.firebase.page.v1',JSON.stringify({page:'Invoices & estimates',role:'employer'}));
 x.context.navItems.push(['Customers','users'],['Inventory','box'],['Invoices & estimates','receipt']);
 x.context.URLSearchParams=URLSearchParams;
 x.context.location={pathname:'/',search:'',hash:'#page=Customers&view=employer'};
 x.context.history={replaceState(a,b,url){x.context.location.hash=url.slice(url.indexOf('#'));}};
 await x.context.api.firebaseBoot();await x.auth(owner,null);x.data(record(),null);
 assert.equal(x.context.page,'Customers');
 x.context.page='Inventory';x.context.api.render();assert.match(x.context.location.hash,/page=Inventory/);
 local.set('workshopdesk.firebase.page.v1',JSON.stringify({page:'Invoices & estimates',role:'employer'}));
 await x.context.api.firebaseBoot();await x.auth(owner,null);x.data(record(),null);
 assert.equal(x.context.page,'Inventory');
}
