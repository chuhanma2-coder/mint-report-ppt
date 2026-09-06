import crypto from 'node:crypto';

export const humanCopyChecks=['markdownSchema','pipeDensity','fieldLeakage','instructionLeakage','languageMix','labelStacking','sourceColloquialism','sentenceLength','duplicateMetrics','hierarchy'];
const copyKeys=['title','text','value','unit','nodes','edges','lanes','dataMode'];
const nodeKeys=['id','name','headline','primaryMetrics','summary','secondaryMetrics','status','condition','duration','timeRangeLabel'];
const metric=value=>typeof value==='object'?[value.scope,value.label,value.value,value.unit].filter(v=>v!==undefined&&v!=='').join(' '):String(value);
const strings=value=>typeof value==='string'?[value]:Array.isArray(value)?value.flatMap(strings):value&&typeof value==='object'?Object.values(value).flatMap(strings):[];
export function presentationCopyHash(ir) {
  return crypto.createHash('sha256').update(JSON.stringify({policy:ir.executionBrief?.presentationCopyPolicy||{},slides:ir.slides.map(s=>({id:s.id,claim:s.claim,modules:s.modules.map(m=>({id:m.id,displayCopy:m.displayCopy}))}))})).digest('hex');
}

// Source and instruction fields are never a fallback for authored display copy.
// The projection retains data values/topology and uses the existing renderers.
export function projectPresentationCopy(ir) {
  if(ir.presentationCopyVersion!==1) return ir; // Legacy component tests; production explicitly requires v1.
  return {...ir,slides:ir.slides.map(s=>({...s,modules:s.modules.map(m=>{
    const c=m.displayCopy;if(!c||typeof c!=='object'||Array.isArray(c)) throw new Error(`DISPLAY_COPY_REQUIRED: ${s.id}/${m.id}`);
    if(Object.keys(c).some(k=>!copyKeys.includes(k))) throw new Error(`DISPLAY_COPY_FIELD_UNKNOWN: ${m.id}`);
    const data=structuredClone(m.data||{}),out={...m,title:c.title||'',text:c.text||'',value:c.value,unit:c.unit||'',data};
    if(data.nodes) {
      if(!Array.isArray(c.nodes)||c.nodes.length!==data.nodes.length||new Set(c.nodes.map(n=>n.id)).size!==data.nodes.length) throw new Error(`DISPLAY_NODE_COVERAGE: ${m.id}`);
      data.nodes=data.nodes.map(n=>{
        const p=c.nodes.find(p=>p.id===n.id);
        if(!p?.name||Object.keys(p).some(k=>!nodeKeys.includes(k))) throw new Error(`DISPLAY_NODE_INVALID: ${m.id}/${n.id}`);
        if(n.entity&&(p.primaryMetrics||[]).length>2) throw new Error(`PROFILE_PRIMARY_METRIC_LIMIT: ${n.id}`);
        if(n.timeRange&&!p.timeRangeLabel) throw new Error(`DISPLAY_TIME_RANGE_REQUIRED: ${n.id}`);
        const cleaned={...n};
        for(const key of ['label','name','text','identity','headlineTag','primaryMetric','secondaryMetrics','characteristics','keywords','scope','caveat','status','condition','duration','metrics']) delete cleaned[key];
        return {...cleaned,label:p.name,identity:p.headline,text:p.summary,metrics:(p.primaryMetrics||[]).map(metric),secondaryMetrics:p.secondaryMetrics||[],status:p.status,condition:p.condition,duration:p.duration,...(n.timeRange?{timeRange:{...n.timeRange,label:p.timeRangeLabel}}:{})};
      });
      for(const field of ['edges','lanes']) if(data[field]?.length) {
        if(!Array.isArray(c[field])||c[field].length!==data[field].length||new Set(c[field].map(e=>e.id)).size!==data[field].length) throw new Error(`DISPLAY_RELATION_COVERAGE: ${m.id}/${field}`);
        data[field]=data[field].map(e=>{const p=c[field].find(p=>p.id===e.id);if(!p||Object.keys(p).some(k=>!['id','label','condition'].includes(k))) throw new Error(`DISPLAY_RELATION_INVALID: ${m.id}/${e.id}`);return {...e,label:p.label||'',...(field==='edges'?{condition:p.condition||''}:{})};});
      }
    } else if(['table','chart'].includes(m.expression?.type||m.type)||data.series||data.rows) {
      if(c.dataMode!=='bound-values') throw new Error(`DISPLAY_DATA_APPROVAL_REQUIRED: ${m.id}; review labels and cells without changing source values`);
    }
    return out;
  })}))};
}

export function copyTextIssues(text,policy={}) {
  const issues=[];
  if(/[|｜]/.test(text)) issues.push('COPY_PIPE_METADATA');
  if(/```|\*\*|^\s*#{1,6}\s|\[.+?\]\(.+?\)/m.test(text)) issues.push('COPY_MARKDOWN');
  if(/\b(?:semanticRole|evidenceRefs|displayCopy|presentationCopy|primaryMetric|visualNarrative|managementQuestion|sourceUnitId|layoutFamily)\b/.test(text)) issues.push('COPY_SCHEMA_LEAK');
  if(/视觉关键词|视觉设计要求|页面结构要求|\b(?:Visual Keywords|Design Requirements|Semantic Intent)\b/i.test(text)) issues.push('COPY_INSTRUCTION_LEAK');
  for(const hint of policy.instructionOnlyPhrases||[]) if(hint&&text.toLowerCase().includes(hint.toLowerCase())) issues.push(`COPY_DESIGN_HINT_LEAK: ${hint}`);
  return [...new Set(issues)];
}

export function validatePresentationCopy(ir,canonical) {
  const issues=[];
  if(ir.presentationCopyVersion!==1) return ['PRESENTATION_COPY_CONTRACT_REQUIRED'];
  const review=ir.executionBrief?.presentationCopyReview;
  if(review?.status!=='reviewed'||review.canonicalLedgerHash!==canonical.sha256||review.copySha256!==presentationCopyHash(ir)) issues.push('PRESENTATION_COPY_REVIEW_REQUIRED');
  try {projectPresentationCopy(ir);} catch(e) {issues.push(e.message);}
  const policy=ir.executionBrief?.presentationCopyPolicy||{};
  for(const s of ir.slides) {
    issues.push(...copyTextIssues(s.claim,policy).map(i=>`${s.id}: ${i}`));
    for(const m of s.modules) {
      // IDs and the bound-values selector are internal, not printed copy.
      const c=m.displayCopy||{},{dataMode,nodes,edges,lanes,...body}=c;
      const texts=[...strings(body),...(nodes||[]).flatMap(({id,...n})=>strings(n)),...(edges||[]).flatMap(({id,...e})=>strings(e)),...(lanes||[]).flatMap(({id,...l})=>strings(l))];
      for(const text of texts) issues.push(...copyTextIssues(text,policy).map(i=>`${s.id}/${m.id}: ${i}`));
    }
  }
  return [...new Set(issues)];
}

export function humanCopyReviewIssues(page) {
  const r=page?.humanPresentationCopy;
  return !r||humanCopyChecks.some(k=>r[k]!=='pass')||!r.evidence?.trim()?['HUMAN_PRESENTATION_COPY_NOT_ACCEPTED']:[];
}
