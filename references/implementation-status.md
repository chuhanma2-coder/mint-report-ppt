# rc.4 verification status

Version: `0.4.0-rc.4`. Date: 2026-09-05. Distribution: **prerelease**.
Baseline: `0.4.0-rc.3 / 06a2a4c`. Original user PPTs, HTML Skill and Deck Skill were not changed.
The complete contract is tracked in [rc4-contract-checklist.md](rc4-contract-checklist.md), items 1–41.

## Implemented and exercised

- Report Presentation Brief; page Design Intent / Visual Narrative; internal hard/soft Design Requirement Ledger.
- Grounded composition validator/fallback and supported expression preferences; valid narrative reaches the Canvas.
- Ten native-friendly visual primitives, time-window/dependency and parallel lanes, entity profiles.
- Browser-measured candidates with actual relationship/proximity/reading-order diagnostics; natural short tables, no implicit row shrinking.
- Owner work packages keep each formal section and outline provenance; adjacent same-decision outline merging and measured continuation.
- Measured and page-bound native design gates, pending Executive Visual QA, current-PPT hash-bound delivery check.
- Optional style extraction/review/application for supported tokens, never content-slot filling.
- Actual presentation relationship order drives PPT inspection and final HTML publication. Orphan slide parts are not pages.
- Windows installer copies release resources without the Git directory, backs up the prior installation, checks available desktop PowerPoint/font/browser. Windows execution remains unverified.

## Executed evidence

1. Full `npm test`: PASS. Includes source completeness/components, financial conflicts, image-readability blockers, outline/pagination, routing/composition, measured Canvas, native reopen/layout, semantic colors, native-chart technical rendering and table bindings.
2. `tests/design-intent.e2e.mjs`: real Chromium Canvas → native PPT → reopen and render. Four synthetic hard requirements passed at Canvas and native stages; 63 native shapes; no full-slide image. Local evidence: `mint-rc4-design-SarBiU`. The rendered candidate was inspected for hierarchy, window, arrows and parallel lanes. This is **not** the mentor's original benchmark.
3. `tests/build-design.e2e.mjs`: full CLI with source-unit bindings and one owner selecting section-01 plus section-03; two actual slides; source, final-facts, artifact, parity and design gates pass. Pending executive review is rejected. Local evidence: `mint-build-design-Xhsdr3`.
4. `tests/publisher-authority.e2e.mjs`: simulate insertion/deletion/reorder in a native PPT package with orphan old parts and stale IR. Final HTML contains the actual three pages in blue/red/yellow order, verified by rendered pixels. Local evidence: `mint-publish-authority-XTfyYA`. Uses bundled renderer, not Windows.
5. Skill quick validation: PASS. `git diff --check`: PASS.
6. Independent code review reproduced three failures (cross-outline continuation, background masquerading as arrow, wrong focus target). All three have executable negative/regression tests and were corrected.
7. Final fingerprint build: `mint-build-design-ehNQaS`, two sections/two pages, PASS; runtime `27a1aeb29e10982f9dc6c36a304f95c258e856c6b7a68388c11fe7d3f6712528`, `verified-release`. Measured `buildElapsedSeconds`: **6.962 seconds** for this small synthetic deterministic build only. This excludes Planner and executive review, and does not establish the 12-minute/30-minute targets.

A sandbox Chromium SIGABRT/EPERM was inconclusive; browser tests were rerun successfully with permission to launch Chromium. During implementation the new native-object gate first rejected name suffixes; the parser was fixed without weakening connector-type/direction checks. Full CLI fixture facts were corrected to atomic visible units rather than concatenated strings. Publication tests exposed and fixed orphan-slide counting. These failures were not relabeled as passes.

## Still pending — do not claim overall acceptance

- Three original mentor PPTs, complete corresponding material/task card, distinct prompts and history of prior-draft reuse. Screenshots at 33% and 50% are not equivalent evidence.
- Six fresh Planner runs (ordinary/optimized/implicit, twice each), followed by source and executive review. `audit-prompt-invariance.mjs` validates an evaluation manifest, not six generated runs. No prompt-invariance score or end-to-end performance median is claimed.
- Native Windows PowerPoint install/open/edit/save/reopen/merge/publish. No Windows desktop is available here. Browser path unit tests and Mac/bundled rendering are not Windows acceptance.
- Full original A/B/C executive visual acceptance under this runtime. Historical rc.3 A checks are not reused as rc.4 proof.
- The native-chart test renders six chart cases and reports `rendered-awaiting-semantic-and-visual-check`; its exit code does not establish Windows chart visual acceptance.
- Style extraction supports explicit theme/typography observations and reviewed supported tokens, not automatic reconstruction of arbitrary rounded cards, shadows or margins. New dependency arrows are native connectors on measured anchors, not an automatic semantic graph editor.

## Release gate

A code candidate may be pushed as rc.4 with these gaps stated. Formal `0.4.0` remains blocked until Content, Design Intent, Visual and Artifact acceptance—including real Windows—has complete evidence. Do not deliver a generated report just because its technical build returns passed; complete the current-PPT Executive Visual QA and delivery audit.
