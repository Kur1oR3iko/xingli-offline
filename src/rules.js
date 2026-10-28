// Deterministic lookup rules. Each hit includes the actual matching condition.
export const BRANCHES='子丑寅卯辰巳午未申酉戌亥';
export const GAN='甲乙丙丁戊己庚辛壬癸';
// A declared qi-order table; dependency array order is not a qi-level contract.
export const HIDDEN_QI_ORDER={子:'癸',丑:'己癸辛',寅:'甲丙戊',卯:'乙',辰:'戊乙癸',巳:'丙戊庚',午:'丁己',未:'己丁乙',申:'庚壬戊',酉:'辛',戌:'戊辛丁',亥:'壬甲'};
export const SHENSHA_RULES=[
 ['天乙贵人','stem','丑未,子申,亥酉,亥酉,丑未,子申,丑未,寅午,卯巳,卯巳'],
 ['文昌贵人','dayStem','巳,午,申,酉,申,酉,亥,子,寅,卯'],
 ['禄神','dayStem','寅,卯,巳,午,巳,午,申,酉,亥,子'],
 ['羊刃','dayStem','卯,寅,午,巳,午,巳,酉,申,子,亥'],
 ['金舆','stem','辰,巳,未,申,未,申,戌,亥,丑,寅'],
 ['太极贵人','stem','子午,子午,卯酉,卯酉,辰戌丑未,辰戌丑未,寅亥,寅亥,巳申,巳申'],
 ['国印贵人','stem','戌,亥,丑,寅,丑,寅,辰,巳,未,申'],
 ['天厨贵人','dayStem','巳,午,巳,午,申,酉,亥,子,寅,卯'],
 ['桃花','branchGroup','酉,子,卯,午'],['驿马','branchGroup','寅,巳,申,亥'],
 ['华盖','branchGroup','辰,未,戌,丑'],['将星','branchGroup','子,卯,午,酉'],
 ['劫煞','branchGroup','巳,申,亥,寅'],['亡神','branchGroup','亥,寅,巳,申'],
 ['月德贵人','monthGroup','壬,甲,丙,庚'],
 ['天德贵人','month','巳,庚,丁,申,壬,辛,亥,甲,癸,寅,丙,乙'],
 ['天医','month','亥,子,丑,寅,卯,辰,巳,午,未,申,酉,戌'],
 ['福星贵人','stem','寅子,卯丑,寅子,亥,申,未,午,巳,辰,卯丑'],
 ['飞刃','dayStem','酉,申,子,亥,子,亥,卯,寅,午,巳'],
 ['红艳煞','dayStem','午,申,寅,未,辰,辰,戌,酉,子,申'],
 ['流霞','dayStem','酉,戌,未,申,巳,午,辰,卯,亥,寅'],
 ['月德合','monthGroup','丁,己,辛,乙'],
 ['天德合','monthMixed','申,乙,壬,巳,丁,丙,寅,己,戊,亥,辛,庚'],
 ['灾煞','branchGroup','午,酉,子,卯'],
 ['孤辰','yearSeason','寅,巳,申,亥'],
 ['寡宿','yearSeason','戌,丑,辰,未'],
 ['红鸾','yearBranch','卯,寅,丑,子,亥,戌,酉,申,未,午,巳,辰'],
 ['天喜','yearBranch','酉,申,未,午,巳,辰,卯,寅,丑,子,亥,戌'],
 ['丧门','yearBranch','寅,卯,辰,巳,午,未,申,酉,戌,亥,子,丑'],
 ['吊客','yearBranch','戌,亥,子,丑,寅,卯,辰,巳,午,未,申,酉'],
 ['披麻','yearBranch','酉,戌,亥,子,丑,寅,卯,辰,巳,午,未,申']
];
export const SHENSHA_NAMES=[...SHENSHA_RULES.map(r=>r[0]),'魁罡','阴差阳错','十灵日','德秀贵人','学堂','词馆','元辰','勾绞煞','天罗地网'];
const groups=['申子辰','亥卯未','寅午戌','巳酉丑'];
export function shensha(pillars,targets=pillars,{gender=1}={}){
 const hits=[];
 const add=(name,source,target,match)=>{
  if(!hits.some(x=>x.name===name&&x.source===source&&x.target===target.label))hits.push({name,source,target:target.label,evidence:`${source} → ${match}；${target.label}${target.value}`});
 };
 for(const [name,kind,table] of SHENSHA_RULES){
  const map=table.split(',');
  const sources=kind==='stem'?[pillars[0],pillars[2]]:kind==='dayStem'?[pillars[2]]:kind==='branchGroup'?[pillars[0],pillars[2]]:kind.startsWith('year')?[pillars[0]]:[pillars[1]];
  for(const s of sources){
   const key=kind==='stem'||kind==='dayStem'?s.gan:s.zhi;
   const index=kind.includes('Group')?groups.findIndex(g=>g.includes(key)):kind==='yearSeason'?['亥子丑','寅卯辰','巳午未','申酉戌'].findIndex(g=>g.includes(key)):['month','monthMixed','yearBranch'].includes(kind)?BRANCHES.indexOf(key):GAN.indexOf(key);
   const match=map[index]||'';
   for(const t of targets){
    if(kind==='branchGroup'&&s===t)continue;
    if(name==='天医'&&s===t)continue;
    const subject=kind==='monthGroup'||(['天德贵人','天德合'].includes(name)&&GAN.includes(match))?t.gan:t.zhi;
    if(match.includes(subject))add(name,`${s.label}${key}`,t,match);
   }
  }
 }
 const special={魁罡:['庚辰','庚戌','壬辰','戊戌'],阴差阳错:['丙子','丁丑','戊寅','辛卯','壬辰','癸巳','丙午','丁未','戊申','辛酉','壬戌','癸亥'],十灵日:['甲辰','乙亥','丙辰','丁酉','戊午','庚戌','庚寅','辛亥','壬寅','癸未']};
 if(targets.includes(pillars[2]))for(const [name,values] of Object.entries(special))if(values.includes(pillars[2].value))add(name,'日柱固定表',pillars[2],pillars[2].value);
 // Extra rules follow the named sources and record only structural candidates.
 const monthGroup=groups.findIndex(g=>g.includes(pillars[1].zhi));
 const [virtue,talent]=[['壬癸戊己','丙辛甲己'],['甲乙','丁壬'],['丙丁','戊癸'],['庚辛','乙庚']][monthGroup];
 const natalStems=pillars.map(p=>p.gan).join('');
 // Both classes must be represented; no claim is made about 冲克减力 or 贵格.
 if([...virtue].some(g=>natalStems.includes(g))&&[...talent].some(g=>natalStems.includes(g)))for(const t of targets)if((virtue+talent).includes(t.gan))add('德秀贵人',`${pillars[1].zhi}月：德${virtue}、秀${talent}；原局两类俱见（候选）`,t,t.gan);
 const year=pillars[0],yi=BRANCHES.indexOf(year.zhi),forward=(GAN.indexOf(year.gan)%2===0)===(Number(gender)===1);
 for(const t of targets){
  if(t===year)continue;
  if(t.zhi===BRANCHES[(yi+(forward?7:5))%12])add('元辰',`${year.value}年${Number(gender)===1?'男':'女'}；${forward?'阳男阴女，冲前一位':'阴男阳女，冲后一位'}`,t,t.zhi);
  const delta=(BRANCHES.indexOf(t.zhi)-yi+12)%12;
  if(delta===3||delta===9)add('勾绞煞',`${year.value}年${Number(gender)===1?'男':'女'}；${delta===(forward?3:9)?'勾':'绞'}，年支${delta===3?'顺数':'逆数'}三位`,t,t.zhi);
 }
 const natalElement=year.nayin?.slice(-1),academies={木:['己亥','庚寅'],火:['丙寅','乙巳'],土:['戊申','丁巳'],金:['辛巳','壬申'],水:['甲申','癸亥']};
 const lookup=academies[natalElement];
 if(lookup)for(const t of targets)if(t!==year)for(let i=0;i<2;i++)if(t.value===lookup[i])add(i===0?'学堂':'词馆',`年柱${year.value}纳音${natalElement}；${i===0?'长生':'临官'}且目标纳音同五行`,t,lookup[i]);
 for(const source of [pillars[0],pillars[2]])for(const t of targets){
  if(t===source)continue;
  if(['戌亥','亥戌','辰巳','巳辰'].includes(source.zhi+t.zhi))add('天罗地网',`${source.label}${source.zhi}：${'戌亥'.includes(source.zhi)?'天罗':'地网'}互见简法（未加纳音限制）`,t,t.zhi);
 }
 return hits;
}
