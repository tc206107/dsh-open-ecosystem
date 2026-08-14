# 0001: 纯集成层，不修改 DSH 源码

本仓库所有组件（dsh-desktop、dsh-git-autoinit、skills）都以**挂载或封装**方式工作，不修改
`@deepseek-ai/dsh` 源码；卸载即可完全还原。

背景：DSH 处于 developer preview，破坏性变更频繁。若以 patch 方式改动本体，每次升级都会
冲突、且难以回滚。保持纯集成层使每个组件可独立升级、可复现、可开源。

Status: accepted
