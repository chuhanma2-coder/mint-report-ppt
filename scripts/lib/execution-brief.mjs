import crypto from 'node:crypto';
import {scenePlanIssues} from './scene-plan.mjs';
// Design and authoring share this contract, never authority over source facts.
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
  const content=slides.filter(s=>s.role==='content');
  for(let i=1;i<content.length;i++) {
    const a=content[i-1],b=content[i];
    if(a.sectionId!==b.sectionId||a.decisionUnit===b.decisionUnit) continue;
    if(brief.designBriefs?.some(d=>d.decisionIds?.includes(a.decisionUnit)&&d.decisionIds?.includes(b.decisionUnit))) continue;
    const review=brief.decisionBoundaryReviews?.find(r=>r.before===a.decisionUnit&&r.after===b.decisionUnit);
    if(review?.status!=='reviewed'||review.canonicalLedgerHash!==ledger.sha256||!review.beforeDecision?.trim()||!review.afterDecision?.trim()||review.beforeDecision===review.afterDecision||!review.whyNotSupportingEvidence?.trim()) issues.push(`DECISION_BOUNDARY_REVIEW_REQUIRED: ${a.id}/${b.id}; different topics or carriers do not justify separate decisions`);
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
    '原始来源是事实权威；保留全部业务事实与限定条件。',designBriefPreview(brief)].join('\n'),
    hardRequirements:(brief.designRequirements||[]).filter(r=>r.strength==='hard'),
    softRequirements:(brief.designRequirements||[]).filter(r=>r.strength==='soft'),
    semanticObligations:brief.semanticObligations||[],derivedClaims:(brief.keyClaims||[]).filter(c=>c.claimType==='derived'),
    ambiguities:brief.ambiguities||[],generationAllowed:brief.preflightMode!=='preview'};
}

export function designBriefHash(brief) {
  return crypto.createHash('sha256').update(JSON.stringify({source:brief.canonicalLedgerHash,prompt:brief.requirementsReview?.promptSha256,designs:brief.designBriefs})).digest('hex');
}

const genericDirector=/^(突出重点|突出核心|高级|专业|克制|清晰|合理布局|配色高级|管理层风格|让页面更好看|视觉重点)$/;
const expressionAliases={
  'timeline-window':['timeline-window','timeline','time-range','milestone'],
  funnel:['funnel','stage-bars','conversion-path'],
  'parallel-path':['parallel-path','parallel','network'],
  'entity-comparison':['entity-comparison','comparison','bar','dot-plot'],
  'natural-table':['table','decision-matrix','highlighted-table']
};
const actualExpression=m=>m?.expression?.variant||m?.expression?.type||m?.type||'';
const expressionCompatible=(planned,module)=>planned===actualExpression(module)||(expressionAliases[planned]||[]).includes(actualExpression(module));

export function directorCompositionTopology(composition) {
  return JSON.stringify((composition?.bands||[]).map(b=>({modules:b.moduleRefs,columns:b.columns.map(v=>v===Math.max(...b.columns)?'major':'minor')})));
}

