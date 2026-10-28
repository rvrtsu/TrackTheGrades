import * as React from 'react';
import * as ReactDOM from 'react-dom/client';
const CAN_FILE=true;
const ADAPT={remote(){},init(){try{navigator.storage&&navigator.storage.persist&&navigator.storage.persist()}catch(e){}}};
const {useState,useRef,useEffect}=React;
const K='gtf-v1',uid=()=>Math.random().toString(36).slice(2,9);
const PRE=[['q1','Quiz 1',20],['q2','Quiz 2',20],['pe','Prelims Exam',50],['pp','Participation',10]];
const FIN=[['q3','Quiz 3',20],['q4','Quiz 4',20],['fe','Finals Exam',50],['fp','Participation',10]];
const EQ=[[97,1],[94,1.25],[91,1.5],[88,1.75],[85,2],[82,2.25],[79,2.5],[76,2.75],[75,3]];
const eqv=g=>{g=+g.toFixed(2);for(const[t,v]of EQ)if(g>=t)return v;return 5};
const eqc=e=>e==null?'':e<=1.75?'text-emerald-600 dark:text-emerald-300':e>=3?'text-red-600 dark:text-red-400':'';
const eqd=e=>e==null?'':e<=1.75?'text-emerald-200':e>=3?'text-red-200':'';
const f2=n=>Number.isFinite(n)?String(+n.toFixed(2)):'—';
const mk=(code,name,units,e)=>({id:uid(),code,name,units:String(units),e,sc:{},wi:{}});
const seed=()=>{const y=uid(),s=uid();return{y,s,tg:{p:'75',s:'75'},years:[{id:y,name:'2nd Year (AY 2026–2027)',sems:[{id:s,name:'1st Semester',subs:[
 mk('STRATCOST','Strategic Cost Management',3,'📊'),mk('FINMAN','Financial Management',3,'💰'),mk('INTACC','Intermediate Accounting',3,'🧾'),mk('OBLICON','Obligations and Contracts',3,'⚖️'),mk('ITAPP','IT Applications',3,'💻')]}]}]}};
const BK='gtf-book';
const okState=d=>d&&Array.isArray(d.years)&&d.years.length&&d.years.every(y=>y&&Array.isArray(y.sems)&&y.sems.length);
const normBook=j=>{try{if(j&&Array.isArray(j.list)&&j.data&&typeof j.data==='object')return{list:j.list,data:j.data};if(okState(j)){const id=uid();return{list:[{id,name:'My Account',emoji:'🎓'}],data:{[id]:j}}}}catch(e){}return null};
const loadBook=()=>{let b=null;try{b=normBook(JSON.parse(localStorage.getItem(BK)))}catch(e){}if(!b)try{b=normBook(JSON.parse(localStorage.getItem('gtf-v1')))}catch(e){}if(!b){const id=uid();b={list:[{id,name:'My Account',emoji:'🎓'}],data:{[id]:seed()}}}return b};
const saveBook=b=>{try{localStorage.setItem(BK,JSON.stringify(b))}catch(e){}ADAPT.remote(b)};
const blank=pre=>{if(pre)return seed();const y=uid(),s=uid();return{y,s,tg:{p:'75',s:'75'},years:[{id:y,name:'1st Year',sems:[{id:s,name:'1st Semester',subs:[]}]}]}};
const EMO=['🎓','😎','🦊','🐼','🌸','⚡','🔥','🌈'];
const pc=c=>{if(!c||c.s===''||c.s==null)return null;const m=c.m===''||c.m==null?100:+c.m;return m>0?+c.s/m*100:null};
const cvb=s=>Math.min(99,Math.max(0,+(s.cv&&s.cv.b)||0)),cvx=s=>+(s.cv&&s.cv.x)||0,isp=k=>k==='pp'||k==='fp';
const lin=(s,L,k,w)=>{const b=L===FIN&&!isp(k)?cvb(s):0;return[w*b/100,w*(100-b)/10000]};
const gr=(s,L)=>{let g=0,n=0;L.forEach(([k,,w])=>{const p=pc(s.sc[k]);if(p!=null){const[c,m]=lin(s,L,k,w);n++;g+=c+m*p}});if(L===FIN&&n)g=Math.min(100,g+cvx(s));return{g,n}};
const calc=s=>{const P=gr(s,PRE),F=gr(s,FIN),done=P.n===4&&F.n===4,sem=done?.4*P.g+.6*F.g:null;return{P,F,sem,eq:sem==null?null:eqv(sem)}};
const gwa=a=>{let u=0,t=0;a.forEach(([e,n])=>{if(e!=null&&+n>0){u+=+n;t+=e*n}});return u?t/u:null};
const wv=(s,k)=>s.wi&&s.wi[k]!==undefined?s.wi[k]:(k==='pp'||k==='fp'?'90':'85');
const mxs=(s,k)=>+(s.sc[k]&&s.sc[k].m)||100;
// period solver: entered scores are fixed, missing ones use what-if values; T = target grade; curve applies to Finals
const per=(s,L,T)=>{const bn=L===FIN?cvx(s):0;let K0=0;const miss=[];L.forEach(([k,l,w])=>{const p=pc(s.sc[k]),[c,m]=lin(s,L,k,w);if(p==null)miss.push([k,l,w,c,m]);else K0+=c+m*p});
 const wi=k=>+wv(s,k)||0,R=T-bn-K0;let pj=K0;miss.forEach(([k,,,c,m])=>pj+=c+m*wi(k));if(L===FIN)pj=Math.min(100,pj+bn);
 const Sm=miss.reduce((a,x)=>a+x[4],0),Sc=miss.reduce((a,x)=>a+x[3],0);
 const uni=miss.length?(R-Sc)/Sm:null;
 const alone=miss.map(([k,l,w,c,m])=>{const o=miss.reduce((a,x)=>x[0]===k?a:a+x[3]+x[4]*wi(x[0]),0);return[k,(R-o-c)/m]});
 return{miss,Wm:miss.reduce((a,x)=>a+x[2],0),uni,alone,proj:pj}};
