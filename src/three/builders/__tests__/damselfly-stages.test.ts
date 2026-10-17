/**
 * 豆娘 Ischnura sp.：同属参照，不冒充未定种的实测。
 * Casallas-Mancipe et al. 2012, Odonatologica 41:327–335, Table II:
 * https://www.researchgate.net/publication/274720766_Postembrionary_development_of_ischnura_chingaza_realpe_under_captivity_conditions_Zygoptera_Coenagrionidae
 * I. chingaza 卵 0.89×0.18 mm、乳白/深褐卵孔，产入 Juncus；末龄头宽
 * 3.05 mm、腹首/末节宽 1.51/0.82 mm、翅芽 3.57/3.52 mm、尾鳃约 6 mm，赭/橄榄绿。
 * https://www.delta-intkey.com/britin/odo/www/elegans.htm
 * I. elegans 成熟稚虫总长 21.5–25 mm，细长、三片无斑叶状鳃、下唇向铰链收窄。
 * https://animaldiversity.org/accounts/Ischnura_gemina/
 * 密歇根大学：I. gemina 不含鳃 10–15 mm。模型本体 15.5 mm 为同属推算，
 * 鳃长 6 mm、头宽/腹宽/翅芽沿上述末龄量测；茎尺寸、叶片厚度及张开姿态为推算。
 * https://texasinsects.tamu.edu/damselfly/
 * Texas A&M：水生稚虫长足、三片叶状尾鳃。所有测量单位 cm。
 *
 * 每条测试旁的 M 编号对应实际改坏→变红→还原记录，详见 audit-out/damselfly/mutations.json。
 */
import * as THREE from 'three'
import { describe, it, expect } from 'vitest'
import { buildDamselflyEgg } from '../stages/damselfly-egg'
import { buildDamselflyNymph } from '../stages/damselfly-nymph'
import type { InsectModel } from '../kit'

const egg = buildDamselflyEgg()
const nymph = buildDamselflyNymph()
function parts(m: InsectModel, ...names: string[]) {
  m.group.updateMatrixWorld(true)
  const out: THREE.Mesh[] = []
  m.group.traverse(o => { if (o instanceof THREE.Mesh && names.includes(o.name)) out.push(o) })
  return out
}
function box(objects: THREE.Object3D[]) {
  const b = new THREE.Box3()
  for (const o of objects) b.union(new THREE.Box3().setFromObject(o))
  return b
}
const size = (objects: THREE.Object3D[]) => box(objects).getSize(new THREE.Vector3())
function localSize(m: THREE.Mesh) {
  m.geometry.computeBoundingBox()
  const scale = m.getWorldScale(new THREE.Vector3())
  return m.geometry.boundingBox!.getSize(new THREE.Vector3()).multiply(
    new THREE.Vector3(Math.abs(scale.x), Math.abs(scale.y), Math.abs(scale.z)),
  )
}
function light(m: THREE.Mesh) {
  const mat = m.material as THREE.MeshPhysicalMaterial
  return mat.color.getHSL({ h: 0, s: 0, l: 0 }, THREE.SRGBColorSpace).l
}
function visible(m: THREE.Mesh) {
  for (let o: THREE.Object3D | null = m; o; o = o.parent) expect(o.visible).toBe(true)
  const mat = m.material as THREE.MeshPhysicalMaterial
  expect(mat.opacity).toBeGreaterThanOrEqual(0.85)
}
const home = new THREE.Vector3(0.86, 0.44, 1.25).normalize()
const right = new THREE.Vector3().crossVectors(new THREE.Vector3(0, 1, 0), home).normalize()
const up = new THREE.Vector3().crossVectors(home, right).normalize()
/** 投影顶点凸包近似叶片轮廓，采样轮廓交集；不用空白占多数的轴对齐矩形。 */
function projection(o: THREE.Mesh) {
  const p: THREE.Vector2[] = []
  const pos = o.geometry.getAttribute('position')
  for (let i = 0; i < pos.count; i++) {
    const v = new THREE.Vector3().fromBufferAttribute(pos, i).applyMatrix4(o.matrixWorld)
    p.push(new THREE.Vector2(v.dot(right), v.dot(up)))
  }
  p.sort((a, b) => a.x - b.x || a.y - b.y)
  const cross = (a: THREE.Vector2, b: THREE.Vector2, c: THREE.Vector2) =>
    (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x)
  const half = (points: THREE.Vector2[]) => {
    const h: THREE.Vector2[] = []
    for (const v of points) {
      while (h.length > 1 && cross(h[h.length - 2], h[h.length - 1], v) <= 0) h.pop()
      h.push(v)
    }
    return h.slice(0, -1)
  }
  return [...half(p), ...half([...p].reverse())]
}
function overlapRatio(a: THREE.Vector2[], b: THREE.Vector2[]) {
  const bounds = new THREE.Box2().setFromPoints([...a, ...b])
  const inside = (p: THREE.Vector2, h: THREE.Vector2[]) => h.every((v, i) => {
    const w = h[(i + 1) % h.length]
    return (w.x - v.x) * (p.y - v.y) - (w.y - v.y) * (p.x - v.x) >= 0
  })
  let areaA = 0, areaB = 0, both = 0
  for (let i = 0; i < 80; i++) for (let j = 0; j < 80; j++) {
    const p = new THREE.Vector2(
      THREE.MathUtils.lerp(bounds.min.x, bounds.max.x, (i + 0.5) / 80),
      THREE.MathUtils.lerp(bounds.min.y, bounds.max.y, (j + 0.5) / 80),
    )
    const inA = inside(p, a), inB = inside(p, b)
    areaA += +inA; areaB += +inB; both += +(inA && inB)
  }
  return both / Math.min(areaA, areaB)
}