export function directorPlanIssues(d,modules=[]) {
  const issues=[],plan=d?.directorPlan;
  if(!plan) return [`DIRECTOR_PLAN_REQUIRED: ${d?.id||'unknown'}`];
  const compositions=[plan.completeComposition,...(plan.alternativeCompositions||[])];
  for(const [index,composition] of compositions.entries()) {
    const bands=composition?.bands||[],bandIds=bands.map(b=>b.id),minimum=bands.reduce((sum,b)=>sum+(b.share?.[0]||0),0),maximum=bands.reduce((sum,b)=>sum+(b.share?.[1]||0),0);
    if(new Set(bandIds).size!==bandIds.length||bands.some(b=>!Array.isArray(b.share)||b.share.length!==2||b.share[0]>b.share[1])||minimum>100||maximum<80) issues.push(`DIRECTOR_COMPOSITION_SHARE: ${d.id}/${index}`);
  }
  const ids=new Set(modules.map(m=>m.id)),bindings=plan.carrierBindings||[],bindingIds=bindings.map(b=>b.moduleId),regions=new Set((plan.completeComposition?.bands||[]).map(b=>b.id));
  if([plan.fiveSecondMessage,plan.visualThesis,plan.expectedFirstFocus?.reason].some(v=>!v?.trim()||genericDirector.test(v.trim()))) issues.push(`GENERIC_DIRECTOR_PLAN: ${d.id}`);
  if(!plan.expectedFirstFocus?.objectRef||(!ids.has(plan.expectedFirstFocus.objectRef)&&!bindings.some(b=>b.moduleId===plan.expectedFirstFocus.objectRef)&&!(plan.metricEmphasis||[]).some(m=>`${m.moduleId}/${m.nodeId}/${m.field}`===plan.expectedFirstFocus.objectRef))) issues.push(`NO_VISUAL_FOCUS: ${d.id}`);
  if(new Set(bindingIds).size!==modules.length||bindingIds.length!==modules.length||bindingIds.some(id=>!ids.has(id))) issues.push(`DIRECTOR_CARRIER_COVERAGE: ${d.id}`);
  const compositionIds=(plan.completeComposition?.bands||[]).flatMap(b=>b.moduleRefs||[]);
  if(compositionIds.length!==modules.length||new Set(compositionIds).size!==modules.length||compositionIds.some(id=>!ids.has(id))) issues.push(`DIRECTOR_COMPOSITION_COVERAGE: ${d.id}`);
  for(const b of bindings) {
    const module=modules.find(m=>m.id===b.moduleId);
    if(!regions.has(b.regionId)) issues.push(`DIRECTOR_REGION_UNKNOWN: ${d.id}/${b.moduleId}`);
    if(module&&!expressionCompatible(b.expression,module)) issues.push(`EXPRESSION_BINDING_MISMATCH: ${d.id}/${b.moduleId}; planned ${b.expression}, actual ${actualExpression(module)}`);
  }
  const p0=bindings.filter(b=>b.priority==='P0'),p1=bindings.filter(b=>b.priority==='P1');
  if(!p0.length) issues.push(`NO_VISUAL_FOCUS: ${d.id}`);
  if(modules.length>1&&(!p1.length||bindings.every(b=>b.priority===bindings[0]?.priority))) issues.push(`FLAT_HIERARCHY: ${d.id}`);
  const numeric=modules.some(m=>m.type==='metric'||m.value!=null||m.data?.nodes?.some(n=>n.duration||n.primaryMetric||n.metrics?.length)||m.data?.series?.some(s=>s.values?.some(Number.isFinite)));
  if(numeric&&!(plan.metricEmphasis||[]).length&&!p0.some(b=>modules.find(m=>m.id===b.moduleId)?.type==='metric')) issues.push(`NO_VISUAL_FOCUS: ${d.id}; decision metric is not emphasized`);
  for(const b of p0) if(modules.find(m=>m.id===b.moduleId)?.type==='table'&&!/(查数|核对|明细|矩阵|reconcile|lookup)/i.test(`${d.objective} ${d.visualPurpose} ${plan.visualThesis}`)) issues.push(`TABLE_DEFAULTING: ${d.id}/${b.moduleId}`);
  const complex=modules.length>=3||(d.scenePlan?.regions||[]).some(r=>r.relationshipRefs?.length||['parallel','network','sequence'].includes(r.relation));
  if(complex&&!(plan.alternativeCompositions||[]).length) issues.push(`EQUIVALENT_ALTERNATIVES: ${d.id}; a materially different complete composition is required`);
  const signatures=compositions.map(directorCompositionTopology);
  if(new Set(signatures).size!==signatures.length) issues.push(`EQUIVALENT_ALTERNATIVES: ${d.id}`);
  for(const alt of plan.alternativeCompositions||[]) {
    const refs=alt.bands?.flatMap(b=>b.moduleRefs)||[];
    if(refs.length!==modules.length||new Set(refs).size!==modules.length||refs.some(id=>!ids.has(id))) issues.push(`DIRECTOR_ALTERNATIVE_COVERAGE: ${d.id}`);
  }
  const proof=(plan.bodyProof||[]).flatMap(p=>p.moduleRefs||[]);
  if(!p0.some(b=>proof.includes(b.moduleId))||plan.bodyProof?.some(p=>!p.reason?.trim()||p.moduleRefs.some(id=>!ids.has(id)))) issues.push(`UNPROVEN_VISUAL_THESIS: ${d.id}`);
  if(plan.whitespaceIntent?.intentional&&!plan.whitespaceIntent.reason?.trim()) issues.push(`UNINTENTIONAL_WHITESPACE: ${d.id}; intentional whitespace requires a concrete reason`);
  const contextOnly=modules.length&&modules.every(m=>['context','boundary'].includes(m.semanticRole));
  if(contextOnly&&d.compositionPolicy!=='user-fixed') issues.push(`CONTEXT_ONLY_STANDALONE: ${d.id}`);
  return issues;
}

