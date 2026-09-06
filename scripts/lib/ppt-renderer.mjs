import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fitText } from "./text-layout.mjs";
import { inspectPptxPackage } from "./pptx-metadata.mjs";
import { nativeChartCompatibilityIssue } from './chart-display-model.mjs';
import { textRole } from './typography-contract.mjs';

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
  const fontSizePx = (style.fontSizePt ?? style.fontSize ?? 18) * 96 / 72;
  box.text.style = { typeface: style.typeface, fontSize: fontSizePx, bold: !!style.bold, color: style.color, autoFit: "none", verticalAlignment: style.verticalAlignment || "top" };
  box.text.verticalAlignment = style.verticalAlignment || "top";
  box.text.insets = { left: 0, right: 0, top: 0, bottom: 0 };
  return box;
}

function surface(slide, frame, theme, role, name) {
  const p = theme.palette, priority = role === "primaryEvidence" ? "P0" : ["managementConclusion", "decision", "risk", "action", "boundary"].includes(role) ? "P1" : "P2";
  const fill = role === "risk" ? p.coralLight : role === "decision" ? p.blueLight : priority === "P0" ? p.paper : priority === "P1" ? p.mintLight : p.page;
  return slide.shapes.add({ geometry: "rect", name, position: frame, fill: solid(fill), line: { fill: role === "risk" ? p.coral : priority === "P0" ? p.mint : p.line, width: priority === "P0" ? 2 : priority === "P1" ? 1 : 0.6 }, borderRadius: priority === "P0" ? 14 : 18 });
}

function moduleData(module) { return module.data && typeof module.data === "object" ? module.data : {}; }

function addMetric(slide, module, frame, theme, font, index) {
  const data = moduleData(module), categories = data.categories || [], values = data.series?.[0]?.values || [];
  if (categories.length >= 2 && values.length >= categories.length) {
    const gap = 18, count = Math.min(4, categories.length), cellW = (frame.width - gap * (count - 1)) / count;
    for (let i = 0; i < count; i++) {
      const cell = { left: frame.left + i * (cellW + gap), top: frame.top, width: cellW, height: frame.height };
      surface(slide, cell, theme, module.semanticRole, `mint|metric-card|${index}-${i}`);
      addText(slide, categories[i], { left: cell.left + 20, top: cell.top + 24, width: cell.width - 40, height: 54 }, { typeface: font, fontSize: 20, bold: true, color: theme.palette.ink }, `mint|metric-card-label|${index}-${i}`);
      addText(slide, values[i], { left: cell.left + 20, top: cell.top + 94, width: cell.width - 40, height: 110 }, { typeface: font, fontSize: 38, bold: true, color: i === 0 ? theme.palette.mint : theme.palette.blue }, `mint|metric-card-value|${index}-${i}`);
    }
    return;
  }
  surface(slide, frame, theme, module.semanticRole, `mint|metric|${index}`);
  const labelH = Math.min(66, frame.height * 0.24), valueH = Math.min(180, frame.height * 0.48);
  addText(slide, module.title || "", { left: frame.left + pad, top: frame.top + pad, width: frame.width - 2 * pad, height: labelH }, { typeface: font, fontSize: 26, bold: true, color: theme.palette.ink }, `mint|metric-label|${index}`);
  addText(slide, `${module.value ?? moduleData(module).value ?? ""}${module.unit || ""}`, { left: frame.left + pad, top: frame.top + pad + labelH, width: frame.width - 2 * pad, height: valueH }, { typeface: font, fontSize: Math.min(58, Math.max(34, frame.width / 10)), bold: true, color: module.semanticRole === "risk" ? theme.palette.coral : theme.palette.mint, verticalAlignment: "center" }, `mint|metric-value|${index}`);
  if (module.text) addText(slide, module.text, { left: frame.left + pad, top: frame.top + frame.height - 100, width: frame.width - 2 * pad, height: 72 }, { typeface: font, fontSize: 19, color: theme.palette.muted }, `mint|metric-note|${index}`);
}

function addNarrative(slide, module, frame, theme, font, index, typography = null) {
  surface(slide, frame, theme, module.semanticRole, `mint|${module.type}|${index}`);
  const title = module.title || (module.semanticRole === "managementConclusion" ? "管理结论" : "");
  if (title) addText(slide, title, { left: frame.left + pad, top: frame.top + pad, width: frame.width - 2 * pad, height: 52 }, { typeface: font, fontSizePt: typography?.title?.fontSizePt || 18, bold: true, color: theme.palette.ink }, `mint|module-title|${index}`);
  const bodyTop = frame.top + pad + (title ? 62 : 0), bodyWidth = frame.width - 2 * pad, bodyHeight = Math.max(40, frame.height - (bodyTop - frame.top) - pad);
  addText(slide, module.text || "", { left: frame.left + pad, top: bodyTop, width: bodyWidth, height: bodyHeight }, { typeface: font, fontSizePt: typography?.body?.fontSizePt || (module.semanticRole === "managementConclusion" ? 20 : 17), bold: module.semanticRole === "managementConclusion", color: theme.palette.ink }, `mint|module-body|${index}`);
}

function seriesColors(module, theme) {
  const series = moduleData(module).series || [], names = series.map(item => String(item.name || ""));
  if (names.some(name => /实际|当前|actual/i.test(name)) && names.some(name => /目标|预算|target|budget/i.test(name))) return names.map(name => /目标|预算|target|budget/i.test(name) ? theme.semanticColors.target : theme.semanticColors.actual);
  if (names.some(name => /风险|risk/i.test(name))) return [theme.semanticColors.positive, theme.semanticColors.risk];
  return series.length === 2 ? theme.semanticColors.peerSeries : theme.semanticColors.multiSeries;
}

