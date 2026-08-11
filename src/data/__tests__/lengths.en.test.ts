import { describe, expect, it } from 'vitest'
import { GUIDES } from '../guides.en'
import { INSECTS } from '../insects.en'

/**
 * 英文文案的长度闸门。
 *
 * 中文侧的阈值按字数，英文按字符数，不能直接套用 —— 但也不能不设：
 * 这些文字落在固定尺寸的卡片与弹窗里，中文 90 字的位置塞进 400 个
 * 英文字符就会溢出。取中文阈值的 ~1.7 倍（中文一个字的视觉宽度约合
 * 两个英文字符，再留一点余量），短标题另算，因为「头角怎么打斗」
 * 六个字译成 English 常有 24 个字符，倍率对短串不成立。
 *
 * 这道闸门是**并行翻译的真正验收线**。六批里有三批的 agent 中途因
 * 连接中断而死在压缩这一步，自报「已压过」，实际 176 个字段超限，
 * 最长的 413 —— 实施者写的自检和它的实现共享同一套假设，得由外部
 * 的尺子来量。
 */
const CAP = {
  summary: [85, 320],
  trivia: [50, 210],
  lessonTitle: [10, 48],
  lessonBody: [80, 210],
  motionTitle: [10, 48],
  motionBody: [100, 230],
  habitatTitle: [10, 48],
  habitatBody: [100, 230],
  quizQuestion: [15, 190],
  quizOption: [1, 140],
  quizExplain: [50, 150],
} as const

const inRange = (n: number, [lo, hi]: readonly [number, number]) => n >= lo && n <= hi

describe('英文文案长度', () => {
  for (const insect of INSECTS) {
    const g = GUIDES[insect.id]
    describe(insect.id, () => {
      it('summary / trivia', () => {
        expect(inRange(insect.summary.length, CAP.summary), `summary=${insect.summary.length}`).toBe(true)
        expect(inRange(insect.trivia.length, CAP.trivia), `trivia=${insect.trivia.length}`).toBe(true)
      })

      it('lesson 各步', () => {
        const bad = g.lesson
          .map((s, k) => ({ k, t: s.title.length, b: s.body.length }))
          .filter((x) => !inRange(x.t, CAP.lessonTitle) || !inRange(x.b, CAP.lessonBody))
          .map((x) => `lesson[${x.k}] title=${x.t} body=${x.b}`)
        expect(bad).toEqual([])
      })

      it('motion / habitat', () => {
        const bad: string[] = []
        if (!inRange(g.motion.title.length, CAP.motionTitle)) bad.push(`motion.title=${g.motion.title.length}`)
        if (!inRange(g.motion.body.length, CAP.motionBody)) bad.push(`motion.body=${g.motion.body.length}`)
        if (!inRange(g.habitat.title.length, CAP.habitatTitle)) bad.push(`habitat.title=${g.habitat.title.length}`)
        if (!inRange(g.habitat.body.length, CAP.habitatBody)) bad.push(`habitat.body=${g.habitat.body.length}`)
        expect(bad).toEqual([])
      })

      it('quiz 各题', () => {
        const bad: string[] = []
        g.quiz.forEach((q, k) => {
          if (!inRange(q.question.length, CAP.quizQuestion)) bad.push(`quiz[${k}].question=${q.question.length}`)
          if (!inRange(q.explain.length, CAP.quizExplain)) bad.push(`quiz[${k}].explain=${q.explain.length}`)
          q.options.forEach((o, oi) => {
            if (!inRange(o.length, CAP.quizOption)) bad.push(`quiz[${k}].options[${oi}]=${o.length}`)
          })
        })
        expect(bad).toEqual([])
      })
    })
  }
})
