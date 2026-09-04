import assert from "node:assert/strict";
import { auditSourceCoverage } from "../scripts/lib/source-coverage.mjs";

const source = { sourceUnits: [{ id: "S1", text: "一" }, { id: "S2", text: "二" }] };
const missing = auditSourceCoverage(source, { slides: [{ id: "P1", evidenceRefs: ["S1"], modules: [] }] });
assert.equal(missing.passed, false);
assert.match(missing.issues.join(" "), /S2 has no output destination/);
const covered = auditSourceCoverage(source, { slides: [{ id: "P1", evidenceRefs: ["S1"], modules: [{ id: "M1", evidenceRefs: ["S2"] }] }] });
assert.equal(covered.passed, true);
assert.equal(covered.covered, 2);
const omitted = auditSourceCoverage({ ...source, approvedOmissions: [{ sourceUnitId: "S2", approved: true, reason: "用户明确删除" }] }, { slides: [{ id: "P1", evidenceRefs: ["S1"], modules: [] }] });
assert.equal(omitted.passed, true);
assert.equal(omitted.approvedOmissions, 1);
console.log(JSON.stringify({ passed: true, tests: 6 }));
