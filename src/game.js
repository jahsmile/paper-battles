'use strict';
/* ---------- языки: тексты в коде русские, перевод подставляется через T() при сборке ---------- */
const I18N=/*I18N*/;
const LANG=(()=>{let l='';try{l=localStorage.getItem('paper-battles-lang')||''}catch(e){}if(!l)l=(navigator.language||'en').toLowerCase().split('-')[0];return I18N.t[l]||l==='ru'?l:'en'})();
const TR=(()=>{if(LANG==='ru')return null;const m=new Map(),a=I18N.t[LANG],en=I18N.t.en||[];I18N.keys.forEach((k,i)=>m.set(k,a[i]||en[i]||k));return m})();
function T(s){if(!TR)return s;const m=/^(\s*)([\s\S]*?)(\s*)$/.exec(s),v=TR.get(m[2]);return v===undefined?s:m[1]+v+m[3]}
(function(){ // статическая разметка
  document.documentElement.lang=LANG;if(!TR)return;const cyr=/[Ѐ-ӿ]/;document.title=T(document.title);
  const w=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT),nodes=[];while(w.nextNode())nodes.push(w.currentNode);
  nodes.forEach(n=>{if(cyr.test(n.nodeValue)&&n.parentNode.nodeName!=='SCRIPT')n.nodeValue=T(n.nodeValue)});
  document.querySelectorAll('[title],[aria-label],[placeholder]').forEach(el=>['title','aria-label','placeholder'].forEach(a=>{const v=el.getAttribute(a);if(v&&cyr.test(v))el.setAttribute(a,T(v))}));
})();
const PENCIL='#2a2a33',BLUE='#2c6bd8',RED='#e2463a',MARKER='#ffd43b';
const TEAM_COL=[BLUE,RED],TEAM_NAME=['Синие','Красные'];
const $=id=>document.getElementById(id);
const cv=$('cv'),stage=$('stage');let ctx=cv.getContext('2d');
const reduceMotion=matchMedia('(prefers-reduced-motion: reduce)').matches;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const rnd=(a=1,b)=>b===undefined?Math.random()*a:a+Math.random()*(b-a);
const pick=a=>a[(Math.random()*a.length)|0];
function rng(seed){let s=seed>>>0;return()=>{s=(s*1664525+1013904223)>>>0;return s/4294967296}}
function wobPath(g,pts,R,j){
  const p=pts.map(([x,y])=>[x+(R()-.5)*j,y+(R()-.5)*j]),n=p.length;
  g.beginPath();g.moveTo((p[n-1][0]+p[0][0])/2,(p[n-1][1]+p[0][1])/2);
  for(let i=0;i<n;i++){const a=p[i],b=p[(i+1)%n];g.quadraticCurveTo(a[0],a[1],(a[0]+b[0])/2,(a[1]+b[1])/2)}
  g.closePath();
}
function ell(cx,cy,rx,ry,n=12){const a=[];for(let i=0;i<n;i++){const t=i/n*Math.PI*2;a.push([cx+Math.cos(t)*rx,cy+Math.sin(t)*ry])}return a}
const ready=im=>im&&(im.width>0)&&(im.complete===undefined||im.complete);

/* ---------- герои ---------- */
const MAN=/*MANIFEST*/;
const L=(start,kill,low,win)=>({start,kill,low,win});
const CH={
  blade:{name:'Клинок',tag:'хладнокровный снайпер',desc:'Бьёт издалека ледяным снарядом и замораживает. Близко не подпускает.',H:2.3,hp:190,speed:1.1,pw:27,veh:1,idle:'rumble',pick:'big',keep:4,
    atk:{k:'shell',range:10,cd:2.6,dmg:55,blast:1.4,freeze:2.6,col:'#3aa0e8'},muz:[[.99,.33]],lines:L(['Цель вижу.'],['Точно в цель.'],['Отхожу!'],['Чистая работа.'])},
  witch:{name:'Ведьма',tag:'жуткая и хитрая',desc:'Царапает когтями и визжит так, что враги разбегаются. Выбирает самых слабых.',H:3.3,hp:200,speed:2.6,pw:13,idle:'sway',pick:'weak',creep:1,
    atk:{k:'melee',cd:.45,dmg:15,fx:'claw',parts:['armL','armR']},scream:{cd:7,r:3.6,fear:1.4,dmg:8},lines:L(['Хи-хи-хи…'],['Попался!'],['Ай!'],['Хи-хи!'])},
  fort:{name:'Крепость',tag:'огромная и важная',desc:'Еле ползёт, зато даёт залп сразу из трёх орудий. Её не сдвинуть.',H:4.6,hp:900,speed:.55,pw:48,veh:1,heavy:1,idle:'rumble',
    atk:{k:'shell',range:9,cd:3.2,dmg:36,blast:1.5,n:3,gap:.28,multi:1},muz:[[.84,.22],[.87,.46],[.62,.67]],
    rig:[{poly:[[.135,.06],[.215,0],[.33,0],[.33,.25],[.215,.25],[.215,.15],[.135,.15]],pv:[.27,.25],anim:'hop'},{poly:[[.66,.17],[.845,.15],[.845,.29],[.66,.28]],pv:[.67,.23],anim:'recoil'}],lines:L(['ОГОНЬ ИЗ ВСЕХ ОРУДИЙ!'],['Следующий!'],['Броня трещит!'],['Крепость стоит!'])},
  dino:{name:'Динотанк',tag:'весёлый непоседа',desc:'Скачет и строчит очередями. Кто подойдёт близко, получит хвостом.',H:2.9,hp:210,speed:2.4,pw:21,idle:'hop',
    atk:{k:'burst',range:6.5,cd:1.5,dmg:9,n:4,gap:.09},melee:{cd:2.4,dmg:20,fx:'tail',part:'tail',aoe:1.4,push:1.6},muz:[[.82,.11]],lines:L(['Тра-та-та!'],['Ура!'],['Ой-ой!'],['Я самый быстрый!'])},
  saw:{name:'Пила',tag:'упрямый силач',desc:'Идёт напролом и пилит всё подряд, по пути постреливает с плеча. Броня гасит часть урона.',H:3.7,hp:430,speed:1.25,pw:30,armor:.7,idle:'breathe',
    atk:{k:'saw',cd:.14,dmg:7,at:[.115,.83]},far:{k:'burst',range:6,cd:1.7,dmg:12,n:1},muz:[[.97,.2]],lines:L(['ВЖЖЖЖ!'],['Распилил!'],['Не отступлю!'],['Вжик, и готово.'])},
  black:{name:'Чёрный',tag:'злой и вспыльчивый',desc:'Стреляет огненными снарядами, после них горит земля. Когда ранен, звереет и палит почти вдвое чаще.',H:2.4,hp:215,speed:1.3,pw:27,veh:1,idle:'angry',enrage:1,
    atk:{k:'shell',range:7.5,cd:2,dmg:32,blast:1.5,burn:3,col:'#ff5a1f'},muz:[[.92,.16]],lines:L(['ГРРР!'],['Сгорел!'],['НУ ВСЁ!!!'],['Так-то!'])},
  teeth:{name:'Зубастик',tag:'хвастун и задира',desc:'Пускает самонаводящиеся ракеты, а вблизи кусается.',H:2.0,hp:240,speed:1.5,pw:24,veh:1,idle:'rumble',
    atk:{k:'rocket',range:8,cd:2.4,dmg:24,blast:1.2,n:2,gap:.22},melee:{cd:1.4,dmg:48,fx:'bite',push:.5},muz:[[.93,.2],[.96,.44]],lines:L(['Смотрите, как я умею!'],['Ам!'],['Нечестно!'],['Я же говорил!'])},
  rider:{name:'Всадник',tag:'отважный наездник',desc:'С разгона таранит самого большого врага, потом палит из пушки в упор.',H:3.0,hp:300,speed:2.7,pw:19,idle:'hop',pick:'big',charge:{cd:5,min:2.5,max:7.5,dmg:45,push:2.2},
    atk:{k:'shell',range:5,cd:1.8,dmg:22,blast:1},muz:[[.95,.6]],lines:L(['В атаку!'],['Так его!'],['Держись, дружок!'],['Победа!'])},
  golem:{name:'Голем',tag:'молчаливый великан',desc:'Жжёт лазером из глаз, а вблизи бьёт кулаком так, что враги улетают.',H:3.9,hp:520,speed:1,pw:30,heavy:1,idle:'still',
    atk:{k:'laser',range:6,cd:.1,dmg:3,col:'#ff2a2a'},melee:{cd:1.6,dmg:60,fx:'punch',part:'armR',push:2.4},muz:[[.37,.085]],lines:L(['…'],['…'],['…!'],['.'])},
  purple:{name:'Фиолет',tag:'бешеный берсерк',desc:'Палит плазмой и рвёт когтями. Чем меньше у него здоровья, тем он быстрее.',H:3.3,hp:280,speed:2,pw:26,idle:'twitch',berserk:1,
    atk:{k:'burst',range:5.5,cd:1.3,dmg:14,n:2,gap:.15,plasma:1,blast:.7,col:'#b63ad6'},melee:{cd:.5,dmg:19,fx:'claw',part:'claw'},muz:[[.99,.36]],lines:L(['РРРА!'],['ЕЩЁ!'],['А-А-А!!!'],['РРРА-ХА-ХА!'])},
  king:{name:'Король',tag:'гордый командир',desc:'Копит заряд и бьёт лучом сквозь всех врагов. Рядом с ним свои дерутся сильнее.',H:2.7,hp:430,speed:1,pw:24,veh:1,idle:'proud',aura:4,
    atk:{k:'beam',range:9,cd:3.4,dmg:50,charge:.6,width:.7,col:'#ffd43b'},muz:[[.88,.33]],lines:L(['Я король!'],['Склонитесь!'],['Стража!'],['Да здравствую я!'])}
};
// подвижные части встроенных героев: те же контуры и движения, что раньше, но теперь их можно править в «Точках и частях»
const RG=(id,anim,z,pv,poly,a0,a1)=>({id,anim,z,pv,poly,a0:a0===undefined?-70:a0,a1:a1===undefined?70:a1,amp:1});
const RIGS={
  blade:[RG('barrel','recoil','back',[.66,.33],[[.66,.2],[1,.16],[1,.5],[.66,.45]])],
  witch:[RG('armL','swing','front',[.2,.34],[[.08,.3],[.25,.3],[.235,.5],[.21,.98],[0,.98],[0,.45]]),RG('armR','swing','front',[.63,.31],[[.58,.26],[.76,.3],[.96,.7],[1,.76],[1,.9],[.75,.9],[.73,.6],[.67,.42]])],
  fort:[RG('crown','hop','front',[.27,.25],[[.135,.06],[.215,0],[.33,0],[.33,.25],[.215,.25],[.215,.15],[.135,.15]]),RG('gun','recoil','back',[.67,.23],[[.66,.17],[.845,.15],[.845,.29],[.66,.28]])],
  dino:[RG('tail','wag','back',[.37,.52],[[0,0],[.12,0],[.4,.42],[.39,.62],[.3,.6],[0,.2]],-86,86),RG('turret','recoil','front',[.55,.25],[[.4,0],[.84,0],[.84,.22],[.68,.275],[.4,.275]])],
  saw:[RG('disc','spin','front',[.115,.832],Array.from({length:16},(q,i)=>[Math.max(0,.115+Math.cos(i/16*6.2832)*.118),.832+Math.sin(i/16*6.2832)*.0854]))],
  black:[RG('barrel','recoil','back',[.63,.17],[[.625,.07],[.93,.04],[.93,.29],[.625,.27]])],
  teeth:[RG('flame','flick','back',[.3,.35],[[0,.2],[.3,.2],[.3,.5],[0,.5]])],
  rider:[RG('tail','wag','back',[.21,.68],[[0,.34],[.1,.34],[.23,.58],[.23,.76],[.1,.76],[0,.6]],-86,86)],
  golem:[RG('armL','swing','front',[.15,.21],[[0,.18],[.27,.18],[.27,.74],[.04,.74]]),RG('armR','swing','front',[.66,.2],[[.6,.17],[.74,.17],[1,.6],[.97,.71],[.8,.72],[.62,.4]])],
  purple:[RG('claw','swing','front',[.2,.43],[[.1,.4],[.27,.4],[.27,.6],[.25,.87],[.03,.87],[.03,.55]]),RG('gun','recoil','front',[.74,.36],[[.74,.19],[1,.19],[1,.53],[.74,.5]])],
  king:[RG('barrel','recoil','back',[.7,.33],[[.7,.23],[.89,.23],[.89,.43],[.7,.43]]),RG('crown','hop','front',[.585,.17],[[.455,0],[.715,0],[.715,.175],[.455,.175]])]
};
Object.keys(RIGS).forEach(k=>{CH[k].rig=RIGS[k]});
const ORDER=['king','fort','blade','black','teeth','dino','rider','golem','saw','purple','witch'];
// роли для своих рисунков
const ARCH={
  fighter:{name:'Боец',desc:'дерётся вблизи',hp:130,speed:2.3,pw:12,idle:'breathe',atk:{k:'melee',cd:.8,dmg:18,fx:'punch'}},
  shooter:{name:'Стрелок',desc:'стреляет очередями',hp:80,speed:1.8,pw:11,idle:'breathe',atk:{k:'burst',range:7,cd:1.3,dmg:8,n:3,gap:.1}},
  tank:{name:'Танк',desc:'стреляет снарядами, взрыв бьёт всех рядом',hp:260,speed:1.2,pw:22,veh:1,idle:'rumble',atk:{k:'shell',range:8.5,cd:2.2,dmg:40,blast:1.6}},
  monster:{name:'Монстр',desc:'рвёт когтями и пугает криком',hp:320,speed:1.9,pw:24,idle:'breathe',atk:{k:'melee',cd:1,dmg:28,fx:'claw'},scream:{cd:7,r:3.4,fear:1.2,dmg:8}},
  fire:{name:'Огнемёт',desc:'поливает огнём',hp:150,speed:2,pw:16,idle:'breathe',atk:{k:'flame',range:4,cd:.14,dmg:5}},
  rocket:{name:'Ракетчик',desc:'пускает самонаводящиеся ракеты',hp:140,speed:1.5,pw:17,idle:'breathe',atk:{k:'rocket',range:8,cd:2.4,dmg:26,blast:1.2,n:1}},
  laser:{name:'Лазер',desc:'жжёт лазером',hp:160,speed:1.4,pw:17,idle:'still',atk:{k:'laser',range:6,cd:.1,dmg:3,col:'#ff2a2a'}},
  healer:{name:'Лекарь',desc:'лечит своих',hp:90,speed:2,pw:10,idle:'sway',atk:{k:'heal',range:4.5,cd:.9,heal:16}},
  bomb:{name:'Бомбочка',desc:'подбегает и взрывается',hp:50,speed:3.2,pw:10,idle:'hop',atk:{k:'bomb',dmg:95,blast:3.2}}
};
const TRAITS=['pick','keep','creep','enrage','berserk','charge','aura','scream','heavy','armor'];
const ATK={
  punch:{name:'Кулаки',a:{k:'melee',cd:.8,dmg:24,fx:'punch'}},
  claw:{name:'Когти',a:{k:'melee',cd:.45,dmg:15,fx:'claw'}},
  grab:{name:'Захват',a:{k:'melee',cd:2.8,dmg:40,fx:'grab'}},
  saw:{name:'Пила',a:{k:'saw',cd:.14,dmg:7}},
  burst:{name:'Очередь',a:{k:'burst',range:6.5,cd:1.5,dmg:9,n:4,gap:.09}},
  shell:{name:'Снаряды',a:{k:'shell',range:8.5,cd:2.2,dmg:40,blast:1.6}},
  ice:{name:'Лёд',a:{k:'shell',range:9,cd:2.6,dmg:45,blast:1.4,freeze:2.6,col:'#3aa0e8'}},
  napalm:{name:'Напалм',a:{k:'shell',range:7.5,cd:2,dmg:32,blast:1.5,burn:3,col:'#ff5a1f'}},
  rocket:{name:'Ракеты',a:{k:'rocket',range:8,cd:2.4,dmg:24,blast:1.2,n:2,gap:.22}},
  plasma:{name:'Плазма',a:{k:'burst',range:5.5,cd:1.3,dmg:14,n:2,gap:.15,plasma:1,blast:.7,col:'#b63ad6'}},
  laser:{name:'Лазер',a:{k:'laser',range:6,cd:.1,dmg:3,col:'#ff2a2a'}},
  beam:{name:'Луч',a:{k:'beam',range:9,cd:3.4,dmg:50,charge:.6,width:.7,col:'#ffd43b'}},
  flame:{name:'Огнемёт',a:{k:'flame',range:4,cd:.14,dmg:5}},
  heal:{name:'Лечение',a:{k:'heal',range:4.5,cd:.9,heal:16}},
  bomb:{name:'Взрыв',a:{k:'bomb',dmg:95,blast:3.2}}
};
const CHR={
  plain:{name:'Обычный',tag:'спокойный боец',d:'идёт на ближайшего врага',t:{},lines:L(['Вперёд!'],['Есть!'],['Ой!'],['Победа!'])},
  sniper:{name:'Снайпер',tag:'хладнокровный снайпер',d:'целит в самых больших и держит дистанцию',t:{pick:'big',keep:4},lines:L(['Цель вижу.'],['Точно в цель.'],['Отхожу!'],['Чистая работа.'])},
  berserk:{name:'Берсерк',tag:'бешеный берсерк',d:'чем меньше здоровья, тем быстрее',t:{berserk:1},lines:L(['РРРА!'],['ЕЩЁ!'],['А-А-А!!!'],['РРРА-ХА-ХА!'])},
  angry:{name:'Вспыльчивый',tag:'злой и вспыльчивый',d:'раненый звереет и бьёт почти вдвое чаще',t:{enrage:1},lines:L(['ГРРР!'],['Получил!'],['НУ ВСЁ!!!'],['Так-то!'])},
  sly:{name:'Хитрый',tag:'жуткий и хитрый',d:'крадётся и выбирает самых слабых',t:{pick:'weak',creep:1},lines:L(['Хи-хи-хи…'],['Попался!'],['Ай!'],['Хи-хи!'])},
  brave:{name:'Храбрый',tag:'отважный храбрец',d:'с разгона таранит самого большого врага',t:{pick:'big',charge:{cd:5,min:2.5,max:7.5,dmg:45,push:2.2}},lines:L(['В атаку!'],['Так его!'],['Не сдамся!'],['Победа!'])},
  boss:{name:'Командир',tag:'гордый командир',d:'свои рядом с ним дерутся сильнее',t:{aura:4},lines:L(['За мной!'],['Склонитесь!'],['Стража!'],['Да здравствую я!'])},
  scary:{name:'Крикун',tag:'жуткий крикун',d:'визжит так, что враги разбегаются',t:{scream:{cd:7,r:3.6,fear:1.4,dmg:8}},lines:L(['Бу!'],['Испугался?'],['Ой!'],['Бу-га-га!'])},
  heavy:{name:'Тяжёлый',tag:'упрямый силач',d:'его не сдвинуть, броня гасит часть урона',t:{heavy:1,armor:.7},lines:L(['Иду.'],['Готов.'],['Не отступлю!'],['Стою.'])}
};
const MOVES={rumble:'Тарахтит',hop:'Прыгает',sway:'Качается',breathe:'Дышит',twitch:'Дёргается',proud:'Важничает',float:'Парит',wobble:'Желе',stomp:'Топает',angry:'Трясётся',still:'Замер'};
const REMAINS={ball:'Комок бумаги',grave:'Надгробие',wreck:'Обломки',ghost:'Призрак',none:'Ничего'};
const isHealer=D=>D.atks.every(a=>a.k==='heal');
function buildD(it){
  const B=it.base,o=it.ov||{},D=Object.assign({},B),ca=o.atk&&o.atk!=='own'&&ATK[o.atk],cc=o.chr&&o.chr!=='own'&&CHR[o.chr];
  const own=[B.atk];if(B.melee)own.push(Object.assign({k:'melee'},B.melee));if(B.far)own.push(B.far);
  const list=(o.atks&&o.atks.length?o.atks:ca?[o.atk]:[]).filter(k=>ATK[k]);
  D.atks=list.length?list.map(k=>Object.assign({},ATK[k].a)):own;D.atk=D.atks[0];
  if(cc){TRAITS.forEach(k=>delete D[k]);Object.assign(D,cc.t);D.tag=cc.tag;D.lines=cc.lines}
  if(o.idle&&o.idle!=='own'&&MOVES[o.idle])D.idle=o.idle;
  if(o.lines){ // свои реплики: несколько вариантов через «/»
    const b0=D.lines||CHR.plain.lines,L2={};let any=false;
    ['start','kill','low','win'].forEach(k=>{const v=typeof o.lines[k]==='string'?o.lines[k].split('/').map(x=>x.trim().slice(0,40)).filter(Boolean):[];if(v.length){L2[k]=v;any=true}else L2[k]=b0[k]});
    if(any)D.lines=L2;
  }
  if(list.length||cc)D.desc='Атака: '+(list.length?list.map(k=>ATK[k].name.toLowerCase()).join(', '):'своя')+'. Характер: '+(cc?cc.name.toLowerCase()+', '+cc.d:'свой')+'.';
  const m=o.pw||1;D.hp=B.hp*m;D.dm0=m;D.pw=B.pw*m*(1+.2*Math.max(0,list.length-1));D.speed=B.speed*(o.sp||1);D.as=o.as||1;D.rem=REMAINS[o.rem]?o.rem:'ball';
  if(o.muz)D.muz=[o.muz];
  if(o.at)D.atks.forEach(a=>{if(a.k==='saw')a.at=o.at});
  it.D=D;it.name=o.name||it.name0;if(o.size)it.size=o.size;rigBuild(it,D);return D;
}
const LS='paper-battles-heroes-v1';
// всё, что надо помнить между запусками и устройствами
const S={ts:0,ov:{},stats:{},lineups:[],set:{paper:'white',mute:false,music:false,limit:0,mode:'free',tip:false},camp:{level:0},deleted:[]};
try{
  const j=JSON.parse(localStorage.getItem(LS+'-state')||'null');
  if(j){Object.assign(S,j);S.set=Object.assign({paper:'white',mute:false,music:false,limit:0,mode:'free',tip:false},j.set||{});S.camp=Object.assign({level:0},j.camp||{})}
  else{S.ov=JSON.parse(localStorage.getItem(LS+'-ov')||'{}')||{};S.set.paper=localStorage.getItem(LS+'-paper')||'white';S.set.mute=localStorage.getItem(LS+'-mute')==='1'}
}catch(e){}
let OV=S.ov;
function saveState(){S.ts=Date.now();try{localStorage.setItem(LS+'-state',JSON.stringify(S))}catch(e){}cloudMark('state')}
const stat=id=>S.stats[id]||(S.stats[id]={b:0,w:0,k:0});
const PARTANIM={swing:'Машет',recoil:'Отдача',wag:'Виляет',spin:'Крутится',hop:'Подпрыгивает',flick:'Мерцает'};
function polyPath(g,poly,w,h){g.beginPath();poly.forEach((q,j)=>j?g.lineTo(q[0]*w,q[1]*h):g.moveTo(q[0]*w,q[1]*h));g.closePath()}
// вырезаем из рисунка обведённые части, чтобы они двигались отдельно
// старые сохранения: части пользователя хранились отдельно от встроенных
function fixOv(it){const o=it.ov;if(!o||o.rv===2)return;if(!it.custom)o.parts=Array.isArray(o.parts)&&o.parts.length?(it.base.rig||[]).concat(o.parts):null;o.rv=2}
function rigBuild(it,D){
  const B=it.base,list=it.ov&&Array.isArray(it.ov.parts)?it.ov.parts:(B.rig||[]);if(!list.length)return;
  if(!ready(B.img)){
    if(!B.wait&&B.img.addEventListener){B.wait=true;B.img.addEventListener('load',()=>{B.wait=false;buildD(it);if(typeof units!=='undefined')units.forEach(u=>{if(u.item===it)u.D=it.D})})}
    return;
  }
  const key=JSON.stringify(list);
  if(B.rigKey!==key){
    const w=B.w,h=B.h,body=mk(w,h),g=body.getContext('2d'),parts=B.parts.slice(),rd=it.custom&&it.face===-1?-1:1;g.drawImage(B.img,0,0,w,h);
    list.forEach((p,i)=>{
      const pc=mk(w,h),pg=pc.getContext('2d');polyPath(pg,p.poly,w,h);pg.clip();pg.drawImage(B.img,0,0,w,h);
      g.save();g.globalCompositeOperation='destination-out';polyPath(g,p.poly,w,h);g.fill();g.restore();
      parts.push({id:p.id||'r'+i,j:i,bi:!!p.id,img:pc,x:0,y:0,px:p.pv[0]*w,py:p.pv[1]*h,z:p.z||(p.anim==='recoil'||p.anim==='wag'||p.anim==='flick'?'back':'front'),anim:p.anim,dir:p.dir||(p.pv[0]<.5?1:-1),rd,cus:true,a0:typeof p.a0==='number'?p.a0:-70,a1:typeof p.a1==='number'?p.a1:45,amp:typeof p.amp==='number'?p.amp:1});
    });
    B.rigKey=key;B.rigImg=body;B.rigParts=parts;
  }
  D.img=B.rigImg;D.parts=B.rigParts;
}
const HEALFIGHT={k:'melee',cd:.8,dmg:6,fx:'punch'},HEALLIST=[HEALFIGHT],SAW_AT=[.95,.6],DEF_MUZ=[[.92,.42]];
const power=(D,s)=>Math.round(D.pw*Math.pow(s,1.75));
function loadImg(src){const im=new Image();im.src=src;return im}

