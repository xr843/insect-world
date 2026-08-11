import { createContext, useContext, type ReactNode } from 'react'
import type { Guide, Insect } from '../data/types'
import type { Locale } from './types'
import type { zh } from './zh'

/** 字典的形状由中文那份决定：zh 里加一个键，en 没跟上就编译不过 */
export type Dict = Record<keyof typeof zh, string>

export interface LocaleBundle {
  locale: Locale
  dict: Dict
  insects: Insect[]
  getGuide: (id: string) => Guide | undefined
}

const Ctx = createContext<LocaleBundle | null>(null)

export function LocaleProvider({ value, children }: { value: LocaleBundle; children: ReactNode }) {
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

/**
 * 没有 Provider 就是接线错了，直接抛而不是静默回退。
 *
 * 回退成中文看起来「更健壮」，实际是让漏接线的组件一路蒙混到线上 ——
 * 英文页上冒出一块中文，反而比白屏更难被发现。
 */
export function useBundle(): LocaleBundle {
  const v = useContext(Ctx)
  if (!v) throw new Error('缺少 LocaleProvider')
  return v
}
