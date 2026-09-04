import { fitText, moduleContentDemand } from "./text-layout.mjs";

const allowed = new Set(["hero", "single-primary", "primary-secondary", "balanced-columns", "grid", "sequence", "matrix", "network"]);
const compositeProfiles = new Set(["evidence-rich", "dashboard", "banded-story", "strategy-map"]);

function inferredBand(module, profile) {
  if (module.compositionBand) return module.compositionBand;
  if (profile === "dashboard" && module.type === "metric") return "lead";
  if (["context", "action"].includes(module.semanticRole)) return "lead";
  if (["primaryEvidence", "supportingEvidence", "comparison"].includes(module.semanticRole) || ["chart", "table", "diagram", "image"].includes(module.expression?.type || module.type)) return "primary";
  return "result";
}

function compositeFrames(modules, { left, top, width, height, gap, profile }) {
  const order = ["lead", "primary", "result"];
  const weights = { lead: 0.24, primary: 0.48, result: 0.28 };
  const groups = new Map(order.map(band => [band, []]));
  modules.forEach((module, index) => groups.get(inferredBand(module, profile)).push(index));
  const present = order.filter(band => groups.get(band).length);
  const usableHeight = height - gap * Math.max(0, present.length - 1);
  const totalWeight = present.reduce((sum, band) => sum + weights[band], 0);
  const frames = Array(modules.length);
  let y = top;
  for (const band of present) {
    const indexes = groups.get(band), bandHeight = usableHeight * weights[band] / totalWeight;
    const cellWidth = (width - gap * (indexes.length - 1)) / indexes.length;
    indexes.forEach((moduleIndex, position) => {
      frames[moduleIndex] = { left: left + position * (cellWidth + gap), top: y, width: cellWidth, height: bandHeight, compositionBand: band };
    });
    y += bandHeight + gap;
  }
  return frames;
}

export function chooseGeometry(slide) {
  const modules = slide.modules || [], types = modules.map(item => item.expression?.type || item.type);
  if (slide.semanticIntent === "matrix" || (types.includes("table") && modules.length > 1)) return "matrix";
  if (types.includes("diagram") && types.includes("metric")) return "primary-secondary";
  if (allowed.has(slide.geometry)) return slide.geometry;
  if (slide.role === "cover" || (modules.length === 1 && types[0] === "metric")) return "hero";
  if (types.includes("diagram")) {
    const variant = modules.find(item => (item.expression?.type || item.type) === "diagram")?.expression?.variant;
    if (["timeline", "flow", "swimlane"].includes(variant)) return "sequence";
    if (["network", "role-network", "architecture", "grouped-network", "layered-network"].includes(variant)) return "network";
  }
  if (modules.length === 1) return "single-primary";
  if (modules.length === 2) return modules.some(item => item.semanticRole === "primaryEvidence") ? "primary-secondary" : "balanced-columns";
  return "grid";
}

