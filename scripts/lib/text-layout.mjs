import path from "node:path";
import { createRequire } from "node:module";

let context;

function measurementContext() {
  if (context) return context;
  if (!process.env.RUNTIME_NODE_MODULES) {
    context = { font: "", measureText: text => ({ width: [...String(text)].reduce((sum, char) => sum + (/^[\x00-\x7F]$/.test(char) ? 8 : 16), 0) }) };
    return context;
  }
  const require = createRequire(path.join(process.env.RUNTIME_NODE_MODULES, "package.json"));
  const { createCanvas } = require("@napi-rs/canvas");
  context = createCanvas(16, 16).getContext("2d");
  return context;
}

const ptToPx = pt => Number(pt) * 96 / 72;

function graphemes(text) {
  return [...new Intl.Segmenter("zh-CN", { granularity: "grapheme" }).segment(String(text ?? ""))].map(item => item.segment);
}

export function measureWrappedText(text, { fontFamily, fontSizePt, maxWidth, bold = false, lineHeight = 1.35, maxLines = Infinity }) {
  const ctx = measurementContext();
  ctx.font = `${bold ? "700" : "400"} ${ptToPx(fontSizePt)}px "${fontFamily}"`;
  const lines = [];
  for (const paragraph of String(text ?? "").split(/\r?\n/)) {
    if (!paragraph) { lines.push(""); continue; }
    let line = "";
    for (const token of graphemes(paragraph)) {
      const candidate = line + token;
      if (line && ctx.measureText(candidate).width > maxWidth) { lines.push(line); line = token; }
      else line = candidate;
    }
    if (line) lines.push(line);
  }
  const clipped = lines.length > maxLines;
  const used = lines.slice(0, maxLines);
  return {
    lines: used,
    lineCount: lines.length,
    width: Math.min(maxWidth, Math.max(0, ...used.map(line => ctx.measureText(line).width))),
    height: lines.length * ptToPx(fontSizePt) * lineHeight,
    fits: !clipped
  };
}

export function fitText(text, frame, { fontFamily, preferredPt, minPt, maxLines, bold = false, lineHeight = 1.35 }) {
  for (let fontSizePt = preferredPt; fontSizePt >= minPt; fontSizePt -= 1) {
    const measured = measureWrappedText(text, { fontFamily, fontSizePt, maxWidth: frame.width, bold, lineHeight, maxLines });
    if (measured.fits && measured.height <= frame.height) return { ...measured, fontSizePt, overflow: false };
  }
  const measured = measureWrappedText(text, { fontFamily, fontSizePt: minPt, maxWidth: frame.width, bold, lineHeight, maxLines });
  return { ...measured, fontSizePt: minPt, overflow: measured.height > frame.height || !measured.fits };
}

export function moduleContentDemand(module, width, theme) {
  const type = module.expression?.type || module.type, variant = module.expression?.variant;
  if (["chart", "diagram", "image"].includes(type)) return { minHeight: 360, desiredHeight: 560, visual: true };
  if (type === "table") {
    const rows = module.data?.values || module.data?.rows || [];
    const rowCount = Math.max(1, rows.length), rowHeight = 44;
    if (["supporting", "reference"].includes(module.tableRole)) return { minHeight: Math.min(360, Math.max(160, rowCount * 36)), desiredHeight: Math.min(420, Math.max(200, rowCount * 42)), visual: false };
    return { minHeight: Math.min(680, Math.max(180, rowCount * rowHeight)), desiredHeight: Math.min(760, Math.max(220, rowCount * 52)), visual: module.tableRole === "primary" || module.tableRole === "detail" };
  }
  if (type === "metric") return { minHeight: 190, desiredHeight: 300, visual: false };
  const title = String(module.title || ""), body = String(module.text || ""), bodyRange = module.semanticRole === "managementConclusion" ? [20, 17] : module.density === "dense" ? [18, 16] : [20, 17];
  const innerWidth = Math.max(80, width - 56);
  const titleHeight = title ? measureWrappedText(title, { fontFamily: theme.fonts.cjk, fontSizePt: 18, maxWidth: innerWidth, bold: true, lineHeight: 1.25 }).height + 18 : 0;
  const bodyMeasure = measureWrappedText(body, { fontFamily: theme.fonts.cjk, fontSizePt: bodyRange[0], maxWidth: innerWidth, lineHeight: 1.4 });
  const minimum = measureWrappedText(body, { fontFamily: theme.fonts.cjk, fontSizePt: bodyRange[1], maxWidth: innerWidth, lineHeight: 1.4 });
  return { minHeight: Math.max(120, titleHeight + minimum.height + 56), desiredHeight: Math.max(150, titleHeight + bodyMeasure.height + 56), visual: false };
}
