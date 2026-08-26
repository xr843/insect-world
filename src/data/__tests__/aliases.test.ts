/**
 * 俗名词表的体检。
 *
 * 这张表是**人手写的自然语言数据**，没有任何编译期约束 —— 打错一个 id
 * 就是一条永远不生效的死条目，两只虫挂上同一个词就是一次把人送错地方。
 * 下面几条是能用机器判的那部分；判不了的（这个叫法真的存在吗）靠收录标准
 * 与 review，写在 `aliases.ts` 的文件头。
 */
import { describe, expect, it } from 'vitest'
import { allAliasEntries, aliasesOf, matchesAlias } from '../aliases'
import { INSECTS as ZH } from '../insects.zh'
import { INSECTS as EN } from '../insects.en'

const LOCALES = [
  { locale: 'zh' as const, insects: ZH },
  { locale: 'en' as const, insects: EN },
]

describe.each(LOCALES)('$locale 俗名表', ({ locale, insects }) => {
  const ids = new Set(insects.map((i) => i.id))

  it('每个 id 都真的是图鉴里的物种（打错一个字就是条死条目）', () => {
    const unknown = allAliasEntries(locale)
      .map(([id]) => id)
      .filter((id) => !ids.has(id))
    expect(unknown, `这些 id 在图鉴里不存在：${unknown.join(', ')}`).toEqual([])
  })

  it('没有空词条', () => {
    for (const [id, list] of allAliasEntries(locale)) {
      expect(list.length, `${id} 挂了一个空数组`).toBeGreaterThan(0)
      for (const a of list) expect(a.trim(), `${id} 有空白俗名`).not.toBe('')
    }
  })

  it('同一只虫内部不重复', () => {
    for (const [id, list] of allAliasEntries(locale)) {
      const lower = list.map((a) => a.toLowerCase())
      expect(new Set(lower).size, `${id} 的俗名里有重复`).toBe(lower.length)
    }
  })

  /**
   * 一个词挂到多只虫上**不一定是错的** —— 「蝴蝶」本来就该同时命中三只蝶。
   * 但那必须是**有意为之**，所以共用的词得逐条写在下面这张白名单里。
   *
   * ⚠️ 早先这条只判「跨目才算错」，太松：63 种里 28 种是鞘翅目，
   * 而最容易搞混的恰恰是甲虫之间 —— 把「金花虫」（指叶甲）错挂到花金龟上，
   * 跨目规则一声不吭。改成白名单之后，任何一个新出现的共用词都必须
   * 有人当场表态「这是通称，故意的」。
   */
  const SHARED_ON_PURPOSE: Record<'zh' | 'en', readonly string[]> = {
    zh: ['蝴蝶', '飞蛾', '蛾子', '金龟子'],
    en: [],
  }

  it('共用同一个俗名的，必须是白名单里的通称', () => {
    const owners = new Map<string, string[]>()
    for (const [id, list] of allAliasEntries(locale)) {
      for (const a of list) {
        const key = a.toLowerCase()
        owners.set(key, [...(owners.get(key) ?? []), id])
      }
    }
    const allow = new Set(SHARED_ON_PURPOSE[locale].map((a) => a.toLowerCase()))
    const surprises = [...owners.entries()]
      .filter(([a, holders]) => holders.length > 1 && !allow.has(a))
      .map(([a, holders]) => `${a} → ${holders.join(' / ')}`)
    expect(
      surprises,
      `这些词挂在多只虫上，却不在"故意共用"的白名单里：\n${surprises.join('\n')}`,
    ).toEqual([])
  })

  it('白名单里没有过期条目（写了却其实只挂着一只虫）', () => {
    const count = new Map<string, number>()
    for (const [, list] of allAliasEntries(locale)) {
      for (const a of list) count.set(a.toLowerCase(), (count.get(a.toLowerCase()) ?? 0) + 1)
    }
    const stale = SHARED_ON_PURPOSE[locale].filter((a) => (count.get(a.toLowerCase()) ?? 0) < 2)
    expect(stale, `白名单里这些词其实没被共用：${stale.join(', ')}`).toEqual([])
  })

  /** 通称也不许跨目 —— 「蝴蝶」只能落在鳞翅目里 */
  it('共用的通称仍限在同一个目内', () => {
    const orderOf = new Map(insects.map((i) => [i.id, i.order]))
    const owners = new Map<string, string[]>()
    for (const [id, list] of allAliasEntries(locale)) {
      for (const a of list) {
        const key = a.toLowerCase()
        owners.set(key, [...(owners.get(key) ?? []), id])
      }
    }
    const crossOrder = [...owners.entries()]
      .filter(([, holders]) => new Set(holders.map((h) => orderOf.get(h))).size > 1)
      .map(([a, holders]) => `${a} → ${holders.join(' / ')}`)
    expect(crossOrder, `这些俗名同时挂在不同目的物种上：\n${crossOrder.join('\n')}`).toEqual([])
  })

  /**
   * 俗名是给**搜不到的**词准备的。正式名里已经含着的词再列一遍不会出错，
   * 但它是噪音，而且会掩盖「这只虫其实没补到俗名」这个事实。
   */
  it('不重复正式名里已经有的词', () => {
    const redundant: string[] = []
    for (const [id, list] of allAliasEntries(locale)) {
      const name = insects.find((i) => i.id === id)!.name.toLowerCase()
      for (const a of list) if (name.includes(a.toLowerCase())) redundant.push(`${id}: ${a}`)
    }
    expect(redundant, `正式名里已经有了：${redundant.join(', ')}`).toEqual([])
  })
})

describe('matchesAlias', () => {
  it('整词命中', () => {
    expect(matchesAlias('zh', 'rhinoceros-beetle', '独角仙')).toBe(true)
  })

  it('前缀/子串也命中 —— 人打到一半就该出结果', () => {
    expect(matchesAlias('zh', 'rhinoceros-beetle', '独角')).toBe(true)
  })

  it('英文不区分大小写（调用方已 toLowerCase，这里再兜一层）', () => {
    expect(matchesAlias('en', 'ladybird', 'ladybug')).toBe(true)
  })

  it('空串不命中任何东西', () => {
    expect(matchesAlias('zh', 'rhinoceros-beetle', '')).toBe(false)
  })

  it('没有俗名的物种不炸', () => {
    expect(aliasesOf('zh', '不存在的虫')).toEqual([])
    expect(matchesAlias('zh', '不存在的虫', '随便')).toBe(false)
  })
})
