// Semantic design contracts. This module never generates facts or coordinates.
export const visualPrimitives = ['takeaway-band', 'milestone', 'time-range', 'dependency-edge', 'parallel-lane', 'status-chip', 'metric-badge', 'entity-profile', 'risk-strip', 'decision-strip'];
export const narrativePatterns = ['critical-path-with-parallel-options', 'time-window-dependency', 'primary-with-parallel-options', 'entity-comparison'];

export function narrativeSupport(slide) {
  const modules = slide.modules || [];
  const nodes = modules.flatMap(m => m.data?.nodes || []), edges = modules.flatMap(m => m.data?.edges || []);
  const lanes = modules.flatMap(m => m.data?.lanes || []);
  const ids = new Set(nodes.map(n => n.id));
  const issues = [];
  if (ids.size !== nodes.length) issues.push('NARRATIVE_NODE_ID: node IDs must be unique within a page');
  for (const edge of edges) if (!ids.has(edge.from) || !ids.has(edge.to)) issues.push('NARRATIVE_EDGE_ENDPOINT: missing endpoint');
  for (const node of nodes) if (node.timeRange && (!node.timeRange.start || !node.timeRange.end || !node.timeRange.label)) issues.push('TIME_RANGE_BOUNDS: both source bounds and the visible range label are required');
  for (const lane of lanes) if (!lane.id || !lane.label || !lane.nodeIds?.length || lane.nodeIds.some(id => !ids.has(id))) issues.push('PARALLEL_LANE_MEMBERS: explicit grounded members required');
  const window = nodes.some(n => n.timeRange?.start && n.timeRange?.end && n.timeRange?.label);
  const dependency = edges.some(e => e.relationship === 'dependency');
  const parallel = lanes.some(l => l.relationship === 'parallel' && lanes.some(other => other.id === l.parallelTo));
  const entities = nodes.filter(n => n.entity === true).length >= 2;
  const pattern = slide.visualNarrative?.pattern;
  if (pattern && pattern !== 'entity-comparison' && edges.some(e=>e.relationship!=='dependency')) issues.push('NARRATIVE_EDGE_RELATION: path edges must be explicitly grounded dependencies; parallel relationships belong to lanes');
  const supported = {
    'time-window-dependency': window && dependency,
    'primary-with-parallel-options': parallel,
    'critical-path-with-parallel-options': window && dependency && parallel,
    'entity-comparison': entities
  };
  if (pattern && (!narrativePatterns.includes(pattern) || !supported[pattern])) issues.push(`NARRATIVE_UNSUPPORTED: ${pattern}`);
  const moduleIds = new Set(modules.map(m => m.id));
  const order = slide.visualNarrative?.readingOrder || [];
  if (order.length && (new Set(order).size !== order.length || order.some(id => !moduleIds.has(id)))) issues.push('READING_ORDER_ID: use unique visible module IDs');
  return { valid: !!pattern && issues.length === 0, pattern, window, dependency, parallel, entities, issues };
}

