# Design director execution contract (rc.6 development)

## One planning pass

Short and detailed prompts use the same design-then-authoring workflow. Read the whole source, establish the Presentation Brief, then finish the design decisions below before generating IR. A short prompt is not permission to default to tables. Detailed user decisions take precedence; do not expand them into duplicate slogans or new facts. No extra Agent or per-page model call. The scripts validate and execute the brief, but do not themselves call a model; never claim this deterministic step proves short-prompt reasoning quality.

## Reviewed design-director brief (local design development contract)

In `executionBrief.designBriefs`, describe each complete story BEFORE dividing it into pages. One story can cover adjacent related `decisionIds` in the same section. Explain why the evidence belongs together; do not merge unrelated topics just to save a page. Each brief contains the existing source-bound story fields plus a required executable `directorPlan`:

- `id`, `decisionIds`, canonical `sourceRefs`;
- `objective`, `fiveSecondMessage`, `takeaway`, `visualPurpose`: what the audience should understand, the source-supported leading claim and what the visual must demonstrate. `takeaway` binds the first selected content claim; layout cannot invent an unreviewed title;
- `carriers: [{moduleId,purpose,priority:"P0|P1|P2"}]`: every planned module, its distinct job and prominence;
- `scenePlan`: existing flow/regions/readingOrder grammar for the whole story, not pixels;
- `compositionPolicy`: `flexible` by default; `user-fixed` only for an explicit user composition that must not change;
- `directorPlan.fiveSecondMessage`, `visualThesis` and `expectedFirstFocus`: the concrete first-focus object and why it leads;
- `directorPlan.completeComposition`: coarse `banded` regions with percentage ranges, unequal column ratios and complete module references;
- `directorPlan.alternativeCompositions`: at least one materially different full topology for a non-simple story; changing only spacing or ratios does not count;
- `directorPlan.carrierBindings`: every module's expression, region, P0/P1/P2 priority, visual treatment and maximum copy lines;
- `directorPlan.metricEmphasis`, `semanticColors`, `bodyProof`, and `whitespaceIntent`: concrete DOM/native targets and proof, never printable instructions;
- up to two `alternatives`: genuinely different valid Scene Plans when the first is uncertain, preserving all source relationships;
- optional `metricEmphasis: [{moduleId,nodeId,field:"metric-0",priority:"P0"}]`; fields also support `primary-0`, `secondary-N`, `duration`;
- `copyGuidance`, `colorSemantics`, `avoid`: concrete audience wording, semantic emphasis and failure modes, never printable slide text.

Before IR authoring, review facts and design choices and set `designBriefReview={status:"reviewed",canonicalLedgerHash,designSha256}` using exported `designBriefHash(executionBrief)`. Run `preflight.mjs execution-brief.json canonical-ledger.json` as the design-stage checkpoint; only after reading its successful result continue to IR/displayCopy authoring, preserving IDs. It writes `execution-brief.json.preflight.json`; build consumes that sibling receipt or `--preflight=<receipt>`. Source, runtime or design changes invalidate it. Adding the authoring-stage `presentationCopyReview` does not: that review is separately checked against actual copy. This is a real host-model/tool boundary, not a request for users to write a longer prompt. The runtime has no standalone model API or model switcher. Hashes bind an actual review; computing a hash is not the review. The build rejects missing, stale, generic or unbound plans and emits internal `.design-brief.md` and `.director-preview.md` views from that same JSON contract, not a second independent prompt.

`visualTreatment` is a dispatch key, not prose. Use only `hero-metric`, `primary-visual`, `supporting-evidence`, `natural-table`, `inline-callout`, `context-note`. A hero-metric must bind the module that actually contains its P0 value; a conclusion strip without that value is not a hero metric. A natural-table must be a real table. All other design wishes stay in the brief; unknown treatment strings block rather than pretending to implement a style.

Preflight blockers include `GENERIC_DIRECTOR_PLAN`, `NO_VISUAL_FOCUS`, `EXPRESSION_BINDING_MISMATCH`, `FLAT_HIERARCHY`, `TABLE_DEFAULTING`, `EQUIVALENT_ALTERNATIVES`, `CONTEXT_ONLY_STANDALONE`, `UNPROVEN_VISUAL_THESIS`, and `UNINTENTIONAL_WHITESPACE`. Context-only facts join the next supported management story unless the user explicitly fixes that page. A table may be P0 only when precise lookup or reconciliation is the management purpose.

