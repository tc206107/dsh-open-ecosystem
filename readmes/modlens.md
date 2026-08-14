<p align="center">
  <img src="https://raw.githubusercontent.com/liustack/modlens/main/assets/banner.jpg" width="100%" alt="ModLens" />
</p>

<h1 align="center">ModLens</h1>

<p align="center"><b>Give a text-only model sight, and just paste the image.</b></p>

<p align="center">🥇 <b>The FIRST vision plugin for DeepSeek Harness (dsh)</b> 🥇</p>

<p align="center">
  <a href="./README.zh-CN.md">简体中文</a> ·
  <a href="docs/troubleshooting.md">Troubleshooting</a> ·
  <a href="skills/modlens/references/configure.md">Configuration</a> ·
  <a href="docs/output-schema.md">Output contract</a> ·
  <a href="docs/security.md">Security</a> ·
  <a href="https://github.com/liustack/modsearch">ModSearch (web)</a>
</p>

<p align="center">
  <a href="https://x.com/liustack"><img src="https://img.shields.io/badge/follow-%40liustack-black?style=flat-square&logo=x&logoColor=white" alt="Follow @liustack on X"></a>
  <a href="https://www.npmjs.com/package/@liustack/modlens"><img src="https://img.shields.io/npm/v/@liustack/modlens?style=flat-square&label=npm&color=cb3837" alt="npm"></a>
  <a href="https://nodejs.org"><img src="https://img.shields.io/node/v/@liustack/modlens?style=flat-square" alt="Node.js"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue?style=flat-square" alt="License"></a>
  <img src="https://img.shields.io/badge/Not%20backed%20by-Y%20Combinator-FF6600?style=flat-square&logo=ycombinator&logoColor=white" alt="Not backed by Y Combinator">
  <img src="https://img.shields.io/badge/users-unknown-lightgrey?style=flat-square" alt="Users unknown">
</p>

DeepSeek and GLM have no vision capability and cannot read images. ModLens is a plug-in vision engine that gives a text-only model sight. **ModLens reads images pasted straight into the chat**, no saving to a file and passing a path first.

## Talk to us

