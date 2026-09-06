import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {theme} from '../scripts/lib/config.mjs';
import {planAndMeasureOutline} from '../scripts/lib/dom-layout-extractor.mjs';
import {capacityEvidence,planOutlinePages} from '../scripts/lib/outline-planner.mjs';
const folder=fs.mkdtempSync(path.join(os.tmpdir(),'mint-rc5-capacity-'));
const rows=Array.from({length:36},(_,i)=>[`项目${i+1}`,String(i+1),'下期计划','仅试点范围']);
const source={id:'full',role:'content',sectionId:'test',outlineItem:'1',decisionUnit:'D',claim:'分组核对全部计划，不改变范围',modules:[{id:'table',type:'table',semanticRole:'primaryEvidence',evidenceGroup:'明细',data:{headers:['项目','数量（项）','期间属性','范围'],rows,rowGroups:[0,1,2].map(i=>({label:`完整业务组${i+1}`,start:i*12,end:(i+1)*12})),rowEvidenceRefs:rows.map((_,i)=>['f'+i])},evidenceRefs:rows.map((_,i)=>'f'+i)}],scenePlan:{flow:'vertical',regions:[{id:'r',role:'primary',relation:'stack',weight:'natural',moduleIds:['table']}],readingOrder:['r']}};
// A fixed vertical scene deliberately tests necessary continuation. Flexible
// row groups may now fit side by side and should not be forced into more pages.
source.designCompositionPolicy='user-fixed';
const result=await planAndMeasureOutline({slides:[source],executionBrief:{decisionSystems:[{id:'D'}]}},theme,path.join(folder,'canvas.html'),path.join(folder,'render'));
fs.writeFileSync(path.join(folder,'capacity-attempts.json'),JSON.stringify(result.measurements,null,2));
fs.writeFileSync(path.join(folder,'planned.json'),JSON.stringify(result.ir,null,2));
assert.deepEqual(result.manifest.issues,[],folder);
assert.ok(result.ir.slides.length>1);
assert.deepEqual(result.ir.slides.flatMap(s=>s.modules.flatMap(m=>m.data.rows)),rows);
const complete=result.measurements.filter(a=>a.phase==='complete');
assert.equal(complete.length,4,'authored and local repair, at both readable densities');
assert.ok(complete.every(a=>a.measured&&!a.passed&&a.failedObjects.length&&a.remainingSpace&&a.objectSizes.length&&a.candidate.modules[0].data.rows.length===36));
for(const s of result.ir.slides.slice(1)) {
  assert.equal(s.outlineSplit.fullCandidateAttempts.length,complete.length);
  assert.ok(s.outlineSplit.boundaryEvidence.previousModuleIds.length&&s.outlineSplit.boundaryEvidence.nextModuleIds.length);
  assert.ok(s.outlineSplit.remainingSpace.every(a=>a.attemptId&&a.freeAreaPx2>=0));
}
let repaired=0;
const local=await planOutlinePages([{...source,modules:[{id:'t',type:'text',text:'完整内容',evidenceGroup:'完整业务组'}],scenePlan:{...source.scenePlan,regions:[{...source.scenePlan.regions[0],moduleIds:['t']}]}}],async candidate=>{
  repaired++;return {passed:candidate.measuredSceneVariant==='content-first',issues:candidate.measuredSceneVariant==='content-first'?[]:['module t local overflow'],slides:[{mainBounds:{left:0,top:0,width:1000,height:900},modules:[{id:'t',rect:{left:0,top:0,width:500,height:100},textObjects:[]}]}]};
},{requireMeasuredProof:true});
assert.equal(local.slides.length,1,'local overflow must try full-content repair before considering continuation');
assert.ok(repaired>=2);
await assert.rejects(planOutlinePages([source],async()=>({passed:false,issues:['browser unavailable'],slides:[]}),{requireMeasuredProof:true}),e=>/CAPACITY_MEASUREMENT_MISSING/.test(e.message)&&e.capacityAttempts.length===4);
const proof=capacityEvidence({mainBounds:{left:0,top:0,width:100,height:100},modules:[{id:'m',rect:{left:0,top:0,width:40,height:50},textObjects:[]}]});
assert.equal(proof.remainingSpace.freeAreaPx2,8000);
await assert.rejects(planOutlinePages([{...source,modules:[{id:'only',type:'text',text:'全部保留'}],scenePlan:undefined}],async()=>({passed:true,issues:[],slides:[{mainBounds:{left:0,top:0,width:100,height:100},modules:[{id:'only',rect:{left:0,top:80,width:100,height:40},textObjects:[]}]}]}),{requireMeasuredProof:true,designRequirements:[{type:'single-page',strength:'hard',scope:'report'}]}),/HARD_SINGLE_PAGE_CAPACITY/,'a permissive outer result must not override measured body overflow');
console.log(JSON.stringify({folder,pages:result.ir.slides.length,attempts:result.measurements.length,scope:'browser capacity evidence regression, not real chapter benchmark'}));
