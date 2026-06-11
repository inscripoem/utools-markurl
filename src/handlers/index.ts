import { HandlerManager } from '../core/manager'
import { arxivPaper, doiPaper } from './paper'
import { githubRepo } from './github'
import { youtubeVideo } from './youtube'
import { wikipediaPage } from './wikipedia'
import { bilibiliVideo } from './bilibili'
import { csdnArticle } from './csdn'
import { webpage } from './webpage'

export const defaultManager = new HandlerManager().use(
  arxivPaper,
  doiPaper,
  githubRepo,
  youtubeVideo,
  wikipediaPage,
  bilibiliVideo,
  csdnArticle,
  webpage,
)

export {
  arxivPaper,
  doiPaper,
  githubRepo,
  youtubeVideo,
  wikipediaPage,
  bilibiliVideo,
  csdnArticle,
  webpage,
}