// One brief describes a complete story BEFORE pagination, not a prompt for
// each already-fragmented slide. IDs are existing modules/decision systems.
export function designBriefIssues(brief,ledger,slides=[]) {
  if(!brief?.designBriefs?.length) return ['DESIGN_BRIEF_REQUIRED'];
  const issues=[],known=new Set(ledger.units.map(u=>u.id)),systems=new Set((brief.decisionSystems||[]).map(d=>d.id)),assigned=new Set(),ids=new Set();
  for(const d of brief.designBriefs) {
    if(!d.id||ids.has(d.id)) issues.push('DESIGN_BRIEF_ID');ids.add(d.id);
    for(const key of ['objective','fiveSecondMessage','takeaway','visualPurpose','copyGuidance','colorSemantics','avoid']) if(typeof d[key]!=='string'||!d[key].trim()) issues.push(`DESIGN_BRIEF_DECISION_MISSING: ${d.id}/${key}`);
    if(!d.sourceRefs?.length||d.sourceRefs.some(r=>!known.has(r))) issues.push(`DESIGN_BRIEF_SOURCE: ${d.id}`);
    if(!d.decisionIds?.length) issues.push(`DESIGN_BRIEF_DECISIONS: ${d.id}`);
    for(const id of d.decisionIds||[]) {if(!systems.has(id)||assigned.has(id)) issues.push(`DESIGN_BRIEF_DECISIONS: ${id}`);assigned.add(id);}
    if(!Array.isArray(d.carriers)||!d.carriers.length||d.carriers.some(c=>!c.moduleId||!c.purpose?.trim()||!['P0','P1','P2'].includes(c.priority))) issues.push(`DESIGN_BRIEF_CARRIERS: ${d.id}`);
    if(!d.scenePlan?.regions?.length) issues.push(`DESIGN_BRIEF_SCENE: ${d.id}`);
    else if(!slides.length) issues.push(...scenePlanIssues({modules:(d.carriers||[]).map(c=>({id:c.moduleId})),scenePlan:d.scenePlan}).filter(i=>!i.startsWith('SCENE_NETWORK_GRAPH_REQUIRED')));
    if(!['flexible','user-fixed'].includes(d.compositionPolicy)) issues.push(`DESIGN_BRIEF_COMPOSITION_POLICY: ${d.id}`);
    const selected=slides.filter(s=>s.role==='content'&&d.decisionIds?.includes(s.decisionUnit));
    if(slides.length&&!selected.length) issues.push(`DESIGN_BRIEF_UNUSED: ${d.id}`);
    if(selected.length) {
      if(d.takeaway!==selected[0].claim) issues.push(`DESIGN_TAKEAWAY_UNBOUND: ${d.id}; bind the reviewed leading claim, do not invent a new title during layout`);
      if(new Set(selected.map(s=>s.sectionId)).size>1) issues.push(`DESIGN_BRIEF_CROSS_SECTION: ${d.id}`);
      const modules=selected.flatMap(s=>s.modules||[]),moduleIds=modules.map(m=>m.id);
      if(new Set(moduleIds).size!==moduleIds.length||d.carriers?.length!==moduleIds.length||new Set(d.carriers?.map(c=>c.moduleId)).size!==moduleIds.length||d.carriers?.some(c=>!moduleIds.includes(c.moduleId))) issues.push(`DESIGN_BRIEF_MODULE_COVERAGE: ${d.id}`);
      for(const scene of [d.scenePlan,...(d.alternatives||[])]) issues.push(...scenePlanIssues({modules,scenePlan:scene}).map(i=>`${d.id}: ${i}`));
      for(const focus of d.directorPlan?.metricEmphasis||d.metricEmphasis||[]) {
        const m=modules.find(m=>m.id===focus.moduleId),node=m?.data?.nodes?.find(n=>n.id===focus.nodeId);
        const [kind,index]=String(focus.field).split('-');
        const value=kind==='duration'?node?.duration:kind==='metric'?node?.metrics?.[index]:kind==='secondary'?node?.secondaryMetrics?.[index]:kind==='primary'&&index==='0'?node?.primaryMetric:undefined;
        if(value==null||!['P0','P1','P2'].includes(focus.priority)) issues.push(`DESIGN_METRIC_TARGET: ${d.id}`);
      }
      issues.push(...directorPlanIssues(d,modules));
    }
    if((d.alternatives||[]).length>2) issues.push(`DESIGN_BRIEF_CANDIDATE_LIMIT: ${d.id}`);
  }
  for(const id of systems) if(!assigned.has(id)) issues.push(`DESIGN_BRIEF_DECISION_UNASSIGNED: ${id}`);
  const review=brief.designBriefReview;
  if(review?.status!=='reviewed'||review.canonicalLedgerHash!==ledger.sha256||review.designSha256!==designBriefHash(brief)) issues.push('DESIGN_BRIEF_REVIEW_REQUIRED');
  return issues;
}

