/**
 * 验证本批三个新物种的 builder（黄缘龙虱、梭毒隐翅虫、白星花金龟）：
 * - 能正常构建，不抛异常；所有几何体顶点无 NaN/Infinity
 * - 包围球半径 > 0；anchors 恰好是题目要求的 key 集合，且坐标有限
 * - 总三角面数落在 15 万预算内（打印出来）
 * - 各物种的招牌形态特征——用命名 mesh 的并集包围盒/具名 rig 分组
 *   量取真实渲染出来的尺寸，而不是复述 builder 里的数字，这样删掉/
 *   削弱那个形态特征时断言真的会失败（同 beetles2.test.ts 的手法）。
 */
import * as THREE from 'three'
import { describe, expect, it } from 'vitest'
import { buildDivingBeetle } from '../diving-beetle'
import { buildRoveBeetle } from '../rove-beetle'
import { buildFlowerChafer } from '../flower-chafer'
import type { InsectModel } from '../kit'

const TRIANGLE_BUDGET = 150_000

function inspectGeometry(group: THREE.Group): { nanFound: string[]; triangles: number } {
  const nanFound: string[] = []
  let triangles = 0
  group.traverse((obj) => {
    const mesh = obj as THREE.Mesh
    if (!mesh.isMesh) return
    const geo = mesh.geometry
    const pos = geo.getAttribute('position')
    for (let i = 0; i < pos.count; i++) {
      if (!Number.isFinite(pos.getX(i)) || !Number.isFinite(pos.getY(i)) || !Number.isFinite(pos.getZ(i))) {
        nanFound.push(`${mesh.name || mesh.type}#${i}`)
        break // 一个 mesh 只需报一次
      }
    }
    triangles += geo.index ? geo.index.count / 3 : pos.count / 3
  })
  return { nanFound, triangles }
}

/** anchors 必须恰好是 requiredKeys 这个 key 集合（不多不少），且坐标有限 */
function checkAnchorsExact(model: InsectModel, requiredKeys: string[]) {
  const actualKeys = Object.keys(model.anchors).sort()
  const expectedKeys = [...requiredKeys].sort()
  expect(actualKeys, `anchors key 集合应恰好是 [${expectedKeys.join(', ')}]，实际是 [${actualKeys.join(', ')}]`).toEqual(expectedKeys)
  for (const key of requiredKeys) {
    const v = model.anchors[key]
    expect(v, `anchor ${key} 应为 Vector3`).toBeInstanceOf(THREE.Vector3)
    expect(
      Number.isFinite(v.x) && Number.isFinite(v.y) && Number.isFinite(v.z),
      `anchor ${key} 坐标含 NaN/Infinity: ${v.toArray()}`,
    ).toBe(true)
  }
}

/** 按 mesh.name 收集并集包围盒——量的是真实渲染几何体，不是 builder 里的常量 */
function unionBoxByName(group: THREE.Group, name: string): THREE.Box3 {
  const box = new THREE.Box3()
  group.traverse((obj) => {
    const mesh = obj as THREE.Mesh
    if (mesh.isMesh && mesh.name === name) box.union(new THREE.Box3().setFromObject(mesh))
  })
  return box
}

/** 按 mesh.name 清点数量——白斑、游泳毛这类重复结构用它清点真实生成个数 */
function countMeshesByName(group: THREE.Group, name: string): number {
  let count = 0
  group.traverse((obj) => {
    const mesh = obj as THREE.Mesh
    if (mesh.isMesh && mesh.name === name) count++
  })
  return count
}

function collectMaterials(model: InsectModel): THREE.MeshPhysicalMaterial[] {
  const seen = new Set<THREE.Material>()
  const out: THREE.MeshPhysicalMaterial[] = []
  model.group.traverse((obj) => {
    const mesh = obj as THREE.Mesh
    if (!mesh.isMesh) return
    const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
    for (const mat of mats) {
      const m = mat as THREE.MeshPhysicalMaterial
      if (!m || seen.has(m)) continue
      seen.add(m)
      out.push(m)
    }
  })
  return out
}

describe('黄缘龙虱 buildDivingBeetle', () => {
  const model = buildDivingBeetle()

  it('成功构建且无异常', () => {
    expect(model.group).toBeInstanceOf(THREE.Group)
  })

  it('包围球半径 > 0', () => {
    expect(model.radius).toBeGreaterThan(0)
  })

  it('所有几何体顶点无 NaN', () => {
    const { nanFound } = inspectGeometry(model.group)
    expect(nanFound, `发现 NaN 顶点: ${nanFound.join(', ')}`).toEqual([])
  })

  it('anchors 恰好是 hindleg/elytra/eye/antenna/airStore/body，且无 NaN', () => {
    checkAnchorsExact(model, ['hindleg', 'elytra', 'eye', 'antenna', 'airStore', 'body'])
  })

  it('后足游泳毛 mesh 数 ≥ 12（删掉缘毛这条会失败）', () => {
    const count = countMeshesByName(model.group, 'swim-hair')
    // eslint-disable-next-line no-console
    console.log(`[diving-beetle] swim-hair count = ${count}`)
    expect(count).toBeGreaterThanOrEqual(12)
  })

  it('后足（桨）的 Z 向展开跨度 > 前足的 1.8 倍（删掉桨状特化这条会失败）', () => {
    const hindRig = model.group.getObjectByName('hindleg-rig')
    const foreRig = model.group.getObjectByName('foreleg-rig')
    expect(hindRig, '找不到 hindleg-rig').toBeTruthy()
    expect(foreRig, '找不到 foreleg-rig').toBeTruthy()
    const hindSize = new THREE.Box3().setFromObject(hindRig!).getSize(new THREE.Vector3())
    const foreSize = new THREE.Box3().setFromObject(foreRig!).getSize(new THREE.Vector3())
    // eslint-disable-next-line no-console
    console.log(
      `[diving-beetle] hindZ=${hindSize.z.toFixed(3)} foreZ=${foreSize.z.toFixed(3)} ratio=${(hindSize.z / foreSize.z).toFixed(2)}`,
    )
    expect(hindSize.z, `后足 Z 跨度 ${hindSize.z.toFixed(3)} 应 > 前足 ${foreSize.z.toFixed(3)} 的 1.8 倍`).toBeGreaterThan(
      foreSize.z * 1.8,
    )
  })

  it('三角面数在预算内', () => {
    const { triangles } = inspectGeometry(model.group)
    // eslint-disable-next-line no-console
    console.log(`[diving-beetle] triangles = ${Math.round(triangles)}`)
    expect(triangles).toBeLessThanOrEqual(TRIANGLE_BUDGET)
  })
})

