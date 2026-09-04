const relationshipIntents = new Set(["process", "hierarchy", "causal-chain", "role-relationship", "system-architecture", "timeline", "swimlane", "network"]);
const evidenceIntents = new Set(["trend", "comparison", "ranking", "variance", "composition", "distribution", "correlation", "progression", "uncertainty", "contribution", "matrix"]);

function expressionType(module) { return module.expression?.type || module.type; }

export function presentationIntentIssues(ir) {
  const issues = [];
  const contentSlides = (ir.slides || []).filter(slide => slide.role === "content");
  for (const [index, slide] of contentSlides.entries()) {
    const intent = String(slide.semanticIntent || "").toLowerCase().replaceAll("_", "-");
    const types = (slide.modules || []).map(expressionType);
    if (relationshipIntents.has(intent) && !types.some(type => type === "diagram" || type === "image")) issues.push(`Slide ${slide.id} expresses ${intent} but has no relationship diagram or source image`);
    const hasNumericEvidence = (slide.modules || []).some(module => (module.dataShape?.observationCount || module.dataShape?.numericCellCount || 0) > 0);
    const hasDecisionMatrix = (slide.modules || []).some(module => module.expression?.variant === "decision-matrix");
    if (evidenceIntents.has(intent) && hasNumericEvidence && !hasDecisionMatrix && !types.some(type => ["chart", "metric", "diagram", "image"].includes(type))) issues.push(`Slide ${slide.id} states an evidence-based conclusion but offers only text/table modules`);
    const largeTables = (slide.modules || []).filter(module => expressionType(module) === "table" && (module.dataShape?.rowCount || 0) > 8);
    if (largeTables.length && !/核对|明细|查数|原始数据/i.test(`${slide.managementQuestion} ${slide.claim}`) && !types.some(type => type === "chart" || type === "metric")) issues.push(`Slide ${slide.id} uses a large table without a visual summary of the stated conclusion`);
    if (index > 0 && !String(slide.narrative?.transition || "").trim()) issues.push(`Slide ${slide.id} lacks a transition from the previous management point`);
  }
  return issues;
}
