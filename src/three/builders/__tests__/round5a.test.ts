/**
 * 验证本批三个新物种的 builder（红萤、榆蓝叶甲、豆娘）：
 * - 能正常构建，不抛异常；所有几何体顶点无 NaN/Infinity
 * - 包围球半径 > 0；anchors 恰好是题目要求的 key 集合，且坐标有限
 * - 总三角面数落在 15 万预算内（打印出来）
 * - 各物种的招牌形态特征——全部从真实渲染出来的几何体反推，不复述
 *   builder 里的构造常量，删掉/削弱那个特征时断言真的会失败：
 *   - net-winged-beetle：纵脊（ridge-long）mesh ≥ 4、横脊（ridge-cross）
 *     mesh ≥ 6；且纵脊的走向以 X 为主（每条自己的包围盒 size.x >
 *     size.z）、横脊以 Z 为主（size.z > size.x）——两组走向必须不同，
 *     才算真的"交织成网"而不是随手摆了一堆同向的管子。
 *   - leaf-beetle：包围盒长宽比 ≤ 1.6（证明"短圆"而非长卵形）；鞘翅
 *     材质 metalness ≥ 0.35（证明金属感确实调上去了，不是随手写个深色）。
 *   - damselfly：四片翅（wing）并集包围盒 Y 跨度 > Z 跨度（证明竖立
 *     合拢，而不是像 dragonfly.ts 那样水平摊开）；左右复眼（eyeR/eyeL）
 *     的 Z 区间不重叠（证明真的分居头部两端，而非蜻蜓那样几乎相接）；
 *     腹部（abdomen）渲染出来的最大直径 ≤ 体长（包围盒 X 跨度）的
 *     1/25（证明"细如针"）。
 */
import * as THREE from 'three'
import { describe, expect, it } from 'vitest'
import { buildNetWingedBeetle } from '../net-winged-beetle'
import { buildLeafBeetle } from '../leaf-beetle'
import { buildDamselfly } from '../damselfly'
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

/** 按 mesh/group 的 name 收集并集包围盒——量的是真实渲染几何体，任意 Object3D（不要求 isMesh），
 * 因为像 eyeR/eyeL 这样的命名挂在 compoundEye() 返回的 Group 上，不是 mesh 本身。 */
function unionBoxByName(root: THREE.Object3D, name: string): THREE.Box3 {
  const box = new THREE.Box3()
  root.traverse((obj) => {
    if (obj.name === name) box.union(new THREE.Box3().setFromObject(obj))
  })
  return box
}

function countMeshesByName(group: THREE.Group, name: string): number {
  let count = 0
  group.traverse((obj) => {
    const mesh = obj as THREE.Mesh
    if (mesh.isMesh && mesh.name === name) count++
  })
  return count
}

function meshesByName(group: THREE.Group, name: string): THREE.Mesh[] {
  const out: THREE.Mesh[] = []
  group.traverse((obj) => {
    const mesh = obj as THREE.Mesh
    if (mesh.isMesh && mesh.name === name) out.push(mesh)
  })
  return out
}

function firstMaterialByMeshName(group: THREE.Group, name: string): THREE.MeshPhysicalMaterial {
  const meshes = meshesByName(group, name)
  expect(meshes.length, `找不到 name="${name}" 的 mesh`).toBeGreaterThan(0)
  const mat = meshes[0].material as THREE.MeshPhysicalMaterial
  expect(mat, `mesh "${name}" 材质缺失`).toBeTruthy()
  return mat
}

