/**
 * 验证本批两个新物种的 builder（日本埋葬虫、甘薯腊龟甲）：
 * - 能正常构建，不抛异常；所有几何体顶点无 NaN/Infinity
 * - 包围球半径 > 0；anchors 恰好是题目要求的 key 集合，且坐标有限
 * - 总三角面数落在 15 万预算内（打印出来）
 * - 各物种的招牌形态特征——用命名 mesh 的并集包围盒量取真实渲染
 *   出来的尺寸（同 beetles2.test.ts 里 trunk/mandible 的手法），而
 *   不是复述 builder 里的数字，这样删掉/削弱那个形态特征时断言真的
 *   会失败。
 */
import * as THREE from 'three'
import { describe, expect, it } from 'vitest'
import { buildBuryingBeetle } from '../burying-beetle'
import { buildTortoiseBeetle } from '../tortoise-beetle'
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

/** 找到某个 mesh.name 对应的（第一枚）材质，用于量取 opacity/transparent 等材质属性 */
function firstMaterialByName(group: THREE.Group, name: string): THREE.MeshPhysicalMaterial | null {
  let found: THREE.MeshPhysicalMaterial | null = null
  group.traverse((obj) => {
    if (found) return
    const mesh = obj as THREE.Mesh
    if (mesh.isMesh && mesh.name === name) {
      const mat = Array.isArray(mesh.material) ? mesh.material[0] : mesh.material
      found = mat as THREE.MeshPhysicalMaterial
    }
  })
  return found
}

describe('日本埋葬虫 buildBuryingBeetle', () => {
  const model = buildBuryingBeetle()

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

  it('anchors 恰好是 elytra/antenna/abdomen/mandible/eye/pronotum，且无 NaN', () => {
    checkAnchorsExact(model, ['elytra', 'antenna', 'abdomen', 'mandible', 'eye', 'pronotum'])
  })

  it('鞘翅的 X 跨度 < 腹部 X 跨度的 0.8（证明鞘翅截短、腹末露出）', () => {
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
      `[burying-beetle] elytraSpanX=${elytraSize.x.toFixed(3)} abdomenSpanX=${abdomenSize.x.toFixed(3)} ratio=${(elytraSize.x / abdomenSize.x).toFixed(2)}`,
    )
    expect(
      elytraSize.x,
      `鞘翅 X 跨度 ${elytraSize.x.toFixed(3)} 应 < 腹部 X 跨度 ${abdomenSize.x.toFixed(3)} 的 0.8 倍`,
    ).toBeLessThan(abdomenSize.x * 0.8)
  })

  it('触角末端球的半径 ≥ 触角柄半径的 2.5 倍（证明棒状端真的膨大）', () => {
    const clubBox = unionBoxByName(model.group, 'antenna-club')
    const baseBox = unionBoxByName(model.group, 'antenna-base')
    expect(clubBox.isEmpty(), '找不到 antenna-club 命名的 mesh').toBe(false)
    expect(baseBox.isEmpty(), '找不到 antenna-base 命名的 mesh').toBe(false)

    // 球体的顶/底极点在任意 widthSegments/heightSegments 下都精确落在 y=±radius，
    // 因此用包围盒的 Y 向尺寸换算半径，比用 X/Z（依赖分段数是否整除 90°）更稳妥。
    const clubSize = new THREE.Vector3()
    clubBox.getSize(clubSize)
    const baseSize = new THREE.Vector3()
    baseBox.getSize(baseSize)
    const clubRadius = clubSize.y / 2
    const baseRadius = baseSize.y / 2

    // eslint-disable-next-line no-console
    console.log(
      `[burying-beetle] clubRadius=${clubRadius.toFixed(4)} stalkBaseRadius=${baseRadius.toFixed(4)} ratio=${(clubRadius / baseRadius).toFixed(2)}`,
    )
    expect(
      clubRadius,
      `触角端球半径 ${clubRadius.toFixed(4)} 应 ≥ 柄基半径 ${baseRadius.toFixed(4)} 的 2.5 倍`,
    ).toBeGreaterThanOrEqual(baseRadius * 2.5)
  })

  it('三角面数在预算内', () => {
    const { triangles } = inspectGeometry(model.group)
    // eslint-disable-next-line no-console
    console.log(`[burying-beetle] triangles = ${Math.round(triangles)}`)
    expect(triangles).toBeLessThanOrEqual(TRIANGLE_BUDGET)
  })
})

describe('甘薯腊龟甲 buildTortoiseBeetle', () => {
  const model = buildTortoiseBeetle()

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

  it('anchors 恰好是 margin/elytra/head/eye/leg/pronotum，且无 NaN', () => {
    checkAnchorsExact(model, ['margin', 'elytra', 'head', 'eye', 'leg', 'pronotum'])
  })

  it('裙边 mesh 的 Z 向宽度 ≥ 身体本体（trunk，不含裙边）宽度的 1.5 倍（证明罩子比身体大一圈）', () => {
    const marginBox = unionBoxByName(model.group, 'margin')
    const trunkBox = unionBoxByName(model.group, 'trunk')
    expect(marginBox.isEmpty(), '找不到 margin 命名的 mesh').toBe(false)
    expect(trunkBox.isEmpty(), '找不到 trunk 命名的 mesh').toBe(false)

    const marginSize = new THREE.Vector3()
    marginBox.getSize(marginSize)
    const trunkSize = new THREE.Vector3()
    trunkBox.getSize(trunkSize)

    // eslint-disable-next-line no-console
    console.log(
      `[tortoise-beetle] marginSpanZ=${marginSize.z.toFixed(3)} trunkSpanZ=${trunkSize.z.toFixed(3)} ratio=${(marginSize.z / trunkSize.z).toFixed(2)}`,
    )
    expect(
      marginSize.z,
      `裙边 Z 向宽度 ${marginSize.z.toFixed(3)} 应 ≥ 身体本体 Z 向宽度 ${trunkSize.z.toFixed(3)} 的 1.5 倍`,
    ).toBeGreaterThanOrEqual(trunkSize.z * 1.5)
  })

  it('裙边材质半透明：opacity < 0.75 且 transparent === true', () => {
    const mat = firstMaterialByName(model.group, 'margin')
    expect(mat, '找不到 margin 命名 mesh 的材质').toBeTruthy()
    // eslint-disable-next-line no-console
    console.log(`[tortoise-beetle] margin material opacity=${mat!.opacity} transparent=${mat!.transparent}`)
    expect(mat!.opacity, `裙边材质 opacity ${mat!.opacity} 应 < 0.75`).toBeLessThan(0.75)
    expect(mat!.transparent, '裙边材质 transparent 应为 true').toBe(true)
  })

  it('三角面数在预算内', () => {
    const { triangles } = inspectGeometry(model.group)
    // eslint-disable-next-line no-console
    console.log(`[tortoise-beetle] triangles = ${Math.round(triangles)}`)
    expect(triangles).toBeLessThanOrEqual(TRIANGLE_BUDGET)
  })
})
