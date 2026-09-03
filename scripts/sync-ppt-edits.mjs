#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { locateHtmlCore, runNode, skillVersion, theme } from "./lib/config.mjs";
import { readTaskCard } from "./lib/task-card.mjs";
import { readPptxMetadata, readPptxSyncPayload } from "./lib/pptx-metadata.mjs";
import { snapshotPpt } from "./lib/ppt-state.mjs";

const pptx = path.resolve(process.argv[2] || ""), taskFile = path.resolve(process.argv[3] || ""), sectionId = String(process.argv[4] || ""), output = path.resolve(process.argv[5] || "");
if (![pptx, taskFile].every(fs.existsSync) || !sectionId || !output) { console.error("Usage: sync-ppt-edits.mjs current.pptx task-card.json section-id output.mint-section.html"); process.exit(2); }
const sha = value => crypto.createHash("sha256").update(value).digest("hex");
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const close = (a, b, tolerance = 2) => Math.abs(Number(a || 0) - Number(b || 0)) <= tolerance;
const frameChanged = (before, after) => !before || !after || ![0, 1, 2, 3].every(index => close([before.left, before.top, before.width, before.height][index], after[index], 4));
const safeCss = value => String(value).replaceAll("\\", "\\\\").replaceAll('"', '\\"');

function setField(model, fieldPath, value) {
  const parts = String(fieldPath || "").split(".");
  if (!parts.length || parts.some(part => !part || ["__proto__", "constructor", "prototype"].includes(part))) throw new Error(`Unsafe field path ${fieldPath}`);
  let current = model;
  for (const part of parts.slice(0, -1)) { if (!current[part] || typeof current[part] !== "object") throw new Error(`Unknown field path ${fieldPath}`); current = current[part]; }
  if (!Object.hasOwn(current, parts.at(-1))) throw new Error(`Unknown field path ${fieldPath}`);
  current[parts.at(-1)] = value;
}

function chartType(original, current) {
  if (current.chartType !== "bar") return current.chartType || original.type;
  return current.barDirection === "bar" ? "horizontal-bar" : original.type === "stacked-bar" ? "stacked-bar" : "bar";
}

function mediaValue(original, current, baseline) {
  const next = { ...original };
  if (current.mediaHash !== baseline.mediaHash) next.dataUrl = current.dataUrl;
  const crop = current.crop;
  if (crop && [crop.left, crop.right, crop.top, crop.bottom].every(Number.isFinite)) {
    const removedX = crop.left + crop.right, removedY = crop.top + crop.bottom, removed = Math.max(removedX, removedY);
    if (removed > 0.0001 && removed < 0.95) {
      next.scale = Number((1 / (1 - removed)).toFixed(4));
      next.positionX = Number(((crop.left / Math.max(removedX, 0.0001)) * 100).toFixed(2));
      next.positionY = Number(((crop.top / Math.max(removedY, 0.0001)) * 100).toFixed(2));
    } else { next.scale = 1; next.positionX = 50; next.positionY = 50; }
  }
  return next;
}

