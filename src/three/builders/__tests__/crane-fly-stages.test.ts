/**
 * Tipula sp. 大蚊生活史；cm，+X前、+Y上、+Z右。
 * 属级形态参考（2026-10-17 网页搜索核查；不是成虫文件 Nephrotoma 的种级实测）：
 * https://content.ces.ncsu.edu/leatherjackets-and-craneflies
 *   坚韧皮肤、尾肉突，蛹深色细长。
 * https://ipm.ucanr.edu/TOOLS/TURF/PESTS/incrane.html
 * https://extension.oregonstate.edu/catalog/pub/pnw750?reference=catalog
 *   灰褐无足、成熟幼虫约1–1.5英寸。
 * https://openscholar.uga.edu/nanna/record/13119/files/rogers_theresa_e_200512_ms.pdf
 *   Tipula卵黑亮长椭圆，约1×0.4mm；本模型不外推水生类长丝。
 * https://pmc.ncbi.nlm.nih.gov/articles/PMC8516825/
 *   Tipula尾盘肉突、黑心褐环的成对气门。
 * https://mapress.com/zs/article/view/zoosymposia.3.1.25/4319
 *   Tipulinae蛹呼吸角、腹节后缘刺列；足/翅鞘紧贴体表。
 * 取值：卵1×0.4mm，幼虫36mm（直径4.8mm推算），蛹27×5mm推算；
 * 呼吸角、肉突、足鞘等局部尺寸均为参考图比例推算。无土块衬底，便于检查体表。
 * 19项测试，46种实现退化逐一运行变红后还原。首轮细足鞘与下沉呼吸角漏网，
 * 补截面直径和角端相对体表高度后重测拦住；各 it 注释记录退化，日志在 audit-out/crane-fly。
 */
