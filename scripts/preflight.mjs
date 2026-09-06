#!/usr/bin/env node
import fs from 'node:fs';
import {verifyCanonicalLedger} from './lib/canonical-source-ledger.mjs';
import {validateExecutionBrief,preflightPreview,designBriefIssues,designBriefHash} from './lib/execution-brief.mjs';
const [briefFile,ledgerFile]=process.argv.slice(2);
if(!briefFile||!ledgerFile) throw new Error('Usage: preflight.mjs execution-brief.json canonical-ledger.json (read-only preview; no PPT)');
const brief=JSON.parse(fs.readFileSync(briefFile,'utf8')),ledger=await verifyCanonicalLedger(JSON.parse(fs.readFileSync(ledgerFile,'utf8')));
const issues=[...validateExecutionBrief(brief,ledger),...designBriefIssues(brief,ledger)];
console.log(JSON.stringify({...(!issues.length?preflightPreview(brief):{generationAllowed:false}),designSha256:designBriefHash(brief),issues},null,2));
if(issues.length) process.exitCode=1;
