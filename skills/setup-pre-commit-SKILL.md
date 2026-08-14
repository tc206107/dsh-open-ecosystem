---
name: setup-pre-commit
description: 在当前仓库配置 pre-commit 钩子（Husky + lint-staged + Prettier，并在提交时执行类型检查与测试）。当用户想要添加 pre-commit 钩子、搭建 Husky、配置 lint-staged，或希望在提交时自动格式化、类型检查与跑测试时，使用本技能。
---

# 配置 Pre-Commit 钩子

## 这套配置会建立什么

- **Husky** pre-commit 钩子
- **lint-staged** 对所有已暂存文件运行 Prettier
- **Prettier** 配置（若缺少则补充）
- 钩子中的 **typecheck** 与 **test** 脚本

## 步骤

### 1. 探测包管理器

依次检查是否存在 `package-lock.json`（npm）、`pnpm-lock.yaml`（pnpm）、`yarn.lock`（yarn）、`bun.lockb`（bun），使用已存在的那一个；若均无法判断，默认使用 npm。

### 2. 安装依赖

以 devDependencies 形式安装：

```
husky lint-staged prettier
```

### 3. 初始化 Husky

```bash
npx husky init
```

这会创建 `.husky/` 目录，并向 package.json 写入 `prepare: "husky"`。

### 4. 创建 `.husky/pre-commit`

写入以下内容（Husky v9+ 无需 shebang）：

```
npx lint-staged
npm run typecheck
npm run test
```

**适配**：把 `npm` 替换为已探测到的包管理器。若仓库 package.json 中不存在 `typecheck` 或 `test` 脚本，则省略相应行，并告知用户已省略。

### 5. 创建 `.lintstagedrc`

```json
{
  "*": "prettier --ignore-unknown --write"
}
```

### 6. 创建 `.prettierrc`（仅当缺少时）

仅在仓库尚无 Prettier 配置时才创建，使用以下默认值：

```json
{
  "useTabs": false,
  "tabWidth": 2,
  "printWidth": 80,
  "singleQuote": false,
  "trailingComma": "es5",
  "semi": true,
  "arrowParens": "always"
}
```

### 7. 验证清单

逐项确认：

- [ ] `.husky/pre-commit` 已存在且可执行
- [ ] `.lintstagedrc` 已存在
- [ ] package.json 中的 `prepare` 脚本为 `"husky"`
- [ ] Prettier 配置已存在
- [ ] 运行 `npx lint-staged` 验证其正常工作

### 8. 提交

把本次改动或新建的文件全部暂存，并以 `Add pre-commit hooks (husky + lint-staged + prettier)` 为提交信息提交。

这次提交会经新 pre-commit 钩子执行一遍，是验证整套配置正常工作的有效冒烟测试。

## 说明

- Husky v9+ 的钩子文件无需 shebang。
- `prettier --ignore-unknown` 会跳过 Prettier 无法解析的文件（如图片等）。
- pre-commit 先运行 lint-staged（快、仅针对已暂存文件），随后执行完整的 typecheck 与 test。