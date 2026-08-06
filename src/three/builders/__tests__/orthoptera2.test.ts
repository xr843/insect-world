/**
 * 蝈螽（螽斯）/ 蝼蛄 / 水黾 / 食蚜蝇 四个新增物种 builder 的健全性测试。
 *
 * 和其它批次一样，这里不做"像不像"的美术评审，只守程序化建模最容易
 * 踩的坑，外加每个物种一条"删掉这个形态特征就会失败"的自检断言：
 *   1. loft() 出 NaN —— 逐个 geometry 检查 position。
 *   2. anchors 恰好是题目要求的 key 集合、坐标有限。
 *   3. 三角面数在 15 万预算内。
 *   4. 形态特征断言（见各 describe 块内注释）。
 *
 * 坐标系说明：finalize() 会把 group.position 平移到 -center，
 * 并把每个 anchor 一起减去 center，但**不会**改动任何 mesh 自身的
 * geometry 顶点（那些顶点从 builder 内部构建时起就没变过）。这意味着
 * "anchor 坐标"和"mesh 顶点坐标"分处两个只差一个常量平移的坐标系。
 * rawAnchor() 把 anchor 减去 group.position，精确换回与 mesh 顶点、
 * 以及各 builder 文件导出的 BASE 常量一致的"建模原始坐标系"，
 * 这样才能把 anchor 和裸顶点放在同一把尺子上比较——这个技巧和
 * hoppers.test.ts 里 locust 用"重新硬编码 hip 常量"是同一个问题的
 * 两种解法，这里因为 4 个新文件都导出了关键锚点常量，选用更不容易
 * 与实现脱节的写法。
 */
import * as THREE from 'three'
import { describe, expect, it } from 'vitest'
import { buildKatydid, ANTENNA_BASE, ANTENNA_LENGTH, HIND_HIP_BASE } from '../katydid'
import { buildMoleCricket, FORE_BASE as MOLE_FORE_BASE } from '../mole-cricket'
import { buildWaterStrider, MID_BASE as WS_MID_BASE, FORE_BASE as WS_FORE_BASE, ABDOMEN_TIP_X } from '../water-strider'
import { buildHoverfly } from '../hoverfly'
import type { InsectModel } from '../kit'

const TRIANGLE_BUDGET = 150_000

// ---------------------------------------------------------------- 通用小工具

interface Scan {
  meshCount: number
  triangles: number
  nanMeshNames: string[]
}

/** 遍历模型的所有 mesh：逐个 geometry 查 position 里的 NaN/Infinity，并数三角面。 */
function scan(model: InsectModel): Scan {
  const result: Scan = { meshCount: 0, triangles: 0, nanMeshNames: [] }
  model.group.traverse((obj) => {
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

function expectFiniteVector(v: THREE.Vector3, label: string) {
  expect(v, label).toBeTruthy()
  expect(Number.isFinite(v.x), `${label}.x`).toBe(true)
  expect(Number.isFinite(v.y), `${label}.y`).toBe(true)
  expect(Number.isFinite(v.z), `${label}.z`).toBe(true)
}

/** anchors 必须恰好是给定 key 集合——不多不少，且坐标有限。 */
function expectExactAnchors(model: InsectModel, required: string[]) {
  const actual = Object.keys(model.anchors).slice().sort()
  const expected = required.slice().sort()
  expect(actual, `anchors 应恰好是 [${expected.join(', ')}]，实际是 [${actual.join(', ')}]`).toEqual(expected)
  for (const key of required) expectFiniteVector(model.anchors[key], `anchors.${key}`)
}

/** 把一个 anchor 换回 finalize() 平移之前的"建模原始坐标系"，见文件头注释。 */
function rawAnchor(model: InsectModel, key: string): THREE.Vector3 {
  return model.anchors[key].clone().sub(model.group.position)
}

function findMeshesByName(model: InsectModel, name: string): THREE.Mesh[] {
  const found: THREE.Mesh[] = []
  model.group.traverse((obj) => {
    const mesh = obj as THREE.Mesh
    if (mesh.isMesh && mesh.name === name) found.push(mesh)
  })
  return found
}

function unionBoxByNames(model: InsectModel, names: string[]): THREE.Box3 {
  const box = new THREE.Box3()
  model.group.traverse((obj) => {
    const mesh = obj as THREE.Mesh
    if (mesh.isMesh && names.includes(mesh.name)) box.union(new THREE.Box3().setFromObject(mesh))
  })
  return box
}

/** 顶点到一条线段所在直线的垂直距离的最大值——从真实几何体量取"最粗/最宽处半径"。 */
function maxPerpDistanceToLine(meshes: THREE.Mesh[], a: THREE.Vector3, b: THREE.Vector3): number {
  const axis = new THREE.Vector3().subVectors(b, a).normalize()
  let maxDist = 0
  const v = new THREE.Vector3()
  const rel = new THREE.Vector3()
  for (const mesh of meshes) {
    const pos = mesh.geometry.getAttribute('position')
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i)
      rel.subVectors(v, a)
      const along = rel.dot(axis)
      const perp = rel.clone().addScaledVector(axis, -along)
      maxDist = Math.max(maxDist, perp.length())
    }
  }
  return maxDist
}

/** 一组 mesh 里所有顶点到给定基点的最大直线距离——用来量"从基点伸出多远"。 */
function maxDistanceFrom(meshes: THREE.Mesh[], base: THREE.Vector3): number {
  let maxDist = 0
  const v = new THREE.Vector3()
  for (const mesh of meshes) {
    const pos = mesh.geometry.getAttribute('position')
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i)
      maxDist = Math.max(maxDist, v.distanceTo(base))
    }
  }
  return maxDist
}

