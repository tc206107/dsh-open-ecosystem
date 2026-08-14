# `dsh-plugin` 生态调研报告与本机适配建议

> 调研对象：<https://github.com/topics/dsh-plugin>（20 个仓库）
> 调研方式：README/元数据只读抓取 · GitHub API · 本机环境探测
> 交付物类型：**类别（只看不做）** —— 仅输出调研报告与适配建议，未安装、未改动本机配置
> 生成时间：2026-08 会话

---

## 一、结论速览（TL;DR）

1. `dsh-plugin` topic 下的 20 个仓库并非都是"可安装的 DSH 插件"，而是混杂了 6 类对象：DSH 本体、**可实装的 npm 插件**、纯皮肤包、skill 包、独立应用/平台、生态目录。
2. **真正能在本机直接 `dsh plugin add` 实装的是 5 个 npm 包**：`dsh-cc-tui`、`dsh-better-sidebar`、`dsh-vision-toolkit`、`@linxin666/dsh-web-ui-all`（聚合）、`@liustack/modlens`。
3. 本机当前环境：Node v24.19.0、npm 11.17.0、**dsh 0.1.0-rc.6**（全局）、Python 3.11.14 + 3.13.14、git 2.54；**pnpm 未安装**（但 corepack 0.35 可用）；`web` profile 目前仅挂 base + web-app 两个 bundle，未装任何第三方插件。
4. 官方 DSH 处于 **developer preview**，明确声明"compatibility-breaking changes 频繁"，且生态兼容雷达（`awesome-dsh-plugins`）当日快照显示 `188/288` 仓库仍"待调研"、运行级实测仅 5 例（0 可用）。
5. 因此本机的实装策略应为：**先补齐 pnpm、用独立 profile 隔离测试、逐个验证、再决定是否并入主 web profile**，而非一次性全量安装。

---

## 二、20 个仓库分类总表

> 数据：星数/语言/更新时间来自 GitHub API（2026-08-13 抓取）。

| # | 仓库 | 星数 | 语言 | 类型归类 | 本机可实装？ |
|---|------|------|------|----------|--------------|
| 1 | deepseek-ai/deepseek-harness | 32078 | TypeScript | **DSH 本体** | 已全局安装（0.1.0-rc.6） |
| 2 | titanwings/colleague-skill | 20973 | Python | skill 包（知识蒸馏/数字生命） | 可落 `~/.dsh/skills/` |
| 3 | whiteguo233/OpenBiliClaw | 1858 | Python | 独立内容发现 Agent | 独立部署，非插件 |
| 4 | titanwings/ex-skill | 1040 | Python | skill 包（数字人格） | 可落 skills |
| 5 | paean-ai/deeptide | 1007 | Rust | 独立 Swift/macOS 应用 | **不可**（macOS only） |
| 6 | nutshellai-tech/mobius | 904 | TypeScript | 独立 Agent OS | 独立部署 |
| 7 | liustack/modlens | 650 | TypeScript | **DSH 视觉插件** | ✅ npm 一键 |
| 8 | yejiming/MuseAI | 503 | TypeScript | AI 角色应用（实际 React 19 + Tauri 2 桌面应用，API 的"Vue"为旧表述） | 独立部署 |
| 9 | Anionex/agent-vision-toolkit | 473 | Python | vision skill/CLI（上游） | 可作 skill/依赖 |
| 10 | zhu1090093659/dsh-web-ui | 363 | TypeScript | **DH UI 插件/皮肤集** | ✅ npm 聚合包 |
| 11 | PM-Shawn/Abu-Cowork | 278 | TypeScript | 独立桌面应用（Tauri） | 独立部署 |
| 12 | alaliqing/claude-paper | 267 | Vue | Claude Code 插件 | 面向 CC，非 DSH |
| 13 | cofy-x/axern | 242 | Go | Agent 沙箱基础设施 | 独立起服务 |
| 14 | openma-ai/open-managed-agents | 227 | TypeScript | Managed Agents 运行时 | 独立起服务 |
| 15 | AdamPlatin123/awesome-dsh-plugins | 220 | Shell | **生态目录+兼容雷达** | 参考，非插件 |
| 16 | ccch1mneyyy/dsh-cc-tui | 124 | TypeScript | **DSH 终端 TUI 插件** | ✅ npm 一键 |
| 17 | Anionex/dsh-vision-toolkit | 122 | TypeScript | **DSH 视觉插件（原生）** | ✅（需私有仓库权限） |
| 18 | 0xsline/awesome-deepseek-harness | 101 | Python | 生态精选目录 | 参考，非插件 |
| 19 | omdsh-dev/DSH-better-sidebar | 78 | TypeScript | **DSH 侧边栏工作台插件** | ✅ npm 一键 |
| 20 | Small-tailqwq/dsh-deep-whale | 76 | TypeScript | 纯皮肤包（CC BY-NC-SA） | ✅ 可装（仅皮肤） |

