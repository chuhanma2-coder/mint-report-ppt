# rc.5 incremental implementation checklist

Baseline: 0.4.0-rc.4 / 2eec882. Work is isolated; installed rc.4 and user PPTs are not overwritten.
Target: 0.4.0-rc.5. Not complete until every non-deferred requirement is VERIFIED, including real visual evidence. Unit tests are not visual acceptance.

| ID | Requirement | Files | Implementation choice | Verification | Status |
|---|---|---|---|---|---|
| R01 | Canonical Source Ledger | source-inventory, canonical-source-ledger, create-canonical-ledger, source-coverage | Deterministic raw anchors before Planner; selected JSON scope excludes unrelated prompt/style metadata; visible/omitted counts retain one denominator | canonical-source-ledger + source-adapters: TXT, selected JSON, DOCX and XLSX three-run stability; source mutation, unknown origin and omission negatives | VERIFIED |
| R02 | Decision System before pages | outline-planner | Adjacent shared decision IDs in one formal section measured together; no second planner | rc5-planning verifies full candidate before partition; rc5-scene.e2e measures ten systems/26 candidates. Actual short-Prompt decision identification remains unverified | IMPLEMENTED |
| R03 | Execution Brief / preflight | execution-brief, preflight, build-section-ppt, schema, SKILL | One existing Planner produces brief; auto/preview/off; preview stops before PPT | execution-brief tests and full synthetic CLI pass. Real short/long Prompt understanding still needs independent runs | IMPLEMENTED |
| R04 | Semantic obligations | execution-brief, build-section-ppt | Canonical references, contextual review and actual edge/lane/range bindings before and after layout | Unknown refs, absent parallel context, range/dependency bindings tested. Final-native relationship review is not fully automatic | IMPLEMENTED |
| R05 | Claim support | execution-brief, source-coverage | Three claim types; canonical support; derivation; visible recommendation label; source-bound structured fields and reviewed qualifiers | Stale review, missing derived input, altered source binding and forecast negatives pass. A recorded review does not prove free-text entailment | IMPLEMENTED |
| R06 | Capacity repair order | outline-planner, design-canvas, dom-layout-extractor, scene-plan | Exact title/text dedup; bounded scene repairs; adjacency groups; natural profile/table; browser-sized short-table tracks; actual content bounds in scoring | Ten systems remain ten pages; short-table gap below 80px and natural height; legacy natural split tests pass. Some repair-step records are diagnostics, not a complete repair proof; free-space/why-no-more-reflow evidence remains incomplete | IMPLEMENTED |
| R07 | Scene Plan | scene-plan, design-canvas, slide-ir schema | Semantic regions/roles/order/adjacency in existing Canvas; no coordinates in authored IR | Ten scenarios exercise stack/split scenes and internal carriers, not all grammar combinations; overlay/anchor/network topology explicitly blocks rather than silently becoming a grid. Those three implementations are still missing | BLOCKED |
| R08 | Validator/fallback | composition-classifier, scene-plan, build-section-ppt | Valid scenes preserve grounded Visual Narrative; fixes narrativeAccepted loss; resolved expression obligations rechecked | Existing design-intent negatives and rc5 scene/rename tests pass. Complete Scene/Expression truth-chain validation for unsupported topology remains open | IMPLEMENTED |
| R09 | Entity Profile | visual-primitives, design-canvas, source-coverage, typography-contract | Existing profile gains identity, primary/secondary scoped metrics, characteristics, keywords, status, scope and caveat | Native comparison/product cases preserve all provided fields, unequal internals and equal outer widths; scope separation visually inspected. This verifies the component, not whole-page beauty | VERIFIED |
| R10 | Primitive depth | visual-primitives, design-tokens | Existing ten kinds only; token-driven milestone/range/status variants and profile typography | Time-range left/right boundary measured and compiled; actual variant examples rendered. Complete visual matrix of every variant remains pending | IMPLEMENTED |
| R11 | Shared typography and fact bindings | typography-contract, DOM, renderer, artifact-layout, chart-display-model, source-coverage | Shared role/floor resolver; explicit numeric-label roles; reviewed structured components; rotated-line collision correction | Final native scenes pass; empty binding, forecast loss and all-to-some negatives pass; nearby line labels repaired without shrinking. Arbitrary native-chart label placement and free-text semantic review still need target-platform evidence | IMPLEMENTED |
| R12 | Default Design Policy | evidence-allocation, design-tokens, design-canvas, dom-layout-extractor | Existing semantic role/color tokens; natural sizes; actual ink/content bounds rather than empty-box area | Ten renamed domains preserve decisions; natural short table releases empty track. Overall hierarchy, network reading and whitespace still not executive-accepted | IMPLEMENTED |
| R13 | Slide + chapter QA | design-intent, audit-design-delivery, build-section-ppt | Eight slide checks, seven decision-system checks, file-bound review, separate five acceptance layers | Missing/stale reviews block design acceptance; tests and actual native review recorded. Real chapter semantics and full visual acceptance pending | IMPLEMENTED |
| R14 | Fresh benchmarks | fresh-benchmark, create-fresh-benchmark, audit-prompt-invariance | Allowlisted staging, canonical comparison, history contamination INVALID; no new execution service | Contamination/missing access evidence negatives pass. Staging is not host read isolation; six independent observed A/B/C runs have not been executed | BLOCKED |
| R15 | Stage timing | timing-report, build-section-ppt | Seventeen names including total; stage events; unknown stays null; wait/manual separated | Timing overlap/wait tests and synthetic CLI timing pass. Planner, real visual repair and human/platform timing outside the build are not instrumented end-to-end | IMPLEMENTED |

