# Design intent contract (rc.4)

## One planning pass

Short and detailed prompts use the same planning workflow. In that pass read the whole source, establish the report-level Presentation Brief, then plan the management story, visible facts, design requirements and page narrative. Do not call a separate prompt optimizer or one model per page. A short prompt is not permission to default to tables. Audience/style requests influence design, not business facts.

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

Executive review records firstFocus, bodyProvesTitle, relationships, space, carrierSuitability, hierarchy and readingOrder per slide. Review source and rendered slides, not just IR. Return issues to planner/router/canvas/renderer/publisher; no direct semantic edits by a visual critic. One complete visual pass and one affected-page repair is the normal budget. Failure remains explicit.

An optional approved native PPT can supply a **Style Prior**, not content slots. `extract-style-prior.mjs` extracts theme colors/fonts and native typography statistics into a private profile. `--style-profile=...` applies reviewed style tokens to Canvas and compiler without changing the IR. Floors and contrast cannot be weakened by a reference. Margin/rounded-corner/timeline character require explicit profile review; unsupported style observations stay diagnostics, not guessed layout rules.

Template Creator is optional: it packages personal reference-backed templates; it is not a built-in semantic style extractor or the production layout engine. No personal template is created without an explicit reference-retention request. Mint still works with its own theme when that skill or a Presentations template is unavailable. Do not put private reference decks in GitHub.

## Honest comparison

The mentor's third screenshot is a capability reference, not proof of prompt causality or a native-editability pass. Original PPTs/materials/task card and distinct conversation history are required for that conclusion. Normalize output render sizes and identify fresh generation, historical reuse, manual changes and Agent repairs.

For prompt invariance use A short prompt, B detailed prompt and C natural language without naming the skill, each twice, same model/inputs/version and no prior PPT. Record the actual prompt, source hash, code hash, model, duration, reused-artifact flag, fact/requirement/visual/artifact results. Do not label deterministic replays of one IR as six independent Planner experiments.
