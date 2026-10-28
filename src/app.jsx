import * as React from 'react';
import * as ReactDOM from 'react-dom/client';
const {useState,useRef,useEffect}=React;

/* =====================================================================
   1. CONFIG
   ===================================================================== */
const CAN_FILE=true;
const CFG=window.GTF_CONFIG||{},DB=String(CFG.databaseURL||'').trim().replace(/\/+$/,''),CLOUD=/^https?:\/\/[^\s]+$/.test(DB)&&!/YOUR[-_]/i.test(DB);
const ADAPT={init(){try{navigator.storage&&navigator.storage.persist&&navigator.storage.persist()}catch(e){}}};

/* =====================================================================
   2. GRADING SCALES  (percent score -> grade, target, passing mark)
   ===================================================================== */
const PRESETS={
 ph:{label:'1.0 is highest',sub:'Philippine style · 1.00 to 5.00 · lower is better',hi:1,dir:-1,target:'1.75',pass:75,fail:5,
  table:[[97,1],[94,1.25],[91,1.5],[88,1.75],[85,2],[82,2.25],[79,2.5],[76,2.75],[75,3]]},
 gpa:{label:'4.0 is highest',sub:'US style GPA · 0.0 to 4.0 · higher is better',hi:4,dir:1,target:'3.5',pass:60,fail:0,
  table:[[93,4],[90,3.7],[87,3.3],[83,3],[80,2.7],[77,2.3],[73,2],[70,1.7],[67,1.3],[65,1],[60,0.7]]},
 pct:{label:'100 is highest',sub:'Percentage · 0 to 100 · higher is better',hi:100,dir:1,target:'90',pass:75,fail:0,table:null}};
let CUR=null; // the scale of the account that is currently on screen
const mkScale=cfg=>{
 cfg=cfg||{};const id=PRESETS[cfg.scale]?cfg.scale:'ph',P=PRESETS[id];
 const num=(v,d)=>v===undefined||v===null||v===''||!Number.isFinite(+v)?d:+v;
 const table=id==='pct'?null:(Array.isArray(cfg.table)&&cfg.table.length?cfg.table:P.table).map(r=>[num(r[0],0),num(r[1],0)]).sort((a,b)=>b[0]-a[0]);
 const target=num(cfg.target,+P.target),pass=num(cfg.pass,P.pass),dir=P.dir,fail=P.fail;
 const toG=p=>{p=+(+p).toFixed(2);if(!table)return p;for(const[t,v]of table)if(p>=t)return v;return fail};
 const meets=g=>g!=null&&Number.isFinite(g)&&(dir<0?g<=target+1e-9:g>=target-1e-9);
 const pg=toG(pass),bad=g=>g!=null&&Number.isFinite(g)&&(dir<0?g>pg+1e-9:g<pg-1e-9);
 let need;if(!table)need=target;else{const r=table.filter(x=>meets(x[1]));need=r.length?Math.min(...r.map(x=>x[0])):101}
 return{id,P,table,target,pass,dir,fail,hi:P.hi,toG,meets,bad,need}};
CUR=mkScale(null);
const eqv=g=>CUR.toG(g);
const tone=g=>g==null?'':CUR.meets(g)?'text-good':CUR.bad(g)?'text-bad':'';
const f2=n=>Number.isFinite(n)?String(+n.toFixed(2)):'—';
const fg=g=>g==null||!Number.isFinite(g)?'—':g.toFixed(2);
const rel=t=>{if(!t)return'not yet';const s=Math.max(0,(Date.now()-t)/1000);if(s<20)return'just now';if(s<60)return Math.floor(s)+' sec ago';const m=Math.floor(s/60);if(m<60)return m+' min ago';const h=Math.floor(m/60);if(h<24)return h+' hr ago';return Math.floor(h/24)+' d ago'};
const cx=(...a)=>a.filter(Boolean).join(' ');

/* =====================================================================
   3. DATA, ACCOUNTS ("book") AND STORAGE
   ===================================================================== */
const uid=()=>Math.random().toString(36).slice(2,9);
const PRE=[['q1','Quiz 1',20],['q2','Quiz 2',20],['pe','Prelims Exam',50],['pp','Participation',10]];
const FIN=[['q3','Quiz 3',20],['q4','Quiz 4',20],['fe','Finals Exam',50],['fp','Participation',10]];
const mk=(code,name,units,e)=>({id:uid(),code,name,units:String(units),e,sc:{},wi:{}});
const seed=()=>{const y=uid(),s=uid();return{y,s,tg:{p:'',s:''},cfg:{scale:'ph'},years:[{id:y,name:'2nd Year (AY 2026–2027)',sems:[{id:s,name:'1st Semester',subs:[
 mk('STRATCOST','Strategic Cost Management',3,'📊'),mk('FINMAN','Financial Management',3,'💰'),mk('INTACC','Intermediate Accounting',3,'🧾'),mk('OBLICON','Obligations and Contracts',3,'⚖️'),mk('ITAPP','IT Applications',3,'💻')]}]}]}};
const blank=pre=>{if(pre)return seed();const y=uid(),s=uid();return{y,s,tg:{p:'',s:''},cfg:{scale:'ph'},years:[{id:y,name:'1st Year',sems:[{id:s,name:'1st Semester',subs:[]}]}]}};
const BK='gtf-book',EMO=['🎓','😎','🦊','🐼','🌸','⚡','🔥','🌈'];
const okState=d=>d&&Array.isArray(d.years)&&d.years.length&&d.years.every(y=>y&&Array.isArray(y.sems)&&y.sems.length);
const normBook=j=>{try{
 if(j&&Array.isArray(j.list)&&j.data&&typeof j.data==='object'){const g=Array.isArray(j.groups)?j.groups.filter(x=>typeof x==='string'&&x):[];if(!g.includes('General'))g.unshift('General');return{list:j.list,data:j.data,groups:g}}
 if(okState(j)){const id=uid();return{list:[{id,name:'My Account',emoji:'🎓',group:'General'}],data:{[id]:j},groups:['General']}}}catch(e){}return null};
const loadBook=()=>{let b=null;try{b=normBook(JSON.parse(localStorage.getItem(BK)))}catch(e){}if(!b)try{b=normBook(JSON.parse(localStorage.getItem('gtf-v1')))}catch(e){}if(!b){const id=uid();b={list:[{id,name:'My Account',emoji:'🎓',group:'General'}],data:{[id]:seed()},groups:['General']}}return b};
const saveBook=b=>{try{localStorage.setItem(BK,JSON.stringify(b))}catch(e){}};
const THEMES=[{id:'sun',name:'White & Yellow',bar:'#FFFFFF',sw:['#FFFFFF','#FACC15','#1C1B18']},{id:'dark',name:'Dark',bar:'#0E0E11',sw:['#1C1C21','#FBBF24','#F6F6F8']},{id:'mono',name:'Monochrome',bar:'#FAFAFA',sw:['#FFFFFF','#111111','#737373']},{id:'lav',name:'Lavender',bar:'#F7F5FF',sw:['#FFFFFF','#7C3AED','#1E1B3A']}];
const resizeImg=(file,size=192)=>new Promise((res,rej)=>{const r=new FileReader();r.onerror=rej;r.onload=()=>{const im=new Image();im.onerror=rej;im.onload=()=>{const c=document.createElement('canvas');c.width=c.height=size;const x=c.getContext('2d'),m=Math.min(im.width,im.height);x.drawImage(im,(im.width-m)/2,(im.height-m)/2,m,m,0,0,size,size);res(c.toDataURL('image/jpeg',.82))};im.src=r.result};r.readAsDataURL(file)});

/* ---- cloud helpers (Firebase Realtime Database over REST, no SDK) ---- */
const sha=async x=>{const h=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(x));return[...new Uint8Array(h)].map(b=>b.toString(16).padStart(2,'0')).join('')};
const ckey=(n,pw)=>sha('gtf1|'+n.trim().toLowerCase()+'|'+pw);
const curl=k=>DB+'/sync/'+k+'.json';
const cget=async k=>{const r=await fetch(curl(k),{cache:'no-store'});if(!r.ok)throw new Error('get '+r.status);return r.json()};
const cput=async(k,o)=>{const r=await fetch(curl(k),{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(o)});if(!r.ok)throw new Error('put '+r.status)};
const validDoc=r=>!!r&&typeof r.d==='string'&&typeof r.t==='number';

/* =====================================================================
   4. GRADE MATH
   ===================================================================== */
const pc=c=>{if(!c||c.s===''||c.s==null)return null;const m=c.m===''||c.m==null?100:+c.m;return m>0?+c.s/m*100:null};
const cvb=s=>Math.min(99,Math.max(0,+(s.cv&&s.cv.b)||0)),cvx=s=>+(s.cv&&s.cv.x)||0,isp=k=>k==='pp'||k==='fp';
const lin=(s,L,k,w)=>{const b=L===FIN&&!isp(k)?cvb(s):0;return[w*b/100,w*(100-b)/10000]};
const gr=(s,L)=>{let g=0,n=0;L.forEach(([k,,w])=>{const p=pc(s.sc[k]);if(p!=null){const[c,m]=lin(s,L,k,w);n++;g+=c+m*p}});if(L===FIN&&n)g=Math.min(100,g+cvx(s));return{g,n}};
const calc=s=>{const P=gr(s,PRE),F=gr(s,FIN),done=P.n===4&&F.n===4,sem=done?.4*P.g+.6*F.g:null;return{P,F,sem,eq:sem==null?null:eqv(sem)}};
const gwa=a=>{let u=0,t=0;a.forEach(([e,n])=>{if(e!=null&&+n>0){u+=+n;t+=e*n}});return u?t/u:null};
const wv=(s,k)=>s.wi&&s.wi[k]!==undefined?s.wi[k]:(isp(k)?'90':'85');
const mxs=(s,k)=>+(s.sc[k]&&s.sc[k].m)||100;
// period solver: entered scores stay fixed, missing ones use the what-if sliders; T = target grade for the period
const per=(s,L,T)=>{const bn=L===FIN?cvx(s):0;let K0=0;const miss=[];L.forEach(([k,l,w])=>{const p=pc(s.sc[k]),[c,m]=lin(s,L,k,w);if(p==null)miss.push([k,l,w,c,m]);else K0+=c+m*p});
 const wi=k=>+wv(s,k)||0,R=T-bn-K0;let pj=K0;miss.forEach(([k,,,c,m])=>pj+=c+m*wi(k));if(L===FIN)pj=Math.min(100,pj+bn);
 const Sm=miss.reduce((a,x)=>a+x[4],0),Sc=miss.reduce((a,x)=>a+x[3],0);
 const uni=miss.length?(R-Sc)/Sm:null;
 const alone=miss.map(([k,l,w,c,m])=>{const o=miss.reduce((a,x)=>x[0]===k?a:a+x[3]+x[4]*wi(x[0]),0);return[k,(R-o-c)/m]});
 return{miss,Wm:miss.reduce((a,x)=>a+x[2],0),uni,alone,proj:pj}};
