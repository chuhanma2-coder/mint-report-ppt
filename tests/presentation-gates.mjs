import assert from "node:assert/strict";
import { presentationIntentIssues } from "../scripts/lib/presentation-gates.mjs";

const relationCards = { slides: [{ id: "P1", role: "content", semanticIntent: "role-relationship", managementQuestion: "谁向谁付费？", claim: "A向B付费", modules: [{ type: "text", expression: { type: "text" } }] }] };
assert.match(presentationIntentIssues(relationCards).join(" "), /no relationship diagram/);
const tableOnly = { slides: [{ id: "P1", role: "content", semanticIntent: "comparison", managementQuestion: "谁最高？", claim: "A最高", modules: [{ type: "table", dataShape: { rowCount: 12 }, expression: { type: "table" } }] }] };
assert.match(presentationIntentIssues(tableOnly).join(" "), /only text\/table|large table/);
const valid = { slides: [{ id: "P1", role: "content", semanticIntent: "comparison", managementQuestion: "谁最高？", claim: "A最高", modules: [{ type: "chart", expression: { type: "chart" } }] }, { id: "P2", role: "content", semanticIntent: "process", managementQuestion: "如何推进？", claim: "分两步推进", narrative: { transition: "从结果转向执行" }, modules: [{ type: "diagram", expression: { type: "diagram" } }] }] };
assert.deepEqual(presentationIntentIssues(valid), []);
console.log(JSON.stringify({ passed: true, tests: 3 }));
