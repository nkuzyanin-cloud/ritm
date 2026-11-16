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
  {day:14,points:[[85,55],[89,61],[87,68],[79,73],[71,76],[67,76]]},
  {day:18,points:[[40,84],[31,82],[20,81],[8,80],[-1,78],[-5,74.7]],width:12},
  {day:21,points:[[87,58],[93,52],[96,46],[94,40],[88,38],[82,37],[79.8,35.8]]},
  {day:25,points:[[79,73],[71,76],[67,76]],surface:"stone",width:13},
  {day:30,points:[[12,52],[0,50],[-8,47],[-12,44],[-12.5,41.5]],width:9},
  {day:30,points:[[89,61],[96,63],[103,66],[108,68],[111,68.8]],surface:"stone",width:15},
  {day:30,points:[[104,67],[109,64],[114,60],[118,56],[117,53]],surface:"stone",width:9},
  {day:40,points:[[73,75.5],[76,80],[79,87],[85,90],[91,88]],width:10},
  {day:50,points:[[94,40],[97,34],[94,29],[87,28]],width:8},
];

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
    const active=roads.filter(r=>r.day<=days&&(r.surface??"earth")===surface);
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
