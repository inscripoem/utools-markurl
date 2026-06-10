import { defineHandler } from '../core/manager'

const ID_RE = /^[\w-]{11}$/
const WATCH_RE = /^https?:\/\/(?:www\.|m\.)?youtube\.com\/watch\?(?:[^#]*&)?v=([\w-]{11})/i
const SHORT_RE = /^https?:\/\/youtu\.be\/([\w-]{11})/i
const EMBED_RE = /^https?:\/\/(?:www\.)?youtube\.com\/(?:embed|shorts)\/([\w-]{11})/i

function extractVideoId(url: string): string | null {
  const m = url.match(WATCH_RE) ?? url.match(SHORT_RE) ?? url.match(EMBED_RE)
  if (m && ID_RE.test(m[1])) return m[1]
  return null
}

interface OEmbedResp {
  title?: string
  author_name?: string
  author_url?: string
  provider_name?: string
}

export const youtubeVideo = defineHandler({
  name: 'video.youtube',
  match: (url) => extractVideoId(url) !== null,
  async fetch(url, { fetchJson }) {
    const id = extractVideoId(url)
    if (!id) return null
    const canonical = `https://www.youtube.com/watch?v=${id}`
    const data = await fetchJson<OEmbedResp>(
      `https://www.youtube.com/oembed?url=${encodeURIComponent(canonical)}&format=json`,
    )
    if (!data.title) return null
    return {
      type: 'Video',
      title: data.title,
      url: canonical,
      source: data.provider_name ?? 'YouTube',
      author: data.author_name,
    }
  },
})