function addNativeChart(slide, module, frame, theme, font, index) {
  const source = moduleData(module), variant = module.expression.variant, colors = seriesColors(module, theme);
  const order = variant === "sorted-bar" && source.series?.[0]?.values ? source.categories.map((_, i) => i).sort((a, b) => Number(source.series[0].values[b]) - Number(source.series[0].values[a])) : source.categories?.map((_, i) => i) || [];
  const data = order.length ? { ...source, categories: order.map(i => source.categories[i]), series: (source.series || []).map(item => ({ ...item, values: order.map(i => item.values[i]) })) } : source;
  const type = variant === "line" ? "line" : variant === "doughnut" ? "doughnut" : variant === "scatter" ? "scatter" : "bar";
  const series = type === "scatter" && data.series?.length >= 2
    ? [{ name: `${data.series[0].name || "X"} / ${data.series[1].name || "Y"}`, xValues: data.series[0].values, values: data.series[1].values, dataLabelOverrides: data.categories.map((label,idx)=>({idx,text:`${label} (${data.series[0].values[idx]}, ${data.series[1].values[idx]})`})), fill: colors[0], marker: { style: "circle", size: 8, fill: colors[0] } }]
: (data.series || []).map((item, i) => ({ ...item, name: `${item.name || ''}${item.displayUnit ? `（${item.displayUnit}）` : ''}`, fill: colors[i % colors.length], ...(type === 'doughnut' ? {points:data.categories.map((_,idx)=>({idx,fill:theme.semanticColors.multiSeries[idx % theme.semanticColors.multiSeries.length]}))} : {}), ...(type === "line" ? { line: { style: "solid", fill: colors[i % colors.length], width: 3 } } : {}) }));
  const chart = slide.charts.add(type, {
    name: `mint|chart|${index}`,
    position: { left: frame.left + 12, top: frame.top + 12, width: frame.width - 24, height: frame.height - 24 },
    categories: data.categories || [], series,
    ...(type === "bar" ? { barOptions: { direction: variant === "column" ? "column" : "bar", grouping: variant === "percent-stacked" ? "percentStacked" : "clustered", gapWidth: 48 } } : {}),
    ...(type === "scatter" ? { scatterOptions: { style: "marker", varyColors: false } } : {}),
    hasLegend: series.length > 1 || type === 'doughnut',
    legend: { position: "bottom", overlay: false, textStyle: { typeface: font, fontSize: (theme.chartTypographyPt?.legend || 16) * 96 / 72, fill: theme.palette.muted } },
    dataLabels: { showValue: true, showCategoryName: type === 'doughnut', position: variant === 'percent-stacked' ? 'center' : 'outEnd', fill: theme.palette.paper, line: noLine, textStyle: { typeface: font, fontSize: ((data.categories || []).length > 8 ? (theme.chartTypographyPt?.denseDataLabel || 16) : (theme.chartTypographyPt?.dataLabel || 18)) * 96 / 72, fill: theme.palette.ink, bold: true } },
    xAxis: { tickLabelPosition: 'low', majorGridlines: { style: "solid", fill: theme.palette.line, width: 1 }, textStyle: { typeface: font, fontSize: ((data.categories || []).length > 8 ? (theme.chartTypographyPt?.denseAxis || 15) : (theme.chartTypographyPt?.axis || 17)) * 96 / 72, fill: theme.palette.muted } },
    yAxis: { tickLabelPosition: 'low', line: { style: "solid", fill: theme.palette.line, width: 1 }, textStyle: { typeface: font, fontSize: ((data.categories || []).length > 8 ? (theme.chartTypographyPt?.denseAxis || 15) : (theme.chartTypographyPt?.axis || 17)) * 96 / 72, fill: theme.palette.muted } }
  });
  // The API's xAxis is the category axis even on horizontal bars.
  if (variant === 'percent-stacked') chart.yAxis.numberFormatCode = '0%';
  if (type === 'line' || variant === 'percent-stacked') chart.series.items.forEach((item, seriesIndex) => {
    data.categories.forEach((_, pointIndex) => {
      const label = item.dataLabelOverrides.add(pointIndex);
      label.text = String(data.series[seriesIndex].values[pointIndex]);
      label.showValue = true;
      label.position = type === 'line' ? (seriesIndex % 2 ? 'top' : 'bottom') : 'center';
    });
  });
  if (type === 'scatter') {
    chart.xAxis.title = `${data.series[0].name}（${data.series[0].displayUnit || ''}）`;
    chart.yAxis.title = `${data.series[1].name}（${data.series[1].displayUnit || ''}）`;
    for (const [axis,values] of [[chart.xAxis,data.series[0].values],[chart.yAxis,data.series[1].values]]) {
      const lo=Math.min(...values),hi=Math.max(...values),pad=Math.max(1,(hi-lo)*.15);
      axis.min=lo-pad; axis.max=hi+pad;
    }
  } else if (type === 'doughnut') {
    chart.title = `${data.series[0].name}（${data.series[0].displayUnit || ''}）`;
  } else if (series.length === 1 && data.series[0]?.displayUnit) {
    (variant === 'column' || type === 'line' ? chart.yAxis : chart.xAxis).title = data.series[0].displayUnit;
  }
  return chart;
}

function addWaterfall(slide, module, frame, theme, font, index) {
  const data = moduleData(module), labels = data.categories || [], values = data.series?.[0]?.values || [], plot = { left: frame.left + 50, top: frame.top + 45, width: frame.width - 100, height: frame.height - 100 };
  surface(slide, frame, theme, "supportingEvidence", `mint|waterfall-bg|${index}`);
  const start = Number(data.start || 0), cumulative = [start]; values.forEach(value => cumulative.push(cumulative.at(-1) + Number(value || 0)));
  const columns = [{ label: data.startLabel || "起点", value: start, before: 0, after: start, total: true }, ...values.map((raw, i) => ({ label: labels[i] || "", value: Number(raw || 0), before: cumulative[i], after: cumulative[i + 1], total: false })), { label: data.endLabel || "终点", value: cumulative.at(-1), before: 0, after: cumulative.at(-1), total: true }];
  const lo = Math.min(0, ...cumulative), hi = Math.max(1, ...cumulative), scale = plot.height / (hi - lo), baseY = plot.top + hi * scale, barW = Math.min(110, plot.width / columns.length * 0.58), step = plot.width / columns.length;
  columns.forEach((column, i) => {
    const topValue = Math.max(column.before, column.after), bottomValue = Math.min(column.before, column.after), x = plot.left + i * step + (step - barW) / 2, y = plot.top + (hi - topValue) * scale, h = Math.max(3, (topValue - bottomValue) * scale), color = column.total ? theme.palette.blue : column.value < 0 ? theme.palette.coral : theme.palette.mint;
    slide.shapes.add({ geometry: "rect", name: `mint|waterfall-bar|${index}-${i}`, position: { left: x, top: y, width: barW, height: h }, fill: solid(color), line: noLine });
    addText(slide, `${!column.total && column.value > 0 ? "+" : ""}${column.value}`, { left: x - 15, top: Math.max(plot.top, y - 42), width: barW + 30, height: 38 }, { typeface: font, fontSizePt: 18, bold: true, color: theme.palette.ink }, `mint|waterfall-value|${index}-${i}`);
    addText(slide, column.label, { left: plot.left + i * step, top: plot.top + plot.height + 8, width: step, height: 52 }, { typeface: font, fontSizePt: 17, color: theme.palette.muted }, `mint|waterfall-label|${index}-${i}`);
  });
  slide.shapes.add({ geometry: "line", position: { left: plot.left, top: baseY, width: plot.width, height: 0 }, fill: "none", line: { fill: theme.palette.line, width: 1 } });
}

