const chartIntents = new Set(["trend", "comparison", "ranking", "variance", "composition", "distribution", "correlation", "progression", "uncertainty", "contribution"]);
const diagramIntents = new Set(["process", "hierarchy", "causal-chain", "role-relationship", "system-architecture", "timeline", "swimlane", "network"]);

const finite = value => typeof value === "number" && Number.isFinite(value);
const strings = values => values.filter(value => typeof value === "string");

function tableParts(data) {
  const rows = Array.isArray(data.values) ? data.values : Array.isArray(data.rows) ? data.rows : [];
  const headers = data.headers || data.columns;
  return headers?.length ? { headers, body: rows } : { headers: rows[0] || [], body: rows.slice(1) };
}

export function inferDataShape(data = {}) {
  const categories = Array.isArray(data.categories) ? data.categories : [];
  const series = Array.isArray(data.series) ? data.series : [];
  const tableRows = Array.isArray(data.values) ? data.values : Array.isArray(data.rows) ? data.rows : [];
  const {body: tableBody, headers} = tableParts(data);
  const tableHeaders = headers.slice(1).map(String);
  const tableValues = tableBody.flatMap(row => Array.isArray(row) ? row.slice(1).map(value => {
    return numberFromCell(value);
  }).filter(finite) : []);
  const values = [...series.flatMap(item => Array.isArray(item.values) ? item.values : []).filter(finite), ...tableValues];
  const periods = categories.filter(value => /^(?:Y|FY)\d{1,4}$|^(?:Q|H|M)\d{1,2}$|^\d{4}[-/.]\d{1,2}(?:[-/.]\d{1,2})?$|^(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)$/i.test(String(value)));
  const total = values.reduce((sum, value) => sum + value, 0);
  return {
    dimensionCount: categories.length ? 1 : 0,
    measureCount: series.length || tableHeaders.length,
    categoryCount: categories.length || tableBody.length || values.length,
    observationCount: series.length >= 2 ? (series[0].values || []).filter((value, i) => finite(value) && finite(series[1].values?.[i])).length : series.length ? values.length : tableBody.length,
    hasTime: data.hasTime === true || (categories.length > 0 && periods.length === categories.length),
    hasTarget: data.hasTarget === true || series.some(item => /目标|预算|target|budget/i.test(String(item.name || ""))),
    hasNegative: values.some(value => value < 0),
    partToWhole: data.partToWhole === true && Math.abs(total - Number(data.whole ?? total)) < Math.max(0.01, Math.abs(total) * 0.001),
    additiveBridge: data.additiveBridge === true,
    ordered: data.ordered === true,
    exactLookup: data.exactLookup === true,
    rowCount: tableRows.length,
    columnCount: Math.max(0, ...tableRows.map(row => Array.isArray(row) ? row.length : 0)),
    numericCellCount: tableValues.length,
    unitKinds: [...new Set(tableHeaders.map((header, index) => {
      const cells = tableBody.map(row => String(row?.[index + 1] ?? ""));
      return /%|率|占比|份额/.test(header) || cells.some(value => value.includes("%")) ? "percent" : /人年|人数/.test(header) ? "headcount" : "magnitude";
    }))],
    labelMaxLength: Math.max(0, ...strings(categories).map(value => value.length)),
    nodeCount: Array.isArray(data.nodes) ? data.nodes.length : 0,
    edgeCount: Array.isArray(data.edges) ? data.edges.length : 0
  };
}

function result(type, variant, reason, alternatives = []) { return { type, variant, reason, alternatives }; }

