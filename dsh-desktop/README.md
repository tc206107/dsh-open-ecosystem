# DeepSeek Harness Desktop

一个把 **DeepSeek Harness 网页端**（`dsh web`）封装成**原生独立桌面窗口**的壳应用。

它只做"宿主"：**不重写前端**，而是用 Electron 原生态无边框窗口加载 Harness 已有的网页 UI，真正的前端仍是
`@deepseek-ai/dsh-web-frontend`。因此所有模型、会话、插件能力都与浏览器端完全一致，又带有桌面原生观感。

## 原生独立窗口设计

- **无边框、无地址栏、无菜单栏**：`frame: false` + `titleBarStyle: hidden` + Windows 原生标题栏覆盖层
  （窗口右上角仅保留最小化/最大化/关闭，顶栏为高可拖区域），内容真正顶到边。视觉上就是一个独立的桌面
  程序，**看不出"套了个网页"**。
- **自持独立服务器（默认）**：应用启动时自己在一个私有空闲端口拉起一台专属 `dsh web，
  **不依赖也不混用**浏览器里已开着的 Harness（`:3080` 那套）——互不干扰、各自独立。
  退出时自动 `taskkill /T /F` 清理整棵进程树，绝不留孤儿。
- 若你确实想复用已运行的服务，可设 `DSH_DESKTOP_ATTACH=1` 走"附着"模式。

## 特性

- **原生窗口**：Electron `BrowserWindow`，自动记忆窗口位置与尺寸。
- **系统托盘**：点击窗口关闭仅最小化到托盘；托盘菜单含 *显示 / 刷新 / 在浏览器打开 / 退出*。
- **单实例锁**：重复启动会聚焦已有窗口而非重复拉起。
- **进程台账**：复用本地 Codex 的 `process_manager/chat_processes.json` 思路，把托管服务器记录到
  `~/.dsh/desktop/processes.json`，退出时自动清理整棵进程树。
- **直接执行 node**：解析到系统 `node.exe` + dsh 入口 `bin.js` 直接 spawn（不经 `.cmd` 壳），
  保证进程树可被干净回收。
- **干净退出**：真正的"退出"通过托盘菜单（或关闭窗口后托盘 *Quit*）。
- **内置持久排版**：桌面窗口每次加载时通过 `webContents.insertCSS` 注入 `styles/typography.css`——中文标题
  用**楷体**、操作界面与输入输出正文用**新宋(NSimSun)**、英文与数字用 **Times New Roman**，并整体统一缩小 2px。
  随桌面应用持久生效、跨重启保留，无需浏览器会话（设 `DSH_DESKTOP_NO_TYPO=1` 可临时关闭）。

## 目录布局

| 数据 | 路径 |
| --- | --- |
| 进程台账 | `~/.dsh/desktop/processes.json` |
| 窗口状态 | `~/.dsh/desktop/window-state.json` |
| 运行日志 | `~/.dsh/desktop/desktop.log` |

## 开发

```bash
npm install          # 安装 electron / electron-builder
npm start            # 直接以 Electron 启动（默认自持独立服务器 + 无边框窗口）
```

启动前请确保 `dsh` CLI 已在 PATH（`dsh.cmd`）。可用环境变量覆盖：

- `DSH_DESKTOP_ATTACH=1` — 改为附着到已运行在 `:3080` 的 Harness，而不自持服务器
- `DSH_DESKTOP_DSH` — 指定 dsh 可执行文件路径
- `DSH_HOME` — 覆盖数据目录（默认 `~/.dsh`）

## 打包

```bash
npm run dist            # 同时产出 Windows 便携版(.exe) + NSIS 安装包，输出到 dist/
npm run dist:portable   # 仅便携版（如 DeepSeek Harness Desktop-0.1.0-portable-x64.exe）
npm run dist:nsis       # 仅安装版（DeepSeek Harness Desktop-0.1.0-x64.exe）
npm run pack            # 仅解包目录 dist/win-unpacked/，用于快速冒烟
```

产物在 `dist/`：

- `DeepSeek Harness Desktop-<version>-portable-x64.exe`（免安装便携版，双击即用）
- `DeepSeek Harness Desktop-<version>-x64.exe`（NSIS 安装器，可选安装目录 / 桌面与开始菜单快捷方式）

> 说明：`build.win.signAndEditExecutable` 设为 `false`，避免在无管理员/Developer Mode 权
> 限的机器上因 electron-builder 需要创建 macOS 符号链接而打包失败（本机已有导出签名工具链
> 需要该权限）。不影响功能。

## 打包产物验证

```powershell
$env:DSH_DESKTOP_SMOKE="1"   # 加载页面后自动退出
.\dist\"DeepSeek Harness Desktop-0.1.0-portable-x64.exe"
# 日志见 ~/.dsh/desktop/desktop.log，出现 "gui smoke loaded" 即界面成功渲染
```

## 基于本机已有实践的可复用点

- **进程台账**：借鉴既有 CLI Agent 的 `process_manager/chat_processes.json` 思路，用最小 JSON 记录受管进程便于排查/清理（本机实现见 `~/.dsh/desktop/processes.json`）。
- **前端保持单一事实源**：不重复实现前端，仅做 WebView 宿主，降低维护成本并保持与浏览器端行为一致。