export function designBriefPreview(brief) {
  return (brief.designBriefs||[]).map(d=>[
    `## ${d.id}（完整故事候选，尚未固定页数）`,
    `页面目标：${d.objective}`,`5秒核心认知：${d.fiveSecondMessage}`,`核心结论：${d.takeaway}`,`图形任务：${d.visualPurpose}`,
    `内容层级：${d.carriers.map(c=>`${c.priority} ${c.moduleId}：${c.purpose}`).join('；')}`,
    `构图：${d.scenePlan.flow}；${d.scenePlan.readingOrder.map(id=>{const r=d.scenePlan.regions.find(r=>r.id===id);return `${id} (${r.relation}, ${r.weight}) → ${r.moduleIds.join('、')}`;}).join('；')}`,
    `指标强调：${(d.directorPlan?.metricEmphasis||d.metricEmphasis||[]).map(m=>`${m.moduleId}/${m.nodeId}/${m.field}=${m.priority}`).join('；')||'无独立指标强调'}`,
    `文案：${d.copyGuidance}`,`配色语义：${d.colorSemantics}`,`避免：${d.avoid}`,
    `关系约束：${(brief.semanticObligations||[]).filter(o=>o.sourceRefs?.some(ref=>d.sourceRefs.includes(ref))).map(o=>`${o.type}：${o.reason}`).join('；')||'按来源与现有关系模型表达，不补造连接'}`,
    `构图约束：${d.compositionPolicy}；替代构图数：${d.directorPlan?.alternativeCompositions?.length||0}`,
    d.directorPlan ? `导演执行：第一焦点=${d.directorPlan.expectedFirstFocus.objectRef}；视觉论点=${d.directorPlan.visualThesis}；区域=${d.directorPlan.completeComposition.bands.map(b=>`${b.id} ${b.share.join('–')}% ${b.columns.join(':')} → ${b.moduleRefs.join('、')}`).join('；')}` : '导演执行：缺失（阻断生成）'
  ].join('\n')).join('\n\n');
}

export function applyDesignBriefs(slides,brief) {
  return slides.map(s=>{
    if(s.role!=='content') return s;
    const d=brief.designBriefs.find(d=>d.decisionIds.includes(s.decisionUnit));
    const plan=d.directorPlan,binding=id=>plan?.carrierBindings?.find(c=>c.moduleId===id),color=id=>plan?.semanticColors?.find(c=>c.targetId===id)?.role;
    return {...s,designBriefId:d.id,directorPlan:plan,directorComposition:plan?.completeComposition,directorAlternatives:plan?.alternativeCompositions||[],whitespaceIntent:plan?.whitespaceIntent,modules:s.modules.map(m=>({...m,visualPriority:binding(m.id)?.priority||d.carriers.find(c=>c.moduleId===m.id).priority,
      directorRegionId:binding(m.id)?.regionId,directorTreatment:binding(m.id)?.visualTreatment,copyBudget:binding(m.id)?.copyBudget,semanticColorRole:color(m.id),
      data:{...m.data,...(m.data?.nodes?{nodes:m.data.nodes.map(n=>({...n,metricPriorities:Object.fromEntries((plan?.metricEmphasis||d.metricEmphasis||[]).filter(e=>e.moduleId===m.id&&e.nodeId===n.id).map(e=>[e.field,e.priority]))}))}:{})}}))};
  });
}