function addDumbbell(slide, module, frame, theme, font, index) {
  const data = moduleData(module), categories = data.categories || [], series = data.series || [], rows = series.length > 1 ? series.map(item => ({ label: item.name, values: item.values })) : [{ label: module.title || "变化", values: series[0]?.values || [] }];
  surface(slide, frame, theme, "supportingEvidence", `mint|dumbbell-bg|${index}`);
  if (rows.length === 1 && rows[0].values.length >= 2) {
    const a = Number(rows[0].values[0]) || 0, b = Number(rows[0].values[1]) || 0, delta = b - a, centerY = frame.top + frame.height * 0.54, leftX = frame.left + frame.width * 0.22, rightX = frame.left + frame.width * 0.78;
    addText(slide, categories[0] || "前期", { left: leftX - 150, top: frame.top + frame.height * 0.18, width: 300, height: 44 }, { typeface: font, fontSizePt: 16, color: theme.palette.muted }, `mint|dumbbell-period-a|${index}`);
    addText(slide, a, { left: leftX - 170, top: frame.top + frame.height * 0.27, width: 340, height: 120 }, { typeface: font, fontSizePt: 44, bold: true, color: theme.palette.blue, verticalAlignment: "center" }, `mint|dumbbell-hero-a|${index}`);
    addText(slide, categories[1] || "本期", { left: rightX - 150, top: frame.top + frame.height * 0.18, width: 300, height: 44 }, { typeface: font, fontSizePt: 16, color: theme.palette.muted }, `mint|dumbbell-period-b|${index}`);
    addText(slide, b, { left: rightX - 170, top: frame.top + frame.height * 0.27, width: 340, height: 120 }, { typeface: font, fontSizePt: 44, bold: true, color: theme.palette.orange, verticalAlignment: "center" }, `mint|dumbbell-hero-b|${index}`);
    slide.shapes.add({ geometry: "line", position: { left: leftX, top: centerY, width: rightX - leftX, height: 0 }, fill: "none", line: { fill: theme.palette.line, width: 5 }, tail: { type: "arrow", width: "med", length: "med" } });
    addText(slide, `${delta > 0 ? "+" : ""}${delta}`, { left: frame.left + frame.width * 0.39, top: centerY - 90, width: frame.width * 0.22, height: 80 }, { typeface: font, fontSizePt: 34, bold: true, color: delta < 0 ? theme.palette.coral : theme.palette.mint }, `mint|dumbbell-hero-delta|${index}`);
    addText(slide, rows[0].label || "变化", { left: frame.left + frame.width * 0.39, top: centerY + 30, width: frame.width * 0.22, height: 42 }, { typeface: font, fontSizePt: 14, color: theme.palette.muted }, `mint|dumbbell-hero-label|${index}`);
    return;
  }
  const all = rows.flatMap(row => row.values).map(Number).filter(Number.isFinite), rawLo = Math.min(...all), rawHi = Math.max(...all), margin = Math.max(1, (rawHi - rawLo) * 0.15), lo = rawLo - margin, hi = rawHi + margin, labelW = 170, plotLeft = frame.left + pad + labelW, plotW = frame.width - 2 * pad - labelW - 50, rowH = (frame.height - 2 * pad) / rows.length;
  rows.forEach((row, i) => {
    const y = frame.top + pad + rowH * (i + 0.5), a = Number(row.values[0] || 0), b = Number(row.values[1] || 0), x1 = plotLeft + (a - lo) / (hi - lo) * plotW, x2 = plotLeft + (b - lo) / (hi - lo) * plotW;
    addText(slide, row.label || "", { left: frame.left + pad, top: y - 25, width: labelW - 12, height: 50 }, { typeface: font, fontSizePt: 14, color: theme.palette.ink }, `mint|dumbbell-label|${index}-${i}`);
    slide.shapes.add({ geometry: "line", position: { left: Math.min(x1, x2), top: y, width: Math.abs(x2 - x1), height: 0 }, fill: "none", line: { fill: theme.palette.line, width: 4 } });
    for (const [point, x, color] of [[a, x1, theme.palette.blue], [b, x2, theme.palette.orange]]) {
      slide.shapes.add({ geometry: "ellipse", position: { left: x - 10, top: y - 10, width: 20, height: 20 }, fill: solid(color), line: noLine });
      addText(slide, point, { left: x - 46, top: y - 45, width: 92, height: 32 }, { typeface: font, fontSizePt: 14, bold: true, color: theme.palette.ink }, `mint|dumbbell-value|${index}-${i}-${color}`);
    }
  });
  if (rows.length === 1 && rows[0].values.length >= 2) {
    const delta = Number(rows[0].values[1]) - Number(rows[0].values[0]);
    addText(slide, `${delta > 0 ? "+" : ""}${delta}`, { left: plotLeft + plotW * 0.34, top: frame.top + frame.height * 0.2, width: plotW * 0.32, height: 120 }, { typeface: font, fontSize: 54, bold: true, color: delta < 0 ? theme.palette.coral : theme.palette.mint }, `mint|dumbbell-delta|${index}`);
  }
  if (categories.length >= 2) addText(slide, `${categories[0]}（蓝）    ${categories[1]}（橙）`, { left: plotLeft, top: frame.top + 22, width: plotW, height: 40 }, { typeface: font, fontSizePt: 14, color: theme.palette.muted }, `mint|dumbbell-periods|${index}`);
}

