/**
 * 验证本批四个新物种的 builder（兰花螳螂、枯叶蛱蝶、天蛾、白蚁兵蚁）：
 * - 能正常构建，不抛异常；所有几何体顶点无 NaN/Infinity
 * - 包围球半径 > 0；anchors 恰好是题目要求的 key 集合，且坐标有限
 * - 总三角面数落在 15 万预算内（打印出来）
 * - 各物种的招牌形态特征——自问"删掉这个特征，断言真的会失败吗"：
 *
 *   兰花螳螂：花瓣状腿节的宽度 ≥ 厚度的 3.5 倍。腿在体侧的朝向是斜的
 *   （同时有 X/Y/Z 分量），世界坐标包围盒量不出"宽度 vs 厚度"——长度
 *   分量会污染两个方向。orchid-mantis.ts 把花瓣腿节建在局部坐标系
 *   （长度沿局部 +X，厚度=局部Y，宽度=局部Z），再整体旋转到腿的真实
 *   朝向，因此这里直接读取 'petalFemur' 命名 mesh 的**几何体自身局部
 *   包围盒**（geometry.boundingBox，不经父级 world 矩阵），厚度/宽度
 *   互不污染。
 *
 *   枯叶蛱蝶：竖立合拢姿态用「四翅整体 Y 向跨度 > Z 向跨度」的世界坐标
 *   包围盒直接判断（这个检查本身就是关于姿态的世界坐标问题，不存在
 *   局部/世界混淆）；主叶脉是否真的贯穿整片翅，量的是 'mainVein' 命名
 *   mesh 的几何体局部 X 跨度（翅面本身建在局部 XZ 平面，X=沿翅长，
 *   不受 spread/tilt 姿态旋转影响）。
 *
 *   天蛾：前翅长宽比同样读局部几何包围盒（局部 X=翅长、局部 Z=翅宽，
 *   不受后掠姿态旋转影响）；喙的伸展方向本就限定在体正中矢状面
 *   （z=0，笔直向前下方，见 hawk-moth.ts），没有对角污染问题，直接用
 *   世界坐标包围盒的 X 跨度即可。
 *
 *   白蚁兵蚁：头部/胸腹都不涉及对角朝向，直接用世界坐标包围盒体积
 *   比较；复眼检查扫全部 mesh.name，确认没有一个含 "eye"（大小写不敏感）。
 */
import * as THREE from 'three'
import { describe, expect, it } from 'vitest'
import { buildOrchidMantis } from '../orchid-mantis'
import { buildDeadLeafButterfly } from '../dead-leaf-butterfly'
import { buildHawkMoth } from '../hawk-moth'
import { buildTermiteSoldier } from '../termite-soldier'
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

/**
 * 按 mesh.name 收集**局部几何**包围盒的并集——不经父级 world 矩阵。
 * 用于腿/翅这类局部建型后再整体旋转到斜向姿态的部件：world 包围盒会把
 * 长度分量和厚度/宽度分量混在一起，局部包围盒才能真正分离这几个方向。
 */
function localBoxesByName(group: THREE.Group, name: string): THREE.Box3[] {
  const boxes: THREE.Box3[] = []
  group.traverse((obj) => {
    const mesh = obj as THREE.Mesh
    if (!mesh.isMesh || mesh.name !== name) return
    mesh.geometry.computeBoundingBox()
    const bb = mesh.geometry.boundingBox
    if (bb) boxes.push(bb.clone())
  })
  return boxes
}

