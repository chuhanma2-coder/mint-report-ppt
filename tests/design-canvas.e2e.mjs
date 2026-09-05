import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";
import { theme } from "../scripts/lib/config.mjs";
import { writeDesignCanvas } from "../scripts/lib/design-canvas.mjs";
import { applyDomLayout, extractDesignLayout } from "../scripts/lib/dom-layout-extractor.mjs";
import { renderPresentation, exportPresentation } from "../scripts/lib/ppt-renderer.mjs";
import { inspectPptxPackage } from "../scripts/lib/pptx-metadata.mjs";
import { compareRenderedSlides } from "../scripts/lib/visual-parity.mjs";

if (!process.env.RUNTIME_NODE_MODULES) throw new Error("RUNTIME_NODE_MODULES is required");
const folder = fs.mkdtempSync(path.join(os.tmpdir(), "mint-design-canvas-")), imageFile = path.join(folder, "architecture.svg");
fs.writeFileSync(imageFile, `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="650"><rect width="1200" height="650" rx="28" fill="#eef7f3"/><rect x="80" y="180" width="280" height="240" rx="20" fill="#00866a"/><rect x="460" y="180" width="280" height="240" rx="20" fill="#1686a6"/><rect x="840" y="180" width="280" height="240" rx="20" fill="#e98245"/><path d="M360 300h100M740 300h100" stroke="#18312a" stroke-width="18"/><text x="220" y="315" text-anchor="middle" font-size="48" fill="white">客户</text><text x="600" y="315" text-anchor="middle" font-size="48" fill="white">平台</text><text x="980" y="315" text-anchor="middle" font-size="48" fill="white">银行</text></svg>`);

const slides = [
  { id: "finance", role: "content", claim: "压降主要来自人力与IT咨询费", semanticIntent: "contribution", pageComposition: "standard", modules: [
    { id: "f-chart", type: "chart", semanticRole: "primaryEvidence", visualPriority: "P1", expression: { type: "chart", variant: "waterfall", focusCategories: ["人力", "IT"] }, data: { categories: ["人力", "IT", "职场", "运营"], series: [{ name: "压降", values: [-203.3, -89.6, -42.8, 12] }], start: 857.6 } },
    { id: "f-callout", type: "callout", semanticRole: "managementConclusion", visualPriority: "P0", title: "管理含义", text: "能力底座不减配，优先压缩弹性投入。", expression: { type: "callout", variant: "conclusion" } },
    { id: "f-detail", type: "callout", semanticRole: "supportingEvidence", visualPriority: "P1", title: "压降抓手", text: "人力压降203.3万美元，IT咨询费压降89.6万美元，职场压降42.8万美元。", expression: { type: "callout", variant: "evidence" } },
    { id: "f-boundary", type: "callout", semanticRole: "boundary", visualPriority: "P1", title: "能力边界", text: "DEV与SIT环境保持不变，避免以削弱交付底座换取短期成本下降。", expression: { type: "callout", variant: "boundary" } }
  ] },
  { id: "image", role: "content", claim: "架构原图是主证据，三项说明在右侧形成阅读顺序", semanticIntent: "system-architecture", pageComposition: "evidence-rich", modules: [
    { id: "architecture", type: "image", semanticRole: "primaryEvidence", visualPriority: "P0", imagePath: imageFile, expression: { type: "image", variant: "evidence" } },
    { id: "i1", type: "callout", semanticRole: "context", visualPriority: "P1", title: "客户入口", text: "统一承接业务触达。", expression: { type: "callout", variant: "context" } },
    { id: "i2", type: "callout", semanticRole: "decision", visualPriority: "P1", title: "平台分工", text: "复用底座并按需改造。", expression: { type: "callout", variant: "decision" } },
    { id: "i3", type: "callout", semanticRole: "action", visualPriority: "P1", title: "落地动作", text: "本地生态通过网关接入。", expression: { type: "callout", variant: "action" } }
  ] },
  { id: "matrix", role: "content", claim: "肯尼亚先验证闭环，其余三国按风险收益特征推进", semanticIntent: "matrix", pageComposition: "standard", modules: [
    { id: "m-table", type: "table", tableRole: "supporting", semanticRole: "primaryEvidence", visualPriority: "P1", expression: { type: "table", variant: "highlighted-table", focusRows: ["肯尼亚"] }, data: { headers: ["国家", "额度", "利率", "期限", "损失", "动作"], rows: [["肯尼亚", "中", "较高", "中", "中", "先验证"], ["坦桑尼亚", "低", "中", "中", "中", "边跑边校准"], ["科特迪瓦", "高", "低", "高", "低", "验证后承接"], ["尼日利亚", "低", "高", "低", "高", "设置门槛"]] } },
    { id: "m-callout", type: "callout", semanticRole: "decision", visualPriority: "P0", title: "进入原则", text: "先用肯尼亚验证产品模式，再依据各国特征决定切入方式。", expression: { type: "callout", variant: "decision" } },
    { id: "m-risk", type: "callout", semanticRole: "risk", visualPriority: "P1", title: "风险门槛", text: "尼日利亚损失较高，进入前先设定可验证的损失门槛。", expression: { type: "callout", variant: "risk" } },
    { id: "m-action", type: "callout", semanticRole: "action", visualPriority: "P1", title: "后续动作", text: "坦桑尼亚低额度切入；科特迪瓦在验证完成后再承接规模增长。", expression: { type: "callout", variant: "action" } }
  ] }
];
const ir = { slides }, htmlFile = path.join(folder, "design.html"), designDir = path.join(folder, "design-render"), pptx = path.join(folder, "poc.pptx"), pptDir = path.join(folder, "ppt-render");
writeDesignCanvas(ir, theme, htmlFile);
const manifest = await extractDesignLayout({ htmlFile, outputDir: designDir, expectedSlides: 3 });
assert.deepEqual(manifest.issues, []);
const laid = applyDomLayout(ir, manifest), { presentation } = await renderPresentation(laid, theme); await exportPresentation(presentation, pptx);
const pkg = await inspectPptxPackage(pptx); assert.equal(pkg.slides.length, 3); assert.ok(pkg.nativeTables >= 1); assert.ok(pkg.charts.length >= 0); assert.ok(pkg.media.length >= 1); assert.equal(pkg.fullSlideImages.length, 0);
const require = createRequire(path.join(process.env.RUNTIME_NODE_MODULES, "package.json")), { FileBlob, PresentationFile } = await import(pathToFileURL(require.resolve("@oai/artifact-tool")).href), imported = await PresentationFile.importPptx(await FileBlob.load(pptx)); fs.mkdirSync(pptDir);
for (const [index, slide] of imported.slides.items.entries()) { const png = await imported.export({ slide, format: "png", scale: 1 }); fs.writeFileSync(path.join(pptDir, `slide-${String(index + 1).padStart(2, "0")}.png`), new Uint8Array(await png.arrayBuffer())); }
const parity = await compareRenderedSlides({ referenceDir: designDir, candidateDir: pptDir, slideCount: 3, outputFile: path.join(folder, "parity.json") }); assert.equal(parity.passed, true, parity.issues.join("; "));
console.log(JSON.stringify({ passed: true, tests: 8, folder, occupancy: manifest.slides.map(slide => slide.visualOccupancy), parity: parity.results.map(item => item.perceptualDifference) }));
