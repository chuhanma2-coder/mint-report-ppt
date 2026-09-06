# Quality gates

## Design-director execution (local development contract)

Require the reviewed source-bound `designBriefs` and executable `directorPlan` before building. Reject generic theses, missing first focus or metric emphasis, expression mismatches, flat hierarchy, table defaulting, equivalent alternatives, context-only standalone pages, unproved body theses and unjustified whitespace. Verify complete carrier/region/expression/P0-P2 bindings through measured DOM and native PPT objects. A complete candidate that fits must not be split. Failed full-content attempts must test at least two genuinely different complete Director topologies, not just compact wrappers. `user-fixed` topology is preserved, and hard single-page conflicts block instead of secretly relaxing requirements.

The independent executive input contains source facts, claims, Director Plans, final page renders, chapter thumbnails and hard criteria, but excludes generator self-explanation. The review form includes per-brief `firstFocusObserved`, `visualPurposeObserved`, and `compositionObserved`, the actual first focus and nine Golden Design scores, plus status `accepted` only after rendering. Every page requires 85/100 and the chapter average requires 90/100. These are actual observations, not instructions copied from the brief. For each continued story, cite failed complete measured candidates covering the adjacent pages. Successful, duplicate, partial or unrelated attempts cannot justify a split. Different decision IDs inside the same design brief are not evidence of independence. The design execution receipt is bound to the PPT hash. It does not replace human visual review or prove a percentage match to the mentor.

## Human Presentation Copy (rc.6)

In addition to source/technical/design requirements, every actual rendered page must pass all ten checks in `presentation-copy.md`. The build emits a pending form, not an automatic approval. Unreviewed or failed prose blocks DESIGN PASS in `audit-design-delivery.mjs`. Review source-supported meaning and audience wording separately: no Markdown serialization, design-keyword leakage, gratuitous bilingual tags or repeated metric dumps. The native PPT text is checked again so a clean IR alone cannot approve a dirty artifact.

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

Before rendering, require 100% source-unit disposition and real-font text fit at the minimum readable size. Automatic shrink is forbidden. Low real-content occupancy triggers full Decision System, proximity and merge review, not a demand to invent content or inflate containers. Genuinely sparse source material may remain sparse when its complete meaning is visible; area alone cannot prove a design pass or failure.

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
- A chart may carry P0 evidence when the claim genuinely depends on that visual relation. It cannot replace the claim/evidence/meaning chain or receive a large empty frame merely to fill area. There is no minimum non-chart carrier count.

Every content slide must provide a Page Evidence Bundle, and every bundle item must appear in a visible module. Primary bundle evidence must be rendered through a `primaryEvidence` module. A slide cannot pass merely because its evidence IDs exist in notes.

The consolidation gate evaluates Visual Occupancy, Information Density, and Story Completeness separately. It fails a single dominant chart/table/image when the supporting evidence and meaning chain are insufficient. Adjacent pages in the same story chain or decision unit may be merged even when their allocated artifact rectangles are large; area alone cannot block consolidation. Fix by regrouping the full evidence system, not by enlarging empty cards, padding tables, or deleting source content.

For complex chapters with at least six content pages, run `STANDARD_OVERUSE` and `COMPOSITE_COVERAGE`. If standard pages exceed the threshold or no composite grammar was actually applied, rerun the deterministic classifier in strict mode without a new model call. Remaining failures block publication.

Version gates reject stale task cards. IR upgrades preserve source facts/data/media but clear historical composition, geometry, layout, split decisions, data shape, expression, and component routing before current classifiers run.

For ordinary position/style edits, recheck affected slides. For split, merge, add, delete, reorder, title, or conclusion changes, recheck previous/current/next slides and the full title chain. Finish with one chapter thumbnail scan.

Passing geometry checks does not prove factual completeness or good expression. Passing source coverage does not prove a readable page.

## rc.5 acceptance boundaries

Read `rc5-planning.md` for canonical source IDs, claim support, semantic obligations and Scene Plan. Review both slides and complete Decision Systems. First focus, body/title support, hierarchy, reading order, whitespace, carrier suitability, relationship fidelity and semantic proximity require actual rendered inspection. Chapter review additionally checks fragmentation, risk/response separation, supporting evidence promoted into a separate story, merge opportunities, title chain and page-count justification.

Report TECHNICAL, CONTENT, UNDERSTANDING, DESIGN and TARGET PLATFORM separately. An empty explicit design ledger has recall `null`, not 100%; grounded semantic obligations still apply. A reviewed claim record is not an automatic proof of free-text entailment. No stale review, uninspected rendering or synthetic fixture success may be reported as executive or Windows acceptance.

## Design execution and executive review

Validate the Design Requirement Ledger before generation; verify hard requirements on measured Canvas and exported native objects. Require 100% hard recall. Unknown hard requirements block instead of disappearing. Native shape names are implementation bindings, not business visibility proof; final fact checks and rendered review remain mandatory. Verify interval bounds, dependency direction, parallel lanes and explicit page/image/focus/table requirements.

Executive Visual QA checks firstFocus, bodyProvesTitle, relationships, space, carrierSuitability, hierarchy and readingOrder for every rendered page. It must use the generated clean review input in an independent context, declare that generator explanations were not used, and record issues with their responsible layer. Pending, self-context, or stale review is not a pass. The delivery audit binds review to the current PPT hash; changes invalidate that review. No visual model may alter numbers, delete facts, change chart semantics or manufacture coordinates.

The current delivery gate also rehashes the frozen sources, runtime, IR, audit sidecars and page snapshots. A separate reviewer records a host receipt after actual full-resolution image results appear in its transcript; generated declarations and path mentions cannot substitute. Checks use the receipt's fixed transcript prefix, not later appended observations. Any source/runtime/render/QA mutation invalidates design approval. Review-required metadata inside a generated PPT prevents sidecar deletion from turning it into an approved final. After an explicit human-edit handoff, `audit-final-ppt --human-edited-final` audits the actual final file without restoring old IR; that technical audit never claims the old design approval still applies.

Composition fallback does not override a supported Planner narrative. Hard requirements survive fallback. Visual rhythm is assessed over the chapter, not through mandatory template rotation. Record low-content whitespace for review instead of stretching empty frames to satisfy area thresholds.
