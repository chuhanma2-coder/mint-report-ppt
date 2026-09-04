import assert from "node:assert/strict";
import { chooseGeometry, layoutSlide, layoutIssues } from "../scripts/lib/geometry-engine.mjs";
import { theme } from "../scripts/lib/config.mjs";

const slide = { id: "S1", role: "content", claim: "结论", managementQuestion: "问题", density: "standard", modules: [{ type: "chart", semanticRole: "primaryEvidence", expression: { type: "chart", variant: "sorted-bar" } }, { type: "callout", semanticRole: "managementConclusion", expression: { type: "callout", variant: "conclusion" } }] };
assert.equal(chooseGeometry(slide), "primary-secondary");
const laid = layoutSlide(slide, theme);
assert.equal(laid.layout.modules.length, 2);
assert.equal(laid.geometry, "primary-secondary");
assert.ok(laid.layout.modules.every(frame => frame.left >= 0 && frame.top >= 0 && frame.left + frame.width <= theme.slide.width && frame.top + frame.height <= theme.slide.height));
assert.ok(Array.isArray(layoutIssues(laid, theme)));
assert.equal(chooseGeometry({ ...slide, role: "cover", modules: [{ type: "text" }] }), "hero");
const dense = layoutSlide({
  id: "S2", role: "content", claim: "一页讲清资源、路径、结果与动作", density: "dense", pageComposition: "evidence-rich",
  evidenceBundle: { contextRefs: ["E1", "E2"], primaryEvidenceRefs: ["E3", "E4"], supportingEvidenceRefs: ["E5", "E6"], actionRefs: ["E7", "E8"] },
  modules: [
    { id: "L1", type: "metric", compositionBand: "lead" }, { id: "L2", type: "metric", compositionBand: "lead" },
    { id: "P1", type: "chart", semanticRole: "primaryEvidence", compositionBand: "primary" }, { id: "P2", type: "diagram", semanticRole: "primaryEvidence", compositionBand: "primary" },
    { id: "R1", type: "metric", semanticRole: "progress", compositionBand: "result" }, { id: "R2", type: "metric", semanticRole: "progress", compositionBand: "result" }, { id: "R3", type: "callout", semanticRole: "managementConclusion", text: "下一步动作", compositionBand: "result" }
  ]
}, theme);
assert.deepEqual([...new Set(dense.layout.modules.map(frame => frame.compositionBand))], ["lead", "primary", "result"]);
assert.ok(dense.layout.occupancy >= theme.constraints.evidenceRichMinimumOccupancy);
assert.equal(layoutIssues(dense, theme).length, 0);
const supportingTable = { ...slide, semanticIntent: "comparison", pageComposition: "standard", modules: [{ type: "chart", semanticRole: "primaryEvidence", expression: { type: "chart", variant: "sorted-bar" } }, { type: "table", semanticRole: "supportingEvidence", tableRole: "supporting", expression: { type: "table", variant: "highlighted-table" } }] };
assert.equal(chooseGeometry(supportingTable), "primary-secondary");
const imageRail = layoutSlide({ id: "IMG", role: "content", claim: "架构图为主证据", density: "standard", pageComposition: "evidence-rich", modules: [
  { id: "image", type: "image", semanticRole: "primaryEvidence", visualPriority: "P0" },
  { id: "a", type: "callout", semanticRole: "supportingEvidence", text: "Mint职责", visualPriority: "P1" },
  { id: "b", type: "callout", semanticRole: "supportingEvidence", text: "Sinova职责", visualPriority: "P1" },
  { id: "c", type: "callout", semanticRole: "supportingEvidence", text: "本地生态", visualPriority: "P2" }
] }, theme);
assert.match(imageRail.layout.layoutVariant, /primary-rail/);
assert.ok(imageRail.layout.modules[0].width > imageRail.layout.modules[1].width);
assert.ok(imageRail.layout.modules[2].top > imageRail.layout.modules[1].top);
console.log(JSON.stringify({ passed: true, tests: 13 }));
