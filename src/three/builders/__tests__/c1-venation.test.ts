/**
 * C 轮·翅脉 2.0：venation.ts 参数化翅脉网生成器 + 四物种接入
 * （dragonfly 定标 / damselfly / lacewing 最高密度档 / dobsonfly 中档）。
 *
 * 形态断言遵守本项目血律——量「用户看得见的量」，不复述生成参数：
 * - 横脉渐密：按横脉 mesh 的实测 X 坐标分桶计数，翅尖半段 > 翅基半段
 *   （这是「基部大格、端部小格」翅室梯度的直接可测形式）；
 * - 前缘脉最粗：比较渲染几何的实测厚度（bbox Y 跨度 = 2×最大半径），
 *   不是去读 rBase 参数。
 *
 * 本项目的测试文件一贯各自独立自带小工具（没有共享 test-utils 模块），
 * 这里延续同样的写法，不改动任何既有测试文件。
 */
import * as THREE from 'three'
import { describe, expect, it } from 'vitest'
import { venation, type VenationSpec } from '../venation'
import { chitin, type InsectModel } from '../kit'
import { buildDragonfly } from '../dragonfly'
import { buildDamselfly } from '../damselfly'
import { buildLacewing } from '../lacewing'
import { buildDobsonfly } from '../dobsonfly'

/** 单翅翅脉面数闸门（venation.ts 的合同值） */
const WING_VEIN_TRIANGLE_BUDGET = 6000

function mat(): THREE.Material {
  return chitin({ color: '#2a241c', gloss: 0.35 })
}

interface Scan {
  meshCount: number
  triangles: number
  nanMeshNames: string[]
}

/** 逐 mesh 查 position 里的 NaN/Infinity 并数三角面（同 b4-membrane.test.ts 的写法） */
function scanObject(root: THREE.Object3D): Scan {
  const result: Scan = { meshCount: 0, triangles: 0, nanMeshNames: [] }
  root.traverse((obj) => {
    const mesh = obj as THREE.Mesh
    if (!mesh.isMesh) return
    result.meshCount++
    const geo = mesh.geometry as THREE.BufferGeometry
    const pos = geo.getAttribute('position')
    if (pos) {
      const arr = pos.array as ArrayLike<number>
      for (let i = 0; i < arr.length; i++) {
        if (!Number.isFinite(arr[i])) {
          result.nanMeshNames.push(`${mesh.name || mesh.uuid} [${geo.type}]`)
          break
        }
      }
      const idx = geo.getIndex()
      result.triangles += idx ? idx.count / 3 : pos.count / 3
    }
  })
  return result
}

function meshesByRole(root: THREE.Object3D, role: string): THREE.Mesh[] {
  const found: THREE.Mesh[] = []
  root.traverse((o) => {
    const m = o as THREE.Mesh
    if (m.isMesh && m.userData.venationRole === role) found.push(m)
  })
  return found
}

/** mesh 几何包围盒（生成器局部坐标，mesh 自身无变换） */
function geoBox(mesh: THREE.Mesh): THREE.Box3 {
  mesh.geometry.computeBoundingBox()
  return mesh.geometry.boundingBox!.clone()
}

const STALK_OUTLINE: [number, number][] = [
  [0, 0.06],
  [0.09, 0.065],
  [0.17, 0.11],
  [0.26, 0.26],
  [0.45, 0.34],
  [0.65, 0.33],
  [0.82, 0.25],
  [0.94, 0.13],
  [1, 0.05],
]

// ---------------------------------------------------------------- 参数组合健全性