**按类型统计**：
- DSH 本体：1（#1）
- 可直接 `dsh plugin add` 的 npm 插件：5（#7、#10、#16、#17、#19）
- 纯皮肤包：1（#20，且 #10 内含 7 款皮肤）
- skill 包：3（#2、#4、#9）
- 独立应用/平台/基础设施：8（#3、#5、#6、#8、#11、#12、#13、#14）
- 生态目录/雷达：2（#15、#18）

---

## 三、5 个可实装插件的详细适配分析

### 3.1 `dsh-cc-tui` —— Claude Code 风格终端 TUI ⭐ 推荐优先

- **本质**：cordis 插件（纯挂载，零核心改动），给 DSH 提供一个 Claude Code 风格的全屏终端界面。
- **安装**：`dsh plugin --profile cc-tui add dsh-cc-tui`（或仓库 `install.sh`），启动 `dsh --profile cc-tui`。构建产物 `lib/` 已打包进 npm，**安装无需自构建**。
- **关键机制**：
  - 首次 `add` 自动初始化 `$DSH_HOME/profiles/cc-tui/`，manifest 首层 `@deepseek-ai/dsh-base`，再叠加 bundle patch → 你的 `cordis.patch.yml`。
  - 依赖 `dsh-working-activity`（随包自动挂载，勿重复 add）。
  - 所有消息走官方 session 事件流，fork/resume/compact 全走官方服务，卸载即还原。
- **本机适配风险点（重要）**：
  1. ⚠️ **兼容雷达显示 `dsh-working-activity` 当前"需适配"**（见 `awesome-dsh-plugins` 矩阵，mainline `7b9644f`）。这是 cc-tui 的强依赖，装前需确认作者是否已跟进 mainline。
  2. 本机**无 pnpm** —— 安装脚本/preflight 需要 pnpm；需先 `corepack enable` / 装 pnpm ≥ 10。
  3. Windows 剪贴板粘贴依赖 PowerShell `Get-Clipboard`（本机满足）。
  4. 与主 `web` profile 隔离（用独立 `cc-tui` profile），不影响现有 Web 会话。
- **建议**：作为**首个验证目标**，用独立 profile 隔离测试，重点观察 `dsh-working-activity` 是否在当前 mainline 正常加载。

### 3.2 `dsh-better-sidebar` —— 侧边栏/底部双工作台插件 ⭐ 高价值

- **本质**：host/client 双半的完整工作台（文件管理、CodeMirror 编辑、内嵌浏览器、xterm 真终端、Git 面板、后台任务页、移动端适配）。
- **安装**：npm 包 `dsh-better-sidebar@0.10.2`，一键脚本 `curl -fsSL .../install.sh | bash`，或 `dsh plugin --profile web add dsh-better-sidebar`。
- **依赖**：Node ≥ 20、pnpm ≥ 10；`node-pty`/`protobufjs` 需构建脚本授权（Dockerfile `pnpm approve-builds --all`）。
- **本机适配风险点**：
  1. ⚠️ **`node-pty` 是原生模块** —— 需要 Windows 预编译二进制，失败则需 VS Build Tools 编译工具链。README 明确"Windows 经单元测试覆盖，macOS 日常验证"，意味着 Windows 路径**未经真实运行验证**，是本机最大的不确定性。
  2. pnpm 11 的 `strict-dep-builds` / `minimumReleaseAge` 两道供应链拦截，需 `pnpm approve-builds` + 可能重跑一次。
  3. 需 pnpm（本机待装）。
