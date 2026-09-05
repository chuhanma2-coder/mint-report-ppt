# Workflow and prompts

## 1. One coordinator creates the task card

Prompt:

> Use $mint-report-ppt. Create only the collaboration task card; do not create slides. Preserve the leader's outline and order exactly. A owns items 1–3, B owns 4 and 6, and C owns 7–8. Use stable section IDs `section-a-1-3`, `section-b-4-6`, and `section-c-7-8`. Do not invent a missing item 5. Output `report.mint-ppt-task.json` using the current Skill and Mint Fresh 2 versions.

Generate from a small JSON config with `scripts/create-task-card.mjs config.json report.mint-ppt-task.json`. Everyone uses the same file. The task card fixes report/section identity and order; it does not fix page numbers.

## 2. Each owner creates one current PPTX in a separate task

Prompt:

> Use $mint-report-ppt and the attached shared task card. I own the section assigned to me in the task card; resolve its sectionId automatically from the owner/material scope. Read all my source files before planning. Do not browse, add facts, or drop any source unit. First group every source fact by task-card outline item. Try to place each outline item completely on one readable page; only when measured capacity cannot fit may you split it at a natural evidence or business-chain boundary, with sequential outlinePart and an explicit outlineSplit reason. Put every required-visible and supporting-visible fact in normal body pages; only traceability material may stay only in notes, and do not create an appendix unless allowAppendix=true. For each visible module, add visibleFacts mappings and ensure each mapped text is truly present in the visible module payload; evidenceRefs alone do not count. Plan story clusters, decision units, and complete management conclusions; do not create one page per topic/question. Map every fact to one primary visible carrier and never repeat one dataset as chart, table, and prose. Never auto-create a generic “关键背景” block. Do not choose pageComposition. Keep managementQuestion internal by default. Route by management question + semantic intent + computed data shape. Charts, diagrams, and tables are supporting evidence, not automatic P0 objects: a chart defaults to P1, occupies no more than the supporting region, and needs at least two substantive non-chart carriers for the factual explanation and management meaning. Give every table a primary/supporting/reference/detail role. Keep body text at least 16pt, chart categories at least 15pt, chart values at least 16pt, tables at least 14pt, diagram nodes at least 15pt, and edge labels at least 13pt; rebalance or split at a natural boundary instead of shrinking. Generate one native editable 16:9 PPTX. The internal Design Canvas is for layout calculation only. Keep audit IDs out of visible slides. Require destination coverage, visible-fact coverage, outline-integrity, DOM overflow, native-object, rendered visual, and HTML/PPT parity gates to pass before delivery.

Build command:

```text
node scripts/build-section-ppt.mjs source-model.json slide-ir.json report.mint-ppt-task.json <section-id> <owner>-<section>-current.pptx
```

The build writes an internal design canvas, DOM layout manifest, source-coverage ledger, native PPT audit, and visual-parity report. These are QA artifacts, not user editing files. Use `scripts/audit-section-ppt.mjs` separately only after a later manual or Agent edit, passing `--resolved-ir=<pptx>.resolved-ir.json` when the PPT still corresponds to the first-generation IR.

On the target Windows computer, run `scripts/verify-powerpoint-render.ps1 -Pptx <pptx> -DesignRenderDir <pptx>.design-render -OutputDir <verification-folder>`. It renders through Microsoft PowerPoint, normalizes the slide images, and reruns visual parity. A release candidate is not formally approved until this target-platform gate passes.

## 3. Review and edit directly in PowerPoint

After the first PPTX, the PPTX is the only human work authority. Leaders may edit text, tables, charts, images, shapes, positions, and may add/delete/reorder/split/merge slides. Save and circulate one current PPTX per section. Do not ask people to export ZIP or synchronize changes to IR.

## 4. Merge current sections

On the leader's Windows computer, use `scripts/merge-section-ppt.ps1`. It validates report/section identity, inserts each section in task-card order, preserves native objects and human edits, and performs zero model calls. It does not re-layout or reread source material.

After merge, the leader may continue editing the complete PPTX. Run `scripts/audit-final-ppt.mjs` for final artifact checks. Export PDF through PowerPoint if needed; this Skill does not implement PDF.

## 5. Publish the final HTML

Prompt:

> Use $mint-report-ppt. Treat the attached complete PPTX as final authority. Do not read old IR or task-card page counts, and do not rewrite or re-layout any slide. Publish every actual PPT slide in its current order as one offline read-only HTML. Keep only dot navigation with no page titles.

Set the bundled presentation runtime variables and run:

```text
node scripts/publish-report-html.mjs final.pptx final.html
```

The publisher renders the actual final PPT pages, embeds every frame in the HTML, and verifies that frame count equals the PPT slide count. The HTML is for delivery, not further editing.