function addBullet(slide, module, frame, theme, font, index) {
  const data = moduleData(module), actualSeries = (data.series || []).find(item => /实际|当前|actual/i.test(String(item.name || ""))) || data.series?.[0], targetSeries = (data.series || []).find(item => /目标|预算|target|budget/i.test(String(item.name || ""))) || data.series?.[1], actual = Number(data.actual ?? actualSeries?.values?.[0] ?? 0), target = Number(data.target ?? targetSeries?.values?.[0] ?? 0), max = Math.max(1, actual, target) * 1.15;
  surface(slide, frame, theme, "supportingEvidence", `mint|bullet-bg|${index}`);
  const x = frame.left + 70, y = frame.top + frame.height * 0.46, w = frame.width - 140;
  slide.shapes.add({ geometry: "rect", position: { left: x, top: y, width: w, height: 36 }, fill: solid(theme.palette.neutralLight), line: noLine, borderRadius: 8 });
  slide.shapes.add({ geometry: "rect", position: { left: x, top: y, width: w * actual / max, height: 36 }, fill: solid(theme.palette.mint), line: noLine, borderRadius: 8 });
  const tx = x + w * target / max; slide.shapes.add({ geometry: "line", position: { left: tx, top: y - 14, width: 0, height: 64 }, fill: "none", line: { fill: theme.palette.muted, width: 3, style: "dashed" } });
  addText(slide, `实际 ${actual}`, { left: x, top: y - 60, width: 220, height: 42 }, { typeface: font, fontSize: 20, bold: true, color: theme.palette.mint }, `mint|bullet-actual|${index}`);
  addText(slide, `目标 ${target}`, { left: Math.max(x, tx - 70), top: y + 48, width: 180, height: 38 }, { typeface: font, fontSize: 16, color: theme.palette.muted }, `mint|bullet-target|${index}`);
}

function addShapeChart(slide, module, frame, theme, font, index) {
  const variant = module.expression.variant;
  if (variant === "waterfall") return addWaterfall(slide, module, frame, theme, font, index);
  if (["dumbbell", "slope"].includes(variant)) return addDumbbell(slide, module, frame, theme, font, index);
  if (["bullet", "target-metric"].includes(variant)) return addBullet(slide, module, frame, theme, font, index);
  if (variant === "comparison-small-multiples") {
    const data = moduleData(module), series = (data.series || []).slice(0, 3), gap = 22, panelH = (frame.height - gap * Math.max(0, series.length - 1)) / Math.max(1, series.length);
    surface(slide, frame, theme, "supportingEvidence", `mint|small-multiples-bg|${index}`);
    series.forEach((item, seriesIndex) => {
      const panel = { left: frame.left + 18, top: frame.top + seriesIndex * (panelH + gap) + 12, width: frame.width - 36, height: panelH - 18 };
      addText(slide, item.name || `指标${seriesIndex + 1}`, { left: panel.left + 12, top: panel.top, width: panel.width - 24, height: 42 }, { typeface: font, fontSizePt: 17, bold: true, color: seriesIndex === 0 ? theme.palette.mint : theme.palette.blue }, `mint|small-multiple-title|${index}-${seriesIndex}`);
      const max = Math.max(1, ...item.values.map(value => Math.abs(Number(value) || 0))), labelW = Math.min(190, panel.width * 0.25), rowH = Math.max(34, (panel.height - 42) / Math.max(1, data.categories.length));
      data.categories.forEach((label, i) => {
        const value = Number(item.values[i]) || 0, y = panel.top + 38 + i * rowH, barW = (panel.width - labelW - 120) * Math.abs(value) / max;
        const focused = module.expression?.focusCategories?.includes(String(label));
        addText(slide, label, { left: panel.left + 12, top: y, width: labelW - 16, height: rowH - 4 }, { typeface: font, fontSizePt: data.categories.length > 6 ? 15 : 17, bold: focused, color: theme.palette.ink, verticalAlignment: "center" }, `mint|small-multiple-label|${index}-${seriesIndex}-${i}`);
        slide.shapes.add({ geometry: "rect", position: { left: panel.left + labelW, top: y + 7, width: Math.max(2, barW), height: Math.max(10, rowH - 18) }, fill: solid(focused ? theme.palette.orange : seriesIndex === 0 ? theme.palette.mint : theme.palette.blue), line: noLine, borderRadius: 5 });
        addText(slide, `${value}${item.displayUnit || (item.unitKind === "percent" ? "%" : "")}`, { left: panel.left + labelW + barW + 8, top: y, width: 120, height: rowH - 4 }, { typeface: font, fontSizePt: data.categories.length > 6 ? 15 : 17, bold: true, color: theme.palette.ink, verticalAlignment: "center" }, `mint|small-multiple-value|${index}-${seriesIndex}-${i}`);
      });
    });
    return;
  }
  const data = moduleData(module), categories = data.categories || [], values = data.series?.[0]?.values || [], max = Math.max(1, ...values.map(value => Math.abs(Number(value) || 0)));
  surface(slide, frame, theme, "supportingEvidence", `mint|shape-chart-bg|${index}`);
  const rowH = Math.min(70, (frame.height - 2 * pad) / Math.max(1, categories.length)), labelW = Math.min(230, frame.width * 0.3);
  categories.forEach((label, i) => {
    const y = frame.top + pad + i * rowH, value = Number(values[i]) || 0, barW = (frame.width - labelW - 3 * pad) * Math.abs(value) / max;
    const focused = module.expression?.focusCategories?.includes(String(label));
    addText(slide, label, { left: frame.left + pad, top: y, width: labelW - 10, height: rowH - 6 }, { typeface: font, fontSizePt: categories.length > 8 ? 15 : 17, bold: focused, color: theme.palette.ink, verticalAlignment: "center" }, `mint|shape-chart-label|${index}-${i}`);
    if (["dot-plot", "dot-distribution"].includes(variant)) {
      slide.shapes.add({ geometry: "line", position: { left: frame.left + pad + labelW, top: y + rowH / 2, width: frame.width - labelW - 3 * pad, height: 0 }, fill: "none", line: { fill: theme.palette.line, width: 1 } });
      slide.shapes.add({ geometry: "ellipse", name: `mint|shape-chart-dot|${index}-${i}`, position: { left: frame.left + pad + labelW + barW - 9, top: y + rowH / 2 - 9, width: 18, height: 18 }, fill: solid(value < 0 ? theme.palette.coral : theme.palette.mint), line: noLine });
    } else slide.shapes.add({ geometry: "rect", name: `mint|shape-chart-bar|${index}-${i}`, position: { left: frame.left + pad + labelW, top: y + 10, width: Math.max(2, barW), height: rowH - 26 }, fill: solid(focused ? theme.palette.orange : value < 0 ? theme.palette.coral : theme.palette.mint), line: noLine, borderRadius: 6 });
    addText(slide, value, { left: frame.left + pad + labelW + barW + 8, top: y, width: 120, height: rowH - 6 }, { typeface: font, fontSizePt: categories.length > 8 ? 16 : 18, bold: true, color: theme.palette.ink, verticalAlignment: "center" }, `mint|shape-chart-value|${index}-${i}`);
  });
}

