import {test} from 'node:test';
import assert from 'node:assert/strict';
import lunar from 'lunar-javascript';
import {calculate,ziwei,qimen,compare,calendarMonth,effectiveClock} from '../src/engine.js';
const base={date:'1990-06-15',time:'10:30',gender:1,sect:2,longitude:116.4};
test('matches the supplied app sample for 1924-01-02 including NaYin and void branches',()=>{
 const r=calculate({...base,date:'1924-01-02',time:'00:00'});
 assert.deepEqual(r.pillars.map(p=>p.value),['癸亥','甲子','庚辰','丙子']);
 assert.deepEqual(r.pillars.map(p=>p.nayin),['大海水','海中金','白蜡金','涧下水']);
 assert.deepEqual(r.pillars.map(p=>p.void),['子丑','戌亥','申酉','申酉']);
});
test('Li Chun changes year and month pillars at the term instant, not midnight',()=>{
 const a=calculate({...base,date:'2024-02-04',time:'16:26'}),b=calculate({...base,date:'2024-02-04',time:'16:28'});
 assert.equal(a.pillars[0].value,'癸卯');assert.equal(b.pillars[0].value,'甲辰');
 assert.equal(a.pillars[1].value,'乙丑');assert.equal(b.pillars[1].value,'丙寅');
});
test('solar correction cannot move the physical Li Chun boundary',()=>{
 const r=calculate({...base,date:'2024-02-04',time:'16:28',trueSolar:true,longitude:90});
 assert.equal(r.pillars[0].value,'甲辰');assert.equal(r.pillars[1].value,'丙寅');
 assert.notEqual(r.time,'16:28');
});
test('23:00 and midnight day-boundary schools remain distinct',()=>{
 const a=calculate({...base,time:'23:30',sect:1}),b=calculate({...base,time:'23:30',sect:2}),c=calculate({...base,date:'1990-06-16',time:'00:30',sect:2});
 assert.equal(a.pillars[2].value,c.pillars[2].value);assert.notEqual(a.pillars[2].value,b.pillars[2].value);
});
test('invalid dates are rejected and leap February has 29 days',()=>{
 assert.throws(()=>calculate({...base,date:'2023-02-29'}));assert.throws(()=>calculate({...base,time:'24:00'}));assert.throws(()=>calculate({...base,date:'1900-12-31'}));
 assert.equal(calendarMonth('2024-02-15').days.length,29);
});
test('eight surface symbols and twelve growth stages agree with calendar engine',()=>{
 const r=calculate(base),e=lunar.Solar.fromYmdHms(1990,6,15,10,30,0).getLunar().getEightChar();
 assert.equal(Object.values(r.counts).reduce((a,b)=>a+b,0),8);
 assert.deepEqual(r.pillars.map(p=>p.phase),[e.getYearDiShi(),e.getMonthDiShi(),e.getDayDiShi(),e.getTimeDiShi()]);
});
test('yun direction changes with gender and every decade has ten flow years',()=>{
 const m=calculate(base),f=calculate({...base,gender:0});assert.equal(m.yun.forward,true);assert.equal(f.yun.forward,false);
 assert.equal(m.decades[1].years.length,10);assert.equal(m.decades[1].years[0].months.length,12);
});
test('DST correction subtracts one hour before solar correction',()=>{
 const r=effectiveClock({...base,time:'00:30',dst:true});assert.equal(r.standard.toISOString().slice(0,16),'1990-06-14T23:30');
});
test('Ziwei produces twelve distinct palaces with one body palace',()=>{
 const z=ziwei(base);assert.equal(z.palaces.length,12);assert.equal(new Set(z.palaces.map(p=>p.earthlyBranch)).size,12);assert.equal(z.palaces.filter(p=>p.isBodyPalace).length,1);
});
test('Qimen matches published engine example and preserves minutes at a term boundary',()=>{
 const a=qimen({...base,date:'2024-01-15',time:'10:00'}).chart;assert.equal(a.局數,8);assert.equal(a.三元,'中元');
 const before=qimen({...base,date:'2024-02-04',time:'16:26'}).chart,after=qimen({...base,date:'2024-02-04',time:'16:28'}).chart;
 assert.equal(before.節氣,'大寒');assert.equal(after.節氣,'立春');
 for(const field of ['地盤','天盤','天門','九星','八神'])assert.equal(a[field].length,9);
});
test('cross-chart relations contain both parties and exclude within-chart relations',()=>{
 const r=compare(base,{...base,date:'1992-09-18',gender:0});assert.ok(r.relations.length>0);assert.ok(r.relations.every(x=>x.text.includes('甲方')&&x.text.includes('乙方')));
});
