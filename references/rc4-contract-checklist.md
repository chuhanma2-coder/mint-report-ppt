# rc.4：41 项实施合同与证据索引

对应用户确认方案的原始编号，不将“npm test 通过”视为完整视觉验收。
发行类型：`0.4.0-rc.4` 候选版。最终执行结果见 `implementation-status.md`。

证据缩写：DI=`tests/design-intent.mjs`；DE=`tests/design-intent.e2e.mjs`；BE=`tests/build-design.e2e.mjs`；PA=`tests/publisher-authority.e2e.mjs`。这些是合成回归，不是带教的原始文件或真实 Prompt 对照。

| # | 确认要求 | 实现/合同位置 | 验证及剩余边界 |
|---|---|---|---|
| 1 | 采用图3能力，不复制版式 | `design-intent.md`；通用监管/对象合成样例 | DE 检查能力；原始三份 PPT 未齐，不能作因果结论 |
| 2 | 意图贯穿 Planner→Canvas→PPT→QA | `build-section-ppt.mjs`，`design-intent.mjs` | BE 完整入口；候选与交付状态分离 |
| 3 | 报告 Brief；不另加优化模型 | `task-card.mjs`、Task Schema、SKILL | DI 默认 Brief；模型归一化在现有规划调用中完成 |
| 4 | 内部 Design Requirement Ledger | IR Schema、`validateDesignLedger` | DI/DE：硬要求缺失阻断；Soft 保持待视觉审阅 |
| 5 | 主体、预测、窗口、条件保真 | `source-coverage.mjs`、`final-facts.mjs` | 旧来源反例＋BE 逐事实；自由语义仍须原文审阅 |
| 6 | 事实可见与 P0/P1/P2 分离 | `evidence-allocation.mjs` | 保留显式层级；DI 指定 focus 不能被别的模块替代 |
| 7 | 页面 Visual Narrative 进入 IR | IR Schema、`design-intent.md` | DI：语义字段；禁坐标/样式字段 |
| 8 | Classifier 改为验证/回退 | `composition-classifier.mjs` | DI 合法叙事不被模块数覆盖；非法关系回退有原因 |
| 9 | Expression 候选与验证 | `expression-router.mjs` | 路由回归；不支持候选继续安全路由，不能改数据语义 |
| 10 | 时间依赖、并行路径、对象档案 | `visual-primitives.mjs` | DE：窗口、依赖、并行、三对象；其他材料仍走原表达 |
| 11 | 十类可复用原语 | `visualPrimitives` 注册表＋Canvas＋编译器 | DE：原生形状/文字/连接线；无整页截图 |
| 12 | 浏览器布局权威 | `design-canvas.mjs`、`dom-layout-extractor.mjs` | 浏览器测量和旧 Canvas 回归；生产不导入旧 Geometry Engine |
| 13 | 非对称与内部二次构图 | Canvas `narrative-flow`、主载体、对象档案、短表侧注 | DE/自然表测试；不以单模块强制小表左上角 |
| 14 | Hard 候选门禁与 Soft 评分 | DOM extractor、outline planner | 真正测量字号/碰撞；评分含层级、边方向、邻近距离、阅读逆序、空洞 |
| 15 | 自然表格、就近说明、空间顺序 | Canvas 原生行列测量、短表与说明并置 | readable-layout、final-table；不拉高空行 |
| 16 | 一个事实一个主载体 | `fact-fingerprint.mjs`、evidence allocation | 去重反例；有独立决策用途才允许复述 |
| 17 | Design Execution Gate | `auditDesignRequirements`＋nativeDesignPages | DI：背景矩形不能冒充箭头；DE/BE：页级原生连接线验证 |
| 18 | Executive Visual QA | `executiveReviewIssues`、质量合同 | BE：未审表单必须阻断；七维不是自动审美分数 |
| 19 | QA 修复回正确层 | `audit-design-delivery.mjs`、design-intent | DI：错误层/未解决问题失败；视觉批评不能改事实 |
| 20 | Template Creator 仅可选 Style Prior | `style-prior.mjs`、`extract-style-prior.mjs` | 提取主题/字体观测；经批准应用配色、字体、字号范围；不提取内容槽 |
| 21 | Golden Benchmark 测能力 | `tests/fixtures/design-intent.mjs` | 合成结构基准就绪；图3原始可编辑性、来源完整性待真实文件 |
| 22 | Task Card 只定范围/顺序/Brief | `task-card.mjs`、workflow | DI；不存固定页面模板 |
| 23 | Owner→正式多章节 Work Package | `resolveWorkPackage`、build、audit | DI 刘屹→01＋03；BE 多章节原生文件；显式 section 优先 |
| 24 | Outline 不是 Slide Boundary | `outline-planner.mjs`、outline-integrity | DI 跨大纲同决策合页与次大纲续页；逐页 provenance 保留 |
| 25 | Contract Consistency Audit | SKILL、workflow、design-layout、readability-repair | 删除 two non-chart carriers；更新大纲/构图冲突，不保留旧强制分页 |
| 26 | Mint / Presentations / Template 分工 | SKILL、design-intent | 使用现有 Presentations 原生运行时；未安装 Template 仍完整生成 |
| 27 | 协作、人工编辑合并、最终 HTML | workflow、原合并脚本、publisher | 不新增 Mac 自动合并；人工多章节文件可直接合并 |
| 28 | 公平测试前置条件 | design-intent、此表 | **待原始三份 PPT、完整材料任务卡和不同 Prompt/历史**；截图比例不能替代 |
| 29 | A/B/C 各两次独立 Prompt 生成 | `audit-prompt-invariance.mjs` | 清单检查器就绪；**六次独立规划/视觉实测尚未执行**，IR 重放不算 |
| 30 | Hard Requirement Recall | Canvas/native requirements reports | DE/BE 合成硬要求100%；完整 Prompt→Ledger 仍须规划时核对 |
| 31 | 监管、多负责人、多材料回归 | DE、BE、原费用/国家/图片/架构/图表测试 | 自动场景覆盖；带教真实 A/B/C 完整复盘待原件 |
| 32 | 语义丢失与不可读反例 | 来源、图片、关系、最终事实、DI 测试 | 预测/币种/条件等删除阻断；影像文字不能只凭哈希通过 |
| 33 | 最终 PPT 增删改排后的 HTML | `pptx-metadata.mjs`、PA | 按 presentation.xml 实际引用，不数孤立 slide 文件；渲染颜色验证顺序 |
| 34 | 按确认顺序实施，Template 非 P0 | Git 改动＋独立复核反例＋此表 | 合同/用例→意图→Canvas/门禁→入口→可选风格；原件/Windows 未替代 |
| 35 | 不新增独立模型/服务依赖 | build、workflow | 确定性代码；正常一次规划＋一次视觉审阅；没有数据库/Electron |
| 36 | 12/30分钟为目标非实测 | 此表、implementation-status | **尚无公平首版中位数/完整协作性能样本**；局部测试耗时不能替代 |
| 37 | SKILL 保持轻量 | SKILL＋references＋lib | 主入口只留合同，细节按需读取；Skill validation 单独执行 |
| 38 | Schema 与兼容升级 | Task Schema2.0/Planning2.5/IR1.5、ir-version | 版本回归；旧计算布局清除，重新验证语义提议 |
| 39 | 确认文件逐一落地 | 本提交的 schema/agents/references/Canvas/router/task/tests | expression 文档补候选验证说明；无 HTML/Deck 文件变更 |
| 40 | rc.3→rc.4 prerelease | VERSION、package、安装器、RELEASE-FINGERPRINT | 保留 rc.3；不发布稳定0.4；安装器资源含新模块并备份旧版 |
| 41 | Content/Intent/Visual/Artifact 四层验收 | build reports＋delivery audit＋implementation-status | Content/Intent/Artifact 有合成自动证据；真实视觉、Windows 与公平 Prompt 实验未完成，不能宣称全部解决 |

## 尚待真实环境/材料的验收（不藏在“通过”里）

1. 带教三份原始 PPT、原始材料、同一任务卡、各次 Prompt 和是否复用旧稿的历史。
2. 三类 Prompt 各至少两次全新 Planner 运行及完整视觉审阅；保存独立运行ID与真实耗时。检查器只审清单，不证明提交清单的真实性。
3. Windows PowerPoint 实际安装、打开、编辑、保存、重开、合并和发布。Mac/bundled renderer 不替代该证据。
4. 认可的原生参考 PPT 的 Style Prior 审阅。当前自动提取主题颜色/字体观测，**不声称自动推导圆角、阴影、时间轴风格和 margin**；这些仍由现有主题与经审阅的设计意图负责，不猜内容槽位。
5. 所有原生箭头可编辑；新增关键路径箭头连接浏览器测得的定位锚点。拖动业务节点后应人工调整关联线，不宣称已实现自动重排的 PowerPoint 图编辑器。

以上待验收项随候选发布公开；正式0.4必须另有全部四层和Windows证据。
