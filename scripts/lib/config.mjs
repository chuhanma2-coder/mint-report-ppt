import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

export const skillRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
export const skillVersion = fs.readFileSync(path.join(skillRoot, "VERSION"), "utf8").trim();
export const theme = JSON.parse(fs.readFileSync(path.join(skillRoot, "assets/mint-fresh-theme/design-tokens.json"), "utf8"));
export const requiredHtmlCore = "0.15.0";

function candidates() {
  return [
    process.env.MINT_REPORT_HTML_SKILL,
    process.env.CODEX_HOME ? path.join(process.env.CODEX_HOME, "skills", "mint-report-html") : null,
    path.join(os.homedir(), ".codex", "skills", "mint-report-html"),
    path.resolve(skillRoot, "../mint-report-html")
  ].filter(Boolean);
}

export function locateHtmlCore() {
  for (const root of candidates()) {
    const extract = path.join(root, "scripts/extract-ppt-layout.mjs"), exporter = path.join(root, "scripts/export-editable-pptx.mjs"), collaboration = path.join(root, "scripts/collaboration-package.mjs"), assemble = path.join(root, "scripts/assemble-creative-report.mjs"), workflow = path.join(root, "scripts/run-creative-workflow.mjs");
    if (![extract, exporter, collaboration, assemble, workflow].every(fs.existsSync)) continue;
    let version = null, commit = null;
    const described = spawnSync("git", ["-C", root, "describe", "--tags", "--always"], { encoding: "utf8" });
    if (described.status === 0) version = described.stdout.trim().replace(/^v/, "");
    const revision = spawnSync("git", ["-C", root, "rev-parse", "HEAD"], { encoding: "utf8" });
    if (revision.status === 0) commit = revision.stdout.trim();
    const apiFile = path.join(root, "core-api.json");
    const api = fs.existsSync(apiFile) ? JSON.parse(fs.readFileSync(apiFile, "utf8")) : null;
    if (version && version !== requiredHtmlCore) throw new Error(`mint-report-html ${requiredHtmlCore} is required; found ${version} at ${root}`);
    if (!api || api.schemaVersion !== "1" || api.interfaces?.themeEnvironment !== "MINT_PPT_THEME_FILE" || api.interfaces?.packSectionSync !== "scripts/collaboration-package.mjs pack-section-sync") throw new Error(`mint-report-html at ${root} does not expose the required PPT core API; update it to the compatible ${requiredHtmlCore} build`);
    return { root, version: version || "compatible-unversioned", commit, extract, exporter, collaboration, assemble, workflow };
  }
  throw new Error(`mint-report-html ${requiredHtmlCore} is required. Install or update it before using mint-report-ppt.`);
}

export function themeCss() {
  const p = theme.palette;
  return `:root{--mint-page:${p.page};--mint-paper:${p.paper};--mint-ink:${p.ink};--mint-muted:${p.muted};--mint-blue:${p.blue};--mint-jade:${p.mint};--mint-jade-support:${p.mint};--mint-coral:${p.coral};--mint-subtle:${p.mintLight};--mint-line:${p.line};--mint-on-dark:${p.onDark};}`;
}

export function runNode(script, args, options = {}) {
  const runtimeNode = process.env.RUNTIME_NODE || process.execPath;
  const executableScript = fs.existsSync(script) ? fs.realpathSync(script) : script;
  const result = spawnSync(runtimeNode, [executableScript, ...args], { encoding: "utf8", maxBuffer: 80_000_000, ...options, env: { ...process.env, ...options.env } });
  if (result.status !== 0) throw new Error(result.stderr || result.stdout || `${path.basename(script)} failed`);
  return result.stdout.trim();
}
