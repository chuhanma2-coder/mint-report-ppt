#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { skillVersion, skillRoot, theme as defaultTheme } from "./lib/config.mjs";
import {applyStylePrior} from './lib/style-prior.mjs';
import { runtimeFingerprint } from './lib/runtime-fingerprint.mjs';
import { auditSourceInventory } from './lib/source-inventory.mjs';
import { financialConsistencyIssues } from './lib/financial-consistency.mjs';
import { readTaskCard, resolveWorkPackage } from "./lib/task-card.mjs";
import { validateDesignLedger, auditDesignRequirements, executiveReviewIssues, nativeDesignPages } from './lib/design-intent.mjs';
import { inspectPptxPackage } from './lib/pptx-metadata.mjs';
import { expressionSuitability, resolveSlideExpressions } from "./lib/expression-router.mjs";
import { exportPresentation, renderPresentation } from "./lib/ppt-renderer.mjs";
import { writePptxMetadata } from "./lib/pptx-metadata.mjs";
import { auditPpt } from "./lib/audit.mjs";
import { auditSourceCoverage, auditVisibleFactContent, evidenceForSlide } from "./lib/source-coverage.mjs";
import { presentationIntentIssues } from "./lib/presentation-gates.mjs";
import { consolidationIssues, evidenceBundleRefs } from "./lib/page-consolidation.mjs";
import { chapterCompositionIssues, classifyChapterCompositions, materializeCompositeEvidence } from "./lib/composition-classifier.mjs";
import { allocateSlideEvidence, evidenceAllocationIssues } from "./lib/evidence-allocation.mjs";
import { CURRENT_PLANNING_SCHEMA_VERSION, CURRENT_SLIDE_IR_VERSION, upgradeSlideIr } from "./lib/ir-version.mjs";
import { applyDomLayout, planAndMeasureOutline } from "./lib/dom-layout-extractor.mjs";
import { semanticDuplicationIssues } from "./lib/fact-fingerprint.mjs";
import { compareRenderedSlides } from "./lib/visual-parity.mjs";
import { outlineIntegrityIssues } from "./lib/outline-integrity.mjs";
import { auditFinalFacts } from './lib/final-facts.mjs';

const [sourceArg, irArg, taskArg, sectionId, outputArg] = process.argv.slice(2);
const sourceFile = path.resolve(sourceArg || ""), irFile = path.resolve(irArg || ""), taskFile = path.resolve(taskArg || ""), output = path.resolve(outputArg || "");
if (![sourceFile, irFile, taskFile].every(fs.existsSync) || !sectionId || !outputArg) {
  console.error("Usage: build-section-ppt.mjs source-model.json slide-ir.json task-card.json section-id output.pptx"); process.exit(2);
}
const buildStartedAt=Date.now();
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
      if (!Array.isArray(module.visibleFacts)) issues.push(`Slide ${slide.id} module ${module.id || "(unnamed)"} lacks visibleFacts required by the current content-completeness contract`);
    }
  }
  return issues;
}

