import fs from 'node:fs';
export const stages=['inputScan','sourceInventory','canonicalLedger','executionBrief','planning','claimValidation','semanticObligations','expressionRouting','scenePlanning','candidateLayout','pptCompile','render','visualQA','repair','finalAudit','platformWait'];
export function createTimingReport(file,clock=()=>Date.now()) {
  const startedAt=clock(),events=[];
  const report=()=>{
    const endedAt=clock();
    return {scope:'instrumented-build-not-end-to-end',startedAt,endedAt,total:(endedAt-startedAt)/1000,
      stages:Object.fromEntries(stages.map(stage=>[stage,events.some(e=>e.stage===stage)?events.filter(e=>e.stage===stage).reduce((s,e)=>s+e.elapsedSeconds,0):null])),
      activeWorkTime:events.filter(e=>e.stage!=='platformWait').reduce((s,e)=>s+e.elapsedSeconds,0),
      platformWaitTime:events.some(e=>e.stage==='platformWait')?events.filter(e=>e.stage==='platformWait').reduce((s,e)=>s+e.elapsedSeconds,0):null,manualApprovalTime:null,activeWorkTimeScope:'measured-stages-only',
      unmeasuredStages:stages.filter(s=>!events.some(e=>e.stage===s)),repairCount:null,events};
  };
  const write=()=>{fs.writeFileSync(file,JSON.stringify(report(),null,2));return report();};
  let active=false;
  return {report,write,async measure(stage,fn){
    if(!stages.includes(stage)||active) throw new Error('TIMING_INVALID_OR_NESTED_STAGE');
    active=true;const start=clock();let status='passed';
    try{return await fn();}catch(error){status='failed';throw error;}
    finally{const end=clock();events.push({stage,start,end,elapsedSeconds:(end-start)/1000,status});active=false;write();}
  }};
}
