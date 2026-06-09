# markurl-utools

uTools plugin for [markurl](../README.md) — turn any URL into a Markdown reference.

This is a **no-UI template plugin** (`mode: "none"`): you select text or type a
keyword, pick the action in uTools' super-panel, and the Markdown reference is
copied to your clipboard automatically.

## Tech stack

- TypeScript 5.9 + tsup 8 (esbuild) — bundles `preload/index.ts` into a single CJS file
- cheerio 1.2 for HTML parsing (bundled, no runtime deps)
- pnpm 10 / Node 22+

## Features

| code        | trigger                                                                                 | behaviour                                                                       |
| ----------- | --------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| `url2md`    | keyword `markurl` / `mu` / `URL转Markdown`, or **select** any `http(s)://…` URL         | run handler chain (arXiv → DOI → webpage) → copy Markdown                       |
| `arxiv2md`  | keyword `arxiv` / `论文搜索` / `查文献`, or **select** any non-URL text (4–256 chars)   | query [CrossRef](https://api.crossref.org/) by title → copy Markdown            |

## Develop

```powershell
cd utools-plugin
pnpm install
pnpm dev          # tsup --watch, emits ./preload.js next to plugin.json
```

Then in uTools: **开发者工具 → 新建项目 → 选中 [plugin.json](./plugin.json) → 接入开发**
(per the [official 接入开发 doc](https://www.u-tools.cn/docs/developer/basic/first-plugin.html)).

uTools resolves `preload` relative to the manifest's directory. Because tsup
writes the bundle straight to the project root (`./preload.js`), the repo root
**is** the runnable plugin directory during development — no `dist/` indirection.

Enable **退出到后台立即结束运行** in 开发者工具 → 应用开发 → 设置, so each
re-entry picks up the latest `tsup --watch` build automatically. See the
[官方调试文档](https://www.u-tools.cn/docs/developer/basic/debug-plugin.html).

Because there is no `main` field, uTools loads this as a no-UI template plugin
and runs `preload.js` only.

## Build / Package

```powershell
pnpm build
```

Mirrors the same three runtime files into `dist/` so uTools' **打包** command
can point at `dist/` as the package root (per the official
[「将 dist 文件夹打包成插件应用」](https://www.u-tools.cn/docs/developer/information/file-structure.html)
recommendation):

```
dist/
├── plugin.json       # manifest (no main, no development)
├── preload.js        # ~1.3 MB, includes cheerio
└── logo.png
```

Then in uTools: **开发者工具 → 项目 → 打包**, point at `dist/` as project root, output `.upx`.

## Project layout

```
utools-plugin/
├── plugin.json                 # uTools manifest (mode: none template plugin)
├── tsup.config.ts              # bundles preload, outDir: '.', noExternal: ['cheerio']
├── tsconfig.json
├── logo.png                    # 256x256
├── preload.js                  # ⛔ build artifact, .gitignored
├── preload/
│   └── index.ts                # window.exports = { url2md, arxiv2md }
├── src/
│   ├── core/                   # handler abstraction (chain of responsibility)
│   │   ├── types.ts
│   │   ├── manager.ts
│   │   ├── context.ts
│   │   └── format.ts
│   └── handlers/
│       ├── index.ts            # defaultManager.use(arxivPaper, doiPaper, webpage)
│       ├── webpage.ts          # fallback: <title>/og:title via cheerio
│       └── paper.ts            # arXiv (Atom) + DOI/CrossRef
└── scripts/copy-plugin-assets.mjs  # stages root → dist/ for .upx packaging
```

## Add a new handler

```ts
// src/handlers/zhihu.ts
import { defineHandler } from '@/core/manager'

export const zhihuArticle = defineHandler({
  name: 'zhihu.article',
  match: (url) => /zhuanlan\.zhihu\.com\/p\/\d+/.test(url),
  async fetch(url, { fetchText }) {
    const html = await fetchText(url)
    // ...cheerio.load + extract...
    return { type: 'Article', title, author, url, source: '知乎' }
  },
})
```

Then register in [src/handlers/index.ts](./src/handlers/index.ts) **before** the
fallback `webpage` handler.

## Roadmap

- **v0.1 (current)**: no UI, keyword + selection triggers, built-in handlers only.
- **v0.2**: optional `mode: "list"` settings feature for toggling handlers /
  customising templates. Drop-in addition — no architectural change required.
- **v1.0+**: user-defined handlers via `utools.db` + a `mode: "doc"` editor.
