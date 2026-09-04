import crypto from "node:crypto";
import fs from "node:fs";
import { skillVersion, theme } from "./config.mjs";
import { CURRENT_PLANNING_SCHEMA_VERSION, CURRENT_SLIDE_IR_VERSION } from "./ir-version.mjs";

const safe = value => String(value || "").replace(/[^A-Za-z0-9._-]+/g, "-").replace(/^-+|-+$/g, "");
const digest = value => crypto.createHash("sha256").update(JSON.stringify(value)).digest("hex");

export function createTaskCard(input) {
  const sections = [...(input.sections || [])].map((section, index) => ({
    sectionId: safe(section.sectionId || section.id || `section-${index + 1}`),
    title: String(section.title || "").trim(),
    order: Number(section.order || index + 1),
    owner: String(section.owner || "").trim(),
    outlineItems: [...(section.outlineItems || [])].map(String)
  })).sort((a, b) => a.order - b.order);
  if (!safe(input.reportId) || !String(input.title || "").trim() || !sections.length || sections.some(item => !item.sectionId || !item.title || !item.owner)) throw new Error("Task card requires reportId, title, and sections with id, title, owner, and order");
  if (new Set(sections.map(item => item.sectionId)).size !== sections.length || new Set(sections.map(item => item.order)).size !== sections.length) throw new Error("Section IDs and order values must be unique");
  const card = {
    schemaVersion: "2.0",
    kind: "mint-ppt-task-card",
    requiredSkill: "mint-report-ppt",
    skillVersion,
    planningSchemaVersion: CURRENT_PLANNING_SCHEMA_VERSION,
    slideIrVersion: CURRENT_SLIDE_IR_VERSION,
    themeVersion: theme.themeVersion,
    pptMasterVersion: "mint-fresh-2/1",
    reportId: safe(input.reportId),
    title: String(input.title).trim(),
    purpose: String(input.purpose || "管理汇报").trim(),
    allowAppendix: input.allowAppendix === true,
    outlineOrder: [...(input.outlineOrder || sections.flatMap(item => item.outlineItems))].map(String),
    warnings: [...(input.warnings || [])].map(String),
    sections,
    designContract: { ...theme.slide, fonts: theme.fonts, palette: theme.palette, semanticColors: theme.semanticColors, typographyPt: theme.typographyPt },
    authority: { beforeFirstPpt: "source-model+slide-ir", afterFirstPpt: "pptx", publication: "read-only-html" },
    publication: { collaboration: "section-pptx", primary: "pptx", final: "read-only-html", pdf: "native-powerpoint-export" }
  };
  return { ...card, taskCardHash: digest(card) };
}

export function readTaskCard(file) {
  const card = JSON.parse(fs.readFileSync(file, "utf8"));
  if (card.kind !== "mint-ppt-task-card" || card.requiredSkill !== "mint-report-ppt") throw new Error("Not a mint-report-ppt task card");
  if (card.schemaVersion !== "2.0") throw new Error(`Task card schema ${card.schemaVersion || "unknown"} is not supported by v0.3`);
  if (card.skillVersion !== skillVersion || card.themeVersion !== theme.themeVersion) throw new Error(`Task card requires mint-report-ppt ${card.skillVersion} and theme ${card.themeVersion}; installed versions differ`);
  if (card.planningSchemaVersion !== CURRENT_PLANNING_SCHEMA_VERSION || card.slideIrVersion !== CURRENT_SLIDE_IR_VERSION) throw new Error("Task card planning versions are stale; regenerate the task card with the installed skill");
  const original = { ...card }; delete original.taskCardHash;
  if (digest(original) !== card.taskCardHash) throw new Error("Task card hash does not match its content");
  return card;
}
