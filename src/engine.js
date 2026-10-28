import lunarPackage from 'lunar-javascript';
import iztro from 'iztro';
import { shensha, BRANCHES, HIDDEN_QI_ORDER } from './rules.js';
import { generateQimenChart, chartToObject, calculateJuByChaiBu, calculateJuByFuTou,
  JIEQI_JUSHU, JIEQI_ALIAS, YUAN_NAMES, detectPatterns } from 'qimen-dunjia';

const { Solar, Lunar, LunarYear, LunarUtil } = lunarPackage;
export const ELEMENTS = ['木', '火', '土', '金', '水'];
export const STEMS = '甲乙丙丁戊己庚辛壬癸';
const pad = n => String(n).padStart(2, '0');
const TERM_ALIASES={DA_XUE:'大雪',DONG_ZHI:'冬至',XIAO_HAN:'小寒',DA_HAN:'大寒',LI_CHUN:'立春',YU_SHUI:'雨水',JING_ZHE:'惊蛰'};
const dateString = d => `${d.getUTCFullYear()}-${pad(d.getUTCMonth()+1)}-${pad(d.getUTCDate())}`;
const clockString = d => `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;

export function validateInput(input) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.date || '') || !/^\d{2}:\d{2}$/.test(input.time || '')) throw new Error('请填写完整的公历日期和时间。');
  const [y,m,d] = input.date.split('-').map(Number), [h,min] = input.time.split(':').map(Number);
  const clock = new Date(Date.UTC(y,m-1,d,h,min));
  if (y<1901 || y>2099 || m<1 || m>12 || d<1 || h>23 || min>59 ||
      clock.getUTCMonth()!==m-1 || clock.getUTCDate()!==d) throw new Error('支持 1901–2099 年的有效公历日期。');
  if (![0,1].includes(Number(input.gender))) throw new Error('请选择排运所用的男命或女命规则。');
  if (!Number.isFinite(Number(input.utcOffset ?? 8)) || Number(input.utcOffset ?? 8)<-12 || Number(input.utcOffset ?? 8)>14) throw new Error('标准时区须在 UTC−12 至 UTC+14 之间。');
  if (input.trueSolar && (!Number.isFinite(Number(input.longitude)) || Number(input.longitude)<-180 || Number(input.longitude)>180)) throw new Error('经度应在 −180° 至 180° 之间。');
  return clock;
}

export function effectiveClock(input) {
  const clock = validateInput(input);
  // Use a UTC-shaped container for civil fields. Physical term instants use UTC+8.
  if (input.dst) clock.setUTCMinutes(clock.getUTCMinutes()-60);
  const offset=Number(input.utcOffset ?? 8);
  const standard = new Date(clock.getTime()+(8-offset)*3600000);
  let correction = 0;
  if (input.trueSolar) {
    const day = Math.floor((clock-Date.UTC(clock.getUTCFullYear(),0,1))/86400000)+1;
    const b = 2*Math.PI*(day-1)/365;
    const eot = 229.18*(0.000075+0.001868*Math.cos(b)-0.032077*Math.sin(b)-0.014615*Math.cos(2*b)-0.040849*Math.sin(2*b));
    correction = 4*(Number(input.longitude)-offset*15)+eot;
    clock.setTime(clock.getTime()+Math.round(correction*60)*1000);
  }
  if ([standard,clock].some(d=>d.getUTCFullYear()<1901 || d.getUTCFullYear()>2099)) throw new Error('时间校正后超出 1901–2099 年范围。');
  return { standard, clock, correction, offset };
}

const toSolar = d => Solar.fromYmdHms(d.getUTCFullYear(),d.getUTCMonth()+1,d.getUTCDate(),d.getUTCHours(),d.getUTCMinutes(),d.getUTCSeconds());
const fields = ['Year','Month','Day','Time'];
const names = ['年柱','月柱','日柱','时柱'];
export const godOf = (day, stem) => LunarUtil.SHI_SHEN[day+stem];
function phase(day, branch) {
  const index = (LunarUtil.CHANG_SHENG_OFFSET[day]+(STEMS.indexOf(day)%2===0?1:-1)*('子丑寅卯辰巳午未申酉戌亥'.indexOf(branch))+24)%12;
  return LunarUtil.CHANG_SHENG[index];
}
function voidOf(pillar) {
  const idx = LunarUtil.JIA_ZI.indexOf(pillar), group = Math.floor(idx/10);
  return ['戌亥','申酉','午未','辰巳','寅卯','子丑'][group];
}

export function relations(pillars) {
  const result = [];
  const ganHe=['甲己','乙庚','丙辛','丁壬','戊癸'];
  const zhiHe=['子丑','寅亥','卯戌','辰酉','巳申','午未'];
  const zhiChong=['子午','丑未','寅申','卯酉','辰戌','巳亥'];
  const zhiHai=['子未','丑午','寅巳','卯辰','申亥','酉戌'];
  const zhiPo=['子酉','丑辰','寅亥','卯午','巳申','未戌'];
  const ganChong=['甲庚','乙辛','丙壬','丁癸'];
  const hasPair = (pairs,a,b) => pairs.some(p=>p.includes(a)&&p.includes(b)&&a!==b);
  for(let i=0;i<pillars.length;i++) for(let j=i+1;j<pillars.length;j++) {
    const a=pillars[i],b=pillars[j], label=`${a.label}与${b.label}`;
    if(hasPair(ganHe,a.gan,b.gan)) result.push({type:'天干五合',text:`${label}：${a.gan}${b.gan}合`});
    if(hasPair(zhiHe,a.zhi,b.zhi)) result.push({type:'地支六合',text:`${label}：${a.zhi}${b.zhi}合`});
    if(hasPair(zhiChong,a.zhi,b.zhi)) result.push({type:'地支六冲',text:`${label}：${a.zhi}${b.zhi}冲`});
    if(hasPair(ganChong,a.gan,b.gan)) result.push({type:'天干相冲',text:`${label}：${a.gan}${b.gan}冲`});
    if(hasPair(zhiHai,a.zhi,b.zhi)) result.push({type:'地支六害',text:`${label}：${a.zhi}${b.zhi}害`});
    if(hasPair(zhiPo,a.zhi,b.zhi)) result.push({type:'地支相破',text:`${label}：${a.zhi}${b.zhi}破`});
    if(hasPair(['子卯'],a.zhi,b.zhi)) result.push({type:'子卯相刑',text:`${label}：${a.zhi}${b.zhi}刑`});
    if(hasPair(['寅巳','巳申','申寅','丑戌','戌未','未丑'],a.zhi,b.zhi)) result.push({type:'刑支相见',text:`${label}：${a.zhi}${b.zhi}为三刑组中的两支；不据此视作三刑齐备。`});
    if(a.zhi===b.zhi && '辰午酉亥'.includes(a.zhi)) result.push({type:'地支自刑',text:`${label}：${a.zhi}${b.zhi}自刑`});
  }
  const branches=pillars.map(p=>p.zhi);
  for(const group of ['申子辰','亥卯未','寅午戌','巳酉丑']) if([...group].every(b=>branches.includes(b))) result.push({type:'三合齐备',text:`地支见${group}。是否成局还需月令与透干条件，不能只据齐备判成局。`});
  for(const [group,type] of [['寅卯辰','三会齐备'],['巳午未','三会齐备'],['申酉戌','三会齐备'],['亥子丑','三会齐备'],['寅巳申','三刑齐备'],['丑戌未','三刑齐备']]) if([...group].every(b=>branches.includes(b)))result.push({type,text:`地支见${group}，仅记录支组合。`});
  // 暗合采用三组通行简表；只识别相见，不认作合化。
  for(let i=0;i<pillars.length;i++)for(let j=i+1;j<pillars.length;j++){
    const a=pillars[i],b=pillars[j];
    if(hasPair(['寅丑','午亥','子巳'],a.zhi,b.zhi))result.push({type:'地支暗合',text:`${a.label}与${b.label}：${a.zhi}${b.zhi}暗合（寅丑、午亥、子巳简表）。`});
  }
  return result;
}

function interpretation(pillars, counts) {
  const day=pillars[2].gan, element=LunarUtil.WU_XING_GAN[day];
  const qi={甲:'阳木，取象为生长、条理与延展',乙:'阴木，取象为柔韧、适应与联结',丙:'阳火，取象为明朗、表达与温暖',丁:'阴火，取象为专注、细察与持续',戊:'阳土，取象为承载、稳定与守成',己:'阴土，取象为培育、协调与积累',庚:'阳金，取象为决断、秩序与变革',辛:'阴金，取象为精细、分辨与修饰',壬:'阳水，取象为流动、包容与开拓',癸:'阴水，取象为渗透、思索与含蓄'};
  const missing=ELEMENTS.filter(e=>!counts[e]);
  const visible=pillars.filter((_,i)=>i!==2).map(p=>`${p.label}${p.gan}为${godOf(day,p.gan)}`);
  return [
    {title:`日主 · ${day}${element}`,body:`按日干取日主。本盘日干为${day}，传统取象为${qi[day]}。这是符号释义，不是个人性格测评。`,evidence:`规则：日柱天干；输入：${pillars[2].value}`},
    {title:`月令 · ${pillars[1].zhi}`,body:`按节气划分月柱，本盘月支为${pillars[1].zhi}，本气属${LunarUtil.WU_XING_ZHI[pillars[1].zhi]}。旺衰与格局还涉及季节、通根、透干和组合；本版不把五行数量当作旺衰结论。`,evidence:`规则：以“节”换月；输入：${pillars[1].value}`},
    {title:'五行分布',body:missing.length?`八个表层干支中未出现${missing.join('、')}。地支藏干仍可能包含相应五行，因此不据此直接判定“缺什么补什么”。`:'八个表层干支中五行均有出现。数量反映符号分布，不表示能量比例或人生得分。',evidence:'规则：四天干＋四地支本气，每字计 1；藏干另列，不重复计数。'},
    {title:'十神关系',body:`${visible.join('；')}。十神是其他天干相对于日干的生克与阴阳关系，适合逐项核对规则。`,evidence:`基准：日干${day}；关系：同我、我生、我克、克我、生我，再分阴阳。`}
  ];
}

export function calculate(input) {
  const {standard,clock,correction}=effectiveClock(input);
  const solar=toSolar(standard), lunar=solar.getLunar(), base=lunar.getEightChar();
  const local=toSolar(clock).getLunar().getEightChar(); local.setSect(Number(input.sect)===1?1:2);
  const yearValue=input.yearBoundary==='springFestival'?lunar.getYearInGanZhi():input.yearBoundary==='lichunDay'?lunar.getYearInGanZhiByLiChun():base.getYear();
  const values=[yearValue,base.getMonth(),local.getDay(),local.getTime()];
  const day=values[2][0];
  const pillars=values.map((value,i)=>({ label:names[i],value,gan:value[0],zhi:value[1],
    elements:[LunarUtil.WU_XING_GAN[value[0]],LunarUtil.WU_XING_ZHI[value[1]]],
    hidden:LunarUtil.ZHI_HIDE_GAN[value[1]].map(gan=>({gan,god:godOf(day,gan)})),
    god:i===2?'日主':godOf(day,value[0]),nayin:LunarUtil.NAYIN[value],phase:phase(day,value[1]),selfPhase:phase(value[0],value[1]),void:voidOf(value) }));
  const counts=Object.fromEntries(ELEMENTS.map(e=>[e,0])); pillars.forEach(p=>p.elements.forEach(e=>counts[e]++));
  // getYun uses the library's exact Li Chun year internally. Reverse its gender
  // selector only when needed to realize the selected year's yin/yang direction.
  const parityChanged=STEMS.indexOf(yearValue[0])%2!==STEMS.indexOf(base.getYear()[0])%2;
  const yun=base.getYun(parityChanged?1-Number(input.gender):Number(input.gender),Number(input.yunSect)===1?1:2);
  const decades=yun.getDaYun(input.decadeCount===8?9:13).map(d=>({index:d.getIndex(),value:d.getGanZhi()||'童限',startAge:d.getStartAge(),endAge:d.getEndAge(),startYear:d.getStartYear(),endYear:d.getEndYear(),years:d.getLiuNian().map((y,i)=>({year:y.getYear(),age:y.getAge(),value:y.getGanZhi(),small:LunarUtil.JIA_ZI[(LunarUtil.JIA_ZI.indexOf(values[3])+(yun.isForward()?1:-1)*(d.getIndex()>0?y.getAge():i+1)+600)%60],months:y.getLiuYue().map(m=>({index:m.getIndex(),value:m.getGanZhi()}))}))}));
  const auxBase=toSolar(clock).getLunar().getEightChar(); auxBase.setSect(Number(input.sect)===1?1:2);
  return { input:{...input},date:dateString(clock),time:clockString(clock),standardDate:dateString(standard),standardTime:clockString(standard),correction,
    lunar:lunar.toString(),zodiac:'鼠牛虎兔龙蛇马羊猴鸡狗猪'[BRANCHES.indexOf(yearValue[1])],pillars,counts,relations:relations(pillars),reading:interpretation(pillars,counts),
    previousTerm:{name:lunar.getPrevJieQi().getName(),date:lunar.getPrevJieQi().getSolar().toYmdHms()},
    nextTerm:{name:lunar.getNextJieQi().getName(),date:lunar.getNextJieQi().getSolar().toYmdHms()},
    yun:{forward:yun.isForward(),start:yun.getStartSolar().toYmdHms(),years:yun.getStartYear(),months:yun.getStartMonth(),days:yun.getStartDay()},decades,
    auxiliary:{胎元:base.getTaiYuan(),胎息:auxBase.getTaiXi(),命宫:palacesOf(pillars,input.palaceMethod==='qi'&&lunar.getPrevJieQi().isQi()).ming,身宫:palacesOf(pillars,false).shen},
    shensha:shensha(pillars,pillars,{gender:input.gender}),structure:structure(pillars,input.structureMethod),
    commander:commanderAt(lunar,standard,pillars[1].zhi),
    minutePillar:input.minutePillar?minutePillar(clock,pillars[3].gan,day):null,
    wholePillars:pillars.flatMap(p=>{
      const a=ELEMENTS.indexOf(p.elements[0]),b=ELEMENTS.indexOf(p.elements[1]);
      if((a+2)%5===b)return [{type:'盖头',text:`${p.label}${p.value}盖头：天干${p.elements[0]}克地支本气${p.elements[1]}。`}];
      if((b+2)%5===a)return [{type:'截脚',text:`${p.label}${p.value}截脚：地支本气${p.elements[1]}克天干${p.elements[0]}。`}];
      return [];
    }),
  };
}

// Month/time branch numbers start at 寅=1 for 命宫; 身宫 time starts 子=1.
export function palacesOf(pillars,afterQi=false){
 const order='寅卯辰巳午未申酉戌亥子丑';
 const month=(order.indexOf(pillars[1].zhi)+(afterQi?1:0))%12+1;
 const hour=order.indexOf(pillars[3].zhi)+1,total=month+hour;
 const ming=(total>=14?26:14)-total;
 const shen=(month+BRANCHES.indexOf(pillars[3].zhi))%12+1;
 const pillar=n=>STEMS[((STEMS.indexOf(pillars[0].gan)+1)*2+n-1)%10]+order[n-1];
 return {ming:pillar(ming),shen:pillar(shen)};
}
export function minutePillar(clock,hourStem,dayStem){
 const minute=clock.getUTCHours()*60+clock.getUTCMinutes(),elapsed=(minute+60)%120,index=Math.floor(elapsed/10);
 const gan=STEMS[(STEMS.indexOf(hourStem)%5*2+index)%10],zhi=BRANCHES[index];
 return {label:'分柱',value:gan+zhi,gan,zhi,god:godOf(dayStem,gan),elapsed,index,method:'时上五鼠遁 · 十分钟一段',range:`时辰起点后${index*10}至不足${(index+1)*10}分钟`,evidence:`时干${hourStem}，时辰内第${index+1}段，以五鼠遁起分干；分支${zhi}。`};
}

// 三段分日简表，以入节后足日数切换；末段持续到下一节，不作旺衰权重。
export const COMMANDER_TABLE={寅:[['戊',7],['丙',7],['甲',16]],卯:[['甲',10],['乙',20]],辰:[['乙',9],['癸',3],['戊',18]],巳:[['戊',5],['庚',9],['丙',16]],午:[['丙',10],['己',9],['丁',11]],未:[['丁',9],['乙',3],['己',18]],申:[['戊',10],['壬',3],['庚',17]],酉:[['庚',10],['辛',20]],戌:[['辛',9],['丁',3],['戊',18]],亥:[['戊',7],['甲',5],['壬',18]],子:[['壬',10],['癸',20]],丑:[['癸',9],['辛',3],['己',18]]};
export function commanderSegment(branch,elapsed){
 if(!COMMANDER_TABLE[branch]||!Number.isFinite(elapsed)||elapsed<0)throw new Error('司令参数无效。');
 let end=0;const rows=COMMANDER_TABLE[branch];
 for(let i=0;i<rows.length;i++){const [stem,days]=rows[i];end+=days;if(elapsed<end||i===rows.length-1)return {stem,index:i,from:end-days,to:i===rows.length-1?null:end};}
}
function commanderAt(lunar,standard,branch){
 const jie=lunar.getPrevJie(),start=jie.getSolar(),elapsed=(standard-toDate(start))/86400000;
 return {...commanderSegment(branch,Math.max(0,elapsed)),elapsed,start:start.toYmdHms(),term:jie.getName(),method:'三段分日简表',table:COMMANDER_TABLE[branch]};
}
const toDate=s=>new Date(s.toYmdHms().replace(' ','T')+'Z');

function ziweiChart(input) {
  const {clock}=effectiveClock(input);
  const hour=clock.getUTCHours(), index=hour===23?12:Math.floor((hour+1)/2);
  return iztro.astro.withOptions({type:'solar',dateStr:dateString(clock),timeIndex:index,gender:Number(input.gender)===1?'男':'女',fixLeap:input.fixLeap!==false,language:'zh-CN',astroType:input.ziweiType||'heaven',config:{algorithm:input.ziweiAlgorithm||'default',yearDivide:input.ziweiYearDivide||'normal',horoscopeDivide:input.ziweiYearDivide||'normal',dayDivide:Number(input.sect)===1?'forward':'current'}});
}
export function ziwei(input,flowDate,flowTime='12:00') {
  const chart=ziweiChart(input),plain=chart.toJSON();
  const flights=chart.palaces.map(p=>chart.palace(p.index).mutagedPlaces().map((dest,i)=>({mutagen:['禄','权','科','忌'][i],target:dest?.index,name:dest?.name,self:dest?.index===p.index})));
  const flow=flowDate?chart.horoscope(flowDate,Number(flowTime.slice(0,2))===23?12:Math.floor((Number(flowTime.slice(0,2))+1)/2)).toJSON():null;
  return {...plain,flights,flow,decadals:chart.decadalList()};
}

export function qimen(input) {
  const result=calculate(input), {standard}=effectiveClock(input);
  const selected=input.qimenMethod||'拆補';
  if(!['拆補','拆补','符頭','符头','置闰','手动'].includes(selected))throw new Error('不支持的奇门定局法。');
  const fuTou=['符頭','符头','置闰'].includes(selected),manual=selected==='手动';
  const solar=toSolar(standard),chai=calculateJuByChaiBu(solar,JIEQI_JUSHU,YUAN_NAMES);
  const leap=calculateJuByFuTou(solar,JIEQI_JUSHU,YUAN_NAMES),ju=fuTou?leap:chai;
  const p=result.pillars.map(p=>p.value);
  if(manual&&(!Number.isInteger(Number(input.qimenJu))||+input.qimenJu<1||+input.qimenJu>9))throw new Error('手动局数须为 1 至 9。');
  const chart=chartToObject(generateQimenChart({年柱:p[0],月柱:p[1],日柱:p[2],時柱:p[3],局數:manual?+input.qimenJu:ju.gameNumber,陰陽:manual?(input.qimenYinYang==='陰'?'陰':'陽'):ju.yinYang}));
  chart.節氣=ju.jieQiName;chart.三元=manual?'手动指定':ju.yuanName;chart.定局法=manual?'手动':fuTou?'置闰（符头）':'拆补';
  // Fu Tou is a civil-day algorithm; its midnight is UTC+8, independent of
  // the user-selected day-pillar school. Preserve that distinction in the UI.
  const dayIndex=LunarUtil.JIA_ZI.indexOf(solar.getLunar().getDayInGanZhi());
  const elapsed=dayIndex%15,cycleStart=new Date(standard);cycleStart.setUTCHours(0,0,0,0);cycleStart.setUTCDate(cycleStart.getUTCDate()-elapsed);
  const yuanStart=new Date(cycleStart);yuanStart.setUTCDate(yuanStart.getUTCDate()+leap.yuan*5);
  const cycleEnd=new Date(cycleStart);cycleEnd.setUTCDate(cycleEnd.getUTCDate()+15);
  let leapTrigger=null;
  if(fuTou&&leap.閏局){
    const sequence=Object.keys(JIEQI_JUSHU),nextName=sequence[(sequence.indexOf(leap.jieQiName)+1)%sequence.length];
    const candidates=Object.entries(solar.getLunar().getJieQiTable()).filter(([name])=>{const n=TERM_ALIASES[name]||name;return (JIEQI_ALIAS[n]||n)===nextName;}).map(([,s])=>s).sort((a,b)=>a.getJulianDay()-b.getJulianDay());
    const candidate=candidates.find(s=>s.toYmd()>=dateString(cycleStart));
    if(candidate)leapTrigger={term:nextName,date:candidate.toYmdHms(),gap:Math.round((Date.parse(candidate.toYmd()+'T00:00:00Z')-cycleStart.getTime())/86400000)};
  }
  const timing={method:chart.定局法,basis:dateString(standard)+' '+clockString(standard)+'（UTC+8）',
    actualTerm:solar.getLunar().getPrevJieQi().getName(),usedTerm:manual?null:ju.jieQiName,
    state:fuTou?leap.超接:null,gap:fuTou?leap.超接天數:null,isLeap:fuTou?leap.閏局:null,
    upperHead:fuTou?leap.上元符頭:null,head:fuTou?leap.符頭:null,
    cycleStart:fuTou?dateString(cycleStart):null,yuanStart:fuTou?dateString(yuanStart):null,cycleEnd:fuTou?dateString(cycleEnd):null,leapTrigger,
    rule:fuTou?'上元符头为甲子、己卯、甲午、己酉；每元五日、每循环十五日。仅在芒种或大雪后，下一节气相对候选符头的历日差达到8日（含头计九日）时，重用本气三元。':manual?'阴阳遁与局数由用户指定，不作自动置闰判断。':'采用当前引擎的节气时刻起算口径：交节后不足5日为上元、5至不足10日为中元、10日以后为下元。',
    limitation:manual?'手动仅指定阴阳遁与局数；日时四柱仍沿用当前钟时和换日设置。':fuTou?'定局以UTC+8零点日界判断；日时四柱仍沿用所选当地钟时和换日规则。正授按同历日判定；未实现交节时刻的叠局，也未实现“过十四日”阈值变体。':'拆补口径并非所有以甲己符头分元的同名流派；对盘时须同时核对定局规则。',
    source:'置闰规则采用 qimen-dunjia 3.1.0 所收录《遁甲演义》《奇门遁甲统宗》等规则与算例；尚未直接查验原刻本。'};
  if(fuTou){chart.上元符頭=leap.上元符頭;chart.定局符頭=leap.符頭;chart.超接=leap.超接;chart.超接天數=leap.超接天數;chart.閏局=leap.閏局;}
  return {chart,patterns:detectPatterns(chart),timing,comparison:[{method:'拆补',term:chai.jieQiName,yuan:chai.yuanName,yinYang:chai.yinYang,ju:chai.gameNumber},{method:'置闰（符头）',term:leap.jieQiName,yuan:leap.yuanName,yinYang:leap.yinYang,ju:leap.gameNumber,isLeap:leap.閏局,state:leap.超接}]};
}

export function compare(a,b) {
  const left=calculate(a),right=calculate(b);
  const combined=[...left.pillars.map(p=>({...p,label:`甲方${p.label}`})),...right.pillars.map(p=>({...p,label:`乙方${p.label}`}))];
  return {left,right,relations:relations(combined).filter(r=>r.text.includes('甲方')&&r.text.includes('乙方'))};
}

export function calendarMonth(date) {
  const [year,month]=date.split('-').map(Number);
  const first=new Date(Date.UTC(year,month-1,1)), days=new Date(Date.UTC(year,month,0)).getUTCDate();
  return {year,month,offset:(first.getUTCDay()+6)%7,days:Array.from({length:days},(_,i)=>{
    const solar=Solar.fromYmd(year,month,i+1),l=solar.getLunar();
    return {day:i+1,date:`${year}-${pad(month)}-${pad(i+1)}`,lunar:l.getDay()===1?`${l.getMonthInChinese()}月`:l.getDayInChinese(),term:l.getJieQi(),festivals:[...solar.getFestivals(),...l.getFestivals()]};
  })};
}

function structure(pillars,method='透干') {
 const day=pillars[2].gan,order=HIDDEN_QI_ORDER[pillars[1].zhi],hidden=[...pillars[1].hidden].sort((a,b)=>order.indexOf(a.gan)-order.indexOf(b.gan)),visible=pillars.filter((_,i)=>i!==2).map(p=>p.gan);
 const chosen=method==='本气'?hidden[0]:(hidden.find(h=>visible.includes(h.gan))||hidden[0]);
 const god=godOf(day,chosen.gan);
 let name=god+'格';
 if(god==='比肩')name=pillars[1].zhi==='寅卯巳午巳午申酉亥子'[STEMS.indexOf(day)]?'建禄候选':'月令比肩（需另取格）';
 if(god==='劫财')name='辰戌丑未'.includes(pillars[1].zhi)?'月令劫财（需另取格）':STEMS.indexOf(day)%2===0?'羊刃候选':'月劫候选';
 return {name,method,stem:chosen.gan,god,reason:`月支${pillars[1].zhi}按本中余气顺序藏${hidden.map(h=>h.gan).join('、')}；${method==='本气'?'按本气取法':visible.includes(chosen.gan)?'按本气→中气→余气顺序选择年/月/时干所透':'年/月/时干均未透，取本气'}，以${chosen.gan}相对日干${day}为${god}。`,note:'本栏仅列月令取格候选；可在综合解读中复核旺衰、组合、调候与特殊格，最终喜用神仍需综合判断。'};
}

export function lunarToSolar(year,month,day,leap=false) {
 if(!Number.isInteger(+year)||+year<1901||+year>2099)throw new Error('农历年份范围为 1901—2099。');
 if(leap&&LunarYear.fromYear(+year).getLeapMonth()!==+month)throw new Error('该农历年没有所选闰月。');
 const l=Lunar.fromYmd(+year,leap?-Math.abs(+month):+month,+day),s=l.getSolar();
 return s.toYmd();
}
export function lunarDateOf(date) {
 const [y,m,d]=date.split('-').map(Number),l=Solar.fromYmd(y,m,d).getLunar();
 return {year:l.getYear(),month:Math.abs(l.getMonth()),day:l.getDay(),leap:l.getMonth()<0};
}
export function shiftInput(input,minutes) {
 const d=validateInput(input);d.setUTCMinutes(d.getUTCMinutes()+Number(minutes));
 const next={...input,date:dateString(d),time:clockString(d)};validateInput(next);return next;
}
export function nowInput(input) {
 const d=new Date(Date.now()+(Number(input.utcOffset??8)+(input.dst?1:0))*3600000);
 return {...input,date:dateString(d),time:clockString(d)};
}
export function flowPillars(input,date,time='12:00') {
 const r=calculate({...input,date,time}),day=input?calculate(input).pillars[2].gan:r.pillars[2].gan;
 const items=r.pillars.map((p,i)=>({...p,label:['流年','流月','流日','流时'][i],god:godOf(day,p.gan),phase:phase(day,p.zhi)}));
 return {pillars:items,shensha:shensha(calculate(input).pillars,items,{gender:input.gender}),relations:relations([...calculate(input).pillars,...items]).filter(r=>r.text.includes('流'))};
}
export function reversePillars(values,start=1901,end=2026,sect=2) {
 if(values.length!==4||values.some(p=>!LunarUtil.JIA_ZI.includes(p)))throw new Error('四柱必须是有效的六十甲子干支组合。');
 if(start<1901||end>2099||end<start)throw new Error('反查范围须在 1901—2099 年。');
 const idx=LunarUtil.JIA_ZI.indexOf(values[0]),branch=BRANCHES.indexOf(values[3][1]);
 const intervals=branch===0?[[0,0],[23,23]]:[[branch*2-1,branch*2]];
 const result=[];
 for(let year=start-1;year<=end;year++){
  if(((year-4)%60+60)%60!==idx)continue;
  let s=Solar.fromYmd(Math.max(1901,year),1,1);
  for(let i=0;i<403;i++,s=s.next(1)){
   if(s.getYear()<start||s.getYear()>end)continue;
   for(const [startHour,endHour] of intervals){
    // Check both ends of the shichen so a term transition within the hour is not missed.
    for(const [hour,minute] of [[startHour,0],[endHour,0],[endHour,59]]){
     const candidate=Solar.fromYmdHms(s.getYear(),s.getMonth(),s.getDay(),hour,minute,0),e=candidate.getLunar().getEightChar();e.setSect(+sect===1?1:2);
     if([e.getYear(),e.getMonth(),e.getDay(),e.getTime()].every((p,i)=>p===values[i])){result.push({date:candidate.toYmd(),time:pad(hour)+':'+pad(minute)});break;}
    }
   }
  }
 }
 return result.filter((x,i,a)=>a.findIndex(y=>x.date===y.date&&x.time===y.time)===i);
}
export function solarTerms(year) {
 if(!Number.isInteger(+year)||+year<1901||+year>2099)throw new Error('年份须为 1901—2099。');
 const table=Solar.fromYmd(+year,6,1).getLunar().getJieQiTable();
 return Object.entries(table).filter(([,s])=>s.getYear()===+year).map(([name,s])=>({name:TERM_ALIASES[name]||name,date:s.toYmdHms()})).sort((a,b)=>a.date.localeCompare(b.date));
}
export function almanac(date) {
 const [y,m,d]=date.split('-').map(Number),s=Solar.fromYmd(y,m,d),l=s.getLunar();
 return {date,lunar:l.toString(),gz:[l.getYearInGanZhiExact(),l.getMonthInGanZhiExact(),l.getDayInGanZhi()],yi:l.getDayYi(2),ji:l.getDayJi(2),good:l.getDayJiShen(),bad:l.getDayXiongSha(),chong:l.getDayChongDesc(),sha:l.getDaySha(),officer:l.getZhiXing(),spirit:l.getDayTianShen(),spiritLuck:l.getDayTianShenLuck(),nineStar:l.getDayNineStar().toString(),fetal:l.getDayPositionTai(),pengzu:[l.getPengZuGan(),l.getPengZuZhi()],positions:{喜神:l.getDayPositionXiDesc(),财神:l.getDayPositionCaiDesc(),福神:l.getDayPositionFuDesc()},wuHou:l.getWuHou(),times:l.getTimes().map(t=>({value:t.getGanZhi(),range:`${t.getMinHm()}—${t.getMaxHm()}`,yi:t.getYi(),ji:t.getJi(),god:t.getTianShen(),luck:t.getTianShenLuck(),chong:t.getChongDesc(),sha:t.getSha()}))};
}
export function wuYunLiuQi(year) {
 year=+year;const value=LunarUtil.JIA_ZI[((year-4)%60+60)%60],g=STEMS.indexOf(value[0]),z=BRANCHES.indexOf(value[1]);
 const movement=['土','金','水','木','火'][g%5],state=g%2===0?'太过':'不及';
 const qi=['厥阴风木','少阴君火','太阴湿土','少阳相火','阳明燥金','太阳寒水'];
 const sitian=[1,2,3,4,5,0][z%6],ke=Array.from({length:6},(_,i)=>qi[(sitian-2+i+6)%6]);
 const names=['大寒','春分','小满','大暑','秋分','小雪'];
 const terms=solarTerms(year),next=solarTerms(Math.min(year+1,2099));
 const boundaries=names.map(n=>terms.find(t=>t.name===n)?.date);boundaries.push(next.find(t=>t.name==='大寒')?.date);
 if(year===2099)boundaries[6]=Solar.fromYmd(2100,2,1).getLunar().getJieQiTable()['大寒'].toYmdHms();
 return {year,value,movement,state,sitian:qi[sitian],zaiquan:qi[(sitian+3)%6],steps:ke.map((guest,i)=>({name:['初之气','二之气','三之气','四之气','五之气','终之气'][i],host:qi[[0,1,3,2,4,5][i]],guest,start:boundaries[i],end:boundaries[i+1]})),formula:`甲己土、乙庚金、丙辛水、丁壬木、戊癸火；阳干太过、阴干不及。${value[1]}年${qi[sitian]}司天，${qi[(sitian+3)%6]}在泉。客气按厥阴→少阴→太阴→少阳→阳明→太阳循环，第三气为司天。`};
}
