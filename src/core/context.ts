import type { HandlerContext } from './types'
import http from 'node:http'
import https from 'node:https'
import { URL } from 'node:url'
import zlib from 'node:zlib'

const DEFAULT_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'

const DEFAULT_TIMEOUT_MS = 10_000
const MAX_REDIRECTS = 5

type HeaderBag = Record<string, string>

type HeaderInput =
  | Record<string, string>
  | Array<[string, string]>
  | { forEach(cb: (v: string, k: string) => void): void }

function normalizeHeaders(input?: unknown): HeaderBag {
  const out: HeaderBag = {}
  if (!input) return out
  const h = input as HeaderInput
  if (Array.isArray(h)) {
    for (const [k, v] of h) out[k.toLowerCase()] = v
  } else if (typeof (h as { forEach?: unknown }).forEach === 'function') {
    ;(h as { forEach(cb: (v: string, k: string) => void): void }).forEach((v, k) => {
      out[k.toLowerCase()] = v
    })
  } else {
    for (const [k, v] of Object.entries(h as Record<string, string>)) {
      out[k.toLowerCase()] = v
    }
  }
  return out
}

interface RawResponse {
  status: number
  headers: HeaderBag
  body: Buffer
  finalUrl: string
}

function requestOnce(
  target: string,
  headers: HeaderBag,
  timeoutMs: number,
): Promise<RawResponse> {
  return new Promise((resolve, reject) => {
    let parsed: URL
    try {
      parsed = new URL(target)
    } catch (e) {
      reject(e instanceof Error ? e : new Error(String(e)))
      return
    }
    const mod = parsed.protocol === 'http:' ? http : https
    const req = mod.request(
      {
        method: 'GET',
        protocol: parsed.protocol,
        hostname: parsed.hostname,
        port: parsed.port || (parsed.protocol === 'http:' ? 80 : 443),
        path: `${parsed.pathname}${parsed.search}`,
        headers,
      },
      (res) => {
        const chunks: Buffer[] = []
        const enc = String(res.headers['content-encoding'] ?? '').toLowerCase()
        let stream: NodeJS.ReadableStream = res
        if (enc === 'gzip') stream = res.pipe(zlib.createGunzip())
        else if (enc === 'deflate') stream = res.pipe(zlib.createInflate())
        else if (enc === 'br') stream = res.pipe(zlib.createBrotliDecompress())
        stream.on('data', (c: Buffer) => chunks.push(c))
        stream.on('end', () => {
          const flatHeaders: HeaderBag = {}
          for (const [k, v] of Object.entries(res.headers)) {
            if (typeof v === 'string') flatHeaders[k.toLowerCase()] = v
            else if (Array.isArray(v)) flatHeaders[k.toLowerCase()] = v.join(', ')
          }
          resolve({
            status: res.statusCode ?? 0,
            headers: flatHeaders,
            body: Buffer.concat(chunks),
            finalUrl: target,
          })
        })
        stream.on('error', reject)
      },
    )
    req.setTimeout(timeoutMs, () => {
      req.destroy(new Error(`请求超时（${timeoutMs / 1000}s）: ${target}`))
    })
    req.on('error', reject)
    req.end()
  })
}

async function nodeFetch(
  url: string,
  headers: HeaderBag,
  timeoutMs: number,
): Promise<RawResponse> {
  let current = url
  for (let i = 0; i <= MAX_REDIRECTS; i++) {
    const res = await requestOnce(current, headers, timeoutMs)
    if (res.status >= 300 && res.status < 400 && res.headers['location']) {
      if (i === MAX_REDIRECTS) {
        throw new Error(`重定向次数超出上限（${MAX_REDIRECTS}）: ${url}`)
      }
      current = new URL(res.headers['location'], current).toString()
      continue
    }
    return { ...res, finalUrl: current }
  }
  throw new Error(`重定向次数超出上限（${MAX_REDIRECTS}）: ${url}`)
}

export function createContext(overrides: Partial<HandlerContext> = {}): HandlerContext {
  const fetchText: HandlerContext['fetchText'] = async (url, init) => {
    const headers: HeaderBag = {
      'user-agent': DEFAULT_UA,
      accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'accept-encoding': 'gzip, deflate, br',
      ...normalizeHeaders(init?.headers),
    }
    const res = await nodeFetch(url, headers, DEFAULT_TIMEOUT_MS)
    if (res.status < 200 || res.status >= 300) {
      throw new Error(`HTTP ${res.status} for ${url}`)
    }
    return res.body.toString('utf8')
  }

  const fetchJson: HandlerContext['fetchJson'] = async <T = unknown>(
    url: string,
    init?: RequestInit,
  ): Promise<T> => {
    const headers: HeaderBag = {
      'user-agent': DEFAULT_UA,
      accept: 'application/json,*/*;q=0.8',
      'accept-encoding': 'gzip, deflate, br',
      ...normalizeHeaders(init?.headers),
    }
    const res = await nodeFetch(url, headers, DEFAULT_TIMEOUT_MS)
    if (res.status < 200 || res.status >= 300) {
      throw new Error(`HTTP ${res.status} for ${url}`)
    }
    return JSON.parse(res.body.toString('utf8')) as T
  }

  return { fetchText, fetchJson, ...overrides }
}
