# npm 发布指南（dsh-open-ecosystem）

本仓库 npm 包发布与排障参考。适用：`dsh-git-autoinit`（及后续发布的 skills 包等）。

## 发布流程

### 前置检查

```powershell
cd <package-dir>
npm whoami                          # 必须显示已登录用户
npm pack --dry-run --json           # 预览发布内容（文件白名单、无 BOM）
```

确认发布内容包含全部必需文件（对 Cordis 插件：`lib/` + `cordis.patch.yml` + `package.json`）。

### 登录

两种方式任选：

```powershell
# 方式 A：交互式
npm adduser
# 方式 B：token（npmjs.com Settings → Access Tokens → Generate → Automation）
npm config set //registry.npmjs.org/:_authToken=npm_xxxx
```

> 注意：`adduser` 中途中断会残留**只读权限**的半截 token，导致 `publish` 报 E403
> （`permissions: [{ action: "read" }]`）。用 `npm token list` 检查 token 权限，
> read-only 的 token 无法发布，需重新生成带写权限的 token。

### 发布

```powershell
npm publish
```

npm **不允许覆盖已发布版本号**。修复已发布版本必须升版本号（`0.1.0` → `0.1.1`）再发布。

### 发布后验证

```powershell
npm view <pkg> version                    # latest 应为新版本
npm view <pkg> dist.tarball
npm pack <pkg>                            # 下载解包，确认文件齐全
```

对 Cordis 插件，做一次端到端安装验证（隔离 profile）：

```powershell
dsh plugin --profile verify-<pkg> add <pkg>
# 检查落盘版本与 bundle 解析
```

## 已知坑与解决

### 1. package.json 带 BOM → dsh 解析崩溃

**症状**：`dsh plugin add` 报 `Unexpected token '\ufeff', "\ufeff{"... is not valid JSON`，
栈在 `readProfileManifest`。

**根因**：Windows PowerShell 的 `Set-Content -Encoding UTF8` 写入 **UTF-8 BOM**；
npm 发布时 tarball 原样保留 BOM；dsh 用 `JSON.parse` 读 package.json 时崩溃。

**修复**：发布前用 Node 重写 package.json（无 BOM）：

```js
const fs = require('fs');
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2) + '\n', 'utf8');
```

**验证**：`[System.IO.File]::ReadAllBytes('package.json')[0..2]` 首字节应为 `0x7B`（`{`），
非 `0xEF 0xBB 0xBF`。

### 2. pnpm 11 `minimumReleaseAge` 供应链策略（24 小时限制）

**症状**：发布后 24 小时内用户 `pnpm install` 报
`Added <pkg>@<old-version> to minimumReleaseAgeExclude`，解析回退到旧版本或失败。

**根因**：pnpm 11 默认拒绝安装发布不足 24 小时的新版本（供应链保护）。
`dsh-git-autoinit@0.1.1` 发布于 2026-08-14 06:49 UTC，限止至 2026-08-15 06:49 UTC。

**处理**：
- **无需操作**：24 小时后自动过期，用户即可正常安装。
- **需立即安装**：把 `dsh-git-autoinit@0.1.1` 加入 profile 的
  `pnpm-workspace.yaml` 的 `minimumReleaseAgeExclude`：

  ```yaml
  minimumReleaseAgeExclude:
    - dsh-git-autoinit@0.1.1
  ```

  然后删除 `pnpm-lock.yaml` 与 `node_modules` 重装。

### 3. pnpm 元数据缓存过期

**症状**：`pnpm install` 始终解析到旧版本，即使 `--force` 也无效。

**根因**：pnpm 缓存了 registry 元数据快照（`<pnpm-cache>/v11/metadata/registry.npmjs.org/<pkg>.jsonl`），
etag 未失效时不会重新拉取。

**修复**：删除该包的元数据缓存文件后重试：

```powershell
Remove-Item "$env:LOCALAPPDATA\pnpm-cache\v11\metadata\registry.npmjs.org\<pkg>.jsonl" -Force
```

### 4. PowerShell 写文件带 BOM 的通用注意

本仓库所有 JSON/YAML 配置文件的写入，**禁止**用 Windows PowerShell 的
`Set-Content -Encoding UTF8` / `Out-File -Encoding UTF8`（会写 BOM）。
用 Node 或 `[System.IO.File]::WriteAllText(..., [Text.UTF8Encoding]::new($false))`。
