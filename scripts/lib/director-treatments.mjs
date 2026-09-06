// The existing schema vocabulary is also the executable vocabulary. Free-form
// visual prose belongs in the brief, never in this dispatch key.
export const directorTreatments=['hero-metric','primary-visual','supporting-evidence','natural-table','inline-callout','context-note'];

export function treatmentIssues(binding,module) {
  const treatment=binding.visualTreatment;
  if(!directorTreatments.includes(treatment)) return [`DIRECTOR_TREATMENT_UNKNOWN: ${binding.moduleId}/${treatment}`];
  if(treatment==='natural-table'&&(module.expression?.type||module.type)!=='table') return [`DIRECTOR_TREATMENT_TYPE: ${binding.moduleId}/natural-table`];
  return [];
}

// Evidence is measured content, not data-director-treatment echoed back to us.
export function measuredTreatmentIssues(binding,actual) {
  if(!actual) return [];
  const issues=[],texts=(actual.textObjects||[]).filter(t=>t.text?.trim()),primitives=actual.primitives||[];
  const fail=why=>issues.push(`DESIGN_TREATMENT_UNIMPLEMENTED: ${binding.moduleId}/${why}`);
  if(!directorTreatments.includes(binding.visualTreatment)) fail('unknown');
  if(!texts.length&&!actual.image&&!actual.chart) fail('no-visible-content');
  if(binding.visualTreatment==='hero-metric') {
    const metrics=texts.filter(t=>t.metricPart==='value'&&t.metricPriority==='P0'||t.className==='metric-value');
    const body=texts.filter(t=>!metrics.includes(t)&&!String(t.className).includes('module-title'));
    if(!metrics.length||!metrics.some(t=>t.fontSizePx>=Math.max(0,...body.map(b=>b.fontSizePx))*1.15)) fail('metric-not-visually-emphasized');
  }
  if(binding.visualTreatment==='natural-table') {
    if(!actual.table?.rows?.length) fail('native-table-missing');
    else if(actual.table.rows.some(r=>r.rect.height>Math.max(0,...r.cells.map(c=>c.inkRect?.height||c.rect.height))+64)) fail('stretched-empty-row');
  }
  const variant=actual.semantic?.expression?.variant;
  if(['time-window-dependency','primary-with-parallel-options','critical-path-with-parallel-options'].includes(variant)) {
    const data=actual.semantic.data||{};
    for(const node of data.nodes||[]) {
      if(node.timeRange&&!primitives.some(p=>p.primitive==='time-range'&&p.nodeId===node.id&&p.rect.width>p.rect.height)) fail('time-window-not-rendered');
    }
    for(const [i,edge] of (data.edges||[]).entries()) if(!primitives.some(p=>p.primitive==='dependency-edge'&&p.from===edge.from&&p.to===edge.to&&p.edgeId===(edge.id||`edge-${i}`))) fail('dependency-not-rendered');
    for(const lane of (data.lanes||[]).filter(l=>l.relationship==='parallel')) if(!primitives.some(p=>p.primitive==='parallel-lane'&&p.laneId===lane.id&&p.parallelTo===lane.parallelTo)) fail('parallel-not-rendered');
  }
  return issues;
}
