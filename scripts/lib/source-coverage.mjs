function sourceUnits(source = {}) {
  return source.sourceUnits || source.evidence || source.units || [];
}

function unitId(unit) {
  return String(unit.id || unit.sourceUnitId || unit.evidenceId || "");
}

export function auditSourceCoverage(source, ir) {
  const units = sourceUnits(source), known = new Map(), issues = [], destinations = new Map();
  for (const unit of units) {
    const id = unitId(unit);
    if (!id) issues.push("Source unit is missing a stable ID");
    else if (known.has(id)) issues.push(`Source unit ID is duplicated: ${id}`);
    else known.set(id, unit);
  }

  const add = (ref, destination) => {
    const id = String(ref || "");
    if (!known.has(id)) {
      issues.push(`Unknown evidence reference: ${id || "(empty)"}`);
      return;
    }
    if (!destinations.has(id)) destinations.set(id, []);
    destinations.get(id).push(destination);
  };

  for (const slide of ir.slides || []) {
    const visibleRefs = new Set();
    for (const module of slide.modules || []) {
      for (const ref of module.evidenceRefs || []) {
        visibleRefs.add(String(ref));
        add(ref, { kind: "visible-module", slideId: slide.id, moduleId: module.id || null });
      }
    }
    for (const ref of slide.evidenceRefs || []) {
      if (!visibleRefs.has(String(ref))) add(ref, { kind: "speaker-notes", slideId: slide.id, moduleId: null });
    }
  }

  const omissions = new Map();
  for (const omission of source.approvedOmissions || []) {
    const id = String(omission.sourceUnitId || omission.id || "");
    if (!known.has(id)) issues.push(`Approved omission references unknown source unit: ${id || "(empty)"}`);
    else if (omission.approved !== true || !String(omission.reason || "").trim()) issues.push(`Omission ${id} requires approved=true and a reason`);
    else omissions.set(id, omission);
  }

  const coverage = [];
  for (const [id, unit] of known) {
    const mapped = destinations.get(id) || [], omission = omissions.get(id);
    if (!mapped.length && !omission) issues.push(`Source unit ${id} has no output destination`);
    coverage.push({
      sourceUnitId: id,
      sourceText: String(unit.text ?? unit.content ?? unit.value ?? ""),
      status: mapped.length ? "covered" : omission ? "approved-omission" : "missing",
      destinations: mapped,
      omission: omission ? { reason: omission.reason, approvedBy: omission.approvedBy || null } : null
    });
  }

  const covered = coverage.filter(item => item.status === "covered").length;
  const approvedOmissions = coverage.filter(item => item.status === "approved-omission").length;
  return {
    passed: issues.length === 0,
    sourceUnitCount: coverage.length,
    covered,
    approvedOmissions,
    missing: coverage.length - covered - approvedOmissions,
    coverage,
    issues
  };
}

export function evidenceForSlide(source, slide) {
  const byId = new Map(sourceUnits(source).map(unit => [unitId(unit), unit]));
  const refs = new Set([...(slide.evidenceRefs || []), ...(slide.modules || []).flatMap(module => module.evidenceRefs || [])].map(String));
  return [...refs].map(id => {
    const unit = byId.get(id);
    return unit ? { id, text: String(unit.text ?? unit.content ?? unit.value ?? "") } : null;
  }).filter(Boolean);
}
