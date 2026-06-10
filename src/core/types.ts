export type InfoType =
  | 'Page'
  | 'Paper'
  | 'Video'
  | 'Article'
  | 'Repo'
  | 'Knowledge'
  | 'Book'
  | 'Movie'
  | 'Review'
  | 'Discussion'

export interface Info {
  type: InfoType
  title: string
  url: string
  source?: string
  author?: string
  date?: string
  pdf?: string
  citations?: string
  extra?: Record<string, string>
}

export interface Handler {
  readonly name: string
  match(url: string): boolean
  fetch(url: string): Promise<Info | null>
}

export interface HandlerContext {
  fetchText: (url: string, init?: RequestInit) => Promise<string>
  fetchJson: <T = unknown>(url: string, init?: RequestInit) => Promise<T>
}

export type DefineHandler = (def: {
  name: string
  match: Handler['match']
  fetch: (url: string, ctx: HandlerContext) => Promise<Info | null>
}) => Handler
