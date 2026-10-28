import lunar from 'lunar-javascript';
import {HIDDEN_QI_ORDER} from './rules.js';

const {LunarUtil: U} = lunar;
const ELEMENTS = ['木','火','土','金','水'];
const SUPPORT = ['比肩','劫财','正印','偏印'];
const GROUPS = {比劫:['比肩','劫财'],食伤:['食神','伤官'],财星:['正财','偏财'],官杀:['正官','七杀'],印星:['正印','偏印']};
export const READING_VERSION = '0.4.0-r1';
const unique = xs => [...new Set(xs)];
const god = (day, gan) => U.SHI_SHEN[day+gan];
const element = gan => U.WU_XING_GAN[gan];
const next = (e,n) => ELEMENTS[(ELEMENTS.indexOf(e)+n+5)%5];

// These are explicit, conservative study rules, not a recovered server model.
export function seasonalProfile(month, dayElement) {
  const ruling = U.WU_XING_ZHI[month];
  const states = {[ruling]:'旺',[next(ruling,1)]:'相',[next(ruling,-1)]:'休',[next(ruling,-2)]:'囚',[next(ruling,2)]:'死'};
  const labels = {寅:'孟春',卯:'仲春',辰:'季春',巳:'孟夏',午:'仲夏',未:'季夏',申:'孟秋',酉:'仲秋',戌:'季秋',亥:'孟冬',子:'仲冬',丑:'季冬'};
  const earth = '辰未戌丑'.includes(month);
  return {month,label:labels[month],ruling,state:states[dayElement],states,
    note:earth?'四季土月先按土旺简表；另列所属季节余气参照，不将整月视为同一司令日数。':'以月支所属季节查旺相休囚死；这是季节关系，不是能量百分比。',
    residual:earth?({辰:'木',未:'火',戌:'金',丑:'水'}[month]):null};
}

export function assessStrength(pillars) {
  const day=pillars[2].gan, e=element(day),season=seasonalProfile(pillars[1].zhi,e);
  const roots=pillars.flatMap(p=>p.hidden.map(h=>{const index=HIDDEN_QI_ORDER[p.zhi].indexOf(h.gan);return {pillar:p.label,value:p.value,gan:h.gan,level:['本气','中气','余气'][index],index};}).filter(h=>element(h.gan)===e));
  const visible=pillars.filter((_,i)=>i!==2).map(p=>({pillar:p.label,value:p.gan,god:god(day,p.gan)}));
  const supports=visible.filter(p=>SUPPORT.includes(p.god));
  const decide = mainOnly => {
    const kept=mainOnly?roots.filter(r=>r.index===0):roots;
    const inSeason=['旺','相'].includes(season.state);
    let status='mixed',conclusion='强弱待辨';
    if(inSeason&&kept.length){status='strong';conclusion='偏旺候选';}
    else if(!inSeason&&!kept.length&&supports.length<2){status='weak';conclusion='偏弱候选';}
    else if(!inSeason&&kept.filter(r=>r.index===0).length>=2&&supports.length){status='strong';conclusion='失令而有较多本气根，偏旺候选';}
    return {id:mainOnly?'main-roots':'all-roots',name:mainOnly?'仅本气根复核':'本中余气根参照',status,conclusion,
      evidence:[`${season.label}${pillars[1].zhi}月，日主${day}${e}在本气季节表中为${season.state}。`,
        kept.length?`同类根：${kept.map(r=>`${r.pillar}${r.value}藏${r.gan}（${r.level}）`).join('；')}。`:'本口径未见日主同五行藏根。',
        supports.length?`年/月/时干印比：${supports.map(s=>`${s.pillar}${s.value}·${s.god}`).join('、')}。`:'年/月/时干未见印比。']};
  };
  const methods=[decide(false),decide(true)],consensus=methods.every(m=>m.status===methods[0].status);
  const disagreements=[];
  if(!consensus)disagreements.push('计入中余气根与仅取本气根时结论不同，扶抑喜忌暂不合并为唯一答案。');
  if(season.residual)disagreements.push(`本月属四季土月，尚有${season.residual}的季节余气；报告的旺衰判断未纳入分日司令；专业盘另列司令参照，土旺简表不能代替这一判断。`);
  return {season,roots,visible,supports,methods,consensus,status:consensus?methods[0].status:'mixed',disagreements,
    rule:'季节有助（旺/相）且通同类根→偏旺候选；季节不占旺相、无同类根且透干印比少于两位→偏弱候选；季节不占旺相但至少两处本气根且有透干印比→偏旺候选；其余待辨。两种口径只比较根的层次，不代表两个完整流派。',
    limits:'尚未综合藏印扶助、司令分日、根气受冲后的强弱折算和合化后的五行重算，故不输出强弱分数。'};
}

