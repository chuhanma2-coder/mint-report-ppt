import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createRequire} from 'node:module';
import {theme} from '../scripts/lib/config.mjs';
import {writeDesignCanvas} from '../scripts/lib/design-canvas.mjs';
import {extractDesignLayout,applyDomLayout} from '../scripts/lib/dom-layout-extractor.mjs';
import {scenePlanIssues,measuredSceneIssues} from '../scripts/lib/scene-plan.mjs';
import {renderPresentation,exportPresentation} from '../scripts/lib/ppt-renderer.mjs';
import {artifactLayoutIssues} from '../scripts/lib/artifact-layout.mjs';
import {inspectPptxPackage} from '../scripts/lib/pptx-metadata.mjs';
const folder=fs.mkdtempSync(path.join(os.tmpdir(),'mint-rc5-topology-'));
const graph={id:'graph',type:'diagram',semanticRole:'primaryEvidence',expression:{type:'diagram',variant:'role-network'},data:{nodes:['入口','处理甲','处理乙','复核'].map((label,i)=>({id:'n'+i,label})),edges:[
  {id:'e1',from:'n0',to:'n1',label:'分配甲',relationship:'handoff'},
  {id:'e2',from:'n0',to:'n2',label:'分配乙',relationship:'handoff'},
  {id:'e3',from:'n1',to:'n3',label:'提交甲',relationship:'handoff'},
  {id:'e4',from:'n2',to:'n3',label:'提交乙',relationship:'handoff'},
  {id:'e5',from:'n3',to:'n0',label:'退回',condition:'仅异常事项',relationship:'handoff'}]}};
const scene=(relation,ids,extra={})=>({flow:'vertical',regions:[{id:'r',role:'primary',weight:'natural',relation,moduleIds:ids,relationshipRefs:['test-grounding'],...extra}],readingOrder:['r']});
const slides=[{id:'network',claim:'共享复核节点，异常返回入口',modules:[graph],scenePlan:scene('network',['graph'])}];
for(const relation of ['anchor','overlay']) for(const side of ['before','after','start','end']) slides.push({id:relation+'-'+side,claim:'说明与对应对象就近呈现',modules:[{id:'target',type:'text',semanticRole:'primaryEvidence',text:'对象完整业务信息。\n所有条件必须保留。'},{id:'note',type:'text',semanticRole:'boundary',text:'仅在满足条件后适用。'}],scenePlan:scene(relation,['target','note'],{targetId:'target',side})});
assert.ok(scenePlanIssues({...slides[1],scenePlan:scene('anchor',['target','note'])}).length);
slides.push({id:'self-return',claim:'校验未通过时重新处理',modules:[{id:'self',type:'diagram',expression:{type:'diagram',variant:'role-network'},data:{nodes:[{id:'a',label:'处理与校验'}],edges:[{id:'retry',from:'a',to:'a',label:'重新处理',condition:'仅校验未通过'}]}}],scenePlan:scene('network',['self'])});
const ir={slides},html=path.join(folder,'canvas.html');writeDesignCanvas(ir,theme,html);
const manifest=await extractDesignLayout({htmlFile:html,outputDir:path.join(folder,'canvas')});
fs.writeFileSync(path.join(folder,'manifest.json'),JSON.stringify(manifest,null,2));
assert.deepEqual(manifest.issues,[],folder);
for(const [i,s] of slides.entries()) assert.deepEqual(measuredSceneIssues(s,manifest.slides[i]),[],s.id);
const network=manifest.slides[0].modules[0].network;
assert.equal(network.nodes.length,4);assert.equal(network.edges.length,5);
assert.deepEqual(network.edges.map(e=>[e.id,e.from,e.to]),graph.data.edges.map(e=>[e.id,e.from,e.to]));
assert.match(network.edges.at(-1).label.text,/仅异常事项/);
for(const [i,s] of slides.entries()) if(i&&s.id!=='self-return') {
  const a=manifest.slides[i].attachments[0],m=manifest.slides[i].modules.find(m=>m.id==='target');
  if(a.relation==='overlay') assert.ok(a.annotation.top>=a.rect.top&&a.annotation.top+a.annotation.height<=a.rect.top+a.rect.height+1,'overlay stays on measured shared surface');
  assert.ok(m.text.includes('所有条件必须保留'));
}
const {presentation}=await renderPresentation(applyDomLayout(ir,manifest),theme),pptx=path.join(folder,'topology.pptx');await exportPresentation(presentation,pptx);
const pkg=await inspectPptxPackage(pptx),xml=await pkg.zip.file(pkg.slides[0]).async('string');
for(const e of graph.data.edges) assert.ok(xml.includes(`binding:${e.id}|from:${e.from}|to:${e.to}`));
const require=createRequire(path.join(process.env.RUNTIME_NODE_MODULES,'package.json'));
const {FileBlob,PresentationFile}=await import(require.resolve('@oai/artifact-tool'));
const imported=await PresentationFile.importPptx(await FileBlob.load(pptx)),issues=[];
for(const [i,slide] of imported.slides.items.entries()) {
  const layout=JSON.parse(await (await slide.export({format:'layout'})).text());
  issues.push(...artifactLayoutIssues(layout).map(x=>`${i+1}: ${x}`));
  fs.writeFileSync(path.join(folder,`native-${i+1}.png`),new Uint8Array(await (await imported.export({slide,format:'png',scale:1})).arrayBuffer()));
}
fs.writeFileSync(path.join(folder,'native-audit.json'),JSON.stringify({issues},null,2));
assert.deepEqual(issues,[],folder);
console.log(JSON.stringify({folder,status:'technical-pass',scope:'topology regression, not fresh Planner or visual acceptance'}));
