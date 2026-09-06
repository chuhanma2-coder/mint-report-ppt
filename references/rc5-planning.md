# rc.5 incremental planning contract — development candidate

This is a candidate runtime contract, not a release acceptance statement. Do not claim visual/platform acceptance based on unit tests. Development status and historic benchmark outputs are not Planner inputs.

## Source before Planner (R01)

Create an input descriptor array of `{path,sourceOrigin,selector?}`. `sourceOrigin` is raw-source, task-card or user-supplied-fact; the last also needs `confirmedBusinessFacts:true` after comparing the new facts with raw inputs. Never include prompt style instructions or derived judgments. JSON requires an explicit RFC6901 selector targeting original text or a raw 2D table, not an IR/source summary. The selected raw scope must include all assigned material; selecting a subset is not automatic completeness proof.

```
node scripts/create-canonical-ledger.mjs inputs.json canonical-source-ledger.json
```

The ledger has stable structural IDs and `canonicalFactsTotal`; these are raw units, not a claim of perfect atomic semantic segmentation. Source model records `canonicalLedgerFile` relative to itself, preserves each original text/anchor and maps units with `canonicalRefs`. Images require original-detail review as well as final readable scale. Coverage runs before layout and again against final PPT objects, reporting the same denominator. Approved omissions stay explicit. The writer refuses overwriting an existing ledger.

Adapters: TXT/MD lines; selected JSON text/table; DOCX paragraph/cell paragraphs/headings and images; XLSX cells with cached values and media. Formatted numeric Excel cells require a reviewed display-value export so dates, percentages and currency are not mistaken for raw serials. Unsupported formats block rather than disappear. Semantic extraction still needs the existing source review; a hash cannot prove understanding.

## One Planner, Execution Brief and claims (R02–R05)

IR 1.6 / planning 2.6 requires `executionBrief`; task-card format is unchanged. The brief binds `canonicalLedgerHash`, declares audience, communicationGoal, managementObjective, managementIntent, decisionSystems, semanticObligations, designRequirements and review records. Each decision system has `{id,managementQuestion,sourceRefs}`; slide `decisionUnit` uses that ID. Shared adjacent decisions in the same formal section are measured together, even across headings. Do not author two separate scenes for one complete decision and hope the compiler infers their relationship.

`preflightMode` defaults auto. Preview: create/review the brief, run `node scripts/preflight.mjs canonical-source-ledger.json brief.json`, return its readable explanation and questions; no PPT. Off suppresses that interaction, not grounding or validation. No prompt-optimizer Agent or extra model call is introduced.

Different carriers are not different decisions. If adjacent pages in the same formal section use different decision IDs, record `decisionBoundaryReviews` with before/after IDs, genuinely distinct decisions, why the second is not supporting evidence, and the current canonicalLedgerHash. Different outline headings do not bypass this review. The validator rejects a missing review; it cannot prove that prose reasoning is true. Whole-chapter review must independently challenge these boundaries.

Semantic obligations record id/type/canonical sourceRefs/reason/semantic-hard and contextual review bound to the ledger. Parallel additionally records distinct activities, commonGoal, concurrent=true and hasPrecedence=false. Obligation bindings point to actual edge endpoints, lane IDs, range bounds, duration, or resolved module expression. Merely finding a keyword is never enough.

Each content slide declares claimType (source-supported/derived/recommendation), canonical claimSupportRefs (derived uses derivation.inputs), claimReview and optional structured claimBindings. A derived claim also has logic/result; a recommendation has a visible claimLabel. Review explicitly checks forecast, range, causality, subject, unit, condition and scope against raw text. This is a real review action, not a form to auto-fill PASS. Mechanical validation checks stale review, unknown input, changed bindings and preserved visible components; it does not automatically prove free-text entailment.

`fact` + `factReview` on a source unit and `visibleFacts[].binding` on a module allow reordered structured components. Keep subjects/value/unit/time/status/condition/scope/quantifier as applicable. All declared components must appear locally in that carrier; source qualifiers/numbers and reviewed component checks still apply. Empty facts cannot bypass coverage. Meaning-preserving numerical or unit conversions need an explicitly reviewed representation; never silently loosen matching.

