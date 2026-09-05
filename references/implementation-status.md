# Readability repair — rc.3 verification status

Version: `0.4.0-rc.3`. Distribution status: **prerelease**, not a claim that every report is leadership-ready. This record supersedes earlier development notes. Date: 2026-09-05.

Frozen runtime SHA-256: `97c3baba5d8943c6ab45ca73fc0fa53cfac478fa94db557b8fff3f6ddf11721d`.

## Implemented and regression-tested

- Whole-outline browser measurement, minimum-page contiguous partitioning and approved natural continuations replace guessed information-capacity scores. Original first-page claims remain visible.
- Feasible layouts are compared, including primary-above and stacked support bands. Scores no longer reward reaching the page bottom. Tables use measured natural widths, row heights and readable numeric columns.
- Final text uses browser-measured line breaks, role font floors and native-wrap reserves. Diagram nodes use measured actor widths; directed edges use actual native connectors and arrowheads.
- Semantic colors propagate to native headings, metrics, tables and relationship actors. Native chart labels have contrasting backplates.
- Source inventory, visible facts and final objects are checked separately. Table cell and chart label bindings reject swapped values even if all numbers still exist elsewhere. Image fine-text checks use actual displayed dimensions, not hashes alone.
- Six ordinary chart variants retain native chart data bindings. Negative horizontal comparison bars and close multi-series lines use recorded editable-shape compatibility output, not tables or screenshots. These exceptional shapes do not provide PowerPoint's Edit Data interface.
- Windows dependency checks and rendering share browser discovery, including custom install drives and per-user Chrome/Edge. Installer checks no longer launch and quit PowerPoint; merge/render scripts preserve user presentations.
- Runtime fingerprints cover implementation and contracts. This evidence record is excluded so recording verification does not change tested code identity.

## Verified evidence

- The complete frozen `npm test` command exited 0: core rules, browser composition, image fine-text rejection, color contrast, final-table bindings, six native charts and two compatibility shape-chart cases.
- Skill packaging validation returned `Skill is valid!`.
- Latest local browser outputs: `mint-design-canvas-lQtHOK`, `mint-readable-anOuRD`, `mint-native-charts-mTnrX9` under the macOS temporary directory. These are disposable local evidence, not dependencies.
- Isolated A rebuild: `A-rc3-release-check.pptx`, six slides, including the explicitly approved four pages for outline 1. Its runtime fingerprint matches this release. All 45 reviewed source units passed visible-body and final-object/binding checks; zero omissions and zero notes-only coverage. Structural and local artifact checks passed. All six rendered pages were inspected.
- Six ordinary native-chart variants and two shape-compatibility variants were rendered and inspected locally. These fixtures do not prove every dataset or native PowerPoint renderer.
- Original source documents, existing user PPT files, HTML Skill and Deck Skill were not modified.

## Remaining acceptance limitations — do not conceal

- **A has not passed executive visual acceptance.** Pages 1, 2 and 4 still have substantial idle space beside natural-width tables; detail-table hierarchy and repeated table headings remain weak. The short final outline remains sparse. Page 3's directed relationships are now legible and page 5's support content is balanced below its table, but the chapter does not yet meet the requested aesthetic result.
- Close-line numeric labels are separated, but proximity to the neighboring series line still warrants visual attention. Native internal glyph positions and all diagonal line/text crossings are not universally proven by object rectangles.
- The 45/45 result is based on the reviewed source ledger; deterministic bindings cannot independently prove arbitrary free-text interpretation or extraction completeness.
- Windows browser discovery has code-level tests only. **No Windows installation, native PowerPoint render, editing, merge or publication acceptance was performed.** Earlier Mac PowerPoint automation timed out with `-1712`; no native PowerPoint success is claimed.
- Report builds retain `releaseReady=false` pending native PowerPoint and visual gates. Publishing this Skill prerelease is not equivalent to publishing a fully accepted leadership deck or fully resolved stable release.

Next acceptance work must address observed table-led page composition and visual hierarchy, rerun affected pages, and obtain native PowerPoint evidence. Do not conceal issues behind 45/45 coverage, invent content, stretch empty table cells or lower font floors.
