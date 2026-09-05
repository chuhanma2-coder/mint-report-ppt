const typeOf = module => module.expression?.type || module.type;

function textLength(module = {}) {
  return String(module.title || "").length + String(module.text || "").length + String(module.value ?? "").length;
}

export function moduleCapacityDemand(module = {}) {
  const type = typeOf(module), rows = module.data?.rows?.length || 0, categories = module.data?.categories?.length || 0;
  if (type === "table") return 2.2 + Math.min(5, rows * .42);
  if (type === "image") return 3.2;
  if (type === "diagram") return 2.8 + Math.min(2.5, (module.data?.nodes?.length || 0) * .18);
  if (type === "chart") return 2.4 + Math.min(2.2, categories * .2);
  if (type === "metric") return 1.2 + Math.min(1, textLength(module) / 120);
  return 1.1 + Math.min(2.8, textLength(module) / 105);
}

export function slideCapacityDemand(slide = {}) {
  const moduleDemand = (slide.modules || []).reduce((sum, module) => sum + moduleCapacityDemand(module), 0);
  const evidenceDemand = new Set((slide.modules || []).flatMap(module => module.evidenceRefs || [])).size * .12;
  return moduleDemand + evidenceDemand;
}

export function outlineIntegrityIssues(slides = [], { readablePageCapacity = 15 } = {}) {
  const issues = [];
  const groups = new Map();
  for (const slide of slides.filter(item => item.role === "content")) {
    const key = String(slide.outlineItem || "");
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(slide);
  }
  for (const [outlineItem, group] of groups) {
    const totalDemand = group.reduce((sum, slide) => sum + slideCapacityDemand(slide), 0);
    const minimumPages = Math.max(1, Math.ceil(totalDemand / readablePageCapacity));
    if (group.length > minimumPages) issues.push(`OUTLINE_FRAGMENTATION: outline item ${outlineItem} uses ${group.length} pages although its readable capacity estimate requires about ${minimumPages}; regroup all evidence by outline item before splitting`);
    if (group.length > 1) for (let index = 0; index < group.length; index++) {
      const slide = group[index];
      if (slide.outlinePart !== index + 1) issues.push(`OUTLINE_PART_INVALID: slide ${slide.id} must declare outlinePart ${index + 1} within outline item ${outlineItem}`);
      if (index > 0 && (!String(slide.outlineSplit?.reason || "").trim() || !String(slide.outlineSplit?.naturalBoundary || "").trim() || slide.outlineSplit?.continuationOf !== group[index - 1].id)) issues.push(`OUTLINE_SPLIT_UNJUSTIFIED: slide ${slide.id} must name a readable-capacity reason, natural evidence boundary, and continuationOf ${group[index - 1].id}`);
    }
    for (let index = 0; index < group.length - 1; index++) {
      const combined = slideCapacityDemand(group[index]) + slideCapacityDemand(group[index + 1]);
      if (combined <= readablePageCapacity) issues.push(`OUTLINE_ADJACENT_PAGES_CAN_MERGE: ${group[index].id} and ${group[index + 1].id} answer outline item ${outlineItem} and fit one readable page estimate (${combined.toFixed(1)}/${readablePageCapacity})`);
    }
  }
  return issues;
}
