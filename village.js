import {campaign,construction,scenePlots,REGIONS} from "./village-model.js";

const ASSETS="./assets/village/";
const DIM={width:450,height:800};
const RIVER=[[66,0],[64,7],[57,13],[50,21],[49,29],[53,36],[53,43],[50,53],[51,59],[58,65],[61,74],[61,81],[63,90],[62,100]];
const SCENES={
  river:{
    water:RIVER, spread:2.3,
    roads:[
      {day:6,points:[[31,100],[30,85],[34,70],[34,61],[30,54],[28,48],[26,37],[25,30]]},
      {day:7,points:[[25,46],[34,49],[43,50]]},
      {day:10,points:[[29,53],[38,51],[45,52]]},
      {day:10,points:[[63,52],[70,54],[76,58]]},
      {day:12,points:[[76,58],[76,54],[79,51],[83,48]]},
      {day:14,points:[[76,57],[77,68],[71,75],[67,76]]},
      {day:18,points:[[31,81],[29,82],[24,82],[24,78]]},
      {day:21,points:[[77,54],[79,45],[78,36],[79,32]]},
      {day:25,points:[[71,75],[73,79],[75,83],[75,86]]},
      {day:30,points:[[77,67],[81,69],[86,65],[88,60]]},
      {day:30,points:[[26,37],[22,34],[22,31]]},
      {day:40,points:[[75,86],[79,88],[84,89],[86,88]]},
      {day:50,points:[[79,33],[85,31],[87,27]]},
    ],
    lights:[[32,77],[34,64],[29,53],[42,54],[73,58],[76,71],[79,80],[85,64]]
  },
  island:{
    water:[[4,13],[3,26],[2,43],[2,55],[4,66],[15,85],[26,91],[51,96]],spread:5,
    roads:[{day:70,points:[[32,81],[42,79],[51,70],[60,65]]},{day:80,points:[[55,69],[62,75],[76,82]]},{day:90,points:[[59,67],[60,58],[63,50],[67,41],[69,35]]}],
    lights:[[41,80],[53,71],[62,64],[67,44],[75,80]]
  },
  alpine:{
    roads:[{day:105,points:[[45,100],[44,88],[52,78],[49,66],[45,61],[40,58]]},{day:120,points:[[49,68],[58,66],[68,58],[74,48]]},{day:165,points:[[49,81],[62,80],[73,78],[81,76]]},{day:225,points:[[66,57],[74,49],[76,41],[74,39]]}],
    rail:{day:150,points:[[24,43],[28,49],[34,59],[38,69],[42,76],[47,79],[84,79],[99,82]]},
    channel:{day:195,points:[[7,94],[23,93],[38,91],[59,90],[81,92],[99,94]]},
    lights:[[41,88],[48,72],[55,65],[65,59],[78,80],[72,88]]
  },
  gardens:{
    water:[[93,0],[91,13],[90,24],[91,35],[94,48],[96,55],[95,72],[94,84],[94,100]],spread:3,
    roads:[{day:255,points:[[20,100],[27,84],[36,70],[46,59],[56,55],[64,58],[70,68]]},{day:270,points:[[69,68],[77,72],[83,70]]},{day:300,points:[[45,60],[40,50],[37,41]]},{day:330,points:[[65,58],[70,48],[77,43]]}],
    rail:{day:315,points:[[23,89],[31,82],[38,74],[67,74],[75,78],[80,83]]},
    highRail:{day:285,points:[[12,51],[22,43],[31,41],[69,41],[76,38],[84,30]]},
    lights:[[29,85],[43,72],[54,66],[70,69],[81,73],[75,48]]
  }
};

