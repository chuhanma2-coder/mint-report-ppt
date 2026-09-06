export const CURRENT_SLIDE_IR_VERSION = "1.7";
export const CURRENT_PLANNING_SCHEMA_VERSION = "2.7";

export function upgradeSlideIr(ir) {
  const from = String(ir.slideIrVersion || ir.schemaVersion || "1.0");
  if (!new Set(["1.0", "1.1", "1.2", "1.3", "1.4", "1.5", "1.6", CURRENT_SLIDE_IR_VERSION]).has(from)) throw new Error(`Slide IR version ${from} is not supported`);
  const slides = (ir.slides || []).map(slide => ({
    ...slide,
    pageComposition: undefined,
    geometry: undefined,
    layout: undefined,
    typography: undefined,
    measuredComposition: undefined,
    measuredDensity: undefined,
    measuredSceneVariant: undefined,
    capacityProof: undefined,
    domModules: undefined,
    outlineSplit: undefined,
    outlinePart: undefined,
    compositionClassification: undefined,
    scenePlan: from===CURRENT_SLIDE_IR_VERSION?slide.scenePlan:undefined,
    modules: (slide.modules || []).map(module => ({ ...module, expression: undefined, dataShape: undefined, layout: undefined, ownedEvidenceRefs: undefined, visualPriority: from === CURRENT_SLIDE_IR_VERSION ? module.visualPriority : undefined, carrierPurpose: module.carrierPurpose }))
  }));
  return {
    ...ir,
    schemaVersion: CURRENT_SLIDE_IR_VERSION,
    slideIrVersion: CURRENT_SLIDE_IR_VERSION,
    planningSchemaVersion: CURRENT_PLANNING_SCHEMA_VERSION,
    upgradedFrom: from === CURRENT_SLIDE_IR_VERSION ? undefined : from,
    executionBrief: from===CURRENT_SLIDE_IR_VERSION?ir.executionBrief:undefined,
    slides
  };
}
