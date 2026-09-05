import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";
import { createDesignCanvas, writeDesignCanvas } from "./design-canvas.mjs";
import { planOutlinePages } from "./outline-planner.mjs";
import { imageReadabilityIssues } from './image-readability.mjs';
import { browserExecutable } from './browser-executable.mjs';
import { auditDesignRequirements } from './design-intent.mjs';

function playwrightModule() {
  if (!process.env.RUNTIME_NODE_MODULES) throw new Error("RUNTIME_NODE_MODULES is required; load workspace dependencies first");
  const require = createRequire(path.join(process.env.RUNTIME_NODE_MODULES, "package.json"));
  return import(pathToFileURL(require.resolve("playwright")).href);
}

function unionArea(rects) {
  const xs = [...new Set(rects.flatMap(rect => [rect.left, rect.left + rect.width]))].sort((a, b) => a - b);
  let area = 0;
  for (let i = 0; i < xs.length - 1; i++) {
    const left = xs[i], right = xs[i + 1];
    if (right <= left) continue;
    const intervals = rects.filter(rect => rect.left < right && rect.left + rect.width > left).map(rect => [rect.top, rect.top + rect.height]).sort((a, b) => a[0] - b[0]);
    let covered = 0, start = null, end = null;
    for (const [a, b] of intervals) {
      if (start == null) [start, end] = [a, b];
      else if (a <= end) end = Math.max(end, b);
      else { covered += end - start; [start, end] = [a, b]; }
    }
    if (start != null) covered += end - start;
    area += (right - left) * covered;
  }
  return area;
}

