import assert from 'node:assert/strict';
import {domainCases} from './fixtures/rc5-domain-cases.mjs';
import {classifySlideComposition} from '../scripts/lib/composition-classifier.mjs';
import {resolveSlideExpressions,expressionSuitability} from '../scripts/lib/expression-router.mjs';
import {allocateSlideEvidence} from '../scripts/lib/evidence-allocation.mjs';
const resolve=s=>allocateSlideEvidence(resolveSlideExpressions(classifySlideComposition(s)));
const signature=s=>({scene:s.scenePlan,composition:s.pageComposition,modules:s.modules.map(m=>({id:m.id,type:m.expression.type,variant:m.expression.variant,priority:m.visualPriority}))});
for(const slide of domainCases()) {
  const original=resolve(slide), renamed=resolve(JSON.parse(JSON.stringify(slide).replaceAll('对象甲','供应商丙').replaceAll('对象乙','部门丁')));
  assert.deepEqual(signature(original),signature(renamed),slide.id);
  assert.deepEqual(expressionSuitability(original),[],slide.id);
}
console.log('10 synthetic domains: entity rename preserves routing/composition/priority; not a fresh Planner or visual test');