const proj=s=>{const Pg=per(s,PRE,0).proj,Fp=per(s,FIN,0).proj,sem=.4*Pg+.6*Fp;return{Pg,Fp,sem,eq:eqv(sem)}};
const gproj=g=>{const Pg=+g.pre||0,Fp=+g.fin||0,sem=.4*Pg+.6*Fp;return{Pg,Fp,sem,eq:eqv(sem)}};
const fneed=(S,P)=>(S-.4*P)/.6;
const ng=v=>v<=0?'Secured ✓':v>100?'Out of reach':f2(v);
const need=v=>v<=0?['Secured ✓',false]:v>100?['Out of reach ('+f2(v)+'%)',true]:[f2(v)+'%',false];
const AC=[['bg-violet-500','text-violet-600 dark:text-violet-300','bg-violet-100 dark:bg-violet-500/20'],['bg-emerald-500','text-emerald-600 dark:text-emerald-300','bg-emerald-100 dark:bg-emerald-500/20'],['bg-amber-500','text-amber-600 dark:text-amber-300','bg-amber-100 dark:bg-amber-500/20'],['bg-rose-500','text-rose-600 dark:text-rose-300','bg-rose-100 dark:bg-rose-500/20'],['bg-sky-500','text-sky-600 dark:text-sky-300','bg-sky-100 dark:bg-sky-500/20'],['bg-fuchsia-500','text-fuchsia-600 dark:text-fuchsia-300','bg-fuchsia-100 dark:bg-fuchsia-500/20']];
const CARD='rounded-3xl bg-white/80 dark:bg-white/5 backdrop-blur ring-1 ring-black/5 dark:ring-white/10 shadow-xl shadow-violet-500/5';
const BTN='rounded-2xl bg-white/80 dark:bg-white/10 ring-1 ring-black/10 dark:ring-white/15 px-4 py-2.5 text-sm font-semibold active:scale-95 transition hover:bg-white dark:hover:bg-white/20 disabled:opacity-35 disabled:pointer-events-none';
const INP='rounded-xl bg-slate-100 dark:bg-white/10 border-0 text-center text-base font-semibold focus:outline-none focus:ring-2 focus:ring-violet-500 placeholder:font-normal placeholder:opacity-40';
const go=e=>{if(e.key==='Enter'){e.preventDefault();const a=[...document.querySelectorAll('input[data-n]')],i=a.indexOf(e.target);const n=a[i+1];n?n.focus():e.target.blur()}};
const Num=({v,on,ph,w='w-20',nav,bad})=><input inputMode="decimal" enterKeyHint="next" data-n={nav?1:undefined} onKeyDown={nav?go:undefined} value={v??''} placeholder={ph} onChange={e=>{const x=e.target.value;if(/^\d*\.?\d*$/.test(x))on(x)}} className={`${INP} h-12 ${w} min-w-0 ${bad?'ring-2 ring-red-500':''}`}/>;
const Txt=({v,on,cls=''})=><input value={v} onChange={e=>on(e.target.value)} className={'min-w-0 rounded-xl bg-transparent px-2 py-1 text-base hover:bg-slate-100 dark:hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-violet-500 '+cls}/>;
const Tile=({l,v,sub,bad,a})=><div className={'rounded-2xl p-3 '+a[2]}><div className="text-xs font-semibold opacity-70">{l}</div><div className={'text-xl font-extrabold '+(bad?'text-red-600 dark:text-red-400':a[1])}>{v}</div>{sub&&<div className="text-xs opacity-70 mt-0.5">{sub}</div>}</div>;
const Dark=({l,v,r,rl,foot})=><div className="rounded-2xl bg-gradient-to-br from-violet-600 to-fuchsia-600 text-white shadow-lg shadow-violet-500/20 p-4 flex items-center justify-between"><div><div className="text-xs opacity-70">{l}</div><div className="text-3xl font-extrabold tot inline-block">{v}</div></div><div className="text-right"><div className="text-xs opacity-70">{rl}</div><div className="text-2xl font-extrabold">{r}</div><div className="text-xs font-semibold">{foot}</div></div></div>;

const Seg=({v,on,opts,cls=''})=><div className={'inline-grid grid-flow-col auto-cols-fr gap-1 rounded-2xl bg-slate-100 dark:bg-white/10 p-1 '+cls}>{opts.map(([k,l])=><button key={k} onClick={()=>on(k)} className={'rounded-xl px-4 py-1.5 text-sm font-bold transition '+(v===k?'bg-violet-600 text-white shadow':'opacity-70')}>{l}</button>)}</div>;

