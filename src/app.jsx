import * as React from 'react';
import * as ReactDOM from 'react-dom/client';
import {createPortal} from 'react-dom';
const {useState,useRef,useEffect,useLayoutEffect}=React;

/* =====================================================================
   1. CONFIG
   ===================================================================== */
const CAN_FILE=true;
const CFG=window.GTF_CONFIG||{},DB=String(CFG.databaseURL||'').trim().replace(/\/+$/,''),CLOUD=/^https?:\/\/[^\s]+$/.test(DB)&&!/YOUR[-_]/i.test(DB);
const ADAPT={init(){try{navigator.storage&&navigator.storage.persist&&navigator.storage.persist()}catch(e){}}};

/* =====================================================================
   1b. SOUND, HAPTICS AND CONFETTI
   Every sound is synthesised live with the Web Audio API (no audio files).
   Sound and haptics each have a switch in Settings and are remembered on this device.
   ===================================================================== */
const FX=(()=>{
 let ctx=null,master=null,conv=null,lastS=0,lastD=0,lastL=0,lastC=0,hooked=false;
 const rd=k=>{try{return localStorage.getItem(k)!=='0'}catch(e){return true}},S={snd:rd('gtf-snd'),hap:rd('gtf-hap')};
 // a small generated "room" so every pop blooms softly instead of stopping dead (no audio files)
 const room=c=>{const n=Math.floor(c.sampleRate*.9),b=c.createBuffer(2,n,c.sampleRate);for(let k=0;k<2;k++){const d=b.getChannelData(k);let lp=0;for(let i=0;i<n;i++){lp+=((Math.random()*2-1)-lp)*.3;d[i]=lp*Math.pow(1-i/n,3)}}return b};
 // iOS 16.4+: let Web Audio play even when the ringer switch is on silent
 const session=()=>{try{if(navigator.audioSession&&navigator.audioSession.type!=='playback')navigator.audioSession.type='playback'}catch(e){}};
 // A short silent WAV built at runtime. Playing it through a real HTML5 <audio> tag moves iOS into the "playback" audio category (this is what makes sound work with the silent switch on).
 let el=null;
 const silentWav=()=>{const n=4000,b=new ArrayBuffer(44+n*2),v=new DataView(b),w=(o,t)=>{for(let i=0;i<t.length;i++)v.setUint8(o+i,t.charCodeAt(i))};
  w(0,'RIFF');v.setUint32(4,36+n*2,true);w(8,'WAVE');w(12,'fmt ');v.setUint32(16,16,true);v.setUint16(20,1,true);v.setUint16(22,1,true);v.setUint32(24,8000,true);v.setUint32(28,16000,true);v.setUint16(32,2,true);v.setUint16(34,16,true);w(36,'data');v.setUint32(40,n*2,true);
  return URL.createObjectURL(new Blob([b],{type:'audio/wav'}))};
 const tag=()=>{try{if(!el){el=document.createElement('audio');el.setAttribute('playsinline','');el.setAttribute('webkit-playsinline','');el.preload='auto';el.loop=false;el.src=silentWav();el.style.cssText='position:fixed;width:0;height:0;opacity:0;pointer-events:none';(document.body||document.documentElement).appendChild(el)}
  el.currentTime=0;const p=el.play();if(p&&p.catch)p.catch(()=>{})}catch(e){}};
 // Create the audio engine (only ever called from a real tap, click or key press) and make sure it is running.
 const boot=()=>{try{
  if(!ctx){const A=window.AudioContext||window.webkitAudioContext;if(!A)return null;session();ctx=new A();
   master=ctx.createGain();master.gain.value=.95;const cp=ctx.createDynamicsCompressor();cp.threshold.value=-18;cp.ratio.value=3;master.connect(cp);cp.connect(ctx.destination);
   conv=ctx.createConvolver();conv.buffer=room(ctx);const wet=ctx.createGain();wet.gain.value=.3;conv.connect(wet);wet.connect(master);
   ctx.onstatechange=()=>{if(ctx.state!=='running')hook()}}
  if(ctx.state!=='running'){const p=ctx.resume();if(p&&p.then)p.then(()=>{},()=>{})}
  return ctx}catch(e){return null}};
 // FORCE UNLOCK: inside the gesture, (1) resume the context, (2) start a silent oscillator and a silent one-sample buffer, (3) play a silent HTML5 <audio>.
 // iOS only treats the page as "allowed to play" once something has really been started inside a touch.
 const prime=()=>{session();tag();const c=boot();if(!c)return;
  try{const b=c.createBuffer(1,1,22050),n=c.createBufferSource();n.buffer=b;n.connect(c.destination);n.start(0)}catch(e){}
  try{const o=c.createOscillator(),g=c.createGain();g.gain.value=0;o.connect(g);g.connect(c.destination);o.start(0);o.stop(c.currentTime+.05)}catch(e){}
  try{const p=c.resume();if(p&&p.then)p.then(()=>{if(c.state==='running')unhook()},()=>{})}catch(e){}
  if(c.state==='running')unhook()};
 // listeners sit on document.body (touchstart + touchend + friends) and stay armed until the engine is really running; they re-arm if iOS suspends it again
 const EV=['touchstart','touchend','mousedown','pointerup','click','keydown'],un=()=>prime();let tgt=null;
 const hook=()=>{if(hooked)return;hooked=true;tgt=document.body||document;EV.forEach(e=>tgt.addEventListener(e,un,{capture:true,passive:true}))};
 const unhook=()=>{if(!hooked)return;hooked=false;EV.forEach(e=>tgt.removeEventListener(e,un,{capture:true}))};
 try{hook();document.addEventListener('visibilitychange',()=>{if(!document.hidden&&ctx&&ctx.state!=='running')hook()});window.addEventListener('pageshow',()=>{if(ctx&&ctx.state!=='running')hook()})}catch(e){}
 const set=(k,v)=>{S[k]=!!v;try{localStorage.setItem('gtf-'+k,v?'1':'0')}catch(e){}if(k==='snd'&&v)prime()};
 // run a sound once the engine is running (resumes it first if iOS put it to sleep)
 const go=fn=>{if(!S.snd)return;const c=boot();if(!c||c.state==='closed')return;tag();if(c.state==='running'){fn(c);return}const p=c.resume();if(p&&p.then)p.then(()=>{if(c.state==='running')fn(c)},()=>{})};
 // one soft "pop": a sine that settles quickly from a slightly higher pitch, with a faint overtone and a short, smooth tail
 const pop=(f,t,pk,dc,f0)=>{const lp=ctx.createBiquadFilter();lp.type='lowpass';lp.frequency.value=3200;lp.Q.value=.4;
  [[1,1],[2,.12],[3,.04]].forEach(([m,a])=>{const o=ctx.createOscillator(),g=ctx.createGain();o.type='sine';o.frequency.setValueAtTime((f0||f)*m,t);if(f0)o.frequency.exponentialRampToValueAtTime(f*m,t+.045);
   g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(pk*a,t+.008);g.gain.exponentialRampToValueAtTime(.0001,t+dc);o.connect(g);g.connect(lp);o.start(t);o.stop(t+dc+.05)});
  lp.connect(master);lp.connect(conv)};
 const vib=p=>{if(!S.hap)return;try{navigator.vibrate&&navigator.vibrate(p)}catch(e){}};
 const confetti=()=>{try{
  if(typeof document==='undefined'||(window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches))return;
  const n=Date.now();if(n-lastC<2500)return;lastC=n;
  const box=document.createElement('div');box.className='gtf-conf';box.setAttribute('aria-hidden','true');
  const cols=['rgb(var(--accent))','rgb(var(--good))','#F472B6','#60A5FA','#FB923C','#A78BFA','#FACC15'];
  for(let i=0;i<48;i++){const p=document.createElement('i'),a=-Math.PI/2+(Math.random()-.5)*Math.PI*1.1,v=140+Math.random()*340,s=p.style;
   s.setProperty('--x',Math.round(Math.cos(a)*v)+'px');s.setProperty('--y',Math.round(Math.sin(a)*v)+'px');
   s.setProperty('--g',Math.round(Math.sin(a)*v*.2+260+Math.random()*180)+'px');s.setProperty('--r',Math.round((Math.random()-.5)*900)+'deg');
   s.background=cols[i%cols.length];s.width=(6+Math.random()*5)+'px';s.height=(9+Math.random()*7)+'px';if(i%3===0)s.borderRadius='50%';
   s.animationDuration=(1.2+Math.random()*.8)+'s';s.animationDelay=Math.round(Math.random()*80)+'ms';box.appendChild(p)}
  document.body.appendChild(box);setTimeout(()=>box.remove(),2400)}catch(e){}};
 const done=()=>{const n=Date.now();if(n-lastD<300)return;lastD=n;vib(8);go(c=>{const t=c.currentTime+.02;pop(784,t,.26,.3,960);pop(1174.7,t+.09,.22,.42,1380)})};
 // Sound is reserved for big moments. Typing, taps and navigation are always silent.
 return{S,set,confetti,done,unlock:prime,
  // a target was reached: a gentle four-pop arpeggio, a double-tap of haptics, optional confetti
  success(withConfetti){const n=Date.now();if(n-lastS<1500)return;lastS=n;vib([10,70,10]);if(withConfetti!==false)confetti();
   go(c=>{const t=c.currentTime+.02;[[523.25,0],[659.25,.09],[783.99,.18],[1046.5,.27]].forEach(([f,d],i)=>pop(f,t+d,.22+i*.015,.5+i*.06,f*1.18))})},
  // something is not possible: one quiet falling pop
  low(){const n=Date.now();if(n-lastL<600)return;lastL=n;vib(16);go(c=>{const t=c.currentTime+.02;pop(330,t,.24,.34,392);pop(262,t+.1,.19,.46,300)})},
  // Settings "Play test sound" button (always an explicit tap)
  test(){prime();go(c=>{const t=c.currentTime+.02;pop(659.25,t,.26,.34,800);pop(987.77,t+.09,.22,.5,1180)})}}
})();
// theme-aware extras (traffic lights, insight banners, confetti), injected so this file stays self-contained
(function(){try{if(document.getElementById('gtf-x'))return;const el=document.createElement('style');el.id='gtf-x';el.textContent=[
 ':root,[data-theme=sun],[data-theme=lav]{--warn:202 138 4}[data-theme=dark]{--warn:250 204 21}[data-theme=mono]{--warn:85 85 85}',
 '.tl-g{color:rgb(var(--good))}.tl-y{color:rgb(var(--warn))}.tl-r{color:rgb(var(--bad))}',
 '.tlb-g{background:rgb(var(--good)/.15);color:rgb(var(--good))}.tlb-y{background:rgb(var(--warn)/.16);color:rgb(var(--warn))}.tlb-r{background:rgb(var(--bad)/.15);color:rgb(var(--bad))}',
 '.ins-good{border-color:rgb(var(--good)/.45);background:rgb(var(--good)/.1)}.ins-warn{border-color:rgb(var(--warn)/.5);background:rgb(var(--warn)/.12)}.ins-bad{border-color:rgb(var(--bad)/.5);background:rgb(var(--bad)/.1)}.ins-idle{border-color:rgb(var(--line));background:rgb(var(--surface2)/.7)}',
 '.gtf-conf{position:fixed;inset:0;z-index:100;pointer-events:none;overflow:hidden}',
 '.gtf-conf i{position:absolute;left:50%;top:38%;display:block;opacity:0;animation:gtf-conf 1.6s cubic-bezier(.15,.7,.3,1) forwards}',
 '@keyframes gtf-conf{0%{opacity:1;transform:translate(0,0) rotate(0)}30%{opacity:1;transform:translate(var(--x),var(--y)) rotate(calc(var(--r)*.4))}100%{opacity:0;transform:translate(calc(var(--x)*1.3),var(--g)) rotate(var(--r))}}'
].join('');document.head.appendChild(el)}catch(e){}})();

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
const normP=l=>(Array.isArray(l)&&l.length?l:DEFP()).map((p,i)=>({id:p.id||('p'+(i+1)),name:String(p.name||'').trim()||('Period '+(i+1)),w:Math.max(0,+p.w)||0}));
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
 const periods=normP(cfg.periods),sumW=periods.reduce((a,p)=>a+p.w,0)||1,base=Math.min(99,Math.max(0,num(cfg.base,0)));
 // lowest percent that still earns grade g (used for each subject's Retention Grade)
 const pctFor=g=>{if(g==null||!Number.isFinite(+g))return null;if(!table)return +g;const r=table.filter(x=>dir<0?x[1]<=+g+1e-9:x[1]>=+g-1e-9);return r.length?Math.min(...r.map(x=>x[0])):101};
 return{id,P,table,target,pass,dir,fail,hi:P.hi,toG,meets,bad,need,periods,sumW,base,pctFor}};
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
const mk=(code,name,units,e,P)=>({id:uid(),code,name,units:String(units),e,acts:mkActs(P||DEFP()),wi:{}});
const blank=(pre,P)=>{P=P||DEFP();const y=uid(),s=uid();return{y,s,tg:{},cfg:{scale:'ph',periods:P},years:[{id:y,name:'1st Year',sems:[{id:s,name:'1st Semester',subs:[]}]}]}};
// ---- upgrade data saved by older versions (fixed quizzes/exams) to the dynamic model ----
const LEG=[['p1',[['q1','Quiz 1',20],['q2','Quiz 2',20],['pe','Prelims Exam',50],['pp','Participation',10]]],['p2',[['q3','Quiz 3',20],['q4','Quiz 4',20],['fe','Finals Exam',50],['fp','Participation',10]]]];
const migSub=s=>{if(!s)return s;let n=s;
 if(!n.acts){const acts={};LEG.forEach(([pid,l])=>{acts[pid]=l.map(([k,name,w])=>({id:k,name,w:String(w),s:(s.sc&&s.sc[k]&&s.sc[k].s)||'',m:(s.sc&&s.sc[k]&&s.sc[k].m)||''}))});const base={};if(s.cv&&+s.cv.b)base.p2=String(s.cv.b);n={...s,acts,base};delete n.sc;delete n.cv}
 if(n.base&&typeof n.base==='object'){const v=Object.values(n.base).filter(x=>x!==''&&x!=null),m={...n};if(v.length&&m.sbase===undefined)m.sbase=String(v[v.length-1]);delete m.base;n=m}
 return n};
const mig=d=>{if(!d||!Array.isArray(d.years))return d;const cfg=d.cfg||{},per=Array.isArray(cfg.periods)&&cfg.periods.length?cfg.periods:DEFP(),lb=per[per.length-1]&&per[per.length-1].base;
 return{...d,cfg:{...cfg,periods:per,base:cfg.base!==undefined?cfg.base:String(+lb||0)},years:d.years.map(y=>({...y,sems:(y.sems||[]).map(x=>({...x,subs:(x.subs||[]).map(migSub)}))}))}};
const BK='gtf-book',EMO=[],GEMO=[];
const okState=d=>d&&Array.isArray(d.years)&&d.years.length&&d.years.every(y=>y&&Array.isArray(y.sems)&&y.sems.length);
const defGroup=()=>({id:'g'+uid(),name:'General',icon:''});
const mkBook=d=>{const g=defGroup(),id=uid();return{list:[{id,name:'My Account',bio:'',emoji:'',gid:g.id}],data:{[id]:d},groups:[g]}};
const normBook=j=>{try{
 if(j&&Array.isArray(j.list)&&j.data&&typeof j.data==='object'){
  let gs=(Array.isArray(j.groups)?j.groups:[]).map(g=>typeof g==='string'?{id:'g'+uid(),name:g,icon:''}:g).filter(g=>g&&g.id&&g.name);
  const seen={};gs=gs.filter(g=>seen[g.name.toLowerCase()]?false:(seen[g.name.toLowerCase()]=1));
  if(!gs.length&&j.list.length)gs=[defGroup()]; // only to rescue accounts saved by an older version
  const by=Object.fromEntries(gs.map(g=>[g.name,g.id])),ids=new Set(gs.map(g=>g.id));
  const list=j.list.map(a=>{const n={...a};if(!n.gid||!ids.has(n.gid))n.gid=by[n.group]||gs[0].id;delete n.group;return n});
  return{list,data:j.data,groups:gs}}
 if(okState(j))return mkBook(j)}catch(e){}return null};
const loadRaw=()=>{let b=null;try{b=normBook(JSON.parse(localStorage.getItem(BK)))}catch(e){}if(!b)try{b=normBook(JSON.parse(localStorage.getItem('gtf-v1')))}catch(e){}if(!b)b={list:[],data:{},groups:[]}; // first launch: strictly empty, no groups and no accounts
 return b};
const loadBook=()=>{const b=loadRaw();Object.keys(b.data).forEach(k=>{b.data[k]=mig(b.data[k])});return b};
const saveBook=b=>{try{localStorage.setItem(BK,JSON.stringify(b))}catch(e){}};
const THEMES=[{"id":"sun","name":"Yellow Light","bar":"#FFFFFF","sw":["#FFFFFF","#FACC15","#1C1B18"]},{"id":"dark","name":"Yellow Dark","bar":"#0E0E11","sw":["#1C1C21","#FBBF24","#F6F6F8"]},{"id":"blue","name":"Blue Light","bar":"#F4F8FF","sw":["#FFFFFF","#2563EB","#0F1D36"]},{"id":"bluedk","name":"Blue Dark","bar":"#080D18","sw":["#111A2C","#60A5FA","#EEF4FF"]},{"id":"red","name":"Red Light","bar":"#FFF7F7","sw":["#FFFFFF","#DC2626","#2E1014"]},{"id":"reddk","name":"Red Dark","bar":"#140909","sw":["#221114","#F87171","#FFF0F1"]},{"id":"green","name":"Green Light","bar":"#F5FCF7","sw":["#FFFFFF","#16A34A","#0E281A"]},{"id":"greendk","name":"Green Dark","bar":"#08120D","sw":["#101F17","#4ADE80","#ECFCF1"]},{"id":"mono","name":"Monochrome","bar":"#FAFAFA","sw":["#FFFFFF","#111111","#737373"]},{"id":"lav","name":"Lavender","bar":"#F7F5FF","sw":["#FFFFFF","#7C3AED","#1E1B3A"]}];
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
   Period grade     = weighted average of the activities (raw, 0 to 100)
   Semestral raw    = weighted average of the period grades (weights can differ per subject)
   Semestral grade  = (Raw / 100) * (100 - Base) + Base        <- the curve is applied HERE
   Needed raw       = (Target - Base) / (100 - Base) * 100      <- its inverse, used by the Forecaster
   ===================================================================== */
