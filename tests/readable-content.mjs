import assert from 'node:assert/strict';
import { auditVisibleFactContent } from '../scripts/lib/source-coverage.mjs';
import { routeExpression } from '../scripts/lib/expression-router.mjs';

const check = (original, visible, extra = {}) => auditVisibleFactContent({ sourceUnits: [{ id: 's', text: original, visibility: 'required-visible', ...extra }] }, { slides: [{ id: 'p', role: 'content', modules: [{ id: 'm', type: 'text', text: visible, visibleFacts: [{ sourceUnitId: 's', text: visible }] }] }] });
for (const [original, visible] of [
  ['Sinova（Kenya）与Twende（Tanzania）', '银行'],
  ['预计全年约777万元', '777万元'],
  ['2027年计划投入WeFi正编4人年、外包4人年', '8人年（4+4）'],
  ['招待费40万元人民币降至30万元人民币', '招待费40→30万元'],
]) {
  assert.equal(check(original, visible).passed, false, original);
  assert.equal(check(original, original).passed, true, original);
}
const data = { headers: ['国家', '金额'], rows: [['A', 80], ['B', 55], ['C', 72]] };
assert.equal(routeExpression({ type: 'table', data, semanticIntent: 'ranking', managementQuestion: '哪些明细压降最多？' }).type, 'chart');
assert.equal(routeExpression({ type: 'table', data, semanticIntent: 'lookup' }).type, 'table');
console.log('readable-content: 10 assertions passed');
