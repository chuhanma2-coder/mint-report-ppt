// A semantic extension of the existing Canvas, not a numeric layout engine.
export const compositionGrammar=['stack','split','sequence','parallel','comparison','grid','matrix','network','dominant','supporting','adjacent-to','overlay','anchor'];

// Ordering only: all dimensions are resolved by the existing browser Canvas.
// Breaking a cycle for placement does not remove the return edge from the data.
export function networkOrder(nodes,edges) {
  const ids=nodes.map(n=>String(n.id)),known=new Set(ids),remaining=new Set(ids),ordered=[];
  if(known.size!==ids.length||ids.some(id=>!id||id==='undefined')) throw new Error('NETWORK_NODE_ID_INVALID');
  if(edges.some(e=>!known.has(String(e.from))||!known.has(String(e.to)))) throw new Error('DIAGRAM_ENDPOINT_MISSING');
  while(remaining.size) {
    const next=ids.find(id=>remaining.has(id)&&!edges.some(e=>String(e.to)===id&&String(e.from)!==id&&remaining.has(String(e.from)))) || ids.find(id=>remaining.has(id));
    ordered.push(next);remaining.delete(next);
  }
  const levels=new Map();
  for(const id of ordered) levels.set(id,Math.max(0,...edges.filter(e=>String(e.to)===id&&levels.has(String(e.from))).map(e=>levels.get(String(e.from))+1)));
  return ordered.map(id=>({id,level:levels.get(id)}));
}