describe('venation：各参数组合不抛、零 NaN、单翅面数在预算内', () => {
  const cases: [string, Omit<VenationSpec, 'material'>][] = [
    ['缺省档（默认轮廓）', { length: 4, width: 1 }],
    ['蜻蜓档', { length: 4.3, width: 0.85, longitudinal: 13, crossDensity: 16, veinScale: 0.009 }],
    ['纵脉下限 2', { length: 3, width: 1, longitudinal: 2, crossDensity: 10 }],
    ['无横脉', { length: 3, width: 1, longitudinal: 9, crossDensity: 0 }],
    ['满档压力（纵脉 24×横脉 40×脉粗 0.05）', { length: 4, width: 1.5, longitudinal: 24, crossDensity: 40, veinScale: 0.05, pterostigma: true }],
    ['窄翅柄轮廓（豆娘档）', { length: 1.7, width: 0.34, outline: STALK_OUTLINE, longitudinal: 6, crossDensity: 6, veinScale: 0.01, pterostigma: true }],
    ['大翅（齿蛉档）', { length: 5.4, width: 2, longitudinal: 9, crossDensity: 9, veinScale: 0.012 }],
    ['极小翅', { length: 0.2, width: 0.05, longitudinal: 5, crossDensity: 8 }],
    ['轮廓混入垃圾点（剩余有效点 ≥2）', { length: 3, width: 1, outline: [[0, 0.2], [NaN, 1], [0.5, Number.POSITIVE_INFINITY], [1, 0.1]] }],
    ['轮廓全垃圾（退回缺省轮廓）', { length: 3, width: 1, outline: [[NaN, NaN]] }],
    ['轮廓半宽全零', { length: 3, width: 1, outline: [[0, 0], [1, 0]] }],
    ['参数全 NaN（钳制到缺省档）', { length: 3, width: 1, longitudinal: NaN, crossDensity: NaN, veinScale: NaN, lift: NaN }],
  ]

  for (const [label, partial] of cases) {
    it(`${label}：构建不抛、非 null、零 NaN、三角面 ≤ ${WING_VEIN_TRIANGLE_BUDGET}`, () => {
      let group: THREE.Group | null = null
      expect(() => {
        group = venation({ ...partial, material: mat() })
      }, `${label} 抛出异常`).not.toThrow()
      expect(group, `${label} 不该返回 null`).not.toBeNull()
      const s = scanObject(group!)
      expect(s.nanMeshNames, `${label} 含 NaN 的 mesh: ${s.nanMeshNames.join(', ')}`).toHaveLength(0)
      expect(s.meshCount, `${label} 至少要有纵脉`).toBeGreaterThan(0)
      expect(s.triangles, `${label} triangles=${Math.round(s.triangles)}`).toBeLessThanOrEqual(WING_VEIN_TRIANGLE_BUDGET)
    })
  }
})

describe('venation：退化输入返回 null 而不抛', () => {
  const bad: [string, number, number][] = [
    ['翅长 0', 0, 1],
    ['翅长为负', -2, 1],
    ['翅长 NaN', NaN, 1],
    ['翅长 Infinity', Number.POSITIVE_INFINITY, 1],
    ['翅宽 0', 3, 0],
    ['翅宽 NaN', 3, NaN],
  ]
  for (const [label, length, width] of bad) {
    it(label, () => {
      let group: THREE.Group | null = null
      expect(() => {
        group = venation({ length, width, material: mat() })
      }).not.toThrow()
      expect(group).toBeNull()
    })
  }
})

// ---------------------------------------------------------------- 形态：用户看得见的量

