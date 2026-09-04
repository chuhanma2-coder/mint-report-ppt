const bundleFields = ["contextRefs", "primaryEvidenceRefs", "supportingEvidenceRefs", "caseRefs", "riskRefs", "actionRefs", "boundaryRefs"];

export function evidenceBundleRefs(slide) {
  return [...new Set(bundleFields.flatMap(field => slide.evidenceBundle?.[field] || []).map(String))];
}

export function informationUnitCount(slide) {
  const refs = evidenceBundleRefs(slide).length;
  const moduleUnits = (slide.modules || []).reduce((sum, module) => {
    const data = module.data || {}, categories = data.categories?.length || 0, rows = data.values?.length || data.rows?.length || 0;
    return sum + 1 + Math.min(4, Math.max(categories, rows - 1, 0));
  }, 0);
  return refs + moduleUnits;
}

export function consolidationIssues(slides = [], theme) {
  const issues = [];
  for (const slide of slides) {
    if (slide.role !== "content") continue;
    const units = informationUnitCount(slide), profile = slide.pageComposition || "standard";
    if (profile === "evidence-rich" && (slide.modules || []).length < 5) issues.push(`Slide ${slide.id} declares evidence-rich composition but has fewer than five visible modules`);
    if (profile === "evidence-rich" && units < 10) issues.push(`Slide ${slide.id} declares evidence-rich composition but has only ${units} effective information units`);
  }
  const content = slides.filter(slide => slide.role === "content");
  for (let index = 0; index < content.length - 1; index++) {
    const a = content[index], b = content[index + 1];
    const sameCluster = a.storyCluster && a.storyCluster === b.storyCluster;
    const sameOutline = a.outlineItem && a.outlineItem === b.outlineItem;
    if (!(sameCluster || sameOutline) || a.independentDecision || b.independentDecision) continue;
    const aOccupancy = a.layout?.occupancy || 0, bOccupancy = b.layout?.occupancy || 0;
    const mergeCeiling = theme?.constraints?.crowdedOccupancy || 0.92;
    const estimatedMerged = Math.max(0, aOccupancy + bOccupancy - 0.08);
    if (aOccupancy < 0.65 && bOccupancy < 0.65 && estimatedMerged <= mergeCeiling) issues.push(`Slides ${a.id} and ${b.id} are adjacent low-density pages in the same story cluster; merge their evidence bundles or mark a genuinely independent decision`);
  }
  return issues;
}
