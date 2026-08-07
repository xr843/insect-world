/**
 * 验证本批三个新物种的 builder（大王花金龟、屁步甲、甘肃鳖甲）：
 * - 能正常构建，不抛异常；所有几何体顶点无 NaN/Infinity
 * - 包围球半径 > 0；anchors 恰好是题目要求的 key 集合，且坐标有限
 * - 总三角面数落在 15 万预算内（打印出来）
 * - 各物种的招牌形态特征——全部从真实渲染出来的几何体反推（命名 mesh
 *   的并集/单体包围盒、mesh 计数、userData 里记录的真实计算点），不
 *   复述 builder 里的构造常量，删掉/削弱那个特征时断言真的会失败：
 *   - goliath：前胸背板白条 mesh ≥ 4 且彼此 Z 区间不重叠（证明是纵条
 *     而非一整片）；头角末端两瓣（headHornFork）中心 Z 坐标异号
 *     （证明真分叉而非单尖）
 *   - bombardier：喷口（sprayTip）mesh 存在，其 X 下界等于全身 X 下界
 *     （证明是全身最靠后的部位，在腹末）；喷口最高点 Y 高于腹部中段
 *     （abdomen）最高点 Y（证明上翘）
 *   - darkling：鞘翅（fusedElytra）是单个 mesh（证明左右已愈合）；
 *     六足使体腹面（abdomen 下缘）离最低足尖的距离 ≥ 体高（fusedElytra
 *     上缘至 abdomen 下缘）的 0.6 倍（证明"踮脚"站姿）
 *
 * ⚠️ finalize() 只平移 group.position（= -center），不改子节点的本地
 * 坐标；kit.leg() 存进 userData.tip/hip 的是子节点本地坐标（未平移）。
 * unionBoxByName() 走 Box3().setFromObject()，量的是世界坐标（已叠加
 * group.position 的平移）。两者混用会因平移量之差算错，因此任何要把
 * userData 里的原始点拿来跟 unionBoxByName() 的包围盒比较的地方，必须
 * 先 `.add(model.group.position)` 转成世界坐标——darkling 的离地间隙
 * 测试就是这么做的（ground-beetle.ts 的先例只测 hip↔tip 的相对距离，
 * 平移不变量，绕开了这个问题；本文件的离地间隙是绝对高度差，绕不开，
 * 必须显式转换）。
 */
import * as THREE from 'three'
import { describe, expect, it } from 'vitest'
import { buildGoliathBeetle } from '../goliath-beetle'
import { buildBombardierBeetle } from '../bombardier-beetle'
import { buildDarklingBeetle } from '../darkling-beetle'
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

/** 按 mesh.name 收集并集包围盒——量的是真实渲染几何体（世界坐标），不是 builder 里的常量 */
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

/** 收集 group 里 mesh.name 恰好等于 name 的各个 mesh **各自独立**的包围盒（不取并集） */
function collectBoxesByName(group: THREE.Group, name: string): THREE.Box3[] {
  const boxes: THREE.Box3[] = []
  group.traverse((obj) => {
    const mesh = obj as THREE.Mesh
    if (mesh.isMesh && mesh.name === name) boxes.push(new THREE.Box3().setFromObject(mesh))
  })
  return boxes
}

/** 全模型（所有 mesh）的真实世界坐标包围盒 */
function wholeModelBox(group: THREE.Group): THREE.Box3 {
  return new THREE.Box3().setFromObject(group)
}

