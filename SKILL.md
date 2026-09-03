---
name: mint-report-ppt
description: Create source-grounded Mint management reports that use native editable PPTX for parallel review and publish one final interactive HTML. Use when contributors or leaders need to edit Mint sections in PowerPoint before a final HTML merge. Do not use for HTML-only authoring or a final-PPT-only deliverable.
---

# Mint Report PPT

Create native editable Mint PowerPoint sections, synchronize supported human edits back to the shared content model, and publish one final interactive HTML. PPTX is the review carrier; the synchronized model is the internal authority and the final HTML is the publication artifact.

## Route correctly

- Use this Skill for parallel editable Mint PPT sections followed by a final HTML report.
- Use `mint-report-html` when HTML interaction, E editing, scrolling, or an HTML workfile is the only goal.
- Use the Presentations Skill directly when the required final deliverable is only PPTX and no Mint HTML publication is needed.
- Do not use or modify `mint-report-deck`. Do not invoke a generic template picker: this Skill supplies `mint-fresh/1`.
- For PPTX creation or editing, load the workspace presentation runtime and follow the installed Presentations Skill. Use `@oai/artifact-tool`; never use `python-pptx`.

## Required dependency

This Skill requires the compatible `mint-report-html` core API declared in `core-api.json`. Run `scripts/check-dependencies.mjs` before work. A dependency failure blocks generation; never silently switch to another deck Skill.

## Four-stage workflow

1. **Parallel authoring.** One coordinator creates one task card. Each owner uses the shared source lock, management clustering, page consolidation, data routing, and title contracts from `mint-report-html`, then runs `scripts/build-section-ppt.mjs`. The first user-facing file is `<owner>-<section>-current.pptx`; its internal sync payload is not a second user file.
2. **Direct PPT revision.** The owner or leader edits the current PPTX in PowerPoint. Supported round-trip edits are text, table cells, chart title/categories/series/values, embedded image replacement/crop, and object position/size. Do not rename generated objects. New freeform shapes, slide insertion/deletion, SmartArt, animation, theme changes, or diagram restructuring are not automatically translatable and must block synchronization for confirmation.
3. **Synchronization and merge.** Accept exactly one current PPTX per section. `scripts/finalize-report-html.mjs` validates identity, synchronizes supported edits, rejects unbound changes, merges section models in task-card order, and launches no section-level browser QA.
4. **HTML publication.** After merge, run one complete desktop HTML review and package one offline `.mint-report.html`. That HTML is the final publication file and retains `mint-report-html` interaction and editing. A complete PPTX or PDF is optional and outside the default chain.

Read `references/ppt-workflow.md` for exact prompts and commands. Read `references/ppt-failure-prevention.md` before implementing or diagnosing output.

## Shared content contracts

- Every source unit is visible, retained in details, or explicitly approved for omission. Page count and visual compression never authorize silent deletion.
- Do not browse for business facts unless requested. Do not invent missing numbers, entities, conclusions, causal links, or comparison labels.
- Plan pages by independent management conclusions, not atom count. Consolidate evidence, mechanism, risk, action, and data when they answer the same question; do not create sparse one-point slides.
- Route data by relationship, unit, period, sign, category, denominator, and decision intent. A time series remains a time series; horizontal bars remain bars; absolute-value series share an axis; negative values and zero lines remain visible.
- Audience-facing output never exposes task-card paths, owner IDs, outline indices, source-unit IDs, hashes, raw filenames, merge lineage, `任务边界`, or `大纲 2` labels.

## Native PPT review contract

- Review slides are 16:9 and use `mint-fresh/1`. They contain no headers, footers, page numbers, navigation dots, HTML controls, hover states, or HTML animation.
- Text, tables, charts, media, shapes, and simple diagrams are native editable PowerPoint objects. A full-slide screenshot is forbidden.
- Theme, fonts, title hierarchy, margins, chart palette, and background rules come from the task card and theme tokens, not Office defaults.
- Media is embedded. Missing, corrupt, external, or unsupported media blocks delivery.
- Preserve chart type, categories, series order, units, signs, axis policy, and key values. Never silently replace an unsupported chart with a table or decorative shape.
- Formal text contrast is at least 4.5:1; large titles are at least 3:1. Ordinary slides do not use large dark-green fills.
- Render every delivered slide. Out-of-bounds objects, severe auto-shrink, unintended overlap, missing media, broken labels, visible audit metadata, or inconsistent theme identity block delivery.

## Authority and synchronization

- Before first PPTX delivery, the shared source/model contracts are authoritative. During review, the current PPTX is the only file a person edits. Synchronization updates its embedded section model; after finalization, the complete HTML is authoritative.
- File names are not identities. Each PPTX embeds report, section, order, theme, Skill, task-card, source, binding, and baseline identity.
- Submit exactly one current PPTX per section. Duplicate or missing sections, renamed/deleted bound objects, incompatible versions, missing sync payload, external media, or unsupported edits block finalization.
- Agent-authored PPT revisions must run `scripts/preserve-sync-payload.mjs` after export. Human PowerPoint edits must preserve the embedded payload; the synchronizer verifies it before accepting changes.
- Final merge reads embedded section packages and does not depend on PowerPoint COM. `merge-section-ppt.ps1` remains optional only when a complete PPT copy is explicitly requested.

## Deliverables

- Authoring: one native editable section PPTX per owner.
- Merge/publication: one offline, interactive, editable complete HTML plus an internal finalization manifest.
- Optional: complete PPTX or PowerPoint-exported PDF only when explicitly requested.
- Embedded section packages, layout snapshots, and QA files remain technical artifacts and are not routine user deliverables.
