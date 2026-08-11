import type { Locale } from './types'

/**
 * 语言的自称名 —— 各语言用自己的文字写自己。
 *
 * 不进字典有两个原因：一是「中」在英文界面上也该显示成「中」而不是
 * "Chinese"，这是语言切换器的通行做法，也让不懂当前界面语言的人能
 * 找到自己那一档；二是字典闸门要求中英两侧的值不同，而自称名恰恰
 * 两侧相同，放进去会永远打架。
 *
 * 也因此它不能待在 src/components/ 里 —— 那里禁止出现中文字面量。
 */
export const LOCALE_AUTONYM: Record<Locale, string> = { zh: '中', en: 'EN' }
