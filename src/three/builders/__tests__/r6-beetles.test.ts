/**
 * 第 6 轮三个甲虫（大黑水龟虫、中华郭公虫、铜绿丽金龟）的 builder 验证：
 * - 构建不抛异常；所有几何体顶点无 NaN/Infinity；包围球半径 > 0
 * - anchors 恰好是题目要求的 key 集合（不多不少），坐标有限
 * - 总三角面数 ≤ 15 万（打印出来）
 * - 各物种一条招牌形态断言，量的都是用户看得见的量，且上下限一起给：
 *
 *   水龟虫：下颚须比触角还长（水龟虫摸世界靠须不靠触角——这是与龙虱最直观
 *   的分辨点），且须长落在头长的 1.2~2.2 倍之间（上限防止又长成标枪）。
 *   须长直接量 'palp' 命名 mesh 的几何包围盒对角线（palp 建在组内绝对坐标、
 *   mesh 无变换，几何包围盒就是真实跨度）；触角长量每个 'antenna' 组的世界
 *   包围盒对角线取最大——两边都是「渲染出来的真实几何」，不是声明值。
 *
 *   郭公虫：红横带在鞘翅 X 向的总覆盖占比 25%~55%。带子是曲面染色薄片
 *   （无实体半径），其 X 跨度只由铺带参数决定；分侧取 userData.side===1 的
 *   三条带各自量世界包围盒 X 跨度求和（三带互不重叠，中心 0.2/0.5/0.8、
 *   各半宽 0.074，用求和而不用并集——并集会把带间的黑色间隔也算进去）。
 *
 *   丽金龟：阔卵形轮廓——身体（elytra∪pronotum∪head∪clypeus 命名 mesh 的
 *   并集包围盒）长宽比 1.3~1.6。只收命名的身体部件，足与触角的外伸不污染
 *   宽度；下限保证不是圆片、上限保证不是长椭圆（corpulenta 的「胖」）。
 */
import * as THREE from 'three'
import { describe, expect, it } from 'vitest'
import { buildWaterScavenger } from '../water-scavenger'
import { buildCheckeredBeetle } from '../checkered-beetle'
import { buildShiningChafer } from '../shining-chafer'
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
        break
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

/** 按 mesh.name 收集并集包围盒——量的是真实渲染几何体（世界坐标）。 */
function unionBoxByName(group: THREE.Group, name: string): THREE.Box3 {
  const box = new THREE.Box3()
  group.traverse((obj) => {
    const mesh = obj as THREE.Mesh
    if (mesh.isMesh && mesh.name === name) box.union(new THREE.Box3().setFromObject(mesh))
  })
  return box
}

/** 按 mesh.name 逐个收集世界包围盒（不并集，供逐条量跨度/求和用）。 */
function boxesByName(group: THREE.Group, name: string, filter?: (mesh: THREE.Mesh) => boolean): THREE.Box3[] {
  const boxes: THREE.Box3[] = []
  group.traverse((obj) => {
    const mesh = obj as THREE.Mesh
    if (mesh.isMesh && mesh.name === name && (!filter || filter(mesh))) boxes.push(new THREE.Box3().setFromObject(mesh))
  })
  return boxes
}

function diag(box: THREE.Box3): number {
  const size = new THREE.Vector3()
  box.getSize(size)
  return size.length()
}

describe('大黑水龟虫 buildWaterScavenger', () => {
  const model = buildWaterScavenger()

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

  it('anchors 恰好是 palp/keel/elytra/eye/leg/antenna，且无 NaN', () => {
    checkAnchorsExact(model, ['palp', 'keel', 'elytra', 'eye', 'leg', 'antenna'])
  })

  it('下颚须比触角长，且须长在头长的 1.2~2.2 倍之间（摸世界靠须不靠触角；上限防标枪）', () => {
    model.group.updateMatrixWorld(true)

    const palpBoxes = boxesByName(model.group, 'palp')
    expect(palpBoxes.length, "找不到 'palp' 命名的 mesh").toBe(2)
    const palpLens = palpBoxes.map(diag)
    const minPalp = Math.min(...palpLens)

    const antennaDiags: number[] = []
    model.group.traverse((obj) => {
      if (obj.name === 'antenna' && (obj as THREE.Group).isGroup) {
        antennaDiags.push(diag(new THREE.Box3().setFromObject(obj)))
      }
    })
    expect(antennaDiags.length, "找不到 'antenna' 命名的触角组").toBeGreaterThan(0)
    const maxAntenna = Math.max(...antennaDiags)

    const headBox = unionBoxByName(model.group, 'head')
    expect(headBox.isEmpty(), "找不到 'head' 命名的 mesh").toBe(false)
    const headSize = new THREE.Vector3()
    headBox.getSize(headSize)
    const headLen = headSize.x
    const ratio = minPalp / headLen

    // eslint-disable-next-line no-console
    console.log(
      `[water-scavenger] palp=${minPalp.toFixed(4)} antenna(max)=${maxAntenna.toFixed(4)} headLenX=${headLen.toFixed(4)} palp/head=${ratio.toFixed(2)}`,
    )
    expect(
      minPalp,
      `下颚须跨度 ${minPalp.toFixed(4)} 应 > 触角最大跨度 ${maxAntenna.toFixed(4)}（水龟虫的须必须比触角显眼）`,
    ).toBeGreaterThan(maxAntenna)
    expect(ratio, `须长/头长 = ${ratio.toFixed(2)} 应 ≥ 1.2`).toBeGreaterThanOrEqual(1.2)
    expect(ratio, `须长/头长 = ${ratio.toFixed(2)} 应 ≤ 2.2（防止须又长成标枪）`).toBeLessThanOrEqual(2.2)
  })

  it('三角面数在预算内', () => {
    const { triangles } = inspectGeometry(model.group)
    // eslint-disable-next-line no-console
    console.log(`[water-scavenger] triangles = ${Math.round(triangles)}`)
    expect(triangles).toBeLessThanOrEqual(TRIANGLE_BUDGET)
  })
})

