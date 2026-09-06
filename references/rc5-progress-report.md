# rc.5 聚焦增量优化：开发检查点报告

记录日期：2026-09-06。基线：`0.4.0-rc.4 / 2eec88271be8c419d70d8e6f860b198c7bfa55a4`。

**TECHNICALLY PASSED（已执行的回归范围）；VISUALLY NOT ACCEPTED（整体交付质量）。不能宣布 rc.5 候选实现完成。**

本轮没有重建系统。沿用原 Planner 合同、Expression Router、浏览器 Canvas、原生编译器及发布器。六个新增运行库合计 306 行，分别对应来源、执行说明、语义场景、新鲜测试证据、计时和字号合同；不增加 Agent、服务、数据库、第二套 Geometry Engine 或视觉原语种类。

## 1. 版本

隔离开发目录的 VERSION/package 为 `0.4.0-rc.5`，规划/IR 为 `2.6 / 1.6`。这是开发检查点，不是接受验收的发行版。发行指纹未重新签发，运行身份仍为 `modified-or-unverified`，不能冒充 `verified-release`。正式安装继续使用 rc.4。

## 2. Git Commit SHA

本报告随开发检查点代码提交；确切 SHA 以该提交的 `git rev-parse HEAD` 和最终交接消息为准，不把基线 SHA 误称为新实现 SHA。不创建完成版标签，不推送/覆盖正式安装。

隔离仓库：`/Users/mac/Documents/Mint/mint-report-ppt-rc5-implementation`。其 origin 是本地正式仓库，不是 GitHub，后续发布不能直接盲目 `git push origin`。

## 3. R01–R15 状态

逐条代码、验证及缺口见 [rc5-implementation-checklist.md](rc5-implementation-checklist.md)。状态汇总：

| ID | 状态 | 关键验收边界 |
|---|---|---|
| R01 | VERIFIED | 原始结构分母稳定；不宣称原子语义提取自动完整 |
| R02 | IMPLEMENTED | 完整 Decision System 先测；真实短 Prompt 规划待验 |
| R03 | IMPLEMENTED | auto/preview/off 接口；真实默认理解待验 |
| R04 | IMPLEMENTED | 来源绑定与关系验证；最终关系全覆盖待验 |
| R05 | IMPLEMENTED | Claim 合同与负例；自由文本理解不能靠自报通过 |
| R06 | IMPLEMENTED | 局部修复已有实测；完整修复顺序及拆页证明仍不充分 |
| R07 | BLOCKED | overlay/anchor/network 三类区域拓扑仍缺实现，明确阻断 |
| R08 | IMPLEMENTED | 合法叙事不再被 Scene 分支丢失；复杂拓扑一致性待补 |
| R09 | VERIFIED | 对象档案字段、口径分层和原生呈现已核验 |
| R10 | IMPLEMENTED | 十种原语不扩种类；全变体视觉矩阵尚未覆盖 |
| R11 | IMPLEMENTED | 共享字号/事实绑定及负例；全部复杂原生图形尚未实机验收 |
| R12 | IMPLEMENTED | Token 语义设计、自然尺寸；整体视觉仍未通过 |
| R13 | IMPLEMENTED | 五层验收和章级复核合同；真实章级接受尚未通过 |
| R14 | BLOCKED | 测试工具具备；六次独立、可观测读记录的运行未完成 |
| R15 | IMPLEMENTED | 构建阶段可追踪；Planner/人工等待等端到端阶段未接通 |

这里的 IMPLEMENTED 不表示整个要求已经验证；各自仍有明确缺口。没有将未完成项擅自改成 DEFERRED。

## 4. DOMAIN-AGNOSTIC

`tests/domain-agnostic.mjs` 的生产代码业务样例哨兵扫描通过；`tests/domain-invariance.mjs` 对十类合成内容重命名对象，表达、场景和层级不变。新增生产判断基于关系、类型、角色和测量，而不是银行、国家或项目名。

扫描不是对所有可能隐性领域假设的数学证明；十类改名测试也不是实际陌生材料的模型泛化试验。

## 5. 修改文件

入口/合同：`SKILL.md`、`VERSION`、`package.json`、`agents/openai.yaml`、`schemas/slide-ir.schema.json`、`assets/mint-fresh-2/design-tokens.json`、`references/{workflow,design-layout,quality-gates,readability-repair}.md`。

运行脚本：`scripts/{build-section-ppt,audit-design-delivery,audit-prompt-invariance}.mjs`。

既有运行库：`scripts/lib/{source-inventory,source-coverage,outline-planner,composition-classifier,design-intent,evidence-allocation,ir-version,design-canvas,dom-layout-extractor,visual-primitives,chart-display-model,ppt-renderer,artifact-layout}.mjs`。

既有测试：`tests/build-design.e2e.mjs`、`tests/readable-layout.e2e.mjs`。后者将短表断言改为按稳定 ID 查找，不再假定第一个 DOM 模块必然是表格；220px 高度门槛保持不变。

