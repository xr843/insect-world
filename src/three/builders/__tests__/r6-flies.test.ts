/**
 * 验证第 6 轮四个新物种的 builder（食虫虻、大蚊、螳蛉、石蛾——后者是
 * 本项目第 14 个目·毛翅目）：
 * - 通规：能构建不抛异常；顶点无 NaN/Infinity；包围球半径 > 0；
 *   anchors 恰好是题目要求的 key 集合；三角面数 ≤ 15 万；
 *   自写/kit 触角都挂了微动钩子（name='antenna' + userData.base）。
 * - 招牌断言全部量"看得见的量"（网格包围盒 / mesh 计数 / 材质标量），
 *   不复述 builder 参数；"长"的特征上下限齐给：
 *
 *   食虫虻：mystax 髭簇的毛 mesh ≥ 12 根且整簇位于头前下方（比眼
 *   anchor 更靠前、更低——它是护在口器上方的前伸毛刷，长到头顶就不是
 *   mystax 了）；平衡棒是独立小 mesh（≥4 个、每个对角线 ≤ 体长 15%，
 *   区别于大蚊的"最显眼档"）；翅面 mesh 恰好 2 片（双翅目一对翅）；
 *   两复眼分开不越中线（dichoptic，与食蚜蝇的 holoptic 相反）；
 *   腹修长渐尖：长/粗比 ∈ [3.2, 6]（上限防细成针）。
 *
 *   大蚊：六条腿每条的包围盒对角线 / 体长 ∈ [1.5, 2.2]——下限钉住
 *   "极细极长"，上限防长成蜘蛛。腿几乎伸直微弯，对角线≈伸展长度，
 *   量的是真实网格不是段长参数。平衡棒"全昆虫最显眼"：存在单个
 *   haltere mesh 对角线 ≥ 体长 12%（长柄），与食虫虻的 ≤15% 单 mesh
 *   上限分属两档。翅面恰好 2 片。
 *
 *   螳蛉：趋同演化的两个招牌必须**同框**——(a) 螳螂式前足：胫节
 *   ('raptorialTibia') 与腿节 ('raptorialFemur') 的 X 范围重叠 ≥ 胫节
 *   X 跨度的一半（贝塞尔反折把镰刀勾回腿节下方；直伸的胫节重叠≈0），
 *   腿节内缘刺 ≥ 8 枚；(b) 脉翅目网翅：venation 生成的 'vein' mesh
 *   ≥ 80 根。a、b 在同一个模型上同时成立才是螳蛉。
 *
 *   石蛾：翅屋脊合拢——全部 'hairyWing' 翅面的并集 Y 向跨度 > Z 向
 *   跨度（人字屋顶立起来，不是平摊）；翅材质 sheen === 1（velvet 档，
 *   "毛翅"的材质事实，membrane() 做不到）；长触角**向前平伸**：每根
 *   触角组 X 跨度 ∈ 体长的 [0.8, 1.4] 倍（上限防标枪），且触角前端
 *   伸出头前（max.x 大于躯干 max.x——蛾类触角后收，石蛾前伸）；
 *   下颚须 'palp' mesh ≥ 2。
 */
import * as THREE from 'three'
import { describe, expect, it } from 'vitest'
import { buildRobberFly } from '../robber-fly'
import { buildCraneFly } from '../crane-fly'
import { buildMantidfly } from '../mantidfly'
import { buildCaddisfly } from '../caddisfly'
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

/** 按 mesh.name 收集并集包围盒（世界坐标，量的是真实渲染几何体） */
function unionBoxByName(group: THREE.Group, name: string): THREE.Box3 {
  const box = new THREE.Box3()
  group.traverse((obj) => {
    const mesh = obj as THREE.Mesh
    if (mesh.isMesh && mesh.name === name) box.union(new THREE.Box3().setFromObject(mesh))
  })
  return box
}

function countMeshByName(group: THREE.Group, name: string): number {
  let n = 0
  group.traverse((obj) => {
    const mesh = obj as THREE.Mesh
    if (mesh.isMesh && mesh.name === name) n++
  })
  return n
}

