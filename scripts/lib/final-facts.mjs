import path from 'node:path';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { inspectPptxPackage } from './pptx-metadata.mjs';
import { auditVisibleFactContent } from './source-coverage.mjs';
import { imageReadabilityIssues } from './image-readability.mjs';
import { nativeChartCompatibilityIssue } from './chart-display-model.mjs';
const decode = v => String(v).replaceAll('&amp;','&').replaceAll('&lt;','<').replaceAll('&gt;','>').replaceAll('&quot;','"');
const resolvePart = (owner,target) => target.startsWith('/') ? target.slice(1) : path.posix.normalize(path.posix.join(path.posix.dirname(owner),target));
const inside = (xml,tag) => xml.match(new RegExp(`<c:${tag}(?:\\s[^>]*)?>([\\s\\S]*?)</c:${tag}>`))?.[1] || '';
const points = xml => [...xml.matchAll(/<c:pt\b[^>]*idx="(\d+)"[^>]*>[\s\S]*?<c:v>([\s\S]*?)<\/c:v>[\s\S]*?<\/c:pt>/g)].sort((a,b)=>+a[1]-+b[1]).map(m=>decode(m[2]));
export function auditFinalTable(data, table) {
  const headers = data.headers || data.columns || [], rows = data.rows || data.values || [];
  const expected = headers.length ? [headers, ...rows] : rows;
  const cells = table?.cells || [], normalize = value => String(value ?? '').replace(/\s+/g, '');
  if (cells.length !== expected.reduce((sum, row) => sum + row.length, 0)) return ['FINAL_TABLE_CELL_COUNT'];
  const issues = [];
  expected.forEach((row, i) => row.forEach((value, j) => {
    const actual = cells.find(cell => cell.row === i + 1 && cell.column === j + 1);
    if (!actual || normalize(actual.text) !== normalize(value)) issues.push(`FINAL_TABLE_BINDING_CHANGED: row ${i + 1} column ${j + 1}`);
  }));
  return issues;
}
export function auditNativeChart(xml, data, variant) {
  const issues=[], series=[...xml.matchAll(/<c:ser(?:\s[^>]*)?>([\s\S]*?)<\/c:ser>/g)].map(m=>m[1]);
  const scatter=variant==='scatter', expected=scatter?[data.series[1]]:data.series;
  const type=variant==='line'?'lineChart':variant==='doughnut'?'doughnutChart':scatter?'scatterChart':'barChart';
  if (!xml.includes(`<c:${type}`)) issues.push('CHART_TYPE_CHANGED');
  if (series.length!==expected.length) issues.push('CHART_SERIES_COUNT');
  for (const [i,s] of series.entries()) {
    if (!decode(inside(s,'tx')).includes(expected[i]?.name||'')) issues.push(`CHART_SERIES_NAME_CHANGED: series ${i}`);
    if (JSON.stringify(points(inside(s,scatter?'yVal':'val')).map(Number))!==JSON.stringify(expected[i]?.values.map(Number))) issues.push(`CHART_VALUES_CHANGED: series ${i}`);
    const cats=points(inside(s,scatter?'xVal':'cat'));
    if (JSON.stringify(scatter?cats.map(Number):cats)!==JSON.stringify(scatter?data.series[0].values.map(Number):data.categories.map(String))) issues.push(`CHART_CATEGORY_BINDING_CHANGED: series ${i}`);
  }
  if (!/<c:showVal\b[^>]*val="1"/.test(xml)) issues.push('CHART_EXACT_LABELS_HIDDEN');
  if (variant==='percent-stacked'&&!/<c:grouping\b[^>]*val="percentStacked"/.test(xml)) issues.push('CHART_STACKING_CHANGED');
  for (const unit of new Set(data.series.map(s=>s.displayUnit).filter(Boolean))) if (!decode(xml).includes(unit)) issues.push(`CHART_UNIT_MISSING: ${unit}`);
  return {passed:!issues.length,issues,seriesCount:series.length};
}

export function auditShapeChartLabels(model, elements, moduleIndex) {
  const normalize = value => String(value ?? '').replace(/\s+/g, '');
  return model.primitives.flatMap((primitive, index) => {
    if (primitive.kind !== 'text') return [];
    const prefix = `mint|chart-label|${moduleIndex}-${index}|`;
    const object = elements.find(element => element.name?.startsWith(prefix));
    return object && normalize(object.text) === normalize(primitive.text) ? [] : [`SHAPE_CHART_LABEL_BINDING_CHANGED: ${index}`];
  });
}

