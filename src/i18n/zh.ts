import { PART as cards } from './_parts/cards'
import { PART as common } from './_parts/common'
import { PART as discovery } from './_parts/discovery'
import { PART as panels } from './_parts/panels'
import { PART as stage } from './_parts/stage'
import { PART as topbar } from './_parts/topbar'

/**
 * 中文界面字典 —— 全站文案的单一出处，由 _parts 下的分片拼成。
 *
 * 这份是基准：Dict 定义为 Record<keyof typeof zh, string>，
 * 这里多一个键而 en 没跟上，编译就过不去。
 */
export const zh = {
  ...common.zh,
  ...topbar.zh,
  ...stage.zh,
  ...panels.zh,
  ...discovery.zh,
  ...cards.zh,
}
