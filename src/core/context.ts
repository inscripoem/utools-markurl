import type { HandlerContext } from './types'
import http from 'node:http'
import https from 'node:https'
import { pipeline } from 'node:stream'
import { URL } from 'node:url'
import zlib from 'node:zlib'

const DEFAULT_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'

const DEFAULT_TIMEOUT_MS = 10_000
const MAX_REDIRECTS = 5
const MAX_BODY_BYTES = 10 * 1024 * 1024

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
    if (timeoutMs <= 0) {
      reject(new Error(`请求超时（总预算耗尽）: ${target}`))
      return
    }
    let parsed: URL
    try {
      parsed = new URL(target)
    } catch (e) {
      reject(e instanceof Error ? e : new Error(String(e)))
      return
    }
    let settled = false
    const settle = (fn: () => void) => {
      if (settled) return
      settled = true
      fn()
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
        const enc = String(res.headers['content-encoding'] ?? '').toLowerCase()
        const decoder =
          enc === 'gzip'
            ? zlib.createGunzip()
            : enc === 'deflate'
              ? zlib.createInflate()
              : enc === 'br'
                ? zlib.createBrotliDecompress()
                : null

        const chunks: Buffer[] = []
        let received = 0
        let stream: NodeJS.ReadableStream

        const onData = (c: Buffer) => {
          received += c.length
          if (received > MAX_BODY_BYTES) {
            const err = new Error(
              `\u54cd\u5e94\u4f53\u8d85\u8fc7\u4e0a\u9650\uff08${MAX_BODY_BYTES / 1024 / 1024}MB\uff09: ${target}`,
            )
            req.destroy(err)
            settle(() => reject(err))
            return
          }
          chunks.push(c)
        }

        const onEnd = () =>
          settle(() => {
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

        if (decoder) {
          stream = decoder
          pipeline(res, decoder, (err) => {
            if (err) settle(() => reject(err))
          })
        } else {
          stream = res
          res.on('error', (err) => settle(() => reject(err)))
        }
        stream.on('data', onData)
        stream.on('end', onEnd)
        stream.on('error', (err) => settle(() => reject(err)))
      },
    )
    req.setTimeout(timeoutMs, () => {
      const err = new Error(`\u8bf7\u6c42\u8d85\u65f6\uff08${timeoutMs}ms\uff09: ${target}`)
      req.destroy(err)
      settle(() => reject(err))
    })
    req.on('error', (err) => settle(() => reject(err)))
    req.end()
  })
}

async function nodeFetch(
  url: string,
  headers: HeaderBag,
  timeoutMs: number,
): Promise<RawResponse> {
  const startedAt = Date.now()
  let current = url
  for (let i = 0; i <= MAX_REDIRECTS; i++) {
    const remaining = timeoutMs - (Date.now() - startedAt)
    if (remaining <= 0) {
      throw new Error(`请求超时（总预算 ${timeoutMs}ms 耗尽）: ${url}`)
    }
    const res = await requestOnce(current, headers, remaining)
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
