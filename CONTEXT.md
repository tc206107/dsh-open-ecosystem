# dsh-open-ecosystem Context

一个面向 DeepSeek Harness (dsh) 的开源集成与适配集合：桌面壳、通用工具插件、工程纪律 skills 与生态调研材料。全部组件都是纯集成层——不修改 DSH 源码，只以插件/脚本/配置方式挂载，卸载即还原。

## Language

**dsh（DeepSeek Harness）**:
DeepSeek AI 的智能体运行框架，一切皆插件，底层由 Cordis 驱动。
_Avoid_: harness（泛指时）、agent framework

**Cordis**:
DSH 的插件运行时框架；插件以「行」的形式挂载进组合树。
_Avoid_: plugin framework、DI container

**bundle**:
DSH profile 中按 `dsh.profile.bundles` 声明、随启动自动挂载的插件层。
_Avoid_: plugin package、module

**profile**:
DSH 的一组独立配置（如 `web`、`cc-tui`），含自己的 package.json 与 cordis 组合层。
_Avoid_: workspace（与 pnpm workspace 混义）、environment

**skill**:
`~/.dsh/skills/<name>/SKILL.md` 形式的能力包，模型按 description/whenToUse 自动加载，用户可 `/name` 显式调用。
_Avoid_: plugin、tool（工具是模型可直接调用的函数，与 skill 不同层）

**工程纪律 skill**:
移植自 mattpocock/skills 设计哲学的 DSH 技能集：对齐（grilling/grill-with-docs/domain-modeling）→ 设计（to-spec/to-tickets/codebase-design/prototype）→ 实现（tdd）→ 验证（diagnosing-bugs/research）→ 评审（code-review/improve-codebase-architecture）→ 交接（handoff）。
_Avoid_: engineering tools、workflow pack

**seam（接缝）**:
模块接口所坐落的位置；测试与调用都穿过接缝，不伸进内部。
_Avoid_: boundary（与 DDD 有界上下文混义）

**deep module（深模块）**:
小接口 + 大量行为的模块，给调用者杠杆（leverage）、给维护者局部性（locality）。
_Avoid_: component、service

**曳光弹工单（tracer-bullet ticket）**:
一条窄但完整、贯穿各层的垂直切片，完成后可独立演示；是 to-tickets 的产出单位。
_Avoid_: task、subtask

**脱敏（sanitize）**:
把个人路径、用户名、邮箱、密钥替换为占位符/环境变量的过程；本仓库所有组件发布前必须脱敏。
_Avoid_: 清洗（清洗指数据清理，不同义）
