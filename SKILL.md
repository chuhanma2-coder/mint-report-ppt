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
- Users do not need to optimize their prompt. Internally, finish a reviewed design-director brief before authoring the IR; see `references/design-intent.md`. For solo work without a task card, create the required internal card and continue in the same task; for parallel owners, use one shared coordinator card. Resolve explicit owner/scope without requiring the user to type section IDs.
- Do not expose a draft HTML workfile, embed ZIPs, sync PPT edits back to IR, or implement PDF export. The build may create a temporary internal 1920×1080 Design Canvas solely for browser layout and verification; users receive the native PPTX, not that internal canvas.

## Required pipeline

1. Read supplied material and create the deterministic Canonical Source Ledger before Planner. Raw structure fixes source IDs and the denominator; prompts, inferred claims and design instructions do not redefine it. See `references/rc5-planning.md` for input adapters and limitations.
2. Design stage: produce the source/evidence model, Execution Brief, complete Decision Systems and Design Requirement Ledger, then reviewed `designBriefs` covering whole stories before pagination. Each brief includes an executable `directorPlan`: five-second message, visual thesis, observed-first-focus target, complete band composition, a materially different complete alternative for non-simple stories, carrier/region/expression/P0-P2 bindings, metric emphasis, semantic colors, body proof, copy budget and whitespace intent. Generic prose, table defaulting, flat hierarchy, context-only pages and equivalent alternatives block before PPT generation. Normalize explicit user decisions rather than inventing replacements. Default `preflightMode=auto`; `preview` returns the validated brief without PPT; `off` skips interaction, never design/source/claim gates. No extra Agent.
3. Authoring stage: consume that brief to build Page Evidence Bundles, human `displayCopy` and light Slide IR. Preserve all required/supporting facts, claim support and reviewed relationships. Bind carrier IDs and metric targets back to the brief. Related Decision Systems in one brief are tried together before splitting; unrelated stories and formal sections stay separate. Outline items fix ownership/order, not page boundaries. Explicit single-page requirements block when capacity fails. No coordinates, font sizes, color values, CSS or PowerPoint code in IR.
4. Run Composition Validator/Fallback and Expression Router. Validate proposed narrative relationships against grounded nodes, edges, ranges and lanes; keep valid intent rather than overriding it by module counts. Invalid proposals fall back deterministically, but cannot silently discard hard requirements. Compute dataShape from data.
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
- `references/design-intent.md` before planning, authoring new visual primitives, or using a style reference.
- `references/presentation-copy.md` before writing or reviewing visible text: explicit displayCopy, source-component review and Human Presentation Copy gate.

Read `references/readability-repair.md` before generation or upgrading an old source model; it defines the current raw-source anchors, reviewed fact components and measured pagination contract.

## Non-negotiable contracts