const library=[];
ORDER.forEach(k=>{
  const B=Object.assign({},CH[k],{w:MAN[k].w,h:MAN[k].h,img:loadImg('assets/'+k+'_full.webp'),parts:[]});
  const it={id:'d-'+k,name0:B.name,base:B,src:'assets/'+k+'_full.webp',custom:false,face:1,size:1,ov:OV['d-'+k]||null};fixOv(it);buildD(it);library.push(it);
});
function customD(role,img){return Object.assign({},ARCH[role],{H:2.9,w:img.width,h:img.height,img,parts:[],tag:ARCH[role].name.toLowerCase(),desc:ARCH[role].desc[0].toUpperCase()+ARCH[role].desc.slice(1)+'.'})}
let selected=null,selU=null,selP=null;
const SHOW_PROPS=false; // камень, клей и костёр пока убраны из набора
const heroRec=it=>({id:it.id,name:it.name0,role:it.role,face:it.face,src:it.src,raw:it.raw||'',mask:it.mask||'',tol:it.tol||34});
function saveCustom(){
  const list=library.filter(i=>i.custom).map(heroRec);
  for(let drop=0;drop<=list.length;drop++){ // если места мало, у самых старых героев не храним исходное фото
    try{localStorage.setItem(LS+'-2',JSON.stringify(list.map((h,i)=>i<drop?Object.assign({},h,{raw:'',mask:''}):h)));return}catch(e){}
  }
  toast('Памяти на этом устройстве не хватает, герой может не сохраниться');
}
function addCustomRec(r){
  if(!r||!ARCH[r.role]||library.some(i=>i.id===r.id))return;
  const im=new Image();
  im.onload=()=>{
    if(library.some(i=>i.id===r.id))return;
    const n={id:r.id,name0:r.name,role:r.role,src:r.src,face:r.face||0,raw:r.raw||'',mask:r.mask||'',tol:r.tol||34,base:customD(r.role,im),custom:true,size:1,ov:OV[r.id]||null};
    buildD(n);library.push(n);renderLib();
  };
  im.src=r.src;
}
function loadCustom(){
  let list=[];try{list=JSON.parse(localStorage.getItem(LS+'-2')||'[]')}catch(e){}
  list.forEach(addCustomRec);
}
function renderLib(){
  const lib=$('lib');lib.textContent='';
  library.forEach(it=>{
    const b=document.createElement('button');b.className='item';b.type='button';
    b.setAttribute('aria-pressed',selected===it?'true':'false');b.title=it.name+': '+it.D.desc;
    const im=document.createElement('img');im.src=it.src;im.alt='';
    const s=document.createElement('span');s.textContent=it.name;
    b.append(im,s);bindLibDrag(b,it);lib.append(b);
  });
  if(SHOW_PROPS)PROPITEMS.forEach(it=>{
    const b=document.createElement('button');b.className='item';b.type='button';b.setAttribute('aria-pressed',selected===it?'true':'false');b.title=it.name+': '+it.desc;
    const im=document.createElement('img');im.src=it.src;im.alt='';const sp=document.createElement('span');sp.textContent=it.name;b.append(im,sp);bindLibDrag(b,it);lib.append(b);
  });
  const add=document.createElement('button');add.className='item add';add.type='button';
  add.innerHTML='<b>+</b><span>Рисунок</span>';add.title='Добавить свой рисунок из фото';
  add.addEventListener('click',()=>$('file').click());lib.prepend(add);
  renderInfo();
}
function hintText(){
  const m=S.set.mode;
  if(m==='duel')return duelPhase===0?'Ставят синие. Красные, не подглядывайте!':'Ставят красные. Синие, не подглядывайте!';
  if(m==='camp')return 'Уровень '+(camp.i+1)+'. Собери команду не сильнее '+camp.budget+'.';
  if(m==='path')return 'Поставь до трёх своих героев и побеждай: они растут в уровне.';
  return 'Перетащи героев на лист. Тапни героя, чтобы менять размер.';
}
function renderInfo(){
  const t=$('infoText');t.textContent='';
  const setup=state==='setup',battle=state==='battle',tg=setup?(selU?selU.item:selP?PROPITEMS.find(p=>p.prop===selP.kind):selected):null;
  $('blotbar').hidden=!battle;$('bbar').hidden=!battle;$('hero').hidden=!setup;t.hidden=battle;
  $('szBox').hidden=!tg||S.set.mode==='path';$('heroDel').hidden=!(setup&&(selU||selP));
  if(!setup)return;
  $('heroEd').textContent=tg&&!tg.prop?'Настроить':'Настроить героев';
  if(tg){
    const sz=selU?selU.s:selP?selP.s:tg.size,b=document.createElement('b');b.textContent=tg.name;
    t.append(b,tg.prop?' · ×'+sz.toFixed(1)+' · '+tg.desc:' · ×'+sz.toFixed(1)+' · сила '+power(tg.D,sz)+' · '+tg.D.tag+(S.set.mode==='path'?' · '+pathTag(tg):''));
    if(document.activeElement!==sizeEl||+sizeEl.value!==sz)sizeEl.value=sz;
  }else t.textContent=hintText();
}
const sizeEl=$('size');
function setSize(v){
  const tg=selU?selU.item:selP?selP:selected;if(!tg)return;
  const sz=clamp(Math.round(v*10)/10,.5,3);
  if(selU){selU.s=sz;applySize(selU);fit(selU)}
  else if(selP)selP.s=sz;
  else if(tg.prop)tg.size=sz;
  else{tg.size=sz;tg.ov=Object.assign({},tg.ov||{},{size:sz});OV[tg.id]=tg.ov}
  renderInfo();
}
sizeEl.addEventListener('input',()=>setSize(+sizeEl.value));
sizeEl.addEventListener('change',()=>{if(!selU&&!selP&&selected&&!selected.prop)saveState()});
$('heroDel').onclick=()=>{if(selU)units=units.filter(u=>u!==selU);else if(selP)props=props.filter(q=>q!==selP);else return;selU=selP=null;sfx('crumple');renderInfo()};
$('heroEd').onclick=()=>openEd(selU?selU.item:selected&&!selected.prop?selected:library[0]);
function removeSelected(){
  const it=selected;if(!it||!it.custom)return;
  library.splice(library.indexOf(it),1);units=units.filter(u=>u.item!==it);selected=null;saveCustom();renderLib();
}
const ghost=$('ghost');
function bindLibDrag(el,it){
  let sx=0,sy=0,drag=false,down=false;
  el.addEventListener('pointerdown',e=>{if(state!=='setup')return;down=true;drag=false;sx=e.clientX;sy=e.clientY;el.setPointerCapture(e.pointerId)});
  el.addEventListener('pointermove',e=>{
    if(!down)return;
    if(!drag&&Math.hypot(e.clientX-sx,e.clientY-sy)>8){drag=true;ghost.src=it.src;ghost.hidden=false}
    if(drag){ghost.style.left=e.clientX+'px';ghost.style.top=e.clientY+'px'}
  });
  const end=e=>{
    if(!down)return;down=false;ghost.hidden=true;
    if(drag){
      const r=cv.getBoundingClientRect(),x=e.clientX-r.left,y=e.clientY-r.top;
      if(e.type==='pointerup'&&x>0&&y>-20&&x<W&&y<H){const u=place(it,x,Math.max(y,0)+(it.prop?0:base));if(u){if(u.kind){selP=u;selU=null}else{selU=u;selP=null}selected=null;renderLib()}}
    }else if(e.type==='pointerup'){selected=selected===it?null:it;selU=selP=null;renderLib()}
    drag=false;
  };
  el.addEventListener('pointerup',end);el.addEventListener('pointercancel',end);
}

/* ---------- звук ---------- */
let AC=null,master=null,noiseBuf=null,muted=S.set.mute;const lastS={};
function audioInit(){
  if(AC){if(AC.state==='suspended')AC.resume().catch(()=>{});return}
  try{
    const C=window.AudioContext||window.webkitAudioContext;AC=new C();
    master=AC.createGain();master.gain.value=.5;master.connect(AC.destination);
    noiseBuf=AC.createBuffer(1,AC.sampleRate,AC.sampleRate);
    const d=noiseBuf.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1;
  }catch(e){AC=null}
}
document.addEventListener('pointerdown',audioInit,true);
function tone(type,f0,f1,dur,vol,delay=0){
  const t=AC.currentTime+delay,o=AC.createOscillator(),g=AC.createGain();
  o.type=type;o.frequency.setValueAtTime(f0,t);o.frequency.exponentialRampToValueAtTime(Math.max(1,f1),t+dur);
  g.gain.setValueAtTime(vol,t);g.gain.exponentialRampToValueAtTime(.001,t+dur);
  o.connect(g);g.connect(master);o.start(t);o.stop(t+dur+.03);
}
function noise(dur,vol,ftype,f0,f1,delay=0,q=1){
  const t=AC.currentTime+delay,src=AC.createBufferSource(),f=AC.createBiquadFilter(),g=AC.createGain();
  src.buffer=noiseBuf;src.loop=true;f.type=ftype;f.Q.value=q;
  f.frequency.setValueAtTime(f0,t);f.frequency.exponentialRampToValueAtTime(f1,t+dur);
  g.gain.setValueAtTime(vol,t);g.gain.exponentialRampToValueAtTime(.001,t+dur);
  src.connect(f);f.connect(g);g.connect(master);src.start(t,Math.random()*.5);src.stop(t+dur+.03);
}
const SFX={
  pop(){tone('sine',420,720,.08,.25)},
  hit(){noise(.09,.5,'lowpass',900,200);tone('sine',170+Math.random()*60,70,.1,.35)},
  thud(){noise(.2,.7,'lowpass',500,80);tone('sine',110,40,.25,.6)},
  shot(){noise(.05,.3,'bandpass',1500,900,0,1.5);tone('square',320,120,.05,.1)},
  plasma(){tone('sine',700,180,.16,.22);tone('triangle',1050,300,.12,.1)},
  rocket(){noise(.35,.3,'bandpass',500,2600,0,1)},
  laser(){tone('sawtooth',880,820,.16,.06);tone('sine',1760,1700,.16,.05)},
  charge(){tone('sine',200,1200,.6,.18);tone('triangle',100,600,.6,.1)},
  beam(){tone('sawtooth',300,90,.45,.3);noise(.4,.4,'bandpass',1200,400,0,.8)},
  saw(){tone('sawtooth',170,190,.13,.1);noise(.12,.16,'bandpass',3200,3800,0,4)},
  bite(){noise(.05,.5,'highpass',1800,2500);noise(.06,.5,'lowpass',700,300,.07)},
  freeze(){tone('triangle',1800,600,.3,.15);noise(.25,.2,'highpass',5000,7000)},
  scream(){tone('sawtooth',700,1300,.25,.13);tone('sawtooth',1300,600,.45,.13,.25);tone('sine',1400,900,.6,.1)},
  whoosh(){noise(.2,.35,'bandpass',400,1800,0,1.2)},
  dash(){noise(.3,.3,'bandpass',300,1200,0,1);tone('triangle',200,400,.25,.12)},
  cannon(){noise(.3,.8,'lowpass',1400,90);tone('sine',150,35,.35,.8)},
  boom(){noise(.55,.9,'lowpass',900,50);tone('sine',90,28,.5,.8)},
  heal(){tone('triangle',660,660,.12,.2);tone('triangle',990,990,.18,.2,.1)},
  splat(){noise(.25,.6,'lowpass',2400,150);tone('sine',300,90,.15,.2)},
  crumple(){for(let i=0;i<5;i++)noise(.04,.3,'bandpass',2500+Math.random()*2500,3000,i*.045+Math.random()*.02,3)},
  fire(){noise(.3,.22,'bandpass',700,1500,0,.7)},
  slash(){noise(.1,.35,'highpass',2500,6000)},
  start(){tone('square',392,392,.1,.1);tone('square',523,523,.1,.1,.11);tone('square',659,659,.2,.1,.22)},
  win(){[523,659,784,1047].forEach((f,i)=>tone('triangle',f,f,.24,.25,i*.13))},
  draw(){tone('triangle',330,220,.4,.2)},
  super(){tone('sawtooth',220,880,.3,.16);tone('square',440,1320,.3,.08,.05);noise(.3,.5,'lowpass',2000,200,.25)},
  lose(){[392,349,311,247].forEach((f,i)=>tone('triangle',f,f*.97,.3,.2,i*.22));tone('sawtooth',124,82,.9,.07,.66)},
  stamp(){noise(.12,.9,'lowpass',700,90);tone('sine',140,45,.2,.7)}
};
function sfx(n,gap=.05){
  if(!AC||muted||AC.state!=='running')return;
  const now=AC.currentTime;if(lastS[n]!==undefined&&now-lastS[n]<gap)return;lastS[n]=now;
  try{SFX[n]()}catch(e){}
}

/* ---------- поле ---------- */
let W=300,H=300,DPR=1,base=20,portrait=false,paper=S.set.paper,bg=null;
let state='setup',units=[],snapshot=[],balls=[],stains=[],fx=[],shots=[],zones=[],gq=[];
let wins=[0,0],ending=false,endT=0,winner=-1,blotCd=0,clock=0,shake=0,props=[],duelPhase=0,btool='blot',speedMul=1,paused=false,propTick=0;
const camp={i:0,budget:0,name:''};
const solo=()=>S.set.mode==='camp'||S.set.mode==='path'; // игрок расставляет только синих
const BLOT_CD=2.5,MAX_UNITS=60;
const sideOf=(x,y)=>portrait?(y>H/2?0:1):(x<W/2?0:1);
// поле в «своих» координатах: a — от края синих (0) к краю красных (1), b — поперёк
const toAB=(x,y)=>portrait?[1-y/H,x/W]:[x/W,y/H];
const fromAB=(a,b)=>portrait?{x:b*W,y:(1-a)*H}:{x:a*W,y:b*H};
function fromSide(team,d,l){return fromAB(team===0?d/2:1-d/2,l)}
function applySize(u){
  const D=u.D,s=u.s,r=u.max?u.hp/u.max:1;
  u.h=base*D.H*s;u.w=u.h*D.w/D.h;u.r=Math.max(u.w*.36,u.h*.2);
  u.max=D.hp*s*s;u.hp=u.max*r;u.dm=Math.pow(s,1.5)*(D.dm0||1);u.spd=D.speed*Math.pow(s,-.3);u.rg=Math.pow(s,.4);u.bl=Math.pow(s,.6);
}
function fit(u){u.x=clamp(u.x,Math.min(u.r,W/2),Math.max(W-u.r,W/2));u.y=clamp(u.y,Math.min(u.h*.6,H/2),H-4)}
function makeUnit(item,x,y,team,size){
  const u={item,D:item.D,team,s:size||item.size||1,x,y,max:0,hp:0,cds:item.D.atks.map((a,i)=>rnd(.2,.8)+i*.4),dmgAcc:0,dmgT:0,scrT:rnd(1,3),chT:rnd(0,1.5),tgT:0,tg:null,busy:0,dash:0,
    slowT:0,fearT:0,holdT:0,glueT:0,locked:false,sup:0,supT:0,supFull:0,dmgDone:0,kills:0,fx:0,fy:0,buff:1,hitT:0,an:null,alt:0,spin:0,sawT:0,q:[],walking:false,phase:rnd(6.28),dead:false,deadT:0,face:team===0?1:-1,seed:(Math.random()*1e9)|0};
  applySize(u);fit(u);return u;
}
function place(item,x,y,size){
  if(item.prop){
    if(props.length>=12){toast('Предметов уже много');return null}
    const q={kind:item.prop,x:clamp(x,10,W-10),y:clamp(y,10,H-6),s:size||item.size||1,seed:(Math.random()*1e9)|0};props.push(q);sfx('pop',.03);return q;
  }
  if(units.length>=MAX_UNITS){toast('На листе уже тесно');return null}
  const side=sideOf(x,y),m=S.set.mode;
  if(m==='duel'&&side!==duelPhase){toast(duelPhase===0?'Сейчас ставят синие, на своей половине':'Сейчас ставят красные, на своей половине');return null}
  if((m==='camp'||m==='path')&&side!==0){toast('Это половина противника. Ставь героев на синюю');return null}
  if(m==='path'){if(units.filter(u=>u.team===0).length>=3){toast('В команде уже трое героев');return null}const b=item.pit||item;item=pathItem(b,pathH(b.id).l);size=1}
  const u=makeUnit(item,x,y,side,size);units.push(u);sfx('pop',.03);return u;
}
const propR=q=>base*(q.kind==='rock'?1.1:q.kind==='glue'?1.8:1.4)*q.s;
function preset(){
  const by=k=>library.find(i=>i.id==='d-'+k);units=[];
  [[0,'golem',.74,.5],[0,'dino',.6,.16],[0,'blade',.3,.3],[0,'king',.3,.72],[0,'witch',.62,.86],
   [1,'saw',.74,.5],[1,'purple',.6,.14],[1,'black',.3,.28],[1,'teeth',.3,.72],[1,'rider',.6,.86]]
   .forEach(([t,k,d,l])=>{const p=fromSide(t,d,l);units.push(makeUnit(by(k),p.x,p.y+base,t,1))});
}
function randomize(){
  const m=S.set.mode,only=m==='duel'?duelPhase:solo()?0:-1;
  units=only<0?[]:units.filter(u=>u.team!==only);selU=selP=null;
  for(let t=0;t<2;t++){if(only>=0&&t!==only)continue;const n=3+((Math.random()*4)|0);
    for(let i=0;i<n;i++){const p=fromSide(t,rnd(.2,.85),rnd(.14,.9));const it=pick(library);units.push(makeUnit(it,p.x,p.y,t,it.id==='d-fort'?1:Math.round(rnd(.7,1.5)*10)/10))}}
  renderInfo();
}
function resize(){
  if(preview){pv.resize=true;requestAnimationFrame(()=>{if(preview){pvMeasure();pvStart()}});return}
  const r=stage.getBoundingClientRect(),nw=Math.max(120,Math.floor(r.width-24)),nh=Math.max(120,Math.floor(r.height-12));
  const pts=[],grab=(o,kx,ky)=>{if(typeof o[kx]==='number')pts.push([o,kx,ky,toAB(o[kx],o[ky])])};
  [units,balls,stains,shots,fx,zones,props].forEach(a=>a.forEach(o=>{grab(o,'x','y');grab(o,'x2','y2');grab(o,'tx','ty')}));
  units.forEach(u=>{u.fa=toAB(u.fx,u.fy)});
  W=nw;H=nh;DPR=Math.min(2,window.devicePixelRatio||1);portrait=H>W;
  pts.forEach(([o,kx,ky,ab])=>{const p=fromAB(ab[0],ab[1]);o[kx]=p.x;o[ky]=p.y});
  units.forEach(u=>{const p=fromAB(u.fa[0],u.fa[1]);u.fx=p.x;u.fy=p.y});
  base=clamp(Math.min(W,H)*.052,15,32);
  units.forEach(u=>{applySize(u);if(state==='setup')fit(u)});
  cv.style.width=W+'px';cv.style.height=H+'px';cv.width=W*DPR;cv.height=H*DPR;
  makePaper();
}
function makePaper(){
  bg=document.createElement('canvas');bg.width=W*DPR;bg.height=H*DPR;
  const g=bg.getContext('2d'),R=rng(42);g.scale(DPR,DPR);
  const col={white:'#fbfaf6',album:'#f1e7cc',kraft:'#c8a674',grid:'#fbfaf6',lined:'#fbfaf6'}[paper];
  g.fillStyle=col;g.fillRect(0,0,W,H);
  const specks=paper==='kraft'?2600:paper==='album'?1800:900;
  for(let i=0;i<specks;i++){g.fillStyle=R()<.5?'rgba(0,0,0,.05)':'rgba(255,255,255,.12)';g.fillRect(R()*W,R()*H,1+R()*1.5,1+R()*1.5)}
  if(paper==='kraft')for(let i=0;i<260;i++){const x=R()*W,y=R()*H,a=R()*6.28,l=4+R()*10;g.strokeStyle=R()<.5?'rgba(80,50,20,.16)':'rgba(255,240,210,.2)';g.lineWidth=.8;g.beginPath();g.moveTo(x,y);g.lineTo(x+Math.cos(a)*l,y+Math.sin(a)*l);g.stroke()}
  const cell=Math.round(base*1.15);
  if(paper==='grid'||paper==='lined'){
    g.strokeStyle='rgba(110,150,220,.5)';g.lineWidth=1;g.beginPath();
    for(let y=cell;y<H;y+=cell){g.moveTo(0,y+.5);g.lineTo(W,y+.5)}
    if(paper==='grid')for(let x=cell;x<W;x+=cell){g.moveTo(x+.5,0);g.lineTo(x+.5,H)}
    g.stroke();
    if(paper==='lined'){g.strokeStyle='rgba(226,70,58,.55)';g.beginPath();g.moveTo(W-cell*1.6,0);g.lineTo(W-cell*1.6,H);g.stroke()}
  }
  if(!preview)drawArena(g);
  const tint=(c,x0,y0,x1,y1)=>{const gr=g.createLinearGradient(x0,y0,x1,y1);gr.addColorStop(0,c+'24');gr.addColorStop(1,c+'00');g.fillStyle=gr;g.fillRect(0,0,W,H)};
  if(portrait){tint(BLUE,0,H,0,H*.55);tint(RED,0,0,0,H*.45)}else{tint(BLUE,0,0,W*.45,0);tint(RED,W,0,W*.55,0)}
  g.strokeStyle='rgba(42,42,51,.45)';g.lineWidth=2;g.setLineDash([10,9]);g.lineCap='round';g.beginPath();
  if(portrait){g.moveTo(8,H/2);g.lineTo(W-8,H/2)}else{g.moveTo(W/2,8);g.lineTo(W/2,H-8)}
  g.stroke();g.setLineDash([]);
}

