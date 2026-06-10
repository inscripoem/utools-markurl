import { defineHandler } from '../core/manager'
import type { Info } from '../core/types'

const BVID_RE = /BV[0-9A-Za-z]{10}/
const LONG_RE = /^https?:\/\/(?:www\.|m\.)?bilibili\.com\/video\/(BV[0-9A-Za-z]{10})/i
const SHORT_RE = /^https?:\/\/b23\.tv\/[\w-]+/i
const PART_RE = /[?&]p=(\d+)/i

interface BiliViewResp {
  code?: number
  message?: string
  data?: {
    bvid?: string
    title?: string
    pubdate?: number
    owner?: { name?: string; mid?: number }
    pages?: { page: number; part: string }[]
  }
}

async function resolveShortLink(shortUrl: string): Promise<string | null> {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), 8_000)
  try {
    const res = await fetch(shortUrl, { redirect: 'follow', signal: ctrl.signal })
    return res.url || null
  } catch {
    return null
  } finally {
    clearTimeout(timer)
  }
}

function extractBvid(input: string): string | null {
  const m = input.match(BVID_RE)
  return m ? m[0] : null
}

function formatDate(unixSec: number): string {
  const d = new Date(unixSec * 1000)
  const y = d.getUTCFullYear()
  const mo = String(d.getUTCMonth() + 1).padStart(2, '0')
  const da = String(d.getUTCDate()).padStart(2, '0')
  return `${y}-${mo}-${da}`
}

export const bilibiliVideo = defineHandler({
  name: 'video.bilibili',
  match: (url) =>
    LONG_RE.test(url) ||
    SHORT_RE.test(url) ||
    /^BV[0-9A-Za-z]{10}$/.test(url.trim()),
  async fetch(url, { fetchJson }) {
    let resolved = url.trim()
    if (SHORT_RE.test(resolved)) {
      const final = await resolveShortLink(resolved)
      if (final) resolved = final
    }
    const bvid = extractBvid(resolved)
    if (!bvid) return null

    const partMatch = resolved.match(PART_RE)
    const partNum = partMatch ? Number(partMatch[1]) : null

    const data = await fetchJson<BiliViewResp>(
      `https://api.bilibili.com/x/web-interface/view?bvid=${bvid}`,
    )
    const d = data.data
    if (data.code !== 0 || !d || !d.title) return null
    const canonical =
      partNum && partNum > 1
        ? `https://www.bilibili.com/video/${bvid}?p=${partNum}`
        : `https://www.bilibili.com/video/${bvid}`

    let title = d.title
    if (partNum && d.pages && d.pages.length > 1) {
      const part = d.pages.find((p) => p.page === partNum)
      if (part) title = `${title}, ${part.part}`
    }

    return {
      type: 'Video',
      title,
      url: canonical,
      source: 'Bilibili',
      author: d.owner?.name,
      date: d.pubdate ? formatDate(d.pubdate) : undefined,
    } satisfies Info
  },
})
