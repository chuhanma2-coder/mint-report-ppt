export const CURRENT_SLIDE_IR_VERSION = "1.1";
export const CURRENT_PLANNING_SCHEMA_VERSION = "2.1";

export function upgradeSlideIr(ir) {
  const from = String(ir.slideIrVersion || ir.schemaVersion || "1.0");
  if (!new Set(["1.0", CURRENT_SLIDE_IR_VERSION]).has(from)) throw new Error(`Slide IR version ${from} is not supported`);
  const slides = (ir.slides || []).map(slide => ({
    ...slide,
    pageComposition: undefined,
    geometry: undefined,
    layout: undefined,
    typography: undefined,
    modules: (slide.modules || []).map(module => ({ ...module, expression: undefined, dataShape: undefined, layout: undefined }))
  }));
  return {
    ...ir,
    schemaVersion: CURRENT_SLIDE_IR_VERSION,
    slideIrVersion: CURRENT_SLIDE_IR_VERSION,
    planningSchemaVersion: CURRENT_PLANNING_SCHEMA_VERSION,
    upgradedFrom: from === CURRENT_SLIDE_IR_VERSION ? undefined : from,
    slides
  };
}
