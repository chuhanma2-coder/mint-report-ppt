#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { skillVersion, theme } from "./lib/config.mjs";
import { browserExecutable } from './lib/browser-executable.mjs';

try {
  if (!process.env.RUNTIME_NODE_MODULES) throw new Error("RUNTIME_NODE_MODULES is required; load workspace dependencies first");
  if (!process.env.RUNTIME_NODE) throw new Error("RUNTIME_NODE is required; load workspace dependencies first");
  const require = createRequire(path.join(process.env.RUNTIME_NODE_MODULES, "package.json"));
  const artifactTool = require.resolve("@oai/artifact-tool"); if (!fs.existsSync(artifactTool)) throw new Error("Bundled @oai/artifact-tool is unavailable");
  const playwright = require.resolve("playwright"); if (!fs.existsSync(playwright)) throw new Error("Bundled Playwright is unavailable");
  const browser = browserExecutable({bundled:require('playwright').chromium.executablePath()});
  console.log(JSON.stringify({ passed: true, skill: "mint-report-ppt", skillVersion, themeVersion: theme.themeVersion, runtimeNode: process.env.RUNTIME_NODE, artifactTool, playwright, browser }, null, 2));
} catch (error) { console.error(JSON.stringify({ passed: false, error: error.message }, null, 2)); process.exit(1); }