const ap=a=>{if(!a||a.s===''||a.s==null)return null;const m=a.m===''||a.m==null?100:+a.m;return m>0?+a.s/m*100:null};
const wgt=a=>Math.max(0,+a.w)||0;
const trans=(R,B)=>Math.min(100,(R/100)*(100-B)+B);
const untrans=(T,B)=>(T-B)/(100-B)*100;
const actsOf=(s,p)=>(s.acts&&s.acts[p.id])||[];
const sbaseOf=s=>{const o=s.sbase,v=o===undefined||o===null||o===''||!Number.isFinite(+o)?CUR.base:+o;return Math.min(99,Math.max(0,v))};
const wts=(s,P)=>P.map(p=>{const o=s.pw&&s.pw[p.id],v=o===undefined||o===null||o===''||!Number.isFinite(+o)?p.w:+o;return Math.max(0,v)});
const wiv=(s,a)=>s.wi&&s.wi[a.id]!==undefined?s.wi[a.id]:'85';
const mxs=a=>+a.m||100;
// one grading period of one subject (raw), using only what has been entered
const pcalc=(s,p)=>{const acts=actsOf(s,p),live=acts.filter(a=>wgt(a)>0);let W=0,K=0,Wk=0,n=0;
 live.forEach(a=>{const w=wgt(a),x=ap(a);W+=w;if(x!=null){K+=w*x;Wk+=w;n++}});
 const total=live.length,complete=total>0&&n===total,raw=complete&&W>0?K/W:null,soFar=Wk>0?K/Wk:null;
 return{acts,live,W,K,n,total,complete,raw,soFar,grade:raw,gradeSoFar:soFar}};
// forecast for one period. T is the wanted RAW period grade; entered scores stay fixed, missing ones use the what-if sliders.
const pproj=(s,p,T)=>{const c=pcalc(s,p),wi=a=>+wiv(s,a)||0,miss=c.live.filter(a=>ap(a)==null);
 const Wm=miss.reduce((t,a)=>t+wgt(a),0),pts=T*c.W-c.K,uni=Wm>0?pts/Wm:null;
 const alone=miss.map(a=>{const o=miss.reduce((t,x)=>x===a?t:t+wgt(x)*wi(x),0);return[a.id,(pts-o)/wgt(a)]});
 let Kp=c.K;miss.forEach(a=>{Kp+=wgt(a)*wi(a)});const Rp=c.W>0?Kp/c.W:null;
 return{...c,miss,Wm,uni,alone,Rneed:T,proj:Rp}};
const wavg=(vals,W)=>{let t=0,w=0;vals.forEach((v,i)=>{if(v!=null){t+=W[i]*v;w+=W[i]}});return w>0?t/w:null};
// semestral grade from real scores only (needs every period complete); the Base is applied here
const semCalc=(s,P)=>{const W=wts(s,P),B=sbaseOf(s),cc=P.map(p=>pcalc(s,p)),act=cc.filter(c=>c.total>0),done=act.length>0&&act.every(c=>c.complete),raw=done?wavg(cc.map(c=>c.total>0?c.raw:null),W):null;
 return{W,B,cc,done,raw,grade:raw==null?null:trans(raw,B)}};
const semActual=(s,P)=>semCalc(s,P).grade;
// semestral grade using real scores plus what-if values for anything missing
const semProjC=(s,P)=>{const W=wts(s,P),B=sbaseOf(s),pr=P.map(p=>pproj(s,p,0)),raw=wavg(pr.map(x=>x.proj),W);return{W,B,pr,raw,grade:raw==null?null:trans(raw,B)}};
// raw grade needed in period i so the RAW semestral grade lands on Rs, given the other periods' projections
const needIn=(prj,W,i,Rs)=>{let o=0,Wt=W[i];prj.forEach((x,j)=>{if(j!==i&&x!=null){o+=W[j]*x;Wt+=W[j]}});return W[i]>0?(Rs*Wt-o)/W[i]:null};
const gwa=a=>{let u=0,t=0;a.forEach(([e,n])=>{if(e!=null&&+n>0){u+=+n;t+=e*n}});return u?t/u:null};
// gen eds: the first period grade is known, the remaining periods use the expected grade (entered as released, no Base)
const gproj=(g,P)=>{const pre=+g.pre||0,fin=+g.fin||0,W=P.reduce((a,p)=>a+p.w,0)||1,rest=W-P[0].w,sem=P.length>1?(P[0].w*pre+rest*fin)/W:pre;return{pre,fin,sem,eq:eqv(sem)}};
const needGen=(g,P,S)=>{const W=P.reduce((a,p)=>a+p.w,0)||1,rest=W-P[0].w;return P.length>1&&rest>0?(S*W-P[0].w*(+g.pre||0))/rest:null};
// Reverse calculator: a released period grade is known, some scores are not.
// mode 'r': the grade is a raw period grade. mode 'b': it already includes the Base, so raw = (T - Base) / (100 - Base) * 100.
const rvPlan=(s,p,Tstr,mode)=>{const T=+Tstr;if(Tstr===''||Tstr==null||!Number.isFinite(T))return{ok:false,msg:'Enter the released grade first.'};
 const c=pcalc(s,p),B=sbaseOf(s);if(!c.live.length)return{ok:false,msg:'Add at least one activity with a weight first.'};
 const miss=c.live.filter(a=>ap(a)==null);if(!miss.length)return{ok:false,msg:'Every activity already has a score.'};
 if(T>100)return{ok:false,msg:'A grade above 100 is not possible.'};
 if(mode==='b'&&T<B-1e-9)return{ok:false,msg:'With Base '+f2(B)+' the lowest possible grade is '+f2(B)+'.'};
 if(T<0)return{ok:false,msg:'A grade below 0 is not possible.'};
 const R=mode==='b'?untrans(T,B):T,Wm=miss.reduce((t,a)=>t+wgt(a),0),x=(R*c.W-c.K)/Wm;
 if(x>100+1e-9)return{ok:false,msg:'Not possible: the missing scores would need '+f2(x)+'%, which is above 100%.'};
 if(x<-1e-9)return{ok:false,msg:'Not possible: the scores you entered already give a higher grade than '+f2(T)+'.'};
 return{ok:true,x:Math.max(0,x),miss,R,B}};
const need=v=>v==null?['—',false]:v<=0?['Secured ✓',false]:v>100?['Out of reach ('+f2(v)+'%)',true]:[f2(v)+'%',false];
const ng=v=>v==null?'—':v<=0?'Secured ✓':v>100?'Out of reach':f2(v);

// ---- Retention grade (per subject), needed scores, traffic lights ----
const RETCH={ph:[3,2.5,2],gpa:[2,2.7,3],pct:[70,75,80]};
// the lowest grade a subject must keep. Blank = the default passing mark from Settings.
const retOf=s=>{const o=s&&s.ret,has=o!==undefined&&o!==null&&o!==''&&Number.isFinite(+o);
 if(!has)return{g:CUR.table?CUR.toG(CUR.pass):CUR.pass,pct:CUR.pass,custom:false};
 return{g:+o,pct:CUR.pctFor(+o),custom:true}};
// Linear model of one subject: if every missing score equals x, raw semestral = a + b*x
const linSub=(s,P)=>{const w=wts(s,P);let a=0,b=0,Wt=0;
 P.forEach((p,i)=>{const c=pcalc(s,p);if(!(c.W>0))return;const Wm=c.live.reduce((t,q)=>ap(q)==null?t+wgt(q):t,0);a+=w[i]*c.K/c.W;b+=w[i]*Wm/c.W;Wt+=w[i]});
 return Wt>0?{a:a/Wt,b:b/Wt,B:sbaseOf(s)}:null};
// what the missing scores must average so the semestral grade (after Base) reaches Sx
const needX=(l,Sx)=>{if(!l)return null;if(l.b<1e-9)return{done:true,x:null,ok:trans(l.a,l.B)>=Sx-1e-9};return{done:false,x:(untrans(Sx,l.B)-l.a)/l.b}};
const missOf=(s,P)=>[].concat(...P.map(p=>pcalc(s,p).live.filter(a=>ap(a)==null)));
// traffic light: green under 75, yellow 75 to 89, red 90 and up (or out of reach)
const tlX=x=>x==null?'':x<=0?'g':x>100?'r':(c=>c<75?'g':c<90?'y':'r')(Math.ceil(x-1e-9));
const TLC={g:'tl-g',y:'tl-y',r:'tl-r'},TLB={g:'tlb-g',y:'tlb-y',r:'tlb-r'},TLW={g:'Easy',y:'Moderate',r:'Critical'};
const tlCls=x=>{const k=tlX(x);return k?TLC[k]:''};
const needTC=o=>{if(!o)return'';if(o.done)return o.ok?'g':'r';return tlX(o.x)};
const needLbl=(o,ms)=>{if(!o)return'No activities to score';if(o.done)return o.ok?'Secured ✓':'Already locked below it';if(o.x<=1e-9)return'Secured ✓';if(o.x>100+1e-9)return'Out of reach ('+f2(o.x)+'%)';
 const c=Math.ceil(o.x-1e-9);return ms.length===1?'Need '+c+'% on '+(ms[0].name||'the last score'):'Need ~'+c+'% on each of '+ms.length+' remaining scores'};
const needShort=o=>o==null?'—':o.done?(o.ok?'Secured ✓':'Locked below'):o.x<=1e-9?'Secured ✓':o.x>100+1e-9?'Out of reach':Math.ceil(o.x-1e-9)+'%';

/* =====================================================================
   5. UI PRIMITIVES (theme-aware: every colour is a CSS token, see index.html)
   ===================================================================== */
const CARD='gc rounded-[1.75rem]';
const BTN='inline-flex items-center justify-center gap-1.5 rounded-xl border border-line bg-ink/[.06] px-3.5 py-2 text-sm font-semibold text-ink hover:bg-ink/[.09] hover:border-ink/20 active:scale-[.97] transition disabled:opacity-40 disabled:pointer-events-none';
const BTNP='inline-flex items-center justify-center gap-1.5 rounded-xl bg-accent px-4 py-2 text-sm font-bold text-accent-ink shadow-sm hover:brightness-105 active:scale-[.97] transition disabled:opacity-50 disabled:pointer-events-none';
const BTNX='inline-flex items-center justify-center gap-1.5 rounded-xl border border-bad/30 px-3.5 py-2 text-sm font-semibold text-bad hover:bg-bad/10 active:scale-[.97] transition';
const INP='rounded-2xl border border-line/60 bg-ink/[.06] text-center text-base font-semibold text-ink transition placeholder:font-normal placeholder:text-muted/60 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/40';
const SEL='rounded-xl border border-line bg-ink/[.06] px-3 py-2 text-base font-semibold text-ink max-w-full focus:outline-none focus:ring-2 focus:ring-accent/40';
const LBL='text-xs font-bold uppercase tracking-[.12em] text-muted';
const LBL2='text-[10px] font-bold uppercase leading-tight tracking-[.08em] text-muted sm:text-xs sm:tracking-[.12em]';

const Num=({v,on,ph,w='w-20',nav,bad,clk})=><input inputMode="decimal" enterKeyHint="next" data-n={nav?1:undefined} onKeyDown={nav?e=>{if(e.key==='Enter'){e.preventDefault();const a=[...document.querySelectorAll('input[data-n]')],i=a.indexOf(e.target),n=a[i+1];n?n.focus():e.target.blur()}}:undefined} value={v??''} placeholder={ph} onChange={e=>{const x=e.target.value;if(/^\d*\.?\d*$/.test(x)){on(x)}}} className={cx(INP,'h-11 min-w-0 sm:h-12',w,bad&&'!border-bad ring-2 ring-bad/40')}/>;
const TextIn=({v,on,ph,cls='',type='text'})=><input type={type} value={v} placeholder={ph} autoComplete="off" onChange={e=>on(e.target.value)} className={cx(INP,'h-11 w-full !text-left px-3.5 sm:h-12',cls)}/>;
const Txt=({v,on,cls=''})=><input value={v} onChange={e=>on(e.target.value)} className={cx('min-w-0 rounded-xl bg-transparent px-2 py-1 text-base text-ink transition hover:bg-ink/[.09] focus:outline-none focus:ring-2 focus:ring-accent/40',cls)}/>;
const Seg=({v,on,opts,cls=''})=><div className={cx('inline-grid grid-flow-col auto-cols-fr gap-1 rounded-2xl border border-line/70 bg-ink/[.06] p-1',cls)}>{opts.map(([k,l])=><button key={k} onClick={()=>on(k)} className={cx('min-w-0 rounded-xl px-3 py-2 text-center text-sm font-bold leading-tight transition-all duration-300',v===k?'bg-accent text-accent-ink shadow':'text-muted hover:text-ink')}>{l}</button>)}</div>;
const Chev=({open})=><svg viewBox="0 0 20 20" className={cx('h-5 w-5 shrink-0 text-muted transition-transform duration-300',open&&'rotate-180')} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 7.5l5 5 5-5"/></svg>;
const Tile=({l,v,sub,bad,vc})=><div className="rounded-2xl border border-line/60 bg-ink/[.06] p-3"><div className="text-xs font-semibold text-muted">{l}</div><div className={cx('text-xl font-extrabold tabular-nums',vc||(bad?'text-bad':'text-ink'))}>{v}</div>{sub&&<div className="mt-0.5 text-xs text-muted">{sub}</div>}</div>;
const Switch=({on,onChange,label,sub})=><button role="switch" aria-checked={on} onClick={onChange} className="flex w-full items-center justify-between gap-3 rounded-2xl border border-line/60 bg-ink/[.06] p-3 text-left transition hover:bg-ink/[.09]"><span className="min-w-0"><span className="block text-sm font-bold">{label}</span>{sub&&<span className="block text-xs text-muted">{sub}</span>}</span><span className={cx('relative h-6 w-11 shrink-0 rounded-full transition-colors duration-300',on?'bg-accent':'bg-line')}><span className={cx('absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all duration-300',on?'left-[1.4rem]':'left-0.5')}/></span></button>;
const AccentBox=({l,v,rl,r,foot})=><div className="flex items-center justify-between rounded-2xl bg-accent p-4 text-accent-ink shadow-md shadow-accent/20"><div><div className="text-xs font-semibold opacity-70">{l}</div><div className="tot inline-block text-3xl font-black tabular-nums">{v}</div></div><div className="text-right"><div className="text-xs font-semibold opacity-70">{rl}</div><div className="text-2xl font-black tabular-nums">{r}</div><div className="text-xs font-bold">{foot}</div></div></div>;
const Avatar=({a,s='h-14 w-14',t='text-3xl'})=>a&&a.pic?<img src={a.pic} alt="" className={cx(s,'shrink-0 rounded-2xl object-cover ring-1 ring-line')}/>:<div className={cx(s,t,'grid shrink-0 place-items-center rounded-2xl bg-accent/20 ring-1 ring-accent/30')}>{((a&&a.name)||'?').trim().charAt(0).toUpperCase()}</div>;

// Accordion card: click the header to expand; content animates open
const Acc=({open,onToggle,head,children,cls='',sa})=><section className={cx(CARD,'overflow-hidden',sa!=null&&'sa-'+(sa%6),cls)}>
 <button onClick={onToggle} aria-expanded={!!open} className="flex w-full items-center gap-3 p-4 text-left transition hover:bg-ink/[.09]">{head}<Chev open={open}/></button>
 <div className={cx('acc',open&&'open')} inert={!open}><div><div className="flex flex-col gap-4 p-4 pt-1">{children}</div></div></div></section>;

// Modal sheet (bottom sheet on phones, centred card on larger screens)
function Sheet({open,onClose,title,children,wide}){
 useEffect(()=>{if(!open)return;const k=e=>e.key==='Escape'&&onClose();window.addEventListener('keydown',k);const o=document.body.style.overflow;document.body.style.overflow='hidden';return()=>{window.removeEventListener('keydown',k);document.body.style.overflow=o}},[open]);
 if(!open)return null;
 return <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-6">
  <div onClick={onClose} className="anim-fade absolute inset-0 bg-ink/40 backdrop-blur-sm"/>
  <div className={cx('anim-sheet relative max-h-[92dvh] w-full overflow-y-auto overscroll-contain gcs rounded-t-[2rem] sm:rounded-[2rem]',wide?'sm:max-w-2xl':'sm:max-w-lg')} style={{paddingBottom:'env(safe-area-inset-bottom,0px)'}}>
   <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-line/40 px-6 py-4"><h2 className="text-lg font-extrabold">{title}</h2><button onClick={onClose} aria-label="Close" className={BTN+' !px-3'}>✕</button></div>
   <div className="flex flex-col gap-7 p-6">{children}</div></div></div>;
}

const Tip=({t})=>{const [o,setO]=useState(false),[ps,setPs]=useState(null),b=useRef(null),p=useRef(null);
 // measure after the first paint, then keep the bubble 16px inside every screen edge (and flip above the icon when there is no room below)
 useLayoutEffect(()=>{if(!o){setPs(null);return}const el=b.current,tp=p.current;if(!el||!tp)return;const r=el.getBoundingClientRect(),vw=window.innerWidth,vh=window.innerHeight,pad=16,w=Math.min(280,vw-pad*2),h=tp.offsetHeight;
  const left=Math.max(pad,Math.min(r.left+r.width/2-w/2,vw-w-pad));let top=r.bottom+10;if(top+h>vh-pad)top=Math.max(pad,r.top-10-h);setPs({left,top,w})},[o]);
 useEffect(()=>{if(!o)return;const close=()=>setO(false),down=e=>{const x=e.target;if((b.current&&b.current.contains(x))||(p.current&&p.current.contains(x)))return;close()},key=e=>{if(e.key==='Escape')close()};
  window.addEventListener('scroll',close,true);window.addEventListener('resize',close);document.addEventListener('pointerdown',down);document.addEventListener('keydown',key);
  return()=>{window.removeEventListener('scroll',close,true);window.removeEventListener('resize',close);document.removeEventListener('pointerdown',down);document.removeEventListener('keydown',key)}},[o]);
 return <><button ref={b} type="button" onClick={e=>{e.preventDefault();e.stopPropagation();setO(v=>!v)}} aria-label="More info" aria-expanded={o} className="ml-1.5 inline-grid h-5 w-5 place-items-center rounded-full border border-muted/60 align-middle text-[11px] font-bold leading-none text-muted transition hover:border-accent hover:text-accent-text">i</button>
  {o&&createPortal(<div ref={p} role="tooltip" style={ps?{left:ps.left,top:ps.top,width:ps.w}:{left:0,top:0,width:Math.min(280,window.innerWidth-32),visibility:'hidden'}} className="anim-fade fixed z-[90] gcs rounded-2xl p-4 text-left text-sm font-medium normal-case leading-relaxed tracking-normal text-ink shadow-2xl">{t}</div>,document.body)}</>};
