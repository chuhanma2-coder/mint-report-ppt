// Planner output, not a second Planner and never a source of business facts.
export const managementIntents=['status','diagnose','explain','compare','decide','plan','recommend','reconcile'];
export const semanticRelations=['sequence','dependency','parallel','hierarchy','comparison','contribution','composition','correlation','containment','handoff','temporal-range','uncertainty','duration','entity-comparison'];

export function validateExecutionBrief(brief,ledger,slides=[]) {
  const issues=[],known=new Set(ledger.units.map(u=>u.id));
  if(!brief || !['auto','preview','off'].includes(brief.preflightMode || 'auto')) return ['EXECUTION_BRIEF_REQUIRED'];
  if(brief.canonicalLedgerHash!==ledger.sha256) issues.push('BRIEF_SOURCE_MISMATCH');
  for(const field of ['audience','communicationGoal','managementObjective']) if(!brief[field]?.trim()) issues.push(`BRIEF_FIELD_REQUIRED: ${field}`);
  if(!managementIntents.includes(brief.managementIntent)) issues.push('MANAGEMENT_INTENT_INVALID');
  if(!brief.decisionSystems?.length) issues.push('DECISION_SYSTEM_REQUIRED');
  const systems=new Map();
  for(const system of brief.decisionSystems || []) {
    if(!system.id||systems.has(system.id)||!system.managementQuestion?.trim()||!system.sourceRefs?.length||system.sourceRefs.some(r=>!known.has(r))) issues.push(`DECISION_SYSTEM_INVALID: ${system.id}`);
    systems.set(system.id,system);
  }
  for(const slide of slides.filter(s=>s.role==='content')) {
    if(!systems.has(slide.decisionUnit)) issues.push(`DECISION_SYSTEM_UNKNOWN: ${slide.id}`);
    if(slide.independentDecision && !slide.independenceReason?.trim()) issues.push(`INDEPENDENCE_UNPROVEN: ${slide.id}`);
  }
  for(const obligation of brief.semanticObligations || []) {
    if(!obligation.id||!semanticRelations.includes(obligation.type)||obligation.strength!=='semantic-hard'||!obligation.sourceRefs?.length||obligation.sourceRefs.some(id=>!known.has(id))||!obligation.reason?.trim()) issues.push(`SEMANTIC_OBLIGATION_INVALID: ${obligation.id}`);
    if(obligation.review?.status!=='reviewed'||obligation.review.canonicalLedgerHash!==ledger.sha256) issues.push(`SEMANTIC_CONTEXT_REVIEW_REQUIRED: ${obligation.id}`);
    if(obligation.type==='parallel' && (obligation.activities?.length<2||new Set(obligation.activities).size<2||!obligation.commonGoal||obligation.concurrent!==true||obligation.hasPrecedence!==false)) issues.push(`PARALLEL_CONTEXT_UNPROVEN: ${obligation.id}`);
  }
  const obligations=new Set((brief.semanticObligations||[]).map(o=>o.id));
  if(obligations.size!==(brief.semanticObligations||[]).length) issues.push('SEMANTIC_OBLIGATION_DUPLICATE');
  for(const slide of slides) for(const region of slide.scenePlan?.regions||[]) for(const ref of region.relationshipRefs||[]) {
    if(!obligations.has(ref)||!(slide.semanticObligationRefs||[]).includes(ref)) issues.push(`SCENE_GROUNDING_MISSING: ${slide.id}/${ref}`);
  }
  if(brief.requirementsReview?.status!=='reviewed'||!brief.requirementsReview.promptSha256) issues.push('PROMPT_REQUIREMENTS_REVIEW_REQUIRED');
  if(brief.semanticReview?.status!=='reviewed'||brief.semanticReview.canonicalLedgerHash!==ledger.sha256) issues.push('SEMANTIC_INVENTORY_REVIEW_REQUIRED');
  return issues;
}

export function preflightPreview(brief) {
  return {executionBrief:brief,optimizedPrompt:[`面向${brief.audience}，完成${brief.managementObjective}。`,
    ...(brief.decisionSystems||[]).map(s=>`完整回答：${s.managementQuestion}`),
    ...(brief.designRequirements||[]).map(r=>`${r.strength}: ${r.requirement}`),
    '原始来源是事实权威；保留全部业务事实与限定条件。'].join('\n'),
    hardRequirements:(brief.designRequirements||[]).filter(r=>r.strength==='hard'),
    softRequirements:(brief.designRequirements||[]).filter(r=>r.strength==='soft'),
    semanticObligations:brief.semanticObligations||[],derivedClaims:(brief.keyClaims||[]).filter(c=>c.claimType==='derived'),
    ambiguities:brief.ambiguities||[],generationAllowed:brief.preflightMode!=='preview'};
}

