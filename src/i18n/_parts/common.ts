import { definePart } from './part'

/**
 * 跨组件共用的文案。
 *
 * 单独成片是因为「关闭」出现在三个组件、「昆虫世界」出现在两个 ——
 * 各片自己定义会在 spread 时静默互相覆盖，dictionary.test.ts 里那道
 * 防重复闸门就是为它设的。
 */
export const PART = definePart(
  {
    'brand.name': '昆虫世界',
    'common.close': '关闭',
    'common.backToSpecimen': '回到标本',
  },
  {
    'brand.name': 'Insect World',
    'common.close': 'Close',
    'common.backToSpecimen': 'Back to the specimen',
  },
)