/* ---------- ввод на поле ---------- */
let dragU=null,dragP=null,dragOut=false,dragDX=0,dragDY=0;
function evPos(e){const r=cv.getBoundingClientRect();return{x:e.clientX-r.left,y:e.clientY-r.top}}
const mayTouch=u=>!u.locked&&!(S.set.mode==='duel'&&u.team!==duelPhase);
cv.addEventListener('pointerdown',e=>{
  const p=evPos(e);
  if(replay)return;
  if(state==='battle'){
    const cm=solo();let h=null;
    for(const u of units)if(!u.dead&&u.sup>=1&&u.supT<=0&&(!cm||u.team===0)&&Math.abs(p.x-u.x)<Math.max(u.w*.55,24)&&p.y>u.y-u.h-26&&p.y<u.y+14)h=u;
    if(h&&!paused)fireSuper(h);else useTool(p.x,p.y);return;
  }
  if(state!=='setup')return;
  let hit=null,hp=null;
  for(const u of units){if(mayTouch(u)&&Math.abs(p.x-u.x)<Math.max(u.w*.5,14)&&p.y>u.y-u.h-4&&p.y<u.y+10&&(!hit||u.y>hit.y))hit=u}
  if(!hit)for(const q of props){if(Math.hypot(p.x-q.x,p.y-q.y)<Math.max(propR(q),16))hp=q}
  if(hit){dragU=hit;dragOut=false;dragDX=hit.x-p.x;dragDY=hit.y-p.y;selU=hit;selP=null;if(selected){selected=null;renderLib()}else renderInfo();cv.setPointerCapture(e.pointerId)}
  else if(hp){dragP=hp;dragOut=false;dragDX=hp.x-p.x;dragDY=hp.y-p.y;selP=hp;selU=null;if(selected){selected=null;renderLib()}else renderInfo();cv.setPointerCapture(e.pointerId)}
  else if(selected){const u=place(selected,p.x,p.y+(selected.prop?0:base));if(u){if(u.kind){selP=u;selU=null}else{selU=u;selP=null}renderInfo()}}
  else if(selU||selP){selU=selP=null;renderInfo()}
  else toast('Сначала выбери героя внизу');
});
cv.addEventListener('pointermove',e=>{
  if(!dragU&&!dragP)return;const p=evPos(e);
  dragOut=p.x<-12||p.y<-12||p.x>W+12||p.y>H+12;
  if(dragP){dragP.x=clamp(p.x+dragDX,6,W-6);dragP.y=clamp(p.y+dragDY,6,H-4);return}
  const ox=dragU.x,oy=dragU.y,m=S.set.mode;
  dragU.x=p.x+dragDX;dragU.y=p.y+dragDY;fit(dragU);
  const side=sideOf(dragU.x,dragU.y-dragU.h*.3);
  if((m==='duel'&&side!==duelPhase)||((m==='camp'||m==='path')&&side!==0)){dragU.x=ox;dragU.y=oy;return}
  dragU.team=side;dragU.face=side===0?1:-1;
});
const dropU=()=>{
  if(dragU&&dragOut){units=units.filter(u=>u!==dragU);if(selU===dragU){selU=null;renderInfo()}}
  if(dragP&&dragOut){props=props.filter(q=>q!==dragP);if(selP===dragP){selP=null;renderInfo()}}
  dragU=dragP=null;dragOut=false;
};
cv.addEventListener('pointerup',dropU);cv.addEventListener('pointercancel',dropU);

