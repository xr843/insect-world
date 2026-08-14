import { describe, expect, it } from 'vitest'
import { matchesPinyin, NAME_PINYIN, pinyinOf } from '../pinyin'
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

/**
 * 搜索用的拼音匹配。数据带声调（shuǐ mǐn），键盘敲出来的没有（shuimin）——
 * 归一化就是这两个世界之间唯一的桥，这里逐种敲一遍桥上的坑。
 */
describe('拼音搜索匹配', () => {
  it('全拼：去声调、去空格后 contains（水黾 → shuimin）', () => {
    expect(matchesPinyin('water-strider', 'shuimin')).toBe(true)
    expect(matchesPinyin('water-strider', 'uimi')).toBe(true) // contains，不要求从头
    expect(matchesPinyin('stick-insect', 'bangxiu')).toBe(true)
  })

  it('带空格或隔音号的输入也认（shui min 与撇号写法）', () => {
    expect(matchesPinyin('water-strider', 'shui min')).toBe(true)
    expect(matchesPinyin('water-strider', "shui'min")).toBe(true)
  })

  it('首字母缩写：双叉犀金龟 → scxjg，海滨蠼螋 → hbqs', () => {
    expect(matchesPinyin('rhinoceros-beetle', 'scxjg')).toBe(true)
    expect(matchesPinyin('earwig', 'hbqs')).toBe(true)
  })

  /** ǖǘǚǜ 剥掉声调后是 ü，键盘上通常打 v（lv）也有人打 u —— 两种都得认 */
  it('ü 的两种键盘写法都认（铜绿 → tonglv / tonglu）', () => {
    expect(matchesPinyin('shining-chafer', 'tonglv')).toBe(true)
    expect(matchesPinyin('shining-chafer', 'tonglu')).toBe(true)
  })

  /** 数据里唯一带全角括号的条目：括号当音节分隔，不能混进拼音串 */
  it('黑翅土白蚁（兵蚁）的括号不碍事', () => {
    expect(matchesPinyin('termite-soldier', 'bingyi')).toBe(true)
    expect(matchesPinyin('termite-soldier', 'hctbyby')).toBe(true)
  })

  it('单个字母不启动 —— 否则 s/c/j 会把结果列表填满', () => {
    expect(matchesPinyin('rhinoceros-beetle', 's')).toBe(false)
  })

  it('非拼音输入（汉字、数字、空串）直接不匹配', () => {
    expect(matchesPinyin('water-strider', '水黾')).toBe(false)
    expect(matchesPinyin('water-strider', 'shui3')).toBe(false)
    expect(matchesPinyin('water-strider', '')).toBe(false)
  })

  it('不相干的拼音不误报', () => {
    expect(matchesPinyin('water-strider', 'tangl')).toBe(false)
    expect(matchesPinyin('unknown-id', 'shuimin')).toBe(false)
  })
})