function structureReading(r) {
  const day=r.pillars[2].gan, visible=r.pillars.filter((_,i)=>i!==2).map(p=>({name:god(day,p.gan),text:`${p.label}${p.gan}`}));
  const rows=[];
  const add=(name,kind,a,b,body)=>{
    const left=visible.filter(v=>a.includes(v.name)),right=visible.filter(v=>b.includes(v.name));
    if(left.length&&right.length)rows.push({name,kind,body,evidence:[...left,...right].map(v=>`${v.text}为${v.name}`)});
  };
  add('官印相生','承接',['正官'],GROUPS.印星,'透干见官与印，可讨论官生印、印生日主的承接路线；不只因两神并见就判成格。');
  add('杀印相生','承接',['七杀'],GROUPS.印星,'透干见杀与印，可讨论以印承接官杀；仍需核对杀、印及日主根气。');
  add('食神制杀','制约',['食神'],['七杀'],'透干见食神与七杀，有制杀的组合条件；制化是否适量、是否被印截断仍待核对。');
  add('食伤生财','承接',GROUPS.食伤,GROUPS.财星,'透干见食伤与财，可讨论输出生资源的路线；不据此推断收入多少。');
  add('伤官配印','制约',['伤官'],GROUPS.印星,'透干见伤官与印，可讨论印制伤官；不能把任何伤印并见均当作已成格。');
  add('财生官杀','承接',GROUPS.财星,GROUPS.官杀,'透干见财与官杀，财能生官杀；这条路线的取舍须与日主承受条件同看。');
  add('伤官见官','阻力',['伤官'],['正官'],'伤官与正官同时透出，列为格局复核点；印、财等是否通关制化会影响解释。');
  add('枭食相见','阻力',['偏印'],['食神'],'偏印与食神同时透出，存在枭食相制的条件；有财制印或位置隔离时须另议。');
  add('官杀并透','分歧',['正官'],['七杀'],'正官七杀同时透出，先查是否有去留、制化，不直接断为混杂破格。');
  add('财印并透','分歧',GROUPS.财星,GROUPS.印星,'财与印同时透出，既可能相制，也可能各司其用；需结合月令与位置。');
  add('比劫与财并透','分歧',GROUPS.比劫,GROUPS.财星,'比劫与财同透，协作、分配与承载关系需要核对，不直接断破财。');
  add('食伤泄秀','承接',GROUPS.比劫,GROUPS.食伤,'比劫与食伤同时透出，可讨论同类之气向输出转化；以身有承载条件为前提。');
  const match=visible.filter(v=>v.name===r.structure.god);
  return {...r.structure,combinations:rows,
    establishment:[r.structure.reason,match.length?`取格十神已透：${match.map(v=>v.text).join('、')}。`:'所取月令十神未在年/月/时干直接透出。',
      '已检查透干的承接、制约和阻力组合；未把“看见组合”直接等同于成格或败格。'],
    conclusion:rows.some(x=>x.kind==='阻力')?'见阻力组合，需结合制化复核成败':'列出成格条件，仍须复核根气与制化'};
}