Map copy guidance to `displayCopy`, scene intent to the bound Scene Plan, colors to existing `statusType`, `milestoneState` and `timeRange.variant` semantic tokens. Review this mapping on the rendered page. Prose color/style wishes are not automatically proven by a PASS flag. Preserve single-page/no-split hard requirements separately in the existing requirement ledger. Unsupported animation requests are reported, not simulated through extra static pages.

For structured profile metrics, `displayCopy.nodes[].primaryMetrics` can use `{label,value,unit,scope}`. The renderer separates value from label/unit and applies the brief's metric priority to the actual DOM/native text. Do not copy a metric into a second prose carrier to make it look prominent. P0 targets must be larger than subordinate values; names/qualifiers remain readable. Scalar metrics remain supported.

For category charts, metric emphasis uses `field:"series-0"` (zero-based series index) and `nodeId` equal to the exact category label. The same measured chart model carries emphasized type, weight and color into native editable shapes; it is not a second KPI copy. Current point-emphasis implementations are bars, variance bars, dots and verified-cohort stage bars/funnels. Other chart/emphasis combinations block explicitly until implemented, never silently ignore emphasis. Stage conversions require a reviewed shared population, non-increasing counts and explicit handling of a zero previous stage. A source table does not force a displayed table, and the word “明细” alone does not mean precise lookup.

Capacity testing first tries the complete bound story, then real alternative region arrangements as well as local spacing repair. Generic alternatives retain relationship regions intact; only unbound stack groups may become split groups. Explicit user-fixed compositions retain their topology. No passing complete candidate may be ignored in favor of unnecessary continuation pages. Table rows use natural heights in every candidate.

Band shares are preferred allocations, not empty fixed-height rows. Browser-measured natural text/table height may redistribute unused space between bands. Column ratios and source ordering remain explicit. Existing profile/path internals have a bounded `director-content-first` alternative, which reorganizes profile identity, metrics and summary rather than merely shrinking padding. Every final continuation boundary is remeasured using the complete adjacent fragment union and recorded as `merge-recheck`; a partial or unmeasured recheck is not split evidence. Ink-only dead zones exclude card backgrounds and short-table padding; they trigger redesign, not stretching.

Review `.design-execution.json` together with actual native renders. Its receipt records planned and actual carrier, region, priority, type size, color role and status. Fill `executive-review.designBriefs` with observed first focus, visual purpose and composition; unreviewed designs block delivery. Each measured-capacity citation must reference an unsuccessful, complete, actually measured candidate covering both adjacent pages, not a successful continuation or duplicate attempt. Matching wording or a numerical occupancy score alone is not design acceptance.

Task-card `presentationBrief` holds audience, meetingContext, communicationGoal, visualTone, language and decisionFirst. Defaults are executive, progress-and-decision-review, decision-first, executive-fintech, zh-CN, true. Preserve explicit choices. Page `designIntent` holds dominantMessage, relationshipTypes, primaryCarrier, focusObjects and focusMetrics. `primaryCarrier` and visualNarrative.readingOrder use actual module IDs, not decorative section names.

The internal `designRequirements` array records id, scope (report/slide), slideId for a slide requirement, type, strength and original requirement. Add targetId, from/to or expectedText when needed to verify implementation. Pages refer through designRequirementRefs. Hard requirements include single-page, temporal-window, dependency, parallel-options, visible-facts, image, focus and no-split-table. Unsupported hard requirements block with a specific error; they may not silently become soft. Soft style/proportion requests need visual review, not a false deterministic PASS. Never expose ledger IDs to the audience.

Ledger completeness is reviewed against the actual user prompt in the existing planning/content review. A 100% recall score over an incomplete ledger does not prove prompt coverage. Keep the original prompt in private evaluation inputs, not in the public repository.

## Semantic payload for reusable visual primitives

Three initial patterns: `time-window-dependency`, `primary-with-parallel-options` (combined: `critical-path-with-parallel-options`), and `entity-comparison`. They are expression patterns, not fixed page templates.

Diagram data uses stable node IDs and actual directed edges. Node fields: label, text, optional timeRange `{start,end,label}`, duration, status, condition, metrics (fully formatted fact strings), and entity=true for object profiles. Preserve forecast/actual wording in visible labels/status, full range wording and scope in the source units/visibleFacts. No invented dates or interval midpoint. Keep differently scoped values separate.

