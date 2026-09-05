import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';
const sha = value => crypto.createHash('sha256').update(value).digest('hex');
const decode = value => value.replaceAll('&lt;', '<').replaceAll('&gt;', '>').replaceAll('&quot;', '"').replaceAll('&apos;', "'").replaceAll('&amp;', '&');

export async function docxInventory(file) {
  const require = createRequire(path.join(process.env.RUNTIME_NODE_MODULES, 'package.json'));
  const imported = await import(require.resolve('jszip')), JSZip = imported.default || imported;
  const bytes = fs.readFileSync(file), zip = await JSZip.loadAsync(bytes), blocks = [];
  for (const part of Object.keys(zip.files).filter(name => /^word\/(document|footnotes|endnotes|header\d+|footer\d+)\.xml$/.test(name)).sort()) {
    const xml = await zip.file(part).async('string'); let index = 0;
    for (const match of xml.matchAll(/<w:p(?:\s[^>]*)?>[\s\S]*?<\/w:p>/g)) {
      index++;
      const text = [...match[0].matchAll(/<w:t(?:\s[^>]*)?>([\s\S]*?)<\/w:t>/g)].map(item => decode(item[1])).join('');
      if (text.trim()) blocks.push({ id: `${part}:p${index}`, text, sha256: sha(text), kind: 'text' });
    }
  }
  for (const name of Object.keys(zip.files).filter(name => name.startsWith('word/media/') && !zip.files[name].dir).sort()) {
    blocks.push({ id: name, sha256: sha(await zip.files[name].async('nodebuffer')), kind: 'image' });
  }
  return { file: path.resolve(file), sha256: sha(bytes), blocks };
}

export async function auditSourceInventory(source) {
  const issues = [], inventories = [];
  for (const file of source.sourceFiles || []) {
    if (!file.path?.toLowerCase().endsWith('.docx')) continue;
    const actual = await docxInventory(file.path); inventories.push(actual);
    if (file.sha256 && file.sha256 !== actual.sha256) issues.push(`SOURCE_FILE_CHANGED: ${file.path}`);
    for (const block of actual.blocks) {
      const destinations = (source.sourceUnits || []).filter(unit => (unit.sourceAnchors || []).some(anchor => anchor.file === actual.file && anchor.blockId === block.id && anchor.sha256 === block.sha256));
      if (!destinations.length) issues.push(`SOURCE_BLOCK_UNALLOCATED: ${actual.file} ${block.id}`);
      if (block.kind === 'image' && !destinations.some(unit => unit.imageReview?.status === 'reviewed' && unit.imageReview.sha256 === block.sha256 && unit.imageReview.regions?.length)) issues.push(`SOURCE_IMAGE_REVIEW_REQUIRED: ${block.id}; embedded bytes alone do not prove readable detail`);
    }
  }
  return { passed: !issues.length, scope: 'docx-text-and-media', inventories, issues };
}
