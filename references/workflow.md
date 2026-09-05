# Workflow and prompts

## 1. Coordinator: shared task card

> 请使用 $mint-report-ppt。先读取我提供的分工、大纲及会议要求，只生成统一任务卡，不制作PPT。保持负责人、正式章节ID和大纲顺序。为每个负责人汇总其全部章节到Work Package，并记录汇报对象、目的和风格。使用当前安装版本，不沿用旧版布局决定。

Run `node scripts/create-task-card.mjs config.json report.mint-ppt-task.json`. Task cards fix identity, scope, order and Presentation Brief, not pagination. All owners use the same card; upgrade it once with the coordinator when versions change, preserving business assignments. Do not hand-edit the hash.

## 2. Owner: generate current PPT

> 请使用 $mint-report-ppt，读取统一任务卡和所附材料，制作我负责的完整PPT。根据明确的负责人和材料范围自动匹配全部正式章节，有真正歧义再询问。先理解内容和管理故事，保留全部正文事实、数值、单位、条件和预测属性。让关键关系与重点在页面上清楚可见，按真实测量排版，不机械套表格或卡片。检查内容、设计要求、可读性和原生对象后交付当前版。

An owner with multiple assigned sections selects all of them in task-card order; an explicit section ID restricts scope. Never invent a combined section ID. All required-visible and supporting-visible facts appear in readable body content. No implicit appendix or notes-only facts.

One Planner pass produces source model, Brief, story, IR and Design Requirement Ledger. Read `design-intent.md` for semantic payloads. A page needs a claim and sufficient visible evidence, with no minimum carrier count. Outline identity is not a forced page boundary. Explicit single-page instructions block rather than silently split when capacity fails.

```text
node scripts/build-section-ppt.mjs source-model.json slide-ir.json report.mint-ppt-task.json section-01 current.pptx
node scripts/build-section-ppt.mjs source-model.json slide-ir.json report.mint-ppt-task.json owner:刘屹 刘屹-当前版.pptx
```

For a multi-section work package, IR supplies sectionIds in task-card order and each slide retains its official sectionId. Use the full source model for the selected scope. The builder never merges separately authored PPTs by reconstruction.

Canvas, coverage ledgers, resolved IR, measured frames, requirement reports and visual review form are private QA files. A technical candidate is not delivery approval. Review the rendered pages, fill the executive-review result for the current PPT hash, and run `audit-design-delivery.mjs`. Output is a native editable PPTX, not an HTML editing workfile.

## 3. Edit and merge in PowerPoint

Leaders may change text, data, objects, images and pages directly. PPTX is now sole human work authority. Do not restore deleted pages or old values from IR.

People may manually merge on Mac or Windows using PowerPoint and retain source formatting; inspect final order, fonts, objects and notes. Agent merge is optional. Existing Windows `merge-section-ppt.ps1` handles individual formal section packages only; multi-section owner files can be manually inserted in task-card order. Do not treat a work package as a fake section. No Mac automation is introduced.

## 4. Final HTML publication

> 请使用 $mint-report-ppt。把所附最终PPT作为唯一权威，按它实际的全部页面和顺序发布为一个离线只读HTML。不读取旧IR恢复内容，不改写、不重新排版、不漏掉人工新增页。

```text
node scripts/publish-report-html.mjs final.pptx final.html
```

The publisher uses the actual final PPT pages, not old task-card page counts. PDF is exported through PowerPoint, not a separate Skill PDF engine.

## Target-platform acceptance

On a real Windows PowerPoint installation run `scripts/verify-powerpoint-render.ps1 -Pptx <pptx> -DesignRenderDir <pptx>.design-render -OutputDir <verification-folder>`. Compare actual rendering, edit native objects and verify save/reopen. Record Windows and Mac statuses separately. Missing Windows evidence prevents formal cross-platform acceptance, not honest prerelease publication.