function App({init,acct,guest,onSave,onSwitch,onKeep}){
 const [st,setSt]=useState(()=>init),[tab,setTab]=useState('t'),[tv,setTv]=useState({}),[tvAll,setTvAll]=useState('p'),[gf,setGf]=useState({name:'',units:'3',pre:''}),[gadd,setGadd]=useState(false),[msg,setMsg]=useState(''),[kn,setKn]=useState(''),[sub,setSub]=useState('p'),[adding,setAdding]=useState(false),[mg,setMg]=useState(false),[nf,setNf]=useState({code:'',name:'',units:'3'});
 const ref=useRef(st),past=useRef([]),fut=useRef([]),last=useRef({k:'',t:0});
 const commit=n=>{ref.current=n;setSt(n);onSave(n)};
 const set=(fn,key)=>{const cur=ref.current,nx=fn(cur),now=Date.now();if(!(key&&last.current.k===key&&now-last.current.t<1200)){past.current.push(cur);if(past.current.length>100)past.current.shift()}last.current={k:key||'',t:now};fut.current=[];commit(nx)};
 const undo=()=>{if(!past.current.length)return;fut.current.push(ref.current);last.current={k:'',t:0};commit(past.current.pop())};
 const redo=()=>{if(!fut.current.length)return;past.current.push(ref.current);last.current={k:'',t:0};commit(fut.current.pop())};
 const Y=st.years.find(y=>y.id===st.y)||st.years[0],S=Y.sems.find(x=>x.id===st.s)||Y.sems[0],tg=st.tg||{p:'75',s:'75'};
 const upd=(fn,key)=>set(c=>({...c,years:c.years.map(y=>y.id!==Y.id?y:{...y,sems:y.sems.map(x=>x.id!==S.id?x:fn(x))})}),key);
 const updSub=(id,fn,key)=>upd(x=>({...x,subs:x.subs.map(s=>s.id===id?fn(s):s)}),key&&key+id);
 const setF=(id,f,v)=>updSub(id,s=>({...s,[f]:v}),'f'+f);
 const setSc=(id,k,f,v)=>updSub(id,s=>({...s,sc:{...s.sc,[k]:{...s.sc[k],[f]:v}}}),k+f);
 const setWi=(id,k,v)=>updSub(id,s=>({...s,wi:{...(s.wi||{}),[k]:v}}),'w'+k);
 const setCv=(id,f,v)=>updSub(id,s=>({...s,cv:{...(s.cv||{}),[f]:v}}),'cv'+f);
 const setTg=(k,v)=>set(c=>({...c,tg:{...(c.tg||{p:'75',s:'75'}),[k]:v}}),'tg'+k);
 const ords=['1st','2nd','3rd','4th','5th','6th'];
 const addYear=()=>set(c=>{const y=uid(),s=uid();return{...c,y,s,years:[...c.years,{id:y,name:(ords[c.years.length]||(c.years.length+1)+'th')+' Year',sems:[{id:s,name:'1st Semester',subs:[]}]}]}});
 const addSem=()=>set(c=>{const s=uid(),n=Y.sems.length;return{...c,s,years:c.years.map(y=>y.id!==Y.id?y:{...y,sems:[...y.sems,{id:s,name:(ords[n]||(n+1)+'th')+' Semester',subs:[]}]})}});
 const rename=(f,v)=>set(c=>({...c,years:c.years.map(y=>y.id!==Y.id?y:f==='y'?{...y,name:v}:{...y,sems:y.sems.map(x=>x.id!==S.id?x:{...x,name:v})})}),'rn'+f);
 const addSub=()=>{if(!nf.code.trim())return;upd(x=>({...x,subs:[...x.subs,mk(nf.code.trim().toUpperCase(),nf.name.trim(),nf.units||'3','📘')]}));setNf({code:'',name:'',units:'3'});setAdding(false)};
 const delSub=id=>upd(x=>({...x,subs:x.subs.filter(s=>s.id!==id)}));
 const clearScores=ids=>upd(x=>({...x,subs:x.subs.map(s=>!ids||ids.includes(s.id)?{...s,sc:{}}:s)}));
 const subs=S.subs,cs=subs.map(calc),ps=subs.map(proj);
 const G=gwa(subs.map((s,i)=>[cs[i].eq,s.units])),gradedN=cs.filter(c=>c.eq!=null).length;
 const units=subs.reduce((a,s)=>a+(+s.units||0),0);
 const gens=S.gens||[],gps=gens.map(gproj),uAll=units+gens.reduce((a,g)=>a+(+g.units||0),0);
 const all=[...subs.map((s,i)=>({n:s.code,e:s.e||'📘',u:s.units,P:ps[i].Pg,Fp:ps[i].Fp,sem:ps[i].sem,eq:ps[i].eq,maj:1})),...gens.map((g,i)=>({n:g.name||'Gen Ed',e:'📗',u:g.units,P:gps[i].Pg,Fp:gps[i].Fp,sem:gps[i].sem,eq:gps[i].eq,maj:0}))];
 const PG=gwa(all.map(r=>[r.eq,r.u]));
 let fstar=null;if(all.length)for(let i=0;i<=1000;i++){const F=i/10,g=gwa(all.map(r=>[eqv(.4*r.P+.6*F),r.u]));if(g!=null&&g<=1.75+1e-9&&all.every(r=>.4*r.P+.6*F>=75-1e-9)){fstar=F;break}}
 const best=all.length?gwa(all.map(r=>[eqv(.4*r.P+60),r.u])):null;
 const Tp=+tg.p||75,Ts=+tg.s||75,TF=s=>(Ts-.4*per(s,PRE,0).proj)/.6;
 const SEL='rounded-2xl bg-white/80 dark:bg-white/10 ring-1 ring-black/10 dark:ring-white/15 px-3 py-2.5 text-sm font-semibold max-w-full';

 const exportData=()=>{const d=JSON.stringify({app:'grades-tracker',version:1,account:acct.name,exported:new Date().toISOString(),data:ref.current},null,2),a=document.createElement('a');a.href=URL.createObjectURL(new Blob([d],{type:'application/json'}));a.download='grades-'+(acct.name||'backup').replace(/[^a-z0-9]+/gi,'-').toLowerCase()+'-'+new Date().toISOString().slice(0,10)+'.json';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),1500);setMsg('Backup downloaded ✓')};
 const importData=e=>{const f=e.target.files&&e.target.files[0];e.target.value='';if(!f)return;const r=new FileReader();r.onload=()=>{try{const j=JSON.parse(r.result),d=j&&j.data?j.data:j;if(!d||!Array.isArray(d.years)||!d.years.length||!d.years.every(y=>y&&Array.isArray(y.sems)&&y.sems.length))throw new Error('bad');set(()=>d);setMsg('Backup restored ✓ (Undo brings back your previous data)')}catch(x){setMsg('That file is not a valid backup.')}};r.onerror=()=>setMsg('Could not read that file.');r.readAsText(f)};
 const Top=()=><header className="flex flex-col gap-4">
  <div className="flex flex-wrap items-center gap-3">
   <div className="mr-auto"><h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Grades Tracker <span className="text-violet-600 dark:text-violet-300">&amp; Forecaster</span></h1><p className="text-sm opacity-60">Saved on this device ✨</p></div>
   <button className={BTN} onClick={onSwitch}>{acct.emoji} {acct.name} · Switch</button>
   <button className={BTN} onClick={undo} disabled={!past.current.length}>↶ Undo</button>
   <button className={BTN} onClick={redo} disabled={!fut.current.length}>↷ Redo</button>
   <button className={BTN} onClick={()=>setMg(!mg)}>{mg?'Close':'⚙ Manage'}</button>
  </div>
  {guest&&<div className="rounded-2xl bg-amber-100 text-amber-900 dark:bg-amber-500/20 dark:text-amber-100 p-3 text-sm flex flex-wrap items-center gap-3"><span className="font-semibold">Guest mode: nothing is saved when you leave.</span><input value={kn} onChange={e=>setKn(e.target.value)} placeholder="Account name" className={INP+' h-10 w-40 !text-left px-3'}/><button className={BTN+' !py-2'} onClick={()=>kn.trim()&&onKeep(kn.trim())}>Save as account</button></div>}
  <div className="flex flex-wrap gap-3">
   <select value={Y.id} onChange={e=>set(c=>({...c,y:e.target.value,s:c.years.find(y=>y.id===e.target.value).sems[0].id}))} className={SEL}>{st.years.map(y=><option key={y.id} value={y.id} className="text-black">{y.name}</option>)}</select>
   <select value={S.id} onChange={e=>set(c=>({...c,s:e.target.value}))} className={SEL}>{Y.sems.map(x=><option key={x.id} value={x.id} className="text-black">{x.name}</option>)}</select>
  </div>
  {mg&&<div className={CARD+' p-5 flex flex-col gap-4'}>
   <div className="grid gap-3 sm:grid-cols-2"><label className="text-sm font-semibold">Academic year name<Txt v={Y.name} on={v=>rename('y',v)} cls="w-full h-12 mt-1 !bg-slate-100 dark:!bg-white/10"/></label><label className="text-sm font-semibold">Semester name<Txt v={S.name} on={v=>rename('s',v)} cls="w-full h-12 mt-1 !bg-slate-100 dark:!bg-white/10"/></label></div>
   <div className="flex flex-wrap gap-3"><button className={BTN} onClick={addYear}>+ New academic year</button><button className={BTN} onClick={addSem}>+ New semester</button><button className={BTN} onClick={()=>clearScores()}>Clear all scores here</button><button className={BTN+' !text-red-600 dark:!text-red-400'} onClick={()=>set(()=>seed())}>Reset everything</button></div>
   {CAN_FILE&&<div className="flex flex-wrap items-center gap-3"><button className={BTN} onClick={exportData}>⬇ Export data</button><label className={BTN+' cursor-pointer'}>⬆ Import data<input type="file" accept="application/json,.json" onChange={importData} className="hidden"/></label>{msg&&<span className="text-sm font-semibold">{msg}</span>}</div>}
   <p className="text-xs opacity-60">Everything is saved on this device automatically. Export a backup now and then in case the browser clears its storage. Every action here can be undone.</p></div>}
 </header>;

 const Hero=({g,label,note,u})=>{const ok=g!=null&&g<=1.75;return <div className={CARD+' p-5 sm:p-6 flex flex-wrap items-center gap-x-10 gap-y-4'}>
  <div><div className="text-sm font-semibold opacity-60">{label}</div><div className={'text-5xl font-extrabold tot inline-block mt-1 '+(ok?'text-emerald-600 dark:text-emerald-300':'')}>{g==null?'—':g.toFixed(2)}</div><div className="text-xs opacity-60 mt-1">1.00 is the best · closer to 1.00 is better</div></div>
  <div className="flex gap-8 text-sm"><div><div className="opacity-60">Dean’s List goal</div><div className="text-lg font-bold">1.75 or better</div></div><div><div className="opacity-60">Total units</div><div className="text-lg font-bold">{u}</div></div></div>
  <div className={'rounded-2xl px-4 py-2.5 text-sm font-bold '+(g==null?'bg-slate-100 dark:bg-white/10':ok?'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-200':'bg-amber-100 text-amber-900 dark:bg-amber-500/20 dark:text-amber-200')}>{g==null?'Waiting for grades':ok?'On track for Dean’s List 🎉':'Improve by '+(g-1.75).toFixed(2)+' to reach 1.75'}</div>
  <p className="text-xs opacity-60 max-w-md basis-full lg:basis-auto lg:ml-auto">{note}</p></div>};

 const Block=({s,L,tag,pct,res,a,raw})=><div className={'rounded-2xl p-4 '+a[2]}>
  <div className="flex items-center justify-between mb-2"><h4 className="font-bold">{tag} <span className="text-xs font-semibold opacity-60 ml-1">{pct}% of semestral</span></h4><span className={'rounded-full px-3 py-1 text-sm font-extrabold bg-white/70 dark:bg-white/10 '+a[1]}>{raw!=null&&res.n>0&&<span className="text-xs font-semibold opacity-60 mr-1">raw {f2(raw)} →</span>}{res.n?f2(res.g):'—'}</span></div>
  <div className="flex flex-col gap-3">{L.map(([k,l,w])=>{const c=s.sc[k]||{},p=pc(c);return <div key={k} className="flex items-center gap-3">
   <div className="flex-1 min-w-0"><div className="text-sm font-semibold truncate">{l}</div><div className="text-xs opacity-60">{w}% · {p==null?'not entered':f2(p)+'%'}</div></div>
   <Num nav v={c.s} on={v=>setSc(s.id,k,'s',v)} ph="score" bad={p!=null&&p>100}/><span className="opacity-40">/</span><Num v={c.m} on={v=>setSc(s.id,k,'m',v)} ph="100" w="w-16"/></div>})}</div></div>;

 const Curve=s=>{const b=cvb(s);return <div className="rounded-2xl border border-dashed border-black/15 dark:border-white/20 p-3 flex flex-col gap-2">
  <div className="text-sm font-bold">Grade curve <span className="text-xs font-semibold opacity-60">(optional)</span></div>
  <div className="flex flex-wrap items-center gap-2 text-xs font-semibold"><span>Base</span>{[0,50,60].map(x=><button key={x} onClick={()=>setCv(s.id,'b',String(x))} className={'rounded-full px-3 py-1.5 '+(b===x?'bg-violet-600 text-white':'bg-slate-100 dark:bg-white/10')}>{x}</button>)}<Num v={s.cv&&s.cv.b} on={v=>setCv(s.id,'b',v)} ph="other" w="w-16"/><span className="ml-1">+ pts</span><Num v={s.cv&&s.cv.x} on={v=>setCv(s.id,'x',v)} ph="0" w="w-16"/></div>
  <p className="text-xs opacity-60">Base 0 means raw scores, no curve. Base 50 turns each quiz or exam score into 50 plus half of it. Bonus points are added to the Finals grade (max 100). Participation is not curved.</p></div>};
 const Card=({s,i})=>{const c=cs[i],a=AC[i%AC.length],pass=c.sem!=null&&c.sem>=75,v=tv[s.id]||tvAll,cv=cvb(s)||cvx(s);return <section className={CARD+' p-5 flex flex-col gap-4'}>
  <div className="flex items-center gap-3"><div className={'h-12 w-12 shrink-0 grid place-items-center rounded-2xl text-2xl '+a[2]}>{s.e||'📘'}</div>
   <div className="flex-1 min-w-0"><Txt v={s.code} on={v=>setF(s.id,'code',v.toUpperCase())} cls="w-full text-lg font-extrabold"/><Txt v={s.name} on={v=>setF(s.id,'name',v)} cls="w-full opacity-70 -mt-1"/></div>
   <label className="text-xs font-semibold opacity-80 text-center">Units<Num v={s.units} on={v=>setF(s.id,'units',v)} w="w-14"/></label></div>
  {Seg({v,on:x=>setTv({...tv,[s.id]:x}),opts:[['p','Prelims'],['f','Finals']],cls:'w-full'})}
  {v==='p'?Block({s,L:PRE,tag:'Prelims',pct:40,res:c.P,a}):<>
   <div className={'rounded-2xl px-4 py-3 flex items-center justify-between '+a[2]}><span className="text-sm font-semibold">Prelims grade <span className="text-xs opacity-60">40%</span></span><span className="font-extrabold">{c.P.n?f2(c.P.g):'—'}{c.P.n>0&&c.P.n<4&&<span className="text-xs font-semibold opacity-60"> (incomplete)</span>}</span></div>
   {Block({s,L:FIN,tag:'Finals',pct:60,res:c.F,a,raw:cv?gr({...s,cv:null},FIN).g:null})}
   {Curve(s)}</>}
  <Dark l="Semestral grade" v={c.sem==null?'—':f2(c.sem)} rl="Equivalent" r={<span className={eqd(c.eq)}>{c.eq==null?'—':c.eq.toFixed(2)}</span>} foot={c.sem==null?'Fill all 8 scores':pass?'Passing ✓':'Below 75'}/>
  <div className="flex gap-2"><button className={BTN+' flex-1'} onClick={()=>clearScores([s.id])}>Clear scores</button><button className={BTN+' flex-1 !text-red-600 dark:!text-red-400'} onClick={()=>delSub(s.id)}>Delete</button></div>
 </section>};

 const AddTile=()=>adding?<div className={CARD+' p-5 flex flex-col gap-3'}>
  <h3 className="font-bold">New subject</h3>
  <label className="text-sm font-semibold">Code<input value={nf.code} onChange={e=>setNf({...nf,code:e.target.value})} placeholder="e.g. AUDITING" className={INP+' h-12 w-full mt-1 !text-left px-3'}/></label>
  <label className="text-sm font-semibold">Name (optional)<input value={nf.name} onChange={e=>setNf({...nf,name:e.target.value})} className={INP+' h-12 w-full mt-1 !text-left px-3'}/></label>
  <label className="text-sm font-semibold">Credit units<Num v={nf.units} on={v=>setNf({...nf,units:v})} w="w-full"/></label>
  <div className="flex gap-2"><button className={BTN+' flex-1 !bg-violet-600 !text-white'} onClick={addSub}>Add subject</button><button className={BTN} onClick={()=>setAdding(false)}>Cancel</button></div></div>
  :<button onClick={()=>setAdding(true)} className="rounded-3xl border-2 border-dashed border-violet-400/60 min-h-[10rem] text-lg font-bold text-violet-600 dark:text-violet-300 hover:bg-white/50 dark:hover:bg-white/5">＋ Add subject</button>;

 // one forecaster card, used for both Prelims and Finals
 const PCard=({s,i,L,tag,T,pre,foot})=>{const a=AC[i%AC.length],r=per(s,L,T),[us,ub]=r.Wm?need(r.uni):['',false],met=r.proj>=T-1e-9;
  return <section className={CARD+' p-5 flex flex-col gap-4'}>
  <div className="flex items-center gap-3"><div className={'h-12 w-12 grid place-items-center rounded-2xl text-2xl '+a[2]}>{s.e||'📘'}</div><div className="flex-1"><h3 className="text-lg font-extrabold">{s.code}</h3><div className="text-xs opacity-60">{tag} target: {f2(Math.max(0,T))}</div></div></div>
  {pre}
  {r.Wm>0&&r.miss.length>1&&<Tile a={a} l={`Same % on all ${r.miss.length} missing`} v={us} bad={ub}/>}
  <div className="flex flex-col gap-3">{L.map(([k,l,w])=>{const p=pc(s.sc[k]);if(p!=null)return <div key={k} className="flex justify-between items-center rounded-2xl bg-slate-100/70 dark:bg-white/5 px-4 py-3 text-sm"><span className="font-semibold">{l} <span className="opacity-60 font-normal">{w}%</span></span><span className="font-bold">✓ {f2(p)}%</span></div>;
   const v=r.alone.find(x=>x[0]===k)[1],[t,bad]=need(v),m=mxs(s,k);
   return <div key={k} className={'rounded-2xl p-4 flex flex-col gap-2 '+a[2]}>
    <div className="flex justify-between items-center"><span className="font-bold">{l} <span className="text-xs opacity-60 font-semibold">{w}%</span></span><span className="text-xs font-bold rounded-full bg-white/70 dark:bg-white/10 px-2 py-0.5">Not yet</span></div>
    <div><span className="text-xs opacity-70">Score needed{r.miss.length>1?' (others at their sliders)':''}:</span><div className={'text-xl font-extrabold '+(bad?'text-red-600 dark:text-red-400':a[1])}>{t}{v>0&&v<=100&&<span className="text-sm font-semibold opacity-70"> ≈ {f2(v/100*m)}/{m}</span>}</div></div>
    <div className="flex items-center gap-3"><span className="w-16 text-xs font-semibold">If I score</span><input type="range" min="0" max="100" step="1" value={Math.min(100,+wv(s,k)||0)} onChange={e=>setWi(s.id,k,e.target.value)} className="flex-1 min-w-0"/><Num v={wv(s,k)} on={v=>setWi(s.id,k,v)} w="w-16"/></div></div>})}</div>
  {Dark({l:`Projected ${tag.toLowerCase()} grade`,v:f2(r.proj),rl:r.Wm?'vs target':'All scores in',r:f2(Math.max(0,T)),foot:met?'Meets target ✓':'Short by '+f2(T-r.proj)})}
  {foot}
 </section>};

 const setMissing=mode=>upd(x=>({...x,subs:x.subs.map(s=>{const L=mode==='p'?PRE:FIN,r=per(s,L,mode==='p'?Tp:TF(s)),wi={...(s.wi||{})};r.miss.forEach(([k])=>{wi[k]=String(r.uni<=0?0:Math.min(100,Math.ceil(r.uni)))});return{...s,wi}})}));
 const setMax=mode=>upd(x=>({...x,subs:x.subs.map(s=>{const wi={...(s.wi||{})};(mode==='p'?PRE:FIN).forEach(([k])=>{if(pc(s.sc[k])==null)wi[k]='100'});return{...s,wi}})}));
 const GRID='grid gap-5 md:grid-cols-2 2xl:grid-cols-3 items-start';

 const Fin=({s,i})=>{const a=AC[i%AC.length],pr=per(s,PRE,0),Pg=pr.proj,actual=pr.Wm===0,Tf=TF(s),r=per(s,FIN,Tf),sem=.4*Pg+.6*r.proj;
  const pre=<div className={'rounded-2xl p-3 text-sm '+a[2]}><div>Prelims grade used: <b>{f2(Pg)}</b> <span className="opacity-70">({actual?'actual from tracker':'projected, some prelim scores missing'})</span></div><div>Finals grade needed for a semestral of {f2(Ts)}: <b className={Tf>100?'text-red-600 dark:text-red-400':''}>{Tf<=0?'Secured ✓':Tf>100?'Out of reach ('+f2(Tf)+')':f2(Tf)}</b></div>{(cvb(s)||cvx(s))>0&&<div className="text-xs opacity-70 mt-1">Curve on (base {cvb(s)}, +{cvx(s)} pts). Needed scores are raw, before the curve.</div>}</div>;
  const foot=Dark({l:'Projected semestral',v:f2(sem),rl:'Equivalent',r:<span className={eqd(eqv(sem))}>{eqv(sem).toFixed(2)}</span>,foot:sem>=75?'Passing ✓':'Below 75'});
  return PCard({s,i,L:FIN,tag:'Finals',T:Tf,pre,foot})};

 const addGen=()=>{if(!gf.name.trim())return;upd(x=>({...x,gens:[...(x.gens||[]),{id:uid(),name:gf.name.trim(),units:gf.units||'3',pre:gf.pre,fin:'85'}]}));setGf({name:'',units:'3',pre:''});setGadd(false)};
 const setGen=(id,f,v)=>upd(x=>({...x,gens:(x.gens||[]).map(g=>g.id===id?{...g,[f]:v}:g)}),'g'+f+id);
 const delGen=id=>upd(x=>({...x,gens:(x.gens||[]).filter(g=>g.id!==id)}));
 const GwaTable=()=><div className={CARD+' p-4 sm:p-6 flex flex-col gap-2'}>
  <h3 className="text-lg font-extrabold mb-1">Projected grades</h3>
  <div className="grid grid-cols-[1.5fr_repeat(4,1fr)] gap-2 text-xs font-bold opacity-60"><span>Subject</span><span className="text-right">Prelims</span><span className="text-right">Finals</span><span className="text-right">Sem.</span><span className="text-right">Equiv.</span></div>
  {all.map((r,i)=><div key={i} className="grid grid-cols-[1.5fr_repeat(4,1fr)] gap-2 items-center py-2 border-t border-black/5 dark:border-white/10 text-sm"><div className="min-w-0"><div className="font-extrabold truncate">{r.e} {r.n}</div><div className="text-xs opacity-60">{r.u} units{r.sem<75&&<span className="text-red-600 dark:text-red-400 font-semibold"> · {r.maj?'debarment risk':'failing'}</span>}</div></div><span className="text-right">{f2(r.P)}</span><span className="text-right">{f2(r.Fp)}</span><span className={'text-right font-bold '+(r.sem<75?'text-red-600 dark:text-red-400':'')}>{f2(r.sem)}</span><span className={'text-right font-extrabold '+eqc(r.eq)}>{r.eq.toFixed(2)}</span></div>)}
  <div className="flex justify-between border-t-2 border-black/10 dark:border-white/20 pt-3 font-extrabold"><span>Projected GWA</span><span className={'tot '+eqc(PG)}>{PG==null?'—':PG.toFixed(2)}</span></div>
  <p className="text-xs opacity-70">1.00 is the best and 5.00 is failing. Majors must stay at 75 (3.00) or above or you risk debarment.</p>
  <div className="flex flex-wrap gap-1.5 text-xs">{EQ.map(([t,v])=><span key={t} className="rounded-full bg-slate-100 dark:bg-white/10 px-2.5 py-1 font-semibold">{t}+ → {v.toFixed(2)}</span>)}<span className="rounded-full bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300 px-2.5 py-1 font-semibold">below 75 → 5.00</span></div></div>;
 const GenEds=()=><div className={CARD+' p-4 sm:p-6 flex flex-col gap-4'}>
  <div className="flex items-start justify-between gap-3"><div><h3 className="text-lg font-extrabold">📗 Gen Eds</h3><p className="text-sm opacity-70">Add the name, units and your prelim grade. Then set the finals grade you expect.</p></div>{!gadd&&<button className={BTN} onClick={()=>setGadd(true)}>＋ Add gen ed</button>}</div>
  {gadd&&<div className="grid gap-3 sm:grid-cols-[2fr_1fr_1fr_auto] items-end">
   <label className="text-sm font-semibold">Name<input value={gf.name} onChange={e=>setGf({...gf,name:e.target.value})} placeholder="e.g. Ethics" className={INP+' h-12 w-full mt-1 !text-left px-3'}/></label>
   <label className="text-sm font-semibold">Units<Num v={gf.units} on={v=>setGf({...gf,units:v})} w="w-full"/></label>
   <label className="text-sm font-semibold">Prelim grade<Num v={gf.pre} on={v=>setGf({...gf,pre:v})} w="w-full"/></label>
   <div className="flex gap-2"><button className={BTN+' !bg-violet-600 !text-white'} onClick={addGen}>Add</button><button className={BTN} onClick={()=>setGadd(false)}>Cancel</button></div></div>}
  {gens.map((g,i)=><div key={g.id} className="rounded-2xl bg-slate-100/70 dark:bg-white/5 p-4 flex flex-col gap-3">
   <div className="flex flex-wrap items-center gap-3"><Txt v={g.name} on={v=>setGen(g.id,'name',v)} cls="flex-1 min-w-[8rem] text-lg font-bold"/><label className="text-xs font-semibold text-center">Units<Num v={g.units} on={v=>setGen(g.id,'units',v)} w="w-16"/></label><label className="text-xs font-semibold text-center">Prelim grade<Num v={g.pre} on={v=>setGen(g.id,'pre',v)} w="w-20"/></label><button className={BTN+' !text-red-600 dark:!text-red-400'} onClick={()=>delGen(g.id)}>Delete</button></div>
   <div className="flex items-center gap-3"><span className="w-28 text-xs font-semibold">Expected finals</span><input type="range" min="0" max="100" step="1" value={Math.min(100,+g.fin||0)} onChange={e=>setGen(g.id,'fin',e.target.value)} className="flex-1 min-w-0"/><Num v={g.fin} on={v=>setGen(g.id,'fin',v)} w="w-16"/></div>
   <div className="flex justify-between text-sm"><span>Projected semestral <b>{f2(gps[i].sem)}</b></span><span>Equivalent <b className={eqc(gps[i].eq)}>{gps[i].eq.toFixed(2)}</b></span></div></div>)}
  {!gens.length&&!gadd&&<p className="text-sm opacity-60">No gen eds added yet.</p>}</div>;
 const Planner=()=><div className={CARD+' p-4 sm:p-6 flex flex-col gap-4'}>
  <div><h3 className="text-lg font-extrabold">🎓 Dean’s List planner</h3><p className="text-sm opacity-70">The finals grade you need in each subject, based on your prelim grades.</p></div>
  <div className="grid gap-3 sm:grid-cols-3">
   <Tile a={AC[1]} l="Best possible GWA (100 in every finals)" v={best==null?'—':best.toFixed(2)} sub={best==null?null:best>1.75?'Dean’s List is out of reach':'Dean’s List is still possible'}/>
   <Tile a={AC[0]} l="Same finals grade in every subject" v={fstar==null?'Not possible':f2(fstar)} sub="Lowest equal grade that still reaches 1.75"/>
   <Tile a={AC[2]} l="Passing mark" v="75 (3.00)" sub="Majors below this risk debarment"/></div>
  <div className="grid grid-cols-[1.4fr_repeat(3,1fr)] gap-2 text-xs font-bold opacity-60"><span>Subject</span><span className="text-right">Prelims</span><span className="text-right">Finals to pass (75)</span><span className="text-right">Finals for 1.75 (88)</span></div>
  {all.map((r,i)=>{const a=fneed(75,r.P),b=fneed(88,r.P);return <div key={i} className="grid grid-cols-[1.4fr_repeat(3,1fr)] gap-2 items-center py-2 border-t border-black/5 dark:border-white/10 text-sm"><span className="font-extrabold truncate">{r.e} {r.n}</span><span className="text-right">{f2(r.P)}</span><span className={'text-right font-bold '+(a>100?'text-red-600 dark:text-red-400':'')}>{ng(a)}</span><span className={'text-right font-extrabold '+(b>100?'text-red-600 dark:text-red-400':'text-emerald-600 dark:text-emerald-300')}>{ng(b)}</span></div>})}
  <p className="text-xs opacity-60">The 1.75 column assumes each subject lands exactly on 88. A strong subject can offset a weaker one, so check the projected GWA at the top as you move the sliders.</p></div>;
 return <div className="mx-auto max-w-[1500px] px-4 sm:px-8 py-6 sm:py-8 flex flex-col gap-6">
  {Top()}
  <div className="grid grid-cols-2 gap-1.5 rounded-2xl bg-white/60 dark:bg-white/10 p-1.5 sm:w-96 ring-1 ring-black/5 dark:ring-white/10">
   {[['t','📝 Grade Tracker'],['f','🔮 Forecaster']].map(([k,l])=><button key={k} onClick={()=>setTab(k)} className={'rounded-xl py-2.5 text-sm font-bold transition '+(tab===k?'bg-violet-600 text-white shadow-lg shadow-violet-500/30':'opacity-70')}>{l}</button>)}
  </div>
  {tab==='t'?<>
   {Hero({g:G,u:units,label:'Current GWA',note:gradedN?`Counts ${gradedN} of ${subs.length} subjects that have all 8 scores. Equivalents use the UST scale (75 = 3.00, 97+ = 1.00).`:'Type your scores below. Press Enter to finish a box. Each semestral grade appears once all 8 scores are in.'})}
   <div className="flex flex-wrap items-center gap-3"><span className="text-sm font-semibold opacity-70">Show on all cards</span>{Seg({v:tvAll,on:x=>{setTvAll(x);setTv({})},opts:[['p','Prelims'],['f','Finals']]})}</div>
   <div className={GRID}>{subs.map((s,i)=><React.Fragment key={s.id}>{Card({s,i})}</React.Fragment>)}{AddTile()}</div>
  </>:<>
   {Hero({g:PG,u:uAll,label:'Projected GWA (what-if)',note:'Majors use your tracker scores and gen eds use the grades you enter. Anything not entered yet uses the slider values.'})}
   <div className="flex flex-wrap items-center gap-3">
    <div className="grid grid-cols-3 gap-1.5 rounded-2xl bg-white/60 dark:bg-white/10 p-1.5 ring-1 ring-black/5 dark:ring-white/10 w-full sm:w-auto">
     {[['p','Prelims'],['f','Finals'],['g','GWA']].map(([k,l])=><button key={k} onClick={()=>setSub(k)} className={'rounded-xl px-5 py-2 text-sm font-bold '+(sub===k?'bg-fuchsia-600 text-white':'opacity-70')}>{l}</button>)}</div>
    {sub==='p'&&<label className="flex items-center gap-2 text-sm font-semibold">Prelims target<Num v={tg.p} on={v=>setTg('p',v)} w="w-20"/></label>}
    {sub==='f'&&<label className="flex items-center gap-2 text-sm font-semibold">Semestral target<Num v={tg.s} on={v=>setTg('s',v)} w="w-20"/></label>}
    {sub!=='g'&&<><button className={BTN} onClick={()=>setMissing(sub)}>🎯 Set missing to needed</button><button className={BTN} onClick={()=>setMax(sub)}>💯 Set missing to 100%</button></>}
   </div>
   {sub==='g'?<div className="flex flex-col gap-5">{GwaTable()}{GenEds()}{Planner()}</div>
   :!subs.length?<p className={CARD+' p-6'}>Add subjects in the Grade Tracker tab first.</p>
   :sub==='p'?<div className={GRID}>{subs.map((s,i)=><React.Fragment key={s.id}>{PCard({s,i,L:PRE,tag:'Prelims',T:Tp})}</React.Fragment>)}</div>
   :sub==='f'?<div className={GRID}>{subs.map((s,i)=><React.Fragment key={s.id}>{Fin({s,i})}</React.Fragment>)}</div>
   :null}
  </>}
 </div>;
}

