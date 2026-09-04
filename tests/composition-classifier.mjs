import assert from "node:assert/strict";
import { classifyChapterCompositions, classifySlideComposition, materializeCompositeEvidence } from "../scripts/lib/composition-classifier.mjs";

const rich = classifySlideComposition({
  id: "S1", role: "content", claim: "结论", semanticIntent: "comparison", pageComposition: "standard", decisionUnit: "D1",
  evidenceBundle: { contextRefs: ["E1", "E2"], primaryEvidenceRefs: ["E3", "E4", "E5"], supportingEvidenceRefs: ["E6", "E7"], comparisonRefs: ["E8"], actionRefs: ["E9"] },
  modules: [{ type: "chart", semanticRole: "primaryEvidence" }, { type: "callout", semanticRole: "managementConclusion" }]
});
assert.notEqual(rich.pageComposition, "standard");
assert.equal(rich.compositionClassification.ignoredAuthoredComposition, "standard");

const twoModuleComposite = materializeCompositeEvidence({
  ...rich,
  sourceEvidence: Array.from({ length: 9 }, (_, index) => ({ id: `E${index + 1}`, text: `证据${index + 1}` })),
  modules: [{ type: "chart", semanticRole: "primaryEvidence", evidenceRefs: ["E3"] }, { type: "callout", semanticRole: "managementConclusion", text: "结论", evidenceRefs: ["E9"] }]
});
assert.equal(twoModuleComposite.modules.length, 2);
assert.ok(!twoModuleComposite.modules.some(module => module.generatedFromEvidenceBundle));

const chapter = classifyChapterCompositions(Array.from({ length: 6 }, (_, index) => ({
  id: `C${index + 1}`, role: "content", claim: "结论", semanticIntent: "comparison", evidenceBundle: { primaryEvidenceRefs: Array.from({ length: 8 }, (_, i) => `E${index}-${i}`) }, modules: [{ type: "chart", semanticRole: "primaryEvidence" }]
})));
assert.equal(chapter.diagnostics.complex, true);
assert.ok(chapter.slides.some(slide => slide.pageComposition !== "standard"));
console.log(JSON.stringify({ passed: true, tests: 6 }));
