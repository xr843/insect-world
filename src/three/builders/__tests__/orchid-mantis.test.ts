/**
 * 兰花螳螂返工验证。
 *
 * 独立于 round5b.test.ts（另有 agent 在改那个文件），helper 函数因此在这里
 * 重新写了一份小的，而不是从那边 import——技术上和 round5b.test.ts 里的同名
 * helper 类似（都是这批物种测试的通用套路：按 mesh.name 收集包围盒），但两个
 * 文件应各自独立，不产生跨文件耦合。
 *
 * 覆盖点，对照返工任务的四个问题：
 * - 基础健壮性：构建不抛异常、无 NaN、radius>0、anchors 恰好匹配、面数预算内
 * - 问题1（"棍子"）：体长 / 体宽 ≤ 3.0。只量躯干（head/prothorax/thorax/
 *   abdomen 四个命名 mesh）的并集包围盒，不含腿/翅/触角——腿本来就该伸展到
 *   躯干外面，把它们算进"体宽"反而会掩盖躯干本身是否紧凑这件事。
 * - 问题2（花瓣侧立）：
 *   (a) 保留原有的局部宽厚比 ≥3.5 要求；
 *   (b) 新增局部"长(x)、宽(z) 都明显大于厚(y)"——防止只有宽度这一个维度
 *       撑数字、长度被压成一个薄片；
 *   (c) 新增世界坐标朝向检查：花瓣厚度轴（局部 +Y，扁平面法线）在世界坐标
 *       下与默认相机方向（InsectCanvas.tsx 的 home 向量）的夹角余弦（绝对值）
 *       不能太小。这是三条里唯一真正钉住"返工前测试全绿但像虾"这件事的
 *       检查——(a)(b) 只能证明花瓣几何体本身是花瓣形，证明不了它有没有被
 *       转成侧立的边（局部尺寸不随整体旋转改变，(a)(b) 在旧版 buggy 朝向下
 *       同样成立）。
 * - 问题3（虾头）：复眼分处两侧（z 向跨度明显大于 y 向）+ 头部俯视投影前后
 *   端宽度明显不同（三角形而非球体）。
 *
 * 问题4（捕捉足看不出来）主要是比例/颜色问题，颜色不可测、比例已被"面数
 * 预算内 + 无 NaN + anchors 存在"间接兜底，未单独加断言，避免为了凑断言而
 * 断言。
 */
import * as THREE from 'three'
import { describe, expect, it } from 'vitest'
import { buildOrchidMantis } from '../orchid-mantis'
import type { InsectModel } from '../kit'

const TRIANGLE_BUDGET = 150_000

/** 与 orchid-mantis.ts 里的 DEFAULT_VIEW_DIR 同一来源：InsectCanvas.tsx 的
 * CameraRig home 常量（挂载/复位时相机实际所在方向）。*/
const DEFAULT_VIEW_DIR = new THREE.Vector3(0.86, 0.44, 1.25).normalize()

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

/** 按 mesh.name（可传多个名字）收集并集包围盒——世界坐标，量的是真实渲染几何体 */
function unionBoxByNames(group: THREE.Group, names: string[]): THREE.Box3 {
  const box = new THREE.Box3()
  group.traverse((obj) => {
    const mesh = obj as THREE.Mesh
    if (mesh.isMesh && names.includes(mesh.name)) box.union(new THREE.Box3().setFromObject(mesh))
  })
  return box
}

/** 按 mesh.name 收集局部几何包围盒的并集——不经父级 world 矩阵，用于斜向
 * 姿态部件（长度/厚度/宽度必须在局部空间量，world 包围盒会把三者混在一起）*/
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

function meshesByName(group: THREE.Group, name: string): THREE.Mesh[] {
  const out: THREE.Mesh[] = []
  group.traverse((obj) => {
    const mesh = obj as THREE.Mesh
    if (mesh.isMesh && mesh.name === name) out.push(mesh)
  })
  return out
}

