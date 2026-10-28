import {test} from 'node:test';
import assert from 'node:assert/strict';
import {calculate,effectiveClock,lunarToSolar,lunarDateOf,shiftInput,reversePillars,solarTerms,almanac,wuYunLiuQi,ziwei,qimen,relations,flowPillars} from '../src/engine.js';
import {shensha} from '../src/rules.js';
const b={date:'1990-06-15',time:'10:30',gender:1,sect:2};
test('UTC offsets preserve the same physical term boundary while keeping local day/hour fields',()=>{
 const bj=calculate({...b,date:'2024-02-04',time:'16:28',utcOffset:8});
 const london=calculate({...b,date:'2024-02-04',time:'08:28',utcOffset:0});
 assert.deepEqual(london.pillars.slice(0,2).map(p=>p.value),bj.pillars.slice(0,2).map(p=>p.value));
 assert.equal(effectiveClock({...b,time:'23:30',utcOffset:-5}).standard.toISOString().slice(0,16),'1990-06-16T12:30');
 assert.equal(effectiveClock({...b,utcOffset:10,trueSolar:true,longitude:150}).correction.toFixed(4),effectiveClock({...b,utcOffset:8,trueSolar:true,longitude:120}).correction.toFixed(4));
 assert.throws(()=>effectiveClock({...b,utcOffset:15}));
});
test('lunar input handles Spring Festival, valid leap months and invalid leap selection',()=>{
 assert.equal(lunarToSolar(2024,1,1),'2024-02-10');
 assert.equal(lunarToSolar(2023,2,1,true),'2023-03-22');
 assert.deepEqual(lunarDateOf('2023-03-22'),{year:2023,month:2,day:1,leap:true});
 assert.throws(()=>lunarToSolar(2024,2,1,true));assert.throws(()=>lunarToSolar(2024,1,31));
});
test('shensha records traceable hits and distinguishes Tian De stem and branch tests',()=>{
 const p=['甲子','丙寅','甲辰','丁丑'].map((value,i)=>({label:['年柱','月柱','日柱','时柱'][i],value,gan:value[0],zhi:value[1]}));
 const hits=shensha(p);assert.ok(hits.some(h=>h.name==='天乙贵人'&&h.target==='时柱'&&h.evidence.includes('丑未')));
 assert.ok(hits.some(h=>h.name==='天德贵人'&&h.target==='时柱'&&h.evidence.includes('丁')));
 assert.ok(!hits.some(h=>h.name==='天医'&&h.target==='月柱'));
});
test('seasonal earth month with a peer as main qi is not labelled Jian Lu',()=>{
 const r=calculate({...b,date:'2024-04-14',time:'12:00',structureMethod:'本气'});
 assert.equal(r.pillars[1].zhi,'辰');assert.equal(r.pillars[2].gan,'戊');
 assert.equal(r.structure.god,'比肩');assert.notEqual(r.structure.name,'建禄候选');
 const d=calculate(b);assert.ok(Object.keys(d.auxiliary).includes('胎息'));assert.equal(d.decades.length,13);
 assert.ok(d.decades[1].years.every(y=>/^[甲乙丙丁戊己庚辛壬癸][子丑寅卯辰巳午未申酉戌亥]$/.test(y.small)));
});
test('relation detection covers harm, break, punishment and complete seasonal meetings',()=>{
 const p=['甲寅','丙卯','戊辰','庚巳','壬申'].map((value,i)=>({label:String(i),value,gan:value[0],zhi:value[1]}));
 const r=relations(p);for(const type of ['地支六害','地支相破','刑支相见','三会齐备'])assert.ok(r.some(x=>x.type===type),type);
});
test('reverse lookup round trips an original sample and can search years beyond host current year',()=>{
 assert.ok(reversePillars(['癸亥','甲子','庚辰','丙子'],1924,1924).some(x=>x.date==='1924-01-02'&&x.time==='00:00'));
 const future=calculate({...b,date:'2084-06-15',time:'10:00'});const matches=reversePillars(future.pillars.map(p=>p.value),2084,2084);
 assert.ok(matches.some(x=>x.date==='2084-06-15'));assert.throws(()=>reversePillars(['甲丑','甲子','庚辰','丙子']));
});
test('almanac and 24-term year have complete, ordered local data',()=>{
 const terms=solarTerms(2026);assert.equal(terms.length,24);assert.equal(new Set(terms.map(x=>x.name)).size,24);
 assert.equal(terms[0].name,'小寒');assert.equal(terms[23].name,'冬至');
 const a=almanac('2024-02-10');assert.ok(a.lunar.includes('正月初一'));assert.equal(a.times.length,13);assert.equal(a.times[0].range,'00:00—00:59');assert.equal(a.times.at(-1).range,'23:00—23:59');assert.ok(a.yi.length>0);
});
test('wu yun liu qi uses the traditional year map and continuous solar-term intervals',()=>{
 const w=wuYunLiuQi(2024);assert.equal(w.value,'甲辰');assert.equal(w.movement,'土');assert.equal(w.state,'太过');assert.equal(w.sitian,'太阳寒水');assert.equal(w.zaiquan,'太阴湿土');
 assert.equal(w.steps[2].guest,w.sitian);assert.equal(w.steps[5].guest,w.zaiquan);
 assert.ok(w.steps.every((s,i)=>s.start<s.end&&(!i||w.steps[i-1].end===s.start)));
 assert.ok(wuYunLiuQi(2099).steps[5].end.startsWith('2100-01-'));
});
test('Ziwei flow layers map all palaces and four flights have resolvable targets',()=>{
 const z=ziwei(b,'2026-10-28','23:00');
 for(const name of ['decadal','age','yearly','monthly','daily','hourly']){assert.equal(z.flow[name].palaceNames.length,12);assert.equal(z.flow[name].mutagen.length,4);}
 assert.equal(z.flights.length,12);assert.ok(z.flights.every(fs=>fs.length===4&&fs.every(f=>Number.isInteger(f.target)&&f.target>=0&&f.target<12)));
 assert.equal(ziwei({...b,ziweiAlgorithm:'zhongzhou',ziweiType:'earth'}).palaces.length,12);
});
test('manual Qimen respects supplied yin/yang and ju, while flow relations include a flow pillar',()=>{
 const q=qimen({...b,qimenMethod:'手动',qimenYinYang:'陰',qimenJu:3}).chart;assert.equal(q.陰陽,'陰');assert.equal(q.局數,3);assert.equal(q.定局法,'手动');
 assert.throws(()=>qimen({...b,qimenMethod:'手动',qimenJu:0}));
 const f=flowPillars(b,'2026-10-28');assert.equal(f.pillars.length,4);assert.ok(f.relations.every(x=>x.text.includes('流')));
 assert.equal(shiftInput({...b,date:'2024-02-28',time:'23:30'},120).date,'2024-02-29');
});
