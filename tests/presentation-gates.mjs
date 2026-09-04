import assert from "node:assert/strict";
import { presentationIntentIssues } from "../scripts/lib/presentation-gates.mjs";

const relationCards = { slides: [{ id: "P1", role: "content", semanticIntent: "role-relationship", managementQuestion: "谁向谁付费？", claim: "A向B付费", modules: [{ type: "text", expression: { type: "text" } }] }] };
assert.match(presentationIntentIssues(relationCards).join(" "), /no relationship diagram/);
const tableOnly = { slides: [{ id: "P1", role: "content", semanticIntent: "comparison", managementQuestion: "谁最高？", claim: "A最高", modules: [{ type: "table", dataShape: { rowCount: 12 }, expression: { type: "table" } }] }] };
assert.match(presentationIntentIssues(tableOnly).join(" "), /only text\/table|large table/);
const valid = { slides: [{ id: "P1", role: "content", semanticIntent: "comparison", managementQuestion: "谁最高？", claim: "A最高", evidenceBundle: { primaryEvidenceRefs: ["E1"] }, modules: [{ type: "chart", semanticRole: "primaryEvidence", evidenceRefs: ["E1"], expression: { type: "chart" } }] }, { id: "P2", role: "content", semanticIntent: "process", managementQuestion: "如何推进？", claim: "分两步推进", narrative: { transition: "从结果转向执行" }, evidenceBundle: { primaryEvidenceRefs: ["E2"] }, modules: [{ type: "diagram", semanticRole: "primaryEvidence", evidenceRefs: ["E2"], expression: { type: "diagram" } }] }] };
assert.deepEqual(presentationIntentIssues(valid), []);
const hiddenBundle = { slides: [{ id: "P3", role: "content", semanticIntent: "comparison", managementQuestion: "谁最高？", claim: "A最高", evidenceBundle: { primaryEvidenceRefs: ["E3"] }, modules: [{ type: "chart", semanticRole: "primaryEvidence", evidenceRefs: ["E4"], expression: { type: "chart" } }] }] };
assert.match(presentationIntentIssues(hiddenBundle).join(" "), /E3.*not mapped|E3.*not rendered/);
console.log(JSON.stringify({ passed: true, tests: 4 }));
