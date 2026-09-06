#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { auditPpt } from "./lib/audit.mjs";
import {reviewReceiptIssues} from './lib/review-evidence.mjs';
import {skillRoot} from './lib/config.mjs';

const file = path.resolve(process.argv[2] || ""), task = path.resolve(process.argv[3] || ""), outputArg = process.argv.find(item => item.startsWith("--output="));
if (!file || !task || !fs.existsSync(file) || !fs.existsSync(task)) { console.error("Usage: audit-final-ppt.mjs complete.pptx task-card.json [--output=audit.json]"); process.exit(2); }
try {
  const report = await auditPpt({ file, taskFile: task, mode: "final", output: outputArg ? path.resolve(outputArg.slice(9)) : null });
  const buildFile=file+'.build.json';
  const humanEdited=process.argv.includes('--human-edited-final');
  if((report.metadata.MintReviewRequired==='true'||fs.existsSync(buildFile))&&!humanEdited) {
    const deliveryFile=file+'.delivery-audit.json',hash=crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
    if(!fs.existsSync(deliveryFile)) {report.passed=false;report.issues.push('EXECUTIVE_REVIEW_REQUIRED: generated candidates require audit-design-delivery before final audit');}
    else {const delivery=JSON.parse(fs.readFileSync(deliveryFile,'utf8'));if(!delivery.passed||delivery.pptxSha256!==hash){report.passed=false;report.issues.push('DESIGN_DELIVERY_NOT_ACCEPTED_OR_STALE');}
      else {const issues=reviewReceiptIssues({pptx:file,reviewFile:delivery.reviewFile,receiptFile:delivery.receiptFile,root:skillRoot});report.issues.push(...issues);report.passed&&=!issues.length;}}
  }
  if(humanEdited) report.authorityHandoff='User explicitly supplied the human-edited final PPT; no historical IR is used to restore or rewrite it. Technical checks are not design acceptance.';
  console.log(JSON.stringify(report, null, 2)); if (!report.passed) process.exit(1);
}
catch (error) { console.error(JSON.stringify({ passed: false, error: error.message }, null, 2)); process.exit(1); }