export async function extractDesignLayout({ htmlFile, outputDir, expectedSlides = null, existingPage = null, htmlMarkup = null, capture = true }) {
  const imported = await playwrightModule(), chromium = imported.chromium || imported.default?.chromium;
  if (!chromium) throw new Error("Playwright Chromium API is unavailable");
  const executablePath = browserExecutable({bundled:chromium.executablePath()});
  const browser = existingPage ? null : await chromium.launch({ headless: true, executablePath });
  try {
    const page = existingPage || await browser.newPage({ viewport: { width: 1968, height: 1128 }, deviceScaleFactor: 1 });
    if (htmlMarkup) await page.setContent(htmlMarkup, { waitUntil: "load" });
    else await page.goto(pathToFileURL(path.resolve(htmlFile)).href, { waitUntil: "load" });
    await page.evaluate(async () => { await document.fonts.ready; await Promise.all([...document.images].map(image => image.complete ? Promise.resolve() : image.decode().catch(() => {}))); });
    await page.waitForFunction(() => document.documentElement.dataset.renderReady === "true", null, { timeout: 15000 });
    const renderError = await page.evaluate(() => document.documentElement.dataset.renderError);
    if (renderError) return { passed: false, issues: [renderError], slides: [] };
    // Browser and PowerPoint differ at CJK/Latin wrap boundaries. Reserve one
    // line for prose in the measured flow, not just in the exported
    // textbox; following modules and page-capacity decisions see it too.
    await page.evaluate(() => {
      for (const element of document.querySelectorAll('.module-copy')) {
        const lineHeight = parseFloat(getComputedStyle(element).lineHeight);
        const height = element.getBoundingClientRect().height;
        // A browser single-line paragraph can wrap to two lines in PowerPoint too.
        element.style.minHeight = `${height + lineHeight}px`;
      }
    });
    const slides = await page.locator(".mint-ppt-slide").evaluateAll(nodes => nodes.map((slide, slideIndex) => {
      const slideRect = slide.getBoundingClientRect();
      const rel = rect => ({ left: rect.left - slideRect.left, top: rect.top - slideRect.top, width: rect.width, height: rect.height });
      const info = element => {
        const rect = rel(element.getBoundingClientRect()), style = getComputedStyle(element);
        let renderText = element.innerText || '';
        if (element.classList.contains('module-copy') || element.classList.contains('diagram-node')) {
          // Freeze the measured CJK line breaks. The native importer's generic
          // wrap estimator can otherwise put too many glyphs on one line.
          const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT), lines = [];
          let lineTop = null;
          while (walker.nextNode()) {
            const node = walker.currentNode, range = document.createRange();
            for (let offset = 0; offset < node.length;) {
              const char = String.fromCodePoint(node.textContent.codePointAt(offset));
              range.setStart(node, offset); range.setEnd(node, offset + char.length); offset += char.length;
              const bound = range.getBoundingClientRect();
              if (char === '\n') { lines.push(''); lineTop = null; continue; }
              if (lineTop == null || Math.abs(bound.top - lineTop) > 2) { if (lineTop != null || !lines.length) lines.push(''); lineTop = bound.top; }
              lines[lines.length - 1] += char;
            }
          }
          if (lines.length) renderText = lines.join('\n');
        }
        const hex = value => {
          if (value === 'rgba(0, 0, 0, 0)') return null;
          const components = value.match(/[\d.]+/g);
          return components?.length >= 3 ? '#' + components.slice(0,3).map(n => Math.round(Number(n)).toString(16).padStart(2,'0')).join('') : value;
        };
        return {
          id: element.dataset.mintId || null, nodeId: element.dataset.nodeId || null, kind: element.dataset.mintKind || element.dataset.mintObject || null,
          primitive: element.dataset.visualPrimitive || null, primitiveParent:element.closest('[data-visual-primitive]')?.dataset.visualPrimitive || null,
          bindingId:element.dataset.vpBindingId,edgeId:element.dataset.vpEdgeId,laneId:element.dataset.vpLaneId,parallelTo:element.dataset.vpParallelTo,from:element.dataset.vpFrom,to:element.dataset.vpTo,
          primitiveNodeId:element.dataset.vpNodeId,
          borderColor:hex(style.borderBottomColor),borderBottomWidth:parseFloat(style.borderBottomWidth),borderTopWidth:parseFloat(style.borderTopWidth),borderTopColor:hex(style.borderTopColor),borderLeftColor:hex(style.borderLeftColor),
          role: element.dataset.mintRole || null, priority: element.dataset.mintPriority || null,
          index: element.dataset.mintIndex == null ? null : Number(element.dataset.mintIndex), rect,
          text: element.innerText || "", renderText, fontSizePx: Number.parseFloat(style.fontSize) || null,
          bold: Number(style.fontWeight) >= 600, className: element.className, color: hex(style.color), backgroundColor: hex(style.backgroundColor), accent: style.getPropertyValue('--role-accent').trim(), borderLeftWidth: parseFloat(style.borderLeftWidth),
          contentRect: { left: rect.left + parseFloat(style.paddingLeft), top: rect.top + parseFloat(style.paddingTop), width: rect.width - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight), height: rect.height - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom) },
          overflow: element.scrollHeight > element.clientHeight + 4 || element.scrollWidth > element.clientWidth + 4,
          scrollWidth: element.scrollWidth, scrollHeight: element.scrollHeight, clientWidth: element.clientWidth, clientHeight: element.clientHeight,
          display: style.display, visibility: style.visibility, opacity: Number.parseFloat(style.opacity || "1"),
          semantic: element.dataset.mintSemantic ? JSON.parse(element.dataset.mintSemantic) : null
        };
      };
      const modules = [...slide.querySelectorAll("main [data-mint-object='module']")].map(element => ({ ...info(element), textObjects: [...element.querySelectorAll("[data-mint-object='text'], th, td, .diagram-node, .bar-row span, .bar-row b")].map(info), chart: element.dataset.chartModel ? { rect: rel(element.querySelector('.chart-preview').getBoundingClientRect()), model: JSON.parse(element.dataset.chartModel) } : null, diagramRelations: [...element.querySelectorAll('.diagram-rel')].map(row => ({ nodes: [...row.querySelectorAll('.diagram-node')].map(info), label: info(row.querySelector('.edge-label')), arrow: info(row.querySelector('.edge-arrow')) })), table: element.querySelector('table') ? { rect: rel(element.querySelector('table').getBoundingClientRect()), rows: [...element.querySelectorAll('tr')].map(row => ({ rect: rel(row.getBoundingClientRect()), cells: [...row.cells].map(info) })) } : null }));
      for (const module of modules) {
        const element = slide.querySelector(`main [data-mint-index="${module.index}"]`), image = element?.querySelector('img');
        module.primitives = [...element.querySelectorAll('[data-visual-primitive]')].map(p=>{const item=info(p);return {...item,nodeId:item.primitiveNodeId};});
        if (image) module.image = { rect: rel(image.getBoundingClientRect()), naturalWidth: image.naturalWidth, naturalHeight: image.naturalHeight };
      }
      const title = info(slide.querySelector("[data-mint-object='title']"));
      const questionElement = slide.querySelector("[data-mint-object='question']"), question = questionElement ? info(questionElement) : null;
      const painted = [];
      const walker = document.createTreeWalker(slide, NodeFilter.SHOW_TEXT);
      while (walker.nextNode()) {
        const node = walker.currentNode, parent = node.parentElement;
        if (!node.textContent.trim() || ['SCRIPT', 'STYLE'].includes(parent.tagName)) continue;
        const style = getComputedStyle(parent);
        if (style.display === 'none' || style.visibility === 'hidden' || Number(style.opacity) === 0) continue;
        const range = document.createRange(); range.selectNodeContents(node);
        painted.push(...[...range.getClientRects()].map(rel));
      }
      for (const element of slide.querySelectorAll('img, [data-chart-primitive="rect"], [data-chart-primitive="circle"]')) painted.push(rel(element.getBoundingClientRect()));
      return { slideIndex, slideId: slide.dataset.slideId, composition: slide.dataset.composition, bandCount: Number(slide.querySelector('main').dataset.bandCount), width: slideRect.width, height: slideRect.height, title, question, modules, painted };
    }));
    if (expectedSlides != null && slides.length !== expectedSlides) throw new Error(`Design canvas has ${slides.length} slides; expected ${expectedSlides}`);
    if (capture) fs.mkdirSync(outputDir, { recursive: true });
    const issues = [];
    for (const slide of slides) {
      if (Math.abs(slide.width - 1920) > 0.5 || Math.abs(slide.height - 1080) > 0.5) issues.push(`Slide ${slide.slideId} canvas is not 1920x1080`);
      const moduleIndexes = new Set();
      for (const module of slide.modules) {
        if (!Number.isInteger(module.index) || moduleIndexes.has(module.index)) issues.push(`Slide ${slide.slideId} has missing or duplicate module index`);
        moduleIndexes.add(module.index);
        if (module.overflow) issues.push(`Slide ${slide.slideId} module ${module.id} overflows its rendered DOM frame`);
        if (module.image) {
          const review=module.semantic?.imageTextReview;
          issues.push(...imageReadabilityIssues(review,module.image.rect,{width:module.image.naturalWidth,height:module.image.naturalHeight}).map(x=>`Slide ${slide.slideId} module ${module.id}: ${x}`));
          if (review?.status==='reviewed') module.text += ' ' + review.regions.map(region=>region.text||'').join(' ');
        }
        for (const text of module.textObjects || []) {
          if (text.overflow) issues.push(`Slide ${slide.slideId} module ${module.id} contains overflowing text`);
          const floor = module.table ? 14 : text.className === 'edge-label' || text.primitiveParent === 'dependency-edge' ? 13 : text.className === 'diagram-node' || module.kind === 'chart' ? 15 : ['context','supportingEvidence','boundary'].includes(module.role) ? 15 : 16;
          if (text.fontSizePx != null && text.fontSizePx * 72 / 96 < floor - .05) issues.push(`Slide ${slide.slideId} module ${module.id} text is below ${floor}pt`);
        }
        if ([module.rect.left, module.rect.top, module.rect.width, module.rect.height].some(value => !Number.isFinite(value)) || module.rect.left < 0 || module.rect.top < 0 || module.rect.left + module.rect.width > 1920.5 || module.rect.top + module.rect.height > 1080.5) issues.push(`Slide ${slide.slideId} module ${module.id} is outside the canvas`);
      }
      if (slide.title.overflow) issues.push(`Slide ${slide.slideId} title overflows the rendered DOM frame`);
      const leaves = [slide.title, ...slide.modules.flatMap(module => module.textObjects || [])].filter(item => item.text.trim());
      for (let i = 0; i < leaves.length; i++) for (let j = i + 1; j < leaves.length; j++) {
        const a = leaves[i].contentRect || leaves[i].rect, b = leaves[j].contentRect || leaves[j].rect;
        const width = Math.min(a.left + a.width, b.left + b.width) - Math.max(a.left, b.left);
        const height = Math.min(a.top + a.height, b.top + b.height) - Math.max(a.top, b.top);
        if (width > 2 && height > 2) issues.push(`DOM_TEXT_COLLISION: ${slide.slideId} ${leaves[i].text.slice(0, 20)} / ${leaves[j].text.slice(0, 20)}`);
      }
      slide.visualOccupancy = unionArea(slide.painted) / (1920 * 1080);
      // Compact reading regions outrank a tall sidebar beside an empty region.
      // Extending content to the page bottom is not a design achievement.
      const bottom = Math.max(slide.title.rect.top + slide.title.rect.height, ...slide.modules.map(m => m.rect.top + m.rect.height));
      const image = slide.modules.find(m => m.image);
      const supportWidth = Math.max(0, ...slide.modules.filter(m => !m.image).map(m => m.rect.width));
      const top = Math.min(...slide.modules.map(m=>m.rect.top));
      const moduleArea = unionArea(slide.modules.map(m=>m.rect));
      const holes = 1 - moduleArea / Math.max(1,1744 * (bottom-top));
      const priorities = slide.modules.map(m=>({priority:m.priority,size:Math.max(0,...m.textObjects.map(t=>t.fontSizePx || 0))}));
      const primarySize = Math.max(slide.title.fontSizePx,...priorities.filter(m=>m.priority==='P0').map(m=>m.size));
      const secondarySize = Math.max(1,...priorities.filter(m=>m.priority==='P2').map(m=>m.size));
      const primitives = slide.modules.flatMap(m=>m.primitives || []);
      const distance=(a,b)=>Math.hypot(Math.max(0,a.left-b.left-b.width,b.left-a.left-a.width),Math.max(0,a.top-b.top-b.height,b.top-a.top-a.height));
      const labels=primitives.filter(p=>p.nodeId && ['time-range','risk-strip','status-chip','metric-badge'].includes(p.primitive));
      const proximity=labels.map(p=>{const node=primitives.find(n=>n.nodeId===p.nodeId&&['milestone','entity-profile'].includes(n.primitive));return node?Math.max(0,1-distance(p.rect,node.rect)/300):0;});
      const edges=primitives.filter(p=>p.primitive==='dependency-edge');
      const relation=edges.map(e=>{const a=primitives.find(n=>n.nodeId===e.from&&n.primitive==='milestone'),b=primitives.find(n=>n.nodeId===e.to&&n.primitive==='milestone');return a&&b&&a.rect.left<e.rect.left&&e.rect.left<b.rect.left?1:0;});
      const lanes=primitives.filter(p=>p.primitive==='parallel-lane'&&p.parallelTo);
      relation.push(...lanes.map(p=>{const other=primitives.find(n=>n.laneId===p.parallelTo);return other&&Math.abs(other.rect.left-p.rect.left)<30&&Math.abs(other.rect.top-p.rect.top)>p.rect.height?1:0;}));
      slide.designScores = {hierarchy:Math.min(2,primarySize/secondarySize),relationship:relation.length?2*relation.reduce((a,b)=>a+b,0)/relation.length:0,semanticProximity:proximity.length?proximity.reduce((a,b)=>a+b,0)/proximity.length:0,whitespaceBalance:-Math.max(0,holes)*4,readingOrder:0};
      slide.compositionScore = Object.values(slide.designScores).reduce((a,b)=>a+b,0)
        + (image && slide.modules.length > 1 ? (image.rect.width > supportWidth ? 2 : -2) : 0);
      slide.whitespaceReview = slide.visualOccupancy < 0.48; // diagnostic, never a fill target
      const locator = page.locator(".mint-ppt-slide").nth(slide.slideIndex);
      if (capture) await locator.screenshot({ path: path.join(outputDir, `slide-${String(slide.slideIndex + 1).padStart(2, "0")}.png`) });
      delete slide.painted;
    }
    const manifest = { schemaVersion: "1.0", htmlFile: htmlFile ? path.resolve(htmlFile) : null, slides, issues, passed: issues.length === 0, generatedAt: new Date().toISOString() };
    if (capture) fs.writeFileSync(path.join(outputDir, "dom-layout.json"), `${JSON.stringify(manifest, null, 2)}\n`);
    return manifest;
  } finally { if (browser) await browser.close(); }
}

