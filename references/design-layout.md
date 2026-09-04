# Design and layout

Use eight geometry skeletons only: `hero`, `single-primary`, `primary-secondary`, `balanced-columns`, `grid`, `sequence`, `matrix`, and `network`. Geometry controls rectangles and spacing, never semantics.

## Capacity and consolidation

Before adding a slide, ask whether the candidate content answers the same management question, continues the same business chain, explains the previous evidence, or would naturally become one module if its title disappeared. If yes, consolidate it first. A slide may hold one conclusion, three to five primary modules, and several lightweight facts when hierarchy remains readable.

Capacity order: change geometry; rebalance module shares; use the compact variant; move secondary evidence to a support area or appendix; split only on an independent management conclusion. Never delete evidence or shrink without limit.

Occupancy is diagnostic, not a fill target. Below 55% on ordinary content slides, inspect one-point pagination, undersized visuals, and short tables without interpretation. Above 92%, inspect crowding and auto-shrink. Do not stretch empty cards/tables or add decoration to improve the ratio. Hero, cover, section, and closing slides may intentionally use more whitespace.

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
| Table/chart label | 11–14pt |
| Caption | 10–12pt |

Choose within the range using role, text length, language, available width, and reading distance. Reserve 13pt for supporting information. Keep titles to one or two lines. If the lower bound still fails, rewrite without changing meaning or change the page structure. Default to no more than four primary size levels; captions, labels, and necessary table sizes are excluded.

`managementQuestion` is hidden by default. It may be shown only when the question itself improves the audience's understanding; never repeat a gray question line mechanically on every slide.

## Writing

Use direct, natural management language. Keep the source meaning, unit, comparison, and uncertainty. Prefer a plain topic title for setup/process pages and a supported takeaway title only when evidence establishes one. Remove slogans, vague abstractions, forced three-part lists, ornamental punctuation, presenter instructions, and commentary about making the deck. Do not turn every title into an imperative or “not X, but Y” construction. Never shorten away a caveat that changes the decision.

## Visual system

Use Mint Fresh 2 tokens. Favor a clear composition over a grid of UI cards. Cards should group meaning, not fill space. Use flat canvas structure, restrained borders, and semantic emphasis. Ordinary pages should not use large dark-green backgrounds. Text contrast must meet 4.5:1, or 3:1 for large text. Page rhythm is a soft check; repeated geometry is acceptable when it is the clearest expression.

Diagram code owns placement, routing, alignment, spacing, and wrapping. The content model owns nodes, edges, roles, groups, and direction. Networks above ten nodes must be grouped, layered, or split.
