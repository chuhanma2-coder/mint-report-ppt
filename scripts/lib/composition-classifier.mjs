import { informationUnitCount } from "./page-consolidation.mjs";
import { narrativeSupport } from './design-intent.mjs';

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
  const narrative = narrativeSupport(slide);
  if (narrative.valid) return {...slide,pageComposition:'evidence-rich',compositionClassification:{...signals,narrativeAccepted:true,pattern:narrative.pattern,reason:'Grounded Planner narrative accepted',strict}};
  let pageComposition = "standard", reason = "A single evidence relationship is sufficient";
  if (signals.metricCount >= 3 || (signals.metricCount >= 2 && signals.evidenceDiversity >= 3)) {
    pageComposition = "dashboard"; reason = "Several KPIs must be judged together";
  } else if (signals.hasContext && signals.hasPrimary && signals.hasMeaning && signals.evidenceGroupCount >= 3) {
    pageComposition = "banded-story"; reason = "Context, proof, and implication form a three-stage story";
  } else if (signals.informationUnits >= (strict ? 8 : 10) || signals.evidenceGroupCount >= (strict ? 3 : 4) || (signals.evidenceDiversity >= (strict ? 3 : 4) && signals.informationUnits >= (strict ? 6 : 8))) {
    pageComposition = "evidence-rich"; reason = "The evidence system requires a composite page";
  }
  return { ...slide, pageComposition, compositionClassification: { pageComposition, reason, strict, ...signals, narrativeAccepted:false, narrativeIssues:narrative.issues, ignoredAuthoredComposition: slide.pageComposition || null } };
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

// Composite classification must never invent a fixed visible band. Evidence is
// allocated to authored carriers later; uncovered facts are a blocking error.
export function materializeCompositeEvidence(slide) { return slide; }