try {
  fs.mkdirSync(path.dirname(output), {recursive:true});
  const styleArg=process.argv.find(a=>a.startsWith('--style-profile='));
  const theme=applyStylePrior(defaultTheme,styleArg?JSON.parse(fs.readFileSync(styleArg.slice('--style-profile='.length),'utf8')):null);
  const runtime = runtimeFingerprint(skillRoot);
  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.writeFileSync(`${output}.build.json`, JSON.stringify({ passed: false, status: 'building', runtime, releaseReady: false }, null, 2));
  if (!process.env.RUNTIME_NODE_MODULES) throw new Error("RUNTIME_NODE_MODULES is required; load workspace dependencies first");
  const sourceText = fs.readFileSync(sourceFile, "utf8"), irText = fs.readFileSync(irFile, "utf8"), task = readTaskCard(taskFile), source = JSON.parse(sourceText), authored = upgradeSlideIr(JSON.parse(irText)), work = resolveWorkPackage(task,sectionId), section = work.sections[0];
  if(work.sections.length===1 && authored.sectionId!==section.sectionId) throw new Error('WORK_PACKAGE_IR_SCOPE: section does not match');
  if(work.sections.length>1 && JSON.stringify(authored.sectionIds)!==JSON.stringify(work.sectionIds)) throw new Error('WORK_PACKAGE_IR_SCOPE: provide all selected sectionIds in task-card order');
  authored.slides=authored.slides.map(s=>({...s,sectionId:s.sectionId || (work.sections.length===1?section.sectionId:null)}));
  if(new Set(authored.slides.map(s=>s.id)).size!==authored.slides.length) throw new Error('WORK_PACKAGE_SLIDE_ID_DUPLICATE');
  const actual=authored.slides.map(s=>work.sectionIds.indexOf(s.sectionId));
  if(actual.some((n,i)=>n<0 || (i&&n<actual[i-1]))) throw new Error('WORK_PACKAGE_SLIDE_ORDER: unknown section or wrong order');
  for(const s of authored.slides) {
    const assigned=work.sections.find(x=>x.sectionId===s.sectionId);
    if(s.role==='content'&&!assigned.outlineItems.includes(String(s.outlineItem))) throw new Error(`OUTLINE_SCOPE: ${s.id}`);
  }
  for(const assigned of work.sections) {
    const indexes=authored.slides.filter(s=>s.sectionId===assigned.sectionId&&s.role==='content').map(s=>assigned.outlineItems.indexOf(String(s.outlineItem)));
    if(indexes.some((n,i)=>i&&n<indexes[i-1])) throw new Error('OUTLINE_ORDER: preserve task-card outline order');
  }
  const ledgerIssues=validateDesignLedger(authored);if(ledgerIssues.length) throw new Error(ledgerIssues.join('; '));
  const inventory = await auditSourceInventory(source);
  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.writeFileSync(`${output}.source-inventory.json`, JSON.stringify(inventory, null, 2));
  if (!inventory.passed) throw new Error(inventory.issues.join('; '));
  const structuralIssues = work.sections.flatMap(assigned=>validateIr({...authored,sectionId:assigned.sectionId,slides:authored.slides.filter(s=>s.sectionId===assigned.sectionId)}, task, assigned, source)); if (structuralIssues.length) throw new Error(structuralIssues.join("; "));
  const financial = financialConsistencyIssues(authored.slides);
  fs.writeFileSync(`${output}.financial-consistency.json`, JSON.stringify(financial, null, 2));
  if (!financial.passed) throw new Error(financial.issues.join('; '));
  const coverage = auditSourceCoverage(source, authored, { allowAppendix: task.allowAppendix === true });
  const coverageFile = `${output}.source-coverage.json`;
  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.writeFileSync(coverageFile, `${JSON.stringify(coverage, null, 2)}\n`);
  if (!coverage.passed) throw new Error(`Source coverage gate failed: ${coverage.issues.join("; ")}`);
  const datasets = source.datasets || {};
  const groundedSlides = authored.slides.map(slide => ({ ...slide, sourceEvidence: evidenceForSlide(source, slide), modules:slide.modules.map(m=>({...m,data:m.data ?? datasets[m.dataRef] ?? {}})) }));
  const classified = classifyChapterCompositions(groundedSlides);
  const plannedSlides = classified.slides.map(slide => allocateSlideEvidence(resolveSlideExpressions(materializeCompositeEvidence(slide), datasets)));
  const allocatedCoverageFile = `${output}.allocated-source-coverage.json`, allocatedCoverage = auditSourceCoverage(source, { ...authored, slides: plannedSlides }, { allowAppendix: task.allowAppendix === true });
  fs.writeFileSync(allocatedCoverageFile, `${JSON.stringify(allocatedCoverage, null, 2)}\n`);
  if (!allocatedCoverage.passed) throw new Error(`Post-allocation source coverage gate failed: ${allocatedCoverage.issues.join("; ")}`);
  const visibleFactCoverage = auditVisibleFactContent(source, { ...authored, slides: plannedSlides }), visibleFactFile = `${output}.visible-fact-coverage.json`;
  fs.writeFileSync(visibleFactFile, `${JSON.stringify(visibleFactCoverage, null, 2)}\n`);
  if (!visibleFactCoverage.passed) throw new Error(`Visible fact gate failed: ${visibleFactCoverage.issues.join("; ")}`);
  const expressionIssues = plannedSlides.flatMap(expressionSuitability);
  const presentationIssues = presentationIntentIssues({ ...authored, slides: plannedSlides });
  const consolidationWarnings = consolidationIssues(plannedSlides, theme);
  const allocationIssues = evidenceAllocationIssues(plannedSlides, { allowAppendix: task.allowAppendix === true });
  const duplicationIssues = plannedSlides.flatMap(semanticDuplicationIssues);
  const outlineIssues = []; // Capacity is verified by the browser below, not a point estimate.
  // Legacy unit/area heuristics are diagnostics, never permission to split or
  // a pre-measurement blocker. The browser proves full-outline capacity below.
  const generationIssues = [...expressionIssues.map(issue => `Expression: ${issue}`), ...presentationIssues.map(issue => `Presentation: ${issue}`), ...allocationIssues.map(issue => `Allocation: ${issue}`), ...duplicationIssues.map(issue => `Content: ${issue}`), ...outlineIssues.map(issue => `Outline: ${issue}`)];
  fs.writeFileSync(`${output}.consolidation-diagnostics.json`, JSON.stringify(consolidationWarnings,null,2));
  if (generationIssues.length) throw new Error(`Generation gates failed: ${generationIssues.join("; ")}`);
  const designInput = { ...authored, slides: plannedSlides, compositionDiagnostics: classified.diagnostics };
  const designFile = `${output}.design.html`, designDir = `${output}.design-render`;
  const measured = await planAndMeasureOutline(designInput, theme, designFile, designDir, {pageApprovals:task.outlinePageApprovals||[]});
  const domManifest = measured.manifest;
  const designGate=auditDesignRequirements(measured.ir,domManifest);
  fs.writeFileSync(`${output}.design-requirements.json`,JSON.stringify(designGate,null,2));
  if(!designGate.passed) throw new Error(designGate.issues.join('; '));
  const measuredOutlineIssues = outlineIntegrityIssues(measured.ir.slides);
  if (measuredOutlineIssues.length) throw new Error(measuredOutlineIssues.join('; '));
  fs.writeFileSync(`${output}.outline-measurements.json`, JSON.stringify(measured.measurements, null, 2));
  if (!domManifest.passed) throw new Error(`DOM design gate failed: ${domManifest.issues.join("; ")}`);
  const renderedModules = domManifest.slides.flatMap(slide => slide.modules.map(module => ({ slideId: slide.slideId, moduleId: module.id, text: module.text })));
  const renderedCoverage = auditVisibleFactContent(source, measured.ir, { renderedModules });
  fs.writeFileSync(`${output}.rendered-fact-coverage.json`, JSON.stringify(renderedCoverage, null, 2));
  if (!renderedCoverage.passed) throw new Error(`Rendered source gate failed: ${renderedCoverage.issues.join('; ')}`);
  const resolved = { ...applyDomLayout(measured.ir, domManifest), compositionDiagnostics: classified.diagnostics, resolvedBy: { skillVersion, themeVersion: theme.themeVersion, slideIrVersion: CURRENT_SLIDE_IR_VERSION, planningSchemaVersion: CURRENT_PLANNING_SCHEMA_VERSION, generatedAt: new Date().toISOString() } };
  const chapterIssues = chapterCompositionIssues(resolved.slides);
  if (chapterIssues.length) throw new Error(`Chapter gates failed: ${chapterIssues.join("; ")}`);
  const { presentation, diagnostics } = await renderPresentation(resolved, theme);
  await exportPresentation(presentation, output);
  await writePptxMetadata(output, {
    MintReportId: task.reportId, MintReportTitle: task.title, ...(work.sections.length===1?{MintSectionId:section.sectionId,MintSectionOrder:section.order}:{MintSectionIds:JSON.stringify(work.sectionIds),MintWorkPackageId:work.workPackageId || '',MintSectionOrder:section.order}),
    MintSectionOwner: section.owner, MintThemeVersion: task.themeVersion, MintPptMasterVersion: task.pptMasterVersion,
    MintSkillVersion: skillVersion, MintTaskCardHash: task.taskCardHash, MintSourceHash: sha(sourceText), MintSlideIrHash: sha(irText),
    MintRuntimeFingerprint: runtime.sha256, MintRuntimeStatus: runtime.status,
    MintGeneratedAt: new Date().toISOString(), MintAuthority: "section-pptx"
  });
  const resolvedFile = `${output}.resolved-ir.json`;
  fs.writeFileSync(resolvedFile, `${JSON.stringify(resolved, null, 2)}\n`);
  const auditFile = `${output}.audit.json`, audit = await auditPpt({ file: output, taskFile, sectionId:work.sectionIds.join(','), mode:work.sections.length===1 ? 'section' : 'work-package', output: auditFile, resolvedIrFile: resolvedFile });
  if (!audit.passed) throw new Error(`PPT audit failed: ${audit.issues.join("; ")}`);
  const auditRenderDir = path.join(path.dirname(auditFile), `${path.basename(output, path.extname(output))}-audit-render`), parityFile = `${output}.visual-parity.json`;
  const layouts = resolved.slides.map((_,i)=>JSON.parse(fs.readFileSync(path.join(auditRenderDir,`slide-${String(i+1).padStart(2,'0')}.layout.json`),'utf8')));
  const finalFacts = await auditFinalFacts({file:output,source,ir:resolved,layouts});
  fs.writeFileSync(`${output}.final-facts.json`,JSON.stringify(finalFacts,null,2));
  if (!finalFacts.passed) throw new Error(`Final PPT facts failed: ${finalFacts.issues.join('; ')}`);
  const pkg=await inspectPptxPackage(output), xml=await Promise.all(pkg.slides.map(p=>pkg.zip.file(p).async('string')));
  const nativePages=nativeDesignPages(xml,resolved.slides.map(s=>s.id));
  const nativeDesignGate=auditDesignRequirements(resolved,domManifest,{nativePages});
  fs.writeFileSync(`${output}.native-design-requirements.json`,JSON.stringify(nativeDesignGate,null,2));
  if(!nativeDesignGate.passed) throw new Error(nativeDesignGate.issues.join('; '));
  const executiveIssues=executiveReviewIssues(null,resolved.slides.map(s=>s.id));
  fs.writeFileSync(`${output}.executive-review.json`,JSON.stringify({status:'pending',pptxSha256:sha(fs.readFileSync(output)),issues:executiveIssues,slides:resolved.slides.map(s=>({slideId:s.id,firstFocus:null,bodyProvesTitle:null,relationships:null,space:null,carrierSuitability:null,hierarchy:null,readingOrder:null}))},null,2));
  const parity = await compareRenderedSlides({ referenceDir: designDir, candidateDir: auditRenderDir, slideCount: resolved.slides.length, outputFile: parityFile });
  if (!parity.passed) throw new Error(`Visual parity gate failed: ${parity.issues.join("; ")}`);
  fs.writeFileSync(`${output}.build.json`, `${JSON.stringify({ passed: true, status: 'technical-candidate-awaiting-visual-review', releaseReady: false, deliveryApproved:false, buildElapsedSeconds:(Date.now()-buildStartedAt)/1000, pptxSha256:sha(fs.readFileSync(output)), runtime, output, resolvedFile, auditFile, coverageFile, allocatedCoverageFile, visibleFactFile, designFile, domManifest: path.join(designDir, "dom-layout.json"), parityFile, powerPointRenderGate: "required-before-release", slides: resolved.slides.length, diagnostics, warnings: executiveIssues, skillVersion, themeVersion: theme.themeVersion }, null, 2)}\n`);
  console.log(JSON.stringify({ passed: true, status: 'technical-candidate-awaiting-visual-review', releaseReady: false, deliveryApproved:false, buildElapsedSeconds:(Date.now()-buildStartedAt)/1000, pptxSha256:sha(fs.readFileSync(output)), runtime, output, resolvedFile, auditFile, coverageFile, allocatedCoverageFile, visibleFactFile, designFile, parityFile, powerPointRenderGate: "required-before-release", slides: resolved.slides.length, warnings: executiveIssues, authority: "pptx", skillVersion, themeVersion: theme.themeVersion }, null, 2));
} catch (error) {
  const failure = { passed: false, status: 'failed', releaseReady: false, error: error.message };
  fs.writeFileSync(`${output}.build.json`, JSON.stringify(failure, null, 2));
  console.error(JSON.stringify(failure, null, 2)); process.exit(1);
}