- **建议**：价值最高但 Windows 风险最高，**排第二位验证**，重点看 node-pty 在 Win 上的 prebuilt 是否命中。

### 3.3 `@linxin666/dsh-web-ui-all` —— Web UI 插件+皮肤聚合包

- **本质**：任务看板（含 cron 定时）、Git 图谱、右侧面板、鲸鱼娘宠物、实时令牌统计、移动端远程、SSH 远程连接、7 款皮肤（Windows XP/Minecraft/鲸吟等）+ 设置中心。
- **安装**：`dsh plugin --profile web add @linxin666/dsh-web-ui-all`；单装用 `@linxin666/dsh-skins` 等子包。
- **依赖**：Node ≥ 22（本机满足）；`cloudflared`/`cpu-features`/`ssh2` 需 `allowBuilds`。
- **本机适配风险点**：
  1. `cpu-features`/`ssh2` 原生/预编译依赖，Windows 需 allowBuilds。
  2. 部分功能（SSH 远程、公网隧道）涉及外发，需注意权限范围。
  3. 皮肤为纯前端 CSS，冲突风险低，可单独先装 `dsh-skins` 做低风险探针。
- **建议**：可先装**纯皮肤子包 `@linxin666/dsh-skins`** 验证插件通道打通，再决定是否上全家桶。

### 3.4 `@liustack/modlens` —— 视觉插件（图片→结构化证据）

- **本质**：给 text-only 模型"看图"的插件，原生 `read_image` 工具；粘贴图片直接读取，无需先存文件。模型选择器注入 `DeepSeek-V4-Flash (modlens vision)` / `-Pro` 两个变体。
- **安装**：`npx -y @deepseek-ai/dsh plugin --profile web add @liustack/modlens`。
- **依赖**：零配置复用本机已有 multimodal 模型/登录（Claude Code/Codex/OpenCode/Pi），或自由 Gemini key / Antigravity CLI。
- **本机适配风险点**：
  1. 需要一个视觉引擎 —— 若本机没有 Codex/OpenCode/Pi 登录也没有 Gemini key，需要注册一个（最短 5-10s/读）。
  2. 与 #17 `dsh-vision-toolkit` **功能重叠**（都是视觉补强），不要同时装，二选一。
- **建议**：与 #17 二选一；装前先做健康检查确认视觉引擎可达。

### 3.5 `dsh-vision-toolkit`（Anionex）—— 原生视觉插件（10 工具）

- **本质**：把上游 `agent-vision-toolkit` 封成 DSH 原生 Profile Bundle，10 个结构化 `vision_*` 工具（glance/ground/detect/trace/crop/pixel_diff/OCR/foreground/colors/html_screenshot），带 DSH Credentials、Artifacts、Web 设置页。
- **安装**：`dsh plugin --profile web add <本地克隆路径>`（仓库为私有，需 GitHub 鉴权 clone）。
- **依赖**：Python 3.11+（本机 **3.11.14 满足**）；managed 模式自建隔离 venv（用 uv 或 venv+pip）；远程工具需 OpenAI 兼容视觉端点 + DSH Credential；`vision_html_screenshot` 需 Chrome/Chromium/Edge。
- **本机适配风险点**：
  1. ⚠️ **仓库是私有仓库**（README 明说 "access to this private repository"），无鉴权无法 clone，npm 也未公开 —— 这是本机实装的硬门槛。
  2. 首次启动 managed 模式要网络下载精确版本的 Python 依赖（`runtime/requirements.lock`）。
  3. 本机 Python 3.11 + uv 未确认是否已装 uv（venv 回退可用）。
  4. 与 #7 modlens 功能重叠，二选一。
