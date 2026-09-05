import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createRequire} from 'node:module';
import {spawnSync} from 'node:child_process';
import {inspectPptxPackage} from '../scripts/lib/pptx-metadata.mjs';
const require=createRequire(path.join(process.env.RUNTIME_NODE_MODULES,'package.json'));
const {Presentation,PresentationFile}=await import(require.resolve('@oai/artifact-tool'));
const sharp=(await import(require.resolve('sharp'))).default;
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'mint-publish-authority-')),file=path.join(dir,'final.pptx');
const deck=Presentation.create({slideSize:{width:1920,height:1080}});
for(const color of ['#FF0000','#00FF00','#0000FF','#FFFF00'])deck.slides.add().background.fill=color;
await(await PresentationFile.exportPptx(deck)).save(file);
const pkg=await inspectPptxPackage(file),xml=await pkg.zip.file('ppt/presentation.xml').async('string');
const ids=[...xml.matchAll(/<p:sldId\b[^>]*\/>/g)].map(m=>m[0]);assert.equal(ids.length,4);
// Simulate page insertion, deletion and reordering in the actual authority file.
pkg.zip.file('ppt/presentation.xml',xml.replace(/<p:sldIdLst>[\s\S]*?<\/p:sldIdLst>/,`<p:sldIdLst>${ids[2]}${ids[0]}${ids[3]}</p:sldIdLst>`));
fs.writeFileSync(file,await pkg.zip.generateAsync({type:'nodebuffer'}));
fs.writeFileSync(file+'.resolved-ir.json',JSON.stringify({slides:[{id:'old-deleted-page'}]}));
const output=path.join(dir,'final.html'),run=spawnSync(process.execPath,['scripts/publish-report-html.mjs',file,output],{encoding:'utf8',maxBuffer:5_000_000});
assert.equal(run.status,0,run.stderr+run.stdout);
const html=fs.readFileSync(output,'utf8'),frames=[...html.matchAll(/src="data:image\/png;base64,([^"]+)"/g)];assert.equal(frames.length,3);
for(const [i,rgb] of [[0,[0,0,255]],[1,[255,0,0]],[2,[255,255,0]]]) {
  const {data}=await sharp(Buffer.from(frames[i][1],'base64')).removeAlpha().raw().toBuffer({resolveWithObject:true});assert.deepEqual([...data.subarray(0,3)],rgb);
}
console.log(JSON.stringify({passed:true,dir,scope:'actual PPT package order after simulated user edits; bundled renderer, not Windows PowerPoint'}));
