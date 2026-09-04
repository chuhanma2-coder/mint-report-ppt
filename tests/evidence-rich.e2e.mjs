import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { resolveSlideExpressions } from "../scripts/lib/expression-router.mjs";
import { layoutIssues, layoutSlide } from "../scripts/lib/geometry-engine.mjs";
import { exportPresentation, renderPresentation } from "../scripts/lib/ppt-renderer.mjs";
import { theme } from "../scripts/lib/config.mjs";

const slide = {
  id: "ER1", role: "content", claim: "资源底盘、转化路径与经营结果在一页形成完整证据链", managementQuestion: "现有资源如何转化为经营结果？",
  semanticIntent: "comparison", density: "dense", pageComposition: "evidence-rich", outlineItem: "4", storyCluster: "resource-to-result",
  evidenceBundle: { contextRefs: ["E1", "E2"], primaryEvidenceRefs: ["E3", "E4"], supportingEvidenceRefs: ["E5"], riskRefs: ["E6"], actionRefs: ["E7"] },
  modules: [
    { id: "M1", type: "metric", semanticRole: "context", compositionBand: "lead", title: "可经营白名单", value: "390", unit: "万", evidenceRefs: ["E1"] },
    { id: "M2", type: "metric", semanticRole: "context", compositionBand: "lead", title: "智能机设备池", value: "970+", unit: "万", evidenceRefs: ["E2"] },
    { id: "M3", type: "chart", semanticRole: "primaryEvidence", compositionBand: "primary", semanticIntent: "comparison", data: { categories: ["曝光", "安装", "核额", "DD"], series: [{ name: "月度规模", values: [5850, 10, 2.5, 1.88] }] }, evidenceRefs: ["E3"] },
    { id: "M4", type: "diagram", semanticRole: "primaryEvidence", compositionBand: "primary", semanticIntent: "process", data: { nodes: [{ id: "a", label: "主动触达" }, { id: "b", label: "安装" }, { id: "c", label: "核额" }, { id: "d", label: "DD" }], edges: [{ from: "a", to: "b" }, { from: "b", to: "c" }, { from: "c", to: "d" }] }, evidenceRefs: ["E4"] },
    { id: "M5", type: "metric", semanticRole: "progress", compositionBand: "result", title: "规划效率", value: "7.6", unit: "x", evidenceRefs: ["E5"] },
    { id: "M6", type: "callout", semanticRole: "risk", compositionBand: "result", title: "边界", text: "历史案例只用于校准参数，仍需肯尼亚MVP验证。", evidenceRefs: ["E6"] },
    { id: "M7", type: "callout", semanticRole: "action", compositionBand: "result", title: "下一步", text: "优先验证白名单主动触达，再扩展新机入口。", evidenceRefs: ["E7"] }
  ]
};
const laid = layoutSlide(resolveSlideExpressions(slide), theme);
assert.deepEqual(layoutIssues(laid, theme), []);
const output = path.join(os.tmpdir(), "mint-report-ppt-evidence-rich.pptx");
const { presentation } = await renderPresentation({ slides: [laid] }, theme);
await exportPresentation(presentation, output);
assert.ok(fs.statSync(output).size > 10000);
console.log(JSON.stringify({ passed: true, tests: 2, output, occupancy: laid.layout.occupancy }));
