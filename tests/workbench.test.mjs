import {test} from 'node:test';
import assert from 'node:assert/strict';
import {calculate,effectiveClock,commanderSegment,minutePillar,palacesOf,flowPillars,relations} from '../src/engine.js';
import {analyzeBazi,readingMarkdown} from '../src/reading.js';
import {shensha,SHENSHA_NAMES} from '../src/rules.js';
import {fullAge,ageInYear,fortuneShensha,wealthStudy,multiStudy,cleanRecord,cleanPreferences} from '../src/workbench.js';
const base={name:'测试甲',date:'1990-06-15',time:'10:30',gender:1,sect:2,utcOffset:8,longitude:116.4,yearBoundary:'exact',palaceMethod:'jie',minutePillar:false};
const pillars=values=>values.map((value,i)=>({label:['年柱','月柱','日柱','时柱'][i],value,gan:value[0],zhi:value[1]}));
test('minute pillar reproduces the 2012 published worked example',()=>{
 const r=calculate({...base,date:'2011-09-12',time:'13:03',minutePillar:true});
 assert.equal(r.pillars[3].value,'癸未');assert.equal(r.minutePillar.value,'壬子');assert.equal(r.minutePillar.index,0);
 assert.equal(calculate(base).minutePillar,null);
});
test('minute segments are half-open, 10 minutes each, and midnight continues Zi',()=>{
 const value=time=>calculate({...base,date:'2011-09-12',time,minutePillar:true}).minutePillar;
 assert.equal(value('13:09').value,'壬子');assert.equal(value('13:10').value,'癸丑');assert.equal(value('14:00').value,'戊午');assert.equal(value('14:59').index,11);assert.equal(value('15:00').index,0);
 assert.equal(value('23:59').index,5);assert.equal(value('00:00').index,6);assert.equal(value('00:59').index,11);assert.equal(value('01:00').index,0);
});
test('minute pillar uses the effective clock including DST and solar corrections',()=>{
 const i={...base,minutePillar:true,trueSolar:true,dst:true,longitude:75},r=calculate(i),c=effectiveClock(i).clock;
 assert.deepEqual(r.minutePillar,minutePillar(c,r.pillars[3].gan,r.pillars[2].gan));
});
test('year boundary alternatives differ at Li Chun morning and before Spring Festival',()=>{
 const i={...base,date:'2024-02-04',time:'12:00'};
 const a=calculate(i),b=calculate({...i,yearBoundary:'lichunDay'}),c=calculate({...i,yearBoundary:'springFestival'});
 assert.equal(a.pillars[0].value,'癸卯');assert.equal(b.pillars[0].value,'甲辰');assert.equal(c.pillars[0].value,'癸卯');
 assert.notEqual(a.yun.forward,b.yun.forward);assert.deepEqual(a.pillars.slice(1),b.pillars.slice(1));
 const after=calculate({...i,time:'17:00'}),lunar=calculate({...i,time:'17:00',yearBoundary:'springFestival'});
 assert.equal(after.pillars[0].value,'甲辰');assert.equal(lunar.pillars[0].value,'癸卯');assert.equal(after.zodiac,'龙');assert.equal(lunar.zodiac,'兔');
});
test('physical year boundary is independent of the chosen local clock',()=>{
 const china=calculate({...base,date:'2024-02-04',time:'16:28',yearBoundary:'springFestival'}),mel=calculate({...base,date:'2024-02-04',time:'19:28',utcOffset:10,dst:true,yearBoundary:'springFestival',trueSolar:true});
 assert.equal(china.pillars[0].value,mel.pillars[0].value);assert.equal(china.pillars[1].value,mel.pillars[1].value);
});
test('palace formula matches the published month8+hour3=11 example',()=>{
 const p=pillars(['戊寅','辛酉','戊申','丙辰']);
 assert.equal(palacesOf(p).ming,'丙辰');assert.equal(palacesOf(p,true).ming,'乙卯');
 const a=calculate({...base,date:'2024-03-15',palaceMethod:'qi'}),b=calculate({...base,date:'2024-03-25',palaceMethod:'qi'});
 assert.equal(a.auxiliary.命宫,calculate({...base,date:'2024-03-15'}).auxiliary.命宫);
 assert.notEqual(b.auxiliary.命宫,calculate({...base,date:'2024-03-25'}).auxiliary.命宫);
 assert.equal(b.auxiliary.身宫,calculate({...base,date:'2024-03-25'}).auxiliary.身宫);
});
test('commander boundaries use the documented 5/9, 10/3, 7/5 day sequences',()=>{
 assert.equal(commanderSegment('寅',6.999).stem,'戊');assert.equal(commanderSegment('寅',7).stem,'丙');assert.equal(commanderSegment('寅',14).stem,'甲');
 assert.equal(commanderSegment('巳',5).stem,'庚');assert.equal(commanderSegment('巳',14).stem,'丙');assert.equal(commanderSegment('申',10).stem,'壬');assert.equal(commanderSegment('申',13).stem,'庚');assert.equal(commanderSegment('亥',12).stem,'壬');assert.equal(commanderSegment('亥',31).stem,'壬');
 assert.throws(()=>commanderSegment('寅',-1));
});
test('commander switches at the actual Jie instant, not at midnight',()=>{
 const a=calculate({...base,date:'2024-02-04',time:'16:26'}),b=calculate({...base,date:'2024-02-04',time:'16:28'});
 assert.equal(a.commander.stem,'己');assert.equal(b.commander.stem,'戊');assert.ok(b.commander.elapsed<1/1440);
});
test('screenshot sample has Zi-Si hidden combination and both pillar control directions',()=>{
 const p=pillars(['己巳','丙子','丙寅','戊子']);
 assert.ok(relations(p).some(r=>r.type==='地支暗合'&&r.text.includes('巳子')));
 const r=calculate({...base,date:'1990-06-15'});assert.ok(r.wholePillars.some(r=>r.type==='盖头'));assert.ok(r.wholePillars.some(r=>r.type==='截脚'));
});
test('expanded shensha has 40 unique names with exact target evidence',()=>{
 assert.equal(SHENSHA_NAMES.length,40);assert.equal(new Set(SHENSHA_NAMES).size,40);
 const p=pillars(['己巳','丙子','丙寅','戊子']),hits=shensha(p,p,{gender:1});
 assert.ok(hits.some(h=>h.name==='德秀贵人'));assert.ok(hits.every(h=>h.evidence.includes(h.target)));
 const future={label:'大运',value:'辛酉',gan:'辛',zhi:'酉'};
 assert.ok(shensha(p,[future]).some(h=>h.name==='天乙贵人'&&h.target==='大运'));
 assert.ok(!shensha(p,[future]).some(h=>['十灵日','魁罡'].includes(h.name)));
});
test('Yuan Chen and Gou Jiao reverse with gender and follow the classical examples',()=>{
 const p=pillars(['甲子','丙寅','庚午','丁卯']);
 const target=v=>({label:v,value:'乙'+v,gan:'乙',zhi:v});
 const male=shensha(p,[target('未'),target('巳'),target('卯'),target('酉')],{gender:1}),female=shensha(p,[target('未'),target('巳'),target('卯'),target('酉')],{gender:0});
 assert.equal(male.find(h=>h.name==='元辰').target,'未');assert.equal(female.find(h=>h.name==='元辰').target,'巳');
 assert.ok(male.find(h=>h.name==='勾绞煞'&&h.target==='卯').source.includes('勾'));
 assert.ok(female.find(h=>h.name==='勾绞煞'&&h.target==='卯').source.includes('绞'));
});
test('true academy and word hall require the natal year nayin and exact target pillar',()=>{
 const p=pillars(['甲子','丙寅','庚午','丁卯']);p[0].nayin='海中金';
 const t=values=>values.map((value,i)=>({label:'目标'+i,value,gan:value[0],zhi:value[1]}));
 const hits=shensha(p,t(['辛巳','壬申','癸巳','甲申']));
 assert.deepEqual(hits.filter(h=>h.name==='学堂').map(h=>h.target),['目标0']);assert.deepEqual(hits.filter(h=>h.name==='词馆').map(h=>h.target),['目标1']);
});
test('decade and year shensha are evaluated against natal sources',()=>{
 const r=calculate(base),f=fortuneShensha(r,1,shensha);assert.equal(f.targets.length,11);assert.equal(f.targets[0].label,'大运');
 assert.deepEqual(f.hits,shensha(r.pillars,f.targets,{gender:base.gender}));
 assert.ok(!fortuneShensha(r,0,shensha).targets.some(t=>t.label==='大运'));
 assert.ok(flowPillars({...base,gender:0},'2026-10-28').shensha.every(h=>h.target.startsWith('流')));
});
test('full age changes on the Gregorian birthday, with a year range',()=>{
 assert.equal(fullAge('1990-06-15','2026-06-14'),35);assert.equal(fullAge('1990-06-15','2026-06-15'),36);assert.equal(ageInYear('1990-06-15',2026),'35—36周岁');assert.equal(ageInYear('1990-01-01',2026),'36周岁');
});
test('wealth study inventories actual visible and hidden ten gods without counting day self',()=>{
 const r=calculate(base),w=wealthStudy(r);assert.equal(w.element,'木');assert.ok(w.wealth.some(h=>h.god==='正财'&&h.position==='日柱'&&h.layer.startsWith('藏干')));assert.ok(!w.peers.some(h=>h.position==='日柱'&&h.layer==='透干'));
 assert.ok(w.wealth.every(h=>['正财','偏财'].includes(h.god)));
});
test('four-chart comparison creates six independent pairs and preserves input rules',()=>{
 const inputs=[base,{...base,name:'乙',date:'1992-09-18',gender:0},{...base,name:'丙',date:'2024-02-04',time:'12:00'},{...base,name:'丁',date:'2024-02-04',time:'12:00',yearBoundary:'lichunDay'}];
 const m=multiStudy(inputs);assert.equal(m.charts.length,4);assert.equal(m.pairs.length,6);assert.notEqual(m.charts[2].pillars[0].value,m.charts[3].pillars[0].value);assert.throws(()=>multiStudy([base]));assert.throws(()=>multiStudy([...inputs,base]));
});
test('version1 records migrate with notes intact and harmless default context',()=>{
 const r=cleanRecord({input:base,note:'旧版笔记',starred:true,tags:'样例'},base,'new-id');
 assert.equal(r.category,'bazi');assert.equal(r.note,'旧版笔记');assert.equal(r.feedback,'');assert.equal(r.commentary,'');assert.equal(r.context.multiInputs.length,0);assert.equal(r.id,'new-id');
});
test('version2 case streams, counterpart and multi snapshots survive normalization',()=>{
 const raw={input:base,category:'multi',note:'依据',feedback:'反馈',commentary:'点评',context:{baziMode:'reading',flowDate:'2026-10-28',flowTime:'23:30',decade:3,year:7,ziweiScope:'age',partner:{...base,gender:0},multiInputs:[{...base,name:'乙'}]}};
 const r=cleanRecord(raw,base,'id');assert.equal(r.feedback,'反馈');assert.equal(r.commentary,'点评');assert.equal(r.context.multiInputs[0].name,'乙');assert.equal(r.context.ziweiScope,'age');assert.equal(r.context.partner.gender,0);assert.equal(r.context.decade,3);
});
test('import rejects malformed dates including nested snapshots and caps fields',()=>{
 assert.throws(()=>cleanRecord({input:{...base,date:'2026-02-30'}},base,'id'));
 assert.throws(()=>cleanRecord({input:base,context:{multiInputs:[{...base,date:'2026-02-30'}]}},base,'id'));
 assert.throws(()=>cleanRecord({input:base,context:{flowDate:'2026-02-30'}},base,'id'));
 const r=cleanRecord({input:base,category:'<script>',note:'x'.repeat(50001),context:{decade:99,year:-3}},base,'id');assert.equal(r.category,'bazi');assert.equal(r.note.length,50000);assert.equal(r.context.decade,12);assert.equal(r.context.year,0);
 const p=cleanPreferences({theme:'<x>',font:200,hiddenShensha:[null,'天乙贵人'],ageMode:'full'});assert.equal(p.theme,'cinnabar');assert.equal(p.font,14);assert.deepEqual(p.hiddenShensha,['天乙贵人']);assert.equal(p.ageMode,'full');
});