For facts about a particular node in a multi-entity carrier, set `visibleFacts[].targetId` to that node ID. DOM and final PPT checks then inspect that node's text, not another entity's matching number elsewhere in the module. Use node-level scope for subsidiary/group metrics. Keep primaryMetric concise (value plus unit); put ranking, identity and explanation in their existing separate profile fields, with all facts still visible. Do not copy the entire source paragraph into primaryMetric just to satisfy coverage.

## Semantic scene and repairs (R06–R12)

Scene Plan is flow/regions/roles/weights/moduleIds/readingOrder/adjacency, not coordinates. Existing browser Canvas measures it; no second Geometry Engine. Relation references must bind reviewed semantic obligations. Existing primitives preserve valid Visual Narrative while regions retain reading order. A network region contains explicit diagram carriers with nodes/edges; it never infers connections between unrelated modules. Shared nodes are rendered once, including branches and return edges. Anchor/overlay regions require targetId (one of their moduleIds) and side (before/after/start/end). Anchor attaches the other modules beside that target. Overlay uses a shared measured surface and reserves annotation space; it does not cover source-image detail or business text. These use existing native nodes/connectors/panels, not new primitive kinds. Complex topology still requires rendered review; mechanical identity checks do not prove easy reading.

Profile fields support identity/headlineTag, primaryMetric, secondaryMetrics with explicit scopes, characteristics, keywords, status, scope and caveat. Do not repeat the same fact as metric and prose. Shared theme roles and typography floors apply to DOM and native text. Status/range variants use semantic tokens, never business-entity names.

Repair order: exact duplicates → redundant containers → local proximity → object internals → region shares → bounded full candidates → measured natural continuations. Each Capacity Attempt records its complete candidate, actual operation or not-applicable status, body/module/text/table sizes, failed objects, and measured remaining rectangles. Complete candidates and continuation candidates use separate phases. Browser launch/render errors cannot establish a split: production requires measured proof. Split records retain the complete attempts and before/after module/evidence-group boundaries. Failure reports retain these attempts too. Remaining free area is diagnostic, not a fit certificate. One local overflow cannot establish that the full story needs another page. Real-source chapter validation remains required.

## Review, fresh tests and timing (R13–R15)

Executive review includes firstFocus/bodyProvesTitle/hierarchy/readingOrder/whitespace/carrierSuitability/relationshipFidelity/semanticProximity and decision-system fragmentation, risk/response proximity, proof weight, merge opportunity, title chain and page-count justification. Report technical/content/understanding/design/platform separately. Never fabricate visual review from metadata.

Every reviewed slide requires actual rendered observations in `evidence`, not only PASS flags. Multi-page reviews also need `chapter.slideIds` in actual order, titleChain, crossDecisionEvidence, and one adjacentPages record per boundary (before, after, reason, evidence; measured-capacity additionally cites capacityAttemptIds). Review across distinct Planner decision IDs, not only within them. These records are accountable review evidence, not automatic proof of aesthetics or semantics.

Capacity attempts distinguish equivalent measured geometry using layoutSignature/equivalentTo; identical layouts are not counted as effective repairs. Object-level width transfers use real browser wrapping, retaining text, font sizes and relationship identity. Inspect objectRepairs, remaining rectangles and final rendering before authorizing a split.

`create-fresh-benchmark.mjs` copies explicitly allowlisted inputs into a fresh temporary directory; use E2E or fixed-ledger planning track. It is an input staging helper, not an Agent sandbox. Formal freshness requires observed access evidence from the execution host; self-report or this helper alone cannot prove no historical reads. Contamination is INVALID. A/B/C each need two actual independent runs with common model/card/source/ledger. Deterministic fixture replay is not a fresh Planner run.

Build timing covers only instrumented build stages. Planner/input scan/visual QA/manual approval/platform waits outside the CLI remain unknown unless separately observed. Do not equate compile time with end-to-end time. `timing-report.json` lists unknown stages as null, never zero.
