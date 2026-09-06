import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { docxInventory,xlsxInventory } from './source-inventory.mjs';

export const CANONICAL_VERSION = '1';
const sha = value => crypto.createHash('sha256').update(value).digest('hex');
const origins = ['raw-source','task-card','user-supplied-fact'];
const kinds = ['paragraph','heading','table-cell','image','text-block','spreadsheet-range'];

// Units follow raw structure, not model-authored "atomic fact" segmentation.
// The immutable ledger is generated BEFORE planning; inferred claims never enter it.
export function createCanonicalLedger(inventories) {
  if(!inventories.length) throw new Error('CANONICAL_EMPTY_INPUT');
  const units=[], seen=new Set(), inputs=[];
  for(const input of [...inventories].sort((a,b)=>`${a.canonicalInputHash||a.sha256}:${a.selector||''}`.localeCompare(`${b.canonicalInputHash||b.sha256}:${b.selector||''}`))) {
    if(!origins.includes(input.sourceOrigin)||!input.sha256||!input.blocks?.length) throw new Error('CANONICAL_INPUT_INVALID');
    const inputKey=`${input.canonicalInputHash||input.sha256}:${input.selector || ''}`;
    if(seen.has(inputKey)) continue; // Same raw file repeated by a task card is not new evidence.
    seen.add(inputKey);
    inputs.push({path:input.file,sha256:input.sha256,canonicalInputHash:input.canonicalInputHash||input.sha256,selector:input.selector || null,sourceOrigin:input.sourceOrigin});
    for(const block of input.blocks) {
      if(!block.id||!block.sha256||!kinds.includes(block.kind)) throw new Error('CANONICAL_ANCHOR_INVALID');
      const id=`CS-${sha(`${CANONICAL_VERSION}:${inputKey}:${block.id}:${block.sha256}`).slice(0,24)}`;
      units.push({id,sourceUnitId:id,sourceOrigin:input.sourceOrigin,kind:block.kind,text:block.text || '',
        sourceAnchors:[{file:input.file,blockId:block.id,sha256:block.sha256}],rawSha256:input.canonicalInputHash||input.sha256});
    }
  }
  if(new Set(units.map(u=>u.id)).size!==units.length) throw new Error('CANONICAL_DUPLICATE_ANCHOR');
  const identity=units.map(({id,sourceOrigin,kind,text})=>({id,sourceOrigin,kind,text}));
  return {schemaVersion:CANONICAL_VERSION,denominatorBasis:'raw-structural-units',inputs,units,
    canonicalFactsTotal:units.length,sha256:sha(JSON.stringify(identity))};
}

