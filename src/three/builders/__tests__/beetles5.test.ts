/**
 * 验证本批两个新物种的 builder（日本埋葬虫、甘薯腊龟甲）：
 * - 能正常构建，不抛异常；所有几何体顶点无 NaN/Infinity
 * - 包围球半径 > 0；anchors 恰好是题目要求的 key 集合，且坐标有限
 * - 总三角面数落在 15 万预算内（打印出来）
 * - 各物种的招牌形态特征——用命名 mesh 的并集包围盒量取真实渲染
 *   出来的尺寸（同 beetles2.test.ts 里 trunk/mandible 的手法），而
 *   不是复述 builder 里的数字，这样删掉/削弱那个形态特征时断言真的
 *   会失败。
 *
 * 2026-08-06 返工记录：协调者用浏览器实机渲染后发现两处"测试全绿但
 * 看着不像"——tortoise-beetle 的两个 dome 断裂成"两颗分离的蛋"，
 * burying-beetle 的横带是"凸起焊在壳上的软垫"。geometry 本身没有
 * 报错、旧断言（截面积/半径比例）也全过，因为那些断言压根没有测到
 * "连续性"和"贴合度"这两个真正出问题的维度。本文件补的四条新断言
 * 专门测这两个维度，并且都用"逆向从真实渲染几何体量取数字"的方式
 * 写（不复述 builder 里的构造参数），确保改回旧版本时会真的失败——
 * 已用旧版本的构造参数手工验算过，全部确认会 fail。
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

/**
 * 在某个命名 mesh 的所有顶点里，找"世界坐标 x 最接近 xTarget"的那一个，
 * 返回它的世界坐标 y。用于量"接缝正好在哪个高度"——比"窗口内取最大
 * y"更精确，不会被窗口内离接缝稍远、但恰好更高的采样点带偏。
 */
