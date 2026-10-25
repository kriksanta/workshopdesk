import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const source = path.join(path.dirname(fileURLToPath(import.meta.url)), 'dist');
const output = process.argv[2];
if (!output) throw new Error('Pass an absolute output HTML path.');
const read = file => fs.readFileSync(path.join(source, file), 'utf8').replace(/^\uFEFF/, '');
const logo = 'data:image/png;base64,' + fs.readFileSync(path.join(source, 'brand-logo.png')).toString('base64');
const script = text => '<script>' + text.replace(/<\/script/gi, '<\\/script') + '</script>';
let html = read('index.html');
html = html.replace('<title>Workshop Desk — Your workshop, in sync</title>', '<title>Workshop Desk — Interior preview · Day & Night</title>');
for (const file of ['style.css', 'theme.css']) {
  html = html.replace('<link rel="stylesheet" href="' + file + '">', () => '<style>' + read(file) + '</style>');
}
html = html.replace('<link rel="manifest" href="manifest.webmanifest">', '');
for (const file of ['favicon-48.png', 'icon-192.png']) {
  for (const suffix of ['', '?v=blue1']) html = html.replace('href="' + file + suffix + '"', 'href="data:image/png;base64,' + fs.readFileSync(path.join(source,file)).toString('base64') + '"');
}
for (const file of ['theme.js', 'catalog.js', 'attendance.js', 'account-install.js', 'app.js']) {
  let content = read(file).replaceAll('brand-logo.png', logo);
  if (file === 'app.js') content = content
    .replaceAll('Design preview · One example workflow · Changes reset on refresh', 'INTERIOR PREVIEW · Sample records only')
    .replaceAll('Google Sheets connection planned', 'Day & Night')
    .replaceAll('Design preview · No storage connected', 'Preview only · Changes reset on refresh')
    .replaceAll('Updated in this preview', 'Sample records');
  html = html.replace('<script src="' + file + '"></script>', () => script(content));
}
const demo = `
session={admin:true};
role='employer';
page='Dashboard';
state.admin.name='Preview Owner';
state.settings.name='The Motor House';
state.employees[0].name='Arjun Menon';
state.employees[0].active=true;
state.customers[0].name='Anjali Nair';
state.jobs[0].services[0].status='In progress';
state.customers.push({id:'c2',name:'Rahul Kumar',phone:'9000000002',address:'Kochi',brand:'Maruti Suzuki',model:'Swift',plate:'KL 07 AB 1234',example:true});
state.jobs.push({id:'JC-1042',customer:'c2',assigned:'e1',date:today,due:today,brand:'Maruti Suzuki',model:'Swift',plate:'KL 07 AB 1234',odometer:42000,fuel:'Petrol',notes:'Sample record for the theme preview.',services:[{name:'Brake service',price:2200,status:'Finished',type:'Service'}],issued:[],example:true});
state.inventory[0].stock=12;state.inventory[0].price=340;
state.inventory[1].stock=3;state.inventory[1].price=220;
state.inventory[2].stock=0;state.inventory[2].price=450;
state.attendance.push({id:'preview-att',employee:'e1',date:today,status:'Present',in:'09:15',out:''});
state.invoices.push({id:'INV-PREVIEW',job:'JC-1042',type:'Invoice',date:today,status:'Paid',paidDate:today,lines:[{name:'Brake service',qty:1,price:2200}],discount:0,tax:0});
render();
`;
html = html.replace('</body>', () => script(demo) + '</body>');
fs.mkdirSync(path.dirname(output), {recursive:true});
fs.writeFileSync(output, html);
console.log('Created self-contained interior preview: ' + output);

