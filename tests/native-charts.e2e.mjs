import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { planAndMeasureOutline, applyDomLayout } from '../scripts/lib/dom-layout-extractor.mjs';
import { renderPresentation, exportPresentation } from '../scripts/lib/ppt-renderer.mjs';
import { theme } from '../scripts/lib/config.mjs';
import { inspectPptxPackage } from '../scripts/lib/pptx-metadata.mjs';
import { auditNativeChart, auditFinalFacts, auditShapeChartLabels } from '../scripts/lib/final-facts.mjs';
const variants = ['line', 'column', 'variance-bar', 'doughnut', 'percent-stacked', 'scatter'];
const slides = variants.map((variant,i) => ({ id:variant, role:'content', outlineItem:String(i), claim:`原生图表专项：${variant}`, modules:[{id:variant, type:'chart', title:'分类、单位与精确值必须可见', expression:{type:'chart',variant}, data: variant === 'scatter'
  ? {categories:['A','B','C','D','E','F','G','H'], series:[{name:'规模',displayUnit:'万人',values:[2,4,6,8,10,12,14,16]},{name:'质量',displayUnit:'%',values:[30,65,15,80,40,95,55,10]}]}
  : {categories:['一月','二月','三月'],partToWhole:true,series: variant === 'doughnut' ? [{name:'构成',displayUnit:'万元',values:[20,30,50]}] : [{name:'实际',displayUnit:'万元',values:variant === 'percent-stacked'?[30,40,50]:variant === 'line'?[-20,10,5]:variant === 'variance-bar'?[20,40,65]:[-20,40,65]},{name:'预算',displayUnit:'万元',values:[50,60,70]}]} }] }));
for (const [variant, label] of [['line','close-line'],['variance-bar','negative-bar']]) {
  const slide = structuredClone(slides[variants.indexOf(variant)]);
  slide.id = label; slide.outlineItem = label; slide.claim = `兼容布局专项：${label}`;
  slide.modules[0].data.series[0].values = [-20,40,65];
  slides.push(slide); variants.push(label);
}
const folder = fs.mkdtempSync(path.join(os.tmpdir(),'mint-native-charts-'));
const measured = await planAndMeasureOutline({slides},theme,path.join(folder,'design.html'),path.join(folder,'design'));
assert.equal(measured.manifest.passed,true, measured.manifest.issues.join(';'));
const scatterModel = measured.manifest.slides[5].modules[0].chart.model;
const coordinateLabels = scatterModel.primitives.filter(p=>p.kind==='text' && /^[A-H] \(/.test(p.text));
assert.equal(coordinateLabels.length,8);
assert.ok(coordinateLabels.every(p=>p.y+p.height <= 300),'coordinate labels must stay above axis captions without shrinking');
const ir = applyDomLayout(measured.ir,measured.manifest);
const {presentation,diagnostics} = await renderPresentation(ir,theme);
assert.equal(diagnostics.filter(d=>d.implementation==='editable-shapes').length,2,'known native-label failures must use measured editable geometry');
const output = path.join(folder,'native-charts.pptx'); await exportPresentation(presentation,output);
const pkg = await inspectPptxPackage(output);
assert.equal(pkg.charts.length,6);
const require = createRequire(path.join(process.env.RUNTIME_NODE_MODULES,'package.json'));
const {PresentationFile,FileBlob} = await import(require.resolve('@oai/artifact-tool'));
const reopened = await PresentationFile.importPptx(await FileBlob.load(output));
const layouts=[];
for (const [i,slide] of reopened.slides.items.entries()) {
  fs.writeFileSync(path.join(folder,`${variants[i]}.png`),new Uint8Array(await (await reopened.export({slide,format:'png',scale:1})).arrayBuffer()));
  const layout=JSON.parse(await (await slide.export({format:'layout'})).text());layouts.push(layout);
  fs.writeFileSync(path.join(folder,`${variants[i]}.layout.json`),JSON.stringify(layout));
}
for (const [i,file] of pkg.charts.entries()) {
  const xml=await pkg.zip.file(file).async('string'), module=ir.slides[i].modules[0];
  fs.writeFileSync(path.join(folder,`chart-${i+1}.xml`),xml);
  assert.deepEqual(auditNativeChart(xml,module.data,module.expression.variant).issues,[]);
  if (module.expression.variant === 'percent-stacked') assert.match(xml, /<c:valAx>[\s\S]*?<c:numFmt formatCode="0%"/);
  if (module.expression.variant === 'line') {
    assert.match(xml, /<c:dLblPos val="b"/);
    assert.match(xml, /<c:dLblPos val="t"/);
  }
  const changed=structuredClone(module.data); changed.series[0].values[0]+=1;
  assert.equal(auditNativeChart(xml,changed,module.expression.variant).passed,false);
  assert.equal(auditNativeChart(xml.replaceAll('showVal val="1"','showVal val="0"'),module.data,module.expression.variant).passed,false);
}
fs.writeFileSync(path.join(folder,'resolved.json'),JSON.stringify(ir,null,2));
const source={sourceUnits:ir.slides.map(s=>{
 const m=s.modules[0],parts=[...m.data.categories,...m.data.series.flatMap(v=>[v.name,v.displayUnit,...v.values.map(String)])],text=parts.join(' ');
 m.visibleFacts=[{sourceUnitId:s.id,text:m.data.categories[0]}];
 return {id:s.id,visibility:'required-visible',text,requiredComponents:parts,componentReview:{status:'reviewed',sourceText:text}};
})};
const finalFacts=await auditFinalFacts({file:output,source,ir,layouts});
fs.writeFileSync(path.join(folder,'final-facts.json'),JSON.stringify(finalFacts,null,2));
assert.deepEqual(finalFacts.issues,[]);
const changedShape = structuredClone(layouts[6].elements);
const valueLabels = changedShape.filter(e=>e.name?.startsWith('mint|chart-label|') && /65|70/.test(e.text));
assert.ok(valueLabels.length >= 2);
[valueLabels[0].text,valueLabels[1].text] = [valueLabels[1].text,valueLabels[0].text];
assert.ok(auditShapeChartLabels(ir.slides[6].domModules[0].chart.model,changedShape,0).length >= 2,'swapping labels must fail even though all numbers still exist');
console.log(JSON.stringify({folder,charts:pkg.charts.length,status:'rendered-awaiting-semantic-and-visual-check'}));
