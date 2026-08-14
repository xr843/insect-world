/**
 * 虫名单行排版的守卫。
 *
 * 起因：详情栏 292px 宽，标题 40px，于是「双叉犀金龟」在 40×5=200px 处折成两行，
 * 名字被拦腰截断（「双叉犀金 / 龟」）。改法是按字数把字号收到刚好一行放得下
 * （算法见 fitName.ts，可用宽度写在各 module 的 data-fit 规则里）。
 *
 * 这套东西的失效方式全是**静默**的，肉眼要逐个物种点过去才看得见：
 *
 * - 样式里的 white-space: nowrap 被删 → 长名字又开始折行，短名字看不出区别
 * - 新物种名字过长 → 字号被公式一路压下去，压到比旁边的拉丁名还小也不会报错
 *
 * 所以这里一条钉规则在不在，一条钉最长的名字还看得清。
 */
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { INSECTS } from '../../data/insects.zh'
import { INSECTS as INSECTS_EN } from '../../data/insects.en'
import { fitName } from '../fitName'

const css = (file: string) => readFileSync(`src/components/${file}`, 'utf8')

/** 三处用到单行排版的界面，与各自 css 里那条 data-fit 规则 */
const SURFACES = [
  { where: '详情栏大标题', file: 'DetailPanel.module.css', rule: /\.title\[data-fit\]\s*\{[^}]*\}/ },
  { where: '左侧名录', file: 'LibraryPanel.module.css', rule: /\.name\[data-fit\]\s*\{[^}]*\}/ },
  { where: '图鉴库格子', file: 'Gallery.module.css', rule: /\.tileName\[data-fit\]\s*\{[^}]*\}/ },
] as const

describe('fitName 只对汉字名生效', () => {
  it('图鉴里的中文名全部带上字数', () => {
    const missed = INSECTS.filter((i) => fitName(i.name)['data-fit'] !== true).map((i) => i.name)
    expect(missed, `这些名字没有被标成单行排版：${missed.join('、')}`).toEqual([])
  })

  it('字数就是汉字个数', () => {
    expect(fitName('双叉犀金龟').style).toEqual({ '--name-chars': 5 })
    expect(fitName('黑翅土白蚁（兵蚁）').style).toEqual({ '--name-chars': 9 })
  })

  /**
   * 西文名是词组（最长「Giant Black Water Scavenger Beetle」34 个字母），
   * 同一套「一个字符一个字号」的算法会把标题压到 14px 以下 —— 那还不如让它照常折行。
   */
  it('英文版的名字一个都不参与', () => {
    const marked = INSECTS_EN.filter((i) => fitName(i.name)['data-fit'] === true).map((i) => i.name)
    expect(marked, `这些西文名被当成汉字名收窄了：${marked.join(', ')}`).toEqual([])
  })
})

describe('三处的单行规则都还在', () => {
  it.each(SURFACES)('$where', ({ file, rule }) => {
    const block = rule.exec(css(file))?.[0]
    expect(block, `${file} 里找不到 data-fit 规则，长名字会重新开始折行`).toBeTruthy()
    expect(block).toMatch(/white-space:\s*nowrap/)
    expect(block).toMatch(/var\(--name-chars/)
  })
})

describe('最长的名字仍然看得清', () => {
  /**
   * 单行排版是「放不下就缩字号」，所以名字再长也不会报错，只会越缩越小 ——
   * 缩到比旁边的拉丁名（11px）还小，主次就倒过来了，那时该改的是名字或版式，不是继续压字号。
   *
   * 上限定在 9 个字，是从最紧的一处倒推的：桌面名录留给名字的是 114px，
   * 按 11px 的下限最多排 10 个字；而名录在 1240px 以下会缩到 82px，
   * 9 个字在那一档已经要靠省略号收尾（见 LibraryPanel.module.css）。
   * 当前最长的「黑翅土白蚁（兵蚁）」正好 9 个字，已经贴着这条线，再长就该改名字或改版式。
   */
  const MAX_CHARS = 9

  it.each(INSECTS.map((i) => [i.name] as const))('%s', (name) => {
    expect(
      name.length,
      `「${name}」有 ${name.length} 个字，在最窄的名录里得压到 11px 以下才排得下一行 —— 换个短名字，或者先把版式改宽`,
    ).toBeLessThanOrEqual(MAX_CHARS)
  })
})
