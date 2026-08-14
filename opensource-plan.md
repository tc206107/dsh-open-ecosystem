# DeepSeek Harness 开源集成适配规划

> 本文档盘点当前环境中针对 DeepSeek Harness (DSH) 已完成的所有插件集成、功能改进与协议优化，
> 按「公开易复用」与「个人可选择特化」两个类别归档，并给出在 GitHub 上开源发布的组织规划。
> 全文仅保留任务指示、逻辑说明与源代码引用，不含任何个人身份信息、真实路径、邮箱或密钥
> （个人路径一律以 `<HOME>` / `<WORKSPACE>` / `<PERSONAL_DIR>` 占位）。

---

## 一、现状盘点：已完成的操作清单

### 1. 桌面壳集成 —— dsh-desktop

**任务指示**：把 `dsh web` 网页端封装成原生独立桌面窗口（Electron），不重写前端。

**逻辑说明**：
- 以「宿主」模式加载官方前端，前端仍是 `@deepseek-ai/dsh-web-frontend`，模型/会话/插件能力与浏览器端一致；
- 默认「自持独立服务器」：启动时在私有空闲端口拉起专属 `dsh web`，退出时 `taskkill /T /F` 清理整棵进程树，不留孤儿；可用 `DSH_DESKTOP_ATTACH=1` 切换为附着已有 `:3080` 服务；
- 无边框窗口（`frame:false` + Windows 原生标题栏覆盖层 + 顶部 12px 隐形拖拽条）；
- 单实例锁、系统托盘（显示/刷新/在浏览器打开/退出）、窗口位置尺寸持久化；
- 进程台账复用 Codex `process_manager/chat_processes.json` 思路 → `~/.dsh/desktop/processes.json`；
- 直接解析 `node.exe` + dsh `bin.js` 执行（不经 `.cmd` 壳），保证进程树可回收；
- 全局排版注入：`webContents.insertCSS` 注入 `styles/typography.css`（楷体标题 / 新宋正文 / Times 拉丁 / 整体 -2px），`DSH_DESKTOP_NO_TYPO=1` 可关闭；
- 冒烟验证：`DSH_DESKTOP_SMOKE=1` 加载页面后自动退出，日志落 `~/.dsh/desktop/desktop.log`。

**源代码**：
- `dsh-desktop/main.js`（509 行，完整 Electron 主进程：spawn/attach、窗口、托盘、台账、退出清理）
- `dsh-desktop/package.json`（electron-builder 双目标：portable + NSIS；`signAndEditExecutable:false` 规避无管理员权限打包失败）
- `dsh-desktop/styles/typography.css`（CSS 变量覆盖 `--dsw-font-*` 系列 + 元素级回退）
- `dsh-desktop/resources/icon.png|icon.ico`、`dsh-desktop/.gitignore`

### 2. 协议优化 —— 多智能体全局规则（AGENTS.md）

**任务指示**：把一套既有 CLI Agent 的全局协作协议移植为 DSH 的全局规则文件，覆盖执行模式、联网策略、多智能体协作、视觉输入、密钥与日志纪律。

**逻辑说明**（六节）：
1. **持续执行模式**：同一回合内执行到交付完成；仅真实阻塞才结束回合（互斥决策/密钥/审批/定时汇报）；禁止独立中间进度消息；沙箱/网络被拦截时直接升级执行；
2. **全局联网策略**：访问非中国平台前先 `codex-net ensure`（ProtonVPN），禁止因网络失败结束任务，下载用 `curl -C -` 断点续传；
3. **多智能体跨模型协作**：coding 任务默认主脑（pro）规划/汇总 + 子执行器（flash）编码，层内并发 ≤5，子产出必须本机实测通过；30 行内小修等例外可直写；
4. **视觉/多模态输入**：自动识别图片/截图/文档并纳入任务；
5. **密钥与日志**：密钥仅从指定 `.env` 读取、严禁硬编码；`**[ERROR]**` 暂停、`**[STRATEGY]**` 默认隐藏；操作记入切换日志；
6. **内置技能与第三方工具适配**：登记已封装的 skills 与各平台能力的 DSH 原生等价映射。

**源代码**：`<HOME>/.dsh/AGENTS.md`（58 行，全量规则，见上文逻辑）。