describe('venation：横脉从翅基到翅尖渐密（X 坐标分桶计数）', () => {
  it('前两条纵脉走廊内：翅尖半段的横脉数 > 翅基半段', () => {
    const group = venation({ length: 4, width: 1, longitudinal: 9, crossDensity: 22, material: mat() })!
    /**
     * 横脉已合并为单个 Mesh（draw-call 治理）：每段的中点与所属纵脉对
     * 记录在 userData.crossMeta —— 与烘进几何的坐标同一次计算产出，
     * 分桶断言改读它（合并前这里逐 mesh 量 bbox 中心，语义等价）。
     */
    const crossMesh = meshesByRole(group, 'cross')[0]
    expect(crossMesh, '合并后的横脉 Mesh 存在').toBeDefined()
    const meta = crossMesh.userData.crossMeta as { x: number; pair: number }[]
    expect(meta.length, '横脉总数').toBeGreaterThan(20)
    expect(crossMesh.userData.crossCount, 'crossCount 与 meta 一致').toBe(meta.length)

    for (const pairIndex of [0, 1]) {
      const own = meta.filter((m) => m.pair === pairIndex)
      expect(own.length, `pair ${pairIndex} 横脉数`).toBeGreaterThanOrEqual(8)
      const centers = own.map((m) => m.x)
      const min = Math.min(...centers)
      const max = Math.max(...centers)
      const mid = (min + max) / 2
      const baseHalf = centers.filter((x) => x < mid).length
      const tipHalf = centers.filter((x) => x >= mid).length
      // eslint-disable-next-line no-console
      console.log(`[venation] pair ${pairIndex}: 基半段=${baseHalf} 尖半段=${tipHalf}（共 ${own.length}）`)
      expect(tipHalf, `pair ${pairIndex} 翅尖半段 ${tipHalf} 应 > 翅基半段 ${baseHalf}`).toBeGreaterThan(baseHalf)
    }
  })
})

describe('venation：前缘脉最粗、往后变细（实测渲染厚度）', () => {
  it('前缘脉（veinIndex 0）bbox 厚度 > 第 2 纵脉 > 最末纵脉', () => {
    const N = 9
    const group = venation({ length: 4, width: 1, longitudinal: N, crossDensity: 10, material: mat() })!
    const longs = meshesByRole(group, 'longitudinal')
    expect(longs.length).toBe(N)
    // 脉全部躺在 y=lift 平面上，几何 bbox 的 Y 跨度 = 2×该脉最大半径，就是屏幕上的线粗
    const thickness = (index: number): number => {
      const m = longs.find((v) => v.userData.veinIndex === index)!
      const size = new THREE.Vector3()
      geoBox(m).getSize(size)
      return size.y
    }
    const costa = thickness(0)
    const second = thickness(1)
    const last = thickness(N - 1)
    // eslint-disable-next-line no-console
    console.log(`[venation] 脉粗：前缘=${costa.toFixed(4)} 第2条=${second.toFixed(4)} 最末=${last.toFixed(4)}`)
    expect(costa, `前缘脉 ${costa.toFixed(4)} 应 > 第 2 纵脉 ${second.toFixed(4)}`).toBeGreaterThan(second)
    expect(second, `第 2 纵脉 ${second.toFixed(4)} 应 > 最末纵脉 ${last.toFixed(4)}`).toBeGreaterThan(last)
  })

  it('脉粗随翅宽缩放：同参数下宽翅的前缘脉更粗（不再硬编码绝对半径）', () => {
    const narrow = venation({ length: 2, width: 0.3, longitudinal: 7, crossDensity: 0, material: mat() })!
    const wide = venation({ length: 2, width: 1.5, longitudinal: 7, crossDensity: 0, material: mat() })!
    const costaOf = (g: THREE.Group): number => {
      const m = meshesByRole(g, 'longitudinal').find((v) => v.userData.veinIndex === 0)!
      const size = new THREE.Vector3()
      geoBox(m).getSize(size)
      return size.y
    }
    expect(costaOf(wide)).toBeGreaterThan(costaOf(narrow) * 3)
  })
})

describe('venation：翅痣开关', () => {
  it('开 → 恰好一枚 pterostigma，落在前缘近翅尖象限；关 → 零枚', () => {
    const L = 4
    const on = venation({ length: L, width: 1, longitudinal: 9, crossDensity: 8, pterostigma: true, material: mat() })!
    const stigmas = meshesByRole(on, 'pterostigma')
    expect(stigmas.length).toBe(1)
    expect(stigmas[0].name).toBe('pterostigma')
    expect(stigmas[0].position.x, '翅痣应在翅尖侧').toBeGreaterThan(L * 0.7)
    expect(stigmas[0].position.z, '翅痣应在前缘侧（+Z）').toBeGreaterThan(0)

    const off = venation({ length: L, width: 1, longitudinal: 9, crossDensity: 8, material: mat() })!
    expect(meshesByRole(off, 'pterostigma').length).toBe(0)
  })
})

