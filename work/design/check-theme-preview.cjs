const fs=require('fs'),vm=require('vm'),assert=require('assert/strict');
const code=fs.readFileSync('work/design/dist/theme.js','utf8');
function scenario(saved,systemDark,denied=false){
  let current=null,hostExists=true,observer,click,systemChange;
  const savedValues=[];
  const meta={content:''};
  const host={matches:()=>false,prepend(el){current=el},append(el){current=el}};
  const root={dataset:{}};
  const document={
    documentElement:root,
    getElementById:()=>current,
    querySelector:s=>s.startsWith('meta')?meta:(hostExists&&s==='.top-actions'?host:null),
    createElement:()=>({classList:{toggle(name,value){this[name]=value}},setAttribute(k,v){this[k]=v}}),
    addEventListener(name,fn){if(name==='click')click=fn}
  };
  vm.runInNewContext(code,{
    document,localStorage:{getItem(){if(denied)throw Error();return saved},setItem(k,v){if(denied)throw Error();savedValues.push([k,v])}},
    matchMedia:()=>({matches:systemDark,addEventListener(n,fn){systemChange=fn}}),
    MutationObserver:class{constructor(fn){observer=fn}observe(){}}
  });
  const initial=saved==='dark'||(saved!=='light'&&systemDark)?'dark':'light';
  assert.equal(root.dataset.theme,initial);
  assert.equal(current['aria-pressed'],String(initial==='dark'));
  click({target:{closest:()=>current}});
  assert.equal(root.dataset.theme,initial==='dark'?'light':'dark');
  const chosen=root.dataset.theme;
  if(!denied)assert.deepEqual(savedValues.at(-1),['theme',chosen]);
  systemChange({matches:!systemDark});
  assert.equal(root.dataset.theme,chosen,'manual selection survives device changes');
  current=null;observer();
  assert.equal(current['aria-pressed'],String(chosen==='dark'),'switch state restored after page render');
  assert.equal(meta.content,chosen==='dark'?'#0B1424':'#F0F3F7');
}
scenario(null,false);scenario(null,true);scenario('light',true);scenario('dark',false);scenario('invalid',true);scenario(null,true,true);
const html=fs.readFileSync(process.argv[2],'utf8');
const scripts=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)];
assert.equal(scripts.length,6);scripts.forEach((m,i)=>new vm.Script(m[1],{filename:'inline-'+i}));
assert(!/<script src=/.test(html));assert(!/href="(?:theme|style)\.css"/.test(html));
function luminance(hex){return hex.match(/\w\w/g).map(x=>parseInt(x,16)/255).map(x=>x<=.04045?x/12.92:((x+.055)/1.055)**2.4).reduce((a,v,i)=>a+v*[.2126,.7152,.0722][i],0)}
function contrast(a,b){const l=[luminance(a),luminance(b)].sort((a,b)=>b-a);return((l[0]+.05)/(l[1]+.05)).toFixed(2)}
console.log('Theme behavior: device default, saved preference, click, re-render and unavailable storage passed.');
console.log('Preview: all 6 inline scripts parse; CSS, scripts and logos are embedded.');
for(const [name,a,b]of [['Day text','1C3455','FFFFFF'],['Night text','F5F8FF','17253B'],['Day button','FFFFFF','285B94'],['Night button','0B1424','6EA4E8'],['Day secondary','687B94','FFFFFF'],['Night secondary','A7B7CE','17253B']])console.log(name+' contrast '+contrast(a,b)+':1');

