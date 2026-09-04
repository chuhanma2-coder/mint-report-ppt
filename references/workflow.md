# Workflow and prompts

## 1. One coordinator creates the task card

Prompt:

> Use $mint-report-ppt. Create only the collaboration task card; do not create slides. Preserve the leader's outline and order exactly. A owns items 1–3, B owns 4 and 6, and C owns 7–8. Use stable section IDs `section-a-1-3`, `section-b-4-6`, and `section-c-7-8`. Do not invent a missing item 5. Output `report.mint-ppt-task.json` using the current Skill and Mint Fresh 2 versions.

Generate from a small JSON config with `scripts/create-task-card.mjs config.json report.mint-ppt-task.json`. Everyone uses the same file. The task card fixes report/section identity and order; it does not fix page numbers.

## 2. Each owner creates one current PPTX in a separate task

Prompt:

> Use $mint-report-ppt and the attached shared task card. I own the section assigned to me in the task card; resolve its sectionId automatically from the owner/material scope. Read all my source files before planning. Do not browse, add facts, or drop any source unit. Classify each unit as required-visible, supporting-visible, or traceability: decision-critical facts must be visible in the body, supporting detail must be visible in the body or appendix, and only traceability material may stay only in notes. Plan story clusters, decision units, and complete management conclusions; do not create one page per topic/question. Before adding a page, merge adjacent candidates that belong to the same conclusion or business chain. For every content page create a Page Evidence Bundle covering context, KPI, primary and supporting proof, cases, comparisons, charts, tables, images, risks, actions, decisions, boundaries, and explanations as applicable, and map every bundle item to a visible module. Aggregation may reorganize information but must not summarize facts away. Do not choose `pageComposition`; let the current deterministic Composition Classifier derive it from the bundle. Keep `managementQuestion` internal unless displaying it helps the audience. Create valid Slide IR and route each module by management question + semantic intent + computed data shape. Every conclusion page needs visible primary proof; relationship content must use nodes/edges, and comparison/contribution/ranking content cannot rely on a plain table alone. Give every table a `primary/supporting/reference/detail` role. Large detail tables go to appendix or accompany a visual summary. Keep chart axes, labels, legends, and values readable at presentation distance; regroup or split dense charts instead of shrinking text. Generate one native editable 16:9 PPTX. Do not generate draft HTML or ZIP. Keep audit IDs out of visible slides. Render and review all slides once, batch-fix issues, then give me `<owner>-<section>-current.pptx` plus its source-coverage audit.

Build command:

```text
node scripts/build-section-ppt.mjs source-model.json slide-ir.json report.mint-ppt-task.json <section-id> <owner>-<section>-current.pptx
```

The build performs one section audit and writes `<pptx>.audit.json`. Use `scripts/audit-section-ppt.mjs` separately only after a later manual or Agent edit, passing `--resolved-ir=<pptx>.resolved-ir.json` when the PPT still corresponds to the first-generation IR.

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
