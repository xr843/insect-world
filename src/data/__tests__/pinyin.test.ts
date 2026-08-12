import { describe, expect, it } from 'vitest'
import { NAME_PINYIN, pinyinOf } from '../pinyin'
import { INSECTS } from '../insects.zh'

/**
 * 名称注音的守门测试。
 *
 * 这份数据是拿 pypinyin 生成后**逐条人工念过**的 —— 60 个里当时核出 3 个多音字
 * 错误（长戟 cháng 被判成 zhǎng、长喙同理、豉甲 chǐ 被判成 shì）。所以这里钉的
 * 不只是「有没有漏」，还有「音节数对不对得上字数」：多音字判错通常不改变音节数，
 * 但漏字、串行会，这条能挡住最常见的机械错误。
 *
 * 真正的多音字正确性没有测试能自动保证 —— 加物种时必须有人把名字念一遍。
 */

/** 名字里不参与注音的符号 */
const strip = (name: string) => name.replace(/[（）()·・\s]/g, '')

describe('物种名注音', () => {
  it('每个物种都有注音', () => {
    for (const insect of INSECTS) {
      expect(NAME_PINYIN[insect.id], `${insect.name} 缺注音`).toBeTruthy()
    }
  })

  it('没有多余的 key', () => {
    const ids = new Set(INSECTS.map((i) => i.id))
    for (const key of Object.keys(NAME_PINYIN)) {
      expect(ids.has(key), `注音表里的 '${key}' 不是任何物种的 id`).toBe(true)
    }
  })

  it('音节数与汉字数一致 —— 挡住漏字与串行', () => {
    for (const insect of INSECTS) {
      const py = NAME_PINYIN[insect.id]
      const syllables = py.replace(/[（）()]/g, ' ').trim().split(/\s+/).filter(Boolean).length
      const chars = strip(insect.name).length
      expect(syllables, `${insect.name}（${chars} 字）注音 "${py}" 有 ${syllables} 个音节`).toBe(chars)
    }
  })

  it('只含带声调的拼音字母，不混入汉字或数字声调', () => {
    for (const [id, py] of Object.entries(NAME_PINYIN)) {
      expect(py, `${id} 的注音混进了汉字`).not.toMatch(/[一-鿿]/)
      expect(py, `${id} 的注音用了数字声调`).not.toMatch(/[0-9]/)
    }
  })

  it('三条人工修正没有被工具生成的结果覆盖回去', () => {
    expect(NAME_PINYIN['hercules-beetle']).toContain('cháng')
    expect(NAME_PINYIN['hawk-moth']).toContain('cháng')
    expect(NAME_PINYIN['whirligig-beetle']).toBe('chǐ jiǎ')
  })

  it('pinyinOf 对未知 id 返回 null', () => {
    expect(pinyinOf('not-a-species')).toBeNull()
  })
})
