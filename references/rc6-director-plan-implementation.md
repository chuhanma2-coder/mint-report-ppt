# rc.6 Director Plan implementation status (historical dev.2 snapshot)

Current implementation and acceptance evidence: [rc6-director-verification.md](rc6-director-verification.md). The entries below record the earlier checkpoint, not the status of the current release.

Development version: `0.4.0-rc.6-design-dev.2`

This is an isolated local candidate. It is not installed, released, pushed, or a claim of Windows PowerPoint acceptance.

## Implemented

- Structured Director Plan in the execution brief: five-second message, visual thesis, first focus, complete/alternative compositions, carrier bindings, metric emphasis, semantic colors, body proof, and whitespace intent.
- Pre-render blockers for generic plans, absent focus, expression mismatch, flat hierarchy, table defaulting, equivalent alternatives, context-only pages, unproved visual thesis, invalid whitespace rationale, and invalid region shares.
- Director Plan binding through Slide IR, Canvas regions, DOM objects, native PowerPoint objects, and a machine-readable execution receipt.
- Banded full-page composition with coarse height shares, unequal columns, Director alternatives, and P0/P1/P2 treatment using existing primitives.
- Capacity evidence that attempts complete, materially different compositions and local repair before natural continuation; successful complete candidates cannot be ignored.
- Natural-size tables, copy-line budgets, semantic color roles, metric emphasis, real text-floor checks, concentrated-whitespace detection, and preservation of existing content/readability gates.
- Independent Executive Visual QA input stripped of generator explanations, mandatory independent-context declaration, 85-point page floor, 90-point chapter-average floor, and PPT-hash binding.
- Final audit cannot pass a generated candidate while Executive Review is pending, rejected, or stale.
- Human-readable `.director-preview.md`, `.design-execution.json`, `.executive-review-input.json`, and pending `.executive-review.json` artifacts.

## Verified locally

- Schema parses, modified modules pass Node syntax checking, and `git diff --check` passes.
- Director Plan, Presentation Copy, design-intent, rc.5 planning, canonical-ledger, runtime-fingerprint, and related non-browser regressions pass.
- Earlier browser/native regression in this development session produced one editable native PPT with Director primary and alternative topologies, P0 metric hierarchy, semantic color/treatment bindings, no full-slide image, and preserved visible values.
- The latest small contract changes pass their unit/static tests. A full latest browser rerun remains required because the desktop usage limit prevented launching Chrome.

## Required before user acceptance

- Rerun the full browser/native test suite on the exact current commit.
- Run clean, independent fresh-source benchmarks: B short prompt twice, C short prompt twice, Kenya short prompt twice, plus the detailed mentor prompt as the Golden reference. A historical IR replay does not count.
- Record Director Plan, capacity attempts, final renders, independent review, Golden score, repairs, and timing for every run.
- Obtain the user's visual acceptance; only then consider `v0.4.0-rc.6` publication.
- Record Windows PowerPoint open, edit, save, reopen, and render separately. Until then the artifact remains a candidate.
