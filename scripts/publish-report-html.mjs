#!/usr/bin/env node
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { inspectPptxPackage } from "./lib/pptx-metadata.mjs";

const input = path.resolve(process.argv[2] || ""), output = path.resolve(process.argv[3] || "");
if (!input || !output || !fs.existsSync(input)) { console.error("Usage: publish-report-html.mjs final.pptx output.html"); process.exit(2); }

function mime(file) { return file.toLowerCase().endsWith(".jpg") || file.toLowerCase().endsWith(".jpeg") ? "image/jpeg" : "image/png"; }

try {
  const renderer = process.env.MINT_RENDER_SLIDES_SCRIPT;
  const python = process.env.RUNTIME_PYTHON;
  if (!renderer || !fs.existsSync(renderer) || !python || !fs.existsSync(python)) throw new Error("Set RUNTIME_PYTHON and MINT_RENDER_SLIDES_SCRIPT to the bundled Presentations render_slides.py");
  const pkg = await inspectPptxPackage(input); if (!pkg.slides.length) throw new Error("Final PPTX has no slides");
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), "mint-ppt-publish-"));
  try {
    const rendered = spawnSync(python, [renderer, input, "--output_dir", temp, "--width", "1920", "--height", "1080"], { encoding: "utf8", maxBuffer: 20_000_000 });
    if (rendered.status !== 0) throw new Error(rendered.stderr || rendered.stdout || "PPT rendering failed");
    const frames = fs.readdirSync(temp).filter(file => /\.(png|jpe?g)$/i.test(file)).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
    if (frames.length !== pkg.slides.length) throw new Error(`Rendered frame count ${frames.length} differs from PPT slide count ${pkg.slides.length}`);
    const scenes = frames.map((file, index) => `<section class="scene${index === 0 ? " active" : ""}" data-index="${index}"><img src="data:${mime(file)};base64,${fs.readFileSync(path.join(temp, file)).toString("base64")}" alt="第${index + 1}页"></section>`).join("");
    const dots = frames.map((_, index) => `<button aria-label="第${index + 1}页" data-index="${index}"${index === 0 ? ' class="active"' : ""}></button>`).join("");
    const html = `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${path.basename(input, path.extname(input))}</title><style>html,body{margin:0;background:#edf2ef;color:#18312a;font-family:"Microsoft YaHei",sans-serif;overflow:hidden}.scene{display:none;width:100vw;height:100vh;align-items:center;justify-content:center}.scene.active{display:flex}.scene img{display:block;max-width:100vw;max-height:100vh;width:auto;height:auto;box-shadow:0 10px 36px #18312a20}.nav{position:fixed;left:50%;bottom:18px;transform:translateX(-50%);display:flex;gap:10px;padding:10px 14px;border-radius:999px;background:#ffffffdd;backdrop-filter:blur(8px)}.nav button{width:9px;height:9px;padding:0;border:0;border-radius:50%;background:#9eaaa5;cursor:pointer}.nav button.active{background:#00866a;transform:scale(1.3)}@media print{.nav{display:none}.scene{display:flex;break-after:page;width:100vw;height:100vh}.scene img{box-shadow:none}}</style></head><body>${scenes}<nav class="nav">${dots}</nav><script>const scenes=[...document.querySelectorAll('.scene')],dots=[...document.querySelectorAll('.nav button')];let current=0;function show(i){current=(i+scenes.length)%scenes.length;scenes.forEach((s,n)=>s.classList.toggle('active',n===current));dots.forEach((d,n)=>d.classList.toggle('active',n===current))}dots.forEach(d=>d.onclick=()=>show(+d.dataset.index));addEventListener('keydown',e=>{if(['ArrowRight','PageDown',' '].includes(e.key))show(current+1);if(['ArrowLeft','PageUp'].includes(e.key))show(current-1)});</script></body></html>`;
    fs.mkdirSync(path.dirname(output), { recursive: true }); fs.writeFileSync(output, html);
    console.log(JSON.stringify({ passed: true, input, output, slides: frames.length, authority: "read-only-publication", source: "actual-final-ppt-order" }, null, 2));
  } finally { fs.rmSync(temp, { recursive: true, force: true }); }
} catch (error) { console.error(JSON.stringify({ passed: false, error: error.message }, null, 2)); process.exit(1); }
