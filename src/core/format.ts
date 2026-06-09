import type { Info } from './types'

const DEFAULT_TEMPLATES: Record<string, string> = {
  Webpage: '[{title}]({url})',
  Article: '[{title} - {author}]({url})',
  Blog: '[{title} - {author}]({url})',
  Video: '[{title} - {source}]({url})',
  Repository: '[{title}]({url})',
  Wiki: '[{title} - Wikipedia]({url})',
  Book: '[{title} - {author}]({url})',
  Movie: '[{title}]({url})',
  Paper: '[{title}]({url}){pdf}',
}

export function toMarkdown(info: Info, templates: Record<string, string> = DEFAULT_TEMPLATES): string {
  const tpl = templates[info.type] ?? DEFAULT_TEMPLATES.Webpage
  return tpl.replace(/\{(\w+)\}/g, (_, key: string) => {
    if (key === 'pdf' && info.pdf) return ` ([PDF](${info.pdf}))`
    const value = (info as unknown as Record<string, string | undefined>)[key]
    return value ?? ''
  })
}
