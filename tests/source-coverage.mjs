import assert from "node:assert/strict";
import { auditSourceCoverage, auditVisibleFactContent, structuredFactIssues } from "../scripts/lib/source-coverage.mjs";

const source = { sourceUnits: [{ id: "S1", text: "一", visibility: "required-visible" }, { id: "S2", text: "二", visibility: "traceability" }, { id: "S3", text: "三", visibility: "supporting-visible" }] };
const missing = auditSourceCoverage(source, { slides: [{ id: "P1", evidenceRefs: ["S1", "S2"], modules: [{ id: "M1", evidenceRefs: ["S3"] }] }] });
assert.equal(missing.passed, false);
assert.match(missing.issues.join(" "), /S1 is decision-critical/);
const covered = auditSourceCoverage(source, { slides: [{ id: "P1", role: "content", evidenceRefs: ["S2"], modules: [{ id: "M1", evidenceRefs: ["S1", "S3"] }] }] });
assert.equal(covered.passed, true);
assert.equal(covered.visibleRequired, 1);
assert.equal(covered.notesOnly, 1);
const notesOnlySupporting = auditSourceCoverage(source, { slides: [{ id: "P1", role: "content", evidenceRefs: ["S2", "S3"], modules: [{ id: "M1", evidenceRefs: ["S1"] }] }] });
assert.equal(notesOnlySupporting.passed, false);
assert.match(notesOnlySupporting.issues.join(" "), /S3 must appear in a visible body module/);
const appendixSupporting = auditSourceCoverage(source, { slides: [{ id: "P1", role: "content", evidenceRefs: ["S2"], modules: [{ id: "M1", evidenceRefs: ["S1"] }] }, { id: "A1", role: "appendix", modules: [{ id: "A1M1", evidenceRefs: ["S3"] }] }] });
assert.equal(appendixSupporting.passed, false);
assert.match(appendixSupporting.issues.join(" "), /visible body module/);
const explicitlyAuthorizedAppendix = auditSourceCoverage(source, { slides: [{ id: "P1", role: "content", evidenceRefs: ["S2"], modules: [{ id: "M1", evidenceRefs: ["S1"] }] }, { id: "A1", role: "appendix", modules: [{ id: "A1M1", evidenceRefs: ["S3"] }] }] }, { allowAppendix: true });
assert.equal(explicitlyAuthorizedAppendix.passed, true);
const omitted = auditSourceCoverage({ ...source, approvedOmissions: [{ sourceUnitId: "S3", approved: true, reason: "用户明确删除" }] }, { slides: [{ id: "P1", role: "content", evidenceRefs: ["S2"], modules: [{ id: "M1", evidenceRefs: ["S1"] }] }] });
assert.equal(omitted.passed, true);
assert.equal(omitted.approvedOmissions, 1);
const referenceOnly = auditVisibleFactContent(source, { slides: [{ id: "P1", role: "content", modules: [{ id: "M1", text: "一和三", evidenceRefs: ["S1", "S3"] }] }] });
assert.equal(referenceOnly.passed, false);
assert.match(referenceOnly.issues.join(" "), /evidenceRef alone is not visible content/);
const trulyVisible = auditVisibleFactContent(source, { slides: [{ id: "P1", role: "content", modules: [{ id: "M1", text: "一和三", evidenceRefs: ["S1", "S3"], visibleFacts: [{ sourceUnitId: "S1", text: "一" }, { sourceUnitId: "S3", text: "三" }] }] }] });
assert.equal(trulyVisible.passed, true);
const fakeVisible = auditVisibleFactContent(source, { slides: [{ id: "P1", role: "content", modules: [{ id: "M1", text: "一", evidenceRefs: ["S1", "S3"], visibleFacts: [{ sourceUnitId: "S1", text: "一" }, { sourceUnitId: "S3", text: "三" }] }] }] });
assert.equal(fakeVisible.passed, false);
assert.match(fakeVisible.issues.join(" "), /VISIBLE_FACT_NOT_RENDERED/);
console.log(JSON.stringify({ passed: true, tests: 17 }));
// A number elsewhere in a multi-entity carrier cannot satisfy this entity's fact.
const scopedSource={sourceUnits:[{id:'amount',text:'项目甲 100万元',visibility:'required-visible'}]};
const scopedIr={slides:[{id:'p',role:'content',modules:[{id:'profiles',type:'diagram',data:{nodes:[{id:'a',label:'项目甲',text:'100万元'},{id:'b',label:'项目乙',text:'200万元'}]},visibleFacts:[{sourceUnitId:'amount',targetId:'a',text:'项目甲 100万元'}]}]}]};
assert.equal(auditVisibleFactContent(scopedSource,scopedIr).passed,true);
assert.equal(auditVisibleFactContent(scopedSource,scopedIr,{renderedModules:[{slideId:'p',moduleId:'profiles',text:'项目甲 200万元 项目乙 100万元',targets:{a:'项目甲 200万元',b:'项目乙 100万元'}}]}).passed,false);
assert.equal(auditVisibleFactContent(scopedSource,scopedIr,{renderedModules:[{slideId:'p',moduleId:'profiles',text:'项目甲 100万元 项目乙 200万元',targets:{a:'项目甲 100万元',b:'项目乙 200万元'}}]}).passed,true);
console.log('Node-local fact bindings reject swapped entity numbers');
// A file extension is not a decimal continuation; numeric prefixes still fail.
const fileFact={id:'file',text:'请参见定价测算对比_260825.xlsx',requiredComponents:['定价测算对比_260825.xlsx'],componentReview:{status:'reviewed',sourceText:'请参见定价测算对比_260825.xlsx'}};
const fileIr={slides:[{id:'p',modules:[{id:'copy',text:'测算依据：定价测算对比_260825.xlsx',visibleFacts:[{sourceUnitId:'file',text:'定价测算对比_260825.xlsx'}]}]}]};
assert.equal(auditVisibleFactContent({sourceUnits:[fileFact]},fileIr).passed,true);
const numericFact={text:'项目甲 12',fact:{subjects:['项目甲'],value:'12'},factReview:{status:'reviewed',sourceText:'项目甲 12'}};
assert.deepEqual(structuredFactIssues(numericFact,numericFact.fact,'项目甲12.'),[]);
for(const text of ['项目甲123','项目甲12.3','项目甲1.12']) assert(structuredFactIssues(numericFact,numericFact.fact,text).includes('FACT_SOURCE_QUALIFIER_MISSING'));
console.log('File-extension punctuation does not hide numeric qualifiers');
for(const [sourceText,module,components] of [
  ['地区甲M36贡献10.0万',{title:'地区甲M36贡献',data:{categories:['地区甲'],series:[{name:'M36贡献',values:[10],displayUnit:'万'}]}},['地区甲','M36','万']],
  ['列示636；原文6,36万美元',{title:'列示636',text:'原文6,36万美元（待核）'},['636','6,36','美元']],
  ['指标Y1：(0.9)；Y2：0.1',{title:'指标',data:{headers:['Y1','Y2'],rows:[['(0.9)','0.1']]}},['Y1','Y2','0.9','0.1']]
]) {
  const unit={id:'u',text:sourceText,requiredComponents:components,componentReview:{status:'reviewed',sourceText}};
  const result=auditVisibleFactContent({sourceUnits:[unit]},{slides:[{id:'p',modules:[{...module,id:'m',visibleFacts:[{sourceUnitId:'u',text:module.title}]}]}]});
  assert.deepEqual(result.issues,[]);
}