function addTable(slide, module, frame, theme, font, index, measured = null) {
  const data = moduleData(module), headers = data.headers || data.columns || [], body = data.values || data.rows || [], values = headers.length && body[0]?.join?.("|") !== headers.join("|") ? [headers, ...body] : body;
  if (!Array.isArray(values) || !values.length) return addNarrative(slide, { ...module, text: module.text || "表格数据缺失" }, frame, theme, font, index);
  const columns = Math.max(...values.map(row => row.length));
  const tableFrame = measured?.table?.rect || frame;
  const table = slide.tables.add({ rows: values.length, columns, ...tableFrame, values, ...(measured?.table ? { columnWidths: measured.table.rows[0].cells.map(cell => cell.rect.width) } : {}) });
  if (measured?.table) measured.table.rows.forEach((row, i) => { table.rows[i].height = row.rect.height; });
  table.styleOptions = { headerRow: true, bandedRows: true };
  table.borders.assign({ style: "solid", fill: theme.palette.line, width: 1 });
  const all = table.cells.block({ row: 0, column: 0, rowCount: values.length, columnCount: columns });
  all.textStyle.fontSize = (values.length > 10 ? 14 : 16) * 96 / 72; all.textStyle.typeface = font; all.textStyle.color = theme.palette.ink;
  if (measured?.table) {
    all.assign({ margins: { top: 8, right: 10, bottom: 8, left: 10 } });
    measured.table.rows.forEach((row, i) => row.cells.forEach((cell, j) => { table.getCell(i, j).text.style = { typeface: font, fontSize: cell.fontSizePx, color: theme.palette.ink, bold: cell.bold, autoFit: 'none' }; }));
    for (const text of measured.textObjects.filter(item => item.className === 'module-title')) addText(slide, text.text, text.contentRect, { typeface: font, fontSizePt: text.fontSizePx * 72 / 96, bold: true, color: text.color || theme.palette.ink }, `mint|table-title|${index}`);
    for (const text of measured.textObjects.filter(item => item.className === 'module-copy')) addText(slide, text.renderText || text.text, text.contentRect, { typeface: font, fontSizePt: text.fontSizePx * 72 / 96, color: theme.palette.ink }, `mint|table-note|${index}`);
  }
  const header = table.cells.block({ row: 0, column: 0, rowCount: 1, columnCount: columns });
  header.fill = theme.palette.blueLight; header.textStyle.bold = true;
  const focusRows = new Set((module.expression?.focusRows || []).map(String));
  for (let row = 1; row < values.length; row++) if (focusRows.has(String(values[row]?.[0])) || focusRows.has(String(row))) {
    const focused = table.cells.block({ row, column: 0, rowCount: 1, columnCount: columns }); focused.fill = theme.palette.orangeLight; focused.textStyle.bold = true;
  }
  if (module.expression?.variant === "decision-matrix") {
    table.styleOptions = { headerRow: true, firstColumn: true, bandedRows: false };
    for (let row = 1; row < values.length; row++) {
      table.getCell(row, 0).fill = theme.palette.blueLight;
      table.getCell(row, 0).text.style = { typeface: font, fontSize: measured?.table?.rows[row]?.cells[0]?.fontSizePx || 16 * 96 / 72, bold: true, color: theme.palette.ink };
      for (let column = 1; column < columns; column++) {
        const headerText = String(values[0]?.[column] ?? ""), value = String(values[row]?.[column] ?? "");
        let fill = row % 2 ? theme.palette.paper : theme.palette.neutralLight;
        if (/损失|风险/.test(headerText)) fill = /高/.test(value) ? theme.palette.coralLight : /低/.test(value) ? theme.palette.mintLight : theme.palette.orangeLight;
        else if (/进入|策略|方式|动作/.test(headerText)) fill = theme.palette.blueLight;
        table.getCell(row, column).fill = fill;
      }
    }
  }
  if (measured?.table) measured.table.rows.forEach((row,i) => row.cells.forEach((cell,j) => {
    if (cell.backgroundColor) table.getCell(i,j).fill = cell.backgroundColor;
    table.getCell(i,j).text.style = {typeface:font,fontSize:cell.fontSizePx,color:cell.color || theme.palette.ink,bold:cell.bold,autoFit:'none'};
  }));
  return table;
}

