import type { HandlerContext } from './types'

const DEFAULT_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'

const DEFAULT_TIMEOUT_MS = 10_000

async function fetchWithTimeout(
  url: string,
  init: RequestInit | undefined,
  timeoutMs: number,
): Promise<Response> {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), timeoutMs)
  try {
    return await fetch(url, { ...init, signal: init?.signal ?? ctrl.signal })
  } catch (e) {
    if (ctrl.signal.aborted) {
      throw new Error(`请求超时（${timeoutMs / 1000}s）: ${url}`)
    }
    throw e
  } finally {
    clearTimeout(timer)
  }
}

export function createContext(overrides: Partial<HandlerContext> = {}): HandlerContext {
  const fetchText: HandlerContext['fetchText'] = async (url, init) => {
    const res = await fetchWithTimeout(
      url,
      {
        ...init,
        headers: {
          'User-Agent': DEFAULT_UA,
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          ...(init?.headers ?? {}),
        },
      },
      DEFAULT_TIMEOUT_MS,
    )
    if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`)
    return res.text()
  }

  const fetchJson: HandlerContext['fetchJson'] = async <T = unknown>(
    url: string,
    init?: RequestInit,
  ): Promise<T> => {
    const res = await fetchWithTimeout(
      url,
      {
        ...init,
        headers: {
          'User-Agent': DEFAULT_UA,
          Accept: 'application/json,*/*;q=0.8',
          ...(init?.headers ?? {}),
        },
      },
      DEFAULT_TIMEOUT_MS,
    )
    if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`)
    return (await res.json()) as T
  }

  return { fetchText, fetchJson, ...overrides }
}
