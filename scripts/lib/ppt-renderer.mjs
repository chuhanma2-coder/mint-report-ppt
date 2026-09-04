import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

function artifactTool() {
  if (!process.env.RUNTIME_NODE_MODULES) throw new Error("RUNTIME_NODE_MODULES is required; load workspace dependencies first");
  const require = createRequire(path.join(process.env.RUNTIME_NODE_MODULES, "package.json"));
  return import(require.resolve("@oai/artifact-tool"));
}

const pad = 28;
const noLine = { fill: "none", width: 0 };
const solid = color => ({ type: "solid", color });

function addText(slide, text, frame, style, name) {
  const box = slide.shapes.add({ geometry: "textbox", name, position: frame, fill: "none", line: noLine });
  box.text = String(text ?? "");
  box.text.style = { typeface: style.typeface, fontSize: style.fontSize, bold: !!style.bold, color: style.color, autoFit: "shrinkText", verticalAlignment: style.verticalAlignment || "top" };
  box.text.verticalAlignment = style.verticalAlignment || "top";
  return box;
}

function surface(slide, frame, theme, role, name) {
  const p = theme.palette, fill = role === "risk" ? p.coralLight : role === "decision" ? p.blueLight : p.paper;
  return slide.shapes.add({ geometry: "rect", name, position: frame, fill: solid(fill), line: { fill: role === "risk" ? p.coral : p.line, width: role === "primaryEvidence" ? 2 : 1 }, borderRadius: 18 });
}

function moduleData(module) { return module.data && typeof module.data === "object" ? module.data : {}; }

function addMetric(slide, module, frame, theme, font, index) {
  surface(slide, frame, theme, module.semanticRole, `mint|metric|${index}`);
  const labelH = Math.min(66, frame.height * 0.24), valueH = Math.min(180, frame.height * 0.48);
  addText(slide, module.title || "", { left: frame.left + pad, top: frame.top + pad, width: frame.width - 2 * pad, height: labelH }, { typeface: font, fontSize: 26, bold: true, color: theme.palette.ink }, `mint|metric-label|${index}`);
  addText(slide, `${module.value ?? moduleData(module).value ?? ""}${module.unit || ""}`, { left: frame.left + pad, top: frame.top + pad + labelH, width: frame.width - 2 * pad, height: valueH }, { typeface: font, fontSize: Math.min(58, Math.max(34, frame.width / 10)), bold: true, color: module.semanticRole === "risk" ? theme.palette.coral : theme.palette.mint, verticalAlignment: "center" }, `mint|metric-value|${index}`);
  if (module.text) addText(slide, module.text, { left: frame.left + pad, top: frame.top + frame.height - 100, width: frame.width - 2 * pad, height: 72 }, { typeface: font, fontSize: 19, color: theme.palette.muted }, `mint|metric-note|${index}`);
}

function addNarrative(slide, module, frame, theme, font, index) {
  surface(slide, frame, theme, module.semanticRole, `mint|${module.type}|${index}`);
  const title = module.title || (module.semanticRole === "managementConclusion" ? "管理结论" : "");
  if (title) addText(slide, title, { left: frame.left + pad, top: frame.top + pad, width: frame.width - 2 * pad, height: 52 }, { typeface: font, fontSize: 24, bold: true, color: theme.palette.ink }, `mint|module-title|${index}`);
  const bodyTop = frame.top + pad + (title ? 62 : 0), bodyWidth = frame.width - 2 * pad, fontSize = module.semanticRole === "managementConclusion" ? 25 : 20;
  const estimatedLines = Math.max(1, Math.ceil(String(module.text || "").length / Math.max(8, Math.floor(bodyWidth / (fontSize * 1.05))))), bodyHeight = Math.min(frame.height - (bodyTop - frame.top) - pad, Math.max(72, estimatedLines * fontSize * 1.65));
  addText(slide, module.text || "", { left: frame.left + pad, top: bodyTop, width: bodyWidth, height: bodyHeight }, { typeface: font, fontSize, bold: module.semanticRole === "managementConclusion", color: theme.palette.ink }, `mint|module-body|${index}`);
}

function seriesColors(module, theme) {
  const series = moduleData(module).series || [], names = series.map(item => String(item.name || ""));
  if (names.some(name => /实际|当前|actual/i.test(name)) && names.some(name => /目标|预算|target|budget/i.test(name))) return [theme.semanticColors.actual, theme.semanticColors.target];
  if (names.some(name => /风险|risk/i.test(name))) return [theme.semanticColors.positive, theme.semanticColors.risk];
  return series.length === 2 ? theme.semanticColors.peerSeries : theme.semanticColors.multiSeries;
}