/* ---------- бой ---------- */
const fightLabel=()=>S.set.mode==='duel'&&duelPhase===0?'Синие готовы':'В бой!';
function setState(st){state=st;document.body.dataset.state=st;$('fight').textContent=st==='battle'?'Стоп':fightLabel();$('banner').hidden=st!=='over';renderInfo()}
let cele=null;
function resetField(){balls=[];stains=[];fx=[];shots=[];zones=[];gq=[];ending=false;winner=-1;blotCd=0;propTick=0;cele=null}
function restore(){units=snapshot.map(q=>{const p=fromAB(q.a,q.b),u=makeUnit(q.item,p.x,p.y,q.team,q.size);u.locked=!!q.locked;return u});resetField()}
function teamPower(){const pw=[0,0];units.forEach(u=>{if(!u.dead)pw[u.team]+=power(u.D,u.s)});return pw}
function startBattle(){
  const m=S.set.mode,n=[0,0];units.forEach(u=>n[u.team]++);
  if(m==='duel'&&duelPhase===0){
    if(!n[0]){toast('Синие, поставьте хотя бы одного героя');return}
    const pb=teamPower()[0];if(S.set.limit&&pb>S.set.limit){toast('Синие сильнее лимита: '+pb+' из '+S.set.limit+'. Уберите кого-нибудь или уменьшите',1);return}
    duelPhase=1;selU=selP=selected=null;renderLib();setState('setup');toast('Теперь красные. Синие, не подглядывайте!');return;
  }
  if(!n[0]||!n[1]){toast(solo()?'Поставь своих героев на синюю половину':'Поставь героев на обе стороны листа');return}
  const lim=m==='camp'?camp.budget:S.set.limit,pw=teamPower();
  if(lim){
    if(pw[0]>lim){toast((m==='camp'?'Твоя команда':'Синие')+' сильнее лимита: '+pw[0]+' из '+lim+'. Убери кого-нибудь или уменьши',1);return}
    if(m!=='camp'&&pw[1]>lim){toast('Красные сильнее лимита: '+pw[1]+' из '+lim+'. Уберите кого-нибудь или уменьшите',1);return}
  }
  snapshot=units.map(u=>{const ab=toAB(u.x,u.y);return{item:u.item,a:ab[0],b:ab[1],team:u.team,size:u.s,locked:u.locked}});
  begin();
}
function begin(){
  restore();selected=selU=selP=null;paused=false;rec.n=0;rec.acc=0;replay=null;renderLib();setState('battle');renderBar();sfx('start');
  units.slice().sort(()=>Math.random()-.5).slice(0,3).forEach((u,i)=>gq.push({t:.2+i*.7,fn:()=>say(u,'start')}));
}
const at=(u,t,fn)=>u.q.push({t,fn});
const WORDS=['БАМ!','ТЫЩ!','ХРЯСЬ!','БДЫЩ!','ШМЯК!'];
function word(text,x,y,size=1){fx.push({k:'word',text,x:clamp(x,base*2,W-base*2),y:clamp(y,base*2,H-base),t:0,life:.7,rot:(Math.random()-.5)*.5,size})}
function say(u,kind){
  const Ls=u.D.lines;if(!Ls||u.dead||state==='setup')return;
  if(fx.some(f=>f.k==='say'&&f.u===u)||fx.filter(f=>f.k==='say').length>=3)return;
  fx.push({k:'say',u,x:0,y:0,text:pick(Ls[kind]),t:0,life:1.7});voice(u);
}
function scraps(x,y,n,dir){if(fx.length>260)return;for(let i=0;i<n;i++)fx.push({k:'scrap',x,y,vx:(dir||rnd(-1,1))*base*rnd(1,6),vy:-base*rnd(2,8),rot:rnd(6),vr:rnd(-14,14),t:0,life:rnd(.4,.8),s:base*rnd(.14,.3)})}
function smoke(x,y,vx,vy,r,col){fx.push({k:'smoke',x,y,vx,vy,t:0,life:rnd(.5,1),r,col})}
function spark(x,y,dir){fx.push({k:'spark',x,y,vx:dir*base*rnd(2,7),vy:-base*rnd(1,6),t:0,life:rnd(.15,.35)})}
function pt(u,n){return{x:u.x+(n[0]-.5)*u.w*u.face,y:u.y+(n[1]-1)*u.h+u.h*.04}}
function mz(u,i){const m=u.D.muz||DEF_MUZ;return pt(u,m[i%m.length])}
const foesOf=u=>units.filter(o=>o.team!==u.team&&!o.dead);
function hurt(u,d,sx,sy,push=.25,quiet=false,by=null){
  if(u.dead)return;
  d*=u.D.armor||1;if(by&&!preview&&S.set.mode==='path'&&BEATS[elOf(by.item)]===elOf(u.item))d*=1.25;u.hp-=d;u.hitT=quiet?.06:.16;u.dmgAcc+=d;
  if(by){by.dmgDone+=d;if(by.supT<=0&&!by.D.noSup)by.sup=Math.min(1,by.sup+d/260)}
  if(u.supT<=0&&!u.D.noSup)u.sup=Math.min(1,u.sup+d/u.max*.5);
  if(push){const k=u.D.heavy?.12:1/Math.sqrt(u.s),dx=u.x-sx,dy=u.y-sy,l=Math.hypot(dx,dy)||1;u.x+=dx/l*base*push*k;u.y+=dy/l*base*push*k}
  if(!quiet){fx.push({k:'star',x:u.x,y:u.y-u.h*.5,t:0,life:.25,rot:Math.random()*6});sfx(d>=30?'thud':'hit',.06);scraps(u.x,u.y-u.h*.5,d>=30?4:2,sx<u.x?1:-1)}
  if(u.hp<=0){u.dead=true;u.deadT=u.D.rem==='wreck'?0:.4;u.hp=0;sfx('crumple',.08);scraps(u.x,u.y-u.h*.5,9,0);if(by&&by.team!==u.team)by.kills++;if(by&&!preview&&by.item.id&&by.team!==u.team)stat(by.item.id).k++;if(u.dmgAcc>=1){fx.push({k:'num',text:'−'+Math.round(u.dmgAcc),x:u.x,y:u.y-u.h*.9,vx:0,vy:-base*1.6,t:0,life:.8});u.dmgAcc=0}if(by&&!by.dead&&Math.random()<.4)say(by,'kill')}
}
// суперудар: копится в бою, запускается тапом по герою (или сам через несколько секунд)
const SUPER={melee:'Вихрь ударов',saw:'Бешеная пила',bomb:'Ярость',shell:'Залп',ice:'Ледяная буря',napalm:'Огненный круг',flame:'Огненный круг',rocket:'Ракетный дождь',burst:'Шквал огня',plasma:'Плазменный шторм',laser:'Лазерная развёртка',beam:'Мегалуч',heal:'Большое лечение'};
function superKind(D){const a=D.atks[0];return a.k==='shell'?(a.freeze?'ice':a.burn?'napalm':'shell'):a.k==='burst'?(a.plasma?'plasma':'burst'):SUPER[a.k]?a.k:'melee'}
function fireSuper(u){
  if(u.dead||u.sup<1||u.supT>0)return false;
  const kind=superKind(u.D),A=u.D.atks[0],quick=kind==='melee'||kind==='saw'||kind==='bomb',R=base*3.2*u.rg,dm=u.dm;
  u.sup=0;u.supFull=0;u.holdT=0;u.slowT=0;u.fearT=0;u.supT=quick?4:1.5;
  fx.push({k:'wave',x:u.x,y:u.y,r:R*1.3,t:0,life:.4});word(SUPER[kind].toUpperCase()+'!',u.x,u.y-u.h*1.15,1.25);sfx('super');shake=Math.max(shake,6);heroSnd(u,true);
  const any=()=>{const l=foesOf(u);return l.length?pick(l):null};
  switch(kind){
    case 'shell':
      for(let i=0;i<6;i++)at(u,i*.13,()=>{const t=any();if(!t)return;const m=mz(u,i),tx=t.x+rnd(-1,1)*base,ty=t.y-t.h*.35,a=Math.atan2(ty-m.y,tx-m.x);
        shots.push({k:'shell',x:m.x,y:m.y,tx,ty,a,dmg:A.dmg*dm*.8,blast:A.blast*base*u.bl,team:u.team,by:u,sm:0,sz:u.bl});fx.push({k:'flash',x:m.x,y:m.y,t:0,life:.14,rot:a,s:u.bl});u.an={k:'shoot',t:.2,d:.2};sfx('cannon',.04)});
      break;
    case 'ice':{
      const RR=base*6.5*u.rg;fx.push({k:'boom',x:u.x,y:u.y-u.h*.4,t:0,life:.5,r:RR,col:'#8fd3ff',col2:'#ffffff'});
      for(let i=0;i<34;i++){const a=rnd(6.283),d=rnd(RR);fx.push({k:'snow',x:u.x+Math.cos(a)*d,y:u.y+Math.sin(a)*d*.7-base*2,vx:rnd(-1,1)*base,vy:base*1.5,t:0,life:rnd(.8,1.6)})}
      foesOf(u).forEach(o=>{if(Math.hypot(o.x-u.x,o.y-u.y)<RR+o.r*.5){hurt(o,22*dm,u.x,u.y,.4,false,u);if(!o.dead)o.slowT=4.5}});
      stains.push({x:u.x,y:u.y,r:RR*.45,seed:u.seed,t:0,col:'120,190,240',a:.35});sfx('freeze');break;
    }
    case 'napalm':case 'flame':
      for(let i=0;i<8;i++){const a=i/8*6.283,x=clamp(u.x+Math.cos(a)*base*3.2,base,W-base),y=clamp(u.y+Math.sin(a)*base*2.3,base,H-base);
        zones.push({x,y,r:base*1.5,t:0,life:4.5,dps:16*dm,team:u.team,tick:0});fx.push({k:'boom',x,y,t:0,life:.35,r:base*1.5,col:'#ff5a1f',col2:MARKER})}
      foesOf(u).forEach(o=>{if(Math.hypot(o.x-u.x,o.y-u.y)<base*4.4+o.r*.5)hurt(o,20*dm,u.x,u.y,.8,false,u)});sfx('boom');break;
    case 'rocket':
      for(let i=0;i<8;i++)at(u,i*.09,()=>{const t=any();if(!t)return;const m=mz(u,i);
        shots.push({k:'rocket',x:m.x,y:m.y,vx:rnd(-1,1)*base*5,vy:-base*rnd(6,10),a:-1.2,t,tx:t.x,ty:t.y-t.h*.35,life:3,dmg:A.dmg*dm*.8,blast:A.blast*base*u.bl,team:u.team,by:u,sm:0,sz:u.bl});sfx('rocket',.04)});
      break;
    case 'burst':case 'plasma':{
      const n=kind==='plasma'?7:26,gap=kind==='plasma'?.12:.045;
      for(let i=0;i<n;i++)at(u,i*gap,()=>{const t=any();if(!t)return;const m=mz(u,i),tx=t.x,ty=t.y-t.h*.35,a=Math.atan2(ty-m.y,tx-m.x);
        shots.push({k:'bullet',x:m.x,y:m.y,t,tx,ty,a,dmg:A.dmg*dm*(kind==='plasma'?1.2:.9),team:u.team,plasma:A.plasma,blast:(A.blast||0)*base*u.bl*1.4,col:A.col,by:u,sz:u.bl});
        fx.push({k:'flash',x:m.x,y:m.y,t:0,life:.08,rot:a,s:u.bl*.5,col:A.col});u.an={k:'shoot',t:.1,d:.1};sfx(A.plasma?'plasma':'shot',.03)});
      break;
    }
    case 'laser':
      foesOf(u).forEach((o,i)=>at(u,i*.1,()=>{if(o.dead)return;const m=mz(u,0);hurt(o,32*dm,u.x,u.y,.2,false,u);fx.push({k:'laser',x:m.x,y:m.y,x2:o.x,y2:o.y-o.h*.5,col:A.col||'#ff2a2a',t:0,life:.3});sfx('laser',.05)}));
      break;
    case 'beam':{
      const t=u.tg&&!u.tg.dead?u.tg:any();if(!t)break;
      const m=mz(u,0),a=Math.atan2(t.y-t.h*.4-m.y,t.x-m.x),Ln=Math.hypot(W,H),wd=base*1.5*u.bl,ca=Math.cos(a),sa=Math.sin(a);
      foesOf(u).forEach(o=>{const px=o.x-m.x,py=o.y-o.h*.4-m.y,al=px*ca+py*sa,pe=Math.abs(-px*sa+py*ca);if(al>-o.r&&pe<wd+o.r*.8)hurt(o,A.dmg*1.5*dm,m.x,m.y,1,false,u)});
      fx.push({k:'beam',x:m.x,y:m.y,x2:m.x+ca*Ln,y2:m.y+sa*Ln,w:wd,col:A.col||MARKER,t:0,life:.7});u.an={k:'shoot',t:.5,d:.5};sfx('beam');shake=10;break;
    }
    case 'heal':
      units.forEach(o=>{if(!o.dead&&o.team===u.team){o.hp=Math.min(o.max,o.hp+o.max*.5);o.slowT=0;fx.push({k:'plus',x:o.x,y:o.y-o.h,t:0,life:.9});if(o!==u)fx.push({k:'healray',x:u.x,y:u.y-u.h*.6,x2:o.x,y2:o.y-o.h*.5,t:0,life:.5})}});sfx('heal');break;
    default:
      fx.push({k:'ring',x:u.x,y:u.y-u.h*.5,t:0,life:.5,r:R});
      foesOf(u).forEach(o=>{if(Math.hypot(o.x-u.x,o.y-u.y)<R+o.r*.5)hurt(o,14*dm,u.x,u.y,1.6,false,u)});u.hp=Math.min(u.max,u.hp+u.max*.1);
  }
  return true;
}
function explode(x,y,rad,dmg,team,o={}){
  units.forEach(q=>{if(!q.dead&&q.team!==team&&Math.hypot(q.x-x,q.y-q.h*.35-y)<rad+q.r*.6){hurt(q,dmg,x,y,o.small?.3:.8,false,o.by);if(o.freeze&&!q.dead)q.slowT=o.freeze}});
  fx.push({k:'boom',x,y,t:0,life:.35,r:rad,col:o.freeze?'#8fd3ff':o.plasma?'#b63ad6':'#ff8a1f',col2:o.freeze?'#ffffff':o.plasma?'#f0b8ff':MARKER});
  for(let i=0;i<(o.small?2:5);i++){const a=Math.random()*6.283;smoke(x,y,Math.cos(a)*base*1.5,Math.sin(a)*base-base*1.2,base*rnd(.25,.5))}
  if(!o.small)fx.push({k:'wave',x,y:y+base*.3,r:rad*1.5,t:0,life:.35});
  if(!o.small)stains.push({x,y:y+base*.3,r:rad*.4,seed:(Math.random()*1e9)|0,t:0,col:o.freeze?'120,190,240':'40,40,46',a:o.freeze?.45:.78});
  if(o.burn)zones.push({x,y:y+base*.3,r:rad*.9,t:0,life:o.burn,dps:dmg*.4,team,tick:0});
  if(o.freeze){for(let i=0;i<7;i++)fx.push({k:'snow',x:x+rnd(-1,1)*rad,y:y+rnd(-1,.3)*rad,vx:0,vy:base*1.2,t:0,life:rnd(.5,1)});sfx('freeze')}
  if(!o.small&&Math.random()<.5)word(o.freeze?'ДЗЫНЬ!':'БАХ!',x,y-rad,1.1);
  sfx(o.plasma?'plasma':'boom',.08);shake=Math.max(shake,o.small?2.5:6);
}
// приёмы игрока во время боя: клякса бьёт, ластик лечит, скрепка держит на месте
function useTool(x,y){
  if(blotCd>0||ending||paused)return;blotCd=BLOT_CD;
  const rad=base*2.6,cm=solo(),inR=u=>!u.dead&&Math.hypot(u.x-x,u.y-u.h*.35-y)<rad+u.r*.5;
  if(btool==='heal'){
    stains.push({x,y,r:rad*.8,seed:(Math.random()*1e9)|0,t:0,col:'251,250,246',a:.92});word('ШУХ!',x,y-rad*.6,1.1);sfx('heal');
    units.forEach(u=>{if(inR(u)&&(!cm||u.team===0)){u.hp=Math.min(u.max,u.hp+60+u.max*.12);u.slowT=0;fx.push({k:'plus',x:u.x,y:u.y-u.h,t:0,life:.7})}});
  }else if(btool==='clip'){
    fx.push({k:'wave',x,y,r:rad*1.2,t:0,life:.35});word('ЩЁЛК!',x,y-rad*.6,1.1);sfx('bite');
    units.forEach(u=>{if(inR(u)&&(!cm||u.team===1)){u.holdT=2.6;u.dash=0}});
  }else{
    stains.push({x,y,r:rad*.8,seed:(Math.random()*1e9)|0,t:0,col:'29,47,111',a:.78});word('ШЛЁП!',x,y-rad*.6,1.1);sfx('splat');
    units.forEach(u=>{if(inR(u)&&(!cm||u.team===1))hurt(u,35,x,y,.6)});
  }
}
function step(u,dx,dy,d,m,dt){
  let v=u.spd*base*m*(u.slowT>0?.45:1)*(u.glueT>0?.4:1);
  if(u.D.creep)v*=.35+1.3*Math.max(0,Math.sin(clock*3.2+u.phase));
  u.x+=dx/d*v*dt;u.y+=dy/d*v*dt;u.walking=true;
}
function choose(u,foes){
  const m=u.D.pick;let best=null,bv=1e18;
  for(const o of foes){let v=Math.hypot(o.x-u.x,o.y-u.y);if(m==='big')v-=o.max*base*.02;else if(m==='weak')v+=o.hp*base*.02;if(v<bv){bv=v;best=o}}
  return best;
}
// захват: 0→1 пока поднимает, и 0→1 в самом конце, когда швыряет вниз
const liftUp=u=>{const k=clamp((u.liftD-u.liftT)/.35,0,1);return k*k*(3-2*k)};
const liftDown=u=>{const k=clamp(1-u.liftT/.16,0,1);return k*k};
function melee(u,t,M,foes,reach,prim){
  u.cds[prim]=M.cd;heroSnd(u);
  const d=Math.min(M.cd*.9,.38),part=M.parts?M.parts[u.alt=(u.alt+1)%M.parts.length]:M.part;
  const dx=t.x-u.x,dy=t.y-u.y,l=Math.hypot(dx,dy)||1;
  u.an={k:'melee',t:d,d,part,ax:dx/l,ay:dy/l,big:M.fx==='bite'};
  if(M.fx==='punch'&&!u.D.parts.some(P=>P.anim==='swing'))fx.push({k:'fist',x:u.x+dx/l*u.r*.5,y:u.y-u.h*.5,x2:t.x-dx/l*t.r*.4,y2:t.y-t.h*.5,t:0,life:d*.55,s:clamp(u.h*.13,base*.3,base*1.2)});
  if(M.fx==='tail')sfx('whoosh');
  at(u,d*.5,()=>{
    const dmg=M.dmg*u.dm*u.buff,hit=o=>hurt(o,dmg,u.x,u.y,M.push||.3,false,u);
    if(M.aoe){foes.forEach(o=>{if(!o.dead&&Math.hypot(o.x-u.x,o.y-u.y)<reach+M.aoe*base)hit(o)});fx.push({k:'arc',x:u.x,y:u.y-u.h*.4,r:u.r+M.aoe*base,t:0,life:.25});word('ХЛЫСЬ!',u.x,u.y-u.h,1.1);return}
    if(t.dead||Math.hypot(t.x-u.x,t.y-u.y)>reach*1.6)return;
    if(M.fx==='grab'&&!t.D.heavy&&!(t.liftT>0)&&!(u.liftT>0)){ // хватает врага, поднимает над головой и швыряет об лист
      const T2=1.15;t.liftT=u.liftT=t.liftD=u.liftD=T2;t.liftV=true;t.liftBy=u;t.liftDmg=dmg;t.lx0=t.x;t.ly0=t.y;u.liftV=false;t.dash=0;u.dash=0;u.face=t.x>=u.x?1:-1;sfx('whoosh');word('ХВАТЬ!',u.x,u.y-u.h*1.1,1.1);return;
    }
    hit(t);const cx=t.x,cy=t.y-t.h*.5;
    if(M.fx==='claw'){fx.push({k:'slash',x:cx,y:cy,t:0,life:.28,rot:rnd(-.4,.4),s:Math.min(t.h*.35,base*1.6)});sfx('slash')}
    else if(M.fx==='bite'){fx.push({k:'chomp',x:cx,y:cy,t:0,life:.3,s:Math.min(t.h*.35,base*1.6)});word('АМ!',cx,cy-t.h*.5,1.2);sfx('bite')}
    else if(M.dmg>=40){word('БУМ!',cx,cy-t.h*.5,1.4);shake=Math.max(shake,5);fx.push({k:'wave',x:cx,y:t.y,r:base*2,t:0,life:.3})}
    else if(Math.random()<.25)word(pick(WORDS),cx,cy-t.h*.5);
  });
}
function fire(u,t,A,foes,key){
  u.cds[key]=A.cd;heroSnd(u);const n=A.n||1,gap=A.gap||0,dmg=()=>A.dmg*u.dm*u.buff;
  if(A.k==='beam'){
    u.busy=A.charge+.25;u.an={k:'charge',t:A.charge,d:A.charge};fx.push({k:'glow',u,i:0,x:0,y:0,t:0,life:A.charge,col:A.col});sfx('charge');
    at(u,A.charge,()=>{
      const m=mz(u,0),tx=t.x,ty=t.y-t.h*.4,a=Math.atan2(ty-m.y,tx-m.x),Ln=A.range*base*u.rg*1.3,wd=A.width*base*u.bl,ca=Math.cos(a),sa=Math.sin(a);
      foesOf(u).forEach(o=>{const px=o.x-m.x,py=o.y-o.h*.4-m.y,al=px*ca+py*sa,pe=Math.abs(-px*sa+py*ca);if(al>-o.r&&al<Ln&&pe<wd+o.r*.8)hurt(o,dmg(),m.x,m.y,.6,false,u)});
      fx.push({k:'beam',x:m.x,y:m.y,x2:m.x+ca*Ln,y2:m.y+sa*Ln,w:wd,col:A.col,t:0,life:.4});u.an={k:'shoot',t:.4,d:.4};sfx('beam');shake=Math.max(shake,6);word('ВЖУХ!',m.x+ca*base*3,m.y+sa*base*3-base,1.2);
    });
    return;
  }
  if(A.k==='laser'){
    const m=mz(u,0),tx=t.x+rnd(-.2,.2)*t.r,ty=t.y-t.h*.5;hurt(t,dmg(),u.x,u.y,0,true,u);
    fx.push({k:'laser',x:m.x,y:m.y,x2:tx,y2:ty,col:A.col,t:0,life:.13});if(Math.random()<.5)spark(tx,ty,-u.face);sfx('laser',.2);return;
  }
  if(A.k==='flame'){
    const m=mz(u,0),d=Math.hypot(t.x-u.x,t.y-u.y);
    for(let i=0;i<2;i++){const a=Math.atan2(t.y-t.h*.5-m.y,t.x-m.x)+rnd(-.25,.25),sp=base*rnd(9,12);fx.push({k:'flame',x:m.x,y:m.y,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp,t:0,life:d/(base*10)+.12,r:base*rnd(.25,.45)})}
    foes.forEach(o=>{if(o===t||Math.hypot(o.x-t.x,o.y-t.y)<base*1.3)hurt(o,dmg(),u.x,u.y,0,true,u)});sfx('fire',.22);return;
  }
  const list=A.multi?foes.slice().sort((a,b)=>Math.hypot(a.x-u.x,a.y-u.y)-Math.hypot(b.x-u.x,b.y-u.y)):null;
  for(let i=0;i<n;i++)at(u,i*gap,()=>{
    let tg=list?list[i%list.length]:t;if(tg.dead){tg=foesOf(u)[0];if(!tg)return}
    const m=mz(u,i),tx=tg.x,ty=tg.y-tg.h*.35,a=Math.atan2(ty-m.y,tx-m.x);
    u.an={k:'shoot',t:.3,d:.3};
    if(A.k==='shell'){
      shots.push({k:'shell',x:m.x,y:m.y,tx,ty,a,dmg:dmg(),blast:A.blast*base*u.bl,team:u.team,freeze:A.freeze,burn:A.burn,col:A.col,by:u,sm:0,sz:u.bl});
      fx.push({k:'flash',x:m.x,y:m.y,t:0,life:.14,rot:a,s:u.bl,col:A.col});
      for(let j=0;j<4;j++)smoke(m.x,m.y,Math.cos(a)*base*rnd(1,3.5),Math.sin(a)*base*2-base*rnd(.4,1.4),base*rnd(.25,.5)*u.bl);
      sfx('cannon',.04);shake=Math.max(shake,2+u.s);
    }else if(A.k==='rocket'){
      shots.push({k:'rocket',x:m.x,y:m.y,vx:Math.cos(a)*base*4,vy:-base*rnd(5,8),a:-1.2,t:tg,tx,ty,life:3,dmg:dmg(),blast:A.blast*base*u.bl,team:u.team,by:u,sm:0,sz:u.bl});
      smoke(m.x,m.y,-u.face*base,-base*.5,base*.3);sfx('rocket',.04);
    }else{
      shots.push({k:'bullet',x:m.x,y:m.y,t:tg,tx,ty,a,dmg:dmg(),team:u.team,plasma:A.plasma,blast:(A.blast||0)*base*u.bl,col:A.col,by:u,sz:u.bl});
      fx.push({k:'flash',x:m.x,y:m.y,t:0,life:.08,rot:a,s:u.bl*.5,col:A.col});sfx(A.plasma?'plasma':'shot',.03);
      if(!A.plasma)fx.push({k:'scrap',x:m.x,y:m.y,vx:-u.face*base*rnd(1,3),vy:-base*rnd(3,6),rot:0,vr:rnd(-12,12),t:0,life:.5,s:base*.14,col:'#e0a800'});
    }
  });
}
function healRay(u,t){fx.push({k:'healray',x:u.x,y:u.y-u.h*.6,x2:t.x,y2:t.y-t.h*.5,t:0,life:.3});fx.push({k:'plus',x:t.x,y:t.y-t.h,t:0,life:.7});sfx('heal',.15)}
function healer(u,foes,dt){
  const A=u.D.atks[0],mates=units.filter(o=>o.team===u.team&&o!==u&&!o.dead);
  if(!mates.some(m=>!isHealer(m.D)))return false;
  let t=null,best=1,bd=1e9;
  for(const m of mates){const q=m.hp/m.max;if(q<best-.001){best=q;t=m}}
  if(!t)for(const m of mates){if(isHealer(m.D))continue;const d=Math.hypot(m.x-u.x,m.y-u.y);if(d<bd){bd=d;t=m}}
  if(!t)return true;
  const dx=t.x-u.x,dy=t.y-u.y,d=Math.hypot(dx,dy)||1;if(Math.abs(dx)>2)u.face=dx>0?1:-1;
  if(d>A.range*base*u.rg)step(u,dx,dy,d,1,dt);
  else if(t.hp<t.max&&u.cds[0]<=0){u.cds[0]=A.cd;t.hp=Math.min(t.max,t.hp+A.heal*u.dm);u.an={k:'scream',t:.3,d:.3};healRay(u,t)}
  return true;
}
function healTry(u,A,i){
  let t=null,best=.999;
  for(const m of units){if(m.dead||m.team!==u.team||m===u)continue;const q=m.hp/m.max;if(q<best&&Math.hypot(m.x-u.x,m.y-u.y)<A.range*base*u.rg){best=q;t=m}}
  if(!t&&u.hp<u.max*.8)t=u;
  if(!t)return;u.cds[i]=A.cd;t.hp=Math.min(t.max,t.hp+A.heal*u.dm);healRay(u,t);
}
function update(dt){
  blotCd=Math.max(0,blotCd-dt);
  if(gq.length){for(const a of gq)a.t-=dt;const due=gq.filter(a=>a.t<=0);gq=gq.filter(a=>a.t>0);due.forEach(a=>a.fn())}
  const live=units.filter(u=>!u.dead);
  // аура короля
  for(const u of live)u.buff=1;
  for(const k of live)if(k.D.aura){const r=k.D.aura*base*k.rg;for(const o of live)if(o!==k&&o.team===k.team&&Math.hypot(o.x-k.x,o.y-k.y)<r)o.buff=1.3}
  for(const u of live){
    if(u.dead)continue;
    if(u.supT>0){u.supT-=dt;u.buff*=1.5;if(Math.random()<dt*10)spark(u.x+rnd(-.5,.5)*u.w,u.y-u.h*rnd(.2,.9),rnd(-1,1))}
    else if(u.sup>=1){u.supFull+=dt;if(u.supFull>5)fireSuper(u)}
    const D=u.D,hpR=u.hp/u.max;let AT=D.atks,rate=(D.as||1)*(u.supT>0?2.5:1),sm=1;
    if(D.enrage&&hpR<.5){rate*=1.8;sm=1.3;u.rage=true;if(Math.random()<dt*7)smoke(u.x+rnd(-.3,.3)*u.w,u.y-u.h*.9,0,-base*1.6,base*.2,'#e2574a')}
    if(D.berserk){rate*=1/(.45+.55*hpR);sm=1.5-.5*hpR}
    if(u.slowT>0){u.slowT-=dt;rate*=.55}
    const tk=dt*rate;for(let i=0;i<u.cds.length;i++)u.cds[i]-=tk;u.scrT-=dt;u.chT-=dt;
    if(u.walking&&Math.random()<dt*(D.veh?5:3))smoke(u.x-u.face*u.r*(D.veh?.9:.3),u.y-(D.veh?u.h*.25:1),-u.face*base*.6,-base*.4,base*(D.veh?.16:.11),D.veh?'#8d8d96':'#cfc9bb');
    u.walking=false;
    if(u.dmgAcc>=1){u.dmgT-=dt;if(u.dmgT<=0){fx.push({k:'num',text:'−'+Math.round(u.dmgAcc),x:u.x+rnd(-.3,.3)*u.r,y:u.y-u.h*.9,vx:0,vy:-base*1.6,t:0,life:.8});u.dmgAcc=0;u.dmgT=.4}}
    if(u.q.length){for(const a of u.q)a.t-=dt;const due=u.q.filter(a=>a.t<=0);u.q=u.q.filter(a=>a.t>0);for(const a of due)if(!u.dead)a.fn()}
    if(u.dead)continue;
    if(u.liftT>0){
      u.liftT-=dt;const b=u.liftBy;
      if(u.liftV){
        if(!b||b.dead){u.liftT=0;u.liftV=false}
        else{
          const k=liftUp(u),lx=b.x+b.face*(b.r+u.r)*.9,k2=liftDown(u);
          u.x=u.lx0+(b.x-u.lx0)*k+(lx-b.x)*k2;u.y=u.ly0+(b.y+1-u.ly0)*k;
          if(u.liftT<=0){
          u.liftV=false;u.x=lx;fit(u);const dm=u.liftDmg;
          hurt(u,dm,b.x,b.y,.5,false,b);word('ШМЯК!',u.x,u.y-u.h*.3,1.3);
          foesOf(b).forEach(o=>{if(o!==u&&!o.dead&&Math.hypot(o.x-u.x,o.y-u.y)<base*2.2)hurt(o,dm*.4,u.x,u.y,.5,false,b)});
          for(let j=0;j<5;j++)smoke(u.x+rnd(-1,1)*u.r,u.y,rnd(-1,1)*base,-base*rnd(.3,1),base*rnd(.3,.6),'rgba(120,120,130,.5)');
        }}
      }
      if(u.liftT>0)continue;
    }
    u.glueT-=dt;if(u.holdT>0){u.holdT-=dt;continue}
    if(!u.saidLow&&hpR<.35){u.saidLow=true;say(u,'low')}
    if(u.fearT>0){u.fearT-=dt;const dx=u.x-u.fx,dy=u.y-u.fy,d=Math.hypot(dx,dy)||1;step(u,dx,dy,d,1.3,dt);u.face=dx>0?1:-1;continue}
    const foes=foesOf(u);if(!foes.length)continue;
    if(isHealer(D)){if(healer(u,foes,dt))continue;AT=HEALLIST}
    u.tgT-=dt;if(!u.tg||u.tg.dead||u.tgT<=0){u.tg=choose(u,foes);u.tgT=.6}
    const t=u.tg,dx=t.x-u.x,dy=t.y-u.y,d=Math.hypot(dx,dy)||1;if(Math.abs(dx)>2)u.face=dx>0?1:-1;
    const reach=u.r+t.r*.8+base*.2;
    if(u.busy>0){u.busy-=dt;continue}
    if(D.scream&&u.scrT<=0&&d<D.scream.r*base*u.rg){
      const S=D.scream;u.scrT=S.cd;u.busy=.5;u.an={k:'scream',t:.7,d:.7};
      fx.push({k:'ring',x:u.x,y:u.y-u.h*.6,t:0,life:.5,r:S.r*base*u.rg});word('А-А-А-А!',u.x,u.y-u.h*1.1,1.4);sfx('scream');
      foes.forEach(o=>{if(Math.hypot(o.x-u.x,o.y-u.y)<S.r*base*u.rg+o.r*.5){hurt(o,S.dmg*u.dm,u.x,u.y,.3,true,u);if(!o.D.heavy&&!o.dead){o.fearT=S.fear;o.fx=u.x;o.fy=u.y;o.dash=0}}});
      continue;
    }
    if(D.charge){
      const C=D.charge;
      if(u.dash>0){
        u.dash-=dt;step(u,dx,dy,d,3.4,dt);if(Math.random()<dt*22)smoke(u.x-u.face*u.w*.3,u.y-2,0,-base*.4,base*.16);
        if(d<=reach){u.dash=0;hurt(t,C.dmg*u.dm*u.buff,u.x,u.y,C.push,false,u);word('БАЦ!',t.x,t.y-t.h,1.3);shake=Math.max(shake,5);u.an={k:'melee',t:.25,d:.25,ax:dx/d,ay:dy/d,big:1}}
        continue;
      }
      if(u.chT<=0&&d>C.min*base&&d<C.max*base){u.chT=C.cd;u.dash=.9;sfx('dash');word('И-ГО-ГО!',u.x,u.y-u.h,1)}
    }
    // главная (первая) атака решает, где герой встаёт: вплотную или на расстоянии выстрела
    const main=AT[0],contact=!main.range,stop=contact?reach:main.range*base*u.rg+t.r*.5;
    if(d>stop)step(u,dx,dy,d,sm,dt);else if(!contact&&D.keep&&d<D.keep*base)step(u,-dx,-dy,d,.6,dt);
    for(let i=0;i<AT.length;i++){
      const A=AT[i];if(u.cds[i]>0||u.dead||u.busy>0)continue;
      if(A.k==='heal'){healTry(u,A,i);continue}
      if(A.range){if(d<=A.range*base*u.rg+t.r*.5)fire(u,t,A,foes,i);continue}
      if(A.k==='bomb'&&d<=reach*2.2&&Math.random()<dt*14)spark(u.x,u.y-u.h,rnd(-1,1));
      if(d>reach)continue;
      if(A.k==='bomb'){
        const rad=A.blast*base*u.bl;u.dead=true;u.deadT=0;u.exploded=true;
        explode(u.x,u.y-u.h*.3,rad,A.dmg*u.dm,u.team,{by:null});word('БА-БАХ!',u.x,u.y-u.h,1.5);
      }else if(A.k==='saw'){
        u.cds[i]=A.cd;u.sawT=.25;hurt(t,A.dmg*u.dm*u.buff,u.x,u.y,.02,true,u);const p=pt(u,A.at||SAW_AT);for(let j=0;j<2;j++)spark(p.x,p.y,u.face);sfx('saw',.12);if(Math.random()<.04)word('ВЖЖЖ!',t.x,t.y-t.h,1);
      }else melee(u,t,A,foes,reach,i);
    }
  }
  // расталкивание
  for(let i=0;i<live.length;i++)for(let j=i+1;j<live.length;j++){
    const a=live[i],b=live[j];if(a.dead||b.dead||a.liftV||b.liftV)continue; // поднятого над головой не расталкиваем
    const dx=b.x-a.x,dy=b.y-a.y,d=Math.hypot(dx,dy)||.01,m=(a.r+b.r)*.8;
    if(d<m){const k=(m-d)/d,wa=a.D.heavy?.1:b.D.heavy?.9:b.r/(a.r+b.r),wb=1-wa;a.x-=dx*k*wa;a.y-=dy*k*wa;b.x+=dx*k*wb;b.y+=dy*k*wb}
  }
  // предметы на листе: камень не пускает, клей тормозит, костёр жжёт
  propTick-=dt;const burn=propTick<=0;if(burn)propTick=.3;
  for(const q of props){
    const R=propR(q);
    for(const u of live){
      if(u.dead)continue;const dx=u.x-q.x,dy=u.y-q.y,d=Math.hypot(dx,dy)||.01;
      if(q.kind==='rock'){const m=R+u.r*.7;if(d<m){const k=(m-d)/d;u.x+=dx*k-dy/d*base*dt*2;u.y+=dy*k+dx/d*base*dt*2}}
      else if(d<R+u.r*.4){
        if(q.kind==='glue')u.glueT=.2;
        else if(burn){hurt(u,5,q.x,q.y,0,true);fx.push({k:'flame',x:u.x+rnd(-.4,.4)*u.r,y:u.y-u.h*rnd(.2,.6),vx:0,vy:-base*2,t:0,life:.4,r:base*.22})}
      }
    }
    if(q.kind==='fire'&&Math.random()<dt*14)fx.push({k:'flame',x:q.x+rnd(-1,1)*R*.5,y:q.y-R*rnd(.1,.5),vx:0,vy:-base*2.4,t:0,life:.5,r:base*.28*q.s});
  }
  for(const u of live)fit(u);
  // горящая земля
  for(const z of zones){
    z.t+=dt;z.tick-=dt;
    if(z.tick<=0){z.tick=.3;units.forEach(q=>{if(!q.dead&&q.team!==z.team&&Math.hypot(q.x-z.x,q.y-z.y)<z.r+q.r*.5){hurt(q,z.dps*.3,z.x,z.y,0,true);fx.push({k:'flame',x:q.x+rnd(-.4,.4)*q.r,y:q.y-q.h*rnd(.2,.7),vx:0,vy:-base*2,t:0,life:.4,r:base*.22})}})}
    if(Math.random()<dt*16)fx.push({k:'flame',x:z.x+rnd(-1,1)*z.r*.7,y:z.y+rnd(-.4,.3)*z.r*.5,vx:0,vy:-base*2,t:0,life:.45,r:base*.25});
  }
  zones=zones.filter(z=>z.t<z.life);
  // снаряды
  for(const s of shots){
    if(s.k==='shell'){
      const dx=s.tx-s.x,dy=s.ty-s.y,d=Math.hypot(dx,dy)||1,st=base*12*dt;
      s.sm-=dt;if(s.sm<=0){s.sm=.04;smoke(s.x,s.y,0,-base*.5,base*.16)}
      if(d<=st){explode(s.tx,s.ty,s.blast,s.dmg,s.team,s);s.done=true}else{s.x+=dx/d*st;s.y+=dy/d*st}
    }else if(s.k==='rocket'){
      s.life-=dt;const tg=s.t&&!s.t.dead?s.t:null;if(tg){s.tx=tg.x;s.ty=tg.y-tg.h*.4}
      const dx=s.tx-s.x,dy=s.ty-s.y,d=Math.hypot(dx,dy)||1,sp=base*11,k=Math.min(1,dt*3.5);
      s.vx+=(dx/d*sp-s.vx)*k;s.vy+=(dy/d*sp-s.vy)*k;s.x+=s.vx*dt;s.y+=s.vy*dt;s.a=Math.atan2(s.vy,s.vx);
      s.sm-=dt;if(s.sm<=0){s.sm=.035;smoke(s.x,s.y,0,-base*.3,base*.14)}
      if(d<base*.7+(tg?tg.r*.5:0)||s.life<=0){explode(s.x,s.y,s.blast,s.dmg,s.team,{by:s.by,small:1});s.done=true}
    }else{
      const tg=s.t&&!s.t.dead?s.t:null;if(tg){s.tx=tg.x;s.ty=tg.y-tg.h*.4}
      const dx=s.tx-s.x,dy=s.ty-s.y,d=Math.hypot(dx,dy)||1,st=base*(s.plasma?13:24)*dt;s.a=Math.atan2(dy,dx);
      const rock=props.find(q=>q.kind==='rock'&&Math.hypot(s.x-q.x,s.y-(q.y-propR(q)*.5))<propR(q)*.9);
      if(rock){spark(s.x,s.y,dx>0?-1:1);s.done=true;continue}
      if(d<=st+(tg?tg.r*.5:0)){
        if(s.plasma)explode(s.tx,s.ty,s.blast,s.dmg,s.team,{by:s.by,small:1,plasma:1});
        else if(tg){hurt(tg,s.dmg,s.x,s.y+tg.h*.4,.1,false,s.by);spark(s.tx,s.ty,dx>0?1:-1)}
        s.done=true;
      }else{s.x+=dx/d*st;s.y+=dy/d*st}
    }
  }
  shots=shots.filter(s=>!s.done);
  for(const u of units)if(u.dead&&!u.balled){u.balled=true;if(!u.exploded){
    const k=u.D.rem||'ball';
    if(k==='ghost')fx.push({k:'ghost',x:u.x,y:u.y-u.h*.5,vx:0,vy:-base*1.6,t:0,life:1.6,s:clamp(u.h*.22,base*.5,base*1.6),ph:u.phase});
    else if(k!=='none')balls.push({x:u.x,y:u.y,r:Math.min(u.r*.6,base*1.6),seed:u.seed,t:0,kind:k,img:u.D.img,w:u.w,h:u.h,face:u.item.custom?1:u.face,team:u.team});
  }}
  if(!ending){
    const n=[0,0];units.forEach(u=>{if(!u.dead)n[u.team]++});
    if(!n[0]||!n[1]){ending=true;endT=reduceMotion?.5:1.5;winner=n[0]?0:n[1]?1:-1}
  }
}
function finish(){
  const alive=units.filter(u=>!u.dead),m=S.set.mode;
  if(winner>=0)wins[winner]++;sfx(winner<0?'draw':'win');
  new Set(snapshot.map(q=>q.item.id)).forEach(id=>{if(id)stat(id).b++});
  new Set(alive.map(u=>u.item.id)).forEach(id=>{if(id)stat(id).w++});
  let title=winner<0?'Ничья!':'Победили '+TEAM_NAME[winner].toLowerCase()+'!',text=winner<0?'На листе никого не осталось':'Осталось героев: '+alive.length+'. Счёт '+wins[0]+' : '+wins[1],again='Ещё раз';
  if(m==='camp'){
    if(winner===0){
      const mn=snapshot.filter(q=>q.team===0).length,l0=alive.filter(u=>u.team===0).length,stn=l0>=mn*.66?3:l0>=mn*.33?2:1;(S.camp.stars=S.camp.stars||{})[camp.i]=Math.max(S.camp.stars[camp.i]||0,stn);
      const last=camp.i>=LEVELS.length-1;S.camp.level=Math.max(S.camp.level,Math.min(camp.i+1,LEVELS.length-1));if(last)S.camp.done=true;
      title=last?'Турнир пройден!':'Уровень пройден!';text=last?'Ты победил всех. Можно переиграть любой уровень из меню.':'Дальше: «'+LEVELS[camp.i+1].name+'»';again=last?'Ещё раз':'Дальше';camp.won=!last;
    }else{title='Не вышло';text='Попробуй другой состав, размер или приёмы в бою';camp.won=false}
  }
  if(m==='path'){const r=pathFinish(winner===0);title=r.title;text=r.text;again=r.again}
  saveState();
  // праздник или грусть на листе: штамп, конфетти, лучи; табличка с кнопками выезжает чуть позже
  const mine=snapshot.filter(q=>q.team===0).length,left0=alive.filter(u=>u.team===0).length;
  cele=m==='path'?(winner===0?{kind:'win',col:'#d49a00',text:'ПОБЕДА!'}:{kind:'lose',col:'#5d6470',text:'НЕ ВЫШЛО'}):m==='camp'?(winner===0?{kind:'win',col:'#d49a00',text:camp.i>=LEVELS.length-1?'ТУРНИР ПРОЙДЕН!':'УРОВЕНЬ ПРОЙДЕН!',stars:left0>=mine*.66?3:left0>=mine*.33?2:1}:{kind:'lose',col:'#5d6470',text:'НЕ ВЫШЛО'})
    :winner<0?{kind:'draw',col:'#8a7a3a',text:'НИЧЬЯ!'}:{kind:'win',col:TEAM_COL[winner],text:winner===0?'ПОБЕДА СИНИХ!':'ПОБЕДА КРАСНЫХ!'};
  let best=null;if(winner>=0&&(!solo()||winner===0))units.forEach(u=>{if(u.team===winner&&u.dmgDone>0&&(!best||u.dmgDone>best.dmgDone))best=u});
  cele.mvp=best?{item:best.item,team:best.team,dmg:Math.round(best.dmgDone),kills:best.kills}:null;
  cele.t=0;cele.team=winner;if(cele.kind==='lose')sfx('lose');
  $('bTitle').textContent=title;$('bText').textContent=text;$('again').textContent=again;$('replayBtn').hidden=rec.n<6;
  setState('over');$('banner').hidden=true;fx=fx.filter(f=>f.k!=='say');
  alive.slice(0,2).forEach(u=>say(u,'win'));
}

