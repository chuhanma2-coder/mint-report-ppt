import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import os from 'node:os';
import {runtimeFingerprint} from './runtime-fingerprint.mjs';
export const digest=value=>crypto.createHash('sha256').update(value).digest('hex');
const fileHash=file=>digest(fs.readFileSync(file));
export const deliverySidecars=['.build.json','.source-inventory.json','.source-coverage.json','.canonical-coverage.json','.understanding.json','.final-facts.json','.audit.json','.visual-parity.json','.native-design-requirements.json','.design-execution.json','.resolved-ir.json','.outline-measurements.json','.presentation-copy.json','.executive-review-input.json'];

export function sealReviewEvidence({pptx,inputFiles,images,runtime,generatorId}) {
  const files=[pptx,...inputFiles,...images,...deliverySidecars.map(s=>pptx+s)];
  const manifest={version:1,generatorId:generatorId||null,runtime,createdAt:new Date().toISOString(),files:[...new Set(files)].map(file=>({path:path.resolve(file),sha256:fileHash(file)}))};
  fs.writeFileSync(pptx+'.review-evidence.json',JSON.stringify(manifest,null,2));
  return manifest;
}

export function reviewEvidenceIssues(pptx,root,review=null) {
  const manifestFile=pptx+'.review-evidence.json';
  if(!fs.existsSync(manifestFile)) return ['REVIEW_EVIDENCE_REQUIRED'];
  const manifest=JSON.parse(fs.readFileSync(manifestFile,'utf8')),issues=[];
  for(const item of manifest.files) if(!fs.existsSync(item.path)||fileHash(item.path)!==item.sha256) issues.push(`REVIEW_EVIDENCE_CHANGED: ${item.path}`);
  if(runtimeFingerprint(root).sha256!==manifest.runtime?.sha256) issues.push('REVIEW_RUNTIME_CHANGED');
  if(review&&review.reviewEvidenceSha256!==fileHash(manifestFile)) issues.push('EXECUTIVE_REVIEW_EVIDENCE_MISMATCH');
  return issues;
}

// Identity comes from the Codex host transcript outside the artifact workspace,
// not a generator-authored JSON field. This protects accidental self-approval;
// it is deliberately not described as a cryptographic attestation service.
export function hostReviewTranscript(transcriptFile,reviewerId,images,{sessionRoot=path.join(process.env.CODEX_HOME||path.join(os.homedir(),'.codex'),'sessions'),prefixBytes=null}={}) {
  const relative=path.relative(fs.realpathSync(sessionRoot),fs.realpathSync(transcriptFile));
  if(relative.startsWith('..')||path.isAbsolute(relative)) throw new Error('REVIEW_TRANSCRIPT_NOT_HOST_OWNED');
  const all=fs.readFileSync(transcriptFile);
  if(prefixBytes!==null&&(!Number.isSafeInteger(prefixBytes)||prefixBytes<=0||prefixBytes>all.length||all[prefixBytes-1]!==10)) throw new Error('REVIEW_HOST_PREFIX_INVALID');
  const bytes=prefixBytes===null?all:all.subarray(0,prefixBytes),prefix=bytes.subarray(0,bytes.lastIndexOf(10)+1);
  const rows=prefix.toString('utf8').split('\n').filter(Boolean).map(line=>JSON.parse(line));
  const meta=rows.find(r=>r.type==='session_meta')?.payload;
  if(meta?.id!==reviewerId) throw new Error('REVIEW_HOST_ID_MISMATCH');
  const calls=new Set(rows.filter(r=>r.type==='response_item'&&['function_call','custom_tool_call'].includes(r.payload?.type)).map(r=>r.payload.call_id));
  const observed=new Set();
  for(const row of rows) {
    const output=row.payload;
    if(row.type!=='response_item'||!['function_call_output','custom_tool_call_output'].includes(output?.type)||!calls.has(output.call_id)||!Array.isArray(output.output)) continue;
    for(const block of output.output) {
      if(block.type!=='input_image') continue;
      const data=/^data:image\/[^;]+;base64,([A-Za-z0-9+/=\s]+)$/.exec(block.image_url||'');
      if(data) observed.add(digest(Buffer.from(data[1],'base64')));
    }
  }
  // Only model-visible image result blocks count, never a path, view_image word,
  // a pending call, or JSON printed as text. Use detail=original when reviewing.
  for(const image of images) if(!fs.existsSync(image)||!observed.has(fileHash(image))) throw new Error(`REVIEW_IMAGE_NOT_OBSERVED: ${image}`);
  return {threadId:meta.id,parentThreadId:meta.source?.subagent?.thread_spawn?.parent_thread_id||null,sessionMetaSha256:digest(JSON.stringify(meta)),prefixBytes:prefix.length,prefixSha256:digest(prefix)};
}

export function reviewReceiptIssues({pptx,reviewFile,receiptFile,root}) {
  if(!fs.existsSync(receiptFile)) return ['EXECUTIVE_HOST_RECEIPT_REQUIRED'];
  const receipt=JSON.parse(fs.readFileSync(receiptFile,'utf8')),review=JSON.parse(fs.readFileSync(reviewFile,'utf8'));
  const issues=reviewEvidenceIssues(pptx,root,review),manifest=JSON.parse(fs.readFileSync(pptx+'.review-evidence.json','utf8'));
  if(!manifest.generatorId||!receipt.reviewerId||manifest.generatorId===receipt.reviewerId) issues.push('EXECUTIVE_REVIEW_SAME_GENERATOR');
  if(receipt.reviewSha256!==fileHash(reviewFile)||receipt.reviewEvidenceSha256!==fileHash(pptx+'.review-evidence.json')) issues.push('EXECUTIVE_HOST_RECEIPT_STALE');
  const input=JSON.parse(fs.readFileSync(pptx+'.executive-review-input.json','utf8'));
  try {
    const host=hostReviewTranscript(receipt.transcriptFile,receipt.reviewerId,input.slides.map(s=>s.renderedImage),{prefixBytes:receipt.host?.prefixBytes});
    if(host.sessionMetaSha256!==receipt.host?.sessionMetaSha256) issues.push('EXECUTIVE_HOST_RECEIPT_INVALID');
    if(!receipt.host?.prefixBytes||digest(fs.readFileSync(receipt.transcriptFile).subarray(0,receipt.host.prefixBytes))!==receipt.host.prefixSha256) issues.push('EXECUTIVE_HOST_TRANSCRIPT_CHANGED');
  } catch(error) {issues.push(error.message);}
  return issues;
}