function addNativeChart(slide, module, frame, theme, index) {
  const data = moduleData(module), variant = module.expression.variant, colors = seriesColors(module, theme);
  const type = variant === "line" ? "line" : variant === "doughnut" ? "doughnut" : "bar";
  const series = (data.series || []).map((item, i) => ({ ...item, fill: colors[i % colors.length], ...(type === "line" ? { line: { style: "solid", fill: colors[i % colors.length], width: 3 } } : {}) }));
  const chart = slide.charts.add(type, {
    name: `mint|chart|${index}`,
    position: { left: frame.left + 12, top: frame.top + 12, width: frame.width - 24, height: frame.height - 24 },
    categories: data.categories || [], series,
    ...(type === "bar" ? { barOptions: { direction: variant === "column" ? "column" : "bar", grouping: "clustered", gapWidth: 48 } } : {}),
    hasLegend: series.length > 1,
    legend: { position: "bottom", overlay: false },
    dataLabels: { showValue: true, position: type === "bar" ? "outEnd" : "right" },
    xAxis: { majorGridlines: { style: "solid", fill: theme.palette.line, width: 1 } },
    yAxis: { line: { style: "solid", fill: theme.palette.line, width: 1 } }
  });
  return chart;
}

function addShapeChart(slide, module, frame, theme, font, index) {
  const data = moduleData(module), categories = data.categories || [], values = data.series?.[0]?.values || [], max = Math.max(1, ...values.map(value => Math.abs(Number(value) || 0)));
  surface(slide, frame, theme, "supportingEvidence", `mint|shape-chart-bg|${index}`);
  const rowH = Math.min(70, (frame.height - 2 * pad) / Math.max(1, categories.length)), labelW = Math.min(230, frame.width * 0.3);
  categories.forEach((label, i) => {
    const y = frame.top + pad + i * rowH, value = Number(values[i]) || 0, barW = (frame.width - labelW - 3 * pad) * Math.abs(value) / max;
    addText(slide, label, { left: frame.left + pad, top: y, width: labelW - 10, height: rowH - 6 }, { typeface: font, fontSize: 17, color: theme.palette.ink, verticalAlignment: "center" }, `mint|shape-chart-label|${index}-${i}`);
    slide.shapes.add({ geometry: "rect", name: `mint|shape-chart-bar|${index}-${i}`, position: { left: frame.left + pad + labelW, top: y + 10, width: Math.max(2, barW), height: rowH - 26 }, fill: solid(value < 0 ? theme.palette.coral : theme.palette.mint), line: noLine, borderRadius: 6 });
    addText(slide, value, { left: frame.left + pad + labelW + barW + 8, top: y, width: 110, height: rowH - 6 }, { typeface: font, fontSize: 17, bold: true, color: theme.palette.ink, verticalAlignment: "center" }, `mint|shape-chart-value|${index}-${i}`);
  });
}

function addTable(slide, module, frame, theme, font, index) {
  const data = moduleData(module), values = data.values || data.rows || [];
  if (!Array.isArray(values) || !values.length) return addNarrative(slide, { ...module, text: module.text || "表格数据缺失" }, frame, theme, font, index);
  const columns = Math.max(...values.map(row => row.length));
  const table = slide.tables.add({ rows: values.length, columns, left: frame.left, top: frame.top, width: frame.width, height: frame.height, values });
  table.styleOptions = { headerRow: true, bandedRows: true };
  table.borders.assign({ style: "solid", fill: theme.palette.line, width: 1 });
  const all = table.cells.block({ row: 0, column: 0, rowCount: values.length, columnCount: columns });
  all.textStyle.fontSize = 16; all.textStyle.typeface = font; all.textStyle.color = theme.palette.ink;
  const header = table.cells.block({ row: 0, column: 0, rowCount: 1, columnCount: columns });
  header.fill = theme.palette.mintLight; header.textStyle.bold = true;
  return table;
}

