/**
 * 水黾 Aquarius elongatus：卵 / 中龄若虫。
 * 参考（主会话提供）：
 * https://webdoc.agsci.colostate.edu/bspm/Hexapoda%20(Insects)/Water%20Striders.pdf
 * https://en.wikipedia.org/wiki/Gerridae
 * https://www.mdc.mo.gov/discover-nature/field-guide/water-striders
 * 卵长 1–1.5 mm、中龄体长 7–9 mm 均为同科资料的推算，非本种实测。
 * 各测试的「变异」注释记录实际改坏实现 → 红 → 还原的检查。
 * 最终 83 个退化版本全部被拦住；首轮漏过的细足与平切腹端已加强断言。
 */
import * as THREE from 'three'
import { describe, expect, it } from 'vitest'
import type { InsectModel } from '../kit'
import { makeIdle } from '../../motion/idle'
import { buildWaterStriderEgg } from '../stages/water-strider-egg'
import { buildWaterStriderNymph } from '../stages/water-strider-nymph'
import { buildWaterStrider } from '../water-strider'

const egg = buildWaterStriderEgg()
const nymph = buildWaterStriderNymph()
const adult = buildWaterStrider()
function meshes(model: InsectModel, name?: string): THREE.Mesh[] {
  model.group.updateMatrixWorld(true)
  const out: THREE.Mesh[] = []
  model.group.traverse(o => {
    if ((o as THREE.Mesh).isMesh && (name === undefined || o.name === name)) out.push(o as THREE.Mesh)
  })
  return out
}
function box(objects: THREE.Object3D[]): THREE.Box3 {
  const b = new THREE.Box3()
  for (const o of objects) b.union(new THREE.Box3().setFromObject(o))
  return b
}
function size(objects: THREE.Object3D[]): THREE.Vector3 { return box(objects).getSize(new THREE.Vector3()) }
function verts(m: THREE.Mesh): THREE.Vector3[] {
  const p = m.geometry.getAttribute('position')
  return Array.from({ length: p.count }, (_, i) => m.localToWorld(new THREE.Vector3().fromBufferAttribute(p, i)))
}
function hsl(m: THREE.Mesh) {
  const mat = m.material as THREE.MeshPhysicalMaterial
  return mat.color.getHSL({ h: 0, s: 0, l: 0 }, THREE.SRGBColorSpace)
}
function body(model: InsectModel) {
  return meshes(model).filter(m => ['head', 'thorax', 'abdomen', 'body-core'].includes(m.name))
}
function legs(name: string): THREE.Object3D[] {
  const out: THREE.Object3D[] = []
  nymph.group.traverse(o => { if (o.name === name) out.push(o) })
  return out
}
function tip(o: THREE.Object3D): THREE.Vector3 {
  // 从真实跗节几何的末梢取点，不能读镜像后未同步的 userData.tip。
  const all: THREE.Mesh[] = []
  o.traverse(m => { if (m.name === 'tarsus') all.push(m as THREE.Mesh) })
  expect(all).toHaveLength(1)
  const points = verts(all[0])
  const base = o.children[0].getWorldPosition(new THREE.Vector3())
  return points.reduce((best, p) => p.distanceTo(base) > best.distanceTo(base) ? p : best, base)
}
function length(o: THREE.Object3D): number {
  const base = o.children[0].getWorldPosition(new THREE.Vector3())
  return tip(o).distanceTo(base)
}

