# Design and layout

The production layout authority is the internal 1920×1080 HTML Design Canvas. Its CSS grid/flex composition is measured in a real browser after fonts and images finish loading. The legacy numeric Geometry Engine is retired from the build path and remains only for compatibility tests. Composition controls placement and spacing, never semantics.

## Capacity and consolidation

Preserve task-card outline ownership and order, then plan management stories. Adjacent outline content may share a page when it supports the same decision. An outline may contain independent stories, but do not split individual sentences into pages. Within a story, browser-measured capacity selects natural evidence/business boundaries. Every continuation records its reason and provenance; explicit single-page requirements block instead of silently splitting.

Aggregation is not summarization. Consolidation changes hierarchy and placement; it does not delete facts. First assemble a Page Evidence Bundle containing context, primary proof, supporting proof, cases, risks, actions, and boundaries. Then map every item to a visible module before choosing geometry.

The Planner proposes visualNarrative; Composition Validator accepts grounded relationships or falls back to information-unit/evidence classification. It does not accept raw coordinates or a self-declared pageComposition. See `design-intent.md` for supported patterns. A valid parallel story is not overwritten because it has only two modules.

Use the derived `pageComposition` to choose composition density without inventing new geometry families:

- `standard`: one primary expression plus limited support;
- `evidence-rich`: a lead band, primary-evidence band, and result/action band; do not fabricate modules to meet a count;
- `dashboard`: metrics lead, aligned comparisons in the middle, decision/action at the bottom;
- `banded-story`: context → proof → implication in three bands;
- `strategy-map`: resources/capabilities → operating paths → results/actions.

Each band may contain at most four modules. Modules in a band share horizontal space, while the three bands receive different vertical weight. Do not create a uniform card grid for unequal evidence.

Capacity order: change geometry; rebalance module shares; use the compact variant; move secondary evidence to a support area or a normal body detail page; split only on an independent management conclusion. Appendices are forbidden unless the task card explicitly authorizes them. Never delete evidence or shrink without limit.

Track three independent diagnostics: Visual Occupancy, Information Density, and Story Completeness. Occupancy is diagnostic, not a fill target. Standard pages below 55% and explicitly dense pages below 65% fail for consolidation review; composite classification does not raise the visual-area target by itself because its information-density and story-completeness gates are checked separately. A single large image, chart, or table is not high-density merely because it occupies most of the canvas; it must also provide enough supporting evidence and a complete Claim/Evidence/Meaning chain. Inspect one-point pagination, undersized visuals, and short tables without interpretation. Above 92%, inspect crowding and auto-shrink. Do not stretch empty cards/tables or add decoration to improve the ratio. Hero, cover, section, and closing slides may intentionally use more whitespace.

Adjacent content supporting the same decision is measured together, including across outline boundaries within the same formal section. Independent stories may remain distinct. Preserve outlineItems and original section identity on each output page. No table, image, chart or fixed module count determines the page boundary by itself.

The browser measures final wrapped text with the configured CJK font and calculates occupancy from the union of actually painted DOM bounds, not allocated rectangles. Equal-area cards are allowed only for genuinely equal semantic weight. A headline number, written management conclusion, or source image may dominate. Charts, tables, and diagrams default to supporting regions; they do not grow merely because a page has little text. The compiler uses `autoFit=none`; unresolved DOM or PowerPoint overflow blocks delivery.

## Design Canvas and native compilation

The internal canvas must expose semantic DOM markers for title, question, module kind, module role, P0/P1/P2 priority, table/chart/diagram data, and evidence identity. After `document.fonts.ready`, all images decode, and `renderReady=true`, extract each final DOM rectangle and computed font size. Compile those measurements as follows: text to native text boxes; panels and rules to shapes; semantic tables to native PowerPoint tables; ordinary charts to native PowerPoint charts; complex charts to editable shapes; diagrams to native nodes/connectors; images to embedded media. Never compile the full slide as a screenshot. Missing, duplicated, unsupported, overflowing, or out-of-bounds semantic objects block output.

## Typography

| Role | Candidate range |
|---|---:|
| Cover title | 32–46pt |
| Section title | 30–40pt |
| Standard content title | 26–34pt |
| Dense title | 22–30pt |
| Core metric | 28–44pt |
| Body | 17–20pt; 16pt absolute floor |
| Supporting body | 15–17pt |
| Chart axis/category | 15–18pt |
| Chart value | 16–19pt |
| Table | 14–16pt |
| Diagram node | 15–18pt |
| Diagram edge | 13–15pt |
| Caption | 10–12pt |

Choose within the range using role, text length, language, available width, and reading distance. Keep titles to one or two lines. If the lower bound still fails, change geometry or split at an independent conclusion. Do not use PowerPoint shrink-to-fit as a capacity strategy. Default to no more than four primary size levels; captions and necessary labels are excluded.

## Dominant artifact and support rail

When one source image is the main proof and the remaining modules explain it, use an internal `primary-rail` variant: 55–65% for the image on the left and 35–45% for smaller support modules stacked vertically on the right. Charts receive their measured readable size; there is no fixed width cap. Preserve room for the complete outline argument. Short tables use only the height required by their rows and never stretch to fill the canvas. Do not divide width equally by module count.

Use a clear P0 focus and subordinate P1/P2 information where the source supports them; do not impose a minimum or maximum carrier count. Occupancy is an anomaly signal, not a reason to inflate empty cards. Repeated geometry is acceptable only when it remains the best expression; four consecutive identical variants trigger review.

`managementQuestion` is hidden by default. It may be shown only when the question itself improves the audience's understanding; never repeat a gray question line mechanically on every slide.

## Writing

Use direct, natural management language. Keep the source meaning, unit, comparison, and uncertainty. Prefer a plain topic title for setup/process pages and a supported takeaway title only when evidence establishes one. Remove slogans, vague abstractions, forced three-part lists, ornamental punctuation, presenter instructions, and commentary about making the deck. Do not turn every title into an imperative or “not X, but Y” construction. Never shorten away a caveat that changes the decision.

## Visual system

Use Mint Fresh 2 tokens. Favor a clear composition over a grid of UI cards. Cards should group meaning, not fill space. Use flat canvas structure, restrained borders, and semantic emphasis. Ordinary pages should not use large dark-green backgrounds. Text contrast must meet 4.5:1, or 3:1 for large text. Page rhythm is a soft check; repeated geometry is acceptable when it is the clearest expression.

Diagram code owns placement, routing, alignment, spacing, and wrapping. The content model owns nodes, edges, roles, groups, and direction. Networks above ten nodes must be grouped, layered, or split.
