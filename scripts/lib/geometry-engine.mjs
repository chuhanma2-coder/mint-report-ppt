const allowed = new Set(["hero", "single-primary", "primary-secondary", "balanced-columns", "grid", "sequence", "matrix", "network"]);

export function chooseGeometry(slide) {
  if (allowed.has(slide.geometry)) return slide.geometry;
  const modules = slide.modules || [], types = modules.map(item => item.expression?.type || item.type);
  if (slide.role === "cover" || (modules.length === 1 && types[0] === "metric")) return "hero";
  if (types.includes("diagram")) {
    const variant = modules.find(item => (item.expression?.type || item.type) === "diagram")?.expression?.variant;
    if (["timeline", "flow", "swimlane"].includes(variant)) return "sequence";
    if (["network", "role-network", "architecture", "grouped-network", "layered-network"].includes(variant)) return "network";
  }
  if (modules.length === 1) return "single-primary";
  if (modules.length === 2) return modules.some(item => item.semanticRole === "primaryEvidence") ? "primary-secondary" : "balanced-columns";
  if (slide.semanticIntent === "matrix") return "matrix";
  return "grid";
}

export function layoutSlide(slide, theme) {
  const geometry = chooseGeometry(slide), W = theme.slide.width, H = theme.slide.height, s = theme.spacing;
  const titleTop = s.pageTop, titleHeight = slide.density === "dense" ? 74 : 92, claimHeight = slide.claim ? 54 : 0;
  const top = titleTop + titleHeight + claimHeight + 18, bottom = H - s.pageBottom, left = s.pageX, width = W - 2 * s.pageX, height = bottom - top;
  const n = Math.max(1, slide.modules.length), gap = slide.density === "dense" ? s.compactGap : s.gap;
  let frames = [];
  if (geometry === "hero" || geometry === "single-primary") frames = [{ left, top, width, height }];
  else if (geometry === "primary-secondary") frames = [
    { left, top, width: width * 0.66 - gap / 2, height },
    { left: left + width * 0.66 + gap / 2, top, width: width * 0.34 - gap / 2, height: height * 0.62 }
  ];
  else if (geometry === "balanced-columns") frames = Array.from({ length: n }, (_, index) => ({ left: left + index * ((width + gap) / n), top, width: (width - gap * (n - 1)) / n, height }));
  else if (geometry === "sequence") frames = Array.from({ length: n }, (_, index) => ({ left: left + index * ((width + gap) / n), top: top + height * 0.17, width: (width - gap * (n - 1)) / n, height: height * 0.66 }));
  else {
    const cols = n <= 4 ? 2 : 3, rows = Math.ceil(n / cols), cellW = (width - gap * (cols - 1)) / cols, cellH = (height - gap * (rows - 1)) / rows;
    frames = Array.from({ length: n }, (_, index) => ({ left: left + (index % cols) * (cellW + gap), top: top + Math.floor(index / cols) * (cellH + gap), width: cellW, height: cellH }));
  }
  const occupied = frames.reduce((sum, f) => sum + f.width * f.height, 0) / (W * H);
  return { ...slide, geometry, layout: { title: { left, top: titleTop, width, height: titleHeight }, claim: { left, top: titleTop + titleHeight, width, height: claimHeight }, modules: frames, occupancy: occupied } };
}

export function layoutIssues(slide, theme) {
  const issues = [], occupancy = slide.layout?.occupancy ?? 0;
  if (!["cover", "section", "closing"].includes(slide.role) && occupancy < theme.constraints.sparseOccupancy) issues.push(`Slide ${slide.id} may be under-filled (${Math.round(occupancy * 100)}% module area)`);
  if (occupancy > theme.constraints.crowdedOccupancy) issues.push(`Slide ${slide.id} may be crowded (${Math.round(occupancy * 100)}% module area)`);
  return issues;
}
