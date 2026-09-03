#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { locateHtmlCore, runNode, skillRoot, skillVersion, theme, themeCss } from "./lib/config.mjs";
import { readTaskCard } from "./lib/task-card.mjs";
import { writePptxMetadata, writePptxSyncPayload } from "./lib/pptx-metadata.mjs";
import { snapshotPpt } from "./lib/ppt-state.mjs";

const project = path.resolve(process.argv[2] || ""), taskFile = path.resolve(process.argv[3] || ""), sectionId = String(process.argv[4] || ""), output = path.resolve(process.argv[5] || "");
if (!project || !taskFile || !sectionId || !output || !fs.existsSync(project) || !fs.existsSync(taskFile)) { console.error("Usage: build-section-ppt.mjs html-project task-card.json section-id output.pptx"); process.exit(2); }
const sha = value => crypto.createHash("sha256").update(value).digest("hex");

function applyMintFreshTheme(layout) {
  const replacements = new Map([
    ["#18312a", theme.palette.ink], ["#087c66", theme.palette.mint], ["#f7fbf9", theme.palette.page],
    ["#eaf4f0", theme.palette.mintLight], ["#eef7f3", theme.palette.mintLight], ["#d4e2dd", theme.palette.line],
    ["#586b65", theme.palette.muted], ["#69766f", theme.palette.muted]
  ]);
  const visit = value => {
    if (Array.isArray(value)) return value.map(visit);
    if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, visit(item)]));
    if (typeof value === "string") return replacements.get(value.toLowerCase()) || value;
    return value;
  };
  const themed = visit(layout), names = new Set();
  for (const [sceneIndex, scene] of themed.scenes.entries()) for (const [objectIndex, object] of scene.objects.entries()) {
    const identity = `${scene.id}|${object.kind}|${object.fieldPath || ""}|${object.elementId || ""}|${objectIndex}`;
    object.pptObjectName = `mint|${object.kind}|${sha(identity).slice(0, 20)}`;
    if (names.has(object.pptObjectName)) throw new Error(`PPT object identity collision in scene ${sceneIndex + 1}`);
    names.add(object.pptObjectName);
  }
  return themed;
}

let temporary = null;
try {
  if (!process.env.RUNTIME_NODE_MODULES || !process.env.RUNTIME_NODE) throw new Error("RUNTIME_NODE and RUNTIME_NODE_MODULES are required; load workspace dependencies first");
  const task = readTaskCard(taskFile), section = task.sections.find(item => item.sectionId === sectionId);
  if (!section) throw new Error(`Section ${sectionId} is not assigned by the task card`);
  const report = path.join(project, "report.html"), stateFile = path.join(project, "project-state.json"), qaFile = path.join(project, "qa-report.json"), visualFile = path.join(project, "visual-qa.json");
  if (![report, stateFile, qaFile, visualFile].every(fs.existsSync)) throw new Error("A reviewed internal HTML project with report.html, project-state.json, qa-report.json, and visual-qa.json is required");
  const state = JSON.parse(fs.readFileSync(stateFile, "utf8")), qa = JSON.parse(fs.readFileSync(qaFile, "utf8")), visual = JSON.parse(fs.readFileSync(visualFile, "utf8"));
  if (!/^(review|revision)-ready$/.test(String(state.deliveryStatus || "")) || qa.passed !== true || visual.passed !== true) throw new Error("Internal HTML project has not passed Review/Revision");
  const htmlCore = locateHtmlCore(); temporary = fs.mkdtempSync(path.join(os.tmpdir(), "mint-ppt-stage-")); const staged = path.join(temporary, "section.html"), layout = path.join(temporary, "ppt-layout.json"), renderDir = path.join(temporary, "render");
  const original = fs.readFileSync(report, "utf8"), themed = original.replace("</head>", `<style data-mint-ppt-theme=\"${theme.themeVersion}\">${themeCss()}</style></head>`);
  fs.writeFileSync(staged, themed); fs.mkdirSync(path.dirname(output), { recursive: true });
  runNode(htmlCore.extract, [staged, layout]);
  const themedLayout = applyMintFreshTheme(JSON.parse(fs.readFileSync(layout, "utf8")));
  fs.writeFileSync(layout, `${JSON.stringify(themedLayout, null, 2)}\n`);
  runNode(htmlCore.exporter, [layout, output, renderDir], { env: { MINT_PPT_THEME_FILE: path.join(skillRoot, "assets/mint-fresh-theme/design-tokens.json") } });
  const baseline = await snapshotPpt(output), sectionWorkfile = path.join(temporary, `${section.sectionId}.mint-section.html`);
  runNode(htmlCore.collaboration, ["pack-section", project, taskFile, sectionId, sectionWorkfile]);
  const bindings = themedLayout.scenes.flatMap((scene, slideIndex) => scene.objects.map((object, objectIndex) => ({
    slide: slideIndex + 1, sceneId: scene.id, kind: object.kind, objectName: object.pptObjectName,
    fieldPath: object.fieldPath || null, elementId: object.elementId || null, contentId: object.contentId || null,
    selector: object.fieldPath ? `[data-field-path="${object.fieldPath}"]` : object.elementId ? `[data-element-id="${object.elementId}"]` : null,
    baselineFrame: object.frame, baselineValue: object.kind === "text" ? object.text : object.value ?? null, objectIndex
  })));
  const syncPayload = await writePptxSyncPayload(output, { schemaVersion: "1.0", reportId: task.reportId, sectionId, taskCardHash: task.taskCardHash, skillVersion, themeVersion: theme.themeVersion, workfileBase64: fs.readFileSync(sectionWorkfile).toString("base64"), bindings, baseline });
  const modelFile = path.join(project, "report-model.json"), sourceFile = path.join(project, "source-lock.json"), modelHash = fs.existsSync(modelFile) ? sha(fs.readFileSync(modelFile)) : sha(original), sourceHash = fs.existsSync(sourceFile) ? sha(fs.readFileSync(sourceFile)) : "unavailable";
  await writePptxMetadata(output, {
    MintReportId: task.reportId, MintReportTitle: task.title, MintSectionId: section.sectionId, MintSectionOrder: section.order,
    MintSectionOwner: section.owner, MintThemeVersion: task.themeVersion, MintPptMasterVersion: task.pptMasterVersion,
    MintSkillVersion: skillVersion, MintHtmlCoreVersion: htmlCore.version, MintTaskCardHash: task.taskCardHash,
    MintModelHash: modelHash, MintSourceHash: sourceHash, MintSyncPayloadHash: syncPayload.hash,
    MintGeneratedAt: new Date().toISOString(), MintAuthority: "ppt-review-carrier"
  });
  runNode(path.join(skillRoot, "scripts/audit-section-ppt.mjs"), [output, taskFile, sectionId, `--output=${path.join(temporary, "audit.json")}`]);
  const result = { passed: true, output, reportId: task.reportId, sectionId, owner: section.owner, slidesSource: report, skillVersion, themeVersion: theme.themeVersion, authority: "ppt-review-carrier", finalPublication: "html", syncPayloadBytes: syncPayload.packedBytes };
  fs.writeFileSync(path.join(project, "ppt-section-manifest.json"), `${JSON.stringify({ ...result, contentHash: sha(fs.readFileSync(output)), generatedAt: new Date().toISOString() }, null, 2)}\n`);
  console.log(JSON.stringify(result, null, 2));
} catch (error) { console.error(JSON.stringify({ passed: false, error: error.message }, null, 2)); process.exitCode = 1; }
finally { if (temporary) fs.rmSync(temporary, { recursive: true, force: true }); }