describe('兰花螳螂 buildOrchidMantis', () => {
  const model = buildOrchidMantis()

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

  it('anchors 恰好是 petalLeg/raptorialLeg/head/eye/abdomen/wing，且无 NaN', () => {
    checkAnchorsExact(model, ['petalLeg', 'raptorialLeg', 'head', 'eye', 'abdomen', 'wing'])
  })

  it('花瓣状腿节的最大宽度 ≥ 其厚度的 3.5 倍（证明真的展成叶片，而非圆柱腿节）', () => {
    const boxes = localBoxesByName(model.group, 'petalFemur')
    expect(boxes.length, '找不到 petalFemur 命名的 mesh').toBeGreaterThan(0)

    for (const [i, bb] of boxes.entries()) {
      const size = new THREE.Vector3()
      bb.getSize(size)
      // petalFemurGeometry() 建在局部坐标系：X=沿腿节长度，Y=厚度，Z=宽度（含花瓣鼓包）
      const thickness = size.y
      const width = size.z

      // eslint-disable-next-line no-console
      console.log(
        `[orchid-mantis] petalFemur#${i} length(x)=${size.x.toFixed(4)} thickness(y)=${thickness.toFixed(4)} width(z)=${width.toFixed(4)} ratio=${(width / thickness).toFixed(2)}`,
      )
      expect(
        width,
        `petalFemur#${i} 宽度 ${width.toFixed(4)} 应 ≥ 厚度 ${thickness.toFixed(4)} 的 3.5 倍（${(thickness * 3.5).toFixed(4)}）`,
      ).toBeGreaterThanOrEqual(thickness * 3.5)
    }
  })

  it('三角面数在预算内', () => {
    const { triangles } = inspectGeometry(model.group)
    // eslint-disable-next-line no-console
    console.log(`[orchid-mantis] triangles = ${Math.round(triangles)}`)
    expect(triangles).toBeLessThanOrEqual(TRIANGLE_BUDGET)
  })
})

describe('枯叶蛱蝶 buildDeadLeafButterfly', () => {
  const model = buildDeadLeafButterfly()

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

  it('anchors 恰好是 underwing/forewing/tail/antenna/eye/abdomen，且无 NaN', () => {
    checkAnchorsExact(model, ['underwing', 'forewing', 'tail', 'antenna', 'eye', 'abdomen'])
  })

  it('四翅整体 Y 向跨度 > Z 向跨度（证明翅是竖立合拢，而非侧展的 V 姿）', () => {
    model.group.updateMatrixWorld(true)
    const box = unionBoxByName(model.group, 'wingFace')
    expect(box.isEmpty(), '找不到 wingFace 命名的 mesh').toBe(false)

    const size = new THREE.Vector3()
    box.getSize(size)
    // eslint-disable-next-line no-console
    console.log(`[dead-leaf-butterfly] wings Y=${size.y.toFixed(4)} Z=${size.z.toFixed(4)} X=${size.x.toFixed(4)}`)
    expect(size.y, `翅整体 Y 向跨度 ${size.y.toFixed(4)} 应 > Z 向跨度 ${size.z.toFixed(4)}`).toBeGreaterThan(size.z)
  })

  it("主叶脉 mesh 存在，且其局部 X 跨度 ≥ 后翅翅长(2.5)的 0.8 倍（贯穿整片翅）", () => {
    // 2.5 = dead-leaf-butterfly.ts 里 hindSpec.length（主叶脉画在后翅上）
    const HIND_WING_LENGTH = 2.5
    const boxes = localBoxesByName(model.group, 'mainVein')
    expect(boxes.length, '找不到 mainVein 命名的 mesh').toBeGreaterThan(0)

    for (const [i, bb] of boxes.entries()) {
      const size = new THREE.Vector3()
      bb.getSize(size)
      // eslint-disable-next-line no-console
      console.log(`[dead-leaf-butterfly] mainVein#${i} localSpanX=${size.x.toFixed(4)} threshold=${(HIND_WING_LENGTH * 0.8).toFixed(4)}`)
      expect(
        size.x,
        `主叶脉#${i} 局部 X 跨度 ${size.x.toFixed(4)} 应 ≥ 后翅翅长的 0.8 倍（${(HIND_WING_LENGTH * 0.8).toFixed(4)}）`,
      ).toBeGreaterThanOrEqual(HIND_WING_LENGTH * 0.8)
    }
  })

  it('三角面数在预算内', () => {
    const { triangles } = inspectGeometry(model.group)
    // eslint-disable-next-line no-console
    console.log(`[dead-leaf-butterfly] triangles = ${Math.round(triangles)}`)
    expect(triangles).toBeLessThanOrEqual(TRIANGLE_BUDGET)
  })
})