Path edges use `{id,from,to,relationship:"dependency",label,condition}`. Lanes use `{id,label,nodeIds,relationship:"parallel",parallelTo}` when parallel, and the primary lane omits relationship/parallelTo. Each node belongs to exactly one lane. Path order follows actual edges, not node-array order. Parallel alternatives have no invented dependency edge. Unsupported branch/cycle/cross-lane topology is blocked; return to the Router for an explicit network expression without erasing relationships.

Generic primitives: takeaway-band, milestone, time-range, dependency-edge, parallel-lane, status-chip, metric-badge, entity-profile, risk-strip, decision-strip. Body callouts can select the corresponding primitive; diagram primitives follow node/edge fields. The browser measures all surfaces, labels and rules; the compiler preserves their bindings in native shape names. Images stay embedded images; these primitives are not screenshots.

Composition accepts a grounded visualNarrative or uses deterministic fallback. Invalid narrative support is recorded in compositionClassification. Hard requirements remain active after fallback. Existing data routing still chooses validated candidates; `preferredExpression` is a preference, never authority to make a non-whole pie chart or change units. P0/P1/P2 describes importance independently of required-visible/supporting-visible.

## Layout, review and style

Canvas candidates retain all business facts, actual readable text sizes and relationship direction. Select among feasible candidates using hierarchy, relationship fidelity, semantic proximity, reading order and whitespace balance. Chapter rhythm is reviewed over thumbnails, not enforced by rotating templates. A sparse short-text page can be correct; a large empty frame is not evidence of high density. No minimum carrier count and no mandatory chart + table + explanation combination.

Executive review uses the generated `.executive-review-input.json`, which intentionally excludes the generating Agent's explanations. It must run in a fresh review context and record `reviewContext:"independent-context"` and `generatorExplanationUsed:false`; either missing declaration blocks delivery. It records the actual first focus, body/title proof, relationships, space, carrier suitability, hierarchy and reading order per slide. Score the nine Golden Design dimensions against their fixed maxima; every page needs 85 and the chapter average needs 90. Review source and rendered slides, not just IR. Return issues to planner/router/canvas/renderer/publisher; no direct semantic edits by a visual critic. One complete visual pass and one affected-page repair is the normal budget. Failure remains explicit.

Declarations alone are insufficient. Build seals a `.review-evidence.json` with source, IR, task card, runtime, native PPT, QA sidecars and immutable-by-convention snapshot hashes. The independent reviewer views every snapshot with `detail:"original"`, fills the pending review with actual observations, adds `reviewEvidenceSha256` (hash of the manifest file), then runs `record-executive-review.mjs candidate.pptx review.json <reviewer host session JSONL>`. The resulting host receipt requires a different actual thread identity and matching image-result bytes in the recorded host transcript prefix. Merely mentioning a file or a tool name is not observation. The final audit rechecks evidence and receipt; deleting the build sidecar does not bypass the PPT's review-required metadata. This is local host-evidence validation, not cryptographic attestation or proof of human judgment. Without an independently recorded context, leave review pending instead of self-approving.

An optional approved native PPT can supply a **Style Prior**, not content slots. `extract-style-prior.mjs` extracts theme colors/fonts and native typography statistics into a private profile. `--style-profile=...` applies reviewed style tokens to Canvas and compiler without changing the IR. Floors and contrast cannot be weakened by a reference. Margin/rounded-corner/timeline character require explicit profile review; unsupported style observations stay diagnostics, not guessed layout rules.

Template Creator is optional: it packages personal reference-backed templates; it is not a built-in semantic style extractor or the production layout engine. No personal template is created without an explicit reference-retention request. Mint still works with its own theme when that skill or a Presentations template is unavailable. Do not put private reference decks in GitHub.

## Honest comparison

The mentor's third screenshot is a capability reference, not proof of prompt causality or a native-editability pass. Original PPTs/materials/task card and distinct conversation history are required for that conclusion. Normalize output render sizes and identify fresh generation, historical reuse, manual changes and Agent repairs.

For prompt invariance use A short prompt, B detailed prompt and C natural language without naming the skill, each twice, same model/inputs/version and no prior PPT. Record the actual prompt, source hash, code hash, model, duration, reused-artifact flag, fact/requirement/visual/artifact results. Do not label deterministic replays of one IR as six independent Planner experiments.
