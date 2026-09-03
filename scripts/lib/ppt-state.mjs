import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";

const sha = value => crypto.createHash("sha256").update(value).digest("hex");
const xmlUnescape = value => String(value || "").replaceAll("&apos;", "'").replaceAll("&quot;", '"').replaceAll("&gt;", ">").replaceAll("&lt;", "<").replaceAll("&amp;", "&");

async function runtime() {
  if (!process.env.RUNTIME_NODE_MODULES) throw new Error("RUNTIME_NODE_MODULES is required");
  const require = createRequire(path.join(process.env.RUNTIME_NODE_MODULES, "package.json"));
  const artifact = await import(pathToFileURL(require.resolve("@oai/artifact-tool")).href);
  const imported = (await import(require.resolve("jszip"))).default;
  return { ...artifact, JSZip: imported };
}

function mimeFor(file) {
  const ext = path.extname(file).toLowerCase();
  return ({ ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".gif": "image/gif", ".svg": "image/svg+xml", ".webp": "image/webp" })[ext] || "application/octet-stream";
}

async function imagePart(zip, slideNumber, objectName, includeData) {
  const slideName = `ppt/slides/slide${slideNumber}.xml`, relName = `ppt/slides/_rels/slide${slideNumber}.xml.rels`;
  const slideXml = await zip.file(slideName)?.async("string"), relXml = await zip.file(relName)?.async("string");
  if (!slideXml || !relXml) throw new Error(`Cannot read image relationships for slide ${slideNumber}`);
  const escaped = objectName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const block = [...slideXml.matchAll(/<p:pic\b[\s\S]*?<\/p:pic>/g)].map(match => match[0]).find(value => new RegExp(`<p:cNvPr\\b[^>]*\\bname="${escaped}"`).test(value));
  const relId = block?.match(/<a:blip\b[^>]*\br:embed="([^"]+)"/)?.[1];
  if (!relId) throw new Error(`Cannot resolve image ${objectName}`);
  const rel = [...relXml.matchAll(/<Relationship\b([^>]*)\/>/g)].map(match => match[1]).find(attrs => new RegExp(`\\bId="${relId.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}"`).test(attrs));
  const target = rel?.match(/\bTarget="([^"]+)"/)?.[1];
  if (!target) throw new Error(`Cannot resolve image target for ${objectName}`);
  const decodedTarget = xmlUnescape(target), part = decodedTarget.startsWith("/") ? decodedTarget.slice(1) : path.posix.normalize(path.posix.join("ppt/slides", decodedTarget)), bytes = await zip.file(part)?.async("nodebuffer");
  if (!bytes) throw new Error(`Missing embedded image part ${part}`);
  return { mediaHash: sha(bytes), ...(includeData ? { dataUrl: `data:${mimeFor(part)};base64,${bytes.toString("base64")}` } : {}) };
}

function seriesItems(chart) {
  if (Array.isArray(chart.series?.items)) return chart.series.items;
  const values = [];
  for (let index = 0; index < 100; index++) { try { const item = chart.series.getItemAt(index); if (!item) break; values.push(item); } catch { break; } }
  return values;
}

export async function snapshotPpt(file, { includeImageData = false } = {}) {
  const { FileBlob, PresentationFile, JSZip } = await runtime(), presentation = await PresentationFile.importPptx(await FileBlob.load(file)), zip = await JSZip.loadAsync(fs.readFileSync(file));
  const snapshot = await presentation.inspect({ kind: "textbox,shape,image,table,chart", include: "id,slide,name,bbox,text,rows,cols,chartType,title,alt", maxChars: 20_000_000 });
  const records = snapshot.ndjson.trim().split("\n").filter(Boolean).map(JSON.parse), seen = new Set(), duplicateNames = [], objects = [];
  for (const record of records) {
    if (!record.name) continue;
    if (seen.has(`${record.slide}:${record.name}`)) { duplicateNames.push(`${record.slide}:${record.name}`); continue; }
    seen.add(`${record.slide}:${record.name}`);
    const target = presentation.resolve(record.id), base = { kind: record.kind, slide: record.slide, name: record.name, bbox: record.bbox || null };
    if (record.kind === "table") {
      const rows = Number(record.rows || target.rows?.length || 0), cols = Number(record.cols || target.columns?.length || 0), values = [];
      for (let row = 0; row < rows; row++) { const line = []; for (let col = 0; col < cols; col++) line.push(String(target.getCell(row, col).text)); values.push(line); }
      objects.push({ ...base, rows, cols, values });
    } else if (record.kind === "chart") {
      const series = seriesItems(target).map(item => ({ name: String(item.name || ""), categories: [...(item.categories || [])].map(String), values: [...(item.values || [])].map(Number) }));
      objects.push({ ...base, chartType: record.chartType || null, barDirection: target.barOptions?.direction || null, title: String(target.title || record.title || ""), series });
    } else if (record.kind === "image") {
      objects.push({ ...base, alt: String(target.alt || ""), crop: target.crop || null, frame: target.frame || null, ...(await imagePart(zip, record.slide, record.name, includeImageData)) });
    } else objects.push({ ...base, text: String(record.text ?? record.textPreview ?? "") });
  }
  return { schemaVersion: "1.0", slides: presentation.slides?.items?.length || 0, duplicateNames, objects };
}
