import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {runtimeReferences,runtimeFingerprint} from './lib/runtime-fingerprint.mjs';

// Explicit runtime-only package; never overwrite a user's installation or a test run.
export function packageSkill(source,destination) {
  if(fs.existsSync(destination)) throw new Error('PACKAGE_DESTINATION_EXISTS');
  const expected=runtimeFingerprint(source);
  fs.mkdirSync(destination,{recursive:true});
  for(const entry of ['SKILL.md','VERSION','package.json','RELEASE-FINGERPRINT','scripts','schemas','assets','agents']) fs.cpSync(path.join(source,entry),path.join(destination,entry),{recursive:true});
  fs.mkdirSync(path.join(destination,'references'));
  for(const reference of runtimeReferences) fs.copyFileSync(path.join(source,'references',reference),path.join(destination,'references',reference));
  const actual=runtimeFingerprint(destination);
  if(actual.sha256!==expected.sha256) throw new Error('PACKAGE_FINGERPRINT_MISMATCH');
  return {destination,...actual};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  if(!process.argv[2]) throw new Error('Usage: node scripts/package-skill.mjs NEW_DIRECTORY');
  console.log(JSON.stringify(packageSkill(path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),path.resolve(process.argv[2])),null,2));
}