export function designExecutionReport(ir,manifest,nativePages=null) {
  const issues=[],bindings=[];
  for(const d of ir.executionBrief?.designBriefs||[]) {
    const pages=ir.slides.filter(s=>s.designBriefId===d.id).map(s=>manifest.slides.find(p=>p.slideId===s.id)).filter(Boolean),modules=pages.flatMap(p=>p.modules||[]),plan=d.directorPlan;
    for(const b of plan?.carrierBindings||[]) {
      const actual=modules.find(m=>m.id===b.moduleId||m.id.startsWith(b.moduleId+'-group-')),texts=actual?.textObjects||[],fontSizePx=Math.max(0,...texts.map(t=>t.fontSizePx||0));
      const resolvedSlide=ir.slides.find(s=>s.designBriefId===d.id&&(s.modules||[]).some(m=>m.id===b.moduleId||m.id.startsWith(b.moduleId+'-group-'))),plannedRegion=resolvedSlide?.directorComposition?.bands?.find(band=>band.moduleRefs.some(id=>id===b.moduleId||id.startsWith(b.moduleId+'-group-')))?.id||b.regionId;
      const plannedColor=plan.semanticColors?.find(c=>c.targetId===b.moduleId)?.role||null;
      const record={designBriefId:d.id,moduleId:b.moduleId,plannedExpression:b.expression,actualExpression:actual?.semantic?.expression?.variant||actual?.kind||null,plannedRegion,actualRegion:actual?.directorRegionId||null,plannedPriority:b.priority,actualPriority:actual?.priority||null,plannedTreatment:b.visualTreatment,actualTreatment:actual?.directorTreatment||null,fontSizePx,plannedColorRole:plannedColor,actualColorRole:actual?.semanticColorRole||null,status:'PASS'};
      if(!actual) {record.status='FAIL';issues.push(`DESIGN_CARRIER_MISSING: ${d.id}/${b.moduleId}`);}
      if(actual&&actual.priority!==b.priority) {record.status='FAIL';issues.push(`DESIGN_CARRIER_PRIORITY_CHANGED: ${d.id}/${b.moduleId}`);}
      if(actual&&actual.directorRegionId!==plannedRegion) {record.status='FAIL';issues.push(`DESIGN_REGION_UNIMPLEMENTED: ${d.id}/${b.moduleId}`);}
      if(actual&&actual.directorTreatment!==b.visualTreatment) {record.status='FAIL';issues.push(`DESIGN_TREATMENT_UNIMPLEMENTED: ${d.id}/${b.moduleId}`);}
      if(actual&&plannedColor&&actual.semanticColorRole!==plannedColor) {record.status='FAIL';issues.push(`DESIGN_COLOR_ROLE_UNIMPLEMENTED: ${d.id}/${b.moduleId}`);}
      bindings.push(record);
    }
    if(plan&&!plan.whitespaceIntent.intentional&&pages.some(p=>p.whitespaceReview===true)) issues.push(`UNINTENTIONAL_WHITESPACE: ${d.id}`);
    if(plan) {
      const p0=bindings.filter(b=>b.designBriefId===d.id&&b.plannedPriority==='P0'),p1=bindings.filter(b=>b.designBriefId===d.id&&b.plannedPriority==='P1');
      if(p0.length&&p1.length&&pages.some(p=>Object.values(p.directorHierarchySignals||{}).filter(Boolean).length<2)) issues.push(`FLAT_HIERARCHY: ${d.id}; P0 must dominate P1 through at least two visual signals`);
    }
  }
  return {passed:!issues.length,issues,bindings};
}

