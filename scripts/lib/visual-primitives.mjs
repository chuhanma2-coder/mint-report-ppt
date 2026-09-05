import { visualPrimitives } from './design-intent.mjs';
const esc = value => String(value ?? '').replace(/[&<>\"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'})[c]);

export function primitiveMarkup(kind, text, binding, extra = {}) {
  if (!visualPrimitives.includes(kind)) throw new Error(`UNSUPPORTED_PRIMITIVE: ${kind}`);
  const fields = Object.entries({...extra,bindingId:binding}).map(([key,value])=>`data-vp-${key.replace(/[A-Z]/g,c=>'-'+c.toLowerCase())}="${esc(value)}"`).join(' ');
  return `<div class="vp vp-${kind}" data-visual-primitive="${kind}" ${fields}><div class="vp-text" data-mint-object="text">${esc(text)}</div></div>`;
}

export function visualModuleMarkup(module) {
  const data = module.data || {}, nodes = data.nodes || [], edges = data.edges || [];
  const kind = module.expression?.variant;
  if (!['time-window-dependency','primary-with-parallel-options','critical-path-with-parallel-options','entity-comparison'].includes(kind)) return null;
  const binding = id => `${module.id}/${id}`;
  const nodeMarkup = node => {
    const extra = {nodeId:node.id};
    // Every field is a visible business fact; do not reduce an entity to its name.
    const parts = [primitiveMarkup(node.entity ? 'entity-profile' : 'milestone',node.label || node.name || node.id,binding(node.id),extra)];
    if (node.timeRange) parts.push(primitiveMarkup('time-range',node.timeRange.label,binding(`${node.id}/range`),extra));
    if (node.duration) parts.push(primitiveMarkup('metric-badge',node.duration,binding(`${node.id}/duration`),extra));
    for (const [i,metric] of (node.metrics || []).entries()) parts.push(primitiveMarkup('metric-badge',metric,binding(`${node.id}/metric-${i}`),extra));
    if (node.status) parts.push(primitiveMarkup('status-chip',node.status,binding(`${node.id}/status`),extra));
    if (node.condition) parts.push(primitiveMarkup('risk-strip',node.condition,binding(`${node.id}/condition`),extra));
    if (node.text) parts.push(`<div class="module-copy" data-mint-object="text">${esc(node.text)}</div>`);
    return `<div class="vp-node" data-vp-node="${esc(node.id)}">${parts.join('')}</div>`;
  };
  if (kind === 'entity-comparison') return `<div class="vp-profiles">${nodes.map(nodeMarkup).join('')}</div>`;
  const lanes = data.lanes?.length ? data.lanes : [{id:'main',nodeIds:nodes.map(n=>n.id)}];
  const assigned = lanes.flatMap(l=>l.nodeIds || []);
  if (new Set(assigned).size !== nodes.length || assigned.length !== nodes.length || assigned.some(id=>!nodes.some(n=>n.id===id))) throw new Error(`NARRATIVE_LANE_COVERAGE: ${module.id}`);
  const usedEdges = new Set();
  const output = lanes.map(lane => {
    const members = lane.nodeIds.map(id=>nodes.find(n=>n.id===id));
    // Directed acyclic chain order is computed from edges, not the input list.
    const local = edges.filter(e=>lane.nodeIds.includes(e.from)&&lane.nodeIds.includes(e.to));
    const indegree = id => local.filter(e=>e.to===id).length;
    const roots = members.filter(n=>indegree(n.id)===0), ordered=[];
    if (local.length) {
      if (roots.length !== 1 || local.length !== members.length-1 || members.some(n=>local.filter(e=>e.from===n.id).length>1 || indegree(n.id)>1)) throw new Error(`NARRATIVE_NOT_CHAIN: ${module.id}; choose an explicit network expression instead`);
      let node=roots[0];
      while(node && !ordered.includes(node)) {ordered.push(node);const edge=local.find(e=>e.from===node.id);node=edge?members.find(n=>n.id===edge.to):null;}
      if (ordered.length!==members.length) throw new Error(`NARRATIVE_CYCLE: ${module.id}`);
    } else ordered.push(...members);
    const pieces=[];
    ordered.forEach((node,i)=>{
      if(i) {
        const edge=local.find(e=>e.from===ordered[i-1].id&&e.to===node.id);
        if(edge) {usedEdges.add(edge);pieces.push(primitiveMarkup('dependency-edge',[edge.label,edge.condition].filter(Boolean).join('\n'),binding(edge.id || `edge-${edges.indexOf(edge)}`),{edgeId:edge.id || `edge-${edges.indexOf(edge)}`,from:edge.from,to:edge.to}));}
      }
      pieces.push(nodeMarkup(node));
    });
    const label=lane.label ? primitiveMarkup('parallel-lane',`${lane.relationship==='parallel'?'并行 · ':''}${lane.label}`,binding(lane.id),{laneId:lane.id,parallelTo:lane.parallelTo || ''}) : '';
    return `<div class="vp-lane">${label}<div class="vp-track">${pieces.join('')}</div></div>`;
  }).join('');
  if (usedEdges.size!==edges.length) throw new Error(`NARRATIVE_EDGE_UNREPRESENTED: ${module.id}; cross-lane edges require an explicit network expression`);
  return output;
}

export function primitiveCss(p) {
  return `.vp{min-width:0;padding:10px 12px;position:relative;color:${p.ink}}.vp-text{font-size:24px;line-height:1.25;white-space:pre-wrap}.vp-node{min-width:180px;flex:1;display:flex;flex-direction:column;gap:10px;padding:8px}.vp-track{display:flex;gap:12px;align-items:start}.vp-lane{display:grid;gap:14px;margin:12px 0}.vp-profiles{display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:26px}.vp-entity-profile{border-top:4px solid ${p.blue};font-weight:700}.vp-milestone{border-bottom:3px solid ${p.mint};font-weight:700}.vp-time-range,.vp-risk-strip{background:${p.orangeLight};border-left:4px solid ${p.orange}}.vp-parallel-lane{border-left:4px solid ${p.mint};background:${p.mintLight};font-weight:700}.vp-status-chip{background:${p.mintLight}}.vp-metric-badge .vp-text{font-size:32px;font-weight:700;color:${p.blue}}.vp-takeaway-band,.vp-decision-strip{background:${p.ink};color:white;font-weight:700}.vp-dependency-edge{flex:0 1 130px;min-width:90px;align-self:center;padding:6px 0 18px;border-bottom:2px solid ${p.mint}}.vp-dependency-edge:after{content:'▶';position:absolute;right:-3px;bottom:-12px;color:${p.mint};font-size:18px}.vp-dependency-edge .vp-text{font-size:20px}.vp-node .module-copy{font-size:22.667px}.compact .vp-text{font-size:21.333px}.compact .vp-dependency-edge .vp-text{font-size:18.667px}.compact .vp-metric-badge .vp-text{font-size:32px}`;
}
