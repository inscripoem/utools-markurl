import * as cheerio from 'cheerio'
import { defineHandler } from '../core/manager'

export const webpage = defineHandler({
  name: 'webpage',
  match: (url) => /^https?:\/\//i.test(url),
  async fetch(url, { fetchText }) {
    const html = await fetchText(url)
    const $ = cheerio.load(html)
    const title =
      $('meta[property="og:title"]').attr('content') ||
      $('meta[name="twitter:title"]').attr('content') ||
      $('title').first().text().trim() ||
      url
    return {
      type: 'Webpage',
      title: title.trim(),
      url,
    }
  },
})