const proj=s=>{const Pg=per(s,PRE,0).proj,Fp=per(s,FIN,0).proj,sem=.4*Pg+.6*Fp;return{Pg,Fp,sem,eq:eqv(sem)}};
const gproj=g=>{const Pg=+g.pre||0,Fp=+g.fin||0,sem=.4*Pg+.6*Fp;return{Pg,Fp,sem,eq:eqv(sem)}};
const fneed=(S,P)=>(S-.4*P)/.6;
const need=v=>v<=0?['Secured ✓',false]:v>100?['Out of reach ('+f2(v)+'%)',true]:[f2(v)+'%',false];
const ng=v=>v<=0?'Secured ✓':v>100?'Out of reach':f2(v);

/* =====================================================================
   5. UI PRIMITIVES (theme-aware: every colour is a CSS token, see index.html)
   ===================================================================== */
const CARD='rounded-3xl border border-line/70 bg-surface/80 backdrop-blur-xl shadow-lg shadow-ink/5';
const BTN='inline-flex items-center justify-center gap-1.5 rounded-xl border border-line bg-surface/80 px-3.5 py-2 text-sm font-semibold text-ink hover:bg-surface2 hover:border-ink/20 active:scale-[.97] transition disabled:opacity-40 disabled:pointer-events-none';
const BTNP='inline-flex items-center justify-center gap-1.5 rounded-xl bg-accent px-4 py-2 text-sm font-bold text-accent-ink shadow-sm hover:brightness-105 active:scale-[.97] transition disabled:opacity-50 disabled:pointer-events-none';
const BTNX='inline-flex items-center justify-center gap-1.5 rounded-xl border border-bad/30 px-3.5 py-2 text-sm font-semibold text-bad hover:bg-bad/10 active:scale-[.97] transition';
const INP='rounded-xl border border-transparent bg-surface2 text-center text-base font-semibold text-ink transition placeholder:font-normal placeholder:text-muted/60 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/40';
const SEL='rounded-xl border border-line bg-surface/80 px-3 py-2 text-sm font-semibold text-ink max-w-full focus:outline-none focus:ring-2 focus:ring-accent/40';
const LBL='text-xs font-bold uppercase tracking-[.12em] text-muted';

const Num=({v,on,ph,w='w-20',nav,bad})=><input inputMode="decimal" enterKeyHint="next" data-n={nav?1:undefined} onKeyDown={nav?e=>{if(e.key==='Enter'){e.preventDefault();const a=[...document.querySelectorAll('input[data-n]')],i=a.indexOf(e.target),n=a[i+1];n?n.focus():e.target.blur()}}:undefined} value={v??''} placeholder={ph} onChange={e=>{const x=e.target.value;if(/^\d*\.?\d*$/.test(x))on(x)}} className={cx(INP,'h-12 min-w-0',w,bad&&'!border-bad ring-2 ring-bad/40')}/>;
const TextIn=({v,on,ph,cls='',type='text'})=><input type={type} value={v} placeholder={ph} autoComplete="off" onChange={e=>on(e.target.value)} className={cx(INP,'h-12 w-full !text-left px-3.5',cls)}/>;
const Txt=({v,on,cls=''})=><input value={v} onChange={e=>on(e.target.value)} className={cx('min-w-0 rounded-xl bg-transparent px-2 py-1 text-base text-ink transition hover:bg-surface2 focus:outline-none focus:ring-2 focus:ring-accent/40',cls)}/>;
const Seg=({v,on,opts,cls=''})=><div className={cx('inline-grid grid-flow-col auto-cols-fr gap-1 rounded-2xl border border-line/70 bg-surface2/80 p-1',cls)}>{opts.map(([k,l])=><button key={k} onClick={()=>on(k)} className={cx('rounded-xl px-4 py-1.5 text-sm font-bold transition-all duration-300',v===k?'bg-accent text-accent-ink shadow':'text-muted hover:text-ink')}>{l}</button>)}</div>;
const Chev=({open})=><svg viewBox="0 0 20 20" className={cx('h-5 w-5 shrink-0 text-muted transition-transform duration-300',open&&'rotate-180')} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 7.5l5 5 5-5"/></svg>;
const Tile=({l,v,sub,bad})=><div className="rounded-2xl border border-line/60 bg-surface2/70 p-3"><div className="text-xs font-semibold text-muted">{l}</div><div className={cx('text-xl font-extrabold tabular-nums',bad?'text-bad':'text-ink')}>{v}</div>{sub&&<div className="mt-0.5 text-xs text-muted">{sub}</div>}</div>;
const AccentBox=({l,v,rl,r,foot})=><div className="flex items-center justify-between rounded-2xl bg-accent p-4 text-accent-ink shadow-md shadow-accent/20"><div><div className="text-xs font-semibold opacity-70">{l}</div><div className="tot inline-block text-3xl font-black tabular-nums">{v}</div></div><div className="text-right"><div className="text-xs font-semibold opacity-70">{rl}</div><div className="text-2xl font-black tabular-nums">{r}</div><div className="text-xs font-bold">{foot}</div></div></div>;
const Avatar=({a,s='h-14 w-14',t='text-3xl'})=>a&&a.pic?<img src={a.pic} alt="" className={cx(s,'shrink-0 rounded-2xl object-cover ring-1 ring-line')}/>:<div className={cx(s,t,'grid shrink-0 place-items-center rounded-2xl bg-accent/20 ring-1 ring-accent/30')}>{a?a.emoji:'👤'}</div>;

// Accordion card: click the header to expand; content animates open
const Acc=({open,onToggle,head,children,cls='',sa})=><section className={cx(CARD,'overflow-hidden',sa!=null&&'sa-'+(sa%6),cls)}>
 <button onClick={onToggle} aria-expanded={!!open} className="flex w-full items-center gap-3 p-4 text-left transition hover:bg-surface2/60">{head}<Chev open={open}/></button>
 <div className={cx('acc',open&&'open')} inert={!open}><div><div className="flex flex-col gap-4 p-4 pt-1">{children}</div></div></div></section>;

// Modal sheet (bottom sheet on phones, centred card on larger screens)
function Sheet({open,onClose,title,children,wide}){
 useEffect(()=>{if(!open)return;const k=e=>e.key==='Escape'&&onClose();window.addEventListener('keydown',k);const o=document.body.style.overflow;document.body.style.overflow='hidden';return()=>{window.removeEventListener('keydown',k);document.body.style.overflow=o}},[open]);
 if(!open)return null;
 return <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-6">
  <div onClick={onClose} className="anim-fade absolute inset-0 bg-ink/40 backdrop-blur-sm"/>
  <div className={cx('anim-sheet relative max-h-[92vh] w-full overflow-y-auto overscroll-contain rounded-t-[2rem] border border-line bg-bg shadow-2xl sm:rounded-[2rem]',wide?'sm:max-w-2xl':'sm:max-w-lg')} style={{paddingBottom:'env(safe-area-inset-bottom,0px)'}}>
   <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-line/60 bg-bg/80 px-6 py-4 backdrop-blur-xl"><h2 className="text-lg font-extrabold">{title}</h2><button onClick={onClose} aria-label="Close" className={BTN+' !px-3'}>✕</button></div>
   <div className="flex flex-col gap-7 p-6">{children}</div></div></div>;
}

const ThemePicker=({theme,setTheme})=><div className="grid grid-cols-2 gap-3">{THEMES.map(t=><button key={t.id} onClick={()=>setTheme(t.id)} className={cx('rounded-2xl border p-3 text-left transition-all duration-300 hover:-translate-y-0.5',theme===t.id?'border-accent ring-2 ring-accent/40 bg-surface':'border-line bg-surface/60 hover:bg-surface')}>
 <div className="mb-2 flex gap-1.5">{t.sw.map((c,i)=><span key={i} className="h-6 w-6 rounded-full border border-black/10" style={{background:c}}/>)}</div>
 <div className="text-sm font-bold">{t.name}</div><div className="text-xs text-muted">{theme===t.id?'Selected':'Tap to use'}</div></button>)}</div>;

/* =====================================================================
   6. APP  (one profile: Grade Tracker + Forecaster + Settings)
   ===================================================================== */
