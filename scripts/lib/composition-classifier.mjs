import { informationUnitCount } from "./page-consolidation.mjs";

const composite = new Set(["dashboard", "banded-story", "evidence-rich"]);
const bundleGroups = ["contextRefs", "kpiRefs", "primaryEvidenceRefs", "supportingEvidenceRefs", "caseRefs", "comparisonRefs", "chartRefs", "tableRefs", "imageRefs", "riskRefs", "actionRefs", "decisionRefs", "boundaryRefs", "explanationRefs"];

function nonEmptyGroups(bundle = {}) {
  return bundleGroups.filter(field => Array.isArray(bundle[field]) && bundle[field].length > 0);
}

export function compositionSignals(slide) {
  const modules = slide.modules || [], bundle = slide.evidenceBundle || {};
  const moduleTypes = new Set(modules.map(module => module.expression?.type || module.type).filter(Boolean));
  const semanticRoles = new Set(modules.map(module => module.semanticRole).filter(Boolean));
  const groups = nonEmptyGroups(bundle);
  const metricCount = Array.isArray(bundle.kpiRefs) ? bundle.kpiRefs.length : modules.filter(module => (module.expression?.type || module.type) === "metric").length;
  const evidenceDiversity = groups.length || moduleTypes.size;
  const hasPrimary = (bundle.primaryEvidenceRefs || []).length > 0 || semanticRoles.has("primaryEvidence");
  const hasMeaning = ["managementConclusion", "decision", "risk", "action", "boundary"].some(role => semanticRoles.has(role)) || ["decisionRefs", "riskRefs", "actionRefs", "boundaryRefs"].some(field => (bundle[field] || []).length > 0);
  const hasContext = semanticRoles.has("context") || (bundle.contextRefs || []).length > 0;
  return {
    informationUnits: informationUnitCount(slide),
    evidenceGroupCount: groups.length,
    evidenceDiversity,
    metricCount,
    moduleCount: modules.length,
    hasPrimary,
    hasMeaning,
    hasContext,
    decisionUnit: String(slide.decisionUnit || bundle.decisionUnit || bundle.decisionRefs?.[0] || "")
  };
}

export function classifySlideComposition(slide, { strict = false } = {}) {
  if (slide.role !== "content") return { ...slide, pageComposition: slide.role === "cover" ? "standard" : slide.pageComposition || "standard" };
  const signals = compositionSignals(slide);
  let pageComposition = "standard", reason = "A single evidence relationship is sufficient";
  if (signals.metricCount >= 3 || (signals.metricCount >= 2 && signals.evidenceDiversity >= 3)) {
    pageComposition = "dashboard"; reason = "Several KPIs must be judged together";
  } else if (signals.hasContext && signals.hasPrimary && signals.hasMeaning && signals.evidenceGroupCount >= 3) {
    pageComposition = "banded-story"; reason = "Context, proof, and implication form a three-stage story";
  } else if (signals.informationUnits >= (strict ? 8 : 10) || signals.evidenceGroupCount >= (strict ? 3 : 4) || (signals.evidenceDiversity >= (strict ? 3 : 4) && signals.informationUnits >= (strict ? 6 : 8))) {
    pageComposition = "evidence-rich"; reason = "The evidence system requires a composite page";
  }
  return { ...slide, pageComposition, compositionClassification: { pageComposition, reason, strict, ...signals, ignoredAuthoredComposition: slide.pageComposition || null } };
}

function chapterComplexity(slides) {
  const content = slides.filter(slide => slide.role === "content"), totalInformationUnits = content.reduce((sum, slide) => sum + compositionSignals(slide).informationUnits, 0);
  return { content, totalInformationUnits, complex: content.length >= 6 && totalInformationUnits >= 48 };
}

export function classifyChapterCompositions(slides) {
  let classified = slides.map(slide => classifySlideComposition(slide));
  const initial = chapterComplexity(classified);
  const initialComposite = initial.content.filter(slide => composite.has(slide.pageComposition)).length;
  const initialStandardRatio = initial.content.length ? initial.content.filter(slide => slide.pageComposition === "standard").length / initial.content.length : 0;
  let strictRerun = false;
  if (initial.complex && (initialStandardRatio > 0.6 || initialComposite === 0)) {
    strictRerun = true;
    classified = classified.map(slide => classifySlideComposition(slide, { strict: true }));
  }
  return { slides: classified, diagnostics: { complex: initial.complex, totalInformationUnits: initial.totalInformationUnits, initialStandardRatio, initialComposite, strictRerun } };
}

export function chapterCompositionIssues(slides) {
  const { content, totalInformationUnits, complex } = chapterComplexity(slides);
  if (!complex) return [];
  const standard = content.filter(slide => slide.pageComposition === "standard").length, composites = content.filter(slide => composite.has(slide.pageComposition) && slide.layout?.compositeApplied).length;
  const issues = [];
  if (standard / content.length > 0.6) issues.push(`STANDARD_OVERUSE: ${standard}/${content.length} content slides remain standard in a complex chapter`);
  if (composites === 0) issues.push(`COMPOSITE_COVERAGE: complex chapter with ${totalInformationUnits} information units has no applied composite page`);
  return issues;
}

export function compositeProfile(value) { return composite.has(value); }

function inferredBand(module) {
  if (module.compositionBand) return module.compositionBand;
  if (["managementConclusion", "decision", "risk", "action", "boundary"].includes(module.semanticRole) || ["supporting", "reference"].includes(module.tableRole)) return "result";
  if (module.semanticRole === "context" || module.type === "metric") return "lead";
  return "primary";
}

function exactEvidenceModule(slide, refs, { id, title, semanticRole, compositionBand }) {
  const selected = [...new Set(refs || [])].slice(0, 4), byId = new Map((slide.sourceEvidence || []).map(item => [String(item.id), item.text]));
  const text = selected.map(ref => byId.get(String(ref))).filter(Boolean).join("；");
  if (!text) return null;
  return { id: `${slide.id}-${id}`, type: "callout", title, text, semanticRole, compositionBand, evidenceRefs: selected, generatedFromEvidenceBundle: true };
}

export function materializeCompositeEvidence(slide) {
  if (slide.role !== "content" || !compositeProfile(slide.pageComposition)) return slide;
  const modules = [...(slide.modules || [])], bands = new Set(modules.map(inferredBand)), bundle = slide.evidenceBundle || {};
  if (!bands.has("lead")) {
    const module = exactEvidenceModule(slide, [...(bundle.kpiRefs || []), ...(bundle.contextRefs || [])], { id: "lead-evidence", title: "关键背景", semanticRole: "context", compositionBand: "lead" });
    if (module) modules.unshift(module);
  }
  if (!bands.has("primary")) {
    const module = exactEvidenceModule(slide, [...(bundle.primaryEvidenceRefs || []), ...(bundle.chartRefs || []), ...(bundle.tableRefs || []), ...(bundle.comparisonRefs || []), ...(bundle.caseRefs || [])], { id: "primary-evidence", title: "核心证据", semanticRole: "primaryEvidence", compositionBand: "primary" });
    if (module) modules.push(module);
  }
  if (!bands.has("result")) {
    const module = exactEvidenceModule(slide, [...(bundle.decisionRefs || []), ...(bundle.actionRefs || []), ...(bundle.riskRefs || []), ...(bundle.boundaryRefs || []), ...(bundle.explanationRefs || []), ...(bundle.supportingEvidenceRefs || [])], { id: "result-evidence", title: "结论与行动", semanticRole: "managementConclusion", compositionBand: "result" });
    if (module) modules.push(module);
  }
  return { ...slide, modules };
}
