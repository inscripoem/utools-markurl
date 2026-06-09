import type { DefineHandler, Handler, HandlerContext, Info } from './types'
import { createContext } from './context'

export const defineHandler: DefineHandler = (def) => {
  const handler: Handler = {
    name: def.name,
    match: def.match,
    fetch: async (url) => def.fetch(url, defaultCtx),
  }
  return handler
}

let defaultCtx: HandlerContext = createContext()

export function setDefaultContext(ctx: HandlerContext) {
  defaultCtx = ctx
}

export class HandlerManager {
  private handlers: Handler[] = []

  use(...hs: Handler[]): this {
    this.handlers.push(...hs)
    return this
  }

  async handle(url: string): Promise<Info | null> {
    for (const h of this.handlers) {
      if (!h.match(url)) continue
      try {
        const info = await h.fetch(url)
        if (info) return info
      } catch (e) {
        console.warn(`[markurl] handler "${h.name}" failed:`, e)
      }
    }
    return null
  }

  list(): readonly Handler[] {
    return this.handlers
  }
}