export function routeExpression({ managementQuestion = "", claim = "", semanticIntent = "", type = null, data = {}, dataShape = null, semanticRole = "supportingEvidence" } = {}) {
  const intent = String(semanticIntent).toLowerCase().replaceAll("_", "-");
  const question = `${managementQuestion} ${claim}`;
  const shape = dataShape || inferDataShape(data);
  if (type === "image") return result("image", "evidence", "The source image is itself the evidence", ["callout"]);
  if (type === "callout" || semanticRole === "managementConclusion" || semanticRole === "decision" || semanticRole === "boundary") return result("callout", semanticRole === "decision" ? "decision" : semanticRole === "boundary" ? "boundary" : "conclusion", "The module states the management implication or boundary", ["text"]);
  if (type === "metric") return result("metric", shape.hasTarget ? "target-variance" : "hero", "A small number of values carries the conclusion", ["metric-cards"]);
  if (type === "text" && !(diagramIntents.has(intent) && shape.nodeCount > 0)) return result("text", "body", "Narrative text has no explicit relationship graph", ["callout"]);
  if (type === "diagram" || (diagramIntents.has(intent) && shape.nodeCount > 0)) {
    if (intent === "network" && shape.nodeCount > 10) return result("diagram", "grouped-network", "Dense networks require grouping before placement", ["layered-network", "split-diagram"]);
    const variants = { process: "flow", hierarchy: "tree", "causal-chain": "causal-chain", "role-relationship": "role-network", "system-architecture": "architecture", timeline: "timeline", swimlane: "swimlane", network: "network" };
    return result("diagram", variants[intent] || "flow", "The evidence encodes nodes, direction, roles, or hierarchy", ["text-outline"]);
  }
  const explicitLookupQuestion = /核对|明细|查数|逐项|完整参数|原始数据/i.test(question);
  if (intent === "matrix") return result("table", "decision-matrix", "Several dimensions must be compared together", ["heatmap-table", "small-multiples"]);
  if (intent === 'lookup' || (!intent && explicitLookupQuestion)) return result("table", "highlighted", "Exact lookup is the management purpose", ["heatmap-table"]);
  if (intent === "composition") {
    if (!shape.partToWhole) return result("chart", "sorted-bar", "The values do not form a verified whole, so part-to-whole charts are forbidden", ["table"]);
    return result("chart", shape.categoryCount <= 5 ? "doughnut" : "percent-stacked", "The values form a verified whole", ["sorted-bar"]);
  }
  if (intent === "trend" || shape.hasTime) {
    if (shape.categoryCount === 2) return result("chart", "dumbbell", "Two periods show change, not a continuous trend", ["slope", "variance-cards"]);
    if (shape.categoryCount >= 3 && shape.categoryCount <= 7) return result("chart", "column", "A short discrete time series is clearer as columns", ["dot", "line"]);
    if (shape.categoryCount > 7) return result("chart", "line", "Enough ordered time points exist for a trend", ["column"]);
    return result("metric", "change", "Too few time points exist for a trend chart", ["table"]);
  }
  if (intent === "contribution") {
    if (shape.additiveBridge) return result("chart", "waterfall", "Additive components explain movement from start to end", ["diverging-variance-bar", "table-with-highlight"]);
    return result("chart", "diverging-variance-bar", "Contribution items are not a verified additive bridge", ["highlighted-table"]);
  }
  if (intent === "variance" || shape.hasTarget) {
    if (shape.categoryCount <= 1) return result("chart", "bullet", "One actual value is compared with one target", ["target-metric"]);
    return result("chart", "variance-bar", "Several objects must be judged against target", ["highlighted-table"]);
  }
  if (intent === "correlation") {
    if (shape.observationCount >= 8 && shape.measureCount >= 2) return result("chart", "scatter", "There are enough paired observations for a relationship view", ["table"]);
    return result("table", "highlighted", "Too few observations exist for a reliable scatter view", ["dot-plot"]);
  }
  if (intent === "distribution") return result("chart", shape.observationCount >= 8 ? "dot-distribution" : "dot-plot", "The question concerns spread rather than rank", ["box", "table"]);
  if (intent === "ranking") return result("chart", "sorted-bar", "The management question asks for an ordered category comparison", ["dot-plot", "table"]);
  if (intent === "comparison" && shape.numericCellCount > 0) return result("chart", shape.unitKinds?.length > 1 ? "comparison-small-multiples" : shape.categoryCount <= 4 ? "dot-plot" : "sorted-bar", "The slide claim asks the reader to compare magnitudes; a plain table would hide the pattern", ["highlighted-table"]);
  if (type === "table" || shape.exactLookup) return result("table", "highlighted", "The data remains a lookup table because no stronger comparison intent was established", ["heatmap-table"]);
  if (chartIntents.has(intent) || type === "chart") {
    if (shape.categoryCount <= 4 && /数值|多少|重点|关注/i.test(question)) return result("metric", "status-cards", "Few values and their status matter more than a scale", ["dot-plot", "sorted-bar"]);
    return result("chart", shape.labelMaxLength > 12 || shape.categoryCount >= 4 ? "sorted-bar" : "dot-plot", "The question compares or ranks categories", ["metric-cards", "table"]);
  }
  return result("text", "body", "Narrative explanation is more useful than forced visualization", ["callout"]);
}