const IC={o:'M4 11l8-6.5 8 6.5M6 9.5V19h4v-5h4v5h4V9.5',t:'M9 6h11M9 12h11M9 18h11M4.5 6h.01M4.5 12h.01M4.5 18h.01',f:'M3 20h18M6 20v-8M11 20V5M16 20v-5M21 20v-9',p:'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM5 20c.7-3.5 3.5-5.5 7-5.5s6.3 2 7 5.5',s:'M4 7h9M17 7h3M4 17h3M11 17h9M15 4v6M9 14v6',w:'M2 9l10-5 10 5-10 5zM6 11.5V16c0 1.5 3 3 6 3s6-1.5 6-3v-4.5M22 9v5',g:'M9 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM3 19c.5-3 3-4.5 6-4.5s5.5 1.5 6 4.5M17 11a2.6 2.6 0 1 0 0-5.2M17.5 14.6c2 .4 3.3 1.8 3.7 4.4'};
const NAV=[['o','Overview'],['t','Tracker'],['f','Forecast'],['w','GWA'],['p','Profile'],['s','Settings']];
const BottomNav=({tab,on})=>{const i=NAV.findIndex(x=>x[0]===tab),N=NAV.length;return <nav aria-label="Main" className="fixed inset-x-0 z-40 flex justify-center px-2 sm:px-3" style={{bottom:'calc(env(safe-area-inset-bottom,0px) + .75rem)'}}>
 <div className="glass relative grid w-full max-w-lg grid-cols-6 rounded-[1.75rem] p-1.5 md:max-w-2xl">
  {i>=0&&<span aria-hidden="true" className="absolute bottom-1.5 top-1.5 rounded-[1.3rem] bg-accent shadow-md shadow-accent/30 transition-all duration-500 ease-[cubic-bezier(.2,.8,.2,1)]" style={{left:'calc(.375rem + '+i+' * (100% - .75rem) / '+N+')',width:'calc((100% - .75rem) / '+N+')'}}/>}
  {NAV.map(([k,l])=><button key={k} onClick={()=>on(k)} aria-current={tab===k?'page':undefined} className={cx('relative z-10 flex min-w-0 flex-col items-center gap-0.5 rounded-[1.3rem] py-2 text-[9px] font-bold tracking-tight transition-colors duration-300 sm:text-[10px] md:text-xs',tab===k?'text-accent-ink':'text-muted hover:text-ink')}>
   <svg viewBox="0 0 24 24" className="h-[21px] w-[21px] md:h-[22px] md:w-[22px]" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d={IC[k]}/></svg><span className="max-w-full truncate">{l}</span></button>)}</div></nav>};
const ThemePicker=({theme,setTheme})=><div className="grid grid-cols-2 gap-3 sm:grid-cols-3">{THEMES.map(t=><button key={t.id} onClick={()=>setTheme(t.id)} className={cx('rounded-2xl border p-3 text-left transition-all duration-300 hover:-translate-y-0.5',theme===t.id?'border-accent ring-2 ring-accent/40 bg-ink/[.08]':'border-line bg-ink/[.06] hover:bg-ink/[.09]')}>
 <div className="mb-2 flex gap-1.5">{t.sw.map((c,i)=><span key={i} className="h-6 w-6 rounded-full border border-black/10" style={{background:c}}/>)}</div>
 <div className="text-sm font-bold">{t.name}</div><div className="text-xs text-muted">{theme===t.id?'Selected':'Tap to use'}</div></button>)}</div>;

// Tiger mark: a tiger paw whose main pad is an open book, framed by tiger stripes. Pass a className to size it, e.g. "h-10 w-10".
function TigerLogo({className='h-10 w-10',title='Grades Tracker: tiger paw and open book'}){
 const id=React.useId().replace(/:/g,''),G='url(#'+id+'g)',K='url(#'+id+'k)';
 return <svg viewBox="0 0 512 512" className={className} role="img" aria-label={title} xmlns="http://www.w3.org/2000/svg">
  <defs><linearGradient id={id+'g'} x1=".15" y1="0" x2=".6" y2="1"><stop offset="0" stopColor="#FFE27A"/><stop offset="1" stopColor="#F59E0B"/></linearGradient><clipPath id={id+'k'}><rect width="512" height="512" rx="116"/></clipPath></defs>
  <rect width="512" height="512" rx="116" fill={G}/><g clipPath={K}><g fill="#2A1A05">
  <path d="M-10 96C64 100 120 124 160 168C108 148 46 142 -10 146Z"/>
  <path d="M-10 214C38 216 76 230 100 256C70 246 30 244 -10 248Z"/>
  <path d="M-10 330C34 334 62 348 80 372C54 364 24 362 -10 366Z"/>
  <path d="M522 96C448 100 392 124 352 168C404 148 466 142 522 146Z"/>
  <path d="M522 214C474 216 436 230 412 256C442 246 482 244 522 248Z"/>
  <path d="M522 330C478 334 450 348 432 372C458 364 488 362 522 366Z"/>
</g></g>
  <g transform="translate(0,-14)">
    
    <g fill="#2A1A05">
      <ellipse cx="126" cy="254" rx="30" ry="41" transform="rotate(-26 126 254)"/>
      <ellipse cx="204" cy="188" rx="33" ry="46" transform="rotate(-8 204 188)"/>
      <ellipse cx="308" cy="188" rx="33" ry="46" transform="rotate(8 308 188)"/>
      <ellipse cx="386" cy="254" rx="30" ry="41" transform="rotate(26 386 254)"/>
    </g>
    
    <g transform="translate(256 366) scale(1.1) translate(-256 -366)"><g fill="#FFF8E1" stroke="#FFF8E1" strokeWidth="18" strokeLinejoin="round">
      <path d="M248 332C224 312 190 306 154 312V394C190 388 224 394 248 414Z"/>
      <path d="M264 332C288 312 322 306 358 312V394C322 388 288 394 264 414Z"/>
    </g>
    <g fill="none" stroke="#2A1A05" strokeWidth="9" strokeLinecap="round">
      <path d="M176 340C196 337 218 340 234 350"/><path d="M176 364C196 361 218 364 234 374"/>
      <path d="M336 340C316 337 294 340 278 350"/><path d="M336 364C316 361 294 364 278 374"/>
    </g></g>
  </g>
 </svg>;
}
const GroupIcon=({g,s='h-14 w-14',t='text-3xl'})=>g&&g.pic?<img src={g.pic} alt="" className={cx(s,'shrink-0 rounded-2xl object-cover ring-1 ring-line')}/>:<div className={cx(s,t,'grid shrink-0 place-items-center rounded-2xl bg-accent/20 ring-1 ring-accent/30')}>{((g&&g.name)||'G').trim().charAt(0).toUpperCase()}</div>;

/* =====================================================================
   AMBIENT BACKGROUND  (faint, blurred tiger stripes and paws behind every screen; colours follow the theme)
   ===================================================================== */
const stripeD=(y,L,t)=>`M-4 ${y}C${(L*.4).toFixed(1)} ${y+1} ${(L*.75).toFixed(1)} ${(y+L*.12).toFixed(1)} ${L} ${(y+L*.26).toFixed(1)}C${(L*.66).toFixed(1)} ${(y+L*.14+t*.3).toFixed(1)} ${(L*.3).toFixed(1)} ${(y+t*.95).toFixed(1)} -4 ${y+t}Z`;
// many small stripes of varied length, packed closely down each edge (deterministic, so the pattern never jumps)
const STRIPES=(()=>{const a=[];let y=10,i=0;while(y<2600){a.push([y+(i%2?3:-2),30+((i*37)%58),4+((i*13)%6)]);y+=26+((i*11)%14);i++}return a})();
const PAW='M256 292c-58 0-104 40-104 90 0 32 24 52 56 52 20 0 32-9 48-9s28 9 48 9c32 0 56-20 56-52 0-50-46-90-104-90z';
const Toes=<><ellipse cx="120" cy="250" rx="36" ry="50" transform="rotate(-26 120 250)"/><ellipse cx="206" cy="168" rx="40" ry="56" transform="rotate(-8 206 168)"/><ellipse cx="306" cy="168" rx="40" ry="56" transform="rotate(8 306 168)"/><ellipse cx="392" cy="250" rx="36" ry="50" transform="rotate(26 392 250)"/><path d={PAW}/></>;
const Ambient=React.memo(()=><div aria-hidden="true" className="amb">
 <i className="amb-b amb-b1"/><i className="amb-b amb-b2"/><i className="amb-b amb-b3"/>
 <svg className="amb-paws" width="100%" height="100%"><defs><symbol id="gtfpaw" viewBox="0 0 512 512">{Toes}</symbol>
  <pattern id="gtfpp" width="124" height="124" patternUnits="userSpaceOnUse"><use href="#gtfpaw" className="amb-s" x="10" y="12" width="20" height="20" transform="rotate(-24 20 22)"/><use href="#gtfpaw" className="amb-s" x="72" y="74" width="16" height="16" transform="rotate(22 80 82)"/></pattern></defs>
  <rect width="100%" height="100%" fill="url(#gtfpp)"/></svg>
 {['l','r'].map(k=><svg key={k} className={'amb-edge amb-'+k} viewBox="0 0 110 2600" preserveAspectRatio="xMinYMin slice"><g className="amb-s">{STRIPES.map(([y,L,t],i)=><path key={i} d={stripeD(y,L,t)}/>)}</g></svg>)}
</div>);

/* =====================================================================
   7. APP  (one profile: Tracker, Forecaster, Settings)
   ===================================================================== */
