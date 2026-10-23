import json,subprocess,sys,urllib.request,urllib.parse
from pathlib import Path
P='workshop-desk'
B=f'https://firestore.googleapis.com/v1/projects/{P}/databases/(default)/documents'
tok=subprocess.check_output(['gcloud','auth','print-access-token'],text=True).strip()
def api(method,url,obj=None):
 d=None if obj is None else json.dumps(obj).encode()
 r=urllib.request.Request(url,data=d,method=method,headers={'Authorization':'Bearer '+tok,'Content-Type':'application/json'})
 with urllib.request.urlopen(r,timeout=120) as x:return json.load(x)
def val(x):
 if x is None:return {'nullValue':None}
 if isinstance(x,bool):return {'booleanValue':x}
 if isinstance(x,int):return {'integerValue':str(x)}
 if isinstance(x,float):return {'doubleValue':x}
 if isinstance(x,str):return {'stringValue':x}
 if isinstance(x,list):return {'arrayValue':{'values':[val(v) for v in x]}}
 if isinstance(x,dict):return {'mapValue':{'fields':{k:val(v) for k,v in x.items()}}}
 raise TypeError(type(x))
def doc(t,id,x):
 n=f'projects/{P}/databases/(default)/documents/workshops/main/{t}/{urllib.parse.quote(str(id),safe="")}'
 return {'update':{'name':n,'fields':{k:val(v) for k,v in x.items()}}}
def clean(t,x):
 x=dict(x);x.pop('example',None);x.pop('passwordHash',None)
 if t=='jobs':
  x.pop('issued',None)
  x['services']=[{k:s.get(k) for k in ('name','price','type')} for s in x.get('services',[])]
 return x
src=json.loads(Path(sys.argv[1]).read_text(encoding='utf-8'))
for t in ('employees','customers','jobs','requests','attendance','invoices','issues'):
 if api('GET',f'{B}/workshops/main/{t}?pageSize=1').get('documents'):raise RuntimeError(f'Import refused: existing {t} data')
config={'admin':{'name':src.get('admin',{}).get('name') or 'Workshop Admin','username':'sreejithsubhashrecy@gmail.com'},'settings':src['settings']}
writes=[{'update':{'name':f'projects/{P}/databases/(default)/documents/workshops/main','fields':{k:val(v) for k,v in config.items()}}}]
counts={}
for t in ('employees','customers','inventory','requests','attendance','invoices'):
 items=src.get(t,[]);counts[t]=len(items)
 for x in items:writes.append(doc(t,x['id'],clean(t,x)))
counts['jobs']=len(src.get('jobs',[]))
for j in src.get('jobs',[]):
 writes.append(doc('jobs',j['id'],clean('jobs',j)))
 writes.append(doc('jobStatuses',j['id'],{'values':[s.get('status') or 'Pending' for s in j.get('services',[])]}))
 for i,x in enumerate(j.get('issued',[])):
  d={k:x.get(k) for k in ('part','name','qty','price')};d['job']=j['id']
  writes.append(doc('issues',f"MIG-{j['id']}-{i}",d))
endpoint=f'https://firestore.googleapis.com/v1/projects/{P}/databases/(default)/documents:commit'
for i in range(0,len(writes),100):api('POST',endpoint,{'writes':writes[i:i+100]})
print('Imported',len(writes),'documents; counts:',counts)
