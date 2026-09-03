#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { auditPpt } from "./lib/audit.mjs";

const file = path.resolve(process.argv[2] || ""), task = path.resolve(process.argv[3] || ""), outputArg = process.argv.find(item => item.startsWith("--output="));
if (!file || !task || !fs.existsSync(file) || !fs.existsSync(task)) { console.error("Usage: audit-final-ppt.mjs complete.pptx task-card.json [--output=audit.json]"); process.exit(2); }
try { const report = await auditPpt({ file, taskFile: task, mode: "final", output: outputArg ? path.resolve(outputArg.slice(9)) : null }); console.log(JSON.stringify(report, null, 2)); if (!report.passed) process.exit(1); }
catch (error) { console.error(JSON.stringify({ passed: false, error: error.message }, null, 2)); process.exit(1); }
