/**
 * 验证本批三个新物种的 builder（长戟大兜虫、豉甲、中华金星步甲）：
 * - 能正常构建，不抛异常；所有几何体顶点无 NaN/Infinity
 * - 包围球半径 > 0；anchors 恰好是题目要求的 key 集合，且坐标有限
 * - 总三角面数落在 15 万预算内（打印出来）
 * - 各物种的招牌形态特征——全部从真实渲染出来的几何体反推（命名 mesh
 *   的并集包围盒、mesh 计数、userData 里记录的真实计算点），不复述
 *   builder 里的构造常量，删掉/削弱那个特征时断言真的会失败：
 *   - hercules：胸角 X 跨度 ≥ 躯干（trunk，不含角）X 跨度的 1.0 倍；
 *     胸角与头角在 X 方向有重叠区间（证明合成钳而非各指一方）
 *   - whirligig：复眼 mesh 恰好 4 个（upperEye/lowerEye 各 2），且上下
 *     两对的 Y 坐标区间不重叠（证明真的分离而不是一个球切两半）
 *   - ground-beetle：鞘翅纵脊 mesh ≥ 6（每侧 3 条）；单腿长度（hip→tip
 *     真实 3D 距离，同 beetles2.test.ts 'stilt-leg-rig' 的量取方式）
 *     ≥ 体长 × 0.5
 */
import * as THREE from 'three'
import { describe, expect, it } from 'vitest'
import { buildHerculesBeetle } from '../hercules-beetle'
import { buildWhirligigBeetle } from '../whirligig-beetle'
import { buildGroundBeetle } from '../ground-beetle'
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

/** 统计 group 里 mesh.name 恰好等于 name 的 mesh 个数 */
function countMeshesByName(group: THREE.Group, name: string): number {
  let count = 0
  group.traverse((obj) => {
    const mesh = obj as THREE.Mesh
    if (mesh.isMesh && mesh.name === name) count++
  })
  return count
}

describe('长戟大兜虫 buildHerculesBeetle', () => {
  const model = buildHerculesBeetle()

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

  it('anchors 恰好是 thoracicHorn/headHorn/elytra/eye/leg/pronotum，且无 NaN', () => {
    checkAnchorsExact(model, ['thoracicHorn', 'headHorn', 'elytra', 'eye', 'leg', 'pronotum'])
  })

  it('胸角 X 跨度 ≥ 躯干（不含角）X 跨度的 1.0 倍（证明胸角比身体本体更长）', () => {
    const hornBox = unionBoxByName(model.group, 'thoracicHorn')
    const trunkBox = unionBoxByName(model.group, 'trunk')
    expect(hornBox.isEmpty(), '找不到 thoracicHorn 命名的 mesh').toBe(false)
    expect(trunkBox.isEmpty(), '找不到 trunk 命名的 mesh').toBe(false)

    const hornSize = new THREE.Vector3()
    hornBox.getSize(hornSize)
    const trunkSize = new THREE.Vector3()
    trunkBox.getSize(trunkSize)

    // eslint-disable-next-line no-console
    console.log(
      `[hercules-beetle] thoracicHornSpanX=${hornSize.x.toFixed(3)} trunkSpanX=${trunkSize.x.toFixed(3)} ratio=${(hornSize.x / trunkSize.x).toFixed(2)}`,
    )
    expect(
      hornSize.x,
      `胸角 X 跨度 ${hornSize.x.toFixed(3)} 应 ≥ 躯干 X 跨度 ${trunkSize.x.toFixed(3)} 的 1.0 倍`,
    ).toBeGreaterThanOrEqual(trunkSize.x * 1.0)
  })

  it('胸角与头角在 X 方向有重叠区间（证明上下相对合成钳，而非各指一方）', () => {
    const thoracicBox = unionBoxByName(model.group, 'thoracicHorn')
    const headHornBox = unionBoxByName(model.group, 'headHorn')
    expect(thoracicBox.isEmpty(), '找不到 thoracicHorn 命名的 mesh').toBe(false)
    expect(headHornBox.isEmpty(), '找不到 headHorn 命名的 mesh').toBe(false)

    const overlapMin = Math.max(thoracicBox.min.x, headHornBox.min.x)
    const overlapMax = Math.min(thoracicBox.max.x, headHornBox.max.x)

    // eslint-disable-next-line no-console
    console.log(
      `[hercules-beetle] thoracicHornX=[${thoracicBox.min.x.toFixed(3)}, ${thoracicBox.max.x.toFixed(3)}] headHornX=[${headHornBox.min.x.toFixed(3)}, ${headHornBox.max.x.toFixed(3)}] overlap=[${overlapMin.toFixed(3)}, ${overlapMax.toFixed(3)}]`,
    )
    expect(
      overlapMax,
      `胸角 X 区间 [${thoracicBox.min.x.toFixed(3)}, ${thoracicBox.max.x.toFixed(3)}] 与头角 X 区间 [${headHornBox.min.x.toFixed(3)}, ${headHornBox.max.x.toFixed(3)}] 应有重叠`,
    ).toBeGreaterThan(overlapMin)
  })

  it('三角面数在预算内', () => {
    const { triangles } = inspectGeometry(model.group)
    // eslint-disable-next-line no-console
    console.log(`[hercules-beetle] triangles = ${Math.round(triangles)}`)
    expect(triangles).toBeLessThanOrEqual(TRIANGLE_BUDGET)
  })
})