describe('兰花螳螂返工 buildOrchidMantis', () => {
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

  it('三角面数在预算内', () => {
    const { triangles } = inspectGeometry(model.group)
    // eslint-disable-next-line no-console
    console.log(`[orchid-mantis rework] triangles = ${Math.round(triangles)}`)
    expect(triangles).toBeLessThanOrEqual(TRIANGLE_BUDGET)
  })

  it('体长 / 体宽 ≤ 3.0（钉住"不是一根棍"：只量躯干 head+prothorax+thorax+abdomen，不含腿/翅/触角）', () => {
    model.group.updateMatrixWorld(true)
    const box = unionBoxByNames(model.group, ['head', 'prothorax', 'thorax', 'abdomen'])
    expect(box.isEmpty(), '找不到躯干命名 mesh（head/prothorax/thorax/abdomen）').toBe(false)

    const size = new THREE.Vector3()
    box.getSize(size)
    const width = Math.max(size.y, size.z)
    const ratio = size.x / width
    // eslint-disable-next-line no-console
    console.log(
      `[orchid-mantis rework] body length(x)=${size.x.toFixed(4)} width=max(y,z)=${width.toFixed(4)} (y=${size.y.toFixed(4)} z=${size.z.toFixed(4)}) ratio=${ratio.toFixed(2)}`,
    )
    expect(ratio, `体长/体宽 ${ratio.toFixed(2)} 应 ≤ 3.0`).toBeLessThanOrEqual(3.0)
  })

  it('花瓣状腿节的最大宽度 ≥ 其厚度的 3.5 倍（保留原有要求）', () => {
    const boxes = localBoxesByName(model.group, 'petalFemur')
    expect(boxes.length, '找不到 petalFemur 命名的 mesh').toBeGreaterThan(0)

    for (const [i, bb] of boxes.entries()) {
      const size = new THREE.Vector3()
      bb.getSize(size)
      const thickness = size.y
      const width = size.z
      // eslint-disable-next-line no-console
      console.log(
        `[orchid-mantis rework] petalFemur#${i} length(x)=${size.x.toFixed(4)} thickness(y)=${thickness.toFixed(4)} width(z)=${width.toFixed(4)} widthRatio=${(width / thickness).toFixed(2)}`,
      )
      expect(
        width,
        `petalFemur#${i} 宽度 ${width.toFixed(4)} 应 ≥ 厚度 ${thickness.toFixed(4)} 的 3.5 倍（${(thickness * 3.5).toFixed(4)}）`,
      ).toBeGreaterThanOrEqual(thickness * 3.5)
    }
  })

  it('花瓣的宽(z)、长(x)两个主尺寸都应明显大于厚(y)——不能只有宽度一个维度撑数字', () => {
    const boxes = localBoxesByName(model.group, 'petalFemur')
    expect(boxes.length).toBeGreaterThan(0)
    for (const [i, bb] of boxes.entries()) {
      const size = new THREE.Vector3()
      bb.getSize(size)
      const lengthRatio = size.x / size.y
      const widthRatio = size.z / size.y
      // eslint-disable-next-line no-console
      console.log(`[orchid-mantis rework] petalFemur#${i} lengthRatio(x/y)=${lengthRatio.toFixed(2)} widthRatio(z/y)=${widthRatio.toFixed(2)}`)
      expect(lengthRatio, `petalFemur#${i} 长/厚 ${lengthRatio.toFixed(2)} 应 ≥ 2.5`).toBeGreaterThanOrEqual(2.5)
      expect(widthRatio, `petalFemur#${i} 宽/厚 ${widthRatio.toFixed(2)} 应 ≥ 2.5`).toBeGreaterThanOrEqual(2.5)
    }
  })

  it('花瓣扁平面法线（局部 +Y，世界坐标）不能与默认视角方向接近垂直——否则从常见视角看仍是一条边', () => {
    const meshes = meshesByName(model.group, 'petalFemur')
    expect(meshes.length).toBeGreaterThan(0)
    model.group.updateMatrixWorld(true)
    const results: { i: number; facing: number }[] = []
    for (const [i, mesh] of meshes.entries()) {
      // transformDirection 直接用 matrixWorld 的线性部分变换方向向量并归一化，
      // 正确处理 mirrorZ() 带来的负缩放（镜像）——不能用 getWorldQuaternion()，
      // 那是从 world 矩阵做极分解取旋转部分，镜像（行列式<0）不是纯旋转，
      // 分解出的四元数会丢掉镜像分量，套到参考向量上得到错误方向。
      const worldNormal = new THREE.Vector3(0, 1, 0).transformDirection(mesh.matrixWorld).normalize()
      const facing = Math.abs(worldNormal.dot(DEFAULT_VIEW_DIR))
      results.push({ i, facing })
      // eslint-disable-next-line no-console
      console.log(
        `[orchid-mantis rework] petalFemur#${i} worldNormal=(${worldNormal.x.toFixed(3)}, ${worldNormal.y.toFixed(3)}, ${worldNormal.z.toFixed(3)}) facing=|dot(DEFAULT_VIEW_DIR)|=${facing.toFixed(3)}`,
      )
    }
    // 先把全部结果收集打印完，再统一断言——比逐条 expect 更好排查：
    // 一次能看到 4 片花瓣的真实分布，而不是踩到第一片就中断。
    for (const { i, facing } of results) {
      expect(
        facing,
        `petalFemur#${i} 扁平面法线与默认视角方向的夹角余弦(绝对值) ${facing.toFixed(3)} 太小，说明花瓣被转成了侧立的边`,
      ).toBeGreaterThan(0.45)
    }
  })

  it('头部：复眼分处两侧（z 向跨度明显大于 y 向）', () => {
    model.group.updateMatrixWorld(true)
    const box = unionBoxByNames(model.group, ['eye'])
    expect(box.isEmpty(), '找不到 eye 命名的 mesh').toBe(false)
    const size = new THREE.Vector3()
    box.getSize(size)
    // eslint-disable-next-line no-console
    console.log(`[orchid-mantis rework] eyes y=${size.y.toFixed(4)} z=${size.z.toFixed(4)}`)
    expect(size.z, `复眼 z 向跨度 ${size.z.toFixed(4)} 应 > y 向跨度 ${size.y.toFixed(4)} 的 1.3 倍`).toBeGreaterThan(size.y * 1.3)
  })

  it('头部：俯视投影呈三角形——前 1/3 与后 1/3 区段的最大 |z| 应有明显差异，而不是一个球', () => {
    const meshes = meshesByName(model.group, 'head')
    expect(meshes.length).toBeGreaterThan(0)
    const mesh = meshes[0]
    const pos = mesh.geometry.getAttribute('position')
    let minX = Infinity
    let maxX = -Infinity
    for (let i = 0; i < pos.count; i++) {
      minX = Math.min(minX, pos.getX(i))
      maxX = Math.max(maxX, pos.getX(i))
    }
    const span = maxX - minX
    expect(span, '头部 mesh 的 x 跨度应 > 0').toBeGreaterThan(0)

    let backMaxZ = 0
    let frontMaxZ = 0
    for (let i = 0; i < pos.count; i++) {
      const t = (pos.getX(i) - minX) / span
      const z = Math.abs(pos.getZ(i))
      if (t <= 0.35) backMaxZ = Math.max(backMaxZ, z)
      if (t >= 0.65) frontMaxZ = Math.max(frontMaxZ, z)
    }
    const hi = Math.max(backMaxZ, frontMaxZ)
    const lo = Math.min(backMaxZ, frontMaxZ)
    // eslint-disable-next-line no-console
    console.log(`[orchid-mantis rework] head backMaxZ=${backMaxZ.toFixed(4)} frontMaxZ=${frontMaxZ.toFixed(4)} ratio=${(hi / Math.max(lo, 1e-6)).toFixed(2)}`)
    expect(lo, '头部前后两端 |z| 都不能是 0（否则不构成"分处两侧"的宽度变化）').toBeGreaterThan(0)
    expect(
      hi / lo,
      `头部前后两端最大 |z| 比值 ${(hi / lo).toFixed(2)} 应 ≥ 1.35（前窄后宽或后窄前宽的三角形，而不是宽度均匀的球/柱）`,
    ).toBeGreaterThanOrEqual(1.35)
  })
})