// ==================================================================
describe('优雅蝈螽 buildKatydid', () => {
  it('构建不抛异常，几何体无 NaN，radius 合理', () => {
    const model = buildKatydid()
    expect(model.radius).toBeGreaterThan(0)

    const s = scan(model)
    expect(s.nanMeshNames, `含 NaN 的 mesh: ${s.nanMeshNames.join(', ')}`).toHaveLength(0)
    expect(s.meshCount).toBeGreaterThan(0)
    console.log(`[katydid] mesh=${s.meshCount} triangles=${Math.round(s.triangles)}`)
    expect(s.triangles).toBeLessThanOrEqual(TRIANGLE_BUDGET)
  })

  it('anchors 恰好是 antenna/wing/hindleg/ovipositor/eye/tympanum', () => {
    expectExactAnchors(buildKatydid(), ['antenna', 'wing', 'hindleg', 'ovipositor', 'eye', 'tympanum'])
  })

  it('自检：触角总长 > 体长 × 1.0（螽斯与蝗虫最直观的区别）', () => {
    const model = buildKatydid()
    const antennaMeshes = findMeshesByName(model, 'antenna-strand')
    expect(antennaMeshes.length, '找不到 name="antenna-strand" 的触角 mesh').toBeGreaterThan(0)

    const base = new THREE.Vector3(...ANTENNA_BASE)
    const reach = maxDistanceFrom(antennaMeshes, base)

    const bodyBox = unionBoxByNames(model, ['katydid-body-core'])
    expect(bodyBox.isEmpty(), '找不到 katydid-body-core 命名的 mesh（头/胸/腹）').toBe(false)
    const bodySize = new THREE.Vector3()
    bodyBox.getSize(bodySize)
    const bodyLength = bodySize.x

    console.log(`[katydid] antenna reach=${reach.toFixed(3)} bodyLength=${bodyLength.toFixed(3)} ratio=${(reach / bodyLength).toFixed(2)} nominalLength=${ANTENNA_LENGTH}`)
    expect(reach, '触角总长应超过体长（体长量取自头+胸+腹，不含产卵器/翅/腿）').toBeGreaterThan(bodyLength * 1.0)
  })

  it('跳跃后足股节最粗处直径 ≥ 全长的 1/3（一眼可辨的跳跃肌比例）', () => {
    const model = buildKatydid()
    const femurMeshes = findMeshesByName(model, 'katydid-jumping-femur')
    expect(femurMeshes.length).toBeGreaterThan(0)
    const rightFemur = femurMeshes[0] // hindLegPair 内 side=1 先构建，遍历顺序即插入顺序

    const hip = new THREE.Vector3(...HIND_HIP_BASE)
    const knee = rawAnchor(model, 'hindleg')
    const femurLen = hip.distanceTo(knee)
    const maxRadius = maxPerpDistanceToLine([rightFemur], hip, knee)
    const maxDiameter = maxRadius * 2
    console.log(`[katydid] femur maxDiameter=${maxDiameter.toFixed(3)} len=${femurLen.toFixed(3)} ratio=${(maxDiameter / femurLen).toFixed(3)}`)
    expect(maxDiameter / femurLen).toBeGreaterThanOrEqual(1 / 3)
  })
})

// ==================================================================
describe('东方蝼蛄 buildMoleCricket', () => {
  it('构建不抛异常，几何体无 NaN，radius 合理', () => {
    const model = buildMoleCricket()
    expect(model.radius).toBeGreaterThan(0)

    const s = scan(model)
    expect(s.nanMeshNames, `含 NaN 的 mesh: ${s.nanMeshNames.join(', ')}`).toHaveLength(0)
    expect(s.meshCount).toBeGreaterThan(0)
    console.log(`[mole-cricket] mesh=${s.meshCount} triangles=${Math.round(s.triangles)}`)
    expect(s.triangles).toBeLessThanOrEqual(TRIANGLE_BUDGET)
  })

  it('anchors 恰好是 foreleg/pronotum/wing/abdomen/eye/antenna', () => {
    expectExactAnchors(buildMoleCricket(), ['foreleg', 'pronotum', 'wing', 'abdomen', 'eye', 'antenna'])
  })

  it('自检：前足最大宽度 / 前足长度 ≥ 0.4（铲状而非细腿，蝼蛄的全部辨识度）', () => {
    const model = buildMoleCricket()
    const shovelMeshes = findMeshesByName(model, 'foreleg-shovel-r')
    expect(shovelMeshes.length, '找不到 name="foreleg-shovel-r" 的挖掘前足 mesh').toBeGreaterThan(0)

    const base = new THREE.Vector3(...MOLE_FORE_BASE)
    const tip = rawAnchor(model, 'foreleg')
    const length = base.distanceTo(tip)
    const width = maxPerpDistanceToLine(shovelMeshes, base, tip) * 2

    console.log(`[mole-cricket] foreleg width=${width.toFixed(3)} length=${length.toFixed(3)} ratio=${(width / length).toFixed(3)}`)
    expect(width / length).toBeGreaterThanOrEqual(0.4)
  })
})