describe('豆娘生活史', () => {
  // M01/M02：整组缩放成 10 倍 / 0.1 倍，均被真实尺度拦住。
  it('卵与稚虫各有真实尺度上下限', () => {
    for (const m of parts(egg, 'egg')) {
      const s = size([m])
      expect(s.x).toBeGreaterThan(0.08); expect(s.x).toBeLessThan(0.10)
      expect(s.z).toBeGreaterThan(0.015); expect(s.z).toBeLessThan(0.022)
    }
    const body = size(parts(nymph, 'head', 'eye', 'thorax', 'abdomen'))
    expect(body.x).toBeGreaterThan(1.45); expect(body.x).toBeLessThan(1.65)
    const total = size(parts(nymph, 'head', 'eye', 'thorax', 'abdomen', 'gill'))
    expect(total.x).toBeGreaterThan(2.05); expect(total.x).toBeLessThan(2.4)
  })
  // M03：删一粒卵；M04：卵埋回组织；M05：茎放大，卵退成不可读的小点。
  it('三粒细长卵嵌在剖茎内，露出组织且占画面足够面积', () => {
    const eggs = parts(egg, 'egg'); expect(eggs).toHaveLength(3)
    const tissue = box(parts(egg, 'stem-tissue'))
    for (const m of eggs) {
      visible(m)
      const b = box([m]), s = size([m])
      expect(s.x / s.z).toBeGreaterThan(4); expect(s.x / s.z).toBeLessThan(6)
      expect(b.min.y).toBeLessThan(tissue.max.y)
      expect(b.max.y - tissue.max.y).toBeGreaterThan(s.y * 0.45)
      expect(b.min.x).toBeGreaterThan(tissue.min.x)
      expect(b.max.x).toBeLessThan(tissue.max.x)
      expect(s.x / (2 * egg.radius)).toBeGreaterThan(0.18)
    }
  })
  // M31：把茎皮转成上半管，视线先撞茎皮；必须确实看到卵而非只留 visible=true。
  it('home 视线先撞到三粒卵，不被茎皮和组织遮挡', () => {
    egg.group.updateMatrixWorld(true)
    for (const m of parts(egg, 'egg')) {
      const center = m.getWorldPosition(new THREE.Vector3())
      const ray = new THREE.Raycaster(center.clone().addScaledVector(home, 2), home.clone().negate())
      const hits = ray.intersectObject(egg.group, true)
      expect(hits.length).toBeGreaterThan(0)
      expect(hits[0].object).toBe(m)
    }
  })
  // M06：反转卵法线；M07：卵色压暗到茎以下。
  it('卵壳外法线朝外、卵比通气组织亮', () => {
    for (const m of parts(egg, 'egg')) {
      const p = m.geometry.getAttribute('position'), n = m.geometry.getAttribute('normal')
      for (let i = 0; i < p.count; i++) {
        const v = new THREE.Vector3().fromBufferAttribute(p, i)
        expect(v.dot(new THREE.Vector3().fromBufferAttribute(n, i))).toBeGreaterThan(0)
      }
      expect(light(m)).toBeGreaterThan(light(parts(egg, 'stem-tissue')[0]) + 0.1)
    }
  })
  // M08：删/隐藏一鳃；M09：叶片变针；M10：鳃放大；M11：三片叠到同一位置。
  it('恰有三片可见叶状尾鳃，正常厚度且 home 投影不重合', () => {
    const gills = parts(nymph, 'gill'); expect(gills).toHaveLength(3)
    for (const m of gills) {
      visible(m)
      const s = localSize(m)
      expect(s.x).toBeGreaterThan(0.53); expect(s.x).toBeLessThan(0.66)
      expect(s.x / s.z).toBeGreaterThan(3.4); expect(s.x / s.z).toBeLessThan(4.8)
      expect(s.y).toBeGreaterThan(0.012); expect(s.y).toBeLessThan(0.03)
      expect(size([m]).x / (2 * nymph.radius)).toBeGreaterThan(0.20)
      expect(box([m]).max.x).toBeLessThan(box(parts(nymph, 'abdomen')).min.x + 0.08)
    }
    for (let i = 0; i < 3; i++) for (let j = i + 1; j < 3; j++) {
      expect(overlapRatio(projection(gills[i]), projection(gills[j])), `尾鳃 ${i}/${j}`).toBeLessThan(0.65)
    }
  })
  // M12：腹部加粗；M13：腹末收成锥尖；M14：取消分节。
  it('十节细长腹部，首末节宽度有向收窄但不是尖锥', () => {
    const a = parts(nymph, 'abdomen'); expect(a).toHaveLength(10)
    const s = size(a)
    expect(s.x / s.z).toBeGreaterThan(6); expect(s.x / s.z).toBeLessThan(9)
    const first = size([a[0]]).z, last = size([a[9]]).z
    expect(first).toBeGreaterThan(last * 1.5)
    expect(last / first).toBeGreaterThan(0.45)
    expect(last / first).toBeLessThan(0.65)
    // M32：删去腹末的圆收截面，会留下宽阔平切圆面。
    const tail = a[9], pos = tail.geometry.getAttribute('position')
    tail.geometry.computeBoundingBox()
    const minX = tail.geometry.boundingBox!.min.x
    let tipWidth = 0
    for (let i = 0; i < pos.count; i++) if (pos.getX(i) < minX + 0.002) {
      tipWidth = Math.max(tipWidth, Math.abs(pos.getZ(i)) * 2)
    }
    expect(tipWidth).toBeLessThan(0.01)
  })
  // M15：把两眼挪到中线；M16：删除一足；M17：删除触角。
  it('两眼分离、六条长足和一对短触角', () => {
    const eyes = parts(nymph, 'eye'); expect(eyes).toHaveLength(2)
    expect(box([eyes[0]]).min.z - box([eyes[1]]).max.z).toBeGreaterThan(0.1)
    expect(size(eyes).z).toBeGreaterThan(0.29); expect(size(eyes).z).toBeLessThan(0.34)
    expect(parts(nymph, 'leg')).toHaveLength(6)
    expect(parts(nymph, 'antenna')).toHaveLength(2)
    for (const l of parts(nymph, 'leg')) { visible(l); expect(size([l]).z).toBeGreaterThan(0.23) }
    for (const a of parts(nymph, 'antenna')) expect(size([a]).x).toBeLessThan(0.23)
  })
  // M18：翅芽埋进胸部；M19：染成深色斑；M20：拉成成虫翅；M21：隐藏一芽。
  it('四片短翅芽浮出背侧、颜色不暗于胸背', () => {
    const pads = parts(nymph, 'wing-pad'); expect(pads).toHaveLength(4)
    const thorax = parts(nymph, 'thorax')
    for (const p of pads) {
      visible(p)
      expect(size([p]).x).toBeGreaterThan(0.32); expect(size([p]).x).toBeLessThan(0.40)
      expect(box([p]).max.y - box(thorax).max.y).toBeGreaterThan(0.015)
      expect(light(p)).toBeGreaterThanOrEqual(light(thorax[0]))
    }
  })
  // M22：面罩缩为细线；M23：面罩离头悬空；M24：删除铰链/一侧颚叶。
  it('折叠下唇是贴腹面的宽板、带铰链与一对颚叶', () => {
    const mask = parts(nymph, 'mask'); expect(mask).toHaveLength(1)
    visible(mask[0])
    const s = size(mask)
    expect(s.x).toBeGreaterThan(0.19); expect(s.x).toBeLessThan(0.26)
    expect(s.z).toBeGreaterThan(0.12); expect(s.z).toBeLessThan(0.18)
    const head = box(parts(nymph, 'head'))
    expect(head.min.y - box(mask).max.y).toBeLessThan(0.02)
    expect(box(mask).max.y).toBeLessThan(head.max.y)
    expect(parts(nymph, 'mask-hinge')).toHaveLength(1)
    expect(parts(nymph, 'mask-palp')).toHaveLength(2)
    for (const p of parts(nymph, 'mask-palp')) { visible(p); expect(head.distanceToPoint(box([p]).getCenter(new THREE.Vector3()))).toBeLessThan(0.08) }
  })
  // M25：全体染饱和蓝；M26：隐藏主体。
  it('稚虫采用自然低饱和褐绿，主体可见', () => {
    for (const m of parts(nymph, 'head', 'thorax', 'abdomen', 'gill')) {
      visible(m)
      const h = (m.material as THREE.MeshPhysicalMaterial).color.getHSL({ h: 0, s: 0, l: 0 }, THREE.SRGBColorSpace)
      expect(h.h).toBeGreaterThan(0.08); expect(h.h).toBeLessThan(0.28)
      expect(h.s).toBeLessThan(0.42); expect(h.l).toBeGreaterThan(0.2); expect(h.l).toBeLessThan(0.65)
    }
  })
  // M27：高细分球超预算；M28：NaN 顶点。
  it('几何有限且三角面预算低于 60k', () => {
    for (const model of [egg, nymph]) {
      let triangles = 0
      model.group.traverse(o => {
        if (!(o instanceof THREE.Mesh)) return
        const p = o.geometry.getAttribute('position')
        triangles += (o.geometry.index?.count ?? p.count) / 3
        for (const v of p.array) expect(Number.isFinite(v)).toBe(true)
      })
      expect(triangles).toBeGreaterThan(1000); expect(triangles).toBeLessThan(60_000)
      expect(Number.isFinite(model.radius)).toBe(true)
    }
  })
  // M29：锚点移出模型；M30：删除阶段专用锚点；成虫翅膀文案不套到翅芽。
  it('阶段专用锚点落在对应结构上', () => {
    const cases: [InsectModel, Record<string, string>][] = [
      [egg, { egg: 'egg', plant: 'stem-tissue' }],
      [nymph, { eye: 'eye', abdomen: 'abdomen', thorax: 'thorax', leg: 'leg', antenna: 'antenna', gill: 'gill', mask: 'mask', wingPad: 'wing-pad' }],
    ]
    for (const [model, anchors] of cases) {
      expect(Object.keys(model.anchors).sort()).toEqual(Object.keys(anchors).sort())
      for (const [key, name] of Object.entries(anchors)) {
        const d = Math.min(...parts(model, name).map(m => {
          const p = m.geometry.getAttribute('position')
          let best = Infinity
          for (let i = 0; i < p.count; i++) {
            const v = new THREE.Vector3().fromBufferAttribute(p, i).applyMatrix4(m.matrixWorld)
            best = Math.min(best, v.distanceTo(model.anchors[key]))
          }
          return best
        }))
        expect(d / model.radius).toBeLessThan(0.035)
      }
    }
  })
})