- **建议**：受"私有仓库"限制，**除非能取得鉴权**，否则本机落不了；退而求其次用 **modlens（#7，公开 npm）** 覆盖同类需求。

---

> ⚠️ **重要发现（标签 ≠ 插件）**：`dsh-plugin`/`dsh-plugins` 只是 GitHub 标签，topic 雷达据此扫描即可命中。经实际阅读 README 与文件树，`mobius`、`deeptide`、`axern`、`open-managed-agents`、`Abu-Cowork` 等仓库**没有任何 Cordis 插件集成代码**，本质是"挂生态标签"的平行竞品/独立软件，与本机 DSH 无集成点。分类必须基于真实内容而非标签。

## 四、skill 包与独立应用类（逐个给落地建议）

### skill 包（可落 `~/.dsh/skills/`）

| 仓库 | 落地形式 | 说明 |
|------|----------|------|
| titanwings/colleague-skill | `~/.dsh/skills/colleague-skill/` | 标准 AgentSkills 结构（dot-skill），直接声明 DSH 支持；知识蒸馏/数字生命 meta-skill，Python |
| titanwings/ex-skill | `~/.dsh/skills/ex-skill/` | 同上标准 AgentSkills 结构，数字人格/角色 skill |
| Anionex/agent-vision-toolkit | 作 `dsh-vision-toolkit`（#17）的上游依赖 | 是 CLI + skill 结构；DSH 侧已有专门集成仓库 #17，单独落 skills 意义不大 |
| alaliqing/claude-paper | — | `.claude-plugin` 结构，面向 Claude Code（依赖 `CLAUDE_PLUGIN_ROOT`），**非 DSH 插件** |
| whiteguo233/OpenBiliClaw | — | Python 后端 + 浏览器插件，已有专门 DSH 客户端插件仓库（此处为内容发现 Agent 本体） |

> 注：本机 `~/.dsh/skills/` 已有 6 个项目 skill（audio-transcribe / codex-net / deepseek-multi-agent / latex-compile / mcp-services / music-render-compose），skill 类仓库可并入同目录，但依赖、密钥、Python 版本需逐个核对。

### 独立应用 / 基础设施（非 DSH 插件，不推荐在本机 DSH 内"实装"）

| 仓库 | 类型 | 本机落地建议 |
|------|------|--------------|
| whiteguo233/OpenBiliClaw | 内容发现 Agent | 独立 pip 部署；非 DSH 插件 |
| paean-ai/deeptide | Swift/macOS coding agent | **本机 Windows 不可用** |
| nutshellai-tech/mobius | Agent OS | 独立平台，需自托管 |
| yejiming/MuseAI | AI 角色应用 | 独立部署 |
| PM-Shawn/Abu-Cowork | 独立桌面应用（Electron + React 19 + Zustand + MCP） | 独立桌面应用，与 DSH 并行 |
| alaliqing/claude-paper | Claude Code 插件（Vue） | 面向 CC，非 DSH web |
| cofy-x/axern | Go/K8s Agent 沙箱（runsc/runc 隔离） | 唯一「有条件落地」级：仅强隔离执行需求时才 Docker/K8s + 适配层；否则用生态内微沙箱插件 |
| openma-ai/open-managed-agents | Managed Agents 运行时（CF Workers/Node） | 独立起服务，与本机 DSH 无直接关系 |

### 生态目录 / 雷达（只参考，不安装）

- **AdamPlatin123/awesome-dsh-plugins**（Shell）：社区插件目录+每日兼容追踪。含分类清单（社区/技能/单插件 195 等）、每日快照（静态矩阵+编译实验+运行实测，L0-L4 证据分级）。**本机适配前应查它的当日矩阵**，是判断插件是否跟进 mainline 的权威信号。
  - 当日快照（2026-08-13，mainline `7b9644f`）：288 仓库 = 41 兼容 / 31 关注 / 9 需适配 / 188 待调研；运行级实测仅 5 例（0 可用）。
  - ⚠️ 直接影响本机决策：`dsh-working-activity`（cc-tui 依赖）当前**"需适配"**。
