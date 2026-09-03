import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";
import { inspectPptxPackage, readPptxMetadata, readPptxSyncPayload } from "./pptx-metadata.mjs";
import { readTaskCard } from "./task-card.mjs";

const forbidden = [/report\.mint-(?:task|ppt-task)\.json/i, /任务边界/, /\bsource[-_ ]unit\b/i, /\bcontentHash\b/i, /\b大纲\s*\d+/];

function packageChecks(pkg, metadata, task, expectedSection, mode) {
  const issues = [];
  if (!pkg.slides.length) issues.push("PPTX has no slides");
  if (!pkg.slideSize || Math.abs(pkg.slideSize.ratio - 16 / 9) > 0.002) issues.push("Slide size is not 16:9");
  if (pkg.hasExternalMedia) issues.push("External media relationship is forbidden");
  if (pkg.hasPageChrome) issues.push("Visible date/footer/page-number placeholder is forbidden");
  for (const pattern of forbidden) if (pattern.test(pkg.visibleText)) issues.push(`Visible audit metadata matched ${pattern}`);
  if (metadata.MintReportId !== task.reportId) issues.push("MintReportId does not match task card");
  if (metadata.MintThemeVersion !== task.themeVersion) issues.push("MintThemeVersion does not match task card");
  if (metadata.MintSkillVersion !== task.skillVersion) issues.push("MintSkillVersion does not match task card");
  if (mode === "section" && metadata.MintSectionId !== expectedSection) issues.push("MintSectionId does not match requested section");
  return issues;
}

async function visualChecks(file, outputDir) {
  if (!process.env.RUNTIME_NODE_MODULES) throw new Error("RUNTIME_NODE_MODULES is required");
  const require = createRequire(path.join(process.env.RUNTIME_NODE_MODULES, "package.json"));
  const { FileBlob, PresentationFile } = await import(pathToFileURL(require.resolve("@oai/artifact-tool")).href);
  const presentation = await PresentationFile.importPptx(await FileBlob.load(file));
  fs.mkdirSync(outputDir, { recursive: true });
  const slides = presentation.slides?.items || [], results = [], issues = [];
  for (let index = 0; index < slides.length; index++) {
    const slide = slides[index], stem = `slide-${String(index + 1).padStart(2, "0")}`;
    const png = await presentation.export({ slide, format: "png", scale: 1 }); fs.writeFileSync(path.join(outputDir, `${stem}.png`), new Uint8Array(await png.arrayBuffer()));
    const layoutBlob = await slide.export({ format: "layout" }), layout = JSON.parse(await layoutBlob.text()); fs.writeFileSync(path.join(outputDir, `${stem}.layout.json`), `${JSON.stringify(layout, null, 2)}\n`);
    const elements = layout.elements || [], outOfBounds = elements.filter(item => { const box = item.bbox || []; return box.length < 4 || !box.every(Number.isFinite) || box[2] <= 0 || box[3] <= 0 || box[0] < -0.5 || box[1] < -0.5 || box[0] + box[2] > 1920.5 || box[1] + box[3] > 1080.5; });
    const overShrunk = elements.filter(item => item.text && Number(item.resolvedTextStyle?.autoFitScale || 1) < 0.65);
    if (outOfBounds.length) issues.push(`Slide ${index + 1} has ${outOfBounds.length} out-of-bounds objects`);
    if (overShrunk.length) issues.push(`Slide ${index + 1} has ${overShrunk.length} severely auto-shrunk text objects`);
    results.push({ slide: index + 1, elements: elements.length, outOfBounds: outOfBounds.length, overShrunk: overShrunk.length });
  }
  return { slides: slides.length, results, issues };
}

export async function auditPpt({ file, taskFile, sectionId = null, mode = "section", output = null }) {
  const task = readTaskCard(taskFile), pkg = await inspectPptxPackage(file), metadata = await readPptxMetadata(file), renderDir = path.join(path.dirname(output || file), `${path.basename(file, path.extname(file))}-audit-render`);
  const issues = packageChecks(pkg, metadata, task, sectionId, mode); let sync = null;
  if (mode === "section") { try { sync = await readPptxSyncPayload(file); if (sync.hash !== metadata.MintSyncPayloadHash || sync.payload.sectionId !== sectionId || sync.payload.taskCardHash !== task.taskCardHash) issues.push("Embedded PPT-to-HTML sync payload identity mismatch"); } catch (error) { issues.push(error.message); } }
  const visual = await visualChecks(file, renderDir); issues.push(...visual.issues);
  const report = { schemaVersion: "1.0", passed: issues.length === 0, mode, file, taskCard: taskFile, reportId: task.reportId, sectionId, metadata, sync: sync ? { hash: sync.hash, bindings: sync.payload.bindings?.length || 0, baselineSlides: sync.payload.baseline?.slides || 0 } : null, package: { slides: pkg.slides.length, charts: pkg.charts.length, media: pkg.media.length, nativeTables: pkg.nativeTables, nativeShapes: pkg.nativeShapes, slideSize: pkg.slideSize, externalMedia: pkg.hasExternalMedia, pageChrome: pkg.hasPageChrome }, visual, issues, generatedAt: new Date().toISOString() };
  if (output) fs.writeFileSync(output, `${JSON.stringify(report, null, 2)}\n`);
  return report;
}
