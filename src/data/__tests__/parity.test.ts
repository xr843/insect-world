import { describe, expect, it } from 'vitest'
import { GUIDES as G_EN } from '../guides.en'
import { GUIDES as G_ZH } from '../guides.zh'
import { INSECTS as EN } from '../insects.en'
import { INSECTS as ZH } from '../insects.zh'

/**
 * 中英数据的对等性闸门。
 *
 * 7.2 万字的 AI 翻译，人眼审不完 —— 但**结构对等**可以全自动核。
 * 这里核的不是译得好不好（那是人的事），而是译的过程中有没有把
 * 结构、编号、数字弄丢：这类错误一旦漏到线上，表现是测验答案对不上、
 * 标注点点了没反应、体长对比条画错，全都不会自己冒出来。
 */

/** 抽出一段文字里的全部数字串（含 30–55 这类范围） */
function numbers(s: string): string[] {
  return s.match(/\d+(?:[.,]\d+)*/g) ?? []
}

const CJK = /[一-鿿]/

describe('中英数据对等', () => {
  it('insects 的 id 列表逐位相同', () => {
    expect(EN.map((i) => i.id)).toEqual(ZH.map((i) => i.id))
  })

  it('guides 的 key 集合相同', () => {
    expect(Object.keys(G_EN).sort()).toEqual(Object.keys(G_ZH).sort())
  })

  for (const [idx, zh] of ZH.entries()) {
    describe(`物种：${zh.id}`, () => {
      const en = EN[idx]

      it('中立字段逐项相等', () => {
        expect(en.id).toBe(zh.id)
        expect(en.latin).toBe(zh.latin)
        expect(en.order).toBe(zh.order)
        expect(en.metamorphosis).toBe(zh.metamorphosis)
        expect(en.accent).toBe(zh.accent)
        expect(en.lifecycle).toHaveLength(zh.lifecycle.length)
        expect(en.relatives).toHaveLength(zh.relatives.length)
      })

      it('facts 的 icon 序列相同', () => {
        expect(en.facts.map((f) => f.icon)).toEqual(zh.facts.map((f) => f.icon))
      })

      it('hotspots 的 id / anchor / tone 序列相同', () => {
        expect(en.hotspots.map((h) => h.id)).toEqual(zh.hotspots.map((h) => h.id))
        expect(en.hotspots.map((h) => h.anchor)).toEqual(zh.hotspots.map((h) => h.anchor))
        expect(en.hotspots.map((h) => h.tone)).toEqual(zh.hotspots.map((h) => h.tone))
      })

      /**
       * 数字保真 —— AI 翻译最容易出错的地方。
       * 只查中文里出现过的数字有没有在英文对应字段里留下，不反向查：
       * 英文可以多出中文没有的数字（比如把「三对足」写成 "3 pairs"）。
       */
      it('facts 里的数字一个都没丢', () => {
        for (const [i, f] of zh.facts.entries()) {
          const got = en.facts[i].value
          for (const n of numbers(f.value)) {
            expect(got, `${zh.id} facts[${i}]「${f.value}」丢了数字 ${n}`).toContain(n)
          }
        }
      })

      it('summary 与 trivia 里的数字一个都没丢', () => {
        for (const [field, a, b] of [
          ['summary', zh.summary, en.summary],
          ['trivia', zh.trivia, en.trivia],
        ] as const) {
          for (const n of numbers(a)) {
            expect(b, `${zh.id} ${field} 丢了数字 ${n}`).toContain(n)
          }
        }
      })

      /** 漏译的典型表现是把中文原样抄过来 */
      it('英文字段里没有中文残留', () => {
        const texts = [
          en.name,
          en.epithet,
          en.summary,
          en.ecology,
          en.trivia,
          en.range,
          en.status,
          ...en.lifecycle,
          ...en.relatives,
          ...en.facts.flatMap((f) => [f.key, f.value]),
          ...en.hotspots.flatMap((h) => [h.label, h.note]),
        ]
        expect(texts.filter((t) => CJK.test(t))).toEqual([])
      })

      it('name 与 epithet 确实翻译过，不是照抄中文', () => {
        expect(en.name).not.toBe(zh.name)
        expect(en.epithet).not.toBe(zh.epithet)
      })

      const gz = G_ZH[zh.id]
      const ge = G_EN[zh.id]

      it('lesson 的 anchor 序列相同', () => {
        expect(ge.lesson.map((s) => s.anchor)).toEqual(gz.lesson.map((s) => s.anchor))
      })

      /**
       * quiz 的 answer 是 options 的下标 —— 翻译时若调换了选项顺序，
       * answer 就指向了错的那条，而且页面上看不出异样，只有答题者
       * 发现「选对了却判错」。这是整套翻译里后果最重的一类错。
       */
      it('quiz 的题数与正确答案下标相同', () => {
        expect(ge.quiz).toHaveLength(gz.quiz.length)
        expect(ge.quiz.map((q) => q.answer)).toEqual(gz.quiz.map((q) => q.answer))
        expect(ge.quiz.map((q) => q.options.length)).toEqual(gz.quiz.map((q) => q.options.length))
      })

      it('讲解与测验里没有中文残留', () => {
        const texts = [
          ...ge.lesson.flatMap((s) => [s.title, s.body]),
          ge.motion.title,
          ge.motion.body,
          ge.habitat.title,
          ge.habitat.body,
          ...ge.quiz.flatMap((q) => [q.question, q.explain, ...q.options]),
        ]
        expect(texts.filter((t) => CJK.test(t))).toEqual([])
      })
    })
  }
})
