/**
 * 「图鉴里确实没有」这张词表的体检。
 *
 * 一条就够，但这一条必须真跑搜索：**词表里的每个词，都得真的搜不到。**
 * 收进 absent.ts 的词会让界面对用户说「图鉴里没有它」并按未命中上报；
 * 而一个其实搜得到的词收在这里，就是同时说了假话、报了错数。
 *
 * 这条闸门当场就抓到了两个：「蜈蚣」命中了某条俗名、「蜘蛛」命中了正文。
 * 靠肉眼对着 63 个物种的数据判断哪个词搜不到，是不可能可靠的。
 */
import { describe, expect, it } from 'vitest'
import { allAbsentEntries, classifyMiss } from '../absent'
import { searchInsects } from '../../components/searchInsects'
import { INSECTS as ZH } from '../insects.zh'
import { INSECTS as EN } from '../insects.en'
import { zh } from '../../i18n/zh'
import { en } from '../../i18n/en'

const label = (dict: Record<string, string>) => (i: { order: string }) => dict[`order.${i.order}`] ?? i.order

describe('词表里的每个词都得真的搜不到', () => {
  it('中文词', () => {
    const found: string[] = []
    for (const e of allAbsentEntries()) {
      for (const w of e.zh) {
        if (searchInsects(ZH, w, 'zh', label(zh as Record<string, string>)).length > 0) found.push(`${e.token}/${w}`)
      }
    }
    expect(found, '这些词其实搜得到，不该收进 absent.ts —— 它们属于 aliases.ts 或本来就命中').toEqual([])
  })

  it('英文词', () => {
    const found: string[] = []
    for (const e of allAbsentEntries()) {
      for (const w of e.en) {
        if (searchInsects(EN, w, 'en', label(en as Record<string, string>)).length > 0) found.push(`${e.token}/${w}`)
      }
    }
    expect(found, '这些词其实搜得到，不该收进 absent.ts').toEqual([])
  })

  it('token 不重复', () => {
    const tokens = allAbsentEntries().map((e) => e.token)
    expect(new Set(tokens).size, `有重复的 token：${tokens.join('、')}`).toBe(tokens.length)
  })

  it('分类是双向包含的 —— 打「潮虫」中，打「潮虫是什么」也中', () => {
    expect(classifyMiss('潮虫')?.token).toBe('woodlouse')
    expect(classifyMiss('潮虫是什么')?.token).toBe('woodlouse')
    expect(classifyMiss('')).toBeNull()
  })
})