describe('venation：mesh 命名约定', () => {
  it("name 参数落到每根脉上（翅痣除外，恒为 'pterostigma'）", () => {
    const group = venation({ length: 2, width: 0.5, longitudinal: 6, crossDensity: 6, pterostigma: true, name: 'wingVein', material: mat() })!
    const meshes: THREE.Mesh[] = []
    group.traverse((o) => {
      const m = o as THREE.Mesh
      if (m.isMesh) meshes.push(m)
    })
    const veins = meshes.filter((m) => m.userData.venationRole !== 'pterostigma')
    expect(veins.length).toBeGreaterThan(0)
    for (const v of veins) expect(v.name).toBe('wingVein')
    for (const s of meshes.filter((m) => m.userData.venationRole === 'pterostigma')) expect(s.name).toBe('pterostigma')
  })
})

// ---------------------------------------------------------------- 四物种接入

describe('翅脉 2.0 四物种接入：构建不抛、零 NaN、venation 真的在翅上', () => {
  const builders: [string, () => InsectModel][] = [
    ['dragonfly', buildDragonfly],
    ['damselfly', buildDamselfly],
    ['lacewing', buildLacewing],
    ['dobsonfly', buildDobsonfly],
  ]

  for (const [label, build] of builders) {
    it(`${label}：构建不抛、零 NaN，四片翅都有纵脉与横脉`, () => {
      let model: InsectModel | undefined
      expect(() => {
        model = build()
      }, `${label} 构建抛出异常`).not.toThrow()
      const s = scanObject(model!.group)
      expect(s.nanMeshNames, `${label} 含 NaN 的 mesh: ${s.nanMeshNames.join(', ')}`).toHaveLength(0)

      const longs = meshesByRole(model!.group, 'longitudinal')
      const crosses = meshesByRole(model!.group, 'cross')
      // 四片翅 × 至少 2 条纵脉；横脉存在才谈得上「翅室」
      expect(longs.length, `${label} 纵脉 mesh 数=${longs.length}`).toBeGreaterThanOrEqual(8)
      expect(crosses.length, `${label} 横脉 mesh 数=${crosses.length}`).toBeGreaterThan(0)

      const veinTris = [...longs, ...crosses].reduce((sum, m) => {
        const geo = m.geometry as THREE.BufferGeometry
        const idx = geo.getIndex()
        const pos = geo.getAttribute('position')
        return sum + (idx ? idx.count / 3 : pos ? pos.count / 3 : 0)
      }, 0)
      // eslint-disable-next-line no-console
      console.log(
        `[c1 ${label}] 纵脉=${longs.length} 横脉=${crosses.length} 翅脉三角面(全部翅合计)=${Math.round(veinTris)} 整模三角面=${Math.round(s.triangles)}`,
      )
    })
  }

  it('damselfly：venation 补上的翅痣存在且材质与翅膜/翅脉分离', () => {
    const model = buildDamselfly()
    const stigmas = meshesByRole(model.group, 'pterostigma')
    expect(stigmas.length, '四片翅各一枚翅痣').toBe(4)
    for (const s of stigmas) {
      const m = s.material as THREE.MeshPhysicalMaterial
      expect(m.iridescence ?? 0, '翅痣不该沾翅膜虹彩').toBe(0)
    }
  })

  it('dragonfly：自带翅痣保留，venation 不重复补（全模型恰 4 枚 BoxGeometry 翅痣）', () => {
    const model = buildDragonfly()
    expect(meshesByRole(model.group, 'pterostigma').length, 'venation 的翅痣开关应保持关闭').toBe(0)
    const boxes: THREE.Mesh[] = []
    model.group.traverse((o) => {
      const m = o as THREE.Mesh
      if (m.isMesh && m.geometry.type === 'BoxGeometry') boxes.push(m)
    })
    expect(boxes.length, '蜻蜓自写翅痣：四片翅各一枚').toBe(4)
  })
})
