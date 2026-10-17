/**
 * 海滨蠼螋 Labidura riparia：卵与若虫。
 * 参考（2026-10-17，形态/颜色/尺寸由网页搜索核查）：
 * https://www.lsuagcenter.com/profiles/madeleinestout/articles/page1708097777108
 *   本种卵长 1–2 mm、成堆受母虫照料；若虫更小更浅，翅/尾铗未充分发育。
 * https://entnemdept.ufl.edu/projex/gallery/dl/beneficial_arthropods_predators/text/striped_earwig.htm
 *   若虫经历多龄；成虫雄性尾铗较弯，雌性较直。
 * https://entomology.ucr.edu/we-ch-12
 *   革翅目卵光滑、椭圆、珍珠白/乳白，土室育卵；含本种守卵记录。
 * 卵取 1.5 × 1.15 × 1.10 mm（宽厚为按照片推算）。小簇 9 枚是窝的一部分。
 * 若虫取早中龄，头至腹末 9.4 mm、尾铗约 1.3 mm，尺寸/断面比例均为推算，
 * 不是文献实测或精确分龄。成虫文件头的异名不用于本阶段的物种判断。
 * 每个测试旁的 M 编号对应实际执行过的源文件变异（改坏→该项红→还原）。
 */
import * as THREE from 'three'
import { describe, expect, it } from 'vitest'
import * as eggModule from '../stages/earwig-egg'
import * as nymphModule from '../stages/earwig-nymph'
import { buildEarwig } from '../earwig'
import type { InsectModel } from '../kit'

const egg = eggModule.buildEarwigEgg()
const nymph = nymphModule.buildEarwigNymph()
const adult = buildEarwig()
function meshes(model: InsectModel, name?: string): THREE.Mesh[] {
  model.group.updateMatrixWorld(true)
  const out: THREE.Mesh[] = []
  model.group.traverse(o => {
    if (o instanceof THREE.Mesh && (name === undefined || o.name === name)) out.push(o)
  })
  return out
}
function box(objects: THREE.Object3D[]): THREE.Box3 {
  const b = new THREE.Box3()
  for (const o of objects) b.union(new THREE.Box3().setFromObject(o))
  return b
}
const size = (objects: THREE.Object3D[]) => box(objects).getSize(new THREE.Vector3())
function vertices(m: THREE.Mesh): THREE.Vector3[] {
  const p = m.geometry.getAttribute('position')
  return Array.from({ length: p.count }, (_, i) => new THREE.Vector3().fromBufferAttribute(p, i).applyMatrix4(m.matrixWorld))
}
function hsl(m: THREE.Mesh) {
  return (m.material as THREE.MeshPhysicalMaterial).color.getHSL({ h: 0, s: 0, l: 0 }, THREE.SRGBColorSpace)
}
const body = (model: InsectModel) => meshes(model).filter(m => ['head', 'thorax', 'abdomen'].includes(m.name))
const bodyLength = size(body(nymph)).x
const home = new THREE.Vector3(0.86, 0.44, 1.25).normalize()
/** 从部件表面点朝 home 机位投射：第一遮挡物必须还是该部件。 */
function exposedFraction(model: InsectModel, mesh: THREE.Mesh): number {
  for (let o: THREE.Object3D | null = mesh; o; o = o.parent) if (!o.visible) return 0
  const ray = new THREE.Raycaster()
  const all = meshes(model).filter(m => m.visible)
  const v = vertices(mesh)
  let visible = 0
  for (let i = 0; i < v.length; i += 7) {
    ray.set(v[i].clone().addScaledVector(home, model.radius * 3), home.clone().negate())
    if (ray.intersectObjects(all, false)[0]?.object === mesh) visible++
  }
  return visible / Math.ceil(v.length / 7)
}