/* ---------- анимация и отрисовка ---------- */
const bump=p=>p<.15?p/.15:1-(p-.15)/.85;
const swing=p=>p<.25?.5*(p/.25):p<.55?.5-1.7*((p-.25)/.3):-1.2*(1-(p-.55)/.45);
function partAnim(P,u,t){
  const an=u.an,p=an?clamp(1-an.t/an.d,0,1):0,ph=u.phase;let dx=0,dy=0,rot=0,sx=1;
  switch(P.anim){
    case 'recoil':
      if(an&&an.k==='shoot')dx=-bump(p)*u.D.w*.07*(P.rd||1);
      else if(an&&an.k==='charge')dx=(-p*u.D.w*.03+(Math.random()-.5)*2)*(P.rd||1);
      break;
    case 'swing':
      rot=Math.sin(t*1.8+ph+P.px)*.05;
      if(u.liftT>0&&!u.liftV)rot=P.dir*(1.7*liftUp(u)*(1-liftDown(u))-.5*liftDown(u))+Math.sin(t*16)*.04;
      else if(u.fearT>0)rot=P.dir*1.3+Math.sin(t*30)*.12;
      else if(an&&an.k==='scream')rot=P.dir*2.1*Math.sin(p*Math.PI);
      else if(an&&an.k==='melee'&&(!an.part||an.part===P.id))rot=swing(p)*(P.rd||1);
      else if(state==='over'&&!u.dead)rot=P.dir*(1.6+Math.sin(t*9+ph)*.3);
      break;
    case 'wag':
      rot=Math.sin(t*5+ph)*.13;
      if(an&&an.k==='melee'&&an.part===P.id)rot=Math.sin(p*Math.PI)*1.5;
      break;
    case 'spin':rot=u.spin;break;
    case 'flick':sx=(u.walking?.9:.7)+.22*Math.sin(t*31+ph)+.1*Math.sin(t*17);break;
    case 'hop':
      dy=-Math.abs(Math.sin(t*3+ph))*2.5;
      if(an&&an.k==='shoot'){dy-=bump(p)*18;rot=bump(p)*.25}
      else if(an&&an.k==='charge')rot=(Math.random()-.5)*.1;
      break;
  }
  if(P.cus){ // части, обведённые в игре: свои углы и размах
    const A=P.amp,melee=an&&an.k==='melee';
    if(P.anim==='swing'||P.anim==='wag'){
      let n;
      if(P.anim==='swing'){
        n=Math.sin(t*1.8+ph+P.px)*.042;
        if(u.liftT>0&&!u.liftV)n=P.dir*(1.5*liftUp(u)*(1-liftDown(u))-.4*liftDown(u))+Math.sin(t*16)*.03;else if(u.fearT>0)n=P.dir*1.08+Math.sin(t*30)*.1;else if(an&&an.k==='scream')n=P.dir*1.75*Math.sin(p*Math.PI);else if(melee&&(!an.part||an.part===P.id))n=swing(p)/1.2;else if(state==='over'&&!u.dead)n=P.dir*(1.33+Math.sin(t*9+ph)*.25);
      }else{n=Math.sin(t*5+ph)*.087;if(melee&&(an.part?an.part===P.id:!P.bi))n=Math.sin(p*Math.PI)}
      rot=(n>=0?n*P.a1:-n*P.a0)*Math.PI/180;
    }else{dx*=A;dy*=A;rot*=A;sx=1+(sx-1)*A}
  }
  return{dx,dy,rot,sx};
}
function drawPart(P,u,t){
  if(!ready(P.img))return;const a=partAnim(P,u,t);
  ctx.save();ctx.translate(P.px+a.dx,P.py+a.dy);ctx.rotate(a.rot);ctx.scale(a.sx,1);ctx.drawImage(P.img,P.x-P.px,P.y-P.py);ctx.restore();
}
function drawUnit(u,t){
  const D=u.D,col=TEAM_COL[u.team],k=u.dead?clamp(u.deadT/.4,0,1):1;if(k<=0)return;
  const ga=(u===dragU&&dragOut?.35:1)*(u.dead?k:1);ctx.globalAlpha=ga;
  if(D.aura&&!u.dead&&state!=='setup'){
    ctx.strokeStyle='#e0a800';ctx.lineWidth=2;ctx.setLineDash([6,8]);ctx.lineDashOffset=-t*20;ctx.beginPath();ctx.ellipse(u.x,u.y,D.aura*base*u.rg,D.aura*base*u.rg*.55,0,0,7);ctx.stroke();ctx.setLineDash([]);
  }
  ctx.fillStyle=(u.slowT>0?'#8fd3ff':col)+'55';ctx.strokeStyle=col;ctx.lineWidth=2.2;ctx.beginPath();ctx.ellipse(u.x,u.y,u.r*1.05,Math.max(5,u.r*.34),0,0,7);ctx.fill();ctx.stroke();
  if(u===selU&&state==='setup'){ctx.strokeStyle=PENCIL;ctx.lineWidth=2;ctx.setLineDash([5,5]);ctx.lineDashOffset=-t*14;ctx.beginPath();ctx.ellipse(u.x,u.y,u.r*1.05+6,Math.max(5,u.r*.34)+5,0,0,7);ctx.stroke();ctx.setLineDash([])}
  if(u.buff>1&&!u.dead){ctx.fillStyle='#e0a800';ctx.font=`${base*.7}px Neucha,cursive`;ctx.textAlign='center';ctx.fillText('★',u.x-u.r,u.y+4)}
  let ox=0,oy=0,rot=0,sy=1,sxm=1;const an=u.an,p=an?clamp(1-an.t/an.d,0,1):0,ph=u.phase,live=!u.dead&&!reduceMotion;
  if(live){
    switch(D.idle){
      case 'rumble':oy+=Math.sin(t*38+ph)*.6;break;
      case 'angry':{const m=u.rage?2:1;oy+=Math.sin(t*50+ph)*.8*m;ox+=Math.sin(t*43+ph)*.6*m;break}
      case 'sway':rot+=Math.sin(t*1.6+ph)*.035;break;
      case 'breathe':sy*=1+Math.sin(t*2.2+ph)*.012;break;
      case 'hop':if(!u.walking)oy-=Math.pow(Math.max(0,Math.sin(t*4+ph)),2)*u.h*.05;break;
      case 'twitch':if(Math.sin(t*2.3+ph)>.8)rot+=Math.sin(t*60)*.03;sy*=1+Math.sin(t*3+ph)*.012;break;
      case 'proud':oy-=Math.abs(Math.sin(t*1.5+ph))*1.6;break;
      case 'float':oy-=u.h*.1+Math.sin(t*2.5+ph)*u.h*.04;rot+=Math.sin(t*1.3+ph)*.03;break;
      case 'wobble':{const q=Math.sin(t*6+ph)*.05;sy*=1+q;sxm=1-q;break}
      case 'stomp':if(u.walking){oy-=Math.abs(Math.sin(t*5+ph))*u.h*.07;sy*=1-.04*Math.pow(Math.abs(Math.cos(t*5+ph)),6)}break;
    }
    if(u.walking&&D.idle!=='stomp'&&D.idle!=='float'){if(D.veh)oy+=Math.sin(t*45+ph)*.7;else{oy-=Math.abs(Math.sin(t*9+ph))*u.h*.045;rot+=Math.sin(t*9+ph)*.05}}
    if(u.dash>0)rot+=.14;
    if(u.liftT>0){const k=liftUp(u),k2=liftDown(u);if(u.liftV&&u.liftBy){oy-=u.liftBy.h*.95*k*(1-k2);rot+=Math.sin(t*22+ph)*.1*k+k2*1.2*u.liftBy.face*u.face}else{sy*=1+.07*k*(1-k2)-.1*k2;rot+=Math.sin(t*14)*.025*k}}
    if(u.sawT>0){ox+=(Math.random()-.5)*2;rot+=.05}
    if(state==='over')oy-=Math.abs(Math.sin(t*7+ph))*u.h*.12;
    if(an){
      if(an.k==='shoot'){if(D.veh)ox-=u.face*bump(p)*u.w*.035;else rot-=bump(p)*.06}
      else if(an.k==='melee'){const a=Math.sin(p*Math.PI)*u.r*(an.big?.8:.4);ox+=an.ax*a;oy+=an.ay*a;if(!D.parts.length||an.big)rot+=Math.sin(p*Math.PI)*.12}
      else if(an.k==='charge'){ox+=(Math.random()-.5)*1.5;sy*=1-.03*p}
      else if(an.k==='scream'){sy*=1+.07*Math.sin(p*Math.PI);ox+=(Math.random()-.5)*2}
    }
    if(u.hitT>0)ox+=(Math.random()-.5)*u.r*.2;
    if(u.fearT>0)ox+=Math.sin(t*40)*1.5;
  }
  const img=D.img;if(!ready(img)){ctx.globalAlpha=1;return}
  const sc=u.h/D.h,fl=u.item.custom?(u.item.face?u.face*u.item.face:1):u.face,sq=u.hitT>0?1.1:1;
  ctx.save();ctx.translate(u.x+ox,u.y+oy+u.h*.04);
  if(u.dead){ctx.translate(0,-u.h/2);ctx.rotate((1-k)*4);ctx.scale(k,k);ctx.translate(0,u.h/2)}
  ctx.rotate(rot*u.face);ctx.scale(fl*sq*sc*sxm,sy*sc/sq);ctx.translate(-D.w/2,-D.h);
  for(const P of D.parts)if(P.z==='back')drawPart(P,u,t);
  ctx.drawImage(img,0,0);
  for(const P of D.parts)if(P.z!=='back')drawPart(P,u,t);
  ctx.restore();
  const sawA=D.atks.find(a=>a.k==='saw');
  if(!u.dead&&sawA&&!D.parts.some(P=>P.anim==='spin')){ // пила для героев, у которых она не нарисована
    const p=pt(u,sawA.at||SAW_AT),R=clamp(u.h*.15,6,base*2);
    ctx.save();ctx.translate(p.x+ox,p.y+oy);ctx.rotate(u.spin);ctx.fillStyle='#c3c7cf';ctx.strokeStyle=PENCIL;ctx.lineWidth=1.6;ctx.lineJoin='round';ctx.beginPath();
    for(let i=0;i<20;i++){const a=i/20*6.283,r=i%2?R:R*.72;ctx.lineTo(Math.cos(a)*r,Math.sin(a)*r)}
    ctx.closePath();ctx.fill();ctx.stroke();ctx.fillStyle=PENCIL;ctx.beginPath();ctx.arc(0,0,R*.16,0,7);ctx.fill();ctx.restore();
  }
  if(!u.dead&&u.slowT>0){ctx.fillStyle='rgba(140,210,255,.3)';ctx.strokeStyle='#3aa0e8';ctx.lineWidth=1.6;rrect(u.x-u.w*.5,u.y-u.h,u.w,u.h*1.02,8);ctx.fill();ctx.stroke()}
  if(!u.dead){
    const top=u.y-u.h-6-(u.liftT>0&&u.liftV&&u.liftBy?u.liftBy.h*.95*liftUp(u)*(1-liftDown(u)):0);
    if(S.set.mode==='path'&&!preview){ctx.font=`${clamp(base*.8,13,20)}px Neucha,cursive`;ctx.textAlign='center';ctx.fillStyle=PENCIL;ctx.fillText(EL[elOf(u.item)].ico+' '+(u.item.lvl||1),u.x,u.y+clamp(base*.9,14,22))}
    if(u.slowT>0){ctx.strokeStyle='#3aa0e8';ctx.lineWidth=2;for(let i=0;i<3;i++){const sx=u.x+(i-1)*u.w*.3,syy=u.y-u.h*(.35+.25*((i*7)%3)/2)+Math.sin(t*3+i)*3;for(let j=0;j<3;j++){const a=j*1.047;ctx.beginPath();ctx.moveTo(sx-Math.cos(a)*5,syy-Math.sin(a)*5);ctx.lineTo(sx+Math.cos(a)*5,syy+Math.sin(a)*5);ctx.stroke()}}}
    if(u.holdT>0){
      const cx=u.x,cy=u.y-u.h*.55,z=clamp(u.h*.22,8,26);ctx.strokeStyle='#7d8590';ctx.lineWidth=3;ctx.lineCap='round';ctx.lineJoin='round';
      ctx.beginPath();ctx.moveTo(cx-z*.3,cy-z*.6);ctx.lineTo(cx-z*.3,cy+z*.7);ctx.quadraticCurveTo(cx,cy+z*1.1,cx+z*.3,cy+z*.7);ctx.lineTo(cx+z*.3,cy-z*.9);ctx.quadraticCurveTo(cx,cy-z*1.35,cx-z*.55,cy-z*.9);ctx.lineTo(cx-z*.55,cy+z*.9);ctx.stroke();
    }
    if(u.fearT>0){ctx.fillStyle=RED;ctx.font=`${base*1.1}px Neucha,cursive`;ctx.textAlign='center';ctx.fillText('!',u.x,top-2)}
    if(state==='battle'){
      if(u.supT>0||u.sup>=1){
        const pl=1+.12*Math.sin(t*10);ctx.strokeStyle=u.supT>0?'#ff8a1f':MARKER;ctx.lineWidth=u.supT>0?4:3;ctx.beginPath();ctx.ellipse(u.x,u.y,u.r*1.25*pl,Math.max(6,u.r*.42)*pl,0,0,7);ctx.stroke();
        if(u.supT<=0&&!preview&&(!solo()||u.team===0)){
          const z=clamp(base*.8,13,19),y=top-10-Math.abs(Math.sin(t*6))*6;ctx.font=`${z}px Neucha,"Comic Sans MS",cursive`;ctx.textAlign='center';ctx.lineJoin='round';
          ctx.lineWidth=z*.28;ctx.strokeStyle=PENCIL;ctx.strokeText('ТАП!',u.x,y);ctx.fillStyle=MARKER;ctx.fillText('ТАП!',u.x,y);
        }
      }else if(u.sup>.04){const bw=clamp(u.r*1.7,22,90);ctx.fillStyle='rgba(42,42,51,.25)';ctx.fillRect(u.x-bw/2,top+7,bw,3);ctx.fillStyle='#e0a800';ctx.fillRect(u.x-bw/2,top+7,bw*u.sup,3)}
    }
    if(state==='battle'&&u.hp<u.max){
      const bw=clamp(u.r*1.7,22,90),bx=u.x-bw/2;
      ctx.fillStyle='rgba(255,255,255,.85)';ctx.fillRect(bx,top,bw,5);ctx.fillStyle=col;ctx.fillRect(bx,top,bw*u.hp/u.max,5);ctx.strokeStyle=PENCIL;ctx.lineWidth=1.2;ctx.strokeRect(bx,top,bw,5);
    }
  }
  ctx.globalAlpha=1;
}
function drawBall(b){
  if(b.kind==='grave'){
    const k=clamp(b.t/.35,0,1),s=clamp(b.r*1.5,base*.6,base*1.7)*(1+.25*Math.sin(Math.min(1,k)*Math.PI)),R=rng(b.seed);
    ctx.save();ctx.translate(b.x,b.y);ctx.scale(1,k);ctx.rotate((R()-.5)*.14);
    ctx.fillStyle='rgba(42,42,51,.18)';ctx.beginPath();ctx.ellipse(0,0,s*.75,s*.2,0,0,7);ctx.fill();
    ctx.fillStyle='#cfd2d6';ctx.strokeStyle=PENCIL;ctx.lineWidth=2;ctx.lineJoin='round';
    ctx.beginPath();ctx.moveTo(-s*.45,0);ctx.lineTo(-s*.45,-s*.8);ctx.quadraticCurveTo(-s*.45,-s*1.3,0,-s*1.3);ctx.quadraticCurveTo(s*.45,-s*1.3,s*.45,-s*.8);ctx.lineTo(s*.45,0);ctx.closePath();ctx.fill();ctx.stroke();
    ctx.strokeStyle=TEAM_COL[b.team]||PENCIL;ctx.lineWidth=2.4;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(0,-s*1.05);ctx.lineTo(0,-s*.5);ctx.moveTo(-s*.2,-s*.85);ctx.lineTo(s*.2,-s*.85);ctx.stroke();
    ctx.strokeStyle='#4f9a4a';ctx.lineWidth=1.6;for(let i=0;i<5;i++){const x=(R()-.5)*s*1.3;ctx.beginPath();ctx.moveTo(x,2);ctx.lineTo(x+(R()-.5)*4,-s*.18-R()*4);ctx.stroke()}
    ctx.restore();return;
  }
  if(b.kind==='wreck'&&ready(b.img)){
    const k=clamp(b.t/.45,0,1),e=1-Math.pow(1-k,3),sc=b.h/b.img.height;
    ctx.save();ctx.translate(b.x,b.y);ctx.rotate(b.face*e*(b.w>b.h?.22:1.45));ctx.globalAlpha=1-.4*e;
    ctx.scale(b.face*sc,sc*(1-.12*e));ctx.drawImage(b.img,-b.img.width/2,-b.img.height);ctx.restore();
    ctx.save();ctx.strokeStyle=PENCIL;ctx.lineWidth=2;ctx.lineCap='round';ctx.globalAlpha=.7*e;const R=rng(b.seed);
    for(let i=0;i<4;i++){const x=b.x+(R()-.5)*b.w*.6,y=b.y-R()*b.h*.4;ctx.beginPath();ctx.moveTo(x-4,y-4);ctx.lineTo(x+4,y+4);ctx.moveTo(x+4,y-4);ctx.lineTo(x-4,y+4);ctx.stroke()}
    ctx.restore();return;
  }
  const R=rng(b.seed),k=clamp(b.t/.3,0,1),pts=ell(0,0,b.r,b.r*.85,9);
  ctx.save();ctx.translate(b.x,b.y-b.r*.4);ctx.scale(k,k);
  wobPath(ctx,pts,R,b.r*.5);ctx.fillStyle='#ece9df';ctx.fill();ctx.strokeStyle=PENCIL;ctx.lineWidth=1.8;ctx.stroke();
  ctx.lineWidth=1;ctx.globalAlpha=.6;
  for(let i=0;i<4;i++){ctx.beginPath();ctx.moveTo((R()-.5)*b.r,(R()-.5)*b.r);ctx.lineTo((R()-.5)*b.r*1.4,(R()-.5)*b.r*1.4);ctx.stroke()}
  ctx.restore();
}
function drawStain(s){
  const R=rng(s.seed),k=clamp(s.t/.15,0,1);
  ctx.save();ctx.translate(s.x,s.y);ctx.scale(k,k*.8);ctx.fillStyle=`rgba(${s.col},${s.a||.78})`;
  wobPath(ctx,ell(0,0,s.r,s.r,11),R,s.r*.45);ctx.fill();
  for(let i=0;i<8;i++){const a=R()*6.28,d=s.r*(1.1+R()*.7);ctx.beginPath();ctx.arc(Math.cos(a)*d,Math.sin(a)*d,s.r*(.06+R()*.12),0,7);ctx.fill()}
  ctx.restore();
}
function rrect(x,y,w,h,r){ctx.beginPath();ctx.moveTo(x+r,y);ctx.lineTo(x+w-r,y);ctx.quadraticCurveTo(x+w,y,x+w,y+r);ctx.lineTo(x+w,y+h-r);ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h);ctx.lineTo(x+r,y+h);ctx.quadraticCurveTo(x,y+h,x,y+h-r);ctx.lineTo(x,y+r);ctx.quadraticCurveTo(x,y,x+r,y);ctx.closePath()}
function drawFx(f){
  const p=f.t/f.life;ctx.save();
  if(f.k==='ghost'){
    const s=f.s;ctx.translate(f.x+Math.sin(f.t*5+f.ph)*s*.3,f.y);ctx.globalAlpha=(1-p)*.9;ctx.fillStyle='#fff';ctx.strokeStyle=PENCIL;ctx.lineWidth=1.8;ctx.lineJoin='round';
    ctx.beginPath();ctx.moveTo(-s*.6,s*.7);ctx.lineTo(-s*.6,-s*.2);ctx.quadraticCurveTo(-s*.6,-s,0,-s);ctx.quadraticCurveTo(s*.6,-s,s*.6,-s*.2);ctx.lineTo(s*.6,s*.7);
    for(let i=0;i<3;i++)ctx.quadraticCurveTo(s*(.5-i*.4),s*.4,s*(.2-i*.4),s*.7);ctx.closePath();ctx.fill();ctx.stroke();
    ctx.fillStyle=PENCIL;ctx.beginPath();ctx.arc(-s*.22,-s*.3,s*.1,0,7);ctx.arc(s*.22,-s*.3,s*.1,0,7);ctx.fill();ctx.beginPath();ctx.ellipse(0,s*.05,s*.1,s*.15,0,0,7);ctx.fill();
    ctx.restore();return;
  }
  if(f.k==='healray'){
    ctx.globalAlpha=1-p;ctx.strokeStyle='#2f9e44';ctx.lineWidth=4;ctx.lineCap='round';ctx.setLineDash([2,9]);ctx.lineDashOffset=-f.t*60;
    ctx.beginPath();ctx.moveTo(f.x,f.y);ctx.quadraticCurveTo((f.x+f.x2)/2,Math.min(f.y,f.y2)-base*1.5,f.x2,f.y2);ctx.stroke();ctx.setLineDash([]);ctx.restore();return;
  }
  if(f.k==='fist'){
    const x=f.x+(f.x2-f.x)*p,y=f.y+(f.y2-f.y)*p;ctx.translate(x,y);ctx.rotate(Math.atan2(f.y2-f.y,f.x2-f.x));
    ctx.strokeStyle=PENCIL;ctx.lineWidth=1.2;ctx.globalAlpha=.5;for(let i=-1;i<=1;i++){ctx.beginPath();ctx.moveTo(-f.s*1.2,i*f.s*.5);ctx.lineTo(-f.s*(2+p*2),i*f.s*.5);ctx.stroke()}
    ctx.globalAlpha=1;ctx.fillStyle='#ffe0bd';ctx.lineWidth=2;rrect(-f.s,-f.s*.8,f.s*2,f.s*1.6,f.s*.5);ctx.fill();ctx.stroke();
    ctx.lineWidth=1.3;for(let i=-1;i<=1;i++){ctx.beginPath();ctx.moveTo(f.s*.3,i*f.s*.4);ctx.lineTo(f.s*.9,i*f.s*.4);ctx.stroke()}
    ctx.restore();return;
  }
  if(f.k==='beam'||f.k==='laser'){
    ctx.lineCap='round';ctx.globalAlpha=f.k==='beam'?1-p*p:.9;
    const w=f.k==='beam'?f.w*2*(1-p*.6):5;
    ctx.strokeStyle=f.col;ctx.globalAlpha*=.45;ctx.lineWidth=w*1.8;ctx.beginPath();ctx.moveTo(f.x,f.y);ctx.lineTo(f.x2,f.y2);ctx.stroke();
    ctx.globalAlpha=f.k==='beam'?1-p*p:.95;ctx.lineWidth=w;ctx.stroke();
    ctx.strokeStyle='#fff';ctx.lineWidth=Math.max(1.5,w*.35);ctx.stroke();
    ctx.restore();return;
  }
  if(f.k==='glow'){const m=mz(f.u,f.i);f.x=m.x;f.y=m.y}
  if(f.k==='say'){
    const u=f.u;if(u.dead){ctx.restore();return}
    const fs=clamp(base*.68,13,17);ctx.font=`${fs}px Neucha,"Comic Sans MS",cursive`;
    const tw=ctx.measureText(f.text).width+14,bh=fs+10,x=clamp(u.x,tw/2+4,W-tw/2-4),y=Math.max(bh+4,u.y-u.h-16);
    const s=Math.min(1,f.t*8);ctx.globalAlpha=p>.85?(1-p)/.15:1;
    ctx.translate(x,y);ctx.scale(s,s);
    ctx.fillStyle='#fff';ctx.strokeStyle=PENCIL;ctx.lineWidth=1.8;rrect(-tw/2,-bh,tw,bh,7);ctx.fill();ctx.stroke();
    ctx.beginPath();ctx.moveTo(-5,-1);ctx.lineTo(clamp(u.x-x,-tw/2+8,tw/2-8),9);ctx.lineTo(5,-1);ctx.fillStyle='#fff';ctx.fill();ctx.stroke();
    ctx.fillStyle='#fff';ctx.fillRect(-6,-3,12,3);
    ctx.fillStyle=PENCIL;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(f.text,0,-bh/2+1);
    ctx.restore();return;
  }
  ctx.translate(f.x,f.y);
  if(f.k==='word'){
    const s=base*1.25*f.size*(.6+Math.min(1,p*4)*.5);
    ctx.rotate(f.rot);ctx.globalAlpha=p>.7?(1-p)/.3:1;
    ctx.font=`${s}px Neucha,"Comic Sans MS",cursive`;ctx.textAlign='center';ctx.lineJoin='round';
    ctx.lineWidth=s*.22;ctx.strokeStyle=PENCIL;ctx.strokeText(f.text,0,-p*base*.6);
    ctx.fillStyle=MARKER;ctx.fillText(f.text,0,-p*base*.6);
  }else if(f.k==='star'){
    ctx.rotate(f.rot);ctx.strokeStyle=PENCIL;ctx.lineWidth=2.2;ctx.lineCap='round';ctx.globalAlpha=1-p;
    for(let i=0;i<6;i++){const a=i/6*6.28,r0=base*(.3+p*.6),r1=base*(.6+p*.9);ctx.beginPath();ctx.moveTo(Math.cos(a)*r0,Math.sin(a)*r0);ctx.lineTo(Math.cos(a)*r1,Math.sin(a)*r1);ctx.stroke()}
  }else if(f.k==='plus'){
    ctx.globalAlpha=1-p;ctx.strokeStyle='#2f9e44';ctx.lineWidth=4;ctx.lineCap='round';const s=base*.35,y=-p*base;
    ctx.beginPath();ctx.moveTo(-s,y);ctx.lineTo(s,y);ctx.moveTo(0,y-s);ctx.lineTo(0,y+s);ctx.stroke();
  }else if(f.k==='boom'){
    ctx.globalAlpha=1-p;const R=rng(5);
    wobPath(ctx,ell(0,0,f.r*(.3+p*.7),f.r*(.3+p*.7),14),R,f.r*.3);ctx.fillStyle=f.col||'#ff8a1f';ctx.fill();ctx.strokeStyle=PENCIL;ctx.lineWidth=3;ctx.stroke();
    wobPath(ctx,ell(0,0,f.r*(.15+p*.4),f.r*(.15+p*.4),10),R,f.r*.2);ctx.fillStyle=f.col2||MARKER;ctx.fill();
  }else if(f.k==='smoke'){
    ctx.globalAlpha=(1-p)*.75;ctx.fillStyle=f.col||'#a3a3ad';ctx.strokeStyle=PENCIL;ctx.lineWidth=1.2;
    ctx.beginPath();ctx.arc(0,0,f.r*(1+p*1.6),0,7);ctx.fill();ctx.stroke();
  }else if(f.k==='flame'){
    ctx.globalAlpha=1-p*.8;ctx.fillStyle=p<.35?MARKER:p<.7?'#ff8a1f':RED;
    ctx.beginPath();ctx.arc(0,0,f.r*(1+p*1.2),0,7);ctx.fill();
  }else if(f.k==='flash'){
    const z=base*(f.s||1);ctx.rotate(f.rot);ctx.scale(1.7*(1-p*.3),1-p*.3);ctx.beginPath();
    for(let i=0;i<16;i++){const a=i/16*6.283,r=z*(i%2?.45:1);ctx.lineTo(Math.cos(a)*r+z*.5,Math.sin(a)*r)}
    ctx.closePath();ctx.fillStyle=f.col&&f.col!=='#ff5a1f'?'#fff':MARKER;ctx.fill();ctx.strokeStyle=f.col||'#ff8a1f';ctx.lineWidth=2.5;ctx.lineJoin='round';ctx.stroke();
  }else if(f.k==='slash'){
    ctx.rotate(f.rot);ctx.globalAlpha=1-p*p;ctx.strokeStyle='#b3261e';ctx.lineWidth=3.6;ctx.lineCap='round';
    const s=f.s*1.1,q=Math.min(1,p*4);
    for(let i=-1;i<=1;i++){ctx.beginPath();ctx.moveTo(-s*.8+i*s*.45,-s);ctx.quadraticCurveTo(i*s*.45+s*.2,-s*.1,-s*.8+i*s*.45+s*1.4*q,-s+s*2*q);ctx.stroke()}
  }else if(f.k==='chomp'){
    const s=f.s,gap=s*(1-Math.min(1,p*2.2))*.9;ctx.globalAlpha=p>.7?(1-p)/.3:1;ctx.fillStyle='#fff';ctx.strokeStyle=PENCIL;ctx.lineWidth=2;ctx.lineJoin='round';
    for(const d of[-1,1]){ctx.beginPath();ctx.moveTo(-s,d*(gap+s*.6));for(let i=0;i<=6;i++)ctx.lineTo(-s+i*s/3,d*(gap+(i%2?0:s*.45)));ctx.lineTo(s,d*(gap+s*.6));ctx.closePath();ctx.fill();ctx.stroke()}
  }else if(f.k==='arc'){
    ctx.globalAlpha=1-p;ctx.strokeStyle=PENCIL;ctx.lineWidth=4;ctx.lineCap='round';ctx.scale(1,.55);
    ctx.beginPath();ctx.arc(0,0,f.r*(.6+p*.4),p*6-1.5,p*6+1.2);ctx.stroke();
  }else if(f.k==='ring'){
    ctx.globalAlpha=1-p;ctx.strokeStyle=PENCIL;ctx.lineWidth=3;ctx.setLineDash([9,11]);
    for(let i=0;i<2;i++){ctx.beginPath();ctx.arc(0,0,f.r*Math.max(.05,p-i*.25),0,7);ctx.stroke()}
    ctx.setLineDash([]);
  }else if(f.k==='glow'){
    const r=base*(.3+p*.9);ctx.globalAlpha=.35;ctx.fillStyle=f.col;ctx.beginPath();ctx.arc(0,0,r*1.6,0,7);ctx.fill();
    ctx.globalAlpha=.95;ctx.beginPath();ctx.arc(0,0,r*.8,0,7);ctx.fill();ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(0,0,r*.4,0,7);ctx.fill();
  }else if(f.k==='spark'){
    ctx.globalAlpha=1-p;ctx.strokeStyle='#ff9d1f';ctx.lineWidth=2.2;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(-f.vx*.035,-f.vy*.035);ctx.stroke();
  }else if(f.k==='num'){
    const z=clamp(base*.75,12,18);ctx.globalAlpha=p>.6?(1-p)/.4:1;ctx.font=`${z}px Neucha,"Comic Sans MS",cursive`;ctx.textAlign='center';ctx.lineJoin='round';
    ctx.lineWidth=3;ctx.strokeStyle='#fff';ctx.strokeText(f.text,0,0);ctx.fillStyle=RED;ctx.fillText(f.text,0,0);
  }else if(f.k==='scrap'){
    ctx.rotate(f.rot);ctx.globalAlpha=p>.7?(1-p)/.3:1;ctx.fillStyle=f.col||'#f4f1e8';ctx.strokeStyle=PENCIL;ctx.lineWidth=1;
    ctx.beginPath();ctx.moveTo(-f.s,-f.s*.6);ctx.lineTo(f.s*.8,-f.s*.8);ctx.lineTo(f.s,f.s*.5);ctx.lineTo(-f.s*.7,f.s*.7);ctx.closePath();ctx.fill();ctx.stroke();
  }else if(f.k==='wave'){
    ctx.globalAlpha=(1-p)*.8;ctx.strokeStyle=PENCIL;ctx.lineWidth=3*(1-p)+1;ctx.beginPath();ctx.ellipse(0,0,f.r*(.3+p*.7),f.r*(.3+p*.7)*.5,0,0,7);ctx.stroke();
  }else if(f.k==='conf'){
    ctx.rotate(f.rot);ctx.scale(1,Math.cos(f.t*7+f.rot));ctx.globalAlpha=p>.85?(1-p)/.15:1;ctx.fillStyle=f.col;ctx.strokeStyle='rgba(42,42,51,.55)';ctx.lineWidth=1;
    ctx.fillRect(-f.s,-f.s*.55,f.s*2,f.s*1.1);ctx.strokeRect(-f.s,-f.s*.55,f.s*2,f.s*1.1);
  }else if(f.k==='rain'){
    ctx.globalAlpha=(1-p)*.7;ctx.strokeStyle='#4c79e0';ctx.lineWidth=2;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(f.vx*.03,f.vy*.03);ctx.stroke();
  }else if(f.k==='snow'){
    ctx.globalAlpha=1-p;ctx.strokeStyle='#3aa0e8';ctx.lineWidth=1.8;for(let j=0;j<3;j++){const a=j*1.047+p*2;ctx.beginPath();ctx.moveTo(-Math.cos(a)*5,-Math.sin(a)*5);ctx.lineTo(Math.cos(a)*5,Math.sin(a)*5);ctx.stroke()}
  }
  ctx.restore();
}
function drawShot(s){
  ctx.save();ctx.translate(s.x,s.y);ctx.rotate(s.a);ctx.strokeStyle=PENCIL;ctx.lineCap='round';const z=base*(s.sz||1);
  if(s.k==='shell'){ctx.fillStyle=s.col||'#3d3d49';ctx.lineWidth=1.5;ctx.beginPath();ctx.ellipse(0,0,z*.34,z*.19,0,0,7);ctx.fill();ctx.stroke()}
  else if(s.k==='rocket'){
    ctx.fillStyle='#ff8a1f';ctx.beginPath();ctx.moveTo(-z*.45,-z*.1);ctx.lineTo(-z*(.75+Math.random()*.25),0);ctx.lineTo(-z*.45,z*.1);ctx.fill();
    ctx.fillStyle='#fff';ctx.lineWidth=1.5;ctx.beginPath();ctx.rect(-z*.45,-z*.13,z*.6,z*.26);ctx.fill();ctx.stroke();
    ctx.fillStyle=RED;ctx.beginPath();ctx.moveTo(z*.15,-z*.13);ctx.lineTo(z*.45,0);ctx.lineTo(z*.15,z*.13);ctx.closePath();ctx.fill();ctx.stroke();
  }else if(s.plasma){
    ctx.globalAlpha=.4;ctx.fillStyle=s.col;ctx.beginPath();ctx.arc(0,0,z*.42,0,7);ctx.fill();ctx.globalAlpha=1;ctx.beginPath();ctx.arc(0,0,z*.26,0,7);ctx.fill();ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(0,0,z*.11,0,7);ctx.fill();
  }else{ctx.lineWidth=2.6;ctx.beginPath();ctx.moveTo(-z*.55,0);ctx.lineTo(0,0);ctx.stroke();ctx.strokeStyle=MARKER;ctx.lineWidth=1.2;ctx.stroke()}
  ctx.restore();
}
function render(t){
  ctx.setTransform(DPR,0,0,DPR,0,0);ctx.globalAlpha=1;
  ctx.drawImage(bg,0,0,W,H);
  const fs=clamp(base*.9,15,24);ctx.font=`${fs}px Neucha,"Comic Sans MS",cursive`;ctx.textBaseline='alphabetic';
  if(!preview){
  const n=[0,0],pw=[0,0];units.forEach(u=>{if(!u.dead){n[u.team]++;pw[u.team]+=power(u.D,u.s)}});
  const md=S.set.mode,hid=state==='setup'&&md==='duel'&&duelPhase===1?0:-1,lim=md==='camp'?camp.budget:S.set.limit;
  const lab=i=>i===hid?TEAM_NAME[i]+': готовы':TEAM_NAME[i]+': '+n[i]+' · сила '+pw[i]+(lim&&(md!=='camp'||i===0)?' из '+lim:'')+(md!=='camp'&&wins[0]+wins[1]?' · побед '+wins[i]:'');
  const over=i=>!!lim&&i!==hid&&pw[i]>lim&&(md!=='camp'||i===0)&&state==='setup';
  const drawLab=(i,x,y,right)=>{
    const tx=lab(i)+(over(i)?' · ПРЕВЫШЕНИЕ':''),w=ctx.measureText(tx).width;ctx.textAlign=right?'right':'left';
    if(over(i)){ctx.globalAlpha=1;ctx.fillStyle=MARKER;ctx.fillRect(right?x-w-5:x-5,y-fs,w+10,fs*1.3)}
    ctx.globalAlpha=over(i)?1:.85;ctx.fillStyle=over(i)?'#b3261e':TEAM_COL[i];ctx.fillText(tx,x,y);
  };
  if(portrait){drawLab(1,10,fs+4);drawLab(0,10,H-10)}else{drawLab(0,10,fs+4);drawLab(1,W-10,fs+4,true)}
  ctx.globalAlpha=1;
  if(state==='setup'&&!units.length){
    ctx.fillStyle='rgba(42,42,51,.55)';ctx.textAlign='center';ctx.font=`${fs*1.2}px Neucha,"Comic Sans MS",cursive`;
    ctx.fillText('Перетащи сюда героев',W/2,H/2-fs);
  }
  }
  ctx.save();if(shake>.3&&!reduceMotion)ctx.translate((Math.random()-.5)*shake,(Math.random()-.5)*shake);
  stains.forEach(drawStain);
  for(const z of zones){ctx.globalAlpha=.25*Math.min(1,(z.life-z.t)*2);ctx.fillStyle='#ff5a1f';ctx.beginPath();ctx.ellipse(z.x,z.y,z.r,z.r*.55,0,0,7);ctx.fill();ctx.globalAlpha=1}
  balls.forEach(drawBall);
  const hideT=!preview&&state==='setup'&&S.set.mode==='duel'&&duelPhase===1?0:-1,list=units.filter(u=>u.team!==hideT);
  for(const q of props){if(q.kind==='rock')list.push(q);else drawProp(q,t)}
  list.sort((a,b)=>a.y-b.y).forEach(o=>o.kind?drawProp(o,t):drawUnit(o,t));
  shots.forEach(drawShot);
  fx.forEach(drawFx);ctx.restore();
  if(!preview)drawOverlay(t);
}
function drawProp(q,t){
  const R=propR(q),rr=rng(q.seed);ctx.save();ctx.translate(q.x,q.y);ctx.lineJoin='round';ctx.strokeStyle=PENCIL;
  if(q.kind==='rock'){
    ctx.fillStyle='rgba(42,42,51,.16)';ctx.beginPath();ctx.ellipse(0,0,R*1.05,R*.3,0,0,7);ctx.fill();
    wobPath(ctx,ell(0,-R*.55,R,R*.7,9),rr,R*.35);ctx.fillStyle='#b9b4aa';ctx.fill();ctx.lineWidth=2.2;ctx.stroke();
    ctx.lineWidth=1.2;ctx.globalAlpha=.6;for(let i=0;i<3;i++){ctx.beginPath();ctx.moveTo((rr()-.5)*R,-R*(.2+rr()*.7));ctx.lineTo((rr()-.5)*R,-R*(.2+rr()*.7));ctx.stroke()}
  }else if(q.kind==='glue'){
    ctx.scale(1,.55);wobPath(ctx,ell(0,0,R,R,11),rr,R*.4);ctx.fillStyle='rgba(255,224,130,.75)';ctx.fill();ctx.lineWidth=1.8;ctx.stroke();
    ctx.fillStyle='rgba(255,255,255,.7)';ctx.beginPath();ctx.ellipse(-R*.3,-R*.3,R*.25,R*.12,-.4,0,7);ctx.fill();
  }else{
    ctx.fillStyle='rgba(60,40,30,.25)';ctx.beginPath();ctx.ellipse(0,0,R,R*.5,0,0,7);ctx.fill();
    ctx.lineWidth=R*.2;ctx.lineCap='round';ctx.strokeStyle='#8a5a2b';ctx.beginPath();ctx.moveTo(-R*.6,-R*.05);ctx.lineTo(R*.6,-R*.3);ctx.moveTo(R*.6,-R*.05);ctx.lineTo(-R*.6,-R*.3);ctx.stroke();
    const f=1+Math.sin(t*9+q.seed)*.08;ctx.strokeStyle=PENCIL;ctx.lineWidth=1.6;
    for(const [k,col] of [[1,'#ff8a1f'],[.55,MARKER]]){ctx.beginPath();ctx.moveTo(-R*.45*k,-R*.2);ctx.quadraticCurveTo(-R*.55*k,-R*.8*f*k,0,-R*1.5*f*k);ctx.quadraticCurveTo(R*.55*k,-R*.8*f*k,R*.45*k,-R*.2);ctx.closePath();ctx.fillStyle=col;ctx.fill();if(k===1)ctx.stroke()}
  }
  ctx.restore();
  if(q===selP&&state==='setup'){ctx.strokeStyle=PENCIL;ctx.lineWidth=2;ctx.setLineDash([5,5]);ctx.lineDashOffset=-t*14;ctx.beginPath();ctx.ellipse(q.x,q.y,R+6,R*.55+5,0,0,7);ctx.stroke();ctx.setLineDash([])}
}
function starPath(r){ctx.beginPath();for(let i=0;i<10;i++){const a=-Math.PI/2+i*Math.PI/5,q=i%2?r*.45:r;ctx.lineTo(Math.cos(a)*q,Math.sin(a)*q)}ctx.closePath()}
// финал боя: лучи и штамп для победы, серый дождь для поражения
function drawCele(t){
  const c=cele,k=c.t,cx=W/2,cy=H*.4;ctx.save();
  if(c.kind==='lose'){ctx.fillStyle='rgba(54,60,72,'+Math.min(.3,k*.5)+')';ctx.fillRect(0,0,W,H)}
  else{
    const R=Math.hypot(W,H),a0=k*.25,al=Math.min(1,k*2)*(c.kind==='win'?.16:.08);ctx.translate(cx,cy);ctx.fillStyle=c.col;ctx.globalAlpha=al;
    for(let i=0;i<12;i++){const a=a0+i*Math.PI/6;ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(Math.cos(a)*R,Math.sin(a)*R);ctx.lineTo(Math.cos(a+.2)*R,Math.sin(a+.2)*R);ctx.closePath();ctx.fill()}
    ctx.translate(-cx,-cy);ctx.globalAlpha=1;
  }
  // лучший боец: крупно под штампом
  if(c.mvp&&k>.8){
    const z=clamp((k-.8)/.3,0,1),D=c.mvp.item.D;
    if(!c.mu||c.mW!==W||c.mH!==H){const th=Math.min(H*.2,W*.42*D.h/D.w);c.mu=makeUnit(c.mvp.item,W/2,H*.7,c.mvp.team,th/(base*D.H));c.mu.x=W/2;c.mu.y=H*.7;c.mu.face=1;c.mW=W;c.mH=H}
    const u=c.mu,e=z*(1+.25*Math.sin(z*Math.PI)),f2=clamp(base*.8,14,19);
    ctx.fillStyle='rgba(255,212,59,.45)';ctx.beginPath();ctx.ellipse(u.x,u.y,u.r*1.9*z,Math.max(8,u.r*.6)*z,0,0,7);ctx.fill();
    ctx.save();ctx.translate(u.x,u.y);ctx.scale(e,e);ctx.translate(-u.x,-u.y);drawUnit(u,t);ctx.restore();
    const tx='Лучший боец: '+c.mvp.item.name+' · урон '+c.mvp.dmg+(c.mvp.kills?' · повержено '+c.mvp.kills:'');
    ctx.font=`${f2}px Neucha,"Comic Sans MS",cursive`;let tw2=ctx.measureText(tx).width;const tx2=tw2>W-24?c.mvp.item.name+' · урон '+c.mvp.dmg:tx;tw2=ctx.measureText(tx2).width;
    ctx.globalAlpha=z;ctx.fillStyle='#fff';ctx.strokeStyle=PENCIL;ctx.lineWidth=1.8;rrect(u.x-tw2/2-8,u.y+f2*.55,tw2+16,f2*1.5,7);ctx.fill();ctx.stroke();
    ctx.fillStyle=PENCIL;ctx.textAlign='center';ctx.fillText(tx2,u.x,u.y+f2*1.6);ctx.globalAlpha=1;
  }
  // штамп: падает сверху, шлёпает и чуть подпрыгивает
  const q=clamp(k/.34,0,1),sc=k<.34?3.2-2.2*q*q:1+.12*Math.max(0,Math.sin((k-.34)*14))*Math.exp(-(k-.34)*6);
  let fs=clamp(W/(c.text.length*.62),18,base*2.6);ctx.font=`${fs}px Neucha,"Comic Sans MS",cursive`;
  const tw=ctx.measureText(c.text).width,bw=tw+fs*1.1,bh=fs*1.75,droop=c.kind==='lose'?.1+Math.min(.08,k*.03):-.09;
  ctx.translate(cx,cy+(c.kind==='lose'?Math.min(base,k*base*.5):0));ctx.rotate(droop);ctx.scale(sc,sc);ctx.globalAlpha=Math.min(1,q*1.6);
  ctx.fillStyle='rgba(251,250,246,.9)';rrect(-bw/2,-bh/2,bw,bh,fs*.3);ctx.fill();
  ctx.strokeStyle=c.col;ctx.lineJoin='round';ctx.lineWidth=fs*.14;rrect(-bw/2,-bh/2,bw,bh,fs*.3);ctx.stroke();
  ctx.lineWidth=fs*.05;rrect(-bw/2+fs*.2,-bh/2+fs*.2,bw-fs*.4,bh-fs*.4,fs*.2);ctx.stroke();
  ctx.fillStyle=c.col;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(c.text,0,fs*.06);
  const R=rng(77);ctx.fillStyle='rgba(251,250,246,.75)';for(let i=0;i<46;i++)ctx.fillRect((R()-.5)*bw,(R()-.5)*bh,1+R()*2.5,1+R()*2); // потёртости штампа
  ctx.textBaseline='alphabetic';
  if(c.stars){
    for(let i=0;i<3;i++){
      const st=.9+i*.22,z=clamp((k-st)/.22,0,1);if(z<=0)continue;
      const r=fs*.55*(i<c.stars?1+.5*Math.sin(z*Math.PI):.8);ctx.save();ctx.translate((i-1)*fs*1.5,-bh/2-fs*.85);ctx.rotate((i-1)*.18+(1-z)*1.5);ctx.globalAlpha=z;
      starPath(r);ctx.fillStyle=i<c.stars?MARKER:'rgba(160,160,168,.5)';ctx.fill();ctx.strokeStyle=PENCIL;ctx.lineWidth=2;ctx.stroke();ctx.restore();
    }
  }
  ctx.restore();
}
// ширма для игры вдвоём, подпись уровня, пауза
function drawOverlay(t){
  const m=S.set.mode,fs=clamp(base*.9,15,24);
  if(state==='setup'&&m==='duel'){
    const hide=duelPhase===0?1:0;let x=0,y=0,w=W,h=H;
    if(portrait){h=H/2;y=hide===0?H/2:0}else{w=W/2;x=hide===0?0:W/2}
    ctx.save();ctx.beginPath();ctx.rect(x,y,w,h);ctx.clip();ctx.fillStyle=hide===0?'#dfe8f8':'#f8e3e0';ctx.fillRect(x,y,w,h);
    ctx.strokeStyle='rgba(42,42,51,.14)';ctx.lineWidth=3;for(let i=-H;i<W+H;i+=16){ctx.beginPath();ctx.moveTo(x+i,y);ctx.lineTo(x+i-h,y+h);ctx.stroke()}
    ctx.fillStyle=TEAM_COL[hide];ctx.textAlign='center';ctx.font=`${fs*1.3}px Neucha,"Comic Sans MS",cursive`;
    ctx.fillText(hide===0?'Синие уже расставились':'Красные ждут своей очереди',x+w/2,y+h/2);ctx.restore();
  }
  if((m==='camp'||m==='path')&&state==='setup'){
    ctx.fillStyle='rgba(42,42,51,.75)';ctx.textAlign='center';ctx.font=`${fs}px Neucha,"Comic Sans MS",cursive`;
    const tx=m==='path'?'Ступень '+(PS().rung+1):'Уровень '+(camp.i+1)+' · '+camp.name;
    if(portrait)ctx.fillText(tx,W/2,H/2-8);else{ctx.save();ctx.translate(W/2-8,H/2);ctx.rotate(-Math.PI/2);ctx.fillText(tx,0,0);ctx.restore()}
  }
  if(state==='over'&&cele)drawCele(t);
  if(state==='battle'&&paused){ctx.fillStyle='rgba(42,42,51,.6)';ctx.textAlign='center';ctx.font=`${fs*1.6}px Neucha,"Comic Sans MS",cursive`;ctx.fillText('ПАУЗА',W/2,H/2)}
}
let last=0;
function frame(ms){
  const real=Math.min(.033,(ms-last)/1000||0);last=ms;
  if(replay){playReplay(real);requestAnimationFrame(frame);return}
  const live=state==='battle'&&!preview,stop=live&&paused,fast=live&&speedMul>1&&!ending;
  const dt=stop?0:real*(ending&&state==='battle'&&!reduceMotion?.22:1)*(fast?speedMul:1);clock+=dt;
  if(preview){
    update(dt);pv.t+=real;
    if(ending||pv.t>18){pv.hold+=real;if(pv.hold>1.3||pv.t>18)pvStart()}
  }else if(state==='battle'&&!stop){
    if(fast){update(dt/2);update(dt/2)}else update(dt);
    $('blotbar').firstElementChild.style.width=(100-blotCd/BLOT_CD*100)+'%';
    if(ending){endT-=real;if(endT<=0)finish()}
  }
  for(const u of units){
    u.hitT-=dt;if(u.dead)u.deadT-=dt;if(u.an){u.an.t-=dt;if(u.an.t<=0)u.an=null}
    u.sawT-=dt;u.spin+=dt*(u.sawT>0?30:state==='battle'?6:2.5);
  }
  for(const f of fx){f.t+=dt;if(f.vx!==undefined){f.x+=f.vx*dt;f.y+=f.vy*dt;if(f.k==='spark'||f.k==='scrap')f.vy+=base*30*dt;if(f.k==='conf')f.vx+=Math.sin(f.t*5+f.rot)*base*9*dt;if(f.vr)f.rot+=f.vr*dt}}
  fx=fx.filter(f=>f.t<f.life);
  shake=Math.max(0,shake-real*22);
  for(const b of balls)b.t+=dt;for(const s of stains)s.t+=dt;
  if(cele&&state==='over'){
    const c=cele;c.t+=real;
    if(!c.hit&&c.t>.34){c.hit=true;shake=10;sfx('stamp');for(let i=0;i<14;i++){const a=Math.random()*6.283;fx.push({k:'smoke',x:W/2+Math.cos(a)*W*.3,y:H*.4+Math.sin(a)*base*2,vx:Math.cos(a)*base*5,vy:Math.sin(a)*base*3,t:0,life:.5,r:base*.25,col:c.col})}}
    if(c.kind!=='lose'&&c.t<(c.kind==='win'?3:1)&&fx.length<340&&Math.random()<real*(c.kind==='win'?55:18))
      fx.push({k:'conf',x:rnd(W),y:-8,vx:rnd(-1,1)*base*2,vy:base*rnd(4,9),rot:rnd(6.28),vr:rnd(-7,7),t:0,life:rnd(2.2,3.4),s:base*rnd(.2,.38),col:Math.random()<.55?c.col:pick([MARKER,'#fff','#2fa39a','#f06292'])});
    if(c.kind==='lose'&&fx.length<300&&Math.random()<real*40)fx.push({k:'rain',x:rnd(-.1,1.1)*W,y:-10,vx:-base*2,vy:base*rnd(16,22),t:0,life:rnd(.5,.9)});
    if(!c.shown&&c.t>1.5&&!replay){c.shown=true;const bn=$('banner');bn.hidden=false;bn.classList.remove('in');void bn.offsetWidth;bn.classList.add('in')}
  }
  render(clock);if(state==='battle'&&!preview&&!paused)record(real);requestAnimationFrame(frame);
}

