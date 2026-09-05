#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { skillVersion, theme } from "./lib/config.mjs";

try {
  if (!process.env.RUNTIME_NODE_MODULES) throw new Error("RUNTIME_NODE_MODULES is required; load workspace dependencies first");
  if (!process.env.RUNTIME_NODE) throw new Error("RUNTIME_NODE is required; load workspace dependencies first");
  const require = createRequire(path.join(process.env.RUNTIME_NODE_MODULES, "package.json"));
  const artifactTool = require.resolve("@oai/artifact-tool"); if (!fs.existsSync(artifactTool)) throw new Error("Bundled @oai/artifact-tool is unavailable");
  const playwright = require.resolve("playwright"); if (!fs.existsSync(playwright)) throw new Error("Bundled Playwright is unavailable");
  const browser = process.env.MINT_CHROMIUM_EXECUTABLE || [
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe"
  ].find(candidate => fs.existsSync(candidate));
  if (!browser) throw new Error("Chrome or Edge is required for the internal Design Canvas renderer; set MINT_CHROMIUM_EXECUTABLE");
  console.log(JSON.stringify({ passed: true, skill: "mint-report-ppt", skillVersion, themeVersion: theme.themeVersion, runtimeNode: process.env.RUNTIME_NODE, artifactTool, playwright, browser }, null, 2));
} catch (error) { console.error(JSON.stringify({ passed: false, error: error.message }, null, 2)); process.exit(1); }