function appendLayoutOverrides(project, bindings, baselineByName, byName, changed) {
  const byScene = new Map();
  for (const binding of bindings) {
    if (!binding.selector || binding.kind === "diagram") continue;
    const current = byName.get(binding.objectName), pptBaseline = baselineByName.get(binding.objectName); if (!current?.bbox || !pptBaseline?.bbox || !frameChanged({ left: pptBaseline.bbox[0], top: pptBaseline.bbox[1], width: pptBaseline.bbox[2], height: pptBaseline.bbox[3] }, current.bbox)) continue;
    const [left, top, width, height] = current.bbox, before = pptBaseline.bbox, html = binding.baselineFrame, dx = left - before[0], dy = top - before[1], finalWidth = html.width + width - before[2], finalHeight = html.height + height - before[3];
    const rule = `[data-scene-id="${safeCss(binding.sceneId)}"] ${binding.selector} { position: relative; left: ${dx.toFixed(2)}px; top: ${dy.toFixed(2)}px; width: ${finalWidth.toFixed(2)}px; height: ${finalHeight.toFixed(2)}px; }`;
    if (!byScene.has(binding.sceneId)) byScene.set(binding.sceneId, []); byScene.get(binding.sceneId).push(rule); changed.push(`${binding.fieldPath || binding.elementId}:layout`);
  }
  const start = "/* MINT_PPT_LAYOUT_OVERRIDES_START */", end = "/* MINT_PPT_LAYOUT_OVERRIDES_END */";
  for (const [sceneId, rules] of byScene) {
    const file = path.join(project, "src", "scenes", `${sceneId}.css`); if (!fs.existsSync(file)) throw new Error(`Missing scene CSS ${sceneId}`);
    const original = fs.readFileSync(file, "utf8"), cleaned = original.replace(new RegExp(`${start.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}[\\s\\S]*?${end.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`, "g"), "").trimEnd();
    fs.writeFileSync(file, `${cleaned}\n${start}\n${rules.join("\n")}\n${end}\n`);
  }
}