## 6. 新增文件

运行库：`scripts/lib/{canonical-source-ledger,execution-brief,scene-plan,fresh-benchmark,timing-report,typography-contract}.mjs`。

入口：`scripts/{create-canonical-ledger,preflight,create-fresh-benchmark}.mjs`；Schema：`schemas/execution-brief.schema.json`。

测试：`tests/{canonical-source-ledger,execution-brief,domain-agnostic,domain-invariance,rc5-planning,rc5-benchmark-timing,source-adapters}.mjs`、`tests/rc5-scene.e2e.mjs`、`tests/fixtures/rc5-domain-cases.mjs`。

说明：`references/rc5-{implementation-checklist,planning,progress-report}.md`。

## 7. 废止或纠正的逻辑

- Planner 自定义覆盖率分母 → 固定原始结构分母，原始文本范围变化才能改变输入。
- Scene 分支丢掉合法 Visual Narrative → 保留验证结果，不退回普通节点。
- Canvas、原生文字分别猜字号角色 → 共用角色/floor，并显式绑定数值标签角色。
- 空事实对象、漏量词的结构化绑定 → 阻断，不能借改写丢掉“全部/部分/预计”等限定。
- 短表缩小但占据宽外框 → 在现有 content-first split 候选里同步释放空轨道。
- 用外框面积奖励排版 → 评分使用真实文字/表图内容边界；不以填满为目标。
- 90 度线条按未旋转包围框报碰撞 → 使用实际旋转方向；斜线仍需实际渲染检查。
- 相近折线的数据标签穿线 → 有界局部避让，不缩字、不藏值、不换表达。
- 无显式设计要求就报 100% Recall → `null`；语义义务仍必须检查。
- “一两个 P1”固定载体数量 → 由实际内容决定；稀疏原材料不能被强迫凑组件。
- 两次读取结束时钟造成事件时长不等于 end-start → 单次结束时间采样。

## 8. Canonical Source 稳定性

TXT、选定 JSON 原文、合成 DOCX 原段落/表格段落/图片、合成 XLSX 单元格，重复三次 ID 与分母稳定。JSON 选择范围之外的样式元数据变化不改变 canonical IDs。输入缺失、源文件变化、非法 origin、无授权省略会失败。

报告统一使用 `canonicalFactsTotal / canonicalFactsVisible / canonicalFactsOmitted`。分母明确是原始结构单元，不是宣称已自动理解所有原子事实。格式化数字 XLSX 必须提供经核对的显示值导出；未支持格式明确阻断。输入 selector 是否覆盖全部负责人材料仍需原文审阅。

## 9. Claim Support 测试

验证 source-supported/derived/recommendation；缺少推导输入、结果与 claim 不一致、建议无可见标签、来源绑定值不在原文、过期 review、forecast 改写、空结构化事实及 all→some 反例均有检查。

自由文本是否蕴含、是否扩大因果，仍要求在既有审阅阶段真实比较原材料。填一个 reviewed 记录本身不等于理解正确，不能用它宣布 UNDERSTANDING PASS。

## 10. Decision System 测试

同一正式章节内相邻同决策内容跨小标题先完整合并试排。单元测试覆盖先全页测量、自然分组续页、短续页合并、源行保留。十类固定 IR 的浏览器规划共测 26 个候选，输出十个完整页面，未按载体差异拆页。

这些 IR 是测试输入，不是短 Prompt 下模型首次规划结果；真实的决策识别能力不能据此宣布解决。

## 11. Anti-overfit

十类场景：预算、项目依赖/并行、架构、对象比較、趋势、风险、产品取舍、异常交接、稀疏文字、密集表格。通过表达适配检查、对象改名一致性、浏览器尺寸和原生对象检查。未新增业务特判。

实际渲染位置：`/var/folders/db/h0r8gh9s7_n402l8srsxfcyh0000gn/T/mint-rc5-scenes-gzOn7Q/`。含 `capacity-attempts.json`、`manifest.json`、`native-audit.json` 和 `native-1.png` 至 `native-10.png`。临时证据路径可能被系统清理，不作为永久发行资源。

## 12. A/B/C Fresh 结果

**0/6 正式独立 Fresh Run 完成。没有把固定 IR 重放冒充模型实验。**

两轨及共同 canonical hash 校验已加入工具；历史输入、没有观测读记录、记录文件缺失均不能进入正式统计。隔离拷贝输入不等于限制 Agent 读历史，当前 helper 不提供宿主级沙箱。因此必须在可记录实际读取的独立会话中补跑。

## 13. 阶段耗时

最近完整 CLI 合成样例：`/var/folders/db/h0r8gh9s7_n402l8srsxfcyh0000gn/T/mint-build-design-FAaVF0/candidate.pptx.timing-report.json`。

