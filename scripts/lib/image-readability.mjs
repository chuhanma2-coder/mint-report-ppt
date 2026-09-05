// Region glyph heights are measured against the original image during source
// review. They are not inferred from image resolution or a matching hash.
export function imageReadabilityIssues(review, displayed, sourceSize) {
  if (!review?.regions?.length) return ['IMAGE_TEXT_REVIEW_REQUIRED'];
  if (!(displayed?.width > 0 && displayed?.height > 0 && sourceSize?.width > 0 && sourceSize?.height > 0)) return ['IMAGE_DIMENSIONS_INVALID'];
  const scale = Math.min(displayed.width / sourceSize.width, displayed.height / sourceSize.height);
  const issues = [];
  for (const region of review.regions) {
    if (region.containsText === false) continue;
    if (!(region.minimumGlyphHeightPx > 0) || !region.text?.trim()) {
      issues.push(`IMAGE_REGION_UNREVIEWED: ${region.id}`); continue;
    }
    // Visible glyph height is smaller than font em size. Use a conservative
    // 14 CSS-pixel glyph floor on the 1920px slide, separate from text font pt.
    const glyphHeight = region.minimumGlyphHeightPx * scale;
    if (glyphHeight < 14) issues.push(`IMAGE_FINE_TEXT: ${region.id} glyph height ${glyphHeight.toFixed(1)}px < 14px; enlarge, partition, or transcribe this evidence`);
  }
  return issues;
}
