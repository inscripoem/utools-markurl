# Changelog

All notable changes to **MarkURL** (`utools-markurl`) will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- **CSDN article handler** (`csdn.article`) ported from the Python upstream's [`CSDNHandler`](https://github.com/ruokee/markurl/blob/master/markurl/handler/blog.py). Matches `blog.csdn.net/{user}/article/details/{id}` and extracts title, author display name and publish date via regex (zero new dependencies). Registered in the chain ahead of the `webpage` fallback.

### Changed

- **HTTP layer rewritten on top of Node `https.request`** instead of the renderer's global `fetch`. The new implementation lives in `src/core/context.ts` and uses `node:http` / `node:https` / `node:zlib` / `node:url` (all kept as runtime `require(...)` calls by tsup). The public `HandlerContext` API (`fetchText` / `fetchJson`) is unchanged.

### Fixed

- **HTTP layer hardened against hangs and OOM.** `nodeFetch` now enforces a single 10 s **total** budget across all redirects (previously each hop reset the 10 s timer, so a pathological 5-hop chain could stall for up to 50 s) and `requestOnce` caps each response body at **10 MiB**, destroying the socket immediately if exceeded — this protects the uTools renderer from being frozen by a user accidentally pasting a large media URL (e.g. an MP4 link) into the super-panel, which the generic `webpage` handler would otherwise stream entirely into memory.
- **Compressed-stream network errors now propagate immediately** instead of waiting for the timeout. `res.pipe(gunzip/inflate/brotli)` was rewritten using `node:stream`'s `pipeline()`, which forwards transport-level errors from the underlying response into the decoder, so a mid-flight TCP reset on a gzipped page fails in milliseconds rather than after the full 10 s timer expires.
- Promise settlement in `requestOnce` is now guarded by a `settled` sentinel so that a timeout firing concurrently with `'error'` / `'end'` cannot resolve and reject the same request.
- **CSDN (and any other non-CORS-friendly site) now actually loads** in the uTools renderer process. The previous browser `fetch` was blocked by Chromium's same-origin policy because `blog.csdn.net` does not return `Access-Control-Allow-Origin`, which surfaced as the misleading "未识别到可解析的内容" notification. The Node HTTP stack bypasses CORS entirely and lets the real `User-Agent` through (the browser API silently dropped it as a forbidden header).
- Added transparent gzip / deflate / brotli decoding and up-to-5 redirect following, matching what the browser used to do for us implicitly.
- **`csdn.article` publish-date extraction is now correct on every page template.** The old single regex matched `class="time"` exactly (failing on the real `class="time blog-postTime"` compound) and, even when it accidentally hit, would prefer the *recommended-article* date inside `<div class="up-time">最新推荐文章于…</div>` over the real publish date. Replaced with a 4-tier fallback that reads from `data-time` first, then `<meta property="article:published_time">`, then the SSR-injected `"pubDate"` JSON field, and finally the visible `…于 YYYY-MM-DD 发布` text — verified on both a 2017 article (`shelldon/54144409`) and a 2026 article (`csdnnews/161866599`).

## [0.1.0] - 2026-06-10

First public release on the uTools marketplace.

### Added

- **Two uTools features** registered out of the box:
  - `url2md` — converts any selected `http(s)://…` URL into a Markdown reference via the super-panel, or via the keywords `MarkURL` / `mu` / `URL转Markdown`.
  - `arxiv2md` — looks up a paper title against the CrossRef API and produces a Markdown reference, via keywords `arxiv` / `论文搜索` / `查文献`.
- **7-handler responsibility chain** with handcrafted regex-only parsers (zero runtime dependencies):
  - `arxiv` — arXiv Atom API (abs / pdf URLs)
  - `doi` — CrossRef DOI API (`doi.org/…`)
  - `github` — GitHub REST API (`github.com/{owner}/{repo}`)
  - `youtube` — YouTube oEmbed API (`youtube.com/watch` & `youtu.be/…`)
  - `wikipedia` — Wikipedia REST API (all language sub-domains)
  - `bilibili` — Bilibili Web API, with `b23.tv` short-link redirect resolution
  - `webpage` — generic HTML `<title>` / `og:title` fallback
- **Python-aligned Markdown output**: `**{type}:** [{title}]({url}), {source}, {author}, {date}, [PDF]({pdf}), {citations}` — drop-in compatible with the [ruokee/markurl](https://github.com/ruokee/markurl) CLI.
- **Cross-platform notifications** via `utools.showNotification` (works on Windows / macOS / Linux): one concise `已复制 Markdown` toast on success.
- **Bilingual README** (English + 简体中文), centered logo, badges, full handler matrix and 5 real-world output samples.
- **MIT License** under `inscripoem`.

### Tech Notes

- Built with `tsup` 8 + TypeScript 5.9 + pnpm 10.
- Bundled `preload.js` is **15.4 KB** with **zero runtime dependencies**.
- `AbortController`-based 2000 ms fetch timeout to prevent hangs on flaky networks.
- Cross-platform supported: `win32`, `darwin`, `linux`.

[Unreleased]: https://github.com/inscripoem/utools-markurl/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/inscripoem/utools-markurl/releases/tag/v0.1.0
