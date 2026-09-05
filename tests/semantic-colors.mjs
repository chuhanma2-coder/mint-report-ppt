import assert from 'node:assert/strict';
import { theme } from '../scripts/lib/config.mjs';
const luminance = hex => hex.replace('#','').match(/../g).map(v=>parseInt(v,16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4).reduce((s,v,i)=>s+v*[.2126,.7152,.0722][i],0);
for (const color of Object.values(theme.semanticColors.roleAccents)) for (const background of [theme.palette.page,theme.palette.paper]) {
  const a=luminance(color),b=luminance(background);
  assert.ok((Math.max(a,b)+.05)/(Math.min(a,b)+.05)>=4.5, `${color} must remain readable on ${background}`);
}
assert.ok(new Set(Object.values(theme.semanticColors.roleAccents)).size>=4);
assert.notEqual(theme.semanticColors.roleAccents.action,theme.semanticColors.roleAccents.risk);
assert.notEqual(theme.semanticColors.roleAccents.primaryEvidence,theme.semanticColors.roleAccents.decision);
console.log('semantic palette: role differentiation and text contrast passed');
