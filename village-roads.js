import {PAVING_DAY} from "./village-model.js";

// Coordinates use the original valley's width. Negative and >100 values
// describe the western and eastern extensions of the same connected map.
export const VALLEY_ROADS = [
  {day:6,points:[[39,100],[38,92],[40,84],[43,76],[42,66],[41,56]]},
  {day:6,points:[[42,65],[40,62],[36.8,58.1]],width:7},
  {day:7,points:[[41,56],[42,52],[38,50],[31,50],[22,52],[12,52],[12,49],[11,46.6]]},
  {day:7,points:[[22,52],[27,49],[30.4,45]],width:7},
  {day:10,points:[[41,56],[42,53],[44,50.4],[46,50.3]]},
  {day:10,points:[[64,50.4],[69,52.5],[76,56],[85,55]]},
  {day:12,points:[[85,55],[85,53],[83.6,49.3]],width:7},
  {day:14,points:[[85,55],[89,61],[87,66],[82,68],[74.6,69.5]]},
  {day:18,points:[[40,84],[31,82],[20,81],[8,80],[-1,78],[-5,74.7]],width:12},
  {day:21,points:[[87,58],[92,53],[94,47],[91,43],[84,42],[78.4,39.5]]},
  {day:21,points:[[91,43],[94,39],[93,35],[91,33.8]],pave:false,width:7},
  {day:25,points:[[82,68],[77.5,73],[73.5,78],[72,83],[74,86]],width:11},
  {day:30,points:[[12,52],[0,50],[-8,47],[-12,44],[-12.5,41.5]],width:9},
  {day:30,points:[[89,61],[96,63],[103,66],[108,67.8],[111.2,67]],width:15},
  {day:30,points:[[104,66.5],[109,64],[114,60],[118,56],[117,53]],width:9},
  {day:40,points:[[74,86],[75,88],[77,90]],width:10},
  {day:50,points:[[84,42],[78,43],[72,44],[66,42],[63,38],[61,33],[62,28],[63.4,25.4]],width:8},
];

export const VALLEY_FENCES = [
  {day:6,points:[[46,74],[46.8,71.6],[46.3,69.2]]},
  {day:7,points:[[16,49.4],[19,48.6],[21,48.6]]},
  {day:14,points:[[77.2,66.5],[79.3,66.3],[82.4,65.9]]},
  {day:18,points:[[-16,67.1],[-10,68.1],[-4,68.1],[1,66.8]]},
  {day:21,points:[[75,35.1],[78,35.9],[83,37],[88,37.4],[90.8,36.9]]},
  {day:25,points:[[68.5,79],[68.8,82],[69.6,84.3]]},
];

export function roadSurface(road,days){
  return days>=PAVING_DAY&&road.pave!==false?"stone":"earth";
}

const point = ([x,y],dx)=>({x:x*4.5+dx,y:y*8});
const hash=(n)=>((Math.imul(n,0x45d9f3b)>>>0)%1009)/1009;
const grain = ["#786040","#9d794b","#d1ad72","#c1a064","#816d42","#736c42","#9b915e"];
const stones = ["#bdb29a","#b4a890","#9e947f","#aca089","#c9bda5","#8e8976","#c4b197"];