function climateReading(pillars) {
  const month=pillars[1].zhi,items=[];
  if('亥子丑'.includes(month))items.push({element:'火',reason:'冬令寒，季节层面先讨论温暖之用；是否采用丙、丁仍需具体日干和组合。'});
  if('巳午未'.includes(month))items.push({element:'水',reason:'夏令热，季节层面先讨论润燥制热；是否采用壬、癸仍需具体日干和组合。'});
  if('辰丑'.includes(month))items.push({element:'火',reason:'辰、丑属湿土取象，另列温燥条件；不据一个月支就认定全局湿寒。'});
  if('未戌'.includes(month))items.push({element:'水',reason:'未、戌属燥土取象，另列润燥条件；不据一个月支就认定全局燥烈。'});
  return {items,summary:items.length?unique(items.map(x=>x.element)).map(e=>e==='火'?'火暖候选':'水润候选').join('、'):'仅凭季节不设单一水火优先',
    evidence:`月柱${pillars[1].value}；仅使用冬寒、夏热及四季土燥湿的基础规则。`,
    note:'这是季节层面的调候参考，未实现《穷通宝鉴》逐日干逐月用神表；不将它包装成最终调候用神。'};
}

function preferencesReading(dayElement,strength,climate) {
  const status=strength.status;
  const assist=status==='weak'?[next(dayElement,-1),dayElement]:status==='strong'?[next(dayElement,1),next(dayElement,2),next(dayElement,-2)]:[];
  const restrain=status==='weak'?[next(dayElement,1),next(dayElement,2),next(dayElement,-2)]:status==='strong'?[next(dayElement,-1),dayElement]:[];
  const conflicts=climate.items.filter(c=>restrain.includes(c.element)).map(c=>`${c.element}在季节调候中列为候选，在当前扶抑口径中却属慎增；两项保留，不自动选定其一。`);
  return {assist,restrain,conflicts:unique(conflicts),
    conclusion:status==='weak'?'以印比扶助作为候选方向':status==='strong'?'以食伤泄、财耗或官杀制作为候选方向':'强弱口径尚未收敛，暂不排列唯一喜忌',
    note:'同组元素不是同等优先。未综合全部格局成败、通关、合化与调候，故这里的“候选/慎增”不等于最终喜用神或绝对忌神。'};
}

function specialReading(r,strength) {
  const p=r.pillars,day=p[2].gan,e=element(day),other=p.flatMap((x,i)=>[...(i===2?[]:[{gan:x.gan,label:x.label+'天干'}]),...x.hidden.map(h=>({gan:h.gan,label:x.label+'藏干'}))]);
  const aids=other.filter(x=>SUPPORT.includes(god(day,x.gan)));
  const stemGods=p.filter((_,i)=>i!==2).map(x=>god(day,x.gan));
  const followers=[['从财',GROUPS.财星],['从杀',GROUPS.官杀],['从儿',GROUPS.食伤]];
  const strict=followers.find(([,gs])=>other.every(x=>gs.includes(god(day,x.gan)))&&stemGods.some(g=>gs.includes(g)));
  const from={name:'从格筛查',status:!aids.length&&!strength.roots.length&&strict?strict[0]+'严格条件候选':'不自动取从格',
    body:'本版从格筛查要求日主无同类藏根、其余透藏不见印比，并全部落在同一从势类别；这是保守筛查，未覆盖有杂气仍可从的流派。',
    evidence:[strength.roots.length?`见${strength.roots.length}处同五行藏根，不能据“失令”直接取从。`:'未见同五行藏根。',aids.length?`其余透藏见印比：${aids.map(x=>x.label+x.gan).join('、')}。`:'其余透藏未见印比。',strict?`其余透藏同属${strict[0]}类别。`:'其余透藏不满足本版单一从势条件。']};
  const sets={木:['曲直','寅卯辰','亥卯未'],火:['炎上','巳午未','寅午戌'],土:['稼穑','辰戌丑未'],金:['从革','申酉戌','巳酉丑'],水:['润下','亥子丑','申子辰']}[e];
  const full=sets.slice(1).find(g=>[...g].every(z=>p.some(x=>x.zhi===z)));
  const controllers=other.filter(x=>x.label.endsWith('天干')&&GROUPS.官杀.includes(god(day,x.gan)));
  const special={name:'专旺筛查',status:full&&!controllers.length?sets[0]+'候选':'未满足本版专旺条件',
    body:'先检查日主同五行的三会/三合齐备（土取四库齐备）及年/月/时干不透官杀；符合也只列候选，支冲、藏气混杂和合化需再审。',
    evidence:[full?`日主${day}${e}，地支齐见${full}。`:`未齐见${sets.slice(1).join('或')}。`,controllers.length?`年/月/时干透官杀：${controllers.map(x=>x.label+x.gan).join('、')}。`:'年/月/时干未透官杀。']};
  const pairs=[['甲己','土'],['乙庚','金'],['丙辛','水'],['丁壬','木'],['戊癸','火']];
  const nearby=[p[1],p[3]].filter(x=>pairs.some(([g])=>g.includes(day)&&g.includes(x.gan)&&day!==x.gan));
  const chemistry={name:'日干合化筛查',status:nearby.length?'见邻干五合，化气待辨':'邻干未见日主五合',
    body:'只检查月/时干与日干相邻的五合；不将五合直接换算为化气格，尚未执行化神得令、原根与争合的完整裁定。',
    evidence:nearby.map(x=>`${x.label}${x.gan}与日干${day}合，合化目标${pairs.find(([g])=>g.includes(day)&&g.includes(x.gan))[1]}。`)};
  const lu={甲:'寅',乙:'卯',丙:'巳',丁:'午',戊:'巳',己:'午',庚:'申',辛:'酉',壬:'亥',癸:'子'}[day];
  const blade={甲:'卯',丙:'午',戊:'午',庚:'酉',壬:'子'}[day];
  const month=p[1].zhi,monthly={name:'建禄 / 月刃',status:month===lu?'建禄候选':month===blade?'阳刃月候选':'本月不合本表禄刃条件',
    body:'按日干查月支，禄刃名目与月令十神取格并列，不覆盖所选取格法。本版月刃仅采用阳干表，阴干刃法的不同流派暂不合并。',
    evidence:[`日干${day}禄在${lu}；月支${month}。`,blade?`阳干刃表：${day}刃在${blade}。`:'阴干月刃不在本版裁定范围。']};
  return [from,special,chemistry,monthly];
}