describe('中华郭公虫 buildCheckeredBeetle', () => {
  const model = buildCheckeredBeetle()

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

  it('anchors 恰好是 band/fuzz/elytra/eye/pronotum/leg，且无 NaN', () => {
    checkAnchorsExact(model, ['band', 'fuzz', 'elytra', 'eye', 'pronotum', 'leg'])
  })

  it('红横带在鞘翅 X 向总覆盖占比 25%~55%（警戒色带既要醒目又不能吞掉黑底）', () => {
    model.group.updateMatrixWorld(true)

    const bandBoxes = boxesByName(model.group, 'band', (mesh) => mesh.userData.side === 1)
    expect(bandBoxes.length, "右侧应恰有 3 条 'band' 命名的横带").toBe(3)

    const elytraBox = unionBoxByName(model.group, 'elytra')
    expect(elytraBox.isEmpty(), "找不到 'elytra' 命名的 mesh").toBe(false)
    const elytraSize = new THREE.Vector3()
    elytraBox.getSize(elytraSize)

    // 三带互不重叠（中心 0.2/0.5/0.8、各半宽 0.074），逐条 X 跨度求和即真实
    // 红色覆盖——用并集会把带间的黑色间隔也算进覆盖，那就量错了对象
    let coveredX = 0
    for (const box of bandBoxes) {
      const size = new THREE.Vector3()
      box.getSize(size)
      coveredX += size.x
    }
    const ratio = coveredX / elytraSize.x

    // eslint-disable-next-line no-console
    console.log(
      `[checkered-beetle] bandsX=${coveredX.toFixed(4)} elytraX=${elytraSize.x.toFixed(4)} coverage=${(ratio * 100).toFixed(1)}%`,
    )
    expect(ratio, `红带 X 向覆盖占比 ${(ratio * 100).toFixed(1)}% 应 ≥ 25%`).toBeGreaterThanOrEqual(0.25)
    expect(ratio, `红带 X 向覆盖占比 ${(ratio * 100).toFixed(1)}% 应 ≤ 55%（黑底必须还在，否则警戒对比消失）`).toBeLessThanOrEqual(0.55)
  })

  it('三角面数在预算内', () => {
    const { triangles } = inspectGeometry(model.group)
    // eslint-disable-next-line no-console
    console.log(`[checkered-beetle] triangles = ${Math.round(triangles)}`)
    expect(triangles).toBeLessThanOrEqual(TRIANGLE_BUDGET)
  })
})

describe('铜绿丽金龟 buildShiningChafer', () => {
  const model = buildShiningChafer()

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

  it('anchors 恰好是 elytra/pronotum/clypeus/antenna/leg/eye，且无 NaN', () => {
    checkAnchorsExact(model, ['elytra', 'pronotum', 'clypeus', 'antenna', 'leg', 'eye'])
  })

  it('身体长宽比 1.3~1.6（阔卵形：下限排除圆片、上限排除长椭圆）', () => {
    model.group.updateMatrixWorld(true)

    const bodyBox = new THREE.Box3()
    for (const name of ['elytra', 'pronotum', 'head', 'clypeus']) {
      const box = unionBoxByName(model.group, name)
      expect(box.isEmpty(), `找不到 '${name}' 命名的 mesh`).toBe(false)
      bodyBox.union(box)
    }
    const size = new THREE.Vector3()
    bodyBox.getSize(size)
    const ratio = size.x / size.z

    // eslint-disable-next-line no-console
    console.log(`[shining-chafer] bodyX=${size.x.toFixed(4)} bodyZ=${size.z.toFixed(4)} ratio=${ratio.toFixed(2)}`)
    expect(ratio, `身体长宽比 ${ratio.toFixed(2)} 应 ≥ 1.3`).toBeGreaterThanOrEqual(1.3)
    expect(ratio, `身体长宽比 ${ratio.toFixed(2)} 应 ≤ 1.6`).toBeLessThanOrEqual(1.6)
  })

  it('三角面数在预算内', () => {
    const { triangles } = inspectGeometry(model.group)
    // eslint-disable-next-line no-console
    console.log(`[shining-chafer] triangles = ${Math.round(triangles)}`)
    expect(triangles).toBeLessThanOrEqual(TRIANGLE_BUDGET)
  })
})
