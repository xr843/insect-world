/**
 * 东方蝼蛄：卵尺寸为同属资料外推，并非东方蝼蛄的独立测量。
 * https://en.wikipedia.org/wiki/Gryllotalpa_orientalis
 * https://groups.csail.mit.edu/mac/projects/psyche/7/7-003.html
 * 首版逐项变异运行 46 版，全部被当时的对应 M 项拦住；每次还原后再改下一版。
 * M01 放大/缩小/变球；M02 黄/暗/内法线/透明；M03 整体过大/过小；
 * M04 盾片细颈/头过宽；M05 圆腿/铲埋身/缩成点；M06 少齿/埋齿/齿挤成束；
 * M07 跳跃粗腿/少步行足/无胫节；M08 无触角/太长/太短；
 * M09 尾须向前/缺失/过长；M10 芽成长翅/埋身/太小；
 * M11 斑与体同色/体白/体黑/斑埋身/斑太小；M12 少毛/长刺/埋毛；
 * M13 单侧铲错位；M14 若虫或卵锚点悬空/沿用成虫翅键；
 * M15 面数超额/半径错/NaN/无足够实体/未居中。
 * 首轮加强「毛在体表以外」检查时抓到胸节遮住腹毛，已过滤被相邻体节覆盖的毛。
 * 目视返工：M10 改为贴背、体宽内的深灰舌状芽；M11 删除实体白斑要求。
 * 新增 R01–R07 回归断言实跑 19 个退化版本，19/19 拦住：
 * 外移/加宽、下移/埋胸/高悬、浅灰/纯黑、加回白斑、圆盘/厚球/倒置/向前，
 * 基节增粗/缩没/变浅/缺失、步行足原浅灰/白色/暗于体壁。
 * 完整日志：audit-out/mole-cricket/{mutations,review-mutations}.log（不提交）。
 */
import * as THREE from 'three'
import { describe, expect, it } from 'vitest'
import { buildMoleCricketEgg } from '../stages/mole-cricket-egg'
import { buildMoleCricketNymph } from '../stages/mole-cricket-nymph'
import { buildMoleCricket } from '../mole-cricket'
import type { InsectModel } from '../kit'

const egg = buildMoleCricketEgg(), nymph = buildMoleCricketNymph(), adult = buildMoleCricket()
function meshes(model: InsectModel, name?: string): THREE.Mesh[] {
  model.group.updateMatrixWorld(true)
  const out: THREE.Mesh[] = []
  model.group.traverse(o => { if (o instanceof THREE.Mesh && (!name || o.name === name)) out.push(o) })
  return out
}
function box(list: THREE.Object3D[]) {
  const b = new THREE.Box3()
  for (const o of list) b.union(new THREE.Box3().setFromObject(o))
  return b
}
const size = (list: THREE.Object3D[]) => box(list).getSize(new THREE.Vector3())
const center = (m: THREE.Object3D) => box([m]).getCenter(new THREE.Vector3())
function light(m: THREE.Mesh) {
  const h = { h: 0, s: 0, l: 0 }
  ;(m.material as THREE.MeshPhysicalMaterial).color.getHSL(h, THREE.SRGBColorSpace)
  return h
}
const body = () => meshes(nymph).filter(m => ['head', 'pronotum', 'abdomen', 'thorax'].includes(m.name))

