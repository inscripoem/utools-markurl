<p align="center">
  <img src="./logo.png" alt="MarkURL logo" width="128" height="128" />
</p>

<h1 align="center">MarkURL</h1>

<p align="center">
  uTools plugin: turn any URL into a Markdown reference.
  <br />
  <a href="./README.md"><strong>English</strong></a> ·
  <a href="./README.zh-CN.md">简体中文</a>
</p>

<p align="center">
  <img alt="node" src="https://img.shields.io/badge/node-%3E%3D22-339933?logo=node.js&logoColor=white" />
  <img alt="typescript" src="https://img.shields.io/badge/typescript-5.9-3178c6?logo=typescript&logoColor=white" />
  <img alt="pnpm" src="https://img.shields.io/badge/pnpm-10-f69220?logo=pnpm&logoColor=white" />
  <img alt="bundle" src="https://img.shields.io/badge/preload-15KB-success" />
  <img alt="runtime deps" src="https://img.shields.io/badge/runtime%20deps-0-blue" />
</p>

> Sibling project: [ruokee/markurl](https://github.com/ruokee/markurl) — the original Python CLI by **YorkSu**.
> Both projects share the same handler-chain design philosophy but have **independent codebases** tuned to their runtime (Python/requests vs TS/native fetch).

This is a **no-UI template plugin** (`mode: "none"`): you select text or type a keyword, pick the action in uTools' super-panel, and the Markdown reference is copied to your clipboard automatically.

## Install

For end users — install from the uTools plugin marketplace:

1. Open uTools and press the keyboard shortcut to summon the search panel (default `Alt+Space` on Windows / `⌥+Space` on macOS).
2. Type `插件应用市场` (or `pluginmarket`) and press Enter.
3. Search for **MarkURL** and click **获取**.

Or install from a local `.upx` package (see [Build / Package](#build--package) below) by dragging the file into uTools.

## Usage

Three ways to trigger:

- **Select** any `http(s)://…` URL in any app → summon uTools super-panel (default `Ctrl+Click` selection on Windows / `⌘+drag` on macOS) → pick **「URL 转 Markdown」** → Markdown is copied.
- **Type** keyword `MarkURL` / `mu` / `URL转Markdown` in the uTools search bar, then paste a URL.
- **Paper lookup**: type `arxiv` / `论文搜索` / `查文献`, then enter a paper title (4–256 chars) — CrossRef will be queried and the top match returned as Markdown.

A single concise toast `已复制 Markdown` confirms success.

## Screenshots

| Super-panel trigger | Copy notification | Keyword trigger |
| --- | --- | --- |
| ![super panel](./docs/screenshots/01-super-panel.png) | ![notification](./docs/screenshots/02-notification.png) | ![keyword](./docs/screenshots/03-keyword-trigger.png) |

> _Recommended capture size: 1280×800 PNG. The same three files are also used on the uTools marketplace listing._

## Tech stack

- TypeScript 5.9 + tsup 8 (esbuild) — bundles `preload/index.ts` into a single CJS file
- Zero runtime deps: native `fetch` + regex-based `<head>` parsing
- pnpm 10 / Node 22+

## Features

| code | trigger | behaviour |
| --- | --- | --- |
| `url2md` | keyword `MarkURL` / `mu` / `URL转Markdown`, or **select** any `http(s)://…` URL | run the handler chain → copy Python-style Markdown |
| `arxiv2md` | keyword `arxiv` / `论文搜索` / `查文献`, or **select** any non-URL text (4–256 chars) | query [CrossRef](https://api.crossref.org/) by title → copy Markdown |

### Handler chain (executed in order)

| # | handler | matches | data source |
| --- | --- | --- | --- |
| 1 | `paper.arxiv` | `arxiv.org/abs/` / `pdf/` | arXiv Atom API |
| 2 | `paper.doi` | `doi.org/` / `doi:` | CrossRef REST API |
| 3 | `github.repo` | `github.com/{owner}/{repo}` (excluding reserved owners) | GitHub REST API |
| 4 | `video.youtube` | `youtube.com/watch` / `youtu.be/` / `embed` / `shorts` | YouTube oEmbed |
| 5 | `wiki.wikipedia` | `*.wikipedia.org/wiki/` (any locale) | Wikipedia REST API |
| 6 | `video.bilibili` | `bilibili.com/video/BV…` / `b23.tv/…` | Bilibili JSON API (+ redirect resolve) |
| 7 | `webpage` | any `http(s)://` (fallback) | native `fetch` + regex `<head>` parsing |

All handlers use official APIs where possible — no scraping, no third-party SDKs.

### Output format

Mirrors the original Python `markurl` `fmt_basic` template:

```
**{type}:** [{title}]({url}), {source}{additional}
```

`{additional}` is a comma-joined assembly of `author`, `date`, `[PDF](pdf)`, and `citations` — each appended only if present.

Examples:

```
**Repo:** [microsoft/vscode](https://github.com/microsoft/vscode), GitHub, microsoft
**Paper:** [Mistral 7B](http://arxiv.org/abs/2310.06825v1), arXiv, Albert Q. Jiang, …, 2023-10-10
**Video:** [Rick Astley - Never Gonna Give You Up …](…), YouTube, Rick Astley
**Knowledge:** [Machine learning](https://en.wikipedia.org/wiki/Machine_learning), Wikipedia
**Page:** [Example Domain](https://example.com), example.com
```

## Develop

```powershell
pnpm install
pnpm dev          # tsup --watch, emits ./preload.js next to plugin.json
```

Then in uTools: **开发者工具 → 新建项目 → 选中 [plugin.json](./plugin.json) → 接入开发** (per the [official 接入开发 doc](https://www.u-tools.cn/docs/developer/basic/first-plugin.html)).

uTools resolves `preload` relative to the manifest's directory. Because tsup writes the bundle straight to the project root (`./preload.js`), the repo root **is** the runnable plugin directory during development — no `dist/` indirection.

Enable **退出到后台立即结束运行** in 开发者工具 → 应用开发 → 设置, so each re-entry picks up the latest `tsup --watch` build automatically. See the [官方调试文档](https://www.u-tools.cn/docs/developer/basic/debug-plugin.html).

Because there is no `main` field, uTools loads this as a no-UI template plugin and runs `preload.js` only.

## Build / Package

```powershell
pnpm build
```

Mirrors the three runtime files into `dist/` so uTools' **打包** command can point at `dist/` as the package root (per the official [「将 dist 文件夹打包成插件应用」](https://www.u-tools.cn/docs/developer/information/file-structure.html) recommendation):

```
dist/
├── plugin.json       # manifest (no main, no development)
├── preload.js        # ~15 KB, zero runtime deps
└── logo.png
```

Then in uTools: **开发者工具 → 项目 → 打包**, point at `dist/` as project root, output `.upx`.

## Project layout

```
utools-markurl/
├── plugin.json                 # uTools manifest (mode: none template plugin)
├── tsup.config.ts              # bundles preload, outDir: '.'
├── tsconfig.json
├── logo.png                    # 256x256
├── preload.js                  # ⛔ build artifact, .gitignored
├── preload/
│   └── index.ts                # window.exports = { url2md, arxiv2md }
├── src/
│   ├── core/                   # handler abstraction (chain of responsibility)
│   │   ├── types.ts            # InfoType union + Info / Handler interfaces
│   │   ├── manager.ts          # HandlerManager.use() chain
│   │   ├── context.ts          # fetchText / fetchJson with timeout
│   │   └── format.ts           # Python-aligned Markdown template
│   └── handlers/
│       ├── index.ts            # defaultManager.use(...)
│       ├── paper.ts            # arXiv (Atom) + DOI / CrossRef
│       ├── github.ts           # GitHub REST API
│       ├── youtube.ts          # YouTube oEmbed
│       ├── wikipedia.ts        # Wikipedia REST API
│       ├── bilibili.ts         # Bilibili JSON API + b23.tv resolve
│       └── webpage.ts          # fallback: regex extract og:title / <title>
└── scripts/copy-plugin-assets.mjs  # stages root → dist/ for .upx packaging
```

## Add a new handler

```ts
// src/handlers/zhihu.ts
import { defineHandler } from '../core/manager'

export const zhihuArticle = defineHandler({
  name: 'zhihu.article',
  match: (url) => /zhuanlan\.zhihu\.com\/p\/\d+/.test(url),
  async fetch(url, { fetchText }) {
    const html = await fetchText(url)
    // ...regex extract title / author from html...
    return { type: 'Article', title, author, url, source: '知乎' }
  },
})
```

Then register in [src/handlers/index.ts](./src/handlers/index.ts) **before** the fallback `webpage` handler.

## Roadmap

- **v0.1 (current)**: no UI, keyword + selection triggers, 7 built-in handlers, output aligned with the Python `markurl` format.
- **v0.2**: optional settings feature (separate uTools feature with a tiny HTML page) for toggling handlers and customising templates, persisted via `utools.dbStorage`. Drop-in addition — no architectural change required.
- **v1.0+**: user-defined handlers via `utools.dbStorage` + a richer settings editor.

## Changelog

See [CHANGELOG.md](./CHANGELOG.md) for release notes following the [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) format.

## License

[MIT](./LICENSE) © inscripoem
