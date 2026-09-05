import crypto from "node:crypto";

const normalize = value => String(value ?? "")
  .normalize("NFKC")
  .replace(/[，、；;：:\s]+/g, " ")
  .replace(/\s+/g, " ")
  .trim()
  .toLowerCase();

function factsFromText(text) {
  const source = normalize(text);
  const numeric = [...source.matchAll(/(?:^|\s|[^\p{L}\p{N}])([+-]?\d+(?:\.\d+)?)\s*(%|万|万元|万美元|亿|人|个|家|月|年|x|倍)?/gu)]
    .map(match => `${match[1]}${match[2] || ""}`);
  return numeric.length ? numeric.map(value => `${source.replace(/[+-]?\d+(?:\.\d+)?\s*(?:%|万|万元|万美元|亿|人|个|家|月|年|x|倍)?/gu, "#")}|${value}`) : source ? [source] : [];
}

function factsFromData(data = {}) {
  const out = [];
  const categories = Array.isArray(data.categories) ? data.categories : [];
  for (const series of data.series || []) {
    (series.values || []).forEach((value, index) => {
      out.push(`${normalize(series.name)}|${normalize(categories[index] ?? index)}|${normalize(value)}|${normalize(series.unit || data.unit || "")}`);
      out.push(`pair|${normalize(categories[index] ?? index)}|${normalize(value)}`);
    });
  }
  for (const row of data.rows || []) {
    out.push(normalize(Array.isArray(row) ? row.join("|") : JSON.stringify(row)));
    if (Array.isArray(row) && row.length >= 2) row.slice(1).forEach(value => out.push(`pair|${normalize(row[0])}|${normalize(value)}`));
  }
  if (data.nodes) for (const node of data.nodes) out.push(`node|${normalize(node.id)}|${normalize(node.label || node.name)}`);
  if (data.edges) for (const edge of data.edges) out.push(`edge|${normalize(edge.from)}|${normalize(edge.to)}|${normalize(edge.label)}`);
  return out.filter(Boolean);
}

export function moduleFactFingerprints(module) {
  const facts = [
    ...factsFromText(module.text),
    ...factsFromText(`${module.value ?? ""}${module.unit || ""}`),
    ...factsFromData(module.data)
  ];
  return [...new Set(facts)].map(fact => crypto.createHash("sha256").update(fact).digest("hex").slice(0, 20));
}

export function semanticDuplicationIssues(slide) {
  const owners = new Map(), issues = [];
  for (const module of slide.modules || []) {
    for (const fingerprint of moduleFactFingerprints(module)) {
      if (!owners.has(fingerprint)) owners.set(fingerprint, module);
      else {
        const first = owners.get(fingerprint);
        const permitted = module.reinforcementReason || [module.semanticRole, first.semanticRole].some(role => ["managementConclusion", "decision", "risk", "action", "boundary"].includes(role));
        if (!permitted) issues.push(`FACT_DUPLICATION: slide ${slide.id} repeats one semantic fact in ${first.id || first.type} and ${module.id || module.type}`);
      }
    }
  }
  return [...new Set(issues)];
}