export function layoutSlide(slide, theme) {
  const modules = slide.modules || [], geometry = chooseGeometry(slide), W = theme.slide.width, H = theme.slide.height, s = theme.spacing;
  const titleTop = s.pageTop, titleHeight = slide.density === "dense" ? 74 : 92, claimHeight = slide.showManagementQuestion && slide.managementQuestion ? 54 : 0;
  const top = titleTop + titleHeight + claimHeight + 18, bottom = H - s.pageBottom, left = s.pageX, width = W - 2 * s.pageX, height = bottom - top;
  const n = Math.max(1, modules.length), gap = slide.density === "dense" ? s.compactGap : s.gap;
  let frames = [];
  if (compositeProfiles.has(slide.pageComposition) && n >= 3) frames = compositeFrames(modules, { left, top, width, height, gap, profile: slide.pageComposition });
  else if (geometry === "hero" || geometry === "single-primary") frames = [{ left, top, width, height }];
  else if (geometry === "primary-secondary") frames = [
    { left, top, width: width * 0.66 - gap / 2, height },
    { left: left + width * 0.66 + gap / 2, top, width: width * 0.34 - gap / 2, height: height * 0.62 }
  ];
  else if (geometry === "balanced-columns") frames = Array.from({ length: n }, (_, index) => ({ left: left + index * ((width + gap) / n), top, width: (width - gap * (n - 1)) / n, height }));
  else if (geometry === "sequence") frames = Array.from({ length: n }, (_, index) => ({ left: left + index * ((width + gap) / n), top: top + height * 0.17, width: (width - gap * (n - 1)) / n, height: height * 0.66 }));
  else if (geometry === "matrix") {
    if (n === 1) frames = [{ left, top, width, height }];
    else {
      const primaryH = height * 0.68;
      frames = [{ left, top, width, height: primaryH }, ...Array.from({ length: n - 1 }, (_, index) => ({ left: left + index * ((width + gap) / (n - 1)), top: top + primaryH + gap, width: (width - gap * (n - 2)) / (n - 1), height: height - primaryH - gap }))];
    }
  }
  else if (geometry === "network") {
    frames = n === 1 ? [{ left, top, width, height }] : [
      { left, top, width: width * 0.72 - gap / 2, height },
      ...Array.from({ length: n - 1 }, (_, index) => ({ left: left + width * 0.72 + gap / 2, top: top + index * ((height + gap) / (n - 1)), width: width * 0.28 - gap / 2, height: (height - gap * (n - 2)) / (n - 1) }))
    ];
  }
  else {
    const primaryIndex = modules.findIndex(item => item.semanticRole === "primaryEvidence");
    if (n === 3 && primaryIndex >= 0) {
      const primary = { left, top, width: width * 0.62 - gap / 2, height };
      const support = [0, 1].map(index => ({ left: left + width * 0.62 + gap / 2, top: top + index * ((height + gap) / 2), width: width * 0.38 - gap / 2, height: (height - gap) / 2 }));
      frames = Array.from({ length: n }, (_, index) => index === primaryIndex ? primary : support.shift());
    } else if (n === 4 && primaryIndex >= 0) {
      const primary = { left, top, width: width * 0.58 - gap / 2, height };
      const support = [0, 1, 2].map(index => ({ left: left + width * 0.58 + gap / 2, top: top + index * ((height + gap) / 3), width: width * 0.42 - gap / 2, height: (height - 2 * gap) / 3 }));
      frames = Array.from({ length: n }, (_, index) => index === primaryIndex ? primary : support.shift());
    } else {
      const cols = n === 3 ? 3 : n <= 4 ? 2 : 3, rows = Math.ceil(n / cols), cellW = (width - gap * (cols - 1)) / cols, cellH = (height - gap * (rows - 1)) / rows;
      frames = Array.from({ length: n }, (_, index) => ({ left: left + (index % cols) * (cellW + gap), top: top + Math.floor(index / cols) * (cellH + gap), width: cellW, height: cellH }));
    }
  }
  const titleFrame = { left, top: titleTop, width, height: titleHeight }, questionFrame = { left, top: titleTop + titleHeight, width, height: claimHeight };
  const titleRange = slide.role === "cover" ? theme.typographyPt.coverTitle : slide.role === "section" ? theme.typographyPt.sectionTitle : slide.density === "dense" ? theme.typographyPt.denseTitle : theme.typographyPt.contentTitle;
  const titleFit = fitText(slide.claim, titleFrame, { fontFamily: theme.fonts.cjk, preferredPt: titleRange[1], minPt: titleRange[0], maxLines: 2, bold: true, lineHeight: 1.15 });
  const questionFit = claimHeight ? fitText(slide.managementQuestion || "", questionFrame, { fontFamily: theme.fonts.cjk, preferredPt: 16, minPt: 14, maxLines: 2, lineHeight: 1.25 }) : null;
  const demands = frames.map((frame, index) => moduleContentDemand(slide.modules[index] || {}, frame.width, theme));
  const usedFrames = frames.map((frame, index) => ({ ...frame, usedHeight: demands[index].visual ? frame.height : Math.min(frame.height, demands[index].desiredHeight), minimumHeight: demands[index].minHeight }));
  const errors = [];
  if (titleFit.overflow) errors.push(`Slide ${slide.id} title does not fit at the minimum readable size`);
  if (questionFit?.overflow) errors.push(`Slide ${slide.id} management question does not fit at 14pt`);
  if (compositeProfiles.has(slide.pageComposition)) {
    for (const band of ["lead", "primary", "result"]) {
      const count = modules.filter(module => inferredBand(module, slide.pageComposition) === band).length;
      if (count > theme.constraints.maxBandModules) errors.push(`Slide ${slide.id} has ${count} modules in the ${band} band; regroup the evidence instead of creating tiny cards`);
    }
  }
  usedFrames.forEach((frame, index) => {
    if (frame.height + 0.5 < frame.minimumHeight) errors.push(`Slide ${slide.id} module ${slide.modules[index]?.id || index + 1} exceeds its frame at the minimum readable size`);
  });
  const moduleTypography = usedFrames.map((frame, index) => {
    const module = slide.modules[index] || {}, type = module.expression?.type || module.type, effectiveHeight = frame.usedHeight || frame.height;
    if (!["text", "callout"].includes(type)) return null;
    const innerWidth = Math.max(80, frame.width - 56), titleText = module.title || (module.semanticRole === "managementConclusion" ? "管理结论" : ""), titleHeight = titleText ? 60 : 0;
    const title = titleText ? fitText(titleText, { width: innerWidth, height: titleHeight }, { fontFamily: theme.fonts.cjk, preferredPt: 18, minPt: 15, maxLines: 2, bold: true, lineHeight: 1.2 }) : null;
    const bodyRange = module.semanticRole === "managementConclusion" ? [18, 15] : slide.density === "dense" ? [16, 13] : [18, 14];
    const body = fitText(module.text || "", { width: innerWidth, height: Math.max(40, effectiveHeight - 56 - titleHeight) }, { fontFamily: theme.fonts.cjk, preferredPt: bodyRange[0], minPt: bodyRange[1], maxLines: Infinity, bold: module.semanticRole === "managementConclusion", lineHeight: 1.4 });
    if (title?.overflow) errors.push(`Slide ${slide.id} module ${module.id || index + 1} title does not fit at 15pt`);
    if (body.overflow) errors.push(`Slide ${slide.id} module ${module.id || index + 1} body does not fit at ${bodyRange[1]}pt`);
    return { title, body };
  });
  const fixedArea = titleFrame.width * titleFrame.height + (claimHeight ? questionFrame.width * questionFrame.height : 0);
  const contentArea = usedFrames.reduce((sum, frame) => sum + frame.width * frame.usedHeight, 0);
  const occupancy = (fixedArea + contentArea) / (W * H);
  return { ...slide, geometry, typography: { title: titleFit, question: questionFit, modules: moduleTypography }, layout: { title: titleFrame, claim: questionFrame, modules: usedFrames, occupancy, errors } };
}

export function layoutIssues(slide, theme) {
  const issues = [...(slide.layout?.errors || [])], occupancy = slide.layout?.occupancy ?? 0;
  const minimum = slide.pageComposition === "evidence-rich" ? theme.constraints.evidenceRichMinimumOccupancy : slide.density === "dense" ? theme.constraints.denseMinimumOccupancy : theme.constraints.minimumContentOccupancy;
  if (!["cover", "section", "closing"].includes(slide.role) && !slide.allowIntentionalWhitespace && occupancy < minimum) issues.push(`Slide ${slide.id} has only ${Math.round(occupancy * 100)}% real content occupancy (minimum ${Math.round(minimum * 100)}%); consolidate related evidence instead of stretching empty modules`);
  if (occupancy > theme.constraints.crowdedOccupancy) issues.push(`Slide ${slide.id} may be crowded (${Math.round(occupancy * 100)}% module area)`);
  return issues;
}