> **脱敏状态（已实施）**：协议中所有个人路径已参数化为 `<框架目录>` / `<日志目录>` / `<音乐工作区>` 等占位符。

### 3. 工具链封装 —— Skills（8 个，`<HOME>/.dsh/skills/`）

| Skill | 任务指示 | 逻辑说明 | 源码 |
|---|---|---|---|
| **codex-net** | 确保外网可用并提供 curl 下载封装 | 探测 google/drive/github/arxiv 连通性；失败则拉起 VPN 客户端并轮询等待；curl 带浏览器 UA 与断点续传 | `scripts/codex_net.ps1`（73 行） |
| **deepseek-multi-agent** | 运行主脑规划→子执行器编码→主脑汇总的一键多智能体管线 | 调用 `python -m multi_agent auto`；主脑 `deepseek-v4-pro`、子执行器 `deepseek-v4-flash`；产物落带时间戳目录含 `SUMMARY.md` | `scripts/run_multi_agent.ps1`（14 行） |
| **subagent-wait** | 阻塞等待一个后台子代理 settle 并取回结果 | 以动态 Cordis 插件形式注册 `subagent_wait` Host 工具：监听 `subagent/end` 事件为权威信号，`agents.get` 轮询兜底，支持超时/取消；返回 `settled/via/stop_reason/result_text` | `plugin_host.js`（141 行，完整可粘贴 `code.host` 函数体） |
| **audio-transcribe** | 语音转文字（双引擎并行加权） | 封装既有 ASR 实现：faster-whisper + GLM-ASR 并行加权，长音频分片 ≤5 子代理扇出后按序合并；只处理语音，音乐仅给元数据 | `scripts/transcribe.ps1`（11 行） |
| **latex-compile** | LaTeX 编译为 PDF | tectonic → xelatex → pdflatex 优先级探测；失败读 `.log` 定位首个 error 并给修复建议 | `scripts/latex_compile.ps1`（14 行） |
| **mcp-services** | 经 dsh MCP 客户端接入 Linear/Notion/Zotero | 每个 server 在 `cordis.patch.yml` 加一行（stdio 或 HTTP）；工具名 `mcp__<server>__<tool>`；凭据仅环境变量注入（`!!js` 读 `process.env.*`） | `scripts/mcp.patch.example.yml`（18 行，三服务接入模板） |
| **multimodal** | 为纯文本模型提供视觉理解 + 语义识别 | 三层：文本层（Windows OCR 中英 + 图像统计 + 文档结构提取）、语义层（人脸检测 + 类型启发式）、场景层（可选视觉模型 hook，未配置则本地回退）；默认 ≤5 并发子代理扇出 OCR/统计/语义后合并 | `SKILL.md`（89 行）+ scripts 族 |
| **music-render-compose** | 音乐渲染与制作工作台 | FluidSynth+GeneralUser 渲染 MIDI→WAV；风格渲染与 -1dBFS 响度归一；MIDI 演奏层增强（力度/rubato/CC64/CC11/CC1）；MusicGen/MuseCoco 作曲；Web UI（127.0.0.1:8787）8 模块状态 + GPU 显存守卫 | `SKILL.md` + 5 个 ps1 脚本 |

#### 参数化脱敏环境变量约定（已实施）

所有脚本中原先硬编码的个人绝对路径已替换为环境变量 + `$HOME` 回退，发布时仅需设置环境变量即可指向任意部署：

| 脚本 | 环境变量 | 默认回退 |
|---|---|---|
| `codex-net/codex_net.ps1` | `NET_VPN_EXE`（VPN 客户端）、`NET_PROBE_URLS`（探测地址） | 不自动拉起 VPN（仅提示） |
| `deepseek-multi-agent/run_multi_agent.ps1` | `MULTI_AGENT_DIR`（框架目录）、`MULTI_AGENT_PY`（Python） | `$HOME\multi-agent-framework` + PATH python |
| `audio-transcribe/transcribe.ps1` | `ASR_PYTHON`、`ASR_SCRIPT` | PATH python + `$HOME\.asr\asr.py` |
| `music-render-compose/*.ps1` | `MUSIC_DIR`（工作区）、`MUSIC_PY`（GPU Python）、`MUSIC_FS`（FluidSynth）、`MUSIC_SF`（SoundFont） | `$HOME\music-workspace` + PATH python + `$HOME\music-tools\...` |

