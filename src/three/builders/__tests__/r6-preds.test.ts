/**
 * 第 6 轮三个新物种（猎蝽 / 熊蜂 / 蟋蟀）builder 的健全性 + 招牌形态断言。
 *
 * 三件套通规：构建不抛异常且 radius>0、几何体无 NaN、anchors 恰好是
 * 题目要求的 key 集合、三角面数在 15 万预算内；外加触角微动钩子
 * （新物种还没进 data 层，d-sway 的全量普查暂时扫不到它们，这里先钉住）
 * 与节间膜环（腹部裸露的两种）。
 *
 * 招牌形态断言全部从真实渲染出来的几何体反推（named mesh + 包围盒 /
 * 逐顶点量取），不复述 builder 里的构造常量；上下限齐给，防「断言只挡
 * 一边、另一边烂穿」：
 * - 猎蝽：喙末端 Y 低于头底且 X 落在胸段投影内（折刀式下折停息姿态）；
 *   捕捉式前足股节直径/长 ∈ [0.28, 0.6]；侧接缘色块两色相间且露在翅外。
 * - 熊蜂：体长/体高 ≤ 2.2（圆胖）；前翅长 < 体长×0.75（「不该会飞」的
 *   都市传说来源）；绒毛 ≥ 300 根且黑黄两色（比蜜蜂的 170 根更毛）。
 * - 蟋蟀：尾须伸出长 ≥ 体长×0.3；触角 > 体长；前翅短（≤ 体长×0.55）
 *   而方（长宽比 ≤ 2.3）且右翅叠在左翅之上、右翅带音锉斜脊。
 *
 * 坐标系提醒（同 orthoptera2.test.ts 顶注）：finalize() 平移 group 与
 * anchors 但不动 geometry 顶点。setFromObject 的包围盒与 model.anchors
 * 同处「成品坐标系」；geometry 逐顶点量取与各文件导出的 BASE 常量同处
 * 「建模原始坐标系」，anchors 要参与后者时用 rawAnchor() 换回去。
 */
import * as THREE from 'three'
import { describe, expect, it } from 'vitest'
import { buildAssassinBug, FORE_HIP } from '../assassin-bug'
import { buildBumblebee } from '../bumblebee'
import { buildCricket, ANTENNA_BASE, CERCUS_BASE, HIND_HIP } from '../cricket'
import type { InsectModel } from '../kit'

const TRIANGLE_BUDGET = 150_000

// ---------------------------------------------------------------- 通用小工具