export async function planAndMeasureOutline(ir, theme, htmlFile, outputDir, options = {}) {
  const imported = await playwrightModule(), chromium = imported.chromium || imported.default?.chromium;
  const browser = await chromium.launch({ headless: true, executablePath: browserExecutable({bundled:chromium.executablePath()}) });
  try {
    const page = await browser.newPage({ viewport: { width: 1968, height: 1128 }, deviceScaleFactor: 1 });
    const planned = await planOutlinePages(ir.slides, async candidate => {
      const result = await extractDesignLayout({ existingPage: page, htmlMarkup: createDesignCanvas({ slides: [candidate] }, theme), capture: false });
      // Check local targets here; report-wide recall is checked on the complete
      // measured deck. A continuation without this target must not invent it.
      const targets=new Set(candidate.modules.flatMap(m=>[m.id,...(m.data?.nodes || []).map(n=>n.id),...(m.data?.edges || []).map(e=>e.id),...(m.data?.lanes || []).map(l=>l.id)]));
      const requirements=(ir.designRequirements || []).filter(r=>(r.scope==='report'||(candidate.originSlideIds || [candidate.id]).includes(r.slideId)) && (r.type==='single-page'||(r.targetId&&targets.has(r.targetId))));
      const local={...candidate,designRequirementRefs:(candidate.designRequirementRefs || []).filter(id=>requirements.some(r=>r.id===id))};
      const gate=auditDesignRequirements({...ir,slides:[local],designRequirements:requirements},result);
      return {...result,passed:result.passed&&gate.passed,issues:[...result.issues,...gate.issues]};
    }, {...options,designRequirements:ir.designRequirements || []});
    const grouped = { ...ir, slides: planned.slides };
    writeDesignCanvas(grouped, theme, htmlFile);
    const manifest = await extractDesignLayout({ existingPage: page, htmlFile, outputDir, expectedSlides: grouped.slides.length });
    return { ir: grouped, manifest, measurements: planned.measurements };
  } finally { await browser.close(); }
}

