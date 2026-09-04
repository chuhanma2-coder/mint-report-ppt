#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { skillVersion, theme } from "./lib/config.mjs";
import { readTaskCard } from "./lib/task-card.mjs";
import { expressionSuitability, resolveSlideExpressions } from "./lib/expression-router.mjs";
import { layoutIssues, layoutSlide } from "./lib/geometry-engine.mjs";
import { exportPresentation, renderPresentation } from "./lib/ppt-renderer.mjs";
import { writePptxMetadata } from "./lib/pptx-metadata.mjs";
import { auditPpt } from "./lib/audit.mjs";

const [sourceArg, irArg, taskArg, sectionId, outputArg] = process.argv.slice(2);
const sourceFile = path.resolve(sourceArg || ""), irFile = path.resolve(irArg || ""), taskFile = path.resolve(taskArg || ""), output = path.resolve(outputArg || "");
if (![sourceFile, irFile, taskFile].every(fs.existsSync) || !sectionId || !outputArg) {
  console.error("Usage: build-section-ppt.mjs source-model.json slide-ir.json task-card.json section-id output.pptx"); process.exit(2);
}
const sha = value => crypto.createHash("sha256").update(value).digest("hex");

function evidenceIds(source) {
  const units = source.sourceUnits || source.evidence || source.units || [];
  return new Set(units.map(item => String(item.id || item.sourceUnitId || item.evidenceId || "")).filter(Boolean));
}

function validateIr(ir, task, section, source) {
  const issues = [];
  if (ir.schemaVersion !== "1.0" || ir.reportId !== task.reportId || ir.sectionId !== section.sectionId || !Array.isArray(ir.slides) || !ir.slides.length) issues.push("Slide IR identity or schema is invalid");
  const slideIds = new Set(), knownEvidence = evidenceIds(source), requireEvidence = knownEvidence.size > 0;
  for (const slide of ir.slides || []) {
    if (!slide.id || slideIds.has(slide.id)) issues.push(`Slide ID is missing or duplicated: ${slide.id || "(missing)"}`); slideIds.add(slide.id);
    if (!slide.claim || !slide.semanticIntent || !Array.isArray(slide.modules) || !slide.modules.length) issues.push(`Slide ${slide.id} lacks claim, semanticIntent, or modules`);
    for (const ref of [...(slide.evidenceRefs || []), ...slide.modules.flatMap(module => module.evidenceRefs || [])]) if (requireEvidence && !knownEvidence.has(String(ref))) issues.push(`Slide ${slide.id} references unknown evidence ${ref}`);
    for (const module of slide.modules || []) if (!["text", "metric", "chart", "table", "diagram", "image", "callout"].includes(module.type)) issues.push(`Slide ${slide.id} has unsupported module type ${module.type}`);
  }
  return issues;
}

try {
  if (!process.env.RUNTIME_NODE_MODULES) throw new Error("RUNTIME_NODE_MODULES is required; load workspace dependencies first");
  const sourceText = fs.readFileSync(sourceFile, "utf8"), irText = fs.readFileSync(irFile, "utf8"), task = readTaskCard(taskFile), source = JSON.parse(sourceText), authored = JSON.parse(irText), section = task.sections.find(item => item.sectionId === sectionId);
  if (!section) throw new Error(`Section ${sectionId} is not assigned by the task card`);
  const structuralIssues = validateIr(authored, task, section, source); if (structuralIssues.length) throw new Error(structuralIssues.join("; "));
  const datasets = source.datasets || {};
  const slides = authored.slides.map(slide => layoutSlide(resolveSlideExpressions(slide, datasets), theme));
  const expressionIssues = slides.flatMap(expressionSuitability); if (expressionIssues.length) throw new Error(`Expression gate failed: ${expressionIssues.join("; ")}`);
  const layoutWarnings = slides.flatMap(slide => layoutIssues(slide, theme));
  const resolved = { ...authored, slides, resolvedBy: { skillVersion, themeVersion: theme.themeVersion, generatedAt: new Date().toISOString() } };
  fs.mkdirSync(path.dirname(output), { recursive: true });
  const { presentation, diagnostics } = await renderPresentation(resolved, theme);
  await exportPresentation(presentation, output);
  await writePptxMetadata(output, {
    MintReportId: task.reportId, MintReportTitle: task.title, MintSectionId: section.sectionId, MintSectionOrder: section.order,
    MintSectionOwner: section.owner, MintThemeVersion: task.themeVersion, MintPptMasterVersion: task.pptMasterVersion,
    MintSkillVersion: skillVersion, MintTaskCardHash: task.taskCardHash, MintSourceHash: sha(sourceText), MintSlideIrHash: sha(irText),
    MintGeneratedAt: new Date().toISOString(), MintAuthority: "section-pptx"
  });
  const resolvedFile = `${output}.resolved-ir.json`;
  fs.writeFileSync(resolvedFile, `${JSON.stringify(resolved, null, 2)}\n`);
  const auditFile = `${output}.audit.json`, audit = await auditPpt({ file: output, taskFile, sectionId, mode: "section", output: auditFile, resolvedIrFile: resolvedFile });
  if (!audit.passed) throw new Error(`PPT audit failed: ${audit.issues.join("; ")}`);
  fs.writeFileSync(`${output}.build.json`, `${JSON.stringify({ passed: true, output, resolvedFile, auditFile, slides: slides.length, diagnostics, warnings: layoutWarnings, skillVersion, themeVersion: theme.themeVersion }, null, 2)}\n`);
  console.log(JSON.stringify({ passed: true, output, resolvedFile, auditFile, slides: slides.length, warnings: layoutWarnings, authority: "pptx", skillVersion, themeVersion: theme.themeVersion }, null, 2));
} catch (error) { console.error(JSON.stringify({ passed: false, error: error.message }, null, 2)); process.exit(1); }