describe('红萤 buildNetWingedBeetle', () => {
  const model = buildNetWingedBeetle()

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

  it('anchors 恰好是 elytra/ridge/antenna/eye/pronotum/leg，且无 NaN', () => {
    checkAnchorsExact(model, ['elytra', 'ridge', 'antenna', 'eye', 'pronotum', 'leg'])
  })

  it('纵脊（ridge-long）≥ 4，横脊（ridge-cross）≥ 6', () => {
    const longCount = countMeshesByName(model.group, 'ridge-long')
    const crossCount = countMeshesByName(model.group, 'ridge-cross')
    // eslint-disable-next-line no-console
    console.log(`[net-winged-beetle] ridge-long=${longCount} ridge-cross=${crossCount}`)
    expect(longCount, `纵脊 mesh 数 ${longCount} 应 ≥ 4`).toBeGreaterThanOrEqual(4)
    expect(crossCount, `横脊 mesh 数 ${crossCount} 应 ≥ 6`).toBeGreaterThanOrEqual(6)
  })

  it('纵脊走向以 X 为主（每条自己的包围盒 size.x > size.z），横脊以 Z 为主（size.z > size.x）', () => {
    const longMeshes = meshesByName(model.group, 'ridge-long')
    const crossMeshes = meshesByName(model.group, 'ridge-cross')
    const size = new THREE.Vector3()

    let worstLongRatio = Infinity
    for (const m of longMeshes) {
      const box = new THREE.Box3().setFromObject(m)
      box.getSize(size)
      worstLongRatio = Math.min(worstLongRatio, size.x / Math.max(size.z, 1e-6))
      expect(size.x, `纵脊 size.x=${size.x.toFixed(4)} 应 > size.z=${size.z.toFixed(4)}`).toBeGreaterThan(size.z)
    }
    let worstCrossRatio = Infinity
    for (const m of crossMeshes) {
      const box = new THREE.Box3().setFromObject(m)
      box.getSize(size)
      worstCrossRatio = Math.min(worstCrossRatio, size.z / Math.max(size.x, 1e-6))
      expect(size.z, `横脊 size.z=${size.z.toFixed(4)} 应 > size.x=${size.x.toFixed(4)}`).toBeGreaterThan(size.x)
    }
    // eslint-disable-next-line no-console
    console.log(`[net-winged-beetle] worst ridge-long x/z ratio=${worstLongRatio.toFixed(2)}, worst ridge-cross z/x ratio=${worstCrossRatio.toFixed(2)}`)
  })

  it('三角面数在预算内', () => {
    const { triangles } = inspectGeometry(model.group)
    // eslint-disable-next-line no-console
    console.log(`[net-winged-beetle] triangles = ${Math.round(triangles)}`)
    expect(triangles).toBeLessThanOrEqual(TRIANGLE_BUDGET)
  })
})

describe('榆蓝叶甲 buildLeafBeetle', () => {
  const model = buildLeafBeetle()

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

  it('anchors 恰好是 elytra/head/antenna/leg/pronotum/eye，且无 NaN', () => {
    checkAnchorsExact(model, ['elytra', 'head', 'antenna', 'leg', 'pronotum', 'eye'])
  })

  it('包围盒长宽比 ≤ 1.6（证明短圆而非长卵形）', () => {
    const box = new THREE.Box3().setFromObject(model.group)
    const size = new THREE.Vector3()
    box.getSize(size)
    const ratio = size.x / size.z
    // eslint-disable-next-line no-console
    console.log(`[leaf-beetle] size=(x=${size.x.toFixed(3)}, y=${size.y.toFixed(3)}, z=${size.z.toFixed(3)}) x/z=${ratio.toFixed(3)}`)
    expect(ratio, `包围盒长宽比 ${ratio.toFixed(3)} 应 ≤ 1.6`).toBeLessThanOrEqual(1.6)
  })

  it('鞘翅材质 metalness ≥ 0.35', () => {
    const mat = firstMaterialByMeshName(model.group, 'elytra')
    // eslint-disable-next-line no-console
    console.log(`[leaf-beetle] elytra metalness=${mat.metalness}`)
    expect(mat.metalness, `鞘翅 metalness ${mat.metalness} 应 ≥ 0.35`).toBeGreaterThanOrEqual(0.35)
  })

  it('三角面数在预算内', () => {
    const { triangles } = inspectGeometry(model.group)
    // eslint-disable-next-line no-console
    console.log(`[leaf-beetle] triangles = ${Math.round(triangles)}`)
    expect(triangles).toBeLessThanOrEqual(TRIANGLE_BUDGET)
  })
})

