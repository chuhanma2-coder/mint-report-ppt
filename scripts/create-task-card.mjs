#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { createTaskCard } from "./lib/task-card.mjs";

const input = path.resolve(process.argv[2] || ""), output = path.resolve(process.argv[3] || "");
if (!input || !output || !fs.existsSync(input)) { console.error("Usage: create-task-card.mjs config.json report.mint-ppt-task.json"); process.exit(2); }
try {
  const card = createTaskCard(JSON.parse(fs.readFileSync(input, "utf8")));
  fs.mkdirSync(path.dirname(output), { recursive: true }); fs.writeFileSync(output, `${JSON.stringify(card, null, 2)}\n`);
  console.log(JSON.stringify({ passed: true, output, reportId: card.reportId, sections: card.sections.length, skillVersion: card.skillVersion, themeVersion: card.themeVersion }, null, 2));
} catch (error) { console.error(JSON.stringify({ passed: false, error: error.message }, null, 2)); process.exit(1); }
