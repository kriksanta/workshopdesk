import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const page=fs.readFileSync(path.join(root,'work/website/index.html'),'utf8');
for(const target of ['./style.css','./logo.png','./favicon.png','https://raw.githubusercontent.com/kriksanta/workshopdesk/firebase-spark-migration/desktop/Workshop-Desk.exe']){
  assert.ok(page.includes(target),'Missing website link: '+target);
}
for(const label of ['Download for Windows','Open mobile app','Open in browser','Job cards','attendance','spare parts','invoices']){
  assert.ok(page.toLowerCase().includes(label.toLowerCase()),'Missing page content: '+label);
}
assert.ok(!/server|backend|firestore|firebase|google sheets/i.test(page.replace(/https?:\/\/[^\"\s]+/g,'')),'Marketing page mentions infrastructure');
for(const file of ['style.css','logo.png','favicon.png'])assert.ok(fs.statSync(path.join(root,'work/website',file)).size>0);
const exe=fs.readFileSync(path.join(root,'desktop/Workshop-Desk.exe'));
assert.equal(exe.subarray(0,2).toString(),'MZ');
assert.ok(exe.length>4096);
console.log('Download website and Windows executable checks passed.');
