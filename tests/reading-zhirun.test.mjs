import {test} from 'node:test';
import assert from 'node:assert/strict';
import lunar from 'lunar-javascript';
import {calculate,qimen,flowPillars} from '../src/engine.js';
import {analyzeBazi,assessStrength,seasonalProfile,decadeAt,readingMarkdown} from '../src/reading.js';
import {calculateJuByFuTou,getFuTouChainForRange,JIEQI_JUSHU,YUAN_NAMES} from 'qimen-dunjia';
const {LunarUtil:U,Solar}=lunar;
const base={name:'规则验证样例',date:'1990-06-15',time:'10:30',gender:1,sect:2,utcOffset:8};
// Synthetic pillar arrangements isolate rule conditions; they are not birth records.
function fixture(values){
 const r=calculate(base),day=values[2][0];
 r.pillars=values.map((value,i)=>({label:['年柱','月柱','日柱','时柱'][i],value,gan:value[0],zhi:value[1],hidden:U.ZHI_HIDE_GAN[value[1]].map(gan=>({gan,god:U.SHI_SHEN[day+gan]}))}));
 r.structure={name:'合成条件取格',method:'本气',god:U.SHI_SHEN[day+r.pillars[1].hidden[0].gan],reason:'合成规则条件'};
 r.relations=[];return r;
}
test('seasonal states follow generation/control, with earth-month residuals kept separate',()=>{
 assert.equal(seasonalProfile('卯','木').state,'旺');assert.equal(seasonalProfile('卯','火').state,'相');
 assert.equal(seasonalProfile('卯','水').state,'休');assert.equal(seasonalProfile('卯','金').state,'囚');assert.equal(seasonalProfile('卯','土').state,'死');
 assert.equal(seasonalProfile('丑','土').state,'旺');assert.equal(seasonalProfile('丑','土').residual,'水');
});
test('root qi levels do not depend on the library hidden-stem array order',()=>{
 const r=calculate(base),s=assessStrength(r.pillars);const root=s.roots.find(x=>x.value==='癸巳'&&x.gan==='庚');
 assert.equal(root.level,'余气');
 const reversed=r.pillars.map(p=>({...p,hidden:[...p.hidden].reverse()}));
 assert.deepEqual(assessStrength(reversed).methods.map(x=>x.status),s.methods.map(x=>x.status));
});
test('disagreement about secondary roots suppresses a single preference answer',()=>{
 const r=analyzeBazi(fixture(['甲寅','丙午','戊寅','丁卯']));
 assert.equal(r.strength.consensus,false);assert.equal(r.strength.status,'mixed');
 assert.deepEqual(r.preferences.assist,[]);assert.ok(r.strength.disagreements.some(x=>x.includes('中余气')));
});
test('surface-element counts do not determine strength or candidate preferences',()=>{
 const r=calculate(base),a=analyzeBazi(r),b=analyzeBazi({...r,counts:{木:999,火:0,土:999,金:0,水:999}});
 assert.deepEqual(a.strength,b.strength);assert.deepEqual(a.preferences,b.preferences);
 assert.ok(!Object.hasOwn(a.strength,'score'));
});
test('climate and balance conflicts are retained rather than silently choosing one',()=>{
 const r=analyzeBazi(fixture(['壬午','丙午','辛卯','癸卯']));
 assert.equal(r.strength.status,'weak');assert.deepEqual(r.preferences.assist,['土','金']);
 assert.ok(r.preferences.conflicts.some(x=>x.includes('水')));assert.ok(r.summary.some(x=>x.includes('冲突')));
});
test('structure checks trace both a supportive route and an obstruction to actual visible stems',()=>{
 const r=analyzeBazi(fixture(['辛卯','丁酉','甲午','癸酉']));
 for(const name of ['伤官见官','伤官配印','官印相生'])assert.ok(r.structure.combinations.some(x=>x.name===name),name);
 const hit=r.structure.combinations.find(x=>x.name==='伤官见官');
 assert.deepEqual(hit.evidence,['月柱丁为伤官','年柱辛为正官']);
 assert.ok(r.structure.conclusion.includes('复核'));
});
test('month structure uses the declared Si qi order and excludes the day master from visible selection',()=>{
 const r=calculate({...base,date:'2020-05-06',time:'08:00'});
 assert.deepEqual(r.pillars.map(p=>p.value),['庚子','辛巳','己酉','戊辰']);assert.equal(r.structure.stem,'戊');
 const noOtherWu=calculate({...base,date:'2020-05-15',time:'00:00'});
 assert.deepEqual(noOtherWu.pillars.map(p=>p.value),['庚子','辛巳','戊午','壬子']);
 assert.equal(noOtherWu.structure.stem,'庚');
});
test('strict follow screening distinguishes all-wealth conditions from a rooted day master',()=>{
 const candidate=analyzeBazi(fixture(['辛酉','辛酉','丁酉','辛酉']));
 assert.equal(candidate.specials[0].status,'从财严格条件候选');
 const rooted=analyzeBazi(fixture(['辛酉','辛酉','丁巳','辛酉']));
 assert.equal(rooted.specials[0].status,'不自动取从格');assert.ok(rooted.specials[0].evidence[0].includes('同五行藏根'));
});
test('earth four-storage special screening allows intrinsic hidden wood but rejects a visible controller',()=>{
 const a=analyzeBazi(fixture(['己丑','戊戌','戊辰','己未']));assert.equal(a.specials[1].status,'稼穑候选');
 const b=analyzeBazi(fixture(['乙丑','戊戌','戊辰','己未']));assert.equal(b.specials[1].status,'未满足本版专旺条件');
 const he=analyzeBazi(fixture(['甲子','己巳','甲辰','己巳']));assert.equal(he.specials[2].status,'见邻干五合，化气待辨');
});
test('a Yang earth day in Wu month retains a monthly-blade candidate alongside the month-god method',()=>{
 const r=analyzeBazi(fixture(['甲寅','丙午','戊寅','丁卯']));
 assert.equal(r.specials.find(x=>x.name==='建禄 / 月刃').status,'阳刃月候选');
 assert.ok(r.specials.find(x=>x.name==='建禄 / 月刃').evidence.some(x=>x.includes('戊刃在午')));
});
test('decade selection uses the actual first handover instant, including UTC offsets and later anniversaries',()=>{
 const r=calculate(base);assert.equal(r.yun.start,'1997-11-17 22:30:00');
 assert.equal(decadeAt(r,{date:'1997-11-17',time:'22:29'}).label,'童限');
 assert.equal(decadeAt(r,{date:'1997-11-17',time:'22:30'}).value,'癸未');
 assert.equal(decadeAt(r,{date:'2007-11-17',time:'22:29'}).value,'癸未');
 assert.equal(decadeAt(r,{date:'2007-11-17',time:'22:30'}).value,'甲申');
 assert.equal(decadeAt(r,{date:'2027-01-01',time:'12:00'}).value,'乙酉');
 assert.equal(decadeAt(r,{date:'1989-01-01',time:'12:00'}).label,'出生前时刻');
 const overseas={...r,input:{...r.input,utcOffset:10}};
 assert.equal(decadeAt(overseas,{date:'1997-11-18',time:'00:29'}).label,'童限');
 assert.equal(decadeAt(overseas,{date:'1997-11-18',time:'00:30'}).value,'癸未');
});
test('report export contains the selected flow, explanatory evidence, conflicts and reproducible rule version',()=>{
 const a=analyzeBazi(calculate(base),{date:'2026-10-28',time:'12:00',flow:flowPillars(base,'2026-10-28')});
 assert.equal(a.timing.items.length,5);assert.equal(a.themes.length,6);
 assert.ok(a.timing.relations.some(x=>x.type==='同柱重见'));
 const text=readingMarkdown(a);for(const part of ['0.4.0-r1','综合判断','旺衰候选','特殊格','喜忌候选','2026-10-28','丙午','关系互动','判断规则与分歧'])assert.ok(text.includes(part),part);
 assert.ok(!text.includes('undefined'));assert.ok(!text.includes('NaN'));
});
test('Fu Tou / Zhi Run recovers the documented 1719 Li Qiu anchor and the known daily overlap distinction',()=>{
 // The package README transcribes Tong Zong's 1719 anchor; no original edition was inspected.
 const a=calculateJuByFuTou(Solar.fromYmdHms(1719,8,8,12,0,0),JIEQI_JUSHU,YUAN_NAMES);
 assert.equal(a.jieQiName,'立秋');assert.equal(a.yuan,0);assert.equal(a.超接,'正授');assert.equal(a.yinYang,'陰');assert.equal(a.gameNumber,2);
 const b=qimen({...base,date:'1962-09-08',time:'02:00',qimenMethod:'置闰'});
 assert.equal(b.timing.state,'正授');assert.ok(b.timing.limitation.includes('未实现交节时刻的叠局'));
});
test('method comparison distinguishes the documented 2024 summer example and preserves old archive aliases',()=>{
 const input={...base,date:'2024-06-15',time:'12:00'},a=qimen({...input,qimenMethod:'置闰'});
 assert.deepEqual(a.comparison.map(x=>[x.term,x.yuan,x.yinYang,x.ju]),[['芒種','中元','陽',3],['夏至','上元','陰',9]]);
 assert.equal(a.timing.actualTerm,'芒种');assert.equal(a.timing.usedTerm,'夏至');
 assert.deepEqual(qimen({...input,qimenMethod:'符頭'}),a);
 assert.throws(()=>qimen({...input,qimenMethod:'不存在'}));
});
test('a complete 2024 winter intercalation repeats Da Xue for three five-day yuan then advances',()=>{
 const dates=['2024-12-11','2024-12-16','2024-12-21','2024-12-26'];
 const charts=dates.map(date=>qimen({...base,date,time:'12:00',qimenMethod:'置闰'}));
 assert.deepEqual(charts.map(q=>[q.chart.節氣,q.chart.三元,q.chart.局數,q.timing.isLeap]),[['大雪','上元',4,true],['大雪','中元',7,true],['大雪','下元',1,true],['冬至','上元',1,false]]);
 assert.deepEqual(charts.slice(0,3).map(q=>q.timing.yuanStart),dates.slice(0,3));assert.equal(charts[0].timing.cycleEnd,dates[3]);
 assert.equal(charts[0].timing.upperHead,'己酉');assert.equal(charts[1].timing.head,'甲寅');
 assert.equal(charts[0].timing.leapTrigger.term,'冬至');assert.equal(charts[0].timing.leapTrigger.gap,10);
 assert.equal(charts[0].timing.gap,5);assert.equal(charts[3].timing.leapTrigger,null);
});
test('Zhi Run changes at UTC+8 midnight, independently of the selected late Zi day-pillar rule',()=>{
 const before=qimen({...base,date:'2024-12-10',time:'23:59',sect:1,qimenMethod:'置闰'});
 const after=qimen({...base,date:'2024-12-11',time:'00:00',sect:1,qimenMethod:'置闰'});
 assert.equal(before.timing.isLeap,false);assert.equal(after.timing.isLeap,true);
 const otherZone=qimen({...base,date:'2024-12-11',time:'02:00',utcOffset:10,qimenMethod:'置闰'});
 assert.equal(otherZone.timing.cycleStart,after.timing.cycleStart);assert.equal(otherZone.timing.basis,'2024-12-11 00:00（UTC+8）');
});
test('intercalation cycles remain fifteen days and repeat only Mang Zhong or Da Xue',()=>{
 const chain=getFuTouChainForRange(1901,2099);let leaps=0;
 for(let i=1;i<chain.length;i++){
   assert.equal(chain[i].符頭日-chain[i-1].符頭日,15);
   if(chain[i].閏局){leaps++;assert.ok(['芒種','大雪'].includes(chain[i].節氣));assert.equal(chain[i].節氣,chain[i-1].節氣);}
 }
 assert.ok(leaps>50&&leaps<90);
});