function App({init,acct,guest,onSave,onSwitch,onKeep,cloud,ext,loser,onLoser,theme,setTheme}){
 const [st,setSt]=useState(()=>init),[tab,setTab]=useState('t'),[sub,setSub]=useState('p'),[op,setOp]=useState({'s:table':true}),[tv,setTv]=useState({}),[tvAll,setTvAll]=useState('p'),[sx,setSx]=useState(false),[gadd,setGadd]=useState(false),[gf,setGf]=useState({name:'',units:'3',pre:''}),[adding,setAdding]=useState(false),[nf,setNf]=useState({code:'',name:'',units:'3'}),[msg,setMsg]=useState(''),[kn,setKn]=useState(''),[,setNow]=useState(0);
 const ref=useRef(st),past=useRef([]),fut=useRef([]),last=useRef({k:'',t:0}),e0=useRef(ext&&ext.n);
 const commit=n=>{ref.current=n;setSt(n);onSave(n)};
 useEffect(()=>{if(ext&&ext.data&&ext.n!==e0.current){e0.current=ext.n;ref.current=ext.data;setSt(ext.data);past.current=[];fut.current=[];last.current={k:'',t:0}}},[ext&&ext.n]);
 useEffect(()=>{const t=setInterval(()=>setNow(x=>x+1),20000);return()=>clearInterval(t)},[]);
 const set=(fn,key)=>{const cur=ref.current,nx=fn(cur),now=Date.now();if(!(key&&last.current.k===key&&now-last.current.t<1200)){past.current.push(cur);if(past.current.length>100)past.current.shift()}last.current={k:key||'',t:now};fut.current=[];commit(nx)};
 const undo=()=>{if(!past.current.length)return;fut.current.push(ref.current);last.current={k:'',t:0};commit(past.current.pop())};
 const redo=()=>{if(!fut.current.length)return;past.current.push(ref.current);last.current={k:'',t:0};commit(fut.current.pop())};
 const Y=st.years.find(y=>y.id===st.y)||st.years[0],S=Y.sems.find(x=>x.id===st.s)||Y.sems[0],tg=st.tg||{};
 CUR=mkScale(st.cfg);const C=CUR;
 const upd=(fn,key)=>set(c=>({...c,years:c.years.map(y=>y.id!==Y.id?y:{...y,sems:y.sems.map(x=>x.id!==S.id?x:fn(x))})}),key);
 const updSub=(id,fn,key)=>upd(x=>({...x,subs:x.subs.map(s=>s.id===id?fn(s):s)}),key&&key+id);
 const setF=(id,f,v)=>updSub(id,s=>({...s,[f]:v}),'f'+f);
 const setSc=(id,k,f,v)=>updSub(id,s=>({...s,sc:{...s.sc,[k]:{...s.sc[k],[f]:v}}}),k+f);
 const setWi=(id,k,v)=>updSub(id,s=>({...s,wi:{...(s.wi||{}),[k]:v}}),'w'+k);
 const setCv=(id,f,v)=>updSub(id,s=>({...s,cv:{...(s.cv||{}),[f]:v}}),'cv'+f);
 const setTg=(k,v)=>set(c=>({...c,tg:{...(c.tg||{}),[k]:v}}),'tg'+k);
 const setCfg=(p,key)=>set(c=>({...c,cfg:{...(c.cfg||{}),...p}}),key||'cfg'+Object.keys(p).join());
 const pickScale=id=>set(c=>({...c,tg:{p:'',s:''},cfg:{scale:id,target:PRESETS[id].target,pass:String(PRESETS[id].pass)}}));
 const setPass=v=>set(c=>({...c,tg:{p:'',s:''},cfg:{...(c.cfg||{}),pass:v}}),'cfgpass');
 const ords=['1st','2nd','3rd','4th','5th','6th'];
 const addYear=()=>set(c=>{const y=uid(),s=uid();return{...c,y,s,years:[...c.years,{id:y,name:(ords[c.years.length]||(c.years.length+1)+'th')+' Year',sems:[{id:s,name:'1st Semester',subs:[]}]}]}});
 const addSem=()=>set(c=>{const s=uid(),n=Y.sems.length;return{...c,s,years:c.years.map(y=>y.id!==Y.id?y:{...y,sems:[...y.sems,{id:s,name:(ords[n]||(n+1)+'th')+' Semester',subs:[]}]})}});
 const rename=(f,v)=>set(c=>({...c,years:c.years.map(y=>y.id!==Y.id?y:f==='y'?{...y,name:v}:{...y,sems:y.sems.map(x=>x.id!==S.id?x:{...x,name:v})})}),'rn'+f);
 const addSub=()=>{if(!nf.code.trim())return;upd(x=>({...x,subs:[...x.subs,mk(nf.code.trim().toUpperCase(),nf.name.trim(),nf.units||'3','📘')]}));setNf({code:'',name:'',units:'3'});setAdding(false)};
 const delSub=id=>upd(x=>({...x,subs:x.subs.filter(s=>s.id!==id)}));
 const clearScores=ids=>upd(x=>({...x,subs:x.subs.map(s=>!ids||ids.includes(s.id)?{...s,sc:{}}:s)}));
 const addGen=()=>{if(!gf.name.trim())return;upd(x=>({...x,gens:[...(x.gens||[]),{id:uid(),name:gf.name.trim(),units:gf.units||'3',pre:gf.pre,fin:'85'}]}));setGf({name:'',units:'3',pre:''});setGadd(false)};
 const setGen=(id,f,v)=>upd(x=>({...x,gens:(x.gens||[]).map(g=>g.id===id?{...g,[f]:v}:g)}),'g'+f+id);
 const delGen=id=>upd(x=>({...x,gens:(x.gens||[]).filter(g=>g.id!==id)}));
 const restoreLoser=()=>{try{set(()=>JSON.parse(loser.d))}catch(e){}onLoser()};
 const exportData=()=>{const d=JSON.stringify({app:'grades-tracker',version:2,account:acct.name,exported:new Date().toISOString(),data:ref.current},null,2),a=document.createElement('a');a.href=URL.createObjectURL(new Blob([d],{type:'application/json'}));a.download='grades-'+(acct.name||'backup').replace(/[^a-z0-9]+/gi,'-').toLowerCase()+'-'+new Date().toISOString().slice(0,10)+'.json';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),1500);setMsg('Backup downloaded ✓')};
 const importData=e=>{const f=e.target.files&&e.target.files[0];e.target.value='';if(!f)return;const r=new FileReader();r.onload=()=>{try{const j=JSON.parse(r.result),d=j&&j.data?j.data:j;if(!okState(d))throw new Error('bad');set(()=>d);setMsg('Backup restored ✓ (Undo brings back your previous data)')}catch(x){setMsg('That file is not a valid backup.')}};r.onerror=()=>setMsg('Could not read that file.');r.readAsText(f)};

 /* ---- derived numbers ---- */
 const subs=S.subs,cs=subs.map(calc),ps=subs.map(proj),gens=S.gens||[],gps=gens.map(gproj);
 const G=gwa(subs.map((s,i)=>[cs[i].eq,s.units])),gradedN=cs.filter(c=>c.eq!=null).length;
 const units=subs.reduce((a,s)=>a+(+s.units||0),0),uAll=units+gens.reduce((a,g)=>a+(+g.units||0),0);
 const all=[...subs.map((s,i)=>({n:s.code,e:s.e||'📘',u:s.units,P:ps[i].Pg,Fp:ps[i].Fp,sem:ps[i].sem,eq:ps[i].eq,maj:1})),...gens.map((g,i)=>({n:g.name||'Gen Ed',e:'📗',u:g.units,P:gps[i].Pg,Fp:gps[i].Fp,sem:gps[i].sem,eq:gps[i].eq,maj:0}))];
 const PG=gwa(all.map(r=>[r.eq,r.u]));
 let fstar=null;if(all.length)for(let i=0;i<=1000;i++){const F=i/10,g=gwa(all.map(r=>[eqv(.4*r.P+.6*F),r.u]));if(g!=null&&C.meets(g)&&all.every(r=>.4*r.P+.6*F>=C.pass-1e-9)){fstar=F;break}}
 const best=all.length?gwa(all.map(r=>[eqv(.4*r.P+60),r.u])):null;
 const Tp=+tg.p||C.pass,Ts=+tg.s||C.pass,TF=s=>(Ts-.4*per(s,PRE,0).proj)/.6;
 const isO=k=>!!op[k],tog=k=>setOp(o=>({...o,[k]:!o[k]})),allO=(p,ids,v)=>setOp(o=>{const n={...o};ids.forEach(i=>n[p+i]=v);return n});
 const gwaNow=tab==='t'?G:PG;

 /* ---- share / export as image ---- */
 const exportImage=async()=>{
  try{await document.fonts.load('800 40px "Plus Jakarta Sans"')}catch(e){}
  const rs=getComputedStyle(document.documentElement),col=(n,a)=>{const t=rs.getPropertyValue(n).trim().split(/\s+/);return`rgba(${t[0]},${t[1]},${t[2]},${a==null?1:a})`};
  const rows=subs.map((s,i)=>({code:s.code,p:cs[i].P.n?f2(cs[i].P.g):'—',f:cs[i].F.n?f2(cs[i].F.g):'—',s:cs[i].sem==null?'—':f2(cs[i].sem),g:cs[i].eq,tone:tone(cs[i].eq)}));
  const W=1080,pad=84,rh=88,H=pad+560+rows.length*rh+170,ff='"Plus Jakarta Sans",system-ui,-apple-system,"Segoe UI",sans-serif';
  const c=document.createElement('canvas');c.width=W;c.height=H;const x=c.getContext('2d');
  const rr=(a,b,w,h,r,f)=>{x.beginPath();x.roundRect?x.roundRect(a,b,w,h,r):x.rect(a,b,w,h);x.fillStyle=f;x.fill()};
  x.fillStyle=col('--bg');x.fillRect(0,0,W,H);
  const gl=x.createRadialGradient(120,0,0,120,0,720);gl.addColorStop(0,col('--accent',.28));gl.addColorStop(1,col('--accent',0));x.fillStyle=gl;x.fillRect(0,0,W,H);
  rr(pad,pad,150,14,7,col('--accent'));
  x.fillStyle=col('--muted');x.font='700 26px '+ff;x.fillText('GRADES SUMMARY',pad,pad+70);
  x.fillStyle=col('--ink');x.font='800 58px '+ff;x.fillText(acct.name,pad,pad+144);
  x.fillStyle=col('--muted');x.font='500 28px '+ff;x.fillText(Y.name+' · '+S.name,pad,pad+192);
  const gy=pad+330;x.fillStyle=col('--muted');x.font='700 24px '+ff;x.fillText('CURRENT GWA',pad,gy-96);x.fillText('DEAN’S LIST TARGET',W/2+10,gy-96);
  x.font='900 150px '+ff;x.fillStyle=G!=null&&C.meets(G)?col('--good'):col('--ink');x.fillText(fg(G),pad,gy+44);
  x.fillStyle=col('--ink');x.fillText(fg(C.target),W/2+10,gy+44);
  x.font='500 28px '+ff;x.fillStyle=col('--muted');x.fillText(G==null?'Waiting for grades':C.meets(G)?'On track for the Dean’s List':'Not there yet',pad,gy+98);x.fillText('or better · highest grade '+fg(C.hi),W/2+10,gy+98);
  let y=gy+170;x.font='700 22px '+ff;x.fillStyle=col('--muted');
  const cols=[[pad,'left','SUBJECT'],[560,'right','PRELIMS'],[700,'right','FINALS'],[840,'right','SEM.'],[W-pad,'right','GRADE']];
  cols.forEach(([px,al,t])=>{x.textAlign=al;x.fillText(t,px,y)});x.textAlign='left';
  y+=22;rows.forEach(r=>{x.fillStyle=col('--line');x.fillRect(pad,y,W-pad*2,2);y+=rh-26;x.font='800 32px '+ff;x.fillStyle=col('--ink');x.fillText(r.code,pad,y);
   x.font='600 30px '+ff;x.textAlign='right';x.fillStyle=col('--muted');x.fillText(r.p,560,y);x.fillText(r.f,700,y);x.fillStyle=col('--ink');x.fillText(r.s,840,y);
   x.font='900 34px '+ff;x.fillStyle=r.tone==='text-good'?col('--good'):r.tone==='text-bad'?col('--bad'):col('--ink');x.fillText(fg(r.g),W-pad,y);x.textAlign='left';y+=26});
  x.fillStyle=col('--line');x.fillRect(pad,y,W-pad*2,2);
  x.font='500 24px '+ff;x.fillStyle=col('--muted');x.fillText(new Date().toLocaleDateString(undefined,{year:'numeric',month:'long',day:'numeric'})+' · Grades Tracker & Forecaster',pad,H-pad);
  const blob=await new Promise(r=>c.toBlob(r,'image/png'));if(!blob){setMsg('Could not create the image.');return}
  const file=new File([blob],'grades-summary.png',{type:'image/png'});
  try{if(navigator.canShare&&navigator.canShare({files:[file]})){await navigator.share({files:[file],title:'Grades summary'});return}}catch(e){if(e&&e.name==='AbortError')return}
  const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='grades-summary.png';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),1500);setMsg('Image saved ✓');
 };

 /* ---- header, summary, banners ---- */
 const Header=()=><header className="sticky z-30 -mx-4 border-b border-line/60 bg-bg/75 px-4 py-3 backdrop-blur-xl sm:-mx-8 sm:px-8" style={{top:'env(safe-area-inset-top,0px)'}}>
  <div className="mx-auto flex max-w-[1200px] flex-wrap items-center gap-2 sm:gap-3">
   <button onClick={onSwitch} className="flex items-center gap-2.5 rounded-2xl py-1.5 pl-1.5 pr-3 transition hover:bg-surface2 active:scale-[.97]"><Avatar a={acct} s="h-9 w-9" t="text-xl"/><span className="text-left leading-tight"><span className="block max-w-[9rem] truncate text-sm font-extrabold">{acct.name}</span><span className="block text-[11px] text-muted">Switch profile</span></span></button>
   <div className="mr-auto flex flex-col items-start leading-tight">
    <button onClick={cloud.sync} disabled={!cloud.on} className={cx('inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold transition',cloud.on?'border-line hover:bg-surface2':'border-transparent text-muted')}>{cloud.label}</button>
    {cloud.on&&<span className="mt-0.5 pl-1 text-[11px] text-muted">Last synced {rel(cloud.at)}{cloud.pending?' · changes waiting':''}</span>}
   </div>
   <button className={BTN} onClick={undo} disabled={!past.current.length} aria-label="Undo">↶ <span className="hidden sm:inline">Undo</span></button>
   <button className={BTN} onClick={redo} disabled={!fut.current.length} aria-label="Redo">↷ <span className="hidden sm:inline">Redo</span></button>
   <button className={BTNP} onClick={()=>setSx(true)}>⚙ Settings</button>
  </div></header>;

 const Summary=(g,label,sub)=>{const ok=C.meets(g);return <div className="grid gap-6 px-1 sm:grid-cols-3 sm:gap-8">
  <div><div className={LBL}>{label}</div><div className={cx('mt-1 text-5xl font-black tabular-nums tracking-tight sm:text-6xl',ok?'text-good':'text-ink')}>{fg(g)}</div><div className="mt-1 text-sm text-muted">{sub}</div></div>
  <div><div className={LBL}>Dean’s List target</div><div className="mt-1 text-5xl font-black tabular-nums tracking-tight text-ink sm:text-6xl">{fg(C.target)}</div><div className="mt-1 text-sm text-muted">or better · highest grade is {fg(C.hi)}</div></div>
  <div><div className={LBL}>Status</div><div className="mt-2 text-2xl font-extrabold">{g==null?'Waiting for grades':ok?'On track':'Not there yet'}</div><div className="mt-1 text-sm text-muted">{g==null?'Add scores to see your standing':ok?'You meet the target':fg(Math.abs(g-C.target))+' away from the target'}</div>
   <button onClick={exportImage} className={BTN+' mt-3'}>📤 Share / export as image</button></div></div>};

 const Banners=()=><>
  {loser&&<div className="anim-rise flex flex-wrap items-center gap-3 rounded-2xl border border-line bg-surface2/80 p-3 text-sm"><span className="min-w-[14rem] flex-1 font-semibold">Edits from two devices clashed. The newest version was kept.</span><button className={BTN} onClick={restoreLoser}>Restore the other version</button><button className={BTN} onClick={onLoser}>Dismiss</button></div>}
  {guest&&<div className="anim-rise flex flex-wrap items-center gap-3 rounded-2xl border border-accent/40 bg-accent/15 p-3 text-sm"><span className="font-semibold">Guest mode: nothing is saved when you leave.</span><input value={kn} onChange={e=>setKn(e.target.value)} placeholder="Profile name" className={cx(INP,'h-10 w-44 !text-left px-3')}/><button className={BTNP} onClick={()=>kn.trim()&&onKeep(kn.trim())}>Save as profile</button></div>}
  {msg&&<div className="anim-rise flex items-center justify-between gap-3 rounded-2xl border border-line bg-surface2/80 px-4 py-2 text-sm font-semibold">{msg}<button className="text-muted" onClick={()=>setMsg('')}>✕</button></div>}</>;

 /* ---- tracker ---- */
 const Block=({s,L,tag,pct,res,raw})=><div className="rounded-2xl border border-line/60 bg-surface2/60 p-4">
  <div className="mb-3 flex items-center justify-between"><h4 className="font-bold">{tag} <span className="ml-1 text-xs font-semibold text-muted">{pct}% of semestral</span></h4><span className="rounded-full bg-accent/25 px-3 py-1 text-sm font-extrabold tabular-nums">{raw!=null&&res.n>0&&<span className="mr-1 text-xs font-semibold text-muted">raw {f2(raw)} →</span>}{res.n?f2(res.g):'—'}</span></div>
  <div className="flex flex-col gap-3">{L.map(([k,l,w])=>{const c=s.sc[k]||{},p=pc(c);return <div key={k} className="flex items-center gap-3">
   <div className="min-w-0 flex-1"><div className="truncate text-sm font-semibold">{l}</div><div className="text-xs text-muted">{w}% · {p==null?'not entered':f2(p)+'%'}</div></div>
   <Num nav v={c.s} on={v=>setSc(s.id,k,'s',v)} ph="score" bad={p!=null&&p>100}/><span className="text-muted">/</span><Num v={c.m} on={v=>setSc(s.id,k,'m',v)} ph="100" w="w-16"/></div>})}</div></div>;
 const Curve=s=>{const b=cvb(s);return <div className="flex flex-col gap-2 rounded-2xl border border-dashed border-line p-3">
  <div className="text-sm font-bold">Grade curve <span className="text-xs font-semibold text-muted">(optional)</span></div>
  <div className="flex flex-wrap items-center gap-2 text-xs font-semibold"><span>Base</span>{[0,50,60].map(x=><button key={x} onClick={()=>setCv(s.id,'b',String(x))} className={cx('rounded-full px-3 py-1.5 transition',b===x?'bg-accent text-accent-ink':'bg-surface2 hover:bg-line/60')}>{x}</button>)}<Num v={s.cv&&s.cv.b} on={v=>setCv(s.id,'b',v)} ph="other" w="w-16"/><span className="ml-1">+ pts</span><Num v={s.cv&&s.cv.x} on={v=>setCv(s.id,'x',v)} ph="0" w="w-16"/></div>
  <p className="text-xs text-muted">Base 0 means raw scores, no curve. Base 50 turns each quiz or exam score into 50 plus half of it. Bonus points are added to the Finals grade (max 100). Participation is not curved.</p></div>};
 const TCard=(s,i)=>{const c=cs[i],v=tv[s.id]||tvAll,cv=cvb(s)||cvx(s),k='t:'+s.id,pass=c.sem!=null&&c.sem>=C.pass;
  const head=<>
   <span className="h-10 w-1.5 shrink-0 rounded-full bg-sa"/><span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-sa/15 text-2xl">{s.e||'📘'}</span>
   <span className="min-w-0 flex-1"><span className="block truncate font-extrabold">{s.code||'Subject'}</span><span className="block truncate text-xs text-muted">{s.name||'Tap to edit'} · {s.units} units</span></span>
   <span className="hidden text-right text-xs leading-5 text-muted sm:block">Prelims <b className="text-ink">{c.P.n?f2(c.P.g):'—'}</b><br/>Finals <b className="text-ink">{c.F.n?f2(c.F.g):'—'}</b></span>
   <span className="w-14 text-right"><span className="block text-[10px] font-bold uppercase tracking-wider text-muted">Sem</span><span className="block text-lg font-black tabular-nums">{c.sem==null?'—':f2(c.sem)}</span></span>
   <span className="w-14 text-right"><span className="block text-[10px] font-bold uppercase tracking-wider text-muted">Grade</span><span className={cx('block text-lg font-black tabular-nums',tone(c.eq))}>{fg(c.eq)}</span></span></>;
  return <Acc key={s.id} sa={i} open={isO(k)} onToggle={()=>tog(k)} head={head}>
   <div className="flex items-center gap-3"><div className="min-w-0 flex-1"><Txt v={s.code} on={v=>setF(s.id,'code',v.toUpperCase())} cls="w-full text-lg font-extrabold"/><Txt v={s.name} on={v=>setF(s.id,'name',v)} cls="-mt-1 w-full text-muted"/></div><label className="text-center text-xs font-semibold text-muted">Units<Num v={s.units} on={v=>setF(s.id,'units',v)} w="w-16"/></label></div>
   <Seg v={v} on={x=>setTv({...tv,[s.id]:x})} opts={[['p','Prelims'],['f','Finals']]} cls="w-full"/>
   {v==='p'?Block({s,L:PRE,tag:'Prelims',pct:40,res:c.P}):<>
    <div className="flex items-center justify-between rounded-2xl border border-line/60 bg-surface2/60 px-4 py-3"><span className="text-sm font-semibold">Prelims grade <span className="text-xs text-muted">40%</span></span><span className="font-extrabold tabular-nums">{c.P.n?f2(c.P.g):'—'}{c.P.n>0&&c.P.n<4&&<span className="text-xs font-semibold text-muted"> (incomplete)</span>}</span></div>
    {Block({s,L:FIN,tag:'Finals',pct:60,res:c.F,raw:cv?gr({...s,cv:null},FIN).g:null})}{Curve(s)}</>}
   <AccentBox l="Semestral grade" v={c.sem==null?'—':f2(c.sem)} rl="Grade" r={fg(c.eq)} foot={c.sem==null?'Fill all 8 scores':pass?'Passing ✓':'Below '+C.pass}/>
   <div className="flex gap-2"><button className={BTN+' flex-1'} onClick={()=>clearScores([s.id])}>Clear scores</button><button className={BTNX+' flex-1'} onClick={()=>delSub(s.id)}>Delete</button></div>
  </Acc>};
 const ListTools=(p,ids)=><div className="flex items-center gap-2 text-sm"><button className={BTN} onClick={()=>allO(p,ids,true)}>Expand all</button><button className={BTN} onClick={()=>allO(p,ids,false)}>Collapse all</button></div>;
 const TrackerView=()=><>
  {Summary(G,'Current GWA',gradedN?`${gradedN} of ${subs.length} subjects complete`:'No complete subject yet')}
  <div className="flex flex-wrap items-center justify-between gap-3"><div className="flex items-center gap-3"><span className="text-sm font-semibold text-muted">Show on all cards</span><Seg v={tvAll} on={x=>{setTvAll(x);setTv({})}} opts={[['p','Prelims'],['f','Finals']]}/></div>{ListTools('t:',subs.map(s=>s.id))}</div>
  <div className="stagger flex flex-col gap-3">{subs.map((s,i)=>TCard(s,i))}</div>
  <button onClick={()=>setAdding(true)} className="rounded-3xl border-2 border-dashed border-accent/60 p-5 text-lg font-bold text-accent-text transition hover:bg-accent/10">＋ Add subject</button></>;

 /* ---- forecaster ---- */
 const setMissing=mode=>upd(x=>({...x,subs:x.subs.map(s=>{const L=mode==='p'?PRE:FIN,r=per(s,L,mode==='p'?Tp:TF(s)),wi={...(s.wi||{})};r.miss.forEach(([k])=>{wi[k]=String(r.uni<=0?0:Math.min(100,Math.ceil(r.uni)))});return{...s,wi}})}));
 const setMax=mode=>upd(x=>({...x,subs:x.subs.map(s=>{const wi={...(s.wi||{})};(mode==='p'?PRE:FIN).forEach(([k])=>{if(pc(s.sc[k])==null)wi[k]='100'});return{...s,wi}})}));
 const PCard=({s,i,L,tag,T,pre,foot,k})=>{const r=per(s,L,T),[us,ub]=r.Wm?need(r.uni):['',false],met=r.proj>=T-1e-9,key=k+s.id;
  let hint;if(!r.miss.length)hint='All scores are in';else if(r.miss.length===1)hint='Need '+need(r.alone[0][1])[0]+' on '+r.miss[0][1];else hint='Need '+need(r.uni)[0]+' on each of '+r.miss.length+' scores';
  const head=<><span className="h-10 w-1.5 shrink-0 rounded-full bg-sa"/><span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-sa/15 text-2xl">{s.e||'📘'}</span>
   <span className="min-w-0 flex-1"><span className="block truncate font-extrabold">{s.code}</span><span className="block truncate text-xs text-muted">{hint}</span></span>
   <span className="text-right"><span className="block text-[10px] font-bold uppercase tracking-wider text-muted">Projected</span><span className={cx('block text-lg font-black tabular-nums',met?'text-good':'text-ink')}>{f2(r.proj)}</span></span></>;
  return <Acc key={key} sa={i} open={isO(key)} onToggle={()=>tog(key)} head={head}>
   <div className="text-xs font-semibold text-muted">{tag} target: {f2(Math.max(0,T))}</div>
   {pre}
   {r.Wm>0&&r.miss.length>1&&<Tile l={`Same % on all ${r.miss.length} missing`} v={us} bad={ub}/>}
   <div className="flex flex-col gap-3">{L.map(([kk,l,w])=>{const p=pc(s.sc[kk]);if(p!=null)return <div key={kk} className="flex items-center justify-between rounded-2xl bg-surface2/50 px-4 py-3 text-sm"><span className="font-semibold">{l} <span className="font-normal text-muted">{w}%</span></span><span className="font-bold">✓ {f2(p)}%</span></div>;
    const v=r.alone.find(x=>x[0]===kk)[1],[t,bad]=need(v),m=mxs(s,kk);
    return <div key={kk} className="flex flex-col gap-2 rounded-2xl border border-line/60 bg-surface2/60 p-4">
     <div className="flex items-center justify-between"><span className="font-bold">{l} <span className="text-xs font-semibold text-muted">{w}%</span></span><span className="rounded-full bg-accent/25 px-2 py-0.5 text-xs font-bold">Not yet</span></div>
     <div><span className="text-xs text-muted">Score needed{r.miss.length>1?' (others at their sliders)':''}:</span><div className={cx('text-xl font-extrabold',bad?'text-bad':'text-ink')}>{t}{v>0&&v<=100&&<span className="text-sm font-semibold text-muted"> ≈ {f2(v/100*m)}/{m}</span>}</div></div>
     <div className="flex items-center gap-3"><span className="w-16 text-xs font-semibold">If I score</span><input type="range" min="0" max="100" step="1" value={Math.min(100,+wv(s,kk)||0)} onChange={e=>setWi(s.id,kk,e.target.value)} className="min-w-0 flex-1"/><Num v={wv(s,kk)} on={v=>setWi(s.id,kk,v)} w="w-16"/></div></div>})}</div>
   <AccentBox l={`Projected ${tag.toLowerCase()} grade`} v={f2(r.proj)} rl={r.Wm?'vs target':'All scores in'} r={f2(Math.max(0,T))} foot={met?'Meets target ✓':'Short by '+f2(T-r.proj)}/>
   {foot}</Acc>};
 const Fin=(s,i)=>{const pr=per(s,PRE,0),Pg=pr.proj,actual=pr.Wm===0,Tf=TF(s),r=per(s,FIN,Tf),sem=.4*Pg+.6*r.proj;
  const pre=<div className="rounded-2xl border border-line/60 bg-surface2/60 p-3 text-sm"><div>Prelims grade used: <b>{f2(Pg)}</b> <span className="text-muted">({actual?'actual from tracker':'projected, some prelim scores missing'})</span></div><div>Finals grade needed for a semestral of {f2(Ts)}: <b className={Tf>100?'text-bad':''}>{Tf<=0?'Secured ✓':Tf>100?'Out of reach ('+f2(Tf)+')':f2(Tf)}</b></div>{(cvb(s)||cvx(s))>0&&<div className="mt-1 text-xs text-muted">Curve on (base {cvb(s)}, +{cvx(s)} pts). Needed scores are raw, before the curve.</div>}</div>;
  const foot=<AccentBox l="Projected semestral" v={f2(sem)} rl="Grade" r={fg(eqv(sem))} foot={sem>=C.pass?'Passing ✓':'Below '+C.pass}/>;
  return PCard({s,i,L:FIN,tag:'Finals',T:Tf,pre,foot,k:'f:'})};
 const GwaView=()=><div className="flex flex-col gap-4">
  <Acc open={isO('s:table')} onToggle={()=>tog('s:table')} head={<span className="min-w-0 flex-1"><span className="block font-extrabold">Projected grades</span><span className="block text-xs text-muted">{all.length} subjects · GWA {fg(PG)}</span></span>}>
   <div className="grid grid-cols-[1.5fr_repeat(4,1fr)] gap-2 text-xs font-bold text-muted"><span>Subject</span><span className="text-right">Prelims</span><span className="text-right">Finals</span><span className="text-right">Sem.</span><span className="text-right">Grade</span></div>
   {all.map((r,i)=><div key={i} className="grid grid-cols-[1.5fr_repeat(4,1fr)] items-center gap-2 border-t border-line/60 pt-3 text-sm"><div className="min-w-0"><div className="truncate font-extrabold">{r.e} {r.n}</div><div className="text-xs text-muted">{r.u} units{r.sem<C.pass&&<span className="font-semibold text-bad"> · {r.maj?'debarment risk':'failing'}</span>}</div></div><span className="text-right tabular-nums">{f2(r.P)}</span><span className="text-right tabular-nums">{f2(r.Fp)}</span><span className={cx('text-right font-bold tabular-nums',r.sem<C.pass&&'text-bad')}>{f2(r.sem)}</span><span className={cx('text-right font-extrabold tabular-nums',tone(r.eq))}>{fg(r.eq)}</span></div>)}
   <div className="flex justify-between border-t-2 border-line pt-3 font-extrabold"><span>Projected GWA</span><span className={cx('tot tabular-nums',tone(PG))}>{fg(PG)}</span></div>
   <p className="text-xs text-muted">Highest grade is {fg(C.hi)}. Majors must stay at {C.pass} or above or you risk debarment.</p>
   <div className="flex flex-wrap gap-1.5 text-xs">{C.table?<>{C.table.map(([t,v])=><span key={t} className="rounded-full bg-surface2 px-2.5 py-1 font-semibold">{t}+ → {fg(v)}</span>)}<span className="rounded-full bg-bad/15 px-2.5 py-1 font-semibold text-bad">below {C.table[C.table.length-1][0]} → {fg(C.fail)}</span></>:<span className="rounded-full bg-surface2 px-2.5 py-1 font-semibold">Grade equals the percentage</span>}</div></Acc>
  <Acc open={isO('s:gens')} onToggle={()=>tog('s:gens')} head={<span className="min-w-0 flex-1"><span className="block font-extrabold">📗 Gen Eds</span><span className="block text-xs text-muted">{gens.length?gens.length+' added':'Add name, units and prelim grade'}</span></span>}>
   {gadd?<div className="grid items-end gap-3 sm:grid-cols-[2fr_1fr_1fr_auto]"><label className="text-sm font-semibold">Name<TextIn v={gf.name} on={v=>setGf({...gf,name:v})} ph="e.g. Ethics" cls="mt-1"/></label><label className="text-sm font-semibold">Units<Num v={gf.units} on={v=>setGf({...gf,units:v})} w="w-full"/></label><label className="text-sm font-semibold">Prelim grade<Num v={gf.pre} on={v=>setGf({...gf,pre:v})} w="w-full"/></label><div className="flex gap-2"><button className={BTNP} onClick={addGen}>Add</button><button className={BTN} onClick={()=>setGadd(false)}>Cancel</button></div></div>
    :<button className={BTNP+' self-start'} onClick={()=>setGadd(true)}>＋ Add gen ed</button>}
   {gens.map((g,i)=>{const k='g:'+g.id;return <Acc key={g.id} open={isO(k)} onToggle={()=>tog(k)} cls="!shadow-none bg-surface2/50" head={<><span className="min-w-0 flex-1"><span className="block truncate font-bold">{g.name||'Gen Ed'}</span><span className="block text-xs text-muted">{g.units} units · prelim {g.pre||'—'}</span></span><span className="text-right"><span className="block text-[10px] font-bold uppercase tracking-wider text-muted">Projected</span><span className={cx('font-black tabular-nums',tone(gps[i].eq))}>{fg(gps[i].eq)}</span></span></>}>
     <div className="flex flex-wrap items-center gap-3"><Txt v={g.name} on={v=>setGen(g.id,'name',v)} cls="min-w-[8rem] flex-1 text-lg font-bold"/><label className="text-center text-xs font-semibold text-muted">Units<Num v={g.units} on={v=>setGen(g.id,'units',v)} w="w-16"/></label><label className="text-center text-xs font-semibold text-muted">Prelim grade<Num v={g.pre} on={v=>setGen(g.id,'pre',v)} w="w-20"/></label></div>
     <div className="flex items-center gap-3"><span className="w-28 text-xs font-semibold">Expected finals</span><input type="range" min="0" max="100" step="1" value={Math.min(100,+g.fin||0)} onChange={e=>setGen(g.id,'fin',e.target.value)} className="min-w-0 flex-1"/><Num v={g.fin} on={v=>setGen(g.id,'fin',v)} w="w-16"/></div>
     <div className="flex justify-between text-sm"><span>Projected semestral <b>{f2(gps[i].sem)}</b></span><span>Grade <b className={tone(gps[i].eq)}>{fg(gps[i].eq)}</b></span></div>
     <button className={BTNX+' self-start'} onClick={()=>delGen(g.id)}>Delete</button></Acc>})}</Acc>
  <Acc open={isO('s:plan')} onToggle={()=>tog('s:plan')} head={<span className="min-w-0 flex-1"><span className="block font-extrabold">🎓 Dean’s List planner</span><span className="block text-xs text-muted">Finals grade needed per subject for {fg(C.target)}</span></span>}>
   <div className="grid gap-3 sm:grid-cols-3">
    <Tile l="Best possible GWA (100 in every finals)" v={fg(best)} sub={best==null?null:C.meets(best)?'Dean’s List is still possible':'Dean’s List is out of reach'}/>
    <Tile l="Same finals grade in every subject" v={fstar==null?'Not possible':f2(fstar)} sub={`Lowest equal grade that still reaches ${fg(C.target)}`}/>
    <Tile l="Passing mark" v={String(C.pass)} sub="Majors below this risk debarment"/></div>
   <div className="grid grid-cols-[1.4fr_repeat(3,1fr)] gap-2 text-xs font-bold text-muted"><span>Subject</span><span className="text-right">Prelims</span><span className="text-right">Finals to pass ({C.pass})</span><span className="text-right">Finals for {fg(C.target)} ({f2(C.need)})</span></div>
   {all.map((r,i)=>{const a=fneed(C.pass,r.P),b=fneed(C.need,r.P);return <div key={i} className="grid grid-cols-[1.4fr_repeat(3,1fr)] items-center gap-2 border-t border-line/60 pt-3 text-sm"><span className="truncate font-extrabold">{r.e} {r.n}</span><span className="text-right tabular-nums">{f2(r.P)}</span><span className={cx('text-right font-bold',a>100&&'text-bad')}>{ng(a)}</span><span className={cx('text-right font-extrabold',b>100?'text-bad':'text-good')}>{ng(b)}</span></div>})}
   <p className="text-xs text-muted">The last column assumes each subject lands exactly on {f2(C.need)}. A strong subject can offset a weaker one, so watch the projected GWA at the top as you move the sliders.</p></Acc></div>;
 const ForecastView=()=><>
  {Summary(PG,'Projected GWA',`${all.length} subjects · ${uAll} units`)}
  <div className="flex flex-wrap items-center gap-3">
   <Seg v={sub} on={setSub} opts={[['p','Prelims'],['f','Finals'],['g','GWA']]} cls="w-full sm:w-auto"/>
   {sub==='p'&&<label className="flex items-center gap-2 text-sm font-semibold">Prelims target<Num v={tg.p} on={v=>setTg('p',v)} ph={String(C.pass)} w="w-20"/></label>}
   {sub==='f'&&<label className="flex items-center gap-2 text-sm font-semibold">Semestral target<Num v={tg.s} on={v=>setTg('s',v)} ph={String(C.pass)} w="w-20"/></label>}
   {sub!=='g'&&<><button className={BTN} onClick={()=>setMissing(sub)}>🎯 Set missing to needed</button><button className={BTN} onClick={()=>setMax(sub)}>💯 Set missing to 100%</button></>}</div>
  {sub!=='g'&&subs.length>0&&ListTools(sub+':',subs.map(s=>s.id))}
  <div key={sub} className="stagger anim-rise flex flex-col gap-3">
   {sub==='g'?GwaView():!subs.length?<p className={CARD+' p-6'}>Add subjects in the Grade Tracker tab first.</p>:sub==='p'?subs.map((s,i)=>PCard({s,i,L:PRE,tag:'Prelims',T:Tp,k:'p:'})):subs.map((s,i)=>Fin(s,i))}</div></>;

 /* ---- settings sheet ---- */
 const Settings=()=>{
  const raw=(st.cfg&&st.cfg.table&&st.cfg.table.length)?st.cfg.table:(C.id==='pct'?[]:PRESETS[C.id].table);
  const str=()=>raw.map(r=>[String(r[0]),String(r[1])]);
  const setRow=(i,j,v)=>{const t=str();t[i][j]=v;setCfg({table:t},'tbl'+i+j)};
  return <>
   <section className="flex flex-col gap-3"><h3 className={LBL}>Appearance</h3><ThemePicker theme={theme} setTheme={setTheme}/></section>
   <section className="flex flex-col gap-4"><h3 className={LBL}>Grading system</h3>
    <div className="grid gap-2">{Object.entries(PRESETS).map(([id,p])=><button key={id} onClick={()=>pickScale(id)} className={cx('rounded-2xl border p-3 text-left transition',C.id===id?'border-accent bg-accent/10 ring-2 ring-accent/40':'border-line bg-surface/60 hover:bg-surface')}><div className="font-bold">{p.label}</div><div className="text-xs text-muted">{p.sub}</div></button>)}</div>
    <div className="flex flex-wrap gap-4">
     <label className="text-sm font-semibold">Dean’s List GWA target<div className="mt-1"><Num v={st.cfg&&st.cfg.target!==undefined?st.cfg.target:PRESETS[C.id].target} on={v=>setCfg({target:v},'cfgt')} w="w-28"/></div></label>
     <label className="text-sm font-semibold">Passing mark (percent)<div className="mt-1"><Num v={st.cfg&&st.cfg.pass!==undefined?st.cfg.pass:String(PRESETS[C.id].pass)} on={setPass} w="w-28"/></div></label></div>
    <p className="text-xs text-muted">{C.dir<0?`Lower is better on this scale, so a target of ${fg(C.target)} means ${fg(C.target)} or lower.`:`Higher is better on this scale, so a target of ${fg(C.target)} means ${fg(C.target)} or higher.`} You need about {f2(C.need)}% in a subject to land on the target.</p>
    {C.table&&<div className="flex flex-col gap-2"><div className="text-sm font-bold">Grade table <span className="text-xs font-semibold text-muted">(minimum percent → grade)</span></div>
     {raw.map((r,i)=><div key={i} className="flex items-center gap-2"><Num v={String(r[0])} on={v=>setRow(i,0,v)} ph="min %" w="w-24"/><span className="text-muted">→</span><Num v={String(r[1])} on={v=>setRow(i,1,v)} ph="grade" w="w-24"/><button className={BTN+' !px-3'} onClick={()=>setCfg({table:str().filter((_,k)=>k!==i)})} aria-label="Remove row">✕</button></div>)}
     <div className="flex gap-2"><button className={BTN} onClick={()=>setCfg({table:[...str(),['','']]})}>＋ Add row</button><button className={BTN} onClick={()=>setCfg({table:null})}>Reset to preset</button></div></div>}</section>
   <section className="flex flex-col gap-3"><h3 className={LBL}>Years and semesters</h3>
    <div className="grid gap-3 sm:grid-cols-2"><label className="text-sm font-semibold">Academic year<TextIn v={Y.name} on={v=>rename('y',v)} cls="mt-1"/></label><label className="text-sm font-semibold">Semester<TextIn v={S.name} on={v=>rename('s',v)} cls="mt-1"/></label></div>
    <div className="flex flex-wrap gap-2"><select value={Y.id} onChange={e=>set(c=>({...c,y:e.target.value,s:c.years.find(y=>y.id===e.target.value).sems[0].id}))} className={SEL}>{st.years.map(y=><option key={y.id} value={y.id}>{y.name}</option>)}</select><select value={S.id} onChange={e=>set(c=>({...c,s:e.target.value}))} className={SEL}>{Y.sems.map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</select><button className={BTN} onClick={addYear}>＋ Year</button><button className={BTN} onClick={addSem}>＋ Semester</button></div></section>
   <section className="flex flex-col gap-3"><h3 className={LBL}>Data</h3>
    <div className="flex flex-wrap gap-2"><button className={BTN} onClick={()=>clearScores()}>Clear all scores here</button><button className={BTNX} onClick={()=>set(()=>({...seed(),cfg:st.cfg}))}>Reset to the 5 majors</button>
     {CAN_FILE&&<><button className={BTN} onClick={exportData}>⬇ Export data</button><label className={BTN+' cursor-pointer'}>⬆ Import data<input type="file" accept="application/json,.json" onChange={importData} className="hidden"/></label></>}</div>
    <p className="text-xs text-muted">Everything saves automatically. Every change here can be undone with the Undo button. Export a backup now and then.</p></section></>};

 return <div className="mx-auto max-w-[1200px] px-4 pb-24 sm:px-8">
  {Header()}
  <main className="flex flex-col gap-6 pt-6">
   {Banners()}
   <div className="flex flex-wrap items-center gap-3"><Seg v={tab} on={setTab} opts={[['t','📝 Tracker'],['f','🔮 Forecaster']]} cls="w-full sm:w-auto"/>
    <div className="flex flex-wrap gap-2 sm:ml-auto"><select value={Y.id} onChange={e=>set(c=>({...c,y:e.target.value,s:c.years.find(y=>y.id===e.target.value).sems[0].id}))} className={SEL}>{st.years.map(y=><option key={y.id} value={y.id}>{y.name}</option>)}</select><select value={S.id} onChange={e=>set(c=>({...c,s:e.target.value}))} className={SEL}>{Y.sems.map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</select></div></div>
   <div key={tab} className="anim-rise flex flex-col gap-6">{tab==='t'?TrackerView():ForecastView()}</div></main>
  <Sheet open={sx} onClose={()=>setSx(false)} title="Settings" wide>{Settings()}</Sheet>
  <Sheet open={adding} onClose={()=>setAdding(false)} title="Add subject">
   <label className="text-sm font-semibold">Code<TextIn v={nf.code} on={v=>setNf({...nf,code:v})} ph="e.g. AUDITING" cls="mt-1"/></label>
   <label className="text-sm font-semibold">Name (optional)<TextIn v={nf.name} on={v=>setNf({...nf,name:v})} cls="mt-1"/></label>
   <label className="text-sm font-semibold">Credit units<div className="mt-1"><Num v={nf.units} on={v=>setNf({...nf,units:v})} w="w-full"/></div></label>
   <button className={BTNP} onClick={addSub}>Add subject</button></Sheet>
 </div>;
}

/* =====================================================================
   7. START SCREEN  (profile cards, photos, groups, cloud sign-in)
   ===================================================================== */
function Start({book,theme,setTheme,onOpen,onGuest,onCreate,onRename,onDelete,onImport,onEnable,onDisable,onSignIn,onAddGroup,onDelGroup}){
 const [gsel,setGsel]=useState('All'),[sort,setSort]=useState('recent'),[sh,setSh]=useState(null),[ag,setAg]=useState(false),[gname,setGname]=useState(''),[np,setNp]=useState({name:'',emoji:'🎓',pic:'',group:'General',pre:false}),[cf,setCf]=useState({name:'',pass:''}),[cm,setCm]=useState(''),[cb,setCb]=useState(false),[arm,setArm]=useState(null),[msg,setMsg]=useState('');
 const grp=a=>a.group||'General';
 const list=book.list.filter(a=>gsel==='All'||grp(a)===gsel).slice().sort((a,b)=>sort==='az'?(a.name||'').localeCompare(b.name||''):((b.last||0)-(a.last||0))||(a.name||'').localeCompare(b.name||''));
 const photo=(e,cb)=>{const fl=e.target.files&&e.target.files[0];e.target.value='';if(!fl)return;resizeImg(fl).then(cb).catch(()=>setMsg('Could not read that image.'))};
 const pickBackup=e=>{const fl=e.target.files&&e.target.files[0];e.target.value='';if(!fl)return;const r=new FileReader();r.onload=()=>{try{const j=JSON.parse(r.result),d=j&&j.data?j.data:j;if(!okState(d))throw new Error('bad');onImport(j.account||'Imported profile',d);setMsg('Backup added as a new profile ✓')}catch(x){setMsg('That file is not a valid backup.')}};r.onerror=()=>setMsg('Could not read that file.');r.readAsText(fl)};
 const go=async fn=>{setCb(true);setCm('');try{const r=await fn();if(r==='ok'||String(r).startsWith('ok:')){setCf({name:'',pass:''});setSh(null);if(String(r).startsWith('ok:'))onOpen(String(r).slice(3))}else setCm(r)}catch(e){setCm('Something went wrong. Try again.')}setCb(false)};
 const PhotoRow=(a,onPic,onClear)=><div className="flex items-center gap-4"><Avatar a={a} s="h-20 w-20" t="text-5xl"/><div className="flex flex-col gap-2"><label className={BTN+' cursor-pointer'}>📷 {a.pic?'Change photo':'Upload photo'}<input type="file" accept="image/*" className="hidden" onChange={e=>photo(e,onPic)}/></label>{a.pic&&<button className={BTN} onClick={onClear}>Remove photo</button>}</div></div>;
 const Emojis=(v,on)=><div className="flex flex-wrap gap-2">{EMO.map(e=><button key={e} onClick={()=>on(e)} className={cx('h-11 w-11 rounded-xl text-2xl transition',v===e?'bg-accent/30 ring-2 ring-accent':'bg-surface2 hover:bg-line/60')}>{e}</button>)}</div>;
 const GroupSel=(v,on)=><select value={v} onChange={e=>on(e.target.value)} className={SEL+' w-full !py-3'}>{book.groups.map(g=><option key={g} value={g}>{g}</option>)}</select>;
 const CloudForm=(label,fn)=><div className="flex flex-col gap-2">
  <TextIn v={cf.name} on={v=>setCf({...cf,name:v})} ph="Sync name (e.g. Roever)"/><TextIn type="password" v={cf.pass} on={v=>setCf({...cf,pass:v})} ph="Passcode (6+ characters)"/>
  {cm&&<p className="text-xs font-semibold text-bad">{cm}</p>}
  <button disabled={cb} className={BTNP} onClick={()=>go(fn)}>{cb?'Working…':label}</button></div>;
 const ea=sh&&sh.t==='edit'?book.list.find(x=>x.id===sh.id):null;

 return <div className="mx-auto max-w-5xl px-4 pb-20 pt-6 sm:px-8 sm:pt-10">
  <div className="flex items-center justify-between"><div className="flex items-center gap-2.5 text-sm font-extrabold"><span className="grid h-9 w-9 place-items-center rounded-xl bg-accent text-lg text-accent-ink shadow-md shadow-accent/30">📒</span><span className="hidden sm:inline">Grades Tracker &amp; Forecaster</span></div><button className={BTN} onClick={()=>setSh({t:'theme'})}>🎨 Theme</button></div>
  <div className="anim-rise pb-10 pt-12 sm:pt-16"><h1 className="max-w-3xl text-4xl font-black leading-[1.08] tracking-tight sm:text-6xl">Hello! <span className="text-muted">Feel free to track and forecast your grades.</span></h1><p className="mt-4 text-base text-muted sm:text-lg">Pick a profile to jump back in, or start a fresh one.</p></div>
  <div className="mb-6 flex flex-wrap items-center gap-2">
   {['All',...book.groups].map(g=><button key={g} onClick={()=>setGsel(g)} className={cx('rounded-full border px-4 py-1.5 text-sm font-bold transition',gsel===g?'border-accent bg-accent text-accent-ink shadow-sm':'border-line bg-surface/70 hover:bg-surface2')}>{g}<span className="ml-1.5 text-xs opacity-60">{g==='All'?book.list.length:book.list.filter(a=>grp(a)===g).length}</span></button>)}
   {ag?<span className="flex items-center gap-2"><input autoFocus value={gname} onChange={e=>setGname(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'){onAddGroup(gname);setGname('');setAg(false)}}} placeholder="Group name" className={cx(INP,'h-10 w-36 !text-left px-3')}/><button className={BTNP} onClick={()=>{onAddGroup(gname);setGname('');setAg(false)}}>Add</button><button className={BTN} onClick={()=>{setAg(false);setGname('')}}>Cancel</button></span>:<button className={BTN} onClick={()=>setAg(true)}>＋ Group</button>}
   {gsel!=='All'&&gsel!=='General'&&<button className={BTNX} onClick={()=>{onDelGroup(gsel);setGsel('All')}}>Delete “{gsel}”</button>}
   <select value={sort} onChange={e=>setSort(e.target.value)} className={SEL+' sm:ml-auto'}><option value="recent">Sort: Recent</option><option value="az">Sort: A to Z</option></select></div>
  <div className="stagger grid items-stretch gap-4 sm:grid-cols-2 lg:grid-cols-3">
   {list.map(a=><div key={a.id} role="button" tabIndex={0} onClick={()=>onOpen(a.id)} onKeyDown={e=>e.key==='Enter'&&onOpen(a.id)} className={cx(CARD,'lift anim-rise relative flex cursor-pointer flex-col gap-4 p-5 hover:border-accent/60 hover:shadow-xl hover:shadow-accent/10')}>
    <div className="flex items-start justify-between"><Avatar a={a} s="h-16 w-16" t="text-4xl"/><button onClick={e=>{e.stopPropagation();setSh({t:'edit',id:a.id});setArm(null);setCm('')}} className="rounded-xl p-2 text-muted opacity-70 transition hover:bg-surface2 hover:opacity-100" aria-label="Edit profile">✏️</button></div>
    <div className="min-w-0"><div className="truncate text-xl font-extrabold">{a.name||'Untitled'}</div><div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs"><span className="rounded-full bg-accent/20 px-2.5 py-1 font-bold">{grp(a)}</span><span className="text-muted">{a.cloud?(a.sy&&a.sy.dirty?'☁ Waiting to sync':'☁ Synced '+rel(a.sy&&a.sy.at)):'On this device'}</span></div></div></div>)}
   <button onClick={()=>{setNp({name:'',emoji:'🎓',pic:'',group:gsel!=='All'?gsel:'General',pre:false});setSh({t:'new'})}} className="lift anim-rise flex min-h-[10rem] flex-col items-center justify-center gap-1 rounded-3xl border-2 border-dashed border-accent/60 p-5 text-lg font-bold text-accent-text transition hover:bg-accent/10"><span className="text-3xl">＋</span>New profile<span className="text-xs font-medium text-muted">Starts with blank grades</span></button>
   {CLOUD&&<button onClick={()=>{setCf({name:'',pass:''});setCm('');setSh({t:'cloud'})}} className="lift anim-rise flex min-h-[10rem] flex-col items-center justify-center gap-1 rounded-3xl border-2 border-dashed border-line p-5 text-lg font-bold transition hover:border-accent/60 hover:bg-accent/10"><span className="text-3xl">☁</span>Add cloud profile<span className="text-xs font-medium text-muted">Sign in with your sync name</span></button>}
   <button onClick={onGuest} className={cx(CARD,'lift anim-rise flex min-h-[10rem] flex-col items-center justify-center gap-1 p-5 text-lg font-bold hover:border-accent/60')}><span className="text-3xl">👤</span>Guest<span className="text-xs font-medium text-muted">Try it out. Nothing is saved.</span></button></div>
  {!list.length&&<p className="mt-4 text-center text-sm text-muted">No profiles in this group yet.</p>}
  <div className="mt-10 flex flex-col items-center gap-3 text-center">
   {CAN_FILE&&<label className={BTN+' cursor-pointer'}>⬆ Import a backup as a new profile<input type="file" accept="application/json,.json" onChange={pickBackup} className="hidden"/></label>}
   {msg&&<p className="text-sm font-semibold">{msg}</p>}
   <p className="max-w-md text-xs text-muted">{CLOUD?'Cloud profiles you sign in to stay on this home screen. For privacy, the cloud never lists other people’s profiles, so each new device signs in once with the sync name and passcode.':'Cloud sync is off. Add your database URL in config.js to sync between devices.'}</p></div>

  <Sheet open={!!ea} onClose={()=>{setSh(null);setArm(null)}} title="Edit profile">{ea&&<>
   {PhotoRow(ea,pic=>onRename(ea.id,{pic}),()=>onRename(ea.id,{pic:''}))}
   {!ea.pic&&Emojis(ea.emoji,e=>onRename(ea.id,{emoji:e}))}
   <label className="text-sm font-semibold">Name<TextIn v={ea.name} on={v=>onRename(ea.id,{name:v})} ph="Profile name" cls="mt-1"/></label>
   <label className="text-sm font-semibold">Group{GroupSel(grp(ea),v=>onRename(ea.id,{group:v}))}</label>
   {CLOUD&&<div className="flex flex-col gap-2 rounded-2xl border border-line bg-surface2/60 p-4"><div className="text-sm font-bold">☁ Cloud sync</div>
    {ea.cloud?<><p className="text-sm text-muted">Syncing as <b className="text-ink">{ea.cloud.sn}</b></p><button className={BTN} onClick={()=>onDisable(ea.id)}>Turn off sync (keeps this copy)</button></>
     :<>{CloudForm('Turn on sync',()=>onEnable(ea.id,cf.name||ea.name,cf.pass))}<p className="text-xs text-muted">Leave the sync name empty to use the profile name.</p></>}</div>}
   <div className="flex flex-col gap-2"><button className={BTNX} onClick={()=>{if(arm===ea.id){onDelete(ea.id);setSh(null);setArm(null)}else{setArm(ea.id);setTimeout(()=>setArm(x=>x===ea.id?null:x),4000)}}}>{arm===ea.id?'Tap again to delete':'Delete profile'}</button>
    {arm===ea.id&&<p className="text-xs text-bad">This removes the profile from this device.{ea.cloud?' The cloud copy stays, so you can sign in again later.':' It cannot be undone.'}</p>}</div></>}</Sheet>
  <Sheet open={!!sh&&sh.t==='new'} onClose={()=>setSh(null)} title="New profile">
   {PhotoRow(np,pic=>setNp({...np,pic}),()=>setNp({...np,pic:''}))}
   {!np.pic&&Emojis(np.emoji,e=>setNp({...np,emoji:e}))}
   <label className="text-sm font-semibold">Name<TextIn v={np.name} on={v=>setNp({...np,name:v})} ph="e.g. Roever" cls="mt-1"/></label>
   <label className="text-sm font-semibold">Group{GroupSel(np.group,v=>setNp({...np,group:v}))}</label>
   <label className="flex items-start gap-2 text-sm"><input type="checkbox" checked={np.pre} onChange={e=>setNp({...np,pre:e.target.checked})} className="mt-1 h-4 w-4 accent-[rgb(var(--accent))]"/><span>Pre-load STRATCOST, FINMAN, INTACC, OBLICON and ITAPP (scores stay blank)</span></label>
   <button className={BTNP} onClick={()=>{onCreate(np);setSh(null)}}>Create profile</button></Sheet>
  <Sheet open={!!sh&&sh.t==='cloud'} onClose={()=>setSh(null)} title="Add cloud profile"><p className="text-sm text-muted">Enter the sync name and passcode you chose when you turned on cloud sync. Your grades are pulled onto this device and stay in sync.</p>{CloudForm('Sign in',()=>onSignIn(cf.name,cf.pass))}</Sheet>
  <Sheet open={!!sh&&sh.t==='theme'} onClose={()=>setSh(null)} title="Theme"><ThemePicker theme={theme} setTheme={setTheme}/></Sheet>
 </div>;
}

/* =====================================================================
   8. ROOT  (profiles, theme, cloud sync engine)
   ===================================================================== */
function Root(){
 const bk=useRef(null);if(!bk.current)bk.current=loadBook();
 const [cur,setCur]=useState(null),[ver,setVer]=useState(0),[,tick]=useState(0),[stat,setStat]=useState('synced'),[ext,setExt]=useState({n:0,data:null}),[theme,setTheme0]=useState(()=>{try{return localStorage.getItem('gtf-theme')||'sun'}catch(e){return'sun'}}),gd=useRef(null),curR=useRef(null),tm=useRef({}),busy=useRef({});
 curR.current=cur;
 const setTheme=t=>{setTheme0(t);try{localStorage.setItem('gtf-theme',t)}catch(e){}};
 useEffect(()=>{document.documentElement.dataset.theme=theme;const m=document.querySelector('meta[name=theme-color]'),t=THEMES.find(x=>x.id===theme);if(m&&t)m.setAttribute('content',t.bar)},[theme]);
 const save=()=>{saveBook(bk.current);tick(x=>x+1)};
 const acc=id=>bk.current.list.find(a=>a.id===id);
 const fail=e=>setStat(navigator.onLine&&/^(get|put) [45]/.test(String(e&&e.message))?'error':'offline');
 const stamp=id=>{const a=acc(id);if(a){a.sy={...(a.sy||{}),at:Date.now()};saveBook(bk.current)}};
 const docOf=(a,id,t)=>({t,d:JSON.stringify(bk.current.data[id]),n:a.name,e:a.emoji,p:a.pic||null,g:a.group||'General'});
 const apply=(id,r)=>{const a=acc(id);if(!a)return;let d;try{d=JSON.parse(r.d)}catch(e){return}if(!okState(d))return;
  bk.current.data[id]=d;a.name=r.n||a.name;a.emoji=r.e||a.emoji;if(r.p)a.pic=r.p;else delete a.pic;a.group=r.g||a.group||'General';if(!bk.current.groups.includes(a.group))bk.current.groups=[...bk.current.groups,a.group];
  a.sy={t:r.t,base:r.t,dirty:false,at:Date.now()};saveBook(bk.current);if(curR.current&&curR.current.id===id)setExt(x=>({n:x.n+1,data:d}));tick(x=>x+1)};
 const push=async id=>{const a=acc(id);if(!a||!a.cloud||busy.current['p'+id])return;busy.current['p'+id]=1;const t=(a.sy&&a.sy.t)||Date.now();let again=false;setStat('syncing');
  try{await cput(a.cloud.k,docOf(a,id,t));const b=acc(id);if(b){b.sy={...b.sy,t:b.sy&&b.sy.t||t,base:t,dirty:!!(b.sy&&b.sy.t!==t),at:Date.now()};again=b.sy.dirty;saveBook(bk.current)}setStat('synced');tick(x=>x+1)}catch(e){fail(e)}
  busy.current['p'+id]=0;if(again)push(id)};
 const sync=async id=>{const a=acc(id);if(!a||!a.cloud||busy.current['s'+id])return;if(!navigator.onLine){setStat('offline');return}busy.current['s'+id]=1;
  try{const r=await cget(a.cloud.k),sy=a.sy||{t:0,base:0,dirty:false};
   if(!validDoc(r)){a.sy={...sy,t:sy.t||Date.now(),dirty:true};await push(id)}
   else if(r.t===sy.t){a.sy={...sy,base:r.t,dirty:false,at:Date.now()};saveBook(bk.current);setStat('synced')}
   else if(r.t>(sy.base||0)){
    if(sy.dirty){if(r.t>sy.t){a.loser={t:sy.t,d:JSON.stringify(bk.current.data[id])};apply(id,r)}else{a.loser={t:r.t,d:r.d};saveBook(bk.current);await push(id)}}
    else apply(id,r);
    setStat('synced')}
   else if(sy.dirty)await push(id);
   else{stamp(id);setStat('synced')}
   tick(x=>x+1)}catch(e){fail(e)}
  busy.current['s'+id]=0};
 const later=id=>{clearTimeout(tm.current[id]);tm.current[id]=setTimeout(()=>navigator.onLine?push(id):setStat('offline'),700)};
 useEffect(()=>{ADAPT.init()},[]);
 useEffect(()=>{if(!CLOUD)return;const all=()=>bk.current.list.forEach(a=>a.cloud&&sync(a.id));all();window.addEventListener('online',all);return()=>window.removeEventListener('online',all)},[]);
 const ca=cur&&!cur.guest?acc(cur.id):null,ck=ca&&ca.cloud?ca.cloud.k:null,cid=cur&&cur.id;
 useEffect(()=>{if(!CLOUD||!ck)return;const id=cid;let es=null,dt=null;
  const kick=()=>{clearTimeout(dt);dt=setTimeout(()=>sync(id),250)};
  try{es=new EventSource(curl(ck));es.addEventListener('put',kick);es.addEventListener('patch',kick);es.onerror=()=>{if(!navigator.onLine)setStat('offline')}}catch(e){}
  const vis=()=>{if(!document.hidden)sync(id)},off=()=>setStat('offline'),on=()=>sync(id),poll=setInterval(vis,30000);
  window.addEventListener('online',on);window.addEventListener('offline',off);document.addEventListener('visibilitychange',vis);sync(id);
  return()=>{es&&es.close();clearInterval(poll);clearTimeout(dt);window.removeEventListener('online',on);window.removeEventListener('offline',off);document.removeEventListener('visibilitychange',vis)}},[cid,ck]);

 const open=id=>{const a=acc(id);if(a){a.last=Date.now();saveBook(bk.current)}setStat(navigator.onLine?'synced':'offline');setCur({id})};
 const addAcc=(name,emoji,d,extra)=>{const id=uid();bk.current.list=[...bk.current.list,{id,name:(name||'').trim()||'New profile',emoji,group:'General',...(extra||{})}];bk.current.data[id]=d;return id};
 const create=n=>{const ex={group:n.group||'General'};if(n.pic)ex.pic=n.pic;const id=addAcc(n.name,n.emoji,blank(n.pre),ex);save();open(id)};
 const guest=()=>{gd.current=blank(false);setCur({guest:true})};
 const keep=name=>{const id=addAcc(name,'🎓',gd.current);save();open(id)};
 const rename=(id,p)=>{bk.current.list=bk.current.list.map(a=>{if(a.id!==id)return a;const n={...a,...p};if(p.pic==='')delete n.pic;return n});const a=acc(id);if(a&&a.cloud){a.sy={...(a.sy||{}),t:Date.now(),dirty:true};later(id)}save()};
 const addGroup=n=>{n=(n||'').trim();if(!n||bk.current.groups.some(g=>g.toLowerCase()===n.toLowerCase()))return;bk.current.groups=[...bk.current.groups,n];save()};
 const delGroup=n=>{if(n==='General')return;bk.current.groups=bk.current.groups.filter(g=>g!==n);bk.current.list.forEach(a=>{if((a.group||'General')===n){a.group='General';if(a.cloud){a.sy={...(a.sy||{}),t:Date.now(),dirty:true};later(a.id)}}});save()};
 const del=id=>{bk.current.list=bk.current.list.filter(a=>a.id!==id);delete bk.current.data[id];save()};
 const imp=(name,d)=>{addAcc(name,'📥',d);save()};
 const enable=async(id,sn,pw)=>{const a=acc(id);if(!a)return'Profile not found.';if(!sn.trim()||pw.length<6)return'Enter a sync name and a passcode of at least 6 characters.';if(!navigator.onLine)return'You need an internet connection to turn on sync.';
  try{const k=await ckey(sn,pw),ex=await cget(k);if(validDoc(ex))return'A cloud profile with that name and passcode already exists. Use “Add cloud profile”, or choose a different passcode.';const t=Date.now();await cput(k,docOf(a,id,t));a.cloud={k,sn:sn.trim()};a.sy={t,base:t,dirty:false,at:Date.now()};save();return'ok'}catch(e){return'Could not reach the cloud database. Check config.js, your database rules and your internet.'}};
 const signIn=async(sn,pw)=>{if(!sn.trim()||pw.length<6)return'Enter your sync name and passcode (6+ characters).';if(!navigator.onLine)return'You need an internet connection to sign in.';
  try{const k=await ckey(sn,pw),r=await cget(k);if(!validDoc(r))return'No cloud profile found with that name and passcode. Check the spelling, or turn on sync on your main device first.';let d;try{d=JSON.parse(r.d)}catch(e){d=null}if(!okState(d))return'That cloud profile has unreadable data.';
   const ex=bk.current.list.find(a=>a.cloud&&a.cloud.k===k);if(ex)return'ok:'+ex.id;
   const g=r.g||'General';if(!bk.current.groups.includes(g))bk.current.groups=[...bk.current.groups,g];
   const extra={cloud:{k,sn:sn.trim()},sy:{t:r.t,base:r.t,dirty:false,at:Date.now()},group:g};if(r.p)extra.pic=r.p;
   const id=addAcc(r.n||sn,r.e||'☁',d,extra);save();return'ok:'+id}catch(e){return'Could not reach the cloud database. Check config.js and your internet.'}};
 const disable=id=>{const a=acc(id);if(a){delete a.cloud;delete a.sy;delete a.loser;save()}};
 const leave=()=>{const id=cur&&cur.id,a=id&&acc(id);if(a&&a.cloud){clearTimeout(tm.current[id]);if(a.sy&&a.sy.dirty&&navigator.onLine)push(id)}setCur(null)};

 let view;
 if(!cur)view=<Start key="start" book={bk.current} theme={theme} setTheme={setTheme} onOpen={open} onGuest={guest} onCreate={create} onRename={rename} onDelete={del} onImport={imp} onEnable={enable} onDisable={disable} onSignIn={signIn} onAddGroup={addGroup} onDelGroup={delGroup}/>;
 else{
  const a=cur.guest?{name:'Guest',emoji:'👤'}:acc(cur.id);
  if(!a){setTimeout(()=>setCur(null),0);return null}
  const lbl=stat==='synced'?'☁ Synced':stat==='syncing'?'☁ Syncing…':stat==='offline'?'📴 Offline · saved here':'⚠ Sync error · tap to retry';
  const cl=a.cloud?{on:true,label:lbl,sync:()=>sync(cur.id),at:a.sy&&a.sy.at,pending:!!(a.sy&&a.sy.dirty)}:{on:false,label:cur.guest?'👤 Not saved':'💾 This device only',sync:()=>{}};
  const onSave=n=>{if(cur.guest){gd.current=n;return}const x=acc(cur.id);bk.current.data[cur.id]=n;if(x&&x.cloud){x.sy={...(x.sy||{}),t:Date.now(),dirty:true};setStat(navigator.onLine?'syncing':'offline');later(cur.id)}saveBook(bk.current)};
  view=<App key={(cur.id||'guest')+'-'+ver} init={cur.guest?gd.current:bk.current.data[cur.id]} acct={a} guest={!!cur.guest} onSave={onSave} onSwitch={leave} onKeep={keep} cloud={cl} ext={ext} loser={a.loser} onLoser={()=>{delete a.loser;save()}} theme={theme} setTheme={setTheme}/>;
 }
 return <div key={cur?'app':'start'} className="anim-rise">{view}</div>;
}
ReactDOM.createRoot(document.getElementById('root')).render(<Root/>);
