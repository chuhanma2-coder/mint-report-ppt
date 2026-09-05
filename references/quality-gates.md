# Quality gates

## Ownership and rollback

| Class | Examples | Return to |
|---|---|---|
| Content | Missing evidence, wrong number, unsupported title | Source model or planner |
| Expression | False trend, false whole, process drawn as chart | Expression Router |
| Layout | Sparse page, overlap, clipped label, crossing connector | Design Canvas / DOM layout |
| Artifact | External image, broken PPT object, wrong slide size | Renderer or publisher |

Repairs stay within the responsible layer. A layout repair cannot rewrite content. Visual QA cannot change chart semantics; it returns `expression-review-required` when it suspects an expression problem.

## Deterministic expression gate

Block or return for review when:

- unordered categories are presented as time;
- a line has fewer than three ordered periods;
- a doughnut/pie/100% stack lacks a verified whole;
- a waterfall lacks additive contributions;
- a scatter has fewer than eight paired observations;
- dual axes compare incompatible units without an explicit rationale;
- actual and budget are styled as ordinary peers;
- process, hierarchy, role, or architecture data is routed as a chart;
- a lookup table is mechanically charted and loses exact values;
- categories, series, units, signs, zero, targets, or key values disappear.
- relationship intent has no explicit diagram/image structure;
- an evidence-based conclusion is supported only by text/cards or an undifferentiated table;
- a long detail table states key drivers in the title but provides no visual summary;
- a content slide after the first lacks a narrative transition.

## Visual and artifact gate

Render every delivered slide. Check readability, hierarchy, sparse/crowded composition, labels, tables, diagrams, image crop, semantic colors, and overall rhythm. Also check 16:9 size, native editable tables/charts/diagrams, embedded media, no external relationships, no visible audit metadata, no headers/footers/page numbers, no severe auto-shrink, no unintended overlap, and no out-of-bounds objects.

Before compilation, the DOM gate verifies a 1920×1080 canvas, font readiness, image readiness, unique module identity, actual painted-bounds occupancy, text overflow, role-specific font floors, and canvas bounds. After compilation, the artifact gate rejects full-slide images, non-native semantic tables/diagrams, missing media, external relationships, unapproved fonts, and any `shrinkText`/automatic fit. The parity gate compares the internal canvas render with the PPT render using perceptual difference and non-background coverage; either failure blocks success. Final release also requires a render made by Microsoft PowerPoint on the target platform; Artifact Tool rendering is a preliminary cross-platform gate, not a substitute for PowerPoint.

Before rendering, require 100% source-unit disposition and real-font text fit at the minimum readable size. Automatic shrink is forbidden. Ordinary pages with low real-content occupancy fail unless the IR explicitly identifies intentional whitespace for a hero/section purpose.

Source coverage has two distinct gates:

- disposition completeness: every unit has a deterministic destination or approved omission;
- visible decision completeness: every `required-visible` and `supporting-visible` unit is visible in the body. Notes-only placement passes only for `traceability` units. Appendix placement passes only when the task card explicitly authorizes appendices.
- visible fact reality: every required/supporting unit has a `visibleFacts` mapping whose declared text is present in that module's rendered title, body, metric, chart data, or table data. A source ID attached to an otherwise empty/abbreviated carrier fails.

Additional deterministic blockers:

- `APPENDIX_FORBIDDEN`: appendix content exists without explicit authorization.
- `GENERIC_CONTEXT_OVERUSE`: repeated generic background/core-evidence bands replace real hierarchy.
- `REDUNDANT_CARRIER` / `EVIDENCE_DUPLICATION`: one fact or dataset is repeated without a distinct declared purpose.
- `DOMINANT_ARTIFACT_TOO_SMALL`: the primary image/chart/diagram/table is subordinated to support boxes.
- `TEXT_FRAME_MISMATCH` / `TYPOGRAPHY_MINIMUM`: frame allocation and readable type do not match content demand.
- `VISUAL_HIERARCHY_FLAT`: no single P0 focus and subordinate P1/P2 evidence.
- `CONCLUSION_NOT_VISUALLY_ENCODED`: the claim names a focus/rank/gap but the visual does not highlight it.
- `LAYOUT_PATTERN_OVERUSE`: four consecutive content pages use the same geometry variant without necessity.
- `OUTLINE_FRAGMENTATION` / `OUTLINE_ADJACENT_PAGES_CAN_MERGE`: an outline item was split into more pages than readable capacity requires.
- `OUTLINE_SPLIT_UNJUSTIFIED`: a continuation page lacks a natural evidence/business boundary.
- `CHART_DOMINANCE_FORBIDDEN`: a chart was assigned P0 or allowed to replace the page's written claim/evidence/meaning chain.
- `CHART_WITHOUT_VISIBLE_ARGUMENT`: a chart lacks at least two substantive non-chart carriers.

Every content slide must provide a Page Evidence Bundle, and every bundle item must appear in a visible module. Primary bundle evidence must be rendered through a `primaryEvidence` module. A slide cannot pass merely because its evidence IDs exist in notes.

The consolidation gate evaluates Visual Occupancy, Information Density, and Story Completeness separately. It fails a single dominant chart/table/image when the supporting evidence and meaning chain are insufficient. Adjacent pages in the same story chain or decision unit may be merged even when their allocated artifact rectangles are large; area alone cannot block consolidation. Fix by regrouping the full evidence system, not by enlarging empty cards, padding tables, or deleting source content.

For complex chapters with at least six content pages, run `STANDARD_OVERUSE` and `COMPOSITE_COVERAGE`. If standard pages exceed the threshold or no composite grammar was actually applied, rerun the deterministic classifier in strict mode without a new model call. Remaining failures block publication.

Version gates reject stale task cards. IR upgrades preserve source facts/data/media but clear historical composition, geometry, layout, split decisions, data shape, expression, and component routing before current classifiers run.

For ordinary position/style edits, recheck affected slides. For split, merge, add, delete, reorder, title, or conclusion changes, recheck previous/current/next slides and the full title chain. Finish with one chapter thumbnail scan.

Passing geometry checks does not prove factual completeness or good expression. Passing source coverage does not prove a readable page.
