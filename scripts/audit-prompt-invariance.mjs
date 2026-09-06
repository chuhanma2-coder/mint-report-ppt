#!/usr/bin/env node
// Evaluation manifest only: never invent six Planner calls from one IR replay.
import fs from 'node:fs';
const input=JSON.parse(fs.readFileSync(process.argv[2],'utf8')),runs=input.runs || [],issues=[];
for(const promptClass of ['ordinary','optimized','implicit'])if(runs.filter(r=>r.promptClass===promptClass).length<2)issues.push(`MISSING_INDEPENDENT_RUNS: ${promptClass}`);
for(const key of ['sourceHash','canonicalLedgerHash','canonicalFactsTotal','taskCardHash','runtimeFingerprint','model','renderSize','benchmarkTrack'])if(new Set(runs.map(r=>JSON.stringify(r[key]))).size!==1||runs.some(r=>!r[key]))issues.push(`UNFAIR_INPUT: ${key}`);
if(new Set(runs.map(r=>r.plannerRunId)).size!==runs.length||runs.some(r=>!r.plannerRunId))issues.push('INDEPENDENT_PLANNER_ID_REQUIRED');
for(const r of runs) {
  if(r.reusedArtifact!==false||!r.prompt||!r.outputHash||!(r.durationSeconds>0))issues.push(`RUN_PROVENANCE_MISSING: ${r.plannerRunId}`);
  if(r.freshAudit?.status!=='PROVENANCE_RECORDED'||!r.freshAuditEvidence) issues.push(`FRESH_RUN_INVALID: ${r.plannerRunId}`);
  for(const gate of ['content','understanding','expression','designIntent','visual','artifact'])if(r[gate]!=='pass')issues.push(`RUN_GATE_PENDING_OR_FAILED: ${r.plannerRunId}/${gate}`);
  if(r.hardRequirementsTotal>0&&r.hardRequirementRecall!==1)issues.push(`REQUIREMENT_RECALL: ${r.plannerRunId}`);
  for(const key of ['decisionSystems','semanticObligations','claimTypes','scenePlans','repairCount','stageTiming','pageCount']) if(r[key]==null) issues.push(`RUN_DIAGNOSTIC_MISSING: ${r.plannerRunId}/${key}`);
}
console.log(JSON.stringify({passed:!issues.length,issues,runs:runs.length,scope:'manifest provenance and gates; inspect actual private run evidence, not self-reported scores alone'},null,2));
if(issues.length)process.exitCode=1;
