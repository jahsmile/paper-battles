/* ---------- хранение в аккаунте: герои и настройки на всех устройствах ---------- */
const cloud={col:null,on:false,dirty:new Set(),t:0,busy:false,status:'local'};
function cloudMark(k){cloud.dirty.add(k);if(!cloud.on)return;clearTimeout(cloud.t);cloud.t=setTimeout(cloudFlush,1500)}
function renderSync(){
  const el=$('syncText');if(!el)return;
  el.textContent=!cloud.on?'Сейчас всё хранится только на этом устройстве.':cloud.status==='err'?'Не получилось сохранить в аккаунт. Попробую ещё раз при следующем изменении.':'Герои, настройки и расстановки сохраняются в твоём аккаунте и подтянутся на другом устройстве.';
}
async function cloudFlush(){
  if(!cloud.on||cloud.busy)return;cloud.busy=true;
  try{
    while(cloud.dirty.size){
      const k=cloud.dirty.values().next().value;cloud.dirty.delete(k);
      if(k==='state')await cloud.col.doc('state').set(JSON.parse(JSON.stringify(S)));
      else{
        const id=k.slice(2);
        if(k==='arena'){const src=arenaSrc();if(src&&src.length<250000)await cloud.col.doc('arena').set({src,ts:+(localStorage.getItem(LS+'-arena-ts')||0)});continue}
        if(k[0]==='s'){if(SND.map[id])await cloud.col.doc('s_'+id).set({d:SND.map[id]});else await cloud.col.doc('s_'+id).delete();continue}
        const it=library.find(i=>i.id===id);
        if(it&&it.custom){ // сам герой и его исходное фото лежат в разных записях, чтобы уложиться в размер
          const r=heroRec(it),raw={raw:r.raw,mask:r.mask};r.raw='';r.mask='';
          if(JSON.stringify(r).length<250000)await cloud.col.doc('h_'+id).set(r);
          if(raw.raw&&JSON.stringify(raw).length<250000)await cloud.col.doc('r_'+id).set(raw);
        }else{await cloud.col.doc('h_'+id).delete();await cloud.col.doc('r_'+id).delete()}
      }
    }
    cloud.status='ok';
  }catch(e){cloud.status='err'}
  cloud.busy=false;renderSync();
}
function adoptState(r){
  if(preview||state!=='setup'){setTimeout(()=>adoptState(r),3000);return}
  Object.assign(S,JSON.parse(JSON.stringify(r)));
  S.set=Object.assign({paper:'white',mute:false,music:false,limit:0,mode:'free',tip:false},S.set||{});S.camp=Object.assign({level:0},S.camp||{});
  S.stats=S.stats||{};S.lineups=S.lineups||[];S.deleted=S.deleted||[];S.ov=S.ov||{};OV=S.ov;
  try{localStorage.setItem(LS+'-state',JSON.stringify(S))}catch(e){}
  const del=new Set(S.deleted);for(let i=library.length-1;i>=0;i--)if(library[i].custom&&del.has(library[i].id))library.splice(i,1);
  library.forEach(it=>{it.ov=OV[it.id]||null;it.size=1;fixOv(it);buildD(it)});
  units=units.filter(u=>library.includes(u.item));units.forEach(u=>{u.D=u.item.D;u.cds=u.D.atks.map(()=>.4);applySize(u)});
  muted=S.set.mute;sndBtn.setAttribute('aria-pressed',muted?'false':'true');setPaper(S.set.paper);
  selected=selU=selP=null;applyMode(true);saveCustom();renderLib();renderMenu();if(S.set.tip)$('tip').hidden=true;
}
async function cloudInit(){
  try{
    if(!window.claude||!window.claude.use)return;
    const [db,user]=await Promise.all([window.claude.use('db'),window.claude.use('user')]);if(!db||!user)return;cloud.db=db;
    const uid=await user.id();if(!uid)return;
    cloud.col=db.collection('data/users/'+uid);
    const snap=await Promise.race([cloud.col.get(),new Promise((_,rej)=>setTimeout(()=>rej(new Error('timeout')),10000))]);
    let remote=null;const heroes=[];
    const raws={};
    snap.docs.forEach(d=>{
      const v=d.data();if(!v)return;const p=d.id.slice(0,2),id=d.id.slice(2);
      if(d.id==='state')remote=v;else if(p==='h_'&&v.id)heroes.push(JSON.parse(JSON.stringify(v)));else if(p==='r_')raws[id]=v;
      else if(p==='s_'&&typeof v.d==='string'&&!SND.map[id]){SND.map[id]=v.d;try{localStorage.setItem(LS+'-snd',JSON.stringify(SND.map))}catch(e){}}
      else if(d.id==='arena'&&typeof v.src==='string'&&(v.ts||0)>+(localStorage.getItem(LS+'-arena-ts')||0)){try{localStorage.setItem(LS+'-arena',v.src);localStorage.setItem(LS+'-arena-ts',String(v.ts||0))}catch(e){}arenaLoad()}
    });
    heroes.forEach(h=>{const r=raws[h.id];if(r&&!h.raw){h.raw=r.raw||'';h.mask=r.mask||''}});
    cloud.on=true;cloud.status='ok';
    if(remote&&(remote.ts||0)>(S.ts||0))adoptState(remote);else if(S.ts)cloud.dirty.add('state');
    const del=new Set(S.deleted);
    for(const h of heroes){if(del.has(h.id))cloud.dirty.add('h:'+h.id);else if(!library.some(i=>i.id===h.id))addCustomRec(JSON.parse(JSON.stringify(h)))}
    setTimeout(()=>{library.filter(i=>i.custom&&!heroes.some(h=>h.id===i.id)).forEach(i=>cloud.dirty.add('h:'+i.id));saveCustom();cloudFlush()},1500);
    renderSync();
  }catch(e){cloud.status='local';renderSync()}
}

/* ---------- предметы на листе ---------- */
const PROPITEMS=[['rock','Камень','преграда: герои обходят, пули застревают'],['glue','Клей','лужа клея: в ней все еле идут'],['fire','Костёр','жжёт всех, кто рядом']].map(([kind,name,desc])=>{
  const c=mk(100,88),sv=ctx,sb=base;ctx=c.getContext('2d');base=22;
  try{drawProp({kind,x:50,y:kind==='rock'?74:kind==='fire'?72:48,s:1,seed:5},0)}catch(e){}
  ctx=sv;base=sb;return{prop:kind,name,desc,size:1,src:c.toDataURL()};
});

