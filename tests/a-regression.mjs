import assert from "node:assert/strict";
import { resolveSlideExpressions } from "../scripts/lib/expression-router.mjs";
import { layoutSlide, layoutIssues } from "../scripts/lib/geometry-engine.mjs";
import { presentationIntentIssues } from "../scripts/lib/presentation-gates.mjs";
import { theme } from "../scripts/lib/config.mjs";

function resolve(slide) { return resolveSlideExpressions({ role: "content", density: "standard", evidenceRefs: ["SU-1"], ...slide }); }

const p2 = resolve({ id: "P2", managementQuestion: "压降后损益结构发生了什么变化？", claim: "压降后亏损收窄286.1万美元", semanticIntent: "comparison", modules: [{ type: "table", semanticRole: "primaryEvidence", data: { exactLookup: true, values: [["损益科目", "26年初", "27预算", "27压降后", "压降额"], ["项目损益", "-716.7", "-743.9", "-472.3", "286.1"], ["总成本", "716.7", "857.6", "486.0", "371.6"]] } }] });
assert.equal(p2.modules[0].expression.type, "chart");
assert.match(p2.modules[0].data.series[0].name, /压降额/);

const p3 = resolve({ id: "P3", managementQuestion: "主要压降项是什么？", claim: "人力与IT是主要压降项", semanticIntent: "comparison", modules: [{ type: "table", semanticRole: "primaryEvidence", data: { exactLookup: true, values: [["成本项目", "压降额"], ["人力", "203.3"], ["IT咨询", "89.6"], ["职场", "42.8"], ["营销", "12"], ["法务", "8"], ["云资源", "6"], ["数据", "5"], ["支付", "4"], ["外包", "3"], ["差旅", "2"], ["其他", "1"]] } }] });
assert.equal(p3.modules[0].expression.variant, "sorted-bar");
assert.equal(p3.modules[0].data.categories.length, 11);

const p7 = resolve({ id: "P7", managementQuestion: "四国获客底盘有多大，白名单质量如何？", claim: "肯尼亚白名单质量较高，尼日利亚规模最大", semanticIntent: "comparison", modules: [{ type: "table", semanticRole: "primaryEvidence", data: { exactLookup: true, values: [["国家", "人口", "月活", "筛选白名单", "白名单/月活"], ["肯尼亚", "5800万", "1700万", "390万", "22.9%"], ["坦桑尼亚", "6700万", "1300万", "210万", "16.2%"], ["科特迪瓦", "3100万", "900万", "130万", "14.4%"], ["尼日利亚", "2.37亿", "5200万", "420万", "8.1%"]] } }] });
assert.equal(p7.modules[0].expression.variant, "comparison-small-multiples");
assert.ok(p7.modules[0].data.series.some(item => item.unitKind === "percent"));
assert.ok(p7.modules[0].data.series.some(item => item.values.includes(23700)), "2.37亿 must normalize to 23700万");

const p8 = resolve({ id: "P8", managementQuestion: "各国应该如何进入？", claim: "各国按风险收益特征采用不同进入策略", semanticIntent: "matrix", modules: [{ type: "table", semanticRole: "primaryEvidence", data: { values: [["国家", "额度", "利率", "期限", "损失", "进入方式"], ["肯尼亚", "高", "中", "短", "低", "先行"], ["坦桑尼亚", "中", "中", "短", "中", "跟进"]] } }] });
assert.equal(p8.modules[0].expression.variant, "decision-matrix");
assert.equal(layoutSlide(p8, theme).geometry, "matrix");

const relationshipCards = { slides: [resolve({ id: "P4", managementQuestion: "谁向谁提供什么？", claim: "传音银行、MintFin与WeFi分工承接", semanticIntent: "role-relationship", modules: [{ type: "text", text: "传音银行" }, { type: "text", text: "MintFin" }, { type: "text", text: "WeFi" }, { type: "callout", text: "投入与计价" }] })] };
assert.match(presentationIntentIssues(relationshipCards).join(" "), /no relationship diagram/);

const sparseCards = resolve({ id: "P1", managementQuestion: "预算如何安排？", claim: "H1以486万美元运行MVP，H2按需追加30万美元", semanticIntent: "comparison", modules: [{ type: "text", text: "H1" }, { type: "text", text: "MVP" }, { type: "text", text: "H2" }, { type: "text", text: "30万美元" }] });
const sparseLayout = layoutSlide(sparseCards, theme);
assert.equal(sparseLayout.showManagementQuestion, undefined);
assert.ok(layoutIssues(sparseLayout, theme).some(issue => /occupancy/.test(issue)));

console.log(JSON.stringify({ passed: true, tests: 14 }));