function themesReading(r) {
  const day=r.pillars[2].gan;
  const themes=[['学习与支持','印星','印星用于讨论学习、吸收、资助与支持体系。'],['表达与产出','食伤','食伤用于讨论表达、技艺与成果输出。'],['资源与分配','财星','财星用于讨论资源组织、交换和分配。'],['规则与责任','官杀','官杀用于讨论规则、职责与约束。'],['协作与边界','比劫','比劫用于讨论同伴、协作与竞争边界。']];
  const items=themes.map(([name,group,body])=>{
    const seen=r.pillars.filter((_,i)=>i!==2).filter(p=>GROUPS[group].includes(god(day,p.gan)));
    const hidden=r.pillars.flatMap(p=>p.hidden.filter(h=>GROUPS[group].includes(god(day,h.gan))).map(h=>p.label+'藏'+h.gan));
    return {name,body:body+(seen.length?'本盘在天干层面可直接展开这一主题。':hidden.length?'本盘此类十神主要在藏干层面，解读时应区分透与藏。':'本盘透藏未见此类十神；不表示现实中缺少这项能力或经历。'),
      evidence:[seen.length?'透干：'+seen.map(p=>p.label+p.gan+'·'+god(day,p.gan)).join('、'):'年/月/时干未透。',hidden.length?'藏干：'+hidden.join('、'):'藏干未见。']};
  });
  const related=r.relations.filter(x=>x.text.includes('日柱'));
  items.push({name:'关系互动',body:`日支${r.pillars[2].zhi}作为传统关系宫位的观察入口；结合原局合冲讨论互动与边界，不推断配偶身份或婚姻结局。`,evidence:[`日柱${r.pillars[2].value}；日支藏${r.pillars[2].hidden.map(x=>x.gan+'·'+god(day,x.gan)).join('、')}。`,...related.map(x=>x.text),...(!related.length?['当前原局关系表未标记日支相关组合。']:[])]});
  return items;
}

