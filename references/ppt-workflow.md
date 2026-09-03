# PPT collaboration, HTML publication workflow

## Coordinator: create one task card

```text
请使用 $mint-report-ppt 为本次汇报生成一次协作任务卡，不制作页面。
保留领导大纲原始编号和顺序，不补写缺失项目。
团队分工如下：[负责人和大纲范围]。
后续所有人必须使用这张任务卡和其中固定的Skill、主题版本。
协作修改文件为各章节PPT，最终发布文件为完整HTML。
```

```bash
node scripts/create-task-card.mjs brief-config.json report.mint-ppt-task.json
```

## Owner: build the first section PPTX

```text
请使用 $mint-report-ppt，读取附件任务卡和我的全部原始材料。
只制作任务卡中分配给我的章节，一次完成整个章节。
不得联网补写，不得删除、改写或新增材料中没有的事实。
先完成来源锁、管理问题合并和数据关系路由，再生成原生可编辑PPT。
PPT必须使用任务卡指定的Mint Fresh主题；不生成PDF或完整PPT。
输出文件名：[负责人]-[章节]-当前版.pptx。
```

The Agent uses the compatible `mint-report-html` preparation/review pipeline internally, then runs:

```bash
node scripts/build-section-ppt.mjs <html-project> report.mint-ppt-task.json <section-id> <current-section.pptx>
```

## Revision in PowerPoint

During review, the current PPTX is the only file a person edits. Do not rename generated objects, add/delete slides, or add freeform objects that must appear in the final HTML.

For an Agent revision:

```text
请使用 $mint-report-ppt 修改附件中的当前PPT。
必须在这个PPT上修改并保留已有人工调整，不得从旧HTML或原始版本重新生成。
修改范围：[具体页码和要求]。
不得删除或重命名Mint生成对象，不得新增或删除页面。
修改后检查所有受影响页面，不生成PDF。
```

After an Agent exports the edited copy, restore the embedded sync payload:

```bash
node scripts/preserve-sync-payload.mjs incoming-current.pptx edited-current.pptx
```

## Finalize one HTML

Give the coordinator exactly one current PPTX for every section:

```bash
node scripts/finalize-report-html.mjs \
  report.mint-ppt-task.json final-project complete-current.mint-report.html \
  A-current.pptx B-current.pptx C-current.pptx
```

The command synchronizes supported edits, rejects unsupported changes, merges in task-card order, and runs one final desktop HTML browser review. It does not call a model or reread raw source files.

## Optional PPT/PDF

Only when explicitly required, merge a complete PPT with `merge-section-ppt.ps1` on Windows or PowerPoint **Reuse Slides** on Mac. Export PDF from Microsoft PowerPoint or the final HTML using the mature native workflow. Neither is part of the default chain.