describe('豆娘 buildDamselfly', () => {
  const model = buildDamselfly()

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

  it('anchors 恰好是 wing/eye/abdomen/thorax/leg/antenna，且无 NaN', () => {
    checkAnchorsExact(model, ['wing', 'eye', 'abdomen', 'thorax', 'leg', 'antenna'])
  })

  it('四翅并集包围盒 Y 跨度 > Z 跨度（证明竖立合拢，而非像蜻蜓那样水平摊开）', () => {
    const box = unionBoxByName(model.group, 'wing')
    expect(box.isEmpty(), '找不到 name="wing" 的翅').toBe(false)
    const size = new THREE.Vector3()
    box.getSize(size)
    // eslint-disable-next-line no-console
    console.log(`[damselfly] 四翅并集 size=(x=${size.x.toFixed(3)}, y=${size.y.toFixed(3)}, z=${size.z.toFixed(3)})`)
    expect(size.y, `四翅 Y 跨度 ${size.y.toFixed(3)} 应 > Z 跨度 ${size.z.toFixed(3)}`).toBeGreaterThan(size.z)
  })

  it('左右复眼（eyeR/eyeL）Z 区间不重叠（证明分居头部两端而非几乎相接）', () => {
    const boxR = unionBoxByName(model.group, 'eyeR')
    const boxL = unionBoxByName(model.group, 'eyeL')
    expect(boxR.isEmpty(), '找不到 eyeR').toBe(false)
    expect(boxL.isEmpty(), '找不到 eyeL').toBe(false)
    // eslint-disable-next-line no-console
    console.log(`[damselfly] eyeR.z=[${boxR.min.z.toFixed(3)},${boxR.max.z.toFixed(3)}] eyeL.z=[${boxL.min.z.toFixed(3)},${boxL.max.z.toFixed(3)}]`)
    // 约定右眼在 +Z、左眼在 -Z：右眼 Z 下界应严格大于左眼 Z 上界
    expect(boxR.min.z, `右眼 Z 下界 ${boxR.min.z.toFixed(3)} 应严格大于左眼 Z 上界 ${boxL.max.z.toFixed(3)}`).toBeGreaterThan(boxL.max.z)
  })

  it('腹部最大直径 ≤ 体长（包围盒 X 跨度）的 1/25（证明细如针）', () => {
    const bodyBox = new THREE.Box3().setFromObject(model.group)
    const bodySize = new THREE.Vector3()
    bodyBox.getSize(bodySize)
    const bodyLength = bodySize.x

    const abdomenBox = unionBoxByName(model.group, 'abdomen')
    expect(abdomenBox.isEmpty(), '找不到 name="abdomen" 的腹部').toBe(false)
    const abdomenSize = new THREE.Vector3()
    abdomenBox.getSize(abdomenSize)
    const maxDiameter = Math.max(abdomenSize.y, abdomenSize.z)

    // eslint-disable-next-line no-console
    console.log(
      `[damselfly] bodyLength=${bodyLength.toFixed(3)} abdomenMaxDiameter=${maxDiameter.toFixed(4)} ratio=1/${(bodyLength / maxDiameter).toFixed(1)}`,
    )
    expect(maxDiameter, `腹部最大直径 ${maxDiameter.toFixed(4)} 应 ≤ 体长 ${bodyLength.toFixed(3)} 的 1/25 = ${(bodyLength / 25).toFixed(4)}`).toBeLessThanOrEqual(bodyLength / 25)
  })

  it('翅脉粗细远小于翅膜尺度（钉住"翅脉是纹理不是主体"，不能粗过翅膜）', () => {
    const faceMeshes = meshesByName(model.group, 'wingFace')
    expect(faceMeshes.length, '找不到 wingFace 命名的翅膜 mesh').toBeGreaterThan(0)
    faceMeshes[0].geometry.computeBoundingBox()
    const faceSize = new THREE.Vector3()
    faceMeshes[0].geometry.boundingBox!.getSize(faceSize)
    const wingWidth = faceSize.z // 翅膜局部 Z 跨度＝翅宽方向，是翅脉粗细该比着的尺度（不用翅长，翅长远大于粗细、比不出问题）

    const veinMeshes = meshesByName(model.group, 'wingVein')
    expect(veinMeshes.length, '找不到 wingVein 命名的翅脉 mesh').toBeGreaterThan(0)
    let maxVeinThickness = 0
    for (const vm of veinMeshes) {
      vm.geometry.computeBoundingBox()
      const s = new THREE.Vector3()
      vm.geometry.boundingBox!.getSize(s)
      // 翅脉局部沿 X 走向为主，Y/Z 是它的粗细截面；取二者中较小的一个更贴近"半径"量级
      maxVeinThickness = Math.max(maxVeinThickness, Math.min(s.y, s.z))
    }

    // eslint-disable-next-line no-console
    console.log(
      `[damselfly] wingWidth(localZ)=${wingWidth.toFixed(4)} maxVeinThickness=${maxVeinThickness.toFixed(4)} ratio=${(maxVeinThickness / wingWidth).toFixed(4)}`,
    )
    expect(
      maxVeinThickness,
      `翅脉最大粗细 ${maxVeinThickness.toFixed(4)} 应 < 翅宽 ${wingWidth.toFixed(4)} 的 20%（否则翅脉会盖过翅膜）`,
    ).toBeLessThan(wingWidth * 0.2)
  })

  it('三角面数在预算内', () => {
    const { triangles } = inspectGeometry(model.group)
    // eslint-disable-next-line no-console
    console.log(`[damselfly] triangles = ${Math.round(triangles)}`)
    expect(triangles).toBeLessThanOrEqual(TRIANGLE_BUDGET)
  })
})
