// A semantic extension of the existing Canvas, not a numeric layout engine.
export const compositionGrammar=['stack','split','sequence','parallel','comparison','grid','matrix','network','dominant','supporting','adjacent-to','overlay','anchor'];
export function scenePlanIssues(slide) {
  const scene=slide.scenePlan;if(!scene) return [];
  const issues=[],modules=new Map((slide.modules||[]).map(m=>[m.id,m])),regions=new Set(),assigned=[];
  if(!['vertical','horizontal'].includes(scene.flow)||!scene.regions?.length) issues.push('SCENE_STRUCTURE_INVALID');
  const forbidden=/^(x|y|w|h|width|height|fontSize|color|css|style|code|left|top)$/i;
  const walk=value=>{if(value&&typeof value==='object')for(const [k,v] of Object.entries(value)){if(forbidden.test(k))issues.push(`SCENE_COORDINATE_FORBIDDEN: ${k}`);walk(v);}};walk(scene);
  for(const r of scene.regions||[]) {
    if(!r.id||regions.has(r.id)||!compositionGrammar.includes(r.relation)||!['dominant','primary','supporting','contextual'].includes(r.role)||!['major','supporting','natural'].includes(r.weight)) issues.push(`SCENE_REGION_INVALID: ${r.id}`);
    regions.add(r.id);
    if(!r.moduleIds?.length||r.moduleIds.some(id=>!modules.has(id))) issues.push(`SCENE_MODULE_UNKNOWN: ${r.id}`);
    assigned.push(...(r.moduleIds||[]));
    if(['overlay','anchor','network'].includes(r.relation) && !r.relationshipRefs?.length) issues.push(`SCENE_RELATION_SUPPORT_REQUIRED: ${r.id}`);
  }
  if(assigned.length!==modules.size||new Set(assigned).size!==modules.size) issues.push('SCENE_MODULE_COVERAGE');
  if(!scene.readingOrder||scene.readingOrder.length!==regions.size||new Set(scene.readingOrder).size!==regions.size||scene.readingOrder.some(id=>!regions.has(id))) issues.push('SCENE_READING_ORDER');
  for(const pair of scene.adjacency||[]) if(!modules.has(pair.object)||!modules.has(pair.near)||pair.object===pair.near) issues.push('SCENE_ADJACENCY_INVALID');
  const carrier=slide.visualNarrative?.primaryCarrier||slide.designIntent?.primaryCarrier;
  if(carrier&&!scene.regions?.some(r=>['primary','dominant'].includes(r.role)&&r.moduleIds?.includes(carrier))) issues.push('SCENE_PRIMARY_CARRIER_CONFLICT');
  for(const m of modules.values()) if(m.expression&&m.preferredExpression&&m.expression.type!==m.preferredExpression.type&&!m.expression.reason) issues.push('SCENE_EXPRESSION_CONFLICT');
  return issues;
}

export function sceneMarkup(slide,render) {
  const issues=scenePlanIssues(slide);if(issues.length) throw new Error(issues.join('; '));
  const s=slide.scenePlan,modules=slide.modules;
  return `<div class="semantic-scene scene-${s.flow} scene-${slide.measuredSceneVariant || 'authored'}">${s.readingOrder.map(id=>{
    const r=s.regions.find(r=>r.id===id);
    // Unsupported topology is never quietly rendered as a generic grid.
    if(['overlay','anchor','network'].includes(r.relation)) throw new Error(`SCENE_GRAMMAR_NOT_RENDERED: ${r.relation}; use the existing explicit diagram carrier`);
    let groups=r.moduleIds.map(id=>[id]);
    const repair=slide.measuredSceneVariant==='content-first'&&['split','grid','comparison','adjacent-to'].includes(r.relation);
    if(repair) for(const pair of s.adjacency||[]) {
      const a=groups.find(g=>g.includes(pair.object)),b=groups.find(g=>g.includes(pair.near));
      if(a&&b&&a!==b) {a.push(...b);groups=groups.filter(g=>g!==b);}
    }
    const renderGroup=g=>g.map(id=>render(modules.find(m=>m.id===id),modules.findIndex(m=>m.id===id))).join('');
    const weights=groups.map(g=>g.some(id=>modules.find(m=>m.id===id)?.semanticRole==='primaryEvidence')?2:1);
    const style=repair&&groups.length>1?` style="grid-template-columns:${weights.map(w=>`minmax(0,${w}fr)`).join(' ')}"`:'';
    return `<div class="scene-region scene-${r.relation} weight-${r.weight}" data-scene-role="${r.role}"${style}>${groups.map(g=>g.length>1?`<div class="scene-cluster">${renderGroup(g)}</div>`:renderGroup(g)).join('')}</div>`;
  }).join('')}</div>`;
}

export function measuredSceneIssues(slide,layout) {
  if(!slide.scenePlan) return [];
  const issues=[],byId=new Map((layout?.modules||[]).map(m=>[m.id,m.contentBounds||m.rect]));
  for(const pair of slide.scenePlan.adjacency||[]) {
    const a=byId.get(pair.object),b=byId.get(pair.near);if(!a||!b){issues.push('SCENE_MEASURED_OBJECT_MISSING');continue;}
    const dx=Math.max(0,a.left-b.left-b.width,b.left-a.left-a.width),dy=Math.max(0,a.top-b.top-b.height,b.top-a.top-a.height);
    if(Math.hypot(dx,dy)>Math.min(layout.width,layout.height)*.12) issues.push(`SCENE_ADJACENCY_FAILED: ${pair.object}/${pair.near}`);
  }
  return issues;
}

export const sceneCss=`.semantic-scene{display:flex;gap:24px;align-items:start;min-width:0}.scene-vertical{flex-direction:column}.scene-horizontal{flex-direction:row}.scene-region{min-width:0;display:grid;gap:20px;align-items:start;width:100%}.scene-horizontal>.weight-major{flex:2}.scene-horizontal>.weight-supporting{flex:1}.scene-comparison,.scene-parallel,.scene-split,.scene-grid,.scene-matrix{grid-template-columns:repeat(auto-fit,minmax(280px,1fr))}.scene-sequence{grid-auto-flow:column;grid-auto-columns:minmax(0,1fr)}.scene-stack,.scene-dominant,.scene-supporting,.scene-adjacent-to{grid-template-columns:minmax(0,1fr)}.scene-plan>main{display:block}.compact .semantic-scene{gap:18px}.compact .scene-region{gap:14px}`;
export const sceneRepairCss=`.scene-cluster{display:grid;gap:14px;min-width:0;align-content:start}.scene-content-first .module{padding:12px}.scene-content-first .scene-cluster .narrative{background:transparent}.scene-content-first .scene-region{align-content:start}`;