// Executed inside the Canvas after fonts load. Shared nodes occur once. The
// external connector lanes preserve branches, cycles and self-return edges.
export function layoutNetworks() {
  for(const host of document.querySelectorAll('.diagram-network')) {
    const bounds=host.getBoundingClientRect(),nodes=new Map([...host.querySelectorAll('.diagram-node')].map(n=>[n.dataset.nodeId,n.getBoundingClientRect()]));
    let lane=host.querySelector('.network-nodes').getBoundingClientRect().height+24;
    for(const [index,e] of JSON.parse(host.dataset.networkEdges).entries()) {
      const a=nodes.get(String(e.from)),b=nodes.get(String(e.to));
      const edge=document.createElement('div');edge.className='network-edge';
      edge.dataset.edgeId=e.id || 'edge-'+index;edge.dataset.from=e.from;edge.dataset.to=e.to;
      const label=document.createElement('div');label.className='edge-label';label.dataset.mintObject='text';
      label.textContent=[e.label,e.condition].filter(Boolean).join('\n');edge.appendChild(label);host.appendChild(edge);
      const forward=b.left>a.left,ax=(forward?a.right:a.left)-bounds.left,bx=(forward?b.left:b.right)-bounds.left;
      const ay=a.top+a.height/2-bounds.top,by=b.top+b.height/2-bounds.top,sign=forward?1:-1;
      const start= ax+sign*(16+index*5),end=bx-sign*(16+index*5);
      const direct=forward&&Math.abs(ay-by)<2&&![...nodes.values()].some(n=>n!==a&&n!==b&&n.left>a.right&&n.right<b.left&&n.top< a.top+a.height/2&&n.bottom>a.top+a.height/2);
      label.style.width=Math.max(120,Math.abs(end-start))+'px';label.style.left=(start+end)/2-Math.max(120,Math.abs(end-start))/2+'px';label.style.top=lane+'px';
      const y=lane+label.getBoundingClientRect().height+8;
      if(direct) label.style.top=ay-label.getBoundingClientRect().height-8+'px';
      const points=direct?[[ax,ay],[bx,by]]:[[ax,ay],[start,ay],[start,y],[end,y],[end,by],[bx,by]];
      edge.dataset.points=JSON.stringify(points);
      for(let i=1;i<points.length;i++) {
        const [x0,y0]=points[i-1],[x1,y1]=points[i];if(x0===x1&&y0===y1) continue;
        const line=document.createElement('div');line.className='network-segment'+(i===points.length-1?' last':'');
        line.style.left=x0+'px';line.style.top=y0+'px';line.style.width=Math.hypot(x1-x0,y1-y0)+'px';line.style.transform='rotate('+Math.atan2(y1-y0,x1-x0)+'rad)';edge.appendChild(line);
      }
      if(!direct) lane=y+20;
    }
    const reserve=Math.max(0,...[...host.querySelectorAll('.edge-label')].map(label=>-parseFloat(label.style.top)));
    if(reserve) {
      host.style.paddingTop=reserve+'px';
      for(const edge of host.querySelectorAll('.network-edge')) {
        edge.dataset.points=JSON.stringify(JSON.parse(edge.dataset.points).map(([x,y])=>[x,y+reserve]));
        for(const part of edge.children) part.style.top=parseFloat(part.style.top)+reserve+'px';
      }
    }
    host.style.height=lane+reserve+'px';
  }
}
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
    if(r.relation==='network'&&r.moduleIds?.some(id=>{const m=modules.get(id);return !m?.data?.nodes?.length||!m.data.edges?.length||(m.expression?.type||m.type)!=='diagram';})) issues.push(`SCENE_NETWORK_GRAPH_REQUIRED: ${r.id}`);
    if(['anchor','overlay'].includes(r.relation)&&(!r.moduleIds?.includes(r.targetId)||r.moduleIds.length<2||!['before','after','start','end'].includes(r.side))) issues.push(`SCENE_ANCHOR_TARGET_REQUIRED: ${r.id}`);
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
    if(['anchor','overlay'].includes(r.relation)) {
      const renderId=id=>render(modules.find(m=>m.id===id),modules.findIndex(m=>m.id===id));
      return `<div class="scene-region scene-${r.relation} side-${r.side} weight-${r.weight}" data-scene-target="${r.targetId}" data-scene-role="${r.role}"><div class="scene-target">${renderId(r.targetId)}</div><aside class="scene-annotation">${r.moduleIds.filter(id=>id!==r.targetId).map(renderId).join('')}</aside></div>`;
    }
    let groups=r.moduleIds.map(id=>[id]);
    const repair=slide.measuredSceneVariant==='content-first'&&['split','grid','comparison','adjacent-to'].includes(r.relation);
    if(repair) for(const pair of s.adjacency||[]) {
      const a=groups.find(g=>g.includes(pair.object)),b=groups.find(g=>g.includes(pair.near));
      if(a&&b&&a!==b) {a.push(...b);groups=groups.filter(g=>g!==b);}
    }
    const renderGroup=g=>g.map(id=>{const m=modules.find(m=>m.id===id);return render(r.relation==='network'?{...m,measuredTopology:'network'}:m,modules.findIndex(m=>m.id===id));}).join('');
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
  for(const r of slide.scenePlan.regions) {
    if(r.relation==='network') for(const id of r.moduleIds) {
      const model=slide.modules.find(m=>m.id===id)?.data,graph=layout?.modules?.find(m=>m.id===id)?.network;
      if(!graph||graph.nodes.length!==model.nodes.length||new Set(graph.nodes.map(n=>n.nodeId)).size!==model.nodes.length||graph.edges.length!==model.edges.length) {issues.push(`SCENE_NETWORK_COVERAGE: ${id}`);continue;}
      model.edges.forEach((e,i)=>{const actual=graph.edges[i];if(actual.from!==String(e.from)||actual.to!==String(e.to)||!actual.points?.length) issues.push(`SCENE_NETWORK_EDGE_MISMATCH: ${id}/${i}`);});
    }
    if(['anchor','overlay'].includes(r.relation)) {
      const a=layout?.attachments?.find(a=>a.targetId===r.targetId&&a.relation===r.relation),target=byId.get(r.targetId);
      if(!a||!target){issues.push(`SCENE_ATTACHMENT_MISSING: ${r.id}`);continue;}
      const n=a.annotation;
      if(r.relation==='anchor') {
        const valid=r.side==='start'?n.left+n.width<=target.left+2:r.side==='end'?n.left>=target.left+target.width-2:r.side==='before'?n.top+n.height<=target.top+2:n.top>=target.top+target.height-2;
        if(!valid) issues.push(`SCENE_ANCHOR_SIDE_MISMATCH: ${r.id}`);
        const dx=Math.max(0,target.left-n.left-n.width,n.left-target.left-target.width),dy=Math.max(0,target.top-n.top-n.height,n.top-target.top-target.height);
        if(Math.hypot(dx,dy)>Math.min(layout.width,layout.height)*.12) issues.push(`SCENE_ANCHOR_DISTANCE: ${r.id}`);
      } else if(n.left<a.rect.left-1||n.top<a.rect.top-1||n.left+n.width>a.rect.left+a.rect.width+1||n.top+n.height>a.rect.top+a.rect.height+1) issues.push(`SCENE_OVERLAY_OUTSIDE: ${r.id}`);
    }
  }
  return issues;
}

