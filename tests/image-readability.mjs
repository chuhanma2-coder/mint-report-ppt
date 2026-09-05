import assert from 'node:assert/strict';
import { imageReadabilityIssues } from '../scripts/lib/image-readability.mjs';
const review = { regions: [{ id: 'staffing-cells', text: '开发 0.50', minimumGlyphHeightPx: 18 }] };
assert.match(imageReadabilityIssues(review, {width: 800, height: 400}, {width: 2000, height: 1000})[0], /IMAGE_FINE_TEXT/);
assert.deepEqual(imageReadabilityIssues(review, {width: 1800, height: 900}, {width: 2000, height: 1000}), []);
assert.match(imageReadabilityIssues({regions:[{id:'hash-only'}]}, {width:1800,height:900}, {width:2000,height:1000})[0], /UNREVIEWED/);
console.log('image readability regression passed');
