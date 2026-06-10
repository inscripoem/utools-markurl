import { defineHandler } from '../core/manager'

const HEAD_RE = /<head\b[^>]*>([\s\S]*?)<\/head>/i

const META_PATTERNS: RegExp[] = [
  /<meta[^>]+property=["']og:title["'][^>]*content=["']([^"']+)["']/i,
  /<meta[^>]+content=["']([^"']+)["'][^>]*property=["']og:title["']/i,
  /<meta[^>]+name=["']twitter:title["'][^>]*content=["']([^"']+)["']/i,
  /<meta[^>]+content=["']([^"']+)["'][^>]*name=["']twitter:title["']/i,
]

const TITLE_RE = /<title\b[^>]*>([\s\S]*?)<\/title>/i

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
  const headBlock = html.match(HEAD_RE)?.[1] ?? html
  for (const re of META_PATTERNS) {
    const m = headBlock.match(re)
    if (m?.[1]) return clean(m[1])
  }
  const t = headBlock.match(TITLE_RE)?.[1]
  if (t) return clean(t)
  return null
}

export const webpage = defineHandler({
  name: 'webpage',
  match: (url) => /^https?:\/\//i.test(url),
  async fetch(url, { fetchText }) {
    const html = await fetchText(url)
    const title = extractTitle(html) ?? url
    let source: string | undefined
    try {
      source = new URL(url).hostname.replace(/^www\./, '')
    } catch {
      source = undefined
    }
    return {
      type: 'Page',
      title,
      url,
      source,
    }
  },
})