function App({init,acct,guest,onSave,onSwitch,onKeep,cloud,ext,loser,onLoser,theme,setTheme,prof}){
 const [st,setSt]=useState(()=>mig(init)),[tab,setTab]=useState('o'),[sub,setSub]=useState(null),[gv,setGv]=useState('grades'),[sx,setSx]=useState(false),[gadd,setGadd]=useState(false),[gf,setGf]=useState({name:'',units:'3',pre:''}),[adding,setAdding]=useState(false),[nf,setNf]=useState({code:'',name:'',units:'3',ret:'',kind:'major'}),[msg,setMsg]=useState(''),[kn,setKn]=useState(''),[sid,setSid]=useState(null),[dir,setDir]=useState(1),[pid,setPid]=useState(null),[edit,setEdit]=useState(false),[rvMsg,setRvMsg]=useState(null),[rvMode,setRvMode]=useState({}),[,setNow]=useState(0),[pill,setPill]=useState(false);
 const ref=useRef(st),past=useRef([]),fut=useRef([]),last=useRef({k:'',t:0}),e0=useRef(ext&&ext.n),swRef=useRef(null),sw=useRef({on:false});
 const [fxs,setFxs]=useState(()=>({snd:FX.S.snd,hap:FX.S.hap})),[ox,setOx]=useState({}),[shr,setShr]=useState(null),[opt,setOpt]=useState({}),[pf,setPf]=useState({o:'',n:'',n2:'',go:'',gn:'',gn2:''}),[pm,setPm]=useState('');
 const togFx=k=>{const v=!fxs[k];FX.set(k,v);setFxs({...fxs,[k]:v})};
 const commit=n=>{ref.current=n;setSt(n);onSave(n)};
 useEffect(()=>{if(ext&&ext.data&&ext.n!==e0.current){e0.current=ext.n;const d=mig(ext.data);ref.current=d;setSt(d);past.current=[];fut.current=[];last.current={k:'',t:0}}},[ext&&ext.n]);
 useEffect(()=>{const t=setInterval(()=>setNow(x=>x+1),20000);return()=>clearInterval(t)},[]);
 useEffect(()=>{if(!pill)return;const k=e=>e.key==='Escape'&&setPill(false);window.addEventListener('keydown',k);return()=>window.removeEventListener('keydown',k)},[pill]);
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
 const setSBase=(id,v)=>updSub(id,s=>({...s,sbase:v}),'sb');
 const setRet=(id,v)=>updSub(id,s=>({...s,ret:v}),'rt');
 const setPW=(id,i,v)=>updSub(id,s=>{const pw={...(s.pw||{})};pw[P[i].id]=v;if(P.length===2){pw[P[1-i].id]=v!==''&&Number.isFinite(+v)?String(+(100-Math.min(100,Math.max(0,+v))).toFixed(2)):''}return{...s,pw}},'pw'+i);
 const setPWs=(id,arr)=>updSub(id,s=>({...s,pw:Object.fromEntries(P.map((p,i)=>[p.id,String(arr[i])]))}));
 const resetPW=id=>updSub(id,s=>{const n={...s};delete n.pw;return n});
 const setWi=(id,aid,v)=>updSub(id,s=>({...s,wi:{...(s.wi||{}),[aid]:v}}),'w'+aid);
 const setRel=(id,p,v)=>updSub(id,s=>({...s,rel:{...(s.rel||{}),[p]:v}}),'rel'+p);
 const rvFill=(s,p)=>{const k=s.id+p.id,plan=rvPlan(s,p,(s.rel&&s.rel[p.id])??'',rvMode[s.id+p.id]||'r');if(!plan.ok){FX.low();setRvMsg({k,msg:plan.msg,bad:true});return}
  const fill=a=>plan.miss.some(m=>m.id===a.id)?{...a,s:String(+(plan.x/100*mxs(a)).toFixed(2)),est:true}:a;
  updSub(s.id,x=>({...x,acts:{...x.acts,[p.id]:actsOf(x,p).map(fill)}}));
  const ns={...s,acts:{...s.acts,[p.id]:actsOf(s,p).map(fill)}};
  setRvMsg({k,msg:`Filled ${plan.miss.length} possible score${plan.miss.length>1?'s':''} at about ${f2(plan.x)}% each. ${p.name} grade is now ${f2(pcalc(ns,p).grade)}.`,bad:false});FX.done()};
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
 const addSub=()=>{if(!nf.code.trim())return;const m={...mk(nf.code.trim().toUpperCase(),nf.name.trim(),nf.units||'3','',P),ret:nf.ret||'',kind:nf.kind||'major'};upd(x=>({...x,subs:[...x.subs,m]}));setSid(m.id);setNf({code:'',name:'',units:'3',ret:'',kind:'major'});setAdding(false)};
 const delSub=id=>upd(x=>({...x,subs:x.subs.filter(s=>s.id!==id)}));
 const clearScores=ids=>upd(x=>({...x,subs:x.subs.map(s=>!ids||ids.includes(s.id)?{...s,rel:{},acts:Object.fromEntries(Object.entries(s.acts||{}).map(([k,l])=>[k,l.map(a=>({...a,s:'',m:'',est:false}))]))}:s)}));
 const addGen=()=>{if(!gf.name.trim())return;upd(x=>({...x,gens:[...(x.gens||[]),{id:uid(),name:gf.name.trim(),units:gf.units||'3',pre:gf.pre,fin:'85'}]}));setGf({name:'',units:'3',pre:''});setGadd(false)};
 const setGen=(id,f,v)=>upd(x=>({...x,gens:(x.gens||[]).map(g=>g.id===id?{...g,[f]:v}:g)}),'g'+f+id);
 const delGen=id=>upd(x=>({...x,gens:(x.gens||[]).filter(g=>g.id!==id)}));
 const restoreLoser=()=>{try{set(()=>mig(JSON.parse(loser.d)))}catch(e){}onLoser()};
 const exportData=()=>{const d=JSON.stringify({app:'grades-tracker',version:3,account:acct.name,exported:new Date().toISOString(),data:ref.current},null,2),a=document.createElement('a');a.href=URL.createObjectURL(new Blob([d],{type:'application/json'}));a.download='grades-'+(acct.name||'backup').replace(/[^a-z0-9]+/gi,'-').toLowerCase()+'-'+new Date().toISOString().slice(0,10)+'.json';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),1500);setMsg('Backup downloaded ✓')};
 const importData=e=>{const f=e.target.files&&e.target.files[0];e.target.value='';if(!f)return;const r=new FileReader();r.onload=()=>{try{const j=JSON.parse(r.result),d=j&&j.data?j.data:j;if(!okState(d))throw new Error('bad');set(()=>mig(d));setMsg('Backup restored ✓ (Undo at the top of the screen brings back your previous data)')}catch(x){setMsg('That file is not a valid backup.')}};r.onerror=()=>setMsg('Could not read that file.');r.readAsText(f)};

 /* ---- derived numbers ---- */
 const subs=S.subs,gens=S.gens||[],gps=gens.map(g=>gproj(g,P)),last0=P.length-1,Wg=P.map(p=>p.w);
 const cur=subs.find(s=>s.id===sid)||subs[0],idx=cur?subs.indexOf(cur):-1,pcur=P.find(p=>p.id===pid)||P[0];
 const fsub=P.some(p=>p.id===sub)?sub:P[0].id;
 const rowsS=subs.map(s=>{const sc=semProjC(s,P),rt=retOf(s),l=linSub(s,P);return{s,sc,rt,l,pg:sc.pr.map(x=>x.proj),sem:sc.grade,eq:sc.grade==null?null:eqv(sc.grade),act:semActual(s,P),ex:needX(l,C.need),sv:needX(l,rt.pct)}});
 const genEx=g=>{const x=needGen(g,P,C.need);return x==null?null:{done:false,x}};
 const all=[...rowsS.map(r=>({n:r.s.code,e:r.s.e||'',u:r.s.units,pg:r.pg,sem:r.sem,eq:r.eq,maj:1,W:r.sc.W,B:r.sc.B,s:r.s,raw:r.sc.raw,rt:r.rt,ex:r.ex,sv:r.sv,ms:missOf(r.s,P)})),...gens.map((g,i)=>({n:g.name||'Gen Ed',e:'',u:g.units,pg:P.map((_,j)=>j===0?gps[i].pre:gps[i].fin),sem:gps[i].sem,eq:gps[i].eq,maj:0,gen:g,W:Wg,B:0,raw:gps[i].sem,ex:genEx(g),ms:[{name:P[last0].name}]}))];
 const units=subs.reduce((a,s)=>a+(+s.units||0),0),uAll=units+gens.reduce((a,g)=>a+(+g.units||0),0);
 const preRows=[...subs.filter(s=>pcalc(s,P[0]).complete).map(s=>[eqv(trans(pcalc(s,P[0]).raw,sbaseOf(s))),s.units]),...gens.filter(g=>g.pre!==''&&g.pre!=null).map(g=>[eqv(+g.pre),g.units])];
 const preG=gwa(preRows),preN=preRows.length,finalG=gwa(all.map(r=>[r.eq,r.u])),finalN=rowsS.filter(r=>r.act!=null).length;
 
 const mjR=all.filter(r=>r.maj&&r.s&&r.s.kind!=="gen"),mG=gwa(mjR.map(r=>[r.eq,r.u]));
 // ---- ACTUAL grades only (used by the Overview and its share image). Nothing here uses what-if values. ----
 // Period 1 GWA: only subjects whose first period is complete, plus gen eds with a recorded first-period grade.
 // Final GWA: only subjects whose every period is complete (the semestral grade, Base applied). Gen ed finals are expectations, so they are left out unless there is a single period.
 const single=P.length<2,isMaj=s=>s.kind!=='gen',preEq=s=>pcalc(s,P[0]).complete?eqv(trans(pcalc(s,P[0]).raw,sbaseOf(s))):null,finEq=s=>{const a=semActual(s,P);return a==null?null:eqv(a)};
 const genPre=gens.filter(g=>g.pre!==''&&g.pre!=null).map(g=>[eqv(+g.pre),g.units]),preSubs=subs.filter(s=>preEq(s)!=null),finSubs=subs.filter(s=>finEq(s)!=null),nMaj=subs.filter(isMaj).length;
 const aPre=gwa([...preSubs.map(s=>[preEq(s),s.units]),...genPre]),aPreM=gwa(preSubs.filter(isMaj).map(s=>[preEq(s),s.units]));
 const aFin=gwa([...finSubs.map(s=>[finEq(s),s.units]),...(single?genPre:[])]),aFinM=gwa(finSubs.filter(isMaj).map(s=>[finEq(s),s.units]));
 const aRows=subs.map(s=>({code:s.code,pe:preEq(s),fe:finEq(s)}));

 /* ---- retention levels ---- */
 // 0 fine, 1 retention is tight (needs 85%+ on what is left), 2 projected below retention or out of reach
 const rLvl=r=>{if(!r.maj)return r.sem!=null&&r.sem<C.pass-1e-9?2:0;const v=r.sv;if(!v)return 0;if(v.done)return v.ok?0:2;if(v.x>100+1e-9)return 2;if(r.sem!=null&&r.sem<r.rt.pct-1e-9)return 2;return v.x>=85?1:0};
 const preGP=gwa(all.map(r=>[r.pg[0]==null||(r.gen&&(r.gen.pre===''||r.gen.pre==null))?null:eqv(trans(r.pg[0],r.B)),r.u]));
 // soft chime and confetti the moment the projection newly reaches the target (never on first load)
 const okNow=finalG!=null&&C.meets(finalG),prevOk=useRef(null);
 useEffect(()=>{if(prevOk.current===false&&okNow&&!sx)FX.success(true);prevOk.current=okNow},[okNow]);
 const needFor=(r,Sx)=>r.maj?needIn(r.pg,r.W,last0,untrans(Sx,r.B)):needGen(r.gen,P,Sx);
 const Ts=+tg.s||C.pass,chip=on=>cx('rounded-full px-3 py-1.5 transition',on?'bg-accent text-accent-ink':'bg-ink/[.06] hover:bg-line/60');
 const tFor=(s,i)=>{const W=wts(s,P),B=sbaseOf(s);if(i===last0){const prj=P.map(p=>pproj(s,p,0).proj);return needIn(prj,W,i,untrans(Ts,B))}return +tg[P[i].id]||Math.max(0,untrans(C.pass,B))};

 /* ---- subject navigation: tab bar inside the card header, arrows, keyboard, swipe ---- */
 const goTo=i=>{if(i<0||i>=subs.length||i===idx)return;setDir(i>idx?1:-1);setSid(subs[i].id);setEdit(false);setRvMsg(null)};
 useEffect(()=>{if(!cur)return;const el=document.getElementById('tab-'+cur.id);if(el&&el.scrollIntoView)try{el.scrollIntoView({inline:'center',block:'nearest',behavior:'smooth'})}catch(e){}},[cur&&cur.id,tab]);
 useEffect(()=>{if(tab!=='t'&&tab!=='f')return;const k=e=>{if(/INPUT|TEXTAREA|SELECT/.test((e.target.tagName||'')))return;if(e.key==='ArrowRight')goTo(idx+1);if(e.key==='ArrowLeft')goTo(idx-1)};window.addEventListener('keydown',k);return()=>window.removeEventListener('keydown',k)});
 const onTS=e=>{if(e.target.closest&&e.target.closest('input,select,textarea,[data-noswipe]'))return;const t=e.touches[0];sw.current={on:true,x:t.clientX,y:t.clientY,lock:null,t:Date.now()}};
 const onTM=e=>{const s=sw.current;if(!s.on)return;const t=e.touches[0],dx=t.clientX-s.x,dy=t.clientY-s.y;if(!s.lock&&(Math.abs(dx)>10||Math.abs(dy)>10))s.lock=Math.abs(dx)>Math.abs(dy)*1.3?'x':'y';
  if(s.lock==='x'&&swRef.current){const el=swRef.current,edge=(dx>0&&idx===0)||(dx<0&&idx===subs.length-1);el.style.transition='none';el.style.transform='translateX('+(dx*(edge?.18:.55))+'px)';el.style.opacity=String(1-Math.min(Math.abs(dx)/520,.4))}};
 const onTE=e=>{const s=sw.current;if(!s.on)return;s.on=false;const el=swRef.current,t=e.changedTouches[0],dx=t.clientX-s.x,v=Math.abs(dx)/Math.max(1,Date.now()-s.t);
  if(el){el.style.transition='transform .4s cubic-bezier(.2,.8,.2,1),opacity .4s';el.style.transform='';el.style.opacity=''}
  if(s.lock==='x'&&(Math.abs(dx)>70||(v>.5&&Math.abs(dx)>30)))goTo(dx<0?idx+1:idx-1)};

 /* ---- share / export as image ---- */
 const buildStory=async(hide,mode)=>{
  try{await document.fonts.load('800 40px "Plus Jakarta Sans"')}catch(e){}
  const rs=getComputedStyle(document.documentElement),col=(n,a)=>{const t=rs.getPropertyValue(n).trim().split(/\s+/);return`rgba(${t[0]},${t[1]},${t[2]},${a==null?1:a})`};
  const W=1080,H=1920,ff='"Plus Jakarta Sans",system-ui,-apple-system,"Segoe UI",sans-serif',cv=document.createElement('canvas');cv.width=W;cv.height=H;const x=cv.getContext('2d');
  const rr=(a,b,w,h,r)=>{x.beginPath();x.roundRect?x.roundRect(a,b,w,h,r):x.rect(a,b,w,h)};
  const tx=(s,a,b,sz,wt,c,al)=>{x.font=wt+' '+sz+'px '+ff;x.fillStyle=c;x.textAlign=al||'left';x.fillText(s,a,b)};
  const g0=x.createLinearGradient(0,0,W,H);g0.addColorStop(0,col('--bg'));g0.addColorStop(1,col('--surface2'));x.fillStyle=g0;x.fillRect(0,0,W,H);
  [[180,300,820,.5],[940,760,760,.38],[220,1500,900,.46],[900,1780,620,.3]].forEach(([a,b,r,o])=>{const g=x.createRadialGradient(a,b,0,a,b,r);g.addColorStop(0,col('--accent',o));g.addColorStop(1,col('--accent',0));x.fillStyle=g;x.fillRect(0,0,W,H)});
  const glass=(a,b,w,h)=>{x.save();x.shadowColor='rgba(0,0,0,.16)';x.shadowBlur=70;x.shadowOffsetY=26;rr(a,b,w,h,72);x.fillStyle=col('--surface',.5);x.fill();x.restore();rr(a,b,w,h,72);const g=x.createLinearGradient(a,b,a+w,b+h);g.addColorStop(0,'rgba(255,255,255,.34)');g.addColorStop(1,'rgba(255,255,255,.06)');x.fillStyle=g;x.fill();x.lineWidth=2.5;x.strokeStyle='rgba(255,255,255,.55)';x.stroke()};
  const M=84,CW=W-M*2,ok=finalG!=null&&C.meets(finalG),okM=mG!=null&&C.meets(mG),dirW=C.dir<0?'or lower':'or higher';
  tx(acct.name||'My grades',M,170,60,800,col('--ink'));tx(Y.name+' · '+S.name,M,226,30,500,col('--muted'));
  if(mode==='actual'){
   // Overview share: recorded grades only, no targets and no projections
   const secs=single?[['Semestral GWA',aFin,aFinM]]:[[P[0].name+' GWA',aPre,aPreM],[P[last0].name+' GWA',aFin,aFinM]],n=secs.length,ch=n===1?560:400,gap=36;
   secs.forEach(([l,a,m],i)=>{const y=300+i*(ch+gap);glass(M,y,CW,ch);tx(l,M+64,y+96,38,700,col('--muted'));tx(fg(a),M+64,y+(n===1?400:292),n===1?280:220,900,col('--ink'));tx('Majors GWA',M+64,y+ch-48,34,700,col('--muted'));tx(fg(m),M+CW-64,y+ch-48,46,900,col('--ink'),'right')});
   const y0=300+n*(ch+gap),room=Math.floor((H-150-y0-130)/74),rows=hide?[]:aRows.slice(0,Math.max(0,Math.min(room,5)));
   if(rows.length){const gh=130+rows.length*74;glass(M,y0,CW,gh);tx('Subjects',M+56,y0+76,30,700,col('--muted'));
    if(!single)tx(P[0].name,M+CW-300,y0+76,24,600,col('--muted'),'right');tx(single?'Semestral':P[last0].name,M+CW-56,y0+76,24,600,col('--muted'),'right');
    rows.forEach((r,i)=>{const y=y0+150+i*74;tx(r.code||'Subject',M+56,y,36,800,col('--ink'));if(!single)tx(fg(r.pe),M+CW-300,y,32,700,col('--muted'),'right');tx(fg(r.fe),M+CW-56,y,38,900,col('--ink'),'right')})}
  }else{
  glass(M,300,CW,620);tx('Overall GWA',M+64,400,36,700,col('--muted'));tx(fg(finalG),M+64,650,250,900,ok?col('--good'):col('--ink'));
  tx(finalG==null?'Waiting for grades':ok?'On track for your target':fg(Math.abs(finalG-C.target))+' away from your target',M+64,760,44,800,ok?col('--good'):col('--ink'));
  tx('Target '+fg(C.target)+' '+dirW,M+64,826,32,500,col('--muted'));
  const hw=(CW-36)/2,h2=hide?380:260;
  glass(M,948,hw,h2);tx('Majors GWA',M+48,1020,30,700,col('--muted'));tx(fg(mG),M+48,1020+(hide?170:130),hide?150:110,900,okM?col('--good'):col('--ink'));if(hide)tx(mG==null?'No majors yet':okM?'Meets target':'Below target',M+48,1020+300,34,700,okM?col('--good'):col('--muted'));
  glass(M+hw+36,948,hw,h2);tx('Target GWA',M+hw+84,1020,30,700,col('--muted'));tx(fg(C.target),M+hw+84,1020+(hide?170:130),hide?150:110,900,col('--ink'));if(hide)tx(dirW,M+hw+84,1020+300,34,700,col('--muted'));
  if(!hide){const rows=rowsS.slice(0,5),gh=130+rows.length*74;glass(M,1244,CW,gh);tx('Subjects',M+56,1320,30,700,col('--muted'));
   rows.forEach((r,i)=>{const y=1400+i*74;tx(r.s.code||'Subject',M+56,y,36,800,col('--ink'));tx(r.pg.map(v=>v==null?'—':f2(v)).join('  /  '),M+420,y,30,600,col('--muted'));tx(fg(r.eq),M+CW-56,y,38,900,r.eq!=null&&C.meets(r.eq)?col('--good'):r.eq!=null&&C.bad(r.eq)?col('--bad'):col('--ink'),'right')});
   if(rowsS.length>5)tx('+'+(rowsS.length-5)+' more',M+56,1244+gh-20,26,600,col('--muted'))}
  }
  tx(new Date().toLocaleDateString(undefined,{year:'numeric',month:'long',day:'numeric'})+' · Grades Tracker',W/2,H-90,28,600,col('--muted'),'center');
  return await new Promise(r=>cv.toBlob(r,'image/png'))};
 const genStory=async(h,m)=>{try{const b=await buildStory(h,m),u=URL.createObjectURL(b);setShr(s=>{if(s&&s.url)URL.revokeObjectURL(s.url);return{hide:h,mode:m,url:u,blob:b}})}catch(e){setMsg('Could not create the image.')}};
 const openShare=m=>{setShr({hide:true,mode:m,url:'',blob:null});genStory(true,m)};
 const closeShare=()=>setShr(s=>{if(s&&s.url)URL.revokeObjectURL(s.url);return null});
 const sendStory=async()=>{const b=shr&&shr.blob;if(!b)return;const file=new File([b],'grades-story.png',{type:'image/png'});
  try{if(navigator.canShare&&navigator.canShare({files:[file]})){await navigator.share({files:[file],title:'My grades'});return}}catch(e){if(e&&e.name==='AbortError')return}
  const a=document.createElement('a');a.href=shr.url;a.download='grades-story.png';document.body.appendChild(a);a.click();a.remove();setMsg('Image saved')};

