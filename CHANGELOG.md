# Changelog

All notable changes to **MarkURL** (`utools-markurl`) will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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
