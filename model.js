export const MODES = ["vape", "soda", "water"];
export const dateKey = (d = new Date()) => {
  const p = (n) => String(n).padStart(2,"0");
  return [d.getFullYear(),p(d.getMonth()+1),p(d.getDate())].join("-");
};
export function moveDay(day, offset) {
  const d = new Date(day+"T12:00");
  d.setDate(d.getDate()+offset);
  return dateKey(d);
}
export const DAY = 86400000;
export const fresh = () => ({version:1,events:[],settings:{water:{goal:0,glass:250},vape:{start:null,reason:"",cost:0,period:"month"},soda:{start:null,reason:"",cost:0,period:"month"}}});
export function dayEvents(state, mode, day) {
  return state.events.filter(e=>e.mode===mode && e.day===day);
}
export function dayStatus(state,mode,day) {
  const log=dayEvents(state,mode,day);
  if(log.some(e=>e.type==="use")) return "used";
  if(log.some(e=>e.type==="pass")) return "clear";
  return "empty";
}
export function counted(state,mode,day,type) {
  return dayEvents(state,mode,day).filter(e=>e.type===type).reduce((n,e)=>n+e.amount,0);
}
export function elapsed(state,mode,now=Date.now()) {
  const last=state.events.filter(e=>e.mode===mode && e.type==="use" && e.at<=now).reduce((n,e)=>Math.max(n,e.at),0);
  const start=Math.max(last,state.settings[mode].start || 0);
  return start ? Math.max(0,now-start) : null;
}
export function metrics(state,mode,today=dateKey(),now=Date.now()) {
  const days=Array.from({length:7},(_,i)=>moveDay(today,i-6));
  const byDay=new Map();
  let escaped=0;
  for(const event of state.events){
    if(event.mode!==mode)continue;
    if(event.type==="urge"){
      if(event.outcome==="passed")escaped++;
      continue;
    }
    const item=byDay.get(event.day)??{amount:0,clear:false};
    if(event.type==="pass")item.clear=true;
    else item.amount+=event.amount;
    byDay.set(event.day,item);
  }
  const totals=days.map(d=>byDay.get(d)?.amount??0);
  const tracked=[...byDay.keys()];
  const clean=tracked.filter(d=>byDay.get(d).clear&&!byDay.get(d).amount).length;
  const goal=state.settings.water.goal;
  const reached=goal&&mode==="water"?tracked.filter(d=>byDay.get(d).amount>=goal).length:0;
  const badges=mode==="water" ? [
    ["Первый стакан","Запиши любой объём воды",tracked.length>=1],
    ["В своём ритме","Отмечай воду в 5 разных дней",tracked.length>=5],
    ["Цель закрыта","Выполни свою дневную цель",reached>=1],
    ["Неделя по цели","7 дней с выполненной текущей целью",reached>=7]
  ] : [
    ["Первая отметка","Подтверди день "+(mode==="vape"?"без вейпа":"без газировки"),clean>=1],
    ["Уже неделя","Собери 7 подтверждённых дней",clean>=7],
    ["Тридцать дней","Собери 30 подтверждённых дней",clean>=30],
    ["Вернулся","Отметь чистый день после дня с употреблением",tracked.some(d=>byDay.get(d).clear && !byDay.get(d).amount && Boolean(byDay.get(moveDay(d,-1))?.amount))],
    ...(mode==="vape"?[["Первая пауза","Запиши, что тяга прошла",escaped>=1]]:[])
  ];
  const length=mode==="water"?null:elapsed(state,mode,now);
  const cost=mode==="water"?0:state.settings[mode].cost;
  const period=mode==="water"?1:{day:1,week:7,month:365.2425/12}[state.settings[mode].period];
  return {days,totals,clean,tracked:tracked.length,reached,badges,length,savings:length===null||!cost?null:Math.round(length/DAY*cost/period)};
}
function validDay(day) {
  return typeof day==="string" && /^\d{4}-\d{2}-\d{2}$/.test(day) && dateKey(new Date(day+"T12:00"))===day;
}
const bounded=(n,min,max)=>Number.isFinite(n)&&n>=min&&n<=max;
const short=(x,n)=>typeof x==="string"&&x.length<=n;
export function validate(input) {
  if(input?.version!==1 || !Array.isArray(input.events) || !input.settings) return null;
  const clean=fresh();
  for(const mode of MODES) {
    const s=input.settings[mode];
    if(!s) return null;
    if(mode==="water") {
      if(!Number.isInteger(s.goal)||!bounded(s.goal,0,10000)||!Number.isInteger(s.glass)||!bounded(s.glass,1,5000)) return null;
      clean.settings.water={goal:s.goal,glass:s.glass};
    } else {
      if((s.start!==null&&!bounded(s.start,0,Date.now()))||!short(s.reason,180)||!bounded(s.cost,0,999999)||!["day","week","month"].includes(s.period)) return null;
      clean.settings[mode]={start:s.start,reason:s.reason,cost:s.cost,period:s.period};
    }
  }
  const ids=new Set();
  for(const e of input.events) {
    if(!e||!short(e.id,140)||ids.has(e.id)||!MODES.includes(e.mode)||!validDay(e.day)||e.day>dateKey()||!bounded(e.at,0,Date.now())||!short(e.note,280)) return null;
    const types=e.mode==="water"?["drink"]:e.mode==="vape"?["pass","use","urge"]:["pass","use"];
    if(!types.includes(e.type)||!Number.isInteger(e.amount)||!bounded(e.amount,["drink","use"].includes(e.type)?1:0,e.mode==="water"?5000:9999)) return null;
    if(e.type==="urge"&&!["passed","logged"].includes(e.outcome)) return null;
    ids.add(e.id);
    clean.events.push({id:e.id,mode:e.mode,day:e.day,at:e.at,type:e.type,amount:e.amount,note:e.note,outcome:e.outcome==="passed"?"passed":"logged"});
  }
  return clean;
}
export function migrate(raw, base) {
  if(raw?.version!==1 || !raw.state || !Array.isArray(raw.state.entries)) return null;
  const mode=raw.tracker??"vape";
  if(!MODES.includes(mode)) return null;
  const old=raw.state;
  const draft=structuredClone(base);
  const preserved=draft.events.filter(e=>e.mode!==mode);
  if(mode==="water") draft.settings.water={goal:old.goal??0,glass:old.glass??250};
  else draft.settings[mode]={start:old.start??null,reason:(old.reason??"").slice(0,180),cost:old.spend??0,period:old.spendPeriod??"day"};
  const logs=[];
  for(const entry of old.entries) {
    if(!entry || typeof entry.id!=="string" || !Number.isFinite(entry.at)) return null;
    if(mode==="water") logs.push({id:"legacy-water-"+entry.id,mode,type:"drink",at:entry.at,day:dateKey(new Date(entry.at)),amount:entry.amount,note:""});
    else if(entry.kind==="puff" || (mode==="vape"&&["resist","urge"].includes(entry.kind))) {
      const type=entry.kind==="puff"?"use":"urge";
      const note=[entry.tag,entry.note].filter(x=>typeof x==="string"&&x).join(" · ").slice(0,280);
      logs.push({id:"legacy-"+mode+"-"+entry.id,mode,type,at:entry.at,day:dateKey(new Date(entry.at)),amount:type==="use"?entry.count:0,note,outcome:entry.kind==="resist"?"passed":"logged"});
    }
  }
  if(mode!=="water") for(const [day,value] of Object.entries(old.checks??{})) {
    if(value===true && validDay(day)) logs.push({id:"legacy-"+mode+"-pass-"+day,mode,type:"pass",at:Math.min(Date.now(),new Date(day+"T12:00").getTime()),day,amount:0,note:""});
  }
  draft.events=[...preserved,...logs];
  const result=validate(draft);
  return result?{state:result,mode}:null;
}