export function resolveSlideExpressions(slide, datasets = {}) {
  const modules = (slide.modules || []).map(module => {
    const data = module.data ?? datasets[module.dataRef] ?? {};
    const dataShape = inferDataShape(data);
    let routed = routeExpression({ ...slide, ...module, data, dataShape });
    const pattern = slide.compositionClassification?.narrativeAccepted && slide.visualNarrative?.pattern;
    if (pattern && data.nodes?.length) routed = {type:'diagram',variant:data.nodes.every(n=>n.entity) ? 'entity-comparison' : pattern,reason:'Validated visual narrative',alternatives:routed.alternatives || []};
    const preferred = module.preferredExpression;
    if (preferred) {
      const variants = new Set([routed.variant,...(routed.alternatives || [])]);
      const candidate = {...module,data,dataShape,expression:preferred};
      if (preferred.type === routed.type && variants.has(preferred.variant) && !expressionSuitability({...slide,semanticIntent:'',modules:[candidate]}).length) routed = {...routed,...preferred,reason:'Validated Planner preference',alternatives:[routed.variant,...(routed.alternatives || [])].filter(v=>v!==preferred.variant)};
    }
    const resolvedData = routed.type === "chart" && (Array.isArray(data.values) || Array.isArray(data.rows)) ? tableToChartData(data, `${slide.managementQuestion} ${slide.claim}`) : data;
    const statement = `${slide.claim || ""} ${slide.managementQuestion || ""} ${(slide.designIntent?.focusObjects || []).join(' ')} ${(slide.designIntent?.focusMetrics || []).join(' ')}`;
    const focusCategories = (resolvedData.categories || []).filter(category => statement.includes(String(category)));
    const focusSeries = (resolvedData.series || []).map(series => series.name).filter(name => statement.includes(String(name)));
    const focusRows = tableParts(resolvedData).body.map(row => String(row?.[0] ?? "")).filter(label => label && statement.includes(label));
    const expression = { ...routed, focusCategories, focusSeries, focusRows, comparisonDirection: /最高|最大|领先|主要/.test(statement) ? "high" : /最低|最小|落后|风险/.test(statement) ? "low" : null, annotationIntent: routed.variant === "sorted-bar" ? "rank" : routed.variant?.includes("variance") ? "gap" : routed.variant === "waterfall" ? "contribution" : null };
    const tableRole = expression.type === "table" ? module.tableRole || (module.semanticRole === "primaryEvidence" ? "primary" : "supporting") : module.tableRole;
    return { ...module, tableRole, data: resolvedData, sourceTable: resolvedData === data ? undefined : data, dataShape: inferDataShape(resolvedData), expression };
  });
  return { ...slide, modules };
}