export const sceneCss=`.semantic-scene{display:flex;gap:24px;align-items:start;min-width:0}.scene-vertical{flex-direction:column}.scene-horizontal{flex-direction:row}.scene-region{min-width:0;display:grid;gap:20px;align-items:start;width:100%}.scene-horizontal>.weight-major{flex:2}.scene-horizontal>.weight-supporting{flex:1}.scene-comparison,.scene-parallel,.scene-split,.scene-grid,.scene-matrix{grid-template-columns:repeat(auto-fit,minmax(280px,1fr))}.scene-sequence{grid-auto-flow:column;grid-auto-columns:minmax(0,1fr)}.scene-stack,.scene-dominant,.scene-supporting,.scene-adjacent-to{grid-template-columns:minmax(0,1fr)}.scene-plan>main{display:block}.compact .semantic-scene{gap:18px}.compact .scene-region{gap:14px}`;
export const sceneRepairCss=`.scene-cluster{display:grid;gap:14px;min-width:0;align-content:start}.scene-content-first .module{padding:8px 12px}.scene-content-first .scene-cluster .narrative{background:transparent}.scene-content-first .scene-region{align-content:start}`;

export const sceneAttachmentCss=`.scene-network{grid-template-columns:minmax(0,1fr)}.scene-target,.scene-annotation{min-width:0}.scene-annotation{display:grid;gap:12px}.scene-anchor.side-start,.scene-anchor.side-end{grid-template-columns:minmax(0,2fr) minmax(220px,1fr)}.scene-anchor.side-start .scene-annotation{grid-column:1;grid-row:1}.scene-anchor.side-start .scene-target{grid-column:2;grid-row:1}.scene-anchor.side-before .scene-annotation{grid-row:1}.scene-overlay{position:relative;border:1px solid currentColor}.scene-overlay .scene-annotation{position:absolute;max-width:100%;inset-inline-end:0;top:0}.scene-overlay.side-start .scene-annotation{inset-inline-start:0;inset-inline-end:auto}.scene-overlay.side-after .scene-annotation{top:auto;bottom:0}`;

export function layoutAttachments() {
  for(const region of document.querySelectorAll('.scene-anchor.side-start,.scene-anchor.side-end')) {
    const target=region.querySelector('.scene-target'),note=region.querySelector('.scene-annotation');
    const leading=region.classList.contains('side-start')?note:target;
    const bounds=[...leading.querySelectorAll('[data-mint-object="text"],table,img')].map(el=>{
      if(el.matches('table,img')) return el.getBoundingClientRect().width;
      const range=document.createRange();range.selectNodeContents(el);return range.getBoundingClientRect().width;
    });
    const glyph=Math.max(0,...[...leading.querySelectorAll('[data-mint-object="text"]')].map(e=>parseFloat(getComputedStyle(e).fontSize)));
    const natural=Math.min(region.clientWidth*.65,Math.max(180,...bounds)+40+glyph);
    region.style.gridTemplateColumns=natural+'px minmax(0,1fr)';
  }
  for(const region of document.querySelectorAll('.scene-overlay')) {
    const note=region.querySelector('.scene-annotation'),target=region.querySelector('.scene-target');
    note.style.width=region.clientWidth+'px';
    // Reserve measured annotation space in the shared surface. Overlay never
    // licenses obscuring source text or drawing over source-image details.
    target.style[region.classList.contains('side-after')?'paddingBottom':'paddingTop']=note.getBoundingClientRect().height+12+'px';
  }
}