describe('大王花金龟 buildGoliathBeetle', () => {
  const model = buildGoliathBeetle()

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

  it('anchors 恰好是 headHorn/elytra/stripe/eye/leg/pronotum，且无 NaN', () => {
    checkAnchorsExact(model, ['headHorn', 'elytra', 'stripe', 'eye', 'leg', 'pronotum'])
  })

  it('前胸背板白条 mesh ≥ 4，且彼此 Z 区间不重叠（证明是纵条而非一整片）', () => {
    const boxes = collectBoxesByName(model.group, 'stripe')
    // eslint-disable-next-line no-console
    console.log(`[goliath-beetle] stripe mesh count=${boxes.length}`)
    expect(boxes.length, `stripe mesh 数 ${boxes.length} 应 ≥ 4`).toBeGreaterThanOrEqual(4)

    const ranges = boxes.map((b) => ({ min: b.min.z, max: b.max.z })).sort((a, b) => a.min - b.min)
    for (let i = 1; i < ranges.length; i++) {
      // eslint-disable-next-line no-console
      console.log(
        `[goliath-beetle] stripe Z-range[${i - 1}]=[${ranges[i - 1].min.toFixed(3)}, ${ranges[i - 1].max.toFixed(3)}] range[${i}]=[${ranges[i].min.toFixed(3)}, ${ranges[i].max.toFixed(3)}]`,
      )
      expect(
        ranges[i].min,
        `相邻两条纵条的 Z 区间应不重叠：[${ranges[i - 1].min.toFixed(3)}, ${ranges[i - 1].max.toFixed(3)}] vs [${ranges[i].min.toFixed(3)}, ${ranges[i].max.toFixed(3)}]`,
      ).toBeGreaterThanOrEqual(ranges[i - 1].max)
    }
  })

  it('头角末端在 Z 方向分成两瓣（两瓣中心 Z 坐标异号，证明真分叉而非单尖）', () => {
    const boxes = collectBoxesByName(model.group, 'headHornFork')
    // eslint-disable-next-line no-console
    console.log(`[goliath-beetle] headHornFork mesh count=${boxes.length}`)
    expect(boxes.length, 'headHornFork 命名的 mesh 应恰好 2 个（左右各一瓣）').toBe(2)

    const centersZ = boxes.map((b) => (b.min.z + b.max.z) / 2)
    // eslint-disable-next-line no-console
    console.log(`[goliath-beetle] headHornFork centerZ = [${centersZ.map((z) => z.toFixed(3)).join(', ')}]`)
    expect(centersZ[0], '两瓣中心 Z 不应为 0').not.toBe(0)
    expect(centersZ[1], '两瓣中心 Z 不应为 0').not.toBe(0)
    expect(Math.sign(centersZ[0]), `两瓣中心 Z 应异号，实际 [${centersZ.join(', ')}]`).toBe(-Math.sign(centersZ[1]))
  })

  it('三角面数在预算内', () => {
    const { triangles } = inspectGeometry(model.group)
    // eslint-disable-next-line no-console
    console.log(`[goliath-beetle] triangles = ${Math.round(triangles)}`)
    expect(triangles).toBeLessThanOrEqual(TRIANGLE_BUDGET)
  })
})

describe('屁步甲 buildBombardierBeetle', () => {
  const model = buildBombardierBeetle()

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

  it('anchors 恰好是 sprayTip/elytra/mandible/eye/antenna/leg，且无 NaN', () => {
    checkAnchorsExact(model, ['sprayTip', 'elytra', 'mandible', 'eye', 'antenna', 'leg'])
  })

  it('喷口 mesh 存在，且其 X 下界等于全身 X 下界（证明是全身最靠后的部位，在腹末）', () => {
    const sprayBox = unionBoxByName(model.group, 'sprayTip')
    expect(sprayBox.isEmpty(), '找不到 sprayTip 命名的 mesh').toBe(false)
    const bodyBox = wholeModelBox(model.group)

    // eslint-disable-next-line no-console
    console.log(`[bombardier-beetle] sprayTip.min.x=${sprayBox.min.x.toFixed(4)} wholeBody.min.x=${bodyBox.min.x.toFixed(4)}`)
    expect(
      sprayBox.min.x,
      `喷口最靠后点 X=${sprayBox.min.x.toFixed(4)} 应等于全身最靠后点 X=${bodyBox.min.x.toFixed(4)}（即没有任何部位比喷口更靠后）`,
    ).toBeCloseTo(bodyBox.min.x, 5)
  })

  it('喷口最高点 Y 高于腹部中段（abdomen）最高点 Y（证明上翘）', () => {
    const sprayBox = unionBoxByName(model.group, 'sprayTip')
    const abdomenBox = unionBoxByName(model.group, 'abdomen')
    expect(sprayBox.isEmpty(), '找不到 sprayTip 命名的 mesh').toBe(false)
    expect(abdomenBox.isEmpty(), '找不到 abdomen 命名的 mesh').toBe(false)

    // eslint-disable-next-line no-console
    console.log(`[bombardier-beetle] sprayTip.max.y=${sprayBox.max.y.toFixed(4)} abdomen.max.y=${abdomenBox.max.y.toFixed(4)}`)
    expect(
      sprayBox.max.y,
      `喷口最高点 Y=${sprayBox.max.y.toFixed(4)} 应高于腹部中段最高点 Y=${abdomenBox.max.y.toFixed(4)}`,
    ).toBeGreaterThan(abdomenBox.max.y)
  })

  it('三角面数在预算内', () => {
    const { triangles } = inspectGeometry(model.group)
    // eslint-disable-next-line no-console
    console.log(`[bombardier-beetle] triangles = ${Math.round(triangles)}`)
    expect(triangles).toBeLessThanOrEqual(TRIANGLE_BUDGET)
  })
})