/* ---------- режимы: свободный бой, на двоих, турнир ---------- */
const LEVELS=[
  {bud:0.9,name:'Разминка',foes:[['witch',.6,.5,.8]]},
  {bud:1.18,name:'Два танка',foes:[['blade',.4,.3,.9],['black',.6,.7,.9]]},
  {bud:1.28,name:'Бешеный робот',foes:[['purple',.7,.4,1.2],['dino',.5,.75,.9]]},
  {bud:1.22,name:'Пила и хвост',foes:[['saw',.7,.5,1.1],['rider',.5,.2,1]]},
  {bud:1.0,name:'Королевская стража',foes:[['king',.35,.5,1],['golem',.75,.3,1],['witch',.7,.75,1]]},
  {bud:1.1,name:'Ракетный дождь',foes:[['teeth',.4,.25,1.2],['teeth',.4,.75,1],['blade',.25,.5,1]]},
  {bud:1.35,name:'Стальной кулак',foes:[['golem',.75,.5,1.4],['saw',.7,.2,1.2],['black',.35,.75,1]]},
  {bud:0.88,name:'Орда',foes:[['witch',.8,.2,.9],['witch',.8,.5,.9],['witch',.8,.8,.9],['purple',.6,.35,1],['dino',.45,.65,1],['rider',.6,.9,1]]},
  {bud:1.0,name:'Король и свита',foes:[['king',.3,.5,1.3],['blade',.25,.2,1.1],['black',.4,.8,1.1],['golem',.75,.35,1.1],['purple',.7,.7,1]]},
  {bud:1.35,name:'Крепость',foes:[['fort',.4,.5,1.5],['teeth',.7,.2,1],['dino',.75,.8,1],['witch',.85,.5,1]]}
];
function loadLevel(i){
  camp.i=clamp(i,0,LEVELS.length-1);const Lv=LEVELS[camp.i];camp.name=Lv.name;camp.won=false;
  units=[];props=[];selU=selP=null;let pw=0;
  Lv.foes.forEach(([k,d,l,sz])=>{const it=library.find(q=>q.id==='d-'+k),p=fromSide(1,d,l),u=makeUnit(it,p.x,p.y+base,1,sz);u.locked=true;units.push(u);pw+=power(u.D,sz)});
  camp.budget=Math.max(30,Math.round(pw*(Lv.bud||.9)/10)*10);
  $('fight').textContent=fightLabel();renderInfo();
}
let lastMode=S.set.mode;
function applyMode(init){
  const m=S.set.mode;document.body.dataset.mode=m;duelPhase=0;selU=selP=null;
  if(m==='camp')loadLevel(S.camp.level);
  else{units.forEach(u=>{u.locked=false});if(!init&&lastMode==='camp'){units=[];preset()}if(m==='duel'&&!init)units=[]}
  lastMode=m;$('fight').textContent=fightLabel();renderInfo();
}

/* ---------- меню ---------- */
function press(sel,val){document.querySelectorAll(sel).forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.v)===String(val)?'true':'false'))}
function renderMenu(){
  press('#mMode button',S.set.mode);press('#mLimit button',S.set.limit);
  $('mMusic').setAttribute('aria-pressed',S.set.music?'true':'false');$('mMusic').textContent=S.set.music?'Музыка играет':'Музыка выключена';
  const lv=$('mLevels');lv.textContent='';$('mLevelsBox').hidden=S.set.mode!=='camp';
  LEVELS.forEach((Lv,i)=>{const b=document.createElement('button');b.type='button';const sn=(S.camp.stars||{})[i]||0;b.textContent=(i+1)+'. '+Lv.name+(sn?' '+'★'.repeat(sn)+'☆'.repeat(3-sn):'');b.disabled=i>S.camp.level;b.setAttribute('aria-pressed',i===camp.i?'true':'false');
    b.onclick=()=>{if(state!=='setup')return;loadLevel(i);renderMenu();$('menu').hidden=true};lv.append(b)});
  const box=$('mLineups');box.textContent='';
  if(!S.lineups.length){const p=document.createElement('p');p.className='note';p.textContent='Пока нет сохранённых расстановок.';box.append(p)}
  S.lineups.forEach((Ln,i)=>{
    const row=document.createElement('div');row.className='lrow';
    const a=document.createElement('button');a.type='button';a.className='btn light';a.textContent=Ln.name+' ('+Ln.u.length+')';a.onclick=()=>loadLineup(i);
    const d=document.createElement('button');d.type='button';d.className='btn light';d.textContent='Удалить';d.setAttribute('aria-label','Удалить '+Ln.name);d.onclick=()=>{S.lineups.splice(i,1);saveState();renderMenu()};
    row.append(a,d);box.append(row);
  });
  renderSync();renderArena();
}
function loadLineup(i){
  const Ln=S.lineups[i];if(!Ln||state!=='setup')return;
  if(S.set.mode!=='free'){S.set.mode='free';applyMode()}
  units=[];props=[];selU=selP=null;
  Ln.u.forEach(([id,a,b,team,sz])=>{const it=library.find(q=>q.id===id);if(it){const p=fromAB(a,b);units.push(makeUnit(it,p.x,p.y,team,sz))}});
  if(SHOW_PROPS)(Ln.p||[]).forEach(([kind,a,b,sz])=>{const p=fromAB(a,b);props.push({kind,x:p.x,y:p.y,s:sz,seed:(Math.random()*1e9)|0})});
  saveState();renderMenu();renderInfo();$('menu').hidden=true;
}
$('menuBtn').onclick=()=>{renderMenu();$('menu').hidden=false};
$('mClose').onclick=()=>{$('menu').hidden=true};
document.querySelectorAll('#mMode button').forEach(b=>b.onclick=()=>{
  if(state!=='setup'){toast('Сначала закончи бой');return}
  if(S.set.mode===b.dataset.v)return;S.set.mode=b.dataset.v;applyMode();saveState();renderMenu();
});
document.querySelectorAll('#mLimit button').forEach(b=>b.onclick=()=>{S.set.limit=+b.dataset.v;saveState();renderMenu()});
$('mMusic').onclick=()=>{S.set.music=!S.set.music;saveState();renderMenu();audioInit()};
$('mSave').onclick=()=>{
  const u=units.filter(q=>!q.locked).map(q=>{const ab=toAB(q.x,q.y);return[q.item.id,+ab[0].toFixed(3),+ab[1].toFixed(3),q.team,q.s]});
  if(!u.length){toast('На листе пока никого нет');return}
  if(S.lineups.length>=8){toast('Сохранено уже восемь расстановок. Удали лишнюю.');return}
  let n=S.lineups.length+1;while(S.lineups.some(q=>q.name==='Состав '+n))n++;
  S.lineups.push({name:'Состав '+n,u,p:props.map(q=>{const ab=toAB(q.x,q.y);return[q.kind,+ab[0].toFixed(3),+ab[1].toFixed(3),q.s]})});saveState();renderMenu();
};
$('mHelp').onclick=()=>{$('menu').hidden=true;$('tip').hidden=false};
$('tipOk').onclick=()=>{$('tip').hidden=true;if(!S.set.tip){S.set.tip=true;saveState()}};

/* ---------- панель боя: приёмы, пауза, скорость ---------- */
function renderBar(){
  press('#bbar [data-v]',btool);$('toolHint').textContent={blot:'Клякса: бьёт всех рядом',heal:'Ластик: лечит всех рядом',clip:'Скрепка: держит на месте'}[btool];$('spPause').setAttribute('aria-pressed',paused?'true':'false');$('spPause').textContent=paused?'Дальше':'Пауза';
  $('spFast').setAttribute('aria-pressed',speedMul>1?'true':'false');
}
document.querySelectorAll('#bbar [data-v]').forEach(b=>b.onclick=()=>{btool=b.dataset.v;renderBar()});
$('spPause').onclick=()=>{paused=!paused;renderBar()};
$('spFast').onclick=()=>{speedMul=speedMul>1?1:2;renderBar()};

