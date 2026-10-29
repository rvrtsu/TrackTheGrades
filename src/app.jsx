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
const DEFP=()=>[{id:'p1',name:'Prelims',w:'40',base:'0'},{id:'p2',name:'Finals',w:'60',base:'0'}];
const normP=l=>(Array.isArray(l)&&l.length?l:DEFP()).map((p,i)=>({id:p.id||('p'+(i+1)),name:String(p.name||'').trim()||('Period '+(i+1)),w:Math.max(0,+p.w)||0,base:Math.min(99,Math.max(0,+p.base||0))}));
let CUR=null; // the scale + grading periods of the profile that is currently on screen
const mkScale=cfg=>{
 cfg=cfg||{};const id=PRESETS[cfg.scale]?cfg.scale:'ph',P=PRESETS[id];
 const num=(v,d)=>v===undefined||v===null||v===''||!Number.isFinite(+v)?d:+v;
 const table=id==='pct'?null:(Array.isArray(cfg.table)&&cfg.table.length?cfg.table:P.table).map(r=>[num(r[0],0),num(r[1],0)]).sort((a,b)=>b[0]-a[0]);
 const target=num(cfg.target,+P.target),pass=num(cfg.pass,P.pass),dir=P.dir,fail=P.fail;
 const toG=p=>{p=+(+p).toFixed(2);if(!table)return p;for(const[t,v]of table)if(p>=t)return v;return fail};
 const meets=g=>g!=null&&Number.isFinite(g)&&(dir<0?g<=target+1e-9:g>=target-1e-9);
 const pg=toG(pass),bad=g=>g!=null&&Number.isFinite(g)&&(dir<0?g>pg+1e-9:g<pg-1e-9);
 let need;if(!table)need=target;else{const r=table.filter(x=>meets(x[1]));need=r.length?Math.min(...r.map(x=>x[0])):101}
 const periods=normP(cfg.periods),sumW=periods.reduce((a,p)=>a+p.w,0)||1;
 return{id,P,table,target,pass,dir,fail,hi:P.hi,toG,meets,bad,need,periods,sumW}};
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
// Activities are fully dynamic: every period has its own list of {name, weight, score, max}
const newActs=(p,i)=>[{id:uid(),name:'Quiz '+(2*i+1),w:'20',s:'',m:''},{id:uid(),name:'Quiz '+(2*i+2),w:'20',s:'',m:''},{id:uid(),name:p.name+' Exam',w:'50',s:'',m:''},{id:uid(),name:'Participation',w:'10',s:'',m:''}];
const mkActs=P=>{const o={};P.forEach((p,i)=>{o[p.id]=newActs(p,i)});return o};
const mk=(code,name,units,e,P)=>({id:uid(),code,name,units:String(units),e,acts:mkActs(P||DEFP()),base:{},wi:{}});
const seed=(P)=>{P=P||DEFP();const y=uid(),s=uid();return{y,s,tg:{},cfg:{scale:'ph',periods:P},years:[{id:y,name:'2nd Year (AY 2026–2027)',sems:[{id:s,name:'1st Semester',subs:[
 mk('STRATCOST','Strategic Cost Management',3,'📊',P),mk('FINMAN','Financial Management',3,'💰',P),mk('INTACC','Intermediate Accounting',3,'🧾',P),mk('OBLICON','Obligations and Contracts',3,'⚖️',P),mk('ITAPP','IT Applications',3,'💻',P)]}]}]}};
const blank=(pre,P)=>{if(pre)return seed(P);P=P||DEFP();const y=uid(),s=uid();return{y,s,tg:{},cfg:{scale:'ph',periods:P},years:[{id:y,name:'1st Year',sems:[{id:s,name:'1st Semester',subs:[]}]}]}};
// ---- upgrade data saved by older versions (fixed quizzes/exams) to the dynamic model ----
const LEG=[['p1',[['q1','Quiz 1',20],['q2','Quiz 2',20],['pe','Prelims Exam',50],['pp','Participation',10]]],['p2',[['q3','Quiz 3',20],['q4','Quiz 4',20],['fe','Finals Exam',50],['fp','Participation',10]]]];
const migSub=s=>{if(!s||s.acts)return s;const acts={};LEG.forEach(([pid,l])=>{acts[pid]=l.map(([k,name,w])=>({id:k,name,w:String(w),s:(s.sc&&s.sc[k]&&s.sc[k].s)||'',m:(s.sc&&s.sc[k]&&s.sc[k].m)||''}))});const base={};if(s.cv&&+s.cv.b)base.p2=String(s.cv.b);const n={...s,acts,base};delete n.sc;delete n.cv;return n};
const mig=d=>{if(!d||!Array.isArray(d.years))return d;const cfg=d.cfg||{};return{...d,cfg:{...cfg,periods:Array.isArray(cfg.periods)&&cfg.periods.length?cfg.periods:DEFP()},years:d.years.map(y=>({...y,sems:(y.sems||[]).map(x=>({...x,subs:(x.subs||[]).map(migSub)}))}))}};
const BK='gtf-book',EMO=['🎓','😎','🦊','🐼','🌸','⚡','🔥','🌈'],GEMO=['📁','🎓','🏫','📚','⭐','🐯','🌸','🔥'];
const okState=d=>d&&Array.isArray(d.years)&&d.years.length&&d.years.every(y=>y&&Array.isArray(y.sems)&&y.sems.length);
const defGroup=()=>({id:'g'+uid(),name:'General',icon:'📁'});
const mkBook=d=>{const g=defGroup(),id=uid();return{list:[{id,name:'My Account',bio:'',emoji:'🎓',gid:g.id}],data:{[id]:d},groups:[g]}};
const normBook=j=>{try{
 if(j&&Array.isArray(j.list)&&j.data&&typeof j.data==='object'){
  let gs=(Array.isArray(j.groups)?j.groups:[]).map(g=>typeof g==='string'?{id:'g'+uid(),name:g,icon:'📁'}:g).filter(g=>g&&g.id&&g.name);
  const seen={};gs=gs.filter(g=>seen[g.name.toLowerCase()]?false:(seen[g.name.toLowerCase()]=1));
  if(!gs.length)gs=[defGroup()];
  const by=Object.fromEntries(gs.map(g=>[g.name,g.id])),ids=new Set(gs.map(g=>g.id));
  const list=j.list.map(a=>{const n={...a};if(!n.gid||!ids.has(n.gid))n.gid=by[n.group]||gs[0].id;delete n.group;return n});
  return{list,data:j.data,groups:gs}}
 if(okState(j))return mkBook(j)}catch(e){}return null};
const loadRaw=()=>{let b=null;try{b=normBook(JSON.parse(localStorage.getItem(BK)))}catch(e){}if(!b)try{b=normBook(JSON.parse(localStorage.getItem('gtf-v1')))}catch(e){}if(!b)b=mkBook(seed());return b};
const loadBook=()=>{const b=loadRaw();Object.keys(b.data).forEach(k=>{b.data[k]=mig(b.data[k])});return b};
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
// A cloud group is a small public directory of cards. Each profile's data stays behind its own passcode.
const gkey=(n,pw)=>sha('gtf-group|'+n.trim().toLowerCase()+'|'+pw);
const gurl=(k,sub)=>DB+'/groups/'+k+(sub?'/'+sub:'')+'.json';
const gread=async k=>{const r=await fetch(gurl(k),{cache:'no-store'});if(!r.ok)throw new Error('get '+r.status);return r.json()};
const gwrite=async(k,sub,o)=>{const r=await fetch(gurl(k,sub),{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(o)});if(!r.ok)throw new Error('put '+r.status)};
const gremove=async(k,sub)=>{const r=await fetch(gurl(k,sub),{method:'DELETE'});if(!r.ok)throw new Error('del '+r.status)};
const premove=async k=>{const r=await fetch(curl(k),{method:'DELETE'});if(!r.ok)throw new Error('del '+r.status)};

/* =====================================================================
   4. GRADE MATH
   Raw grade   = weighted average of the activities in a period (0 to 100)
   Transmuted  = (Raw / 100) * (100 - Base) + Base          <- exact formula
   Needed raw  = (Target - Base) / (100 - Base) * 100        <- its inverse
   ===================================================================== */
const ap=a=>{if(!a||a.s===''||a.s==null)return null;const m=a.m===''||a.m==null?100:+a.m;return m>0?+a.s/m*100:null};
const wgt=a=>Math.max(0,+a.w)||0;
const trans=(R,B)=>Math.min(100,(R/100)*(100-B)+B);
const untrans=(T,B)=>(T-B)/(100-B)*100;
const actsOf=(s,p)=>(s.acts&&s.acts[p.id])||[];
const baseOf=(s,p)=>{const o=s.base&&s.base[p.id],v=o===undefined||o===''||!Number.isFinite(+o)?p.base:+o;return Math.min(99,Math.max(0,v))};
const wiv=(s,a)=>s.wi&&s.wi[a.id]!==undefined?s.wi[a.id]:'85';
const mxs=a=>+a.m||100;
// one grading period of one subject, using only what has been entered
const pcalc=(s,p)=>{const acts=actsOf(s,p),live=acts.filter(a=>wgt(a)>0),B=baseOf(s,p);let W=0,K=0,Wk=0,n=0;
 live.forEach(a=>{const w=wgt(a),x=ap(a);W+=w;if(x!=null){K+=w*x;Wk+=w;n++}});
 const total=live.length,complete=total>0&&n===total,raw=complete&&W>0?K/W:null,soFar=Wk>0?K/Wk:null;
 return{acts,live,B,W,K,n,total,complete,raw,soFar,grade:raw==null?null:trans(raw,B),gradeSoFar:soFar==null?null:trans(soFar,B)}};
// forecast for one period: entered scores stay fixed, missing ones use the what-if sliders.
// T is the wanted period grade (after the base); the solver works backwards through the Base formula.
const pproj=(s,p,T)=>{const c=pcalc(s,p),B=c.B,wi=a=>+wiv(s,a)||0,miss=c.live.filter(a=>ap(a)==null);
 const Wm=miss.reduce((t,a)=>t+wgt(a),0),Rneed=untrans(T,B),pts=Rneed*c.W-c.K;
 const uni=Wm>0?pts/Wm:null;
 const alone=miss.map(a=>{const o=miss.reduce((t,x)=>x===a?t:t+wgt(x)*wi(x),0);return[a.id,(pts-o)/wgt(a)]});
 let Kp=c.K;miss.forEach(a=>{Kp+=wgt(a)*wi(a)});const Rp=c.W>0?Kp/c.W:null;
 return{...c,miss,Wm,uni,alone,Rneed,projRaw:Rp,proj:Rp==null?null:trans(Rp,B)}};
const wavg=(vals,P)=>{let t=0,w=0;vals.forEach((v,i)=>{if(v!=null){t+=P[i].w*v;w+=P[i].w}});return w>0?t/w:null};
// semestral grade once every period is complete
const semActual=(s,P)=>{const cc=P.map(p=>pcalc(s,p)),act=cc.filter(c=>c.total>0);if(!act.length||act.some(c=>!c.complete))return null;return wavg(cc.map(c=>c.total>0?c.grade:null),P)};
// semestral grade using real scores plus what-if values for anything still missing
const semProj=(s,P)=>wavg(P.map(p=>pproj(s,p,0).proj),P);
// grade needed in period i so the semestral grade lands on S, given the other periods' projections
const needIn=(prj,P,i,S)=>{let o=0,Wt=P[i].w;prj.forEach((x,j)=>{if(j!==i&&x!=null){o+=P[j].w*x;Wt+=P[j].w}});return P[i].w>0?(S*Wt-o)/P[i].w:null};
const gwa=a=>{let u=0,t=0;a.forEach(([e,n])=>{if(e!=null&&+n>0){u+=+n;t+=e*n}});return u?t/u:null};
// gen eds: first period grade is known, the remaining periods use the expected grade
const gproj=(g,P)=>{const pre=+g.pre||0,fin=+g.fin||0,W=P.reduce((a,p)=>a+p.w,0)||1,rest=W-P[0].w,sem=P.length>1?(P[0].w*pre+rest*fin)/W:pre;return{pre,fin,sem,eq:eqv(sem)}};
const needGen=(g,P,S)=>{const W=P.reduce((a,p)=>a+p.w,0)||1,rest=W-P[0].w;return P.length>1&&rest>0?(S*W-P[0].w*(+g.pre||0))/rest:null};
// Reverse calculator: the released (transmuted) period grade is known, some scores are not.
// Raw needed = (T - Base) / (100 - Base) * 100, then the missing activities share the points they must have earned.
const rvPlan=(s,p,Tstr)=>{const T=+Tstr;if(Tstr===''||Tstr==null||!Number.isFinite(T))return{ok:false,msg:'Enter the released grade first.'};
 const c=pcalc(s,p),B=c.B;if(!c.live.length)return{ok:false,msg:'Add at least one activity with a weight first.'};
 const miss=c.live.filter(a=>ap(a)==null);if(!miss.length)return{ok:false,msg:'Every activity already has a score.'};
 if(T>100)return{ok:false,msg:'A grade above 100 is not possible.'};
 if(T<B-1e-9)return{ok:false,msg:'With Base '+f2(B)+' the lowest possible grade is '+f2(B)+'.'};
 const R=untrans(T,B),Wm=miss.reduce((t,a)=>t+wgt(a),0),x=(R*c.W-c.K)/Wm;
 if(x>100+1e-9)return{ok:false,msg:'Not possible: the missing scores would need '+f2(x)+'%, which is above 100%.'};
 if(x<-1e-9)return{ok:false,msg:'Not possible: the scores you entered already give a higher grade than '+f2(T)+'.'};
 return{ok:true,x:Math.max(0,x),miss,R,B}};
const need=v=>v==null?['—',false]:v<=0?['Secured ✓',false]:v>100?['Out of reach ('+f2(v)+'%)',true]:[f2(v)+'%',false];
const ng=v=>v==null?'—':v<=0?'Secured ✓':v>100?'Out of reach':f2(v);

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
const LBL2='text-[10px] font-bold uppercase leading-tight tracking-[.08em] text-muted sm:text-xs sm:tracking-[.12em]';

const Num=({v,on,ph,w='w-20',nav,bad})=><input inputMode="decimal" enterKeyHint="next" data-n={nav?1:undefined} onKeyDown={nav?e=>{if(e.key==='Enter'){e.preventDefault();const a=[...document.querySelectorAll('input[data-n]')],i=a.indexOf(e.target),n=a[i+1];n?n.focus():e.target.blur()}}:undefined} value={v??''} placeholder={ph} onChange={e=>{const x=e.target.value;if(/^\d*\.?\d*$/.test(x))on(x)}} className={cx(INP,'h-11 min-w-0 sm:h-12',w,bad&&'!border-bad ring-2 ring-bad/40')}/>;
const TextIn=({v,on,ph,cls='',type='text'})=><input type={type} value={v} placeholder={ph} autoComplete="off" onChange={e=>on(e.target.value)} className={cx(INP,'h-11 w-full !text-left px-3.5 sm:h-12',cls)}/>;
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

