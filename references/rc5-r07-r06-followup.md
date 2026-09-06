# rc.5 R07 / R06 后续检查点

日期：2026-09-06。仍是隔离开发，不是完成版或发布版。

## 本轮实际修改

R07：在现有 Scene Plan、Canvas、DOM 提取和原生编译器内补充 network / anchor / overlay。网络节点只生成一次，实际边、回流、自回流及条件保留。网络区域要求显式图关系，不从模块顺序猜边。锚定声明目标和语义方位，不接收坐标。叠加说明使用共享表面并预留文字空间，不盖住业务文本或原图。没有增加 Primitive 种类或业务模板。

渲染复核发现并修复：长连线标签进入标题区域；锚定说明距离对象过远；单个短节点被拉满一行。仍不能把技术通过理解成复杂网络已经适合管理层阅读。

R06：每次候选保存完整内容和 Scene Plan、实际模块/文字/表格尺寸、失败对象、局部修复操作、剩余空白矩形。完整候选与续页候选分开记录。拆分页边界保存前后模块与业务组。修复表格按业务组续页后的 Scene 模块身份映射。浏览器没有成功测量不能成为拆页依据，失败构建也保存尝试记录。

选择局部修改的原因：缺口位于现有拓扑编译和测量证据传递，增加另一套 Planner 或布局器不能解决这些断点。

## 验证

- npm test：当前自然节点宽度代码的最终全量复测通过（退出码 0）。完整 CLI 合成构建证据为 mint-build-design-9K3Wf4；六种原生图表证据为 mint-native-charts-lcnAs3。它们不证明真实业务视觉验收。
- test:rc5-topology：共享节点及回流、自回流、四种 anchor 方位、四种 overlay 方位，共 10 个组件场景；浏览器测量和实际原生 PPT 导出、重开、字号/碰撞检查通过。
- test:rc5-capacity：36 行明细、3 个测量后的自然业务组续页、22 次候选；全部行保留。局部 overflow 可修复时维持单页；无浏览器测量时阻断拆页。
- Skill 文件校验和 git diff --check 通过。

这些都是组件/容量回归，不是六次 Fresh，也不是真实多页章节 Golden。

本地证据保留在：
/Users/mac/Documents/Mint/rc5-local-validation-20260906-r07-r06/

- topology-natural-width/topology.pptx：最新拓扑候选及逐页 native PNG、manifest、native audit。
- topology/：同轮自然宽度修复前的对比，不是最终版本。
- capacity/capacity-attempts.json：完整尝试证据。
- capacity/planned.json 与 capacity/render/：续页边界及浏览器测量结果。

## 未完成，禁止冒称通过

1. R02–R05 的真实 Raw Source + Prompt 规划验证。
2. A1/A2/B1/B2/C1/C2 六次独立 Fresh，当前 0/6。
3. 真实多页章节 Golden、章节标题链及 supporting evidence 权重验收。
4. 真实章节默认视觉质量验收；当前总体仍 VISUALLY NOT ACCEPTED。
5. Planner、Visual QA、Repair、人工/平台等待的完整端到端 Timing。
6. 所有非 Deferred 项目的最终 VERIFIED 审计。

输入恢复更新：用户提供的六个 rc.4 对话已在本地 session 记录中找到。六次模型均为 gpt-5.6-sol / medium，读取的任务卡哈希相同；A/C 组内 Prompt 完全一致，B 组内只差空白字符。原始消息与任务卡已存档至 /Users/mac/Documents/Mint/rc5-benchmark-inputs-20260906/。测试副本只更新 rc.5 版本与路径；原始材料不改写。B 的单页硬约束及额外推导结论保留，比较时不得将页数差异全部归因于规划质量。该目录是本轮从原始记录恢复的新输入包，不是此前已冻结目录。当前带历史上下文的维护会话不算独立 Fresh 运行。

正式 rc.4 仓库仍为 2eec88271be8c419d70d8e6f860b198c7bfa55a4，工作树干净，安装链接未改。无 push、release 或安装替换。本轮新改动尚未提交，基于隔离检查点 af2690c。
