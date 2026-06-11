# Python Port Status

> Snapshot of how the uTools plugin (`utools-markurl`) aligns with the original Python CLI
> at [ruokee/markurl](https://github.com/ruokee/markurl). Maintained as a living checklist;
> tick items off as future versions narrow the gap.

**Audited at:** 2026-06-11 (CSDN handler ported in `[Unreleased]`)
**Overall handler coverage:** 8 / 11 = **73 %** (covers ~90 % of real-world usage)

---

## TL;DR

- ✅ All **high-value** handlers (arXiv, DOI, GitHub, YouTube, Wikipedia, Bilibili, generic webpage) are ported.
- 🟡 Two deltas in already-ported code: webpage handler is missing the `DOMAIN_MAP` aesthetic mapping.
- ❌ Four handlers are intentionally **deferred**: Zhihu × 2, Douban Review, CSDN blog.
- ❌ No runtime **config system** yet (Python ships [config.json](https://github.com/ruokee/markurl/blob/master/config.json) for headers / proxies / domain map / markdown template).
- ➕ Net-new vs Python: cross-platform desktop notification, `utools.copyText`, super-panel + keyword triggers, `AbortController` 2 s timeout, zero runtime deps.

---

## 1. Handler Matrix

| # | Python source | Class | Domain | TS port | Status |
|---|---|---|---|---|---|
| 1 | `markurl/handler/paper.py` | `ArxivHandler` | `arxiv.org/abs/...`, `arxiv.org/pdf/...` | `src/handlers/paper.ts` → `arxivPaper` | ✅ |
| 2 | `markurl/handler/paper.py` | `DOIHandler` | `doi.org/...` | `src/handlers/paper.ts` → `doiPaper` | ✅ |
| 3 | `markurl/handler/paper.py` | `TitleHandler` | CrossRef title search | `src/handlers/paper.ts` (wired through the `arxiv2md` uTools feature) | ✅ |
| 4 | `markurl/handler/git.py` | `GithubHandler` | `github.com/{owner}/{repo}` | `src/handlers/github.ts` → `githubRepo` | ✅ |
| 5 | `markurl/handler/video.py` | `YouTubeHandler` | `youtube.com/watch`, `youtu.be/...` | `src/handlers/youtube.ts` → `youtubeVideo` | ✅ |
| 6 | `markurl/handler/wiki.py` | `WikipediaHandler` | `*.wikipedia.org/wiki/...` | `src/handlers/wikipedia.ts` → `wikipediaPage` | ✅ |
| 7 | `markurl/handler/bilibili.py` | `BilibiliHandler` | `bilibili.com/video/...`, `b23.tv/...` | `src/handlers/bilibili.ts` → `bilibiliVideo` | ✅ |
| 8 | `markurl/handler/webpage.py` | `WebpageHandler` | catch-all fallback | `src/handlers/webpage.ts` → `webpage` | ⚠️ partial — see §2 |
| 9 | `markurl/handler/zhihu.py` | `AnswerHandler` | `zhihu.com/question/{q}/answer/{a}` | — | ❌ deferred |
| 10 | `markurl/handler/zhihu.py` | `ZhuanlanHandler` | `zhuanlan.zhihu.com/p/{page}` | — | ❌ deferred |
| 11 | `markurl/handler/douban.py` | `DoubanReviewHandler` | `movie.douban.com/review/{id}` | — | ❌ deferred |
| 12 | `markurl/handler/blog.py` | `CSDNHandler` | `blog.csdn.net/{user}/article/details/{id}` | — (caught by webpage fallback) | ❌ deferred |

Chain registration lives in `src/handlers/index.ts` → `defaultManager`.

---

## 2. Known Delta in Already-Ported Code

### 2.1 `webpage.ts` is missing `DOMAIN_MAP`

Python reads `domain.map` from `config.json` and rewrites the bare host into a pretty source name:

```jsonc
// markurl/config.json
"domain": {
  "map": {
    "ld246.com": "链滴",
    "yuque.com": "语雀"
  }
}
```

…then `webpage.py` replaces `source` with the mapped Chinese site name. Our TS port hard-codes
the raw host. Impact is **cosmetic only** (output still works), but it breaks 1:1 alignment for
those two sites.

**Fix sketch:** inline a `const DOMAIN_MAP: Record<string, string> = { 'ld246.com': '链滴', 'yuque.com': '语雀' }` near the top of `src/handlers/webpage.ts`, look it up after the host regex match. ~10 lines, no new dep.

---

## 3. Deferred Handlers — Why

| Handler | Reason for deferral | Severity |
|---|---|---|
| `AnswerHandler` (Zhihu Q&A) | Zhihu enforces cookie-bound anti-bot + risk control. The Python source itself logs `也许需要手动打开浏览器进行知乎验证`. Anonymous `fetch` from a uTools preload almost always returns a captcha page. | 🔴 hard blocker |
| `ZhuanlanHandler` (Zhihu column) | Same anti-bot pipeline as `AnswerHandler`. | 🔴 hard blocker |
| `DoubanReviewHandler` | Douban rate-limits + CAPTCHAs anonymous IPs (HTTP 429). Even Python's `requests` + UA spoof is unreliable. | 🟠 soft blocker |
| `CSDNHandler` | Already correctly handled by the generic `webpage` fallback (CSDN exposes a proper `<h1>` and `og:title`). A dedicated handler would only add `author` + `date` fields. | 🟡 low ROI |

---

## 4. Missing Subsystem — Config System

Python ships [config.json](https://github.com/ruokee/markurl/blob/master/config.json) read by `markurl/config.py`. It controls three things:

| Config key | Python behaviour | uTools plugin equivalent |
|---|---|---|
| `markdown.fmt` / `fmt_basic` | Markdown output template | Hard-coded in `src/core/format.ts` (matches Python defaults verbatim) |
| `http.headers` / `http.proxies` | UA spoof + outbound proxy | Not implemented; we rely on Node's default fetch and uTools' transparent network |
| `domain.map` | Pretty host → site name rewrite | Not implemented (see §2.1) |

**Future direction:** if/when we add a config UI, follow the pattern in [u-tools docs - dbStorage](https://www.u-tools.cn/docs/developer/utools-api/db.html) and persist via `utools.dbStorage`, not a sidecar JSON. The settings panel would be a second uTools feature (e.g. `markurl-settings`) opening a small HTML window.

---

## 5. Net-New Features vs Python

Items the uTools plugin already does that the Python CLI never offered:

- 🔔 Cross-platform desktop notification on success (`utools.showNotification`)
- 📋 Automatic clipboard write (`utools.copyText`) — no manual `| pbcopy` / `| clip`
- 🪟 Super-panel integration + keyword triggers (`MarkURL` / `mu` / `URL转Markdown` / `arxiv`)
- ⏱️ `AbortController`-backed 2 s fetch timeout (Python relies on `requests` 6 s default)
- 🔗 `b23.tv` short-link redirect resolution implemented as an explicit HEAD-follow
- 📦 Zero runtime dependencies (Python pulls in `bs4`, `requests`, `feedparser`, `pytube`)
- 🌐 Bilingual README + screenshots + Keep-a-Changelog file
- 🖥️ Tri-platform supported (`win32` / `darwin` / `linux`)

---

## 6. Roadmap — What To Tackle Next

Ordered by ROI. Versions are tentative.

| Priority | Item | Target | Effort |
|---|---|---|---|
| **P1** | Add inline `DOMAIN_MAP` to `webpage.ts` (`ld246.com` → 链滴, `yuque.com` → 语雀) | 0.2.0 | ~10 min |
| **P1** | Port `CSDNHandler` (clean structure, no anti-bot) | 0.2.0 | ~30 min |
| **P2** | Settings panel as a second feature using `utools.dbStorage`; expose user-extensible `DOMAIN_MAP` | 0.3.0 | ~half day |
| **P3** | Zhihu / Douban via Electron `BrowserWindow` (spawn a real renderer to bypass anti-bot) | 0.4.0 or never | ~1–2 days, fragile |

When picking up the next iteration:

1. Bump this file's *Audited at* header.
2. Move the relevant rows from §1 / §3 to ✅.
3. Mirror the change into [CHANGELOG.md](../CHANGELOG.md) under the new version section.
4. If the API surface grows (e.g. settings feature), update [README.md](../README.md) and [README.zh-CN.md](../README.zh-CN.md) handler matrix.

---

## 7. References

- Upstream Python CLI: <https://github.com/ruokee/markurl>
- Our changelog: [CHANGELOG.md](../CHANGELOG.md)
- Plugin entry: [plugin.json](../plugin.json)
- Handler chain wiring: [`src/handlers/index.ts`](../src/handlers/index.ts)
- uTools dev docs: <https://www.u-tools.cn/docs/developer/>