/* ---------- повтор финала ---------- */
const rec={pool:[],n:0,acc:0,max:44};let replay=null;
function record(real){
  rec.acc+=real;if(rec.acc<.075)return;rec.acc=0;
  const w=Math.max(60,Math.round(W*.6)),h=Math.max(60,Math.round(H*.6)),i=rec.n%rec.max;let c=rec.pool[i];
  if(!c||c.width!==w||c.height!==h)c=rec.pool[i]=mk(w,h);
  c.getContext('2d').drawImage(cv,0,0,w,h);rec.n++;
}
$('replayBtn').onclick=()=>{
  const count=Math.min(rec.n,rec.max);if(count<2)return;
  replay={t:0,count,start:rec.n>rec.max?rec.n%rec.max:0};$('banner').hidden=true;
};
function playReplay(real){
  replay.t+=real;const k=Math.floor(replay.t/.13);
  if(k>=replay.count+5||state!=='over'){replay=null;$('banner').hidden=state!=='over';return}
  const c=rec.pool[(replay.start+Math.min(k,replay.count-1))%rec.max];
  ctx.setTransform(DPR,0,0,DPR,0,0);ctx.globalAlpha=1;if(c)ctx.drawImage(c,0,0,W,H);
  const fs=clamp(base*1.2,18,30);ctx.font=`${fs}px Neucha,"Comic Sans MS",cursive`;ctx.textAlign='center';ctx.lineJoin='round';
  ctx.lineWidth=fs*.22;ctx.strokeStyle=PENCIL;ctx.strokeText('ПОВТОР',W/2,fs*1.4);ctx.fillStyle=MARKER;ctx.fillText('ПОВТОР',W/2,fs*1.4);
}

/* ---------- музыка и голоса ---------- */
const hsh=str=>{let h=7;for(let i=0;i<str.length;i++)h=(h*31+str.charCodeAt(i))>>>0;return h};
function voice(u){
  if(!AC||muted||AC.state!=='running'||preview&&Math.random()<.5)return;
  const h=hsh(u.item.id||u.item.name||'x'),f=170+(h%10)*52,type=u.D.veh?'square':h%2?'triangle':'sawtooth',n=3+(h>>4)%3;
  try{for(let i=0;i<n;i++)tone(type,f*(1+((h>>(i*2))&3)*.09+Math.random()*.05),f*(.85+Math.random()*.35),.07,.06,i*.085)}catch(e){}
}
const TUNE=[0,null,4,7,4,null,0,-3,0,null,4,7,9,7,4,2,5,null,9,12,9,null,5,2,7,null,4,2,0,null,-5,null];
const MUSIC={step:0,next:0};
setInterval(()=>{
  if(!AC||muted||!S.set.music||AC.state!=='running'||document.hidden)return;
  const now=AC.currentTime;if(MUSIC.next<now)MUSIC.next=now+.05;
  try{
    while(MUSIC.next<now+.35){
      const i=MUSIC.step%TUNE.length,n=TUNE[i],dl=MUSIC.next-now,fq=k=>392*Math.pow(2,k/12);
      if(n!==null)tone('triangle',fq(n),fq(n),.17,.05,dl);
      if(i%4===0)tone('square',fq([0,0,5,7][(i/8)|0]-24),fq([0,0,5,7][(i/8)|0]-24),.3,.028,dl);
      if(i%2===0)noise(.03,.025,'highpass',6000,8000,dl);
      MUSIC.step++;MUSIC.next+=.2;
    }
  }catch(e){}
},130);

