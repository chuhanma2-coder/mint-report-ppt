import assert from "node:assert/strict";
import { consolidationIssues } from "../scripts/lib/page-consolidation.mjs";
import { theme } from "../scripts/lib/config.mjs";

const thinRich = [{ id: "S1", role: "content", pageComposition: "evidence-rich", evidenceBundle: { primaryEvidenceRefs: ["E1"] }, modules: [{ type: "chart" }] }];
assert.match(consolidationIssues(thinRich, theme).join(" "), /effective information units/);
const adjacent = [
  { id: "S1", role: "content", storyCluster: "C1", layout: { occupancy: 0.4 }, modules: [] },
  { id: "S2", role: "content", storyCluster: "C1", layout: { occupancy: 0.42 }, modules: [] }
];
assert.match(consolidationIssues(adjacent, theme).join(" "), /same story\/decision/);
assert.deepEqual(consolidationIssues([{ ...adjacent[0], independentDecision: true }, adjacent[1]], theme), []);
console.log(JSON.stringify({ passed: true, tests: 3 }));