> 修复记录：脱敏过程中发现并修复 4 处脚本 bug——`$args` 自动变量被用作数组名（transcribe/compose_musicgen）、`plugin_host.js` 的 `loop-error` 分支幂等短路导致 `via` 丢失、以及 2 处 Python 解释器未统一解析。全部 9 个 ps1 已通过 PowerShell 语法解析验证。

### 4. Profile 插件集成 —— web profile

**任务指示**：为 Web GUI profile 挂载社区侧边栏工作台插件并适配 Windows 供应链策略。

**逻辑说明**：
- 安装 `dsh-better-sidebar@0.10.2`（右侧栏 + 底部面板双工作台：文件管理/编辑预览/浏览器/终端/Git 面板/后台任务页）；
- 通过 `package.json` 的 `dsh.profile.bundles` 声明 bundle 层：`@deepseek-ai/dsh-base` → `@deepseek-ai/dsh-web-app` → `dsh-better-sidebar`；
- pnpm-workspace 供应链策略：`nodeLinker:hoisted`、`autoInstallPeers:false`、`minimumReleaseAgeExclude` 豁免 <24h 新版本、`allowBuilds` 放行 node-pty/protobufjs 原生构建；
- 全局设置：`permission.defaultPreset: danger-full-access`、locale zh、默认模型 provider/model/reasoningEffort。

**源代码**：
- `<HOME>/.dsh/profiles/web/package.json`、`pnpm-workspace.yaml`、`cordis.yml`、`cordis.patch.yml`
- `<HOME>/.dsh/settings.yaml`

### 5. 生态调研与落地路线

**任务指示**：扫描 `dsh-plugin` topic 生态，产出分类调研报告与本机适配建议（不安装）。

**逻辑说明**：20 个仓库按真实内容分 6 类（本体/可实装 npm 插件/皮肤包/skill 包/独立应用/生态目录）；识别 5 个可 `dsh plugin add` 的 npm 包；给出四阶段落地路线（前置 pnpm → 低风险皮肤探针 → 独立 profile 隔离验证 → 视觉二选一 → 落盘归档）；关键信号：官方 developer preview 频繁破坏兼容，装前必查 `awesome-dsh-plugins` 当日兼容矩阵。

**源代码**：`<WORKSPACE>/report/dsg-plugin-调研报告.md`（210 行）；原始材料见 `readmes/`（9 份）与 `research_repos/`（9 份 README 快照）、`topic_dsh-plugin.html`。

### 6. 工作区工程化

**任务指示**：把 `<WORKSPACE>`（含上述全部材料）初始化为 git 仓库，写 `.gitignore` 排除构建产物与依赖。

**逻辑说明**：忽略 `DeepSeek Harness Desktop/`（打包产物，数百 MB 二进制）、`dsh-desktop/node_modules|dist/`、通用日志/系统文件；首次提交 29 个文本文件。

**源代码**：`<WORKSPACE>/.gitignore`（10 行）。

### 7. 附带发现 —— dsh-git-autoinit 插件

**任务指示**：让任意会话/工作区工作目录自动获得 git 仓库（幂等），使侧边栏 Git 面板始终可用。

**逻辑说明**：Host 半插件。挂载时扫描全部既有会话 cwd 与已注册工作区，并监听 `session/created` 覆盖未来会话；对每个目录 `git init`（非工作树时）+ 缺省时回填保守 `.gitignore`（不覆盖已有文件）。`runGit` 用 `spawn('git')` 收集输出、`ensure` 按 cwd 去重合并并发，`sessions.list()` / `workspaceRegistry.list()` 均已核对该两服务真实存在。

**源代码**：`<WORKSPACE>/dsh-git-autoinit/`（`lib/index.js` 122 行 + `cordis.patch.yml` 9 行 + `package.json`，含 `dsh.bundle.patch` 声明，MIT）。

> 归类：**公开易复用**——通用 git 工作区自举模式，可并入「dsh-utils」插件集。已核查无个人信息、API 形状正确。

---

## 二、分类归档

### A. 公开易复用（可开源、通用性强、无个人依赖）

