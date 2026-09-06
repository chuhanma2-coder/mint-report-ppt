#!/usr/bin/env node
import fs from 'node:fs';
import {verifyCanonicalLedger} from './lib/canonical-source-ledger.mjs';
import {validateExecutionBrief,preflightPreview,designBriefIssues,designBriefHash,preflightBriefHash} from './lib/execution-brief.mjs';
import {runtimeFingerprint} from './lib/runtime-fingerprint.mjs';
import {skillRoot} from './lib/config.mjs';
const [briefFile,ledgerFile]=process.argv.slice(2);
if(!briefFile||!ledgerFile) throw new Error('Usage: preflight.mjs execution-brief.json canonical-ledger.json (validated preview + checkpoint receipt; no PPT)');
const brief=JSON.parse(fs.readFileSync(briefFile,'utf8')),ledger=await verifyCanonicalLedger(JSON.parse(fs.readFileSync(ledgerFile,'utf8')));
const issues=[...validateExecutionBrief(brief,ledger),...designBriefIssues(brief,ledger)];
if(!issues.length) fs.writeFileSync(briefFile+'.preflight.json',JSON.stringify({passed:true,checkedAt:new Date().toISOString(),briefSha256:preflightBriefHash(brief),canonicalLedgerHash:ledger.sha256,runtime:runtimeFingerprint(skillRoot),generatorId:process.env.CODEX_THREAD_ID||null},null,2));
console.log(JSON.stringify({...(!issues.length?preflightPreview(brief):{generationAllowed:false}),designSha256:designBriefHash(brief),issues},null,2));
if(issues.length) process.exitCode=1;