function plusYears(date,n) {
  const d=new Date(date),year=d.getUTCFullYear()+n,month=d.getUTCMonth(),day=d.getUTCDate();
  d.setUTCDate(1);d.setUTCFullYear(year);d.setUTCMonth(month);d.setUTCDate(Math.min(day,new Date(Date.UTC(year,month+1,0)).getUTCDate()));return d;
}
export function decadeAt(r,context) {
  if(!context.date)return null;
  const instant=new Date(context.date+'T'+(context.time||'12:00')+':00Z').getTime()-(Number(r.input.utcOffset??8)+(r.input.dst?1:0))*3600000;
  const birth=new Date(r.input.date+'T'+r.input.time+':00Z').getTime()-(Number(r.input.utcOffset??8)+(r.input.dst?1:0))*3600000;
  if(instant<birth)return {value:null,label:'出生前时刻',note:'所选时刻早于出生，不配大运。'};
  const start=new Date(r.yun.start.replace(' ','T')+'+08:00');
  if(instant<start.getTime())return {value:null,label:'童限',note:'尚未到首次交运时刻。'};
  for(const d of r.decades.filter(d=>d.index>0)){
    const from=plusYears(start,(d.index-1)*10),to=plusYears(start,d.index*10);
    if(instant>=from.getTime()&&instant<to.getTime())return {index:d.index,value:d.value,label:d.value,from:new Date(from.getTime()+8*3600000).toISOString().slice(0,19).replace('T',' '),to:new Date(to.getTime()+8*3600000).toISOString().slice(0,19).replace('T',' '),note:'以首次起运时刻为起点，每十个公历年换运；边界按UTC+8列示。'};
  }
  return {value:null,label:'超出已生成大运',note:'可在排盘设置中改用120年大运。'};
}

function timingReading(r,context) {
  const decade=decadeAt(r,context),day=r.pillars[2].gan;
  const cols=[];
  if(decade?.value)cols.push({label:'大运',value:decade.value,gan:decade.value[0],zhi:decade.value[1]});
  if(context.flow?.pillars)cols.push(...context.flow.pillars);
  const pairs=[['天干五合',['甲己','乙庚','丙辛','丁壬','戊癸'],'gan'],['地支六合',['子丑','寅亥','卯戌','辰酉','巳申','午未'],'zhi'],['地支六冲',['子午','丑未','寅申','卯酉','辰戌','巳亥'],'zhi']];
  const items=cols.map(p=>({label:p.label,value:p.value,god:god(day,p.gan),
    body:SUPPORT.includes(god(day,p.gan))?'此层天干引入印比，属于扶助方向；是否适用取决于原局扶抑与调候。':'此层天干引入食伤、财或官杀，属于泄耗制方向；是否适用取决于原局承载条件。',
    evidence:[`${p.gan}相对于日干${day}为${god(day,p.gan)}；${p.zhi}藏${U.ZHI_HIDE_GAN[p.zhi].join('、')}。`]}));
  const relations=[];
  for(const p of cols)for(const n of r.pillars){
    if(p.value===n.value)relations.push({type:'同柱重见',text:`${p.label}${p.value}与${n.label}${n.value}相同，记录为伏吟组合；不据此自动判断事件。`});
    for(const [type,groups,key] of pairs)if(p[key]!==n[key]&&groups.some(g=>g.includes(p[key])&&g.includes(n[key])))relations.push({type,text:`${p.label}${p.value}与${n.label}${n.value}：${p[key]}${n[key]}${type==='地支六冲'?'冲':'合'}。`});
  }
  return {date:context.date,time:context.time,decade,items,relations,
    note:'这里只解释所选岁运符号怎样加入原局；合冲和十神不直接对应某年必有的升迁、婚变、疾病或金额。'};
}

