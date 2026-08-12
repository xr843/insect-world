import { describe, expect, it } from 'vitest'
import { INAT_TAXA, photoUrl } from '../external'
import { INSECTS } from '../insects.zh'

/**
 * 实物照片外链的守门测试。
 *
 * 这张表是构建期解析出来的（脚本见提交记录），最大的风险不是「少了几条」，
 * 而是**链到错的物种上**：按学名做模糊搜索时，`Anatolica sp.`（甘肃鳖甲）
 * 的第一个结果是 Silene csereii —— 一种开花植物。这种错误页面不会报错、
 * 用户不点开不会发现，所以下面第一条断言钉的是「表里的 key 必须真的是本
 * 图鉴的物种」，第二条钉的是「故意留空的两条不许被人顺手补上」。
 */

/** iNat 没有收录、且候选是**另一个种**，宁可不给链接也不能链错 */
const INTENTIONALLY_ABSENT = new Set(['blister-beetle', 'assassin-bug'])

describe('实物照片外链', () => {
  it('每个 key 都是图鉴里真实存在的物种 id', () => {
    const ids = new Set(INSECTS.map((i) => i.id))
    for (const key of Object.keys(INAT_TAXA)) {
      expect(ids.has(key), `external.ts 里的 '${key}' 不是任何物种的 id`).toBe(true)
    }
  })

  it('taxon id 都是正整数', () => {
    for (const [key, taxon] of Object.entries(INAT_TAXA)) {
      expect(Number.isInteger(taxon), `${key} 的 taxon 不是整数：${taxon}`).toBe(true)
      expect(taxon, `${key} 的 taxon 应为正数`).toBeGreaterThan(0)
    }
  })

  it('taxon id 不重复 —— 两个物种链到同一个页面必是解析出错', () => {
    const taxa = Object.values(INAT_TAXA)
    expect(new Set(taxa).size).toBe(taxa.length)
  })

  it('只有确认 iNat 未收录的物种可以没有链接', () => {
    const missing = INSECTS.filter((i) => !INAT_TAXA[i.id]).map((i) => i.id)
    expect(new Set(missing)).toEqual(INTENTIONALLY_ABSENT)
  })

  it('photoUrl 对有记录的物种给出 taxa 直链，对没有的给出 null', () => {
    expect(photoUrl('rhinoceros-beetle')).toMatch(/^https:\/\/www\.inaturalist\.org\/taxa\/\d+$/)
    expect(photoUrl('blister-beetle')).toBeNull()
    expect(photoUrl('not-a-species')).toBeNull()
  })
})
