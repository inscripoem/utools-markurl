import { defineHandler } from '../core/manager'
import type { Info } from '../core/types'

const ARXIV_RE = /arxiv\.org\/(abs|pdf)\/([\w.\-/]+?)(?:v\d+)?(?:\.pdf)?(?:[?#].*)?$/i
const DOI_RE = /(?:doi\.org\/|^doi:)(10\.\d{4,9}\/\S+)/i

interface ArxivEntry {
  id?: string
  title?: string
  published?: string
  author?: { name?: string } | { name?: string }[]
  link?: ArxivLink | ArxivLink[]
}
interface ArxivLink {
  '@_href'?: string
  '@_title'?: string
  '@_type'?: string
}

function asArray<T>(v: T | T[] | undefined): T[] {
  if (!v) return []
  return Array.isArray(v) ? v : [v]
}

function parseAtomEntry(xml: string): ArxivEntry | null {
  const entryMatch = xml.match(/<entry>([\s\S]*?)<\/entry>/)
  if (!entryMatch) return null
  const block = entryMatch[1]
  const pick = (tag: string) => {
    const m = block.match(new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`))
    return m ? m[1].trim() : undefined
  }
  const authors = [...block.matchAll(/<author>\s*<name>([\s\S]*?)<\/name>\s*<\/author>/g)].map(
    (m) => ({ name: m[1].trim() }),
  )
  const links = [...block.matchAll(/<link\b([^/>]*)\/?>/g)].map((m) => {
    const attrs = m[1]
    const grab = (k: string) => {
      const r = attrs.match(new RegExp(`${k}="([^"]*)"`))
      return r ? r[1] : undefined
    }
    return {
      '@_href': grab('href'),
      '@_title': grab('title'),
      '@_type': grab('type'),
    } satisfies ArxivLink
  })
  return {
    id: pick('id'),
    title: pick('title'),
    published: pick('published'),
    author: authors,
    link: links,
  }
}

async function fetchArxivById(
  id: string,
  fetchText: (u: string) => Promise<string>,
): Promise<Info | null> {
  const xml = await fetchText(`https://export.arxiv.org/api/query?id_list=${id}`)
  const entry = parseAtomEntry(xml)
  if (!entry || !entry.title) return null
  const pdfLink = asArray(entry.link).find((l) => l['@_title'] === 'pdf')?.['@_href']
  const abs = (entry.id ?? `https://arxiv.org/abs/${id}`).trim()
  const authors = asArray(entry.author)
    .map((a) => a.name)
    .filter(Boolean)
    .join(', ')
  return {
    type: 'Paper',
    title: entry.title.replace(/\s+/g, ' ').trim(),
    url: abs,
    source: 'arXiv',
    author: authors,
    date: entry.published?.slice(0, 10),
    pdf: pdfLink,
  }
}

interface CrossRefResp {
  message?: {
    title?: string[]
    author?: { given?: string; family?: string }[]
    issued?: { 'date-parts'?: number[][] }
    URL?: string
    'container-title'?: string[]
  }
}

async function fetchByDoi(
  doi: string,
  fetchJson: <T>(u: string) => Promise<T>,
): Promise<Info | null> {
  const data = await fetchJson<CrossRefResp>(
    `https://api.crossref.org/works/${encodeURIComponent(doi)}`,
  )
  const m = data.message
  if (!m || !m.title?.length) return null
  const authors =
    m.author?.map((a) => [a.given, a.family].filter(Boolean).join(' ')).join(', ') ?? ''
  const year = m.issued?.['date-parts']?.[0]?.[0]
  return {
    type: 'Paper',
    title: m.title[0],
    url: m.URL ?? `https://doi.org/${doi}`,
    source: m['container-title']?.[0] ?? 'CrossRef',
    author: authors,
    date: year ? String(year) : undefined,
  }
}

export const arxivPaper = defineHandler({
  name: 'paper.arxiv',
  match: (url) => ARXIV_RE.test(url),
  async fetch(url, { fetchText }) {
    const m = url.match(ARXIV_RE)
    if (!m) return null
    return fetchArxivById(m[2], fetchText)
  },
})

export const doiPaper = defineHandler({
  name: 'paper.doi',
  match: (url) => DOI_RE.test(url),
  async fetch(url, { fetchJson }) {
    const m = url.match(DOI_RE)
    if (!m) return null
    return fetchByDoi(m[1], fetchJson)
  },
})