// ==================================================================
describe('水黾 buildWaterStrider', () => {
  it('构建不抛异常，几何体无 NaN，radius 合理', () => {
    const model = buildWaterStrider()
    expect(model.radius).toBeGreaterThan(0)

    const s = scan(model)
    expect(s.nanMeshNames, `含 NaN 的 mesh: ${s.nanMeshNames.join(', ')}`).toHaveLength(0)
    expect(s.meshCount).toBeGreaterThan(0)
    console.log(`[water-strider] mesh=${s.meshCount} triangles=${Math.round(s.triangles)}`)
    expect(s.triangles).toBeLessThanOrEqual(TRIANGLE_BUDGET)
  })

  it('anchors 恰好是 midleg/foreleg/hindleg/body/eye/antenna', () => {
    expectExactAnchors(buildWaterStrider(), ['midleg', 'foreleg', 'hindleg', 'body', 'eye', 'antenna'])
  })

  it('自检：中足展开跨度 ≥ 体长 × 1.6，且前足长度 < 中足长度 × 0.5（三对足功能分化）', () => {
    const model = buildWaterStrider()

    const bodyBox = unionBoxByNames(model, ['body-core'])
    expect(bodyBox.isEmpty(), '找不到 body-core 命名的 mesh（头/胸/腹）').toBe(false)
    const bodySize = new THREE.Vector3()
    bodyBox.getSize(bodySize)
    const bodyLength = bodySize.x

    // 展开跨度：中足左右两侧跗节尖端之间的距离。模型以 z=0 镜像对称，
    // 直接取 anchor（右中足跗节尖端）在原始建模坐标系下的 |z| 再乘 2。
    const midTipRaw = rawAnchor(model, 'midleg')
    const span = Math.abs(midTipRaw.z) * 2

    const foreTipRaw = rawAnchor(model, 'foreleg')
    const midLen = midTipRaw.distanceTo(new THREE.Vector3(...WS_MID_BASE))
    const foreLen = foreTipRaw.distanceTo(new THREE.Vector3(...WS_FORE_BASE))

    console.log(
      `[water-strider] bodyLength=${bodyLength.toFixed(3)} midSpan=${span.toFixed(3)} (ratio=${(span / bodyLength).toFixed(2)}) ` +
        `foreLen=${foreLen.toFixed(3)} midLen=${midLen.toFixed(3)} (ratio=${(foreLen / midLen).toFixed(2)})`,
    )
    expect(span).toBeGreaterThanOrEqual(bodyLength * 1.6)
    expect(foreLen).toBeLessThan(midLen * 0.5)
    // 附带检查体长本身量级合理，防止上面两条比例断言被"body-core 顺手改没了"蒙混过关
    expect(bodyLength).toBeGreaterThan(0.5)
    void ABDOMEN_TIP_X
  })
})

// ==================================================================
describe('黑带食蚜蝇 buildHoverfly', () => {
  it('构建不抛异常，几何体无 NaN，radius 合理', () => {
    const model = buildHoverfly()
    expect(model.radius).toBeGreaterThan(0)

    const s = scan(model)
    expect(s.nanMeshNames, `含 NaN 的 mesh: ${s.nanMeshNames.join(', ')}`).toHaveLength(0)
    expect(s.meshCount).toBeGreaterThan(0)
    console.log(`[hoverfly] mesh=${s.meshCount} triangles=${Math.round(s.triangles)}`)
    expect(s.triangles).toBeLessThanOrEqual(TRIANGLE_BUDGET)
  })

  it('anchors 恰好是 haltere/wing/eye/abdomen/antenna/thorax', () => {
    expectExactAnchors(buildHoverfly(), ['haltere', 'wing', 'eye', 'abdomen', 'antenna', 'thorax'])
  })

  it('自检：平衡棒 mesh 存在，且翅面 mesh 恰好 2 个（双翅目只有一对翅，与两对翅的蜂类本质区别）', () => {
    const model = buildHoverfly()

    const haltereMeshes = findMeshesByName(model, 'haltere')
    expect(haltereMeshes.length, '没有找到 name="haltere" 的平衡棒 mesh').toBeGreaterThan(0)

    const wingMeshes = findMeshesByName(model, 'wing-membrane')
    console.log(`[hoverfly] haltere meshes=${haltereMeshes.length} wing-membrane meshes=${wingMeshes.length}`)
    expect(wingMeshes.length, '翅面 mesh 数量应恰好 2 个（一对前翅，无后翅）').toBe(2)
  })
})
