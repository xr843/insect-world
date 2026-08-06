/**
 * 验证本批四个新物种的 builder（中华虎甲、中华大锹甲、日本吉丁、日本蠼螋）：
 * - 能正常构建，不抛异常；所有几何体顶点无 NaN/Infinity
 * - 包围球半径 > 0；anchors 恰好是题目要求的 key 集合，且坐标有限
 * - 总三角面数落在 15 万预算内（打印出来）
 * - 各物种的招牌形态特征——用命名 mesh 的并集包围盒量取真实渲染
 *   出来的尺寸（同 longbodies.test.ts 里 trunk-segment/head-capsule
 *   的手法），而不是复述 builder 里的数字，这样删掉/削弱那个形态
 *   特征时断言真的会失败。
 */
import * as THREE from 'three'
import { describe, expect, it } from 'vitest'
import { buildTigerBeetle } from '../tiger-beetle'
import { buildStagBeetle } from '../stag-beetle'
import { buildJewelBeetle } from '../jewel-beetle'
import { buildEarwig } from '../earwig'
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

describe('中华虎甲 buildTigerBeetle', () => {
  const model = buildTigerBeetle()

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

  it('anchors 恰好是 mandible/elytra/eye/leg/antenna/pronotum，且无 NaN', () => {
    checkAnchorsExact(model, ['mandible', 'elytra', 'eye', 'leg', 'antenna', 'pronotum'])
  })

  it('单腿长度（腿节+胫节，量取 hip→tip 实际 3D 距离）≥ 体长 × 0.5（证明是长腿）', () => {
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
    console.log(`[tiger-beetle] legReach=${legReach.toFixed(3)} bodyLen=${bodyLen.toFixed(3)} ratio=${(legReach / bodyLen).toFixed(2)}`)
    expect(legReach, `腿长 ${legReach.toFixed(3)} 应 ≥ 体长 ${bodyLen.toFixed(3)} 的 0.5 倍`).toBeGreaterThanOrEqual(bodyLen * 0.5)
  })

  it('三角面数在预算内', () => {
    const { triangles } = inspectGeometry(model.group)
    // eslint-disable-next-line no-console
    console.log(`[tiger-beetle] triangles = ${Math.round(triangles)}`)
    expect(triangles).toBeLessThanOrEqual(TRIANGLE_BUDGET)
  })
})

describe('中华大锹甲 buildStagBeetle', () => {
  const model = buildStagBeetle()

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

  it('anchors 恰好是 mandible/elytra/head/antenna/leg/pronotum，且无 NaN', () => {
    checkAnchorsExact(model, ['mandible', 'elytra', 'head', 'antenna', 'leg', 'pronotum'])
  })

  it('大颚部分的 X 向跨度 ≥ 躯干长度的 0.3（证明大颚真的巨大）', () => {
    const mandibleBox = unionBoxByName(model.group, 'mandible')
    const trunkBox = unionBoxByName(model.group, 'trunk')
    expect(mandibleBox.isEmpty(), '找不到 mandible 命名的 mesh').toBe(false)
    expect(trunkBox.isEmpty(), '找不到 trunk 命名的 mesh').toBe(false)

    const mandibleSize = new THREE.Vector3()
    mandibleBox.getSize(mandibleSize)
    const trunkSize = new THREE.Vector3()
    trunkBox.getSize(trunkSize)

    // eslint-disable-next-line no-console
    console.log(
      `[stag-beetle] mandibleSpanX=${mandibleSize.x.toFixed(3)} trunkLenX=${trunkSize.x.toFixed(3)} ratio=${(mandibleSize.x / trunkSize.x).toFixed(2)}`,
    )
    expect(
      mandibleSize.x,
      `大颚 X 跨度 ${mandibleSize.x.toFixed(3)} 应 ≥ 躯干长度 ${trunkSize.x.toFixed(3)} 的 0.3 倍`,
    ).toBeGreaterThanOrEqual(trunkSize.x * 0.3)
  })

  it('三角面数在预算内', () => {
    const { triangles } = inspectGeometry(model.group)
    // eslint-disable-next-line no-console
    console.log(`[stag-beetle] triangles = ${Math.round(triangles)}`)
    expect(triangles).toBeLessThanOrEqual(TRIANGLE_BUDGET)
  })
})

