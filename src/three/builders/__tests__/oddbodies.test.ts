/**
 * 验证本批三个新物种的 builder（中华豆芫菁、阎甲、角蝉）：
 * - 能正常构建，不抛异常；所有几何体顶点无 NaN/Infinity
 * - 包围球半径 > 0；anchors 恰好是题目要求的 key 集合，且坐标有限
 * - 总三角面数落在 15 万预算内（打印出来）
 * - 各物种的招牌形态特征——用命名 mesh 的并集包围盒量取真实渲染
 *   出来的尺寸（同 beetles5.test.ts 的手法），不复述 builder 里的
 *   构造常量，这样删掉/削弱那个形态特征时断言真的会失败。
 *
 * 头盔「最高点」的量法：finalize() 会把整个模型（含头盔）平移到自身
 * 包围盒中心，头盔顶点的世界坐标 Y 因此落在一个跟随头盔本身大小漂移
 * 的原点上，直接拿它跟 body 的 Y 尺寸比没有稳定的参照。改成量「头盔
 * 顶点相对虫体本体底边爬升的高度」——以 bodyCore 包围盒的最低 Y 为
 * 「地面」参照，头盔顶点爬升的高度再与虫体本体自身的 Y 尺寸相比，
 * 不受 finalize() 居中方式影响。
 */
import * as THREE from 'three'
import { describe, expect, it } from 'vitest'
import { buildBlisterBeetle } from '../blister-beetle'
import { buildHisterBeetle } from '../hister-beetle'
import { buildTreehopper } from '../treehopper'
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

describe('中华豆芫菁 buildBlisterBeetle', () => {
  const model = buildBlisterBeetle()

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

  it('anchors 恰好是 elytra/neck/head/antenna/leg/abdomen，且无 NaN', () => {
    checkAnchorsExact(model, ['elytra', 'neck', 'head', 'antenna', 'leg', 'abdomen'])
  })

  it('颈部最窄处 Z 宽度 ≤ 头部最宽处 Z 宽度的 0.5 倍（证明细颈真的够细）', () => {
    model.group.updateMatrixWorld(true)
    const headBox = unionBoxByName(model.group, 'head')
    const neckBox = unionBoxByName(model.group, 'neck')
    expect(headBox.isEmpty(), '找不到 head 命名的 mesh').toBe(false)
    expect(neckBox.isEmpty(), '找不到 neck 命名的 mesh').toBe(false)

    const headSize = new THREE.Vector3()
    headBox.getSize(headSize)
    const neckSize = new THREE.Vector3()
    neckBox.getSize(neckSize)

    // eslint-disable-next-line no-console
    console.log(
      `[blister-beetle] headWidthZ=${headSize.z.toFixed(4)} neckWidthZ=${neckSize.z.toFixed(4)} ratio=${(neckSize.z / headSize.z).toFixed(3)}`,
    )
    expect(
      neckSize.z,
      `颈部 Z 宽度 ${neckSize.z.toFixed(4)} 应 ≤ 头部 Z 宽度 ${headSize.z.toFixed(4)} 的 0.5 倍（${(headSize.z * 0.5).toFixed(4)}）`,
    ).toBeLessThanOrEqual(headSize.z * 0.5)
  })

  it('三角面数在预算内', () => {
    const { triangles } = inspectGeometry(model.group)
    // eslint-disable-next-line no-console
    console.log(`[blister-beetle] triangles = ${Math.round(triangles)}`)
    expect(triangles).toBeLessThanOrEqual(TRIANGLE_BUDGET)
  })
})

describe('阎甲 buildHisterBeetle', () => {
  const model = buildHisterBeetle()

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

  it('anchors 恰好是 elytra/tuckedLeg/head/antenna/pronotum/abdomen，且无 NaN', () => {
    checkAnchorsExact(model, ['elytra', 'tuckedLeg', 'head', 'antenna', 'pronotum', 'abdomen'])
  })

  it('整体包围盒：高 < 宽 且 高 < 长 × 0.5（证明是压扁的方砖而非卵圆甲虫）', () => {
    model.group.updateMatrixWorld(true)
    const box = new THREE.Box3().setFromObject(model.group)
    const size = new THREE.Vector3()
    box.getSize(size)

    // eslint-disable-next-line no-console
    console.log(
      `[hister-beetle] length(x)=${size.x.toFixed(4)} width(z)=${size.z.toFixed(4)} height(y)=${size.y.toFixed(4)}`,
    )
    expect(size.y, `高 ${size.y.toFixed(4)} 应 < 宽 ${size.z.toFixed(4)}`).toBeLessThan(size.z)
    expect(size.y, `高 ${size.y.toFixed(4)} 应 < 长 ${size.x.toFixed(4)} 的 0.5 倍（${(size.x * 0.5).toFixed(4)}）`).toBeLessThan(size.x * 0.5)
  })

  it('足（tuckedLeg）的 Z 向展开跨度 < 体宽（head+pronotum+elytra+abdomen 并集）× 1.4（证明是收拢而非撑开站立）', () => {
    model.group.updateMatrixWorld(true)
    const bodyBox = new THREE.Box3()
    for (const name of ['head', 'pronotum', 'elytra', 'abdomen']) bodyBox.union(unionBoxByName(model.group, name))
    const legBox = unionBoxByName(model.group, 'tuckedLeg')
    expect(bodyBox.isEmpty(), '找不到躯干命名 mesh（head/pronotum/elytra/abdomen）').toBe(false)
    expect(legBox.isEmpty(), '找不到 tuckedLeg 命名的 mesh').toBe(false)

    const bodySize = new THREE.Vector3()
    bodyBox.getSize(bodySize)
    const legSize = new THREE.Vector3()
    legBox.getSize(legSize)

    // eslint-disable-next-line no-console
    console.log(
      `[hister-beetle] bodyWidthZ=${bodySize.z.toFixed(4)} legSpanZ=${legSize.z.toFixed(4)} ratio=${(legSize.z / bodySize.z).toFixed(3)}`,
    )
    expect(
      legSize.z,
      `足 Z 向展开跨度 ${legSize.z.toFixed(4)} 应 < 体宽 ${bodySize.z.toFixed(4)} 的 1.4 倍（${(bodySize.z * 1.4).toFixed(4)}）`,
    ).toBeLessThan(bodySize.z * 1.4)
  })

  it('三角面数在预算内', () => {
    const { triangles } = inspectGeometry(model.group)
    // eslint-disable-next-line no-console
    console.log(`[hister-beetle] triangles = ${Math.round(triangles)}`)
    expect(triangles).toBeLessThanOrEqual(TRIANGLE_BUDGET)
  })
})