describe('海滨蠼螋生活史', () => {
  it('阶段模块各只有一个 build 导出', () => {
    // M01/M02：额外导出第二个 builder。
    expect(Object.keys(eggModule).filter(k => k.startsWith('build'))).toEqual(['buildEarwigEgg'])
    expect(Object.keys(nymphModule).filter(k => k.startsWith('build'))).toEqual(['buildEarwigNymph'])
  })
  for (const [stage, model] of [['egg', egg], ['nymph', nymph]] as const) {
    it(`${stage}：有限几何与面数预算`, () => {
      // M03–08：分别注入 NaN、爆面球、移走模型（破坏 finalize 居中）。
      // M44–46：粗糙低面卵、NaN 半径、过小半径。
      const list = meshes(model)
      let triangles = 0
      for (const m of list) {
        const p = m.geometry.getAttribute('position')
        expect(Array.from(p.array).every(Number.isFinite)).toBe(true)
        triangles += (m.geometry.index?.count ?? p.count) / 3
      }
      expect(triangles).toBeGreaterThan(1500)
      expect(triangles).toBeLessThan(45_000)
      const b = box(list)
      expect(b.getCenter(new THREE.Vector3()).length()).toBeLessThan(1e-6)
      expect(model.radius).toBeGreaterThan(0.1)
      expect(Number.isFinite(model.radius)).toBe(true)
    })
    it(`${stage}：锚点贴近对应实体`, () => {
      // M09/M10/M47：卵/若虫锚点挪离对应部位、删除触角锚点。
      const targets = stage === 'egg'
        ? { egg: 'egg', clutch: 'egg', soil: 'soil' }
        : { head: 'head', abdomen: 'abdomen', forceps: 'forceps', antenna: 'antenna', leg: 'leg' }
      for (const [key, name] of Object.entries(targets)) {
        const anchor = model.anchors[key]
        expect(anchor, key).toBeDefined()
        expect([anchor.x, anchor.y, anchor.z].every(Number.isFinite)).toBe(true)
        const distance = Math.min(...meshes(model, name).flatMap(m => vertices(m).map(v => v.distanceTo(anchor))))
        expect(distance / model.radius, key).toBeLessThan(0.10)
      }
    })
  }
  it('卵：单粒毫米尺度与圆钝断面', () => {
    // M11–14/M40/M41：放大/缩小卵、米粒、扁饼、球形、过厚。
    for (const m of meshes(egg, 'egg')) {
      m.geometry.computeBoundingBox()
      const d = m.geometry.boundingBox!.getSize(new THREE.Vector3()).multiply(m.scale)
      expect(d.x).toBeGreaterThan(0.10)
      expect(d.x).toBeLessThan(0.20)
      expect(d.z / d.x).toBeGreaterThan(0.65)
      expect(d.z / d.x).toBeLessThan(0.90)
      expect(d.y / d.x).toBeGreaterThan(0.60)
      expect(d.y / d.x).toBeLessThan(0.85)
    }
  })
  it('卵：小簇而非单粒或一排，主体露出土面', () => {
    // M15–18：只剩单卵、全部排直线、埋进土、放大道具。
    const eggs = meshes(egg, 'egg')
    expect(eggs.length).toBeGreaterThanOrEqual(7)
    expect(eggs.length).toBeLessThanOrEqual(12)
    const d = size(eggs)
    expect(d.x).toBeLessThan(0.60)
    expect(d.z / d.x).toBeGreaterThan(0.55)
    expect(d.z / d.x).toBeLessThan(1.6)
    expect(size(meshes(egg, 'soil')).x / d.x).toBeLessThan(1.65)
    for (const e of eggs) {
      expect(box([e]).max.y - box(meshes(egg, 'soil')).max.y).toBeGreaterThan(0.08)
      expect(exposedFraction(egg, e)).toBeGreaterThan(0.08)
    }
  })
  it('卵：乳白实体壳，朝外的法线与绕向一致', () => {
    // M19/M20/M42/M43：暗褐壳、翻三角面、透明空壳、翻法线。
    for (const m of meshes(egg, 'egg')) {
      expect(hsl(m).l).toBeGreaterThan(0.78)
      expect(hsl(m).s).toBeLessThan(0.45)
      expect((m.material as THREE.MeshPhysicalMaterial).transparent).toBe(false)
      const p = m.geometry.getAttribute('position')
      const n = m.geometry.getAttribute('normal')
      const index = m.geometry.index!
      for (let i = 0; i < index.count; i += 3) {
        const a = new THREE.Vector3().fromBufferAttribute(p, index.getX(i))
        const b = new THREE.Vector3().fromBufferAttribute(p, index.getX(i + 1))
        const c = new THREE.Vector3().fromBufferAttribute(p, index.getX(i + 2))
        const face = b.sub(a).cross(c.sub(a))
        if (face.lengthSq() < 1e-15) continue
        expect(face.dot(a)).toBeGreaterThan(0)
        expect(new THREE.Vector3().fromBufferAttribute(n, index.getX(i)).dot(a)).toBeGreaterThan(0)
      }
    }
  })
  it('若虫：真实小型尺度，扁平宽腹而非线性尖锥', () => {
    // M21–24：整体放大/缩小、圆柱腹、尾半截骤细。
    expect(bodyLength).toBeGreaterThan(0.75)
    expect(bodyLength).toBeLessThan(1.15)
    const a = meshes(nymph, 'abdomen')[0]
    const d = size([a])
    expect(d.z / d.y).toBeGreaterThan(1.7)
    expect(d.z / d.y).toBeLessThan(3.2)
    expect(d.z / bodyLength).toBeGreaterThan(0.19)
    expect(d.z / bodyLength).toBeLessThan(0.32)
    const v = vertices(a)
    const b = box([a])
    const widthAt = (t: number) => {
      const x = b.max.x - d.x * t
      const ring = v.filter(p => Math.abs(p.x - x) < d.x * 0.016)
      return new THREE.Box3().setFromPoints(ring).getSize(new THREE.Vector3()).z
    }
    expect(widthAt(0.75) / widthAt(0.35)).toBeGreaterThan(0.68)
  })
  it('若虫：腹节沟真实存在，腹端圆滑收口', () => {
    // M25/M26：抹掉节沟、末端不收口。量网格逐截面，不依赖名字或 userData。
    const p = meshes(nymph, 'abdomen')[0].geometry.getAttribute('position')
    const rings = new Map<number, number[]>()
    for (let i = 0; i < p.count; i++) {
      const x = Math.round(p.getX(i) * 1e8)
      const ring = rings.get(x) ?? []
      ring.push(p.getZ(i))
      rings.set(x, ring)
    }
    const widths = [...rings.entries()].sort((a, b) => b[0] - a[0])
      .map(([, zs]) => Math.max(...zs.map(Math.abs)))
    let valleys = 0
    for (let i = 3; i < widths.length - 10; i++) {
      if (widths[i] < widths[i - 1] && widths[i] < widths[i + 1]
        && widths[i] < Math.min(widths[i - 3], widths[i + 3]) * 0.96) valleys++
    }
    expect(valleys).toBeGreaterThanOrEqual(7)
    expect(widths.at(-1)! / Math.max(...widths)).toBeLessThan(0.08)
  })
  it('若虫：一对短直尾铗向后，左右分开且 home 可见', () => {
    // M27–32：删一铗、拉长、内卷/上翘、两铗叠中线、隐藏尾铗。
    const pair = meshes(nymph, 'forceps')
    expect(pair).toHaveLength(2)
    const rear = box(meshes(nymph, 'abdomen')).min.x
    const centers = pair.map(m => box([m]).getCenter(new THREE.Vector3()))
    expect(centers[0].z * centers[1].z).toBeLessThan(0)
    expect(Math.abs(centers[0].z - centers[1].z) / nymph.radius).toBeGreaterThan(0.10)
    for (const f of pair) {
      const d = size([f])
      expect(d.x / bodyLength).toBeGreaterThan(0.10)
      expect(d.x / bodyLength).toBeLessThan(0.18)
      expect(d.y / d.x).toBeLessThan(0.38)
      expect(d.z / d.x).toBeLessThan(0.40)
      expect(box([f]).min.x).toBeLessThan(rear - 0.09)
      expect(exposedFraction(nymph, f)).toBeGreaterThan(0.18)
    }
    // 正交投影到 home 的屏幕水平轴：防止一对铗读成一根角。
    const screenRight = new THREE.Vector3().crossVectors(new THREE.Vector3(0, 1, 0), home).normalize()
    expect(Math.abs(centers[0].clone().sub(centers[1]).dot(screenRight)) / nymph.radius).toBeGreaterThan(0.055)
    expect(size(pair).x / bodyLength).toBeLessThan(size(meshes(adult, 'forceps')).x / 2.2)
  })
  it('若虫：三对胸足与成对向前触角，无成翅', () => {
    // M33–36：少一对足、足长到腹部、少触角、加入成翅。
    expect(nymph.rig?.legs).toHaveLength(6)
    const thorax = box(meshes(nymph, 'thorax'))
    for (const leg of nymph.rig!.legs!) {
      expect(leg.base.x).toBeGreaterThan(thorax.min.x - 0.015)
      expect(leg.base.x).toBeLessThan(thorax.max.x)
      expect(size(meshes(nymph, 'leg')).z / bodyLength).toBeGreaterThan(0.35)
    }
    const feelers = meshes(nymph, 'antenna')
    expect(feelers).toHaveLength(2)
    for (const f of feelers) {
      expect(box([f]).max.x).toBeGreaterThan(box(meshes(nymph, 'head')).max.x + 0.15)
      expect(exposedFraction(nymph, f)).toBeGreaterThan(0.15)
    }
    expect(meshes(nymph).filter(m => /wing|elytr|tegmin/.test(m.name))).toHaveLength(0)
    expect(nymph.rig?.wings ?? []).toHaveLength(0)
  })
  it('若虫：自然浅褐色，有向地比成虫浅，附肢协调', () => {
    // M37–39：体色改黑、改鲜橙、附肢改乳白补丁。
    const a = hsl(meshes(nymph, 'abdomen')[0])
    expect(a.l).toBeGreaterThan(hsl(meshes(adult, 'abdomen')[0]).l + 0.15)
    expect(a.l).toBeLessThan(0.70)
    expect(a.s).toBeLessThan(0.55)
    for (const name of ['forceps', 'leg', 'thorax']) {
      expect(Math.abs(hsl(meshes(nymph, name)[0]).l - a.l)).toBeLessThan(0.18)
    }
  })
})
