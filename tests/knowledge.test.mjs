import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const entries=JSON.parse(await readFile(new URL('../src/glossary.json',import.meta.url),'utf8'));

test('all bundled knowledge entries contain readable text instead of HTML or CSS',()=>{
 assert.equal(entries.length,168);
 for(const entry of entries){
  assert.ok(entry.text.trim().length>20,entry.term);
  assert.doesNotMatch(entry.text,/<\/?[a-z][^>]*>|<!doctype|Content-Type|background-color\s*:/i,entry.term);
 }
});
test('the screenshot entries retain the actual formula, headings and full explanation',()=>{
 const t=entries.find(x=>x.term==='天乙贵人').text;
 for(const text of ['古决','甲戊庚牛羊','查法','以日/年干查四地支','如为喜用'])assert.ok(t.includes(text),text);
 assert.ok(t.includes('\n'));
 for(const term of ['太极贵人','天德贵人','文昌贵人','学堂','词馆','天罗地网']){
  const entry=entries.find(x=>x.term===term);assert.ok(entry.text.length>100,term);
 }
});