describe('豉甲 buildWhirligigBeetle', () => {
  const model = buildWhirligigBeetle()

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

  it('anchors 恰好是 upperEye/lowerEye/midleg/elytra/antenna/body，且无 NaN', () => {
    checkAnchorsExact(model, ['upperEye', 'lowerEye', 'midleg', 'elytra', 'antenna', 'body'])
  })

  it('复眼 mesh 恰好 4 个（upperEye 2 个 + lowerEye 2 个）', () => {
    const upperCount = countMeshesByName(model.group, 'upperEye')
    const lowerCount = countMeshesByName(model.group, 'lowerEye')
    // eslint-disable-next-line no-console
    console.log(`[whirligig-beetle] upperEye mesh count=${upperCount} lowerEye mesh count=${lowerCount}`)
    expect(upperCount, 'upperEye 命名的 mesh 应恰好 2 个（左右各一）').toBe(2)
    expect(lowerCount, 'lowerEye 命名的 mesh 应恰好 2 个（左右各一）').toBe(2)
    expect(upperCount + lowerCount, '复眼 mesh 总数应恰好 4 个').toBe(4)
  })

  it('上下两对复眼的 Y 坐标区间不重叠（证明真的分离，而非一个球切两半）', () => {
    const upperBox = unionBoxByName(model.group, 'upperEye')
    const lowerBox = unionBoxByName(model.group, 'lowerEye')
    expect(upperBox.isEmpty(), '找不到 upperEye 命名的 mesh').toBe(false)
    expect(lowerBox.isEmpty(), '找不到 lowerEye 命名的 mesh').toBe(false)

    // eslint-disable-next-line no-console
    console.log(
      `[whirligig-beetle] upperEyeY=[${upperBox.min.y.toFixed(4)}, ${upperBox.max.y.toFixed(4)}] lowerEyeY=[${lowerBox.min.y.toFixed(4)}, ${lowerBox.max.y.toFixed(4)}]`,
    )
    // 上眼整体应严格高于下眼整体：上眼最低点 > 下眼最高点
    expect(
      upperBox.min.y,
      `上眼 Y 下界 ${upperBox.min.y.toFixed(4)} 应严格高于下眼 Y 上界 ${lowerBox.max.y.toFixed(4)}`,
    ).toBeGreaterThan(lowerBox.max.y)
  })

  it('三角面数在预算内', () => {
    const { triangles } = inspectGeometry(model.group)
    // eslint-disable-next-line no-console
    console.log(`[whirligig-beetle] triangles = ${Math.round(triangles)}`)
    expect(triangles).toBeLessThanOrEqual(TRIANGLE_BUDGET)
  })
})

describe('中华金星步甲 buildGroundBeetle', () => {
  const model = buildGroundBeetle()

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

  it('anchors 恰好是 elytra/mandible/leg/eye/antenna/pronotum，且无 NaN', () => {
    checkAnchorsExact(model, ['elytra', 'mandible', 'leg', 'eye', 'antenna', 'pronotum'])
  })

  it('鞘翅纵脊 mesh ≥ 6（每侧 3 条）', () => {
    const ridgeCount = countMeshesByName(model.group, 'ridge')
    // eslint-disable-next-line no-console
    console.log(`[ground-beetle] ridge mesh count=${ridgeCount}`)
    expect(ridgeCount, `纵脊 mesh 数 ${ridgeCount} 应 ≥ 6`).toBeGreaterThanOrEqual(6)
  })

  it('单腿长度（hip→tip 真实 3D 距离）≥ 体长 × 0.5（证明是长而有力的足）', () => {
    const rig = model.group.getObjectByName('stilt-leg-rig') as THREE.Group | null
    expect(rig, '找不到 stilt-leg-rig').toBeTruthy()
    const rightLeg = rig!.children[0] as THREE.Group
    const hip = rightLeg.userData.hip as THREE.Vector3
    const tip = rightLeg.userData.tip as THREE.Vector3
    expect(hip, 'leg userData.hip 缺失').toBeInstanceOf(THREE.Vector3)
    expect(tip, 'leg userData.tip 缺失').toBeInstanceOf(THREE.Vector3)
    const legReach = hip.distanceTo(tip)

    const trunkBox = unionBoxByName(model.group, 'trunk')
    expect(trunkBox.isEmpty(), '找不到 trunk 命名的 mesh').toBe(false)
    const trunkSize = new THREE.Vector3()
    trunkBox.getSize(trunkSize)
    const bodyLen = trunkSize.x

    // eslint-disable-next-line no-console
    console.log(`[ground-beetle] legReach=${legReach.toFixed(3)} bodyLen=${bodyLen.toFixed(3)} ratio=${(legReach / bodyLen).toFixed(2)}`)
    expect(legReach, `腿长 ${legReach.toFixed(3)} 应 ≥ 体长 ${bodyLen.toFixed(3)} 的 0.5 倍`).toBeGreaterThanOrEqual(bodyLen * 0.5)
  })

  it('三角面数在预算内', () => {
    const { triangles } = inspectGeometry(model.group)
    // eslint-disable-next-line no-console
    console.log(`[ground-beetle] triangles = ${Math.round(triangles)}`)
    expect(triangles).toBeLessThanOrEqual(TRIANGLE_BUDGET)
  })
})
