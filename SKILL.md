---
name: mint-report-ppt
description: Create source-grounded Mint management reports as native editable PowerPoint sections for parallel review, merge the final PPT without re-layout, and publish the actual final PPT pages as one offline read-only HTML. Use for Mint PPT authoring, collaborative PowerPoint review, or PPT-to-HTML publication. Do not use for HTML-first editing or final-PPT-only generic presentation work.
---

# Mint Report PPT

Produce a strong first-draft PPTX that leaders can edit directly. After the first PPTX exists, treat that PPTX—not HTML or old IR—as the only human-editable authority. Publish the actual final PPT pages and order as a read-only offline HTML.

## Route and boundaries

- Use this Skill for Mint PPT collaboration followed by final HTML publication.
- Use `mint-report-html` for HTML-first authoring, E editing, or dynamic web interaction. This Skill does not require that Skill.
- Use the Presentations Skill directly for a generic final-PPT-only deliverable.
- Never invoke or modify `mint-report-deck` as a fallback.
- Use the bundled presentation runtime and `@oai/artifact-tool`; never use `python-pptx`.
- Do not generate draft HTML, extract HTML coordinates, embed ZIPs, sync PPT edits back to IR, or implement PDF export.

## Required pipeline

1. Read all supplied material once. Build a source/evidence model without adding facts.
2. Plan the chapter around management questions and supported conclusions. Consolidate content that answers one question before adding a slide.
3. Write light Slide IR conforming to `schemas/slide-ir.schema.json`. AI writes semantic intent, not coordinates, fonts, colors, or PowerPoint code.
4. Run the deterministic Expression Router. `dataShape` is computed from data. Expression and geometry are separate.
5. Run the Geometry Engine, native PPT Renderer, content/expression/layout/artifact QA, then deliver one current section PPTX.
6. People edit that PPTX directly, including slide insertion, deletion, reordering, splitting, merging, and object changes.
7. Merge current PPTX files in task-card section order without model calls, source rereading, or slide reconstruction.
8. Publish the actual final PPT slides and order through `scripts/publish-report-html.mjs`. The HTML is a read-only publication artifact.

Read these only when needed:

- `references/workflow.md` for prompts, commands, authority, and merge/publication.
- `references/expression-routing.md` before authoring IR or changing an expression.
- `references/design-layout.md` before rendering or repairing layout/design.
- `references/quality-gates.md` before review, diagnosis, or delivery.

## Non-negotiable contracts

- Source completeness: every source unit is visible, retained in notes/appendix, or recorded as an approved omission. Never delete evidence to fit a slide.
- No invention: do not browse for business facts unless asked; label missing or conflicting information.
- Expression: choose by management question, semantic intent, and computed data shape. Router choices are candidates, not mechanical one-to-one mappings.
- Layout: the Layout Engine cannot silently change the selected expression. Renderer cannot change content or semantics.
- Native editability: formal text, tables, charts, images, and required diagrams are native PowerPoint objects. Full-slide screenshots are forbidden in working PPTX files.
- Clean pages: 16:9, no visible task IDs, hashes, outline numbers, source-unit IDs, headers, footers, or page numbers.
- Images must be embedded. Charts preserve categories, series, units, signs, targets, and axis meaning.
- QA issues return only to their owner layer: content → source/planner; expression → router; layout → geometry; artifact → renderer/publisher.
- Visual QA may request `expression-review-required`; it may not directly replace one chart type with another.

## Authority lifecycle

- Before first PPTX: source model and Slide IR are generation authority.
- After first PPTX: the PPTX is the sole human work authority. Do not regenerate it from stale IR.
- Final publication: HTML is a read-only artifact generated from the actual final PPTX; it does not become an editing source.

## Speed contract

Use one source pass, one planning pass, one deterministic routing/layout/render pass, one visual review, and one batch repair. Check only affected slides for ordinary edits. Recheck neighboring slides and the title chain after split, merge, add, delete, reorder, title, or conclusion changes. Merge uses zero model calls and does not re-layout.
