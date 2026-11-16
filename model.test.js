import test from "node:test";
import assert from "node:assert/strict";
import {dateKey,moveDay,fresh,dayStatus,metrics,elapsed,migrate,validate,DAY} from "./model.js";

const today=dateKey();
const yesterday=moveDay(today,-1);
const now=Date.now();
const make=(extra)=>({id:crypto.randomUUID(),at:now-10000,mode:"vape",day:today,type:"pass",amount:0,note:"",...extra});
test("a use supersedes a confirmation, preserves earlier confirmed days and resets the series",()=>{
  const s=fresh();
  s.settings.vape.start=now-DAY*4;
  s.events.push(make({day:yesterday}),make({}),make({type:"use",amount:2}));
  assert.equal(dayStatus(s,"vape",today),"used");
  assert.equal(metrics(s,"vape",today,now).clean,1);
  assert.equal(elapsed(s,"vape",now),10000);
  assert.equal(dayStatus(s,"soda",today),"empty");
});
test("water unlocks goal achievement once the same day reaches the configured amount",()=>{
  const s=fresh();s.settings.water.goal=500;
  s.events.push(make({mode:"water",type:"drink",amount:250}),make({mode:"water",type:"drink",amount:250}));
  const m=metrics(s,"water",today,now);
  assert.equal(m.totals.at(-1),500);
  assert.equal(m.reached,1);
  assert.equal(m.badges.find(b=>b[0]==="Цель закрыта")[2],true);
});
test("legacy imports reuse the existing water history and translate spending periods",()=>{
  const s=fresh();s.events.push(make({mode:"water",type:"drink",amount:300}));
  const old={version:1,tracker:"vape",state:{start:now-5*DAY,spend:1500,spendPeriod:"month",entries:[{id:"p",kind:"puff",at:now-4*DAY,count:1}],checks:{[yesterday]:true}}};
  const result=migrate(old,s).state;
  assert.equal(result.events.length,3);
  assert.equal(result.settings.vape.period,"month");
  assert.deepEqual(validate(result),result);
});
test("corrupt histories and foreign trackers cannot be imported",()=>{
  const s=fresh(); s.events.push(make({mode:"soda",type:"urge"}));
  assert.equal(validate(s),null);
  assert.equal(migrate({version:1,tracker:"unrecognized",state:{entries:[]}},fresh()),null);
});

import {campaign,construction,plotChanges,scenePlots,MILESTONES} from "./village-model.js";

const confirmations=(n)=>Array.from({length:n},(_,i)=>make({day:moveDay(today,-i)}));
test("a settlement grows from a single tent to multiple districts and a year finale",()=>{
  const s=fresh();
  assert.equal(campaign(s,today).count,0);
  for(const [days,asset] of [[1,"camp"],[2,"frame"],[3,"house"],[14,"river-dock"],[30,"fountain"]]){
    s.events=confirmations(days);
    assert.equal(campaign(s,today).stage.day,days);
    assert.ok(scenePlots("river",days).some(p=>p.asset===asset));
  }
  assert.ok(!scenePlots("river",3).some(p=>p.asset==="frame"));
  s.events=confirmations(365);
  assert.equal(campaign(s,today).count,365);
  assert.equal(campaign(s,today).next,null);
  assert.equal(campaign(s,today).regions.length,4);
  assert.equal(MILESTONES.at(-1).day,365);
});
test("one puff or an unsuccessful day resets the whole world even after confirming",()=>{
  for(const type of ["use","fail"]){
    const s=fresh();
    s.events=[...confirmations(365),make({type,amount:type==="use"?1:0})];
    assert.ok(validate(s));
    assert.equal(campaign(s,today).count,0);
    assert.equal(campaign(s,today).today,"failed");
    assert.equal(campaign(s,today).regions.length,1);
    assert.deepEqual(scenePlots("river",campaign(s,today).count),[]);
    const tomorrow=moveDay(today,1);
    s.events.push(make({day:tomorrow}));
    assert.equal(campaign(s,tomorrow).count,1);
  }
});
test("today remains open, but skipping a full day breaks the building streak",()=>{
  const s=fresh();
  s.events=[make({day:yesterday}),make({day:moveDay(today,-2)})];
  assert.equal(campaign(s,today).count,2);
  assert.equal(campaign(s,moveDay(today,1)).count,0);
});

test("intermediate days show advancing construction before land, paths and buildings unlock",()=>{
  assert.equal(construction("river",8).elapsed,1);
  assert.equal(construction("river",9).elapsed,2);
  assert.equal(construction("river",24).elapsed,3);
  assert.equal(construction("river",59).elapsed,9);
  assert.equal(construction("island",59),null);
  assert.equal(construction("gardens",364).elapsed,19);
});

import {roadSurface,VALLEY_ROADS} from "./village-roads.js";

test("the early roads stay unpaved and city roads reach the new lateral plots",()=>{
  assert.ok(VALLEY_ROADS.filter(road=>road.day<30).every(road=>roadSurface(road,29)==="earth"));
  assert.equal(roadSurface(VALLEY_ROADS[0],30),"stone");
  assert.ok(VALLEY_ROADS.some(road=>road.day===25&&roadSurface(road,30)==="stone"));
  const city=scenePlots("river",30);
  assert.ok(city.some(plot=>plot.x<0));
  assert.ok(city.some(plot=>plot.x>100));
  assert.ok(VALLEY_ROADS.some(road=>road.points.at(-1)[0]<0));
  assert.ok(VALLEY_ROADS.some(road=>roadSurface(road,30)==="stone"&&road.points.at(-1)[0]>100));
});

test("a finished house replaces its old frame and the garden moves without a duplicate",()=>{
  const house=[...plotChanges("river",2,3)].find(([plot])=>plot.id==="first-home");
  assert.equal(house[1].kind,"replace");
  assert.equal(house[1].previous.asset,"frame");
  const garden=[...plotChanges("river",17,18)].find(([plot])=>plot.id==="kitchen-garden");
  assert.equal(garden[1].kind,"move");
  assert.ok(garden[0].x<garden[1].previous.x);
  assert.equal(scenePlots("river",18).filter(plot=>plot.id==="kitchen-garden").length,1);
  assert.equal(plotChanges("river",null,30).size,0);
});

test("valley road centerlines stay out of the main building footprints",()=>{
  for(const days of [6,7,10,12,14,18,21,25,30,40,50]){
    const buildings=scenePlots("river",days).filter(p=>["house","workshop","mill","market","lighthouse"].includes(p.asset));
    for(const road of VALLEY_ROADS.filter(r=>r.day<=days)){
      for(let i=1;i<road.points.length;i++){
        const [[ax,ay],[bx,by]]=road.points.slice(i-1,i+1);
        for(let t=0;t<=1;t+=.1){
          const x=ax+(bx-ax)*t,y=ay+(by-ay)*t;
          for(const building of buildings){
            const inside=Math.abs(x-building.x)<building.w*.19&&y>building.y-building.w*.20&&y<building.y-1.7;
            assert.equal(inside,false,`Day ${days}: road enters ${building.asset} at ${x}, ${y}`);
          }
        }
      }
    }
  }
});
