import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
export function runtimeFingerprint(root) {
  const files = [];
  function walk(directory) {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      const file = path.join(directory, entry.name);
      if (entry.isDirectory()) walk(file);
      else if (entry.isFile() && path.relative(root, file).split(path.sep).join('/') !== 'references/implementation-status.md') files.push(file);
    }
  }
  for (const directory of ['scripts', 'schemas', 'assets', 'references']) walk(path.join(root, directory));
  for (const file of ['SKILL.md', 'VERSION', 'package.json']) files.push(path.join(root, file));
  const hash = crypto.createHash('sha256');
  for (const file of files.sort()) hash.update(path.relative(root, file).split(path.sep).join('/')).update('\0').update(fs.readFileSync(file)).update('\0');
  const actual = hash.digest('hex'), expectedFile = path.join(root, 'RELEASE-FINGERPRINT');
  const expected = fs.existsSync(expectedFile) ? fs.readFileSync(expectedFile, 'utf8').trim() : null;
  return { sha256: actual, expected, status: expected === actual ? 'verified-release' : 'modified-or-unverified' };
}