describe('甘肃鳖甲 buildDarklingBeetle', () => {
  const model = buildDarklingBeetle()

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

  it('anchors 恰好是 fusedElytra/leg/head/antenna/pronotum/abdomen，且无 NaN', () => {
    checkAnchorsExact(model, ['fusedElytra', 'leg', 'head', 'antenna', 'pronotum', 'abdomen'])
  })

  it('鞘翅是单个 mesh（左右已愈合，不是两片，证明中缝真的消失了）', () => {
    const count = countMeshesByName(model.group, 'fusedElytra')
    // eslint-disable-next-line no-console
    console.log(`[darkling-beetle] fusedElytra mesh count=${count}`)
    expect(count, `fusedElytra 命名的 mesh 应恰好 1 个，实际 ${count} 个`).toBe(1)
  })

  it('体腹面离最低足尖的距离 ≥ 体高的 0.6 倍（证明"踮脚"站姿）', () => {
    const rig = model.group.getObjectByName('stilt-leg-rig') as THREE.Group | null
    expect(rig, '找不到 stilt-leg-rig').toBeTruthy()
    const rightLeg = rig!.children[0] as THREE.Group
    const tipLocal = rightLeg.userData.tip as THREE.Vector3
    expect(tipLocal, 'leg userData.tip 缺失').toBeInstanceOf(THREE.Vector3)
    // userData.tip 是子节点本地坐标（未经 finalize() 的居中平移），
    // 必须叠加 group.position 才能跟 unionBoxByName() 的世界坐标包围盒比较
    const tipWorldY = tipLocal.y + model.group.position.y

    const elytraBox = unionBoxByName(model.group, 'fusedElytra')
    const abdomenBox = unionBoxByName(model.group, 'abdomen')
    expect(elytraBox.isEmpty(), '找不到 fusedElytra 命名的 mesh').toBe(false)
    expect(abdomenBox.isEmpty(), '找不到 abdomen 命名的 mesh').toBe(false)

    const bodyHeight = elytraBox.max.y - abdomenBox.min.y
    const clearance = abdomenBox.min.y - tipWorldY

    // eslint-disable-next-line no-console
    console.log(
      `[darkling-beetle] bodyHeight=${bodyHeight.toFixed(3)} clearance=${clearance.toFixed(3)} ratio=${(clearance / bodyHeight).toFixed(2)}`,
    )
    expect(
      clearance,
      `离地间隙 ${clearance.toFixed(3)} 应 ≥ 体高 ${bodyHeight.toFixed(3)} 的 0.6 倍（=${(bodyHeight * 0.6).toFixed(3)}）`,
    ).toBeGreaterThanOrEqual(bodyHeight * 0.6)
  })

  it('三角面数在预算内', () => {
    const { triangles } = inspectGeometry(model.group)
    // eslint-disable-next-line no-console
    console.log(`[darkling-beetle] triangles = ${Math.round(triangles)}`)
    expect(triangles).toBeLessThanOrEqual(TRIANGLE_BUDGET)
  })
})