const Av=e=><div className="h-14 w-14 shrink-0 rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-500 grid place-items-center text-3xl shadow-lg shadow-violet-500/30">{e}</div>;
const Pick=(v,on)=><div className="flex flex-wrap gap-2">{EMO.map(e=><button key={e} onClick={()=>on(e)} className={'h-11 w-11 rounded-xl text-2xl '+(v===e?'bg-violet-600/20 ring-2 ring-violet-500':'bg-slate-100 dark:bg-white/10')}>{e}</button>)}</div>;

function Start({book,onOpen,onGuest,onCreate,onRename,onDelete,onImport}){
 const [nw,setNw]=useState(false),[f,setF]=useState({name:'',emoji:'🎓',pre:false}),[ed,setEd]=useState(null),[arm,setArm]=useState(null),[msg,setMsg]=useState('');
 const pick=e=>{const fl=e.target.files&&e.target.files[0];e.target.value='';if(!fl)return;const r=new FileReader();r.onload=()=>{try{const j=JSON.parse(r.result),d=j&&j.data?j.data:j;if(!okState(d))throw new Error('bad');onImport(j.account||'Imported account',d);setMsg('Backup added as a new account ✓')}catch(x){setMsg('That file is not a valid backup.')}};r.onerror=()=>setMsg('Could not read that file.');r.readAsText(fl)};
 return <div className="mx-auto max-w-4xl px-4 sm:px-8 py-10 sm:py-16 flex flex-col gap-8">
  <div className="text-center"><div className="text-6xl mb-3">📒</div><h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">Grades Tracker <span className="text-violet-600 dark:text-violet-300">&amp; Forecaster</span></h1><p className="mt-2 opacity-70">Choose an account to continue</p></div>
  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 items-start">
   {book.list.map(a=><div key={a.id} className={CARD+' p-5 flex flex-col gap-3'}>
    {ed===a.id?<>
     <input value={a.name} onChange={e=>onRename(a.id,{name:e.target.value})} placeholder="Account name" className={INP+' h-12 w-full !text-left px-3'}/>
     {Pick(a.emoji,e=>onRename(a.id,{emoji:e}))}
     <div className="flex gap-2"><button className={BTN+' flex-1'} onClick={()=>{setEd(null);setArm(null)}}>Done</button>
      <button className={BTN+' flex-1 !text-red-600 dark:!text-red-400'} onClick={()=>{if(arm===a.id){onDelete(a.id);setEd(null);setArm(null)}else{setArm(a.id);setTimeout(()=>setArm(x=>x===a.id?null:x),4000)}}}>{arm===a.id?'Tap again to delete':'Delete'}</button></div>
     {arm===a.id&&<p className="text-xs text-red-600 dark:text-red-400">This permanently deletes every grade in this account.</p>}</>
    :<><button onClick={()=>onOpen(a.id)} className="flex items-center gap-4 text-left">{Av(a.emoji)}<div className="min-w-0"><div className="text-lg font-extrabold truncate">{a.name||'Untitled'}</div><div className="text-sm opacity-60">Tap to open</div></div></button>
     <button onClick={()=>setEd(a.id)} className="self-end text-xs font-semibold opacity-60 hover:opacity-100">✏️ Edit</button></>}
   </div>)}
   {nw?<div className={CARD+' p-5 flex flex-col gap-3'}>
     <h3 className="font-extrabold">New account</h3>
     <input value={f.name} onChange={e=>setF({...f,name:e.target.value})} placeholder="Name" className={INP+' h-12 w-full !text-left px-3'}/>
     {Pick(f.emoji,e=>setF({...f,emoji:e}))}
     <label className="flex items-start gap-2 text-sm"><input type="checkbox" checked={f.pre} onChange={e=>setF({...f,pre:e.target.checked})} className="mt-1 h-4 w-4 accent-violet-600"/><span>Pre-load STRATCOST, FINMAN, INTACC, OBLICON and ITAPP (scores stay blank)</span></label>
     <div className="flex gap-2"><button className={BTN+' flex-1 !bg-violet-600 !text-white'} onClick={()=>onCreate(f.name,f.emoji,f.pre)}>Create</button><button className={BTN} onClick={()=>setNw(false)}>Cancel</button></div></div>
    :<button onClick={()=>setNw(true)} className="rounded-3xl border-2 border-dashed border-violet-400/60 min-h-[8.5rem] p-5 text-lg font-bold text-violet-600 dark:text-violet-300 hover:bg-white/50 dark:hover:bg-white/5">＋ New account<span className="block text-xs font-medium opacity-70 mt-1">Starts with blank grades</span></button>}
   <button onClick={onGuest} className={CARD+' p-5 flex items-center gap-4 text-left hover:bg-white dark:hover:bg-white/10'}>{Av('👤')}<div><div className="text-lg font-extrabold">Guest</div><div className="text-sm opacity-60">Try it out. Nothing is saved.</div></div></button>
  </div>
  <div className="flex flex-col items-center gap-3 text-center">
   {CAN_FILE&&<label className={BTN+' cursor-pointer'}>⬆ Import a backup as a new account<input type="file" accept="application/json,.json" onChange={pick} className="hidden"/></label>}
   {msg&&<p className="text-sm font-semibold">{msg}</p>}
   <p className="text-xs opacity-60 max-w-md">Accounts are stored on this device. There is no password, so anyone who opens this app can pick any account.</p></div>
 </div>;
}

