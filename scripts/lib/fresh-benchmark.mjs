import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
export function createFreshWorkspace(inputs,{track='end-to-end',canonicalLedgerHash=null}={}) {
  if(!['end-to-end','planning-design'].includes(track)||!inputs.length) throw new Error('FRESH_INPUT_REQUIRED');
  if(track==='planning-design'&&!canonicalLedgerHash) throw new Error('FIXED_CANONICAL_LEDGER_REQUIRED');
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'mint-fresh-')),files=[];
  for(const [i,input] of inputs.entries()) {
    if(!['task-card','raw-source','user-supplied-file'].includes(input.role)) throw new Error('FRESH_INPUT_ROLE_INVALID');
    const original=fs.realpathSync(input.path),bytes=fs.readFileSync(original),file=path.join(dir,`${i+1}-${path.basename(original)}`);
    fs.writeFileSync(file,bytes,{flag:'wx'});files.push({path:file,original,sha256:sha(bytes),role:input.role});
  }
  const manifest={dir,track,canonicalLedgerHash,files,status:'AWAITING_OBSERVED_ACCESS_AUDIT'};
  fs.writeFileSync(path.join(dir,'fresh-inputs.json'),JSON.stringify(manifest,null,2));return manifest;
}
export function auditFreshRun(manifest,run) {
  const issues=[],allowed=new Map(manifest.files.map(f=>[f.path,f.sha256]));
  if(run.historyRead===true) issues.push('FRESH_HISTORY_READ');
  if(run.accessAudit?.status!=='observed-complete'||!run.accessAudit.evidenceFile) issues.push('FRESH_ACCESS_EVIDENCE_REQUIRED');
  if(!run.accessAudit?.reads?.length) issues.push('FRESH_READ_LOG_EMPTY');
  if(run.accessAudit?.evidenceFile && !fs.existsSync(run.accessAudit.evidenceFile)) issues.push('FRESH_ACCESS_EVIDENCE_MISSING');
  for(const read of run.accessAudit?.reads||[]) {
    if(read.purpose==='business-input' && (!allowed.has(read.path)||allowed.get(read.path)!==read.sha256)) issues.push(`FRESH_UNALLOWLISTED_READ: ${read.path}`);
    if(read.purpose==='historical-artifact') issues.push(`FRESH_HISTORY_READ: ${read.path}`);
    if(!['business-input','historical-artifact','pinned-runtime','current-run-output'].includes(read.purpose)) issues.push('FRESH_UNCLASSIFIED_READ');
  }
  if(manifest.track==='planning-design'&&run.canonicalLedgerHash!==manifest.canonicalLedgerHash) issues.push('FRESH_LEDGER_MISMATCH');
  for(const file of manifest.files) if(sha(fs.readFileSync(file.path))!==file.sha256) issues.push('FRESH_INPUT_MUTATED');
  return {status:issues.length?'INVALID':'PROVENANCE_RECORDED',issues,
    limitation:'An observed access audit must come from the execution environment. This helper does not sandbox an Agent or certify self-authored read declarations.'};
}