export function semanticObligationIssues(brief,slides) {
  const issues=[];
  for(const o of brief.semanticObligations||[]) {
    const selected=slides.filter(s=>(s.semanticObligationRefs||[]).includes(o.id));
    const modules=selected.flatMap(s=>s.modules||[]), nodes=modules.flatMap(m=>m.data?.nodes||[]),edges=modules.flatMap(m=>m.data?.edges||[]),lanes=modules.flatMap(m=>m.data?.lanes||[]);
    let expressed=false;
    if(['dependency','sequence','handoff','hierarchy','containment'].includes(o.type)) expressed=edges.some(e=>e.relationship===o.type&&e.from===o.from&&e.to===o.to);
    else if(o.type==='parallel') expressed=lanes.some(l=>l.relationship==='parallel'&&l.id===o.laneId&&l.parallelTo===o.parallelTo);
    else if(['temporal-range','uncertainty','duration'].includes(o.type)) expressed=nodes.some(n=>n.id===o.targetId&&(o.type==='duration'?n.duration===o.expectedText:n.timeRange?.start===o.start&&n.timeRange?.end===o.end));
    else expressed=modules.some(m=>m.id===o.moduleId&&m.expression?.type===o.expressionType&&m.expression?.variant===o.variant);
    if(!expressed) issues.push(`SEMANTIC_OBLIGATION_UNEXPRESSED: ${o.id}`);
  }
  return issues;
}

// Mechanical consistency plus recorded source review. No claim is automatically
// declared semantically true just because tokens or evidence IDs occur somewhere.
export function claimSupportIssues(slides,ledger) {
  const issues=[],known=new Set(ledger.units.map(u=>u.id));
  const norm=s=>String(s).normalize('NFKC').replace(/\s/g,'');
  for(const slide of slides.filter(s=>s.role==='content')) {
    if(!['source-supported','derived','recommendation'].includes(slide.claimType)) {issues.push(`CLAIM_TYPE_REQUIRED: ${slide.id}`);continue;}
    const refs=slide.claimType==='derived'?slide.derivation?.inputs:slide.claimSupportRefs;
    if(!refs?.length||refs.some(id=>!known.has(id))) issues.push(`CLAIM_SUPPORT_REQUIRED: ${slide.id}`);
    if(slide.claimType==='derived'&&(!slide.derivation.logic?.trim()||slide.derivation.result!==slide.claim)) issues.push(`DERIVED_CLAIM_UNEXPLAINED: ${slide.id}`);
    if(slide.claimType==='recommendation'&&(!slide.claimLabel||!slide.claim.includes(slide.claimLabel))) issues.push(`RECOMMENDATION_LABEL_REQUIRED: ${slide.id}`);
    const review=slide.claimReview;
    if(review?.status!=='reviewed'||review.claim!==slide.claim||review.canonicalLedgerHash!==ledger.sha256) issues.push(`CLAIM_SEMANTIC_REVIEW_REQUIRED: ${slide.id}`);
    for(const field of ['forecast','range','causality','subject','unit','condition','scope']) {
      if(!['preserved','not-applicable'].includes(review?.[field])) issues.push(`CLAIM_COMPONENT_UNREVIEWED: ${slide.id}/${field}`);
    }
    for(const binding of slide.claimBindings||[]) {
      if(!refs?.includes(binding.sourceRef)||!binding.sourceValue||!binding.displayValue||!slide.claim.includes(binding.displayValue)) issues.push(`CLAIM_BINDING_INVALID: ${slide.id}`);
      const raw=ledger.units.find(u=>u.id===binding.sourceRef)?.text||'';
      if(!binding.sourceValue||!norm(raw).includes(norm(binding.sourceValue))) issues.push(`CLAIM_BINDING_NOT_IN_SOURCE: ${slide.id}`);
      if(binding.sourceValue!==binding.displayValue&&!binding.transformation?.trim()) issues.push(`CLAIM_BINDING_CHANGED: ${slide.id}/${binding.field}`);
    }
  }
  return issues;
}