describe('东方蝼蛄生活史', () => {
  it('M01 卵长2.5毫米且椭圆，不能放大或缩小', () => {
    const s = size(meshes(egg, 'egg-shell'))
    expect(s.x).toBeGreaterThan(0.24); expect(s.x).toBeLessThan(0.26)
    expect(s.y).toBeGreaterThan(0.15); expect(s.y).toBeLessThan(0.19)
    expect(s.x / s.z).toBeGreaterThan(1.3); expect(s.x / s.z).toBeLessThan(1.7)
  })
  it('M02 卵是灰白实心凸壳，外法线朝外', () => {
    const m = meshes(egg, 'egg-shell')[0], h = light(m)
    expect(h.l).toBeGreaterThan(0.75); expect(h.s).toBeLessThan(0.15)
    const p = m.geometry.getAttribute('position'), n = m.geometry.getAttribute('normal')
    for (let i = 0; i < p.count; i++) {
      expect(new THREE.Vector3().fromBufferAttribute(p, i).dot(new THREE.Vector3().fromBufferAttribute(n, i))).toBeGreaterThan(0)
    }
    expect((m.material as THREE.MeshPhysicalMaterial).opacity).toBe(1)
  })
  it('M03 若虫躯干12–15毫米，约成虫四成', () => {
    const len = size(body()).x
    expect(len).toBeGreaterThan(1.2); expect(len).toBeLessThan(1.5)
    // 成虫躯干未命名：排除附肢，以前胸及腹端的真实坐标间距量参照。
    const adultBody = adult.anchors.eye.x - adult.anchors.abdomen.x + 0.85
    expect(len / adultBody).toBeGreaterThan(0.36); expect(len / adultBody).toBeLessThan(0.46)
  })
  it('M04 盾形前胸比头宽而非细颈', () => {
    const s = size(meshes(nymph, 'pronotum')), h = size(meshes(nymph, 'head'))
    expect(s.z / h.z).toBeGreaterThan(1.6); expect(s.z / h.z).toBeLessThan(2.6)
    expect(s.x).toBeGreaterThan(0.4); expect(s.y).toBeGreaterThan(0.3)
  })
  it('M05 两把铲宽扁、伸出体侧且互相分开', () => {
    const shovels = meshes(nymph, 'shovel')
    expect(shovels).toHaveLength(2)
    for (const m of shovels) {
      const s = size([m]); expect(s.z / s.y).toBeGreaterThan(2.7)
      expect(s.z / (2 * nymph.radius)).toBeGreaterThan(0.08)
      expect(Math.abs(center(m).z - nymph.anchors.pronotum.z)).toBeGreaterThan(0.25)
    }
    expect(Math.abs(center(shovels[0]).z - center(shovels[1]).z)).toBeGreaterThan(0.6)
  })
  it('M06 每铲四个齿，齿越过掌缘且有可见长度', () => {
    const teeth = meshes(nymph, 'shovel-tooth'), palms = meshes(nymph, 'shovel')
    expect(teeth).toHaveLength(8)
    for (const palm of palms) {
      const c = center(palm), b = box([palm])
      const ts = teeth.filter(t => Math.sign(center(t).z - nymph.anchors.pronotum.z) === Math.sign(c.z - nymph.anchors.pronotum.z))
      expect(ts).toHaveLength(4)
      for (const t of ts) { expect(box([t]).max.x - b.max.x).toBeGreaterThan(0.055); expect(size([t]).x).toBeGreaterThan(0.07) }
      expect(size(ts).z).toBeGreaterThan(0.18)
    }
  })
  it('M07 四条步行足细于前铲，后足没有跳跃股节', () => {
    const legs = meshes(nymph, 'walking-femur'); expect(legs).toHaveLength(4)
    for (const l of legs) { expect(size([l]).y).toBeLessThan(0.12); expect(size([l]).z).toBeGreaterThan(0.1) }
    expect(meshes(nymph, 'walking-tibia')).toHaveLength(4)
  })
  it('M08 一对短触角向前，长度短于体长', () => {
    const a = meshes(nymph, 'antenna'); expect(a).toHaveLength(2)
    for (const m of a) {
      expect(size([m]).x).toBeGreaterThan(0.23); expect(size([m]).x).toBeLessThan(0.48); expect(size([m]).length()).toBeLessThan(0.6)
      expect(box([m]).max.x).toBeGreaterThan(box(meshes(nymph, 'head')).max.x + 0.18)
    }
  })
  it('M09 尾须一对向后，不复用向前的触角方向', () => {
    const c = meshes(nymph, 'cercus'); expect(c).toHaveLength(2)
    for (const m of c) {
      expect(box([m]).min.x).toBeLessThan(box(meshes(nymph, 'abdomen')).min.x - 0.15)
      expect(size([m]).x).toBeGreaterThan(0.2); expect(size([m]).x).toBeLessThan(0.4)
    }
    expect(Math.abs(center(c[0]).z - center(c[1]).z)).toBeGreaterThan(0.17)
  })
  it('M10 小翅芽贴伏背面后缘，不盖住腹部', () => {
    const pads = meshes(nymph, 'wing-pad'); expect(pads).toHaveLength(4)
    const abdomen = box(meshes(nymph, 'abdomen'))
    for (const p of pads) {
      expect(size([p]).x).toBeGreaterThan(0.10); expect(size([p]).x).toBeLessThan(0.24)
      expect(box([p]).min.x).toBeGreaterThan(abdomen.min.x + 0.4)
      const chest = meshes(nymph, 'thorax')[0], cb = box([chest]), pb = box([p])
      // R01：把翅芽外移/加宽成耳朵，俯视轮廓必须报警。
      expect(pb.min.z).toBeGreaterThanOrEqual(cb.min.z - 0.01)
      expect(pb.max.z).toBeLessThanOrEqual(cb.max.z + 0.01)
      // R02：移到腹侧、埋入胸部或高高悬起均拦住。
      expect(pb.min.y).toBeGreaterThan(center(chest).y + 0.09)
      expect(pb.max.y).toBeLessThan(cb.max.y + 0.015)
      // R03：恢复浅灰片或染成纯黑，亮度差上限会失败。
      expect(Math.abs(light(p).l - light(chest).l)).toBeLessThan(0.06)
    }
    expect(nymph.anchors.wing).toBeUndefined()
  })
  it('M11 腹部保留灰暗体壁，去掉成排实体白斑', () => {
    const skin = light(meshes(nymph, 'abdomen')[0]).l
    expect(skin).toBeGreaterThan(0.15); expect(skin).toBeLessThan(0.4)
    // R04：重新加回独立白斑，即使只有一枚也报警。
    expect(meshes(nymph, 'white-spot')).toHaveLength(0)
  })
  it('R05 翅芽是向后渐窄的舌状薄片，不是圆盘', () => {
    for (const pad of meshes(nymph, 'wing-pad')) {
      const s = size([pad])
      expect(s.x / s.z).toBeGreaterThan(1.7)
      expect(s.y / s.x).toBeLessThan(0.25)
      const pos = pad.geometry.getAttribute('position')
      const points = Array.from({ length: pos.count }, (_, i) => new THREE.Vector3().fromBufferAttribute(pos, i).applyMatrix4(pad.matrixWorld))
      const b = box([pad]), third = s.x / 3
      const front = new THREE.Box3().setFromPoints(points.filter(v => v.x > b.max.x - third))
      const rear = new THREE.Box3().setFromPoints(points.filter(v => v.x < b.min.x + third))
      // R05：圆盘、厚球、前后倒置（向前收尖）分别会失败。
      expect(front.getSize(new THREE.Vector3()).z).toBeGreaterThan(rear.getSize(new THREE.Vector3()).z * 1.4)
    }
  })
  it('R06 步行足基节小而暗，足段只略浅于体壁', () => {
    const roots = meshes(nymph, 'walking-coxa'), chest = meshes(nymph, 'thorax')[0]
    expect(roots).toHaveLength(4)
    for (const root of roots) {
      const p = root.geometry.getAttribute('position')
      const ring = Array.from({ length: 9 }, (_, i) => new THREE.Vector3().fromBufferAttribute(p, i).applyMatrix4(root.matrixWorld))
      const c = ring.slice(0, 8).reduce((a, b) => a.add(b), new THREE.Vector3()).multiplyScalar(1 / 8)
      const r = Math.max(...ring.map(v => v.distanceTo(c)))
      // R06：放大基节/缩成零/改成浅色大球分别报警。
      expect(r).toBeGreaterThan(0.01); expect(r).toBeLessThan(0.022)
      expect(Math.abs(light(root).l - light(chest).l)).toBeLessThan(0.04)
    }
    for (const name of ['walking-femur', 'walking-tibia']) {
      for (const foot of meshes(nymph, name)) {
        // R07：足恢复原来的浅灰色，或者比体壁还黑都报警。
        expect(light(foot).l - light(chest).l).toBeGreaterThan(0)
        expect(light(foot).l - light(chest).l).toBeLessThan(0.12)
        expect(light(foot).l).toBeLessThan(0.45)
      }
    }
  })
  it('M12 短绒毛有实体且不长成刺猬', () => {
    const hairs = meshes(nymph, 'fuzz'); expect(hairs.length).toBeGreaterThanOrEqual(80)
    for (const m of hairs) {
      const s = size([m]); expect(s.length()).toBeGreaterThan(0.012); expect(s.length()).toBeLessThan(0.04)
      expect(center(m).y).toBeGreaterThan(nymph.anchors.pronotum.y - 0.2)
      const distances = body().map(o => {
        const q = center(m).sub(center(o)).divide(size([o]).multiplyScalar(0.5))
        return q.lengthSq()
      })
      expect(Math.min(...distances)).toBeGreaterThan(1.01)
      expect(Math.min(...distances)).toBeLessThan(1.35)
    }
  })
  it('M13 左右铲、触角、尾须及翅芽几何镜像对称', () => {
    const z = nymph.anchors.pronotum.z
    for (const name of ['shovel', 'antenna', 'cercus', 'wing-pad']) {
      const list = meshes(nymph, name)
      for (const m of list) {
        const c = center(m)
        expect(list.some(other => center(other).distanceTo(new THREE.Vector3(c.x, c.y, 2 * z - c.z)) < 0.001)).toBe(true)
      }
    }
  })
  it('M14 两阶段锚点贴在对应结构上且有语义', () => {
    for (const [model, keys] of [[egg, { egg: 'egg-shell' }], [nymph, { foreleg: 'shovel-tooth', pronotum: 'pronotum', abdomen: 'abdomen', antenna: 'antenna', cercus: 'cercus', wingPad: 'wing-pad', eye: 'eye' }]] as const) {
      expect(Object.keys(model.anchors).sort()).toEqual(Object.keys(keys).sort())
      for (const [key, name] of Object.entries(keys)) {
        expect(Math.min(...meshes(model, name).map(m => box([m]).distanceToPoint(model.anchors[key])))).toBeLessThan(model.radius * 0.04)
      }
    }
  })
  it('M15 有限顶点、正常取景和三角面预算', () => {
    for (const m of [egg, nymph]) {
      let count = 0
      for (const mesh of meshes(m)) {
        const p = mesh.geometry.getAttribute('position')
        expect(Array.from(p.array).every(Number.isFinite)).toBe(true)
        count += (mesh.geometry.index?.count ?? p.count) / 3
      }
      expect(count).toBeGreaterThan(100); expect(count).toBeLessThan(30000)
      expect(Number.isFinite(m.radius)).toBe(true); expect(m.radius).toBeGreaterThan(0.1); expect(m.radius).toBeLessThan(1.6)
      expect(box([m.group]).getCenter(new THREE.Vector3()).length()).toBeLessThan(0.001)
    }
  })
})
