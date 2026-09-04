#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { auditPpt } from "./lib/audit.mjs";

const file = path.resolve(process.argv[2] || ""), task = path.resolve(process.argv[3] || ""), section = String(process.argv[4] || ""), outputArg = process.argv.find(item => item.startsWith("--output="));
const irArg = process.argv.find(item => item.startsWith("--resolved-ir="));
if (!file || !task || !section || !fs.existsSync(file) || !fs.existsSync(task)) { console.error("Usage: audit-section-ppt.mjs section.pptx task-card.json section-id [--output=audit.json]"); process.exit(2); }
try { const report = await auditPpt({ file, taskFile: task, sectionId: section, mode: "section", output: outputArg ? path.resolve(outputArg.slice(9)) : null, resolvedIrFile: irArg ? path.resolve(irArg.slice(14)) : null }); console.log(JSON.stringify(report, null, 2)); if (!report.passed) process.exit(1); }
catch (error) { console.error(JSON.stringify({ passed: false, error: error.message }, null, 2)); process.exit(1); }
