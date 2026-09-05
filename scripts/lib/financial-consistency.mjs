const numeric = value => {
  const text = String(value).trim().replaceAll('−', '-').replaceAll(',', '');
  return /^[+-]?\d+(?:\.\d+)?$/.test(text) ? Number(text) : null;
};
export function financialConsistencyIssues(slides) {
  const issues = [], findings = [];
  for (const slide of slides) for (const module of slide.modules || []) {
    const data = module.data || {}, headers = data.headers || data.columns || [];
    const after = headers.findIndex(h => /压降后/.test(h)), before = headers.findIndex(h => /预算/.test(h) && !/压降后/.test(h)), delta = headers.findIndex(h => /压降额|减少|改善/.test(h));
    if (Math.min(after, before, delta) < 0) continue;
    for (const [index, row] of (data.rows || data.values || []).entries()) {
      const a = numeric(row[after]), b = numeric(row[before]), d = numeric(row[delta]);
      if ([a, b, d].some(v => v === null)) continue;
      const calculated = /损益|利润|收入/.test(row[0]) ? a - b : b - a;
      if (Math.abs(calculated - d) <= .11) continue;
      const finding = { slideId: slide.id, moduleId: module.id, row: index, label: row[0], sourceValue: d, calculatedValue: Number(calculated.toFixed(2)) };
      findings.push(finding);
      const notice = module.reconciliationNotes?.find(note => note.row === index && note.sourceValue === d && Math.abs(note.calculatedValue - calculated) < .01);
      if (!notice || !module.text?.includes(notice.text) || !/待确认|待核/.test(notice.text)) issues.push(`FINANCIAL_RECONCILIATION: ${slide.id}/${module.id}/${row[0]} source=${d}, calculated=${finding.calculatedValue}; preserve both and show the unresolved difference beside the data`);
    }
  }
  return { passed: !issues.length, findings, issues };
}