- Presentation Copy: Raw Source alone supplies facts. In the authoring stage, author every module's `displayCopy` for human readers, separate from raw text and design instructions. Do not serialize fields, print visual keywords or join attributes with pipes. Preserve all factual components, not every original sentence. Chinese-first with reviewed proper-name/necessary/user-requested English exceptions. Canvas and PPT consume the same reviewed copy. Human Presentation Copy must pass before DESIGN acceptance; see its reference for the versioned contract.
- Visible source completeness: every supplied fact is allocated to and actually rendered by a visible body module by default. Decision-critical units are `required-visible`; supporting detail is `supporting-visible`; only `traceability` material may live solely in notes. Appendices are forbidden unless the task card explicitly sets `allowAppendix: true`. Without that authorization, extra detail becomes a normal body page. Any omission requires explicit user approval and a reason. `build-section-ppt` writes both a destination ledger and a visible-fact ledger; source IDs attached to a module do not prove that their content is visible. Never delete evidence to fit a slide.
- Aggregation is not summarization: consolidation may reorganize and visually downgrade information, never remove unique facts, caveats, risks, actions or cases. A Decision System may contain multiple related judgments, evidence and responses; neither one sentence nor one carrier defines a page.
- DOMAIN-AGNOSTIC: business entities, owners and test names never select pagination, routing, composition, hierarchy or color. Design decisions use management intent, factual roles, supported relationships and measured readability.
- Page evidence: every content slide declares `outlineItem`, `storyCluster`, `decisionUnit`, and a Page Evidence Bundle. Every bundled fact maps to a visible module. Validated Planner visual narratives lead composition; information-unit classification is the fallback, never permission to erase a grounded relationship.
- Evidence allocation: one source fact has one primary visible carrier. A second carrier is allowed only when it serves a different declared `carrierPurpose` and includes `reinforcementReason`. Never repeat the same dataset as chart, table, and prose. Never auto-create a generic `关键背景` band; place context in the title, a KPI, an annotation, a compact boundary strip, or a normal evidence module only when it contributes unique information.
- Outline integrity: preserve section identity and outline order through every page. A work package selects all sections for the owner unless the user explicitly selects a subset. Never invent an aggregate section ID. Same-decision adjacent content is measured together; natural continuation records its reason and source boundary. Do not fragment independent sentences into pages or merge unrelated decisions to fill space.
- Visual hierarchy: make the main judgment/fact clear, with P1 proof and P2 detail where present. No fixed P1 count or mandatory three-level containers. Charts/tables are not automatically page-dominant; relationships and profile internals follow supported intent. A sparse page must not acquire invented filler.
- Readability: body text is normally 17–20pt and never below 16pt; supporting text is 15–17pt; chart axes/categories are 15–18pt; chart values 16–19pt; table text 14–16pt; diagram nodes 15–18pt and edge labels 13–15pt. Use the shared role floor; attempt duplicate/container/proximity/internal-structure/share repairs and bounded whole-system candidates before a measured natural split. Never use shrink-to-fit.
- Version isolation: source facts, data, and media may survive an upgrade. Historical `pageComposition`, geometry, layout, split/merge decisions, data shape, expressions, and component routing may not. Recompute them with the installed planning and IR versions; stale task cards must be regenerated.
- No invention: do not browse for business facts unless asked; label missing or conflicting information.
- Expression: choose by management question, semantic intent, and computed data shape. Router choices are candidates, not mechanical one-to-one mappings.
- Layout: the Layout Engine cannot silently change the selected expression. Renderer cannot change content or semantics.
- Evidence hierarchy: every content-slide claim must have a visible primary proof. Relationship intent requires a real diagram/image; comparison, trend, variance, contribution, ranking, composition, or matrix intent cannot be delivered as text/cards or an undifferentiated table alone.
- Management questions are internal planning fields and hidden by default. Show one only when it materially helps the audience.
- Text fit is measured with the actual CJK font before rendering. The renderer uses the selected readable font size with no automatic shrink. If title, body, label, or table cannot fit above its role-specific minimum, change geometry, consolidate/split by management conclusion, or block delivery.
- Chart legibility: chart axes, legends, category labels, and data labels use the chart typography tokens. They must remain readable at normal presentation distance; a dense chart must be regrouped or split instead of reducing labels below the configured minimum.
- Native editability: formal text, tables, charts, images, and required diagrams are native PowerPoint objects. Full-slide screenshots are forbidden in working PPTX files.
- Design-canvas compiler: the browser owns final layout measurement; the native compiler owns PowerPoint objects. Regular charts remain native charts. Known negative-category-axis and close-line-label compatibility failures use the same measured expression as editable shapes, with the reason recorded in build diagnostics; these shape charts require manual object edits rather than native chart-data editing. Complex charts also use editable shapes. Tables remain native tables, diagrams remain shapes/connectors, and images are embedded. Unsupported semantic objects block instead of being rasterized or silently simplified.
- Painted-bounds QA: occupancy is calculated from visible DOM paint bounds, not assigned rectangles. HTML/PPT visual parity and native PowerPoint render verification are release gates; a structural audit alone cannot approve a deck.
- Clean pages: 16:9, no visible task IDs, hashes, outline numbers, source-unit IDs, headers, footers, or page numbers.
- Images must be embedded. Charts preserve categories, series, units, signs, targets, and axis meaning.
- QA issues return only to their owner layer: content → source/planner; expression → router; composition/layout → Design Canvas; artifact → renderer/publisher.
- Hard design requirements and every Director binding must be proven in measured Canvas and final native objects. Executive Visual QA uses a separate input containing source facts, claims, Director Plans and final renders but no generator self-explanation. Every page needs a Golden Design score of at least 85 and the chapter average at least 90. Technical candidate pass does not authorize delivery; final audit rejects missing or stale design-delivery approval.
- Visual QA may request `expression-review-required`; it may not directly replace one chart type with another.

## Authority lifecycle

- Before first PPTX: raw inputs and their Canonical Source Ledger are factual authority; source model, Execution Brief and Slide IR are reviewed generation structures, never replacement sources.
- After first PPTX: the PPTX is the sole human work authority. Do not regenerate it from stale IR.
- Final publication: HTML is a read-only artifact generated from the actual final PPTX; it does not become an editing source.

## Speed contract

Use one source pass, a design stage followed by an authoring stage, one deterministic allocation/routing/layout/render pass, one visual review, and one batch repair. The host Agent performs the two stages in order; these scripts do not invoke or switch models. A host that exposes separate inference calls may budget one report-level design call, never per-page calls or another Agent. Record actual timing rather than assuming zero extra reasoning cost. Large detail tables remain in body pages unless an appendix was authorized. Do not combine chart + table + explanation mechanically. Check affected slides after ordinary edits; check neighbors and title chain after pagination/order/title changes. Merge uses zero model calls and does not re-layout.
