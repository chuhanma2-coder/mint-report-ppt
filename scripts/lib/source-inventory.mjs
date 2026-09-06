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
      const prefix=xml.slice(0,match.index),inCell=(prefix.match(/<w:tc(?:\s|>)/g)||[]).length>(prefix.match(/<\/w:tc>/g)||[]).length;
      if (text.trim()) blocks.push({ id: `${part}:p${index}`, text, sha256: sha(text), kind: 'text',structureKind:inCell?'table-cell':/<w:pStyle\b[^>]*w:val="Heading[1-9]"/i.test(match[0])?'heading':'paragraph' });
    }
  }
  for (const name of Object.keys(zip.files).filter(name => name.startsWith('word/media/') && !zip.files[name].dir).sort()) {
    blocks.push({ id: name, sha256: sha(await zip.files[name].async('nodebuffer')), kind: 'image' });
  }
  return { file: path.resolve(file), sha256: sha(bytes), blocks };
}

export async function xlsxInventory(file) {
  const require=createRequire(path.join(process.env.RUNTIME_NODE_MODULES,'package.json'));
  const imported=await import(require.resolve('jszip')),JSZip=imported.default||imported;
  const bytes=fs.readFileSync(file),zip=await JSZip.loadAsync(bytes),blocks=[];
  const text=xml=>[...xml.matchAll(/<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/g)].map(m=>decode(m[1])).join('');
  const sharedXml=await zip.file('xl/sharedStrings.xml')?.async('string')||'';
  const strings=[...sharedXml.matchAll(/<si(?:\s[^>]*)?>([\s\S]*?)<\/si>/g)].map(m=>text(m[1]));
  for(const part of Object.keys(zip.files).filter(n=>/^xl\/worksheets\/sheet\d+\.xml$/.test(n)).sort()) {
    const xml=await zip.file(part).async('string');
    for(const match of xml.matchAll(/<c\b([^>]*)>([\s\S]*?)<\/c>/g)) {
      const address=match[1].match(/\br="([^"]+)"/)?.[1],type=match[1].match(/\bt="([^"]+)"/)?.[1],value=match[2].match(/<v(?:\s[^>]*)?>([\s\S]*?)<\/v>/)?.[1];
      if(!address) throw new Error('SPREADSHEET_CELL_ADDRESS_REQUIRED');
      if(match[1].match(/\bs="([^"]+)"/)?.[1] && !['s','inlineStr','str'].includes(type)) throw new Error(`SPREADSHEET_FORMAT_REVIEW_REQUIRED: ${part}/${address}; supply a reviewed display-value export to preserve dates, percentages and currency formats`);
      if(/<f(?:\s|>)/.test(match[2])&&value==null) throw new Error(`SPREADSHEET_FORMULA_CACHE_REQUIRED: ${part}/${address}`);
      const display=type==='s'?strings[Number(value)]:type==='inlineStr'?text(match[2]):decode(value||'');
      if(display==null) throw new Error('SPREADSHEET_SHARED_STRING_MISSING');
      if(display!=='') blocks.push({id:`${part}!${address}`,kind:'spreadsheet-range',text:display,sha256:sha(match[0])});
    }
  }
  for(const part of Object.keys(zip.files).filter(n=>/^xl\/media\//.test(n)&&!zip.files[n].dir).sort()) blocks.push({id:part,kind:'image',sha256:sha(await zip.file(part).async('nodebuffer'))});
  return {file:path.resolve(file),sha256:sha(bytes),blocks};
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
  return { passed: !issues.length, scope: 'docx-text-and-media',status:inventories.length?'checked':'no-docx-input-use-canonical-gate', inventories, issues };
}