// 变异：空组、NaN 顶点、整体超细分、隐藏实体、偏离中心分别被拦住。
describe('通用契约', () => {
  it.each([['卵', egg], ['若虫', nymph]] as const)('%s 有有限实体和合理面预算', (_, model) => {
    const all = meshes(model)
    expect(all.length).toBeGreaterThan(0)
    let triangles = 0
    for (const m of all) {
      let o: THREE.Object3D | null = m
      while (o) { expect(o.visible).toBe(true); o = o.parent }
      const mats = Array.isArray(m.material) ? m.material : [m.material]
      for (const mat of mats) expect(mat.opacity).toBeGreaterThan(0.9)
      triangles += (m.geometry.index?.count ?? m.geometry.getAttribute('position').count) / 3
      for (const p of verts(m)) expect(p.toArray().every(Number.isFinite)).toBe(true)
    }
    expect(triangles).toBeGreaterThan(100)
    expect(triangles).toBeLessThan(50_000)
    expect(model.radius).toBeGreaterThan(0)
    expect(Number.isFinite(model.radius)).toBe(true)
    expect(box(all).getCenter(new THREE.Vector3()).length()).toBeLessThan(1e-5)
  })

  // 变异：清空锚点、错用成虫卵锚点、把足锚点挪到另一部位/远处。
  it('锚点语义正确且贴对应实体', () => {
    expect(Object.keys(egg.anchors).sort()).toEqual(['egg', 'substrate'])
    expect(Object.keys(nymph.anchors).sort()).toEqual(['antenna', 'body', 'eye', 'foreleg', 'hindleg', 'midleg'])
    const pairs: [InsectModel, string, THREE.Object3D[]][] = [
      [egg, 'egg', meshes(egg, 'egg-shell')], [egg, 'substrate', meshes(egg, 'stem')],
      [nymph, 'body', body(nymph)], [nymph, 'eye', meshes(nymph, 'eye')],
      [nymph, 'antenna', meshes(nymph, 'antenna')],
      ...['foreleg', 'midleg', 'hindleg'].map(k => [nymph, k, legs(k)] as [InsectModel, string, THREE.Object3D[]]),
    ]
    for (const [model, key, objects] of pairs) {
      const points: THREE.Vector3[] = []
      for (const o of objects) o.traverse(m => { if ((m as THREE.Mesh).isMesh) points.push(...verts(m as THREE.Mesh)) })
      expect(Math.min(...points.map(p => p.distanceTo(model.anchors[key]))), key).toBeLessThan(0.025)
    }
  })
})

describe('卵：水草茎上的小串长卵', () => {
  const shells = meshes(egg, 'egg-shell')
  // 变异：删一粒、单粒放大/缩小、改成球或过细长棍。
  it('三粒独立卵，每粒长 1–1.5 mm 且为长椭圆', () => {
    expect(shells).toHaveLength(3)
    for (const m of shells) {
      const s = size([m])
      expect(s.x).toBeGreaterThanOrEqual(0.10)
      expect(s.x).toBeLessThanOrEqual(0.15)
      expect(s.x / Math.max(s.y, s.z)).toBeGreaterThan(2.3)
      expect(s.x / Math.max(s.y, s.z)).toBeLessThan(3.6)
    }
  })
  // 变异：卵离茎悬空、沉进茎、位置挤成相交一团。
  it('每粒附在茎上，卵之间有缝', () => {
    const stem = box(meshes(egg, 'stem'))
    for (const m of shells) {
      const b = box([m])
      expect(b.min.y - stem.max.y).toBeLessThan(0.002)
      expect(b.min.y - stem.max.y).toBeGreaterThan(-0.008)
    }
    for (let i = 1; i < shells.length; i++) {
      expect(box([shells[i]]).min.x - box([shells[i - 1]]).max.x).toBeGreaterThan(0.006)
    }
  })
  // 变异：水草延长十倍、卵壳缩到不可见。
  it('卵串占取景主体，茎不抢尺度', () => {
    expect(size(shells).x / (2 * egg.radius)).toBeGreaterThan(0.82)
    expect(size(meshes(egg, 'stem')).x / size(shells).x).toBeLessThan(1.2)
    expect(egg.radius).toBeGreaterThan(0.20)
    expect(egg.radius).toBeLessThan(0.28)
  })
  // 变异：反转法线（浅壳读成坑）、两极改成平切。
  it('壳面向外，长轴两端平滑收圆', () => {
    for (const m of shells) {
      const p = m.geometry.getAttribute('position')
      const n = m.geometry.getAttribute('normal')
      let outward = 0
      const localBox = new THREE.Box3().setFromBufferAttribute(p as THREE.BufferAttribute)
      const center = localBox.getCenter(new THREE.Vector3())
      for (let i = 0; i < p.count; i++) {
        const v = new THREE.Vector3().fromBufferAttribute(p, i).sub(center)
        outward += v.dot(new THREE.Vector3().fromBufferAttribute(n, i))
      }
      expect(outward / p.count).toBeGreaterThan(0)
      const ps = verts(m), b = box([m]), c = b.getCenter(new THREE.Vector3())
      for (const x of [b.min.x, b.max.x]) {
        const end = ps.filter(v => Math.abs(v.x - x) < 0.001)
        expect(end.length).toBeGreaterThan(0)
        expect(Math.max(...end.map(v => Math.hypot(v.y - c.y, v.z - c.z)))).toBeLessThan(0.008)
      }
    }
  })
  // 变异：卵染暗/鲜红、草茎变成比卵更亮的白色。
  it('浅乳黄卵比灰绿茎亮，低饱和自然色', () => {
    const c = hsl(shells[0]), stem = hsl(meshes(egg, 'stem')[0])
    expect(c.l).toBeGreaterThan(0.65)
    expect(c.h * 360).toBeGreaterThan(35)
    expect(c.h * 360).toBeLessThan(65)
    expect(c.s).toBeLessThan(0.55)
    expect(c.l - stem.l).toBeGreaterThan(0.25)
  })
})

