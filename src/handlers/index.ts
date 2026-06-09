import { HandlerManager } from '../core/manager'
import { arxivPaper, doiPaper } from './paper'
import { webpage } from './webpage'

export const defaultManager = new HandlerManager().use(
  arxivPaper,
  doiPaper,
  webpage,
)

export { arxivPaper, doiPaper, webpage }
