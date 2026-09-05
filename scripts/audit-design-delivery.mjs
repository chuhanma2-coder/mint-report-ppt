#!/usr/bin/env node
import fs from 'node:fs';
import crypto from 'node:crypto';
import {executiveReviewIssues} from './lib/design-intent.mjs';
const [pptx,reviewFile]=process.argv.slice(2);
if(!pptx||!reviewFile) throw new Error('Usage: audit-design-delivery.mjs candidate.pptx executive-review.json');
const read=suffix=>JSON.parse(fs.readFileSync(pptx+suffix,'utf8'));
const ir=read('.resolved-ir.json'),review=JSON.parse(fs.readFileSync(reviewFile,'utf8'));
const hash=crypto.createHash('sha256').update(fs.readFileSync(pptx)).digest('hex');
const issues=executiveReviewIssues(review,ir.slides.map(s=>s.id));
if(review.pptxSha256!==hash) issues.push('EXECUTIVE_REVIEW_STALE: hash must match the actual reviewed PPT');
for(const suffix of ['.build.json','.source-inventory.json','.source-coverage.json','.final-facts.json','.audit.json','.visual-parity.json','.native-design-requirements.json']) {
  const result=read(suffix);if(!result.passed) issues.push(`TECHNICAL_GATE_FAILED: ${suffix}`);
  if(suffix==='.build.json'&&result.pptxSha256!==hash) issues.push('TECHNICAL_GATE_STALE: rerun audits after editing');
}
const report={passed:issues.length===0,issues,pptxSha256:hash,windowsPowerPoint:'separate-target-platform-evidence-required'};
fs.writeFileSync(pptx+'.delivery-audit.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));if(!report.passed) process.exit(1);
