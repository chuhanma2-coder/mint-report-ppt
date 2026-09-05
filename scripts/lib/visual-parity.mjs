import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";

async function playwrightModule() {
  const require = createRequire(path.join(process.env.RUNTIME_NODE_MODULES, "package.json"));
  return import(pathToFileURL(require.resolve("playwright")).href);
}

export async function compareRenderedSlides({ referenceDir, candidateDir, slideCount, outputFile }) {
  const imported = await playwrightModule(), chromium = imported.chromium || imported.default?.chromium;
  if (!chromium) throw new Error("Playwright Chromium API is unavailable");
  const browser = await chromium.launch({ headless: true, executablePath: process.env.MINT_CHROMIUM_EXECUTABLE || undefined });
  try {
    const page = await browser.newPage({ viewport: { width: 320, height: 180 } }), results = [], issues = [];
    for (let index = 1; index <= slideCount; index++) {
      const stem = `slide-${String(index).padStart(2, "0")}.png`, reference = path.join(referenceDir, stem), candidate = path.join(candidateDir, stem);
      if (!fs.existsSync(reference) || !fs.existsSync(candidate)) { issues.push(`Slide ${index} visual parity image is missing`); continue; }
      const referenceData = `data:image/png;base64,${fs.readFileSync(reference).toString("base64")}`, candidateData = `data:image/png;base64,${fs.readFileSync(candidate).toString("base64")}`;
      const metrics = await page.evaluate(async ({ reference, candidate }) => {
        const load = source => new Promise((resolve, reject) => { const image = new Image(); image.onload = () => resolve(image); image.onerror = reject; image.src = source; });
        const [a, b] = await Promise.all([load(reference), load(candidate)]), canvas = document.createElement("canvas"); canvas.width = 160; canvas.height = 90;
        const ctx = canvas.getContext("2d", { willReadFrequently: true }); ctx.drawImage(a, 0, 0, 160, 90); const ad = ctx.getImageData(0, 0, 160, 90).data; ctx.clearRect(0, 0, 160, 90); ctx.drawImage(b, 0, 0, 160, 90); const bd = ctx.getImageData(0, 0, 160, 90).data;
        let diff = 0, aInk = 0, bInk = 0; const pixels = 160 * 90;
        for (let i = 0; i < ad.length; i += 4) {
          const al = (ad[i] + ad[i + 1] + ad[i + 2]) / 3, bl = (bd[i] + bd[i + 1] + bd[i + 2]) / 3;
          diff += Math.abs(al - bl) / 255; if (al < 242) aInk++; if (bl < 242) bInk++;
        }
        return { perceptualDifference: diff / pixels, referenceCoverage: aInk / pixels, candidateCoverage: bInk / pixels, coverageDrop: Math.max(0, (aInk - bInk) / pixels) };
      }, { reference: referenceData, candidate: candidateData });
      const passed = metrics.perceptualDifference <= 0.24 && metrics.coverageDrop <= 0.12;
      if (!passed) issues.push(`Slide ${index} diverges from the approved design canvas (difference ${metrics.perceptualDifference.toFixed(3)}, coverage drop ${metrics.coverageDrop.toFixed(3)})`);
      results.push({ slide: index, ...metrics, passed });
    }
    const report = { schemaVersion: "1.0", passed: issues.length === 0, results, issues, rendererContract: "design-canvas-to-native-ppt", generatedAt: new Date().toISOString() };
    if (outputFile) fs.writeFileSync(outputFile, `${JSON.stringify(report, null, 2)}\n`);
    return report;
  } finally { await browser.close(); }
}
