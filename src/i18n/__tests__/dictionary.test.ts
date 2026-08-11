import { describe, expect, it } from 'vitest'
import { en } from '../en'
import { zh } from '../zh'
import { PART as cards } from '../_parts/cards'
import { PART as common } from '../_parts/common'
import { PART as discovery } from '../_parts/discovery'
import { PART as panels } from '../_parts/panels'
import { PART as stage } from '../_parts/stage'
import { PART as topbar } from '../_parts/topbar'

const PARTS = { common, topbar, stage, panels, discovery, cards }

describe('两份字典对齐', () => {
  it('键集合完全相同', () => {
    expect(Object.keys(en).sort()).toEqual(Object.keys(zh).sort())
  })

  it('英文值非空', () => {
    for (const [k, v] of Object.entries(en)) {
      expect(v.trim(), `en['${k}'] 是空的`).not.toBe('')
    }
  })

  /** 漏译时最常见的偷懒是把中文原样抄过去，这条专门抓它 */
  it('英文值不等于中文值', () => {
    const copied = Object.keys(zh).filter(
      (k) => en[k as keyof typeof en] === zh[k as keyof typeof zh],
    )
    expect(copied).toEqual([])
  })

  /**
   * 分片之间不得有同名键。
   *
   * zh.ts 是把各片 spread 到一起的，同名键会**静默覆盖** —— 后拼进来的
   * 那片赢，前面那片的文案凭空消失且没有任何报错。「关闭」「昆虫世界」
   * 这类跨组件文案必须放在 common 片里，不许各片各定义一份。
   */
  it('分片之间没有重复键', () => {
    const owner = new Map<string, string>()
    const clashes: string[] = []
    for (const [name, part] of Object.entries(PARTS)) {
      for (const k of Object.keys(part.zh)) {
        const prev = owner.get(k)
        if (prev) clashes.push(`${k}：同时定义在 ${prev} 与 ${name}`)
        else owner.set(k, name)
      }
    }
    expect(clashes).toEqual([])
  })

  it('每个键都被拼进了最终字典', () => {
    const all = Object.values(PARTS).flatMap((p) => Object.keys(p.zh))
    expect(Object.keys(zh).sort()).toEqual([...new Set(all)].sort())
  })
})
