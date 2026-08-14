# dsh-open-ecosystem

面向 [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) (dsh) 的开源集成与适配集合：
桌面壳、通用工具插件、环境适配脚本与生态调研材料。

> 所有组件均为**纯集成层**：不修改 DSH 源码，只以插件 / 脚本 / 配置的方式挂载或封装，
> 卸载即完全还原。DSH 处于 developer preview，破坏性变更频繁，各组件标注了已验证的
> `@deepseek-ai/*` 版本范围。

## 组件矩阵

| 组件 | 分类 | 说明 | 形态 |
|---|---|---|---|
| [`dsh-desktop/`](./dsh-desktop) | 公开易复用 | Electron 原生桌面壳：attach/spawn 双模式、无边框窗口、托盘、进程台账、排版注入 | 独立应用（Windows 已验证） |
| [`dsh-git-autoinit/`](./dsh-git-autoinit) | 公开易复用 | 任意会话/工作区自动 `git init` + 缺省 `.gitignore` 回填，侧边栏 Git 面板始终可用 | Cordis 插件（Host half） |
| [`skills/`](./skills) | 公开易复用 | 工程纪律 skill 集（移植自 mattpocock/skills，适配 DSH）：grilling 设计树采访、tdd 红绿循环、diagnosing-bugs 六阶段调试、code-review 双轴评审、handoff 会话交接 | DSH skills（SKILL.md） |
| [`opensource-plan.md`](./opensource-plan.md) | 文档 | 全部集成操作的盘点、分类（公开/特化）与开源规划 | 文档 |
| `readmes/` · `research_repos/` · `report/` | 调研 | dsh-plugin 生态扫描、6 类分类法、落地路线 | 材料 |

## 快速开始

### dsh-desktop（桌面壳）

```bash
cd dsh-desktop
npm install
npm start          # 自持独立 dsh web + 无边框窗口
npm run dist       # 打包 portable + NSIS（Windows）
```

环境变量：`DSH_DESKTOP_ATTACH=1` 附着已有 `:3080` 服务；`DSH_DESKTOP_DSH` 指定 dsh 可执行文件；
`DSH_DESKTOP_NO_TYPO=1` 关闭排版注入；`DSH_DESKTOP_SMOKE=1` 冒烟后自动退出。

### dsh-git-autoinit（自动 git 初始化）

```bash
cd dsh-git-autoinit
npm install
# 在 web profile 挂载（本地路径）
dsh plugin --profile web add "link:$(pwd)"
# 或发布后：dsh plugin --profile web add dsh-git-autoinit
```

插件挂载后，对每个已有会话/工作区目录幂等执行 `git init`（已存在则跳过），
并仅在目录无 `.gitignore` 时回填保守忽略规则。数据落盘见 `~/.dsh/desktop/processes.json` 等。

### 工具脚本（skills）

各环境适配脚本位于 `~/.dsh/skills/<name>/scripts/`（发布形态见
[`opensource-plan.md`](./opensource-plan.md) 的环境变量约定表），全部支持环境变量覆盖
个人路径，默认回退 `$HOME` 下通用目录。

### 工程纪律 skills（对齐→设计→实现→验证→评审）

本仓库 [`skills/`](./skills) 收录 13 个工程纪律 skill（DSH 格式 SKILL.md，源自
[mattpocock/skills](https://github.com/mattpocock/skills) 的设计哲学，适配本机）：
复制到 `~/.dsh/skills/<name>/SKILL.md` 即可被 dsh 自动加载：

| Skill | 何时用 | 核心纪律 |
|---|---|---|
| `grilling` | 需求含糊 / 方案有分支 / 实现前 | 设计树采访：逐轮问 frontier，每个问题给推荐答案，事实自查 |
| `grill-with-docs` | 对齐 + 沉淀文档 | grilling + 术语进 CONTEXT.md、决策进 ADR、需要时产原型 |
| `domain-modeling` | 构建/打磨领域模型 | 挑战术语、边界场景、就地更新 CONTEXT.md 与 ADR |
| `to-spec` | 讨论完需求要产出规格 | 综合会话与代码库理解成规格，不访谈 |
| `to-tickets` | 拆解计划/规格为工单 | 曳光弹垂直切片工单 + 阻塞依赖（blocking edges） |
| `codebase-design` | 设计/改进模块接口 | 深模块词汇（module/interface/seam/adapter/leverage/locality） |
| `improve-codebase-architecture` | 架构巡检 | 扫描深化机会，HTML 报告呈现，逐条评审 |
| `prototype` | 快速验证设计问题 | 逻辑=单 HTML 演示 / UI=同路由多变体 |
| `tdd` | 复杂功能 / 修复缺陷 | 红灯→绿灯循环、seam 接缝预约定、垂直切片 |
| `diagnosing-bugs` | 硬 bug / 性能回退 | 先建 tight 反馈环 → 复现最小化 → 可证伪假设 → 插桩 → 回归 |
| `code-review` | 提交前 / 审查 PR | Standards + Spec 双轴并行子智能体，Fowler 坏味基线 |
| `research` | 调研 / 查证 | 后台子代理对照一手来源，结论落 Markdown 逐条引用 |
| `handoff` | 换会话 / 收尾交接 | 交接文档落临时目录、含建议技能、脱敏 |

## 环境变量约定

| 脚本 | 环境变量 | 默认回退 |
|---|---|---|
| codex-net | `NET_VPN_EXE` / `NET_PROBE_URLS` | 不自动拉起 VPN |
| deepseek-multi-agent | `MULTI_AGENT_DIR` / `MULTI_AGENT_PY` | `$HOME\multi-agent-framework` + PATH python |
| audio-transcribe | `ASR_PYTHON` / `ASR_SCRIPT` | PATH python + `$HOME\.asr\asr.py` |
| music-render-compose | `MUSIC_DIR` / `MUSIC_PY` / `MUSIC_FS` / `MUSIC_SF` | `$HOME\music-workspace` + PATH python |

## 兼容性

- DSH：`@deepseek-ai/dsh ^0.1.0-rc.6`
- Cordis：`@deepseek-ai/cordis ^4.0.1`
- Node.js ≥ 20（dsh-desktop / git-autoinit）；脚本类需 PowerShell 5.1+（Windows）或对应引擎

> 生态兼容信号：装任何社区插件前建议查阅
> [awesome-dsh-plugins](https://github.com/dsh-external/awesome-dsh-plugins) 的当日兼容矩阵。

## 贡献

见 [`CONTRIBUTING.md`](./CONTRIBUTING.md)。

## 许可

MIT © dsh-open-ecosystem contributors。第三方调研材料版权归各自作者，引用时保留署名。
