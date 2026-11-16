import {campaign,construction,plotChanges,scenePlots,REGIONS} from "./village-model.js";
import {drawFences,drawRoads,VALLEY_ROADS} from "./village-roads.js";

const ASSETS="./assets/village/";
const DIM={width:450,height:800};
const VALLEY_FLANK=30;
const cameraPositions=new Map();
const RIVER=[[75,0],[67,7],[61,13],[52,21],[48,29],[52,36],[52,43],[49,53],[50,59],[56,64],[59,70],[62,76],[61,81],[62,85],[64,90],[65,95],[61,100]];
const SCENES={
  river:{
    water:RIVER, spread:2.3,
    roads:VALLEY_ROADS
  },
  island:{
    water:[[4,13],[3,26],[2,43],[2,55],[4,66],[15,85],[26,91],[51,96]],spread:5,
    roads:[{day:70,points:[[32,81],[42,79],[51,70],[60,65]]},{day:80,points:[[55,69],[62,75],[76,82]]},{day:90,points:[[59,67],[60,58],[63,50],[67,41],[69,35]]}]
  },
  alpine:{
    roads:[{day:105,points:[[45,100],[44,88],[52,78],[49,66],[45,61],[40,58]]},{day:120,points:[[49,68],[58,66],[68,58],[74,48]]},{day:165,points:[[49,81],[62,80],[73,78],[81,76]]},{day:225,points:[[66,57],[74,49],[76,41],[74,39]]}],
    rail:{day:150,points:[[24,43],[28,49],[34,59],[38,69],[42,76],[47,79],[84,79],[99,82]]},
    channel:{day:195,points:[[7,94],[23,93],[38,91],[59,90],[81,92],[99,94]]}
  },
  gardens:{
    water:[[93,0],[91,13],[90,24],[91,35],[94,48],[96,55],[95,72],[94,84],[94,100]],spread:3,
    roads:[{day:255,points:[[20,100],[27,84],[36,70],[46,59],[56,55],[64,58],[70,68]]},{day:270,points:[[69,68],[77,72],[83,70]]},{day:300,points:[[45,60],[40,50],[37,41]]},{day:330,points:[[65,58],[70,48],[77,43]]}],
    rail:{day:315,points:[[23,89],[31,82],[38,74],[67,74],[75,78],[80,83]]},
    highRail:{day:285,points:[[12,51],[22,43],[31,41],[69,41],[76,38],[84,30]]}
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
function spriteArt(plot){
  const {asset,fx}=plot;
  const src=asset==="foundation"?"frame":asset;
  return '<div class="plot-sprite asset-'+src+' '+(fx??"")+' '+(asset==="foundation"?"foundation":"")+'"><img src="'+ASSETS+src+'.webp" alt="" draggable="false">'+effect(fx)+buildingMaterials(plot)+'</div>';
}
function sprite(plot,change,flank){
  const {x,y,w}=plot;
  const scale=100/(100+flank*2);
  const style='--x:'+(x+flank)*scale+'%;--y:'+y+'%;--size:'+w*scale+'%';
  const current=spriteArt(plot);
  if(!change)return '<div class="world-plot" style="'+style+'">'+current+'</div>';
  const old=change.previous;
  if(change.kind==="move")return '<div class="world-plot plot-moving" style="'+style+';--from-x:'+(old.x+flank)*scale+'%;--from-y:'+old.y+'%">'+current+'</div>';
  const departing=old?'<div class="plot-before" style="--old-size:'+old.w/w*100+'%">'+spriteArt(old)+'</div>':'';
  const scaffold='<img class="plot-construction" src="'+ASSETS+'construction-cover.webp" alt="" draggable="false">';
  return '<div class="world-plot plot-building" style="'+style+'"><div class="plot-after">'+current+'</div>'+departing+scaffold+'</div>';
}
export function villageView(state,region,buildFrom,icon){
  const progress=campaign(state);
  const place=progress.regions.find(item=>item.id===region)??REGIONS[0];
  const flank=place.id==="river"?VALLEY_FLANK:0;
  const work=construction(place.id,progress.count);
  const buildings=scenePlots(place.id,progress.count);
  const changes=plotChanges(place.id,buildFrom,progress.count);
  const options=progress.regions.map(r=>r.name).join(", ");
  const regionIndex=progress.regions.indexOf(place);
  const focusPlot=[...changes.keys()].find(p=>p.x<5||p.x>95);
  return '<section class="village-view" data-world="'+place.id+'" data-days="'+progress.count+'" aria-label="'+place.name+'. Дней подряд: '+progress.count+'. '+(flank?'Долину можно прокручивать влево и вправо. ':'')+(progress.regions.length>1?'Районы: '+options+'.':'')+'" tabindex="0">'+
    '<div class="world-viewport '+(flank?"wide":"")+'" '+(focusPlot?'data-focus-x="'+focusPlot.x+'"':'')+'><div class="world-land" style="--map-width:'+(100+2*flank)+'%" aria-hidden="true">'+
    '<img class="terrain" src="'+ASSETS+(flank?"river-valley":place.id)+'.webp" alt="" draggable="false"><canvas class="world-canvas"></canvas>'+
    (work?sprite(work,null,flank):'')+
    buildings.map(plot=>sprite(plot,changes.get(plot),flank)).join("")+
    (progress.count>=365?'<div class="festival"><i></i><i></i><i></i></div>':'')+'</div></div>'+
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
function drawStatic(ctx,scene,days,offset){
  drawRoads(ctx,scene.roads,days,offset);
  if(scene===SCENES.river)drawFences(ctx,days,offset);
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
let lastValleyDays=0;
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
  const viewport=root.querySelector(".world-viewport");
  const wide=viewport.classList.contains("wide");
  const offset=wide?DIM.width*VALLEY_FLANK/100:0;
  const sceneWidth=DIM.width+2*offset;
  if(wide){
    if(days===0&&lastValleyDays>0)cameraPositions.delete("river");
    lastValleyDays=days;
    const width=viewport.clientWidth;
    const target=viewport.dataset.focusX;
    viewport.scrollLeft=target?(Number(target)+VALLEY_FLANK)/100*width-width/2:(cameraPositions.get("river")??.3)*width;
    viewport.addEventListener("scroll",()=>cameraPositions.set("river",viewport.scrollLeft/viewport.clientWidth),{passive:true});
  }
  const dpr=Math.min(1.6,window.devicePixelRatio||1);
  canvas.width=backing.width=sceneWidth*dpr;
  canvas.height=backing.height=DIM.height*dpr;
  ctx.scale(dpr,dpr);
  const back=backing.getContext("2d");back.scale(dpr,dpr);
  drawStatic(back,scene,days,offset);
  const reduce=matchMedia("(prefers-reduced-motion: reduce)");
  let frame=0;
  function draw(time){
    if(frame&&time-frame<34)return;
    frame=time;
    ctx.clearRect(0,0,sceneWidth,DIM.height);
    const animate=reduce.matches?0:time/1000;
    ctx.drawImage(backing,0,0,sceneWidth,DIM.height);
    ctx.save();ctx.translate(offset,0);
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
    ctx.restore();
  }
  if(reduce.matches)draw(0);
  else{
    const loop=time=>{if(!root.isConnected)return;draw(time);animation=requestAnimationFrame(loop);};
    animation=requestAnimationFrame(loop);
  }
  let start;
  if(wide){
    viewport.addEventListener("pointerdown",e=>{
      if(e.pointerType!=="mouse"||e.button!==0)return;
      e.preventDefault();
      viewport.setPointerCapture(e.pointerId);
      viewport.classList.add("dragging");
      start={x:e.clientX,left:viewport.scrollLeft};
    });
    viewport.addEventListener("pointermove",e=>{
      if(start)viewport.scrollLeft=start.left+start.x-e.clientX;
    });
    const release=()=>{start=null;viewport.classList.remove("dragging");};
    viewport.addEventListener("lostpointercapture",release);
    viewport.addEventListener("pointercancel",release);
  }else{
    root.addEventListener("pointerdown",e=>{if(e.target.closest("button"))return;start=[e.clientX,e.clientY];});
    root.addEventListener("pointercancel",()=>{start=null;});
    root.addEventListener("pointerup",e=>{
      if(!start)return;
      const x=e.clientX-start[0],y=e.clientY-start[1];start=null;
      if(Math.abs(x)>45&&Math.abs(x)>Math.abs(y)*1.5)onMove(x<0?1:-1);
    });
  }
  root.addEventListener("keydown",e=>{
    if(!["ArrowRight","ArrowLeft"].includes(e.key))return;
    e.preventDefault();
    const direction=e.key==="ArrowRight"?1:-1;
    if(wide)viewport.scrollBy({left:direction*viewport.clientWidth*.26,behavior:reduce.matches?"instant":"smooth"});
    else onMove(direction);
  });
}