| 阶段 | 秒 |
|---|---:|
| inputScan | 未记录 |
| sourceInventory | 0（低于毫秒计时分辨率） |
| canonicalLedger | 0.001 |
| executionBrief | 0.001（验证，不是 LLM 编写） |
| planning | 未记录 |
| claimValidation | 0（低于计时分辨率） |
| semanticObligations | 0（低于计时分辨率） |
| expressionRouting | 0.004 |
| scenePlanning | 未独立记录 |
| candidateLayout | 6.167 |
| pptCompile | 3.812 |
| render | 1.948（含原生对象审计） |
| visualQA | 未记录 |
| repair | 未记录 |
| finalAudit | 0.009 |
| platformWait | 未执行/未记录 |
| total | 13.168（仅此合成构建） |

已计时活跃阶段合计 11.942 秒；人工审批、平台等待为 `null`。不据此声称完整制作只需 13 秒，也不声称达到 12 分钟中位数目标。整个本轮研发的端到端时长没有完整计时。

## 14. Repair 次数

十类固定 IR 有 26 个候选测量，不等于 26 次修复。实际开发中修复了折线标签、旋转碰撞、原语边界、空绑定以及短表外轨等缺陷，并重跑回归。尚未统一记录 Planner 到最终人工复核的 repair 次数，`repairCount=null`，不伪报 0。

## 15. Slide Visual QA

已检查原生十类场景；表格自然尺寸、对象口径分层、时间范围边界及折线避让得到局部改善。短表说明从远端移至表格旁，实测间隔小于 80px，不通过拉伸表格达标。

**整体仍 VISUALLY NOT ACCEPTED**：部分比较/架构/流程页面仍偏散，架构节点在关系行重复出现，异常回流缺少直观整体结构。稀疏合成原文的留白本身不是内容缺失，也不能编造事实来填满；但它不能证明真实完整汇报的默认设计达到要求。

六种原生图表及两个形状兼容路径回归通过；专项渲染中仍有自动刻度不理想、环图标签白底较重等现象。其技术可读/数据检查不等于审美接受或所有原生图形都通过 PowerPoint。

## 16. Chapter QA

章级七项检查已纳入绑定 PPT 哈希的 review：故事碎片化、风险/措施分离、证据权重、合页机会、标题链、页数理由和整体散乱。缺项/过期记录不能通过设计验收。

合成十页属于十个独立决策，不能替代真实多页同决策的章级验收。目前没有一份真实新生成章节被接受为完整的 rc.5 Golden Benchmark。

## 17. Windows 与发布器

Windows PowerPoint 的打开、编辑、保存、重开、渲染、合并和发布：**未实测**。Mac/bundled renderer 结果不替代它。

`test:publication` 已通过。测试创建四色合成 PPT，实际修改 PPT 包中的页面增删和顺序，放置一份故意过期 IR，最终 HTML 仍输出正确三页及颜色顺序。证据：`/var/folders/db/h0r8gh9s7_n402l8srsxfcyh0000gn/T/mint-publish-authority-SYfn2R/`。这是程序模拟编辑，不是人工 PowerPoint 操作测试。

## 18. BLOCKED / DEFERRED 与下一步

内部未完成：完整容量修复及拆页证明；overlay/anchor/network 区域语法；最终原生语义关系全覆盖；默认章级视觉；完整变体矩阵；端到端计时。它们不是“只差 Windows”。

外部/实验未完成：六次同模型、同输入且实际读记录可审计的独立 Fresh Run；真实 Windows 环境。

用户明确 DEFERRED：动画、新模板、业务专属 layout、增加原语种类、复杂 Style Prior 重构、隐式路由优化、数据库/服务端/Electron、多 Agent Planner、逐页 LLM、页面专属脚本默认化。

下一阶段仍先补既有 Canvas 的拓扑和容量证据，不更换整套架构；然后进行真正的短/长 Prompt 对照。不得为“按时发布”绕过任一硬要求。

## 19. HTML / Deck Skill

没有修改 `mint-report-html` 或 `mint-report-deck`；没有修改当前 PPT→最终只读 HTML 权威关系。正式 `mint-report-ppt` rc.4 仓库与已安装路径未改动。

## 20. 历史用户文件

本轮实现未读取历史用户 PPT/IR 内容，也未覆盖原始材料或用户既有 PPT。读取的是本次需求、项目代码/合同和本轮测试产物；使用了先前对话与项目记忆指导工作，因此本次研发会话本身不是 Fresh Benchmark。生成物来自脱敏/合成测试，写入隔离临时目录。

验证命令：`npm test`、`npm run test:rc5-scenes`、`npm run test:publication`、Skill `quick_validate.py`、`git diff --check`。浏览器测试使用捆绑运行时并在能够启动浏览器的权限下执行；一度缺少渲染脚本环境变量的发布测试，在补齐路径后通过，没有改弱测试。最后的计时修正另经单元及完整 CLI 测试验证。
