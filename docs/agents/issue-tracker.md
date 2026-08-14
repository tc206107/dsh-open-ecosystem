# Issue Tracker

本仓库不依赖外部 issue 追踪器。规格与工单按项目约定存放：

- **规格**：`docs/specs/`（to-spec 产出）
- **工单**：`.scratch/<feature>/issues/<NN>-<slug>.md`（to-tickets 本地模式，阻塞者先行编号）
- **决策**：`docs/adr/`（ADR，惰性创建，`<NNNN>-slug.md` 顺序编号）
- **领域词汇**：仓库根 `CONTEXT.md`（单上下文）

不使用 `gh issue create`；本地文件即追踪器。