// Tiger mark (inline SVG, transparent background). Pass a className to size it, e.g. "h-10 w-10".
function TigerLogo({className='h-10 w-10',title='Grades Tracker tiger'}){
 const id=React.useId().replace(/:/g,''),G='url(#'+id+')';
 return <svg viewBox="64 90 384 372" className={className} role="img" aria-label={title} xmlns="http://www.w3.org/2000/svg">
  <defs><linearGradient id={id} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#FFD84A"/><stop offset="1" stopColor="#F5B400"/></linearGradient></defs>
  <g>
  <circle cx="148" cy="150" r="46" fill={G}/>
  <circle cx="364" cy="150" r="46" fill={G}/>
  <circle cx="150" cy="154" r="22" fill="#FFF3C4"/>
  <circle cx="362" cy="154" r="22" fill="#FFF3C4"/>
  <path d="M256 126C334 126 398 164 414 232C420 258 420 282 414 304L434 342L398 338C388 366 372 392 344 412C316 432 286 440 256 440C226 440 196 432 168 412C140 392 124 366 114 338L78 342L98 304C92 282 92 258 98 232C114 164 178 126 256 126Z" fill={G} stroke={G} strokeWidth="6" strokeLinejoin="round"/>
  <path d="M256 146L268 160L262 214L256 224L250 214L244 160Z" fill="#2A2204"/>
  <path d="M212 158Q226 186 232 216" stroke="#2A2204" strokeWidth="13" strokeLinecap="round" fill="none"/>
  <path d="M300 158Q286 186 280 216" stroke="#2A2204" strokeWidth="13" strokeLinecap="round" fill="none"/>
  <g stroke="#2A2204" strokeWidth="13" strokeLinecap="round" fill="none">
    <path d="M108 250Q142 254 168 274"/><path d="M110 292Q142 294 170 308"/><path d="M132 332Q152 332 176 342"/>
    <path d="M404 250Q370 254 344 274"/><path d="M402 292Q370 294 342 308"/><path d="M380 332Q360 332 336 342"/>
  </g>
  <path d="M256 316C292 316 324 336 324 368C324 398 292 414 256 414C220 414 188 398 188 368C188 336 220 316 256 316Z" fill="#FFFFFF"/>
  <path d="M178 244Q212 234 244 264Q208 276 178 244Z" fill="#2A2204"/>
  <path d="M334 244Q300 234 268 264Q304 276 334 244Z" fill="#2A2204"/>
  <circle cx="219" cy="254" r="4.5" fill="#FFF3C4"/><circle cx="293" cy="254" r="4.5" fill="#FFF3C4"/>
  <path d="M236 332H276L256 358Z" fill="#2A2204" stroke="#2A2204" strokeWidth="9" strokeLinejoin="round"/>
  <path d="M256 360V378M256 378Q238 394 220 384M256 378Q274 394 292 384" stroke="#2A2204" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
</g>
 </svg>;
}
const GroupIcon=({g,s='h-14 w-14',t='text-3xl'})=>g&&g.pic?<img src={g.pic} alt="" className={cx(s,'shrink-0 rounded-2xl object-cover ring-1 ring-line')}/>:<div className={cx(s,t,'grid shrink-0 place-items-center rounded-2xl bg-accent/20 ring-1 ring-accent/30')}>{(g&&g.icon)||'📁'}</div>;

/* =====================================================================
   6. GLOBAL CALCULATOR  (scratchpad: static, never saved, never synced)
   It takes no subject props, so switching subjects cannot reset or re-render it.
   ===================================================================== */
function CalcBase({sk}){
 const C=CUR,rc=useRef(0);rc.current++;
 const row=(name,w)=>({id:uid(),name,w,s:'',m:''});
 const [rows,setRows]=useState(()=>[row('Quiz','30'),row('Exam','50'),row('Activity','20')]),[base,setBase]=useState('0'),[raw,setRaw]=useState('');
 const upd=(id,f,v)=>setRows(r=>r.map(x=>x.id===id?{...x,[f]:v}:x));
 const B=Math.min(99,Math.max(0,+base||0));
 const ent=rows.filter(r=>ap(r)!=null&&wgt(r)>0),W=ent.reduce((t,r)=>t+wgt(r),0),R=W>0?ent.reduce((t,r)=>t+wgt(r)*ap(r),0)/W:null,T=R==null?null:trans(R,B);
 const q=raw===''?null:trans(+raw,B);
 return <section data-renders={rc.current} className={cx(CARD,'flex flex-col gap-3 p-4 sm:gap-4 sm:p-6')}>
  <div><h3 className="text-base font-extrabold sm:text-lg">🧮 Manual Automatic Calculator</h3><p className="text-xs text-muted sm:text-sm">Scratchpad for quick what-ifs. Not saved, and it stays put when you change subject.</p></div>
  <div className="flex flex-col gap-2">{rows.map(r=><div key={r.id} className="flex items-center gap-1.5 sm:gap-2">
   <input value={r.name} onChange={e=>upd(r.id,'name',e.target.value)} className={cx(INP,'h-11 min-w-0 flex-1 !text-left px-3')} placeholder="Name"/>
   <Num v={r.s} on={v=>upd(r.id,'s',v)} ph="score" w="w-[3.75rem] sm:w-[4.25rem]"/><span className="text-muted">/</span><Num v={r.m} on={v=>upd(r.id,'m',v)} ph="100" w="w-[3.5rem] sm:w-[4.25rem]"/><Num v={r.w} on={v=>upd(r.id,'w',v)} ph="wt %" w="w-[3.5rem] sm:w-[4.25rem]"/>
   <button className={BTN+' !px-2.5'} onClick={()=>setRows(x=>x.filter(y=>y.id!==r.id))} aria-label="Remove row">✕</button></div>)}
   <div className="flex gap-2"><button className={BTN} onClick={()=>setRows(x=>[...x,row('Activity','10')])}>＋ Add row</button><button className={BTN} onClick={()=>setRows([row('Activity','')])}>Clear</button></div></div>
  <div className="flex flex-wrap items-center gap-2"><span className="text-sm font-semibold">Base</span>{[0,20,50].map(b=><button key={b} onClick={()=>setBase(String(b))} className={cx('rounded-full px-3 py-1.5 text-xs font-bold transition',B===b?'bg-accent text-accent-ink':'bg-surface2 hover:bg-line/60')}>{b}</button>)}<Num v={base} on={setBase} ph="Base" w="w-20"/></div>
  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
   <Tile l="Raw grade" v={R==null?'—':f2(R)} sub={`${ent.length} of ${rows.filter(r=>wgt(r)>0).length} rows scored`}/>
   <Tile l="Transmuted grade" v={T==null?'—':f2(T)}/>
   <Tile l="Grade" v={T==null?'—':fg(eqv(T))}/>
   <Tile l="Status" v={T==null?'—':T>=C.pass?'Passing':'Below '+C.pass} bad={T!=null&&T<C.pass}/></div>
  {T!=null&&<p className="rounded-xl bg-surface2/70 px-3 py-2 text-xs text-muted">({f2(R)} ÷ 100) × (100 − {B}) + {B} = <b className="text-ink">{f2(T)}</b></p>}
  <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-dashed border-line p-3"><span className="text-sm font-semibold">Quick convert</span><Num v={raw} on={setRaw} ph="raw grade" w="w-28"/><span className="text-muted">→</span><span className="text-lg font-extrabold tabular-nums">{q==null?'—':f2(q)}</span><span className="text-xs text-muted">at Base {B}</span></div>
 </section>;
}
const Calc=React.memo(CalcBase);

/* =====================================================================
   7. APP  (one profile: Tracker, Forecaster, Settings)
   ===================================================================== */
