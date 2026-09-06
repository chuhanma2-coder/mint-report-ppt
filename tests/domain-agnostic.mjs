import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';

// These are test sentinels, not a production vocabulary. Renaming tests supplement
// the scan: static scanning alone cannot prove arbitrary code domain independent.
const sentinels = /肯尼亚|科特迪瓦|传音|刘屹|骁鹏|\b(?:Kenya|Sinova|WeFi|MintFin|KCB|CBK|Sponsor\s*Bank|Equity\s*Bank)\b/i;
export function scanDomainSpecialCases(root) {
  const issues=[];
  const visit=dir=>{for(const entry of fs.readdirSync(dir,{withFileTypes:true})) {
    const file=path.join(dir,entry.name);
    if(entry.isDirectory()) visit(file);
    else if(/\.(mjs|js|json)$/.test(file)) fs.readFileSync(file,'utf8').split('\n').forEach((line,i)=>{
      if(sentinels.test(line) && !line.trim().startsWith('//')) issues.push(`${path.relative(root,file)}:${i+1}`);
    });
  }};
  visit(root);return issues;
}
assert.deepEqual(scanDomainSpecialCases(new URL('../scripts/lib',import.meta.url).pathname),[], 'NO_DOMAIN_SPECIAL_CASE');
console.log('NO_DOMAIN_SPECIAL_CASE: PASS (production sentinel scan; behavioral tests remain separate)');
