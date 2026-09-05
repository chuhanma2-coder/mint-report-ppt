# Readability repair contract (candidate implementation)

## Outline before slides

One task-card outline item is one complete page attempt. Supply stable module IDs and coherent `evidenceGroup` names; dependent evidence and its conditions share the same group. The browser measures a complete outline using standard layouts, then compact layouts at the existing font floors. Only measured failure permits contiguous splitting between groups. More than three necessary parts requires reporting the measured requirement to the user. Never split a fact, erase a qualifier, move business detail to notes or fabricate filler.

`measuredComposition`, `measuredDensity`, `capacityProof`, `domModules` and old split decisions are disposable outputs, not Agent-authored inputs. The current browser run recomputes them. Candidate exploration shares one browser session and does not take screenshots; only the selected output is captured.

## Raw source and paraphrases

For DOCX inputs use `docxInventory()` from `scripts/lib/source-inventory.mjs` to enumerate text paragraphs (including table-cell paragraphs) and embedded images. Preserve the actual file hash in `sourceFiles`. Each source unit records `sourceAnchors: [{file, blockId, sha256}]` from that inventory. Every raw block must have a destination. An anchor is not proof that its entire meaning survived: review extraction against the actual original once, including headings, all numeric columns, currency, forecast/actual status and conditions.

The safe default is to retain the full original fact. A paraphrase needs `requiredComponents`, an array of strings or `{role,text,alternatives}` objects covering its complete meaning, and `componentReview: {status: "reviewed", sourceText: <unchanged original text>}`. This is a recorded semantic-review action, not an automatic claim by the matcher. Do not self-approve components without comparing against the source. Numeric and key qualifier checks run in addition to this review.

Keep `visibleFacts` mappings, but the presence of a short mapped phrase no longer covers an entire source unit. First check the source model; then check text actually rendered in the canvas and final PPT. Hidden metadata, image paths and captions naming a table do not prove the table's contents are visible.

Source images need `imageReview: {status: "reviewed", sha256, regions: [...]}` describing the information regions checked against the original. Never set reviewed from a matching byte hash alone. This record does not replace final rendered-image readability review. No automated OCR-completeness guarantee is claimed.

For a displayed image module, also supply `imageTextReview.regions` with each reviewed region's `text` and measured `minimumGlyphHeightPx` in the original image (`containsText:false` for a genuinely non-text region). DOM and final-PPT checks apply the actual displayed scale; a matching hash cannot excuse unreadable text. SVG source verification follows the SVG relationship, not its PNG compatibility fallback.

## Natural table boundaries and sparse first pages

If a long table has genuine business groups, supply `data.rowGroups: [{label,start,end}]` (zero-based, end exclusive) and `data.rowEvidenceRefs` aligned with every row. Groups must cover all rows exactly once in source order. The planner first measures the complete outline; only if it fails may these groups be separated, with headers, source maps and applicable reconciliation notes retained. Do not arbitrarily label every row a separate business group.

For equal minimum page counts, the measured partitioner prefers later natural breaks. It must not strand a short introduction on page 1 merely because that partition was found first. This is not a page-fill target and never permits enlarging empty frames or deleting facts.

An explicit user approval may be recorded in the task card as `outlinePageApprovals: [{outlineItem,approved:true,maxParts,reason}]`. Approval applies only to that outline; it does not change the default three-part approval threshold for other work.

Shared semantic colors distinguish metric text, module headings, risk headings and diagram actors. The same actor retains its color across relation rows; actual/target chart colors follow series meaning rather than input order. Canvas and PPT consume the same theme tokens. Do not apply report-specific color patches.

The candidate compares all feasible standard compositions before considering compact typography. Story bands put the P0 written conclusion first. A primary rail uses naturally stacked support; a primary-above candidate places support in a compact grid below the evidence. Candidate scoring penalizes internal holes without rewarding extension to the page bottom. Tables use measured natural widths as well as natural heights. Relation nodes have measured readable width minima and aligned connector sites. Original outline conclusions remain visible on the first part; subsequent titles name the actual evidence groups.

Page colors must support hierarchy rather than remain uniformly pale green. Use the shared role accents: blue for primary evidence, purple for supporting evidence/decisions, Mint for conclusions/actions, warm brown for comparisons/boundaries, and coral-red for risk. Keep dark readable body text and light page backgrounds. Do not require every page to contain every color. Final PPT text and table cells consume the measured colors; semantic accent bars remain native editable shapes. Test text contrast against both page and paper backgrounds.

Table input accepts separate `headers`/`rows` or an embedded header in `values`. Chart conversion retains the first data row and all numeric columns; missing or qualitative numeric cells block conversion instead of becoming zero. The caller must select a semantically valid carrier for those cells. Scatter eligibility counts complete paired observations, not the sum of values from two series.

## Tables, graphs and contradictions

Tables use measured column widths and natural row heights. Do not combine unrelated rows or multiple numeric columns into slash-separated strings. Input table type does not override ranking/change/comparison intent; set `semanticIntent: "lookup"` only for actual lookup purposes.

For a contradictory financial row preserve the source numbers and add `reconciliationNotes: [{row, sourceValue, calculatedValue, text}]`; the same text must appear in the table module's visible `text`, explicitly marked 待核 or 待确认. Row indexes are zero-based body indexes. Do not silently fix the number. Waterfall endpoints must reconcile before rendering.

Charts carry all series, signs and units. Six ordinary native variants have export/reopen/data-binding tests. Negative horizontal bars and close multi-series lines use the same expression's measured editable shapes to avoid known native-label failures; build diagnostics record the reason. Shape labels have per-object binding checks, not a whole-page keyword search. Native doughnut/stack labels use a white backing for readable contrast. Unsupported primitives block instead of silently becoming rectangles. No screenshot chart fallback is permitted.

Diagrams read the actual `edges` including `from`, `to`, `label`, and `condition`. Do not infer a flow from node order. Conditions must already be grounded in the source. Keep source-only nodes visible as well as connected nodes.

## Truthful delivery

Runtime hashes include scripts, schemas, assets and reference contracts. The changing acceptance record `implementation-status.md` is excluded, so recording a test result does not change executable identity. A build without a matching release fingerprint is marked modified-or-unverified. A candidate pass is not a release pass. Failed builds overwrite their success-status report so an older passed report cannot approve a new failed run.

The working PPT remains editable; final publication still reads the actual final PPT. Do not modify HTML Skill, Deck Skill, original materials or earlier PPT files during regression. Windows PowerPoint testing is independent of local artifact rendering. Record missing platform verification explicitly.