function Root(){
 const bk=useRef(null);if(!bk.current)bk.current=loadBook();
 const [cur,setCur]=useState(null),[ver,setVer]=useState(0),[,tick]=useState(0),gd=useRef(null);
 const save=()=>{saveBook(bk.current);tick(x=>x+1)};
 useEffect(()=>{ADAPT.init(b=>{const nb=normBook(b);if(nb){bk.current=nb;try{localStorage.setItem(BK,JSON.stringify(nb))}catch(e){}setCur(c=>c&&!c.guest&&!nb.data[c.id]?null:c);setVer(v=>v+1)}},()=>bk.current)},[]);
 const open=id=>setCur({id});
 const addAcc=(name,emoji,d)=>{const id=uid();bk.current.list=[...bk.current.list,{id,name:(name||'').trim()||'New account',emoji}];bk.current.data[id]=d;return id};
 const create=(name,emoji,pre)=>{const id=addAcc(name,emoji,blank(pre));save();open(id)};
 const guest=()=>{gd.current=blank(false);setCur({guest:true})};
 const keep=name=>{const id=addAcc(name,'🎓',gd.current);save();open(id)};
 const rename=(id,p)=>{bk.current.list=bk.current.list.map(a=>a.id===id?{...a,...p}:a);save()};
 const del=id=>{bk.current.list=bk.current.list.filter(a=>a.id!==id);delete bk.current.data[id];save()};
 const imp=(name,d)=>{addAcc(name,'📥',d);save()};
 if(!cur)return <Start book={bk.current} onOpen={open} onGuest={guest} onCreate={create} onRename={rename} onDelete={del} onImport={imp}/>;
 const a=cur.guest?{name:'Guest',emoji:'👤'}:bk.current.list.find(x=>x.id===cur.id);
 if(!a){setTimeout(()=>setCur(null),0);return null}
 return <App key={(cur.id||'guest')+'-'+ver} init={cur.guest?gd.current:bk.current.data[cur.id]} acct={a} guest={!!cur.guest} onSave={n=>{if(cur.guest)gd.current=n;else{bk.current.data[cur.id]=n;saveBook(bk.current)}}} onSwitch={()=>setCur(null)} onKeep={keep}/>;
}

ReactDOM.createRoot(document.getElementById('root')).render(<Root/>);
