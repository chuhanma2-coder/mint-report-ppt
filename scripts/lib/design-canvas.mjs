import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { chartDisplayModel } from "./chart-display-model.mjs";
import {projectPresentationCopy} from './presentation-copy.mjs';
import { primitiveMarkup, primitiveCss, visualModuleMarkup, repairPrimitiveLayout } from './visual-primitives.mjs';
import {sceneMarkup,sceneCss,sceneRepairCss,sceneAttachmentCss,layoutAttachments,networkOrder,layoutNetworks} from './scene-plan.mjs';

const esc = value => String(value ?? "").replace(/[&<>\"]/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[char]);
const json = value => esc(JSON.stringify(value ?? {}));

function moduleMarkup(module, index, placement = '') {
  const type = module.expression?.type || module.type;
  const role = module.semanticRole || "supportingEvidence";
  const priority = module.visualPriority || (["chart", "table", "diagram"].includes(type) ? "P1" : ["managementConclusion", "decision"].includes(role) ? "P0" : ["primaryEvidence", "risk", "action", "boundary"].includes(role) ? "P1" : "P2");
const attrs = `style="${placement}" data-mint-object="module" data-mint-index="${index}" data-mint-id="${esc(module.id || `M${index + 1}`)}" data-mint-kind="${esc(type)}" data-mint-role="${esc(role)}" data-mint-priority="${priority}" data-mint-band="${esc(module.compositionBand || "")}" data-mint-semantic="${json({ expression: module.expression, data: module.data, imageTextReview: module.imageTextReview, evidenceRefs: module.evidenceRefs })}"`;
  const title = module.title ? `<div class="module-title" data-mint-object="text">${esc(module.title)}</div>` : "";
  const visual = visualModuleMarkup(module);
  if (visual != null) return `<section class="module visual-narrative" ${attrs}>${title}${visual}${module.text ? `<div class="module-copy" data-mint-object="text">${esc(module.text)}</div>` : ''}</section>`;
  if (module.primitive && ['takeaway-band','risk-strip','decision-strip','status-chip','metric-badge'].includes(module.primitive)) return `<section class="module narrative" ${attrs}>${title}${primitiveMarkup(module.primitive, module.text || String(module.value ?? ''), module.id)}</section>`;
  if (type === 'metric' && module.data?.categories?.length && module.data.series?.length) {
    const cells = module.data.categories.map((label,i) => `<div><div class="module-title" data-mint-object="text">${esc(label)}</div>${module.data.series.map(s => {
      if (s.values?.[i] == null) throw new Error(`MISSING_METRIC_VALUE: ${module.id}/${label}`);
      return `<div class="module-copy" data-mint-object="text">${esc(s.name || '')}</div><div class="metric-value" data-mint-object="text">${esc(s.values[i])}${esc(s.displayUnit || module.unit || '')}</div>`;
    }).join('')}</div>`).join('');
    return `<section class="module metric" ${attrs}>${title}<div class="metric-cells">${cells}</div>${module.text ? `<div class="module-copy" data-mint-object="text">${esc(module.text)}</div>` : ''}</section>`;
  }
  if (type === "metric") return `<section class="module metric" ${attrs}>${title}<div class="metric-value" data-mint-object="text">${esc(module.value ?? module.data?.value ?? "")}${esc(module.unit || "")}</div>${module.text ? `<div class="module-copy" data-mint-object="text">${esc(module.text)}</div>` : ""}</section>`;
  if (type === "image") {
    const source = module.imagePath || module.data?.imagePath || "", imageUrl = source && !/^(?:data:|https?:|file:)/i.test(source) ? pathToFileURL(path.resolve(source)).href : source;
    return `<section class="module image" ${attrs}>${title}<img src="${esc(imageUrl)}" alt="${esc(module.alt || module.title || "")}" /></section>`;
  }
  if (type === "table") {
    const data = module.data || {}, headers = data.headers || data.columns || [], rows = data.rows || [];
    return `<section class="module table" ${attrs}>${title}<div class="table-content ${rows.length<=4&&module.text?'table-with-note':''}"><div class="table-body"><table><thead><tr>${headers.map(cell => `<th>${esc(cell)}</th>`).join("")}</tr></thead><tbody>${rows.map(row => `<tr>${(Array.isArray(row) ? row : headers.map(key => row[key])).map(cell => `<td>${esc(cell)}</td>`).join("")}</tr>`).join("")}</tbody></table></div>${module.text ? `<div class="module-copy" data-mint-object="text">${esc(module.text)}</div>` : ""}</div></section>`;
  }
  if (type === "chart") return `<section class="module chart" ${attrs}>${title}<div class="chart-preview"></div></section>`;
  if (type === "diagram") {
    const nodes = module.data?.nodes || [], edges = module.data?.edges || [];
    if(edges.length>1 || module.measuredTopology==='network') {
      const order=networkOrder(nodes,edges),columns=Math.max(0,...order.map(n=>n.level))+1;
      if(nodes.length>10&&!nodes.every(n=>n.group)) throw new Error('NETWORK_GROUPING_REQUIRED: '+module.id);
      const graph=order.map(({id,level})=>{
        const node=nodes.find(n=>String(n.id)===id);
        const text=[node.label||node.name||id,node.text,node.timeRange?[node.timeRange.start,node.timeRange.end].join(' – '):null,node.condition,node.status,node.duration,...(node.metrics||[])].filter(Boolean).join('\n');
        return `<div class="diagram-node" data-node-id="${esc(id)}" data-actor-slot="${nodes.indexOf(node)%3}" style="grid-column:${level+1}">${esc(text)}</div>`;
      }).join('');
      return `<section class="module diagram" ${attrs}>${title}<div class="diagram-network" data-network-edges="${json(edges)}"><div class="network-nodes" style="grid-template-columns:repeat(${columns},fit-content(360px))">${graph}</div></div>${module.text?`<div class="module-copy" data-mint-object="text">${esc(module.text)}</div>`:''}</section>`;
    }
    const byId = new Map(nodes.map(node => [String(node.id), node]));
    const actorSlot = id => Math.max(0, nodes.findIndex(node => String(node.id) === String(id))) % 3;
    const used = new Set();
    const relationships = edges.map((edge, edgeIndex) => {
      const from = byId.get(String(edge.from)), to = byId.get(String(edge.to));
      if (!from || !to) throw new Error('DIAGRAM_ENDPOINT_MISSING: ' + module.id);
      used.add(String(from.id)); used.add(String(to.id));
      const label = [edge.label, edge.condition].filter(Boolean).join(' · ');
      return `<div class="diagram-rel" data-edge-index="${edgeIndex}"><div class="diagram-node" data-actor-slot="${actorSlot(from.id)}" data-node-id="${esc(from.id)}">${esc(from.label || from.name || from.id)}</div><div class="diagram-edge"><div class="edge-label" data-mint-object="text">${esc(label)}</div><div class="edge-arrow">→</div></div><div class="diagram-node" data-actor-slot="${actorSlot(to.id)}" data-node-id="${esc(to.id)}">${esc(to.label || to.name || to.id)}</div></div>`;
    }).join('');
    const isolated = nodes.filter(node => !used.has(String(node.id))).map(node => `<div class="diagram-node" data-node-id="${esc(node.id)}">${esc(node.label || node.name || node.id)}</div>`).join('');
    return `<section class="module diagram" ${attrs}>${title}<div class="diagram-preview">${relationships}${isolated}</div>${module.text ? `<div class="module-copy" data-mint-object="text">${esc(module.text)}</div>` : ''}</section>`;
  }
  return `<section class="module narrative" ${attrs}>${title}<div class="module-copy" data-mint-object="text">${esc(module.text || "")}</div></section>`;
}

function composition(slide) {
  if(slide.scenePlan) return 'scene-plan';
  if (slide.measuredComposition) return slide.measuredComposition;
  const modules = slide.modules || [], explicitPrimary = modules.findIndex(module => module.visualPriority === "P0"), primary = explicitPrimary >= 0 ? explicitPrimary : modules.findIndex(module => module.semanticRole === "primaryEvidence");
  const bands = new Set(modules.map(module => module.compositionBand).filter(Boolean));
  const primaryType = primary >= 0 ? (modules[primary].expression?.type || modules[primary].type) : null;
  if (primaryType === "image" && modules.length > 1) return "primary-rail";
  if (["dashboard", "banded-story", "evidence-rich"].includes(slide.pageComposition) || bands.size >= 2) return "story-bands";
  if (primary >= 0 && modules.length > 1) return "primary-rail";
  if (slide.semanticIntent?.includes("process") || slide.semanticIntent?.includes("relationship")) return "sequence";
  return modules.length === 1 ? "single" : "balanced";
}

function slideMarkup(slide, index) {
  const comp = composition(slide);
  const modules = slide.modules || [], placements = modules.map(() => '');
  let bandCount = slide.scenePlan?.regions.length || 0, railPrimary = -1;
  if (['primary-rail', 'primary-above'].includes(comp) && modules.length > 1) {
    let primary = modules.findIndex(m => m.id === slide.visualNarrative?.primaryCarrier || m.id === slide.designIntent?.primaryCarrier);
    if (primary < 0) primary = modules.findIndex(m => (m.expression?.type || m.type) === 'image');
    if (primary < 0) {
      const demand = m => String(m.text || '').length + JSON.stringify(m.data || {}).length;
      primary = modules.reduce((best,m,i) => demand(m) > demand(modules[best]) ? i : best,0);
    }
    railPrimary = primary;
  } else if (comp === 'story-bands') {
    const bands = [[], [], []];
    modules.forEach((m, i) => {
      const kind = m.expression?.type || m.type;
      const band = m.visualPriority === 'P0' || kind === 'metric' || m.semanticRole === 'context' ? 0 : ['action', 'risk', 'boundary', 'managementConclusion', 'decision'].includes(m.semanticRole) ? 2 : 1;
      bands[band].push(i);
    });
    let row = 1;
    for (const band of bands.filter(b => b.length)) {
      bandCount++;
      for (let start = 0; start < band.length; start += 3) {
        const chunk = band.slice(start, start + 3), span = 12 / chunk.length;
        chunk.forEach((i, column) => { placements[i] = `grid-row:${row};grid-column:${column * span + 1} / span ${span}`; });
        row++;
      }
    }
  }
  const order = slide.compositionClassification?.narrativeAccepted ? slide.visualNarrative?.readingOrder || [] : [];
  const indexes = [...order.map(id=>modules.findIndex(m=>m.id===id)).filter(i=>i>=0), ...modules.map((_,i)=>i).filter(i=>!order.includes(modules[i].id))];
  const content = slide.scenePlan ? sceneMarkup(slide,moduleMarkup) : railPrimary >= 0 ? moduleMarkup(modules[railPrimary],railPrimary) + `<aside class="support-rail">${modules.map((m,i)=>i===railPrimary?'':moduleMarkup(m,i)).join('')}</aside>` : indexes.map(i=>moduleMarkup(modules[i],i,placements[i])).join('');
  return `<article class="mint-ppt-slide ${comp} ${slide.measuredDensity === 'compact' ? 'compact' : ''}" data-slide-index="${index}" data-slide-id="${esc(slide.id)}" data-composition="${comp}">
    <header><h1 data-mint-object="title">${esc(slide.claim)}</h1>${slide.showManagementQuestion && slide.managementQuestion ? `<p data-mint-object="question">${esc(slide.managementQuestion)}</p>` : ""}</header>
    <main data-band-count="${bandCount}">${content}</main>
  </article>`;
}

export function createDesignCanvas(ir, theme) {
  ir=projectPresentationCopy(ir);
  const p = theme.palette;
  const fontPx = (role, index = 0) => theme.typographyPt[role][index] * 96 / 72;
  return `<!doctype html><html><head><meta charset="utf-8"><style>
*{box-sizing:border-box}
html,body{margin:0;background:#dfe5e2;font-family:${JSON.stringify(theme.fonts.cjk)},sans-serif;color:${p.ink}}
body{display:flex;flex-direction:column;gap:24px;padding:24px}
.mint-ppt-slide{width:1920px;height:1080px;background:${p.page};padding:56px 88px;overflow:hidden;display:grid;grid-template-rows:auto 1fr;gap:24px}
.mint-ppt-slide header h1{font-size:${fontPx('contentTitle')}px;line-height:1.16;margin:0;max-width:1720px}
.mint-ppt-slide header p{font-size:${fontPx('supportBody')}px;color:${p.muted};margin:12px 0 0}
.mint-ppt-slide main{min-height:0;display:grid;gap:22px;align-content:start;align-items:start;grid-auto-rows:max-content}
.module{position:relative;min-width:0;min-height:0;height:auto;padding:20px;align-self:start}
.module-title{font-size:${fontPx('body',1)}px;font-weight:700;line-height:1.2;margin-bottom:10px;color:${theme.semanticColors.moduleHeading}}
${Object.entries(theme.semanticColors.roleAccents || {}).map(([role,color]) => `[data-mint-role="${role}"]{--role-accent:${color}}[data-mint-role="${role}"] .module-title{color:${color}}`).join('\n')}
.narrative[data-mint-role="managementConclusion"],.narrative[data-mint-role="action"],.narrative[data-mint-role="risk"],.metric{border-left:4px solid var(--role-accent,${p.mint});background:${p.paper}}
[data-mint-role="risk"] .module-title,[data-mint-role="boundary"] .module-title{color:${theme.semanticColors.riskHeading}}
.module-copy{font-size:${fontPx('body')}px;line-height:1.3;white-space:pre-wrap}
.narrative[data-mint-priority="P0"] .module-copy{font-size:${fontPx('body',1)}px;font-weight:600}
.metric-value{font-size:${fontPx('heroMetric',1)}px;font-weight:800;color:${theme.semanticColors.metricText};line-height:1.3}
.metric-cells{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:20px}.metric-cells .metric-value{font-size:${fontPx('heroMetric')}px}
.image img{display:block;width:100%;height:auto;max-height:620px;object-fit:contain}
.table table{font-size:${fontPx('table',1)}px;table-layout:auto;width:100%;border-collapse:collapse}
.table th,.table td{padding:8px 10px;vertical-align:top;border:1px solid ${p.line};text-align:left}
.table th{background:${p.blueLight};font-weight:700;color:${theme.semanticColors.moduleHeading}}
.table tbody tr:nth-child(even){background:${p.neutralLight}}
.table-with-note{display:grid;grid-template-columns:minmax(0,1.8fr) minmax(200px,.8fr);gap:24px}.table-body{min-width:0}
.chart-preview{position:relative;min-width:0}
.diagram-preview{display:grid;gap:16px}
.diagram-rel{display:grid;grid-template-columns:minmax(110px,1fr) minmax(140px,1.5fr) minmax(110px,1fr);gap:16px;align-items:end}
.diagram-node{padding:12px;font-size:${fontPx('diagramNode',1)}px;line-height:1.25;white-space:pre-line;border:2px solid ${p.mint};background:${p.mintLight};font-weight:700}
.diagram-node[data-actor-slot="0"]{border-color:${p.blue};background:${p.blueLight}}
.diagram-node[data-actor-slot="2"]{border-color:${p.orange};background:${p.orangeLight}}
.diagram-edge{text-align:center}
.edge-label{font-size:${fontPx('diagramEdge',1)}px;line-height:1.2;margin-bottom:16px}
.edge-arrow{font-size:26px;line-height:1}
.diagram-network{position:relative;min-width:0}.network-nodes{display:grid;gap:32px 160px;padding:0 32px;align-items:center}.network-edge{position:absolute;inset:0;pointer-events:none}.network-segment{position:absolute;border-top:2px solid ${p.mint};transform-origin:0 0}.network-segment.last:after{content:'';position:absolute;right:-1px;top:-6px;border-left:9px solid ${p.mint};border-top:5px solid transparent;border-bottom:5px solid transparent}.network-edge .edge-label{position:absolute;margin:0;background:${p.page};padding:3px 5px;white-space:pre-wrap}
.story-bands main{grid-template-columns:repeat(12,minmax(0,1fr))}
.balanced main{grid-template-columns:repeat(2,minmax(0,1fr))}
.primary-rail main{grid-template-columns:minmax(0,1.8fr) minmax(360px,.8fr)}
.primary-above main{grid-template-columns:1fr}
.primary-above .support-rail{display:grid;grid-template-columns:repeat(2,minmax(0,1fr))}
.support-rail{display:flex;flex-direction:column;gap:22px;min-width:0}.support-rail .module{width:100%}
.single main,.sequence main{grid-template-columns:1fr}
.compact .module{padding:12px}.compact main{gap:16px}
.compact .module-copy{font-size:${fontPx('denseBody')}px}
.compact table{font-size:${fontPx('table')}px}
.compact .diagram-node{font-size:${fontPx('diagramNode')}px}
.compact .edge-label{font-size:${fontPx('diagramEdge')}px}
.compact header h1{font-size:${fontPx('denseTitle')}px}
${primitiveCss(theme)}
.vp-text{padding-right:.6em}
.profile-identity{font-size:${fontPx('diagramNode')}px;font-weight:700;color:${p.muted}}
.profile-secondary{font-size:${fontPx('supportBody',1)}px;line-height:1.25;border-top:1px solid ${p.line};padding-top:8px;white-space:pre-wrap}
${sceneCss}
${sceneRepairCss}
${sceneAttachmentCss}
.narrative-flow main{grid-template-columns:1fr}
</style></head><body>${ir.slides.map(slideMarkup).join("")}<script>
(() => {
const chartDisplayModel = ${chartDisplayModel.toString()};
const layoutNetworks = ${layoutNetworks.toString()};
const layoutAttachments = ${layoutAttachments.toString()};
const repairPrimitiveLayout = ${repairPrimitiveLayout.toString()};
window.mintRelayoutAttachments=layoutAttachments;
function renderCharts() {
  for (const module of document.querySelectorAll('.module.table')) {
    const semantic = JSON.parse(module.dataset.mintSemantic), focus = semantic.expression?.focusRows || [];
    const rows = [...module.querySelectorAll('tbody tr')], headers = [...module.querySelectorAll('th')].map(cell => cell.textContent);
    // Measure readable column minima before page-capacity selection. A table
    // that fits only by wrapping names into single characters does not fit.
    const measure = document.createElement('canvas').getContext('2d');
    const preferredWidths = [];
    for (let column = 0; column < headers.length; column++) {
      const cells = [...module.querySelectorAll('tr')].map(row => row.cells[column]).filter(Boolean);
      const minimum = Math.max(...cells.map(cell => {
        const style = getComputedStyle(cell); measure.font = style.font;
        const value = cell.textContent.trim();
        const sample = /^[+−–-]?[\\d,.]+(?:%|万|亿|元|人)*$/.test(value) ? value : [...value].slice(0, 4).join('');
        return measure.measureText(sample).width + parseFloat(style.paddingLeft) + parseFloat(style.paddingRight) + 2;
      }));
      for (const cell of cells) cell.style.minWidth = minimum + 'px';
      // Natural column demand, not the space left on the slide. Explanations
      // wrap while numeric tokens retain their complete readable width.
      preferredWidths.push(Math.max(minimum, Math.min(420, Math.max(...cells.map(cell => {
        const style = getComputedStyle(cell); measure.font = style.font;
        return measure.measureText(cell.textContent.trim()).width + 26;
      })))));
    }
    const table = module.querySelector('table');
    const available = table.parentElement.clientWidth;
    table.style.width = Math.min(available, preferredWidths.reduce((sum, width) => sum + width, 0)) + 'px';
    // Shrinking the table must also release its empty track. This is a bounded
    // repair of a split scene, never a change to comparison/parallel topology.
    const region = module.parentElement;
    if (region.matches('.scene-content-first .scene-split') && region.children.length === 2 && [...region.children].filter(child => child.classList.contains('table')).length === 1) {
      const style = getComputedStyle(module);
      const natural = table.getBoundingClientRect().width + parseFloat(style.paddingLeft) + parseFloat(style.paddingRight);
      const width = Math.min(region.clientWidth * .65, natural);
      region.style.gridTemplateColumns = [...region.children].map(child => child === module ? width + 'px' : 'minmax(0,1fr)').join(' ');
    }
    rows.forEach((row, i) => {
      if (focus.includes(row.cells[0]?.textContent)) for (const cell of row.cells) { cell.style.backgroundColor = '${p.orangeLight}'; cell.style.fontWeight = '700'; }
      if (semantic.expression?.variant === 'decision-matrix') for (const [j, cell] of [...row.cells].entries()) {
        if (j === 0 || /进入|策略|方式|动作/.test(headers[j])) cell.style.backgroundColor = '${p.blueLight}';
        else if (/损失|风险/.test(headers[j])) cell.style.backgroundColor = /高/.test(cell.textContent) ? '${p.coralLight}' : /低/.test(cell.textContent) ? '${p.mintLight}' : '${p.orangeLight}';
      }
    });
  }
  // Align actual connector sites for unequal multi-line actor names. Labels
  // remain above this shared lane instead of straddling a diagonal arrow.
  for (const row of document.querySelectorAll('.diagram-rel')) {
    const nodes = [...row.querySelectorAll('.diagram-node')];
    const measure = document.createElement('canvas').getContext('2d');
    const minimums = nodes.map(node => {
      const style = getComputedStyle(node); measure.font = style.font;
      return Math.max(180, Math.min(300, Math.max(...node.textContent.split('\\n').map(line => measure.measureText(line).width)) + 28));
    });
    row.style.gridTemplateColumns = 'minmax(' + minimums[0] + 'px,1fr) minmax(140px,1.5fr) minmax(' + minimums[1] + 'px,1fr)';
    const height = Math.max(...nodes.map(node => node.getBoundingClientRect().height));
    for (const node of nodes) node.style.minHeight = height + 'px';
    const arrow = row.querySelector('.edge-arrow');
    arrow.style.height = height + 'px'; arrow.style.display = 'flex';
    arrow.style.alignItems = 'center'; arrow.style.justifyContent = 'center';
  }
  layoutNetworks();
  for (const module of document.querySelectorAll('.module.chart')) {
    const semantic = JSON.parse(module.dataset.mintSemantic), host = module.querySelector('.chart-preview');
    const model = chartDisplayModel(semantic.data, semantic.expression, host.clientWidth, ${JSON.stringify(p)});
    module.dataset.chartModel = JSON.stringify(model);
    host.style.cssText = 'position:relative;height:' + model.height + 'px';
    for (const primitive of model.primitives) {
      const element = document.createElement('div');
      element.dataset.chartPrimitive = primitive.kind;
      element.style.position = 'absolute'; element.style.left = primitive.x + 'px'; element.style.top = primitive.y + 'px';
      if (primitive.kind === 'line') {
        const dx = primitive.x2 - primitive.x, dy = primitive.y2 - primitive.y;
        element.style.width = Math.hypot(dx,dy) + 'px'; element.style.borderTop = '2px solid ' + primitive.color;
        element.style.transformOrigin = '0 0'; element.style.transform = 'rotate(' + Math.atan2(dy,dx) + 'rad)';
      } else {
        element.style.width = primitive.width + 'px'; element.style.height = primitive.height + 'px';
        if (primitive.kind === 'text') {
          element.textContent = primitive.text; element.dataset.mintObject = 'text';
          element.className = primitive.role || 'chartLabel';
          element.style.fontSize = primitive.fontSize + 'px'; element.style.lineHeight = '1.2'; element.style.color = primitive.color;
        } else if (primitive.kind === 'sector') {
          const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg'), arc = document.createElementNS('http://www.w3.org/2000/svg', 'path');
          svg.setAttribute('width', primitive.width); svg.setAttribute('height', primitive.height);
          arc.setAttribute('d', primitive.path); arc.setAttribute('fill', primitive.color); svg.appendChild(arc); element.appendChild(svg);
        } else {
          element.style.backgroundColor = primitive.color;
          if (primitive.kind === 'circle') element.style.borderRadius = '50%';
        }
      }
      host.appendChild(element);
    }
  }
  layoutAttachments();
}
Promise.all([document.fonts.ready,...[...document.images].map(i=>i.decode())]).then(()=>{try{repairPrimitiveLayout();renderCharts();document.documentElement.dataset.renderReady='true'}catch(error){document.documentElement.dataset.renderError=error.message;document.documentElement.dataset.renderReady='true'}});
})();
</script></body></html>`;
}

export function writeDesignCanvas(ir, theme, output) {
  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.writeFileSync(output, createDesignCanvas(ir, theme));
  return output;
}
