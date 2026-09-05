#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { compareRenderedSlides } from "./lib/visual-parity.mjs";

const [referenceArg, candidateArg, countArg, outputArg] = process.argv.slice(2);
const referenceDir = path.resolve(referenceArg || ""), candidateDir = path.resolve(candidateArg || ""), slideCount = Number(countArg), outputFile = path.resolve(outputArg || "");
if (!fs.existsSync(referenceDir) || !fs.existsSync(candidateDir) || !Number.isInteger(slideCount) || slideCount < 1 || !outputArg) {
  console.error("Usage: verify-render-parity.mjs design-render-dir powerpoint-render-dir slide-count output.json"); process.exit(2);
}
try { const report = await compareRenderedSlides({ referenceDir, candidateDir, slideCount, outputFile }); console.log(JSON.stringify(report, null, 2)); if (!report.passed) process.exit(1); }
catch (error) { console.error(JSON.stringify({ passed: false, error: error.message }, null, 2)); process.exit(1); }