describe('若虫：无翅的小水面划手', () => {
  // 变异：整体体躯放大/缩小、躯干变粗。
  it('体长 7–9 mm，细长且明显小于成虫', () => {
    const s = size(body(nymph)), a = size(body(adult))
    expect(s.x).toBeGreaterThan(0.7)
    expect(s.x).toBeLessThan(0.9)
    expect(s.x / s.z).toBeGreaterThan(5)
    expect(s.x / s.z).toBeLessThan(9)
    expect(s.x / a.x).toBeGreaterThan(0.40)
    expect(s.x / a.x).toBeLessThan(0.55)
  })
  // 变异：头挪到尾端、腹部删掉；三个部位必须确实连在一起。
  it('头在前腹在后，躯干连续', () => {
    const [h, t, a] = ['head', 'thorax', 'abdomen'].map(k => box(meshes(nymph, k)))
    expect(meshes(nymph, 'head')).toHaveLength(1)
    expect(meshes(nymph, 'thorax')).toHaveLength(1)
    expect(meshes(nymph, 'abdomen')).toHaveLength(1)
    expect(h.getCenter(new THREE.Vector3()).x).toBeGreaterThan(t.max.x)
    expect(a.getCenter(new THREE.Vector3()).x).toBeLessThan(t.min.x)
    expect(h.min.x - t.max.x).toBeLessThan(0.005)
    expect(t.min.x - a.max.x).toBeLessThan(0.005)
  })
  // 变异：去掉腹部浅节沟、加深成串珠、腹端切平。第一轮用固定 ±1 取端点，
  // 切短后样本为空仍通过；改从实际几何极值取端面，切平版本现已被拦住。
  it('腹部体壁有浅节沟，两端圆滑', () => {
    const abdomen = meshes(nymph, 'abdomen')[0]
    const p = abdomen.geometry.getAttribute('position')
    const factors: number[] = []
    const b = new THREE.Box3().setFromBufferAttribute(p as THREE.BufferAttribute)
    let endRadius = 0, endCount = 0
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), r = Math.hypot(p.getY(i), p.getZ(i))
      if (Math.abs(x) < 0.7) factors.push(r / Math.sqrt(1 - x * x))
      if (Math.abs(x - b.min.x) < 1e-4 || Math.abs(x - b.max.x) < 1e-4) {
        endRadius = Math.max(endRadius, r); endCount++
      }
    }
    expect(Math.min(...factors)).toBeGreaterThan(0.95)
    expect(Math.min(...factors)).toBeLessThan(0.98)
    expect(Math.max(...factors)).toBeGreaterThan(0.997)
    expect(endCount).toBeGreaterThan(0)
    expect(endRadius).toBeLessThan(0.02)
  })
  // 变异：增添翅/翅芽，即使没起名字也不许藏在模型里。
  it('中龄无翅无翅芽，全部体部几何可解释', () => {
    expect(nymph.rig?.wings ?? []).toHaveLength(0)
    const allowed = ['head', 'thorax', 'abdomen', 'eye', 'antenna', 'rostrum', 'femur', 'tibia', 'tarsus', 'joint', 'hydrophobic-hair']
    expect(meshes(nymph).filter(m => !allowed.includes(m.name))).toHaveLength(0)
  })
  // 变异：删一侧、两条都放同侧、缩短长足/加长前足、把中后足交换。
  it('三对足左右分开，中足最长，后足次之，前足短', () => {
    const [fore, mid, hind] = ['foreleg', 'midleg', 'hindleg'].map(legs)
    const bc = box(body(nymph)).getCenter(new THREE.Vector3())
    for (const pair of [fore, mid, hind]) {
      expect(pair).toHaveLength(2)
      const ends = pair.map(tip).sort((a, b) => a.z - b.z)
      expect(ends[0].z).toBeLessThan(bc.z - 0.1)
      expect(ends[1].z).toBeGreaterThan(bc.z + 0.1)
      expect(Math.abs(ends[0].z + ends[1].z - 2 * bc.z)).toBeLessThan(0.025)
    }
    const f = length(fore[0]), m = length(mid[0]), h = length(hind[0]), L = size(body(nymph)).x
    expect(m / L).toBeGreaterThan(1.65)
    expect(m / L).toBeLessThan(2.15)
    expect(h / L).toBeGreaterThan(1.35)
    expect(h / L).toBeLessThan(1.85)
    expect(m / h).toBeGreaterThan(1.08)
    expect(m / f).toBeGreaterThan(3)
    expect(f / L).toBeLessThan(0.6)
  })
  // 变异：中后足同向、膝角过大向下垂、足缩细到看不见。第一轮量轴对齐
  // 包围盒，斜腿长度掩盖了直径退化；改量垂直腿轴的直径，细丝版本现已红。
  it('四条长足向外张开，后足朝后，姿态低伏且足有可见粗细', () => {
    const mids = legs('midleg'), hinds = legs('hindleg')
    for (let i = 0; i < 2; i++) {
      const m = tip(mids[i]), h = tip(hinds[i])
      expect(m.x - h.x).toBeGreaterThan(0.6)
      for (const o of [mids[i], hinds[i]]) {
        const s = size([o])
        expect(s.y / Math.max(s.x, s.z)).toBeLessThan(0.3)
        const femurs: THREE.Mesh[] = []
        o.traverse(m => { if (m.name === 'femur') femurs.push(m as THREE.Mesh) })
        const femur = femurs[0]
        const start = femur.getWorldPosition(new THREE.Vector3())
        const end = femur.parent!.children[0].getWorldPosition(new THREE.Vector3())
        const axis = new THREE.Line3(start, end), closest = new THREE.Vector3()
        const diameter = 2 * Math.max(...verts(femur).map(p => p.distanceTo(axis.closestPointToPoint(p, false, closest))))
        expect(diameter / (2 * nymph.radius)).toBeGreaterThan(0.005)
      }
    }
  })
  // 变异：恢复 kit 的小膝角（12°/15°），足端高过躯干，读成倒挂。
  it('四条长足末梢在身体下方同一水面附近', () => {
    const points = [...legs('midleg'), ...legs('hindleg')].map(tip)
    const bodyY = box(body(nymph)).getCenter(new THREE.Vector3()).y
    expect(points).toHaveLength(4)
    for (const p of points) {
      expect(p.y - bodyY).toBeLessThan(-0.015)
      expect(p.y - bodyY).toBeGreaterThan(-0.14)
    }
    expect(Math.max(...points.map(p => p.y)) - Math.min(...points.map(p => p.y))).toBeLessThan(0.05)
  })
  // 变异：后足 sweep 改成中足 sweep，或旋到 home 视线方向，四末梢投影合并。
  it('home 机位下四个长足末梢分得开', () => {
    const camera = new THREE.PerspectiveCamera(34, 720 / 620, 0.01, 100)
    const d = nymph.radius / Math.sin(THREE.MathUtils.degToRad(17)) * 1.08
    camera.position.copy(new THREE.Vector3(0.86, 0.44, 1.25).normalize().multiplyScalar(d))
    camera.lookAt(0, 0, 0); camera.updateMatrixWorld(true)
    const points = [...legs('midleg'), ...legs('hindleg')].map(o => tip(o).project(camera))
    expect(points).toHaveLength(4)
    for (let i = 0; i < points.length; i++) for (let j = i + 1; j < points.length; j++) {
      expect(Math.hypot(points[i].x - points[j].x, points[i].y - points[j].y)).toBeGreaterThan(0.17)
    }
  })
  // 变异：删疏水毛、毛缩入跗节、删复眼/触角/口器。
  it('触角复眼口器齐全，四条长足末端可见疏水毛', () => {
    expect(meshes(nymph, 'eye')).toHaveLength(2)
    expect(meshes(nymph, 'antenna').length).toBeGreaterThanOrEqual(2)
    expect(meshes(nymph, 'rostrum')).toHaveLength(1)
    expect(size(meshes(nymph, 'antenna')).x / size(body(nymph)).x).toBeGreaterThan(0.22)
    for (const o of [...legs('midleg'), ...legs('hindleg')]) {
      const hairs: THREE.Mesh[] = []
      o.traverse(m => { if (m.name === 'hydrophobic-hair') hairs.push(m as THREE.Mesh) })
      expect(hairs).toHaveLength(5)
      expect(size(hairs).length() / (2 * nymph.radius)).toBeGreaterThan(0.012)
      expect(box(hairs).distanceToPoint(tip(o))).toBeLessThan(0.02)
    }
  })
  // 变异：疏水毛挂整足根组（静止时正确，idle 动起来就脱落）；丢失 rig。
  it('六足骨架完整，微动后疏水毛仍贴跗节尖', () => {
    const model = buildWaterStriderNymph()
    expect(model.rig?.legs).toHaveLength(6)
    expect(model.rig!.legs!.filter(l => l.side === 1)).toHaveLength(3)
    expect(model.rig!.legs!.filter(l => l.side === -1)).toHaveLength(3)
    const longLegs: THREE.Object3D[] = []
    model.group.traverse(o => { if (['midleg', 'hindleg'].includes(o.name)) longLegs.push(o) })
    expect(longLegs).toHaveLength(4)
    const idle = makeIdle()
    for (const t of [0, 0.7, 1.4, 2.1]) {
      idle(model.rig!, t)
      model.group.updateMatrixWorld(true)
      for (const o of longLegs) {
        const end = tip(o)
        const hairs: THREE.Mesh[] = []
        o.traverse(m => { if (m.name === 'hydrophobic-hair') hairs.push(m as THREE.Mesh) })
        expect(hairs).toHaveLength(5)
        for (const h of hairs) expect(Math.min(...verts(h).map(p => p.distanceTo(end)))).toBeLessThan(0.005)
      }
    }
  })
  // 变异：若虫改成成虫近黑、鲜绿、足部改成白色补丁。
  it('灰褐低饱和，体色比成虫浅，足与躯干协调', () => {
    const c = hsl(meshes(nymph, 'thorax')[0]), a = hsl(body(adult)[0]), f = hsl(meshes(nymph, 'femur')[0])
    expect(c.h * 360).toBeGreaterThan(25)
    expect(c.h * 360).toBeLessThan(55)
    expect(c.s).toBeLessThan(0.25)
    expect(c.l).toBeGreaterThan(0.32)
    expect(c.l).toBeLessThan(0.52)
    expect(c.l - a.l).toBeGreaterThan(0.12)
    expect(Math.abs(c.l - f.l)).toBeLessThan(0.12)
  })
})