/* ---- header, overview, forecast summary ---- */
 // cloud status as one quiet icon: a check inside the cloud when everything is saved
 const SyncBtn=()=>{const k=cloud.on?(cloud.state||'synced'):'local',ok=k==='synced';
  return <button onClick={cloud.sync} disabled={!cloud.on} aria-label={cloud.label} title={cloud.label} className={cx('relative grid h-9 w-9 shrink-0 place-items-center rounded-full bg-ink/[.07] transition active:scale-95 disabled:pointer-events-none sm:h-10 sm:w-10',k==='error'?'text-bad':k==='offline'||k==='local'?'text-muted':'text-ink')}>
   <svg viewBox="0 0 24 24" className={cx('h-[22px] w-[22px]',k==='syncing'&&'animate-pulse')} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z"/>
    {ok&&<path d="M9.3 12.8l2.2 2.2 4.1-4.5" stroke="currentColor" strokeWidth="2.1" className="text-good"/>}
    {k==='error'&&<path d="M12 8.5v4M12 15.4h.01" strokeWidth="2.1"/>}
    {(k==='offline'||k==='local')&&<path d="M4.5 4.5l15 15" strokeWidth="2"/>}</svg></button>};
 const HB='grid h-9 w-9 shrink-0 place-items-center rounded-full bg-ink/[.07] text-ink transition active:scale-95 disabled:pointer-events-none disabled:opacity-35 sm:h-10 sm:w-10';
 const TITLES={o:'Overview',t:'Tracker',f:'Forecast',w:'GWA',p:'Profile',s:'Settings'};
 const IS={fill:'none',stroke:'currentColor',strokeWidth:1.8,strokeLinecap:'round',strokeLinejoin:'round','aria-hidden':'true'};
 const pickYS=(yid,sid)=>{set(c=>({...c,y:yid,s:sid}));setPill(false)};
 // glass header: undo/redo on the left, the compact year-and-semester pill in the middle, cloud sync and the account/group switcher on the right
 const Top=()=><header className="sticky z-30" style={{top:'calc(env(safe-area-inset-top,0px) + .5rem)'}}>
  <div className="gc grid grid-cols-[1fr_auto_1fr] items-center gap-2 rounded-full p-1.5">
   <div className="flex items-center gap-1 justify-self-start">
    <button onClick={undo} disabled={!past.current.length} aria-label="Undo" title="Undo" className={HB}><svg viewBox="0 0 24 24" className="h-[19px] w-[19px]" {...IS}><path d="M9 14 4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11"/></svg></button>
    <button onClick={redo} disabled={!fut.current.length} aria-label="Redo" title="Redo" className={HB}><svg viewBox="0 0 24 24" className="h-[19px] w-[19px]" {...IS}><path d="m15 14 5-5-5-5"/><path d="M20 9H9.5a5.5 5.5 0 0 0 0 11H13"/></svg></button></div>
   <button onClick={()=>setPill(v=>!v)} aria-haspopup="dialog" aria-expanded={pill} aria-label={'Year and semester: '+Y.name+', '+S.name} className="flex h-9 max-w-[44vw] items-center gap-1 rounded-full bg-ink/[.07] pl-3.5 pr-2.5 text-[13px] font-extrabold leading-none transition active:scale-95 sm:h-10 sm:max-w-sm sm:text-sm"><span className="truncate">{Y.name} · {S.name}</span><svg viewBox="0 0 20 20" className={cx('h-4 w-4 shrink-0 text-muted transition-transform duration-300',pill&&'rotate-180')} {...IS} strokeWidth="2"><path d="M5 7.5l5 5 5-5"/></svg></button>
   <div className="flex items-center gap-1 justify-self-end">{SyncBtn()}
    <button onClick={onSwitch} aria-label="Switch account or group" title="Switch account or group" className={HB}><svg viewBox="0 0 24 24" className="h-[19px] w-[19px]" {...IS}><path d={IC.g}/></svg></button></div></div>
  {pill&&<><div className="fixed inset-0 z-40" onClick={()=>setPill(false)}/>
   <div role="dialog" aria-label="Choose year and semester" className="gcs anim-sheet absolute inset-x-0 top-full z-50 mx-auto mt-2 max-h-[60dvh] w-[22rem] max-w-full overflow-y-auto overscroll-contain rounded-3xl p-3">
    {st.years.map(y=><div key={y.id} className="px-1 py-2"><div className={LBL}>{y.name}</div>
     <div className="mt-2 flex flex-wrap gap-2">{y.sems.map(x=>{const on=y.id===Y.id&&x.id===S.id;return <button key={x.id} onClick={()=>pickYS(y.id,x.id)} aria-pressed={on} className={cx('rounded-full px-3.5 py-2 text-sm font-bold transition active:scale-95',on?'bg-accent text-accent-ink shadow':'bg-ink/[.07] hover:bg-ink/[.12]')}>{x.name}</button>})}</div></div>)}
    <div className="mt-1 flex gap-2 border-t border-line/40 px-1 pt-3"><button className={BTN+' flex-1'} onClick={()=>{addYear();setPill(false)}}>＋ Year</button><button className={BTN+' flex-1'} onClick={()=>{addSem();setPill(false)}}>＋ Semester</button></div></div></>}
 </header>;

 const GwaPage=()=>{
  const share=<button className={BTN} onClick={()=>openShare('actual')}>Share</button>,tot=subs.length+gens.length;
  // report card: every subject with a recorded grade (no units). Prelims = first period; Finals = the semestral grade once every period is in.
  const rc=[...subs.map(x=>({id:x.id,code:x.code||'Subject',name:x.name||'',pre:preEq(x),fin:finEq(x)})),...gens.map(g=>{const has=g.pre!==''&&g.pre!=null;return{id:g.id,code:g.name||'Gen Ed',name:'Gen Ed',pre:has?eqv(+g.pre):null,fin:single&&has?eqv(+g.pre):null}})].filter(r=>r.pre!=null||r.fin!=null);
  const RCG='grid grid-cols-[minmax(0,1fr)_4.25rem_4.25rem] items-center gap-3 px-5 sm:grid-cols-[minmax(0,1fr)_7rem_7rem] sm:px-6';
  const Wd=(l,v,sub,tip,hero)=><div className={cx(CARD,'flex min-h-[11rem] flex-col justify-between gap-8 p-6 sm:p-7',hero&&'!border-accent/40 !bg-accent/15')}><div className="text-sm font-bold text-muted">{l}{tip&&<Tip t={tip}/>}</div><div><div className="text-6xl font-black tabular-nums tracking-tight sm:text-7xl">{v}</div><div className="mt-2 text-sm font-semibold text-muted">{sub}</div></div></div>;
  const Sec=(title,note,a,m,sa,sm,act)=><section className="flex flex-col gap-4"><div className="flex items-end justify-between gap-3"><div className="min-w-0"><h2 className="text-2xl font-black tracking-tight sm:text-3xl">{title}</h2><p className="mt-0.5 text-sm text-muted">{note}</p></div>{act}</div>
   <div className="grid gap-4 sm:grid-cols-2">{Wd('Overall GWA',fg(a),sa,'Every recorded subject, Major and Gen Ed, weighted by units.',true)}{Wd('Majors GWA',fg(m),sm,'Only subjects tagged Major.')}</div></section>;
  const preSub=tot?(preSubs.length+genPre.length)+' of '+tot+' subject'+(tot===1?'':'s')+' recorded':'Add a subject to begin',preMSub=nMaj?preSubs.filter(isMaj).length+' of '+nMaj+' major subject'+(nMaj===1?'':'s')+' recorded':'No major subjects yet';
  const ft=subs.length+(single?gens.length:0),finSub=ft?(finSubs.length+(single?genPre.length:0))+' of '+ft+' subject'+(ft===1?'':'s')+' complete':'Add a subject to begin',finMSub=nMaj?finSubs.filter(isMaj).length+' of '+nMaj+' major subject'+(nMaj===1?'':'s')+' complete':'No major subjects yet';
  return <>
   <div className="flex flex-wrap items-center justify-between gap-3"><p className="min-w-0 flex-1 text-sm text-muted">Actual, recorded grades only. Nothing on this page is forecast or projected.</p>{share}</div>
   {!single&&Sec(P[0].name+' GWA','Recorded '+P[0].name+' grades only',aPre,aPreM,preSub,preMSub)}
   {Sec(single?'Semestral GWA':P[last0].name+' GWA',single?'Recorded grades only':'Cumulative · '+P.map(p=>p.name).join(' + '),aFin,aFinM,finSub,finMSub)}
   <section className="flex flex-col gap-4"><div><h2 className="text-2xl font-black tracking-tight sm:text-3xl">Report card</h2><p className="mt-0.5 text-sm text-muted">{Y.name} · {S.name} · recorded grades only</p></div>
    {rc.length?<div className={cx(CARD,'overflow-hidden')}>
     <div className={cx(RCG,'border-b border-line/40 py-3')}><span className={LBL2}>Subject</span><span className={cx(LBL2,'truncate text-right')}>{P[0].name}</span><span className={cx(LBL2,'truncate text-right')}>{single?'Semestral':P[last0].name}</span></div>
     <ul className="divide-y divide-line/40">{rc.map(r=><li key={r.id} className={cx(RCG,'py-3.5')}><div className="min-w-0"><div className="truncate font-extrabold">{r.code}</div><div className="truncate text-xs text-muted">{r.name||'No description'}</div></div>
      <span className={cx('text-right text-xl font-black tabular-nums',r.pre==null&&'text-muted/50')}>{fg(r.pre)}</span><span className={cx('text-right text-xl font-black tabular-nums',r.fin==null&&'text-muted/50')}>{fg(r.fin)}</span></li>)}</ul></div>
    :<div className={cx(CARD,'p-6 text-center text-sm text-muted')}>No grades recorded yet. Subjects appear here once a period is complete.</div>}</section>
  </>};
 const Ov=()=>{
  return <>
   <section><h2 className="mb-4 text-2xl font-black tracking-tight sm:text-3xl">Subjects<Tip t="For subjects with no known breakdown, simply add the subject and enter the released Prelim Grade directly in Options, under Reverse calculator."/></h2>
    {subs.length?<div className="stagger grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{subs.map(s=>{const pe=preEq(s),fe=finEq(s);return <button key={s.id} onClick={()=>{setSid(s.id);setTab('t')}} className={cx(CARD,'lift flex flex-col gap-6 p-5 text-left hover:!border-accent/60')}>
      <div className="flex items-start gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-accent/15 text-accent-text"><svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 6s3-1 8 1c5-2 8-1 8-1v12s-3-1-8 1c-5-2-8-1-8-1zM12 7v12"/></svg></span><div className="min-w-0 flex-1"><div className="truncate font-extrabold">{s.code||'Subject'}</div><div className="truncate text-xs text-muted">{s.name||'No name'}</div></div><span className={cx('shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold',s.kind==='gen'?'bg-ink/[.06] text-muted':'bg-accent/15 text-accent-text')}>{s.kind==='gen'?'Gen Ed':'Major'}</span></div>
      <div className="flex items-end justify-between gap-3"><div><div className="text-xs font-semibold text-muted">{single?'Semestral':P[0].name}</div><div className="text-3xl font-black tabular-nums">{fg(single?fe:pe)}</div></div>{!single&&<div className="text-right"><div className="text-xs font-semibold text-muted">{P[last0].name}</div><div className="text-3xl font-black tabular-nums">{fg(fe)}</div></div>}</div></button>})}</div>
     :<div className={cx(CARD,'flex flex-col items-center gap-3 p-8 text-center')}><p className="font-bold">No subjects yet</p><p className="max-w-sm text-sm text-muted">Add your first subject to see your GWA here.</p><button className={BTNP} onClick={()=>{setTab('t');setAdding(true)}}>Add subject</button></div>}</section></>};

 const ForecastSummary=()=>{const ok=finalG!=null&&C.meets(finalG),fi=P.findIndex(p=>p.id===fsub),pre1=!single&&fi>=0&&fi<last0;return <div className="flex flex-col gap-4">
  <div className={cx('grid gap-4 px-1 sm:gap-8',pre1?'grid-cols-1':'grid-cols-2')}>
   <div className="min-w-0"><div className={LBL2}>{P[0].name} GWA</div><div className="mt-1 text-4xl font-black tabular-nums tracking-tight sm:text-6xl">{fg(preGP)}</div><div className="mt-1 text-[11px] text-muted sm:text-sm">{preGP==null?'Nothing to project yet':preN+' of '+(subs.length+gens.length)+' actual · rest projected'}</div></div>
   {!pre1&&<div className="min-w-0"><div className={LBL2}>{single?'Semestral GWA':P[last0].name+' / Semestral GWA'}</div><div className={cx('mt-1 text-4xl font-black tabular-nums tracking-tight sm:text-6xl',ok&&'text-good')}>{fg(finalG)}</div><div className="mt-1 text-[11px] text-muted sm:text-sm">{finalN} final · {subs.length-finalN+gens.length} projected</div></div>}</div>
  <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-1"><span className="text-sm font-bold sm:text-base">Target {fg(C.target)} <span className="font-semibold text-muted">or {C.dir<0?'lower':'higher'}</span></span>{!pre1&&<span className={cx('text-xs font-semibold sm:text-sm',ok?'text-good':'text-muted')}>{finalG==null?'':ok?'Projection meets your target':fg(Math.abs(finalG-C.target))+' away from the target'}</span>}<button onClick={()=>openShare('forecast')} className={BTN+' sm:ml-auto'}>Share</button></div></div>};

const Banners=()=><>
  {loser&&<div className="anim-rise flex flex-wrap items-center gap-3 rounded-2xl border border-line bg-ink/[.06] p-3 text-sm"><span className="min-w-[14rem] flex-1 font-semibold">Edits from two devices clashed. The newest version was kept.</span><button className={BTN} onClick={restoreLoser}>Restore the other version</button><button className={BTN} onClick={onLoser}>Dismiss</button></div>}
  {guest&&<div className="anim-rise flex flex-wrap items-center gap-3 rounded-2xl border border-accent/40 bg-accent/15 p-3 text-sm"><span className="font-semibold">Guest mode: nothing is saved when you leave.</span><input value={kn} onChange={e=>setKn(e.target.value)} placeholder="Account name" className={cx(INP,'h-10 w-44 !text-left px-3')}/><button className={BTNP} onClick={()=>kn.trim()&&onKeep(kn.trim())}>Save as account</button></div>}
  {msg&&<div className="anim-rise flex items-center justify-between gap-3 rounded-2xl border border-line bg-ink/[.06] px-4 py-2 text-sm font-semibold">{msg}<button className="text-muted" onClick={()=>setMsg('')}>✕</button></div>}</>;

 /* ---- ONE subject card: tab bar lives in the card header, the card swipes ---- */
 const CardTabs=()=><div data-noswipe className="flex items-center gap-2 border-b border-line/60 bg-ink/[.06] px-3 py-2">
  <div className="min-w-0 flex-1 overflow-x-auto" style={{scrollbarWidth:'none'}}><div className="flex w-max gap-1.5">
   {subs.map(s=><button key={s.id} id={'tab-'+s.id} onClick={()=>goTo(subs.indexOf(s))} className={cx('flex shrink-0 items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-bold transition-all duration-300 sm:text-sm',cur&&cur.id===s.id?'border-accent bg-accent text-accent-ink shadow-sm':'border-transparent text-muted hover:bg-ink/[.09] hover:text-ink')}>{s.code||'Subject'}</button>)}
   <button onClick={()=>setAdding(true)} className="shrink-0 rounded-xl border border-dashed border-accent/60 px-3 py-1.5 text-xs font-bold text-accent-text transition hover:bg-accent/10 sm:text-sm" aria-label="Add subject">＋</button></div></div>
  {subs.length>1&&<div className="flex shrink-0 items-center gap-1"><button className="hidden h-8 w-8 rounded-lg text-lg text-muted transition hover:bg-ink/[.09] hover:text-ink disabled:opacity-30 sm:block" onClick={()=>goTo(idx-1)} disabled={idx<=0} aria-label="Previous subject">‹</button><span className="w-9 text-center text-[11px] font-bold tabular-nums text-muted">{idx+1}/{subs.length}</span><button className="hidden h-8 w-8 rounded-lg text-lg text-muted transition hover:bg-ink/[.09] hover:text-ink disabled:opacity-30 sm:block" onClick={()=>goTo(idx+1)} disabled={idx>=subs.length-1} aria-label="Next subject">›</button></div>}</div>;
 const Shell=body=><div onTouchStart={onTS} onTouchMove={onTM} onTouchEnd={onTE} onTouchCancel={onTE} style={{touchAction:'pan-y'}} className="pb-3">
  <div ref={swRef} className="will-change-transform"><section className={cx(CARD,'sa-'+(idx%6),'overflow-hidden')}>{CardTabs()}
   <div key={cur.id} className={cx('flex flex-col gap-6 p-5 sm:p-7',dir>0?'slide-r':'slide-l')}>{body}</div></section></div>
  {subs.length>1&&<p className="mt-3 text-center text-[11px] text-muted sm:hidden">Swipe the card left or right to change subject</p>}</div>;

 /* ---- tracker body ---- */
  const BaseBox=s=>{const o=s.sbase,has=o!==undefined&&o!=='';return <div className="flex flex-col gap-1.5"><span className="text-sm font-bold">Base<Tip t="The curve. It applies only to the semestral grade: (Raw ÷ 100) × (100 − Base) + Base. Leave blank to use the default."/></span><div className="flex items-center gap-2"><Num v={has?o:''} on={v=>setSBase(s.id,v)} ph={f2(C.base)} w="w-24"/><span className="text-xs text-muted">Blank uses the default ({f2(C.base)})</span></div></div>};
 const RetBox=s=>{const o=s.ret,has=o!==undefined&&o!==null&&o!=='',rt=retOf(s);return <div className="flex flex-col gap-1.5"><span className="text-sm font-bold">Retention grade<Tip t="The lowest grade you must keep in this subject. Blank uses the default passing mark from Settings."/></span><div className="flex items-center gap-2"><Num v={has?o:''} on={v=>setRet(s.id,v)} ph={fg(retOf(null).g)} w="w-24"/><span className="text-xs text-muted">needs about {rt.pct>100?'more than 100':f2(rt.pct)}% semestral</span></div></div>};
 const DetailsBox=s=><div className="flex flex-col gap-3"><span className="text-sm font-bold">Subject details</span>
  <div className="grid grid-cols-[1fr_5.5rem] gap-3"><label className="text-xs font-semibold text-muted">Code<TextIn v={s.code} on={v=>setF(s.id,'code',v.toUpperCase())} cls="mt-1"/></label><label className="text-xs font-semibold text-muted">Units<Num v={s.units} on={v=>setF(s.id,'units',v)} w="mt-1 w-full"/></label></div>
  <label className="text-xs font-semibold text-muted">Name<TextIn v={s.name} on={v=>setF(s.id,'name',v)} cls="mt-1"/></label></div>;
 const WeightsBox=s=>{const W=wts(s,P),tot=W.reduce((a,b)=>a+b,0),has=!!(s.pw&&Object.values(s.pw).some(v=>v!==''&&v!=null));return <div className="flex flex-col gap-2">
  <div className="flex items-center justify-between gap-2"><span className="text-sm font-bold">Period weights<Tip t="How much each period counts toward the semestral grade. With two periods, the other one balances to 100 automatically."/></span>{has&&<button className="text-xs font-semibold text-accent-text underline" onClick={()=>resetPW(s.id)}>Reset to default</button>}</div>
  <div className="flex flex-wrap items-center gap-3">{P.map((p,i)=><label key={p.id} className="flex items-center gap-1.5 text-xs font-semibold text-muted">{p.name}<Num v={s.pw&&s.pw[p.id]!==undefined?s.pw[p.id]:String(p.w)} on={v=>setPW(s.id,i,v)} w="w-[4.5rem]"/>%</label>)}</div>
  {Math.abs(tot-100)>.005&&<p className="text-xs text-bad">Weights total {f2(tot)}%. The grade is scaled to 100%.</p>}</div>};
 const SemMath=s=>{const sc=semCalc(s,P),pj=semProjC(s,P),B=sc.B,R=sc.raw!=null?sc.raw:pj.raw,T=R==null?null:trans(R,B);return <div className="flex flex-col gap-2 rounded-2xl bg-ink/[.06] p-3">
  <div className="grid grid-cols-3 gap-2 text-center"><div><div className="text-[10px] font-bold text-muted">Raw semestral{sc.raw==null&&R!=null?' (projected)':''}</div><div className="text-base font-black tabular-nums">{R==null?'—':f2(R)}</div></div><div><div className="text-[10px] font-bold text-muted">Base</div><div className="text-base font-black tabular-nums">{f2(B)}</div></div><div><div className="text-[10px] font-bold text-muted">After Base</div><div className="text-base font-black tabular-nums">{T==null?'—':f2(T)}</div></div></div>
  {R!=null&&<p className="text-xs text-muted">({f2(R)} ÷ 100) × (100 − {f2(B)}) + {f2(B)} = <b className="text-ink">{f2(T)}</b></p>}</div>};
 const Options=(s,p,isLast)=>{const o=!!opt[s.id];return <div className="overflow-hidden rounded-3xl border border-line/60 bg-ink/[.06] shadow-[0_8px_30px_-14px_rgb(var(--ink)/.2)]">
  <button onClick={()=>setOpt({...opt,[s.id]:!o})} aria-expanded={o} className="flex w-full items-center gap-3.5 p-4 text-left transition hover:bg-ink/[.09] sm:p-5"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-accent/15 text-accent-text"><svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={IC.s}/></svg></span><span className="min-w-0 flex-1"><span className="block text-base font-extrabold">Options</span><span className="block text-xs text-muted">Details, weights, base, retention, reverse calculator</span></span><Chev open={o}/></button>
  <div className={cx('acc',o&&'open')} inert={!o}><div><div className="grid gap-5 border-t border-line/50 p-4 sm:p-5 md:grid-cols-2 md:gap-x-8 md:gap-y-6">
   {DetailsBox(s)}{WeightsBox(s)}{BaseBox(s)}{RetBox(s)}
   {isLast&&<div className="md:col-span-2">{SemMath(s)}</div>}<div className="md:col-span-2">{Reverse(s,p)}</div>
   <div className="flex gap-2 md:col-span-2"><button className={BTN+' flex-1'} onClick={()=>clearScores([s.id])}>Clear scores</button><button className={BTNX+' flex-1'} onClick={()=>delSub(s.id)}>Delete subject</button></div></div></div></div></div>};

const Reverse=(s,p)=>{const k=s.id+p.id,m=rvMsg&&rvMsg.k===k?rvMsg:null,hasEst=actsOf(s,p).some(a=>a.est),md=rvMode[k]||'r',B=sbaseOf(s);return <div className="flex flex-col gap-2 rounded-xl border border-dashed border-line p-3">
  <div className="text-sm font-bold">Reverse calculator <span className="text-xs font-semibold text-muted">for {p.name}</span></div>
  <p className="text-xs text-muted">Know the released {p.name.toLowerCase()} grade but not the scores? Enter it and the blank scores are worked out. {md==='r'?'The grade is used as a raw period grade (the curve is applied later, on the semestral grade).':'The grade already includes the Base, so raw = (grade − Base) ÷ (100 − Base) × 100.'}</p>
  <Seg v={md} on={x=>setRvMode({...rvMode,[k]:x})} opts={[['r','Raw grade'],['b','Includes Base '+f2(B)]]} cls="w-full sm:w-auto sm:self-start"/>
  <div className="flex flex-wrap items-center gap-2"><Num v={s.rel&&s.rel[p.id]} on={v=>setRel(s.id,p.id,v)} ph={'released '+p.name.toLowerCase()+' grade'} w="w-44"/><button className={BTNP} onClick={()=>rvFill(s,p)}>Fill possible scores</button>{hasEst&&<button className={BTN} onClick={()=>rvClear(s,p)}>Clear possible scores</button>}</div>
  {m&&<p className={cx('text-xs font-semibold',m.bad?'text-bad':'text-good')}>{m.msg}</p>}</div>};
 const PeriodBlock=(s,p)=>{const c=pcalc(s,p),acts=c.acts,pi=P.indexOf(p),w=wts(s,P)[pi],R=c.raw!=null?c.raw:c.soFar,wsum=acts.reduce((t,a)=>t+wgt(a),0);
  return <div className="flex flex-col gap-4 rounded-2xl border border-line/60 bg-ink/[.06] p-4 sm:p-5">
   <div className="flex flex-wrap items-center justify-between gap-2"><h4 className="font-bold">{p.name} <span className="ml-1 text-xs font-semibold text-muted">{f2(w)}% of semestral</span></h4><button className={BTN} onClick={()=>setEdit(!edit)}>{edit?'✓ Done':'Edit activities'}</button></div>
   {!acts.length&&<p className="text-sm text-muted">No activities yet. Add one below.</p>}
   <div className="grid gap-3.5 lg:grid-cols-2 lg:gap-x-10 lg:gap-y-4">{acts.map(a=>{const x=ap(a);return edit
    ?<div key={a.id} className="flex items-center gap-2"><input value={a.name} onChange={e=>setAct(s.id,p.id,a.id,'name',e.target.value)} className={cx(INP,'h-11 min-w-0 flex-1 !text-left px-3')} placeholder="Activity name"/><Num v={a.w} on={v=>setAct(s.id,p.id,a.id,'w',v)} ph="wt" w="w-[4.5rem]"/><span className="text-muted">%</span><button className={BTNX+' !px-2.5'} onClick={()=>delAct(s.id,p.id,a.id)} aria-label="Remove activity">✕</button></div>
    :<div key={a.id} className="flex items-center gap-2 sm:gap-3"><div className="min-w-0 flex-1"><div className="truncate text-sm font-semibold">{a.name||'Activity'}</div><div className="text-xs text-muted">{f2(wgt(a))}% · {x==null?'not entered':f2(x)+'%'}</div>{a.est&&<span className="mt-0.5 inline-block rounded-full bg-accent/25 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-accent-text">Possible score</span>}</div>
     <Num nav v={a.s} on={v=>setAct(s.id,p.id,a.id,'s',v)} ph="score" bad={x!=null&&x>100} w={cx('w-[4.5rem] sm:w-20',a.est&&'!border-accent/60 !italic')}/><span className="text-muted">/</span><Num v={a.m} on={v=>setAct(s.id,p.id,a.id,'m',v)} ph="100" w="w-14 sm:w-16"/></div>})}</div>
   <button className={BTNP+' self-start'} onClick={()=>{addAct(s.id,p.id);setEdit(true)}}>＋ Add Extra Activity</button>
   {acts.length>0&&<p className={cx('text-xs',Math.abs(wsum-100)>.005?'text-bad':'text-muted')}>Activity weights total {f2(wsum)}%{Math.abs(wsum-100)>.005?' · the grade is scaled to 100%':''}</p>}
   <div className="grid grid-cols-3 gap-2 rounded-xl bg-ink/[.06] p-2.5 text-center sm:p-3">
    <div><div className="text-[10px] font-bold uppercase tracking-wider text-muted">{p.name} grade{c.raw==null&&R!=null?' so far':''}</div><div className="text-base font-black tabular-nums sm:text-lg">{R==null?'—':f2(R)}</div></div>
    <div><div className="text-[10px] font-bold uppercase tracking-wider text-muted">Weight</div><div className="text-base font-black tabular-nums sm:text-lg">{f2(w)}%</div></div>
    <div><div className="text-[10px] font-bold uppercase tracking-wider text-muted">Activities</div><div className="text-base font-black tabular-nums sm:text-lg">{c.n}/{c.total}</div></div></div>
   </div>};
  const TrackerBody=()=>{const s=cur,sem=semActual(s,P),sp=semProjC(s,P),eq=sem==null?null:eqv(sem),isLast=P.length<2||pcur.id===P[last0].id;
  const Bg=(l,v,sub,hi)=><div key={l} className={cx('rounded-3xl border p-4 sm:p-5',hi?'border-accent/40 bg-accent/15':'border-line/60 bg-ink/[.06]')}><div className="text-xs font-bold text-muted">{l}</div><div className="mt-1 text-4xl font-black tabular-nums tracking-tight sm:text-5xl">{v}</div>{sub&&<div className="mt-1 text-xs font-semibold text-muted">{sub}</div>}</div>;
  return <>
   <div className="flex items-center gap-4"><span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-accent/15 text-accent-text"><svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 6s3-1 8 1c5-2 8-1 8-1v12s-3-1-8 1c-5-2-8-1-8-1zM12 7v12"/></svg></span>
    <div className="min-w-0 flex-1"><h2 className="truncate text-2xl font-black tracking-tight">{s.code||'Subject'}</h2><p className="truncate text-sm text-muted">{s.name||'No name'} · {f2(+s.units||0)} unit{(+s.units||0)===1?'':'s'}</p></div></div>
   <div className="flex flex-wrap items-center gap-2"><Seg v={s.kind==='gen'?'gen':'major'} on={v=>setF(s.id,'kind',v)} opts={[['major','Major'],['gen','Gen Ed']]}/><Tip t="Tag a subject as Major or Gen Ed. The Majors GWA on the GWA tab only counts subjects tagged Major."/></div>
   <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
    {P.map(p=>{const c=pcalc(s,p),v=c.grade!=null?c.grade:c.gradeSoFar;return Bg(p.name+' grade',v==null?'—':f2(v),c.grade!=null?'Raw · complete':v!=null?'Raw · so far':'No scores yet',p.id===pcur.id)})}
    {isLast&&P.length>1&&Bg('Semestral grade',sem!=null?f2(sem):sp.grade!=null?f2(sp.grade):'—',eq!=null?'Grade '+fg(eq):sp.grade!=null?'Projected · grade '+fg(eqv(sp.grade)):'Complete every period',true)}</div>
   <Seg v={pcur.id} on={x=>{setPid(x);setEdit(false)}} opts={P.map(p=>[p.id,p.name])} cls="w-full"/>
   {PeriodBlock(s,pcur)}
   {isLast&&<AccentBox l="Semestral grade" v={sem==null?'—':f2(sem)} rl="Grade" r={fg(eq)} foot={sem==null?'Complete every period':sem>=retOf(s).pct-1e-9?'Meets retention':'Below retention ('+fg(retOf(s).g)+')'}/>}
   <div className="mx-auto w-full max-w-3xl">{Options(s,pcur,isLast)}</div></>};
 
const EmptyCard=()=><div className={cx(CARD,'flex flex-col items-center gap-3 p-8 text-center')}><p className="font-bold">No subjects yet</p><button className={BTNP} onClick={()=>setAdding(true)}>＋ Add your first subject</button></div>;
 const TrackerView=()=><div className="flex flex-col gap-6 pb-2">{subs.length?Shell(TrackerBody()):EmptyCard()}</div>;

 /* ---- forecaster (also one subject card at a time) ---- */

 const ForecastBody=pi=>{const s=cur,p=P[pi],sp=semProjC(s,P),prj=sp.pr,W=sp.W,B=sp.B,T=tFor(s,pi),r=pproj(s,p,T),sem=sp.grade,met=T!=null&&r.proj!=null&&r.proj>=T-1e-9;
  let hint;if(!r.live.length)hint='No activities';else if(!r.miss.length)hint='All scores are in';else if(r.miss.length===1)hint='Need '+need(r.alone[0][1])[0]+' on '+r.miss[0].name;else hint='Need '+need(r.uni)[0]+' on each of '+r.miss.length+' scores';
  return <>
   <div className="flex items-center gap-2.5 sm:gap-3"><span className="h-10 w-1.5 shrink-0 rounded-full bg-sa"/>
    <div className="min-w-0 flex-1"><div className="truncate text-lg font-extrabold sm:text-xl">{s.code}</div><div className="truncate text-sm text-muted">{hint}</div></div>
    <div className="text-right"><div className="text-[10px] font-bold uppercase tracking-wider text-muted">Projected</div><div className={cx('text-xl font-black tabular-nums',met?'text-good':'text-ink')}>{r.proj==null?'—':f2(r.proj)}</div></div></div>
   <div className="rounded-2xl border border-line/60 bg-ink/[.06] p-3 text-sm">
    <div>{p.name} grade needed (raw): <b className={T!=null&&T>100?'text-bad':''}>{T==null?'—':T<=0?'Secured ✓':T>100?'Out of reach ('+f2(T)+')':f2(T)}</b></div>
    {pi===last0?<div className="mt-1 text-xs text-muted">Semestral target {f2(Ts)}. With Base {f2(B)} that needs a raw semestral grade of {f2(Math.max(0,untrans(Ts,B)))}.</div>:<div className="mt-1 text-xs text-muted">Period target: the raw grade that passes if every period matches (change it above).</div>}
    {P.map((q,j)=>j===pi?null:<div key={q.id} className="text-muted">{q.name} ({f2(W[j])}%): <b className="text-ink">{prj[j].proj==null?'—':f2(prj[j].proj)}</b> ({prj[j].complete?'actual':'projected'})</div>)}</div>
   {(()=>{const rr=all.find(z=>z.s&&z.s.id===s.id),lv=rr?rLvl(rr):0;return lv?<div className={cx('rounded-xl border px-3 py-2 text-xs font-semibold',lv===2?'ins-bad':'ins-warn')}>{lv===2?'Projected below its '+fg(rr.rt.g)+' retention grade':'Retention at risk: needs '+Math.ceil(rr.sv.x-1e-9)+'% on what is left to stay at '+fg(rr.rt.g)}</div>:null})()}
   {r.miss.length>1&&<Tile l={`Same % on all ${r.miss.length} missing`} v={need(r.uni)[0]} bad={need(r.uni)[1]} vc={tlCls(r.uni)}/>}
   <div className="flex flex-col gap-3.5">{r.acts.filter(a=>wgt(a)>0).map(a=>{const x=ap(a);if(x!=null)return <div key={a.id} className="flex items-center justify-between rounded-2xl bg-ink/[.06] px-4 py-2.5 text-sm"><span className="font-semibold">{a.name} <span className="font-normal text-muted">{f2(wgt(a))}%</span></span><span className="font-bold">✓ {f2(x)}%{a.est&&<span className="ml-1 text-[10px] font-bold uppercase text-accent-text">possible</span>}</span></div>;
    const v=r.alone.find(z=>z[0]===a.id)[1],[t,bad]=need(v),m=mxs(a);
    return <div key={a.id} className="flex flex-col gap-3 rounded-2xl border border-line/60 bg-ink/[.06] p-4 sm:p-5">
     <div className="flex items-center justify-between"><span className="font-bold">{a.name} <span className="text-xs font-semibold text-muted">{f2(wgt(a))}%</span></span><span className="rounded-full bg-accent/25 px-2 py-0.5 text-xs font-bold">Not yet</span></div>
     <div><span className="text-xs text-muted">Score needed{r.miss.length>1?' (others at their sliders)':''}:</span><div className={cx('text-xl font-extrabold',tlCls(v)||(bad?'text-bad':'text-ink'))}>{t}{v>0&&v<=100&&<span className="text-sm font-semibold text-muted"> ≈ {f2(v/100*m)}/{m}</span>}</div></div>
     <div className="flex items-center gap-3"><span className="w-16 text-xs font-semibold">If I score</span><input type="range" min="0" max="100" step="1" value={Math.min(100,+wiv(s,a)||0)} onChange={e=>setWi(s.id,a.id,e.target.value)} className="min-w-0 flex-1"/><Num v={wiv(s,a)} on={v=>setWi(s.id,a.id,v)} w="w-16"/></div></div>})}</div>
   <AccentBox l={`Projected ${p.name.toLowerCase()} grade (raw)`} v={r.proj==null?'—':f2(r.proj)} rl={T==null?'':'vs target'} r={T==null?'—':f2(Math.max(0,T))} foot={T==null?'':met?'Meets target ✓':'Short by '+f2(T-(r.proj||0))}/>
   {P.length>1&&pi===last0&&<AccentBox l="Projected semestral (after Base)" v={sem==null?'—':f2(sem)} rl="Grade" r={sem==null?'—':fg(eqv(sem))} foot={sem==null?'':sem>=retOf(s).pct-1e-9?'Meets retention ✓':'Below retention ('+fg(retOf(s).g)+')'}/>}
   <div className="mx-auto w-full max-w-3xl">{Options(s,P[pi],pi===last0)}</div></>};
 const ForecastView=()=>{const pi=P.findIndex(p=>p.id===fsub);return <>
  {ForecastSummary()}
  <div className="flex flex-wrap items-center gap-2 sm:gap-3">
   <Seg v={fsub} on={setSub} opts={P.map(p=>[p.id,p.name])} cls="w-full sm:w-auto"/>
   {pi<last0&&<label className="flex items-center gap-2 text-sm font-semibold">{P[pi].name} target<Num v={tg[fsub]} on={v=>setTg(fsub,v)} ph={String(C.pass)} w="w-20"/></label>}
   {pi===last0&&<label className="flex items-center gap-2 text-sm font-semibold">Semestral target<Num v={tg.s} on={v=>setTg('s',v)} ph={String(C.pass)} w="w-20"/></label>}</div>
  {subs.length?Shell(ForecastBody(pi)):EmptyCard()}</>};

 /* ---- settings sheet ---- */
 const Settings=()=>{
  const raw=(st.cfg&&st.cfg.table&&st.cfg.table.length)?st.cfg.table:(C.id==='pct'?[]:PRESETS[C.id].table);
  const str=()=>raw.map(r=>[String(r[0]),String(r[1])]);
  const setRow=(i,j,v)=>{const t=str();t[i][j]=v;setCfg({table:t},'tbl'+i+j)};
  const rp=rawP(),tw=P.reduce((a,p)=>a+p.w,0);
  return <>
   <section className="flex flex-col gap-3"><h3 className={LBL}>Appearance</h3><ThemePicker theme={theme} setTheme={setTheme}/></section>
   <section className="flex flex-col gap-3"><h3 className={LBL}>Sound and haptics</h3>
    <Switch on={fxs.snd} onChange={()=>togFx('snd')} label="Sound effects" sub="Soft pops when you reach your target or finish a calculation. Typing and taps stay silent."/>
    {fxs.snd&&<button className={BTN+' self-start'} onClick={()=>FX.test()}>Play test sound</button>}
    <Switch on={fxs.hap} onChange={()=>togFx('hap')} label="Haptic feedback" sub="Short vibrations on phones that support them."/></section>
   <section className="flex flex-col gap-3"><h3 className={LBL}>Grading periods and Base</h3>
    {rp.map((p,i)=><div key={p.id} className="flex flex-wrap items-center gap-2 rounded-2xl border border-line/60 bg-ink/[.06] p-3">
     <TextIn v={p.name} on={v=>setPeriod(i,{name:v})} ph="Period name" cls="min-w-[8rem] flex-1"/>
     <label className="flex items-center gap-1 text-xs font-semibold text-muted">Weight<Num v={p.w} on={v=>setPeriod(i,{w:v})} w="w-[4.5rem]"/>%</label>
     {rp.length>1&&<button className={BTNX+' !px-2.5'} onClick={()=>delPeriod(i)} aria-label="Remove period">✕</button>}</div>)}
    <div className="flex flex-wrap items-center gap-2"><button className={BTN} onClick={addPeriod} disabled={rp.length>=5}>＋ Add period</button><span className={cx('text-xs font-semibold',Math.abs(tw-100)>.005?'text-bad':'text-muted')}>Weights total {f2(tw)}%{Math.abs(tw-100)>.005?' (scaled to 100%)':''}</span></div>
    <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-line/60 bg-ink/[.06] p-3"><span className="text-sm font-bold">Default Base</span><Num v={st.cfg&&st.cfg.base!==undefined?st.cfg.base:'0'} on={v=>setCfg({base:v},'cfgbase')} w="w-20"/></div>
    <p className="text-xs text-muted">These weights and this Base are the defaults for every subject. Any subject can change its own period weights and Base on its card. The curve is applied to the <b>semestral grade</b> (Prelims + Finals combined): (Raw ÷ 100) × (100 − Base) + Base.</p></section>
   <section className="flex flex-col gap-4"><h3 className={LBL}>Highest possible grade</h3>
    <div className="grid gap-2">{Object.entries(PRESETS).map(([id,p])=><button key={id} onClick={()=>pickScale(id)} className={cx('rounded-2xl border p-3 text-left transition',C.id===id?'border-accent bg-accent/10 ring-2 ring-accent/40':'border-line bg-ink/[.06] hover:bg-ink/[.09]')}><div className="font-bold">{p.label}</div><div className="text-xs text-muted">{p.sub}</div></button>)}</div>
    <div className="flex flex-wrap gap-4">
     <label className="text-sm font-semibold">Dean’s List GWA target<div className="mt-1"><Num v={st.cfg&&st.cfg.target!==undefined?st.cfg.target:PRESETS[C.id].target} on={v=>setCfg({target:v},'cfgt')} w="w-28"/></div></label>
     <label className="text-sm font-semibold">Passing mark and default retention (percent)<div className="mt-1"><Num v={st.cfg&&st.cfg.pass!==undefined?st.cfg.pass:String(PRESETS[C.id].pass)} on={setPass} w="w-28"/></div></label></div>
    <p className="text-xs text-muted">{C.dir<0?`Lower is better on this scale, so a target of ${fg(C.target)} means ${fg(C.target)} or lower.`:`Higher is better on this scale, so a target of ${fg(C.target)} means ${fg(C.target)} or higher.`} You need about {f2(C.need)}% in a subject to land on the target.</p>
    {C.table&&<div className="flex flex-col gap-2"><div className="text-sm font-bold">Grade table <span className="text-xs font-semibold text-muted">(minimum percent → grade)</span></div>
     {raw.map((r,i)=><div key={i} className="flex items-center gap-2"><Num v={String(r[0])} on={v=>setRow(i,0,v)} ph="min %" w="w-24"/><span className="text-muted">→</span><Num v={String(r[1])} on={v=>setRow(i,1,v)} ph="grade" w="w-24"/><button className={BTN+' !px-3'} onClick={()=>setCfg({table:str().filter((_,k)=>k!==i)})} aria-label="Remove row">✕</button></div>)}
     <div className="flex gap-2"><button className={BTN} onClick={()=>setCfg({table:[...str(),['','']]})}>＋ Add row</button><button className={BTN} onClick={()=>setCfg({table:null})}>Reset to preset</button></div></div>}</section>
   <section className="flex flex-col gap-3"><h3 className={LBL}>Years and semesters</h3>
    <div className="grid gap-3 sm:grid-cols-2"><label className="text-sm font-semibold">Academic year<TextIn v={Y.name} on={v=>rename('y',v)} cls="mt-1"/></label><label className="text-sm font-semibold">Semester<TextIn v={S.name} on={v=>rename('s',v)} cls="mt-1"/></label></div>
    <div className="flex flex-wrap gap-2"><select value={Y.id} onChange={e=>set(c=>({...c,y:e.target.value,s:c.years.find(y=>y.id===e.target.value).sems[0].id}))} className={SEL}>{st.years.map(y=><option key={y.id} value={y.id}>{y.name}</option>)}</select><select value={S.id} onChange={e=>set(c=>({...c,s:e.target.value}))} className={SEL}>{Y.sems.map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</select><button className={BTN} onClick={addYear}>＋ Year</button><button className={BTN} onClick={addSem}>＋ Semester</button></div></section>
   <section className="flex flex-col gap-3"><h3 className={LBL}>Data</h3>
    <div className="flex flex-wrap gap-2"><button className={BTN} onClick={()=>clearScores()}>Clear all scores here</button>
     {CAN_FILE&&<><button className={BTN} onClick={exportData}>Export data</button><label className={BTN+' cursor-pointer'}>Import data<input type="file" accept="application/json,.json" onChange={importData} className="hidden"/></label></>}</div>
    <p className="text-xs text-muted">Everything saves automatically. Every change can be undone with the Undo button at the top of the screen. Export a backup now and then.</p></section></>};

 const ProfileView=()=>{const g=prof.group,cloudA=!!acct.cloud&&!guest,gc=!!(g&&g.cloud&&!guest);
  const photo=e=>{const f=e.target.files&&e.target.files[0];e.target.value='';if(f)resizeImg(f).then(p=>prof.rename({pic:p})).catch(()=>setPm('Could not read that image.'))};
  const run=async(fn,ok)=>{setPm('');const r=await fn();if(r==='ok'){setPm(ok);setPf(f=>({...f,o:'',n:'',n2:'',go:'',gn:'',gn2:''}))}else setPm(r)};
  const pw=(k,ph)=><TextIn type="password" v={pf[k]} on={v=>setPf({...pf,[k]:v})} ph={ph}/>;
  const sec=CARD+' flex flex-col gap-3 p-5 sm:p-6';
  return <div className="grid gap-5 lg:grid-cols-2 lg:items-start">
   <section className={sec}><h2 className="text-lg font-extrabold">Profile</h2>
    {guest?<p className="text-sm text-muted">You are in guest mode. Save this session as an account from the banner to keep it.</p>:<>
     <div className="flex items-center gap-4"><Avatar a={acct} s="h-20 w-20" t="text-4xl"/><div className="flex flex-col gap-2"><label className={BTN+' cursor-pointer'}>{acct.pic?'Change picture':'Upload picture'}<input type="file" accept="image/*" className="hidden" onChange={photo}/></label>{acct.pic&&<button className={BTN} onClick={()=>prof.rename({pic:''})}>Remove picture</button>}</div></div>
     <label className="text-sm font-semibold">Name<TextIn v={acct.name||''} on={v=>prof.rename({name:v})} cls="mt-1"/></label>
     <label className="text-sm font-semibold">Bio<TextIn v={acct.bio||''} on={v=>prof.rename({bio:v.slice(0,80)})} ph="Program and year (optional)" cls="mt-1"/></label></>}</section>
   {cloudA&&<section className={sec}><h2 className="text-lg font-extrabold">Account passcode</h2><p className="text-sm text-muted">Signed in as <b className="text-ink">{acct.cloud.sn}</b>. After changing it, other devices must remove this account and unlock it again with the new passcode.</p>{pw('o','Current passcode')}{pw('n','New passcode (6+ characters)')}{pw('n2','Repeat new passcode')}<button className={BTNP} onClick={()=>run(()=>prof.changePass(pf.o,pf.n,pf.n2),'Account passcode changed.')}>Change passcode</button></section>}
   {gc&&<section className={sec}><h2 className="text-lg font-extrabold">Group passcode</h2><p className="text-sm text-muted">Group <b className="text-ink">{g.name}</b>. After changing it, members must rejoin the group with the new passcode.</p>{pw('go','Current group passcode')}{pw('gn','New group passcode (6+ characters)')}{pw('gn2','Repeat new group passcode')}<button className={BTNP} onClick={()=>run(()=>prof.changeGroupPass(pf.go,pf.gn,pf.gn2),'Group passcode changed.')}>Change group passcode</button>
    <label className="mt-2 text-sm font-semibold">Recovery email<Tip t="Members who forget a passcode can email this address from the unlock screen. It is stored with the group and visible to people who join it."/><TextIn type="email" v={g.rec||''} on={v=>prof.setRec(v)} ph="name@example.com" cls="mt-1"/></label></section>}
   <section className={sec}><h2 className="text-lg font-extrabold">Session</h2><p className="text-sm text-muted">Switch to another account or group.</p><button className={BTN+' self-start'} onClick={onSwitch}>Switch account</button></section>
   {pm&&<p className="rounded-2xl border border-line bg-ink/[.06] px-4 py-3 text-sm font-semibold lg:col-span-2" role="status">{pm}</p>}</div>};
 const SettingsView=()=><div className={cx(CARD,'p-5 sm:p-8')}><div className="grid gap-x-10 gap-y-8 lg:grid-cols-2">{Settings()}</div></div>;

  return <div className="mx-auto w-full max-w-[1240px] overflow-x-clip px-5 pb-44 pt-2 sm:px-8 md:pb-40">
  <main className="flex flex-col gap-6 sm:gap-7">
   {Top()}<h1 className="px-1 pt-2 text-[2.1rem] font-black leading-none tracking-tight sm:text-5xl">{TITLES[tab]||'Overview'}</h1>{Banners()}
   <div key={tab} className="anim-rise flex flex-col gap-8 sm:gap-10">{tab==='o'?Ov():tab==='t'?TrackerView():tab==='f'?ForecastView():tab==='w'?GwaPage():tab==='p'?ProfileView():SettingsView()}</div></main>
  <BottomNav tab={tab} on={k=>{setPill(false);setTab(k)}}/>
  <Sheet open={adding} onClose={()=>setAdding(false)} title="Add subject">
   <label className="text-sm font-semibold">Code<TextIn v={nf.code} on={v=>setNf({...nf,code:v})} ph="Subject code" cls="mt-1"/></label>
   <label className="text-sm font-semibold">Name (optional)<TextIn v={nf.name} on={v=>setNf({...nf,name:v})} cls="mt-1"/></label>
   <div className="flex flex-col gap-1.5"><span className="text-sm font-semibold">Type<Tip t="Major subjects feed the Majors GWA on the GWA tab. Gen Ed subjects count toward the Overall GWA only."/></span><Seg v={nf.kind||'major'} on={v=>setNf({...nf,kind:v})} opts={[['major','Major'],['gen','Gen Ed']]} cls="w-full"/></div>
   <label className="text-sm font-semibold">Credit units<div className="mt-1"><Num v={nf.units} on={v=>setNf({...nf,units:v})} w="w-full"/></div></label>
   <label className="text-sm font-semibold">Retention grade <span className="text-xs font-normal text-muted">(optional)</span><div className="mt-1"><Num v={nf.ret} on={v=>setNf({...nf,ret:v})} ph={'e.g. '+(C.id==='ph'?'2.50':C.id==='gpa'?'2.0':'75')} w="w-full"/></div><span className="mt-1 block text-xs font-normal text-muted">The lowest grade you must keep. Leave blank to use the default ({fg(retOf(null).g)}).</span></label>
   <button className={BTNP} onClick={addSub}>Add subject</button></Sheet>
  <Sheet open={!!shr} onClose={closeShare} title="Share your grades">{shr&&<>
   <div className="mx-auto w-full max-w-[17rem] overflow-hidden rounded-[1.75rem] border border-line bg-ink/[.06] shadow-xl" style={{aspectRatio:'9/16'}}>{shr.url?<img src={shr.url} alt="Preview of your story image" className="h-full w-full object-cover"/>:<div className="grid h-full place-items-center text-sm text-muted">Creating image…</div>}</div>
   <Switch on={shr.hide} onChange={()=>{const h=!shr.hide;setShr({...shr,hide:h});genStory(h,shr.mode)}} label="Hide raw scores" sub={shr.mode==='actual'?'Shows only your GWAs, not each subject.':'Shows only your GWA and target status.'}/>
   <button className={BTNP} disabled={!shr.blob} onClick={sendStory}>Share or save image</button></>}</Sheet>
 </div>;
}


/* =====================================================================
   8. HOME  (cloud GROUPS first, then the accounts inside a group)
   ===================================================================== */
function Home({book,theme,setTheme,ctl,busy,at}){
 const [gv,setGv]=useState(null),[sh,setSh]=useState(null),[arm,setArm]=useState(null),[cm,setCm]=useState(''),[cb,setCb]=useState(false),[msg,setMsg]=useState('');
 const [ng,setNg]=useState({name:'',icon:'',pic:'',cloud:true,pass:'',rec:''}),[jf,setJf]=useState({name:'',pass:''}),[na,setNa]=useState({name:'',bio:'',emoji:'',pic:'',pass:'',pre:false}),[uf,setUf]=useState({pass:''}),[sf,setSf]=useState({name:'',pass:''}),[ef,setEf]=useState({pass:''}),[gp,setGp]=useState('');
 const grp=book.groups.find(g=>g.id===gv)||null;
 const localsOf=g=>book.list.filter(a=>a.gid===g.id);
 const remotesOf=g=>{const mids=new Set(localsOf(g).map(a=>a.mid).filter(Boolean));return Object.entries(g.members||{}).filter(([mid])=>!mids.has(mid)).map(([mid,m])=>({mid,...m}))};
 const countOf=g=>localsOf(g).length+remotesOf(g).length;
 const photo=(e,cb2)=>{const fl=e.target.files&&e.target.files[0];e.target.value='';if(!fl)return;resizeImg(fl).then(cb2).catch(()=>setMsg('Could not read that image.'))};
 const go=async(fn,after)=>{setCb(true);setCm('');try{const r=await fn();if(r==='ok'||String(r).startsWith('ok:')){setSh(null);if(after)after(String(r));}else setCm(r)}catch(e){setCm('Something went wrong. Try again.')}setCb(false)};
 const pickBackup=e=>{const fl=e.target.files&&e.target.files[0];e.target.value='';if(!fl||!grp)return;const r=new FileReader();r.onload=()=>{try{const j=JSON.parse(r.result),d=j&&j.data?j.data:j;if(!okState(d))throw new Error('bad');ctl.imp(grp.id,j.account||'Imported account',d);setMsg('Backup added as a new local account ✓')}catch(x){setMsg('That file is not a valid backup.')}};r.onerror=()=>setMsg('Could not read that file.');r.readAsText(fl)};
 const Photo=(o,onPic,onClear,Ico)=><div className="flex items-center gap-4">{Ico?Ico:<Avatar a={o} s="h-16 w-16" t="text-4xl"/>}<div className="flex flex-col gap-2"><label className={BTN+' cursor-pointer'}>{o.pic?'Change picture':'Upload picture'}<input type="file" accept="image/*" className="hidden" onChange={e=>photo(e,onPic)}/></label>{o.pic&&<button className={BTN} onClick={onClear}>Remove picture</button>}</div></div>;
 const Emojis=(list,v,on)=>!list.length?null:<div className="flex flex-wrap gap-2">{list.map(e=><button key={e} onClick={()=>on(e)} className={cx('h-10 w-10 rounded-xl text-xl transition',v===e?'bg-accent/30 ring-2 ring-accent':'bg-ink/[.06] hover:bg-line/60')}>{e}</button>)}</div>;
 const Err=()=>cm?<p className="text-xs font-semibold text-bad">{cm}</p>:null;
 const ga=sh&&sh.t==='editAcct'?book.list.find(a=>a.id===sh.id):null,gg=sh&&sh.t==='editGroup'?book.groups.find(g=>g.id===sh.id):null,um=sh&&sh.t==='unlock'&&grp&&grp.members?{mid:sh.mid,...(grp.members[sh.mid]||{})}:null;

 /* ---- cards ---- */
 const GroupCard=(g,i)=><div key={g.id} role="button" tabIndex={0} onClick={()=>setGv(g.id)} onKeyDown={e=>e.key==='Enter'&&setGv(g.id)} style={{animationDelay:i*50+'ms'}} className={cx(CARD,'lift anim-rise relative flex cursor-pointer flex-col gap-2.5 p-3 hover:border-accent/60 hover:shadow-xl hover:shadow-accent/10 sm:p-4')}>
  <div className="flex items-start justify-between"><GroupIcon g={g} s="h-12 w-12 sm:h-14 sm:w-14" t="text-2xl sm:text-3xl"/><button onClick={e=>{e.stopPropagation();setSh({t:'editGroup',id:g.id});setArm(null);setCm('');setGp('')}} className="-mr-1 -mt-1 rounded-lg p-1.5 text-sm text-muted opacity-70 transition hover:bg-ink/[.09] hover:opacity-100" aria-label="Edit group">Edit</button></div>
  <div className="min-w-0"><div className="truncate text-sm font-extrabold sm:text-base">{g.name}</div><div className="mt-0.5 truncate text-[11px] text-muted sm:text-xs">{countOf(g)} account{countOf(g)===1?'':'s'} · {g.cloud?(g.missing?'not found':'cloud'):'this device'}</div></div></div>;
 const AcctCard=(a,i)=><div key={a.id} role="button" tabIndex={0} onClick={()=>ctl.open(a.id)} onKeyDown={e=>e.key==='Enter'&&ctl.open(a.id)} style={{animationDelay:i*40+'ms'}} className={cx(CARD,'lift anim-rise flex cursor-pointer items-center gap-3 p-3 hover:border-accent/60 hover:shadow-xl hover:shadow-accent/10')}>
  <Avatar a={a} s="h-14 w-14" t="text-3xl"/>
  <div className="min-w-0 flex-1"><div className="flex items-center gap-1.5"><span className="truncate font-extrabold">{a.name||'Untitled'}</span><span className="shrink-0 text-xs" title={a.cloud?'Cloud account':'Local-only account'}>{a.cloud?'Cloud':'Local'}</span></div><div className="line-clamp-2 text-xs leading-snug text-muted">{a.bio||'No bio yet'}</div></div>
  <button onClick={e=>{e.stopPropagation();setSh({t:'editAcct',id:a.id});setArm(null);setCm('');setEf({pass:''})}} className="-mr-1 self-start rounded-lg p-1.5 text-sm text-muted opacity-70 transition hover:bg-ink/[.09] hover:opacity-100" aria-label="Edit account">Edit</button></div>;
 const LockedCard=(m,i)=><div key={m.mid} role="button" tabIndex={0} onClick={()=>{setUf({pass:''});setCm('');setSh({t:'unlock',mid:m.mid})}} className={cx(CARD,'lift anim-rise flex cursor-pointer items-center gap-3 border-dashed p-3 hover:border-accent/60')} style={{animationDelay:i*40+'ms'}}>
  <div className="relative"><Avatar a={{pic:m.p,name:m.n}} s="h-14 w-14" t="text-3xl"/><span className="absolute -bottom-1 -right-1 grid h-5 w-5 place-items-center rounded-full bg-white text-[11px] shadow ring-1 ring-line"><svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg></span></div>
  <div className="min-w-0 flex-1"><div className="truncate font-extrabold">{m.n||'Account'}</div><div className="line-clamp-2 text-xs leading-snug text-muted">{m.b||'Tap to unlock with its passcode'}</div></div></div>;

 /* ---- screens ---- */
 const NewG=()=>{setNg({name:'',icon:'',pic:'',cloud:CLOUD,pass:'',rec:''});setCm('');setSh({t:'newGroup'})};
 const JoinG=()=>{setJf({name:'',pass:''});setCm('');setSh({t:'joinGroup'})};
 const Top=<div className="flex items-center justify-between gap-2"><div className="flex items-center gap-2.5"><TigerLogo className="h-10 w-10"/><span className="text-sm font-extrabold">Grades Tracker</span></div>
  <div className="flex items-center gap-2"><span className="hidden text-[11px] text-muted sm:inline">{busy?'Updating from cloud…':at?'Updated '+rel(at):''}</span>{CLOUD&&<button className={BTN+' !px-3'} onClick={ctl.refresh} aria-label="Refresh from cloud"><span className={busy?'inline-block animate-spin':''}>↻</span></button>}<button className={BTN} onClick={()=>setSh({t:'theme'})}>Theme</button></div></div>;
 const Action=(title,sub,onClick,primary,disabled,d)=><button onClick={onClick} disabled={disabled} className={cx('lift relative flex flex-col items-start gap-10 overflow-hidden rounded-[2rem] p-6 text-left disabled:pointer-events-none disabled:opacity-50 sm:p-8',primary?'bg-accent text-accent-ink shadow-xl shadow-accent/25':'glass')}>
  <span className={cx('grid h-12 w-12 place-items-center rounded-2xl',primary?'bg-accent-ink/10':'bg-accent/15 text-accent-text')}><svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d={d}/></svg></span>
  <span><span className="block text-2xl font-black">{title}</span><span className={cx('mt-1 block max-w-xs text-sm',primary?'opacity-75':'text-muted')}>{sub}</span></span></button>;
 const GroupsScreen=()=><>
  <div className="anim-rise relative pb-8 pt-10 sm:pb-12 sm:pt-16"><div aria-hidden="true" className="orb -right-20 -top-10 h-72 w-72"/><h1 className="relative max-w-3xl text-4xl font-black leading-[1.05] tracking-tight sm:text-6xl">Know where you stand before grades are final.</h1><p className="relative mt-4 max-w-xl text-base text-muted sm:text-lg">Track every score, forecast your finals and plan your GWA. Your data stays private to your group and follows you across devices.</p></div>
  <div className="stagger grid gap-4 md:grid-cols-2">{Action('Create a group','Pick a name and passcode, then add your account.',NewG,true,false,'M12 5v14M5 12h14')}{Action('Join a group','Enter a group name and passcode to open its accounts.',JoinG,false,!CLOUD,'M10 17l5-5-5-5M15 12H3M15 4h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4')}</div>
  {!CLOUD&&<p className="mt-3 text-xs text-muted">Cloud sync is off. Add your database URL in config.js to join groups and sync between devices.</p>}
  {book.groups.length>0&&<><h2 className="mb-3 mt-10 text-lg font-extrabold">Your groups</h2><div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">{book.groups.map(GroupCard)}</div></>}</>;
 
const GroupScreen=()=>{const ls=localsOf(grp).slice().sort((a,b)=>(b.last||0)-(a.last||0)||(a.name||'').localeCompare(b.name||'')),rs=remotesOf(grp);return <>
  <div className="anim-rise flex items-center gap-3 pb-5 pt-6 sm:pt-10"><button className={BTN+' !px-3'} onClick={()=>setGv(null)} aria-label="Back to groups">← <span className="hidden sm:inline">Groups</span></button><GroupIcon g={grp} s="h-12 w-12" t="text-2xl"/><div className="min-w-0 flex-1"><h1 className="truncate text-2xl font-black tracking-tight sm:text-4xl">{grp.name}</h1><div className="text-xs text-muted">{countOf(grp)} account{countOf(grp)===1?'':'s'} · {grp.cloud?(grp.missing?'group not found in the cloud':'cloud group'):'this device only'}</div></div>
   <button className={BTN+' !px-3'} onClick={()=>{setSh({t:'editGroup',id:grp.id});setArm(null);setCm('');setGp('')}} aria-label="Edit group">Edit</button></div>
  <div className="mb-4 flex flex-wrap items-center gap-x-4 gap-y-2"><button className={BTNP} onClick={()=>{setNa({name:'',bio:'',emoji:'',pic:'',pass:'',pre:false});setCm('');setSh({t:'newAcct',local:!CLOUD})}}>＋ New Account{CLOUD?' (cloud)':''}</button>{CLOUD&&<button className="text-xs font-semibold text-muted underline decoration-dotted underline-offset-4 hover:text-ink" onClick={()=>{setNa({name:'',bio:'',emoji:'',pic:'',pass:'',pre:false});setCm('');setSh({t:'newAcct',local:true})}}>or create a local-only account</button>}</div>
  {!ls.length&&!rs.length&&<p className={cx(CARD,'p-6 text-center text-sm text-muted')}>No accounts in this group yet. Tap “New Account” to add the first one.</p>}
  <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 sm:gap-3 lg:grid-cols-3">{ls.map(AcctCard)}{rs.map(LockedCard)}</div>
  <div className="mt-8 flex flex-col items-center gap-3 text-center text-xs text-muted">
   {CLOUD&&<button className="font-semibold underline decoration-dotted underline-offset-4 hover:text-ink" onClick={()=>{setSf({name:'',pass:''});setCm('');setSh({t:'signin'})}}>Sign in with a sync name and passcode</button>}
   {CAN_FILE&&<label className="cursor-pointer font-semibold underline decoration-dotted underline-offset-4 hover:text-ink">Import a backup into this group<input type="file" accept="application/json,.json" onChange={pickBackup} className="hidden"/></label>}
   {msg&&<p className="font-semibold text-ink">{msg}</p>}</div></>};

 return <div className="mx-auto max-w-6xl px-4 pb-20 pt-5 sm:px-8 sm:pt-8">
  {Top}
  <div key={gv||'groups'}>{grp?GroupScreen():GroupsScreen()}</div>

  <Sheet open={!!sh&&sh.t==='newGroup'} onClose={()=>setSh(null)} title="Create New Group">
   {Photo(ng,pic=>setNg({...ng,pic}),()=>setNg({...ng,pic:''}),<GroupIcon g={ng} s="h-16 w-16" t="text-4xl"/>)}
   {!ng.pic&&Emojis(GEMO,ng.icon,e=>setNg({...ng,icon:e}))}
   <label className="text-sm font-semibold">Group name<TextIn v={ng.name} on={v=>setNg({...ng,name:v})} ph="e.g. Section 2A2" cls="mt-1"/></label>
   {CLOUD&&<div className="flex flex-col gap-2 rounded-2xl border border-line bg-ink/[.06] p-3"><label className="flex items-start gap-2 text-sm font-semibold"><input type="checkbox" checked={ng.cloud} onChange={e=>setNg({...ng,cloud:e.target.checked})} className="mt-1 h-4 w-4 accent-[rgb(var(--accent))]"/><span>Sync this group to the cloud<span className="block text-xs font-normal text-muted">Its accounts then appear on all your devices.</span></span></label>
    {ng.cloud&&<><TextIn type="password" v={ng.pass} on={v=>setNg({...ng,pass:v})} ph="Group passcode (6+ characters)"/><TextIn type="email" v={ng.rec} on={v=>setNg({...ng,rec:v})} ph="Recovery email (optional)"/><p className="text-xs text-muted">Members who forget a passcode can email you. It is stored with the group and visible to people who join it.</p></>}</div>}
   {Err()}<button disabled={cb} className={BTNP} onClick={()=>go(()=>ctl.createGroup({...ng,pass:ng.cloud?ng.pass:''}),r=>setGv(r.slice(3)))}>{cb?'Working…':'Create group'}</button></Sheet>

  <Sheet open={!!sh&&sh.t==='joinGroup'} onClose={()=>setSh(null)} title="Join a group">
   <p className="text-sm text-muted">Enter the group’s name and passcode. Its accounts then load automatically every time you open the app.</p>
   <TextIn v={jf.name} on={v=>setJf({...jf,name:v})} ph="Group name"/><TextIn type="password" v={jf.pass} on={v=>setJf({...jf,pass:v})} ph="Group passcode"/>
   {Err()}<button disabled={cb} className={BTNP} onClick={()=>go(()=>ctl.joinGroup(jf.name,jf.pass),r=>setGv(r.slice(3)))}>{cb?'Working…':'Join group'}</button><p className="text-center text-xs text-muted">Forgot the group passcode? Ask the person who created the group.</p></Sheet>

  <Sheet open={!!gg} onClose={()=>{setSh(null);setArm(null)}} title="Edit group">{gg&&<>
   {Photo(gg,pic=>ctl.editGroup(gg.id,{pic}),()=>ctl.editGroup(gg.id,{pic:''}),<GroupIcon g={gg} s="h-16 w-16" t="text-4xl"/>)}
   {!gg.pic&&Emojis(GEMO,gg.icon,e=>ctl.editGroup(gg.id,{icon:e}))}
   <label className="text-sm font-semibold">Group name<TextIn v={gg.name} on={v=>ctl.editGroup(gg.id,{name:v})} ph="Group name" cls="mt-1"/></label>
   {CLOUD&&<div className="flex flex-col gap-2 rounded-2xl border border-line bg-ink/[.06] p-3"><div className="text-sm font-bold">Cloud</div>
    {gg.cloud?<><p className="text-sm text-muted">Synced as <b className="text-ink">{gg.cloud.sn}</b>. Accounts you create here as cloud accounts show up on every device that joins this group.</p><label className="text-sm font-semibold">Recovery email<TextIn type="email" v={gg.rec||''} on={v=>ctl.editGroup(gg.id,{rec:v})} ph="name@example.com" cls="mt-1"/></label></>
     :<><p className="text-xs text-muted">This group lives on this device only.</p><TextIn type="password" v={gp} on={setGp} ph="Group passcode (6+ characters)"/>{Err()}<button disabled={cb} className={BTN} onClick={()=>go(()=>ctl.enableGroupCloud(gg.id,gp),()=>setGp(''))}>Turn on cloud for this group</button></>}</div>}
   <div className="flex flex-col gap-2"><button className={BTNX} onClick={()=>{if(arm==='g'+gg.id){ctl.deleteGroup(gg.id,false);setSh(null);setArm(null);setGv(null)}else{setArm('g'+gg.id);setTimeout(()=>setArm(x=>x==='g'+gg.id?null:x),4000)}}}>{arm==='g'+gg.id?'Tap again to remove from this device':'Remove group from this device'}</button>
    {gg.cloud&&<button className={BTNX} onClick={()=>{if(arm==='G'+gg.id){ctl.deleteGroup(gg.id,true);setSh(null);setArm(null);setGv(null)}else{setArm('G'+gg.id);setTimeout(()=>setArm(x=>x==='G'+gg.id?null:x),4000)}}}>{arm==='G'+gg.id?'Tap again to delete for everyone':'Delete group from the cloud too'}</button>}
    <p className="text-xs text-muted">Accounts in a removed group move to another group. Account data is never deleted by removing a group.</p></div></>}</Sheet>

  <Sheet open={!!sh&&sh.t==='newAcct'&&!!grp} onClose={()=>setSh(null)} title={sh&&sh.local?'New local-only account':'New Account (cloud)'}>
   {Photo(na,pic=>setNa({...na,pic}),()=>setNa({...na,pic:''}))}
   {!na.pic&&Emojis(EMO,na.emoji,e=>setNa({...na,emoji:e}))}
   <label className="text-sm font-semibold">Name<TextIn v={na.name} on={v=>setNa({...na,name:v})} ph="Your name" cls="mt-1"/></label>
   <label className="text-sm font-semibold">Bio <span className="text-xs font-normal text-muted">(optional)</span><TextIn v={na.bio} on={v=>setNa({...na,bio:v.slice(0,80)})} ph="Program and year (optional)" cls="mt-1"/></label>
   {sh&&!sh.local&&<><TextIn type="password" v={na.pass} on={v=>setNa({...na,pass:v})} ph="Account passcode (6+ characters)"/><p className="-mt-3 text-xs text-muted">The name and passcode together sign you in on any device. Keep the passcode private.</p></>}
   {Err()}<button disabled={cb} className={BTNP} onClick={()=>go(()=>ctl.createAccount({...na,gid:grp.id,local:sh.local}),r=>ctl.open(r.slice(3)))}>{cb?'Working…':sh&&sh.local?'Create local account':'Create cloud account'}</button></Sheet>

  <Sheet open={!!um} onClose={()=>setSh(null)} title="Unlock account">{um&&<>
   <div className="flex items-center gap-3"><Avatar a={{pic:um.p,emoji:um.e||''}} s="h-14 w-14" t="text-3xl"/><div className="min-w-0"><div className="truncate font-extrabold">{um.n}</div><div className="line-clamp-2 text-xs text-muted">{um.b}</div></div></div>
   <TextIn type="password" v={uf.pass} on={v=>setUf({pass:v})} ph="Account passcode"/>
   {Err()}<button disabled={cb} className={BTNP} onClick={()=>go(()=>ctl.unlock(grp.id,um.mid,uf.pass),r=>ctl.open(r.slice(3)))}>{cb?'Working…':'Unlock'}</button>{grp.rec?<a className="text-center text-xs font-semibold text-accent-text underline" href={'mailto:'+grp.rec+'?subject='+encodeURIComponent('Passcode help for '+(um.n||'my account'))+'&body='+encodeURIComponent('Hi, I forgot the passcode for the account "'+(um.n||'')+'" in the group "'+grp.name+'". Could you help me recover it?')}>Forgot passcode? Email the group creator</a>:<p className="text-center text-xs text-muted">Forgot the passcode? This group has no recovery email, so ask the group creator.</p>}</>}</Sheet>

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
   {CLOUD&&<div className="flex flex-col gap-2 rounded-2xl border border-line bg-ink/[.06] p-3"><div className="text-sm font-bold">Cloud sync</div>
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
 const pubG=async id=>{const g=grp(id);if(!g||!g.cloud||!navigator.onLine)return;try{await gwrite(g.cloud.k,'meta',{n:g.name,i:g.icon||'',p:g.pic||null,r:g.rec||null,t:Date.now()});g.dirty=false;saveBook(bk.current)}catch(e){}};
 const pubGLater=id=>{clearTimeout(pg.current[id]);pg.current[id]=setTimeout(()=>pubG(id),900)};
 const refresh=async()=>{if(!CLOUD||!navigator.onLine)return;const gs=bk.current.groups.filter(g=>g.cloud);if(!gs.length){setAt(Date.now());return}setBusy(true);
  await Promise.all(gs.map(async g=>{try{const r=await gread(g.cloud.k);if(r&&r.meta){if(!g.dirty){g.name=r.meta.n||g.name;g.icon=r.meta.i||g.icon;g.rec=r.meta.r||'';if(r.meta.p)g.pic=r.meta.p;else delete g.pic}g.members=r.m||{};delete g.missing}else if(r===null){g.missing=true}g.fetched=Date.now()}catch(e){}}));
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
 const addAcc=(o,d)=>{const id=uid();bk.current.list=[...bk.current.list,{id,name:(o.name||'').trim()||'New account',bio:o.bio||'',emoji:o.emoji||'',...(o.pic?{pic:o.pic}:{}),gid:o.gid,...(o.extra||{})}];bk.current.data[id]=d;return id};
 const NOCLOUD='Cloud is not set up yet. Add your database URL in config.js.',NEEDNET='You need an internet connection for that.',BADNET='Could not reach the cloud database. Check config.js, your database rules and your internet.';
 const createGroup=async n=>{if(!(n.name||'').trim())return'Give the group a name.';const g={id:'g'+uid(),name:n.name.trim(),icon:n.icon||'',rec:(n.rec||'').trim()};if(n.pic)g.pic=n.pic;if(g.rec&&!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(g.rec))return'Enter a valid recovery email or leave it blank.';
  if(n.pass){if(!CLOUD)return NOCLOUD;if(n.pass.length<6)return'Use a passcode of at least 6 characters.';if(!navigator.onLine)return NEEDNET;
   try{const k=await gkey(n.name,n.pass),ex=await gread(k);if(ex&&ex.meta)return'A group with that name and passcode already exists. Use “Join an existing group”.';await gwrite(k,'meta',{n:g.name,i:g.icon,p:g.pic||null,r:g.rec||null,t:Date.now()});g.cloud={k,sn:n.name.trim()};g.members={}}catch(e){return BADNET}}
  bk.current.groups=[...bk.current.groups,g];save();return'ok:'+g.id};
 const joinGroup=async(name,pw)=>{if(!CLOUD)return NOCLOUD;if(!(name||'').trim()||(pw||'').length<6)return'Enter the group name and its passcode (6+ characters).';if(!navigator.onLine)return NEEDNET;
  try{const k=await gkey(name,pw),r=await gread(k);if(!r||!r.meta)return'No group found with that name and passcode.';const ex=bk.current.groups.find(g=>g.cloud&&g.cloud.k===k);if(ex)return'ok:'+ex.id;
   const g={id:'g'+uid(),name:r.meta.n||name.trim(),icon:r.meta.i||'',rec:r.meta.r||'',cloud:{k,sn:name.trim()},members:r.m||{},fetched:Date.now()};if(r.meta.p)g.pic=r.meta.p;bk.current.groups=[...bk.current.groups,g];save();return'ok:'+g.id}catch(e){return BADNET}};
 const editGroup=(id,p)=>{const g=grp(id);if(!g)return;Object.assign(g,p);if(p.pic==='')delete g.pic;if(g.cloud){g.dirty=true;pubGLater(id)}save()};
 const enableGroupCloud=async(id,pw)=>{const g=grp(id);if(!g)return'Group not found.';if(!CLOUD)return NOCLOUD;if((pw||'').length<6)return'Use a passcode of at least 6 characters.';if(!navigator.onLine)return NEEDNET;
  try{const k=await gkey(g.name,pw),ex=await gread(k);if(ex&&ex.meta)return'A group with that name and passcode already exists. Choose a different passcode.';await gwrite(k,'meta',{n:g.name,i:g.icon||'',p:g.pic||null,r:g.rec||null,t:Date.now()});g.cloud={k,sn:g.name.trim()};g.members={};save();bk.current.list.filter(a=>a.gid===id&&a.cloud).forEach(a=>pubM(a.id));return'ok'}catch(e){return BADNET}};
 const deleteGroup=async(id,everywhere)=>{const g=grp(id);if(!g)return;if(everywhere&&g.cloud){try{await gremove(g.cloud.k)}catch(e){}}
  let gs=bk.current.groups.filter(x=>x.id!==id);if(!gs.length&&bk.current.list.some(a=>a.gid===id))gs=[defGroup()];bk.current.groups=gs;bk.current.list.forEach(a=>{if(a.gid===id)a.gid=gs[0].id});save()};
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
   const id=addAcc({name:r.n||sn,bio:r.b||'',emoji:r.e||'',pic:r.p,gid,extra:{cloud:{k,sn:sn.trim()},sy:{t:r.t,base:r.t,dirty:false,at:Date.now()}}},d);save();pubLater(id);return'ok:'+id}catch(e){return BADNET}};
 const rename=(id,p)=>{const a=acc(id);if(!a)return;const oldG=grp(a.gid);Object.assign(a,p);if(p.pic==='')delete a.pic;
  if(p.gid&&oldG&&oldG.id!==p.gid&&a.mid&&oldG.cloud){gremove(oldG.cloud.k,'m/'+a.mid).catch(()=>{});delete a.mid}
  if(a.cloud){a.sy={...(a.sy||{}),t:Date.now(),dirty:true};later(id);pubLater(id)}save()};
 const enable=async(id,sn,pw)=>{const a=acc(id);if(!a)return'Account not found.';if(!CLOUD)return NOCLOUD;if(!(sn||'').trim()||(pw||'').length<6)return'Use a passcode of at least 6 characters.';if(!navigator.onLine)return NEEDNET;
  try{const k=await ckey(sn,pw),ex=await cget(k);if(validDoc(ex))return'A cloud account with that name and passcode already exists. Choose a different passcode.';const t=Date.now();await cput(k,docOf(a,id,t));a.cloud={k,sn:sn.trim()};a.sy={t,base:t,dirty:false,at:Date.now()};save();pubLater(id);return'ok'}catch(e){return BADNET}};
 const disable=id=>{const a=acc(id);if(a){delete a.cloud;delete a.sy;delete a.loser;save()}};
 const del=async(id,everywhere)=>{const a=acc(id);if(!a)return;if(everywhere&&a.cloud){try{await premove(a.cloud.k)}catch(e){}const g=grp(a.gid);if(a.mid&&g&&g.cloud){try{await gremove(g.cloud.k,'m/'+a.mid)}catch(e){}}}
  bk.current.list=bk.current.list.filter(x=>x.id!==id);delete bk.current.data[id];save()};
 const imp=(gid,name,d)=>{addAcc({name,emoji:'',gid},mig(d));save()};
 const guest=()=>{gd.current=blank(false);setCur({guest:true})};
 const keep=name=>{const g0=bk.current.groups[0];if(!g0)return;const id=addAcc({name,emoji:'',gid:g0.id},gd.current);save();open(id)};
 const leave=()=>{const id=cur&&cur.id,a=id&&acc(id);if(a&&a.cloud){clearTimeout(tm.current[id]);if(a.sy&&a.sy.dirty&&navigator.onLine)push(id)}setCur(null);refresh()};
  const chk=(n,n2)=>(n||'').length<6?'Use a new passcode of at least 6 characters.':n!==n2?'The new passcodes do not match.':!navigator.onLine?NEEDNET:'';
 const changePass=async(id,o,n,n2)=>{const a=acc(id);if(!a||!a.cloud)return'This is not a cloud account.';const e=chk(n,n2);if(e)return e;
  try{if(await ckey(a.cloud.sn,o)!==a.cloud.k)return'The current passcode is wrong.';const k=await ckey(a.cloud.sn,n);if(k===a.cloud.k)return'Choose a different passcode.';if(validDoc(await cget(k)))return'That name and passcode combination is taken. Choose another passcode.';
   const t=Date.now(),old=a.cloud.k;await cput(k,docOf(a,id,t));a.cloud={...a.cloud,k};a.sy={t,base:t,dirty:false,at:Date.now()};save();try{await premove(old)}catch(x){}pubLater(id);return'ok'}catch(x){return BADNET}};
 const changeGroupPass=async(gid,o,n,n2)=>{const g=grp(gid);if(!g||!g.cloud)return'This group is not synced.';const e=chk(n,n2);if(e)return e;
  try{if(await gkey(g.cloud.sn,o)!==g.cloud.k)return'The current group passcode is wrong.';const k=await gkey(g.cloud.sn,n);if(k===g.cloud.k)return'Choose a different passcode.';const ex=await gread(k);if(ex&&ex.meta)return'A group with that name and passcode already exists. Choose another passcode.';
   const c0=await gread(g.cloud.k);if(!c0||!c0.meta)return'Group not found in the cloud.';const old=g.cloud.k;await gwrite(k,undefined,{...c0,meta:{...c0.meta,t:Date.now()}});g.cloud={...g.cloud,k};save();try{await gremove(old)}catch(x){}return'ok'}catch(x){return BADNET}};
 
const ctl={open,guest,createGroup,joinGroup,editGroup,enableGroupCloud,deleteGroup,createAccount,unlock,signIn,rename,enable,disable,del,imp,refresh};

 let view;
 if(!cur)view=<Home key="home" book={bk.current} theme={theme} setTheme={setTheme} ctl={ctl} busy={busy} at={at}/>;
 else{
  const a=cur.guest?{name:'Guest',emoji:''}:acc(cur.id);
  if(!a){setTimeout(()=>setCur(null),0);return null}
  const lbl=stat==='synced'?'Synced':stat==='syncing'?'Syncing…':stat==='offline'?'Offline · saved here':'Sync error · tap to retry';
  const cl=a.cloud?{on:true,state:stat,label:lbl,sync:()=>sync(cur.id),at:a.sy&&a.sy.at,pending:!!(a.sy&&a.sy.dirty)}:{on:false,state:'local',label:cur.guest?'Not saved':'This device only',sync:()=>{}};
  const onSave=n=>{if(cur.guest){gd.current=n;return}const x=acc(cur.id);bk.current.data[cur.id]=n;if(x&&x.cloud){x.sy={...(x.sy||{}),t:Date.now(),dirty:true};setStat(navigator.onLine?'syncing':'offline');later(cur.id)}saveBook(bk.current)};
  view=<App key={(cur.id||'guest')+'-'+ver} init={cur.guest?gd.current:bk.current.data[cur.id]} acct={a} guest={!!cur.guest} onSave={onSave} onSwitch={leave} onKeep={keep} cloud={cl} ext={ext} loser={a.loser} onLoser={()=>{delete a.loser;save()}} theme={theme} setTheme={setTheme} prof={{rename:p=>rename(cur.id,p),changePass:(o,n,n2)=>changePass(cur.id,o,n,n2),group:grp(a.gid),changeGroupPass:(o,n,n2)=>changeGroupPass(a.gid,o,n,n2),setRec:e=>editGroup(a.gid,{rec:e})}}/>;
 }
 return <><Ambient/><div key={cur?'app':'home'} className="anim-rise">{view}</div></>;
}
ReactDOM.createRoot(document.getElementById('root')).render(<Root/>);
