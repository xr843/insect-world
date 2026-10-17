/**
 * 家蝇生活史：真实厘米尺度；量几何与可见表面，不只检查部件名。
 * 参考（主会话已核查）：
 * https://edis.ifas.ufl.edu/publication/IN205
 * https://entnemdept.ufl.edu/projex/gallery/dl/Beneficial_Arthropods_Parasitoids/TEXT/DIP_House_fly_Musca_domestica.html
 * https://www.uoguelph.ca/nadsfly/FFP/house.htm
 * 首轮53种退化与目视返工后26种退化均实改实现、定向运行变红、还原；各 it 简记对应改坏法。
 * 覆盖尺度两界、凹坑光照、体节消失、部件遮挡/重叠、颜色、锚点与面数；日志在 audit-out/house-fly。
 * 首轮补强：不能只查面法线与顶点法线同向，它们可能一起朝内。
 */
import * as THREE from 'three'
import { describe, expect, it } from 'vitest'
import * as eggModule from '../stages/house-fly-egg'
import { buildHouseFlyEgg } from '../stages/house-fly-egg'
import { buildHouseFlyLarva } from '../stages/house-fly-larva'
import { buildHouseFlyPupa } from '../stages/house-fly-pupa'
import type { InsectModel } from '../kit'
import { builtStagesOf } from '../../stages'

const egg = buildHouseFlyEgg(), larva = buildHouseFlyLarva(), pupa = buildHouseFlyPupa()
function meshes(m: InsectModel, name?: string): THREE.Mesh[] {
  m.group.updateMatrixWorld(true)
  const out: THREE.Mesh[] = []
  m.group.traverse(o => { if (o instanceof THREE.Mesh && (!name || o.name === name)) out.push(o) })
  return out
}
function vertices(m: InsectModel, name: string): THREE.Vector3[] {
  return meshes(m, name).flatMap(o => {
    const p = o.geometry.getAttribute('position')
    return Array.from({ length: p.count }, (_, i) => new THREE.Vector3().fromBufferAttribute(p, i).applyMatrix4(o.matrixWorld))
  })
}
function box(m: InsectModel, name: string) { return new THREE.Box3().setFromPoints(vertices(m, name)) }
function surfaceDistance(m: InsectModel, name: string, point: THREE.Vector3) {
  let best = Infinity
  const triangle = new THREE.Triangle(), closest = new THREE.Vector3()
  for (const mesh of meshes(m, name)) {
    const p = mesh.geometry.getAttribute('position'), ix = mesh.geometry.index
    for (let i = 0; i < (ix?.count ?? p.count); i += 3) {
      for (const [j, v] of [triangle.a, triangle.b, triangle.c].entries()) v.fromBufferAttribute(p, ix ? ix.getX(i + j) : i + j).applyMatrix4(mesh.matrixWorld)
      if (triangle.getArea() < 1e-16) continue
      triangle.closestPointToPoint(point, closest)
      best = Math.min(best, closest.distanceTo(point))
    }
  }
  return best
}
function size(m: InsectModel, name: string) { return box(m, name).getSize(new THREE.Vector3()) }
function mat(m: InsectModel, name: string) { return meshes(m, name)[0].material as THREE.MeshPhysicalMaterial }
function color(m: InsectModel, name: string) { return mat(m, name).color.getHSL({ h: 0, s: 0, l: 0 }, THREE.SRGBColorSpace) }
function widthAt(m: InsectModel, name: string, fraction: number) {
  const b = box(m, name), len = b.max.x - b.min.x
  const v = vertices(m, name).filter(p => Math.abs(p.x - (b.min.x + fraction * len)) < len * 0.012)
  return Math.max(...v.map(p => p.z)) - Math.min(...v.map(p => p.z))
}
function ringPeaks(m: InsectModel, name: string) {
  const v = vertices(m, name), b = box(m, name), len = b.max.x - b.min.x
  const rows = new Map<number, number>()
  for (const p of v) {
    const t = (p.x - b.min.x) / len
    if (t < 0.18 || t > 0.8) continue
    const k = Math.round(p.x * 1e6)
    rows.set(k, Math.max(rows.get(k) ?? 0, Math.abs(p.z)))
  }
  const radii = [...rows].sort((a, b) => a[0] - b[0]).map(a => a[1])
  return radii.filter((r, i) => i > 0 && i < radii.length - 1 && r > radii[i - 1] + 1e-7 && r > radii[i + 1] + 1e-7).length
}
function assertPlates(m: InsectModel, shell: string, name: string) {
  const plates = meshes(m, name)
  expect(plates).toHaveLength(2)
  for (const plate of plates) {
    const pb = new THREE.Box3().setFromObject(plate), s = pb.getSize(new THREE.Vector3())
    expect(s.y).toBeGreaterThan(0.015)
    expect(s.y).toBeLessThan(0.065)
    expect(s.z / s.y).toBeGreaterThan(0.4)
    expect(s.z / s.y).toBeLessThan(0.85)
    const c = pb.getCenter(new THREE.Vector3())
    // 后视射线必须先碰到气门板，不能埋在壳内。
    const ray = new THREE.Raycaster(c.clone().add(new THREE.Vector3(-1, 0, 0)), new THREE.Vector3(1, 0, 0))
    expect(ray.intersectObjects(m.group.children, true).find(hit => hit.object.name === name || hit.object.name === shell)?.object).toBe(plate)
    const plateHit = ray.intersectObject(plate)[0], skinHit = ray.intersectObjects(meshes(m, shell))[0]
    expect(plateHit).toBeDefined(); expect(skinHit).toBeDefined()
    const relief = skinHit.point.x - plateHit.point.x
    expect(relief).toBeGreaterThan(0)
    expect(relief).toBeLessThan(0.012)
  }
  const centers = plates.map(p => new THREE.Box3().setFromObject(p).getCenter(new THREE.Vector3()))
  expect(centers[0].z * centers[1].z).toBeLessThan(0)
  expect(Math.abs(centers[0].z - centers[1].z)).toBeGreaterThan(0.035)
}