/* ---------- свой рисунок ---------- */
/*CUTOUT*/
let rigNew=null,pendingSrc=null,an=null,keepA=null,man=null,tool=2,pendingRole='fighter',pendingFace=0,cutRaf=0,recutIt=null;
const dcv=$('dlgCv'),dctx=dcv.getContext('2d');
function finalKeep(){const k=new Uint8Array(keepA.length);for(let i=0;i<k.length;i++)k[i]=man[i]===1?1:man[i]===2?0:keepA[i];return k}
// вид редактора вырезания: увеличение и сдвиг (двумя пальцами, колесом или кнопками)
const CV={z:1,ox:0,oy:0,S:2};
function cvClamp(){CV.z=clamp(CV.z,1,8);CV.ox=clamp(CV.ox,0,an.w-an.w/CV.z);CV.oy=clamp(CV.oy,0,an.h-an.h/CV.z);$('zoomVal').textContent='×'+CV.z.toFixed(1)}
function cvZoom(z,ax,ay){ // ax, ay: точка рисунка, которая остаётся на месте
  if(!an)return;const k0=CV.z;if(ax===undefined){ax=CV.ox+an.w/k0/2;ay=CV.oy+an.h/k0/2}
  const fx=(ax-CV.ox)*k0,fy=(ay-CV.oy)*k0;CV.z=clamp(z,1,8);CV.ox=ax-fx/CV.z;CV.oy=ay-fy/CV.z;cvClamp();sched();
}
function drawCut(){
  const w=an.w,h=an.h,k=finalKeep(),id=new ImageData(w,h),o=id.data,p=an.px;
  for(let i=0;i<w*h;i++){o[i*4]=p[i*4];o[i*4+1]=p[i*4+1];o[i*4+2]=p[i*4+2];o[i*4+3]=k[i]?255:55}
  const t=mk(w,h);t.getContext('2d').putImageData(id,0,0);
  const m=CV.z*CV.S;dctx.setTransform(1,0,0,1,0,0);dctx.fillStyle='#c8a674';dctx.fillRect(0,0,dcv.width,dcv.height);
  dctx.setTransform(m,0,0,m,-CV.ox*m,-CV.oy*m);dctx.imageSmoothingEnabled=CV.z<3;dctx.drawImage(t,0,0);
  if(lasso&&lasso.length>1){dctx.strokeStyle='#2c6bd8';dctx.lineWidth=Math.max(2,w/160)/CV.z;dctx.setLineDash([w/60/CV.z,w/90/CV.z]);dctx.lineJoin='round';dctx.beginPath();lasso.forEach((q,i)=>i?dctx.lineTo(q.x,q.y):dctx.moveTo(q.x,q.y));dctx.stroke();dctx.setLineDash([])}
}
function recut(){keepA=autoMask(an,+$('dlgTol').value);drawCut()}
const sched=()=>{if(!cutRaf)cutRaf=requestAnimationFrame(()=>{cutRaf=0;if(an)drawCut()})};
function cpos(e){const r=dcv.getBoundingClientRect(),sc=Math.min(r.width/an.w,r.height/an.h);return{x:CV.ox+(e.clientX-r.left-(r.width-an.w*sc)/2)/sc/CV.z,y:CV.oy+(e.clientY-r.top-(r.height-an.h*sc)/2)/sc/CV.z}}
function dab(x,y){
  const R=+$('dlgBrush').value*an.w/300/CV.z,w=an.w,h=an.h;
  for(let yy=Math.max(0,Math.floor(y-R));yy<=Math.min(h-1,Math.ceil(y+R));yy++)for(let xx=Math.max(0,Math.floor(x-R));xx<=Math.min(w-1,Math.ceil(x+R));xx++)if((xx-x)*(xx-x)+(yy-y)*(yy-y)<=R*R)man[yy*w+xx]=tool;
}
let painting=false,lp=null,lasso=null,manBak=null,pinch=null;const ptrs=new Map();
dcv.addEventListener('pointerdown',e=>{
  if(!an)return;dcv.setPointerCapture(e.pointerId);ptrs.set(e.pointerId,e);
  if(ptrs.size===2){ // второй палец: это жест увеличения, начатый мазок отменяем
    if(painting&&manBak)man.set(manBak);painting=false;lasso=null;
    const [a,b]=[...ptrs.values()],mid={clientX:(a.clientX+b.clientX)/2,clientY:(a.clientY+b.clientY)/2},q=cpos(mid);
    pinch={d:Math.hypot(a.clientX-b.clientX,a.clientY-b.clientY)||1,z:CV.z,ax:q.x,ay:q.y};sched();return;
  }
  if(ptrs.size>2)return;
  painting=true;manBak=man.slice();lp=cpos(e);if(tool===3)lasso=[lp];else dab(lp.x,lp.y);sched();
});
dcv.addEventListener('pointermove',e=>{
  if(!an||!ptrs.has(e.pointerId))return;ptrs.set(e.pointerId,e);
  if(pinch&&ptrs.size>=2){
    const [a,b]=[...ptrs.values()],d=Math.hypot(a.clientX-b.clientX,a.clientY-b.clientY)||1,mid={clientX:(a.clientX+b.clientX)/2,clientY:(a.clientY+b.clientY)/2};
    CV.z=clamp(pinch.z*d/pinch.d,1,8);const r=dcv.getBoundingClientRect(),sc=Math.min(r.width/an.w,r.height/an.h);
    CV.ox=pinch.ax-(mid.clientX-r.left-(r.width-an.w*sc)/2)/sc/CV.z;CV.oy=pinch.ay-(mid.clientY-r.top-(r.height-an.h*sc)/2)/sc/CV.z;cvClamp();sched();return;
  }
  if(!painting)return;const p=cpos(e),d=Math.hypot(p.x-lp.x,p.y-lp.y),n=Math.max(1,Math.ceil(d*CV.z/2));
  if(tool===3){if(d>1.5/CV.z){lasso.push(p);lp=p;sched()}return}
  for(let i=1;i<=n;i++)dab(lp.x+(p.x-lp.x)*i/n,lp.y+(p.y-lp.y)*i/n);lp=p;sched();
});
const endPaint=e=>{
  ptrs.delete(e.pointerId);if(pinch){if(ptrs.size<2)pinch=null;painting=false;lasso=null;return}
  if(!painting)return;painting=false;
  if(lasso){ // всё, что снаружи обведённого контура, стираем
    if(lasso.length>8){
      const m=mk(an.w,an.h),g=m.getContext('2d');g.beginPath();lasso.forEach((q,i)=>i?g.lineTo(q.x,q.y):g.moveTo(q.x,q.y));g.closePath();g.fill();
      const a=g.getImageData(0,0,an.w,an.h).data;for(let i=0;i<man.length;i++)if(a[i*4+3]<128)man[i]=2;
    }
    lasso=null;sched();
  }
};
dcv.addEventListener('pointerup',endPaint);dcv.addEventListener('pointercancel',endPaint);
dcv.addEventListener('wheel',e=>{if(!an)return;e.preventDefault();const q=cpos(e);cvZoom(CV.z*(e.deltaY<0?1.25:.8),q.x,q.y)},{passive:false});
$('zoomIn').onclick=()=>cvZoom(CV.z*1.5);$('zoomOut').onclick=()=>cvZoom(CV.z/1.5);
function renderTool(){document.querySelectorAll('#dlgTool [data-tool]').forEach(b=>b.setAttribute('aria-pressed',+b.dataset.tool===tool?'true':'false'))}
document.querySelectorAll('#dlgTool [data-tool]').forEach(b=>b.onclick=()=>{tool=+b.dataset.tool;renderTool()});
$('dlgReset').onclick=()=>{if(man){man.fill(0);drawCut()}};
$('file').addEventListener('change',()=>{
  const f=$('file').files[0];$('file').value='';if(!f)return;
  const url=URL.createObjectURL(f),im=new Image();
  im.onload=()=>{pendingSrc=prepSource(im);URL.revokeObjectURL(url);recutIt=null;openDlg()};
  im.onerror=()=>{URL.revokeObjectURL(url);toast('Не получилось открыть картинку. Попробуй другое фото.')};
  im.src=url;
});
function openDlg(){
  an=analyze(pendingSrc);man=new Uint8Array(an.w*an.h);dcv.width=an.w*CV.S;dcv.height=an.h*CV.S;CV.z=1;CV.ox=CV.oy=0;ptrs.clear();pinch=null;cvClamp();tool=3;renderTool();
  $('dlgTol').value=recutIt?recutIt.tol||34:34;recut();
  $('dlgName').value=recutIt?recutIt.name0:'Герой '+(library.filter(i=>i.custom).length+1);
  pendingRole=recutIt?recutIt.role:'fighter';pendingFace=recutIt?recutIt.face:0;renderRoles();renderFace();
  const re=recutIt&&recutIt!==rigNew;$('dlgTitle').textContent=re?'Перевырезать героя':'Шаг 1: вырезать героя';$('dlgOk').textContent=re?'Сохранить':'Дальше';$('dlg').hidden=false;
}
// повторная правка: поднимаем исходное фото и прежнюю маску
function openRecut(it){
  if(!it.raw){toast('У этого героя не сохранилось исходное фото. Добавь его заново.');return}
  const im=new Image();
  im.onload=()=>{
    pendingSrc=mk(im.width,im.height);pendingSrc.getContext('2d',{willReadFrequently:true}).drawImage(im,0,0);recutIt=it;openDlg();
    if(it.mask){const mi=new Image();mi.onload=()=>{
      const c=mk(an.w,an.h),g=c.getContext('2d');g.drawImage(mi,0,0,an.w,an.h);const a=g.getImageData(0,0,an.w,an.h).data;
      for(let i=0;i<man.length;i++){const k=a[i*4+3]>127?1:0;man[i]=k===keepA[i]?0:k?1:2}drawCut();
    };mi.src=it.mask}
  };
  im.src=it.raw;
}
function maskURL(keep){
  const c=mk(an.w,an.h),g=c.getContext('2d'),id=g.createImageData(an.w,an.h);
  for(let i=0;i<keep.length;i++)id.data[i*4+3]=keep[i]?255:0;g.putImageData(id,0,0);return c.toDataURL('image/png');
}
$('dlgTol').addEventListener('input',recut);
function renderFace(){document.querySelectorAll('#dlgFace button').forEach(b=>b.setAttribute('aria-pressed',+b.dataset.face===pendingFace?'true':'false'))}
document.querySelectorAll('#dlgFace button').forEach(b=>b.onclick=()=>{pendingFace=+b.dataset.face;renderFace()});
function chips(box,opts,cur,set){
  box.textContent='';
  opts.forEach(([id,name])=>{const b=document.createElement('button');b.type='button';b.setAttribute('aria-pressed',id===cur?'true':'false');b.textContent=name;b.onclick=()=>set(id);box.append(b)});
}
function renderRoles(){
  chips($('dlgRoles'),Object.entries(ARCH).map(([k,v])=>[k,v.name]),pendingRole,v=>{pendingRole=v;renderRoles()});
  $('dlgDesc').textContent=ARCH[pendingRole].name+': '+ARCH[pendingRole].desc+'. Атаку и характер потом можно поменять в «Настроить».';
}
$('dlgCancel').onclick=()=>{$('dlg').hidden=true;an=pendingSrc=null;recutIt=null;rigNew=null};
$('dlgForm').addEventListener('submit',e=>{
  e.preventDefault();if(!an)return;
  const keep=finalKeep(),tol=+$('dlgTol').value,img=compose(an,keep,tol);if(!img){toast('От рисунка ничего не осталось. Верни часть кистью.');return}
  const name=($('dlgName').value.trim()||'Герой').slice(0,14),src=img.toDataURL('image/webp',.9),raw=pendingSrc.toDataURL('image/jpeg',.75),mask=maskURL(keep);
  let it=recutIt;
  if(it){Object.assign(it,{name0:name,role:pendingRole,face:pendingFace,base:customD(pendingRole,img),src,raw,mask,tol});buildD(it);(pv.save?pv.save.units:units).forEach(u=>{if(u.item===it){u.D=it.D;u.cds=u.D.atks.map(()=>.4);if(!preview)applySize(u)}})}
  else{it={id:'c-'+Date.now(),name0:name,role:pendingRole,face:pendingFace,base:customD(pendingRole,img),src,raw,mask,tol,custom:true,size:1,ov:null};{const sc=scanImg(img);it.ov={el:sc.el,cool:sc.cool};OV[it.id]=it.ov}buildD(it);rigNew=it}
  an=pendingSrc=null;$('dlg').hidden=true;saveCustom();cloudMark('h:'+it.id);renderLib();
  if(recutIt&&!$('ed').hidden){recutIt=null;selectEd(it)}recutIt=null;
  if(rigNew){edIt=rigNew;edOv=ovFor(rigNew);$('edName').value=rigNew.name0;rigOpen()} // следующий шаг: разметка, герой попадёт в набор после неё
});