export function analyzeBazi(r,context={}) {
  const strength=assessStrength(r.pillars),climate=climateReading(r.pillars),e=element(r.pillars[2].gan);
  const structure=structureReading(r),preferences=preferencesReading(e,strength,climate);
  return {version:READING_VERSION,
    identity:{name:r.input.name||'未命名',birth:r.input.date+' '+r.input.time,pillars:r.pillars.map(p=>p.value),day:r.pillars[2].gan,element:e,
      clock:`标准UTC${Number(r.input.utcOffset??8)>=0?'+':''}${r.input.utcOffset??8}${r.input.dst?'，输入含夏令时':''}${r.input.trueSolar?'，近似真太阳时':''}；${+r.input.sect===1?'23点':'零点'}换日`,effective:r.date+' '+r.time,ruleContext:`年柱：${({exact:'立春交节时刻',lichunDay:'立春日零点（UTC+8）',springFestival:'正月初一（UTC+8）'})[r.input.yearBoundary]||'立春交节时刻'}；命宫：${r.input.palaceMethod==='qi'?'过中气按下月':'按节换月'}；格局：${r.structure.method}；分柱：${r.minutePillar?r.minutePillar.value+'（独立展示）':'关闭'}；司令：${r.commander?.stem||'未列'}（不参与本报告旺衰判断）`},
    summary:[`本盘日主${r.pillars[2].gan}${e}，生于${strength.season.label}${strength.season.month}月；季节表为${strength.season.state}，透藏见${strength.roots.length}处同五行根、${strength.supports.length}位年/月/时干印比。${strength.consensus?'两种根口径的方向一致：'+strength.methods[0].conclusion+'。':'中余气根是否计入会改变判断，保留两种口径。'}`,
      `月令取${structure.name}为入口。${structure.combinations.length?'透干可见'+structure.combinations.map(x=>x.name).join('、')+'，下文逐项列出承接与阻力。':'当前透干未命中所列承接/阻力组合，仍需按根气和位置继续复核。'}${preferences.conclusion}；季节层面为${climate.summary}。${preferences.conflicts.length?'扶抑与调候存在冲突，暂不合并为唯一用神。':''}`],
    strength,structure,climate,preferences,specials:specialReading(r,strength),themes:themesReading(r),timing:timingReading(r,context),
    scope:'传统命理研习报告。生克、十神、透藏等由盘面确定；旺衰、喜忌和特殊格采用本项目公开的保守候选规则，不是原软件服务器报告。',
    sources:['历法与十神：lunar-javascript 1.7.7；旺相休囚死、同类通根、生克关系采用通行基础表。','旺衰判别、两种根口径与报告文案：本项目研习规则 r1；不宣称为某一完整古法流派。']};
}

export function readingMarkdown(report) {
  const lines=[`# ${report.identity.name} · 八字综合解读`,'',`规则版本：${report.version}`,`输入：${report.identity.birth}；${report.identity.clock}`,`四柱：${report.identity.pillars.join(' / ')}；排盘钟时：${report.identity.effective}`,`计算口径：${report.identity.ruleContext}`,'',report.scope,''];
  const section=(title,body,evidence=[])=>{lines.push('## '+title,'',body,'',...evidence.map(e=>'- '+e),'');};
  section('综合判断',report.summary.join('\n\n'));
  section('旺衰候选',report.strength.methods.map(m=>m.name+'：'+m.conclusion).join('；'),report.strength.methods.flatMap(m=>m.evidence));
  section('判断规则与分歧',report.strength.rule,[...report.strength.disagreements,report.strength.limits]);
  section('月令格局 · '+report.structure.name,report.structure.conclusion,report.structure.establishment);
  for(const x of report.structure.combinations)section(x.name+' · '+x.kind,x.body,x.evidence);
  section('季节调候 · '+report.climate.summary,report.climate.note,[report.climate.evidence,...report.climate.items.map(x=>x.element+'：'+x.reason)]);
  section('喜忌候选',report.preferences.conclusion,[`候选：${report.preferences.assist.join('、')||'待辨'}；慎增：${report.preferences.restrain.join('、')||'待辨'}`,report.preferences.note,...report.preferences.conflicts]);
  for(const x of report.specials)section(x.name+' · '+x.status,x.body,x.evidence);
  for(const x of report.themes)section(x.name,x.body,x.evidence);
  section('岁运同参',`${report.timing.date||'未选日期'} ${report.timing.time||''}；大运：${report.timing.decade?.label||'未配'}；${report.timing.decade?.note||''}`,
    [...report.timing.items.map(x=>x.label+x.value+'·'+x.god+'：'+x.body),...report.timing.relations.map(x=>x.text),report.timing.note]);
  section('依据与范围','',report.sources);
  return lines.join('\n');
}