function addVisualPrimitives(slide, measured, theme, font, index) {
  for (const p of measured.primitives) {
    const name=`mint|primitive:${p.primitive}|binding:${encodeURIComponent(p.bindingId)}`;
    // Compile browser-measured surfaces and rules, not estimated card frames.
    slide.shapes.add({geometry:'rect',name,position:p.rect,fill:p.backgroundColor || 'none',line:noLine});
    if(p.borderLeftWidth) slide.shapes.add({geometry:'rect',name:name+'|accent',position:{...p.rect,width:p.borderLeftWidth},fill:p.borderLeftColor,line:noLine});
    if(p.borderRightWidth) slide.shapes.add({geometry:'rect',name:name+'|right',position:{...p.rect,left:p.rect.left+p.rect.width-p.borderRightWidth,width:p.borderRightWidth},fill:p.borderRightColor,line:noLine});
    if(p.borderTopWidth) slide.shapes.add({geometry:'rect',name:name+'|top',position:{...p.rect,height:p.borderTopWidth},fill:p.borderTopColor,line:noLine});
    if(p.borderBottomWidth) {
      if(p.primitive==='dependency-edge') {
        const anchor=x=>slide.shapes.add({geometry:'rect',name:name+'|anchor',position:{left:x,top:p.rect.top+p.rect.height-1,width:1,height:1},fill:'none',line:noLine});
        const connector=slide.shapes.connect(anchor(p.rect.left),anchor(p.rect.left+p.rect.width),{kind:'straight',fromSide:'right',toSide:'left',line:{fill:p.borderColor,width:p.borderBottomWidth},tail:{type:'triangle',width:'med',length:'med'}});
        connector.name=name+'|rule';
      } else slide.shapes.add({geometry:'line',name:name+'|rule',position:{left:p.rect.left,top:p.rect.top+p.rect.height-1,width:p.rect.width,height:0},line:{fill:p.borderColor,width:p.borderBottomWidth}});
    }
  }
  // Canvas reserves a small right-hand wrap guard, then freezes its lines. The
  // native frame includes that measured unused guard so Office does not rewrap
  // a last CJK glyph; it never expands beyond the measured primitive surface.
  for(const [j,text] of measured.textObjects.entries()) addText(slide,text.renderText || text.text,text.className==='vp-text'?{...text.contentRect,width:text.rect.width}:text.contentRect,{typeface:font,fontSizePt:text.fontSizePx*72/96,bold:text.bold,color:text.color || theme.palette.ink},`mint|${text.primitiveParent==='dependency-edge'?'edge-label':'visual-text'}|${index}-${j}|text-role:${textRole({...text,kind:measured.kind,role:measured.role})}${text.factTargetId?'|fact-target:'+encodeURIComponent(text.factTargetId):''}`);
}

function addDiagram(slide, module, frame, theme, font, index, measured = null) {
  if(measured?.network) {
    for(const node of measured.network.nodes) {
      const name=`mint|diagram-node|${index}|binding:${encodeURIComponent(node.nodeId)}`;
      slide.shapes.add({geometry:'rect',name:name+'|bg',position:node.rect,fill:node.backgroundColor,line:{fill:node.borderLeftColor,width:2}});
      addText(slide,node.renderText||node.text,node.contentRect,{typeface:font,fontSizePt:node.fontSizePx*72/96,bold:true,color:node.color},name+'|text-role:diagramNode|fact-target:'+encodeURIComponent(node.nodeId));
    }
    for(const edge of measured.network.edges) {
      const name=`mint|diagram-edge|${index}|binding:${encodeURIComponent(edge.id)}|from:${encodeURIComponent(edge.from)}|to:${encodeURIComponent(edge.to)}`;
      const points=edge.points.filter((p,i,a)=>i===0||p[0]!==a[i-1][0]||p[1]!==a[i-1][1]);
      for(let i=1;i<points.length;i++) {
        const anchor=([left,top])=>slide.shapes.add({geometry:'rect',name:name+'|anchor',position:{left,top,width:0.1,height:0.1},fill:'none',line:noLine});
        const line=slide.shapes.connect(anchor(points[i-1]),anchor(points[i]),{kind:'straight',line:{fill:theme.palette.mint,width:2},...(i===points.length-1?{tail:{type:'triangle',width:'med',length:'med'}}:{})});line.name=name+'|segment:'+i;
      }
      if(edge.label.text) addText(slide,edge.label.text,edge.label.contentRect,{typeface:font,fontSizePt:edge.label.fontSizePx*72/96,color:edge.label.color},name+'|edge-label|text-role:diagramEdge');
    }
    for(const text of measured.textObjects.filter(t=>['module-title','module-copy'].includes(t.className))) addText(slide,text.renderText||text.text,text.contentRect,{typeface:font,fontSizePt:text.fontSizePx*72/96,bold:text.bold,color:text.color},`mint|diagram-note|${index}`);
    return;
  }
  if (measured?.diagramRelations) {
    for (const [i, relation] of measured.diagramRelations.entries()) {
      const shapes = [];
      for (const [j, node] of relation.nodes.entries()) {
        const actorIndex=(module.data.nodes||[]).findIndex(n=>String(n.id)===node.nodeId), slot=Math.max(0,actorIndex)%3;
        const backgrounds=[theme.palette.blueLight,theme.palette.mintLight,theme.palette.orangeLight], borders=[theme.palette.blue,theme.palette.mint,theme.palette.orange];
        shapes.push(slide.shapes.add({ geometry: 'rect', name: `mint|diagram-node-bg|${index}-${i}-${j}`, position: node.rect, fill: solid(backgrounds[slot]), line: { fill: borders[slot], width: 2 } }));
        addText(slide, node.renderText || node.text, node.contentRect, { typeface: font, fontSizePt: node.fontSizePx * 72 / 96, bold: true, color: theme.palette.ink }, `mint|diagram-node|${index}-${i}-${j}`);
      }
      addText(slide, relation.label.text, relation.label.contentRect, { typeface: font, fontSizePt: relation.label.fontSizePx * 72 / 96, color: theme.palette.ink }, `mint|diagram-edge-label|${index}-${i}`);
      const connector = slide.shapes.connect(shapes[0], shapes[1], {
        kind: 'straight', fromSide: 'right', toSide: 'left',
        line: { fill: theme.palette.mint, width: 2 },
        tail: { type: 'triangle', width: 'med', length: 'med' }
      });
      connector.name = `mint|diagram-edge|${index}-${i}`;
    }
    const connected = measured.diagramRelations.flatMap(relation => relation.nodes);
    for (const [i, node] of measured.textObjects.filter(item => item.className === 'diagram-node' && !connected.some(other => other.rect.left === item.rect.left && other.rect.top === item.rect.top)).entries()) {
      slide.shapes.add({ geometry: 'rect', name: `mint|diagram-isolated-bg|${index}-${i}`, position: node.rect, fill: solid(theme.palette.mintLight), line: { fill: theme.palette.mint, width: 2 } });
      addText(slide, node.text, node.contentRect, { typeface: font, fontSizePt: node.fontSizePx * 72 / 96, bold: true, color: theme.palette.ink }, `mint|diagram-isolated-node|${index}-${i}`);
    }
    for (const text of measured.textObjects.filter(item => item.className === 'module-title')) addText(slide, text.text, text.contentRect, { typeface: font, fontSizePt: text.fontSizePx * 72 / 96, bold: true, color: text.color || theme.palette.ink }, `mint|diagram-title|${index}`);
    for (const text of measured.textObjects.filter(item => item.className === 'module-copy')) addText(slide, text.renderText || text.text, text.contentRect, { typeface: font, fontSizePt: text.fontSizePx * 72 / 96, color: theme.palette.ink }, `mint|diagram-note|${index}`);
    return;
  }
  const data = moduleData(module), nodes = data.nodes || [], edges = data.edges || [];
  if (nodes.length > theme.constraints.maxNetworkNodes && !["grouped-network", "layered-network", "split-diagram"].includes(module.expression.variant)) throw new Error(`Diagram ${module.id || index} has more than ten nodes without grouping`);
  if (!nodes.length) return addNarrative(slide, { ...module, text: module.text || "关系节点缺失" }, frame, theme, font, index);
  const gap = 40, nodeW = Math.min(360, (frame.width - gap * (nodes.length - 1)) / nodes.length), nodeH = Math.min(180, frame.height * 0.42), totalW = nodeW * nodes.length + gap * (nodes.length - 1), startX = frame.left + (frame.width - totalW) / 2, top = frame.top + (frame.height - nodeH) / 2;
  const shapes = new Map();
  const nodeIndexes = new Map();
  nodes.forEach((node, i) => {
    const nodeFrame = { left: startX + i * (nodeW + gap), top, width: nodeW, height: nodeH };
    const label = String(node.label || node.name || node.id || "");
    const fitted = fitText(label, { width: nodeW - 36, height: nodeH - 28 }, { fontFamily: font, preferredPt: 18, minPt: 15, bold: true, lineHeight: 1.25, maxLines: 4 });
    if (fitted.overflow) throw new Error(`Diagram node ${node.id || i} cannot fit at the 15pt readability floor`);
    const shape = slide.shapes.add({ geometry: "rect", name: `mint|diagram-node|${index}-${i}`, position: nodeFrame, fill: solid(i === 0 ? theme.palette.mintLight : theme.palette.blueLight), line: { fill: i === 0 ? theme.palette.mint : theme.palette.blue, width: 2 }, borderRadius: 16 });
    shape.text = label; shape.text.style = { typeface: font, fontSize: fitted.fontSizePt * 96 / 72, bold: true, color: theme.palette.ink, autoFit: "none", verticalAlignment: "center" };
    shapes.set(String(node.id ?? i), shape);
    nodeIndexes.set(String(node.id ?? i), i);
  });
  edges.forEach((edge, edgeIndex) => {
    const from = shapes.get(String(edge.from)), to = shapes.get(String(edge.to));
    if (!from || !to) return;
    const fromIndex = nodeIndexes.get(String(edge.from)), toIndex = nodeIndexes.get(String(edge.to)), forward = fromIndex < toIndex;
    slide.shapes.connect(from, to, forward
      ? { kind: "straight", fromSide: "right", toSide: "left", line: { style: "solid", fill: theme.palette.muted, width: 2 }, tail: { type: "arrow", width: "med", length: "med" } }
      : { kind: "elbow3", fromSide: "bottom", toSide: "bottom", line: { style: "solid", fill: theme.palette.muted, width: 2 }, tail: { type: "arrow", width: "med", length: "med" } });
    if (edge.label) {
      const a = from.position, b = to.position, centerX = (a.left + a.width / 2 + b.left + b.width / 2) / 2, centerY = forward ? top + nodeH / 2 - 48 : top + nodeH + 30;
      addText(slide, edge.label, { left: centerX - 105, top: centerY, width: 210, height: 42 }, { typeface: font, fontSizePt: 14, bold: true, color: theme.palette.muted }, `mint|diagram-edge-label|${index}-${edgeIndex}`);
    }
  });
}

