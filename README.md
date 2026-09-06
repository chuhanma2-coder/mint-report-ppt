# Mint Report PPT

Source-grounded editable PowerPoint collaboration, followed by optional publication of the actual final PPT as offline read-only HTML.

**Current candidate: v0.4.0-rc.5. Not a fully visually accepted or Windows-certified release.**

- [中文操作说明与可直接复制的 Prompt](使用说明.md)
- [rc.5 本轮修复及真实验收状态](references/rc5-repair-acceptance.md)
- [R01–R15 逐项清单](references/rc5-implementation-checklist.md)

Users do not need a separate prompt-optimization step. Solo reports can create the required internal task card in the same authoring task; parallel owners share one coordinator task card. PowerPoint edits are authoritative after first generation. Manual merging works on Mac and Windows; Agent merging is optional.

## Runtime-only installation package

From a checkout of the exact tag:

```sh
node scripts/package-skill.mjs /absolute/path/to/new/mint-report-ppt
```

The destination must not exist. The package contains current execution contracts, not historical reports or test fixtures. Its runtime fingerprint must match the source checkout. Back up an existing installation before installing. This command only packages files; it does not change any installed Skill.

Windows installation: run `scripts/install-windows.ps1` from a separate extracted directory. It checks dependencies and backs up the prior installation. Microsoft PowerPoint target-platform validation is still required; browser/native-library rendering alone is not Windows proof.

## Validation

Load the bundled Presentations runtime (`RUNTIME_NODE`, `RUNTIME_NODE_MODULES`, `RUNTIME_BIN_DIR`, and render dependencies), then run:

```sh
npm test
npm run test:rc5-primitives
npm run test:rc5-capacity
npm run test:rc5-topology
npm run test:rc5-scenes
npm run test:publication
```

Deterministic regression tests and fixed-input replays do not establish Fresh Planner performance or executive visual acceptance. See the acceptance report for remaining gaps.
