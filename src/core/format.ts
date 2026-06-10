import type { Info } from './types'

const BASE_TEMPLATE = '**{type}:** [{title}]({url}), {source}{additional}'

function buildAdditional(info: Info): string {
  const parts: string[] = []
  if (info.author) parts.push(info.author)
  if (info.date) parts.push(info.date)
  if (info.pdf) parts.push(`[PDF](${info.pdf})`)
  if (info.citations) parts.push(info.citations)
  return parts.length ? `, ${parts.join(', ')}` : ''
}

export function toMarkdown(info: Info): string {
  return BASE_TEMPLATE.replace(/\{(\w+)\}/g, (_, key: string) => {
    if (key === 'additional') return buildAdditional(info)
    if (key === 'source') return info.source ?? ''
    const value = (info as unknown as Record<string, string | undefined>)[key]
    return value ?? ''
  })
}
