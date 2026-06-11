import { defineHandler } from '../core/manager'
import type { Info } from '../core/types'

const ARTICLE_RE =
  /^https?:\/\/(?:[\w-]+\.)?blog\.csdn\.net\/([\w-]+)\/article\/details\/(\d+)(?:[/?#].*)?$/i

const TITLE_RE = /<title\b[^>]*>([\s\S]*?)<\/title>/i
const TITLE_SUFFIX_RE = /[-_\s]*CSDN\s*博客\s*$/i

const AUTHOR_RE = /<a\b[^>]*\bid=["']uid["'][^>]*\btitle=["']([^"']+)["'][^>]*>/i
const AUTHOR_RE_FALLBACK = /<a\b[^>]*\btitle=["']([^"']+)["'][^>]*\bid=["']uid["'][^>]*>/i

const DATE_RE_DATA_TIME =
  /<[a-z]+\b[^>]*\bclass=["'][^"']*\bblog-postTime\b[^"']*["'][^>]*\bdata-time=["'](\d{4}-\d{2}-\d{2})/i
const DATE_RE_PUBDATE_JSON = /["']pubDate["']\s*:\s*["'](\d{4}-\d{2}-\d{2})/i
const DATE_RE_PUBLISHED_META =
  /<meta\b[^>]*\bproperty=["']article:published_time["'][^>]*\bcontent=["'](\d{4}-\d{2}-\d{2})/i
const DATE_RE_TIME_TEXT =
  /class=["'][^"']*\btime\b[^"']*\bblog-postTime\b[^"']*["'][^>]*>[\s\S]{0,200}?\u4e8e[\s\S]{0,20}?(\d{4}-\d{2}-\d{2})[\s\S]{0,20}?\u53d1\u5e03/i

const HTML_ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
}

function decodeEntities(s: string): string {
  return s
    .replace(/&#x([0-9a-f]+);/gi, (_, hex: string) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec: string) => String.fromCodePoint(parseInt(dec, 10)))
    .replace(/&(amp|lt|gt|quot|apos|nbsp);/g, (_, n: string) => HTML_ENTITIES[n] ?? `&${n};`)
}

function clean(raw: string): string {
  return decodeEntities(raw).replace(/\s+/g, ' ').trim()
}

function extractTitle(html: string): string | null {
  const raw = html.match(TITLE_RE)?.[1]
  if (!raw) return null
  return clean(raw).replace(TITLE_SUFFIX_RE, '').trim() || null
}

function extractAuthor(html: string): string | null {
  const m = html.match(AUTHOR_RE) ?? html.match(AUTHOR_RE_FALLBACK)
  if (!m?.[1]) return null
  return clean(m[1]) || null
}

function extractDate(html: string): string | undefined {
  for (const re of [
    DATE_RE_DATA_TIME,
    DATE_RE_PUBLISHED_META,
    DATE_RE_PUBDATE_JSON,
    DATE_RE_TIME_TEXT,
  ]) {
    const m = html.match(re)
    if (m?.[1]) return m[1]
  }
  return undefined
}

export const csdnArticle = defineHandler({
  name: 'csdn.article',
  match: (url) => ARTICLE_RE.test(url),
  async fetch(url, { fetchText }) {
    const m = url.match(ARTICLE_RE)
    if (!m) return null
    const user = m[1]
    const id = m[2]
    const canonical = `https://blog.csdn.net/${user}/article/details/${id}`
    const html = await fetchText(canonical)
    const title = extractTitle(html)
    if (!title) return null
    const info: Info = {
      type: 'Article',
      title,
      url: canonical,
      source: 'CSDN',
      author: extractAuthor(html) ?? user,
    }
    const date = extractDate(html)
    if (date) info.date = date
    return info
  },
})
