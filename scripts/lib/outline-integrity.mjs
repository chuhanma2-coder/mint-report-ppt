export function outlineIntegrityIssues(slides = []) {
  const issues = [], groups = new Map();
  for (const slide of slides.filter(item => item.role === 'content')) {
    for(const item of slide.outlineItems || [slide.outlineItem]) {
      const key = `${slide.sectionId || ''}:${item || ''}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push({slide,item});
    }
  }
  for (const [outline, entries] of groups) for (const [index, {slide,item}] of entries.entries()) {
    const group=entries.map(e=>e.slide),provenance=slide.outlineProvenance?.find(p=>p.outlineItem===item);
    if (!slide.capacityProof?.measured) issues.push(`OUTLINE_MEASUREMENT_REQUIRED: ${outline}/${slide.id}`);
    if (group.length > 1 && slide.capacityProof?.fullOutlineFits && !group.some(s=>s.independentDecision) && new Set(group.map(s=>s.decisionUnit)).size<=1) issues.push(`OUTLINE_FRAGMENTATION: ${outline} fits a measured page`);
    if ((provenance?.part ?? slide.outlinePart) !== index + 1) issues.push(`OUTLINE_PART_INVALID: ${slide.id}`);
    if (index && (!slide.outlineSplit?.naturalBoundary || (provenance?.continuationOf ?? slide.outlineSplit.continuationOf) !== group[index - 1].id)) issues.push(`OUTLINE_SPLIT_UNJUSTIFIED: ${slide.id}`);
  }
  return issues;
}
