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
console.log(JSON.stringify({ passed: true, tests: 6 }));
