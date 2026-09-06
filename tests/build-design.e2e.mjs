import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {regulatoryFixture} from './fixtures/design-intent.mjs';
import {createTaskCard} from '../scripts/lib/task-card.mjs';
import {createCanonicalLedger,inventoryCanonicalInput} from '../scripts/lib/canonical-source-ledger.mjs';
import {CURRENT_SLIDE_IR_VERSION,CURRENT_PLANNING_SCHEMA_VERSION} from '../scripts/lib/ir-version.mjs';
import {presentationCopyHash,humanCopyChecks} from '../scripts/lib/presentation-copy.mjs';
import {inspectPptxPackage} from '../scripts/lib/pptx-metadata.mjs';
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'mint-build-design-'));
const ir=regulatoryFixture(),source={sourceUnits:[]};
for(const [i,m] of ir.slides[0].modules.entries()) {
  const texts=[m.text,...(m.data?.nodes || []).flatMap(n=>[n.label,n.text,n.status,n.condition,n.duration,n.timeRange?.label,...(n.metrics || [])]),...(m.data?.edges || []).map(e=>e.label),...(m.data?.lanes || []).map(l=>l.label)].filter(Boolean);
  m.evidenceRefs=[];m.visibleFacts=[];
  texts.forEach((text,j)=>{const id=`E${i+1}-${j}`;source.sourceUnits.push({id,text,visibility:'required-visible'});m.evidenceRefs.push(id);m.visibleFacts.push({sourceUnitId:id,text});});
}
ir.slides[0].evidenceRefs=source.sourceUnits.map(u=>u.id);
ir.slides[0].evidenceBundle=Object.fromEntries(['decisionRefs','primaryEvidenceRefs','supportingEvidenceRefs','actionRefs'].map((key,i)=>[key,ir.slides[0].modules[i].evidenceRefs]));
source.sourceUnits.push({id:'E-extra',text:'第二章节仍保留原始身份',visibility:'required-visible'});
ir.slides.push({id:'second-section',sectionId:'section-03',role:'content',outlineItem:'3',storyCluster:'identity',decisionUnit:'identity',managementQuestion:'分工是否准确？',claim:'第二章节仍保留原始身份',semanticIntent:'explanation',density:'standard',evidenceRefs:['E-extra'],evidenceBundle:{primaryEvidenceRefs:['E-extra']},modules:[{id:'identity',type:'text',semanticRole:'primaryEvidence',text:'第二章节仍保留原始身份',evidenceRefs:['E-extra'],visibleFacts:[{sourceUnitId:'E-extra',text:'第二章节仍保留原始身份'}]}]});
delete ir.sectionId;ir.sectionIds=['section-01','section-03'];
ir.slides[1].narrative={transition:'完成监管路径说明后，检查负责人章节身份。'};
const card=createTaskCard({reportId:ir.reportId,title:'Synthetic design acceptance',sections:[{sectionId:'section-01',title:'Regulatory',owner:'测试负责人',outlineItems:['1']},{sectionId:'section-02',title:'Other owner',owner:'B',outlineItems:['2']},{sectionId:'section-03',title:'Identity',owner:'测试负责人',outlineItems:['3']}]});
// Synthetic contract fixture: not a real Planner experiment or source-reading proof.
const rawFile=path.join(dir,'raw.txt');fs.writeFileSync(rawFile,source.sourceUnits.map(u=>u.text).join('\n'));
const canonical=createCanonicalLedger([await inventoryCanonicalInput({path:rawFile,sourceOrigin:'raw-source'})]);
source.sourceUnits.forEach((u,i)=>{u.canonicalRefs=[canonical.units[i].id];});
source.canonicalLedgerFile='canonical.json';fs.writeFileSync(path.join(dir,'canonical.json'),JSON.stringify(canonical));
Object.assign(ir,{schemaVersion:CURRENT_SLIDE_IR_VERSION,slideIrVersion:CURRENT_SLIDE_IR_VERSION,planningSchemaVersion:CURRENT_PLANNING_SCHEMA_VERSION});
ir.executionBrief={preflightMode:'auto',canonicalLedgerHash:canonical.sha256,audience:'test',communicationGoal:'test',managementObjective:'validate native binding',managementIntent:'explain',designRequirements:ir.designRequirements,semanticObligations:[],decisionSystems:ir.slides.map(s=>({id:s.decisionUnit,managementQuestion:s.managementQuestion,sourceRefs:canonical.units.map(u=>u.id)})),requirementsReview:{status:'reviewed',promptSha256:'synthetic-fixture'},semanticReview:{status:'reviewed',canonicalLedgerHash:canonical.sha256}};
for(const s of ir.slides) Object.assign(s,{claimType:'source-supported',claimSupportRefs:canonical.units.map(u=>u.id),claimReview:{status:'reviewed',claim:s.claim,canonicalLedgerHash:canonical.sha256,...Object.fromEntries(['forecast','range','causality','subject','unit','condition','scope'].map(k=>[k,'not-applicable']))}});
// These clean synthetic strings are the reviewed copy of this fixture only.
ir.presentationCopyVersion=1;
for(const s of ir.slides) for(const m of s.modules) m.displayCopy={title:m.title||'',text:m.text||'',...(m.value!==undefined?{value:m.value,unit:m.unit||''}:{}),...(m.data?.nodes?{nodes:m.data.nodes.map(n=>({id:n.id,name:n.label,summary:n.text,primaryMetrics:n.metrics||[],status:n.status,condition:n.condition,duration:n.duration,timeRangeLabel:n.timeRange?.label})),edges:(m.data.edges||[]).map(e=>({id:e.id,label:e.label||''})),lanes:(m.data.lanes||[]).map(e=>({id:e.id,label:e.label||''}))}:{})};
ir.executionBrief.presentationCopyReview={status:'reviewed',canonicalLedgerHash:canonical.sha256,copySha256:presentationCopyHash(ir)};
for(const [name,value] of Object.entries({ir,source,card}))fs.writeFileSync(path.join(dir,name+'.json'),JSON.stringify(value));
const file=path.join(dir,'candidate.pptx');
const build=spawnSync(process.execPath,['scripts/build-section-ppt.mjs',path.join(dir,'source.json'),path.join(dir,'ir.json'),path.join(dir,'card.json'),'测试负责人',file],{encoding:'utf8',maxBuffer:10_000_000});
assert.equal(build.status,0,build.stderr+build.stdout);
const report=JSON.parse(fs.readFileSync(file+'.build.json'));
assert.equal(report.deliveryApproved,false);assert.equal(report.passed,true);
assert.equal(report.slides,2);
const pending=spawnSync(process.execPath,['scripts/audit-design-delivery.mjs',file,file+'.executive-review.json'],{encoding:'utf8'});
assert.equal(pending.status,1,'A technical build must not pass pending executive review');
assert.equal(report.pptxSha256,crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex'));
// A fabricated all-pass form is a negative gate fixture, not visual acceptance.
const review=JSON.parse(fs.readFileSync(file+'.executive-review.json'));
review.status='reviewed';review.issues=[];
for(const page of review.slides) {for(const k of Object.keys(page)) if(page[k]===null)page[k]=k==='evidence'?'Synthetic negative gate fixture':'pass';page.humanPresentationCopy={...Object.fromEntries(humanCopyChecks.map(k=>[k,'pass'])),evidence:'Synthetic gate fixture'};}
for(const d of review.decisionSystems) for(const k of Object.keys(d)) if(d[k]===null)d[k]='pass';
Object.assign(review.chapter,{titleChain:'Synthetic sequence',crossDecisionEvidence:'Separate source topics'});
for(const p of review.chapter.adjacentPages)Object.assign(p,{reason:'independent-decisions',evidence:'Synthetic separate topics'});
review.slides[0].humanPresentationCopy.markdownSchema='fail';
fs.writeFileSync(file+'.executive-review.json',JSON.stringify(review));
const blocked=spawnSync(process.execPath,['scripts/audit-design-delivery.mjs',file,file+'.executive-review.json'],{encoding:'utf8'});
assert.equal(blocked.status,1);const gate=JSON.parse(blocked.stdout);assert.equal(gate.acceptance.content,'PASS');assert.equal(gate.acceptance.technical,'PASS');assert.equal(gate.acceptance.design,'NOT_ACCEPTED');assert.ok(gate.issues.some(i=>i.includes('HUMAN_PRESENTATION_COPY')));
const pkg=await inspectPptxPackage(file),slideXml=await pkg.zip.file(pkg.slides[0]).async('string');
pkg.zip.file(pkg.slides[0],slideXml.replace('<a:t>','<a:t>visualNarrative | '));fs.writeFileSync(file,await pkg.zip.generateAsync({type:'nodebuffer'}));
const leaked=spawnSync(process.execPath,['scripts/audit-design-delivery.mjs',file,file+'.executive-review.json'],{encoding:'utf8'});
assert.ok(JSON.parse(leaked.stdout).issues.includes('COPY_SCHEMA_LEAK'),'Actual PPT leakage must fail even when IR is clean');
console.log(JSON.stringify({passed:true,dir,scope:'synthetic full CLI, not prompt invariance or mentor acceptance'}));
