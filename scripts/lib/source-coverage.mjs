function sourceUnits(source = {}) {
  return source.sourceUnits || source.evidence || source.units || [];
}

function unitId(unit) {
  return String(unit.id || unit.sourceUnitId || unit.evidenceId || "");
}

function visibilityClass(unit) {
  return String(unit.visibility || "required-visible");
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
        add(ref, { kind: slide.role === "appendix" ? "appendix-module" : "visible-module", slideId: slide.id, moduleId: module.id || null });
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
    const mapped = destinations.get(id) || [], omission = omissions.get(id), visibility = visibilityClass(unit);
    if (!["required-visible", "supporting-visible", "traceability"].includes(visibility)) issues.push(`Source unit ${id} has invalid visibility class ${visibility}`);
    const visible = mapped.some(item => item.kind === "visible-module"), appendix = mapped.some(item => item.kind === "appendix-module"), notes = mapped.some(item => item.kind === "speaker-notes");
    if (!mapped.length && !omission) issues.push(`Source unit ${id} has no output destination`);
    else if (!omission && visibility === "required-visible" && !visible) issues.push(`Source unit ${id} is decision-critical and must appear in a visible body module`);
    else if (!omission && visibility === "supporting-visible" && !visible && !appendix) issues.push(`Source unit ${id} must appear in a visible body or appendix module; notes alone are insufficient`);
    coverage.push({
      sourceUnitId: id,
      sourceText: String(unit.text ?? unit.content ?? unit.value ?? ""),
      visibility,
      status: mapped.length ? visible ? "visible" : appendix ? "appendix" : notes ? "notes-only" : "covered" : omission ? "approved-omission" : "missing",
      destinations: mapped,
      omission: omission ? { reason: omission.reason, approvedBy: omission.approvedBy || null } : null
    });
  }

  const covered = coverage.filter(item => ["visible", "appendix", "notes-only", "covered"].includes(item.status)).length;
  const approvedOmissions = coverage.filter(item => item.status === "approved-omission").length;
  const requiredVisible = coverage.filter(item => item.visibility === "required-visible"), supportingVisible = coverage.filter(item => item.visibility === "supporting-visible");
  return {
    passed: issues.length === 0,
    sourceUnitCount: coverage.length,
    covered,
    approvedOmissions,
    missing: coverage.length - covered - approvedOmissions,
    visibleRequired: requiredVisible.filter(item => item.status === "visible").length,
    requiredVisibleCount: requiredVisible.length,
    visibleOrAppendixSupporting: supportingVisible.filter(item => ["visible", "appendix"].includes(item.status)).length,
    supportingVisibleCount: supportingVisible.length,
    notesOnly: coverage.filter(item => item.status === "notes-only").length,
    coverage,
    issues
  };
}

export function evidenceForSlide(source, slide) {
  const byId = new Map(sourceUnits(source).map(unit => [unitId(unit), unit]));
  const bundleRefs = Object.values(slide.evidenceBundle || {}).flatMap(value => Array.isArray(value) ? value : []);
  const refs = new Set([...(slide.evidenceRefs || []), ...bundleRefs, ...(slide.modules || []).flatMap(module => module.evidenceRefs || [])].map(String));
  return [...refs].map(id => {
    const unit = byId.get(id);
    return unit ? { id, text: String(unit.text ?? unit.content ?? unit.value ?? "") } : null;
  }).filter(Boolean);
}