function numberFromCell(value) {
  const raw = String(value ?? "").replaceAll(",", "").trim();
  if (!raw || !/[0-9]/.test(raw)) return null;
  const parsed = Number(raw.replace(/[%万亿美人民币元]/g, ""));
  if (!Number.isFinite(parsed)) return null;
  // Magnitude series use ten-thousands as the common display unit so mixed
  // values such as 2.37亿 and 5,800万 remain comparable on one scale.
  if (raw.includes("亿")) return parsed * 10000;
  return parsed;
}

export function tableToChartData(data, context = "") {
  const parts = tableParts(data), headers = parts.headers.map(String), body = parts.body;
  if (!body.length || !headers.length) return data;
  const rows = [headers, ...body], categories = body.map(row => String(row?.[0] ?? ""));
  const terms = ["压降额", "差异", "变动", "白名单/月活", "筛选白名单", "月活", "人口", "损失", "利率", "期限", "额度", "实际", "目标", "预算"];
  const scored = headers.slice(1).map((header, index) => {
    const values = body.map(row => numberFromCell(row?.[index + 1]));
    const valid = values.filter(value => value != null).length;
    if (valid !== body.length) throw new Error(`MISSING_CHART_VALUE: ${header}; preserve missing/qualitative cells in a visible table, never substitute zero`);
    let score = valid * 2 + (context.includes(header) ? 12 : 0);
    for (const [rank, term] of terms.entries()) if (header.includes(term) && context.includes(term.replace("额", ""))) score += 10 - Math.min(8, rank);
    if (/压降额|差异|变动/.test(header) && /压降|变化|差异|主要/.test(context)) score += 12;
    const unitKind = /%|率|占比|份额/.test(header) || body.some(row => String(row?.[index + 1] ?? "").includes("%")) ? "percent" : "magnitude";
    const displayUnit = unitKind === "percent" ? "%" : body.some(row => /[万亿]/.test(String(row?.[index + 1] ?? ""))) ? "万" : "";
    return { header, values, valid, score, unitKind, displayUnit };
  }).filter(item => item.valid > 0).sort((a, b) => b.score - a.score);
  // Preserve every numeric column; ranking a preferred series must not erase
  // other periods or measures from the source. Mixed units use small multiples.
  const chosen = scored;
  return { categories, series: chosen.map(item => ({ name: item.header, values: item.values, unitKind: item.unitKind, displayUnit: item.displayUnit })), exactLookup: false, sourceTable: rows };
}

export function expressionSuitability(slide) {
  const issues = [];
  for (const module of slide.modules || []) {
    const shape = module.dataShape || inferDataShape(module.data || {}), variant = module.expression?.variant;
    if (variant === "line" && (!shape.hasTime || shape.categoryCount < 3)) issues.push(`${module.id || module.title || "module"}: line requires at least three ordered time points`);
    if ((variant === "doughnut" || variant === "percent-stacked") && !shape.partToWhole) issues.push(`${module.id || module.title || "module"}: part-to-whole expression lacks a verified whole`);
    if (variant === "waterfall" && !shape.additiveBridge) issues.push(`${module.id || module.title || "module"}: waterfall lacks additiveBridge`);
    if (variant === "scatter" && shape.observationCount < 8) issues.push(`${module.id || module.title || "module"}: scatter has fewer than eight observations`);
    if (module.type === "diagram" && module.expression?.type === "chart") issues.push(`${module.id || module.title || "module"}: relationship content was routed as a chart`);
    if (variant === "network" && shape.nodeCount > 10) issues.push(`${module.id || module.title || "module"}: network exceeds ten nodes without grouping`);
  }
  if (diagramIntents.has(String(slide.semanticIntent).toLowerCase().replaceAll("_", "-")) && (slide.modules || []).every(item => !["image", "diagram"].includes(item.expression?.type))) issues.push(`${slide.id}: relationship intent requires one diagram or source image with explicit structure`);
  return issues;
}