## Highest-priority contract

DOMAIN-AGNOSTIC: entity names never select routing, layout, pagination, color or hierarchy. Scan production and exercise renamed synthetic inputs. Branding/identity metadata are not design-routing conditions. Findings and exact changes must be recorded.

## Minimum sufficient implementation

Prefer local edits to existing validators, planner and Canvas. New helpers are allowed only for independently testable R01–R15 responsibilities; no new Agent, service, persistence framework, layout engine or UI. Record any departure here.

Implementation choices: claim support and obligations share execution-brief.mjs instead of three new framework layers. Decision grouping stays in outline-planner.mjs; scene regions compile through existing Canvas and native renderer. The fresh helper only stages inputs and validates evidence; it does not claim to be a sandbox. Shared typography is one small resolver, not another design system. No new Agent or primitive kind was added.

Observed defects fixed locally: valid scene discarded narrativeAccepted; time-range right boundary not compiled; numeric label floor differed between DOM/native; near-line labels crossed plotted segments; 90-degree line frames generated false collisions; short table kept an empty wide outer track; empty structured facts/omitted quantifiers could bypass expected checks. Existing short-table regression now locates its stable ID instead of assuming it is first in DOM order; its height limit is unchanged.

R01 verification scope is raw structural units, not perfect atomic semantic segmentation. Formatted numeric XLSX cells explicitly require reviewed display-value export; unsupported source formats block. The input scope still needs source review so a deliberately incomplete selector cannot masquerade as all assigned material.

## Deferred (explicit user scope)

DEFERRED: animations; new fixed/domain templates; additional primitive kinds; complex style extraction; implicit routing optimization; database/server/Electron; multi-Agent Planner; per-slide LLM; page-specific JS as default.

## External acceptance

Windows PowerPoint: BLOCKED; no real Windows environment is available. Fresh Planner runs: BLOCKED as described under R14. Native rendered visual inspection was performed, but overall result is VISUALLY NOT ACCEPTED. No deterministic fixture replay is called a fresh Planner experiment.

The local code is a development checkpoint, not an accepted rc.5 release. Installed rc.4 remains untouched. See rc5-progress-report.md for the twenty-part handoff and evidence paths.