| 组件 | 可复用内容 | 依赖面 | 开源形态建议 |
|---|---|---|---|
| **dsh-desktop 壳** | Electron 宿主模式：attach/spawn 双模式、无边框窗口、托盘、进程台账、`taskkill /T` 树清理、冒烟测试 | Node + electron-builder，跨平台（Windows 已验证） | 独立仓库 `dsh-desktop`（MIT），附打包/冒烟说明 |
| **subagent-wait 插件** | `subagent_wait` Host 工具完整实现：事件监听 + registry 轮询双通道、超时/取消语义、结构化返回 | DSH `harness` Builtin + `agents`/`subagents`/`timer` 可选服务 | 可并入「dsh-utils」插件集或独立发布；含 SKILL.md 说明 |
| **codex-net 脚本** | 外网连通性探测 + VPN 拉起 + curl 封装（浏览器 UA、断点续传） | Windows + curl + ProtonVPN（路径参数化后可选） | 并入 `dsh-tools` 仓库；ProtonVPN 路径改为配置项 |
| **latex-compile 脚本** | 多引擎探测编译 + 错误定位修复建议 | 任意平台（tectonic/xelatex/pdflatex） | 并入 `dsh-tools`；纯 PowerShell 14 行 |
| **mcp-services 模板** | stdio/HTTP 两种 MCP 接入的 `cordis.patch.yml` 模板 + 凭据环境变量注入约定 | DSH `@deepseek-ai/dsh-mcp-client` | 并入 `dsh-tools`；模板即文档 |
| **AGENTS.md 协议骨架** | 六节协议（持续执行/联网策略/多智能体协作/视觉/密钥纪律/技能登记）的通用规则 | 与具体 CLI 解耦后通用 | 发布为「多智能体协作协议模板」文档仓库 |
| **调研方法论** | topic 雷达扫描、6 类分类法、L0-L4 证据分级、四阶段落地路线 | GitHub API/只读抓取 | 作为 `awesome-dsh-integration-guide` 文档仓库 |
| **profile 供应链适配** | pnpm `allowBuilds`/`minimumReleaseAgeExclude`/hoisted 配置配方 | pnpm ≥10 | 并入安装指南文档 |

### B. 个人可选择特化（依赖个人环境/偏好/领域，选择性开源或仅留示例）

| 组件 | 特化点 | 开源处理建议 |
|---|---|---|
| **music-render-compose** | 依赖个人音乐工作区 `<PERSONAL_DIR>`、特定模型/音源路径、GPU 环境 | 仅开源 SKILL.md 骨架与脚本模板（路径参数化），模型/音源不随包分发 |
| **audio-transcribe** | 依赖既有 ASR 实现与密钥配置（faster-whisper + GLM-ASR 加权） | 开源封装层 + 配置示例（不含密钥）；双引擎权重表给示例值 |
| **multimodal** | 依赖个人 OCR/视觉 hook 配置与脚本族 | 开源 SKILL.md 与脚本（`$env:CODEX_HOME` 改为 `$env:SKILLS_HOME` 占位）；vision hook 配置给 example 文件 |
| **deepseek-multi-agent** | 依赖个人框架目录 `<PERSONAL_DIR>` 与 miniconda 路径 | 开源调用封装（路径参数化）；核心框架另立仓库或仅引用 |
| **typography.css** | 个人字体偏好（楷体/新宋/Times） | 作为 dsh-desktop 的可选皮肤/样式示例保留，不开源为独立包 |
| **AGENTS.md 个人段落** | 个人路径、密钥位置、音乐/转写工作台登记 | 开源版替换为占位符并移除个人段落 |
| **settings.yaml / profile 配置** | 具体模型路由、权限预设、locale 为个人选择 | 只开源「配方」文档，不随包分发实际配置 |

---

## 三、GitHub 开源规划

### 3.1 仓库架构（建议 monorepo 单仓库多包）

