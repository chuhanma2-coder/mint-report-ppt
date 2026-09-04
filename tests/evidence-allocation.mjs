import assert from "node:assert/strict";
import { allocateSlideEvidence, evidenceAllocationIssues } from "../scripts/lib/evidence-allocation.mjs";

const allocated = allocateSlideEvidence({ id: "S1", role: "content", modules: [
  { id: "chart", type: "chart", semanticRole: "primaryEvidence", evidenceRefs: ["E1"], dataRef: "same", expression: { type: "chart", variant: "sorted-bar" } },
  { id: "background", type: "callout", semanticRole: "context", title: "关键背景", text: "重复", evidenceRefs: ["E1"], generatedFromEvidenceBundle: true },
  { id: "meaning", type: "callout", semanticRole: "managementConclusion", text: "因此优先A", evidenceRefs: ["E1"] }
] });
assert.equal(allocated.modules.length, 2);
assert.equal(allocated.suppressedModules[0].suppressionReason, "generic-context");
assert.equal(allocated.modules[0].visualPriority, "P0");
assert.equal(allocated.modules[1].carrierPurpose, "implication");
assert.deepEqual(evidenceAllocationIssues([allocated]), []);
assert.match(evidenceAllocationIssues([{ id: "A1", role: "appendix", modules: [] }]).join(" "), /APPENDIX_FORBIDDEN/);
console.log(JSON.stringify({ passed: true, tests: 6 }));
