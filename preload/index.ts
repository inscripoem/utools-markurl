import { defaultManager } from '../src/handlers'
import { toMarkdown } from '../src/core/format'
import type { Info } from '../src/core/types'

interface PluginEnterAction {
  code: string
  type: string
  payload: string
  option?: { label?: string }
}

type EnterCallback = (action: PluginEnterAction) => void | Promise<void>

interface FeatureExport {
  mode: 'none' | 'list' | 'doc' | 'docs'
  args: {
    enter: EnterCallback
    placeholder?: string
  }
}

declare global {
  interface Window {
    exports: Record<string, FeatureExport>
  }
  // eslint-disable-next-line no-var
  var window: Window
}

const URL_RE = /^https?:\/\/\S+$/i

async function resolveAndCopy(
  payload: string,
  opts: { searchByTitle?: boolean } = {},
): Promise<void> {
  const text = payload.trim()
  if (!text) {
    utools.showNotification('请输入 URL 或文献标题')
    utools.outPlugin()
    return
  }

  utools.showNotification(opts.searchByTitle ? '正在搜索文献…' : '正在解析…')

  let info: Info | null = null
  try {
    if (opts.searchByTitle) {
      info = await searchPaperByTitle(text)
    } else {
      info = await defaultManager.handle(text)
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    utools.showNotification(`解析失败: ${msg}`)
    utools.outPlugin()
    return
  }

  if (!info) {
    utools.showNotification('未识别到可解析的内容')
    utools.outPlugin()
    return
  }

  const md = toMarkdown(info)
  utools.copyText(md)
  utools.showNotification(`已复制 Markdown:\n${md}`)
  utools.outPlugin()
}

async function searchPaperByTitle(title: string): Promise<Info | null> {
  const url = `https://api.crossref.org/works?rows=1&query.title=${encodeURIComponent(title)}`
  const res = await fetch(url, {
    headers: { Accept: 'application/json' },
  })
  if (!res.ok) throw new Error(`CrossRef HTTP ${res.status}`)
  const data = (await res.json()) as {
    message?: {
      items?: Array<{
        title?: string[]
        author?: { given?: string; family?: string }[]
        issued?: { 'date-parts'?: number[][] }
        URL?: string
        'container-title'?: string[]
      }>
    }
  }
  const item = data.message?.items?.[0]
  if (!item || !item.title?.length) return null
  return {
    type: 'Paper',
    title: item.title[0],
    url: item.URL ?? '',
    source: item['container-title']?.[0] ?? 'CrossRef',
    author:
      item.author?.map((a) => [a.given, a.family].filter(Boolean).join(' ')).join(', ') ?? '',
    date: item.issued?.['date-parts']?.[0]?.[0]?.toString(),
  }
}

const exportsMap: Record<string, FeatureExport> = {
  url2md: {
    mode: 'none',
    args: {
      enter: async ({ type, payload }) => {
        utools.hideMainWindow()
        const text = String(payload ?? '').trim()
        const looksLikeUrl = URL_RE.test(text)
        if (type === 'over' && !looksLikeUrl) {
          await resolveAndCopy(text, { searchByTitle: true })
        } else {
          await resolveAndCopy(text)
        }
      },
    },
  },
  arxiv2md: {
    mode: 'none',
    args: {
      enter: async ({ payload }) => {
        utools.hideMainWindow()
        await resolveAndCopy(String(payload ?? ''), { searchByTitle: true })
      },
    },
  },
}

window.exports = exportsMap
