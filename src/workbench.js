import {calculate,validateInput,godOf,ELEMENTS,compare} from './engine.js';
import {HIDDEN_QI_ORDER} from './rules.js';
export const CATEGORIES={bazi:'八字排盘',case:'案例解析',compare:'合盘',wealth:'财星研习',multi:'多盘对比',qimen:'奇门',ziwei:'紫微'};
export function fullAge(birth,date){
 const [y,m,d]=birth.split('-').map(Number),[yy,mm,dd]=date.split('-').map(Number);
 return yy-y-((mm<m||(mm===m&&dd<d))?1:0);
}
export function ageInYear(birth,year){
 const a=Math.max(0,fullAge(birth,`${year}-01-01`)),b=Math.max(0,fullAge(birth,`${year}-12-31`));
 return a===b?`${a}周岁`:`${a}—${b}周岁`;
}
export function fortuneShensha(result,index,shensha){
 const decade=result.decades[index],years=decade?.years||[];
 const targets=[];
 if(decade&&decade.value!=='童限')targets.push({label:'大运',value:decade.value,gan:decade.value[0],zhi:decade.value[1]});
 for(const y of years)targets.push({label:`${y.year}流年`,value:y.value,gan:y.value[0],zhi:y.value[1]});
 return {targets,hits:shensha(result.pillars,targets,{gender:result.input.gender})};
}
export function wealthStudy(result){
 const day=result.pillars[2].gan;
 const hits=result.pillars.flatMap(p=>[
  ...(p.label==='日柱'?[]:[{position:p.label,stem:p.gan,god:godOf(day,p.gan),layer:'透干'}]),
  ...p.hidden.map(h=>({position:p.label,stem:h.gan,god:h.god,layer:'藏干'+['本气','中气','余气'][HIDDEN_QI_ORDER[p.zhi].indexOf(h.gan)]}))
 ]);
 const wealth=hits.filter(h=>['正财','偏财'].includes(h.god)),output=hits.filter(h=>['食神','伤官'].includes(h.god)),peers=hits.filter(h=>['比肩','劫财'].includes(h.god));
 const element=ELEMENTS[(ELEMENTS.indexOf(result.pillars[2].elements[0])+2)%5];
 return {day,element,wealth,output,peers,summary:wealth.length?`财星属${element}；${wealth.filter(h=>h.layer==='透干').length}处透干、${wealth.filter(h=>h.layer!=='透干').length}处藏干。逐处列示正偏财与位置，不能据此换算财富大小。`:`财星属${element}；原局透干与藏干未见正偏财。未见符号不等于缺乏收入或财富。`};
}
export function multiStudy(inputs){
 if(inputs.length<2||inputs.length>4)throw new Error('请选择 2—4 份命盘。');
 const charts=inputs.map(calculate),pairs=[];
 for(let a=0;a<inputs.length;a++)for(let b=a+1;b<inputs.length;b++)pairs.push({a,b,relations:compare(inputs[a],inputs[b]).relations});
 return {charts,pairs};
}
// Narrow and validate imported context; backups must never inject view state or HTML.
export function cleanInput(raw,defaults){
 if(!raw||typeof raw!=='object')throw new Error('档案缺少出生资料。');
 const input={...defaults,...Object.fromEntries(Object.keys(defaults).filter(k=>Object.hasOwn(raw,k)).map(k=>[k,raw[k]]))};
 validateInput(input);input.name=String(input.name).slice(0,60);return input;
}
export function cleanContext(raw={},defaults){
 const date=/^\d{4}-\d{2}-\d{2}$/.test(raw.flowDate||'')?raw.flowDate:null,time=/^\d{2}:\d{2}$/.test(raw.flowTime||'')?raw.flowTime:'12:00';
 if(date)validateInput({...defaults,date,time});
 return {flowDate:date,flowTime:time,decade:Number.isInteger(raw.decade)?Math.min(12,Math.max(0,raw.decade)):1,year:Number.isInteger(raw.year)?Math.min(9,Math.max(0,raw.year)):0,baziMode:['professional','reading','flow'].includes(raw.baziMode)?raw.baziMode:'professional',ziweiScope:['origin','decadal','age','yearly','monthly','daily','hourly'].includes(raw.ziweiScope)?raw.ziweiScope:'origin',partner:raw.partner?cleanInput(raw.partner,defaults):null,multiInputs:(Array.isArray(raw.multiInputs)?raw.multiInputs:[]).slice(0,3).map(i=>cleanInput(i,defaults))};
}
export function cleanRecord(raw,defaults,id){
 const input=cleanInput(raw.input,defaults);
 return {id,input,pillars:calculate(input).pillars.map(p=>p.value),category:Object.hasOwn(CATEGORIES,raw.category)?raw.category:'bazi',note:String(raw.note||'').slice(0,50000),feedback:String(raw.feedback||'').slice(0,50000),commentary:String(raw.commentary||'').slice(0,50000),tags:String(raw.tags||'').slice(0,150),starred:!!raw.starred,context:cleanContext(raw.context||{},defaults),updated:new Date().toISOString()};
}

export function cleanPreferences(raw={}){
 return {theme:['cinnabar','ochre','jade'].includes(raw.theme)?raw.theme:'cinnabar',font:[13,14,16,18].includes(Number(raw.font))?Number(raw.font):14,showShensha:raw.showShensha!==false,ageMode:raw.ageMode==='full'?'full':'virtual',hiddenOrder:raw.hiddenOrder==='library'?'library':'qi',hiddenShensha:(Array.isArray(raw.hiddenShensha)?raw.hiddenShensha:[]).filter(x=>typeof x==='string').slice(0,100),hideRelations:(Array.isArray(raw.hideRelations)?raw.hideRelations:[]).filter(x=>typeof x==='string').slice(0,30)};
}