export function validateDesignLedger(ir) {
  const issues = [], ids = new Set(), slides = new Map((ir.slides || []).flatMap(s => [s.id,...(s.originSlideIds || [])].map(id=>[id,s])));
  for(const slide of ir.slides || []) {
    for(const [field,allowed] of [['designIntent',['dominantMessage','relationshipTypes','primaryCarrier','focusObjects','focusMetrics']],['visualNarrative',['pattern','primaryCarrier','readingOrder']]]) {
      const value=slide[field];if(value==null)continue;
      if(typeof value!=='object'||Array.isArray(value)||Object.keys(value).some(key=>!allowed.includes(key))) issues.push(`DESIGN_INTENT_SCHEMA: ${slide.id}/${field}; semantic fields only`);
    }
    for(const field of ['focusObjects','focusMetrics','relationshipTypes']) if(slide.designIntent?.[field]!=null && (!Array.isArray(slide.designIntent[field])||slide.designIntent[field].some(v=>typeof v!=='string'))) issues.push(`DESIGN_INTENT_LIST: ${slide.id}/${field}`);
    if(slide.visualNarrative && (!Array.isArray(slide.visualNarrative.readingOrder)||typeof slide.visualNarrative.pattern!=='string')) issues.push(`VISUAL_NARRATIVE_SCHEMA: ${slide.id}`);
  }
  for (const r of ir.designRequirements || []) {
    if (!r.id || ids.has(r.id)) issues.push('DESIGN_REQUIREMENT_ID: missing or duplicate ID');
    ids.add(r.id);
    if (!['hard', 'soft'].includes(r.strength) || !['slide', 'report'].includes(r.scope) || !r.requirement?.trim()) issues.push(`DESIGN_REQUIREMENT_INVALID: ${r.id}`);
    if (r.scope === 'slide' && !slides.has(r.slideId)) issues.push(`DESIGN_REQUIREMENT_TARGET: ${r.id}`);
    if (r.strength === 'hard' && !['single-page','temporal-window','dependency','parallel-options','visible-facts','image','focus','no-split-table'].includes(r.type)) issues.push(`DESIGN_REQUIREMENT_UNSUPPORTED: ${r.id}; do not silently downgrade a hard requirement`);
  }
  for (const s of ir.slides || []) for (const id of s.designRequirementRefs || []) if (!ids.has(id)) issues.push(`DESIGN_REQUIREMENT_REF: ${s.id}/${id}`);
  return issues;
}

// The gate consumes measured leaves, not a claimed "implemented" flag. Final
// native-object verification is performed again after export by the build.
export function auditDesignRequirements(ir, manifest, { nativePages = null } = {}) {
  const results = [], issues = validateDesignLedger(ir);
  for (const r of ir.designRequirements || []) {
    const original = r.scope === 'report' ? ir.slides : ir.slides.filter(s => s.id === r.slideId || s.originSlideIds?.includes(r.slideId));
    const pages = original.map(s => manifest.slides.find(p => p.slideId === s.id)).filter(Boolean);
    const modules = pages.flatMap(p => p.modules || []);
    const primitives = modules.flatMap(m => m.primitives || []);
    const target = primitives.filter(p => !r.targetId || p.nodeId === r.targetId || p.edgeId === r.targetId || p.laneId === r.targetId);
    let passed = pages.length > 0;
    if (r.strength === 'soft') { results.push({id:r.id,status:'visual-review-required',ownerLayer:'canvas'}); continue; }
    if (r.type === 'single-page') passed &&= pages.length === 1;
    else if (r.type === 'temporal-window') passed &&= target.some(p => p.primitive === 'time-range' && p.text.includes(r.expectedText || '\u0000'));
    else if (r.type === 'dependency') passed &&= target.some(p => p.primitive === 'dependency-edge' && (!r.from || p.from === r.from) && (!r.to || p.to === r.to));
    else if (r.type === 'parallel-options') passed &&= target.some(p => p.primitive === 'parallel-lane' && p.parallelTo);
    else if (r.type === 'focus') passed &&= modules.some(m => (!r.targetId || m.id===r.targetId) && ['P0','P1'].includes(m.priority) && (m.text || '').includes(r.expectedText || '\u0000') && (m.textObjects || []).some(t=>t.text?.includes(r.expectedText || '\u0000') && (t.bold || t.fontSizePx>=28)));
    else if (r.type === 'image') passed &&= modules.some(m => m.id === r.targetId && m.image?.naturalWidth > 0);
    else if (r.type === 'no-split-table') passed &&= modules.filter(m => m.id === r.targetId && m.table).length === 1;
    else if (r.type === 'visible-facts') passed &&= !!r.expectedText && modules.some(m => m.text.replace(/\s/g,'').includes(r.expectedText.replace(/\s/g,'')));
    else passed = false;
    if (passed && nativePages && ['temporal-window','dependency','parallel-options'].includes(r.type)) {
      const kind = {'temporal-window':'time-range',dependency:'dependency-edge','parallel-options':'parallel-lane'}[r.type];
      passed = pages.some(page=>page.modules.some(m=>(m.primitives || []).some(p=>target.includes(p) && p.primitive===kind && nativePages.find(n=>n.slideId===page.slideId)?.objects.some(o=>o.name===`mint|primitive:${kind}|binding:${encodeURIComponent(p.bindingId)}${kind==='dependency-edge'?'|rule':''}` && (kind!=='dependency-edge' || (o.kind==='connector' && o.forwardArrow && o.connected && o.width>0))))));
    }
    results.push({id:r.id,status:passed?'PASS':'FAIL',stage:nativePages?'native':'canvas'});
    if (!passed) issues.push(`DESIGN_REQUIREMENT_UNMET: ${r.id} ${r.requirement}`);
  }
  const hard = results.filter(r => r.status !== 'visual-review-required');
  return {passed:issues.length===0,issues,results,hardRecall:hard.length ? hard.filter(r=>r.status==='PASS').length/hard.length : null,requirementsStatus:hard.length?'evaluated':'no-hard-requirements',visualReviewRequired:true};
}