// Smooth the bends and sample the varying edges, so a path looks worn into
// the grass. The end width tapers for doorways and short spurs.
function roadOutline(road,dx){
  const pts=road.points.map(p=>point(p,dx));
  const samples=[];
  for(let i=0;i<pts.length-1;i++){
    const [p0,p1,p2,p3]=[pts[Math.max(0,i-1)],pts[i],pts[i+1],pts[Math.min(i+2,pts.length-1)]];
    const count=Math.ceil(Math.hypot(p2.x-p1.x,p2.y-p1.y)/4);
    for(let k=0;k<count;k++){
      const t=k/count,t2=t*t,t3=t2*t;
      const at=(a,b,c,d)=>.5*((2*b)+(-a+c)*t+(2*a-5*b+4*c-d)*t2+(-a+3*b-3*c+d)*t3);
      samples.push({x:at(p0.x,p1.x,p2.x,p3.x),y:at(p0.y,p1.y,p2.y,p3.y)});
    }
  }
  samples.push(pts.at(-1));
  const sides=samples.map((p,i)=>{
    const a=samples[Math.max(0,i-1)],b=samples[Math.min(samples.length-1,i+1)];
    const length=Math.hypot(b.x-a.x,b.y-a.y)||1;
    const taper=.57+.43*Math.min(Math.min(i,samples.length-1-i)/4,1);
    const radius=(road.width??10)*.5*taper;
    const irregular=Math.sin(i*1.19)*.65+Math.sin(i*.24)*1.05;
    const width=radius+irregular;
    const nx=(a.y-b.y)/length,ny=(b.x-a.x)/length;
    return [{x:p.x+width*nx,y:p.y+width*ny},{x:p.x-width*nx,y:p.y-width*ny}];
  });
  return [...sides.map(s=>s[0]),...sides.reverse().map(s=>s[1])];
}
function shapeFor(roads,dx){
  const path=new Path2D();
  for(const road of roads){
    const outline=roadOutline(road,dx);
    for(const [i,p] of outline.entries()){
      if(i===0)path.moveTo(p.x,p.y);
      else path.lineTo(p.x,p.y);
    }
    path.closePath();
  }
  return path;
}
function drawEarth(ctx,w,h){
  ctx.fillStyle="#a78c57";
  ctx.fillRect(0,0,w,h);
  for(let y=0;y<h;y+=2)for(let x=0;x<w;x+=2){
    const n=x*427+y*1193;
    ctx.fillStyle=grain[Math.floor(hash(n+923)*grain.length)];
    ctx.globalAlpha=.18+hash(n+61)*.37;
    ctx.fillRect(x+hash(n),y+hash(n+161),.7+hash(n+24)*1.55,.5+hash(n+65)*1.15);
  }
  ctx.globalAlpha=1;
}
function drawStone(ctx,w,h){
  ctx.fillStyle="#77715c";
  ctx.fillRect(0,0,w,h);
  const v=4.2,step=5.3;
  for(let row=-1;row*v<h+v;row++){
    for(let col=-1;col*step<w+step;col++){
      const n=row*4309+col*229;
      const x=col*step+(row%2)*step*.49+hash(n+11)*.6;
      const y=row*v+hash(n+14)*.52;
      const w=3.65+hash(n+19)*1.27, ht=2.65+hash(n+22)*1.08;
      ctx.fillStyle=stones[Math.floor(hash(n+5)*stones.length)];
      ctx.beginPath();
      ctx.moveTo(x+.45,y);
      ctx.lineTo(x+w-.45,y+.15);
      ctx.lineTo(x+w,y+ht*.38);
      ctx.lineTo(x+w-.32,y+ht-.27);
      ctx.lineTo(x+.55,y+ht);
      ctx.lineTo(x,y+ht*.67);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle="#e6d8b74d";
      ctx.fillRect(x+.7,y+.19,w-1.3,.38);
    }
  }
}
const textures=new Map();
function textureFor(surface){
  if(!textures.has(surface)){
    const tile=document.createElement("canvas");
    tile.width=surface==="stone"?53:64;
    tile.height=surface==="stone"?42:64;
    const paint=surface==="stone"?drawStone:drawEarth;
    paint(tile.getContext("2d"),tile.width,tile.height);
    textures.set(surface,tile);
  }
  return textures.get(surface);
}
export function drawRoads(ctx,roads,days,dx=0){
  for(const surface of ["earth","stone"]){
    const active=roads.filter(r=>r.day<=days&&roadSurface(r,days)===surface);
    if(!active.length)continue;
    const path=shapeFor(active,dx);
    ctx.save();
    ctx.lineWidth=1.1;
    ctx.lineJoin="round";
    ctx.strokeStyle=surface==="stone"?"#524c3b70":"#77704855";
    ctx.stroke(path);
    ctx.fillStyle=ctx.createPattern(textureFor(surface),"repeat");
    ctx.fill(path);
    ctx.restore();
  }
}

export function drawFences(ctx,days,offset){
  const visible=VALLEY_FENCES.filter(fence=>fence.day<=days);
  ctx.save();
  ctx.lineCap="round";
  for(const fence of visible){
    const posts=fence.points.map(p=>point(p,offset));
    const line=(points,color,width,y)=>{
      ctx.beginPath();
      points.forEach((p,i)=>i?ctx.lineTo(p.x,p.y+y):ctx.moveTo(p.x,p.y+y));
      ctx.lineWidth=width;
      ctx.strokeStyle=color;
      ctx.stroke();
    };
    line(posts,"#322a2052",3,1);
    for(const rail of [-5,-10]){
      line(posts,"#584225",3.8,rail);
      line(posts,"#b08855",1.2,rail-1);
    }
    for(const {x,y} of posts){
      ctx.fillStyle="#4b3b26";ctx.fillRect(x-2.4,y-13,4.8,13);
      ctx.fillStyle="#ba9461";ctx.fillRect(x-2.4,y-13,2.1,11.5);
      ctx.fillStyle="#dec193";ctx.fillRect(x-2.4,y-13,4.8,1.3);
    }
  }
  ctx.restore();
}
