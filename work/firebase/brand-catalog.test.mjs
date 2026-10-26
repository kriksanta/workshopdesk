import fs from 'node:fs';import vm from 'node:vm';import assert from 'node:assert/strict';
const read=f=>fs.readFileSync(new URL('../design/dist/'+f,import.meta.url),'utf8');const source=read('brand-catalog.js');const callbacks={};
const state={settings:{brandCatalog:[{name:'Workshop Brand',models:['Model One'],logo:'data:image/png;base64,abc'}]}};
const context={CARS:{Toyota:['Innova']},state,document:{addEventListener:(name,fn)=>callbacks[name]=fn},role:'employer',session:{admin:true},FormData:class{constructor(f){this.f=f}get(k){return this.f[k]}},closeModal(){context.closed=true},render(){context.rendered=true},toast(){},query:'',esc:s=>s,initials:s=>s.slice(0,2)};
vm.runInNewContext(source+';globalThis.catalog=vehicleCatalog;globalThis.logo=vehicleBrandLogo;',context);
assert.deepEqual(Array.from(context.catalog()['Workshop Brand']),['Model One']);assert.equal(context.logo('Toyota'),'brand-logos/toyota.png');assert.equal(context.CARS['Workshop Brand'],undefined);
let message='';const form={id:'brand-editor',original:'',brandName:'toyota',models:'New Model',querySelector:()=>({set textContent(v){message=v}})};
callbacks.submit({target:form,preventDefault(){}});assert.match(message,/already exists/);assert.equal(state.settings.brandCatalog.length,1);
form.brandName='New Make';form.models='One, Two\nOne';callbacks.submit({target:form,preventDefault(){}});assert.equal(state.settings.brandCatalog.length,2);assert.deepEqual(Array.from(context.catalog()['New Make']),['One','Two']);assert.equal(context.closed,true);
context.role='employee';form.brandName='Unauthorized';callbacks.submit({target:form,preventDefault(){}});assert.equal(state.settings.brandCatalog.length,2);
context.state={settings:{}};assert.equal(context.catalog()['Workshop Brand'],undefined,'Workshop custom brands must not leak across tenants.');
const mapping=JSON.parse(read('brand-logos.json'));assert.equal(Object.keys(mapping).length,46);for(const path of Object.values(mapping)){assert.ok(path);const bytes=fs.readFileSync(new URL('../design/dist/'+path,import.meta.url));assert.ok(bytes.length>100);}
console.log('Brand catalog passed: 46 bundled logos, search model data, duplicate prevention, owner-only writes, and workshop isolation.');
