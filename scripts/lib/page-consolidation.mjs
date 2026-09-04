const bundleFields = ["contextRefs", "kpiRefs", "primaryEvidenceRefs", "supportingEvidenceRefs", "caseRefs", "comparisonRefs", "chartRefs", "tableRefs", "imageRefs", "riskRefs", "actionRefs", "decisionRefs", "boundaryRefs", "explanationRefs"];

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
    const units = informationUnitCount(slide), profile = slide.pageComposition || "standard", modules = slide.modules || [];
    if (profile === "evidence-rich" && units < 8) issues.push(`Slide ${slide.id} declares evidence-rich composition but has only ${units} effective information units`);
    const artifactModules = modules.filter(module => ["chart", "table", "diagram", "image"].includes(module.expression?.type || module.type));
    const supportingModules = modules.filter(module => !artifactModules.includes(module) || module.semanticRole !== "primaryEvidence");
    const dominantArea = artifactModules.length === 1 ? (slide.layout?.modules?.[modules.indexOf(artifactModules[0])]?.width || 0) * (slide.layout?.modules?.[modules.indexOf(artifactModules[0])]?.height || 0) / ((theme?.slide?.width || 1920) * (theme?.slide?.height || 1080)) : 0;
    if (units >= 6 && artifactModules.length === 1 && dominantArea > 0.42 && supportingModules.length < 2 && (slide.layout?.storyCompleteness || 0) < 0.85) issues.push(`SINGLE_DOMINANT_ARTIFACT: Slide ${slide.id} relies on one large ${artifactModules[0].expression?.type || artifactModules[0].type} without enough visible meaning or supporting evidence`);
  }
  const content = slides.filter(slide => slide.role === "content");
  for (let index = 0; index < content.length - 1; index++) {
    const a = content[index], b = content[index + 1];
    const sameCluster = a.storyCluster && a.storyCluster === b.storyCluster;
    const sameOutline = a.outlineItem && a.outlineItem === b.outlineItem;
    if (!(sameCluster || sameOutline) || a.independentDecision || b.independentDecision) continue;
    const aDecision = String(a.decisionUnit || a.evidenceBundle?.decisionUnit || a.evidenceBundle?.decisionRefs?.[0] || ""), bDecision = String(b.decisionUnit || b.evidenceBundle?.decisionUnit || b.evidenceBundle?.decisionRefs?.[0] || "");
    const sameDecision = aDecision && aDecision === bDecision, missingDecision = !aDecision || !bDecision;
    const combinedUnits = informationUnitCount(a) + informationUnitCount(b), incompleteStory = (a.layout?.storyCompleteness || 0) < 0.85 || (b.layout?.storyCompleteness || 0) < 0.85;
    if (combinedUnits <= 28 && (sameDecision || (sameCluster && missingDecision && incompleteStory))) issues.push(`Slides ${a.id} and ${b.id} support the same story/decision without a complete independent meaning chain; merge their evidence bundles or define distinct decision units`);
  }
  return issues;
}