/* ---------- настройка героев с живым показом ---------- */
let edIt=null,edOv=null,preview=false;const pv={save:null,t:0,hold:0,resize:false};
const pcv=$('edCv'),pctx=pcv.getContext('2d');
const OV0=()=>({pw:1,sp:1,as:1,size:1,atks:[],chr:'own',idle:'own',rem:'ball',name:'',parts:null,rv:2,muz:null,at:null,lines:{start:'',kill:'',low:'',win:''}});
const LKEYS=['start','kill','low','win'];
function ovFor(it){
  const o=Object.assign(OV0(),it.ov||{});if(!o.atks.length&&o.atk&&o.atk!=='own')o.atks=[o.atk];delete o.atk;o.atks=o.atks.slice();
  o.parts=(Array.isArray(o.parts)?o.parts:(it.base.rig||[])).slice();o.lines=Object.assign({start:'',kill:'',low:'',win:''},o.lines||{});return o;
}
const DUMMY=(()=>{
  const c=mk(110,150),g=c.getContext('2d'),R=rng(11);g.lineCap=g.lineJoin='round';
  g.strokeStyle=PENCIL;g.lineWidth=5;g.beginPath();g.moveTo(55,96);g.lineTo(55,146);g.moveTo(34,146);g.lineTo(76,146);g.stroke();
  [[46,'#fff'],[33,RED],[20,'#fff'],[8,RED]].forEach(([r,col])=>{wobPath(g,ell(55,52,r,r,12),R,3);g.fillStyle=col;g.fill();g.lineWidth=2.4;g.stroke()});
  return{custom:true,face:0,name:'Мишень',size:1,D:{name:'Мишень',tag:'',desc:'',H:2.4,w:110,h:150,img:c,parts:[],hp:230,speed:1,pw:5,idle:'breathe',atks:[{k:'melee',cd:.9,dmg:11,fx:'punch'}]}};
})();
function pvEnter(){
  preview=true;pv.save={units,balls,stains,fx,shots,zones,gq,W,H,base,portrait,state,ending,winner,bg,ctx,shake};
  ctx=pctx;state='battle';pvMeasure();
}
function pvMeasure(){
  const r=pcv.getBoundingClientRect();W=Math.max(120,Math.round(r.width));H=Math.max(80,Math.round(r.height));pcv.width=W*DPR;pcv.height=H*DPR;
  portrait=false;base=Math.max(10,Math.min(H*.1,W*.045));makePaper();
}
function pvStart(){
  if(!preview)return;resetField();pv.t=0;pv.hold=0;
  const ally=makeUnit(DUMMY,W*.07,H*.93,0,.8);ally.hp=ally.max*.45;
  units=[makeUnit(edIt,W*.2,H*.66,0,Math.min(edIt.size||1,2)),ally,makeUnit(DUMMY,W*.7,H*.5,1,.8),makeUnit(DUMMY,W*.84,H*.9,1,.8),makeUnit(DUMMY,W*.95,H*.62,1,.8)];
  gq.push({t:.3,fn:()=>say(units[0],'start')});
}
function pvExit(){
  if(!preview)return;
  ({units,balls,stains,fx,shots,zones,gq,W,H,base,portrait,state,ending,winner,bg,ctx,shake}=pv.save);
  preview=false;pv.save=null;units.forEach(applySize);
  if(pv.resize){pv.resize=false;resize()}
}
function openEd(it){$('ed').hidden=false;edIt=it;if(!preview)pvEnter();selectEd(it)}
function selectEd(it){
  edIt=it;edOv=ovFor(it);$('edName').value=edOv.name||it.name0;LKEYS.forEach(k=>{$('edL_'+k).value=edOv.lines[k]||''});
  edOv.size=it.size||1;$('edPw').value=edOv.pw;$('edSp').value=edOv.sp;$('edAs').value=edOv.as;$('edSz').value=edOv.size;$('edDel').hidden=!it.custom;renderStrip();renderEd();pvStart();
}
function renderStrip(){
  const box=$('edStrip');box.textContent='';
  library.forEach(it=>{
    const b=document.createElement('button');b.type='button';b.title=it.name;b.setAttribute('aria-label',it.name);b.setAttribute('aria-pressed',it===edIt?'true':'false');
    const im=document.createElement('img');im.src=it.src;im.alt='';b.append(im);b.onclick=()=>selectEd(it);box.append(b);
    if(it===edIt)requestAnimationFrame(()=>b.scrollIntoView({block:'nearest',inline:'center'}));
  });
}
function commitEd(){
  const nm=$('edName').value.trim().slice(0,14);edOv.name=nm&&nm!==edIt.name0?nm:'';
  edIt.ov=edOv;OV[edIt.id]=edOv;saveState()
  buildD(edIt);const main=pv.save?pv.save.units:units;main.forEach(u=>{if(u.item===edIt){u.D=edIt.D;u.cds=u.D.atks.map(()=>.4)}});
}
function renderEd(){
  const box=$('edAtk');box.textContent='';
  [['own','Свои']].concat(Object.entries(ATK).map(([k,v])=>[k,v.name])).forEach(([id,name])=>{
    const i=edOv.atks.indexOf(id),on=id==='own'?!edOv.atks.length:i>=0,b=document.createElement('button');b.type='button';b.setAttribute('aria-pressed',on?'true':'false');
    b.textContent=(i>=0?(i+1)+'. ':'')+name;
    b.onclick=()=>{
      if(id==='own')edOv.atks=[];else if(i>=0)edOv.atks.splice(i,1);else{if(edOv.atks.length>=3){toast('Не больше трёх атак. Сними одну, чтобы выбрать другую.');return}edOv.atks.push(id)}
      edChanged();
    };box.append(b);
  });
  chips($('edRem'),Object.entries(REMAINS),edOv.rem||'ball',v=>{edOv.rem=v;edChanged()});
  chips($('edMove'),[['own','Своё']].concat(Object.entries(MOVES)),edOv.idle,v=>{edOv.idle=v;edChanged()});
  chips($('edChr'),[['own','Свой']].concat(Object.entries(CHR).map(([k,v])=>[k,v.name])),edOv.chr,v=>{edOv.chr=v;edChanged()});
  const D=edIt.D;
  $('edPwVal').textContent='×'+(+edOv.pw).toFixed(1)+' · сила '+power(D,1);$('edSpVal').textContent='×'+(+edOv.sp).toFixed(1);$('edAsVal').textContent='×'+(+edOv.as).toFixed(1);$('edSzVal').textContent='×'+(+edOv.size).toFixed(1)+' · сила на листе '+power(D,edOv.size);
  const sv=S.stats[edIt.id];
  $('edDesc').textContent=D.tag[0].toUpperCase()+D.tag.slice(1)+'. '+D.desc+' Суперудар: '+SUPER[superKind(D)].toLowerCase()+'.'+(sv&&sv.b?' Боёв: '+sv.b+', побед: '+sv.w+', повержено врагов: '+sv.k+'.':'');
  $('edRecut').hidden=!(edIt.custom&&edIt.raw);renderSnd();$('edShare').hidden=!edIt.custom;$('edPub').hidden=!(edIt.custom&&!edIt.guest&&typeof gal!=='undefined'&&gal.api);
}
function edChanged(){commitEd();renderEd();pvStart()}
$('edPw').addEventListener('input',()=>{edOv.pw=+$('edPw').value;commitEd();renderEd()});
$('edSp').addEventListener('input',()=>{edOv.sp=+$('edSp').value;commitEd();renderEd()});
$('edAs').addEventListener('input',()=>{edOv.as=+$('edAs').value;commitEd();renderEd()});
$('edSz').addEventListener('input',()=>{edOv.size=+$('edSz').value;commitEd();renderEd()});$('edSz').addEventListener('change',pvStart);
$('edPw').addEventListener('change',pvStart);$('edSp').addEventListener('change',pvStart);$('edAs').addEventListener('change',pvStart);
$('edName').addEventListener('input',commitEd);
$('edReset').onclick=()=>{edOv=OV0();edOv.parts=(edIt.base.rig||[]).slice();LKEYS.forEach(k=>{$('edL_'+k).value=''});$('edName').value=edIt.name0;$('edPw').value=1;$('edSp').value=1;$('edAs').value=1;$('edSz').value=1;edIt.size=1;edChanged()};
$('edDel').onclick=()=>{
  const it=edIt;if(!it.custom)return;
  library.splice(library.indexOf(it),1);delete OV[it.id];if(pv.save)pv.save.units=pv.save.units.filter(u=>u.item!==it);
  if(selected===it)selected=null;if(selU&&selU.item===it)selU=null;S.deleted.push(it.id);saveCustom();saveState();cloudMark('h:'+it.id);selectEd(library[0]);
};
$('edForm').addEventListener('submit',e=>{e.preventDefault();commitEd();pvExit();$('ed').hidden=true;renderLib()});