function effect(kind){
  if(kind==="fire")return '<span class="flame"></span><span class="puff puff-a"></span><span class="puff puff-b"></span>';
  if(kind==="home")return '<span class="window"></span><span class="puff puff-a"></span><span class="puff puff-b"></span>';
  if(kind==="light")return '<span class="beacon"></span>';
  if(kind==="fountain")return '<span class="fountain"></span>';
  if(kind==="dock")return '<span class="docklight"></span>';
  if(kind==="mill")return '<span class="window"></span>';
  return "";
}
function buildingMaterials(plot){
  if(!plot.elapsed)return "";
  return '<span class="world-materials">'+Array.from({length:Math.min(plot.elapsed,15)},(_,i)=>'<i style="left:'+(18+(i%5)*13)+'%;top:'+(81+Math.floor(i/5)*6)+'%"></i>').join("")+'</span>';
}
function sprite(plot,isNew){
  const {asset,x,y,w,fx}=plot;
  const known=["float","ship","train"].includes(fx)?fx:"";
  const src=asset==="foundation"?"frame":asset;
  return '<div class="world-plot '+(isNew?"new-plot ":"")+'" style="--x:'+x+'%;--y:'+y+'%;--size:'+w+'%"><div class="plot-sprite asset-'+src+' '+known+' '+(fx??"")+' '+(asset==="foundation"?"foundation":"")+'"><img src="'+ASSETS+src+'.webp" alt="" draggable="false">'+effect(fx)+buildingMaterials(plot)+'</div></div>';
}
export function villageView(state,region,unlocked,icon){
  const progress=campaign(state);
  const place=progress.regions.find(item=>item.id===region)??REGIONS[0];
  const latest=unlocked?progress.stage:null;
  const work=construction(place.id,progress.count);
  const buildings=scenePlots(place.id,progress.count);
  const options=progress.regions.map(r=>r.name).join(", ");
  const regionIndex=progress.regions.indexOf(place);
  return '<section class="village-view" data-world="'+place.id+'" data-days="'+progress.count+'" aria-label="'+place.name+'. Дней подряд: '+progress.count+'. '+(progress.regions.length>1?'Доступны районы: '+options+'. Используй стрелки или свайп.':'')+'" tabindex="0">'+
    '<div class="world-land '+(latest ? "build-camera" : "")+'" aria-hidden="true"><img class="terrain" src="'+ASSETS+place.id+'.webp" alt="" draggable="false"><canvas class="world-canvas"></canvas>'+
    (work?sprite({...work,w:Math.min(work.w,25)*(.68+work.fraction*.32)},false):'')+
    buildings.map(plot=>sprite(plot,latest?.plots.includes(plot)??false)).join("")+
    (progress.count>=365?'<div class="festival"><i></i><i></i><i></i></div>':'')+'</div>'+
    '<div class="world-footer">'+(progress.regions.length>1?'<div class="region-dots" aria-hidden="true">'+progress.regions.map((item,i)=>'<i class="'+(i===regionIndex?'active':'')+'"></i>').join("")+'</div>':'')+
    '<div class="village-actions"><button type="button" class="village-btn mark-day" data-action="village-mark">'+icon(progress.today==="clear"?"check":"plus")+'<span>'+(progress.today==="clear"?"Отмечено":"Отметить")+'</span></button><button type="button" class="village-btn village-stats" data-action="insights">'+icon("chart")+'<span>Статистика</span></button></div></div></section>';
}

