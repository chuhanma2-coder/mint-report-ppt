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
- Do not expose a draft HTML workfile, embed ZIPs, sync PPT edits back to IR, or implement PDF export. The build may create a temporary internal 1920×1080 Design Canvas solely for browser layout and verification; users receive the native PPTX, not that internal canvas.

## Required pipeline

1. Read all supplied material once. Build a source/evidence model without adding facts.
2. Classify every source unit as `required-visible`, `supporting-visible`, or `traceability`. Plan story clusters around complete management conclusions and their evidence systems—not one source topic or one question per page. Consolidate adjacent candidates before adding slides. Write an explicit transition for every content slide after the first; the title chain alone must read as one management story.
3. Build a Page Evidence Bundle for every content slide, then write light Slide IR conforming to `schemas/slide-ir.schema.json`. AI writes facts, semantic intent, evidence hierarchy, story cluster, and decision unit—not `pageComposition`, coordinates, fonts, colors, or PowerPoint code.
4. Run the deterministic Composition Classifier and Expression Router. `pageComposition` and `dataShape` are recomputed by code; expression and visual composition stay separate.
5. Render a temporary internal 1920×1080 HTML Design Canvas, wait for fonts and images, measure the final DOM, and compile those measured frames into native PowerPoint text, tables, charts, diagrams, shapes, and embedded images. The retired Geometry Engine must not participate in the production build path.
6. Run content, expression, DOM layout, native-artifact, rendered-visual, and HTML/PPT parity gates, then deliver one current section PPTX. Any failed gate blocks success.
7. People edit that PPTX directly, including slide insertion, deletion, reordering, splitting, merging, and object changes.
8. Merge current PPTX files in task-card section order without model calls, source rereading, or slide reconstruction.
9. Publish the actual final PPT slides and order through `scripts/publish-report-html.mjs`. The HTML is a read-only publication artifact.

Read these only when needed:

- `references/workflow.md` for prompts, commands, authority, and merge/publication.
- `references/expression-routing.md` before authoring IR or changing an expression.
- `references/design-layout.md` before rendering or repairing layout/design.
- `references/quality-gates.md` before review, diagnosis, or delivery.

## Non-negotiable contracts

- Visible source completeness: every supplied fact is allocated to a visible body module by default. Decision-critical units are `required-visible`; supporting detail is `supporting-visible`; only `traceability` material may live solely in notes. Appendices are forbidden unless the task card explicitly sets `allowAppendix: true`. Without that authorization, extra detail becomes a normal body page with a conclusion-led title. Any omission requires explicit user approval and a reason. `build-section-ppt` writes a source-coverage ledger and blocks missing or hidden evidence. Never delete evidence to fit a slide.
- Aggregation is not summarization: page consolidation may reorganize and visually downgrade information, but it may not compress away facts, caveats, risks, actions, cases, or boundaries. A page is one complete management conclusion plus its evidence system—not one management issue plus one layout.
- Page evidence: every content slide declares `outlineItem`, `storyCluster`, `decisionUnit`, and a Page Evidence Bundle. Every bundled fact maps to a visible module; primary evidence maps to `primaryEvidence` modules. The deterministic classifier—not the Agent—derives `pageComposition` from information units, evidence groups, evidence diversity, and the decision unit.
- Evidence allocation: one source fact has one primary visible carrier. A second carrier is allowed only when it serves a different declared `carrierPurpose` and includes `reinforcementReason`. Never repeat the same dataset as chart, table, and prose. Never auto-create a generic `关键背景` band; place context in the title, a KPI, an annotation, a compact boundary strip, or a normal evidence module only when it contributes unique information.
- Visual hierarchy: every content page has one P0 primary proof, one or two P1 supporting/decision objects, and subordinate P2 context. A source image, chart, diagram, or primary table must receive space according to evidence importance, not equal-card counting. Image-led pages use a dominant image with a narrow vertically stacked support rail when that best matches the evidence.
- Readability: body text is normally 17–20pt and never below 16pt; supporting text is 15–17pt; chart axes/categories are 15–18pt; chart values 16–19pt; table text 14–16pt; diagram nodes 15–18pt and edge labels 13–15pt. If text does not fit at the floor, rebalance geometry or split by an independent conclusion; never rely on PowerPoint shrink-to-fit.
- Version isolation: source facts, data, and media may survive an upgrade. Historical `pageComposition`, geometry, layout, split/merge decisions, data shape, expressions, and component routing may not. Recompute them with the installed planning and IR versions; stale task cards must be regenerated.
- No invention: do not browse for business facts unless asked; label missing or conflicting information.
- Expression: choose by management question, semantic intent, and computed data shape. Router choices are candidates, not mechanical one-to-one mappings.
- Layout: the Layout Engine cannot silently change the selected expression. Renderer cannot change content or semantics.
- Evidence hierarchy: every content-slide claim must have a visible primary proof. Relationship intent requires a real diagram/image; comparison, trend, variance, contribution, ranking, composition, or matrix intent cannot be delivered as text/cards or an undifferentiated table alone.
- Management questions are internal planning fields and hidden by default. Show one only when it materially helps the audience.
- Text fit is measured with the actual CJK font before rendering. The renderer uses the selected readable font size with no automatic shrink. If title, body, label, or table cannot fit above its role-specific minimum, change geometry, consolidate/split by management conclusion, or block delivery.
- Chart legibility: chart axes, legends, category labels, and data labels use the chart typography tokens. They must remain readable at normal presentation distance; a dense chart must be regrouped or split instead of reducing labels below the configured minimum.
- Native editability: formal text, tables, charts, images, and required diagrams are native PowerPoint objects. Full-slide screenshots are forbidden in working PPTX files.
- Design-canvas compiler: the browser owns final layout measurement; the native compiler owns PowerPoint objects. Regular charts remain native charts, complex charts use editable shapes, tables remain native tables, diagrams remain shapes/connectors, and images are embedded. Unsupported semantic objects block the build instead of being rasterized or silently simplified.
- Painted-bounds QA: occupancy is calculated from visible DOM paint bounds, not assigned rectangles. HTML/PPT visual parity and native PowerPoint render verification are release gates; a structural audit alone cannot approve a deck.
- Clean pages: 16:9, no visible task IDs, hashes, outline numbers, source-unit IDs, headers, footers, or page numbers.
- Images must be embedded. Charts preserve categories, series, units, signs, targets, and axis meaning.
- QA issues return only to their owner layer: content → source/planner; expression → router; layout → geometry; artifact → renderer/publisher.
- Visual QA may request `expression-review-required`; it may not directly replace one chart type with another.

## Authority lifecycle

- Before first PPTX: source model and Slide IR are generation authority.
- After first PPTX: the PPTX is the sole human work authority. Do not regenerate it from stale IR.
- Final publication: HTML is a read-only artifact generated from the actual final PPTX; it does not become an editing source.

## Speed contract

Use one source pass, one planning pass, one deterministic allocation/routing/layout/render pass, one visual review, and one batch repair. Page Evidence Bundles and consolidation checks add no model call. Large detail tables remain in body pages unless an appendix was explicitly authorized. Do not use equal cards when module information weight differs. Do not combine chart + table + explanation mechanically: each carrier must add a distinct decision purpose. Check only affected slides for ordinary edits. Recheck neighboring slides and the title chain after split, merge, add, delete, reorder, title, or conclusion changes. Merge uses zero model calls and does not re-layout.