describe('天蛾 buildHawkMoth', () => {
  const model = buildHawkMoth()

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

  it('anchors 恰好是 proboscis/forewing/hindwing/antenna/eye/abdomen，且无 NaN', () => {
    checkAnchorsExact(model, ['proboscis', 'forewing', 'hindwing', 'antenna', 'eye', 'abdomen'])
  })

  it('前翅长宽比 ≥ 3.0（局部几何包围盒：局部X=翅长，局部Z=翅宽，不受后掠姿态旋转影响）', () => {
    const boxes = localBoxesByName(model.group, 'forewingFace')
    expect(boxes.length, '找不到 forewingFace 命名的 mesh').toBeGreaterThan(0)

    for (const [i, bb] of boxes.entries()) {
      const size = new THREE.Vector3()
      bb.getSize(size)
      const ratio = size.x / size.z
      // eslint-disable-next-line no-console
      console.log(`[hawk-moth] forewingFace#${i} length(x)=${size.x.toFixed(4)} width(z)=${size.z.toFixed(4)} ratio=${ratio.toFixed(2)}`)
      expect(ratio, `前翅#${i} 长宽比 ${ratio.toFixed(2)} 应 ≥ 3.0`).toBeGreaterThanOrEqual(3.0)
    }
  })

  it('喙的 X 跨度在躯干（头+胸+腹）长度的 1.2~1.6 倍之间（钉住上限，防止又变成标枪）', () => {
    model.group.updateMatrixWorld(true)
    const bodyBox = new THREE.Box3()
    for (const name of ['head', 'thorax', 'abdomen']) bodyBox.union(unionBoxByName(model.group, name))
    const proboscisBox = unionBoxByName(model.group, 'proboscis')
    expect(bodyBox.isEmpty(), '找不到躯干命名 mesh（head/thorax/abdomen）').toBe(false)
    expect(proboscisBox.isEmpty(), '找不到 proboscis 命名的 mesh').toBe(false)

    const bodySize = new THREE.Vector3()
    bodyBox.getSize(bodySize)
    const proboscisSize = new THREE.Vector3()
    proboscisBox.getSize(proboscisSize)
    const ratio = proboscisSize.x / bodySize.x

    // eslint-disable-next-line no-console
    console.log(
      `[hawk-moth] bodyLengthX=${bodySize.x.toFixed(4)} proboscisSpanX=${proboscisSize.x.toFixed(4)} ratio=${ratio.toFixed(2)}`,
    )
    expect(
      ratio,
      `喙 X 跨度/躯干长度 = ${ratio.toFixed(2)} 应 ≥ 1.2（喙 ${proboscisSize.x.toFixed(4)} vs 躯干 ${bodySize.x.toFixed(4)}）`,
    ).toBeGreaterThanOrEqual(1.2)
    expect(
      ratio,
      `喙 X 跨度/躯干长度 = ${ratio.toFixed(2)} 应 ≤ 1.6，防止又变回"长度是身体三四倍"的标枪（喙 ${proboscisSize.x.toFixed(4)} vs 躯干 ${bodySize.x.toFixed(4)}）`,
    ).toBeLessThanOrEqual(1.6)
  })

  it('喙不是直线：存在明显低于末端的下弧点（分段弧线 + 末梢回勾，不是直杆）', () => {
    model.group.updateMatrixWorld(true)
    const proboscisBox = unionBoxByName(model.group, 'proboscis')
    expect(proboscisBox.isEmpty(), '找不到 proboscis 命名的 mesh').toBe(false)
    const tipY = model.anchors.proboscis.y
    const sag = tipY - proboscisBox.min.y
    // eslint-disable-next-line no-console
    console.log(`[hawk-moth] proboscis minY=${proboscisBox.min.y.toFixed(4)} tipY=${tipY.toFixed(4)} sag=${sag.toFixed(4)}`)
    // 若喙是直杆（单调下伸到末端），最低点就是末端本身（差值只等于末端处的管半径，很小）；
    // 末梢回勾会让最低点出现在中段、明显低于末端，这里要求差值远大于管半径。
    expect(
      sag,
      `喙最低点 Y=${proboscisBox.min.y.toFixed(4)} 应明显低于末端 Y=${tipY.toFixed(4)}（差 ${sag.toFixed(4)} 应 > 0.05），证明中段下弧、末梢回勾，不是单调直杆`,
    ).toBeGreaterThan(0.05)
  })

  it('三角面数在预算内', () => {
    const { triangles } = inspectGeometry(model.group)
    // eslint-disable-next-line no-console
    console.log(`[hawk-moth] triangles = ${Math.round(triangles)}`)
    expect(triangles).toBeLessThanOrEqual(TRIANGLE_BUDGET)
  })
})

