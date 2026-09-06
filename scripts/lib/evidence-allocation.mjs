import {theme} from './config.mjs';
const purposes = new Set(["primaryProof", "exactLookup", "implication", "boundary", "action", "context"]);

const uniq = values => [...new Set((values || []).map(String).filter(Boolean))];
const typeOf = module => module.expression?.type || module.type;

function stable(value) {
  if (Array.isArray(value)) return `[${value.map(stable).join(",")}]`;
  if (value && typeof value === "object") return `{${Object.keys(value).sort().map(key => `${key}:${stable(value[key])}`).join(",")}}`;
  return JSON.stringify(value);
}

function purposeFor(module) {
  if (purposes.has(module.carrierPurpose)) return module.carrierPurpose;
  if (["action"].includes(module.semanticRole)) return "action";
  if (["boundary", "risk"].includes(module.semanticRole)) return "boundary";
  if (["managementConclusion", "decision"].includes(module.semanticRole)) return "implication";
  if (typeOf(module) === "table" && ["primary", "reference", "detail"].includes(module.tableRole)) return "exactLookup";
  if (module.semanticRole === "context") return "context";
  return "primaryProof";
}

function priority(module) {
  if (module.semanticRole === "primaryEvidence") return 100;
  if (["managementConclusion", "decision"].includes(module.semanticRole)) return 80;
  if (["risk", "boundary", "action"].includes(module.semanticRole)) return 70;
  if (typeOf(module) === "metric") return 65;
  if (module.generatedFromEvidenceBundle) return 5;
  return 50;
}

function sameDataset(a, b) {
  if (!a?.data || !b?.data || !Object.keys(a.data).length || !Object.keys(b.data).length) return false;
  return stable(a.data.categories || a.data.values || a.data.rows || a.data) === stable(b.data.categories || b.data.values || b.data.rows || b.data)
    || (a.dataRef && b.dataRef && a.dataRef === b.dataRef);
}

function defaultVisualPriority(module) {
  const type = typeOf(module), role = module.semanticRole;
  if (["chart", "table", "diagram"].includes(type)) return "P1";
  if (type === "image" && role === "primaryEvidence") return "P0";
  if (type === "metric" && ["primaryEvidence", "progress"].includes(role)) return "P0";
  return theme.defaultDesignPolicy.rolePriority[role] || 'P2';
}

export function allocateSlideEvidence(slide) {
  const prepared = (slide.modules || []).map((module, index) => ({
    ...module,
    carrierPurpose: purposeFor(module),
    visualPriority: ['P0','P1','P2'].includes(module.visualPriority) ? module.visualPriority : defaultVisualPriority(module),
    _sourceIndex: index
  }));
  const owners = new Map();
  for (const module of [...prepared].sort((a, b) => priority(b) - priority(a))) {
    for (const ref of uniq(module.evidenceRefs)) if (!owners.has(ref)) owners.set(ref, module.id || `module-${module._sourceIndex + 1}`);
  }
  const modules = [], suppressedModules = [];
  for (const module of prepared) {
    const refs = uniq(module.evidenceRefs);
    const ownedEvidenceRefs = refs.filter(ref => owners.get(ref) === (module.id || `module-${module._sourceIndex + 1}`));
    const generic = module.generatedFromEvidenceBundle && /^(关键背景|核心证据|结论与行动)$/.test(String(module.title || ""));
    const duplicateArtifact = modules.some(existing => sameDataset(existing, module)
      && new Set(existing.evidenceRefs || []).size === new Set([...(existing.evidenceRefs || []), ...refs]).size
      && !module.reinforcementReason
      && !["implication", "boundary", "action"].includes(module.carrierPurpose));
    if ((generic && !ownedEvidenceRefs.length) || (refs.length && !ownedEvidenceRefs.length && duplicateArtifact)) {
      suppressedModules.push({ ...module, ownedEvidenceRefs, suppressedAsDuplicate: true, suppressionReason: generic ? "generic-context" : "redundant-carrier" });
      continue;
    }
    modules.push({ ...module, ownedEvidenceRefs, _sourceIndex: undefined });
  }
  const p0 = modules.filter(module => module.visualPriority === "P0");
  if (p0.length > 1) p0.slice(1).forEach(module => { module.visualPriority = "P1"; });
  if (!modules.some(module => module.visualPriority === "P0")) {
    const lead = modules.find(module => !["chart", "table", "diagram"].includes(typeOf(module)) && ["managementConclusion", "decision", "primaryEvidence", "metric"].includes(module.semanticRole));
    if (lead) lead.visualPriority = "P0";
  }
  return { ...slide, modules, suppressedModules, evidenceAllocation: { owners: Object.fromEntries(owners), visibleModuleCount: modules.length, suppressedCount: suppressedModules.length } };
}