describe('梭毒隐翅虫 buildRoveBeetle', () => {
  const model = buildRoveBeetle()

  it('成功构建且无异常', () => {
    expect(model.group).toBeInstanceOf(THREE.Group)
  })

  it('包围球半径 > 0', () => {
    expect(model.radius).toBeGreaterThan(0)
  })

  it('所有几何体顶点无 NaN', () => {
    const { nanFound } = inspectGeometry(model.group)
    expect(nanFound, `发现 NaN 顶点: ${nanFound.join(', ')}`).toEqual([])
  })

  it('anchors 恰好是 elytra/abdomen/mandible/antenna/eye/leg，且无 NaN', () => {
    checkAnchorsExact(model, ['elytra', 'abdomen', 'mandible', 'antenna', 'eye', 'leg'])
  })

  it('鞘翅的 X 跨度 < 腹部 X 跨度的 0.3（证明鞘翅真的极短）', () => {
    const elytraBox = unionBoxByName(model.group, 'elytra')
    const abdomenBox = unionBoxByName(model.group, 'abdomen')
    expect(elytraBox.isEmpty(), '找不到 elytra 命名的 mesh').toBe(false)
    expect(abdomenBox.isEmpty(), '找不到 abdomen 命名的 mesh').toBe(false)

    const elytraSize = new THREE.Vector3()
    elytraBox.getSize(elytraSize)
    const abdomenSize = new THREE.Vector3()
    abdomenBox.getSize(abdomenSize)

    // eslint-disable-next-line no-console
    console.log(
      `[rove-beetle] elytraSpanX=${elytraSize.x.toFixed(3)} abdomenSpanX=${abdomenSize.x.toFixed(3)} ratio=${(elytraSize.x / abdomenSize.x).toFixed(2)}`,
    )
    expect(
      elytraSize.x,
      `鞘翅 X 跨度 ${elytraSize.x.toFixed(3)} 应 < 腹部 X 跨度 ${abdomenSize.x.toFixed(3)} 的 0.3 倍`,
    ).toBeLessThan(abdomenSize.x * 0.3)
  })

  it('体表材质中不同颜色 ≥ 4 种（证明分段配色真的做了）', () => {
    const mats = collectMaterials(model)
    const colors = new Set(mats.map((m) => m.color.getHexString()))
    // eslint-disable-next-line no-console
    console.log(`[rove-beetle] distinct colors = ${colors.size} (${[...colors].join(',')})`)
    expect(colors.size).toBeGreaterThanOrEqual(4)
  })

  it('三角面数在预算内', () => {
    const { triangles } = inspectGeometry(model.group)
    // eslint-disable-next-line no-console
    console.log(`[rove-beetle] triangles = ${Math.round(triangles)}`)
    expect(triangles).toBeLessThanOrEqual(TRIANGLE_BUDGET)
  })
})

describe('白星花金龟 buildFlowerChafer', () => {
  const model = buildFlowerChafer()

  it('成功构建且无异常', () => {
    expect(model.group).toBeInstanceOf(THREE.Group)
  })

  it('包围球半径 > 0', () => {
    expect(model.radius).toBeGreaterThan(0)
  })

  it('所有几何体顶点无 NaN', () => {
    const { nanFound } = inspectGeometry(model.group)
    expect(nanFound, `发现 NaN 顶点: ${nanFound.join(', ')}`).toEqual([])
  })

  it('anchors 恰好是 elytra/notch/pronotum/eye/antenna/leg，且无 NaN', () => {
    checkAnchorsExact(model, ['elytra', 'notch', 'pronotum', 'eye', 'antenna', 'leg'])
  })

  it('包围盒高度(Y) < 宽度(Z)（证明是扁平体型，与独角仙相反）', () => {
    const box = new THREE.Box3().setFromObject(model.group)
    const size = new THREE.Vector3()
    box.getSize(size)
    // eslint-disable-next-line no-console
    console.log(`[flower-chafer] height(Y)=${size.y.toFixed(3)} width(Z)=${size.z.toFixed(3)} length(X)=${size.x.toFixed(3)}`)
    expect(size.y, `高度 ${size.y.toFixed(3)} 应 < 宽度 ${size.z.toFixed(3)}`).toBeLessThan(size.z)
  })

  it('白斑 mesh 数 ≥ 10（删掉白斑这条会失败）', () => {
    const count = countMeshesByName(model.group, 'white-spot')
    // eslint-disable-next-line no-console
    console.log(`[flower-chafer] white-spot count = ${count}`)
    expect(count).toBeGreaterThanOrEqual(10)
  })

  it('三角面数在预算内', () => {
    const { triangles } = inspectGeometry(model.group)
    // eslint-disable-next-line no-console
    console.log(`[flower-chafer] triangles = ${Math.round(triangles)}`)
    expect(triangles).toBeLessThanOrEqual(TRIANGLE_BUDGET)
  })
})