import * as THREE from 'three'
import { describe, expect, it } from 'vitest'
import * as eggModule from '../stages/crane-fly-egg'
import * as larvaModule from '../stages/crane-fly-larva'
import * as pupaModule from '../stages/crane-fly-pupa'
import type { InsectModel } from '../kit'
import { builtStagesOf } from '../../stages'
const egg = eggModule.buildCraneFlyEgg(), larva = larvaModule.buildCraneFlyLarva(), pupa = pupaModule.buildCraneFlyPupa()
function meshes(m: InsectModel, name?: string) {
  m.group.updateMatrixWorld(true)
  const out: THREE.Mesh[] = []
  m.group.traverse(o => { if (o instanceof THREE.Mesh && (!name || o.name === name)) out.push(o) })
  return out
}
function box(m: InsectModel, name: string) { const b = new THREE.Box3(); for (const o of meshes(m, name)) b.union(new THREE.Box3().setFromObject(o)); return b }
function size(m: InsectModel, name: string) { return box(m, name).getSize(new THREE.Vector3()) }
function center(o: THREE.Object3D) { return new THREE.Box3().setFromObject(o).getCenter(new THREE.Vector3()) }
function mat(m: InsectModel, name: string) { return meshes(m, name)[0].material as THREE.MeshPhysicalMaterial }
function color(m: InsectModel, name: string) { return mat(m, name).color.getHSL({ h: 0, s: 0, l: 0 }, THREE.SRGBColorSpace) }
const home = new THREE.Vector3(0.86, 0.44, 1.25).normalize()
function visible(m: InsectModel, mesh: THREE.Mesh, dir: THREE.Vector3) {
  const p = mesh.geometry.getAttribute('position'); let hits = 0
  for (let i = 0; i < p.count; i += 7) {
    const v = new THREE.Vector3().fromBufferAttribute(p, i).applyMatrix4(mesh.matrixWorld)
    const ray = new THREE.Raycaster(v.clone().addScaledVector(dir, m.radius * 4), dir.clone().negate())
    if (ray.intersectObjects(m.group.children, true)[0]?.object === mesh) hits++
  }
  return hits / Math.ceil(p.count / 7)
}
function widthAt(m: InsectModel, name: string, t: number) {
  const b = box(m, name), x = b.min.x + (b.max.x - b.min.x) * t, zs: number[] = []
  for (const o of meshes(m, name)) {
    const p = o.geometry.getAttribute('position')
    for (let i = 0; i < p.count; i++) {
      const v = new THREE.Vector3().fromBufferAttribute(p, i).applyMatrix4(o.matrixWorld)
      if (Math.abs(v.x - x) < 0.02) zs.push(v.z)
    }
  }
  return Math.max(...zs) - Math.min(...zs)
}
describe('大蚊生活史', () => {
  it('三文件各一个build导出且自动注册', () => { // 变异：导出改名/多导出。
    expect(builtStagesOf('crane-fly')).toEqual(['egg', 'larva', 'pupa'])
    for (const [mod, name] of [[eggModule, 'buildCraneFlyEgg'], [larvaModule, 'buildCraneFlyLarva'], [pupaModule, 'buildCraneFlyPupa']] as const)
      expect(Object.keys(mod).filter(k => k.startsWith('build'))).toEqual([name])
  })
  it('卵毫米长椭圆尺度两界', () => { // 变异：整体放大/缩小；变圆。
    const s = size(egg, 'egg-shell')
    expect(s.x).toBeGreaterThan(0.09); expect(s.x).toBeLessThan(0.11)
    expect(s.z).toBeGreaterThan(0.035); expect(s.z).toBeLessThan(0.045)
    expect(s.x / s.z).toBeGreaterThan(2.2); expect(s.x / s.z).toBeLessThan(2.9)
    expect(meshes(egg)).toHaveLength(1)
  })
  it('卵黑色实体略有光泽', () => { // 变异：白卵、透明壳。
    expect(color(egg, 'egg-shell').l).toBeLessThan(0.16)
    expect(mat(egg, 'egg-shell').roughness).toBeLessThan(0.65)
    expect(mat(egg, 'egg-shell').transmission).toBe(0)
    expect(mat(egg, 'egg-shell').opacity).toBe(1)
  })
  it('表面绕向及法线朝外', () => { // 变异：反转卵面绕向；法线反转。
    const o = meshes(egg)[0], p = o.geometry.getAttribute('position'), n = o.geometry.getAttribute('normal'), ix = o.geometry.index!
    for (let i = 0; i < ix.count; i += 3) {
      const a = new THREE.Vector3().fromBufferAttribute(p, ix.getX(i)), b = new THREE.Vector3().fromBufferAttribute(p, ix.getX(i + 1)), c = new THREE.Vector3().fromBufferAttribute(p, ix.getX(i + 2))
      const face = b.clone().sub(a).cross(c.clone().sub(a)), centroid = a.clone().add(b).add(c).divideScalar(3)
      expect(face.dot(centroid)).toBeGreaterThanOrEqual(-1e-12)
      expect(new THREE.Vector3().fromBufferAttribute(n, ix.getX(i)).dot(a)).toBeGreaterThanOrEqual(-1e-12)
    }
  })
  it('皮夹克真实尺度且比蛹长', () => { // 变异：幼虫长度减半/加倍。
    const s = size(larva, 'larva-skin')
    expect(s.x).toBeGreaterThan(3.4); expect(s.x).toBeLessThan(3.8)
    expect(s.z).toBeGreaterThan(0.44); expect(s.z).toBeLessThan(0.53)
    expect(s.x).toBeGreaterThan(size(pupa, 'pupa-skin').x)
  })
  it('圆柱主躯干非线性尖锥', () => { // 变异：全长线性收尖、压扁。
    const widths = [0.2, 0.4, 0.6, 0.8].map(t => widthAt(larva, 'larva-skin', t))
    expect(Math.min(...widths) / Math.max(...widths)).toBeGreaterThan(0.85)
    const s = size(larva, 'larva-skin'); expect(s.y / s.z).toBeGreaterThan(0.85); expect(s.y / s.z).toBeLessThan(1.3)
    expect(widthAt(larva, 'larva-skin', 0.98)).toBeLessThan(widths[1] * 0.7)
  })
  it('灰褐坚韧表皮而非白蛆或鲜色', () => { // 变异：白色、饱和橙色。
    const c = color(larva, 'larva-skin')
    expect(c.l).toBeGreaterThan(0.25); expect(c.l).toBeLessThan(0.5); expect(c.s).toBeLessThan(0.25)
    expect(mat(larva, 'larva-skin').roughness).toBeGreaterThan(0.65)
  })
  it('无足且缩头不成为外露大头', () => { // 变异：加足、头壳前移。
    expect(meshes(larva).every(o => ['larva-skin', 'retracted-head', 'spiracular-disc', 'spiracle', 'spiracle-rim', 'tail-lobe'].includes(o.name))).toBe(true)
    expect(box(larva, 'retracted-head').max.x - box(larva, 'larva-skin').max.x).toBeLessThan(0.025)
    expect(size(larva, 'retracted-head').z / size(larva, 'larva-skin').z).toBeLessThan(0.4)
  })
  it('六枚尾肉突围住尾盘且有厚度', () => { // 变异：删肉突、缩成细线、移到头端。
    const lobes = meshes(larva, 'tail-lobe'); expect(lobes).toHaveLength(6)
    const d = box(larva, 'spiracular-disc').getCenter(new THREE.Vector3())
    for (const lobe of lobes) {
      const b = new THREE.Box3().setFromObject(lobe), s = b.getSize(new THREE.Vector3())
      expect(center(lobe).distanceTo(d)).toBeGreaterThan(0.16); expect(center(lobe).distanceTo(d)).toBeLessThan(0.32)
      expect(Math.min(s.x, s.y, s.z)).toBeGreaterThan(0.045)
      expect(b.max.x).toBeLessThan(box(larva, 'larva-skin').min.x + 0.65)
    }
  })
  it('尾盘成对黑气门分开且顶视可见', () => { // 变异：气门重叠/埋体内/白色。
    const pair = meshes(larva, 'spiracle'); expect(pair).toHaveLength(2)
    expect(center(pair[0]).distanceTo(center(pair[1]))).toBeGreaterThan(0.13)
    expect(color(larva, 'spiracle').l).toBeLessThan(0.15)
    for (const o of pair) { expect(visible(larva, o, new THREE.Vector3(0, 1, 0))).toBeGreaterThan(0.2); expect(new THREE.Box3().setFromObject(o).getSize(new THREE.Vector3()).z).toBeGreaterThan(0.06) }
  })
  it('蛹真实细长尺度与自然深褐色', () => { // 变异：蛹放大/缩小、鲜红。
    const s = size(pupa, 'pupa-skin'), c = color(pupa, 'pupa-skin')
    expect(s.x).toBeGreaterThan(2.5); expect(s.x).toBeLessThan(2.9)
    expect(s.z).toBeGreaterThan(0.44); expect(s.z).toBeLessThan(0.56)
    expect(c.l).toBeGreaterThan(0.16); expect(c.l).toBeLessThan(0.36); expect(c.s).toBeLessThan(0.35)
  })
  it('头端两呼吸角home分开外露', () => { // 变异：删一角、重叠、缩短、埋入。
    const horns = meshes(pupa, 'respiratory-horn'); expect(horns).toHaveLength(2)
    const delta = center(horns[0]).sub(center(horns[1])); delta.addScaledVector(home, -delta.dot(home))
    expect(delta.length()).toBeGreaterThan(0.2)
    for (const h of horns) {
      const b = new THREE.Box3().setFromObject(h), s = b.getSize(new THREE.Vector3())
      expect(b.max.x).toBeGreaterThan(box(pupa, 'pupa-skin').max.x - 0.2)
      expect(s.y).toBeGreaterThan(0.18); expect(s.y).toBeLessThan(0.5)
      // 首轮下沉变异仍在前端外露：仅检查射线命中不足以保证角抬离体轴。
      expect(b.max.y - box(pupa, 'pupa-skin').max.y).toBeGreaterThan(-0.08)
      expect(visible(pupa, h, home)).toBeGreaterThan(0.15)
    }
  })
  it('腹节短刺成列且指向尾端', () => { // 变异：删除一列、刺向头端、刺过长。
    const spines = meshes(pupa, 'abdominal-spine'); expect(spines.length).toBeGreaterThanOrEqual(48)
    const rows = new Set(spines.map(o => Math.round(center(o).x * 5))); expect(rows.size).toBeGreaterThanOrEqual(6)
    for (const o of spines) {
      const g = o.geometry as THREE.ConeGeometry
      const base = new THREE.Vector3(0, -g.parameters.height / 2, 0).applyMatrix4(o.matrixWorld), tip = new THREE.Vector3(0, g.parameters.height / 2, 0).applyMatrix4(o.matrixWorld)
      expect(tip.x).toBeLessThan(base.x)
      expect(tip.distanceTo(base)).toBeGreaterThan(0.035); expect(tip.distanceTo(base)).toBeLessThan(0.11)
    }
  })
  it('被蛹三对足鞘成对贴腹无跨线翘起', () => { // 变异：删足、足翘高、越中线、火柴化。
    const legs = meshes(pupa, 'leg-sheath'); expect(legs).toHaveLength(6)
    for (const o of legs) {
      const b = new THREE.Box3().setFromObject(o), s = b.getSize(new THREE.Vector3())
      // 首轮火柴棍变异漏网：长曲线的包围盒高度不能代替足鞘直径。量中部一圈顶点。
      const p = o.geometry.getAttribute('position')
      const ring = Array.from({ length: 10 }, (_, i) => new THREE.Vector3().fromBufferAttribute(p, 12 * 11 + i))
      const diameter = Math.max(...ring.flatMap(a => ring.map(b => a.distanceTo(b))))
      expect(diameter).toBeGreaterThan(0.045); expect(diameter).toBeLessThan(0.07)
      expect(s.x).toBeGreaterThan(0.9); expect(s.y).toBeGreaterThan(0.035); expect(s.y).toBeLessThan(0.13)
      expect(Math.min(Math.abs(b.min.z), Math.abs(b.max.z))).toBeGreaterThan(0.015)
      expect(b.min.z * b.max.z).toBeGreaterThan(0)
      expect(b.max.y - box(pupa, 'pupa-skin').max.y).toBeLessThan(0.1)
      expect(visible(pupa, o, new THREE.Vector3(0, 1, 0))).toBeGreaterThan(0.1)
    }
  })
  it('翅鞘触角鞘左右成对贴体', () => { // 变异：删翅、触角竖起或移到中线。
    for (const name of ['wing-sheath', 'antenna-sheath']) {
      const pair = meshes(pupa, name); expect(pair).toHaveLength(2)
      expect(center(pair[0]).z * center(pair[1]).z).toBeLessThan(0)
      for (const o of pair) {
        expect(new THREE.Box3().setFromObject(o).max.y - box(pupa, 'pupa-skin').max.y).toBeLessThan(0.1)
        expect(visible(pupa, o, new THREE.Vector3(0, 1, 0))).toBeGreaterThan(0.05)
      }
    }
  })
  it('环褶为真实几何且末端圆滑收束', () => { // 变异：环褶归零；端头改成平截面。
    for (const [m, name] of [[larva, 'larva-skin'], [pupa, 'pupa-skin']] as const) {
      const points = (meshes(m, name)[0].geometry as THREE.LatheGeometry).parameters.points
      const radii = points.slice(Math.floor(points.length * 0.18), Math.floor(points.length * 0.62)).map(p => p.x)
      const peaks = radii.filter((r, i) => i > 0 && i < radii.length - 1 && r > radii[i - 1] && r > radii[i + 1]).length
      expect(peaks).toBeGreaterThanOrEqual(4)
      expect(points[0].x).toBeLessThan(0.001); expect(points[points.length - 1].x).toBeLessThan(0.001)
      // 圆弧端头的首段沿轴位移远小于半径增长，不是直锥或硬边平切。
      expect((points[1].y - points[0].y) / points[1].x).toBeLessThan(0.4)
    }
  })
  it('附肢鞘同体色且镜像对称', () => { // 变异：鞘变乳白补丁；单侧移位。
    expect(Math.abs(color(pupa, 'wing-sheath').l - color(pupa, 'pupa-skin').l)).toBeLessThan(0.12)
    const legs = meshes(pupa, 'leg-sheath')
    for (let i = 0; i < 3; i++) {
      const a = center(legs[i]), b = center(legs[i + 3])
      expect(Math.abs(a.x - b.x)).toBeLessThan(1e-5); expect(Math.abs(a.y - b.y)).toBeLessThan(1e-5); expect(Math.abs(a.z + b.z)).toBeLessThan(1e-5)
    }
    expect(legs.filter(o => visible(pupa, o, home) > 0.07).length).toBeGreaterThanOrEqual(3)
  })
  it('锚点落在对应可见表面', () => { // 变异：锚点漂移。
    for (const [m, key, name] of [[egg, 'egg', 'egg-shell'], [larva, 'tailDisc', 'spiracular-disc'], [pupa, 'breathingHorn', 'respiratory-horn']] as const) {
      expect(m.anchors[key]).toBeDefined()
      const point = m.anchors[key], triangle = new THREE.Triangle(), nearest = new THREE.Vector3(); let distance = Infinity
      for (const o of meshes(m, name)) {
        const p = o.geometry.getAttribute('position'), ix = o.geometry.index
        for (let i = 0; i < (ix?.count ?? p.count); i += 3) {
          for (const [j, v] of [triangle.a, triangle.b, triangle.c].entries()) v.fromBufferAttribute(p, ix ? ix.getX(i + j) : i + j).applyMatrix4(o.matrixWorld)
          triangle.closestPointToPoint(point, nearest); distance = Math.min(distance, nearest.distanceTo(point))
        }
      }
      expect(distance).toBeLessThan(0.009)
    }
  })
  it('预算有限几何有效且居中', () => { // 变异：高细分突破预算、几何偏移。
    for (const m of [egg, larva, pupa]) {
      const ms = meshes(m), count = ms.reduce((n, o) => n + (o.geometry.index?.count ?? o.geometry.getAttribute('position').count) / 3, 0)
      expect(count).toBeGreaterThan(500); expect(count).toBeLessThan(25000)
      expect(new THREE.Box3().setFromObject(m.group).getCenter(new THREE.Vector3()).length()).toBeLessThan(1e-6)
      expect(m.radius).toBeGreaterThan(0); expect(Number.isFinite(m.radius)).toBe(true)
      for (const o of ms) for (const x of o.geometry.getAttribute('position').array) expect(Number.isFinite(x)).toBe(true)
      expect(m.rig).toBeUndefined()
    }
  })
})
