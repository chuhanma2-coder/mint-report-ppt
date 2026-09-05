export function outlineIntegrityIssues(slides = []) {
  const issues = [], groups = new Map();
  for (const slide of slides.filter(item => item.role === 'content')) {
    const key = String(slide.outlineItem || '');
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(slide);
  }
  for (const [outline, group] of groups) for (const [index, slide] of group.entries()) {
    if (!slide.capacityProof?.measured) issues.push(`OUTLINE_MEASUREMENT_REQUIRED: ${outline}/${slide.id}`);
    if (group.length > 1 && slide.capacityProof?.fullOutlineFits) issues.push(`OUTLINE_FRAGMENTATION: ${outline} fits a measured page`);
    if (slide.outlinePart !== index + 1) issues.push(`OUTLINE_PART_INVALID: ${slide.id}`);
    if (index && (!slide.outlineSplit?.naturalBoundary || slide.outlineSplit.continuationOf !== group[index - 1].id)) issues.push(`OUTLINE_SPLIT_UNJUSTIFIED: ${slide.id}`);
  }
  return issues;
}
