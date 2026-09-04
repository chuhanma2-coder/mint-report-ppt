# Design and layout

Use eight geometry skeletons only: `hero`, `single-primary`, `primary-secondary`, `balanced-columns`, `grid`, `sequence`, `matrix`, and `network`. Geometry controls rectangles and spacing, never semantics.

## Capacity and consolidation

Before adding a slide, ask whether the candidate content contributes to the same complete management conclusion, continues the same business chain, explains the previous evidence, or would naturally become one module if its title disappeared. If yes, consolidate it first. “One management issue = one page” is forbidden. A page may hold one conclusion, three to five primary modules, and several lightweight facts when hierarchy remains readable.

Aggregation is not summarization. Consolidation changes hierarchy and placement; it does not delete facts. First assemble a Page Evidence Bundle containing context, primary proof, supporting proof, cases, risks, actions, and boundaries. Then map every item to a visible module before choosing geometry.

The Agent does not select `pageComposition`. The deterministic Composition Classifier derives it from information-unit count, evidence-group count, evidence diversity, and the page decision unit. A complex evidence system must be upgraded from `standard` even when only two top-level modules were authored.

Use the derived `pageComposition` to choose composition density without inventing new geometry families:

- `standard`: one primary expression plus limited support;
- `evidence-rich`: a lead band, primary-evidence band, and result/action band; at least five visible modules and ten effective information units;
- `dashboard`: metrics lead, aligned comparisons in the middle, decision/action at the bottom;
- `banded-story`: context → proof → implication in three bands;
- `strategy-map`: resources/capabilities → operating paths → results/actions.

Each band may contain at most four modules. Modules in a band share horizontal space, while the three bands receive different vertical weight. Do not create a uniform card grid for unequal evidence.

Capacity order: change geometry; rebalance module shares; use the compact variant; move secondary evidence to a support area or a normal body detail page; split only on an independent management conclusion. Appendices are forbidden unless the task card explicitly authorizes them. Never delete evidence or shrink without limit.

Track three independent diagnostics: Visual Occupancy, Information Density, and Story Completeness. Occupancy is diagnostic, not a fill target. Standard pages below 55% and explicitly dense pages below 65% fail for consolidation review; composite classification does not raise the visual-area target by itself because its information-density and story-completeness gates are checked separately. A single large image, chart, or table is not high-density merely because it occupies most of the canvas; it must also provide enough supporting evidence and a complete Claim/Evidence/Meaning chain. Inspect one-point pagination, undersized visuals, and short tables without interpretation. Above 92%, inspect crowding and auto-shrink. Do not stretch empty cards/tables or add decoration to improve the ratio. Hero, cover, section, and closing slides may intentionally use more whitespace.

Adjacent low-density pages in the same `storyCluster` or outline item must merge unless either page carries a genuinely independent management decision. `independentDecision` is not a manual escape hatch: the title and evidence must support a different decision.

The engine measures real text with the configured CJK font before rendering and calculates real-content occupancy from measured text/table/visual demand, not allocated rectangles. Equal-area cards are allowed only for genuinely equal semantic weight. A headline number, primary chart, or relationship diagram receives the dominant area; boundaries and caveats receive a smaller support area. The renderer uses `autoFit=none`; unresolved overflow blocks delivery.

## Typography

| Role | Candidate range |
|---|---:|
| Cover title | 32–46pt |
| Section title | 30–40pt |
| Standard content title | 26–34pt |
| Dense title | 22–30pt |
| Core metric | 28–44pt |
| Body | 14–18pt |
| Dense supporting body | 13–16pt |
| Body | 17–20pt; 16pt absolute floor |
| Supporting body | 15–17pt |
| Chart axis/category | 15–18pt |
| Chart value | 16–19pt |
| Table | 14–16pt |
| Diagram node | 15–18pt |
| Diagram edge | 13–15pt |
| Chart axis/category/value label | 13.5–15pt (18–20px in native chart API) |
| Caption | 10–12pt |

Choose within the range using role, text length, language, available width, and reading distance. Keep titles to one or two lines. If the lower bound still fails, change geometry or split at an independent conclusion. Do not use PowerPoint shrink-to-fit as a capacity strategy. Default to no more than four primary size levels; captions and necessary labels are excluded.

## Dominant artifact and support rail

When one source image, chart, diagram, or primary table is the main proof and the remaining modules explain it, use an internal `primary-rail` variant: 55–65% for the dominant artifact on the left, 35–45% for smaller support modules stacked vertically on the right, and an optional 12–18% decision/action strip below. Do not divide width equally by module count.

Every page has one P0 object, one or two P1 objects, and subordinate P2 context. Occupancy is an anomaly signal, not a reason to inflate empty cards. Repeated geometry is acceptable only when it remains the best expression; four consecutive identical variants trigger review.

`managementQuestion` is hidden by default. It may be shown only when the question itself improves the audience's understanding; never repeat a gray question line mechanically on every slide.

## Writing

Use direct, natural management language. Keep the source meaning, unit, comparison, and uncertainty. Prefer a plain topic title for setup/process pages and a supported takeaway title only when evidence establishes one. Remove slogans, vague abstractions, forced three-part lists, ornamental punctuation, presenter instructions, and commentary about making the deck. Do not turn every title into an imperative or “not X, but Y” construction. Never shorten away a caveat that changes the decision.

## Visual system

Use Mint Fresh 2 tokens. Favor a clear composition over a grid of UI cards. Cards should group meaning, not fill space. Use flat canvas structure, restrained borders, and semantic emphasis. Ordinary pages should not use large dark-green backgrounds. Text contrast must meet 4.5:1, or 3:1 for large text. Page rhythm is a soft check; repeated geometry is acceptable when it is the clearest expression.

Diagram code owns placement, routing, alignment, spacing, and wrapping. The content model owns nodes, edges, roles, groups, and direction. Networks above ten nodes must be grouped, layered, or split.