export function applyDomLayout(ir, manifest) {
  if (!manifest.passed) throw new Error(`DOM design gate failed: ${manifest.issues.join("; ")}`);
  return { ...ir, slides: ir.slides.map((slide, slideIndex) => {
    const layout = manifest.slides[slideIndex];
    if (!layout || layout.slideId !== slide.id || layout.modules.length !== slide.modules.length) throw new Error(`DOM manifest identity mismatch on slide ${slide.id}`);
    const ordered = [...layout.modules].sort((a, b) => a.index - b.index), frames = ordered.map(item => ({ ...item.rect, usedHeight: item.rect.height }));
    const moduleTypography = ordered.map(item => {
      const sizes = (item.textObjects || []).map(text => text.fontSizePx * 72 / 96).filter(Number.isFinite);
      return { title: { fontSizePt: sizes[0] || 18 }, body: { fontSizePt: sizes.at(-1) || 17 } };
    });
    return { ...slide, domModules: ordered, geometry: layout.composition, typography: { title: { fontSizePt: layout.title.fontSizePx * 72 / 96 }, question: layout.question ? { fontSizePt: layout.question.fontSizePx * 72 / 96 } : null, modules: moduleTypography }, layout: { title: layout.title.rect, claim: layout.question?.rect || { left: 0, top: 0, width: 0, height: 0 }, modules: frames, layoutVariant: layout.composition, occupancy: layout.visualOccupancy, visualOccupancy: layout.visualOccupancy, compositeApplied: layout.bandCount >= 2 || layout.modules.some(m=>(m.primitives || []).filter(p=>['parallel-lane','entity-profile'].includes(p.primitive)).length>=2), errors: [] } };
  }) };
}
