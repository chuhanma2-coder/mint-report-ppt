import { visualPrimitives } from './design-intent.mjs';
import {theme} from './config.mjs';
const esc = value => String(value ?? '').replace(/[&<>\"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'})[c]);

function metricText(metric) {
  if(typeof metric==='string'||typeof metric==='number') return String(metric);
  if(!metric||metric.value==null) throw new Error('PROFILE_METRIC_VALUE_REQUIRED');
  return [metric.scope,metric.label,metric.value,metric.unit].filter(v=>v!==undefined&&v!=='').join(' ');
}
export function entityProfileFields(node) {
  for(const field of ['secondaryMetrics','characteristics','keywords']) if(node[field]!=null&&!Array.isArray(node[field])) throw new Error(`PROFILE_FIELD_ARRAY_REQUIRED: ${field}`);
  return {identity:[node.identity,node.headlineTag].filter(Boolean),primary:node.primaryMetric!=null?[metricText(node.primaryMetric)]:[],
    secondary:(node.secondaryMetrics||[]).map(metricText),details:[...(node.characteristics||[]),...(node.keywords||[]),node.scope,node.caveat].filter(Boolean)};
}

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
    const extra = {nodeId:node.id,state:node.milestoneState || 'pending'};
    if(!Object.hasOwn(theme.defaultDesignPolicy.milestoneColors,extra.state)) throw new Error('MILESTONE_STATE_INVALID');
    if(node.statusType&&!Object.hasOwn(theme.defaultDesignPolicy.statusColors,node.statusType)) throw new Error('STATUS_STATE_INVALID');
    if(node.timeRange?.variant&&!Object.hasOwn(theme.defaultDesignPolicy.rangeColors,node.timeRange.variant)) throw new Error('TIME_RANGE_VARIANT_INVALID');
    // Every field is a visible business fact; do not reduce an entity to its name.
    const parts = [primitiveMarkup(node.entity ? 'entity-profile' : 'milestone',node.label || node.name || node.id,binding(node.id),extra)];
    if (node.timeRange) parts.push(primitiveMarkup('time-range',node.timeRange.label,binding(`${node.id}/range`),{...extra,start:node.timeRange.start,end:node.timeRange.end,state:node.timeRange.variant||'uncertainty'}));
    if (node.duration) parts.push(primitiveMarkup('metric-badge',node.duration,binding(`${node.id}/duration`),extra));
    for (const [i,metric] of (node.metrics || []).entries()) parts.push(primitiveMarkup('metric-badge',metric,binding(`${node.id}/metric-${i}`),extra));
    if(node.entity) {
      const profile=entityProfileFields(node);
      for(const [i,text] of profile.identity.entries()) parts.push(`<div class="profile-identity" data-mint-object="text">${esc(text)}</div>`);
      for(const [i,text] of profile.primary.entries()) parts.push(primitiveMarkup('metric-badge',text,binding(`${node.id}/primary-${i}`),extra));
      for(const [i,text] of profile.secondary.entries()) parts.push(`<div class="profile-secondary" data-mint-object="text">${esc(text)}</div>`);
      for(const text of profile.details) parts.push(`<div class="module-copy" data-mint-object="text">${esc(text)}</div>`);
    }
    if (node.status) parts.push(primitiveMarkup('status-chip',node.status,binding(`${node.id}/status`),{...extra,state:node.statusType||'neutral'}));
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

export function primitiveCss(tokens=theme) {
  const p=tokens.palette,s=tokens.primitiveStyle,t=tokens.typographyPt,px=pt=>pt*96/72,policy=tokens.defaultDesignPolicy;
  return `.vp{min-width:0;position:relative;color:${p.ink};padding:${s.paddingY}px ${s.paddingX}px}.vp-text{font-size:${px(t.diagramNode[1])}px;line-height:1.25;white-space:pre-wrap}.vp-node{flex:1;display:flex;flex-direction:column;min-width:${s.minimumNodeWidth}px;padding:${s.nodePadding}px;gap:${s.nodeGap}px}.vp-track{display:flex;align-items:start;gap:${s.trackGap}px}.vp-lane{display:grid;margin:${s.trackGap}px 0;gap:${s.laneGap}px}.vp-profiles{display:grid;gap:${s.profileGap}px;grid-template-columns:repeat(auto-fit,minmax(${s.minimumProfileWidth}px,1fr))}
  .vp-entity-profile{border-top:${s.ruleWidth}px solid ${p.blue};font-weight:700}.vp-milestone{border-bottom:${s.ruleWidth}px solid ${p.mint};font-weight:700}.vp-time-range,.vp-risk-strip{background:${p.orangeLight};border-left:${s.ruleWidth}px solid ${p.orange}}.vp-parallel-lane{border-left:${s.ruleWidth}px solid ${p.mint};background:${p.mintLight};font-weight:700}.vp-metric-badge .vp-text{font-weight:700;color:${p.blue}}.vp-takeaway-band,.vp-decision-strip{background:${p.ink};color:${p.onDark};font-weight:700}
  .vp-dependency-edge{flex:0 1 130px;min-width:90px;align-self:center;padding:6px 0 18px;border-bottom:2px solid ${p.mint}}.vp-dependency-edge:after{content:'▶';position:absolute;right:-3px;bottom:-12px;color:${p.mint};font-size:18px}.vp-dependency-edge .vp-text{font-size:${px(t.diagramEdge[1])}px}.compact .vp-dependency-edge .vp-text{font-size:${px(t.diagramEdge[0])}px}.vp-node .module-copy{font-size:${px(t.body[0])}px}.compact .vp-text{font-size:${px(t.denseBody[0])}px}.vp-metric-badge .vp-text,.compact .vp-metric-badge .vp-text{font-size:${px(t.contentTitle[0])}px}
  ${Object.entries(policy.statusColors).map(([state,color])=>`.vp-status-chip[data-vp-state="${state}"]{background:${p[color]}}`).join('')}
  ${Object.entries(policy.milestoneColors).map(([state,color])=>`.vp-milestone[data-vp-state="${state}"]{border-bottom-color:${p[color]}}`).join('')}
  ${Object.entries(policy.rangeColors).map(([state,color])=>`.vp-time-range[data-vp-state="${state}"]{background:${p[color]}}`).join('')}
  .vp-time-range{border-left-width:${s.ruleWidth}px;border-right:${s.ruleWidth}px solid ${p.orange}}`;
}