function textBlocks(text,prefix='text') {
  const blocks=[];let start=0;
  for(const line of text.split(/\r?\n/)) {
    if(line.trim()) blocks.push({id:`${prefix}:line${start+1}`,kind:/^#{1,6}\s/.test(line)?'heading':'text-block',text:line,sha256:sha(line)});
    start++;
  }
  return blocks;
}

export async function inventoryCanonicalInput(descriptor) {
  if(!origins.includes(descriptor.sourceOrigin)) throw new Error('CANONICAL_SOURCE_ORIGIN_REQUIRED');
  const file=path.resolve(descriptor.path),bytes=fs.readFileSync(file),ext=path.extname(file).toLowerCase();
  let blocks,canonicalInputHash=sha(bytes);
  if(ext==='.docx') {
    const inventory=await docxInventory(file);
    blocks=inventory.blocks.map(b=>({...b,kind:b.structureKind||(b.kind==='text'?'paragraph':b.kind)}));
  } else if(ext==='.xlsx') {
    blocks=(await xlsxInventory(file)).blocks;
  } else if(['.txt','.md'].includes(ext)) blocks=textBlocks(bytes.toString('utf8'));
  else if(ext==='.json') {
    // Explicit pointer prevents scanning task metadata/design instructions as facts.
    if(!descriptor.selector?.startsWith('/')) throw new Error('CANONICAL_JSON_POINTER_REQUIRED');
    let value=JSON.parse(bytes.toString('utf8'));
    for(const key of descriptor.selector.slice(1).split('/').map(k=>k.replaceAll('~1','/').replaceAll('~0','~'))) value=value?.[key];
    if(typeof value==='string') blocks=textBlocks(value,descriptor.selector);
    else if(Array.isArray(value) && value.every(row=>Array.isArray(row))) blocks=value.flatMap((row,r)=>row.map((cell,c)=>({id:`${descriptor.selector}/${r}/${c}`,kind:'table-cell',text:String(cell??''),sha256:sha(String(cell??''))})));
    else throw new Error('CANONICAL_JSON_SOURCE_REQUIRED: select raw text or a table, not a planned model');
    canonicalInputHash=sha(JSON.stringify(value)); // Unselected style metadata is not raw content.
  } else if(['.png','.jpg','.jpeg','.svg','.webp'].includes(ext)) blocks=[{id:'image',kind:'image',sha256:sha(bytes)}];
  else throw new Error(`CANONICAL_FORMAT_UNSUPPORTED: ${ext}; provide a reviewed raw text export, never silently skip`);
  if(descriptor.sourceOrigin==='user-supplied-fact' && descriptor.confirmedBusinessFacts!==true) throw new Error('USER_FACT_CLASSIFICATION_REQUIRED');
  return {file,sha256:sha(bytes),canonicalInputHash,selector:descriptor.selector,sourceOrigin:descriptor.sourceOrigin,blocks};
}

export async function verifyCanonicalLedger(ledger) {
  const inventories=[];
  for(const input of ledger.inputs || []) inventories.push(await inventoryCanonicalInput({...input,confirmedBusinessFacts:true}));
  const actual=createCanonicalLedger(inventories);
  if(JSON.stringify(actual)!==JSON.stringify(ledger)) throw new Error('CANONICAL_LEDGER_CHANGED: regenerate from raw inputs before planning');
  return actual;
}

export function canonicalCoverage(ledger,source,visibleAudit) {
  const issues=[],unitMap=new Map((source.sourceUnits||[]).map(u=>[u.id,u])),counts=[];
  for(const raw of ledger.units) {
    const parts=[...unitMap.values()].filter(u=>(u.canonicalRefs||[u.id]).includes(raw.id));
    const omitted=(source.approvedOmissions||[]).some(o=>o.sourceUnitId===raw.id&&o.approved===true&&o.reason?.trim());
    // Raw anchor must survive extraction, not just its ID. Components may then be
    // rewritten by the existing reviewed-component gate against this exact text.
    if(!omitted&&!parts.some(u=>(u.text||u.sourceText)===raw.text && (raw.kind!=='image'||u.imageReview?.status==='reviewed'))) issues.push(`CANONICAL_EXTRACTION_UNPROVEN: ${raw.id}`);
    const visible=!omitted && parts.length>0 && parts.every(u=>visibleAudit.mappings?.[u.id]?.length) && visibleAudit.passed;
    if(!visible&&!omitted) issues.push(`CANONICAL_NOT_VISIBLE: ${raw.id}`);
    counts.push({sourceUnitId:raw.id,status:omitted?'approved-omission':visible?'visible':'unverified'});
  }
  const known=new Set(ledger.units.map(u=>u.id));
  for(const u of unitMap.values()) if(!(u.canonicalRefs||[u.id]).every(id=>known.has(id))) issues.push(`CANONICAL_UNKNOWN_REF: ${u.id}`);
  return {passed:!issues.length,canonicalLedgerHash:ledger.sha256,denominatorBasis:ledger.denominatorBasis,
    canonicalFactsTotal:ledger.units.length,canonicalFactsVisible:counts.filter(c=>c.status==='visible').length,
    canonicalFactsOmitted:counts.filter(c=>c.status==='approved-omission').length,coverage:counts,issues};
}
