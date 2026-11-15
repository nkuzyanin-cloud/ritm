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
