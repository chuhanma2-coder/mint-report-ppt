import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";

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

export async function extractDesignLayout({ htmlFile, outputDir, expectedSlides = null }) {
  const imported = await playwrightModule(), chromium = imported.chromium || imported.default?.chromium;
  if (!chromium) throw new Error("Playwright Chromium API is unavailable");
  const executablePath = process.env.MINT_CHROMIUM_EXECUTABLE || undefined;
  const browser = await chromium.launch({ headless: true, executablePath });
  try {
    const page = await browser.newPage({ viewport: { width: 1968, height: 1128 }, deviceScaleFactor: 1 });
    await page.goto(pathToFileURL(path.resolve(htmlFile)).href, { waitUntil: "load" });
    await page.evaluate(async () => { await document.fonts.ready; await Promise.all([...document.images].map(image => image.complete ? Promise.resolve() : image.decode().catch(() => {}))); });
    await page.waitForFunction(() => document.documentElement.dataset.renderReady === "true", null, { timeout: 15000 });
    const slides = await page.locator(".mint-ppt-slide").evaluateAll(nodes => nodes.map((slide, slideIndex) => {
      const slideRect = slide.getBoundingClientRect();
      const rel = rect => ({ left: rect.left - slideRect.left, top: rect.top - slideRect.top, width: rect.width, height: rect.height });
      const info = element => {
        const rect = rel(element.getBoundingClientRect()), style = getComputedStyle(element);
        return {
          id: element.dataset.mintId || null, kind: element.dataset.mintKind || element.dataset.mintObject || null,
          role: element.dataset.mintRole || null, priority: element.dataset.mintPriority || null,
          index: element.dataset.mintIndex == null ? null : Number(element.dataset.mintIndex), rect,
          text: element.innerText || "", fontSizePx: Number.parseFloat(style.fontSize) || null,
          overflow: element.scrollHeight > element.clientHeight + 4,
          scrollWidth: element.scrollWidth, scrollHeight: element.scrollHeight, clientWidth: element.clientWidth, clientHeight: element.clientHeight,
          display: style.display, visibility: style.visibility, opacity: Number.parseFloat(style.opacity || "1"),
          semantic: element.dataset.mintSemantic ? JSON.parse(element.dataset.mintSemantic) : null
        };
      };
      const modules = [...slide.querySelectorAll(":scope main > [data-mint-object='module']")].map(element => ({ ...info(element), textObjects: [...element.querySelectorAll("[data-mint-object='text']")].map(info) }));
      const title = info(slide.querySelector("[data-mint-object='title']"));
      const questionElement = slide.querySelector("[data-mint-object='question']"), question = questionElement ? info(questionElement) : null;
      const painted = [...slide.querySelectorAll("[data-mint-object]")].filter(element => element !== slide && getComputedStyle(element).visibility !== "hidden" && Number.parseFloat(getComputedStyle(element).opacity || "1") > 0).map(element => rel(element.getBoundingClientRect())).filter(rect => rect.width > 1 && rect.height > 1);
      return { slideIndex, slideId: slide.dataset.slideId, composition: slide.dataset.composition, width: slideRect.width, height: slideRect.height, title, question, modules, painted };
    }));
    if (expectedSlides != null && slides.length !== expectedSlides) throw new Error(`Design canvas has ${slides.length} slides; expected ${expectedSlides}`);
    fs.mkdirSync(outputDir, { recursive: true });
    const issues = [];
    for (const slide of slides) {
      if (Math.abs(slide.width - 1920) > 0.5 || Math.abs(slide.height - 1080) > 0.5) issues.push(`Slide ${slide.slideId} canvas is not 1920x1080`);
      const moduleIndexes = new Set();
      for (const module of slide.modules) {
        if (!Number.isInteger(module.index) || moduleIndexes.has(module.index)) issues.push(`Slide ${slide.slideId} has missing or duplicate module index`);
        moduleIndexes.add(module.index);
        if (module.overflow) issues.push(`Slide ${slide.slideId} module ${module.id} overflows its rendered DOM frame`);
        for (const text of module.textObjects || []) {
          if (text.overflow) issues.push(`Slide ${slide.slideId} module ${module.id} contains overflowing text`);
          if (text.fontSizePx != null && text.fontSizePx * 72 / 96 < 13) issues.push(`Slide ${slide.slideId} module ${module.id} text is below 13pt`);
        }
        if ([module.rect.left, module.rect.top, module.rect.width, module.rect.height].some(value => !Number.isFinite(value)) || module.rect.left < 0 || module.rect.top < 0 || module.rect.left + module.rect.width > 1920.5 || module.rect.top + module.rect.height > 1080.5) issues.push(`Slide ${slide.slideId} module ${module.id} is outside the canvas`);
      }
      if (slide.title.overflow) issues.push(`Slide ${slide.slideId} title overflows the rendered DOM frame`);
      slide.visualOccupancy = unionArea(slide.painted) / (1920 * 1080);
      if (slide.visualOccupancy < 0.48) issues.push(`Slide ${slide.slideId} painted occupancy is only ${Math.round(slide.visualOccupancy * 100)}%`);
      const locator = page.locator(".mint-ppt-slide").nth(slide.slideIndex);
      await locator.screenshot({ path: path.join(outputDir, `slide-${String(slide.slideIndex + 1).padStart(2, "0")}.png`) });
      delete slide.painted;
    }
    const manifest = { schemaVersion: "1.0", htmlFile: path.resolve(htmlFile), slides, issues, passed: issues.length === 0, generatedAt: new Date().toISOString() };
    fs.writeFileSync(path.join(outputDir, "dom-layout.json"), `${JSON.stringify(manifest, null, 2)}\n`);
    return manifest;
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
    return { ...slide, geometry: layout.composition, typography: { title: { fontSizePt: layout.title.fontSizePx * 72 / 96 }, question: layout.question ? { fontSizePt: layout.question.fontSizePx * 72 / 96 } : null, modules: moduleTypography }, layout: { title: layout.title.rect, claim: layout.question?.rect || { left: 0, top: 0, width: 0, height: 0 }, modules: frames, layoutVariant: layout.composition, occupancy: layout.visualOccupancy, visualOccupancy: layout.visualOccupancy, compositeApplied: ["story-bands"].includes(layout.composition), errors: [] } };
  }) };
}