export function designExecutionIssues(ir,manifest,nativePages=null) {
  const issues=[...designExecutionReport(ir,manifest,nativePages).issues];
  for(const d of ir.executionBrief?.designBriefs||[]) {
    const slides=ir.slides.filter(s=>s.designBriefId===d.id),pages=slides.map(s=>manifest.slides.find(p=>p.slideId===s.id)).filter(Boolean);
    const modules=pages.flatMap(p=>p.modules||[]);
    for(const c of d.carriers) if(!modules.some(m=>m.id===c.moduleId||m.id.startsWith(c.moduleId+'-group-'))) issues.push(`DESIGN_CARRIER_MISSING: ${d.id}/${c.moduleId}`);
    for(const c of d.carriers) if(modules.some(m=>(m.id===c.moduleId||m.id.startsWith(c.moduleId+'-group-'))&&m.priority!==c.priority)) issues.push(`DESIGN_CARRIER_PRIORITY_CHANGED: ${d.id}/${c.moduleId}`);
    const leaves=modules.flatMap(m=>m.textObjects||[]);
    for(const e of d.directorPlan?.metricEmphasis||d.metricEmphasis||[]) {
      const binding=`${e.moduleId}/${e.nodeId}/${e.field}`,texts=leaves.filter(t=>t.metricBindingId===binding&&t.metricPart==='value');
      if(!texts.length||texts.some(t=>t.metricPriority!==e.priority)) issues.push(`DESIGN_METRIC_UNIMPLEMENTED: ${binding}`);
      if(nativePages) {
        const native=nativePages.flatMap(p=>p.objects).filter(o=>o.name.includes('|design-target:'+encodeURIComponent(binding)+'|metric-part:value'));
        if(!native.length) issues.push(`DESIGN_NATIVE_METRIC_MISSING: ${binding}`);
        else if(native.some(o=>!o.fontSizesPx?.length||o.fontSizesPx.some(size=>!texts.some(t=>Math.abs(t.fontSizePx-size)<.1)))) issues.push(`DESIGN_NATIVE_METRIC_SIZE_CHANGED: ${binding}`);
      }
      if(e.priority==='P0') {
        const others=leaves.filter(t=>t.metricBindingId&&t.metricPriority!=='P0'&&t.metricPart==='value');
        if(texts.length&&others.some(t=>t.fontSizePx>=Math.max(...texts.map(t=>t.fontSizePx)))) issues.push(`DESIGN_METRIC_HIERARCHY_FLAT: ${binding}`);
      }
    }
  }
  return issues;
}

// Reject a successful continuation or an unrelated attempt cited as proof that
// the complete story failed. Human wording cannot override measured evidence.
export function designAcceptanceIssues(review,ir,attempts) {
  const issues=[];
  for(const d of ir.executionBrief?.designBriefs||[]) {
    const r=review.designBriefs?.find(r=>r.id===d.id);
    if(r?.status!=='accepted'||['firstFocusObserved','visualPurposeObserved','compositionObserved'].some(k=>!r[k]?.trim())) issues.push(`DESIGN_BRIEF_NOT_ACCEPTED: ${d.id}`);
  }
  for(const p of review.chapter?.adjacentPages||[]) {
    const before=ir.slides.find(s=>s.id===p.before),after=ir.slides.find(s=>s.id===p.after);
    if(!before||!after) continue;
    if(before.designBriefId&&before.designBriefId===after.designBriefId&&p.reason==='independent-decisions') issues.push(`DESIGN_STORY_SPLIT_AS_INDEPENDENT: ${p.before}/${p.after}`);
    if(p.reason!=='measured-capacity') continue;
    const cited=(p.capacityAttemptIds||[]).map(id=>attempts.find(a=>a.attemptId===id));
    const needed=new Set([...before.modules,...after.modules].map(m=>m.id.replace(/-group-\d+$/,'')));
    if(!cited.length||cited.some(a=>!a||a.phase!=='complete'||a.passed||!a.measured||a.equivalentTo||![...needed].every(id=>a.candidate.modules.some(m=>m.id===id)))) issues.push(`CAPACITY_CITATION_INVALID: ${p.before}/${p.after}`);
    const full=attempts.filter(a=>a.phase==='complete'&&a.candidate?.designBriefId===before.designBriefId&&before.designBriefId);
    if(full.some(a=>a.passed)) issues.push(`DESIGN_READABLE_MERGE_IGNORED: ${p.before}/${p.after}`);
  }
  return issues;
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
