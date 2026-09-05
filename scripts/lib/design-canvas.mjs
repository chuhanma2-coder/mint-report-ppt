import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const esc = value => String(value ?? "").replace(/[&<>\"]/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[char]);
const json = value => esc(JSON.stringify(value ?? {}));

function moduleMarkup(module, index) {
  const type = module.expression?.type || module.type;
  const role = module.semanticRole || "supportingEvidence";
  const priority = module.visualPriority || (role === "primaryEvidence" ? "P0" : ["managementConclusion", "decision", "risk", "action", "boundary"].includes(role) ? "P1" : "P2");
  const rowCount = (module.data?.rows || module.data?.values || []).length + ((module.data?.headers || module.data?.columns || []).length ? 1 : 0), categoryCount = (module.data?.categories || []).length;
  const preferredHeight = type === "table" ? Math.min(700, Math.max(480, 110 + rowCount * 82)) : type === "chart" ? Math.min(780, Math.max(520, 240 + categoryCount * 62)) : type === "image" ? 880 : type === "metric" ? 250 : Math.min(380, Math.max(210, 150 + String(module.text || "").length * 2.2));
  const attrs = `style="--preferred-h:${preferredHeight}px" data-mint-object="module" data-mint-index="${index}" data-mint-id="${esc(module.id || `M${index + 1}`)}" data-mint-kind="${esc(type)}" data-mint-role="${esc(role)}" data-mint-priority="${priority}" data-mint-band="${esc(module.compositionBand || "")}" data-mint-semantic="${json({ expression: module.expression, data: module.data, evidenceRefs: module.evidenceRefs })}"`;
  const title = module.title ? `<div class="module-title" data-mint-object="text">${esc(module.title)}</div>` : "";
  if (type === "metric") return `<section class="module metric" ${attrs}>${title}<div class="metric-value" data-mint-object="text">${esc(module.value ?? module.data?.value ?? "")}${esc(module.unit || "")}</div>${module.text ? `<div class="module-copy" data-mint-object="text">${esc(module.text)}</div>` : ""}</section>`;
  if (type === "image") {
    const source = module.imagePath || module.data?.imagePath || "", imageUrl = source && !/^(?:data:|https?:|file:)/i.test(source) ? pathToFileURL(path.resolve(source)).href : source;
    return `<section class="module image" ${attrs}>${title}<img src="${esc(imageUrl)}" alt="${esc(module.alt || module.title || "")}" /></section>`;
  }
  if (type === "table") {
    const data = module.data || {}, headers = data.headers || data.columns || [], rows = data.rows || [];
    return `<section class="module table" ${attrs}>${title}<table><thead><tr>${headers.map(cell => `<th>${esc(cell)}</th>`).join("")}</tr></thead><tbody>${rows.map(row => `<tr>${(Array.isArray(row) ? row : headers.map(key => row[key])).map(cell => `<td>${esc(cell)}</td>`).join("")}</tr>`).join("")}</tbody></table></section>`;
  }
  if (type === "chart") {
    const data = module.data || {}, categories = data.categories || [], series = data.series || [], values = series.flatMap(item => item.values || []).map(Number).filter(Number.isFinite), max = Math.max(1, ...values.map(Math.abs));
    const bars = categories.map((label, i) => { const value = Number(series[0]?.values?.[i] || 0), focus = module.expression?.focusCategories?.includes(String(label)); return `<div class="bar-row ${focus ? "focus" : ""}"><span>${esc(label)}</span><i style="--bar:${Math.max(2, Math.abs(value) / max * 100)}%"></i><b>${esc(value)}${esc(series[0]?.displayUnit || "")}</b></div>`; }).join("");
    return `<section class="module chart" ${attrs}>${title}<div class="chart-preview">${bars || `<div class="chart-placeholder">${esc(module.expression?.variant || "chart")}</div>`}</div></section>`;
  }
  if (type === "diagram") {
    const nodes = module.data?.nodes || [], edges = module.data?.edges || [];
    return `<section class="module diagram" ${attrs}>${title}<div class="diagram-preview">${nodes.map((node, i) => `<div class="diagram-node" data-node-id="${esc(node.id ?? i)}">${esc(node.label || node.name || node.id)}</div>${i < nodes.length - 1 ? `<span class="diagram-arrow">→</span>` : ""}`).join("")}</div><script type="application/json" class="diagram-data">${esc(JSON.stringify({ nodes, edges }))}</script></section>`;
  }
  return `<section class="module narrative" ${attrs}>${title}<div class="module-copy" data-mint-object="text">${esc(module.text || "")}</div></section>`;
}

function composition(slide) {
  const modules = slide.modules || [], primary = modules.findIndex(module => module.visualPriority === "P0" || module.semanticRole === "primaryEvidence");
  const bands = new Set(modules.map(module => module.compositionBand).filter(Boolean));
  const primaryType = primary >= 0 ? (modules[primary].expression?.type || modules[primary].type) : null;
  const primaryRows = primaryType === "table" ? (modules[primary].data?.rows || modules[primary].data?.values || []).length + ((modules[primary].data?.headers || modules[primary].data?.columns || []).length ? 1 : 0) : 0;
  if (primaryType === "image" && modules.length > 1) return "primary-rail";
  if (primaryType === "table" && modules.length === 2 && primaryRows <= 7) return "matrix-bottom";
  if (primaryType === "table" && modules[primary]?.tableRole === "primary" && modules.length > 1) return "matrix-led";
  if (["chart", "diagram"].includes(primaryType) && modules.length === 2 && ["managementConclusion", "decision", "risk", "action", "boundary"].includes(modules.find((_, index) => index !== primary)?.semanticRole)) return "primary-bottom";
  if (["dashboard", "banded-story", "evidence-rich"].includes(slide.pageComposition) || bands.size >= 2) return "story-bands";
  if ((modules[0]?.expression?.type || modules[0]?.type) === "table" && modules.length > 1) return "matrix-led";
  if (primary >= 0 && modules.length > 1) return "primary-rail";
  if (slide.semanticIntent?.includes("process") || slide.semanticIntent?.includes("relationship")) return "sequence";
  return modules.length === 1 ? "single" : "balanced";
}

function slideMarkup(slide, index) {
  const comp = composition(slide);
  return `<article class="mint-ppt-slide ${comp}" data-slide-index="${index}" data-slide-id="${esc(slide.id)}" data-composition="${comp}">
    <header><h1 data-mint-object="title">${esc(slide.claim)}</h1>${slide.showManagementQuestion && slide.managementQuestion ? `<p data-mint-object="question">${esc(slide.managementQuestion)}</p>` : ""}</header>
    <main>${(slide.modules || []).map(moduleMarkup).join("")}</main>
  </article>`;
}

export function createDesignCanvas(ir, theme) {
  const p = theme.palette;
  return `<!doctype html><html><head><meta charset="utf-8"><style>
*{box-sizing:border-box}html,body{margin:0;background:#dfe5e2;font-family:${JSON.stringify(theme.fonts.cjk)},sans-serif;color:${p.ink}}body{display:flex;flex-direction:column;gap:24px;padding:24px}.mint-ppt-slide{width:1920px;height:1080px;background:${p.page};padding:56px 88px;overflow:hidden;display:grid;grid-template-rows:auto 1fr;gap:24px}.mint-ppt-slide header h1{font-size:46px;line-height:1.16;margin:0;max-width:1720px;letter-spacing:-.5px;padding-bottom:8px}.mint-ppt-slide header p{font-size:23px;color:${p.muted};margin:12px 0 0}.mint-ppt-slide main{min-height:0;display:grid;gap:22px;align-content:start}.module{position:relative;min-width:0;min-height:0;height:var(--preferred-h);border:1.5px solid ${p.line};border-radius:20px;background:${p.paper};padding:30px;overflow:hidden;align-self:start}.module[data-mint-priority="P0"]{border-color:${p.mint};border-width:2.5px;box-shadow:inset 8px 0 0 ${p.mint}}.module[data-mint-priority="P1"]{background:${p.mintLight}}.module[data-mint-role="risk"]{background:${p.coralLight};border-color:${p.coral}}.module-title{font-size:32px;font-weight:700;line-height:1.22;margin:0 0 18px}.module-copy{font-size:28px;line-height:1.42;white-space:pre-wrap}.metric{display:flex;flex-direction:column;justify-content:center}.metric-value{font-size:64px;font-weight:800;color:${p.mint};line-height:1.05}.image{padding:14px;display:flex;flex-direction:column}.image img{display:block;width:100%;height:auto;min-height:0;flex:1;object-fit:contain}.table{padding:20px}.table table{width:100%;height:calc(100% - 45px);border-collapse:collapse;font-size:22px}.table th,.table td{border:1px solid ${p.line};padding:12px 15px;text-align:left;vertical-align:middle}.table th{background:${p.mintLight};font-weight:700}.chart-preview{display:grid;gap:14px;height:calc(100% - 46px);align-content:center}.bar-row{display:grid;grid-template-columns:minmax(165px,28%) 1fr 120px;gap:16px;align-items:center;font-size:24px}.bar-row i{display:block;width:var(--bar);height:30px;background:${p.blue};border-radius:5px}.bar-row.focus i{background:${p.orange}}.bar-row.focus span,.bar-row.focus b{font-weight:800}.diagram-preview{height:calc(100% - 46px);display:flex;align-items:center;justify-content:space-around;gap:12px}.diagram-node{flex:1;min-height:150px;border:2px solid ${p.mint};border-radius:18px;background:${p.mintLight};padding:24px;display:flex;align-items:center;justify-content:center;text-align:center;font-size:28px;font-weight:700}.diagram-arrow{font-size:40px;color:${p.mint}}.diagram-data{display:none}
.primary-rail main{grid-template-columns:minmax(0,1.8fr) minmax(360px,.72fr);grid-auto-rows:auto}.primary-rail .module[data-mint-priority="P0"]{grid-row:1/span 4}.primary-bottom main,.matrix-bottom main{grid-template-columns:1fr;grid-template-rows:auto auto}.primary-bottom .module[data-mint-priority="P0"]{height:min(var(--preferred-h),650px)}.primary-bottom .module:not([data-mint-priority="P0"]),.matrix-bottom .module:not([data-mint-priority="P0"]){height:min(var(--preferred-h),210px)}.story-bands main{grid-template-columns:repeat(12,1fr);grid-template-rows:minmax(150px,.24fr) minmax(340px,.5fr) minmax(150px,.26fr);align-content:stretch}.story-bands .module{grid-column:span 4;height:auto;align-self:stretch}.story-bands .module[data-mint-band="primary"],.story-bands .module[data-mint-priority="P0"]{grid-column:span 8;grid-row:2}.story-bands .module[data-mint-role="context"],.story-bands .metric{grid-row:1}.story-bands .module[data-mint-role="managementConclusion"],.story-bands .module[data-mint-role="decision"],.story-bands .module[data-mint-role="risk"],.story-bands .module[data-mint-role="action"],.story-bands .module[data-mint-role="boundary"]{grid-row:3}.matrix-led main{grid-template-columns:minmax(0,1.7fr) minmax(360px,.7fr);align-items:start}.sequence main{grid-template-columns:1fr}.balanced main{grid-template-columns:repeat(2,minmax(0,1fr))}.single main{grid-template-columns:1fr}
</style></head><body>${ir.slides.map(slideMarkup).join("")}<script>Promise.all([...document.images].map(i=>i.complete?Promise.resolve():i.decode())).then(()=>document.documentElement.dataset.renderReady='true')</script></body></html>`;
}

export function writeDesignCanvas(ir, theme, output) {
  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.writeFileSync(output, createDesignCanvas(ir, theme));
  return output;
}