describe('角蝉 buildTreehopper', () => {
  const model = buildTreehopper()

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

  it('anchors 恰好是 helmet/wing/eye/rostrum/hindleg/abdomen，且无 NaN', () => {
    checkAnchorsExact(model, ['helmet', 'wing', 'eye', 'rostrum', 'hindleg', 'abdomen'])
  })

  it('头盔包围盒体积 ≥ 虫体本体（bodyCore：头+胸+腹，不含头盔/足/翅）包围盒体积的 1.0 倍', () => {
    model.group.updateMatrixWorld(true)
    const helmetBox = unionBoxByName(model.group, 'helmet')
    const bodyBox = unionBoxByName(model.group, 'bodyCore')
    expect(helmetBox.isEmpty(), '找不到 helmet 命名的 mesh').toBe(false)
    expect(bodyBox.isEmpty(), '找不到 bodyCore 命名的 mesh').toBe(false)

    const helmetSize = new THREE.Vector3()
    helmetBox.getSize(helmetSize)
    const bodySize = new THREE.Vector3()
    bodyBox.getSize(bodySize)
    const helmetVolume = helmetSize.x * helmetSize.y * helmetSize.z
    const bodyVolume = bodySize.x * bodySize.y * bodySize.z

    // eslint-disable-next-line no-console
    console.log(
      `[treehopper] helmetBox=${helmetSize.toArray().map((n) => n.toFixed(3))} vol=${helmetVolume.toFixed(5)} ` +
        `bodyBox=${bodySize.toArray().map((n) => n.toFixed(3))} vol=${bodyVolume.toFixed(5)} ratio=${(helmetVolume / bodyVolume).toFixed(2)}`,
    )
    expect(
      helmetVolume,
      `头盔包围盒体积 ${helmetVolume.toFixed(5)} 应 ≥ 虫体本体包围盒体积 ${bodyVolume.toFixed(5)} 的 1.0 倍`,
    ).toBeGreaterThanOrEqual(bodyVolume)
  })

  it('头盔顶点相对虫体本体底边爬升的高度 ≥ 虫体本体自身 Y 尺寸的 1.8 倍', () => {
    model.group.updateMatrixWorld(true)
    const helmetBox = unionBoxByName(model.group, 'helmet')
    const bodyBox = unionBoxByName(model.group, 'bodyCore')
    expect(helmetBox.isEmpty(), '找不到 helmet 命名的 mesh').toBe(false)
    expect(bodyBox.isEmpty(), '找不到 bodyCore 命名的 mesh').toBe(false)

    const bodyHeight = bodyBox.max.y - bodyBox.min.y
    const helmetClimb = helmetBox.max.y - bodyBox.min.y // 以虫体本体底边为「地面」

    // eslint-disable-next-line no-console
    console.log(
      `[treehopper] bodyMinY=${bodyBox.min.y.toFixed(4)} bodyHeight=${bodyHeight.toFixed(4)} helmetTopY=${helmetBox.max.y.toFixed(4)} helmetClimb=${helmetClimb.toFixed(4)} ratio=${(helmetClimb / bodyHeight).toFixed(2)}`,
    )
    expect(
      helmetClimb,
      `头盔顶点爬升高度 ${helmetClimb.toFixed(4)} 应 ≥ 虫体本体 Y 尺寸 ${bodyHeight.toFixed(4)} 的 1.8 倍（${(bodyHeight * 1.8).toFixed(4)}）`,
    ).toBeGreaterThanOrEqual(bodyHeight * 1.8)
  })

  it('三角面数在预算内', () => {
    const { triangles } = inspectGeometry(model.group)
    // eslint-disable-next-line no-console
    console.log(`[treehopper] triangles = ${Math.round(triangles)}`)
    expect(triangles).toBeLessThanOrEqual(TRIANGLE_BUDGET)
  })
})
