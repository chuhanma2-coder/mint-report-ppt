import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {theme} from '../scripts/lib/config.mjs';
import {writeDesignCanvas} from '../scripts/lib/design-canvas.mjs';
import {extractDesignLayout} from '../scripts/lib/dom-layout-extractor.mjs';
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'mint-primitive-repair-'));
const data={nodes:[{id:'a',label:'准备'},{id:'b',label:'对完整业务资料进行复核后才可正式批准',condition:'只有全部必要材料齐备后才进入下一环节'},{id:'c',label:'完成'}],edges:[{id:'ab',from:'a',to:'b',label:'材料齐备后',relationship:'dependency'},{id:'bc',from:'b',to:'c',label:'复核通过',relationship:'dependency'}]};
const base={id:'normal',claim:'复核完成后交付',modules:[{id:'path',type:'diagram',expression:{type:'diagram',variant:'time-window-dependency'},data}],scenePlan:{flow:'vertical',regions:[{id:'r',role:'primary',weight:'natural',relation:'stack',moduleIds:['path']}],readingOrder:['r']}};
const ir={slides:[base,{...structuredClone(base),id:'repaired',measuredSceneVariant:'content-first'}]};
const html=path.join(dir,'canvas.html');writeDesignCanvas(ir,theme,html);
const manifest=await extractDesignLayout({htmlFile:html,outputDir:path.join(dir,'render')});
assert.deepEqual(manifest.issues,[]);
const operation=manifest.slides[1].repairOperations.find(o=>o.step==='object-internals');
assert.ok(operation.widths.length===5);
assert.ok(operation.afterHeight<=operation.beforeHeight);
assert.ok(new Set(operation.widths.filter((_,i)=>i%2===0)).size>1,'wrapping bottleneck receives non-equal node widths');
for(const page of manifest.slides) {
  const text=page.modules[0].text;
  for(const value of ['准备','对完整业务资料进行复核后才可正式批准','只有全部必要材料齐备后才进入下一环节','完成','材料齐备后','复核通过']) assert.ok(text.replace(/\s/g,'').includes(value));
}
console.log(JSON.stringify({dir,operation,scope:'measured primitive internals; not Fresh Planner evidence'}));