/** 躯干体长：head/thorax/abdomen 三块命名 mesh 并集的 X 跨度（翅、腿、触角不计入） */
function bodyLengthX(group: THREE.Group): number {
  const box = new THREE.Box3()
  for (const name of ['head', 'thorax', 'abdomen']) box.union(unionBoxByName(group, name))
  expect(box.isEmpty(), '找不到躯干命名 mesh（head/thorax/abdomen）').toBe(false)
  const size = new THREE.Vector3()
  box.getSize(size)
  return size.x
}

/** 触角微动钩子普查（铁律）：name='antenna' 且 userData.base 为数组的组 ≥ 2 */
function checkAntennaHooks(model: InsectModel, speciesTag: string) {
  let hooks = 0
  model.group.traverse((o) => {
    if (o.name === 'antenna' && Array.isArray(o.userData?.base)) hooks++
  })
  expect(hooks, `[${speciesTag}] 触角微动钩子（name='antenna' + userData.base）应 ≥ 2，实际 ${hooks}`).toBeGreaterThanOrEqual(2)
}

// ================================================================ 食虫虻

describe('食虫虻 buildRobberFly', () => {
  const model = buildRobberFly()

  it('成功构建且无异常', () => {
    expect(model.group).toBeInstanceOf(THREE.Group)
    expect(model.radius).toBeGreaterThan(0)
  })

  it('所有几何体顶点无 NaN', () => {
    const { nanFound } = inspectGeometry(model.group)
    expect(nanFound, `发现 NaN 顶点: ${nanFound.join(', ')}`).toEqual([])
  })

  it('anchors 恰好是 mystax/foreleg/wing/eye/haltere/abdomen，且无 NaN', () => {
    checkAnchorsExact(model, ['mystax', 'foreleg', 'wing', 'eye', 'haltere', 'abdomen'])
  })

  it('触角挂了微动钩子', () => {
    checkAntennaHooks(model, 'robber-fly')
  })

  it('mystax 髭簇：≥12 根毛 mesh，整簇位于头前下方（比眼更靠前、更低）', () => {
    model.group.updateMatrixWorld(true)
    const count = countMeshByName(model.group, 'mystax')
    expect(count, 'mystax 毛 mesh 数').toBeGreaterThanOrEqual(12)

    const box = unionBoxByName(model.group, 'mystax')
    const center = new THREE.Vector3()
    box.getCenter(center)
    const eye = model.anchors.eye
    // eslint-disable-next-line no-console
    console.log(`[robber-fly] mystax count=${count} center=(${center.x.toFixed(3)}, ${center.y.toFixed(3)}) eyeAnchor=(${eye.x.toFixed(3)}, ${eye.y.toFixed(3)})`)
    expect(center.x, `mystax 中心 X ${center.x.toFixed(3)} 应比眼 anchor X ${eye.x.toFixed(3)} 更靠前（护面刷长在口器上方）`).toBeGreaterThan(eye.x)
    expect(center.y, `mystax 中心 Y ${center.y.toFixed(3)} 应低于眼 anchor Y ${eye.y.toFixed(3)}（在口器上方 = 眼下方，不是头顶毛）`).toBeLessThan(eye.y)
  })

  it('平衡棒：独立小 mesh ≥4 个（左右柄+球），每个对角线 ≤ 体长 15%', () => {
    model.group.updateMatrixWorld(true)
    const bodyLen = bodyLengthX(model.group)
    const diagonals: number[] = []
    model.group.traverse((obj) => {
      const mesh = obj as THREE.Mesh
      if (!mesh.isMesh || mesh.name !== 'haltere') return
      const size = new THREE.Vector3()
      new THREE.Box3().setFromObject(mesh).getSize(size)
      diagonals.push(size.length())
    })
    // eslint-disable-next-line no-console
    console.log(`[robber-fly] haltere meshes=${diagonals.length} maxDiag=${Math.max(...diagonals).toFixed(3)} bodyLen=${bodyLen.toFixed(3)}`)
    expect(diagonals.length, 'haltere mesh 数（左右各柄+球）').toBeGreaterThanOrEqual(4)
    for (const d of diagonals) {
      expect(d, `平衡棒单 mesh 对角线 ${d.toFixed(3)} 应 ≤ 体长 ${bodyLen.toFixed(3)} 的 15%（它是"小锤"）`).toBeLessThanOrEqual(bodyLen * 0.15)
    }
  })

  it('双翅目解剖底线：翅面 mesh 恰好 2 片（一对翅）', () => {
    expect(countMeshByName(model.group, 'wing-membrane')).toBe(2)
  })

  it('两复眼分开（dichoptic）：右侧眼群不越体中线——与食蚜蝇的 holoptic 相反', () => {
    model.group.updateMatrixWorld(true)
    const rightEyeBox = new THREE.Box3()
    const center = new THREE.Vector3()
    model.group.traverse((obj) => {
      const mesh = obj as THREE.Mesh
      if (!mesh.isMesh || mesh.name !== 'robberEye') return
      mesh.getWorldPosition(center)
      if (center.z > 0.02) rightEyeBox.union(new THREE.Box3().setFromObject(mesh))
    })
    expect(rightEyeBox.isEmpty(), '找不到右侧 robberEye mesh').toBe(false)
    // eslint-disable-next-line no-console
    console.log(`[robber-fly] right eye min.z=${rightEyeBox.min.z.toFixed(3)}`)
    expect(rightEyeBox.min.z, `右眼内缘 z=${rightEyeBox.min.z.toFixed(3)} 应 ≥ 0.01（两眼分开、中间是凹陷头顶）`).toBeGreaterThanOrEqual(0.01)
  })

  it('腹部修长渐尖：X 跨度 / 最大截面 ∈ [3.2, 6]', () => {
    model.group.updateMatrixWorld(true)
    const box = unionBoxByName(model.group, 'abdomen')
    expect(box.isEmpty(), '找不到 abdomen 命名 mesh').toBe(false)
    const size = new THREE.Vector3()
    box.getSize(size)
    const ratio = size.x / Math.max(size.y, size.z)
    // eslint-disable-next-line no-console
    console.log(`[robber-fly] abdomen X=${size.x.toFixed(3)} Y=${size.y.toFixed(3)} Z=${size.z.toFixed(3)} ratio=${ratio.toFixed(2)}`)
    expect(ratio, `腹长/粗比 ${ratio.toFixed(2)} 应 ≥ 3.2（修长渐尖）`).toBeGreaterThanOrEqual(3.2)
    expect(ratio, `腹长/粗比 ${ratio.toFixed(2)} 应 ≤ 6（别细成针）`).toBeLessThanOrEqual(6)
  })

  it('三角面数在预算内', () => {
    const { triangles } = inspectGeometry(model.group)
    // eslint-disable-next-line no-console
    console.log(`[robber-fly] triangles = ${Math.round(triangles)}`)
    expect(triangles).toBeLessThanOrEqual(TRIANGLE_BUDGET)
  })
})

