import {initializeApp,deleteApp} from 'firebase/app';
import {getAuth,GoogleAuthProvider,signInWithPopup,signInWithEmailAndPassword,createUserWithEmailAndPassword,EmailAuthProvider,linkWithCredential,sendPasswordResetEmail,onAuthStateChanged,signOut} from 'firebase/auth';
import {getFirestore,doc,collection,getDoc,getDocs,onSnapshot,runTransaction,writeBatch,setDoc,serverTimestamp} from 'firebase/firestore';
const cfg={apiKey:'AIzaSyDcq0u_uFxZe1b13U4KiXMYYblSmMRLRF0',authDomain:'workshop-desk.firebaseapp.com',projectId:'workshop-desk',storageBucket:'workshop-desk.firebasestorage.app',messagingSenderId:'244318154764',appId:'1:244318154764:web:552ad7e88eb8464fb53e29'};
const app=initializeApp(cfg),auth=getAuth(app),db=getFirestore(app);
const adminEmail='sreejithsubhashithan@gmail.com',adminUid='i96vKZQdWTNhg0mvQ6Yi3USUiLX2';
const rows=['employees','customers','jobs','inventory','requests','attendance','invoices','jobStatuses','issues'];
const copy=x=>JSON.parse(JSON.stringify(x));
const canonical=x=>JSON.stringify(x,(k,v)=>v&&typeof v==='object'&&!Array.isArray(v)?Object.keys(v).sort().reduce((o,key)=>(o[key]=v[key],o),{}):v);
const equal=(a,b)=>canonical(a)===canonical(b);
const ref=(type,id)=>{const wid=current?.workshopId;if(!wid)throw new Error('Workshop account required.');return type==='config'?doc(db,'workshops',wid):doc(db,'workshops',wid,type,id)};
const profile=uid=>doc(db,'users',uid);
const authError=e=>({'auth/invalid-credential':'Email or password is incorrect.','auth/email-already-in-use':'This email already has an account.','auth/too-many-requests':'Too many attempts. Try again later.','auth/popup-closed-by-user':'Google sign-in was closed.','permission-denied':'You do not have permission for this change.'})[e.code]||e.message||String(e);
let off=[],current=null;
async function identify(user){
 if(!user)return null;
 if(user.uid===adminUid&&user.email?.toLowerCase()===adminEmail)return {platformAdmin:true,admin:false,email:user.email,name:'Platform admin'};
 const p=await getDoc(profile(user.uid));
 if(!p.exists()||p.data().active!==true)throw new Error('This account is not active. Ask the admin.');
 const x=p.data();
 if(x.role==='owner')return {platformAdmin:false,admin:true,workshopId:x.workshopId,email:user.email,name:x.name||user.displayName||'Workshop owner'};
 if(x.role==='employee')return {platformAdmin:false,admin:false,workshopId:x.workshopId,employee:x.employeeId,email:user.email};
 throw new Error('This account has no workshop role.');
}
async function loginEmail(email,password){const c=await signInWithEmailAndPassword(auth,email.toLowerCase()==='admin'?adminEmail:email,password);return identify(c.user)}
async function loginOwner(){const c=await signInWithPopup(auth,new GoogleAuthProvider());return identify(c.user)}
function watchAuth(cb){return onAuthStateChanged(auth,async u=>{try{current=await identify(u);cb(current,null)}catch(e){current=null;cb(null,e)}})}
function stop(){off.forEach(f=>f());off=[]}
function view(raw){
 const result={admin:raw.config?.admin||{name:current?.name||'Workshop Admin',username:current?.email||''},settings:raw.config?.settings||{name:'Your Workshop',address:'',phone:'',gst:'',logo:'',footer:'Thank you for trusting us with your car. Drive safe!',currency:'INR'}};
 for(const t of ['employees','customers','inventory','requests','attendance','invoices'])result[t]=raw[t]||[];
 const statuses=new Map((raw.jobStatuses||[]).map(x=>[x.id,x.values]));
 const issued=new Map();
 for(const x of raw.issues||[]){const list=issued.get(x.job)||[];list.push({name:x.name,qty:x.qty,price:x.price,part:x.part,id:x.id});issued.set(x.job,list)}
 result.jobs=(raw.jobs||[]).map(j=>({...j,services:(j.services||[]).map((s,i)=>({...s,status:statuses.get(j.id)?.[i]||'Pending'})),issued:issued.get(j.id)||[]}));
 return result;
}
function watchData(cb){
 stop();const raw={};const required=current?.admin?rows:rows.filter(x=>x!=='invoices');const ready=new Set();
 off.push(onSnapshot(ref('config'),s=>{raw.config=s.exists()?s.data():null;ready.add('config');if(ready.size===required.length+1)cb(view(raw))},e=>cb(null,new Error('config: '+e.message))));
 for(const t of required)off.push(onSnapshot(collection(db,'workshops',current.workshopId,t),s=>{raw[t]=s.docs.map(d=>({...d.data(),id:d.id}));ready.add(t);if(ready.size===required.length+1)cb(view(raw))},e=>cb(null,new Error(t+': '+e.message))));
}
function clean(t,obj){
 if(obj==null)return obj;
 const x=copy(obj);delete x.example;delete x.passwordHash;
 if(t==='jobs'){delete x.issued;x.services=(x.services||[]).map(s=>({name:s.name,price:s.price,type:s.type}))}
 if(t==='issues')delete x.id;
 return x;
}
function changes(before,after){
 const ops=[];
 for(const t of ['employees','customers','inventory','requests','attendance','invoices']){
  const old=new Map((before[t]||[]).map(x=>[x.id,x])),now=new Map((after[t]||[]).map(x=>[x.id,x]));
  for(const [id,v] of now)if(!equal(clean(t,v),clean(t,old.get(id))))ops.push({type:t,id,before:old.get(id)||null,after:v});
  for(const [id,v] of old)if(!now.has(id))ops.push({type:t,id,before:v,after:null});
 }
 const oldJobs=new Map((before.jobs||[]).map(x=>[x.id,x])),newJobs=new Map((after.jobs||[]).map(x=>[x.id,x]));
 for(const [id,v] of newJobs){
  const prior=oldJobs.get(id);
  if(!equal(clean('jobs',v),clean('jobs',prior)))ops.push({type:'jobs',id,before:prior||null,after:v});
  const statuses=v.services.map(s=>s.status||'Pending'),oldStatuses=prior?.services.map(s=>s.status||'Pending')||[];
  if(!prior||!equal(statuses,oldStatuses))ops.push({type:'jobStatuses',id,before:prior?{values:oldStatuses}:null,after:{values:statuses}});
  for(const issue of (v.issued||[]).slice(prior?.issued?.length||0)){
   const issueId='ISS-'+Date.now()+'-'+Math.random().toString(36).slice(2,9);
   ops.push({type:'issues',id:issueId,before:null,after:{job:id,part:issue.part,name:issue.name,qty:issue.qty,price:issue.price}});
  }
 }
 for(const [id,v] of oldJobs)if(!newJobs.has(id)){ops.push({type:'jobs',id,before:v,after:null});ops.push({type:'jobStatuses',id,before:{values:v.services.map(s=>s.status)},after:null})}
 const oldConfig={admin:before.admin,settings:before.settings},newConfig={admin:after.admin,settings:after.settings};
 if(!equal(oldConfig,newConfig))ops.push({type:'config',id:'main',before:oldConfig,after:newConfig});
 return ops;
}
async function save(before,after){
 const ops=changes(before,after);if(!ops.length)return;
 if(ops.length>30)throw new Error('Too many changes at once. Use the import tool for large updates.');
 await runTransaction(db,async tx=>{
  const snapshots=[];
  for(const op of ops){const s=await tx.get(ref(op.type,op.id));snapshots.push(s);const actual=s.exists()?s.data():null,expected=clean(op.type,op.before);
   if((op.before==null)!==(actual==null)||op.before!=null&&!equal(clean(op.type,actual),expected))throw new Error('Workshop data changed on another device. Review the latest records and try again.');
  }
  for(const op of ops){const target=ref(op.type,op.id);if(op.after)tx.set(target,clean(op.type,op.after));else tx.delete(target)}
 });
}
function temporaryPassword(){return Array.from(crypto.getRandomValues(new Uint8Array(48)),b=>b.toString(16).padStart(2,'0')).join('')}
async function makeAuthAccount(email){
 const secondary=initializeApp(cfg,'invite-'+Date.now()+'-'+Math.random());
 try{const secondaryAuth=getAuth(secondary),c=await createUserWithEmailAndPassword(secondaryAuth,email,temporaryPassword());await signOut(secondaryAuth);return c.user.uid}
 finally{await deleteApp(secondary)}
}
async function inviteOwner(email,name){
 if(!current?.platformAdmin)throw new Error('Platform admin permission required.');
 email=email.trim().toLowerCase();name=name.trim();
 if(!email.includes('@')||!name)throw new Error('Enter an owner name and email.');
 const uid=await makeAuthAccount(email),workshopId='w-'+uid;
 await setDoc(profile(uid),{role:'owner',workshopId,active:true,name,email,updatedAt:serverTimestamp()});
 await sendPasswordResetEmail(auth,email);
 return {uid,workshopId,email,name};
}
function watchOwners(cb){if(!current?.platformAdmin)throw new Error('Platform admin permission required.');const unsub=onSnapshot(collection(db,'users'),s=>cb(s.docs.map(d=>({uid:d.id,...d.data()})).filter(x=>x.role==='owner'),null),e=>cb(null,e));off.push(unsub);return unsub}
async function provision(employeeData){
 if(!current?.admin||!current.workshopId)throw new Error('Owner permission required.');
 const uid=await makeAuthAccount(employeeData.email);
 await setProfile(uid,employeeData.id,true);
 await sendPasswordResetEmail(auth,employeeData.email);
 return uid;
}
async function setProfile(uid,employeeId,active){
 if(!current?.admin||!current.workshopId)throw new Error('Owner permission required.');
 await setDoc(profile(uid),{role:'employee',workshopId:current.workshopId,employeeId,active,updatedAt:serverTimestamp()});
}
async function resetPassword(email){await sendPasswordResetEmail(auth,email.toLowerCase()==='admin'?adminEmail:email)}
async function logout(){stop();await signOut(auth)}
async function seed(seedData){
 if(!current?.admin||!current.workshopId)throw new Error('Owner permission required.');
 const seen=await getDoc(ref('config'));if(seen.exists())return;
 const batch=writeBatch(db);
 batch.set(ref('config'),{admin:{name:current.name||'Workshop Admin',username:current.email},settings:seedData.settings});
 for(const part of seedData.inventory)batch.set(ref('inventory',part.id),clean('inventory',part));
 await batch.commit();
}
window.WDF={auth,db,get owner(){return current?.email||''},adminEmail,rows,authError,identify,loginEmail,loginOwner,watchAuth,watchData,watchOwners,stop,save,provision,setProfile,resetPassword,inviteOwner,logout,seed};