export async function auditFinalFacts({file,source,ir,layouts}) {
  const pkg=await inspectPptxPackage(file), renderedModules=[], issues=[], charts=[];
  if (layouts.length!==ir.slides.length || pkg.slides.length!==ir.slides.length) issues.push('FINAL_FACT_PAGE_COUNT');
  for (const [i,slide] of ir.slides.entries()) {
    const elements=layouts[i]?.elements||[], xml=pkg.slideXml[i]||'';
    const chartLinks=[...xml.matchAll(/<c:chart\b[^>]*r:id="([^"]+)"/g)].map(m=>m[1]);
    const slidePart=pkg.slides[i], relPart=slidePart&&path.posix.join(path.posix.dirname(slidePart),'_rels',path.posix.basename(slidePart)+'.rels');
    const rels=await pkg.zip.file(relPart||'')?.async('string')||'';
    let chartIndex=0;
    for (const [j,module] of slide.modules.entries()) {
      const measured=slide.domModules?.[j], frame=measured?.rect;
      const contains=e=>frame&&e.bbox&&e.bbox[0]>=frame.left-2&&e.bbox[1]>=frame.top-2&&e.bbox[0]+e.bbox[2]<=frame.left+frame.width+2&&e.bbox[1]+e.bbox[3]<=frame.top+frame.height+2;
      const owned=elements.filter(e=>e.name?.endsWith(`|module:${encodeURIComponent(module.id)}`)||contains(e));
      const text=owned.flatMap(e=>e.kind==='table'?(e.cells||[]).map(c=>c.text||''):e.text||[]);
      const variant=module.expression?.variant;
      if ((module.expression?.type||module.type)==='chart' && measured?.chart &&
          (nativeChartCompatibilityIssue(module.data,variant) || !['line','column','variance-bar','doughnut','percent-stacked','scatter'].includes(variant))) {
        issues.push(...auditShapeChartLabels(measured.chart.model, owned, j).map(x=>`${slide.id}/${module.id}: ${x}`));
      }
      if ((module.expression?.type||module.type)==='table') issues.push(...auditFinalTable(module.data, owned.find(e=>e.kind==='table')).map(x=>`${slide.id}/${module.id}: ${x}`));
      if (module.expression?.type==='chart'&&!nativeChartCompatibilityIssue(module.data,variant)&&['line','column','variance-bar','doughnut','percent-stacked','scatter'].includes(variant)) {
        const id=chartLinks[chartIndex++], rel=[...rels.matchAll(/<Relationship\b[^>]*>/g)].map(m=>m[0]).find(r=>r.includes(`Id="${id}"`));
        const target=rel?.match(/Target="([^"]+)"/)?.[1], part=target&&resolvePart(slidePart,target);
        const chartXml=part?await pkg.zip.file(part)?.async('string'):null;
        const result=chartXml?auditNativeChart(chartXml,module.data,variant):{passed:false,issues:['NATIVE_CHART_MISSING']};
        charts.push({slideId:slide.id,moduleId:module.id,...result}); issues.push(...result.issues.map(x=>`${slide.id}/${module.id}: ${x}`));
        // OOXML labels are configuration evidence, not screenshot/OCR proof.
        // Only expose caches after exact-label visibility and bindings pass.
        if (result.passed) {
          text.push(...[...chartXml.matchAll(/<a:t>([\s\S]*?)<\/a:t>/g)].map(m=>decode(m[1])));
          text.push(...module.data.categories,...module.data.series.flatMap(s=>[s.name,s.displayUnit,...s.values]));
        }
      }
      if ((module.expression?.type||module.type)==='image') {
        const image=owned.find(e=>e.kind==='image'), review=module.imageTextReview;
        const imageIssues=imageReadabilityIssues(review,image?{width:image.bbox[2],height:image.bbox[3]}:null, measured?.image?{width:measured.image.naturalWidth,height:measured.image.naturalHeight}:null);
        const picture=[...xml.matchAll(/<p:pic(?:\s[^>]*)?>([\s\S]*?)<\/p:pic>/g)].map(m=>m[1]).find(p=>p.match(/<p:cNvPr\b[^>]*id="(\d+)"/)?.[1]===String(image?.id));
        const sourcePath=module.imagePath||module.data?.imagePath;
        // SVG pictures carry a PNG fallback plus the original SVG relation.
        // Compare the source with its matching embedded representation.
        const svgId=picture?.match(/<(?:asvg:)?svgBlip\b[^>]*r:embed="([^"]+)"/)?.[1];
        const imageId=path.extname(sourcePath||'').toLowerCase()==='.svg' ? svgId : picture?.match(/r:embed="([^"]+)"/)?.[1], relation=[...rels.matchAll(/<Relationship\b[^>]*>/g)].map(m=>m[0]).find(r=>r.includes(`Id="${imageId}"`));
        const imageTarget=relation?.match(/Target="([^"]+)"/)?.[1], imagePart=imageTarget&&resolvePart(slidePart,imageTarget);
        const imageBytes=imagePart&&await pkg.zip.file(imagePart)?.async('nodebuffer');
        const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
        if (!imageBytes || !sourcePath || hash(imageBytes)!==hash(fs.readFileSync(sourcePath))) imageIssues.push('IMAGE_EMBEDDED_SOURCE_MISMATCH');
        issues.push(...imageIssues.map(x=>`${slide.id}/${module.id}: ${x}`));
        if (!imageIssues.length) text.push(...review.regions.map(r=>r.text||''));
      }
      renderedModules.push({slideId:slide.id,moduleId:module.id,text:text.join(' ')});
    }
  }
  const coverage=auditVisibleFactContent(source,ir,{renderedModules}); issues.push(...coverage.issues);
  return {passed:!issues.length,scope:'final-object-text-and-native-chart-bindings',visualReviewRequired:true,coverage,charts,renderedModules,issues};
}