```
dsh-open-ecosystem/
├── README.md                 # 总览：组件矩阵 + 分类导航 + 快速开始
├── LICENSE                   # MIT（含第三方代码保留原 LICENSE/署名）
├── .gitignore                # 忽略 node_modules/dist/打包产物/密钥/配置
├── docs/
│   ├── protocol-agents.md    # 多智能体协作协议骨架（脱敏版 AGENTS.md）
│   ├── ecosystem-research.md # 生态调研方法论 + 20 仓库 6 类分类法
│   └── profile-supply-chain.md  # pnpm 供应链适配配方
├── apps/
│   └── dsh-desktop/          # Electron 宿主壳（main.js/package.json/typography.css/resources）
├── plugins/
│   └── dsh-utils/            # subagent_wait 等通用动态工具（Host 源码 + SKILL.md）
├── tools/
│   ├── codex-net/            # 联网确保脚本（VPN 路径参数化）
│   ├── latex-compile/        # LaTeX 编译脚本
│   └── mcp-templates/        # MCP 接入 cordis.patch.yml 模板
└── examples/
    ├── music-workbench/      # 音乐工作台脚本模板（路径参数化，不含资源）
    ├── asr-wrapper/          # 转写封装层 + 配置示例
    └── multimodal/           # 视觉 skill 脚本（路径占位）
```

### 3.2 发布与兼容策略

1. **许可证**：主仓库 MIT；引用/复制的第三方代码（调研 README 等）保留各自 LICENSE 与署名，不搬代码、优先 fork 或依赖引用；
2. **版本对齐**：DSH 官方为 developer preview（破坏性变更频繁），所有组件声明 `peerDependencies` 对齐 `@deepseek-ai/* ^0.1.0-rc.x`，并在 README 标注「已验证 mainline commit」；
3. **可复现**：每个组件给出「安装 → 配置 → 最小验证」三步（含 `dsh plugin --profile <p> add` 与冒烟命令）；profile 供应链配方（allowBuilds/minimumReleaseAgeExclude）随文档发布；
4. **CI**：插件/工具包跑 lint + 单测（vitest/tsc --noEmit），桌面壳跑 headless 冒烟（`DSH_DESKTOP_SMOKE=1`）；
5. **发布通道**：通用工具与插件发布 npm（如 `@<org>/dsh-utils`），桌面壳发布 GitHub Releases（portable + NSIS 双目标）。

### 3.3 脱敏清单（发布前必须执行）

| 类别 | 处理 |
|---|---|
| 用户名 / 邮箱 | 从 git 历史、注释、README 中清除 |
| 个人目录 | `<HOME>`、`<WORKSPACE>`、`<PERSONAL_DIR>` 一律占位化 |
| API 密钥 / token | 仅保留环境变量名（如 `DEEPSEEK_API_KEY`），值绝不出现 |
| 会话/日志文件 | 不入库；`.gitignore` 覆盖 `*.log`、`sessions/`、`storages/` |
| 隐私路径（音乐/转写/视觉工作区） | 脚本改为参数/环境变量注入，示例文件给占位值 |

### 3.4 分阶段路线

1. **阶段 1 骨架**：建仓 + LICENSE + README + 脱敏清单；先收 `dsh-desktop` 与 `dsh-utils(subagent_wait)` 两个高价值组件；
2. **阶段 2 工具集**：收 `codex-net` / `latex-compile` / `mcp-templates`（路径参数化后）；补 CI 冒烟；
3. **阶段 3 文档**：协议骨架 + 生态调研方法论 + profile 供应链配方；
4. **阶段 4 示例**：music/asr/multimodal 以「示例模板」形式收编（不含个人资源与密钥）；
5. **阶段 5 持续**：跟踪 mainline 兼容矩阵，每组件标注已验证 commit；接受社区 PR 补充平台适配（macOS/Linux）。

---

## 四、附录：第三方生态参考速览（调研所得，非本机操作）

- **可实装 npm 插件**：`dsh-cc-tui`（Claude Code 风格 TUI）、`dsh-better-sidebar`（侧边栏工作台）、`@linxin666/dsh-web-ui-all`（UI 插件+皮肤聚合）、`@liustack/modlens`（视觉）、`@dsh-external/dsh-vision-toolkit`（视觉，私有仓库）；
- **非插件（独立应用/平台）**：mobius（Agent OS）、deeptide（macOS）、axern（Go 沙箱）、open-managed-agents（Managed Agents 运行时）、Abu-Cowork（Electron 桌面助手）——均无 Cordis 集成代码，仅标签关联；
- **生态目录**：`awesome-dsh-plugins`（288 仓库 + 每日兼容雷达，L0-L4 证据分级）、`awesome-deepseek-harness`（精选索引）；
- **关键风险信号**：官方 developer preview 破坏性变更频繁；`dsh-working-activity`（cc-tui 强依赖）在某快照日仍标记「需适配」；视觉插件二选一避免重复。
