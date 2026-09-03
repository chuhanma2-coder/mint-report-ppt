#!/usr/bin/env node
import { locateHtmlCore, requiredHtmlCore, skillVersion, theme } from "./lib/config.mjs";

try {
  const html = locateHtmlCore();
  if (!process.env.RUNTIME_NODE_MODULES) throw new Error("RUNTIME_NODE_MODULES is required; load workspace dependencies first");
  if (!process.env.RUNTIME_NODE) throw new Error("RUNTIME_NODE is required; load workspace dependencies first");
  console.log(JSON.stringify({ passed: true, skill: "mint-report-ppt", skillVersion, themeVersion: theme.themeVersion, requiredHtmlCore, runtimeNode: process.env.RUNTIME_NODE, htmlCore: html }, null, 2));
} catch (error) { console.error(JSON.stringify({ passed: false, error: error.message }, null, 2)); process.exit(1); }