describe('家蝇生活史', () => {
  it('注册三阶段', () => { // 变异：egg 导出改名或新增第二个 build 导出（模块契约被破坏）。
    expect(builtStagesOf('house-fly')).toEqual(['egg', 'larva', 'pupa'])
    expect(Object.keys(eggModule).filter(k => k.startsWith('build'))).toEqual(['buildHouseFlyEgg'])
    expect([egg, larva, pupa].every(m => m.group instanceof THREE.Group)).toBe(true)
  })
  it('卵真实细长尺度', () => { // 变异：卵长放大两倍。
    const s = size(egg, 'egg-shell')
    expect(s.x).toBeGreaterThan(0.11); expect(s.x).toBeLessThan(0.13)
    expect(s.z).toBeGreaterThan(0.02); expect(s.z).toBeLessThan(0.035)
    expect(s.x / s.z).toBeGreaterThan(3.5); expect(s.x / s.z).toBeLessThan(6)
    expect(meshes(egg, 'egg-shell')).toHaveLength(1)
  })
  it('卵香蕉弯曲而非直米粒', () => { // 变异：弯曲幅度归零。
    const v = vertices(egg, 'egg-shell'), b = box(egg, 'egg-shell')
    const mid = (x: number) => {
      const band = v.filter(p => Math.abs(p.x - x) < 0.002)
      return (Math.max(...band.map(p => p.y)) + Math.min(...band.map(p => p.y))) / 2
    }
    const bend = mid(0) - (mid(b.min.x * 0.8) + mid(b.max.x * 0.8)) / 2
    expect(bend).toBeGreaterThan(0.006); expect(bend).toBeLessThan(0.018)
  })
  it('卵乳白不透明', () => { // 变异：壳色改成褐色。
    expect(color(egg, 'egg-shell').l).toBeGreaterThan(0.85)
    expect(mat(egg, 'egg-shell').opacity).toBe(1)
    expect(mat(egg, 'egg-shell').transmission).toBe(0)
  })
  it('浅色表面朝外受光', () => { // 变异：卵三角绕向反转、或反射球面后重算法线（凹坑光照）。
    for (const [m, name] of [[egg, 'egg-shell'], [larva, 'larva-skin'], [pupa, 'puparium']] as const) {
      const g = meshes(m, name)[0].geometry, p = g.getAttribute('position'), n = g.getAttribute('normal'), ix = g.index!
      for (let i = 0; i < ix.count; i += 3) {
        const a = new THREE.Vector3().fromBufferAttribute(p, ix.getX(i)), b = new THREE.Vector3().fromBufferAttribute(p, ix.getX(i + 1)), c = new THREE.Vector3().fromBufferAttribute(p, ix.getX(i + 2))
        const face = b.sub(a).cross(c.sub(a))
        const normal = new THREE.Vector3().fromBufferAttribute(n, ix.getX(i)).add(new THREE.Vector3().fromBufferAttribute(n, ix.getX(i + 1))).add(new THREE.Vector3().fromBufferAttribute(n, ix.getX(i + 2)))
        expect(face.dot(normal)).toBeGreaterThanOrEqual(-1e-10)
        const centroid = new THREE.Vector3().fromBufferAttribute(p, ix.getX(i)).add(new THREE.Vector3().fromBufferAttribute(p, ix.getX(i + 1))).add(new THREE.Vector3().fromBufferAttribute(p, ix.getX(i + 2))).divideScalar(3)
        const centerY = name === 'egg-shell' ? 0.014 * (1 - (centroid.x / 0.06) ** 2) : 0
        // 略斜尾面的外向是-X，不能用径向向量判断封口面。
        const outward = name === 'larva-skin' && centroid.x < -0.48
          ? new THREE.Vector3(-1, 0.12, 0)
          : new THREE.Vector3(0, centroid.y - centerY, centroid.z)
        expect(face.dot(outward), '绕向和法线不能一起朝内').toBeGreaterThanOrEqual(-1e-10)
      }
    }
  })
  it('幼虫三龄真实尺度', () => { // 变异：幼虫体长减半。
    const s = size(larva, 'larva-skin')
    expect(s.x).toBeGreaterThan(0.7); expect(s.x).toBeLessThan(1.2)
    expect(s.z).toBeGreaterThan(0.12); expect(s.z).toBeLessThan(0.26)
  })
  it('幼虫长宽比4至5而非细号角', () => { // 返工变异：最大半径缩回0.098、或膨大到0.15。
    const s = size(larva, 'larva-skin')
    expect(s.x / s.z).toBeGreaterThanOrEqual(4)
    expect(s.x / s.z).toBeLessThanOrEqual(5)
  })
  it('幼虫后两段近圆柱且仅前三分之一收细', () => { // 返工变异：恢复全长二次收尖、收尖过早/过晚。
    const back = [0.12, 0.25, 0.4, 0.55, 0.64].map(t => widthAt(larva, 'larva-skin', t))
    expect(Math.min(...back) / Math.max(...back)).toBeGreaterThan(0.88)
    expect(widthAt(larva, 'larva-skin', 0.82) / back[0]).toBeLessThan(0.85)
    expect(widthAt(larva, 'larva-skin', 0.94) / back[0]).toBeLessThan(0.45)
  })
  it('幼虫尾端为圆角过渡的略斜截面', () => { // 返工变异：去掉圆角、直线倒角、圆角过短/过长、缩成小尖尾、移除尾面倾斜。
    const g = meshes(larva, 'larva-skin')[0].geometry, p = g.getAttribute('position')
    // 去除微倾斜后量纵剖面：平面只占内圈，外圈在一段轴向距离内圆滑接到体壁。
    const samples = Array.from({ length: p.count }, (_, i) => ({ x: p.getX(i) - 0.12 * p.getY(i), y: p.getY(i), r: Math.hypot(p.getY(i), p.getZ(i)) }))
    const rear = samples.filter(v => v.x < -0.4999)
    const capR = Math.max(...rear.map(v => v.r))
    const outerR = size(larva, 'larva-skin').z / 2
    expect(capR / outerR).toBeGreaterThan(0.55)
    expect(capR / outerR).toBeLessThan(0.8)
    const shoulder = samples.filter(v => v.r > outerR * 0.99)
    const fillet = Math.min(...shoulder.map(v => v.x)) + 0.5
    expect(fillet).toBeGreaterThan(0.035)
    expect(fillet).toBeLessThan(0.09)
    const sectionMap = new Map<number, { x: number; r: number }>()
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), y = p.getY(i), r = p.getZ(i)
      if (Math.abs(y) > 1e-6 || r < 0 || x > -0.43) continue
      const key = Math.round(x * 1e6), previous = sectionMap.get(key)
      if (!previous || r > previous.r) sectionMap.set(key, { x, r })
    }
    const sections = [...sectionMap.values()].sort((a, b) => a.x - b.x)
    // 起点切向接近平截面，圆角末端切向接近体轴；直角、直线倒角都过不了。
    expect((sections[1].x - sections[0].x) / (sections[1].r - sections[0].r)).toBeLessThan(0.4)
    const join = sections.findIndex(v => v.x >= -0.44)
    expect(Math.abs((sections[join].r - sections[join - 1].r) / (sections[join].x - sections[join - 1].x))).toBeLessThan(0.25)
    const cap = Array.from({ length: p.count }, (_, i) => new THREE.Vector3().fromBufferAttribute(p, i)).filter(v => v.x - 0.12 * v.y < -0.4999 && Math.abs(v.z) < 0.002 && Math.abs(v.y) > 0.05)
    expect(Math.max(...cap.map(v => v.x)) - Math.min(...cap.map(v => v.x))).toBeGreaterThan(0.012)
  })
  it('幼虫口钩仅短尖端外露且大部分埋入头端', () => { // 返工变异：恢复铁丝口钩、整体移出头端、加长露尖。
    const front = box(larva, 'larva-skin').max.x, length = size(larva, 'larva-skin').x
    for (const hook of meshes(larva, 'mouth-hook')) {
      const b = new THREE.Box3().setFromObject(hook)
      expect((b.max.x - front) / length).toBeGreaterThan(0.002)
      expect((b.max.x - front) / length).toBeLessThanOrEqual(0.025)
      const p = hook.geometry.getAttribute('position')
      const v = Array.from({ length: p.count }, (_, i) => new THREE.Vector3().fromBufferAttribute(p, i).applyMatrix4(hook.matrixWorld))
      expect(v.filter(p => p.x > front).length / v.length).toBeLessThan(0.4)
      // 实际在奶油头端内，不能只是轴向落在头部范围、两侧仍挂着整根黑钩。
      const ray = new THREE.Vector3(0.86, 0.44, 1.25).normalize()
      const visible = v.filter(point => new THREE.Raycaster(point.clone().addScaledVector(ray, 2), ray.clone().negate()).intersectObjects(larva.group.children, true)[0]?.object === hook)
      expect(visible.length / v.length).toBeLessThan(0.45)
    }
  })
  it('幼虫前尖后粗截平', () => { // 变异：前端膨大，退化成两头等粗。
    expect(widthAt(larva, 'larva-skin', 0.96) / widthAt(larva, 'larva-skin', 0.12)).toBeLessThan(0.4)
    const b = box(larva, 'larva-skin'), v = vertices(larva, 'larva-skin').filter(p => p.x < b.min.x + 0.02)
    expect(Math.max(...v.map(p => p.z)) - Math.min(...v.map(p => p.z))).toBeGreaterThan(0.12)
  })
  it('幼虫奶油油亮体壁', () => { // 变异：油亮体壁改成哑光。
    expect(color(larva, 'larva-skin').l).toBeGreaterThan(0.8)
    expect(mat(larva, 'larva-skin').roughness).toBeLessThan(0.5)
    expect(mat(larva, 'larva-skin').roughness).toBeGreaterThan(0.15)
    expect(mat(larva, 'larva-skin').transmission).toBe(0)
  })
  it('幼虫环纹有实际凹凸', () => { // 变异：环纹幅度归零。
    expect(ringPeaks(larva, 'larva-skin')).toBeGreaterThanOrEqual(6)
    expect(ringPeaks(larva, 'larva-skin')).toBeLessThanOrEqual(12)
  })
  it('幼虫两枚短黑口钩前端外露且home分开', () => { // 变异：第二枚口钩移到第一枚上。
    const hooks = meshes(larva, 'mouth-hook'); expect(hooks).toHaveLength(2)
    expect(color(larva, 'mouth-hook').l).toBeLessThan(0.2)
    const centers = hooks.map(h => new THREE.Box3().setFromObject(h).getCenter(new THREE.Vector3()))
    const view = new THREE.Vector3(0.86, 0.44, 1.25).normalize()
    const d = centers[0].clone().sub(centers[1]); d.addScaledVector(view, -d.dot(view))
    expect(d.length()).toBeGreaterThan(0.014)
    for (const h of hooks) {
      const b = new THREE.Box3().setFromObject(h), s = b.getSize(new THREE.Vector3())
      expect(b.max.x).toBeGreaterThan(box(larva, 'larva-skin').max.x)
      expect(s.x).toBeGreaterThan(0.02); expect(s.x).toBeLessThan(0.065)
      const point = (h.geometry as THREE.TubeGeometry).parameters.path.getPoint(0.92).applyMatrix4(h.matrixWorld)
      const ray = new THREE.Raycaster(point.clone().addScaledVector(view, larva.radius * 4), view.clone().negate())
      expect(ray.intersectObjects(larva.group.children, true)[0]?.object, 'home 机位的口钩不能藏进体壁').toBe(h)
    }
  })
  it('幼虫后气门为可见成对D板', () => { // 变异：气门板埋进体内。
    assertPlates(larva, 'larva-skin', 'posterior-spiracle')
    expect(color(larva, 'larva-skin').l - color(larva, 'posterior-spiracle').l).toBeGreaterThan(0.55)
    // D 的内侧边是一整条直线，外侧为弧线，不能换成圆眼睛。
    for (const p of meshes(larva, 'posterior-spiracle')) {
      const pos = p.geometry.getAttribute('position'), xs = Array.from({ length: pos.count }, (_, i) => pos.getX(i))
      expect(xs.filter(x => Math.abs(x) < 1e-6).length / xs.length).toBeGreaterThan(0.1)
    }
    expect(meshes(larva, 'spiracular-slit')).toHaveLength(6)
  })
  it('无足无头壳且围蛹无外露附肢', () => { // 变异：给围蛹添加一只足。
    expect(meshes(larva).map(m => m.name).every(n => ['larva-skin', 'mouth-hook', 'posterior-spiracle', 'spiracular-slit'].includes(n))).toBe(true)
    expect(meshes(pupa).map(m => m.name).every(n => ['puparium', 'spiracle-scar'].includes(n))).toBe(true)
    expect(larva.rig).toBeUndefined(); expect(pupa.rig).toBeUndefined()
  })
  it('围蛹真实桶形尺度', () => { // 变异：围蛹长度增至1.6厘米。
    const s = size(pupa, 'puparium')
    expect(s.x).toBeGreaterThan(0.72); expect(s.x).toBeLessThan(0.88)
    expect(s.z).toBeGreaterThan(0.24); expect(s.z).toBeLessThan(0.36)
    expect(s.x / s.z).toBeGreaterThan(2); expect(s.x / s.z).toBeLessThan(3.5)
  })
  it('围蛹两端圆钝非胡萝卜', () => { // 变异：后半壳体削成尖锥。
    const a = widthAt(pupa, 'puparium', 0.12), b = widthAt(pupa, 'puparium', 0.88), mid = widthAt(pupa, 'puparium', 0.5)
    expect(a / mid).toBeGreaterThan(0.65); expect(b / mid).toBeGreaterThan(0.65)
    expect(a / b).toBeGreaterThan(0.85); expect(a / b).toBeLessThan(1.18)
  })
  it('围蛹深红褐而非奶油裸蛹', () => { // 变异：改为乳白色。
    const c = color(pupa, 'puparium')
    expect(c.h).toBeLessThan(0.08); expect(c.s).toBeGreaterThan(0.4)
    expect(c.l).toBeGreaterThan(0.16); expect(c.l).toBeLessThan(0.38)
    expect(color(larva, 'larva-skin').l - c.l).toBeGreaterThan(0.45)
  })
  it('围蛹暗棕红而非高饱和番茄红', () => { // 返工变异：恢复旧色、鲜红、高饱和、过亮、偏紫红。
    const c = color(pupa, 'puparium')
    expect(c.h).toBeGreaterThan(0.025)
    expect(c.h).toBeLessThan(0.075)
    expect(c.l).toBeLessThanOrEqual(0.28)
    expect(c.s).toBeLessThanOrEqual(0.6)
  })
  it('围蛹降低高光而非亮漆壳', () => { // 返工变异：恢复gloss0.48、恢复clearcoat0.14。
    expect(mat(pupa, 'puparium').roughness).toBeGreaterThanOrEqual(0.7)
    expect(mat(pupa, 'puparium').clearcoat).toBeLessThanOrEqual(0.06)
  })
  it('围蛹保留体节环纹', () => { // 变异：壳体环沟归零；合法椭圆变体未误拦，双尖锥体被拦截。
    expect(ringPeaks(pupa, 'puparium')).toBeGreaterThanOrEqual(6)
    expect(ringPeaks(pupa, 'puparium')).toBeLessThanOrEqual(12)
  })
  it('围蛹后端气门痕外露', () => { // 变异：删除第二枚气门痕。
    assertPlates(pupa, 'puparium', 'spiracle-scar')
    expect(color(pupa, 'puparium').l - color(pupa, 'spiracle-scar').l).toBeGreaterThan(0.06)
  })
  it('锚点紧贴招牌结构', () => { // 变异：卵锚点漂移1厘米。
    for (const [m, anchor, name] of [[egg, 'egg', 'egg-shell'], [larva, 'mouthHooks', 'mouth-hook'], [larva, 'rearSpiracles', 'posterior-spiracle'], [pupa, 'puparium', 'puparium'], [pupa, 'spiracleScar', 'spiracle-scar']] as const) {
      expect(m.anchors[anchor]).toBeDefined()
      expect(box(m, name).distanceToPoint(m.anchors[anchor])).toBeLessThan(0.012)
      expect(surfaceDistance(m, name, m.anchors[anchor])).toBeLessThan(Math.min(0.008, m.radius * 0.08))
    }
  })
  it('面数预算有限且几何有效居中', () => { // 变异：卵细分陡增突破预算。
    for (const m of [egg, larva, pupa]) {
      const triangles = meshes(m).reduce((n, o) => n + (o.geometry.index?.count ?? o.geometry.getAttribute('position').count) / 3, 0)
      expect(triangles).toBeGreaterThan(500); expect(triangles).toBeLessThan(20000)
      expect(Number.isFinite(m.radius)).toBe(true); expect(m.radius).toBeGreaterThan(0)
      expect(new THREE.Box3().setFromObject(m.group).getCenter(new THREE.Vector3()).length()).toBeLessThan(1e-6)
      for (const o of meshes(m)) for (const x of o.geometry.getAttribute('position').array) expect(Number.isFinite(x)).toBe(true)
    }
  })
})