function addDiagram(slide, module, frame, theme, font, index) {
  const data = moduleData(module), nodes = data.nodes || [], edges = data.edges || [];
  if (nodes.length > theme.constraints.maxNetworkNodes && !["grouped-network", "layered-network", "split-diagram"].includes(module.expression.variant)) throw new Error(`Diagram ${module.id || index} has more than ten nodes without grouping`);
  if (!nodes.length) return addNarrative(slide, { ...module, text: module.text || "关系节点缺失" }, frame, theme, font, index);
  const gap = 20, nodeW = Math.min(270, (frame.width - gap * (nodes.length - 1)) / nodes.length), nodeH = Math.min(150, frame.height * 0.42), top = frame.top + (frame.height - nodeH) / 2;
  const shapes = new Map();
  nodes.forEach((node, i) => {
    const shape = slide.shapes.add({ geometry: "rect", name: `mint|diagram-node|${index}-${i}`, position: { left: frame.left + i * (nodeW + gap), top, width: nodeW, height: nodeH }, fill: solid(i === 0 ? theme.palette.mintLight : theme.palette.blueLight), line: { fill: i === 0 ? theme.palette.mint : theme.palette.blue, width: 2 }, borderRadius: 16 });
    shape.text = String(node.label || node.name || node.id || ""); shape.text.style = { typeface: font, fontSize: 18, bold: true, color: theme.palette.ink, autoFit: "shrinkText", verticalAlignment: "center" };
    shapes.set(String(node.id ?? i), shape);
  });
  edges.forEach(edge => { const from = shapes.get(String(edge.from)), to = shapes.get(String(edge.to)); if (from && to) slide.shapes.connect(from, to, { kind: "straight", fromSide: "right", toSide: "left", line: { style: "solid", fill: theme.palette.muted, width: 2 }, head: { type: "arrow", width: "med", length: "med" } }); });
}

function addImage(slide, module, frame, index) {
  const source = module.imagePath || moduleData(module).imagePath;
  if (!source || !fs.existsSync(source)) throw new Error(`Image source is missing: ${source || module.id || index}`);
  const ext = path.extname(source).toLowerCase(), contentType = ext === ".jpg" || ext === ".jpeg" ? "image/jpeg" : ext === ".svg" ? "image/svg+xml" : "image/png";
  return slide.images.add({ blob: fs.readFileSync(source), contentType, alt: module.alt || module.title || "Source image", fit: module.fit === "cover" ? "cover" : "contain", position: frame });
}

export async function renderPresentation(ir, theme) {
  const { Presentation } = await artifactTool(), presentation = Presentation.create({ slideSize: { width: theme.slide.width, height: theme.slide.height } });
  const font = theme.fonts.cjk, diagnostics = [];
  for (const [slideIndex, spec] of ir.slides.entries()) {
    const slide = presentation.slides.add(); slide.background.fill = theme.palette.page;
    const titleSize = spec.role === "cover" ? 52 : spec.density === "dense" ? 36 : 42;
    addText(slide, spec.claim, spec.layout.title, { typeface: font, fontSize: titleSize, bold: true, color: theme.palette.ink }, `mint|title|${slideIndex}`);
    if (spec.managementQuestion && spec.role === "content") addText(slide, spec.managementQuestion, spec.layout.claim, { typeface: font, fontSize: 20, color: theme.palette.muted }, `mint|question|${slideIndex}`);
    for (const [index, module] of spec.modules.entries()) {
      const frame = spec.layout.modules[index] || spec.layout.modules.at(-1), type = module.expression?.type || module.type, variant = module.expression?.variant;
      if (type === "metric") addMetric(slide, module, frame, theme, font, index);
      else if (type === "chart") (["line", "column", "sorted-bar", "variance-bar", "doughnut", "percent-stacked"].includes(variant) ? addNativeChart : addShapeChart)(slide, module, frame, theme, font, index);
      else if (type === "table") addTable(slide, module, frame, theme, font, index);
      else if (type === "diagram") addDiagram(slide, module, frame, theme, font, index);
      else if (type === "image") addImage(slide, module, frame, index);
      else addNarrative(slide, module, frame, theme, font, index);
    }
    slide.speakerNotes.textFrame.setText(JSON.stringify({ slideId: spec.id, evidenceRefs: spec.evidenceRefs, moduleEvidence: spec.modules.map(module => module.evidenceRefs || []) }));
    diagnostics.push({ slideId: spec.id, geometry: spec.geometry, occupancy: spec.layout.occupancy, expressions: spec.modules.map(module => module.expression) });
  }
  return { presentation, diagnostics };
}

export async function exportPresentation(presentation, output) {
  const { PresentationFile } = await artifactTool();
  await (await PresentationFile.exportPptx(presentation)).save(output);
}
