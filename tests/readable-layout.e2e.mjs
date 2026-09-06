import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { planAndMeasureOutline, applyDomLayout } from '../scripts/lib/dom-layout-extractor.mjs';
import { renderPresentation, exportPresentation } from '../scripts/lib/ppt-renderer.mjs';
import { theme } from '../scripts/lib/config.mjs';
import { createRequire } from 'node:module';
import { artifactLayoutIssues } from '../scripts/lib/artifact-layout.mjs';
const folder = fs.mkdtempSync(path.join(os.tmpdir(), 'mint-readable-'));
const slides = [1, 2, 3].map(i => ({ id: `p${i}`, role: 'content', outlineItem: String(i), claim: `第${i}点完整说明`, modules: [{ id: `m${i}`, type: 'table', data: { headers: ['对象', '金额'], rows: [['甲', 80], ['乙', 72]] } }] }));
slides[0].modules.push({id:'all-metrics',type:'metric',semanticRole:'progress',data:{categories:['南区','北区'],series:[{name:'实际',displayUnit:'万元',values:[101,202]},{name:'目标',displayUnit:'万元',values:[303,404]}]}});
slides[1].modules = [{ id: 'relations', type: 'diagram', expression: { type: 'diagram', variant: 'role-network' }, data: { nodes: [{ id: 'mint', label: 'MintFin' }, { id: 'wefi', label: 'WeFi' }, { id: 'bank', label: '银行项目' }], edges: [{ from: 'mint', to: 'wefi', label: '预计全年约777万元技术服务费' }, { from: 'wefi', to: 'bank', label: '系统技术服务', condition: '约定项目范围内' }] } }];
slides[2].modules = [{ id: 'changes', type: 'chart', expression: { type: 'chart', variant: 'sorted-bar' }, data: { categories: ['人力', 'IT', '职场'], series: [{ name: '预算', displayUnit: '万美元', values: [120, 90, -20] }, { name: '实际', displayUnit: '万美元', values: [80, 65, -10] }] } }];
const result = await planAndMeasureOutline({ slides }, theme, path.join(folder, 'design.html'), path.join(folder, 'render'));
assert.equal(result.manifest.passed, true, result.manifest.issues.join('; '));
assert.equal(result.ir.slides.length, 3);
assert.ok(result.manifest.slides[0].modules.find(m=>m.id==='m1').rect.height < 220,'measure the short table by identity, not a layout-dependent DOM index');
const { presentation } = await renderPresentation(applyDomLayout(result.ir, result.manifest), theme);
await exportPresentation(presentation, path.join(folder, 'candidate.pptx'));
const require = createRequire(path.join(process.env.RUNTIME_NODE_MODULES, 'package.json'));
const { FileBlob, PresentationFile } = await import(require.resolve('@oai/artifact-tool'));
const reopened = await PresentationFile.importPptx(await FileBlob.load(path.join(folder, 'candidate.pptx')));
for (const [index, slide] of reopened.slides.items.entries()) {
  const layout = JSON.parse(await (await slide.export({ format: 'layout' })).text());
  assert.deepEqual(artifactLayoutIssues(layout), []);
  if (index === 0) {
    const metricText=layout.elements.filter(e=>e.name?.endsWith('module:all-metrics')).map(e=>e.text || '').join(' ');
    for (const value of ['南区','北区','实际','目标','101','202','303','404','万元']) assert.ok(metricText.includes(value),`metric output lost ${value}`);
  }
  const png = await reopened.export({ slide, format: 'png', scale: 1 });
  fs.writeFileSync(path.join(folder, `ppt-${index + 1}.png`), new Uint8Array(await png.arrayBuffer()));
}
console.log(JSON.stringify({ passed: true, folder, heights: result.manifest.slides.map(slide => slide.modules[0].rect.height) }));