function applyMintFreshToSceneCss(project) {
  const folder = path.join(project, "src", "scenes"); if (!fs.existsSync(folder)) return;
  const replacements = new Map([["#18312a", theme.palette.ink], ["#087c66", theme.palette.mint], ["#f7fbf9", theme.palette.page], ["#eaf4f0", theme.palette.mintLight], ["#eef7f3", theme.palette.mintLight], ["#d4e2dd", theme.palette.line], ["#586b65", theme.palette.muted], ["#69766f", theme.palette.muted]]);
  for (const file of fs.readdirSync(folder).filter(name => name.endsWith(".css"))) {
    const target = path.join(folder, file), source = fs.readFileSync(target, "utf8"), next = source.replace(/#[0-9a-f]{6}/gi, color => replacements.get(color.toLowerCase()) || color);
    if (next !== source) fs.writeFileSync(target, next);
  }
}

let temporary = null;
try {
  if (!process.env.RUNTIME_NODE || !process.env.RUNTIME_NODE_MODULES) throw new Error("RUNTIME_NODE and RUNTIME_NODE_MODULES are required");
  const task = readTaskCard(taskFile), section = task.sections.find(item => item.sectionId === sectionId); if (!section) throw new Error(`Unknown section ${sectionId}`);
  const metadata = await readPptxMetadata(pptx), sync = await readPptxSyncPayload(pptx);
  if (metadata.MintReportId !== task.reportId || metadata.MintSectionId !== sectionId || metadata.MintTaskCardHash !== task.taskCardHash || metadata.MintSkillVersion !== skillVersion || metadata.MintThemeVersion !== theme.themeVersion) throw new Error("PPT identity does not match the current task card and Skill");
  if (metadata.MintSyncPayloadHash !== sync.hash || sync.payload.taskCardHash !== task.taskCardHash || sync.payload.sectionId !== sectionId) throw new Error("PPT sync payload identity mismatch");
  const current = await snapshotPpt(pptx, { includeImageData: true }), baseline = sync.payload.baseline, bindings = sync.payload.bindings || [];
  const baselineByName = new Map(baseline.objects.map(item => [item.name, item])), currentByName = new Map(current.objects.map(item => [item.name, item])), bindingByName = new Map(bindings.map(item => [item.objectName, item]));
  const unresolved = [];
  if (current.slides !== baseline.slides) unresolved.push(`slide-count changed: ${baseline.slides} -> ${current.slides}`);
  unresolved.push(...(current.duplicateNames || []).map(name => `duplicate object identity ${name}`));
  for (const name of baselineByName.keys()) if (!currentByName.has(name)) unresolved.push(`generated object removed: ${name}`);
  for (const item of current.objects) if (!baselineByName.has(item.name)) unresolved.push(`new or unbound PowerPoint object: slide ${item.slide} ${item.name}`);
  for (const [name, before] of baselineByName) {
    const after = currentByName.get(name), binding = bindingByName.get(name);
    if (!after || binding || same(before, after)) continue;
    unresolved.push(`unsupported change to ${name}`);
  }
  temporary = fs.mkdtempSync(path.join(os.tmpdir(), "mint-ppt-sync-")); const project = path.join(temporary, "project"), workfile = path.join(temporary, "baseline.mint-section.html");
  fs.writeFileSync(workfile, Buffer.from(sync.payload.workfileBase64, "base64"));
  const core = locateHtmlCore(); runNode(core.collaboration, ["unpack", workfile, project]);
  const modelFile = path.join(project, "report-model.json"), model = JSON.parse(fs.readFileSync(modelFile, "utf8")), changed = [];
  applyMintFreshToSceneCss(project);
  for (const binding of bindings) {
    if (!binding.fieldPath || !["text", "table", "chart", "media"].includes(binding.kind)) continue;
    const after = currentByName.get(binding.objectName), before = baselineByName.get(binding.objectName); if (!after || !before) continue;
    if (binding.kind === "text" && after.text !== binding.baselineValue) { setField(model, binding.fieldPath, after.text); changed.push(binding.fieldPath); }
    if (binding.kind === "table" && !same(after.values, [binding.baselineValue?.columns || [], ...(binding.baselineValue?.rows || [])])) {
      setField(model, binding.fieldPath, { ...(binding.baselineValue || {}), columns: after.values[0] || [], rows: after.values.slice(1) }); changed.push(binding.fieldPath);
    }
    if (binding.kind === "chart") {
      const nextSeries = after.series.map(item => ({ name: item.name, values: item.values })), nextCategories = after.series[0]?.categories || [];
      const next = { ...(binding.baselineValue || {}), type: chartType(binding.baselineValue || {}, after), title: after.title, categories: nextCategories, series: nextSeries };
      if (!same(next, binding.baselineValue)) { setField(model, binding.fieldPath, next); changed.push(binding.fieldPath); }
    }
    if (binding.kind === "media") {
      const next = mediaValue(binding.baselineValue || {}, after, before); if (!same(next, binding.baselineValue)) { setField(model, binding.fieldPath, next); changed.push(binding.fieldPath); }
    }
  }
  appendLayoutOverrides(project, bindings, baselineByName, currentByName, changed);
  if (unresolved.length) {
    const report = { schemaVersion: "1.0", passed: false, reportId: task.reportId, sectionId, changedFields: [...new Set(changed)], unresolvedChanges: unresolved, generatedAt: new Date().toISOString() };
    fs.writeFileSync(path.join(project, "ppt-sync-report.json"), `${JSON.stringify(report, null, 2)}\n`); throw new Error(`PPT contains changes that cannot be safely synchronized: ${unresolved.join("; ")}`);
  }
  model.userEdits = [...(model.userEdits || []), { kind: "ppt-sync", sectionId, changedFields: [...new Set(changed)], sourcePptxHash: sha(fs.readFileSync(pptx)), at: new Date().toISOString() }];
  fs.writeFileSync(modelFile, `${JSON.stringify(model, null, 2)}\n`);
  const report = { schemaVersion: "1.0", passed: true, reportId: task.reportId, sectionId, changedFields: [...new Set(changed)], unresolvedChanges: [], sourcePptxHash: sha(fs.readFileSync(pptx)), generatedAt: new Date().toISOString() };
  fs.writeFileSync(path.join(project, "ppt-sync-report.json"), `${JSON.stringify(report, null, 2)}\n`);
  runNode(core.assemble, [project, path.join(project, "report.html")]);
  fs.mkdirSync(path.dirname(output), { recursive: true }); runNode(core.collaboration, ["pack-section-sync", project, taskFile, sectionId, output]);
  console.log(JSON.stringify({ passed: true, output, reportId: task.reportId, sectionId, changedFields: report.changedFields, unresolvedChanges: 0, finalQaDeferred: true }, null, 2));
} catch (error) { console.error(JSON.stringify({ passed: false, error: error.message }, null, 2)); process.exitCode = 1; }
finally { if (temporary) fs.rmSync(temporary, { recursive: true, force: true }); }
