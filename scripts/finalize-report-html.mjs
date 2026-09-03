#!/usr/bin/env node
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { locateHtmlCore, runNode, skillRoot, skillVersion, theme } from "./lib/config.mjs";
import { readTaskCard } from "./lib/task-card.mjs";
import { readPptxMetadata } from "./lib/pptx-metadata.mjs";

const taskFile = path.resolve(process.argv[2] || ""), outputProject = path.resolve(process.argv[3] || ""), finalHtml = path.resolve(process.argv[4] || ""), inputs = process.argv.slice(5).map(file => path.resolve(file));
if (!fs.existsSync(taskFile) || !outputProject || !finalHtml || !inputs.length || inputs.some(file => !fs.existsSync(file))) { console.error("Usage: finalize-report-html.mjs task-card.json output-project final.mint-report.html section1.pptx ..."); process.exit(2); }

let temporary = null;
try {
  if (!process.env.RUNTIME_NODE || !process.env.RUNTIME_NODE_MODULES) throw new Error("RUNTIME_NODE and RUNTIME_NODE_MODULES are required");
  const started = Date.now(), task = readTaskCard(taskFile), bySection = new Map();
  for (const file of inputs) {
    const metadata = await readPptxMetadata(file), section = task.sections.find(item => item.sectionId === metadata.MintSectionId);
    if (!section || metadata.MintReportId !== task.reportId || metadata.MintTaskCardHash !== task.taskCardHash || metadata.MintSkillVersion !== skillVersion || metadata.MintThemeVersion !== theme.themeVersion) throw new Error(`PPT identity mismatch: ${path.basename(file)}`);
    if (bySection.has(section.sectionId)) throw new Error(`Duplicate current PPT for section ${section.sectionId}`); bySection.set(section.sectionId, file);
  }
  for (const section of task.sections) if (!bySection.has(section.sectionId)) throw new Error(`Missing current PPT for section ${section.sectionId}`);
  temporary = fs.mkdtempSync(path.join(os.tmpdir(), "mint-ppt-finalize-")); const workfiles = [], core = locateHtmlCore();
  for (const section of [...task.sections].sort((a, b) => a.order - b.order)) {
    const workfile = path.join(temporary, `${String(section.order).padStart(2, "0")}-${section.sectionId}.mint-section.html`);
    runNode(path.join(skillRoot, "scripts/sync-ppt-edits.mjs"), [bySection.get(section.sectionId), taskFile, section.sectionId, workfile]); workfiles.push(workfile);
  }
  fs.mkdirSync(outputProject, { recursive: true }); runNode(core.collaboration, ["merge", taskFile, outputProject, ...workfiles]);
  runNode(core.workflow, ["review", outputProject]);
  fs.mkdirSync(path.dirname(finalHtml), { recursive: true }); runNode(core.collaboration, ["pack-report", outputProject, taskFile, finalHtml]);
  const result = { schemaVersion: "1.0", passed: true, reportId: task.reportId, output: finalHtml, outputProject, sections: task.sections.length, modelCalls: 0, sectionBrowserChecks: 0, finalHtmlBrowserChecks: 1, elapsedMs: Date.now() - started, skillVersion, themeVersion: theme.themeVersion, authority: "html-final" };
  fs.writeFileSync(path.join(outputProject, "ppt-to-html-finalization-manifest.json"), `${JSON.stringify(result, null, 2)}\n`); console.log(JSON.stringify(result, null, 2));
} catch (error) { console.error(JSON.stringify({ passed: false, error: error.message }, null, 2)); process.exitCode = 1; }
finally { if (temporary) fs.rmSync(temporary, { recursive: true, force: true }); }