function scan(model: InsectModel): { meshCount: number; triangles: number; nanMeshNames: string[] } {
  const result = { meshCount: 0, triangles: 0, nanMeshNames: [] as string[] }
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

function expectExactAnchors(model: InsectModel, required: string[]) {
  const actual = Object.keys(model.anchors).slice().sort()
  const expected = required.slice().sort()
  expect(actual, `anchors 应恰好是 [${expected.join(', ')}]，实际是 [${actual.join(', ')}]`).toEqual(expected)
  for (const key of required) expectFiniteVector(model.anchors[key], `anchors.${key}`)
}

/** 把 anchor 换回 finalize() 平移之前的「建模原始坐标系」。 */
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

/** 顶点到线段所在直线的最大垂距——从真实几何体量「最粗处半径」。 */
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

/** 一组 mesh 里所有顶点到基点的最大直线距离——量「从基点伸出多远」。 */
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

/** 触角微动钩子数：name='antenna' 且 userData.base 是数组的组。 */
function antennaHookCount(model: InsectModel): number {
  let hooks = 0
  model.group.traverse((o) => {
    if (o.name === 'antenna' && Array.isArray(o.userData?.base)) hooks++
  })
  return hooks
}

/** 一组 mesh 用到的不同材质基色数（明暗相间/双色分段的判据）。 */
function distinctColors(meshes: THREE.Mesh[]): Set<string> {
  const colors = new Set<string>()
  for (const m of meshes) {
    const mat = m.material as THREE.MeshPhysicalMaterial
    if (mat?.color) colors.add(mat.color.getHexString())
  }
  return colors
}

// ==================================================================
describe('环斑猛猎蝽 buildAssassinBug', () => {
  const model = buildAssassinBug()

  it('构建不抛异常，几何体无 NaN，radius 合理，面数在预算内', () => {
    expect(model.radius).toBeGreaterThan(0)
    const s = scan(model)
    expect(s.nanMeshNames, `含 NaN 的 mesh: ${s.nanMeshNames.join(', ')}`).toHaveLength(0)
    // eslint-disable-next-line no-console
    console.log(`[assassin-bug] mesh=${s.meshCount} triangles=${Math.round(s.triangles)}`)
    expect(s.triangles).toBeLessThanOrEqual(TRIANGLE_BUDGET)
  })

  it('anchors 恰好是 rostrum/foreleg/pronotum/eye/antenna/abdomen', () => {
    expectExactAnchors(model, ['rostrum', 'foreleg', 'pronotum', 'eye', 'antenna', 'abdomen'])
  })

  it('触角微动钩子齐备（一对）；腹部 7 节挂了 6 圈节间膜环', () => {
    expect(antennaHookCount(model)).toBeGreaterThanOrEqual(2)
    expect(findMeshesByName(model, 'membrane-ring')).toHaveLength(6)
  })

  it('招牌：三节喙向下折收——喙末端 Y 低于头底、X 落在胸段投影内（折刀停息姿态）', () => {
    expect(findMeshesByName(model, 'assassin-rostrum-seg'), '喙应由 3 节组成').toHaveLength(3)

    const tip = model.anchors.rostrum // 与 setFromObject 的包围盒同处成品坐标系
    const headBox = unionBoxByNames(model, ['assassin-head'])
    expect(headBox.isEmpty(), '找不到 assassin-head').toBe(false)
    const thoraxBox = unionBoxByNames(model, ['assassin-pronotum', 'assassin-thorax-venter'])
    expect(thoraxBox.isEmpty(), '找不到胸段 mesh').toBe(false)

    // eslint-disable-next-line no-console
    console.log(
      `[assassin-bug] rostrum tip=(${tip.x.toFixed(3)}, ${tip.y.toFixed(3)}) headMinY=${headBox.min.y.toFixed(3)} thoraxX=[${thoraxBox.min.x.toFixed(3)}, ${thoraxBox.max.x.toFixed(3)}]`,
    )
    expect(tip.y, '喙末端应低于头底（下折而非前伸）').toBeLessThan(headBox.min.y)
    expect(tip.y, '喙末端也不能垂得离谱（下限保护）').toBeGreaterThan(headBox.min.y - 0.8)
    expect(tip.x, '喙末端 X 应落在胸段投影内（收拢贴胸）').toBeGreaterThanOrEqual(thoraxBox.min.x)
    expect(tip.x, '喙末端 X 应落在胸段投影内（收拢贴胸）').toBeLessThanOrEqual(thoraxBox.max.x)
  })

  it('招牌：捕捉式前足股节直径/长 ∈ [0.28, 0.6]，内缘微齿 8 枚', () => {
    const femurs = findMeshesByName(model, 'assassin-raptorial-femur')
    expect(femurs.length, '找不到 assassin-raptorial-femur').toBeGreaterThan(0)
    const hip = new THREE.Vector3(...FORE_HIP)
    const knee = rawAnchor(model, 'foreleg')
    const len = hip.distanceTo(knee)
    const dia = maxPerpDistanceToLine([femurs[0]], hip, knee) * 2
    // eslint-disable-next-line no-console
    console.log(`[assassin-bug] fore femur dia=${dia.toFixed(3)} len=${len.toFixed(3)} ratio=${(dia / len).toFixed(3)}`)
    expect(dia / len, '股节要看得出加粗').toBeGreaterThanOrEqual(0.28)
    expect(dia / len, '但不能粗成一坨球').toBeLessThanOrEqual(0.6)
    expect(findMeshesByName(model, 'assassin-fore-tooth'), '内缘微齿应为两侧各 4 枚').toHaveLength(8)
  })

  it('招牌：侧接缘一圈色块两色相间，且露在收拢的半翅之外', () => {
    const plates = findMeshesByName(model, 'assassin-connexivum')
    expect(plates.length, '侧接缘色块应为两侧各 6 块').toBe(12)
    const colors = distinctColors(plates)
    expect(colors.size, `侧接缘应明暗相间（至少两色），实际 ${[...colors].join('/')}`).toBeGreaterThanOrEqual(2)

    const connexBox = unionBoxByNames(model, ['assassin-connexivum'])
    const wingBox = unionBoxByNames(model, ['assassin-hemelytron'])
    expect(wingBox.isEmpty(), '找不到 assassin-hemelytron').toBe(false)
    // eslint-disable-next-line no-console
    console.log(`[assassin-bug] connexivum z=[${connexBox.min.z.toFixed(3)}, ${connexBox.max.z.toFixed(3)}] hemelytra z=[${wingBox.min.z.toFixed(3)}, ${wingBox.max.z.toFixed(3)}]`)
    expect(connexBox.max.z, '右侧接缘应探出翅外').toBeGreaterThan(wingBox.max.z)
    expect(connexBox.min.z, '左侧接缘应探出翅外').toBeLessThan(wingBox.min.z)
  })

  it('招牌：眼后收细成「颈」——颈的截面高度明显小于头', () => {
    const headBox = unionBoxByNames(model, ['assassin-head'])
    const neckBox = unionBoxByNames(model, ['assassin-neck'])
    expect(neckBox.isEmpty(), '找不到 assassin-neck').toBe(false)
    const headH = headBox.max.y - headBox.min.y
    const neckH = neckBox.max.y - neckBox.min.y
    // eslint-disable-next-line no-console
    console.log(`[assassin-bug] headH=${headH.toFixed(3)} neckH=${neckH.toFixed(3)}`)
    expect(neckH, '颈要真的细').toBeLessThan(headH * 0.75)
    expect(neckH, '但也得是段脖子，不是一根线').toBeGreaterThan(headH * 0.2)
  })
})

// ==================================================================
describe('明亮熊蜂 buildBumblebee', () => {
  const model = buildBumblebee()
  const bodyBox = unionBoxByNames(model, ['bumblebee-body-core', 'bumblebee-abdomen-segment'])
  const bodySize = new THREE.Vector3()
  bodyBox.getSize(bodySize)

  it('构建不抛异常，几何体无 NaN，radius 合理，面数在预算内', () => {
    expect(model.radius).toBeGreaterThan(0)
    const s = scan(model)
    expect(s.nanMeshNames, `含 NaN 的 mesh: ${s.nanMeshNames.join(', ')}`).toHaveLength(0)
    // eslint-disable-next-line no-console
    console.log(`[bumblebee] mesh=${s.meshCount} triangles=${Math.round(s.triangles)}`)
    expect(s.triangles).toBeLessThanOrEqual(TRIANGLE_BUDGET)
  })

  it('anchors 恰好是 fuzz/pollenBasket/wing/eye/antenna/abdomen', () => {
    expectExactAnchors(model, ['fuzz', 'pollenBasket', 'wing', 'eye', 'antenna', 'abdomen'])
  })

  it('触角微动钩子齐备（一对）', () => {
    expect(antennaHookCount(model)).toBeGreaterThanOrEqual(2)
  })

  it('招牌：圆胖——体长/体高 ∈ [1.4, 2.2]（蜜蜂约 2.6，熊蜂必须更圆）', () => {
    expect(bodyBox.isEmpty(), '找不到身体核心 mesh').toBe(false)
    const ratio = bodySize.x / bodySize.y
    // eslint-disable-next-line no-console
    console.log(`[bumblebee] bodyLen=${bodySize.x.toFixed(3)} bodyHeight=${bodySize.y.toFixed(3)} ratio=${ratio.toFixed(2)}`)
    expect(ratio, '体长/体高应 ≤ 2.2（圆胖）').toBeLessThanOrEqual(2.2)
    expect(ratio, '也不能圆成一颗球').toBeGreaterThanOrEqual(1.4)
  })

  it('招牌：翅相对身体明显偏小——前翅长 ∈ [体长×0.35, 体长×0.75)', () => {
    const faces = findMeshesByName(model, 'bumblebee-fore-wing')
    expect(faces.length, '找不到 bumblebee-fore-wing').toBe(2)
    faces[0].geometry.computeBoundingBox()
    const s = new THREE.Vector3()
    faces[0].geometry.boundingBox!.getSize(s)
    const wingLen = s.x // 翅面局部坐标 +X 即翅长方向，不受摆姿影响
    // eslint-disable-next-line no-console
    console.log(`[bumblebee] foreWingLen=${wingLen.toFixed(3)} bodyLen=${bodySize.x.toFixed(3)} ratio=${(wingLen / bodySize.x).toFixed(2)}`)
    expect(wingLen, '翅长应 < 体长 × 0.75').toBeLessThan(bodySize.x * 0.75)
    expect(wingLen, '翅也不能小到没有').toBeGreaterThanOrEqual(bodySize.x * 0.35)
  })

  it('招牌：绒毛 ∈ [300, 900] 根且至少黑黄两色（环带色界糊在毛里）；腹面材质真的开了 velvet', () => {
    const hairs = findMeshesByName(model, 'bumblebee-fuzz')
    // eslint-disable-next-line no-console
    console.log(`[bumblebee] fuzz=${hairs.length}`)
    expect(hairs.length, '绒毛要比蜜蜂的 170 根多得多').toBeGreaterThanOrEqual(300)
    expect(hairs.length, '面数预算保护').toBeLessThanOrEqual(900)
    expect(distinctColors(hairs).size, '绒毛应有黑黄两色').toBeGreaterThanOrEqual(2)

    const segs = findMeshesByName(model, 'bumblebee-abdomen-segment')
    expect(segs.length, '双色分段腹节 + 尾帽').toBeGreaterThanOrEqual(5)
    expect(distinctColors(segs).size, '腹部环带应为双色材质分段').toBeGreaterThanOrEqual(2)
    for (const seg of segs) {
      expect((seg.material as THREE.MeshPhysicalMaterial).sheen, '腹节材质应开 velvet（sheen=1）').toBe(1)
    }
  })

  it('招牌：后足花粉篮两侧各一团花粉；翅膜虹彩为极轻档（0 < iridescence ≤ 0.3）', () => {
    expect(findMeshesByName(model, 'bumblebee-pollen')).toHaveLength(2)
    const face = findMeshesByName(model, 'bumblebee-fore-wing')[0]
    const mat = face.material as THREE.MeshPhysicalMaterial
    expect(mat.iridescence, '翅膜应带虹彩').toBeGreaterThan(0)
    expect(mat.iridescence, '虹彩必须是极轻档').toBeLessThanOrEqual(0.3)
  })
})

// ==================================================================
describe('黄脸油葫芦 buildCricket', () => {
  const model = buildCricket()
  const bodyBox = unionBoxByNames(model, ['cricket-body-core'])
  const bodySize = new THREE.Vector3()
  bodyBox.getSize(bodySize)
  const bodyLen = bodySize.x

  it('构建不抛异常，几何体无 NaN，radius 合理，面数在预算内', () => {
    expect(model.radius).toBeGreaterThan(0)
    const s = scan(model)
    expect(s.nanMeshNames, `含 NaN 的 mesh: ${s.nanMeshNames.join(', ')}`).toHaveLength(0)
    // eslint-disable-next-line no-console
    console.log(`[cricket] mesh=${s.meshCount} triangles=${Math.round(s.triangles)} bodyLen=${bodyLen.toFixed(3)}`)
    expect(s.triangles).toBeLessThanOrEqual(TRIANGLE_BUDGET)
  })

  it('anchors 恰好是 stridulator/cercus/hindleg/antenna/eye/head', () => {
    expectExactAnchors(model, ['stridulator', 'cercus', 'hindleg', 'antenna', 'eye', 'head'])
  })

  it('触角微动钩子齐备（一对）；腹部 8 节挂了 7 圈节间膜环', () => {
    expect(antennaHookCount(model)).toBeGreaterThanOrEqual(2)
    expect(findMeshesByName(model, 'membrane-ring')).toHaveLength(7)
  })

  it('招牌：一对尾须八字张开，伸出长 ∈ [体长×0.3, 体长×0.6]', () => {
    const cerci = findMeshesByName(model, 'cricket-cercus')
    expect(cerci.length, '尾须应为一对').toBe(2)
    const base = new THREE.Vector3(...CERCUS_BASE)
    const reach = maxDistanceFrom([cerci[0]], base) // 遍历序：右侧先构建
    // eslint-disable-next-line no-console
    console.log(`[cricket] cercus reach=${reach.toFixed(3)} bodyLen=${bodyLen.toFixed(3)} ratio=${(reach / bodyLen).toFixed(2)}`)
    expect(reach, '尾须长应 ≥ 体长 × 0.3').toBeGreaterThanOrEqual(bodyLen * 0.3)
    expect(reach, '尾须也不能长过头（≤ 体长 × 0.6）').toBeLessThanOrEqual(bodyLen * 0.6)

    // 八字：向后伸出且左右张开——右尾须自身包围盒 X 跨度大、Z 有外张量
    cerci[0].geometry.computeBoundingBox()
    const cs = new THREE.Vector3()
    cerci[0].geometry.boundingBox!.getSize(cs)
    expect(cs.x, '尾须应向后拖出').toBeGreaterThan(0.5)
    expect(cs.z, '尾须应向侧张开（八字）').toBeGreaterThan(0.18)
  })

  it('招牌：触角丝状超过体长（∈ (体长×1.0, 体长×2.0]）', () => {
    const strands = findMeshesByName(model, 'cricket-antenna-strand')
    expect(strands.length, '找不到 cricket-antenna-strand').toBeGreaterThan(0)
    const reach = maxDistanceFrom(strands, new THREE.Vector3(...ANTENNA_BASE))
    // eslint-disable-next-line no-console
    console.log(`[cricket] antenna reach=${reach.toFixed(3)} bodyLen=${bodyLen.toFixed(3)} ratio=${(reach / bodyLen).toFixed(2)}`)
    expect(reach, '触角应超过体长').toBeGreaterThan(bodyLen)
    expect(reach, '触角上限保护').toBeLessThanOrEqual(bodyLen * 2)
  })

  it('招牌：前翅短而方（长 ≤ 体长×0.55、长宽比 ≤ 2.3），右翅叠左翅、右翅带音锉斜脊', () => {
    const faceR = findMeshesByName(model, 'cricket-tegmen-r')
    const faceL = findMeshesByName(model, 'cricket-tegmen-l')
    expect(faceR).toHaveLength(1)
    expect(faceL).toHaveLength(1)

    faceR[0].geometry.computeBoundingBox()
    const s = new THREE.Vector3()
    faceR[0].geometry.boundingBox!.getSize(s)
    const aspect = s.x / s.z
    // eslint-disable-next-line no-console
    console.log(`[cricket] tegmen len=${s.x.toFixed(3)} width=${s.z.toFixed(3)} aspect=${aspect.toFixed(2)} bodyLen=${bodyLen.toFixed(3)}`)
    expect(s.x, '前翅要短（≤ 体长 × 0.55）').toBeLessThanOrEqual(bodyLen * 0.55)
    expect(s.x, '前翅下限保护（≥ 体长 × 0.3）').toBeGreaterThanOrEqual(bodyLen * 0.3)
    expect(aspect, '前翅要方（长宽比 ≤ 2.3）').toBeLessThanOrEqual(2.3)
    expect(aspect, '前翅长宽比下限').toBeGreaterThanOrEqual(1.0)

    // 右翅叠左翅：成品坐标系里右翅面的中心高于左翅面
    const boxR = new THREE.Box3().setFromObject(faceR[0])
    const boxL = new THREE.Box3().setFromObject(faceL[0])
    const cR = new THREE.Vector3()
    const cL = new THREE.Vector3()
    boxR.getCenter(cR)
    boxL.getCenter(cL)
    // eslint-disable-next-line no-console
    console.log(`[cricket] tegmenR centerY=${cR.y.toFixed(3)} tegmenL centerY=${cL.y.toFixed(3)}`)
    expect(cR.y, '右翅应叠在左翅之上（蟋蟀式）').toBeGreaterThan(cL.y)

    const ridges = findMeshesByName(model, 'cricket-stridulator-ridge')
    expect(ridges.length, '右翅音锉斜脊应 ≥ 4 条').toBeGreaterThanOrEqual(4)
    expect(ridges.length, '斜脊上限保护').toBeLessThanOrEqual(8)
  })

  it('招牌：跳跃后足粗壮但比蝗虫收敛——股节直径/长 ∈ [0.26, 0.36]', () => {
    const femurs = findMeshesByName(model, 'cricket-jumping-femur')
    expect(femurs.length, '找不到 cricket-jumping-femur').toBeGreaterThan(0)
    const hip = new THREE.Vector3(...HIND_HIP)
    const knee = rawAnchor(model, 'hindleg')
    const len = hip.distanceTo(knee)
    const dia = maxPerpDistanceToLine([femurs[0]], hip, knee) * 2
    // eslint-disable-next-line no-console
    console.log(`[cricket] hind femur dia=${dia.toFixed(3)} len=${len.toFixed(3)} ratio=${(dia / len).toFixed(3)}`)
    expect(dia / len, '股节要粗壮').toBeGreaterThanOrEqual(0.26)
    expect(dia / len, '但要比蝗虫（0.38）收敛').toBeLessThanOrEqual(0.36)
  })
})
