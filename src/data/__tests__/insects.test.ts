import { describe, expect, it } from 'vitest'
import { getInsect, INSECTS } from '../insects'
import { ORDER_LABEL } from '../../i18n/orders'

/** 两段文字里最长的一段一模一样的话，用来识别「换个说法又讲一遍」 */
function longestCommonSubstring(a: string, b: string): string {
  let best = ''
  let prev = new Array<number>(b.length + 1).fill(0)
  for (let i = 1; i <= a.length; i++) {
    const cur = new Array<number>(b.length + 1).fill(0)
    for (let j = 1; j <= b.length; j++) {
      if (a[i - 1] !== b[j - 1]) continue
      cur[j] = prev[j - 1] + 1
      if (cur[j] > best.length) best = a.slice(i - cur[j], i)
    }
    prev = cur
  }
  return best
}

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
  swallowtail: ['forewing', 'hindwing', 'tail', 'antenna', 'eye', 'abdomen'],
  'silk-moth': ['eyespot', 'antenna', 'forewing', 'hindwing', 'thorax', 'abdomen'],
  hornet: ['mandible', 'sting', 'wing', 'eye', 'antenna', 'waist'],
  'tiger-beetle': ['mandible', 'elytra', 'eye', 'leg', 'antenna', 'pronotum'],
  'stag-beetle': ['mandible', 'elytra', 'head', 'antenna', 'leg', 'pronotum'],
  'jewel-beetle': ['elytra', 'stripe', 'eye', 'antenna', 'pronotum', 'leg'],
  katydid: ['antenna', 'wing', 'hindleg', 'ovipositor', 'eye', 'tympanum'],
  'mole-cricket': ['foreleg', 'pronotum', 'wing', 'abdomen', 'eye', 'antenna'],
  'water-strider': ['midleg', 'foreleg', 'hindleg', 'body', 'eye', 'antenna'],
  hoverfly: ['haltere', 'wing', 'eye', 'abdomen', 'antenna', 'thorax'],
  lacewing: ['wing', 'eye', 'antenna', 'thorax', 'abdomen', 'leg'],
  earwig: ['forceps', 'elytra', 'antenna', 'head', 'abdomen', 'leg'],
  'dung-beetle': ['clypeus', 'foreleg', 'elytra', 'horn', 'eye', 'pronotum'],
  weevil: ['rostrum', 'antenna', 'elytra', 'eye', 'leg', 'pronotum'],
  'click-beetle': ['pronotum', 'clickSpine', 'elytra', 'antenna', 'eye', 'leg'],
  'diving-beetle': ['hindleg', 'elytra', 'eye', 'antenna', 'airStore', 'body'],
  'rove-beetle': ['elytra', 'abdomen', 'mandible', 'antenna', 'eye', 'leg'],
  'flower-chafer': ['elytra', 'notch', 'pronotum', 'eye', 'antenna', 'leg'],
  'burying-beetle': ['elytra', 'antenna', 'abdomen', 'mandible', 'eye', 'pronotum'],
  'tortoise-beetle': ['margin', 'elytra', 'head', 'eye', 'leg', 'pronotum'],
  'hercules-beetle': ['thoracicHorn', 'headHorn', 'elytra', 'eye', 'leg', 'pronotum'],
  'whirligig-beetle': ['upperEye', 'lowerEye', 'midleg', 'elytra', 'antenna', 'body'],
  'ground-beetle': ['elytra', 'mandible', 'leg', 'eye', 'antenna', 'pronotum'],
  'blister-beetle': ['elytra', 'neck', 'head', 'antenna', 'leg', 'abdomen'],
  'hister-beetle': ['elytra', 'tuckedLeg', 'head', 'antenna', 'pronotum', 'abdomen'],
  treehopper: ['helmet', 'wing', 'eye', 'rostrum', 'hindleg', 'abdomen'],
  'ichneumon-wasp': ['ovipositor', 'antenna', 'wing', 'waist', 'eye', 'leg'],
  dobsonfly: ['mandible', 'wing', 'eye', 'antenna', 'thorax', 'abdomen'],
  'goliath-beetle': ['headHorn', 'elytra', 'stripe', 'eye', 'leg', 'pronotum'],
  'bombardier-beetle': ['sprayTip', 'elytra', 'mandible', 'eye', 'antenna', 'leg'],
  'darkling-beetle': ['fusedElytra', 'leg', 'head', 'antenna', 'pronotum', 'abdomen'],
  'net-winged-beetle': ['elytra', 'ridge', 'antenna', 'eye', 'pronotum', 'leg'],
  'leaf-beetle': ['elytra', 'head', 'antenna', 'leg', 'pronotum', 'eye'],
  damselfly: ['wing', 'eye', 'abdomen', 'thorax', 'leg', 'antenna'],
  'orchid-mantis': ['petalLeg', 'raptorialLeg', 'head', 'eye', 'abdomen', 'wing'],
  'dead-leaf-butterfly': ['underwing', 'forewing', 'tail', 'antenna', 'eye', 'abdomen'],
  'hawk-moth': ['proboscis', 'forewing', 'hindwing', 'antenna', 'eye', 'abdomen'],
  'termite-soldier': ['head', 'mandible', 'abdomen', 'antenna', 'thorax', 'leg'],
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
  'swallowtail',
  'silk-moth',
  'hornet',
  'tiger-beetle',
  'stag-beetle',
  'jewel-beetle',
  'katydid',
  'mole-cricket',
  'water-strider',
  'hoverfly',
  'lacewing',
  'earwig',
  'dung-beetle',
  'weevil',
  'click-beetle',
  'diving-beetle',
  'rove-beetle',
  'flower-chafer',
  'burying-beetle',
  'tortoise-beetle',
  'hercules-beetle',
  'whirligig-beetle',
  'ground-beetle',
  'blister-beetle',
  'hister-beetle',
  'treehopper',
  'ichneumon-wasp',
  'dobsonfly',
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
]

const HEX_COLOR = /^#[0-9a-fA-F]{6}$/

describe('INSECTS 数据完整性', () => {
  it('恰好包含 60 条记录', () => {
    expect(INSECTS).toHaveLength(60)
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

      /**
       * 「你知道吗」不能是总述的复述。
       *
       * 长度、字段齐全这些都能过，内容却把上一段话换个说法再讲一遍 ——
       * 读者在同一页看到两遍同一件事，两栏就白占了一栏。
       * 曾经一次加十种，十种里有七种的 trivia 是照着 summary 改写的，
       * 而当时全部测试是绿的，所以在这里量一下两段话的最长公共子串。
       */
      it('trivia 不是 summary 的改写 —— 两者最长公共子串短于 12 字', () => {
        const shared = longestCommonSubstring(insect.summary, insect.trivia)
        expect(
          shared.length,
          `${insect.name} 的 trivia 与 summary 有 ${shared.length} 字雷同：「${shared}」\n` +
            `trivia 该讲一件 summary 里没讲过的事，而不是把它换个说法`,
        ).toBeLessThan(12)
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

  it('order 覆盖了全部 14 个目，且每个都有双语显示名', () => {
    const orders = new Set(INSECTS.map(i => i.order))
    expect(orders.size).toBe(14)
    for (const o of orders) {
      expect(ORDER_LABEL.zh[o], `${o} 缺中文显示名`).toBeTruthy()
      expect(ORDER_LABEL.en[o], `${o} 缺英文显示名`).toBeTruthy()
    }
  })

  it('鞘翅目物种数为 28', () => {
    const beetles = INSECTS.filter(i => i.order === 'coleoptera')
    expect(beetles).toHaveLength(28)
  })
})