/* ---------- поделиться героем по коду ---------- */
const has=(O,k)=>typeof k==='string'&&Object.prototype.hasOwnProperty.call(O,k);
const num=(v,a,b,d)=>typeof v==='number'&&isFinite(v)?clamp(v,a,b):d;
const pt2=q=>Array.isArray(q)&&q.length===2?[num(q[0],0,1,.5),num(q[1],0,1,.5)]:null;
// чужие данные проверяем целиком: только известные атаки, характеры и числа в разумных пределах
function cleanOv(o){
  o=o||{};
  return{pw:num(o.pw,.5,3,1),sp:num(o.sp,.5,2,1),as:num(o.as,.5,2.5,1),size:num(o.size,.5,3,1),
    atks:(Array.isArray(o.atks)?o.atks:[]).filter(k=>has(ATK,k)).slice(0,3),chr:has(CHR,o.chr)?o.chr:'own',idle:has(MOVES,o.idle)?o.idle:'own',rem:has(REMAINS,o.rem)?o.rem:'ball',name:'',
    muz:pt2(o.muz),at:pt2(o.at),
    parts:(Array.isArray(o.parts)?o.parts:[]).slice(0,4).map(p=>({poly:(Array.isArray(p&&p.poly)?p.poly:[]).slice(0,60).map(pt2).filter(Boolean),pv:pt2(p&&p.pv)||[.5,.5],anim:has(PARTANIM,p&&p.anim)?p.anim:'swing',a0:num(p&&p.a0,-180,0,-70),a1:num(p&&p.a1,0,180,45),amp:num(p&&p.amp,.2,3,1)})).filter(p=>p.poly.length>2)};
}
$('edShare').onclick=async()=>{
  const it=edIt;if(!it||!it.custom)return;
  if(!cloud.db){toast('Поделиться можно, когда игра открыта в аккаунте Claude');return}
  commitEd();
  const r={v:1,name:it.name,role:it.role,face:it.face||0,src:it.src,ov:cleanOv(it.ov)};
  if(JSON.stringify(r).length>240000){toast('Рисунок слишком большой, чтобы им поделиться');return}
  try{
    let code='';
    for(let n=0;n<5;n++){code=Array.from({length:6},()=>'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[(Math.random()*32)|0]).join('');const sn=await cloud.db.doc('shared/'+code).get();if(!sn.exists)break}
    await cloud.db.doc('shared/'+code).set(r);
    $('shareCode').textContent=code;$('share').hidden=false;
  }catch(err){toast('Не получилось поделиться: нет связи или прав на запись')}
};
$('shareOk').onclick=()=>{$('share').hidden=true};
$('shareCopy').onclick=()=>{try{navigator.clipboard.writeText($('shareCode').textContent).then(()=>toast('Код скопирован'),()=>toast('Не получилось скопировать, перепиши код вручную'))}catch(err){toast('Не получилось скопировать, перепиши код вручную')}};
$('mGet').onclick=async()=>{
  const code=$('mCode').value.toUpperCase().replace(/[^A-Z0-9]/g,'');
  if(code.length!==6){toast('В коде шесть букв и цифр');return}
  if(!cloud.db){toast('Получить героя можно, когда игра открыта в аккаунте Claude');return}
  try{
    const sn=await cloud.db.doc('shared/'+code).get(),r=sn.exists&&sn.data();
    if(!r||typeof r.src!=='string'||r.src.indexOf('data:image/')!==0||r.src.length>240000||!has(ARCH,r.role)){toast('Героя с таким кодом нет');return}
    const id='c-'+Date.now(),name=String(r.name||'Герой').slice(0,14);OV[id]=cleanOv(r.ov);
    addCustomRec({id,name,role:r.role,face:r.face===1||r.face===-1?r.face:0,src:r.src,raw:'',mask:'',tol:34});
    saveState();setTimeout(()=>{saveCustom();cloudMark('h:'+id)},700);$('mCode').value='';$('menu').hidden=true;toast('Герой «'+name+'» добавлен в набор');
  }catch(err){toast('Не получилось получить героя: нет связи')}
};

/* ---------- точки и подвижные части на рисунке ---------- */
const rcv=$('rigCv'),rctx=rcv.getContext('2d');
let rigMode='muz',rigSub='new',rigImg=null,rigSel=-1,rigPts=[],rigPoly=null,rigDown=false,rigRaf=0,rigVert=-1,rigDrag=-1,rigFree=false,rigBak=null,rigPinch=null,rigAt=null,rigCss=1;
const RV={z:1,ox:0,oy:0,S:2},rigPtrs=new Map();
const rigMir=()=>edIt.custom&&edIt.face===-1;
const toImg=n=>rigMir()?[1-n[0],n[1]]:n,fromImg=toImg;
const ROT=k=>k==='swing'||k==='wag',r3=q=>[+q[0].toFixed(3),+q[1].toFixed(3)];
function rvClamp(){RV.z=clamp(RV.z,1,6);RV.ox=clamp(RV.ox,0,1-1/RV.z);RV.oy=clamp(RV.oy,0,1-1/RV.z);$('rigZoomVal').textContent='×'+RV.z.toFixed(1)}
function rvZoom(z,ax,ay){const k=RV.z;if(ax===undefined){ax=RV.ox+.5/k;ay=RV.oy+.5/k}const fx=(ax-RV.ox)*k,fy=(ay-RV.oy)*k;RV.z=clamp(z,1,6);RV.ox=ax-fx/RV.z;RV.oy=ay-fy/RV.z;rvClamp()}
function rigRaw(e){const r=rcv.getBoundingClientRect(),sc=Math.min(r.width/rcv.width,r.height/rcv.height);rigCss=1/(sc*RV.S);return[(e.clientX-r.left-(r.width-rcv.width*sc)/2)/sc/rcv.width,(e.clientY-r.top-(r.height-rcv.height*sc)/2)/sc/rcv.height]}
function rigPos(e){const q=rigRaw(e);return[clamp(RV.ox+q[0]/RV.z,0,1),clamp(RV.oy+q[1]/RV.z,0,1)]}
const rigD=(a,b)=>Math.hypot((a[0]-b[0])*edIt.base.w,(a[1]-b[1])*edIt.base.h); // расстояние в пикселях рисунка
function segDist(p,a,b){const w=edIt.base.w,h=edIt.base.h,px=p[0]*w,py=p[1]*h,ax=a[0]*w,ay=a[1]*h,dx=b[0]*w-ax,dy=b[1]*h-ay,t=clamp(((px-ax)*dx+(py-ay)*dy)/(dx*dx+dy*dy||1),0,1);return Math.hypot(px-ax-dx*t,py-ay-dy*t)}
// оставляем от обводки только важные точки, чтобы их можно было двигать
function simplify(pts,tol,max){
  const w=edIt.base.w,h=edIt.base.h,P=pts.map(q=>[q[0]*w,q[1]*h]);if(P.length<4)return pts.slice();let idx;
  const rdp=(a,b,out)=>{let md=0,mi=-1;const ax=P[a][0],ay=P[a][1],bx=P[b][0],by=P[b][1],L=Math.hypot(bx-ax,by-ay)||1;
    for(let i=a+1;i<b;i++){const d=Math.abs((bx-ax)*(ay-P[i][1])-(ax-P[i][0])*(by-ay))/L;if(d>md){md=d;mi=i}}
    if(md>tol){rdp(a,mi,out);out.push(mi);rdp(mi,b,out)}};
  do{idx=[0];rdp(0,P.length-1,idx);idx.push(P.length-1);tol*=1.4}while(idx.length>max);
  const out=idx.map(i=>pts[i]);if(out.length>3&&rigD(out[0],out[out.length-1])<tol)out.pop();return out;
}
function rigLoop(now){if($('rig').hidden){rigRaf=0;return}rigDraw(now);rigRaf=requestAnimationFrame(rigLoop)}
function rigOpen(){
  rcv.width=edIt.base.w*RV.S;rcv.height=edIt.base.h*RV.S;rigImg=new Image();rigImg.src=edIt.src;RV.z=1;RV.ox=RV.oy=0;rvClamp();rigPtrs.clear();rigPinch=null;
  rigMode=edOv.parts.length?'part':'muz';rigSel=edOv.parts.length-1;rigSub=rigSel>=0?'pivot':'new';rigPoly=null;rigPts=[];rigVert=-1;
  $('rigTitle').textContent=rigNew?'Шаг 2: точки и части':'Точки и части';$('rigOk').textContent=rigNew?'Добавить героя':'Готово';$('rigNote').hidden=!rigNew;$('rigBack').hidden=!rigNew;
  renderRig();$('rig').hidden=false;
  if(!rigRaf)rigRaf=requestAnimationFrame(rigLoop);
}
function setPart(patch){if(!edOv.parts[rigSel])return;edOv.parts=edOv.parts.map((p,i)=>i===rigSel?Object.assign({a0:-70,a1:45,amp:1},p,patch):p)}
function renderRig(){
  press('#rigMode button',rigMode);let cur=edOv.parts[rigSel];if(!cur)rigSub='new';press('#rigSub button',rigSub);
  const part=rigMode==='part';
  $('rigHint').textContent=rigMode==='muz'?'Тапни туда, откуда герой стреляет: вспышка и снаряды будут вылетать из этой точки.':
    rigMode==='at'?'Тапни туда, где у героя пила или главный удар. Там появятся искры и диск пилы.':
    rigPoly?'Контур готов. Теперь тапни, где эта часть крепится к телу: вокруг этой точки она будет двигаться.':
    rigSub==='pivot'?'Часть двигается прямо на рисунке. Тапни или веди пальцем, чтобы перенести точку крепления; углы меняй ползунками.':
    rigSub==='shape'?'Тяни точки, чтобы поправить контур. Тап по линии добавляет точку. Лишнюю точку выбери и нажми «Удалить точку».':
    'Ставь точки по контуру части одну за другой или обведи её пальцем. Можно в несколько приёмов, увеличивая рисунок. Потом нажми «Замкнуть контур». Частей может быть до шести.';
  const pb=$('rigParts');pb.textContent='';$('rigPartBox').hidden=!part||!edOv.parts.length;
  edOv.parts.forEach((p,i)=>{const b=document.createElement('button');b.type='button';b.textContent='Часть '+(i+1);b.setAttribute('aria-pressed',i===rigSel&&rigSub!=='new'?'true':'false');b.onclick=()=>{rigSel=i;if(rigSub==='new')rigSub='pivot';rigPoly=null;rigPts=[];rigVert=-1;renderRig()};pb.append(b)});
  $('rigDrawBox').hidden=!part||rigSub!=='new'||!!rigPoly;$('rigUndo').disabled=!rigPts.length;$('rigClose').disabled=rigPts.length<3;
  $('rigShapeBox').hidden=!part||rigSub!=='shape';$('rigVDel').disabled=!cur||rigVert<0||cur.poly.length<=3;
  $('rigMoveBox').hidden=!part||rigSub!=='pivot'||!cur;
  chips($('rigAnim'),Object.entries(PARTANIM),cur?cur.anim:'',v=>{setPart({anim:v});rigChanged()});
  const rot=cur&&ROT(cur.anim);$('rigA0L').hidden=$('rigA1L').hidden=!rot;$('rigAmpL').hidden=!cur||rot;
  if(cur){
    const a0=typeof cur.a0==='number'?cur.a0:-70,a1=typeof cur.a1==='number'?cur.a1:45,am=typeof cur.amp==='number'?cur.amp:1;
    $('rigA0').value=a0;$('rigA1').value=a1;$('rigAmp').value=am;$('rigA0V').textContent=a0+'°';$('rigA1V').textContent='+'+a1+'°';
    $('rigAmpT').textContent=cur.anim==='spin'?'Скорость вращения':'Размах движения';$('rigAmpV').textContent='×'+am.toFixed(1);
  }
  $('rigDel').hidden=!cur||!part||rigSub==='new';
}
function rigChanged(){commitEd();renderRig();pvStart()}
[['rigA0','a0'],['rigA1','a1'],['rigAmp','amp']].forEach(([id,key])=>{
  $(id).addEventListener('input',()=>{setPart({[key]:+$(id).value});commitEd();renderRig()});
  $(id).addEventListener('change',pvStart);
});
function rigDraw(now){
  if(!rigImg||!rigImg.width||!edIt)return;const w=edIt.base.w,h=edIt.base.h,g=rctx,D=edIt.D,T=(now||0)/1000,m=RV.z*RV.S,u=rigCss/RV.z; // u: один экранный пиксель в пикселях рисунка
  g.setTransform(1,0,0,1,0,0);g.globalAlpha=1;g.setLineDash([]);g.fillStyle='#c8a674';g.fillRect(0,0,rcv.width,rcv.height);
  g.setTransform(m,0,0,m,-RV.ox*w*m,-RV.oy*h*m);g.lineJoin='round';g.lineCap='round';
  const dot=(x,y,r,fill,stroke)=>{g.beginPath();g.arc(x,y,r,0,7);g.fillStyle=fill;g.fill();if(stroke){g.strokeStyle=stroke;g.lineWidth=2*u;g.stroke()}};
  const live=rigMode==='part'&&rigSub==='pivot'&&!rigPoly&&ready(D.img)&&D.parts.some(P=>P.cus);
  if(live){ // живой показ: части двигаются в заданных пределах
    const drawP=P=>{
      if(!ready(P.img))return;let px=P.px,py=P.py,dx=0,dy=0,rot=0,sx=1;const j=P.cus?P.j:-1,q=edOv.parts[j];
      if(P.cus){
        const src=q||P,n=Math.sin(T*2.6+(j+2)),A=typeof src.amp==='number'?src.amp:1,a0=typeof src.a0==='number'?src.a0:-70,a1=typeof src.a1==='number'?src.a1:45;
        if(q){px=q.pv[0]*w;py=q.pv[1]*h}
        if(ROT(src.anim))rot=(n>=0?n*a1:-n*a0)*Math.PI/180;else if(src.anim==='spin')rot=T*5*A;else if(src.anim==='recoil')dx=-Math.abs(n)*w*.07*A*(P.rd||1);else if(src.anim==='hop')dy=-Math.abs(n)*14*A;else sx=1+.25*n*A;
      }
      g.save();g.translate(px+dx,py+dy);g.rotate(rot);g.scale(sx,1);g.drawImage(P.img,P.x-px,P.y-py);g.restore();
    };
    D.parts.forEach(P=>{if(P.z==='back')drawP(P)});g.drawImage(D.img,0,0,w,h);D.parts.forEach(P=>{if(P.z!=='back')drawP(P)});
  }else g.drawImage(rigImg,0,0,w,h);
  if(rigMode==='part'){
    edOv.parts.forEach((p,i)=>{
      const on=i===rigSel&&rigSub!=='new',px=p.pv[0]*w,py=p.pv[1]*h,shape=on&&rigSub==='shape';
      if(!live||on){g.setLineDash(live?[5*u,6*u]:[]);g.lineWidth=(on?3:2)*u;g.strokeStyle=live?'rgba(44,107,216,.55)':BLUE;polyPath(g,p.poly,w,h);if(!live){g.fillStyle=on?'rgba(44,107,216,.2)':'rgba(44,107,216,.07)';g.fill()}g.stroke();g.setLineDash([])}
      if(shape)p.poly.forEach((q,k)=>dot(q[0]*w,q[1]*h,(k===rigVert?10:7)*u,k===rigVert?MARKER:'#fff',BLUE));
      if(on&&live&&ROT(p.anim)){ // веер углов
        let cx=0,cy=0;p.poly.forEach(q=>{cx+=q[0]*w;cy+=q[1]*h});cx/=p.poly.length;cy/=p.poly.length;
        const b=Math.atan2(cy-py,cx-px),L=Math.max(40,Math.hypot(cx-px,cy-py)*1.5),a0=(typeof p.a0==='number'?p.a0:-70)*Math.PI/180,a1=(typeof p.a1==='number'?p.a1:45)*Math.PI/180;
        g.fillStyle='rgba(255,212,59,.28)';g.beginPath();g.moveTo(px,py);g.arc(px,py,L,b+a0,b+a1);g.closePath();g.fill();
        [[a0,RED],[a1,BLUE]].forEach(([a,col])=>{g.strokeStyle=col;g.lineWidth=3*u;g.beginPath();g.moveTo(px,py);g.lineTo(px+Math.cos(b+a)*L,py+Math.sin(b+a)*L);g.stroke()});
      }
      if(!shape){const r=(on?8:4)*u;dot(px,py,r,BLUE);dot(px,py,r*.4,'#fff')}
      if(on&&rigSub==='pivot'){g.strokeStyle=BLUE;g.lineWidth=2*u;g.beginPath();g.arc(px,py,(15+Math.sin(T*5)*3)*u,0,7);g.stroke()}
    });
    if(rigPoly){g.strokeStyle=RED;g.lineWidth=3*u;polyPath(g,rigPoly,w,h);g.fillStyle='rgba(226,70,58,.15)';g.fill();g.stroke()}
    if(rigSub==='new'&&rigPts.length){
      g.strokeStyle=RED;g.lineWidth=3*u;g.beginPath();rigPts.forEach((q,i)=>i?g.lineTo(q[0]*w,q[1]*h):g.moveTo(q[0]*w,q[1]*h));g.stroke();
      g.setLineDash([4*u,6*u]);g.beginPath();g.moveTo(rigPts[rigPts.length-1][0]*w,rigPts[rigPts.length-1][1]*h);g.lineTo(rigPts[0][0]*w,rigPts[0][1]*h);g.stroke();g.setLineDash([]);
      rigPts.forEach((q,i)=>dot(q[0]*w,q[1]*h,(i?5:8)*u,i?'#fff':MARKER,RED));
    }
  }else{
    const mark=(n,col,on)=>{const q=toImg(n),x=q[0]*w,y=q[1]*h,r=(on?11:8)*u;g.globalAlpha=on?1:.6;g.fillStyle=col;g.strokeStyle=PENCIL;g.lineWidth=2.5*u;g.beginPath();g.arc(x,y,r,0,7);g.fill();g.stroke();g.beginPath();g.moveTo(x-r*1.5,y);g.lineTo(x+r*1.5,y);g.moveTo(x,y-r*1.5);g.lineTo(x,y+r*1.5);g.stroke();g.globalAlpha=1};
    mark(edOv.at||(D.atks.find(a=>a.k==='saw')||{}).at||SAW_AT,'#c3c7cf',rigMode==='at');
    mark(edOv.muz||(D.muz||DEF_MUZ)[0],MARKER,rigMode==='muz');
  }
}
function rigPoint(p){const n=r3(fromImg(p));if(rigMode==='muz')edOv.muz=n;else edOv.at=n}
function closePts(){
  if(rigPts.length<3){toast('Нужно хотя бы три точки');return}
  if(edOv.parts.length>=6){toast('Частей уже шесть. Удали одну, чтобы добавить новую.');return}
  rigPoly=simplify(rigPts,2*rigCss,24).map(r3);rigPts=[];renderRig();
}
rcv.addEventListener('pointerdown',e=>{
  if(!edIt)return;rcv.setPointerCapture(e.pointerId);rigPtrs.set(e.pointerId,e);
  if(rigPtrs.size===2){ // второй палец: жест увеличения, начатое действие отменяем
    if(rigDown&&rigBak){edOv.parts=rigBak.parts;rigPts=rigBak.pts;edOv.muz=rigBak.muz;edOv.at=rigBak.at}rigDown=false;rigDrag=-1;rigFree=false;
    const [a,b]=[...rigPtrs.values()],q=rigRaw({clientX:(a.clientX+b.clientX)/2,clientY:(a.clientY+b.clientY)/2});
    rigPinch={d:Math.hypot(a.clientX-b.clientX,a.clientY-b.clientY)||1,z:RV.z,ax:RV.ox+q[0]/RV.z,ay:RV.oy+q[1]/RV.z};return;
  }
  if(rigPtrs.size>2)return;
  const p=rigPos(e),hit=22*rigCss/RV.z,cur=edOv.parts[rigSel];rigBak={parts:edOv.parts,pts:rigPts.slice(),muz:edOv.muz,at:edOv.at};rigDown=true;rigAt=p;rigFree=false;rigDrag=-1;
  if(rigMode!=='part'){rigPoint(p);return}
  if(rigPoly){
    edOv.parts=edOv.parts.concat([{poly:rigPoly,pv:r3(p),anim:'swing',a0:-70,a1:45,amp:1}]);rigSel=edOv.parts.length-1;rigSub='pivot';rigPoly=null;rigDown=false;rigChanged();return;
  }
  if(rigSub==='pivot'&&cur){setPart({pv:r3(p)});return}
  if(rigSub==='shape'&&cur){
    let bi=-1,bd=hit;cur.poly.forEach((q,i)=>{const d=rigD(q,p);if(d<bd){bd=d;bi=i}});
    if(bi<0){
      let be=-1;bd=hit*.8;cur.poly.forEach((q,i)=>{const d=segDist(p,q,cur.poly[(i+1)%cur.poly.length]);if(d<bd){bd=d;be=i}});
      if(be>=0){if(cur.poly.length>=40)toast('Точек уже много');else{const np=cur.poly.slice();np.splice(be+1,0,r3(p));setPart({poly:np});bi=be+1}}
    }
    rigVert=rigDrag=bi;if(bi<0)rigDown=false;renderRig();return;
  }
  if(rigPts.length>=3&&rigD(p,rigPts[0])<hit){rigDown=false;closePts()}
});
rcv.addEventListener('pointermove',e=>{
  if(!edIt||!rigPtrs.has(e.pointerId))return;rigPtrs.set(e.pointerId,e);
  if(rigPinch&&rigPtrs.size>=2){
    const [a,b]=[...rigPtrs.values()],q=rigRaw({clientX:(a.clientX+b.clientX)/2,clientY:(a.clientY+b.clientY)/2});
    RV.z=clamp(rigPinch.z*(Math.hypot(a.clientX-b.clientX,a.clientY-b.clientY)||1)/rigPinch.d,1,6);RV.ox=rigPinch.ax-q[0]/RV.z;RV.oy=rigPinch.ay-q[1]/RV.z;rvClamp();return;
  }
  if(!rigDown)return;const p=rigPos(e),cur=edOv.parts[rigSel];
  if(rigMode!=='part'){rigPoint(p);return}
  if(rigSub==='pivot'&&cur)setPart({pv:r3(p)});
  else if(rigSub==='shape'&&cur){if(rigDrag>=0){const np=cur.poly.slice();np[rigDrag]=r3(p);setPart({poly:np})}}
  else if(rigSub==='new'){
    const css=rigCss/RV.z;
    if(!rigFree&&rigD(p,rigAt)>9*css){rigFree=true;rigPts.push(rigAt)}
    if(rigFree&&rigD(p,rigPts[rigPts.length-1])>4*css)rigPts.push(p);
  }
});
const rigUp=e=>{
  rigPtrs.delete(e.pointerId);if(rigPinch){if(rigPtrs.size<2)rigPinch=null;rigDown=false;return}
  if(!rigDown)return;rigDown=false;
  if(rigMode!=='part'||rigSub!=='new'||rigPoly){rigDrag=-1;rigChanged();return}
  if(!rigFree)rigPts.push(r3(rigAt));
  else{const closed=rigPts.length>=6&&rigD(rigPts[0],rigPts[rigPts.length-1])<26*rigCss/RV.z;rigPts=simplify(rigPts,2*rigCss/RV.z,30).map(r3);if(closed){closePts();return}}
  renderRig();
};
rcv.addEventListener('pointerup',rigUp);rcv.addEventListener('pointercancel',rigUp);
rcv.addEventListener('wheel',e=>{if(!edIt)return;e.preventDefault();const p=rigPos(e);rvZoom(RV.z*(e.deltaY<0?1.25:.8),p[0],p[1])},{passive:false});
$('rigZoomIn').onclick=()=>rvZoom(RV.z*1.5);$('rigZoomOut').onclick=()=>rvZoom(RV.z/1.5);
document.querySelectorAll('#rigMode button').forEach(b=>b.onclick=()=>{rigMode=b.dataset.v;rigPoly=null;rigPts=[];renderRig()});
document.querySelectorAll('#rigSub button').forEach(b=>b.onclick=()=>{
  rigSub=b.dataset.v;rigPoly=null;rigPts=[];rigVert=-1;const cur=edOv.parts[rigSel];
  if(rigSub==='shape'&&cur&&cur.poly.length>24){setPart({poly:simplify(cur.poly,2*rigCss,20).map(r3)});commitEd()}
  renderRig();
});
$('rigUndo').onclick=()=>{rigPts.pop();renderRig()};
$('rigClose').onclick=closePts;
$('rigVDel').onclick=()=>{const cur=edOv.parts[rigSel];if(!cur||rigVert<0||cur.poly.length<=3)return;setPart({poly:cur.poly.filter((q,i)=>i!==rigVert)});rigVert=-1;rigChanged()};
$('rigDel').onclick=()=>{if(!edOv.parts[rigSel])return;edOv.parts=edOv.parts.filter((p,i)=>i!==rigSel);rigSel=edOv.parts.length-1;rigSub=rigSel>=0?'pivot':'new';rigVert=-1;rigChanged()};
$('rigOk').onclick=()=>{
  $('rig').hidden=true;commitEd();
  if(rigNew){const it=rigNew;rigNew=null;library.push(it);selected=it;selU=selP=null;saveCustom();cloudMark('h:'+it.id);renderLib();toast('Герой «'+it.name+'» в наборе. Перетащи его на лист');return}
  renderEd();pvStart();
};
$('rigBack').onclick=()=>{if(!rigNew)return;commitEd();$('rig').hidden=true;openRecut(rigNew)};
$('edRig').onclick=rigOpen;
$('edRecut').onclick=()=>openRecut(edIt);

/* ---------- свои реплики ---------- */
LKEYS.forEach(k=>{
  $('edL_'+k).addEventListener('input',()=>{edOv.lines=Object.assign({},edOv.lines,{[k]:$('edL_'+k).value.slice(0,120)});commitEd()});
  $('edL_'+k).addEventListener('change',pvStart);
});

/* ---------- свой звук атаки (из звукового файла или записи диктофона) ---------- */
const SND={map:{},buf:{}};try{SND.map=JSON.parse(localStorage.getItem(LS+'-snd')||'{}')||{}}catch(e){}
function sndStore(id){try{localStorage.setItem(LS+'-snd',JSON.stringify(SND.map))}catch(e){toast('Памяти на этом устройстве не хватает, звук может не сохраниться')}delete SND.buf[id];cloudMark('s:'+id);renderSnd()}
function heroSnd(u,force){
  const id=u.item&&u.item.id,d=id&&SND.map[id];if(!d||!AC||muted||AC.state!=='running')return;
  const now=AC.currentTime;if(!force&&u.sndT&&now-u.sndT<.4)return;u.sndT=now;
  try{
    let b=SND.buf[id];
    if(!b){const bin=atob(d),n=bin.length;b=AC.createBuffer(1,n,11025);const ch=b.getChannelData(0);for(let i=0;i<n;i++)ch[i]=(bin.charCodeAt(i)-128)/128;SND.buf[id]=b}
    const src=AC.createBufferSource(),g=AC.createGain();src.buffer=b;g.gain.value=.9;src.connect(g);g.connect(master);src.start();
  }catch(e){}
}
function renderSnd(){const on=!!(edIt&&SND.map[edIt.id]);$('sndPlay').hidden=$('sndDel').hidden=!on;$('sndPick').textContent=on?'Заменить звук':'Выбрать или записать звук'}
$('sndPick').onclick=()=>{audioInit();$('sndFile').click()};
$('sndPlay').onclick=()=>{audioInit();heroSnd({item:edIt},true)};
$('sndDel').onclick=()=>{delete SND.map[edIt.id];sndStore(edIt.id)};
$('sndFile').addEventListener('change',async()=>{
  const f=$('sndFile').files[0];$('sndFile').value='';if(!f||!edIt)return;audioInit();
  if(!AC){toast('На этом устройстве звук недоступен');return}
  try{
    const ab=await f.arrayBuffer(),buf=await new Promise((res,rej)=>{const p=AC.decodeAudioData(ab,res,rej);if(p&&p.catch)p.catch(rej)});
    const ch=buf.getChannelData(0),sr=buf.sampleRate;let st=0,peak=0;
    for(let i=0;i<ch.length;i++)if(Math.abs(ch[i])>peak)peak=Math.abs(ch[i]);
    if(peak<.01){toast('В записи тишина. Попробуй записать громче');return}
    while(st<ch.length&&Math.abs(ch[st])<peak*.08)st++; // обрезаем тишину в начале
    const step=sr/11025,n=Math.min(Math.floor((ch.length-st)/step),Math.floor(11025*1.5));if(n<400){toast('Звук слишком короткий');return}
    let bin='';
    for(let i=0;i<n;i++){
      const a=st+Math.floor(i*step),b2=Math.min(ch.length,st+Math.floor((i+1)*step));let v=0;for(let j=a;j<b2;j++)v+=ch[j];v=v/Math.max(1,b2-a)/peak*.9;
      const fade=Math.min(1,(n-i)/600);bin+=String.fromCharCode(Math.round(clamp(v*fade,-1,1)*127+128));
    }
    SND.map[edIt.id]=btoa(bin);sndStore(edIt.id);heroSnd({item:edIt},true);toast('Звук записан: герой будет издавать его в атаке');
  }catch(err){toast('Этот звуковой файл не открылся. Попробуй другой формат: m4a, mp3 или wav')}
});

/* ---------- арены: рисованный фон листа ---------- */
let arenaImg=null;
const arenaSrc=()=>{try{return localStorage.getItem(LS+'-arena')||''}catch(e){return''}};
function arenaLoad(){const src=arenaSrc();if(!src){arenaImg=null;return}arenaImg=new Image();arenaImg.onload=()=>{if(bg&&!preview)makePaper()};arenaImg.src=src}
function drawArena(g){
  const a=S.set.arena||'none';if(a==='none')return;const R=rng(4321),J=base*.12,PEN='rgba(42,42,51,.4)';
  const shp=(pts,fill,lw)=>{wobPath(g,pts,R,J);if(fill){g.fillStyle=fill;g.fill()}g.strokeStyle=PEN;g.lineWidth=lw||1.5;g.stroke()};
  g.save();g.lineJoin=g.lineCap='round';
  if(a==='photo'){
    if(ready(arenaImg)){
      const rot=(arenaImg.width>arenaImg.height)!==(W>H),iw=rot?arenaImg.height:arenaImg.width,ih=rot?arenaImg.width:arenaImg.height,sc=Math.max(W/iw,H/ih);
      g.translate(W/2,H/2);if(rot)g.rotate(Math.PI/2);g.globalAlpha=.85;g.drawImage(arenaImg,-arenaImg.width*sc/2,-arenaImg.height*sc/2,arenaImg.width*sc,arenaImg.height*sc);
      g.setTransform(DPR,0,0,DPR,0,0);g.globalAlpha=1;g.fillStyle='rgba(251,250,246,.22)';g.fillRect(0,0,W,H);
    }
  }else if(a==='space'){
    g.fillStyle='rgba(44,56,130,.13)';g.fillRect(0,0,W,H);
    for(let i=0;i<60;i++){const x=R()*W,y=R()*H,z=base*(.1+R()*.16);g.strokeStyle=i%4?'rgba(42,42,51,.4)':'rgba(224,168,0,.8)';g.lineWidth=1.3;for(let j=0;j<3;j++){const q=j*1.047+R();g.beginPath();g.moveTo(x-Math.cos(q)*z,y-Math.sin(q)*z);g.lineTo(x+Math.cos(q)*z,y+Math.sin(q)*z);g.stroke()}}
    [['rgba(240,138,60,.4)',1.7],['rgba(63,163,154,.4)',1.1],['rgba(182,58,214,.3)',1.4]].forEach(([col,k],i)=>{
      const x=W*(.15+R()*.7),y=H*(.12+i*.33+R()*.1),r=base*k;shp(ell(x,y,r,r,11),col);
      if(i!==1){g.strokeStyle=PEN;g.lineWidth=1.6;g.beginPath();g.ellipse(x,y,r*1.7,r*.45,-.4,0,7);g.stroke()}
      else for(let j=0;j<3;j++)shp(ell(x+(R()-.5)*r,y+(R()-.5)*r,r*.18,r*.18,7),'rgba(42,42,51,.12)',1);
    });
    for(let i=0;i<2;i++){const x=R()*W,y=R()*H,l=base*3;g.strokeStyle='rgba(224,168,0,.6)';g.lineWidth=2;g.beginPath();g.moveTo(x,y);g.lineTo(x+l,y-l*.5);g.stroke();shp(ell(x,y,base*.22,base*.22,7),'rgba(255,212,59,.8)',1.2)}
  }else if(a==='forest'){
    g.fillStyle='rgba(120,190,110,.14)';g.fillRect(0,0,W,H);
    const px=W*(.25+R()*.5),py=H*(.4+R()*.2);shp(ell(px,py,base*2.6,base*1.5,12),'rgba(90,160,230,.3)');
    for(let i=0;i<70;i++){const x=R()*W,y=R()*H;g.strokeStyle='rgba(63,154,87,.55)';g.lineWidth=1.4;for(let j=-1;j<=1;j++){g.beginPath();g.moveTo(x+j*3,y);g.lineTo(x+j*5+(R()-.5)*3,y-base*(.25+R()*.2));g.stroke()}}
    for(let i=0;i<13;i++){
      const x=R()*W,y=R()*H,z=base*(.8+R()*.6);if(Math.hypot(x-px,y-py)<base*3)continue;
      g.strokeStyle='rgba(138,90,43,.7)';g.lineWidth=z*.22;g.beginPath();g.moveTo(x,y);g.lineTo(x,y-z*.7);g.stroke();
      if(i%2)for(let j=0;j<3;j++)shp([[x-z*(.8-j*.18),y-z*(.5+j*.55)],[x,y-z*(1.3+j*.55)],[x+z*(.8-j*.18),y-z*(.5+j*.55)]],'rgba(63,154,87,.45)');
      else shp(ell(x,y-z*1.3,z*.8,z*.75,10),'rgba(110,180,90,.45)');
    }
    for(let i=0;i<9;i++){const x=R()*W,y=R()*H;shp(ell(x,y,base*.16,base*.16,6),['rgba(240,98,146,.7)','rgba(255,212,59,.8)','rgba(255,255,255,.9)'][i%3],1)}
  }else if(a==='city'){
    g.fillStyle='rgba(120,125,140,.1)';g.fillRect(0,0,W,H);
    const rw=base*2.2,road=(x,y,w,h)=>{g.fillStyle='rgba(90,95,110,.2)';g.fillRect(x,y,w,h);g.strokeStyle='rgba(255,255,255,.85)';g.lineWidth=2;g.setLineDash([base*.6,base*.5]);g.beginPath();if(w>h){g.moveTo(x,y+h/2);g.lineTo(x+w,y+h/2)}else{g.moveTo(x+w/2,y);g.lineTo(x+w/2,y+h)}g.stroke();g.setLineDash([])};
    road(0,H*.5-rw/2,W,rw);road(W*.5-rw/2,0,rw,H);
    for(let i=0;i<12;i++){
      const bw=base*(1.8+R()*1.6),bh=base*(2+R()*2.2),qx=i%2,qy=(i>>1)%2,x=(qx?W*.5+rw:0)+R()*Math.max(1,W*.5-rw-bw),y=(qy?H*.5+rw:0)+R()*Math.max(1,H*.5-rw-bh);
      g.beginPath();[[x,y],[x+bw,y],[x+bw,y+bh],[x,y+bh]].forEach((q,j)=>{const qx2=q[0]+(R()-.5)*J*2,qy2=q[1]+(R()-.5)*J*2;j?g.lineTo(qx2,qy2):g.moveTo(qx2,qy2)});g.closePath();g.fillStyle=['rgba(240,138,60,.22)','rgba(90,160,230,.22)','rgba(255,212,59,.25)','rgba(180,180,190,.3)'][i%4];g.fill();g.strokeStyle=PEN;g.lineWidth=1.6;g.stroke();
      const nx=Math.max(2,Math.round(bw/(base*.7))),ny=Math.max(2,Math.round(bh/(base*.8)));g.strokeStyle='rgba(42,42,51,.3)';g.lineWidth=1;
      for(let u2=0;u2<nx;u2++)for(let v=0;v<ny;v++)g.strokeRect(x+bw*(u2+.25)/nx,y+bh*(v+.25)/ny,bw/nx*.5,bh/ny*.5);
    }
  }
  g.restore();
}
function renderArena(){press('#mArena button',S.set.arena||'none')}
document.querySelectorAll('#mArena button').forEach(b=>b.onclick=()=>{
  const v=b.dataset.v;
  if(v==='photo'&&(!arenaSrc()||S.set.arena==='photo')){$('arenaFile').click();return}
  S.set.arena=v;saveState();renderArena();if(bg)makePaper();
});
$('arenaFile').addEventListener('change',()=>{
  const f=$('arenaFile').files[0];$('arenaFile').value='';if(!f)return;
  const url=URL.createObjectURL(f),im=new Image();
  im.onload=()=>{
    const k=Math.min(1,900/Math.max(im.width,im.height)),c=mk(Math.max(1,Math.round(im.width*k)),Math.max(1,Math.round(im.height*k)));c.getContext('2d').drawImage(im,0,0,c.width,c.height);URL.revokeObjectURL(url);
    try{localStorage.setItem(LS+'-arena',c.toDataURL('image/jpeg',.72));localStorage.setItem(LS+'-arena-ts',String(Date.now()))}catch(e){toast('Памяти на этом устройстве не хватает для фона');return}
    S.set.arena='photo';saveState();cloudMark('arena');arenaLoad();renderArena();
  };
  im.onerror=()=>{URL.revokeObjectURL(url);toast('Не получилось открыть картинку')};im.src=url;
});
arenaLoad();

/* ---------- выбор языка ---------- */
(function(){
  const sel=$('mLang');I18N.langs.forEach(([code,name])=>{const o=document.createElement('option');o.value=code;o.textContent=name;sel.append(o)});sel.value=LANG;
  sel.addEventListener('change',()=>{try{localStorage.setItem('paper-battles-lang',sel.value)}catch(e){}try{location.reload()}catch(e){}});
})();
