/**
 * 成对附肢的镜像正确性。
 *
 * 起因：两个独立的物种作者都报告 legPair 的左右腿位置不对。
 * 这类问题不会被 NaN 检查抓到 —— 几何完全合法，只是长错了地方，
 * 所以必须有专门的对称性断言。
 */
import { describe, expect, it } from 'vitest'
import * as THREE from 'three'
import { antennaPair, chitin, compoundEyePair, leg, legPair, type LegSpec } from '../kit'

const mat = chitin({ color: '#333' })

/** 把一个对象的所有顶点变换到世界坐标后取包围盒 */
function worldBox(obj: THREE.Object3D): THREE.Box3 {
  obj.updateMatrixWorld(true)
  return new THREE.Box3().setFromObject(obj)
}

/** 收集世界坐标下的全部顶点 z 值 */
function worldZs(obj: THREE.Object3D): number[] {
  obj.updateMatrixWorld(true)
  const zs: number[] = []
  const v = new THREE.Vector3()
  obj.traverse((o) => {
    const m = o as THREE.Mesh
    if (!m.isMesh) return
    const pos = m.geometry.getAttribute('position')
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i).applyMatrix4(m.matrixWorld)
      zs.push(v.z)
    }
  })
  return zs
}

const SPEC: LegSpec = { base: [0.5, 0, 0.6], femur: 1.2, tibia: 1.4, splay: 30, sweep: -20 }

describe('legPair', () => {
  it('生成两条腿', () => {
    expect(legPair(SPEC, mat).children).toHaveLength(2)
  })

  it('两条腿分处身体两侧 —— 一条整体在 +z，另一条整体在 −z', () => {
    const pair = legPair(SPEC, mat)
    const [a, b] = pair.children
    const za = worldZs(a)
    const zb = worldZs(b)
    // 每条腿自身不该跨过中线：最小值与最大值同号
    const spans = [za, zb].map((zs) => ({ min: Math.min(...zs), max: Math.max(...zs) }))
    for (const s of spans) {
      expect(
        Math.sign(s.min) === Math.sign(s.max) || Math.abs(s.min) < 1e-6 || Math.abs(s.max) < 1e-6,
        `一条腿从 z=${s.min.toFixed(2)} 跨到 z=${s.max.toFixed(2)}，说明它斜穿了身体中线`,
      ).toBe(true)
    }
    // 两条腿必须在相反侧
    expect(Math.sign(spans[0].max)).toBe(-Math.sign(spans[1].max))
  })

  it('两条腿关于 z=0 平面严格对称', () => {
    const pair = legPair(SPEC, mat)
    const [a, b] = pair.children
    const ba = worldBox(a)
    const bb = worldBox(b)
    expect(ba.min.x).toBeCloseTo(bb.min.x, 5)
    expect(ba.max.y).toBeCloseTo(bb.max.y, 5)
    // z 区间互为相反数
    expect(ba.min.z).toBeCloseTo(-bb.max.z, 5)
    expect(ba.max.z).toBeCloseTo(-bb.min.z, 5)
  })

  it('两条腿的基节不在同一侧 —— 曾经的具体症状', () => {
    const pair = legPair(SPEC, mat)
    // leg() 把基节球放在 spec.base，取每条腿最靠近躯干的那部分
    const bases = pair.children.map((child) => {
      const zs = worldZs(child)
      // 基节是 |z| 最小的一批顶点所在的那一侧
      const near = zs.reduce((acc, z) => (Math.abs(z) < Math.abs(acc) ? z : acc), zs[0])
      return Math.sign(near)
    })
    expect(bases[0]).toBe(-bases[1])
  })

  it('单腿的末端落在与基节相同的一侧', () => {
    const l = leg(SPEC, mat)
    const tip = l.userData.tip as THREE.Vector3
    expect(Math.sign(tip.z)).toBe(Math.sign(SPEC.base[2]))
  })
})

describe('其余成对部件', () => {
  it('复眼左右对称', () => {
    const eyes = compoundEyePair({ at: [1, 0.2, 0.4], radius: 0.2 })
    const [r, l] = eyes.children
    expect(worldBox(r).max.z).toBeCloseTo(-worldBox(l).min.z, 5)
  })

  it('触角分处两侧', () => {
    const pair = antennaPair({ base: [1, 0.2, 0.15], length: 1, kind: 'filiform', yaw: 25 }, mat)
    const [r, l] = pair.children
    expect(Math.sign(worldBox(r).max.z)).toBe(-Math.sign(worldBox(l).min.z))
  })
})

describe('wing 的 spread 语义', () => {
  /**
   * 这条测试钉住的是 kit 的**实际**行为，而非直觉行为：
   * spread=0 才是完全侧展，spread=90 是沿体轴向前。
   * 五个物种文件已按实际行为标定过姿态，谁要「顺手修正」这个语义，
   * 会让全部翅膀一起转错方向 —— 所以先让这条测试拦住。
   */
  it('spread=0 时翅指向体侧，spread=90 时翅指向前方', async () => {
    const { wing, membrane } = await import('../kit')
    const base: [number, number, number] = [0, 0, 0.2]
    const lateral = wing({ base, length: 3, width: 1, spread: 0 }, membrane(), undefined, 1)
    const forward = wing({ base, length: 3, width: 1, spread: 90 }, membrane(), undefined, 1)

    const bl = worldBox(lateral)
    const bf = worldBox(forward)
    // 侧展：z 向跨度应远大于 x 向
    expect(bl.max.z - bl.min.z).toBeGreaterThan(bl.max.x - bl.min.x)
    // 向前：x 向跨度应远大于 z 向
    expect(bf.max.x - bf.min.x).toBeGreaterThan(bf.max.z - bf.min.z)
  })
})

describe('spindle 的 flat 语义', () => {
  /**
   * 同样钉住实际行为而非直觉：实现是 `ry = r/flat, rz = r*flat`，
   * 所以 flat>1 是背腹压扁（花金龟那种扁平体型），flat<1 才是侧扁。
   * kit 的文档一度写反，害得物种作者要自己反推公式才敢用。
   */
  it('flat > 1 压扁的是上下（高度），不是左右', async () => {
    const { spindle } = await import('../kit')
    const g = spindle([0, 0, 0], [3, 0, 0], 1, { flat: 2 })
    g.computeBoundingBox()
    const b = g.boundingBox!
    const h = b.max.y - b.min.y
    const w = b.max.z - b.min.z
    expect(h, `flat=2 时高度 ${h.toFixed(2)} 应当明显小于宽度 ${w.toFixed(2)}`).toBeLessThan(w)
  })

  it('flat < 1 压扁的是左右（宽度）', async () => {
    const { spindle } = await import('../kit')
    const g = spindle([0, 0, 0], [3, 0, 0], 1, { flat: 0.5 })
    g.computeBoundingBox()
    const b = g.boundingBox!
    expect(b.max.z - b.min.z).toBeLessThan(b.max.y - b.min.y)
  })
})
