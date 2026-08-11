import { PART as cards } from './_parts/cards'
import { PART as common } from './_parts/common'
import { PART as discovery } from './_parts/discovery'
import { PART as panels } from './_parts/panels'
import { PART as stage } from './_parts/stage'
import { PART as topbar } from './_parts/topbar'
import type { Dict } from './LocaleProvider'

/** 英文界面字典。类型标成 Dict：zh 加了键这里没跟上就编译不过。 */
export const en: Dict = {
  ...common.en,
  ...topbar.en,
  ...stage.en,
  ...panels.en,
  ...discovery.en,
  ...cards.en,
}