describe('白蚁兵蚁 buildTermiteSoldier', () => {
  const model = buildTermiteSoldier()

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

  it('anchors 恰好是 head/mandible/abdomen/antenna/thorax/leg，且无 NaN', () => {
    checkAnchorsExact(model, ['head', 'mandible', 'abdomen', 'antenna', 'thorax', 'leg'])
  })

  it('头部包围盒体积 ≥ 胸+腹体积之和（"大头拖着一小截软身子"）', () => {
    model.group.updateMatrixWorld(true)
    const headBox = unionBoxByName(model.group, 'head')
    const thoraxBox = unionBoxByName(model.group, 'thorax')
    const abdomenBox = unionBoxByName(model.group, 'abdomen')
    expect(headBox.isEmpty(), '找不到 head 命名的 mesh').toBe(false)
    expect(thoraxBox.isEmpty(), '找不到 thorax 命名的 mesh').toBe(false)
    expect(abdomenBox.isEmpty(), '找不到 abdomen 命名的 mesh').toBe(false)

    const headSize = new THREE.Vector3()
    headBox.getSize(headSize)
    const thoraxSize = new THREE.Vector3()
    thoraxBox.getSize(thoraxSize)
    const abdomenSize = new THREE.Vector3()
    abdomenBox.getSize(abdomenSize)

    const headVolume = headSize.x * headSize.y * headSize.z
    const restVolume = thoraxSize.x * thoraxSize.y * thoraxSize.z + abdomenSize.x * abdomenSize.y * abdomenSize.z

    // eslint-disable-next-line no-console
    console.log(
      `[termite-soldier] headBox=${headSize.toArray().map((n) => n.toFixed(3))} vol=${headVolume.toFixed(6)} ` +
        `thorax+abdomen vol=${restVolume.toFixed(6)} ratio=${(headVolume / restVolume).toFixed(2)}`,
    )
    expect(headVolume, `头部包围盒体积 ${headVolume.toFixed(6)} 应 ≥ 胸+腹体积之和 ${restVolume.toFixed(6)}`).toBeGreaterThanOrEqual(
      restVolume,
    )
  })

  it('不存在任何复眼 mesh（兵蚁是盲的——扫全部 mesh.name，不得含 "eye"）', () => {
    const eyeLikeNames: string[] = []
    model.group.traverse((obj) => {
      const mesh = obj as THREE.Mesh
      if (mesh.isMesh && /eye/i.test(mesh.name)) eyeLikeNames.push(mesh.name)
    })
    expect(eyeLikeNames, `发现疑似复眼命名的 mesh: ${eyeLikeNames.join(', ')}`).toEqual([])
  })

  it('三角面数在预算内', () => {
    const { triangles } = inspectGeometry(model.group)
    // eslint-disable-next-line no-console
    console.log(`[termite-soldier] triangles = ${Math.round(triangles)}`)
    expect(triangles).toBeLessThanOrEqual(TRIANGLE_BUDGET)
  })
})
