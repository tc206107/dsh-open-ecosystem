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
