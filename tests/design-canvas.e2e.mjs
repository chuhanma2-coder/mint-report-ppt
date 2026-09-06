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
import { auditFinalFacts } from "../scripts/lib/final-facts.mjs";

if (!process.env.RUNTIME_NODE_MODULES) throw new Error("RUNTIME_NODE_MODULES is required");
const folder = fs.mkdtempSync(path.join(os.tmpdir(), "mint-design-canvas-")), imageFile = path.join(folder, "architecture.svg");
fs.writeFileSync(imageFile, `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="650"><rect width="1200" height="650" rx="28" fill="#eef7f3"/><rect x="80" y="180" width="280" height="240" rx="20" fill="#00866a"/><rect x="460" y="180" width="280" height="240" rx="20" fill="#1686a6"/><rect x="840" y="180" width="280" height="240" rx="20" fill="#e98245"/><path d="M360 300h100M740 300h100" stroke="#18312a" stroke-width="18"/><text x="220" y="315" text-anchor="middle" font-size="48" fill="white">客户</text><text x="600" y="315" text-anchor="middle" font-size="48" fill="white">平台</text><text x="980" y="315" text-anchor="middle" font-size="48" fill="white">银行</text></svg>`);

const slides = [
  { id: "finance", role: "content", claim: "压降主要来自人力与IT咨询费", semanticIntent: "contribution", pageComposition: "standard", modules: [
    { id: "f-chart", type: "chart", semanticRole: "primaryEvidence", visualPriority: "P1", expression: { type: "chart", variant: "waterfall", focusCategories: ["人力", "IT"] }, data: { categories: ["人力", "IT", "职场", "运营"], series: [{ name: "压降", values: [-203.3, -89.6, -42.8, 12] }], start: 857.6, end: 533.9 } },
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
slides.push({id:'relations',role:'content',claim:'条件与方向保留',modules:[{
  id:'relation',type:'diagram',semanticRole:'primaryEvidence',expression:{type:'diagram',variant:'role-network'},
  data:{nodes:[{id:'long',label:'项目主体\n银行甲\n银行乙',text:'共同承担项目交付'},{id:'short',label:'服务商',text:'验收后提供运行支持'},{id:'isolated',label:'独立核验',text:'范围仅限已验收项目'}],edges:[{from:'long',to:'short',label:'支付服务费',condition:'仅在验收通过后'}]}
}]});
const ir = { slides }, htmlFile = path.join(folder, "design.html"), designDir = path.join(folder, "design-render"), pptx = path.join(folder, "poc.pptx"), pptDir = path.join(folder, "ppt-render");
slides[0].modules[0].text='图表独有说明：弹性投入按当前口径保留。';
slides[2].modules[0].title = '四国策略比较';
slides[1].modules[0].imageTextReview = {status:'reviewed',regions:[{id:'labels',text:'客户 平台 银行',minimumGlyphHeightPx:40}]};
writeDesignCanvas(ir, theme, htmlFile);
const manifest = await extractDesignLayout({ htmlFile, outputDir: designDir, expectedSlides: 4 });
assert.deepEqual(manifest.issues, []);
assert(manifest.slides[0].modules[0].textObjects.some(t=>t.text==='图表独有说明：弹性投入按当前口径保留。'));
const imageLayout=manifest.slides[1].modules, primary=imageLayout[0];
assert.ok(imageLayout.slice(1).every(m=>m.rect.left > primary.rect.left + primary.rect.width),'all image explanations must occupy the right rail');
assert.ok(imageLayout[2].rect.top > imageLayout[1].rect.top && imageLayout[3].rect.top > imageLayout[2].rect.top,'the rail stacks vertically');
assert.ok(new Set(manifest.slides.flatMap(s=>s.modules.flatMap(m=>m.textObjects.filter(t=>t.className==='module-title').map(t=>t.color)))).size >= 3,'semantic headings must not collapse to one green');
const shortCopy = imageLayout[1].textObjects.find(t=>t.className==='module-copy');
assert.ok(shortCopy.contentRect.height >= shortCopy.inkRect.height,'measured prose retains a baseline guard');
assert.ok(shortCopy.contentRect.height < shortCopy.fontSizePx * 2,'frozen single-line prose must not reserve a second empty line');
for (const copy of manifest.slides.flatMap(s=>s.modules.flatMap(m=>m.textObjects)).filter(t=>t.className==='module-copy')) {
  assert.equal(copy.renderText.replace(/\s/g,''),copy.text.replace(/\s/g,''),'measured line breaks must preserve every character');
}
const countryCells = manifest.slides[2].modules[0].table.rows.slice(1).map(row=>row.cells[0]);
assert.ok(countryCells.every(cell=>cell.contentRect.width >= cell.fontSizePx * 4),'country names must not be forced into one-character columns');
assert.ok(manifest.slides[2].modules[0].table.rect.width < 1000, 'short qualitative table must use natural width');
const relation = manifest.slides[3].modules[0].diagramRelations[0];
for(const text of ['共同承担项目交付','验收后提供运行支持','范围仅限已验收项目']) assert(manifest.slides[3].modules[0].text.includes(text),'Sparse graphs must render node summaries, not just names');
assert.ok(Math.abs(relation.nodes[0].rect.height - relation.nodes[1].rect.height) < 1,'connector sites must be aligned');
assert.ok(relation.label.rect.top + relation.label.rect.height < relation.nodes[0].rect.top + relation.nodes[0].rect.height / 2,'the relation label must clear the connector lane');
const laid = applyDomLayout(ir, manifest), { presentation } = await renderPresentation(laid, theme); await exportPresentation(presentation, pptx);
const pkg = await inspectPptxPackage(pptx); assert.equal(pkg.slides.length, 4); assert.ok(pkg.nativeTables >= 1); assert.ok(pkg.charts.length >= 0); assert.ok(pkg.media.length >= 1); assert.equal(pkg.fullSlideImages.length, 0);
const relationXml = await pkg.zip.file('ppt/slides/slide4.xml').async('string');
assert((await pkg.zip.file('ppt/slides/slide1.xml').async('string')).includes('图表独有说明'),'Chart display copy must survive native compilation');
for(const text of ['共同承担项目交付','验收后提供运行支持','范围仅限已验收项目']) assert(relationXml.includes(text),'Native sparse graph summaries survive compilation');
for(const id of ['long','short','isolated']) assert(relationXml.includes('fact-target:'+id),'Sparse and connected native nodes preserve exact fact scope');
assert.match(relationXml, /<p:cxnSp>/, 'relations must be real connected shapes');
assert.match(relationXml, /<a:tailEnd[^>]*type="triangle"/, 'the exported arrow must have its actual direction marker');
const require = createRequire(path.join(process.env.RUNTIME_NODE_MODULES, "package.json")), { FileBlob, PresentationFile } = await import(pathToFileURL(require.resolve("@oai/artifact-tool")).href), imported = await PresentationFile.importPptx(await FileBlob.load(pptx)); fs.mkdirSync(pptDir);
const layouts = [];
for (const [index, slide] of imported.slides.items.entries()) { const png = await imported.export({ slide, format: "png", scale: 1 }); fs.writeFileSync(path.join(pptDir, `slide-${String(index + 1).padStart(2, "0")}.png`), new Uint8Array(await png.arrayBuffer())); layouts.push(JSON.parse(await (await slide.export({format:'layout'})).text())); }
const nativeTableTitle = layouts[2].elements.find(e=>e.name?.includes('mint|table-title|'));
assert.ok(nativeTableTitle,'the color regression requires a native table title');
assert.ok(nativeTableTitle.paragraphs.flatMap(p=>p.runs || []).every(r=>r.color.toLowerCase()===theme.semanticColors.roleAccents.primaryEvidence.toLowerCase()),'native table title must preserve measured semantic color');
const imageModule = laid.slides[1].modules[0];
imageModule.visibleFacts = [{sourceUnitId:'image-labels',text:'客户 平台 银行'}];
const source = {sourceUnits:[{id:'image-labels',visibility:'required-visible',text:'客户 平台 银行'}]};
const facts = await auditFinalFacts({file:pptx,source,ir:laid,layouts});
assert.deepEqual(facts.issues, [], 'final embedded image must retain readable reviewed text');
const tiny = structuredClone(layouts), embedded = tiny[1].elements.find(e=>e.kind==='image');
embedded.bbox[2] /= 10; embedded.bbox[3] /= 10;
const unreadable = await auditFinalFacts({file:pptx,source,ir:laid,layouts:tiny});
assert.ok(unreadable.issues.some(issue=>issue.includes('IMAGE_FINE_TEXT')), 'unchanged image bytes cannot bypass final displayed-size checking');
const parity = await compareRenderedSlides({ referenceDir: designDir, candidateDir: pptDir, slideCount: 4, outputFile: path.join(folder, "parity.json") }); assert.equal(parity.passed, true, parity.issues.join("; "));
console.log(JSON.stringify({ passed: true, tests: 8, folder, occupancy: manifest.slides.map(slide => slide.visualOccupancy), parity: parity.results.map(item => item.perceptualDifference) }));