function addImage(slide, module, frame, index) {
  const source = module.imagePath || moduleData(module).imagePath;
  if (!source || !fs.existsSync(source)) throw new Error(`Image source is missing: ${source || module.id || index}`);
  const ext = path.extname(source).toLowerCase(), contentType = ext === ".jpg" || ext === ".jpeg" ? "image/jpeg" : ext === ".svg" ? "image/svg+xml" : "image/png";
  return slide.images.add({ blob: fs.readFileSync(source), contentType, alt: module.alt || module.title || "Source image", fit: module.fit === "cover" ? "cover" : "contain", position: frame });
}

function addMeasuredChart(slide, measured, theme, font, index) {
  const { rect: origin, model } = measured.chart;
  for (const [i, primitive] of model.primitives.entries()) {
    const frame = { left: origin.left + primitive.x, top: origin.top + primitive.y, width: primitive.width, height: primitive.height };
    if (primitive.kind === 'text') addText(slide, primitive.text, frame, { typeface: font, fontSizePt: primitive.fontSize * 72 / 96, color: primitive.color }, `mint|chart-label|${index}-${i}|text-role:${primitive.role || 'chartLabel'}`);
    else if (primitive.kind === 'line') {
      const dx = primitive.x2 - primitive.x, dy = primitive.y2 - primitive.y, length = Math.hypot(dx, dy);
      // Rotation around the line centre preserves both rising and falling
      // segments; a positive bounding rectangle alone reverses rising lines.
      slide.shapes.add({ geometry: 'line', name: `mint|chart-rule|${index}-${i}`, position: { left: origin.left + (primitive.x + primitive.x2) / 2 - length / 2, top: origin.top + (primitive.y + primitive.y2) / 2, width: length, height: 0, rotation: Math.atan2(dy, dx) * 180 / Math.PI }, line: { fill: primitive.color, width: 2 } });
    } else if (['circle', 'rect'].includes(primitive.kind)) slide.shapes.add({ geometry: primitive.kind === 'circle' ? 'ellipse' : 'rect', name: `mint|chart-mark|${index}-${i}`, position: frame, fill: primitive.color, line: noLine });
    else throw new Error(`EDITABLE_CHART_PRIMITIVE_UNSUPPORTED: ${primitive.kind}`);
  }
  for (const text of measured.textObjects.filter(item => item.className === 'module-title')) addText(slide, text.text, text.contentRect, { typeface: font, fontSizePt: text.fontSizePx * 72 / 96, bold: true, color: theme.palette.ink }, `mint|chart-title|${index}`);
}