Issues are welcome any time: [open one](https://github.com/liustack/modlens/issues/new/choose). And come find me on X: **[@liustack](https://x.com/liustack)**. What you built with it, which harness you are on, what should come next. New releases land there first, and a proper community space is on the way.

## Highlights

**🥇 The first vision plugin for DeepSeek Harness (dsh):** one command, `npx -y @deepseek-ai/dsh plugin --profile web add @liustack/modlens`, and the text-only DeepSeek model behind dsh reads images through a native `read_image` tool. For pasted images, switch the model selector to one of the two entries the plugin adds, **`DeepSeek-V4-Flash (modlens vision)`** or **`DeepSeek-V4-Pro (modlens vision)`**: pastes are admitted there, converted to evidence at request time (your message keeps its native thumbnail), and answered by the same DeepSeek route. The wrap covers DeepSeek and GLM text models only; their own vision models are excluded automatically.

**Paste an image and it reads it.** No saving to a file and passing a path first.

- **Zero-config start.** Reuses what Claude Code, Codex, OpenCode, or Pi already have set up: the multimodal models on your machine go straight to work. Nothing at all? Antigravity CLI is a free no-key channel, and a free Gemini key brings a read down to 5-10 seconds.
- **Evidence, not imagination.** Full transcription, reading-order layout regions, entity and relation lists. The model quotes specifics.
- **Install once, use everywhere.** Verified on real machines in Claude Code, Codex, Pi, and OpenCode.

## Installation

**Step 1, hand it to your AI.** Send it this line:

> Install and configure the modlens skill following https://github.com/liustack/modlens/blob/main/INSTALL.md, then run the health check and tell me the result.

The install starts by checking what your machine already has. An existing login in Claude Code, Codex, OpenCode, or Pi can be enough: modlens asks before reusing any of them, and the health check tells you where things stand.

**Step 2, only if the health check comes back empty, set up a free engine.** The recommended choice is a free Gemini API key (about three minutes at [Google AI Studio](https://aistudio.google.com), no credit card), which also makes every read 5-10 seconds. A free OpenAI-compatible key from another platform works too. To avoid any sign-up, install Antigravity CLI instead, then sign in:

```bash
curl -fsSL https://antigravity.google/cli/install.sh | bash
agy                                                           # sign in, then exit
```

The install also inventories vision reachable through your other local harness CLIs (Codex, OpenCode, Pi) and asks, per harness, whether modlens may reuse it. Granted logins join the engine pool as equals, and every reused read is labeled with whose quota it spent.

## Usage

Once installed, just chat. Paste an image or drop a path, ask anything, and the skill triggers on its own: the image goes to a vision engine and the answer comes back grounded in what it read.

## See it work

Unedited runs, all driving a text-only DeepSeek-V4-Flash.

The newest one first: pasting a screenshot straight into DeepSeek Harness on the `DeepSeek-V4-Flash (modlens vision)` variant. The paste keeps its native thumbnail, the trajectory shows the image arriving "already transcribed by the modlens vision bridge", and the answer walks the UI element by element.

![Pasting an image straight into DeepSeek Harness, read through the modlens vision plugin](https://raw.githubusercontent.com/liustack/modlens/main/assets/demo-dsh-paste.jpg)

A tweet screenshot in the Codex desktop app. It reads the author, the caption, the photo itself (down to what both people are wearing), the timestamp, and every engagement number: 5.4M views, 1.6K replies, 5.7K reposts, 116K likes.

![Text-only DeepSeek reading a tweet screenshot in full detail via ModLens](https://raw.githubusercontent.com/liustack/modlens/main/assets/demo-codex-app.jpg)

Three images pasted at once. The model reads them one by one, spots that they belong to one visual family, and describes each illustration's content and style.

![Three images dropped together, read one by one](https://raw.githubusercontent.com/liustack/modlens/main/assets/demo-codex-batch.jpg)

The stress test: a scatter plot comparing 128 AI models. It reads both axes, the log scale, the per-provider color coding, the highlighted region, and every DeepSeek model called out with dashed markers. Dense charts are where vision bridges most often fail.

![The 128-model scatter plot read in full: axes, log scale, and highlighted region](https://raw.githubusercontent.com/liustack/modlens/main/assets/demo-codex-chart.jpg)

And the paste path, end to end, in a Claude Code terminal on DeepSeek. The pasted image arrives as a path rather than pixels, the skill triggers on its own, the guard confirms the model truly has no vision, and the slide's full content comes back: titles, layout, background, plus an honestly stated uncertainty about the truncated filename.

![The skill triggering on its own in a DeepSeek Claude Code session and reading a pasted slide](https://raw.githubusercontent.com/liustack/modlens/main/assets/demo-claude-paste-recovery.jpg)

## Documentation

| Doc | Read it when |
| :-- | :-- |
| [Install guide](INSTALL.md) | Installing the skill step by step (written for an agent) |
| [CLI manual](docs/cli.md) | The CLI the skill drives: flags, config, doctor |
| [Troubleshooting](docs/troubleshooting.md) | A command failed and the message needs decoding |
| [Configuration](skills/modlens/references/configure.md) | Setting a key, switching providers, fixing config |
| [Output contract](docs/output-schema.md) | Parsing the JSON or building on it |
| [Harness setup](docs/harness-setup.md) | Wiring it into Codex, Claude Code, Pi, or OpenCode |
| [Security](docs/security.md) | File permissions, image content as untrusted input |
| [CHANGELOG](CHANGELOG.md) | Finding what changed in a version |

## Contributing

ModLens does not accept pull requests. The project is maintained by a single author who reviews every line, which is a deliberate choice for reliability. Two effective ways to contribute:

- **[Open an issue](https://github.com/liustack/modlens/issues).** Bugs, suggestions, confusing errors, unclear docs. Issues are read and shape what gets built next.
- **Fork it.** Under MIT your copy is fully yours to modify and publish.

## Shameless plug

This project runs on LIUSTACK Skills: `shaping` before you build, `coding` while you build, `dig` when it breaks, `snapshot` when you hand off. Lighter than Superpowers, and stronger.

```bash
npx -y skills add liustack/liustack -g
```

⭐ If it helps, star [ModLens](https://github.com/liustack/modlens) and [liustack](https://github.com/liustack/liustack). Stars are how the next developer finds them.

## Star History

<a href="https://www.star-history.com/?repos=liustack%2Fmodlens&type=date&legend=top-left">
 <picture>
   <source media="(prefers-color-scheme: dark)" srcset="https://api.star-history.com/chart?repos=liustack/modlens&type=date&theme=dark&legend=top-left&sealed_token=oQQAwrPffo9WRUsM6P4RnEu4ZdRART3ChPwIkavGtAfrMycGmLYdjuM2uJ4gjnoIyaF_MDwhOBkJlzmS8pT_W9IRDlsCqLafe7gwvw7Vcnr5MRTkczOasg" />
   <source media="(prefers-color-scheme: light)" srcset="https://api.star-history.com/chart?repos=liustack/modlens&type=date&legend=top-left&sealed_token=oQQAwrPffo9WRUsM6P4RnEu4ZdRART3ChPwIkavGtAfrMycGmLYdjuM2uJ4gjnoIyaF_MDwhOBkJlzmS8pT_W9IRDlsCqLafe7gwvw7Vcnr5MRTkczOasg" />
   <img alt="Star History Chart" src="https://api.star-history.com/chart?repos=liustack/modlens&type=date&legend=top-left&sealed_token=oQQAwrPffo9WRUsM6P4RnEu4ZdRART3ChPwIkavGtAfrMycGmLYdjuM2uJ4gjnoIyaF_MDwhOBkJlzmS8pT_W9IRDlsCqLafe7gwvw7Vcnr5MRTkczOasg" />
 </picture>
</a>

## Disclaimer

Provided as-is under the MIT License below. The author makes no warranty and gives no endorsement for any particular use, commercial use included. Your use of upstream engines (Antigravity CLI, the Gemini, OpenAI, and Anthropic APIs, and any OpenAI-compatible endpoint) is governed by their own terms and quotas, which you are responsible for.

## License

MIT

