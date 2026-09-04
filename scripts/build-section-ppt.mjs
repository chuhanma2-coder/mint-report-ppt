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
import { auditSourceCoverage, evidenceForSlide } from "./lib/source-coverage.mjs";
import { presentationIntentIssues } from "./lib/presentation-gates.mjs";
import { consolidationIssues, evidenceBundleRefs } from "./lib/page-consolidation.mjs";
import { chapterCompositionIssues, classifyChapterCompositions, materializeCompositeEvidence } from "./lib/composition-classifier.mjs";
import { allocateSlideEvidence, evidenceAllocationIssues } from "./lib/evidence-allocation.mjs";
import { CURRENT_PLANNING_SCHEMA_VERSION, CURRENT_SLIDE_IR_VERSION, upgradeSlideIr } from "./lib/ir-version.mjs";

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
  if (ir.schemaVersion !== CURRENT_SLIDE_IR_VERSION || ir.slideIrVersion !== CURRENT_SLIDE_IR_VERSION || ir.planningSchemaVersion !== CURRENT_PLANNING_SCHEMA_VERSION || ir.reportId !== task.reportId || ir.sectionId !== section.sectionId || !Array.isArray(ir.slides) || !ir.slides.length) issues.push("Slide IR identity or schema is invalid");
  const slideIds = new Set(), knownEvidence = evidenceIds(source), requireEvidence = knownEvidence.size > 0;
  for (const slide of ir.slides || []) {
    if (!slide.id || slideIds.has(slide.id)) issues.push(`Slide ID is missing or duplicated: ${slide.id || "(missing)"}`); slideIds.add(slide.id);
    if (!slide.claim || !slide.semanticIntent || !Array.isArray(slide.modules) || !slide.modules.length) issues.push(`Slide ${slide.id} lacks claim, semanticIntent, or modules`);
    if (slide.role === "appendix" && task.allowAppendix !== true) issues.push(`APPENDIX_FORBIDDEN: slide ${slide.id} must be a normal body page unless the task card explicitly authorizes appendices`);
    if (slide.role === "content" && (!slide.outlineItem || !slide.storyCluster || !slide.evidenceBundle)) issues.push(`Slide ${slide.id} lacks outlineItem, storyCluster, or evidenceBundle`);
    if (slide.role === "content" && !slide.decisionUnit && !ir.upgradedFrom) issues.push(`Slide ${slide.id} lacks a decisionUnit required by the current planning schema`);
    const bundleRefs = evidenceBundleRefs(slide);
    for (const ref of [...(slide.evidenceRefs || []), ...bundleRefs, ...slide.modules.flatMap(module => module.evidenceRefs || [])]) if (requireEvidence && !knownEvidence.has(String(ref))) issues.push(`Slide ${slide.id} references unknown evidence ${ref}`);
    if (slide.role === "content") for (const ref of slide.modules.flatMap(module => module.evidenceRefs || []).map(String)) if (!bundleRefs.includes(ref)) issues.push(`Slide ${slide.id} visible module evidence ${ref} is missing from its Page Evidence Bundle`);
    for (const module of slide.modules || []) {
      if (!["text", "metric", "chart", "table", "diagram", "image", "callout"].includes(module.type)) issues.push(`Slide ${slide.id} has unsupported module type ${module.type}`);
      if (module.tableRole && !["primary", "supporting", "reference", "detail"].includes(module.tableRole)) issues.push(`Slide ${slide.id} has invalid tableRole ${module.tableRole}`);
    }
  }
  return issues;
}

try {
  if (!process.env.RUNTIME_NODE_MODULES) throw new Error("RUNTIME_NODE_MODULES is required; load workspace dependencies first");
  const sourceText = fs.readFileSync(sourceFile, "utf8"), irText = fs.readFileSync(irFile, "utf8"), task = readTaskCard(taskFile), source = JSON.parse(sourceText), authored = upgradeSlideIr(JSON.parse(irText)), section = task.sections.find(item => item.sectionId === sectionId);
  if (!section) throw new Error(`Section ${sectionId} is not assigned by the task card`);
  const structuralIssues = validateIr(authored, task, section, source); if (structuralIssues.length) throw new Error(structuralIssues.join("; "));
  const coverage = auditSourceCoverage(source, authored, { allowAppendix: task.allowAppendix === true });
  const coverageFile = `${output}.source-coverage.json`;
  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.writeFileSync(coverageFile, `${JSON.stringify(coverage, null, 2)}\n`);
  if (!coverage.passed) throw new Error(`Source coverage gate failed: ${coverage.issues.join("; ")}`);
  const datasets = source.datasets || {};
  const groundedSlides = authored.slides.map(slide => ({ ...slide, sourceEvidence: evidenceForSlide(source, slide) }));
  const classified = classifyChapterCompositions(groundedSlides);
  const slides = classified.slides.map(slide => layoutSlide(allocateSlideEvidence(resolveSlideExpressions(materializeCompositeEvidence(slide), datasets)), theme));
  const expressionIssues = slides.flatMap(expressionSuitability);
  const presentationIssues = presentationIntentIssues({ ...authored, slides });
  const layoutWarnings = slides.flatMap(slide => layoutIssues(slide, theme));
  const consolidationWarnings = consolidationIssues(slides, theme);
  const chapterIssues = chapterCompositionIssues(slides);
  const allocationIssues = evidenceAllocationIssues(slides, { allowAppendix: task.allowAppendix === true });
  const variants = slides.filter(slide => slide.role === "content").map(slide => slide.layout?.layoutVariant || slide.geometry);
  const patternIssues = [];
  for (let i = 3; i < variants.length; i++) if (variants.slice(i - 3, i + 1).every(value => value === variants[i])) patternIssues.push(`LAYOUT_PATTERN_OVERUSE: ${variants[i]} repeats on four consecutive content slides`);
  const generationIssues = [...expressionIssues.map(issue => `Expression: ${issue}`), ...presentationIssues.map(issue => `Presentation: ${issue}`), ...allocationIssues.map(issue => `Allocation: ${issue}`), ...layoutWarnings.map(issue => `Layout: ${issue}`), ...consolidationWarnings.map(issue => `Consolidation: ${issue}`), ...chapterIssues.map(issue => `Chapter: ${issue}`), ...patternIssues.map(issue => `Chapter: ${issue}`)];
  if (generationIssues.length) throw new Error(`Generation gates failed: ${generationIssues.join("; ")}`);
  const resolved = { ...authored, slides, compositionDiagnostics: classified.diagnostics, resolvedBy: { skillVersion, themeVersion: theme.themeVersion, slideIrVersion: CURRENT_SLIDE_IR_VERSION, planningSchemaVersion: CURRENT_PLANNING_SCHEMA_VERSION, generatedAt: new Date().toISOString() } };
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
  fs.writeFileSync(`${output}.build.json`, `${JSON.stringify({ passed: true, output, resolvedFile, auditFile, coverageFile, slides: slides.length, diagnostics, warnings: [], skillVersion, themeVersion: theme.themeVersion }, null, 2)}\n`);
  console.log(JSON.stringify({ passed: true, output, resolvedFile, auditFile, coverageFile, slides: slides.length, warnings: [], authority: "pptx", skillVersion, themeVersion: theme.themeVersion }, null, 2));
} catch (error) { console.error(JSON.stringify({ passed: false, error: error.message }, null, 2)); process.exit(1); }