export function evidenceAllocationIssues(slides, { allowAppendix = false } = {}) {
  const issues = [];
  let genericContextPages = 0;
  for (const slide of slides || []) {
    if (!allowAppendix && slide.role === "appendix") issues.push(`APPENDIX_FORBIDDEN: slide ${slide.id} is appendix content; move all supplied material into a normal body page`);
    const genericModules = (slide.modules || []).filter(module => /^(关键背景|核心证据)$/.test(String(module.title || "")));
    if (genericModules.length) genericContextPages++;
    for (const module of genericModules) if ((module.ownedEvidenceRefs || module.evidenceRefs || []).length) issues.push(`GENERIC_CONTEXT_REAUTHOR: slide ${slide.id} must move ${module.id || module.title} facts into specific evidence carriers before rendering`);
    const byRef = new Map();
    for (const module of slide.modules || []) for (const ref of uniq(module.evidenceRefs)) {
      if (!byRef.has(ref)) byRef.set(ref, []);
      byRef.get(ref).push(module);
    }
    for (const [ref, carriers] of byRef) {
      const proof = carriers.filter(module => ["primaryProof", "exactLookup", "context"].includes(module.carrierPurpose));
      if (proof.length > 1 && !proof.slice(1).every(module => String(module.reinforcementReason || "").trim())) issues.push(`EVIDENCE_DUPLICATION: slide ${slide.id} evidence ${ref} has ${proof.length} visible proof carriers without distinct purposes`);
    }
    const modules = slide.modules || [];
    for (let i = 0; i < modules.length; i++) for (let j = i + 1; j < modules.length; j++) {
      if (sameDataset(modules[i], modules[j]) && !modules[j].reinforcementReason && !["implication", "boundary", "action"].includes(modules[j].carrierPurpose)) issues.push(`REDUNDANT_CARRIER: slide ${slide.id} repeats one dataset in ${modules[i].id || i + 1} and ${modules[j].id || j + 1}`);
    }
    for (const module of modules) {
      const type = typeOf(module), statement = `${slide.claim || ""} ${slide.managementQuestion || ""}`;
      if (!["chart", "table"].includes(type) || !/主要|最高|最低|最大|最小|领先|落后|重点|优先|差异|压降/.test(statement)) continue;
      const expression = module.expression || {};
      const encoded = (expression.focusCategories || []).length || (expression.focusSeries || []).length || (expression.focusRows || []).length || expression.annotationIntent;
      if (!encoded) issues.push(`CONCLUSION_NOT_VISUALLY_ENCODED: slide ${slide.id} states a focus, rank, or difference but ${module.id || type} does not encode it`);
    }
    const charts = modules.filter(module => typeOf(module) === "chart"), nonCharts = modules.filter(module => typeOf(module) !== "chart");
    if (charts.some(module => module.visualPriority === "P0")) issues.push(`CHART_DOMINANCE_FORBIDDEN: slide ${slide.id} treats a chart as the page-dominant object; charts are supporting evidence`);
    if (charts.length && !String(slide.claim || '').trim() && !nonCharts.some(module => module.semanticRole === 'managementConclusion' && module.text)) issues.push(`CHART_WITHOUT_VISIBLE_ARGUMENT: slide ${slide.id} needs a written claim, not an arbitrary number of support boxes`);
  }
  if (genericContextPages > Math.max(1, Math.floor((slides || []).length * 0.2))) issues.push(`GENERIC_CONTEXT_OVERUSE: generic background/core-evidence blocks appear on ${genericContextPages} slides`);
  return issues;
}
