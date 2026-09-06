# rc.6 Presentation Copy 修复与验收

日期：2026-09-06。基于 rc.5 提交 `da8c58b` 的聚焦增量修复，不重构规划/布局系统，不新增 Agent、业务模板或 Primitive。

## 原因与修复

旧来源组件检查倾向要求原句片段，Entity Profile 又直接消费节点 text/keywords，造成“原文＋设计关键词＋英文标签”的字段串。此次从输入合同、渲染消费和最终验收三处修复，而不是批量删标点。

| 本次要求 | 实现与证据 |
|---|---|
| 1 原始材料为事实权威 | canonical/source 原文不变；来源组件和数值/限定检查继续运行 |
| 2 设计提示默认不进正文 | displayCopy 显式投影，无 raw text/keywords 回退；指令词扫描 |
| 3 每个模块单独文案 | IR 1.7 / planning 2.7 / presentationCopyVersion 1；缺少 copy 阻断生产构建 |
| 4 可改写但不改事实 | componentReview 对照原文；copy hash 绑定审核；英译/名称规范化显式记录；数字、币种、预测删除反例失败 |
| 5 档案结构化呈现 | 名称、定位、0–2个有来源主指标、简明说明、辅助数据/状态；修正原语内部阅读顺序 |
| 6 不输出竖线字段串 | authored copy 和实际 PPT 文本两端检查 |
| 7 不泄漏 Schema/设计词 | 确定性扫描＋实际页视觉审阅；最终 PPT 被注入字段名的反例被拦截 |
| 8 中文优先、合理英文保留 | language/englishExceptions 审阅合同；本页仅保留正式名称和必要术语；不声称正则能自动判定所有英文是否必要 |
| 9 完整不等于逐字搬运 | 改为逐事实组成核对；原始大纲序号不伪装成必须展示的业务数字 |
| 10 一个主载体 | 沿用事实分配门禁；本页银行事实绑定对应档案，无图表/表格复写 |
| 11 十项文案 QA | 每页 humanPresentationCopy 十项＋具体观察记录；构建只产生待检查表单 |
| 12 失败阻断 DESIGN | Content/Technical PASS 但文案 fail 的 CLI 反例使 DESIGN NOT_ACCEPTED |

## 同一真实测试页

使用用户所指 B1 原始材料及原测试结构意图，重新审阅来源并编写 displayCopy，调用 Skill 通用构建器。保留旧 PPT。此为定向修复重放，不是从零的 Fresh Planner 实验；没有以预制 IR 证明短 Prompt 能力。私有材料、PPT、截图及内部工作文件未上传公共仓库。

- 单页 16:9；7/7 原始来源单元，42项人工核对后的事实组成保留。42不是新的覆盖分母，也不是自动语义理解证明。
- 原生对象检查：80个原生形状，其中33个 Mint 文字对象；无整页截图、外链媒体、页码、越界或缩字报告。
- 最终代码指纹：`ebbf1ef9944a321a9737ca91ff2dd4a4204f4d15be2e9975e03ead15c9e44da2`。
- 最终PPT SHA256：`eee210f2b812ef39c3fb8f06a0b58c818b6e88f5a68150343b8076aabefb6a84`。
- 实际最终构建15.022秒；不是材料阅读、文案审阅及人工等待在内的端到端时间。
- 已检查最终1920×1080原生渲染并与旧版同尺寸比较。字段串、重复英文标签和设计关键词消失；银行定位/指标/正文层次分开。时间窗口、串行依赖、预测属性及集团/子公司范围仍保留。
- 本页 Content、Technical、Understanding、Design 本地审核通过。Human Presentation Copy 十项逐项记录，不是从构建成功自动产生。

## 可执行回归

- `npm test`：通过，包括显式文案投影、旧来源/布局/图表检查、全构建 CLI 及最终文本污染反例。
- `npm run test:rc5-primitives`、`npm run test:rc5-capacity`、`npm run test:publication`：通过。
- `quick_validate.py`：通过；运行包指纹与仓库一致。
- 六种原生图表测试仍有已知的 OutEnd 自动位置兼容提示；本轮未新增完整图表逐页视觉认证。
- 第一次额外容量测试因连续命令未继承 RUNTIME 环境失败；补齐环境后重跑通过。未将环境失败标成代码通过。

## 边界

此候选解决本轮 Presentation Copy 合同及同页回归，不宣称所有历史视觉问题已经解决。未重做六次独立 Fresh Benchmark、真实多页 Golden Benchmark，也未完成 Windows PowerPoint 打开/编辑/保存/重开。现有安装不被此仓库推送自动替换；需按使用说明安装精确标签。

源码扫描不能证明全部自由文本自然性、隐藏在图片里的提示文字或所有中英混排是否必要；这些仍需要现有内容/图片细字/视觉审阅。源码覆盖、文案质量、整体视觉和平台验收分开报告。