// ================================================================ 大蚊

describe('大蚊 buildCraneFly', () => {
  const model = buildCraneFly()

  it('成功构建且无异常', () => {
    expect(model.group).toBeInstanceOf(THREE.Group)
    expect(model.radius).toBeGreaterThan(0)
  })

  it('所有几何体顶点无 NaN', () => {
    const { nanFound } = inspectGeometry(model.group)
    expect(nanFound, `发现 NaN 顶点: ${nanFound.join(', ')}`).toEqual([])
  })

  it('anchors 恰好是 haltere/leg/wing/thorax/abdomen/antenna，且无 NaN', () => {
    checkAnchorsExact(model, ['haltere', 'leg', 'wing', 'thorax', 'abdomen', 'antenna'])
  })

  it('触角挂了微动钩子', () => {
    checkAntennaHooks(model, 'crane-fly')
  })

  it('六条极细极长的腿：每条腿包围盒对角线 / 体长 ∈ [1.5, 2.2]（下限钉招牌、上限防蜘蛛）', () => {
    model.group.updateMatrixWorld(true)
    const bodyLen = bodyLengthX(model.group)
    const legs: THREE.Object3D[] = []
    model.group.traverse((o) => {
      if (o.name === 'craneLeg') legs.push(o)
    })
    expect(legs.length, 'craneLeg 腿组数（三对 = 6）').toBe(6)

    for (const [i, legGroup] of legs.entries()) {
      const size = new THREE.Vector3()
      new THREE.Box3().setFromObject(legGroup).getSize(size)
      const diag = size.length()
      const ratio = diag / bodyLen
      // eslint-disable-next-line no-console
      console.log(`[crane-fly] leg#${i} diag=${diag.toFixed(3)} bodyLen=${bodyLen.toFixed(3)} ratio=${ratio.toFixed(2)}`)
      expect(ratio, `腿#${i} 伸展/体长 = ${ratio.toFixed(2)} 应 ≥ 1.5`).toBeGreaterThanOrEqual(1.5)
      expect(ratio, `腿#${i} 伸展/体长 = ${ratio.toFixed(2)} 应 ≤ 2.2（再长就成蜘蛛了）`).toBeLessThanOrEqual(2.2)
    }
  })

  it('平衡棒全昆虫最显眼档：haltere mesh ≥4 个，且存在单 mesh 对角线 ≥ 体长 12%（长柄）', () => {
    model.group.updateMatrixWorld(true)
    const bodyLen = bodyLengthX(model.group)
    const diagonals: number[] = []
    model.group.traverse((obj) => {
      const mesh = obj as THREE.Mesh
      if (!mesh.isMesh || mesh.name !== 'haltere') return
      const size = new THREE.Vector3()
      new THREE.Box3().setFromObject(mesh).getSize(size)
      diagonals.push(size.length())
    })
    const maxDiag = Math.max(...diagonals)
    // eslint-disable-next-line no-console
    console.log(`[crane-fly] haltere meshes=${diagonals.length} maxDiag=${maxDiag.toFixed(3)} bodyLen=${bodyLen.toFixed(3)} ratio=${(maxDiag / bodyLen).toFixed(3)}`)
    expect(diagonals.length, 'haltere mesh 数').toBeGreaterThanOrEqual(4)
    expect(maxDiag, `最长的平衡棒 mesh 对角线 ${maxDiag.toFixed(3)} 应 ≥ 体长 ${bodyLen.toFixed(3)} 的 12%（大蚊的平衡棒是全昆虫里最显眼的）`).toBeGreaterThanOrEqual(bodyLen * 0.12)
  })

  it('双翅目解剖底线：翅面 mesh 恰好 2 片（一对窄长翅）', () => {
    expect(countMeshByName(model.group, 'wing-membrane')).toBe(2)
  })

  it('三角面数在预算内', () => {
    const { triangles } = inspectGeometry(model.group)
    // eslint-disable-next-line no-console
    console.log(`[crane-fly] triangles = ${Math.round(triangles)}`)
    expect(triangles).toBeLessThanOrEqual(TRIANGLE_BUDGET)
  })
})

