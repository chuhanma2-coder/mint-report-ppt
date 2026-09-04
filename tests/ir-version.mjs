import assert from "node:assert/strict";
import { CURRENT_PLANNING_SCHEMA_VERSION, CURRENT_SLIDE_IR_VERSION, upgradeSlideIr } from "../scripts/lib/ir-version.mjs";

const upgraded = upgradeSlideIr({ schemaVersion: "1.0", slides: [{ id: "S1", pageComposition: "standard", geometry: "matrix", layout: { stale: true }, modules: [{ type: "table", expression: { type: "table" }, dataShape: { stale: true }, layout: { stale: true } }] }] });
assert.equal(upgraded.schemaVersion, CURRENT_SLIDE_IR_VERSION);
assert.equal(upgraded.planningSchemaVersion, CURRENT_PLANNING_SCHEMA_VERSION);
assert.equal(upgraded.slides[0].pageComposition, undefined);
assert.equal(upgraded.slides[0].geometry, undefined);
assert.equal(upgraded.slides[0].modules[0].expression, undefined);
assert.equal(upgraded.upgradedFrom, "1.0");
console.log(JSON.stringify({ passed: true, tests: 6 }));