describe('日本吉丁 buildJewelBeetle', () => {
  const model = buildJewelBeetle()

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

  it('anchors 恰好是 elytra/stripe/eye/antenna/pronotum/leg，且无 NaN', () => {
    checkAnchorsExact(model, ['elytra', 'stripe', 'eye', 'antenna', 'pronotum', 'leg'])
  })

  it('至少一个材质 metalness ≥ 0.85 且 iridescence > 0（证明虹彩真的设了）', () => {
    const mats = collectMaterials(model)
    const iridescent = mats.find((m) => (m.metalness ?? 0) >= 0.85 && (m.iridescence ?? 0) > 0)
    expect(
      iridescent,
      `未找到 metalness≥0.85 且 iridescence>0 的材质；实际材质=${JSON.stringify(
        mats.map((m) => ({ metalness: m.metalness, iridescence: m.iridescence })),
      )}`,
    ).toBeTruthy()
  })

  it('三角面数在预算内', () => {
    const { triangles } = inspectGeometry(model.group)
    // eslint-disable-next-line no-console
    console.log(`[jewel-beetle] triangles = ${Math.round(triangles)}`)
    expect(triangles).toBeLessThanOrEqual(TRIANGLE_BUDGET)
  })
})

describe('日本蠼螋 buildEarwig', () => {
  const model = buildEarwig()

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

  it('anchors 恰好是 forceps/elytra/antenna/head/abdomen/leg，且无 NaN', () => {
    checkAnchorsExact(model, ['forceps', 'elytra', 'antenna', 'head', 'abdomen', 'leg'])
  })

  it('鞘翅的 X 跨度 < 腹部 X 跨度的 0.45（证明鞘翅是短的、没盖满腹部）', () => {
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
      `[earwig] elytraSpanX=${elytraSize.x.toFixed(3)} abdomenSpanX=${abdomenSize.x.toFixed(3)} ratio=${(elytraSize.x / abdomenSize.x).toFixed(2)}`,
    )
    expect(
      elytraSize.x,
      `鞘翅 X 跨度 ${elytraSize.x.toFixed(3)} 应 < 腹部 X 跨度 ${abdomenSize.x.toFixed(3)} 的 0.45 倍`,
    ).toBeLessThan(abdomenSize.x * 0.45)
  })

  it('尾铗 mesh 存在且位于体后端', () => {
    const forcepsBox = unionBoxByName(model.group, 'forceps')
    expect(forcepsBox.isEmpty(), '找不到 forceps 命名的 mesh').toBe(false)

    const bodyBox = new THREE.Box3().setFromObject(model.group)
    const forcepsCenter = new THREE.Vector3()
    forcepsBox.getCenter(forcepsCenter)
    // 体后端阈值：整体包围盒最负 X 的 25% 区域（+X 是头部方向；
    // 同 crawlers.test.ts 里螳螂捕捉足"体前 40% 区域"同款判据，
    // 只是这里方向相反——尾铗应落在体*后* 25% 区域）
    const rearThreshold = bodyBox.min.x + (bodyBox.max.x - bodyBox.min.x) * 0.25
    expect(
      forcepsCenter.x,
      `尾铗中心 x=${forcepsCenter.x.toFixed(3)} 应位于身体后 25% 区域（阈值 ${rearThreshold.toFixed(3)}）`,
    ).toBeLessThan(rearThreshold)
  })

  it('三角面数在预算内', () => {
    const { triangles } = inspectGeometry(model.group)
    // eslint-disable-next-line no-console
    console.log(`[earwig] triangles = ${Math.round(triangles)}`)
    expect(triangles).toBeLessThanOrEqual(TRIANGLE_BUDGET)
  })
})