- **0xsline/awesome-deepseek-harness**（Python）：精选目录（另按 0xsline 自身维护，含 dsh-external/hub 与公开 topic 的来源）。作横向参考。

---

## 五、本机环境测绘结果

| 项 | 状态 | 对实装的影响 |
|----|------|--------------|
| Node.js | v24.19.0 ✅ | 满足所有插件（modlens/better-sidebar 要求 ≥20，web-ui 要求 ≥22） |
| npm | 11.17.0 ✅ | — |
| dsh（全局） | 0.1.0-rc.6 ✅ | 与插件 peer 依赖 `^0.1.0-rc.6` 对齐 |
| pnpm | ❌ 未安装 | **必须先 `corepack enable` 或 `npm i -g pnpm`**（cc-tui/better-sidebar/web-ui 都依赖） |
| Python | 3.11.14 + 3.13.14 ✅ | vision-toolkit 要求 ≥3.11，满足 |
| uv | 未确认 | vision-toolkit managed 模式优先 uv，缺则回退 venv+pip |
| git | 2.54.0 ✅ | 克隆/源码安装可用 |
| web profile | 仅 base + web-app bundle | 干净状态，适合增量挂载 |
| skills 目录 | 6 个项目 skill | skill 类仓库可并入 |
| agent-presets | 空 | 无历史自定义 preset |

---

## 六、推荐的落地路线（供后续"实装"阶段参考）

> 本次按用户要求**未执行**任何安装；以下为后续可执行的优先级路线。

**阶段 0 —— 前置准备**
1. 启用 pnpm：`corepack enable && corepack prepare pnpm@latest --activate`（或 `npm i -g pnpm`）。
2. 查 `awesome-dsh-plugins` 当日矩阵，确认各插件对当前 mainline `7b9644f` 的兼容状态。

**阶段 1 —— 低风险探针**
3. 先装**纯皮肤** `@linxin666/dsh-skins` 至 web profile，验证 `dsh plugin add` → 重启 → 侧边栏生效的通道是否打通。

**阶段 2 —— 独立 profile 隔离验证（不污染主 profile）**
4. `dsh-cc-tui`：新建 `cc-tui` profile 隔离测试，重点验证 `dsh-working-activity`（当前"需适配"）。
5. `dsh-better-sidebar`：重点验证 node-pty 在 Windows 的预编译命中；失败则评估 VS Build Tools。

**阶段 3 —— 视觉能力（二选一）**
6. 公开通道选 `@liustack/modlens`（需一个视觉引擎，如免费 Gemini key）；若能取得 Anionex 私有仓库鉴权，再评估 `dsh-vision-toolkit`。

**阶段 4 —— 落盘归档**
7. 将选定的实装结果固化为**自定义 agent-preset**（`~/.dsh/.agent-presets/<id>/`），或记录 profile 的 `cordis.patch.yml` 变更，作为可复现配置。
8. 全程记录 → `<日志目录>/switch_log.txt`（按全局协议）。

**风险总纲**：
- 官方 developer preview 频繁破坏兼容 → 每个插件装前必须核对 mainline 兼容矩阵。
- 3 个高价值插件（cc-tui/better-sidebar/web-ui）都依赖 pnpm 且含原生模块（node-pty/cpu-features/ssh2）→ Windows 实装是首要风险面。
- 视觉插件二选一避免重复；vision-toolkit 受私有仓库限制。
- 皮肤类（dsh-deep-whale 为 CC BY-NC-SA，需留意非商用条款）与独立应用类不占用 DSH 插件通道。

---

## 七、数据来源

- GitHub topic 页 + API 元数据（星数/语言/推送时间）：<https://github.com/topics/dsh-plugin>
- 各仓库 README（raw HEAD）：readmes/ 目录（本工作区已下载 12 份）
- 生态兼容雷达：<https://github.com/AdamPlatin123/awesome-dsh-plugins>（当日快照 2026-08-13）
- DSH 本体：<https://github.com/deepseek-ai/deepseek-harness>
