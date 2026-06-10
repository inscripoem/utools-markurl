import { defineHandler } from '../core/manager'

const WIKI_RE = /^https?:\/\/([a-z]{2,3}(?:-[a-z]+)?)\.wikipedia\.org\/wiki\/([^#?]+)/i

interface WikiSummaryResp {
  title?: string
  displaytitle?: string
  description?: string
  extract?: string
  content_urls?: {
    desktop?: { page?: string }
  }
}

function decodeTitle(raw: string): string {
  try {
    return decodeURIComponent(raw).replace(/_/g, ' ')
  } catch {
    return raw.replace(/_/g, ' ')
  }
}

export const wikipediaPage = defineHandler({
  name: 'wiki.wikipedia',
  match: (url) => WIKI_RE.test(url),
  async fetch(url, { fetchJson }) {
    const m = url.match(WIKI_RE)
    if (!m) return null
    const lang = m[1].toLowerCase()
    const rawTitle = m[2]
    const apiUrl = `https://${lang}.wikipedia.org/api/rest_v1/page/summary/${rawTitle}`
    const data = await fetchJson<WikiSummaryResp>(apiUrl)
    const title = data.title ?? decodeTitle(rawTitle)
    if (!title) return null
    return {
      type: 'Knowledge',
      title,
      url: data.content_urls?.desktop?.page ?? url,
      source: 'Wikipedia',
    }
  },
})