test('wealth hidden stem labels use the explicit main, middle, residual qi order',()=>{
 const w=wealthStudy(calculate(base));
 const hits=[...w.wealth,...w.output,...w.peers];
 assert.ok(hits.every(h=>!h.layer.includes('undefined')));
 const r=calculate(base);r.pillars[3].hidden=[{gan:'庚',god:'劫财'},{gan:'丙',god:'正财'},{gan:'戊',god:'食神'}];
 // Only the branch's fixed table determines the layer, regardless of engine array order.
 const x=wealthStudy(r);assert.equal(x.peers.find(h=>h.stem==='庚'&&h.layer.startsWith('藏干')).layer,'藏干余气');assert.equal(x.output.find(h=>h.stem==='戊').layer,'藏干中气');
});
test('exported reading preserves new calculation choices and separates commander from strength',()=>{
 const r=calculate({...base,yearBoundary:'springFestival',palaceMethod:'qi',minutePillar:true}),md=readingMarkdown(analyzeBazi(r));
 assert.ok(md.includes('正月初一（UTC+8）'));assert.ok(md.includes('过中气按下月'));assert.ok(md.includes(r.minutePillar.value+'（独立展示）'));assert.ok(md.includes('不参与本报告旺衰判断'));assert.ok(!md.includes('undefined'));
});
