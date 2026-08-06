import { describe, expect, it } from 'vitest'
import { INSECTS, getInsect } from '../insects'
import { GUIDES, getGuide } from '../guides'

/** 字段长度约束，源自撰写任务书里对各字段的字数要求 */
const BOUNDS = {
  lessonTitle: [4, 10],
  lessonBody: [50, 90],
  motionTitle: [4, 10],
  motionBody: [60, 100],
  habitatTitle: [4, 10],
  habitatBody: [60, 100],
  quizExplain: [30, 60],
  // 任务书未对题干/选项给出精确字数区间，这里只做合理性兜底，避免漏写或跑题式长段落
  quizQuestion: [6, 80],
  quizOption: [1, 60],
} as const

const inRange = (len: number, [min, max]: readonly [number, number]) => len >= min && len <= max

describe('GUIDES 数据完整性', () => {
  it('GUIDES 恰好覆盖 INSECTS 里全部物种的 id，不多不少', () => {
    const insectIds = new Set(INSECTS.map(i => i.id))
    const guideIds = new Set(Object.keys(GUIDES))
    expect(guideIds.size).toBe(insectIds.size)
    for (const id of insectIds) {
      expect(guideIds.has(id), `INSECTS 里的 ${id} 在 GUIDES 中缺失`).toBe(true)
    }
    for (const id of guideIds) {
      expect(insectIds.has(id), `GUIDES 里的 ${id} 不是 INSECTS 中的合法物种`).toBe(true)
    }
  })

  it('INSECTS 恰好 24 个物种', () => {
    expect(INSECTS).toHaveLength(24)
  })

  it.each(Object.keys(GUIDES))('%s：getGuide 能按 id 查到对应记录', id => {
    const found = getGuide(id)
    expect(found).toBeDefined()
    expect(found).toBe(GUIDES[id])
  })

  it('getGuide 对不存在的 id 返回 undefined', () => {
    expect(getGuide('does-not-exist')).toBeUndefined()
  })

  for (const id of Object.keys(GUIDES)) {
    const guide = GUIDES[id]
    const insect = getInsect(id)

    describe(`物种：${id}`, () => {
      it('对应的 insect 记录存在', () => {
        expect(insect, `insects.ts 中找不到 ${id}`).toBeDefined()
      })

      if (!insect) return

      const allowedAnchors = new Set(insect.hotspots.map(h => h.anchor))

      it('lesson 有 3~4 步', () => {
        expect(guide.lesson.length).toBeGreaterThanOrEqual(3)
        expect(guide.lesson.length).toBeLessThanOrEqual(4)
      })

      it('lesson 步骤标题互不相同（组件用 title 作为 React key）', () => {
        const titles = guide.lesson.map(s => s.title)
        expect(new Set(titles).size).toBe(titles.length)
      })

      it('至少 2 步带 anchor', () => {
        const withAnchor = guide.lesson.filter(s => !!s.anchor)
        expect(withAnchor.length).toBeGreaterThanOrEqual(2)
      })

      it('每个带 anchor 的步骤，其 anchor 都在该物种 hotspots 的 anchor 集合内', () => {
        for (const step of guide.lesson) {
          if (step.anchor === undefined) continue
          expect(
            allowedAnchors.has(step.anchor),
            `${id} 的 lesson 步骤「${step.title}」anchor="${step.anchor}" 不在 hotspots 允许集合 [${[...allowedAnchors].join(', ')}] 内`,
          ).toBe(true)
        }
      })

      it.each([0, 1, 2, 3])('lesson[%i] 标题与正文长度、body 与 summary 不完全相同（若存在该步）', i => {
        const step = guide.lesson[i]
        if (!step) return
        expect(
          inRange(step.title.length, BOUNDS.lessonTitle),
          `${id} lesson[${i}].title="${step.title}" 长度=${step.title.length}`,
        ).toBe(true)
        expect(
          inRange(step.body.length, BOUNDS.lessonBody),
          `${id} lesson[${i}].body 长度=${step.body.length}：${step.body}`,
        ).toBe(true)
        expect(step.body, `${id} lesson[${i}].body 与 summary 完全相同，疑似抄写`).not.toBe(insect.summary)
      })

      it('motion.title / motion.body 长度符合要求', () => {
        expect(
          inRange(guide.motion.title.length, BOUNDS.motionTitle),
          `${id} motion.title="${guide.motion.title}" 长度=${guide.motion.title.length}`,
        ).toBe(true)
        expect(
          inRange(guide.motion.body.length, BOUNDS.motionBody),
          `${id} motion.body 长度=${guide.motion.body.length}：${guide.motion.body}`,
        ).toBe(true)
      })

      it('habitat.title / habitat.body 长度符合要求', () => {
        expect(
          inRange(guide.habitat.title.length, BOUNDS.habitatTitle),
          `${id} habitat.title="${guide.habitat.title}" 长度=${guide.habitat.title.length}`,
        ).toBe(true)
        expect(
          inRange(guide.habitat.body.length, BOUNDS.habitatBody),
          `${id} habitat.body 长度=${guide.habitat.body.length}：${guide.habitat.body}`,
        ).toBe(true)
      })

      it('quiz 恰好 2 题', () => {
        expect(guide.quiz).toHaveLength(2)
      })

      it.each([0, 1])('quiz[%i] 结构合法：3 个选项、answer 在 0~2、explain 非空且长度符合要求', i => {
        const q = guide.quiz[i]
        expect(q, `${id} 缺少 quiz[${i}]`).toBeDefined()
        expect(q.options, `${id} quiz[${i}] 选项数不是 3`).toHaveLength(3)
        expect(q.answer, `${id} quiz[${i}].answer=${q.answer} 越界`).toBeGreaterThanOrEqual(0)
        expect(q.answer).toBeLessThanOrEqual(2)
        expect(Number.isInteger(q.answer), `${id} quiz[${i}].answer 不是整数`).toBe(true)
        expect(
          inRange(q.question.length, BOUNDS.quizQuestion),
          `${id} quiz[${i}].question 长度=${q.question.length}：${q.question}`,
        ).toBe(true)
        for (const [oi, opt] of q.options.entries()) {
          expect(
            inRange(opt.length, BOUNDS.quizOption),
            `${id} quiz[${i}].options[${oi}] 长度=${opt.length}：${opt}`,
          ).toBe(true)
        }
        expect(
          inRange(q.explain.length, BOUNDS.quizExplain),
          `${id} quiz[${i}].explain 长度=${q.explain.length}：${q.explain}`,
        ).toBe(true)
      })

      it('quiz 每题的 3 个选项互不相同', () => {
        for (const q of guide.quiz) {
          expect(new Set(q.options).size).toBe(q.options.length)
        }
      })
    })
  }
})
