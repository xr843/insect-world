import { describe, expect, it } from 'vitest'
import { getInsect, INSECTS } from '../insects'

/** 3D 模型上实际存在的锚点集合，逐物种给定；hotspot.anchor 不得越界 */
const ALLOWED_ANCHORS: Record<string, string[]> = {
  'rhinoceros-beetle': ['horn', 'thoraxHorn', 'elytra', 'eye', 'antenna', 'foreleg'],
  'monarch-butterfly': ['forewing', 'hindwing', 'proboscis', 'antenna', 'eye', 'abdomen'],
  honeybee: ['stinger', 'pollenBasket', 'wing', 'eye', 'antenna', 'thorax'],
  dragonfly: ['forewing', 'hindwing', 'eye', 'abdomen', 'thorax', 'leg'],
  mantis: ['raptorialLeg', 'head', 'eye', 'wing', 'abdomen', 'prothorax'],
  ladybird: ['elytra', 'spot', 'head', 'leg', 'antenna', 'pronotum'],
  ant: ['mandible', 'petiole', 'gaster', 'antenna', 'eye', 'leg'],
  cicada: ['tymbal', 'wing', 'eye', 'rostrum', 'head', 'abdomen'],
  locust: ['hindleg', 'wing', 'tympanum', 'eye', 'antenna', 'pronotum'],
  firefly: ['lantern', 'elytra', 'eye', 'antenna', 'thorax', 'leg'],
  'longhorn-beetle': ['antenna', 'elytra', 'mandible', 'eye', 'pronotum', 'leg'],
  'stick-insect': ['body', 'leg', 'antenna', 'head', 'thorax', 'camouflage'],
}

const EXPECTED_IDS = [
  'rhinoceros-beetle',
  'monarch-butterfly',
  'honeybee',
  'dragonfly',
  'mantis',
  'ladybird',
  'ant',
  'cicada',
  'locust',
  'firefly',
  'longhorn-beetle',
  'stick-insect',
]

const HEX_COLOR = /^#[0-9a-fA-F]{6}$/

describe('INSECTS 数据完整性', () => {
  it('恰好包含 12 条记录', () => {
    expect(INSECTS).toHaveLength(12)
  })

  it('id 全部唯一且与规定列表一致（含顺序）', () => {
    const ids = INSECTS.map(i => i.id)
    expect(new Set(ids).size).toBe(ids.length)
    expect(ids).toEqual(EXPECTED_IDS)
  })

  it.each(EXPECTED_IDS)('%s：getInsect 能按 id 查到对应记录', id => {
    const found = getInsect(id)
    expect(found).toBeDefined()
    expect(found?.id).toBe(id)
  })

  it('getInsect 对不存在的 id 返回 undefined', () => {
    expect(getInsect('does-not-exist')).toBeUndefined()
  })

  for (const insect of INSECTS) {
    describe(`物种：${insect.id}`, () => {
      it('facts 恰好 6 条', () => {
        expect(insect.facts).toHaveLength(6)
      })

      it('facts 的 icon 都在合法枚举内', () => {
        const allowedIcons = ['size', 'weight', 'time', 'place', 'food', 'ability']
        for (const fact of insect.facts) {
          expect(allowedIcons).toContain(fact.icon)
        }
      })

      it('hotspots 在 5~6 条之间', () => {
        expect(insect.hotspots.length).toBeGreaterThanOrEqual(5)
        expect(insect.hotspots.length).toBeLessThanOrEqual(6)
      })

      it('每个 hotspot 的 anchor 都在该物种允许的锚点集合内', () => {
        const allowed = ALLOWED_ANCHORS[insect.id]
        expect(allowed).toBeDefined()
        for (const h of insect.hotspots) {
          expect(allowed).toContain(h.anchor)
        }
      })

      it('hotspots 内部 anchor 不重复', () => {
        const anchors = insect.hotspots.map(h => h.anchor)
        expect(new Set(anchors).size).toBe(anchors.length)
      })

      it('hotspot 的 tone 都在合法枚举内', () => {
        const allowedTones = ['coral', 'lavender', 'sage', 'amber']
        for (const h of insect.hotspots) {
          expect(allowedTones).toContain(h.tone)
        }
      })

      it('accent 是合法的 6 位十六进制色值', () => {
        expect(insect.accent).toMatch(HEX_COLOR)
      })

      it('summary 长度在 50~140 字之间', () => {
        expect(insect.summary.length).toBeGreaterThanOrEqual(50)
        expect(insect.summary.length).toBeLessThanOrEqual(140)
      })

      it('trivia 长度在 30~90 字之间', () => {
        expect(insect.trivia.length).toBeGreaterThanOrEqual(30)
        expect(insect.trivia.length).toBeLessThanOrEqual(90)
      })

      it('metamorphosis 是合法枚举值', () => {
        expect(['完全变态', '不完全变态']).toContain(insect.metamorphosis)
      })

      it('lifecycle 有 3~4 个阶段', () => {
        expect(insect.lifecycle.length).toBeGreaterThanOrEqual(3)
        expect(insect.lifecycle.length).toBeLessThanOrEqual(4)
      })

      it('relatives 恰好 3 条', () => {
        expect(insect.relatives).toHaveLength(3)
      })

      it('epithet、name、latin、order、ecology、range、status 均非空', () => {
        expect(insect.epithet.length).toBeGreaterThan(0)
        expect(insect.name.length).toBeGreaterThan(0)
        expect(insect.latin.length).toBeGreaterThan(0)
        expect(insect.order.length).toBeGreaterThan(0)
        expect(insect.ecology.length).toBeGreaterThan(0)
        expect(insect.range.length).toBeGreaterThan(0)
        expect(insect.status.length).toBeGreaterThan(0)
      })
    })
  }

  it('全部 hotspot 的 id 在整个数据集内唯一', () => {
    const allHotspotIds = INSECTS.flatMap(i => i.hotspots.map(h => h.id))
    expect(new Set(allHotspotIds).size).toBe(allHotspotIds.length)
  })

  it('全部物种的 accent 互不相同', () => {
    const accents = INSECTS.map(i => i.accent.toLowerCase())
    expect(new Set(accents).size).toBe(accents.length)
  })
})
