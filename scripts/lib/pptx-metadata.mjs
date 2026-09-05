import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const xmlEscape = value => String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&apos;");
const xmlUnescape = value => String(value || "").replaceAll("&apos;", "'").replaceAll("&quot;", '"').replaceAll("&gt;", ">").replaceAll("&lt;", "<").replaceAll("&amp;", "&");

async function jsZip() {
  if (!process.env.RUNTIME_NODE_MODULES) throw new Error("RUNTIME_NODE_MODULES is required");
  const require = createRequire(path.join(process.env.RUNTIME_NODE_MODULES, "package.json"));
  const imported = await import(require.resolve("jszip")); return imported.default || imported;
}

function customXml(metadata) {
  const entries = Object.entries(metadata);
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/custom-properties" xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes">${entries.map(([name, value], index) => `<property fmtid="{D5CDD505-2E9C-101B-9397-08002B2CF9AE}" pid="${index + 2}" name="${xmlEscape(name)}"><vt:lpwstr>${xmlEscape(value)}</vt:lpwstr></property>`).join("")}</Properties>`;
}

export async function writePptxMetadata(file, metadata) {
  const JSZip = await jsZip(), zip = await JSZip.loadAsync(fs.readFileSync(file));
  const contentTypes = await zip.file("[Content_Types].xml")?.async("string"), relationships = await zip.file("_rels/.rels")?.async("string");
  if (!contentTypes || !relationships) throw new Error("PPTX lacks required package metadata");
  const override = '<Override PartName="/docProps/custom.xml" ContentType="application/vnd.openxmlformats-officedocument.custom-properties+xml"/>';
  const relation = '<Relationship Id="rIdMintPptMetadata" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/custom-properties" Target="docProps/custom.xml"/>';
  zip.file("[Content_Types].xml", contentTypes.includes('/docProps/custom.xml') ? contentTypes : contentTypes.replace("</Types>", `${override}</Types>`));
  zip.file("_rels/.rels", relationships.includes("custom-properties") ? relationships : relationships.replace("</Relationships>", `${relation}</Relationships>`));
  zip.file("docProps/custom.xml", customXml(metadata));
  fs.writeFileSync(file, await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE", compressionOptions: { level: 6 } }));
}

export async function readPptxMetadata(file) {
  const JSZip = await jsZip(), zip = await JSZip.loadAsync(fs.readFileSync(file)), xml = await zip.file("docProps/custom.xml")?.async("string");
  if (!xml) throw new Error(`PPTX ${path.basename(file)} has no Mint custom metadata`);
  const result = {};
  for (const match of xml.matchAll(/<property\b[^>]*\bname="([^"]+)"[^>]*>[\s\S]*?<vt:lpwstr>([\s\S]*?)<\/vt:lpwstr>[\s\S]*?<\/property>/g)) result[xmlUnescape(match[1])] = xmlUnescape(match[2]);
  return result;
}

export async function inspectPptxPackage(file) {
  const JSZip = await jsZip(), zip = await JSZip.loadAsync(fs.readFileSync(file)), names = Object.keys(zip.files);
  const slides = names.filter(name => /^ppt\/slides\/slide\d+\.xml$/.test(name)).sort((a, b) => Number(a.match(/\d+/)[0]) - Number(b.match(/\d+/)[0]));
  const charts = names.filter(name => /^ppt\/(?:slides\/)?charts\/chart\d+\.xml$/.test(name));
  const media = names.filter(name => /^ppt\/media\//.test(name) && !zip.files[name].dir);
  const presentation = await zip.file("ppt/presentation.xml")?.async("string");
  const size = presentation?.match(/<p:sldSz\b[^>]*\bcx="(\d+)"[^>]*\bcy="(\d+)"/);
  const slideXml = await Promise.all(slides.map(name => zip.file(name).async("string")));
  const mintTextObjects = slideXml.flatMap((xml, slideIndex) => [...xml.matchAll(/<p:sp>([\s\S]*?)<\/p:sp>/g)].map(match => {
    const shape = match[1], name = shape.match(/<p:cNvPr\b[^>]*\bname="([^"]*)"/)?.[1] || "";
    if (!name.startsWith("mint|") || !/<a:t>/.test(shape)) return null;
    const sizes = [...shape.matchAll(/<(?:a:defRPr|a:rPr)\b[^>]*\bsz="(\d+)"/g)].map(item => Number(item[1]));
    const typefaces = [...shape.matchAll(/<a:(?:latin|ea|cs)\b[^>]*\btypeface="([^"]+)"/g)].map(item => item[1]);
    return { slide: slideIndex + 1, name, minimumFontPt: sizes.length ? Math.min(...sizes) / 100 : null, typefaces: [...new Set(typefaces)], noAutoFit: /<a:noAutofit\s*\/>/.test(shape) };
  }).filter(Boolean));
  const fullSlideImages = slideXml.flatMap((xml, slideIndex) => [...xml.matchAll(/<p:pic>([\s\S]*?)<\/p:pic>/g)].map(match => {
    const picture = match[1], ext = picture.match(/<a:ext\b[^>]*\bcx="(\d+)"[^>]*\bcy="(\d+)"/);
    if (!ext || !size) return null;
    const areaShare = Number(ext[1]) * Number(ext[2]) / (Number(size[1]) * Number(size[2]));
    return areaShare >= 0.9 ? { slide: slideIndex + 1, areaShare } : null;
  }).filter(Boolean));
  const relNames = names.filter(name => /^ppt\/(slides|charts|drawings)\/_rels\/.*\.rels$/.test(name));
  const relXml = await Promise.all(relNames.map(name => zip.file(name).async("string")));
  return {
    zip, names, slides, charts, media, slideXml, relXml,
    slideSize: size ? { cx: Number(size[1]), cy: Number(size[2]), ratio: Number(size[1]) / Number(size[2]) } : null,
    hasExternalMedia: relXml.some(xml => /TargetMode="External"[^>]*Type="[^"]*\/(?:image|audio|video|oleObject)"|Type="[^"]*\/(?:image|audio|video|oleObject)"[^>]*TargetMode="External"/i.test(xml)),
    visibleText: slideXml.flatMap(xml => [...xml.matchAll(/<a:t>([\s\S]*?)<\/a:t>/g)].map(match => xmlUnescape(match[1]))).join("\n"),
    hasPageChrome: slideXml.some(xml => /<p:ph\b[^>]*\btype="(?:dt|ftr|sldNum)"/i.test(xml)),
    nativeTables: slideXml.reduce((sum, xml) => sum + (xml.match(/<a:tbl\b/g) || []).length, 0),
    nativeShapes: slideXml.reduce((sum, xml) => sum + (xml.match(/<p:sp\b/g) || []).length, 0),
    mintTextObjects, fullSlideImages
  };
}
