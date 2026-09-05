import assert from "node:assert/strict";
import { outlineIntegrityIssues, slideCapacityDemand } from "../scripts/lib/outline-integrity.mjs";

const small = id => ({ id, role: "content", outlineItem: "1", modules: [{ type: "callout", semanticRole: "supportingEvidence", title: id, text: "一项简短事实", evidenceRefs: [id] }] });
const fragmented = [small("S1"), small("S2"), small("S3")];
assert.match(outlineIntegrityIssues(fragmented).join(" "), /OUTLINE_FRAGMENTATION/);
const justified = [
  { ...small("S1"), outlinePart: 1, modules: [{ type: "table", semanticRole: "primaryEvidence", data: { rows: Array.from({ length: 18 }, (_, i) => [i]) }, evidenceRefs: ["S1"] }] },
  { ...small("S2"), outlinePart: 2, outlineSplit: { reason: "正文达到可读容量上限", naturalBoundary: "从成本明细切换到组织投入", continuationOf: "S1" }, modules: [{ type: "table", semanticRole: "primaryEvidence", data: { rows: Array.from({ length: 18 }, (_, i) => [i]) }, evidenceRefs: ["S2"] }] }
];
assert.equal(outlineIntegrityIssues(justified, { readablePageCapacity: 10 }).length, 0);
assert.ok(slideCapacityDemand(justified[0]) > slideCapacityDemand(small("S1")));
console.log(JSON.stringify({ passed: true, tests: 3 }));
