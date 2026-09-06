#!/usr/bin/env node
import fs from 'node:fs';
import crypto from 'node:crypto';
import {executiveReviewIssues} from './lib/design-intent.mjs';
import {copyTextIssues} from './lib/presentation-copy.mjs';
import {inspectPptxPackage} from './lib/pptx-metadata.mjs';
import {designAcceptanceIssues} from './lib/execution-brief.mjs';
import {skillRoot} from './lib/config.mjs';
import {reviewReceiptIssues} from './lib/review-evidence.mjs';
const [pptx,reviewFile]=process.argv.slice(2);
if(!pptx||!reviewFile) throw new Error('Usage: audit-design-delivery.mjs candidate.pptx executive-review.json');
const read=suffix=>JSON.parse(fs.readFileSync(pptx+suffix,'utf8'));
const ir=read('.resolved-ir.json'),review=JSON.parse(fs.readFileSync(reviewFile,'utf8'));
const hash=crypto.createHash('sha256').update(fs.readFileSync(pptx)).digest('hex');
const reviewIssues=[...reviewReceiptIssues({pptx,reviewFile,receiptFile:reviewFile+'.host-receipt.json',root:skillRoot}),...executiveReviewIssues(review,ir.slides.map(s=>s.id),ir.executionBrief?.decisionSystems),...designAcceptanceIssues(review,ir,read('.outline-measurements.json'))],issues=[...reviewIssues];
const execution=read('.design-execution.json');
if(!execution.passed||execution.pptxSha256!==hash) {issues.push('DESIGN_EXECUTION_NOT_VERIFIED');reviewIssues.push('DESIGN_EXECUTION_NOT_VERIFIED');}
const copyIssues=copyTextIssues((await inspectPptxPackage(pptx)).visibleText,ir.executionBrief?.presentationCopyPolicy);
reviewIssues.push(...copyIssues);issues.push(...copyIssues);
if(review.pptxSha256!==hash) issues.push('EXECUTIVE_REVIEW_STALE: hash must match the actual reviewed PPT');
const results={};
for(const suffix of ['.build.json','.source-inventory.json','.source-coverage.json','.canonical-coverage.json','.understanding.json','.final-facts.json','.audit.json','.visual-parity.json','.native-design-requirements.json']) {
  const result=read(suffix);if(!result.passed) issues.push(`TECHNICAL_GATE_FAILED: ${suffix}`);
  results[suffix]=result.passed===true;
  if(suffix==='.build.json'&&result.pptxSha256!==hash) issues.push('TECHNICAL_GATE_STALE: rerun audits after editing');
}
const report={passed:issues.length===0,issues,pptxSha256:hash,reviewFile,receiptFile:reviewFile+'.host-receipt.json',
  acceptance:{technical:results['.audit.json']&&results['.visual-parity.json']?'PASS':'FAIL',content:results['.canonical-coverage.json']&&results['.final-facts.json']?'PASS':'FAIL',understanding:results['.understanding.json']?'PASS':'FAIL',design:reviewIssues.length||review.pptxSha256!==hash||!results['.native-design-requirements.json']?'NOT_ACCEPTED':'PASS',targetPlatform:'NOT_VERIFIED'},
  windowsPowerPoint:'separate-target-platform-evidence-required'};
fs.writeFileSync(pptx+'.delivery-audit.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));if(!report.passed) process.exit(1);