function stroke(ctx,points,color,width,dashes=[]){
  ctx.beginPath();
  for(const [i,[x,y]] of points.entries()) (i?ctx.lineTo(x*4.5,y*8):ctx.moveTo(x*4.5,y*8));
  ctx.strokeStyle=color;ctx.lineWidth=width;ctx.lineJoin="round";ctx.lineCap="round";ctx.setLineDash(dashes);ctx.stroke();ctx.setLineDash([]);
}
function pathAt(points,t){
  const i=Math.floor(t*(points.length-1));
  const f=t*(points.length-1)-i;
  const [a,b]=[points[i],points[Math.min(points.length-1,i+1)]];
  return [a[0]+(b[0]-a[0])*f,a[1]+(b[1]-a[1])*f];
}
function drawStatic(ctx,scene,days){
  const roads=scene.roads.filter(road=>road.day<=days);
  const paved=days>=30;
  for(const road of roads)stroke(ctx,road.points,"#49402075",paved?17:12);
  for(const road of roads)stroke(ctx,road.points,paved?"#b5a385":"#bfa16c",paved?14:9);
  for(const road of roads)stroke(ctx,road.points,paved?"#e1c7a18b":"#dfbd8670",1.3,paved?[4,4]:[2,6]);
  if(scene===SCENES.river&&days>=25){
    ctx.fillStyle="#51473468";ctx.beginPath();ctx.ellipse(75*4.5,86*8,10,6,0,0,Math.PI*2);ctx.fill();
    ctx.fillStyle="#b5a385";ctx.beginPath();ctx.ellipse(75*4.5,86*8,8,4.5,0,0,Math.PI*2);ctx.fill();
  }
  if(scene.channel&&scene.channel.day<=days){
    stroke(ctx,scene.channel.points,"#615842",23);
    stroke(ctx,scene.channel.points,"#2d8193",17);
  }
  for(const rail of [scene.highRail,scene.rail]){
    if(!rail||rail.day>days)continue;
    stroke(ctx,rail.points,"#6a5540",10);
    stroke(ctx,rail.points,"#353331",7,[2,4]);
    stroke(ctx,rail.points,"#bdab87",2);
  }
}
let animation;
export function stopVillage(){
  cancelAnimationFrame(animation);
}
export function mountVillage(root,onMove){
  stopVillage();
  if(!root)return;
  const scene=SCENES[root.dataset.world], days=Number(root.dataset.days);
  const canvas=root.querySelector("canvas"),ctx=canvas?.getContext("2d");
  if(!ctx||!scene)return;
  const backing=document.createElement("canvas");
  const dpr=Math.min(1.6,window.devicePixelRatio||1);
  canvas.width=backing.width=DIM.width*dpr;
  canvas.height=backing.height=DIM.height*dpr;
  ctx.scale(dpr,dpr);
  const back=backing.getContext("2d");back.scale(dpr,dpr);
  drawStatic(back,scene,days);
  const reduce=matchMedia("(prefers-reduced-motion: reduce)");
  let frame=0;
  function draw(time){
    if(frame&&time-frame<34)return;
    frame=time;
    ctx.clearRect(0,0,DIM.width,DIM.height);
    const animate=reduce.matches?0:time/1000;
    ctx.drawImage(backing,0,0,DIM.width,DIM.height);
    const water=scene.water??(scene.channel&&days>=scene.channel.day?scene.channel.points:null);
    if(water){
      ctx.lineWidth=1;
      for(let i=0;i<26;i++){
        const t=(i/26+animate*.033)%1;
        const [x,y]=pathAt(water,t);
        const side=Math.sin(i*73.6)*(scene.spread??1.3);
        const alpha=.07+.24*Math.sin(Math.PI*t)**2;
        ctx.strokeStyle="rgba(205,246,246,"+alpha+")";
        ctx.beginPath();
        ctx.ellipse((x+side)*4.5,y*8,1.8+i%5,1.5,-.22,0,Math.PI);
        ctx.stroke();
      }
    }
    if(days>=7&&scene===SCENES.river){
      for(let i=0;i<(days>=30?4:2);i++){
        const phase=(animate*.049+i*.29)%2;
        const [x,y]=pathAt(scene.roads[0].points,phase<1?phase:2-phase);
        const bob=Math.sin(animate*12+i)*.6;
        ctx.fillStyle="#26302261";ctx.beginPath();ctx.ellipse(x*4.5,y*8,3,1.4,0,0,Math.PI*2);ctx.fill();
        ctx.fillStyle=["#933f2c","#516b83","#735d3e","#45664a"][i];ctx.fillRect(x*4.5-1.3,y*8-5+bob,2.6,4.8);
        ctx.fillStyle="#f4c595";ctx.beginPath();ctx.arc(x*4.5,y*8-6.5+bob,1.35,0,Math.PI*2);ctx.fill();
      }
    }
    if(days>=6){
      for(const [i,[x,y]] of scene.lights.entries()){
        if(i>1&&days<10||i>4&&days<25)continue;
        const glow=ctx.createRadialGradient(x*4.5,y*8-6,0,x*4.5,y*8-6,days>=345?15:10);
        glow.addColorStop(0,"rgba(255,208,113,"+(.40+.13*Math.sin(animate*3+i))+")");
        glow.addColorStop(1,"rgba(255,175,74,0)");
        ctx.fillStyle=glow;ctx.fillRect(x*4.5-17,y*8-23,34,34);
        ctx.fillStyle="#5b482b";ctx.fillRect(x*4.5-1,y*8-6,2,7);
        ctx.fillStyle="#ffe5ac";ctx.fillRect(x*4.5-1.5,y*8-8,3,3);
      }
    }
  }
  if(reduce.matches)draw(0);
  else{
    const loop=time=>{if(!root.isConnected)return;draw(time);animation=requestAnimationFrame(loop);};
    animation=requestAnimationFrame(loop);
  }
  let start;
  root.addEventListener("pointerdown",e=>{if(e.target.closest("button"))return;start=[e.clientX,e.clientY];});
  root.addEventListener("pointercancel",()=>{start=null;});
  root.addEventListener("pointerup",e=>{
    if(!start)return;
    const x=e.clientX-start[0],y=e.clientY-start[1];start=null;
    if(Math.abs(x)>45&&Math.abs(x)>Math.abs(y)*1.5)onMove(x<0?1:-1);
  });
  root.addEventListener("keydown",e=>{
    if(e.key==="ArrowRight"||e.key==="ArrowLeft"){e.preventDefault();onMove(e.key==="ArrowRight"?1:-1);root.focus();}
  });
}
