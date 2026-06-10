import { defineHandler } from '../core/manager'
import type { Info } from '../core/types'

const REPO_RE = /^https?:\/\/(?:www\.)?github\.com\/([^/\s?#]+)\/([^/\s?#]+?)(?:\.git)?(?:[/?#].*)?$/i

const RESERVED_OWNERS = new Set([
  'orgs',
  'settings',
  'marketplace',
  'sponsors',
  'features',
  'pricing',
  'topics',
  'collections',
  'trending',
  'enterprise',
  'about',
  'login',
  'join',
  'notifications',
  'pulls',
  'issues',
  'codespaces',
  'explore',
  'new',
])

interface GithubRepoResp {
  name?: string
  full_name?: string
  description?: string | null
  html_url?: string
  owner?: { login?: string }
  language?: string | null
}

export const githubRepo = defineHandler({
  name: 'github.repo',
  match: (url) => {
    const m = url.match(REPO_RE)
    if (!m) return false
    return !RESERVED_OWNERS.has(m[1].toLowerCase())
  },
  async fetch(url, { fetchJson }) {
    const m = url.match(REPO_RE)
    if (!m) return null
    const owner = m[1]
    const repo = m[2]
    const data = await fetchJson<GithubRepoResp>(
      `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`,
      { headers: { Accept: 'application/vnd.github+json' } },
    )
    if (!data.full_name) return null
    const info: Info = {
      type: 'Repo',
      title: data.full_name,
      url: data.html_url ?? `https://github.com/${owner}/${repo}`,
      source: 'GitHub',
      author: data.owner?.login ?? owner,
    }
    if (data.description) info.extra = { description: data.description }
    return info
  },
})