export function executiveReviewIssues(review, slideIds, decisionSystems=null) {
  const issues = [], dimensions = ['firstFocus','bodyProvesTitle','relationships','space','carrierSuitability','hierarchy','readingOrder',...(decisionSystems?['relationshipFidelity','semanticProximity']:[])];
  if (!review || review.status !== 'reviewed') return ['EXECUTIVE_REVIEW_REQUIRED'];
  for (const id of slideIds) {
    const page = review.slides?.find(s => s.slideId === id);
    if (!page || dimensions.some(key => !['pass','fail'].includes(page[key]))) issues.push(`EXECUTIVE_REVIEW_INCOMPLETE: ${id}`);
    else if (dimensions.some(key => page[key] === 'fail')) issues.push(`EXECUTIVE_REVIEW_FAILED: ${id}`);
  }
  for (const issue of review.issues || []) if (!['planner','router','canvas','renderer','publisher'].includes(issue.ownerLayer)) issues.push('QA_OWNER_LAYER_INVALID');
  if ((review.issues || []).some(issue=>issue.status!=='resolved')) issues.push('EXECUTIVE_REVIEW_UNRESOLVED');
  if(decisionSystems) for(const system of decisionSystems) {
    const chapter=review.decisionSystems?.find(d=>d.id===system.id);
    const checks=['storyConcentration','riskResponseProximity','supportingEvidenceRole','mergeNecessity','titleChain','paginationJustification','pathEvidenceBalance'];
    if(!chapter||checks.some(k=>chapter[k]!=='pass')||!chapter.evidence?.trim()) issues.push(`DECISION_SYSTEM_REVIEW_REQUIRED: ${system.id}`);
  }
  return issues;
}

// Read actual OOXML object types per page; a named background is not an arrow.
export function nativeDesignPages(xmlPages, slideIds) {
  return xmlPages.map((xml,i)=>({slideId:slideIds[i],objects:[...xml.matchAll(/<p:(sp|cxnSp)\b[^>]*>[\s\S]*?<\/p:\1>/g)].map(match=>{
    const body=match[0],name=(body.match(/<p:cNvPr\b[^>]*name="([^"]+)"/)?.[1] || '').split('|role:')[0];
    return {name,kind:match[1]==='cxnSp'?'connector':'shape',forwardArrow:/<a:tailEnd\b[^>]*type="triangle"/.test(body)&&!/<a:xfrm\b[^>]*flipH="1"/.test(body),connected:/<a:stCxn\b/.test(body)&&/<a:endCxn\b/.test(body),width:Number(body.match(/<a:ext\b[^>]*cx="(\d+)"/)?.[1] || 0)};
  })}));
}
