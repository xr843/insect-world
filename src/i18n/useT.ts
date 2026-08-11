import { useBundle, type Dict } from './LocaleProvider'
import { METAMORPHOSIS_LABEL, ORDER_LABEL } from './orders'

/**
 * 取一条界面文案。第二个参数替换 {name} 形式的占位符。
 *
 * 找不到键时返回键名本身而不是空串 —— 界面上出现 'notes.title' 这样的
 * 字样一眼就能看见，空白则会被当成排版问题查上半天。
 */
export function useT() {
  const { dict } = useBundle()
  return (key: keyof Dict, vars?: Record<string, string | number>) => {
    let s: string = dict[key] ?? (key as string)
    if (vars) for (const [k, v] of Object.entries(vars)) s = s.replaceAll(`{${k}}`, String(v))
    return s
  }
}

export function useLocale() {
  return useBundle().locale
}

/** 当前语言下的物种数据与讲解 —— 组件不再直接 import 数据模块 */
export function useSpecies() {
  const { insects, getGuide } = useBundle()
  return { insects, getGuide }
}

/** 目名与变态类型的显示名，跟随当前语言 */
export function useLabels() {
  const { locale } = useBundle()
  return { order: ORDER_LABEL[locale], metamorphosis: METAMORPHOSIS_LABEL[locale] }
}
