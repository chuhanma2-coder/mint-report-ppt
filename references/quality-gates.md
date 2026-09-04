# Quality gates

## Ownership and rollback

| Class | Examples | Return to |
|---|---|---|
| Content | Missing evidence, wrong number, unsupported title | Source model or planner |
| Expression | False trend, false whole, process drawn as chart | Expression Router |
| Layout | Sparse page, overlap, clipped label, crossing connector | Geometry Engine |
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

Before rendering, require 100% source-unit disposition and real-font text fit at the minimum readable size. Automatic shrink is forbidden. Ordinary pages with low real-content occupancy fail unless the IR explicitly identifies intentional whitespace for a hero/section purpose.

Source coverage has two distinct gates:

- disposition completeness: every unit has a deterministic destination or approved omission;
- visible decision completeness: every `required-visible` unit is visible in the body, and every `supporting-visible` unit is visible in the body or appendix. Notes-only placement passes only for `traceability` units.

Every content slide must provide a Page Evidence Bundle, and every bundle item must appear in a visible module. Primary bundle evidence must be rendered through a `primaryEvidence` module. A slide cannot pass merely because its evidence IDs exist in notes.

The consolidation gate fails evidence-rich pages with fewer than five visible modules or ten effective information units. It also fails adjacent low-density pages in the same story cluster/outline item when they can fit together and neither supports an independent management decision. Fix by regrouping the full evidence system, not by enlarging empty cards, padding tables, or deleting source content.

For ordinary position/style edits, recheck affected slides. For split, merge, add, delete, reorder, title, or conclusion changes, recheck previous/current/next slides and the full title chain. Finish with one chapter thumbnail scan.

Passing geometry checks does not prove factual completeness or good expression. Passing source coverage does not prove a readable page.