function App({init,acct,guest,onSave,onSwitch,onKeep,cloud,ext,loser,onLoser,theme,setTheme}){
 const [st,setSt]=useState(()=>mig(init)),[tab,setTab]=useState('t'),[sub,setSub]=useState(null),[gv,setGv]=useState('grades'),[sx,setSx]=useState(false),[gadd,setGadd]=useState(false),[gf,setGf]=useState({name:'',units:'3',pre:''}),[adding,setAdding]=useState(false),[nf,setNf]=useState({code:'',name:'',units:'3'}),[msg,setMsg]=useState(''),[kn,setKn]=useState(''),[sid,setSid]=useState(null),[dir,setDir]=useState(1),[pid,setPid]=useState(null),[edit,setEdit]=useState(false),[rvMsg,setRvMsg]=useState(null),[,setNow]=useState(0);
 const ref=useRef(st),past=useRef([]),fut=useRef([]),last=useRef({k:'',t:0}),e0=useRef(ext&&ext.n),swRef=useRef(null),sw=useRef({on:false});
 const commit=n=>{ref.current=n;setSt(n);onSave(n)};
 useEffect(()=>{if(ext&&ext.data&&ext.n!==e0.current){e0.current=ext.n;const d=mig(ext.data);ref.current=d;setSt(d);past.current=[];fut.current=[];last.current={k:'',t:0}}},[ext&&ext.n]);
 useEffect(()=>{const t=setInterval(()=>setNow(x=>x+1),20000);return()=>clearInterval(t)},[]);
 const set=(fn,key)=>{const cur=ref.current,nx=fn(cur),now=Date.now();if(!(key&&last.current.k===key&&now-last.current.t<1200)){past.current.push(cur);if(past.current.length>100)past.current.shift()}last.current={k:key||'',t:now};fut.current=[];commit(nx)};
 const undo=()=>{if(!past.current.length)return;fut.current.push(ref.current);last.current={k:'',t:0};commit(past.current.pop())};
 const redo=()=>{if(!fut.current.length)return;past.current.push(ref.current);last.current={k:'',t:0};commit(fut.current.pop())};
 const Y=st.years.find(y=>y.id===st.y)||st.years[0],S=Y.sems.find(x=>x.id===st.s)||Y.sems[0],tg=st.tg||{};
 CUR=mkScale(st.cfg);const C=CUR,P=C.periods;
 const upd=(fn,key)=>set(c=>({...c,years:c.years.map(y=>y.id!==Y.id?y:{...y,sems:y.sems.map(x=>x.id!==S.id?x:fn(x))})}),key);
 const updSub=(id,fn,key)=>upd(x=>({...x,subs:x.subs.map(s=>s.id===id?fn(s):s)}),key&&key+id);
 const mapAll=(c,fn)=>({...c,years:c.years.map(y=>({...y,sems:y.sems.map(x=>({...x,subs:x.subs.map(fn)}))}))});
 const setF=(id,f,v)=>updSub(id,s=>({...s,[f]:v}),'f'+f);
 const setAct=(id,p,aid,f,v)=>updSub(id,s=>({...s,acts:{...s.acts,[p]:actsOf(s,{id:p}).map(a=>a.id===aid?{...a,[f]:v,...(f==='s'||f==='m'?{est:false}:{})}:a)}}),'a'+aid+f);
 const addAct=(id,p)=>updSub(id,s=>{const l=actsOf(s,{id:p});return{...s,acts:{...s.acts,[p]:[...l,{id:uid(),name:'Activity '+(l.length+1),w:'10',s:'',m:''}]}}});
 const delAct=(id,p,aid)=>updSub(id,s=>({...s,acts:{...s.acts,[p]:actsOf(s,{id:p}).filter(a=>a.id!==aid)}}));
 const setBase=(id,p,v)=>updSub(id,s=>({...s,base:{...(s.base||{}),[p]:v}}),'b'+p);
 const setWi=(id,aid,v)=>updSub(id,s=>({...s,wi:{...(s.wi||{}),[aid]:v}}),'w'+aid);
 const setRel=(id,p,v)=>updSub(id,s=>({...s,rel:{...(s.rel||{}),[p]:v}}),'rel'+p);
 const rvFill=(s,p)=>{const k=s.id+p.id,plan=rvPlan(s,p,(s.rel&&s.rel[p.id])??'');if(!plan.ok){setRvMsg({k,msg:plan.msg,bad:true});return}
  const fill=a=>plan.miss.some(m=>m.id===a.id)?{...a,s:String(+(plan.x/100*mxs(a)).toFixed(2)),est:true}:a;
  updSub(s.id,x=>({...x,acts:{...x.acts,[p.id]:actsOf(x,p).map(fill)}}));
  const ns={...s,acts:{...s.acts,[p.id]:actsOf(s,p).map(fill)}};
  setRvMsg({k,msg:`Filled ${plan.miss.length} possible score${plan.miss.length>1?'s':''} at about ${f2(plan.x)}% each. ${p.name} grade is now ${f2(pcalc(ns,p).grade)}.`,bad:false})};
 const rvClear=(s,p)=>{updSub(s.id,x=>({...x,acts:{...x.acts,[p.id]:actsOf(x,p).map(a=>a.est?{...a,s:'',est:false}:a)}}));setRvMsg(null)};
 const setTg=(k,v)=>set(c=>({...c,tg:{...(c.tg||{}),[k]:v}}),'tg'+k);
 const setCfg=(p,key)=>set(c=>({...c,cfg:{...(c.cfg||{}),...p}}),key||'cfg'+Object.keys(p).join());
 const pickScale=id=>set(c=>({...c,tg:{},cfg:{...(c.cfg||{}),scale:id,target:PRESETS[id].target,pass:String(PRESETS[id].pass),table:null}}));
 const setPass=v=>set(c=>({...c,tg:{},cfg:{...(c.cfg||{}),pass:v}}),'cfgpass');
 const rawP=()=>((st.cfg&&st.cfg.periods)||DEFP());
 const setPeriod=(i,patch)=>set(c=>{const per=[...((c.cfg&&c.cfg.periods)||DEFP())];per[i]={...per[i],...patch};return{...c,cfg:{...(c.cfg||{}),periods:per}}},'per'+i+Object.keys(patch).join());
 const setWeights=ws=>set(c=>{const per=((c.cfg&&c.cfg.periods)||DEFP()).map((p,i)=>ws[i]!==undefined?{...p,w:String(ws[i])}:p);return{...c,cfg:{...(c.cfg||{}),periods:per}}});
 const addPeriod=()=>set(c=>{const per=[...((c.cfg&&c.cfg.periods)||DEFP())];if(per.length>=5)return c;const np={id:'p'+uid(),name:'Period '+(per.length+1),w:'0',base:'0'},i=per.length;per.push(np);return{...mapAll(c,s=>({...s,acts:{...(s.acts||{}),[np.id]:newActs(np,i)}})),cfg:{...(c.cfg||{}),periods:per}}});
 const delPeriod=i=>set(c=>{const per=[...((c.cfg&&c.cfg.periods)||DEFP())];if(per.length<=1)return c;const [gone]=per.splice(i,1);return{...mapAll(c,s=>{const a={...(s.acts||{})};delete a[gone.id];return{...s,acts:a}}),cfg:{...(c.cfg||{}),periods:per}}});
 const ords=['1st','2nd','3rd','4th','5th','6th'];
 const addYear=()=>set(c=>{const y=uid(),s=uid();return{...c,y,s,years:[...c.years,{id:y,name:(ords[c.years.length]||(c.years.length+1)+'th')+' Year',sems:[{id:s,name:'1st Semester',subs:[]}]}]}});
 const addSem=()=>set(c=>{const s=uid(),n=Y.sems.length;return{...c,s,years:c.years.map(y=>y.id!==Y.id?y:{...y,sems:[...y.sems,{id:s,name:(ords[n]||(n+1)+'th')+' Semester',subs:[]}]})}});
 const rename=(f,v)=>set(c=>({...c,years:c.years.map(y=>y.id!==Y.id?y:f==='y'?{...y,name:v}:{...y,sems:y.sems.map(x=>x.id!==S.id?x:{...x,name:v})})}),'rn'+f);
 const addSub=()=>{if(!nf.code.trim())return;const m=mk(nf.code.trim().toUpperCase(),nf.name.trim(),nf.units||'3','📘',P);upd(x=>({...x,subs:[...x.subs,m]}));setSid(m.id);setNf({code:'',name:'',units:'3'});setAdding(false)};
 const delSub=id=>upd(x=>({...x,subs:x.subs.filter(s=>s.id!==id)}));
 const clearScores=ids=>upd(x=>({...x,subs:x.subs.map(s=>!ids||ids.includes(s.id)?{...s,rel:{},acts:Object.fromEntries(Object.entries(s.acts||{}).map(([k,l])=>[k,l.map(a=>({...a,s:'',m:'',est:false}))]))}:s)}));
 const addGen=()=>{if(!gf.name.trim())return;upd(x=>({...x,gens:[...(x.gens||[]),{id:uid(),name:gf.name.trim(),units:gf.units||'3',pre:gf.pre,fin:'85'}]}));setGf({name:'',units:'3',pre:''});setGadd(false)};
 const setGen=(id,f,v)=>upd(x=>({...x,gens:(x.gens||[]).map(g=>g.id===id?{...g,[f]:v}:g)}),'g'+f+id);
 const delGen=id=>upd(x=>({...x,gens:(x.gens||[]).filter(g=>g.id!==id)}));
 const restoreLoser=()=>{try{set(()=>mig(JSON.parse(loser.d)))}catch(e){}onLoser()};
 const exportData=()=>{const d=JSON.stringify({app:'grades-tracker',version:3,account:acct.name,exported:new Date().toISOString(),data:ref.current},null,2),a=document.createElement('a');a.href=URL.createObjectURL(new Blob([d],{type:'application/json'}));a.download='grades-'+(acct.name||'backup').replace(/[^a-z0-9]+/gi,'-').toLowerCase()+'-'+new Date().toISOString().slice(0,10)+'.json';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),1500);setMsg('Backup downloaded ✓')};
 const importData=e=>{const f=e.target.files&&e.target.files[0];e.target.value='';if(!f)return;const r=new FileReader();r.onload=()=>{try{const j=JSON.parse(r.result),d=j&&j.data?j.data:j;if(!okState(d))throw new Error('bad');set(()=>mig(d));setMsg('Backup restored ✓ (Undo brings back your previous data)')}catch(x){setMsg('That file is not a valid backup.')}};r.onerror=()=>setMsg('Could not read that file.');r.readAsText(f)};

 /* ---- derived numbers ---- */
 const subs=S.subs,gens=S.gens||[],gps=gens.map(g=>gproj(g,P)),last0=P.length-1;
 const cur=subs.find(s=>s.id===sid)||subs[0],idx=cur?subs.indexOf(cur):-1,pcur=P.find(p=>p.id===pid)||P[0];
 const fsub=sub==='g'||P.some(p=>p.id===sub)?sub:P[0].id;
 const rowsS=subs.map(s=>{const pr=P.map(p=>pproj(s,p,0)),pg=pr.map(x=>x.proj),sem=wavg(pg,P);return{s,pr,pg,sem,eq:sem==null?null:eqv(sem),act:semActual(s,P)}});
 const all=[...rowsS.map(r=>({n:r.s.code,e:r.s.e||'📘',u:r.s.units,pg:r.pg,sem:r.sem,eq:r.eq,maj:1,pr:r.pg})),...gens.map((g,i)=>({n:g.name||'Gen Ed',e:'📗',u:g.units,pg:P.map((_,j)=>j===0?gps[i].pre:gps[i].fin),sem:gps[i].sem,eq:gps[i].eq,maj:0,gen:g}))];
 const units=subs.reduce((a,s)=>a+(+s.units||0),0),uAll=units+gens.reduce((a,g)=>a+(+g.units||0),0);
 const preRows=[...subs.filter(s=>pcalc(s,P[0]).complete).map(s=>[eqv(pcalc(s,P[0]).grade),s.units]),...gens.filter(g=>g.pre!==''&&g.pre!=null).map(g=>[eqv(+g.pre),g.units])];
 const preG=gwa(preRows),preN=preRows.length,finalG=gwa(all.map(r=>[r.eq,r.u])),finalN=rowsS.filter(r=>r.act!=null).length;
 const wl=(pg,F)=>wavg(pg.map((v,j)=>j===last0&&P.length>1?F:v),P);
 let fstar=null;if(all.length&&P.length>1)for(let i=0;i<=1000;i++){const F=i/10,g=gwa(all.map(r=>[eqv(wl(r.pg,F)),r.u]));if(g!=null&&C.meets(g)&&all.every(r=>wl(r.pg,F)>=C.pass-1e-9)){fstar=F;break}}
 const best=all.length&&P.length>1?gwa(all.map(r=>[eqv(wl(r.pg,100)),r.u])):finalG;
 const Ts=+tg.s||C.pass;
 const tFor=(s,i)=>{if(i===last0){const prj=P.map(p=>pproj(s,p,0).proj);return needIn(prj,P,i,Ts)}return +tg[P[i].id]||C.pass};

 /* ---- subject navigation: tab bar inside the card header, arrows, keyboard, swipe ---- */
 const goTo=i=>{if(i<0||i>=subs.length||i===idx)return;setDir(i>idx?1:-1);setSid(subs[i].id);setEdit(false);setRvMsg(null)};
 useEffect(()=>{if(!cur||(tab==='f'&&fsub==='g'))return;const el=document.getElementById('tab-'+cur.id);if(el&&el.scrollIntoView)try{el.scrollIntoView({inline:'center',block:'nearest',behavior:'smooth'})}catch(e){}},[cur&&cur.id,tab]);
 useEffect(()=>{if(tab==='f'&&fsub==='g')return;const k=e=>{if(/INPUT|TEXTAREA|SELECT/.test((e.target.tagName||'')))return;if(e.key==='ArrowRight')goTo(idx+1);if(e.key==='ArrowLeft')goTo(idx-1)};window.addEventListener('keydown',k);return()=>window.removeEventListener('keydown',k)});
 const onTS=e=>{if(e.target.closest&&e.target.closest('input,select,textarea,[data-noswipe]'))return;const t=e.touches[0];sw.current={on:true,x:t.clientX,y:t.clientY,lock:null,t:Date.now()}};
 const onTM=e=>{const s=sw.current;if(!s.on)return;const t=e.touches[0],dx=t.clientX-s.x,dy=t.clientY-s.y;if(!s.lock&&(Math.abs(dx)>10||Math.abs(dy)>10))s.lock=Math.abs(dx)>Math.abs(dy)*1.3?'x':'y';
  if(s.lock==='x'&&swRef.current){const el=swRef.current,edge=(dx>0&&idx===0)||(dx<0&&idx===subs.length-1);el.style.transition='none';el.style.transform='translateX('+(dx*(edge?.18:.55))+'px)';el.style.opacity=String(1-Math.min(Math.abs(dx)/520,.4))}};
 const onTE=e=>{const s=sw.current;if(!s.on)return;s.on=false;const el=swRef.current,t=e.changedTouches[0],dx=t.clientX-s.x,v=Math.abs(dx)/Math.max(1,Date.now()-s.t);
  if(el){el.style.transition='transform .4s cubic-bezier(.2,.8,.2,1),opacity .4s';el.style.transform='';el.style.opacity=''}
  if(s.lock==='x'&&(Math.abs(dx)>70||(v>.5&&Math.abs(dx)>30)))goTo(dx<0?idx+1:idx-1)};

 /* ---- share / export as image ---- */
 const exportImage=async()=>{
  try{await document.fonts.load('800 40px "Plus Jakarta Sans"')}catch(e){}
  const rs=getComputedStyle(document.documentElement),col=(n,a)=>{const t=rs.getPropertyValue(n).trim().split(/\s+/);return`rgba(${t[0]},${t[1]},${t[2]},${a==null?1:a})`};
  const rows=rowsS.map(r=>({code:r.s.code,pg:P.map(p=>{const c=pcalc(r.s,p);return c.grade==null?'—':f2(c.grade)}),s:r.act==null?'—':f2(r.act),g:r.act==null?null:eqv(r.act)}));
  const W=1080,pad=84,rh=88,H=pad+640+rows.length*rh+170,ff='"Plus Jakarta Sans",system-ui,-apple-system,"Segoe UI",sans-serif';
  const c=document.createElement('canvas');c.width=W;c.height=H;const x=c.getContext('2d');
  const rr=(a,b,w,h,r,f)=>{x.beginPath();x.roundRect?x.roundRect(a,b,w,h,r):x.rect(a,b,w,h);x.fillStyle=f;x.fill()};
  x.fillStyle=col('--bg');x.fillRect(0,0,W,H);
  const gl=x.createRadialGradient(120,0,0,120,0,720);gl.addColorStop(0,col('--accent',.28));gl.addColorStop(1,col('--accent',0));x.fillStyle=gl;x.fillRect(0,0,W,H);
  rr(pad,pad,150,14,7,col('--accent'));
  x.fillStyle=col('--muted');x.font='700 26px '+ff;x.fillText('GRADES SUMMARY',pad,pad+70);
  x.fillStyle=col('--ink');x.font='800 58px '+ff;x.fillText(acct.name,pad,pad+144);
  x.fillStyle=col('--muted');x.font='500 28px '+ff;x.fillText(Y.name+' · '+S.name,pad,pad+192);
  const gy=pad+360,cx3=[pad,pad+330,pad+660],labs=['CURRENT '+P[0].name.toUpperCase()+' GWA','FINAL / PROJECTED GWA','DEAN’S LIST TARGET'],vals=[fg(preG),fg(finalG),fg(C.target)];
  x.font='700 20px '+ff;x.fillStyle=col('--muted');labs.forEach((l,i)=>x.fillText(l,cx3[i],gy-100));
  x.font='900 92px '+ff;vals.forEach((v,i)=>{x.fillStyle=i===1&&finalG!=null&&C.meets(finalG)?col('--good'):col('--ink');x.fillText(v,cx3[i],gy)});
  x.font='500 28px '+ff;x.fillStyle=col('--muted');x.fillText(finalG==null?'Waiting for grades':C.meets(finalG)?'On track for the Dean’s List':'Not there yet',pad,gy+64);x.fillText('target is '+fg(C.target)+' or better · highest grade '+fg(C.hi),pad,gy+104);
  let y=gy+190;x.font='700 22px '+ff;x.fillStyle=col('--muted');
  const n=P.length,span=W-pad*2-300,colx=[...P.map((_,i)=>pad+300+span*(i+1)/(n+2)),pad+300+span*(n+1)/(n+2),W-pad];
  x.textAlign='left';x.fillText('SUBJECT',pad,y);x.textAlign='right';[...P.map(p=>p.name.toUpperCase().slice(0,9)),'SEM.','GRADE'].forEach((t,i)=>x.fillText(t,colx[i],y));x.textAlign='left';
  y+=22;rows.forEach(r=>{x.fillStyle=col('--line');x.fillRect(pad,y,W-pad*2,2);y+=rh-26;x.font='800 32px '+ff;x.fillStyle=col('--ink');x.fillText(r.code,pad,y);
   x.textAlign='right';x.font='600 28px '+ff;x.fillStyle=col('--muted');r.pg.forEach((t,i)=>x.fillText(t,colx[i],y));x.fillStyle=col('--ink');x.fillText(r.s,colx[n],y);
   x.font='900 34px '+ff;x.fillStyle=r.g!=null&&C.meets(r.g)?col('--good'):r.g!=null&&C.bad(r.g)?col('--bad'):col('--ink');x.fillText(fg(r.g),W-pad,y);x.textAlign='left';y+=26});
  x.fillStyle=col('--line');x.fillRect(pad,y,W-pad*2,2);
  x.font='500 24px '+ff;x.fillStyle=col('--muted');x.fillText(new Date().toLocaleDateString(undefined,{year:'numeric',month:'long',day:'numeric'})+' · Grades Tracker & Forecaster',pad,H-pad);
  const blob=await new Promise(r=>c.toBlob(r,'image/png'));if(!blob){setMsg('Could not create the image.');return}
  const file=new File([blob],'grades-summary.png',{type:'image/png'});
  try{if(navigator.canShare&&navigator.canShare({files:[file]})){await navigator.share({files:[file],title:'Grades summary'});return}}catch(e){if(e&&e.name==='AbortError')return}
  const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='grades-summary.png';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),1500);setMsg('Image saved ✓');
 };

 /* ---- header, summary, banners ---- */
 const Header=()=><header className="sticky z-30 -mx-4 border-b border-line/60 bg-bg/75 px-4 py-2.5 backdrop-blur-xl sm:-mx-8 sm:px-8 sm:py-3" style={{top:'env(safe-area-inset-top,0px)'}}>
  <div className="mx-auto flex max-w-[1200px] flex-wrap items-center gap-2 sm:gap-3">
   <button onClick={onSwitch} className={BTNP+' !px-3.5'} aria-label="Back to Home"><span className="text-base leading-none">←</span> Back to Home</button>
   <div className="flex items-center gap-2.5 pl-1"><Avatar a={acct} s="h-9 w-9" t="text-xl"/><span className="hidden max-w-[9rem] truncate text-sm font-extrabold sm:block">{acct.name}</span></div>
   <div className="mr-auto flex flex-col items-start leading-tight">
    <button onClick={cloud.sync} disabled={!cloud.on} className={cx('inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold transition',cloud.on?'border-line hover:bg-surface2':'border-transparent text-muted')}>{cloud.label}</button>
    {cloud.on&&<span className="mt-0.5 pl-1 text-[11px] text-muted">Last synced {rel(cloud.at)}{cloud.pending?' · changes waiting':''}</span>}
   </div>
   <button className={BTN} onClick={undo} disabled={!past.current.length} aria-label="Undo">↶ <span className="hidden sm:inline">Undo</span></button>
   <button className={BTN} onClick={redo} disabled={!fut.current.length} aria-label="Redo">↷ <span className="hidden sm:inline">Redo</span></button>
   <button className={BTN} onClick={()=>setSx(true)}>⚙ <span className="hidden sm:inline">Settings</span></button>
  </div></header>;

 const Summary=()=>{const ok=C.meets(finalG);return <div className="flex flex-col gap-3 sm:gap-5">
  <div className="grid grid-cols-3 gap-3 px-1 sm:gap-8">
   <div className="min-w-0"><div className={LBL2}>Current {P[0].name} GWA</div><div className="mt-1 text-3xl font-black tabular-nums tracking-tight sm:text-6xl">{fg(preG)}</div><div className="mt-1 hidden text-sm text-muted sm:block">{preN?`${preN} of ${subs.length+gens.length} have a ${P[0].name.toLowerCase()} grade`:'Complete a '+P[0].name.toLowerCase()+' to see it'}</div></div>
   <div className="min-w-0"><div className={LBL2}>Final / Projected GWA</div><div className={cx('mt-1 text-3xl font-black tabular-nums tracking-tight sm:text-6xl',ok&&'text-good')}>{fg(finalG)}</div><div className="mt-1 hidden text-sm text-muted sm:block">{finalN} final · {subs.length-finalN+gens.length} projected</div></div>
   <div className="min-w-0"><div className={LBL2}>Dean’s List target</div><div className="mt-1 text-3xl font-black tabular-nums tracking-tight sm:text-6xl">{fg(C.target)}</div><div className="mt-1 hidden text-sm text-muted sm:block">or better · highest grade {fg(C.hi)}</div></div></div>
  <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-1"><span className="text-base font-extrabold sm:text-xl">{finalG==null?'Waiting for grades':ok?'On track for the Dean’s List':'Not there yet'}</span><span className="text-xs text-muted sm:text-sm">{finalG==null?'':ok?'The projection meets your target':fg(Math.abs(finalG-C.target))+' away from the target'}</span><button onClick={exportImage} className={BTN+' sm:ml-auto'}>📤 Share / export as image</button></div></div>};

 const Banners=()=><>
  {loser&&<div className="anim-rise flex flex-wrap items-center gap-3 rounded-2xl border border-line bg-surface2/80 p-3 text-sm"><span className="min-w-[14rem] flex-1 font-semibold">Edits from two devices clashed. The newest version was kept.</span><button className={BTN} onClick={restoreLoser}>Restore the other version</button><button className={BTN} onClick={onLoser}>Dismiss</button></div>}
  {guest&&<div className="anim-rise flex flex-wrap items-center gap-3 rounded-2xl border border-accent/40 bg-accent/15 p-3 text-sm"><span className="font-semibold">Guest mode: nothing is saved when you leave.</span><input value={kn} onChange={e=>setKn(e.target.value)} placeholder="Account name" className={cx(INP,'h-10 w-44 !text-left px-3')}/><button className={BTNP} onClick={()=>kn.trim()&&onKeep(kn.trim())}>Save as account</button></div>}
  {msg&&<div className="anim-rise flex items-center justify-between gap-3 rounded-2xl border border-line bg-surface2/80 px-4 py-2 text-sm font-semibold">{msg}<button className="text-muted" onClick={()=>setMsg('')}>✕</button></div>}</>;

 /* ---- ONE subject card: tab bar lives in the card header, the card swipes ---- */
 const CardTabs=()=><div data-noswipe className="flex items-center gap-2 border-b border-line/60 bg-surface2/60 px-3 py-2">
  <div className="min-w-0 flex-1 overflow-x-auto" style={{scrollbarWidth:'none'}}><div className="flex w-max gap-1.5">
   {subs.map(s=><button key={s.id} id={'tab-'+s.id} onClick={()=>goTo(subs.indexOf(s))} className={cx('flex shrink-0 items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-bold transition-all duration-300 sm:text-sm',cur&&cur.id===s.id?'border-accent bg-accent text-accent-ink shadow-sm':'border-transparent text-muted hover:bg-surface hover:text-ink')}><span>{s.e||'📘'}</span>{s.code||'Subject'}</button>)}
   <button onClick={()=>setAdding(true)} className="shrink-0 rounded-xl border border-dashed border-accent/60 px-3 py-1.5 text-xs font-bold text-accent-text transition hover:bg-accent/10 sm:text-sm" aria-label="Add subject">＋</button></div></div>
  {subs.length>1&&<div className="flex shrink-0 items-center gap-1"><button className="hidden h-8 w-8 rounded-lg text-lg text-muted transition hover:bg-surface hover:text-ink disabled:opacity-30 sm:block" onClick={()=>goTo(idx-1)} disabled={idx<=0} aria-label="Previous subject">‹</button><span className="w-9 text-center text-[11px] font-bold tabular-nums text-muted">{idx+1}/{subs.length}</span><button className="hidden h-8 w-8 rounded-lg text-lg text-muted transition hover:bg-surface hover:text-ink disabled:opacity-30 sm:block" onClick={()=>goTo(idx+1)} disabled={idx>=subs.length-1} aria-label="Next subject">›</button></div>}</div>;
 const Shell=body=><div onTouchStart={onTS} onTouchMove={onTM} onTouchEnd={onTE} onTouchCancel={onTE} style={{touchAction:'pan-y'}}>
  <div ref={swRef} className="will-change-transform"><section className={cx(CARD,'sa-'+(idx%6),'overflow-hidden')}>{CardTabs()}
   <div key={cur.id} className={cx('flex flex-col gap-3 p-3.5 sm:gap-5 sm:p-6',dir>0?'slide-r':'slide-l')}>{body}</div></section></div>
  {subs.length>1&&<p className="mt-2 text-center text-[11px] text-muted sm:hidden">Swipe the card left or right to change subject</p>}</div>;

 /* ---- tracker body ---- */
 const BaseChips=(s,p)=>{const o=s.base&&s.base[p.id],has=o!==undefined&&o!=='',b=baseOf(s,p);return <div className="flex flex-wrap items-center gap-1.5 text-xs font-semibold"><span className="text-sm font-bold">Base</span>
  <button onClick={()=>setBase(s.id,p.id,'')} className={cx('rounded-full px-3 py-1.5 transition',!has?'bg-accent text-accent-ink':'bg-surface2 hover:bg-line/60')}>Default ({f2(p.base)})</button>
  {[0,20,50].map(x=><button key={x} onClick={()=>setBase(s.id,p.id,String(x))} className={cx('rounded-full px-3 py-1.5 transition',has&&b===x?'bg-accent text-accent-ink':'bg-surface2 hover:bg-line/60')}>{x}</button>)}
  <Num v={has?o:''} on={v=>setBase(s.id,p.id,v)} ph="other" w="w-16"/></div>};
 const Reverse=(s,p)=>{const k=s.id+p.id,m=rvMsg&&rvMsg.k===k?rvMsg:null,hasEst=actsOf(s,p).some(a=>a.est);return <div className="flex flex-col gap-2 rounded-xl border border-dashed border-line p-3">
  <div className="text-sm font-bold">Reverse calculator <span className="text-xs font-semibold text-muted">for {p.name}</span></div>
  <p className="text-xs text-muted">Know the released {p.name.toLowerCase()} grade but not the scores? Enter it and the blank scores are worked out through the Base formula.</p>
  <div className="flex flex-wrap items-center gap-2"><Num v={s.rel&&s.rel[p.id]} on={v=>setRel(s.id,p.id,v)} ph={'released '+p.name.toLowerCase()+' grade'} w="w-44"/><button className={BTNP} onClick={()=>rvFill(s,p)}>Fill possible scores</button>{hasEst&&<button className={BTN} onClick={()=>rvClear(s,p)}>Clear possible scores</button>}</div>
  {m&&<p className={cx('text-xs font-semibold',m.bad?'text-bad':'text-good')}>{m.msg}</p>}</div>};
 const PeriodBlock=(s,p)=>{const c=pcalc(s,p),acts=c.acts,R=c.raw!=null?c.raw:c.soFar,Tg=c.raw!=null?c.grade:c.gradeSoFar,wsum=acts.reduce((t,a)=>t+wgt(a),0);
  return <div className="flex flex-col gap-3 rounded-2xl border border-line/60 bg-surface2/60 p-3 sm:p-4">
   <div className="flex flex-wrap items-center justify-between gap-2"><h4 className="font-bold">{p.name} <span className="ml-1 text-xs font-semibold text-muted">{f2(p.w)}% of semestral</span></h4><button className={BTN} onClick={()=>setEdit(!edit)}>{edit?'✓ Done':'✎ Edit activities'}</button></div>
   {!acts.length&&<p className="text-sm text-muted">No activities yet. Add one below.</p>}
   <div className="flex flex-col gap-2.5 sm:gap-3">{acts.map(a=>{const x=ap(a);return edit
    ?<div key={a.id} className="flex items-center gap-2"><input value={a.name} onChange={e=>setAct(s.id,p.id,a.id,'name',e.target.value)} className={cx(INP,'h-11 min-w-0 flex-1 !text-left px-3 !text-sm')} placeholder="Activity name"/><Num v={a.w} on={v=>setAct(s.id,p.id,a.id,'w',v)} ph="wt" w="w-[4.5rem]"/><span className="text-muted">%</span><button className={BTNX+' !px-2.5'} onClick={()=>delAct(s.id,p.id,a.id)} aria-label="Remove activity">✕</button></div>
    :<div key={a.id} className="flex items-center gap-2 sm:gap-3"><div className="min-w-0 flex-1"><div className="truncate text-sm font-semibold">{a.name||'Activity'}</div><div className="text-xs text-muted">{f2(wgt(a))}% · {x==null?'not entered':f2(x)+'%'}</div>{a.est&&<span className="mt-0.5 inline-block rounded-full bg-accent/25 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-accent-text">Possible score</span>}</div>
     <Num nav v={a.s} on={v=>setAct(s.id,p.id,a.id,'s',v)} ph="score" bad={x!=null&&x>100} w={cx('w-[4.5rem] sm:w-20',a.est&&'!border-accent/60 !italic')}/><span className="text-muted">/</span><Num v={a.m} on={v=>setAct(s.id,p.id,a.id,'m',v)} ph="100" w="w-14 sm:w-16"/></div>})}</div>
   <button className={BTNP+' self-start'} onClick={()=>{addAct(s.id,p.id);setEdit(true)}}>＋ Add Extra Activity</button>
   {acts.length>0&&<p className={cx('text-xs',Math.abs(wsum-100)>.005?'text-bad':'text-muted')}>Weights total {f2(wsum)}%{Math.abs(wsum-100)>.005?' · the grade is scaled to 100%':''}</p>}
   {BaseChips(s,p)}
   <div className="grid grid-cols-3 gap-2 rounded-xl bg-surface/70 p-2.5 text-center sm:p-3">
    <div><div className="text-[10px] font-bold uppercase tracking-wider text-muted">Raw{c.raw==null&&R!=null?' so far':''}</div><div className="text-base font-black tabular-nums sm:text-lg">{R==null?'—':f2(R)}</div></div>
    <div><div className="text-[10px] font-bold uppercase tracking-wider text-muted">Base</div><div className="text-base font-black tabular-nums sm:text-lg">{f2(c.B)}</div></div>
    <div><div className="text-[10px] font-bold uppercase tracking-wider text-muted">{p.name} grade</div><div className="text-base font-black tabular-nums sm:text-lg">{Tg==null?'—':f2(Tg)}</div></div></div>
   {R!=null&&<p className="text-xs text-muted">({f2(R)} ÷ 100) × (100 − {f2(c.B)}) + {f2(c.B)} = <b className="text-ink">{f2(trans(R,c.B))}</b>{c.raw==null?' (partial: finish every activity for the final grade)':''}</p>}
   {Reverse(s,p)}</div>};
 const TrackerBody=()=>{const s=cur,sem=semActual(s,P),eq=sem==null?null:eqv(sem);return <>
  <div className="flex items-center gap-2.5 sm:gap-3"><span className="h-10 w-1.5 shrink-0 rounded-full bg-sa"/><span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-sa/15 text-xl sm:h-12 sm:w-12 sm:text-2xl">{s.e||'📘'}</span>
   <div className="min-w-0 flex-1"><Txt v={s.code} on={v=>setF(s.id,'code',v.toUpperCase())} cls="w-full text-lg font-extrabold sm:text-xl"/><Txt v={s.name} on={v=>setF(s.id,'name',v)} cls="-mt-1 w-full text-sm text-muted"/></div>
   <label className="text-center text-[11px] font-semibold text-muted sm:text-xs">Units<Num v={s.units} on={v=>setF(s.id,'units',v)} w="w-14 sm:w-16"/></label></div>
  <Seg v={pcur.id} on={x=>{setPid(x);setEdit(false)}} opts={P.map(p=>[p.id,p.name])} cls="w-full"/>
  {PeriodBlock(s,pcur)}
  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">{P.map(p=>{const c=pcalc(s,p);return <span key={p.id}>{p.name} <b className="text-ink">{c.grade!=null?f2(c.grade):c.gradeSoFar!=null?f2(c.gradeSoFar)+'*':'—'}</b></span>})}<span>* so far</span></div>
  <AccentBox l="Semestral grade" v={sem==null?'—':f2(sem)} rl="Grade" r={fg(eq)} foot={sem==null?'Complete every period':sem>=C.pass?'Passing ✓':'Below '+C.pass}/>
  <div className="flex gap-2"><button className={BTN+' flex-1'} onClick={()=>clearScores([s.id])}>Clear scores</button><button className={BTNX+' flex-1'} onClick={()=>delSub(s.id)}>Delete subject</button></div></>};
 const EmptyCard=()=><div className={cx(CARD,'flex flex-col items-center gap-3 p-8 text-center')}><div className="text-4xl">📚</div><p className="font-bold">No subjects yet</p><button className={BTNP} onClick={()=>setAdding(true)}>＋ Add your first subject</button></div>;
 const TrackerView=()=><>{Summary()}{subs.length?Shell(TrackerBody()):EmptyCard()}</>;

 /* ---- forecaster (also one subject card at a time) ---- */
 const setMissing=pidv=>upd(x=>({...x,subs:x.subs.map(s=>{const pi=P.findIndex(p=>p.id===pidv),T=tFor(s,pi);if(T==null)return s;const r=pproj(s,P[pi],T),wi={...(s.wi||{})};r.miss.forEach(a=>{wi[a.id]=String(r.uni<=0?0:Math.min(100,Math.ceil(r.uni)))});return{...s,wi}})}));
 const setMax=pidv=>upd(x=>({...x,subs:x.subs.map(s=>{const p=P.find(q=>q.id===pidv),wi={...(s.wi||{})};pcalc(s,p).live.forEach(a=>{if(ap(a)==null)wi[a.id]='100'});return{...s,wi}})}));
 const ForecastBody=pi=>{const s=cur,p=P[pi],prj=P.map(q=>pproj(s,q,0)),T=tFor(s,pi),r=pproj(s,p,T),sem=wavg(prj.map(x=>x.proj),P),met=T!=null&&r.proj!=null&&r.proj>=T-1e-9,B=r.B;
  let hint;if(!r.live.length)hint='No activities';else if(!r.miss.length)hint='All scores are in';else if(r.miss.length===1)hint='Need '+need(r.alone[0][1])[0]+' on '+r.miss[0].name;else hint='Need '+need(r.uni)[0]+' on each of '+r.miss.length+' scores';
  return <>
   <div className="flex items-center gap-2.5 sm:gap-3"><span className="h-10 w-1.5 shrink-0 rounded-full bg-sa"/><span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-sa/15 text-xl sm:h-12 sm:w-12 sm:text-2xl">{s.e||'📘'}</span>
    <div className="min-w-0 flex-1"><div className="truncate text-lg font-extrabold sm:text-xl">{s.code}</div><div className="truncate text-sm text-muted">{hint}</div></div>
    <div className="text-right"><div className="text-[10px] font-bold uppercase tracking-wider text-muted">Projected</div><div className={cx('text-xl font-black tabular-nums',met?'text-good':'text-ink')}>{r.proj==null?'—':f2(r.proj)}</div></div></div>
   <div className="rounded-2xl border border-line/60 bg-surface2/60 p-3 text-sm">
    <div>{p.name} grade needed: <b className={T!=null&&T>100?'text-bad':''}>{T==null?'—':T<=0?'Secured ✓':T>100?'Out of reach ('+f2(T)+')':f2(T)}</b>{T!=null&&T>0&&T<=100&&<span className="text-muted"> · Base {f2(B)} means a raw grade of {f2(Math.max(0,r.Rneed))}</span>}</div>
    {P.map((q,j)=>j===pi?null:<div key={q.id} className="text-muted">{q.name}: <b className="text-ink">{prj[j].proj==null?'—':f2(prj[j].proj)}</b> ({prj[j].complete?'actual':'projected'})</div>)}
    {pi===last0&&P.length>1&&<div className="mt-1 text-xs text-muted">Aiming for a semestral grade of {f2(Ts)}.</div>}</div>
   {r.miss.length>1&&<Tile l={`Same % on all ${r.miss.length} missing`} v={need(r.uni)[0]} bad={need(r.uni)[1]}/>}
   <div className="flex flex-col gap-2.5 sm:gap-3">{r.acts.filter(a=>wgt(a)>0).map(a=>{const x=ap(a);if(x!=null)return <div key={a.id} className="flex items-center justify-between rounded-2xl bg-surface2/50 px-4 py-2.5 text-sm"><span className="font-semibold">{a.name} <span className="font-normal text-muted">{f2(wgt(a))}%</span></span><span className="font-bold">✓ {f2(x)}%{a.est&&<span className="ml-1 text-[10px] font-bold uppercase text-accent-text">possible</span>}</span></div>;
    const v=r.alone.find(z=>z[0]===a.id)[1],[t,bad]=need(v),m=mxs(a);
    return <div key={a.id} className="flex flex-col gap-2 rounded-2xl border border-line/60 bg-surface2/60 p-3 sm:p-4">
     <div className="flex items-center justify-between"><span className="font-bold">{a.name} <span className="text-xs font-semibold text-muted">{f2(wgt(a))}%</span></span><span className="rounded-full bg-accent/25 px-2 py-0.5 text-xs font-bold">Not yet</span></div>
     <div><span className="text-xs text-muted">Score needed{r.miss.length>1?' (others at their sliders)':''}:</span><div className={cx('text-xl font-extrabold',bad?'text-bad':'text-ink')}>{t}{v>0&&v<=100&&<span className="text-sm font-semibold text-muted"> ≈ {f2(v/100*m)}/{m}</span>}</div></div>
     <div className="flex items-center gap-3"><span className="w-16 text-xs font-semibold">If I score</span><input type="range" min="0" max="100" step="1" value={Math.min(100,+wiv(s,a)||0)} onChange={e=>setWi(s.id,a.id,e.target.value)} className="min-w-0 flex-1"/><Num v={wiv(s,a)} on={v=>setWi(s.id,a.id,v)} w="w-16"/></div></div>})}</div>
   <AccentBox l={`Projected ${p.name.toLowerCase()} grade`} v={r.proj==null?'—':f2(r.proj)} rl={T==null?'':'vs target'} r={T==null?'—':f2(Math.max(0,T))} foot={T==null?'':met?'Meets target ✓':'Short by '+f2(T-(r.proj||0))}/>
   {P.length>1&&<AccentBox l="Projected semestral" v={sem==null?'—':f2(sem)} rl="Grade" r={sem==null?'—':fg(eqv(sem))} foot={sem==null?'':sem>=C.pass?'Passing ✓':'Below '+C.pass}/>}</>};
 const gridC={gridTemplateColumns:'1.5fr repeat('+(P.length+2)+',1fr)'};
 const GradesTable=()=><div className={cx(CARD,'flex flex-col gap-2 p-3.5 sm:p-6')}>
  <div className="mb-1"><div className="font-extrabold">Projected grades</div><div className="text-xs text-muted">{all.length} subjects · GWA {fg(finalG)}</div></div>
  <div className="grid gap-2 text-xs font-bold text-muted" style={gridC}><span>Subject</span>{P.map(p=><span key={p.id} className="truncate text-right">{p.name}</span>)}<span className="text-right">Sem.</span><span className="text-right">Grade</span></div>
  {all.map((r,i)=><div key={i} className="grid items-center gap-2 border-t border-line/60 pt-2.5 text-sm" style={gridC}><div className="min-w-0"><div className="truncate font-extrabold">{r.e} {r.n}</div><div className="text-xs text-muted">{r.u} units{r.sem!=null&&r.sem<C.pass&&<span className="font-semibold text-bad"> · {r.maj?'debarment risk':'failing'}</span>}</div></div>{r.pg.map((v,j)=><span key={j} className="text-right tabular-nums">{v==null?'—':f2(v)}</span>)}<span className={cx('text-right font-bold tabular-nums',r.sem!=null&&r.sem<C.pass&&'text-bad')}>{r.sem==null?'—':f2(r.sem)}</span><span className={cx('text-right font-extrabold tabular-nums',tone(r.eq))}>{fg(r.eq)}</span></div>)}
  <div className="flex justify-between border-t-2 border-line pt-3 font-extrabold"><span>Final / Projected GWA</span><span className={cx('tot tabular-nums',tone(finalG))}>{fg(finalG)}</span></div>
  <p className="text-xs text-muted">Highest grade is {fg(C.hi)}. Majors must stay at {C.pass} or above or you risk debarment.</p>
  <div className="flex flex-wrap gap-1.5 text-xs">{C.table?<>{C.table.map(([t,v])=><span key={t} className="rounded-full bg-surface2 px-2.5 py-1 font-semibold">{t}+ → {fg(v)}</span>)}<span className="rounded-full bg-bad/15 px-2.5 py-1 font-semibold text-bad">below {C.table[C.table.length-1][0]} → {fg(C.fail)}</span></>:<span className="rounded-full bg-surface2 px-2.5 py-1 font-semibold">Grade equals the percentage</span>}</div></div>;
 const GenEds=()=><div className={cx(CARD,'flex flex-col gap-3 p-3.5 sm:p-6')}>
  <div className="flex items-start justify-between gap-3"><div><div className="font-extrabold">📗 Gen Eds</div><div className="text-xs text-muted">Name, units and {P[0].name.toLowerCase()} grade. Then set what you expect for the rest.</div></div>{!gadd&&<button className={BTNP} onClick={()=>setGadd(true)}>＋ Add</button>}</div>
  {gadd&&<div className="grid items-end gap-3 sm:grid-cols-[2fr_1fr_1fr_auto]"><label className="text-sm font-semibold">Name<TextIn v={gf.name} on={v=>setGf({...gf,name:v})} ph="e.g. Ethics" cls="mt-1"/></label><label className="text-sm font-semibold">Units<Num v={gf.units} on={v=>setGf({...gf,units:v})} w="w-full"/></label><label className="text-sm font-semibold">{P[0].name} grade<Num v={gf.pre} on={v=>setGf({...gf,pre:v})} w="w-full"/></label><div className="flex gap-2"><button className={BTNP} onClick={addGen}>Add</button><button className={BTN} onClick={()=>setGadd(false)}>Cancel</button></div></div>}
  {!gens.length&&!gadd&&<p className="text-sm text-muted">No gen eds yet.</p>}
  {gens.map((g,i)=><div key={g.id} className="flex flex-col gap-2.5 rounded-2xl border border-line/60 bg-surface2/50 p-3">
   <div className="flex flex-wrap items-center gap-2"><Txt v={g.name} on={v=>setGen(g.id,'name',v)} cls="min-w-[7rem] flex-1 font-bold"/><label className="text-center text-[11px] font-semibold text-muted">Units<Num v={g.units} on={v=>setGen(g.id,'units',v)} w="w-14"/></label><label className="text-center text-[11px] font-semibold text-muted">{P[0].name}<Num v={g.pre} on={v=>setGen(g.id,'pre',v)} w="w-[4.5rem]"/></label><button className={BTNX+' !px-2.5'} onClick={()=>delGen(g.id)} aria-label="Delete gen ed">✕</button></div>
   {P.length>1&&<div className="flex items-center gap-3"><span className="w-24 text-xs font-semibold">Expected {P.length===2?P[1].name.toLowerCase():'rest'}</span><input type="range" min="0" max="100" step="1" value={Math.min(100,+g.fin||0)} onChange={e=>setGen(g.id,'fin',e.target.value)} className="min-w-0 flex-1"/><Num v={g.fin} on={v=>setGen(g.id,'fin',v)} w="w-16"/></div>}
   <div className="flex justify-between text-sm"><span>Projected semestral <b>{f2(gps[i].sem)}</b></span><span>Grade <b className={tone(gps[i].eq)}>{fg(gps[i].eq)}</b></span></div></div>)}</div>;
 const Planner=()=><div className={cx(CARD,'flex flex-col gap-3 p-3.5 sm:p-6')}>
  <div><div className="font-extrabold">🎓 Dean’s List planner</div><div className="text-xs text-muted">{P[last0].name} grade needed per subject for {fg(C.target)}</div></div>
  <div className="grid gap-2 sm:grid-cols-3 sm:gap-3">
   <Tile l={`Best possible GWA (100 in every ${P[last0].name.toLowerCase()})`} v={fg(best)} sub={best==null?null:C.meets(best)?'Dean’s List is still possible':'Dean’s List is out of reach'}/>
   <Tile l={`Same ${P[last0].name.toLowerCase()} grade in every subject`} v={P.length<2?'—':fstar==null?'Not possible':f2(fstar)} sub={`Lowest equal grade that still reaches ${fg(C.target)}`}/>
   <Tile l="Passing mark" v={String(C.pass)} sub="Majors below this risk debarment"/></div>
  <div className="grid gap-2 text-xs font-bold text-muted" style={{gridTemplateColumns:'1.4fr repeat(3,1fr)'}}><span>Subject</span><span className="text-right">{P[0].name}</span><span className="text-right">{P[last0].name} to pass ({C.pass})</span><span className="text-right">{P[last0].name} for {fg(C.target)} ({f2(C.need)})</span></div>
  {all.map((r,i)=>{const a=r.maj?needIn(r.pr,P,last0,C.pass):needGen(r.gen,P,C.pass),b=r.maj?needIn(r.pr,P,last0,C.need):needGen(r.gen,P,C.need);return <div key={i} className="grid items-center gap-2 border-t border-line/60 pt-2.5 text-sm" style={{gridTemplateColumns:'1.4fr repeat(3,1fr)'}}><span className="truncate font-extrabold">{r.e} {r.n}</span><span className="text-right tabular-nums">{r.pg[0]==null?'—':f2(r.pg[0])}</span><span className={cx('text-right font-bold',a>100&&'text-bad')}>{ng(a)}</span><span className={cx('text-right font-extrabold',b>100?'text-bad':'text-good')}>{ng(b)}</span></div>})}
  <p className="text-xs text-muted">The last column assumes each subject lands exactly on {f2(C.need)}. A strong subject can offset a weaker one, so watch the projected GWA at the top as you move the sliders.</p></div>;
 const GwaView=()=><div className="flex flex-col gap-4"><Seg v={gv} on={setGv} opts={[['grades','Grades'],['gens','Gen Eds'],['plan','Planner']]} cls="w-full sm:w-auto sm:self-start"/>{gv==='grades'?GradesTable():gv==='gens'?GenEds():Planner()}</div>;
 const ForecastView=()=>{const pi=P.findIndex(p=>p.id===fsub);return <>
  {Summary()}
  <div className="flex flex-wrap items-center gap-2 sm:gap-3">
   <Seg v={fsub} on={setSub} opts={[...P.map(p=>[p.id,p.name]),['g','GWA']]} cls="w-full sm:w-auto"/>
   {fsub!=='g'&&pi<last0&&<label className="flex items-center gap-2 text-sm font-semibold">{P[pi].name} target<Num v={tg[fsub]} on={v=>setTg(fsub,v)} ph={String(C.pass)} w="w-20"/></label>}
   {fsub!=='g'&&pi===last0&&<label className="flex items-center gap-2 text-sm font-semibold">Semestral target<Num v={tg.s} on={v=>setTg('s',v)} ph={String(C.pass)} w="w-20"/></label>}
   {fsub!=='g'&&<div className="flex gap-2"><button className={BTN} onClick={()=>setMissing(fsub)}>🎯 Set missing to needed</button><button className={BTN} onClick={()=>setMax(fsub)}>💯 Max</button></div>}</div>
  {fsub==='g'?GwaView():subs.length?Shell(ForecastBody(pi)):EmptyCard()}</>};

 /* ---- settings sheet ---- */
 const Settings=()=>{
  const raw=(st.cfg&&st.cfg.table&&st.cfg.table.length)?st.cfg.table:(C.id==='pct'?[]:PRESETS[C.id].table);
  const str=()=>raw.map(r=>[String(r[0]),String(r[1])]);
  const setRow=(i,j,v)=>{const t=str();t[i][j]=v;setCfg({table:t},'tbl'+i+j)};
  const rp=rawP(),tw=P.reduce((a,p)=>a+p.w,0);
  return <>
   <section className="flex flex-col gap-3"><h3 className={LBL}>Appearance</h3><ThemePicker theme={theme} setTheme={setTheme}/></section>
   <section className="flex flex-col gap-3"><h3 className={LBL}>Grading periods</h3>
    {rp.map((p,i)=><div key={p.id} className="flex flex-wrap items-center gap-2 rounded-2xl border border-line/60 bg-surface2/60 p-3">
     <TextIn v={p.name} on={v=>setPeriod(i,{name:v})} ph="Period name" cls="min-w-[8rem] flex-1"/>
     <label className="flex items-center gap-1 text-xs font-semibold text-muted">Weight<Num v={p.w} on={v=>setPeriod(i,{w:v})} w="w-[4.5rem]"/>%</label>
     <label className="flex items-center gap-1 text-xs font-semibold text-muted">Base<Num v={p.base} on={v=>setPeriod(i,{base:v})} w="w-[4.5rem]"/></label>
     {rp.length>1&&<button className={BTNX+' !px-2.5'} onClick={()=>delPeriod(i)} aria-label="Remove period">✕</button>}</div>)}
    <div className="flex flex-wrap items-center gap-2"><button className={BTN} onClick={addPeriod} disabled={rp.length>=5}>＋ Add period</button>{rp.length===2&&<><button className={BTN} onClick={()=>setWeights([40,60])}>40 / 60</button><button className={BTN} onClick={()=>setWeights([50,50])}>50 / 50</button></>}<span className={cx('text-xs font-semibold',Math.abs(tw-100)>.005?'text-bad':'text-muted')}>Weights total {f2(tw)}%{Math.abs(tw-100)>.005?' (scaled to 100%)':''}</span></div>
    <p className="text-xs text-muted">Each period has its own activities and a Base. Transmuted grade = (Raw ÷ 100) × (100 − Base) + Base. The Base here is the default; any subject can override it.</p></section>
   <section className="flex flex-col gap-4"><h3 className={LBL}>Highest possible grade</h3>
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
    <div className="flex flex-wrap gap-2"><button className={BTN} onClick={()=>clearScores()}>Clear all scores here</button><button className={BTNX} onClick={()=>set(()=>({...seed(rawP()),cfg:st.cfg}))}>Reset to the 5 majors</button>
     {CAN_FILE&&<><button className={BTN} onClick={exportData}>⬇ Export data</button><label className={BTN+' cursor-pointer'}>⬆ Import data<input type="file" accept="application/json,.json" onChange={importData} className="hidden"/></label></>}</div>
    <p className="text-xs text-muted">Everything saves automatically. Every change here can be undone with the Undo button. Export a backup now and then.</p></section></>};

 const showCalc=tab==='t'||fsub!=='g',calcKey=C.id+'|'+C.target+'|'+C.pass+'|'+JSON.stringify(C.table);
 return <div className="mx-auto max-w-[1200px] px-4 pb-24 sm:px-8">
  {Header()}
  <main className="flex flex-col gap-4 pt-4 sm:gap-6 sm:pt-6">
   {Banners()}
   <div className="flex flex-wrap items-center gap-2 sm:gap-3"><Seg v={tab} on={setTab} opts={[['t','📝 Tracker'],['f','🔮 Forecaster']]} cls="w-full sm:w-auto"/>
    <div className="flex flex-wrap gap-2 sm:ml-auto"><select value={Y.id} onChange={e=>set(c=>({...c,y:e.target.value,s:c.years.find(y=>y.id===e.target.value).sems[0].id}))} className={SEL}>{st.years.map(y=><option key={y.id} value={y.id}>{y.name}</option>)}</select><select value={S.id} onChange={e=>set(c=>({...c,s:e.target.value}))} className={SEL}>{Y.sems.map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</select></div></div>
   <div key={tab} className="anim-rise flex flex-col gap-4 sm:gap-6">{tab==='t'?TrackerView():ForecastView()}</div>
   <div className={showCalc?'':'hidden'}><Calc sk={calcKey}/></div></main>
  <Sheet open={sx} onClose={()=>setSx(false)} title="Settings" wide>{Settings()}</Sheet>
  <Sheet open={adding} onClose={()=>setAdding(false)} title="Add subject">
   <label className="text-sm font-semibold">Code<TextIn v={nf.code} on={v=>setNf({...nf,code:v})} ph="e.g. AUDITING" cls="mt-1"/></label>
   <label className="text-sm font-semibold">Name (optional)<TextIn v={nf.name} on={v=>setNf({...nf,name:v})} cls="mt-1"/></label>
   <label className="text-sm font-semibold">Credit units<div className="mt-1"><Num v={nf.units} on={v=>setNf({...nf,units:v})} w="w-full"/></div></label>
   <button className={BTNP} onClick={addSub}>Add subject</button></Sheet>
 </div>;
}

/* =====================================================================
   8. HOME  (cloud GROUPS first, then the accounts inside a group)
   ===================================================================== */
function Home({book,theme,setTheme,ctl,busy,at}){
 const [gv,setGv]=useState(null),[sh,setSh]=useState(null),[arm,setArm]=useState(null),[cm,setCm]=useState(''),[cb,setCb]=useState(false),[msg,setMsg]=useState('');
 const [ng,setNg]=useState({name:'',icon:'📁',pic:'',cloud:true,pass:''}),[jf,setJf]=useState({name:'',pass:''}),[na,setNa]=useState({name:'',bio:'',emoji:'🎓',pic:'',pass:'',pre:false}),[uf,setUf]=useState({pass:''}),[sf,setSf]=useState({name:'',pass:''}),[ef,setEf]=useState({pass:''}),[gp,setGp]=useState('');
 const grp=book.groups.find(g=>g.id===gv)||null;
 const localsOf=g=>book.list.filter(a=>a.gid===g.id);
 const remotesOf=g=>{const mids=new Set(localsOf(g).map(a=>a.mid).filter(Boolean));return Object.entries(g.members||{}).filter(([mid])=>!mids.has(mid)).map(([mid,m])=>({mid,...m}))};
 const countOf=g=>localsOf(g).length+remotesOf(g).length;
 const photo=(e,cb2)=>{const fl=e.target.files&&e.target.files[0];e.target.value='';if(!fl)return;resizeImg(fl).then(cb2).catch(()=>setMsg('Could not read that image.'))};
 const go=async(fn,after)=>{setCb(true);setCm('');try{const r=await fn();if(r==='ok'||String(r).startsWith('ok:')){setSh(null);if(after)after(String(r));}else setCm(r)}catch(e){setCm('Something went wrong. Try again.')}setCb(false)};
 const pickBackup=e=>{const fl=e.target.files&&e.target.files[0];e.target.value='';if(!fl||!grp)return;const r=new FileReader();r.onload=()=>{try{const j=JSON.parse(r.result),d=j&&j.data?j.data:j;if(!okState(d))throw new Error('bad');ctl.imp(grp.id,j.account||'Imported account',d);setMsg('Backup added as a new local account ✓')}catch(x){setMsg('That file is not a valid backup.')}};r.onerror=()=>setMsg('Could not read that file.');r.readAsText(fl)};
 const Photo=(o,onPic,onClear,Ico)=><div className="flex items-center gap-4">{Ico?Ico:<Avatar a={o} s="h-16 w-16" t="text-4xl"/>}<div className="flex flex-col gap-2"><label className={BTN+' cursor-pointer'}>📷 {o.pic?'Change picture':'Upload picture'}<input type="file" accept="image/*" className="hidden" onChange={e=>photo(e,onPic)}/></label>{o.pic&&<button className={BTN} onClick={onClear}>Remove picture</button>}</div></div>;
 const Emojis=(list,v,on)=><div className="flex flex-wrap gap-2">{list.map(e=><button key={e} onClick={()=>on(e)} className={cx('h-10 w-10 rounded-xl text-xl transition',v===e?'bg-accent/30 ring-2 ring-accent':'bg-surface2 hover:bg-line/60')}>{e}</button>)}</div>;
 const Err=()=>cm?<p className="text-xs font-semibold text-bad">{cm}</p>:null;
 const ga=sh&&sh.t==='editAcct'?book.list.find(a=>a.id===sh.id):null,gg=sh&&sh.t==='editGroup'?book.groups.find(g=>g.id===sh.id):null,um=sh&&sh.t==='unlock'&&grp&&grp.members?{mid:sh.mid,...(grp.members[sh.mid]||{})}:null;

 /* ---- cards ---- */
 const GroupCard=(g,i)=><div key={g.id} role="button" tabIndex={0} onClick={()=>setGv(g.id)} onKeyDown={e=>e.key==='Enter'&&setGv(g.id)} style={{animationDelay:i*50+'ms'}} className={cx(CARD,'lift anim-rise relative flex cursor-pointer flex-col gap-2.5 p-3 hover:border-accent/60 hover:shadow-xl hover:shadow-accent/10 sm:p-4')}>
  <div className="flex items-start justify-between"><GroupIcon g={g} s="h-12 w-12 sm:h-14 sm:w-14" t="text-2xl sm:text-3xl"/><button onClick={e=>{e.stopPropagation();setSh({t:'editGroup',id:g.id});setArm(null);setCm('');setGp('')}} className="-mr-1 -mt-1 rounded-lg p-1.5 text-sm text-muted opacity-70 transition hover:bg-surface2 hover:opacity-100" aria-label="Edit group">✏️</button></div>
  <div className="min-w-0"><div className="truncate text-sm font-extrabold sm:text-base">{g.name}</div><div className="mt-0.5 truncate text-[11px] text-muted sm:text-xs">{countOf(g)} account{countOf(g)===1?'':'s'} · {g.cloud?(g.missing?'⚠ not found':'☁ cloud'):'this device'}</div></div></div>;
 const AcctCard=(a,i)=><div key={a.id} role="button" tabIndex={0} onClick={()=>ctl.open(a.id)} onKeyDown={e=>e.key==='Enter'&&ctl.open(a.id)} style={{animationDelay:i*40+'ms'}} className={cx(CARD,'lift anim-rise flex cursor-pointer items-center gap-3 p-3 hover:border-accent/60 hover:shadow-xl hover:shadow-accent/10')}>
  <Avatar a={a} s="h-14 w-14" t="text-3xl"/>
  <div className="min-w-0 flex-1"><div className="flex items-center gap-1.5"><span className="truncate font-extrabold">{a.name||'Untitled'}</span><span className="shrink-0 text-xs" title={a.cloud?'Cloud account':'Local-only account'}>{a.cloud?'☁':'💾'}</span></div><div className="line-clamp-2 text-xs leading-snug text-muted">{a.bio||'No bio yet'}</div></div>
  <button onClick={e=>{e.stopPropagation();setSh({t:'editAcct',id:a.id});setArm(null);setCm('');setEf({pass:''})}} className="-mr-1 self-start rounded-lg p-1.5 text-sm text-muted opacity-70 transition hover:bg-surface2 hover:opacity-100" aria-label="Edit account">✏️</button></div>;
 const LockedCard=(m,i)=><div key={m.mid} role="button" tabIndex={0} onClick={()=>{setUf({pass:''});setCm('');setSh({t:'unlock',mid:m.mid})}} className={cx(CARD,'lift anim-rise flex cursor-pointer items-center gap-3 border-dashed p-3 hover:border-accent/60')} style={{animationDelay:i*40+'ms'}}>
  <div className="relative"><Avatar a={{pic:m.p,emoji:m.e||'🎓'}} s="h-14 w-14" t="text-3xl"/><span className="absolute -bottom-1 -right-1 grid h-5 w-5 place-items-center rounded-full bg-surface text-[11px] shadow ring-1 ring-line">🔒</span></div>
  <div className="min-w-0 flex-1"><div className="truncate font-extrabold">{m.n||'Account'}</div><div className="line-clamp-2 text-xs leading-snug text-muted">{m.b||'Tap to unlock with its passcode'}</div></div></div>;

 /* ---- screens ---- */
 const Top=<div className="flex items-center justify-between gap-2"><div className="flex items-center gap-2.5"><TigerLogo className="h-10 w-11"/><span className="hidden text-sm font-extrabold sm:inline">Grades Tracker &amp; Forecaster</span></div>
  <div className="flex items-center gap-2"><span className="hidden text-[11px] text-muted sm:inline">{busy?'Updating from cloud…':at?'Updated '+rel(at):''}</span>{CLOUD&&<button className={BTN+' !px-3'} onClick={ctl.refresh} aria-label="Refresh from cloud"><span className={busy?'inline-block animate-spin':''}>↻</span></button>}<button className={BTN} onClick={()=>setSh({t:'theme'})}>🎨 <span className="hidden sm:inline">Theme</span></button></div></div>;
 const Greeting=<div className="anim-rise pb-6 pt-8 sm:pb-8 sm:pt-12"><h1 className="max-w-3xl text-3xl font-black leading-[1.1] tracking-tight sm:text-5xl">Hello! <span className="text-muted">Feel free to track and forecast your grades.</span></h1></div>;
 const GroupsScreen=()=><>
  {Greeting}
  <div className="mb-3 flex items-center justify-between gap-3"><h2 className={LBL}>Groups</h2><button className={BTNP} onClick={()=>{setNg({name:'',icon:'📁',pic:'',cloud:CLOUD,pass:''});setCm('');setSh({t:'newGroup'})}}>＋ Create New Group</button></div>
  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">{book.groups.map(GroupCard)}</div>
  <div className="mt-8 flex flex-col items-center gap-3 text-center text-xs text-muted">
   {CLOUD&&<button className="font-semibold underline decoration-dotted underline-offset-4 hover:text-ink" onClick={()=>{setJf({name:'',pass:''});setCm('');setSh({t:'joinGroup'})}}>Join an existing group with its passcode</button>}
   <button className="font-semibold underline decoration-dotted underline-offset-4 hover:text-ink" onClick={ctl.guest}>Continue as guest (nothing is saved)</button>
   <p className="max-w-md">{CLOUD?'Groups sync from the cloud every time you open the app. Each account inside a group is protected by its own passcode.':'Cloud sync is off. Add your database URL in config.js to sync groups and accounts between devices.'}</p></div></>;
 const GroupScreen=()=>{const ls=localsOf(grp).slice().sort((a,b)=>(b.last||0)-(a.last||0)||(a.name||'').localeCompare(b.name||'')),rs=remotesOf(grp);return <>
  <div className="anim-rise flex items-center gap-3 pb-5 pt-6 sm:pt-10"><button className={BTN+' !px-3'} onClick={()=>setGv(null)} aria-label="Back to groups">← <span className="hidden sm:inline">Groups</span></button><GroupIcon g={grp} s="h-12 w-12" t="text-2xl"/><div className="min-w-0 flex-1"><h1 className="truncate text-2xl font-black tracking-tight sm:text-4xl">{grp.name}</h1><div className="text-xs text-muted">{countOf(grp)} account{countOf(grp)===1?'':'s'} · {grp.cloud?(grp.missing?'⚠ group not found in the cloud':'☁ cloud group'):'this device only'}</div></div>
   <button className={BTN+' !px-3'} onClick={()=>{setSh({t:'editGroup',id:grp.id});setArm(null);setCm('');setGp('')}} aria-label="Edit group">✏️</button></div>
  <div className="mb-4 flex flex-wrap items-center gap-x-4 gap-y-2"><button className={BTNP} onClick={()=>{setNa({name:'',bio:'',emoji:'🎓',pic:'',pass:'',pre:false});setCm('');setSh({t:'newAcct',local:!CLOUD})}}>＋ New Account{CLOUD?' (cloud)':''}</button>{CLOUD&&<button className="text-xs font-semibold text-muted underline decoration-dotted underline-offset-4 hover:text-ink" onClick={()=>{setNa({name:'',bio:'',emoji:'🎓',pic:'',pass:'',pre:false});setCm('');setSh({t:'newAcct',local:true})}}>or create a local-only account</button>}</div>
  {!ls.length&&!rs.length&&<p className={cx(CARD,'p-6 text-center text-sm text-muted')}>No accounts in this group yet. Tap “New Account” to add the first one.</p>}
  <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 sm:gap-3 lg:grid-cols-3">{ls.map(AcctCard)}{rs.map(LockedCard)}</div>
  <div className="mt-8 flex flex-col items-center gap-3 text-center text-xs text-muted">
   {CLOUD&&<button className="font-semibold underline decoration-dotted underline-offset-4 hover:text-ink" onClick={()=>{setSf({name:'',pass:''});setCm('');setSh({t:'signin'})}}>Sign in with a sync name and passcode</button>}
   {CAN_FILE&&<label className="cursor-pointer font-semibold underline decoration-dotted underline-offset-4 hover:text-ink">Import a backup into this group<input type="file" accept="application/json,.json" onChange={pickBackup} className="hidden"/></label>}
   {msg&&<p className="font-semibold text-ink">{msg}</p>}</div></>};

 return <div className="mx-auto max-w-5xl px-4 pb-20 pt-5 sm:px-8 sm:pt-8">
  {Top}
  <div key={gv||'groups'}>{grp?GroupScreen():GroupsScreen()}</div>

  <Sheet open={!!sh&&sh.t==='newGroup'} onClose={()=>setSh(null)} title="Create New Group">
   {Photo(ng,pic=>setNg({...ng,pic}),()=>setNg({...ng,pic:''}),<GroupIcon g={ng} s="h-16 w-16" t="text-4xl"/>)}
   {!ng.pic&&Emojis(GEMO,ng.icon,e=>setNg({...ng,icon:e}))}
   <label className="text-sm font-semibold">Group name<TextIn v={ng.name} on={v=>setNg({...ng,name:v})} ph="e.g. Section 2A2" cls="mt-1"/></label>
   {CLOUD&&<div className="flex flex-col gap-2 rounded-2xl border border-line bg-surface2/60 p-3"><label className="flex items-start gap-2 text-sm font-semibold"><input type="checkbox" checked={ng.cloud} onChange={e=>setNg({...ng,cloud:e.target.checked})} className="mt-1 h-4 w-4 accent-[rgb(var(--accent))]"/><span>Sync this group to the cloud<span className="block text-xs font-normal text-muted">Its accounts then appear on all your devices.</span></span></label>
    {ng.cloud&&<TextIn type="password" v={ng.pass} on={v=>setNg({...ng,pass:v})} ph="Group passcode (6+ characters)"/>}</div>}
   {Err()}<button disabled={cb} className={BTNP} onClick={()=>go(()=>ctl.createGroup({...ng,pass:ng.cloud?ng.pass:''}),r=>setGv(r.slice(3)))}>{cb?'Working…':'Create group'}</button></Sheet>

  <Sheet open={!!sh&&sh.t==='joinGroup'} onClose={()=>setSh(null)} title="Join a group">
   <p className="text-sm text-muted">Enter the group’s name and passcode. Its accounts then load automatically every time you open the app.</p>
   <TextIn v={jf.name} on={v=>setJf({...jf,name:v})} ph="Group name"/><TextIn type="password" v={jf.pass} on={v=>setJf({...jf,pass:v})} ph="Group passcode"/>
   {Err()}<button disabled={cb} className={BTNP} onClick={()=>go(()=>ctl.joinGroup(jf.name,jf.pass),r=>setGv(r.slice(3)))}>{cb?'Working…':'Join group'}</button></Sheet>

  <Sheet open={!!gg} onClose={()=>{setSh(null);setArm(null)}} title="Edit group">{gg&&<>
   {Photo(gg,pic=>ctl.editGroup(gg.id,{pic}),()=>ctl.editGroup(gg.id,{pic:''}),<GroupIcon g={gg} s="h-16 w-16" t="text-4xl"/>)}
   {!gg.pic&&Emojis(GEMO,gg.icon,e=>ctl.editGroup(gg.id,{icon:e}))}
   <label className="text-sm font-semibold">Group name<TextIn v={gg.name} on={v=>ctl.editGroup(gg.id,{name:v})} ph="Group name" cls="mt-1"/></label>
   {CLOUD&&<div className="flex flex-col gap-2 rounded-2xl border border-line bg-surface2/60 p-3"><div className="text-sm font-bold">☁ Cloud</div>
    {gg.cloud?<p className="text-sm text-muted">Synced as <b className="text-ink">{gg.cloud.sn}</b>. Accounts you create here as cloud accounts show up on every device that joins this group.</p>
     :<><p className="text-xs text-muted">This group lives on this device only.</p><TextIn type="password" v={gp} on={setGp} ph="Group passcode (6+ characters)"/>{Err()}<button disabled={cb} className={BTN} onClick={()=>go(()=>ctl.enableGroupCloud(gg.id,gp),()=>setGp(''))}>Turn on cloud for this group</button></>}</div>}
   <div className="flex flex-col gap-2"><button className={BTNX} onClick={()=>{if(arm==='g'+gg.id){ctl.deleteGroup(gg.id,false);setSh(null);setArm(null);setGv(null)}else{setArm('g'+gg.id);setTimeout(()=>setArm(x=>x==='g'+gg.id?null:x),4000)}}}>{arm==='g'+gg.id?'Tap again to remove from this device':'Remove group from this device'}</button>
    {gg.cloud&&<button className={BTNX} onClick={()=>{if(arm==='G'+gg.id){ctl.deleteGroup(gg.id,true);setSh(null);setArm(null);setGv(null)}else{setArm('G'+gg.id);setTimeout(()=>setArm(x=>x==='G'+gg.id?null:x),4000)}}}>{arm==='G'+gg.id?'Tap again to delete for everyone':'Delete group from the cloud too'}</button>}
    <p className="text-xs text-muted">Accounts in a removed group move to another group. Account data is never deleted by removing a group.</p></div></>}</Sheet>

  <Sheet open={!!sh&&sh.t==='newAcct'&&!!grp} onClose={()=>setSh(null)} title={sh&&sh.local?'New local-only account':'New Account (cloud)'}>
   {Photo(na,pic=>setNa({...na,pic}),()=>setNa({...na,pic:''}))}
   {!na.pic&&Emojis(EMO,na.emoji,e=>setNa({...na,emoji:e}))}
   <label className="text-sm font-semibold">Name<TextIn v={na.name} on={v=>setNa({...na,name:v})} ph="e.g. Roever" cls="mt-1"/></label>
   <label className="text-sm font-semibold">Bio <span className="text-xs font-normal text-muted">(optional)</span><TextIn v={na.bio} on={v=>setNa({...na,bio:v.slice(0,80)})} ph="BS Accountancy · 2nd year" cls="mt-1"/></label>
   {sh&&!sh.local&&<><TextIn type="password" v={na.pass} on={v=>setNa({...na,pass:v})} ph="Account passcode (6+ characters)"/><p className="-mt-3 text-xs text-muted">The name and passcode together sign you in on any device. Keep the passcode private.</p></>}
   <label className="flex items-start gap-2 text-sm"><input type="checkbox" checked={na.pre} onChange={e=>setNa({...na,pre:e.target.checked})} className="mt-1 h-4 w-4 accent-[rgb(var(--accent))]"/><span>Pre-load STRATCOST, FINMAN, INTACC, OBLICON and ITAPP (scores stay blank)</span></label>
   {Err()}<button disabled={cb} className={BTNP} onClick={()=>go(()=>ctl.createAccount({...na,gid:grp.id,local:sh.local}),r=>ctl.open(r.slice(3)))}>{cb?'Working…':sh&&sh.local?'Create local account':'Create cloud account'}</button></Sheet>

  <Sheet open={!!um} onClose={()=>setSh(null)} title="Unlock account">{um&&<>
   <div className="flex items-center gap-3"><Avatar a={{pic:um.p,emoji:um.e||'🎓'}} s="h-14 w-14" t="text-3xl"/><div className="min-w-0"><div className="truncate font-extrabold">{um.n}</div><div className="line-clamp-2 text-xs text-muted">{um.b}</div></div></div>
   <TextIn type="password" v={uf.pass} on={v=>setUf({pass:v})} ph="Account passcode"/>
   {Err()}<button disabled={cb} className={BTNP} onClick={()=>go(()=>ctl.unlock(grp.id,um.mid,uf.pass),r=>ctl.open(r.slice(3)))}>{cb?'Working…':'Unlock'}</button></>}</Sheet>

  <Sheet open={!!sh&&sh.t==='signin'&&!!grp} onClose={()=>setSh(null)} title="Sign in to a cloud account">
   <p className="text-sm text-muted">Use the sync name and passcode of an account created on another device. It is added to this group.</p>
   <TextIn v={sf.name} on={v=>setSf({...sf,name:v})} ph="Sync name"/><TextIn type="password" v={sf.pass} on={v=>setSf({...sf,pass:v})} ph="Passcode"/>
   {Err()}<button disabled={cb} className={BTNP} onClick={()=>go(()=>ctl.signIn(grp.id,sf.name,sf.pass),r=>ctl.open(r.slice(3)))}>{cb?'Working…':'Sign in'}</button></Sheet>

  <Sheet open={!!ga} onClose={()=>{setSh(null);setArm(null)}} title="Edit account">{ga&&<>
   {Photo(ga,pic=>ctl.rename(ga.id,{pic}),()=>ctl.rename(ga.id,{pic:''}))}
   {!ga.pic&&Emojis(EMO,ga.emoji,e=>ctl.rename(ga.id,{emoji:e}))}
   <label className="text-sm font-semibold">Name<TextIn v={ga.name} on={v=>ctl.rename(ga.id,{name:v})} ph="Account name" cls="mt-1"/></label>
   <label className="text-sm font-semibold">Bio<TextIn v={ga.bio||''} on={v=>ctl.rename(ga.id,{bio:v.slice(0,80)})} ph="A short line about you" cls="mt-1"/></label>
   <label className="text-sm font-semibold">Group<select value={ga.gid} onChange={e=>ctl.rename(ga.id,{gid:e.target.value})} className={SEL+' mt-1 block w-full !py-3'}>{book.groups.map(g=><option key={g.id} value={g.id}>{g.name}</option>)}</select></label>
   {CLOUD&&<div className="flex flex-col gap-2 rounded-2xl border border-line bg-surface2/60 p-3"><div className="text-sm font-bold">☁ Cloud sync</div>
    {ga.cloud?<><p className="text-sm text-muted">Syncing as <b className="text-ink">{ga.cloud.sn}</b></p><button className={BTN} onClick={()=>ctl.disable(ga.id)}>Turn off sync (keeps this copy)</button></>
     :<><p className="text-xs text-muted">This account is stored on this device only.</p><TextIn type="password" v={ef.pass} on={v=>setEf({pass:v})} ph="Passcode (6+ characters)"/>{Err()}<button disabled={cb} className={BTN} onClick={()=>go(()=>ctl.enable(ga.id,ga.name,ef.pass),()=>{})}>Turn on cloud sync</button></>}</div>}
   <div className="flex flex-col gap-2"><button className={BTNX} onClick={()=>{if(arm===ga.id){ctl.del(ga.id,false);setSh(null);setArm(null)}else{setArm(ga.id);setTimeout(()=>setArm(x=>x===ga.id?null:x),4000)}}}>{arm===ga.id?'Tap again to remove from this device':'Remove from this device'}</button>
    {ga.cloud&&<button className={BTNX} onClick={()=>{if(arm==='X'+ga.id){ctl.del(ga.id,true);setSh(null);setArm(null)}else{setArm('X'+ga.id);setTimeout(()=>setArm(x=>x==='X'+ga.id?null:x),4000)}}}>{arm==='X'+ga.id?'Tap again to delete from the cloud too':'Delete from the cloud too'}</button>}
    <p className="text-xs text-muted">{ga.cloud?'Removing from this device keeps the cloud copy, so you can unlock it again from its group.':'A local-only account cannot be recovered after it is removed.'}</p></div></>}</Sheet>

  <Sheet open={!!sh&&sh.t==='theme'} onClose={()=>setSh(null)} title="Theme"><ThemePicker theme={theme} setTheme={setTheme}/></Sheet>
 </div>;
}

/* =====================================================================
   9. ROOT  (accounts, groups, theme, cloud sync engine)
   ===================================================================== */
function Root(){
 const bk=useRef(null);if(!bk.current){bk.current=loadBook();saveBook(bk.current)}
 const [cur,setCur]=useState(null),[ver,setVer]=useState(0),[,tick]=useState(0),[stat,setStat]=useState('synced'),[ext,setExt]=useState({n:0,data:null}),[busy,setBusy]=useState(false),[at,setAt]=useState(0),[theme,setTheme0]=useState(()=>{try{return localStorage.getItem('gtf-theme')||'sun'}catch(e){return'sun'}}),gd=useRef(null),curR=useRef(null),tm=useRef({}),pm=useRef({}),pg=useRef({}),bz=useRef({});
 curR.current=cur;
 const setTheme=t=>{setTheme0(t);try{localStorage.setItem('gtf-theme',t)}catch(e){}};
 useEffect(()=>{document.documentElement.dataset.theme=theme;const m=document.querySelector('meta[name=theme-color]'),t=THEMES.find(x=>x.id===theme);if(m&&t)m.setAttribute('content',t.bar)},[theme]);
 const save=()=>{saveBook(bk.current);tick(x=>x+1)};
 const acc=id=>bk.current.list.find(a=>a.id===id),grp=id=>bk.current.groups.find(g=>g.id===id);
 const fail=e=>setStat(navigator.onLine&&/^(get|put) [45]/.test(String(e&&e.message))?'error':'offline');
 const stamp=id=>{const a=acc(id);if(a){a.sy={...(a.sy||{}),at:Date.now()};saveBook(bk.current)}};
 const docOf=(a,id,t)=>({t,d:JSON.stringify(bk.current.data[id]),n:a.name,e:a.emoji,p:a.pic||null,b:a.bio||''});
 /* ---- account documents (unchanged engine: last edit wins, the other version is kept) ---- */
 const apply=(id,r)=>{const a=acc(id);if(!a)return;let d;try{d=mig(JSON.parse(r.d))}catch(e){return}if(!okState(d))return;
  bk.current.data[id]=d;a.name=r.n||a.name;a.emoji=r.e||a.emoji;if(r.b!==undefined)a.bio=r.b;if(r.p)a.pic=r.p;else delete a.pic;
  a.sy={t:r.t,base:r.t,dirty:false,at:Date.now()};saveBook(bk.current);if(curR.current&&curR.current.id===id)setExt(x=>({n:x.n+1,data:d}));tick(x=>x+1)};
 const push=async id=>{const a=acc(id);if(!a||!a.cloud||bz.current['p'+id])return;bz.current['p'+id]=1;const t=(a.sy&&a.sy.t)||Date.now();let again=false;setStat('syncing');
  try{await cput(a.cloud.k,docOf(a,id,t));const b=acc(id);if(b){b.sy={...b.sy,t:b.sy&&b.sy.t||t,base:t,dirty:!!(b.sy&&b.sy.t!==t),at:Date.now()};again=b.sy.dirty;saveBook(bk.current)}setStat('synced');tick(x=>x+1)}catch(e){fail(e)}
  bz.current['p'+id]=0;if(again)push(id)};
 const sync=async id=>{const a=acc(id);if(!a||!a.cloud||bz.current['s'+id])return;if(!navigator.onLine){setStat('offline');return}bz.current['s'+id]=1;
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
  bz.current['s'+id]=0};
 const later=id=>{clearTimeout(tm.current[id]);tm.current[id]=setTimeout(()=>navigator.onLine?push(id):setStat('offline'),700)};
 /* ---- group directories (public cards only) ---- */
 const pubM=async id=>{const a=acc(id),g=a&&grp(a.gid);if(!CLOUD||!a||!a.cloud||!g||!g.cloud||!navigator.onLine)return;if(!a.mid){a.mid='m'+uid();saveBook(bk.current)}
  try{await gwrite(g.cloud.k,'m/'+a.mid,{n:a.name,b:a.bio||'',e:a.emoji,p:a.pic||null,sn:a.cloud.sn,t:Date.now()})}catch(e){}};
 const pubLater=id=>{clearTimeout(pm.current[id]);pm.current[id]=setTimeout(()=>pubM(id),900)};
 const pubG=async id=>{const g=grp(id);if(!g||!g.cloud||!navigator.onLine)return;try{await gwrite(g.cloud.k,'meta',{n:g.name,i:g.icon||'📁',p:g.pic||null,t:Date.now()});g.dirty=false;saveBook(bk.current)}catch(e){}};
 const pubGLater=id=>{clearTimeout(pg.current[id]);pg.current[id]=setTimeout(()=>pubG(id),900)};
 const refresh=async()=>{if(!CLOUD||!navigator.onLine)return;const gs=bk.current.groups.filter(g=>g.cloud);if(!gs.length){setAt(Date.now());return}setBusy(true);
  await Promise.all(gs.map(async g=>{try{const r=await gread(g.cloud.k);if(r&&r.meta){if(!g.dirty){g.name=r.meta.n||g.name;g.icon=r.meta.i||g.icon;if(r.meta.p)g.pic=r.meta.p;else delete g.pic}g.members=r.m||{};delete g.missing}else if(r===null){g.missing=true}g.fetched=Date.now()}catch(e){}}));
  setBusy(false);setAt(Date.now());save()};
 useEffect(()=>{ADAPT.init()},[]);
 // on open: pull every cloud group directory and every cloud account
 useEffect(()=>{if(!CLOUD)return;const all=()=>{refresh();bk.current.list.forEach(a=>a.cloud&&sync(a.id))};all();window.addEventListener('online',all);return()=>window.removeEventListener('online',all)},[]);
 useEffect(()=>{if(!CLOUD||cur)return;const t=setInterval(()=>{if(!document.hidden)refresh()},30000),v=()=>{if(!document.hidden)refresh()};document.addEventListener('visibilitychange',v);return()=>{clearInterval(t);document.removeEventListener('visibilitychange',v)}},[cur]);
 const ca=cur&&!cur.guest?acc(cur.id):null,ck=ca&&ca.cloud?ca.cloud.k:null,cid=cur&&cur.id;
 useEffect(()=>{if(!CLOUD||!ck)return;const id=cid;let es=null,dt=null;
  const kick=()=>{clearTimeout(dt);dt=setTimeout(()=>sync(id),250)};
  try{es=new EventSource(curl(ck));es.addEventListener('put',kick);es.addEventListener('patch',kick);es.onerror=()=>{if(!navigator.onLine)setStat('offline')}}catch(e){}
  const vis=()=>{if(!document.hidden)sync(id)},off=()=>setStat('offline'),on=()=>sync(id),poll=setInterval(vis,30000);
  window.addEventListener('online',on);window.addEventListener('offline',off);document.addEventListener('visibilitychange',vis);sync(id);
  return()=>{es&&es.close();clearInterval(poll);clearTimeout(dt);window.removeEventListener('online',on);window.removeEventListener('offline',off);document.removeEventListener('visibilitychange',vis)}},[cid,ck]);

 /* ---- actions used by the Home screen ---- */
 const open=id=>{const a=acc(id);if(a){a.last=Date.now();saveBook(bk.current)}setStat(navigator.onLine?'synced':'offline');setCur({id})};
 const addAcc=(o,d)=>{const id=uid();bk.current.list=[...bk.current.list,{id,name:(o.name||'').trim()||'New account',bio:o.bio||'',emoji:o.emoji||'🎓',...(o.pic?{pic:o.pic}:{}),gid:o.gid,...(o.extra||{})}];bk.current.data[id]=d;return id};
 const NOCLOUD='Cloud is not set up yet. Add your database URL in config.js.',NEEDNET='You need an internet connection for that.',BADNET='Could not reach the cloud database. Check config.js, your database rules and your internet.';
 const createGroup=async n=>{if(!(n.name||'').trim())return'Give the group a name.';const g={id:'g'+uid(),name:n.name.trim(),icon:n.icon||'📁'};if(n.pic)g.pic=n.pic;
  if(n.pass){if(!CLOUD)return NOCLOUD;if(n.pass.length<6)return'Use a passcode of at least 6 characters.';if(!navigator.onLine)return NEEDNET;
   try{const k=await gkey(n.name,n.pass),ex=await gread(k);if(ex&&ex.meta)return'A group with that name and passcode already exists. Use “Join an existing group”.';await gwrite(k,'meta',{n:g.name,i:g.icon,p:g.pic||null,t:Date.now()});g.cloud={k,sn:n.name.trim()};g.members={}}catch(e){return BADNET}}
  bk.current.groups=[...bk.current.groups,g];save();return'ok:'+g.id};
 const joinGroup=async(name,pw)=>{if(!CLOUD)return NOCLOUD;if(!(name||'').trim()||(pw||'').length<6)return'Enter the group name and its passcode (6+ characters).';if(!navigator.onLine)return NEEDNET;
  try{const k=await gkey(name,pw),r=await gread(k);if(!r||!r.meta)return'No group found with that name and passcode.';const ex=bk.current.groups.find(g=>g.cloud&&g.cloud.k===k);if(ex)return'ok:'+ex.id;
   const g={id:'g'+uid(),name:r.meta.n||name.trim(),icon:r.meta.i||'📁',cloud:{k,sn:name.trim()},members:r.m||{},fetched:Date.now()};if(r.meta.p)g.pic=r.meta.p;bk.current.groups=[...bk.current.groups,g];save();return'ok:'+g.id}catch(e){return BADNET}};
 const editGroup=(id,p)=>{const g=grp(id);if(!g)return;Object.assign(g,p);if(p.pic==='')delete g.pic;if(g.cloud){g.dirty=true;pubGLater(id)}save()};
 const enableGroupCloud=async(id,pw)=>{const g=grp(id);if(!g)return'Group not found.';if(!CLOUD)return NOCLOUD;if((pw||'').length<6)return'Use a passcode of at least 6 characters.';if(!navigator.onLine)return NEEDNET;
  try{const k=await gkey(g.name,pw),ex=await gread(k);if(ex&&ex.meta)return'A group with that name and passcode already exists. Choose a different passcode.';await gwrite(k,'meta',{n:g.name,i:g.icon||'📁',p:g.pic||null,t:Date.now()});g.cloud={k,sn:g.name.trim()};g.members={};save();bk.current.list.filter(a=>a.gid===id&&a.cloud).forEach(a=>pubM(a.id));return'ok'}catch(e){return BADNET}};
 const deleteGroup=async(id,everywhere)=>{const g=grp(id);if(!g)return;if(everywhere&&g.cloud){try{await gremove(g.cloud.k)}catch(e){}}
  let gs=bk.current.groups.filter(x=>x.id!==id);if(!gs.length)gs=[defGroup()];bk.current.groups=gs;bk.current.list.forEach(a=>{if(a.gid===id)a.gid=gs[0].id});save()};
 const createAccount=async n=>{const name=(n.name||'').trim();if(!name)return'Enter a name.';const d=blank(n.pre),o={name,bio:n.bio,emoji:n.emoji,pic:n.pic,gid:n.gid};
  if(n.local){const id=addAcc(o,d);save();return'ok:'+id}
  if(!CLOUD)return NOCLOUD;if((n.pass||'').length<6)return'Use a passcode of at least 6 characters.';if(!navigator.onLine)return NEEDNET+' You can create a local-only account instead.';
  try{const k=await ckey(name,n.pass),ex=await cget(k);if(validDoc(ex))return'An account with that name and passcode already exists. Choose a different passcode.';const t=Date.now();
   const id=addAcc({...o,extra:{mid:'m'+uid(),cloud:{k,sn:name},sy:{t,base:t,dirty:false,at:t}}},d);await cput(k,docOf(acc(id),id,t));save();pubM(id);return'ok:'+id}catch(e){return BADNET}};
 const unlock=async(gid,mid,pw)=>{const g=grp(gid),m=g&&g.members&&g.members[mid];if(!m)return'That account is no longer in the group.';if((pw||'').length<6)return'Enter the account passcode (6+ characters).';if(!navigator.onLine)return NEEDNET;
  try{const k=await ckey(m.sn,pw),r=await cget(k);if(!validDoc(r))return'Wrong passcode.';let d;try{d=mig(JSON.parse(r.d))}catch(e){d=null}if(!okState(d))return'That account has unreadable data.';
   const ex=bk.current.list.find(a=>a.cloud&&a.cloud.k===k);if(ex){ex.mid=mid;ex.gid=gid;save();return'ok:'+ex.id}
   const id=addAcc({name:r.n||m.n,bio:r.b!==undefined?r.b:m.b,emoji:r.e||m.e,pic:r.p||m.p,gid,extra:{mid,cloud:{k,sn:m.sn},sy:{t:r.t,base:r.t,dirty:false,at:Date.now()}}},d);save();return'ok:'+id}catch(e){return BADNET}};
 const signIn=async(gid,sn,pw)=>{if(!CLOUD)return NOCLOUD;if(!(sn||'').trim()||(pw||'').length<6)return'Enter the sync name and passcode (6+ characters).';if(!navigator.onLine)return NEEDNET;
  try{const k=await ckey(sn,pw),r=await cget(k);if(!validDoc(r))return'No account found with that name and passcode.';let d;try{d=mig(JSON.parse(r.d))}catch(e){d=null}if(!okState(d))return'That account has unreadable data.';
   const ex=bk.current.list.find(a=>a.cloud&&a.cloud.k===k);if(ex)return'ok:'+ex.id;
   const id=addAcc({name:r.n||sn,bio:r.b||'',emoji:r.e||'☁',pic:r.p,gid,extra:{cloud:{k,sn:sn.trim()},sy:{t:r.t,base:r.t,dirty:false,at:Date.now()}}},d);save();pubLater(id);return'ok:'+id}catch(e){return BADNET}};
 const rename=(id,p)=>{const a=acc(id);if(!a)return;const oldG=grp(a.gid);Object.assign(a,p);if(p.pic==='')delete a.pic;
  if(p.gid&&oldG&&oldG.id!==p.gid&&a.mid&&oldG.cloud){gremove(oldG.cloud.k,'m/'+a.mid).catch(()=>{});delete a.mid}
  if(a.cloud){a.sy={...(a.sy||{}),t:Date.now(),dirty:true};later(id);pubLater(id)}save()};
 const enable=async(id,sn,pw)=>{const a=acc(id);if(!a)return'Account not found.';if(!CLOUD)return NOCLOUD;if(!(sn||'').trim()||(pw||'').length<6)return'Use a passcode of at least 6 characters.';if(!navigator.onLine)return NEEDNET;
  try{const k=await ckey(sn,pw),ex=await cget(k);if(validDoc(ex))return'A cloud account with that name and passcode already exists. Choose a different passcode.';const t=Date.now();await cput(k,docOf(a,id,t));a.cloud={k,sn:sn.trim()};a.sy={t,base:t,dirty:false,at:Date.now()};save();pubLater(id);return'ok'}catch(e){return BADNET}};
 const disable=id=>{const a=acc(id);if(a){delete a.cloud;delete a.sy;delete a.loser;save()}};
 const del=async(id,everywhere)=>{const a=acc(id);if(!a)return;if(everywhere&&a.cloud){try{await premove(a.cloud.k)}catch(e){}const g=grp(a.gid);if(a.mid&&g&&g.cloud){try{await gremove(g.cloud.k,'m/'+a.mid)}catch(e){}}}
  bk.current.list=bk.current.list.filter(x=>x.id!==id);delete bk.current.data[id];save()};
 const imp=(gid,name,d)=>{addAcc({name,emoji:'📥',gid},mig(d));save()};
 const guest=()=>{gd.current=blank(false);setCur({guest:true})};
 const keep=name=>{const id=addAcc({name,emoji:'🎓',gid:bk.current.groups[0].id},gd.current);save();open(id)};
 const leave=()=>{const id=cur&&cur.id,a=id&&acc(id);if(a&&a.cloud){clearTimeout(tm.current[id]);if(a.sy&&a.sy.dirty&&navigator.onLine)push(id)}setCur(null);refresh()};
 const ctl={open,guest,createGroup,joinGroup,editGroup,enableGroupCloud,deleteGroup,createAccount,unlock,signIn,rename,enable,disable,del,imp,refresh};

 let view;
 if(!cur)view=<Home key="home" book={bk.current} theme={theme} setTheme={setTheme} ctl={ctl} busy={busy} at={at}/>;
 else{
  const a=cur.guest?{name:'Guest',emoji:'👤'}:acc(cur.id);
  if(!a){setTimeout(()=>setCur(null),0);return null}
  const lbl=stat==='synced'?'☁ Synced':stat==='syncing'?'☁ Syncing…':stat==='offline'?'📴 Offline · saved here':'⚠ Sync error · tap to retry';
  const cl=a.cloud?{on:true,label:lbl,sync:()=>sync(cur.id),at:a.sy&&a.sy.at,pending:!!(a.sy&&a.sy.dirty)}:{on:false,label:cur.guest?'👤 Not saved':'💾 This device only',sync:()=>{}};
  const onSave=n=>{if(cur.guest){gd.current=n;return}const x=acc(cur.id);bk.current.data[cur.id]=n;if(x&&x.cloud){x.sy={...(x.sy||{}),t:Date.now(),dirty:true};setStat(navigator.onLine?'syncing':'offline');later(cur.id)}saveBook(bk.current)};
  view=<App key={(cur.id||'guest')+'-'+ver} init={cur.guest?gd.current:bk.current.data[cur.id]} acct={a} guest={!!cur.guest} onSave={onSave} onSwitch={leave} onKeep={keep} cloud={cl} ext={ext} loser={a.loser} onLoser={()=>{delete a.loser;save()}} theme={theme} setTheme={setTheme}/>;
 }
 return <div key={cur?'app':'home'} className="anim-rise">{view}</div>;
}
ReactDOM.createRoot(document.getElementById('root')).render(<Root/>);
