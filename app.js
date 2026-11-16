import {campaign,MILESTONES} from "./village-model.js";
import {villageView,mountVillage,stopVillage} from "./village.js";
import {MODES,dateKey,moveDay,DAY,fresh,dayEvents,dayStatus,counted,metrics,validate,migrate} from "./model.js";

const ICONS={
  wind:'<path d="M3 8h12a3 3 0 1 0-3-3M2 12h17a2.5 2.5 0 1 1-2.5 2.5M4 16h7a2.5 2.5 0 1 1-2.5 2.5"/>',
  soda:'<path d="m8 5 1-2h6l1 2M8 5h8l2 3v11a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V8zm-2 3h12m-12 9h12m-8-4h4"/>',
  drop:'<path d="M12 2c4 6 7 9 7 13a7 7 0 0 1-14 0c0-4 3-7 7-13zM8 15a4 4 0 0 0 4 4"/>',
  chart:'<path d="M4 4v16h16m-12-4v-4m4 4V8m4 8v-6"/>',
  settings:'<path d="M5 5h14M5 12h14M5 19h14"/><circle fill="currentColor" cx="9" cy="5" r="2"/><circle fill="currentColor" cx="15" cy="12" r="2"/><circle fill="currentColor" cx="10" cy="19" r="2"/>',
  plus:'<path d="M12 5v14M5 12h14"/>',check:'<path d="m5 12 4 4L19 6"/>',
  arrow:'<path d="M5 12h14m-6-6 6 6-6 6"/>', back:'<path d="M19 12H5m6-6-6 6 6 6"/>',
  pause:'<path d="M9 5v14m6-14v14"/>',x:'<path d="m6 6 12 12M6 18 18 6"/>',
  history:'<path d="M3 12a9 9 0 1 0 2.6-6.4L3 8m0-5v5h5m4 0v5l3 2"/>',
  diamond:'<path d="M12 2 22 12 12 22 2 12zm0 6 4 4-4 4-4-4z"/>'
};
const icon=(id)=>'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+ICONS[id]+'</svg>';
const TEXT={
  vape:{name:"Вейп",icon:"wind",title:"Без вейпа.",counter:"Текущая серия",confirm:"День без вейпа",use:"Были затяжки",quantity:"Затяжек",units:"зат.",image:"breath"},
  soda:{name:"Газировка",icon:"soda",title:"Без газировки.",counter:"Текущая серия",confirm:"День без газировки",use:"Выпил газировку",quantity:"Порций",units:"порц.",image:"citrus"},
  water:{name:"Вода",icon:"drop",title:"Вода.",counter:"Выпито сегодня",image:"water"}
};
const KEY="ritm.events.v1";
const MODE_KEY="ritm.track.v2";
const $=(id)=>document.getElementById(id);
const esc=(s)=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[c]);
const fmt=new Intl.NumberFormat("ru");
const fmtDate=new Intl.DateTimeFormat("ru",{day:"numeric",month:"short"});
const fmtClock=new Intl.DateTimeFormat("ru",{hour:"2-digit",minute:"2-digit"});
const parse=(day)=>new Date(day+"T12:00");
const dayLabel=(day)=>fmtDate.format(parse(day)).replace(".","");
const atInput=(at)=>dateKey(new Date(at))+"T"+new Date(at).toTimeString().slice(0,5);
const dayWord=(n)=>n%100>=11&&n%100<=14?"дней":n%10===1?"день":n%10>=2&&n%10<=4?"дня":"дней";
const currentDay=()=>dateKey();
function read() {
  try {return validate(JSON.parse(localStorage.getItem(KEY)))??fresh();} catch {return fresh();}
}
let data=read();
let mode;
try {mode=localStorage.getItem(MODE_KEY);} catch {}
if(!MODES.includes(mode)) mode="vape";
let day=currentDay();
let page="today";
let region="river";
let playBuild=false;
let resetKind="fail";
let toastTimer,undo,timer,liveMinute="";
function notify(message,rollback) {
  clearTimeout(toastTimer);
  undo=rollback;
  $("toast").innerHTML='<span>'+esc(message)+'</span>'+(rollback?'<button data-action="undo">Отменить</button>':'');
  $("toast").classList.add("shown");
  toastTimer=setTimeout(()=>{$("toast").classList.remove("shown");undo=null;},rollback?9000:4200);
}
function save(next,message,allowUndo=true) {
  const previous=data;
  const before=campaign(previous);
  const after=campaign(next);
  if(!validate(next)){notify("Проверь дату и объём записи.");return false;}
  try {localStorage.setItem(KEY,JSON.stringify(next));} catch {notify("Не удалось сохранить. Проверь хранилище браузера.");return false;}
  data=next;
  const built=mode==="vape"&&after.stage&&after.count>before.count&&after.stage.day!==before.stage?.day;
  if(built){
    region=after.stage.region;
    playBuild=true;
  }
  if(mode==="vape"&&after.count===0)region="river";
  render();
  if(message) notify(built?"Открыто: "+after.stage.title:message,allowUndo?()=>{if(data===next)save(previous,"Запись отменена",false);}:null);
  return true;
}
const button=(action,glyph,label,cls="")=>'<button type="button" data-action="'+action+'" class="btn '+cls+'">'+icon(glyph)+'<span>'+label+'</span></button>';
const typeName=(type)=>({pass:"День подтверждён",fail:"Неудачный день",use:TEXT[mode].use,urge:"Тяга",drink:"Вода"})[type];
function makeEvent(type,amount=0,note="",options={}) {
  const target=options.day??(page==="today"?currentDay():day);
  const at=options.at??(target===currentDay()?Date.now():parse(target).getTime());
  return {id:options.id??crypto.randomUUID(),mode,day:target,at,type,amount,note,outcome:options.outcome??"logged"};
}
function add(event,message) {
  const next={...data,events:[...data.events.filter(e=>e.id!==event.id),event]};
  if(save(next,message,event.mode!=="vape"||!["use","fail","pass"].includes(event.type))) {
    close();
    if(event.type==="drink"&&page==="today") $("main").querySelector(".hero")?.classList.add("splash");
  }
}
function amountToday() {return counted(data,"water",currentDay(),"drink");}
function timeParts(ms) {
  return [Math.floor(ms/DAY),Math.floor(ms/3600000)%24,Math.floor(ms/60000)%60];
}
function quitLabel(m) {
  if(m.length===null) return ['—','Задай начало серии',''];
  const [d,h,min]=timeParts(m.length);
  return [d,dayWord(d),String(h).padStart(2,"0")+" ч "+String(min).padStart(2,"0")+" мин"];
}
function habitArt() {
  return '<div class="art" aria-hidden="true"><span></span><img src="./assets/'+TEXT[mode].image+'.webp" alt="" width="460" height="460"></div>';
}
function weekWidget(m) {
  const today=currentDay();
  const goal=data.settings.water.goal;
  return '<div class="week">'+m.days.map((d,i)=>{
    const n=m.totals[i];
    const status=mode==="water"?(n?(goal&&n>=goal?"clear":"logged"):"empty"):dayStatus(data,mode,d);
    const title=mode==="water"?dayLabel(d)+", "+fmt.format(n)+" мл":dayLabel(d)+", "+({clear:"без употребления",used:"было употребление",empty:"нет отметки"})[status];
    return '<button class="week-day '+status+'" data-action="history-day" data-day="'+d+'" aria-label="'+title+'" '+(d===today?'aria-current="date"':'')+'><span>'+new Intl.DateTimeFormat("ru",{weekday:"short"}).format(parse(d))+'</span><i>'+(status==="clear"?icon("check"):status==="used"?icon("plus"):status==="logged"?icon("drop"):"·")+'</i></button>';
  }).join("")+'</div>';
}
function todayView() {
  const t=TEXT[mode], m=metrics(data,mode), today=currentDay();
  const status=mode==="water"?null:dayStatus(data,mode,today);
  const n=mode==="water"?amountToday():0;
  const {goal,glass}=data.settings.water;
  const [value,unit,note]=mode==="water"?[fmt.format(n),"мл",goal?"из "+fmt.format(goal)+" мл":""]:quitLabel(m);
  const goalText=mode==="water"&&goal?(n>=goal?"Цель достигнута":"Осталось "+fmt.format(goal-n)+" мл"):"";
  const consumed= mode==="water"?n:counted(data,mode,today,"use");
  const caption=mode==="water"?"":(m.days.filter(d=>dayStatus(data,mode,d)==="clear").length+" из 7 подтверждено");
  if(mode==="vape")return villageView(data,region,playBuild,icon);
  return '<div class="headline"><div><h1>'+t.title+'</h1></div><button class="top-link" data-action="insights">'+icon("chart")+'<span>Прогресс</span></button></div>'+
    '<section class="hero"><div class="hero-copy"><span class="metric-label">'+t.counter+'</span><div class="metric"><b id="counter">'+value+'</b><span>'+unit+'</span></div>'+
      (note?'<p class="counter-note" id="counter-note">'+note+'</p>':'')+
      (mode==="water"?(goal?'<div class="meter" role="progressbar" aria-label="Дневная цель" aria-valuenow="'+Math.floor(Math.min(n/goal,1)*100)+'"><i style="--width:'+Math.min(n/goal,1)*100+'%"></i></div><p class="goal-note">'+goalText+'</p>':'<button class="hero-link" data-action="settings">Задать дневную цель '+icon("arrow")+'</button>'):(m.length===null?'<button class="hero-link" data-action="start">Начать с сегодня '+icon("arrow")+'</button>':''))+
      '</div>'+habitArt()+'</section>'+
    '<div class="actions">'+(mode==="water"?button("glass","plus",fmt.format(glass)+" мл","primary")+button("record","drop","Свой объём"):(status==="used"?button("record","plus",t.use,"primary"):button("pass","check",status==="clear"?"День отмечен":t.confirm,status==="clear"?"complete":"primary")+button("record","plus",t.use)))+'</div>'+
    (mode==="vape"?'<button class="quiet" data-action="pause">'+icon("pause")+'Пауза, если тянет</button>':'')+
    '<section class="week-panel"><div class="section-head"><div><h2>За 7 дней</h2>'+(caption?'<small>'+caption+'</small>':'')+'</div><button class="top-link" data-action="history">'+icon("history")+'<span>Записи</span></button></div>'+weekWidget(m)+
    (status==="used"?'<p class="small-note">Сегодня · '+consumed+' '+t.units+'</p>':'')+'</section>';
}
function historyView() {
  const t=TEXT[mode], today=currentDay();
  const events=dayEvents(data,mode,day).sort((a,b)=>b.at-a.at);
  return subhead("Записи",t.name)+
    '<section class="panel"><div class="history-picker"><button class="chip" data-action="select-day" data-day="'+moveDay(today,-1)+'">Вчера</button><button class="chip" data-action="select-day" data-day="'+today+'">Сегодня</button><label class="date-field"><span class="sr">Дата</span><input id="pick-day" type="date" value="'+day+'" max="'+today+'"></label></div>'+
    (mode==="soda"&&dayStatus(data,mode,day)!=="used"?'<button class="chip" data-action="pass">'+(dayStatus(data,mode,day)==="clear"?"Снять отметку":t.confirm)+'</button>':'')+' '+
    '<button class="chip" data-action="record">Добавить запись</button></section>'+
    '<section class="panel entries"><h2>'+dayLabel(day)+'</h2>'+(events.length?events.map(e=>'<button class="entry" data-action="edit" data-id="'+esc(e.id)+'"><span><strong>'+typeName(e.type)+(e.type==="urge"&&e.outcome==="passed"?" прошла":"")+'</strong><small>'+fmtClock.format(e.at)+(e.note?" · "+esc(e.note):"")+'</small></span><b>'+(e.amount?fmt.format(e.amount)+" "+(mode==="water"?"мл":t.units):"")+'</b>'+icon("arrow")+'</button>').join(""):'<p class="small-note">За этот день пока нет записей.</p>')+'</section>';
}
function subhead(title,subtitle) {
  return '<div class="subhead"><button class="icon-btn" data-action="home" aria-label="Сегодня">'+icon("back")+'</button><div><small>'+subtitle+'</small><h1>'+title+'</h1></div></div>';
}
function villageInsights() {
  const v=campaign(data);
  const reached=MILESTONES.filter(m=>m.day<=v.count).length;
  return subhead("Статистика","Поселение")+
    '<div class="score-row">'+score("Подряд без вейпа",v.count+" "+dayWord(v.count))+score("Открыто этапов",reached+" из "+MILESTONES.length)+'</div>'+
    '<section class="panel"><h2>'+(v.next?"Следующая постройка":"Кампания завершена")+'</h2><p class="small-note">'+(v.next?v.next.title+' · через '+(v.next.day-v.count)+' '+dayWord(v.next.day-v.count):'На карте праздник во всех поселениях.')+'</p></section>'+
    (v.regions.length>1?'<section class="panel"><h2>Районы</h2><div class="district-list">'+v.regions.map(r=>'<button class="chip" data-action="region" data-id="'+r.id+'">'+r.name+'</button>').join("")+'</div></section>':'')+
    '<details class="panel roadmap"><summary>Все этапы до года</summary>'+MILESTONES.map(m=>'<div class="roadmap-row '+(m.day<=v.count?"complete":"")+'"><span>'+m.day+' дн.</span><strong>'+m.title+'</strong>'+(m.day<=v.count?icon("check"):"")+'</div>').join("")+'</details>'+
    '<div class="district-list">'+button("history","history","Записи")+button("settings","settings","Настройки")+'</div>';
}
function insightsView() {
  if(mode==="vape")return villageInsights();
  const m=metrics(data,mode);
  const max=Math.max(1,...m.totals);
  const volume=m.totals.reduce((a,b)=>a+b,0),active=m.totals.filter(Boolean).length;
  return subhead("Прогресс",TEXT[mode].name)+
    '<div class="score-row">'+(mode==="water"?score("За неделю",fmt.format(volume)+" мл")+score("В среднем за день с записью",active?fmt.format(Math.round(volume/active))+" мл":"—"):score("Дней подтверждено",m.clean)+score("Экономия за серию",m.savings===null?"—":"≈ "+fmt.format(m.savings)+" ₽"))+'</div>'+
    '<section class="panel"><h2>'+(mode==="water"?"Вода за неделю, мл":"Записи употребления за неделю")+'</h2><div class="bars">'+m.days.map((d,i)=>'<button data-action="history-day" data-day="'+d+'" aria-label="'+dayLabel(d)+': '+m.totals[i]+'"><span>'+fmt.format(m.totals[i])+'</span><i style="--height:'+m.totals[i]/max*100+'%"></i><small>'+parse(d).getDate()+'</small></button>').join("")+'</div></section>'+
    '<section class="badges"><div class="section-head"><h2>Достижения</h2><small>'+m.badges.filter(b=>b[2]).length+' из '+m.badges.length+'</small></div>'+m.badges.map(([title,detail,done])=>'<div class="badge '+(done?"earned":"")+'"><span>'+icon(done?"diamond":"check")+'</span><div><strong>'+title+'</strong><small>'+detail+'</small></div><b>'+(done?"Открыто":"Впереди")+'</b></div>').join("")+'</section>';
}
const score=(label,n)=>'<div class="score"><small>'+label+'</small><b>'+n+'</b></div>';
function render() {
  document.body.dataset.mode=mode;
  document.body.dataset.village=String(mode==="vape"&&page==="today");
  $("clock").textContent=new Intl.DateTimeFormat("ru",{day:"numeric",month:"long"}).format(new Date());
  $("dock").innerHTML=MODES.map(id=>'<button type="button" data-action="mode" data-id="'+id+'" aria-current="'+(id===mode?"true":"false")+'">'+icon(TEXT[id].icon)+'<span>'+TEXT[id].name+'</span></button>').join("");
  const focused=document.activeElement?.matches(".village-view");
  $("main").innerHTML=page==="history"?historyView():page==="insights"?insightsView():todayView();
  const world=$("main").querySelector(".village-view");
  if(world){
    mountVillage(world,delta=>{
      const regions=campaign(data).regions;
      const index=regions.findIndex(r=>r.id===world.dataset.world);
      const target=regions[index+delta];
      if(target){region=target.id;render();}
    });
    if(focused)world.focus();
  }else stopVillage();
  playBuild=false;
}
function setPage(next) {
  page=next;
  if(next==="today")day=currentDay();
  render();
  window.scrollTo({top:0,behavior:"instant"});
}
function open(title,html) {
  clearInterval(timer);
  $("dialog").innerHTML='<div class="dialog-head"><h2 id="dialog-title">'+title+'</h2><button class="icon-btn" aria-label="Закрыть" data-action="close">'+icon("x")+'</button></div>'+html;
  if(!$("dialog").open)$("dialog").showModal();
  $("dialog").scrollTop=0;
}
function close() {if($("dialog").open)$("dialog").close();clearInterval(timer);}
$("dialog").addEventListener("close",()=>{
  clearInterval(timer);
  if(page==="today"&&day!==currentDay()){day=currentDay();render();}
});
function record(entry) {
  if(entry?.mode==="vape"&&["pass","use","fail"].includes(entry.type)){
    open(typeName(entry.type),'<p class="small-note">'+dayLabel(entry.day)+(entry.amount?' · '+entry.amount+' '+TEXT.vape.units:'')+(entry.note?' · '+esc(entry.note):'')+'</p>');
    return;
  }
  const isWater=mode==="water";
  const at=entry?.at??(page==="today"||day===currentDay()?Date.now():parse(day).getTime());
  if(entry&&["pass","urge"].includes(entry.type)) {
    open(typeName(entry.type),'<p class="small-note">'+esc(entry.note||dayLabel(entry.day))+'</p><div class="form-actions">'+button("remove","x","Удалить запись","danger")+'</div>');
    $("dialog").querySelector('[data-action="remove"]').dataset.id=entry.id;
    return;
  }
  open(entry?"Изменить запись":isWater?"Добавить воду":TEXT[mode].use,
    '<form id="entry-form" data-id="'+esc(entry?.id)+'" data-at="'+at+'"><label>'+(isWater?"Объём, мл":TEXT[mode].quantity)+'<input name="amount" type="number" inputmode="numeric" min="1" max="'+(isWater?5000:9999)+'" required value="'+(entry?.amount??(isWater?"":1))+'"></label><label>Дата и время<input name="at" type="datetime-local" required value="'+atInput(at)+'" max="'+atInput(Date.now())+'"></label>'+
    (!isWater?'<label>Заметка<textarea name="note" maxlength="280" placeholder="По желанию">'+esc(entry?.note)+'</textarea></label>':'')+
    '<div class="form-actions">'+(entry?'<button type="button" class="btn danger" data-action="remove" data-id="'+esc(entry.id)+'">Удалить</button>':'')+'<button class="btn primary">Сохранить</button></div></form>');
}
function settings() {
  const s=data.settings[mode];
  const html=mode==="water"?'<label>Дневная цель, мл<input name="goal" type="number" inputmode="numeric" min="0" max="10000" value="'+(s.goal||"")+'" placeholder="По желанию"></label><label>Быстрый объём, мл<input name="glass" type="number" inputmode="numeric" min="1" max="5000" value="'+s.glass+'" required></label>':
    '<label>Начало отсчёта<input name="start" type="datetime-local" value="'+(s.start?atInput(s.start):"")+'" max="'+atInput(Date.now())+'"></label>'+
    '<div class="formrow"><label>Бывшие траты, ₽<input name="cost" type="number" min="0" max="999999" step="0.01" value="'+(s.cost||"")+'"></label><label>Период<select name="period">'+Object.entries({day:"День",week:"Неделя",month:"Месяц"}).map(([k,v])=>'<option value="'+k+'" '+(s.period===k?"selected":"")+'>'+v+'</option>').join("")+'</select></label></div>'+
    (mode==="vape"?'<label>Моё действие на случай тяги<textarea name="reason" maxlength="180" placeholder="Например, выйти на пару минут">'+esc(s.reason)+'</textarea></label>':'');
  open("Настройки · "+TEXT[mode].name,'<form id="settings-form">'+html+'<button class="btn primary">Сохранить</button></form><div class="backup"><button class="chip" data-action="export">Копия всех данных</button><button class="chip" data-action="import">Загрузить копию</button></div>');
}
function pause() {
  const action=data.settings.vape.reason;
  open("Пауза на две минуты",'<div class="timer"><b id="timer">02:00</b><p>'+esc(action||"Отложи вейп и переключись. Можно встать и пройтись.")+'</p>'+button("timer","pause","Запустить")+'</div><label>Что помогло<textarea id="urge-note" maxlength="280" placeholder="По желанию"></textarea></label><div class="form-actions">'+button("urge-log","history","Записать")+button("urge-passed","check","Тяга прошла","primary")+'</div>');
}
function startTimer(b) {
  b.disabled=true;
  const end=Date.now()+120000;
  timer=setInterval(()=>{
    const seconds=Math.max(0,Math.ceil((end-Date.now())/1000));
    $("timer").textContent=String(Math.floor(seconds/60)).padStart(2,"0")+":"+String(seconds%60).padStart(2,"0");
    if(!seconds){clearInterval(timer);b.disabled=false;}
  },180);
}
function markVillage(){
  const v=campaign(data);
  const status={clear:"День уже отмечен.",failed:"Сегодня серия уже сброшена.",pending:"Что получилось сегодня?"}[v.today];
  open("Отметить день",'<p class="small-note">'+status+'</p><div class="village-sheet-actions">'+
    (v.today==="pending"?button("village-clear","check","День без вейпа","primary"):'')+
    (v.today!=="failed"?button("village-puff","x","Затянулся","danger")+button("village-confirm-reset","x","Неудачный день","danger"):'')+'</div>');
}
function pass() {
  if(page==="today")day=currentDay();
  if(dayStatus(data,mode,day)==="used")return;
  const had=dayStatus(data,mode,day)==="clear";
  if(had)save({...data,events:data.events.filter(e=>!(e.mode===mode&&e.day===day&&e.type==="pass"))},"Отметка снята");
  else add(makeEvent("pass"),"День отмечен");
}
document.addEventListener("click",e=>{
  const b=e.target.closest("[data-action]");
  if(!b)return;
  const {action,id,day:newDay}=b.dataset;
  switch(action){
    case "mode": if(MODES.includes(id)){mode=id;try{localStorage.setItem(MODE_KEY,id);}catch{} setPage("today");}break;
    case "home":setPage("today");break;
    case "region":region=id;setPage("today");break;
    case "village-mark":markVillage();break;
    case "village-clear":{
      day=currentDay();
      if(campaign(data).today==="pending")add(makeEvent("pass"),"День отмечен");
      break;
    }
    case "village-puff":
    case "village-confirm-reset":
      resetKind=action==="village-puff"?"use":"fail";
      open("Сбросить поселение?",'<p class="small-note">Серия, постройки и открытые районы обнулятся.</p><div class="village-sheet-actions">'+button("close","back","Назад")+button("village-reset","x","Сбросить прогресс","danger")+'</div>');
      break;
    case "village-reset":{
      day=currentDay();
      if(campaign(data).today!=="failed")add(makeEvent(resetKind,resetKind==="use"?1:0),"Поселение сброшено");
      break;
    }
    case "insights":setPage("insights");break;
    case "history":day=currentDay();setPage("history");break;
    case "history-day":day=newDay;setPage("history");break;
    case "select-day":day=newDay;render();break;
    case "settings":settings();break;
    case "record":record();break;
    case "edit":{const item=data.events.find(x=>x.id===id);if(item)record(item);break;}
    case "remove":if(save({...data,events:data.events.filter(e=>e.id!==id)},"Запись удалена"))close();break;
    case "close":close();break;
    case "pass":pass();break;
    case "glass":add(makeEvent("drink",data.settings.water.glass),"Добавлено "+fmt.format(data.settings.water.glass)+" мл");break;
    case "start":save({...data,settings:{...data.settings,[mode]:{...data.settings[mode],start:Date.now()}}},"Серия началась");break;
    case "pause":pause();break;
    case "timer":startTimer(b);break;
    case "urge-log":
    case "urge-passed":add(makeEvent("urge",0,$("urge-note").value.trim(),{outcome:action==="urge-passed"?"passed":"logged"}),"Тяга отмечена");break;
    case "undo":undo?.();break;
    case "export": {
      const url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:"application/json"}));
      const a=document.createElement("a");a.href=url;a.download="ritm-"+currentDay()+".json";a.click();setTimeout(()=>URL.revokeObjectURL(url),2000);break;
    }
    case "import": $("import").click();break;
  }
});
document.querySelector(".wordmark").addEventListener("click",e=>{e.preventDefault();setPage("today");});
document.querySelector("[data-action=settings]").innerHTML=icon("settings");
document.addEventListener("submit",e=>{
  const form=e.target;
  if(!["entry-form","settings-form","import-form"].includes(form.id))return;
  e.preventDefault();
  if(form.id==="import-form"){if(pendingImport&&save(pendingImport,"Копия загружена"))close();pendingImport=null;return;}
  const f=new FormData(form);
  if(form.id==="entry-form"){
    const previousAt=Number(form.dataset.at);
    const at=f.get("at")===atInput(previousAt)?previousAt:new Date(f.get("at")).getTime();
    if(!Number.isFinite(at)||at>Date.now())return notify("Укажи прошедшее время.");
    const event=makeEvent(mode==="water"?"drink":"use",Number(f.get("amount")),String(f.get("note")??"").trim(),{id:form.dataset.id||undefined,at,day:dateKey(new Date(at))});
    add(event,"Запись сохранена");
  }else{
    const s=data.settings[mode];
    const at=f.get("start")?(s.start&&f.get("start")===atInput(s.start)?s.start:new Date(f.get("start")).getTime()):null;
    if(at!==null&&(!Number.isFinite(at)||at>Date.now()))return notify("Дата начала должна быть в прошлом.");
    const item=mode==="water"?{goal:Number(f.get("goal")),glass:Number(f.get("glass"))}:{start:at,cost:Number(f.get("cost")),period:f.get("period"),reason:String(f.get("reason")??"").trim()};
    if(save({...data,settings:{...data.settings,[mode]:item}},"Настройки сохранены"))close();
  }
});
let pendingImport;
document.addEventListener("change",async e=>{
  if(e.target.id==="pick-day"&&e.target.value&&e.target.value<=currentDay()){day=e.target.value;render();return;}
  if(e.target.id!=="import")return;
  const file=e.target.files?.[0];e.target.value="";
  if(!file)return;
  try{
    if(file.size>5*1024*1024)throw Error();
    const raw=JSON.parse(await file.text());
    const old=migrate(raw,data);
    pendingImport=validate(raw)??old?.state;
    if(!pendingImport)throw Error();
    open("Загрузить копию?",'<p class="small-note">'+(old?"Копия заменит записи трекера «"+TEXT[old.mode].name+"».":"Копия заменит записи всех трекеров.")+'</p><form id="import-form"><button class="btn primary">Загрузить</button></form>');
  }catch{notify("Не удалось прочитать копию.");}
});
window.addEventListener("storage",e=>{if(e.key===KEY){data=read();render();}});
let currentDate=currentDay();
setInterval(()=>{
  const next=currentDay();
  if(next!==currentDate){
    currentDate=next;
    if(page==="today"&&!$("dialog").open){day=next;render();}
    return;
  }
  if(page==="today"&&mode==="soda"&&!$("dialog").open){
    const m=metrics(data,mode);
    const [v,u,n]=quitLabel(m);
    if(n!==liveMinute){liveMinute=n;const note=$("counter-note");if(note)note.textContent=n;
      if($("counter").textContent!==String(v)) render();}
  }
},4000);
if("serviceWorker" in navigator) navigator.serviceWorker.register("./sw.js").catch(()=>{});
render();
