/**
 * 建模层 × 数据层的接缝测试。
 *
 * 两边各自的测试都是绿的也不代表接得上：
 * data 只验证 anchor 落在自己的白名单里，builder 只验证自己产出了哪些 key。
 * 一旦某个 hotspot 的 anchor 在模型里不存在，`model.anchors[h.anchor]` 返回
 * undefined，Scene 里那句 `if (!p) return null` 会让标注点**静默消失** ——
 * 页面不报错、测试不失败、只是少了一个点。这里把这条缝钉死。
 */
import { describe, expect, it } from 'vitest'
import * as THREE from 'three'
import { INSECTS } from '../../data/insects.zh'
import { loadInsectModel } from '../registry'

describe('每个物种都能加载出模型', () => {
  for (const insect of INSECTS) {
    it(`${insect.name}（${insect.id}）`, async () => {
      const model = await loadInsectModel(insect.id)
      expect(model.radius).toBeGreaterThan(0)
      expect(Number.isFinite(model.radius)).toBe(true)

      let meshes = 0
      model.group.traverse((o) => {
        if ((o as THREE.Mesh).isMesh) meshes++
      })
      expect(meshes, `${insect.name} 应该有实际的几何体`).toBeGreaterThan(5)
    })
  }
})

describe('数据层的每个标注点都能在模型上找到落点', () => {
  for (const insect of INSECTS) {
    it(`${insect.name} 的 ${insect.hotspots.length} 个标注点`, async () => {
      const model = await loadInsectModel(insect.id)
      const missing = insect.hotspots
        .filter((h) => !model.anchors[h.anchor])
        .map((h) => `${h.label}(${h.anchor})`)

      expect(
        missing,
        `${insect.name} 的这些标注点在模型上没有对应锚点，会静默消失：${missing.join('、')}\n` +
          `模型实际提供的锚点是：${Object.keys(model.anchors).join('、')}`,
      ).toEqual([])

      // 锚点坐标必须有限，否则 <Html> 会被投影到画面外
      for (const h of insect.hotspots) {
        const p = model.anchors[h.anchor]
        expect(
          Number.isFinite(p.x) && Number.isFinite(p.y) && Number.isFinite(p.z),
          `${insect.name} 的锚点 ${h.anchor} 坐标不是有限数`,
        ).toBe(true)
      }
    })
  }
})

describe('锚点落在模型附近，不会飘在画面外', () => {
  for (const insect of INSECTS) {
    it(`${insect.name}`, async () => {
      const model = await loadInsectModel(insect.id)
      // finalize 已把模型居中，锚点到原点的距离不该远超包围半径
      for (const h of insect.hotspots) {
        const p = model.anchors[h.anchor]
        expect(
          p.length(),
          `${insect.name} 的锚点 ${h.anchor} 距模型中心 ${p.length().toFixed(2)}，` +
            `而包围半径只有 ${model.radius.toFixed(2)} —— 标注点会飘在虫体之外`,
        ).toBeLessThan(model.radius * 1.6)
      }
    })
  }
})

describe('模型缓存', () => {
  it('同一物种重复加载返回同一实例，切回来时不重建', async () => {
    const a = await loadInsectModel('rhinoceros-beetle')
    const b = await loadInsectModel('rhinoceros-beetle')
    expect(a).toBe(b)
  })

  it('未注册的物种给出明确报错，而不是静默返回空模型', async () => {
    await expect(loadInsectModel('unicorn')).rejects.toThrow(/未注册/)
  })
})

describe('物种规模符合真实体型的相对关系', () => {
  it('竹节虫远大于瓢虫，蝉大于蜜蜂', async () => {
    const [stick, ladybird, cicada, bee] = await Promise.all([
      loadInsectModel('stick-insect'),
      loadInsectModel('ladybird'),
      loadInsectModel('cicada'),
      loadInsectModel('honeybee'),
    ])
    expect(stick.radius).toBeGreaterThan(ladybird.radius * 4)
    expect(cicada.radius).toBeGreaterThan(bee.radius)
  })
})