function yNearestX(group: THREE.Group, name: string, xTarget: number): number {
  let bestY = NaN
  let bestDx = Infinity
  group.traverse((obj) => {
    const mesh = obj as THREE.Mesh
    if (!mesh.isMesh || mesh.name !== name) return
    const pos = mesh.geometry.getAttribute('position')
    for (let i = 0; i < pos.count; i++) {
      const world = new THREE.Vector3(pos.getX(i), pos.getY(i), pos.getZ(i)).applyMatrix4(mesh.matrixWorld)
      const dx = Math.abs(world.x - xTarget)
      if (dx < bestDx) {
        bestDx = dx
        bestY = world.y
      }
    }
  })
  return bestY
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

  it('色带贴合鞘翅曲面：顶点到曲面真实半径的径向偏移 < 局部半径的 5%（证明是染色而非焊接物体）', () => {
    model.group.updateMatrixWorld(true)

    // 收集两侧鞘翅各自暴露的截面轴线数据（世界坐标）。两侧共享同一份
    // 原始（z=0）局部数据，分别乘各自 mesh 的 matrixWorld 后，会正确
    // 分开落在 +Z/-Z 两侧，用来跟同一侧的 band 顶点比对。
    type AxisSample = { center: THREE.Vector3; ry: number; rz: number }
    const axisSamples: AxisSample[] = []
    model.group.traverse((obj) => {
      const mesh = obj as THREE.Mesh
      if (!mesh.isMesh || mesh.name !== 'elytra') return
      const centers = mesh.userData.axisCenters as THREE.Vector3[] | undefined
      const secs = mesh.userData.axisSections as { ry: number; rz: number }[] | undefined
      expect(centers, 'elytra mesh 缺少 userData.axisCenters').toBeTruthy()
      expect(secs, 'elytra mesh 缺少 userData.axisSections').toBeTruthy()
      for (let i = 0; i < centers!.length; i++) {
        const worldCenter = centers![i].clone().applyMatrix4(mesh.matrixWorld)
        axisSamples.push({ center: worldCenter, ry: secs![i].ry, rz: secs![i].rz })
      }
    })
    expect(axisSamples.length, '没有采到任何 elytra 截面轴线数据').toBeGreaterThan(0)

    let maxRatio = 0
    let sampleCount = 0
    model.group.traverse((obj) => {
      const mesh = obj as THREE.Mesh
      if (!mesh.isMesh || mesh.name !== 'band') return
      const pos = mesh.geometry.getAttribute('position')
      for (let i = 0; i < pos.count; i++) {
        const world = new THREE.Vector3(pos.getX(i), pos.getY(i), pos.getZ(i)).applyMatrix4(mesh.matrixWorld)

        // 先按 z 同号筛出"同一侧"的轴线样本，再在其中找 x 最接近的——
        // 两侧鞘翅的轴线在 x 上完全重合，不按 side 过滤会把左侧顶点错配
        // 到右侧轴线上。
        const sameSide = axisSamples.filter((s) => Math.sign(s.center.z || 1) === Math.sign(world.z || 1))
        const candidates = sameSide.length > 0 ? sameSide : axisSamples
        let nearest: AxisSample | null = null
        let nearestDx = Infinity
        for (const s of candidates) {
          const dx = Math.abs(s.center.x - world.x)
          if (dx < nearestDx) {
            nearestDx = dx
            nearest = s
          }
        }
        if (!nearest) continue

        const dy = world.y - nearest.center.y
        const dz = world.z - nearest.center.z
        const theta = Math.atan2(dz, dy)
        const cosT = Math.cos(theta)
        const sinT = Math.sin(theta)
        const trueR = 1 / Math.sqrt((cosT / nearest.ry) ** 2 + (sinT / nearest.rz) ** 2)
        const actualR = Math.hypot(dy, dz)

        const ratio = Math.abs(actualR - trueR) / trueR
        if (ratio > maxRatio) maxRatio = ratio
        sampleCount++
      }
    })

    expect(sampleCount, '没有采到任何 band 顶点').toBeGreaterThan(0)
    // eslint-disable-next-line no-console
    console.log(`[burying-beetle] band max radial offset ratio = ${(maxRatio * 100).toFixed(2)}% over ${sampleCount} vertices`)
    expect(maxRatio, `色带顶点最大径向偏移比例 ${(maxRatio * 100).toFixed(2)}% 应 < 5%`).toBeLessThan(0.05)
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

  it('背甲（前胸背板+鞘翅，不含裙边）足够扁平：高度/长度 < 0.3（证明是低矮拱线而非两颗高鼓包）', () => {
    const shellBox = unionBoxByName(model.group, 'pronotum')
    shellBox.union(unionBoxByName(model.group, 'elytra'))
    expect(shellBox.isEmpty(), '找不到 pronotum/elytra 命名的 mesh').toBe(false)

    const shellSize = new THREE.Vector3()
    shellBox.getSize(shellSize)
    const ratio = shellSize.y / shellSize.x

    // eslint-disable-next-line no-console
    console.log(`[tortoise-beetle] shellHeight=${shellSize.y.toFixed(3)} shellLength=${shellSize.x.toFixed(3)} ratio=${ratio.toFixed(3)}`)
    expect(ratio, `背甲高度 ${shellSize.y.toFixed(3)} / 长度 ${shellSize.x.toFixed(3)} = ${ratio.toFixed(3)} 应 < 0.3`).toBeLessThan(0.3)
  })

  it('前胸背板与鞘翅在接缝处平滑接合：高度差 < 两者平均最大高度的 20%（证明是一条连续拱线而非两个台阶）', () => {
    model.group.updateMatrixWorld(true)

    const pronotumBox = unionBoxByName(model.group, 'pronotum')
    const elytraBox = unionBoxByName(model.group, 'elytra')
    expect(pronotumBox.isEmpty(), '找不到 pronotum 命名的 mesh').toBe(false)
    expect(elytraBox.isEmpty(), '找不到 elytra 命名的 mesh').toBe(false)
    const pronotumHeight = pronotumBox.max.y - pronotumBox.min.y
    const elytraHeight = elytraBox.max.y - elytraBox.min.y

    // 接缝在 builder 里是 x=0（前胸背板与鞘翅的分界，见 tortoise-beetle.ts
    // 的 seamX）；用"该命名 mesh 上离 x=0 最近的顶点的高度"分别量两段，
    // 而不是复述 builder 里的常量。
    const seamX = 0
    const pronotumSeamY = yNearestX(model.group, 'pronotum', seamX)
    const elytraSeamY = yNearestX(model.group, 'elytra', seamX)
    expect(Number.isFinite(pronotumSeamY), '找不到 pronotum 上任何顶点').toBe(true)
    expect(Number.isFinite(elytraSeamY), '找不到 elytra 上任何顶点').toBe(true)

    const seamDiff = Math.abs(pronotumSeamY - elytraSeamY)
    const refHeight = (pronotumHeight + elytraHeight) / 2

    // eslint-disable-next-line no-console
    console.log(
      `[tortoise-beetle] pronotumSeamY=${pronotumSeamY.toFixed(4)} elytraSeamY=${elytraSeamY.toFixed(4)} seamDiff=${seamDiff.toFixed(4)} refHeight=${refHeight.toFixed(4)} ratio=${(seamDiff / refHeight).toFixed(3)}`,
    )
    expect(
      seamDiff,
      `接缝处高度差 ${seamDiff.toFixed(4)} 应 < 两者平均最大高度 ${refHeight.toFixed(4)} 的 20%（${(refHeight * 0.2).toFixed(4)}）`,
    ).toBeLessThan(refHeight * 0.2)
  })

  it('三角面数在预算内', () => {
    const { triangles } = inspectGeometry(model.group)
    // eslint-disable-next-line no-console
    console.log(`[tortoise-beetle] triangles = ${Math.round(triangles)}`)
    expect(triangles).toBeLessThanOrEqual(TRIANGLE_BUDGET)
  })
})
