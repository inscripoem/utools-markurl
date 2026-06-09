import type { HandlerContext } from './types'

const DEFAULT_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'

export function createContext(overrides: Partial<HandlerContext> = {}): HandlerContext {
  const fetchText: HandlerContext['fetchText'] = async (url, init) => {
    const res = await fetch(url, {
      ...init,
      headers: {
        'User-Agent': DEFAULT_UA,
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        ...(init?.headers ?? {}),
      },
    })
    if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`)
    return res.text()
  }

  const fetchJson: HandlerContext['fetchJson'] = async <T = unknown>(
    url: string,
    init?: RequestInit,
  ): Promise<T> => {
    const res = await fetch(url, {
      ...init,
      headers: {
        'User-Agent': DEFAULT_UA,
        Accept: 'application/json,*/*;q=0.8',
        ...(init?.headers ?? {}),
      },
    })
    if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`)
    return (await res.json()) as T
  }

  return { fetchText, fetchJson, ...overrides }
}