/* ---------- кнопки ---------- */
let toastT=0;
function toast(msg,warn){const t=$('toast');t.textContent=msg;t.classList.toggle('warn',!!warn);t.classList.add('on');clearTimeout(toastT);toastT=setTimeout(()=>t.classList.remove('on'),warn?3200:2200)}
$('fight').onclick=()=>{if(state==='setup')startBattle();else if(state==='battle'){restore();if(S.set.mode==='duel')duelPhase=0;setState('setup')}};
$('clear').onclick=()=>{
  const m=S.set.mode;
  if(m==='duel')units=units.filter(u=>u.team!==duelPhase);else if(solo())units=units.filter(u=>u.locked);else{units=[];props=[]}
  selU=selP=null;renderInfo();
};
$('random').onclick=randomize;
$('again').onclick=()=>{if(S.set.mode==='path'){pathLoad(true);setState('setup')}else if(S.set.mode==='camp'&&camp.won){loadLevel(camp.i+1);setState('setup')}else begin()};
$('edit').onclick=()=>{if(S.set.mode==='path')pathLoad(true);else restore();if(S.set.mode==='duel')duelPhase=0;setState('setup')};
const sndBtn=$('snd');sndBtn.setAttribute('aria-pressed',muted?'false':'true');
sndBtn.onclick=()=>{muted=!muted;S.set.mute=muted;sndBtn.setAttribute('aria-pressed',muted?'false':'true');saveState();if(!muted)sfx('pop')};
function setPaper(p){
  paper=p;S.set.paper=p;document.querySelectorAll('.papers button').forEach(o=>o.setAttribute('aria-pressed',o.dataset.paper===p?'true':'false'));if(bg)makePaper();
}
document.querySelectorAll('.papers button').forEach(b=>b.onclick=()=>{setPaper(b.dataset.paper);saveState()});
/*EXTRAS*/
setPaper(paper);
renderLib();loadCustom();
resize();preset();applyMode(true);renderMenu();cloudInit();if(!S.set.tip)$('tip').hidden=false;
new ResizeObserver(resize).observe(stage);
requestAnimationFrame(frame);
