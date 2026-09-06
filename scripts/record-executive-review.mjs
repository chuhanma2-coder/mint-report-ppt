#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import {skillRoot} from './lib/config.mjs';
import {digest,hostReviewTranscript,reviewEvidenceIssues} from './lib/review-evidence.mjs';
const [pptx,reviewFile,transcriptFile]=process.argv.slice(2);
if(!pptx||!reviewFile||!transcriptFile) throw new Error('Usage: record-executive-review.mjs candidate.pptx review.json <reviewer host session JSONL>');
const reviewerId=process.env.CODEX_THREAD_ID;
const manifest=JSON.parse(fs.readFileSync(pptx+'.review-evidence.json','utf8'));
if(!reviewerId||!manifest.generatorId||reviewerId===manifest.generatorId) throw new Error('EXECUTIVE_REVIEW_SAME_GENERATOR');
const review=JSON.parse(fs.readFileSync(reviewFile,'utf8')),issues=reviewEvidenceIssues(pptx,skillRoot,review);
if(issues.length) throw new Error(issues.join('; '));
const input=JSON.parse(fs.readFileSync(pptx+'.executive-review-input.json','utf8'));
const host=hostReviewTranscript(transcriptFile,reviewerId,input.slides.map(s=>s.renderedImage));
const receipt={reviewerId,host,transcriptFile:path.resolve(transcriptFile),reviewSha256:digest(fs.readFileSync(reviewFile)),reviewEvidenceSha256:digest(fs.readFileSync(pptx+'.review-evidence.json')),recordedAt:new Date().toISOString(),assurance:'host-recorded independent context and observed image calls; not cryptographic attestation'};
fs.writeFileSync(reviewFile+'.host-receipt.json',JSON.stringify(receipt,null,2));
console.log(JSON.stringify(receipt,null,2));
