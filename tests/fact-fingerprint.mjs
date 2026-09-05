import assert from "node:assert/strict";
import { moduleFactFingerprints, semanticDuplicationIssues } from "../scripts/lib/fact-fingerprint.mjs";

const chart = { id: "chart", type: "chart", semanticRole: "primaryEvidence", data: { categories: ["人力", "IT"], series: [{ name: "压降", values: [203.3, 89.6] }] } };
const table = { id: "table", type: "table", semanticRole: "supportingEvidence", data: { rows: [["人力", 203.3], ["IT", 89.6]] } };
assert.ok(moduleFactFingerprints(chart).length >= 2);
assert.ok(semanticDuplicationIssues({ id: "S1", modules: [chart, table] }).length >= 1);
assert.deepEqual(semanticDuplicationIssues({ id: "S2", modules: [chart, { ...table, semanticRole: "managementConclusion" }] }), []);
console.log(JSON.stringify({ passed: true, tests: 3 }));
