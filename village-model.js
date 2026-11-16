import {dateKey,moveDay} from "./model.js";

export const REGIONS=[
  {id:"river",name:"Долина у реки",day:0},
  {id:"island",name:"Остров",day:60},
  {id:"alpine",name:"Горная долина",day:105},
  {id:"gardens",name:"Сады за перевалом",day:255},
];

// Coordinates are ground anchors in percent of the 9:16 scene.
// Widths are percentages of the same scene. Objects are sorted by ground depth.
const p=(asset,x,y,w,fx)=>({asset,x,y,w,fx});
export const MILESTONES=[
  [1,"Лагерь у реки","river",[p("camp",36,78,30,"fire")]],
  [2,"Каркас дома","river",[p("frame",30,60,34)]],
  [3,"Первый дом","river",[p("house",30,60,34,"home")]],
  [4,"Огород","river",[p("garden",14,67,23)]],
  [5,"Колодец","river",[p("well",27,72,17)]],
  [6,"Дорога и фонари","river",[]],
  [7,"Первые соседи","river",[p("house",5,48,27,"home"),p("house",23,47,28,"home")]],
  [10,"Мост на другой берег","river",[p("bridge",54,56,29)]],
  [12,"Мастерская","river",[p("workshop",77,52,32,"home")]],
  [14,"Пристань","river",[p("pier",66,76,22,"dock")]],
  [18,"Рыночная площадь","river",[p("market",-12,77,31)]],
  [21,"Мельница и поля","river",[p("mill",75,37,23,"mill"),p("garden",88,32,21)]],
  [25,"Набережная","river",[]],
  [30,"Город у реки","river",[p("fountain",111,67,22,"fountain"),p("house",112,55,23,"home"),p("house",-17,43,25,"home")]],
  [40,"Верфь","river",[p("shipyard",89,87,27)]],
  [50,"Маяк","river",[p("lighthouse",84,27,18,"light")]],
  [60,"Корабль к острову","island",[p("ship",16,91,24,"ship")]],
  [70,"Островной причал","island",[p("pier",29,85,26,"dock")]],
  [80,"Рыбацкая деревня","island",[p("house",53,63,30,"home"),p("house",69,72,30,"home"),p("well",76,80,15)]],
  [90,"Обсерватория и фуникулёр","island",[p("observatory",68,35,32,"light"),p("funicular",62,49,21)]],
  [105,"Дорога в горы","alpine",[]],
  [120,"Горное поселение","alpine",[p("house",40,61,27,"home"),p("house",66,56,28,"home"),p("workshop",59,72,28,"home")]],
  [135,"Горный тоннель","alpine",[p("tunnel",24,48,28)]],
  [150,"Железная дорога","alpine",[]],
  [165,"Вокзал","alpine",[p("station",78,79,31,"home")]],
  [180,"Первый поезд","alpine",[p("train",61,81,27,"train")]],
  [195,"Канал","alpine",[]],
  [210,"Плавучий рынок","alpine",[p("market",72,88,26),p("pier",55,90,21,"dock")]],
  [225,"Ботанический сад","alpine",[p("greenhouse",72,42,32)]],
  [240,"Воздушные шары","alpine",[p("balloons",48,32,31,"float")]],
  [255,"Открыт горный перевал","gardens",[]],
  [270,"Сад у водопада","gardens",[p("garden",56,63,33),p("fountain",68,68,22,"fountain")]],
  [285,"Каменный виадук","gardens",[p("viaduct",50,52,40)]],
  [300,"Теплицы на склоне","gardens",[p("greenhouse",38,42,38)]],
  [315,"Городской трамвай","gardens",[p("tram",51,76,22,"train")]],
  [330,"Театр у реки","gardens",[p("theater",76,44,37,"home")]],
  [345,"Праздничные огни","gardens",[]],
  [365,"Праздник во всех поселениях","gardens",[]],
].map(([day,title,region,plots])=>({day,title,region,plots}));

export function campaign(state,today=dateKey()){
  const clean=new Set();
  const failed=new Set();
  for(const event of state.events){
    if(event.mode!=="vape"||event.day>today)continue;
    if(event.type==="pass")clean.add(event.day);
    if(event.type==="use"||event.type==="fail")failed.add(event.day);
  }
  let count=0;
  const yesterday=moveDay(today,-1);
  if(!failed.has(today)){
    let day=clean.has(today)?today:yesterday;
    while(clean.has(day)&&!failed.has(day)){
      count++;
      day=moveDay(day,-1);
    }
  }
  const stage=MILESTONES.findLast(item=>item.day<=count)??null;
  const next=MILESTONES.find(item=>item.day>count)??null;
  return {count,stage,next,regions:REGIONS.filter(region=>region.day<=count),today:failed.has(today)?"failed":clean.has(today)?"clear":"pending"};
}

export function scenePlots(region,days){
  return MILESTONES.filter(m=>m.region===region&&m.day<=days).flatMap(m=>{
    if((m.day===2&&days>=3)||(m.day===1&&days>=6))return [];
    return m.plots;
  }).sort((a,b)=>a.y-b.y);
}

export function construction(region,days){
  const next=MILESTONES.find(m=>m.day>days);
  const previous=MILESTONES.findLast(m=>m.day<=days);
  if(!next||!previous||days<7||!REGIONS.some(r=>r.id===region&&r.day<=days))return null;
  const elapsed=days-previous.day;
  if(!elapsed)return null;
  const fraction=elapsed/(next.day-previous.day);
  const sites={river:[42,79],island:[64,84],alpine:[61,76],gardens:[39,82]};
  const [x,y]=sites[region];
  const supply={x,y,w:20,fx:null,fraction,elapsed,asset:"foundation"};
  if(next.region!==region)return previous.region===region?supply:null;
  const plot=next.plots[0];
  if(!plot)return supply;
  if(plot.asset==="bridge")return {...supply,x:40,y:55};
  if(plot.asset==="pier")return {...supply,x:73,y:plot.y};
  if(["ship","train","tram","balloons"].includes(plot.asset))return supply;
  return {...plot,fx:null,fraction,elapsed,asset:fraction>.48?"frame":"foundation"};
}
