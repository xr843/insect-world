import { describe, expect, it } from 'vitest'
import { INSECTS, getInsect } from '../insects.zh'
import { GUIDES, getGuide } from '../guides.zh'

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

/** 第 6 轮（50→60）新增的 10 个物种 id */
const ROUND6_IDS = [
  'water-scavenger',
  'checkered-beetle',
  'shining-chafer',
  'assassin-bug',
  'bumblebee',
  'cricket',
  'robber-fly',
  'crane-fly',
  'mantidfly',
  'caddisfly',
] as const

/**
 * 第 6 轮任务书为各物种规定的 anchor 白名单。
 * insects.ts 的 hotspots 就绪后，上方主循环仍会按实际 hotspots 二次把关；
 * 这份白名单让新增 guide 在跨层集成完成前也能被独立校验。
 */
const ROUND6_ANCHOR_WHITELIST: Record<(typeof ROUND6_IDS)[number], readonly string[]> = {
  'water-scavenger': ['palp', 'keel', 'elytra', 'eye', 'leg', 'antenna'],
  'checkered-beetle': ['band', 'fuzz', 'elytra', 'eye', 'pronotum', 'leg'],
  'shining-chafer': ['elytra', 'pronotum', 'clypeus', 'antenna', 'leg', 'eye'],
  'assassin-bug': ['rostrum', 'foreleg', 'pronotum', 'eye', 'antenna', 'abdomen'],
  bumblebee: ['fuzz', 'pollenBasket', 'wing', 'eye', 'antenna', 'abdomen'],
  cricket: ['stridulator', 'cercus', 'hindleg', 'antenna', 'eye', 'head'],
  'robber-fly': ['mystax', 'foreleg', 'wing', 'eye', 'haltere', 'abdomen'],
  'crane-fly': ['haltere', 'leg', 'wing', 'thorax', 'abdomen', 'antenna'],
  mantidfly: ['raptorialLeg', 'wing', 'pronotum', 'eye', 'antenna', 'abdomen'],
  caddisfly: ['hairyWing', 'antenna', 'palp', 'eye', 'thorax', 'abdomen'],
}

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

  it('INSECTS 恰好 63 个物种', () => {
    expect(INSECTS).toHaveLength(63)
  })

  it('GUIDES 恰好 63 条', () => {
    expect(Object.keys(GUIDES)).toHaveLength(63)
  })

  it('第 6 轮新增的 10 个物种 id 均已收录进 GUIDES', () => {
    for (const id of ROUND6_IDS) {
      expect(Object.keys(GUIDES), `GUIDES 中缺少第 6 轮新增物种 ${id}`).toContain(id)
    }
  })

  it('新增的 10 个物种 id 均已收录进 GUIDES', () => {
    const newIds = [
      'goliath-beetle',
      'bombardier-beetle',
      'darkling-beetle',
      'net-winged-beetle',
      'leaf-beetle',
      'damselfly',
      'orchid-mantis',
      'dead-leaf-butterfly',
      'hawk-moth',
      'termite-soldier',
    ]
    for (const id of newIds) {
      expect(Object.keys(GUIDES), `GUIDES 中缺少新增物种 ${id}`).toContain(id)
    }
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

/**
 * 第 6 轮新增条目的独立校验：不依赖 insects.ts。
 * 上方主循环在对应 insect 记录缺席时会跳过全部结构断言，
 * 这里按任务书的 anchor 白名单与字数约束先行把关；
 * insects.ts 就绪后两套断言并行生效，互为冗余。
 */
describe('第 6 轮新增条目（独立于 insects.ts 的校验）', () => {
  for (const id of ROUND6_IDS) {
    const guide = GUIDES[id]

    describe(`新增物种：${id}`, () => {
      it('guide 已收录', () => {
        expect(guide, `GUIDES 中缺少 ${id}`).toBeDefined()
      })

      if (!guide) return

      const whitelist = new Set(ROUND6_ANCHOR_WHITELIST[id])

      it('lesson 有 3~4 步、标题互不相同、至少 2 步带 anchor', () => {
        expect(guide.lesson.length).toBeGreaterThanOrEqual(3)
        expect(guide.lesson.length).toBeLessThanOrEqual(4)
        const titles = guide.lesson.map(s => s.title)
        expect(new Set(titles).size).toBe(titles.length)
        expect(guide.lesson.filter(s => !!s.anchor).length).toBeGreaterThanOrEqual(2)
      })

      it('lesson 各步 anchor 均在任务书白名单内', () => {
        for (const step of guide.lesson) {
          if (step.anchor === undefined) continue
          expect(
            whitelist.has(step.anchor),
            `${id} lesson「${step.title}」anchor="${step.anchor}" 不在白名单 [${[...whitelist].join(', ')}] 内`,
          ).toBe(true)
        }
      })

      it('lesson 各步标题与正文长度符合约束', () => {
        for (const [i, step] of guide.lesson.entries()) {
          expect(
            inRange(step.title.length, BOUNDS.lessonTitle),
            `${id} lesson[${i}].title="${step.title}" 长度=${step.title.length}`,
          ).toBe(true)
          expect(
            inRange(step.body.length, BOUNDS.lessonBody),
            `${id} lesson[${i}].body 长度=${step.body.length}：${step.body}`,
          ).toBe(true)
        }
      })

      it('motion 与 habitat 的标题、正文长度符合约束', () => {
        expect(
          inRange(guide.motion.title.length, BOUNDS.motionTitle),
          `${id} motion.title="${guide.motion.title}" 长度=${guide.motion.title.length}`,
        ).toBe(true)
        expect(
          inRange(guide.motion.body.length, BOUNDS.motionBody),
          `${id} motion.body 长度=${guide.motion.body.length}`,
        ).toBe(true)
        expect(
          inRange(guide.habitat.title.length, BOUNDS.habitatTitle),
          `${id} habitat.title="${guide.habitat.title}" 长度=${guide.habitat.title.length}`,
        ).toBe(true)
        expect(
          inRange(guide.habitat.body.length, BOUNDS.habitatBody),
          `${id} habitat.body 长度=${guide.habitat.body.length}`,
        ).toBe(true)
      })

      it('quiz 恰好 2 题，每题 3 个互异选项、answer 合法、各字段长度符合约束', () => {
        expect(guide.quiz).toHaveLength(2)
        for (const [i, q] of guide.quiz.entries()) {
          expect(q.options, `${id} quiz[${i}] 选项数不是 3`).toHaveLength(3)
          expect(new Set(q.options).size, `${id} quiz[${i}] 选项有重复`).toBe(q.options.length)
          expect(Number.isInteger(q.answer), `${id} quiz[${i}].answer 不是整数`).toBe(true)
          expect(q.answer).toBeGreaterThanOrEqual(0)
          expect(q.answer).toBeLessThanOrEqual(2)
          expect(
            inRange(q.question.length, BOUNDS.quizQuestion),
            `${id} quiz[${i}].question 长度=${q.question.length}`,
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
        }
      })
    })
  }
})
