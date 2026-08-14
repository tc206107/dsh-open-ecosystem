# dsh-working-activity — DSH 实时工作状态行插件

> 非官方出品。DeepSeek Harness 的实时"工作状态行"插件：模型的实时活动 —— 俏皮思考文案、真正在跑的工具、已耗时、收尾摘要 —— 在 agent 干活时展示在 Web UI 与 dsh-cc 终端上。

作者：chimney（[@ccch1mneyyy](https://github.com/ccch1mneyyy)）

> 版权归作者本人所有。社区发布，非 DeepSeek 官方项目。

## 特性

- **实时状态行**：由会话事件（`turn/start`、`assistant/chunk`、`tool/call`、`tool/result`、`turn/end`）与 `agent/status` 驱动状态机（idle / waiting / thinking / tool / done）
- **趣味文案**：思考/等待/收尾/失败/深夜五个文案池，思考超时分档（30s / 1m / 5m），全部可关（`phrases: false` 变朴素标签）
- **模型自述（narrate）**：注入约定，模型在正文首行写 `⏵ 你正在做什么`；实时展示在状态行，聊天正文自动过滤该行（日志保留）
- **收尾统计**：`turn/end` 后展示 `搞定 ✓ · N 工具 · 想Xs 干Ys` + token 用量（灰条，仅 done 阶段）
- **两个出口**：Web UI（TurnStatus 状态标签 + WorkingLine 收尾条）+ dsh-cc
  状态栏（消费同一 `activity/status` 事件流，渲染动画指示器 / 流光文案 /
  上下文预警）

## 目录结构

```
packages/activity/working-activity/   插件本体（cordis 宿主插件源码 + 测试 +
                                      cordis.patch.yml 自挂载 bundle patch）
patches/webui-working-activity.patch  Web UI 集成补丁（基于 DSH 20260804 快照）
```

## 安装

前置：官方 `dsh` CLI（`npm install -g @deepseek-ai/dsh`）与 `pnpm`（`dsh plugin`
把安装转发给 pnpm）。

### 1. 安装到 profile

```sh
dsh plugin --profile <你的 profile> add dsh-working-activity
```

本包自带 `dsh.bundle.patch`（自挂载 bundle）：`add` 会在 profile 内
`pnpm add` 安装，随后 CLI 的 reconcile 步骤检测到本包的 bundle 声明，自动把
它追加进 profile 的 `dsh.profile.bundles` 层列表；启动时本包的
`cordis.patch.yml` 会把自己 insert 进组合树——**无需任何手动挂载**。

> 注意：等价的手动方式是 `cd $DSH_HOME/profiles/<你的 profile> && pnpm add
> dsh-working-activity`，但 reconcile（把包追加进 `dsh.profile.bundles`）只
> 在 `dsh plugin` 命令里发生，手动 pnpm add 后需要自己把包名加进该 profile
> 的 `package.json` 的 `dsh.profile.bundles` 列表——直接用 `dsh plugin` 更省事。

源码方式（仅限 DSH monorepo 内开发调试）：把 `packages/activity/working-activity/`
整个目录复制到 monorepo 同路径，`pnpm install` 后即可被 workspace 解析。

### 2. 打 Web UI 补丁（可选，只要 Web 端效果）

```sh
git apply patches/webui-working-activity.patch   # 在 DSH monorepo 根目录执行
```

需要 DSH 源码 checkout。补丁基于 DSH 20260804 快照生成，改动 12 个文件
（runtime + ui-conversation），验证过可干净应用；只想要终端/状态栏效果
（dsh-cc）的可以不打。

### 3. 启用插件

装好后无需手动挂载：`dsh --profile <你的 profile>` 启动时本包的 bundle patch
会把自己挂进树。想调参时在该 profile 的用户补丁层
`$DSH_HOME/profiles/<你的 profile>/cordis.patch.yml`（顶层 YAML 数组，
`!!js` 可用）里按 id 覆盖 config——**不要再 insert 同名行**：

```yaml
- id: working-activity
  config:
    publishIntervalMs: 500   # 状态快照发布间隔（越小越跟手）
```

**dsh-cc 效果**：装好
[dsh-cc-tui](https://github.com/ccch1mneyyy/dsh-cc-tui)（`dsh plugin --profile cc-tui add dsh-cc-tui`）
后同装本插件即可——cc-tui 状态栏第三行消费 `activity/status` 事件，渲染动画
指示器（28 预设，`config.activityFrames`）、白色流光文案、`⚠` 上下文预警与
`⏵` 自述，聊天正文自动过滤 `⏵` 行。建议把 `publishIntervalMs` 调到 `500`
让状态栏秒数跳动跟手；**推荐安装顺序是先 add 本包、再 add dsh-cc-tui**（这样
cc-tui bundle patch 里对 `working-activity` 行的 `publishIntervalMs: 500`
覆盖能命中本行；反过来会因行尚未存在而打一条警告后跳过，需自己在用户层
覆盖）：

```sh
dsh plugin --profile cc-tui add dsh-working-activity
dsh plugin --profile cc-tui add dsh-cc-tui
```

### 4. 配置

| Key | Type | Default | Meaning |
|---|---|---|---|
| `phrases` | `boolean` | `true` | 趣味文案池；`false` 渲染朴素功能标签 |
| `publish` | `boolean` | `true` | 追加 `activity/status` 会话事件供 UI 消费（Web UI / dsh-cc） |
| `tickMs` | `number` | `500` | 状态渲染 tick 间隔（100–5000） |
| `publishIntervalMs` | `number` | `2000` | 稳定行最小发布间隔（500–30000）；dsh-cc 建议 `500` |
| `detailLimit` | `number` | `40` | 展示细节最大长度（路径/命令/模式），8–120 |
| `customActions` | `object` | `{}` | 工具名精确匹配 → 动作文案池 |
| `narrate` | `boolean` | `true` | 注入 `⏵` 自述约定并实时展示 |

## 隐私与安全

- 插件**不采集、不上传任何数据**。全部状态由本机会话事件推导，`activity/status`
  仅写入本地会话日志（log-only 事件，模型不可见，回放忽略）。
- 无网络请求、无遥测、无外部依赖注入；`customActions`/文案池只存在你的本地配置里。
- 许可证：BSD-3-Clause（见插件包 `package.json`；本仓库说明文档 MIT）。

## 已知限制

- 单一状态行：每会话一条，Web/终端消费端显示最近活跃会话。
- 无进度百分比：DSH 没有工具进度事件，长工具只显示已耗时。
- 无动画帧：事件载荷为静态文本片段（dsh-cc 渲染侧自带动画指示器与流光）。
- Web 双入口：`WorkingLine` 与 `TurnStatus` 在收尾阶段展示同一快照；dock 条目
  服务于回合标签不可见的会话视图。

## 开发

```sh
pnpm install && pnpm run build   # 构建（tsc，产物进 lib/）
pnpm test                        # 单测 + 集成测试（状态机/文案/自述/集成 34 项）
```

> 测试在 DSH monorepo 内运行（vitest）；依赖已发布到 npm 的官方
> `@deepseek-ai/dsh-*@0.1.0-rc.6` 包（见 package.json devDependencies），
> 不再需要源码 workspace 链接。独立安装本包时没有 test 脚本，只有 `build`。

