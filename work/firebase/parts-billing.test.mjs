import fs from 'node:fs';import vm from 'node:vm';import assert from 'node:assert/strict';
const src=fs.readFileSync(new URL('../design/dist/parts-billing.js',import.meta.url),'utf8');
const state={inventory:[{id:'p1',name:'Oil filter',stock:5,price:150}],invoices:[],jobs:[],customers:[],settings:{name:'Test shop',footer:'Thank you'}};
const context={state,Date,Math,Map,Number,document:{addEventListener(){}},customer:()=>({name:'Legacy customer'}),esc:x=>String(x??'').replace(/</g,'&lt;'),money:n=>'INR '+n,total:i=>(i.lines.reduce((s,l)=>s+l.qty*l.price,0)-i.discount)*(1+i.tax/100),documentHeader:(type,id)=>type+' '+id};
const app=fs.readFileSync(new URL('../design/dist/app.js',import.meta.url),'utf8');const print=app.slice(app.indexOf('function billDocument('),app.indexOf('function jobDocument('));
vm.runInNewContext(print+src+';globalThis.api={preparePartsBill,partsBillDocument,invoiceCustomer};',context);
const data={buyerName:'Walk-in buyer',buyerPhone:'9000000000',buyerAddress:'Kochi',date:'2026-10-30',payment:'Paid',discount:'10',tax:'18'};
const lines=[{part:'p1',name:'Oil filter',qty:2,price:150},{part:'p1',name:'Oil filter',qty:1,price:150},{part:'',name:'Washer',qty:1,price:10}];
const result=context.api.preparePartsBill(data,lines,true);assert.equal(result.bill.kind,'spare-parts');assert.equal(result.bill.job,'');assert.equal(result.stock[0].stock,2);assert.equal(result.bill.paidDate,data.date);assert.equal(context.total(result.bill),531);assert.equal(state.inventory[0].stock,5,'Validation does not mutate stock.');
assert.match(context.api.partsBillDocument(result.bill),/Spare parts bill/);assert.doesNotMatch(context.api.partsBillDocument(result.bill),/Job card:/);assert.match(context.api.partsBillDocument(result.bill),/Walk-in buyer/);
assert.equal(context.api.preparePartsBill({...data,payment:'Unpaid'},lines,false).stock.length,0);assert.equal(context.api.preparePartsBill({...data,payment:'Unpaid'},lines,false).bill.paidDate,undefined);
assert.throws(()=>context.api.preparePartsBill(data,[...lines,{part:'p1',name:'Oil filter',qty:3,price:150}],true),/only 5 available/);
for(const bad of [{discount:'-1'},{discount:'99999'},{tax:'101'},{buyerName:''},{payment:'Other'}])assert.throws(()=>context.api.preparePartsBill({...data,...bad},lines,true));
assert.throws(()=>context.api.preparePartsBill({...data,discount:'0'},[{part:'missing',name:'Part',qty:1,price:1}],true),/no longer exists/);
assert.throws(()=>context.api.preparePartsBill(data,[{part:'',name:'Part',qty:0,price:1}],true));
// Invoice and inventory edits use the existing single transaction operation list.
const runtime=fs.readFileSync(new URL('./runtime.js',import.meta.url),'utf8');const block=runtime.slice(runtime.indexOf('function clean('),runtime.indexOf('async function save('));
const adapter={copy:x=>JSON.parse(JSON.stringify(x)),canonical:JSON.stringify,equal:(a,b)=>JSON.stringify(a)===JSON.stringify(b),Date,Math};vm.runInNewContext(block+';globalThis.compute=changes;',adapter);
const before={admin:{},settings:{},inventory:state.inventory,invoices:[],jobs:[]},after=JSON.parse(JSON.stringify(before));after.inventory[0].stock=2;after.invoices.push(result.bill);assert.deepEqual(Array.from(adapter.compute(before,after),x=>x.type),['inventory','invoices']);
console.log('Parts billing passed: standalone customer bill, totals, combined stock checks, manual items, paid sales, print output and atomic invoice/inventory changes.');

state.jobs.push({id:'job1',brand:'Honda',model:'City',plate:'TEST'});
const labour={...result.bill,kind:undefined,job:'job1',lines:[{name:'Oil change labour',qty:1,price:500}],discount:0,tax:0};
const labourHtml=context.billDocument(labour);assert.match(labourHtml,/<th>Labour cost<\/th>/);assert.doesNotMatch(labourHtml,/<th>Qty<\/th>/);
const estimateHtml=context.billDocument({...labour,type:'Estimate'});assert.match(estimateHtml,/<th>Qty<\/th>/);
assert.match(context.api.partsBillDocument(result.bill),/<th>Qty<\/th>/);
