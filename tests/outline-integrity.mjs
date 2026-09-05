import assert from 'node:assert/strict';
import { outlineIntegrityIssues } from '../scripts/lib/outline-integrity.mjs';
const a = { id: 'a', role: 'content', outlineItem: '1', outlinePart: 1 };
assert.match(outlineIntegrityIssues([a]).join(' '), /OUTLINE_MEASUREMENT_REQUIRED/);
const b = { ...a, capacityProof: { measured: true, fullOutlineFits: true } };
assert.deepEqual(outlineIntegrityIssues([b]), []);
assert.match(outlineIntegrityIssues([b, { ...b, id: 'b', outlinePart: 2 }]).join(' '), /OUTLINE_FRAGMENTATION/);
console.log('outline-integrity: 3 assertions passed');