export async function renderPresentation(ir, theme) {
  const { Presentation } = await artifactTool(), presentation = Presentation.create({ slideSize: { width: theme.slide.width, height: theme.slide.height } });
  const font = theme.fonts.cjk, diagnostics = [];
  for (const [slideIndex, spec] of ir.slides.entries()) {
    const slide = presentation.slides.add(); slide.background.fill = theme.palette.page;
    for(const attachment of spec.sceneAttachments||[]) if(attachment.relation==='overlay') slide.shapes.add({geometry:'rect',name:`mint|scene-overlay|target:${encodeURIComponent(attachment.targetId)}`,position:attachment.rect,fill:'none',line:{fill:theme.palette.ink,width:1}});
    addText(slide, spec.claim, spec.layout.title, { typeface: font, fontSizePt: spec.typography?.title?.fontSizePt || (spec.role === "cover" ? 40 : 30), bold: true, color: theme.palette.ink }, `mint|title|${slideIndex}`);
    if (spec.showManagementQuestion && spec.managementQuestion && spec.role === "content") addText(slide, spec.managementQuestion, spec.layout.claim, { typeface: font, fontSizePt: spec.typography?.question?.fontSizePt || 15, color: theme.palette.muted }, `mint|question|${slideIndex}`);
    for (const [index, module] of spec.modules.entries()) {
      const collections = [slide.shapes, slide.tables, slide.charts, slide.images];
      const existing = new Set(collections.flatMap(collection => collection.items));
      const rawFrame = spec.layout.modules[index] || spec.layout.modules.at(-1), type = module.expression?.type || module.type, variant = module.expression?.variant;
      const frame = { ...rawFrame, height: ["text", "callout", "metric", "table"].includes(type) ? Math.min(rawFrame.height, rawFrame.usedHeight || rawFrame.height) : rawFrame.height };
      const measured = spec.domModules?.[index];
      if (measured?.borderLeftWidth > 0) {
        if (measured.backgroundColor) slide.shapes.add({geometry:'rect',name:`mint|panel|${index}`,position:frame,fill:measured.backgroundColor,line:noLine});
        slide.shapes.add({geometry:'rect',name:`mint|accent|${index}`,position:{...frame,width:measured.borderLeftWidth},fill:measured.accent || theme.palette.mint,line:noLine});
      }
      if (measured?.primitives?.length) addVisualPrimitives(slide,measured,theme,font,index);
      else if (measured && ['text', 'callout', 'metric'].includes(type)) {
        for (const [j, text] of measured.textObjects.entries()) addText(slide, text.renderText || text.text, text.contentRect, { typeface: font, fontSizePt: text.fontSizePx * 72 / 96, bold: text.bold, color: text.color || theme.palette.ink }, `mint|measured-text|${index}-${j}`);
      }
      else if (type === "metric") addMetric(slide, module, frame, theme, font, index);
      else if (type === "chart" && measured?.chart && (nativeChartCompatibilityIssue(module.data, variant) || !["line", "column", "variance-bar", "doughnut", "percent-stacked", "scatter"].includes(variant))) {
        addMeasuredChart(slide, measured, theme, font, index);
        const reason = nativeChartCompatibilityIssue(module.data, variant);
        if (reason) diagnostics.push({slideId:spec.id,moduleId:module.id,implementation:'editable-shapes',expression:variant,reason});
      }
      else if (type === "chart") {
        (["line", "column", "variance-bar", "doughnut", "percent-stacked", "scatter"].includes(variant) ? addNativeChart : addShapeChart)(slide, module, measured?.chart?.rect || frame, theme, font, index);
        for (const text of measured?.textObjects.filter(item => item.className === 'module-title') || []) addText(slide, text.text, text.contentRect, { typeface: font, fontSizePt: text.fontSizePx * 72 / 96, bold: true, color: text.color || theme.palette.ink }, `mint|chart-title|${index}`);
      }
      else if (type === "table") addTable(slide, module, frame, theme, font, index, measured);
      else if (type === "diagram") addDiagram(slide, module, frame, theme, font, index, measured);
      else if (type === "image") {
        addImage(slide, module, measured?.image?.rect || frame, index);
        for (const text of measured?.textObjects || []) addText(slide, text.text, text.contentRect, { typeface: font, fontSizePt: text.fontSizePx * 72 / 96, bold: text.bold, color: text.color || theme.palette.ink }, `mint|image-text|${index}`);
      }
      else addNarrative(slide, module, frame, theme, font, index, spec.typography?.modules?.[index]);
      for (const object of collections.flatMap(collection => collection.items)) if (!existing.has(object)) object.name = `${object.name || 'mint|object'}|role:${module.semanticRole || 'primaryEvidence'}|module:${encodeURIComponent(module.id)}`;
    }
    slide.speakerNotes.textFrame.setText(JSON.stringify({ slideId: spec.id, sectionId: spec.sectionId || ir.sectionId, outlineItems:spec.outlineItems || [spec.outlineItem], outlineItem:spec.outlineItem, evidenceRefs: spec.evidenceRefs, sourceEvidence: spec.sourceEvidence || [], moduleEvidence: spec.modules.map(module => module.evidenceRefs || []) }));
    diagnostics.push({ slideId: spec.id, geometry: spec.geometry, occupancy: spec.layout.occupancy, expressions: spec.modules.map(module => module.expression) });
  }
  return { presentation, diagnostics };
}

export async function exportPresentation(presentation, output) {
  const { PresentationFile } = await artifactTool();
  await (await PresentationFile.exportPptx(presentation)).save(output);
  // The current library drops per-point top/bottom positions on export.
  // Restore the renderer's existing line-label policy in native OOXML only;
  // never change series data, chart type, fonts or user-authored PPT files.
  const pkg = await inspectPptxPackage(output);
  let changed = false;
  for (const part of pkg.charts) {
    const original = await pkg.zip.file(part).async('string');
    if (!original.includes('<c:lineChart>')) continue;
    let seriesIndex = 0;
    const corrected = original.replace(/<c:ser>[\s\S]*?<\/c:ser>/g, series => {
      const position = seriesIndex++ % 2 ? 't' : 'b';
      return series.replace(/<c:dLbl>[\s\S]*?<\/c:dLbl>/g, label => label.includes('<c:dLblPos') ? label : label.replace('<c:showLegendKey', `<c:dLblPos val="${position}"/><c:showLegendKey`));
    });
    if (corrected !== original) { pkg.zip.file(part, corrected); changed = true; }
  }
  if (changed) fs.writeFileSync(output, await pkg.zip.generateAsync({type:'nodebuffer',compression:'DEFLATE'}));
}