// ================================================================ 螳蛉

describe('螳蛉 buildMantidfly', () => {
  const model = buildMantidfly()

  it('成功构建且无异常', () => {
    expect(model.group).toBeInstanceOf(THREE.Group)
    expect(model.radius).toBeGreaterThan(0)
  })

  it('所有几何体顶点无 NaN', () => {
    const { nanFound } = inspectGeometry(model.group)
    expect(nanFound, `发现 NaN 顶点: ${nanFound.join(', ')}`).toEqual([])
  })

  it('anchors 恰好是 raptorialLeg/wing/pronotum/eye/antenna/abdomen，且无 NaN', () => {
    checkAnchorsExact(model, ['raptorialLeg', 'wing', 'pronotum', 'eye', 'antenna', 'abdomen'])
  })

  it('触角挂了微动钩子', () => {
    checkAntennaHooks(model, 'mantidfly')
  })

  it('招牌 a：螳螂式前足——胫节反折扣回腿节（X 范围重叠 ≥ 胫节跨度一半），内缘刺 ≥ 8', () => {
    model.group.updateMatrixWorld(true)
    const femurBox = unionBoxByName(model.group, 'raptorialFemur')
    const tibiaBox = unionBoxByName(model.group, 'raptorialTibia')
    expect(femurBox.isEmpty(), '找不到 raptorialFemur 命名 mesh').toBe(false)
    expect(tibiaBox.isEmpty(), '找不到 raptorialTibia 命名 mesh').toBe(false)

    const tibiaSpanX = tibiaBox.max.x - tibiaBox.min.x
    const overlap = Math.min(tibiaBox.max.x, femurBox.max.x) - Math.max(tibiaBox.min.x, femurBox.min.x)
    // eslint-disable-next-line no-console
    console.log(
      `[mantidfly] femurX=[${femurBox.min.x.toFixed(3)}, ${femurBox.max.x.toFixed(3)}] tibiaX=[${tibiaBox.min.x.toFixed(3)}, ${tibiaBox.max.x.toFixed(3)}] overlap=${overlap.toFixed(3)} tibiaSpan=${tibiaSpanX.toFixed(3)}`,
    )
    expect(
      overlap,
      `胫节与腿节 X 重叠 ${overlap.toFixed(3)} 应 ≥ 胫节 X 跨度 ${tibiaSpanX.toFixed(3)} 的一半——胫节必须反折勾回腿节下方，直伸的胫节重叠≈0`,
    ).toBeGreaterThanOrEqual(tibiaSpanX * 0.5)

    const spines = countMeshByName(model.group, 'raptorialSpine')
    expect(spines, `腿节内缘刺 ${spines} 应 ≥ 8（左右各 5 枚）`).toBeGreaterThanOrEqual(8)
  })

  it('招牌 b：脉翅目网状翅——纵脉 + 横脉总段数 ≥ 80（与招牌 a 同框才是螳蛉）', () => {
    // 横脉已按翅合并为单 Mesh（draw-call 治理），段数从 userData.crossCount 读
    let veins = 0
    model.group.traverse((o) => {
      const m = o as THREE.Mesh
      if (!m.isMesh || m.name !== 'vein') return
      veins += m.userData.venationRole === 'cross' ? (m.userData.crossCount as number) : 1
    })
    // eslint-disable-next-line no-console
    console.log(`[mantidfly] vein segments = ${veins}`)
    expect(veins, `翅脉总段数 ${veins} 应 ≥ 80（两对翅的纵脉扇 + 渐密横脉网）`).toBeGreaterThanOrEqual(80)
  })

  it('三角面数在预算内（含四片网翅的翅脉）', () => {
    const { triangles } = inspectGeometry(model.group)
    // eslint-disable-next-line no-console
    console.log(`[mantidfly] triangles = ${Math.round(triangles)}`)
    expect(triangles).toBeLessThanOrEqual(TRIANGLE_BUDGET)
  })
})

// ================================================================ 石蛾

describe('石蛾 buildCaddisfly（毛翅目——第 14 个目）', () => {
  const model = buildCaddisfly()

  it('成功构建且无异常', () => {
    expect(model.group).toBeInstanceOf(THREE.Group)
    expect(model.radius).toBeGreaterThan(0)
  })

  it('所有几何体顶点无 NaN', () => {
    const { nanFound } = inspectGeometry(model.group)
    expect(nanFound, `发现 NaN 顶点: ${nanFound.join(', ')}`).toEqual([])
  })

  it('anchors 恰好是 hairyWing/antenna/palp/eye/thorax/abdomen，且无 NaN', () => {
    checkAnchorsExact(model, ['hairyWing', 'antenna', 'palp', 'eye', 'thorax', 'abdomen'])
  })

  it('触角挂了微动钩子', () => {
    checkAntennaHooks(model, 'caddisfly')
  })

  it('翅屋脊状合拢：全部 hairyWing 的并集 Y 向跨度 > Z 向跨度（人字屋顶立起来，不是平摊）', () => {
    model.group.updateMatrixWorld(true)
    const box = unionBoxByName(model.group, 'hairyWing')
    expect(box.isEmpty(), '找不到 hairyWing 命名 mesh').toBe(false)
    const size = new THREE.Vector3()
    box.getSize(size)
    // eslint-disable-next-line no-console
    console.log(`[caddisfly] wings Y=${size.y.toFixed(3)} Z=${size.z.toFixed(3)} X=${size.x.toFixed(3)}`)
    expect(size.y, `翅并集 Y 跨度 ${size.y.toFixed(3)} 应 > Z 跨度 ${size.z.toFixed(3)}`).toBeGreaterThan(size.z)
  })

  it('翅面材质是绒毛档：sheen === 1（毛翅目的"毛"，不透亮、非 membrane）', () => {
    const sheens: number[] = []
    model.group.traverse((obj) => {
      const mesh = obj as THREE.Mesh
      if (!mesh.isMesh || mesh.name !== 'hairyWing') return
      const mat = mesh.material as THREE.MeshPhysicalMaterial
      sheens.push(mat.sheen)
    })
    expect(sheens.length, 'hairyWing mesh 数（两对 = 4 片）').toBeGreaterThanOrEqual(4)
    for (const s of sheens) expect(s, '翅面材质 sheen 应为 1（velvet 绒面档）').toBe(1)
  })

  it('长丝状触角向前平伸：每根 X 跨度 ∈ 体长的 [0.8, 1.4] 倍，且前端伸出头前（不是蛾式后收）', () => {
    model.group.updateMatrixWorld(true)
    const bodyLen = bodyLengthX(model.group)
    const bodyBox = new THREE.Box3()
    for (const name of ['head', 'thorax', 'abdomen']) bodyBox.union(unionBoxByName(model.group, name))

    const antennae: THREE.Object3D[] = []
    model.group.traverse((o) => {
      if (o.name === 'antenna' && Array.isArray(o.userData?.base)) antennae.push(o)
    })
    expect(antennae.length, '触角组数').toBeGreaterThanOrEqual(2)

    for (const [i, ant] of antennae.entries()) {
      const box = new THREE.Box3().setFromObject(ant)
      const size = new THREE.Vector3()
      box.getSize(size)
      const ratio = size.x / bodyLen
      // eslint-disable-next-line no-console
      console.log(
        `[caddisfly] antenna#${i} spanX=${size.x.toFixed(3)} bodyLen=${bodyLen.toFixed(3)} ratio=${ratio.toFixed(2)} tipX=${box.max.x.toFixed(3)} headMaxX=${bodyBox.max.x.toFixed(3)}`,
      )
      expect(ratio, `触角#${i} X 跨度/体长 = ${ratio.toFixed(2)} 应 ≥ 0.8（触角长过体长的向前平伸）`).toBeGreaterThanOrEqual(0.8)
      expect(ratio, `触角#${i} X 跨度/体长 = ${ratio.toFixed(2)} 应 ≤ 1.4（别长成标枪）`).toBeLessThanOrEqual(1.4)
      expect(box.max.x, `触角#${i} 前端 X ${box.max.x.toFixed(3)} 应伸出躯干前端 ${bodyBox.max.x.toFixed(3)}（前伸，与蛾类后收相反）`).toBeGreaterThan(bodyBox.max.x)
    }
  })

  it('下颚须存在：palp mesh ≥ 2（左右各一）', () => {
    expect(countMeshByName(model.group, 'palp')).toBeGreaterThanOrEqual(2)
  })

  it('三角面数在预算内', () => {
    const { triangles } = inspectGeometry(model.group)
    // eslint-disable-next-line no-console
    console.log(`[caddisfly] triangles = ${Math.round(triangles)}`)
    expect(triangles).toBeLessThanOrEqual(TRIANGLE_BUDGET)
  })
})
