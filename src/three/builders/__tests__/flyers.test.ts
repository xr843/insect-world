/**
 * 帝王蝶 / 西方蜜蜂 / 碧伟蜓三个物种 builder 的健全性测试。
 *
 * 和其它物种一样，这里不做「像不像」的美术评审，只守程序化建模最容易
 * 踩的三个坑：
 *   1. loft() 出 NaN —— 通常是某个截面半径为 0、首尾截面重合、或自写的
 *      枢轴/螺旋数学里出现了除零，一旦出现就是全模型崩坏。
 *   2. 包围盒比例是否至少符合该目最基本的体型特征（蜻蜓细长、蝶展翅
 *      宽阔），能挡住"轴用反了"这类低级错误。
 *   3. anchors 是否齐全、坐标是否有限——hotspot 系统直接读这些坐标；
 *      本文件里三个物种都用到了 Object3D.localToWorld 现算翅尖坐标，
 *      这条路径尤其容易在矩阵没 updateMatrixWorld 时读出陈旧/NaN 数据。
 */
import * as THREE from 'three'
import { describe, expect, it } from 'vitest'
import { buildMonarchButterfly } from '../monarch-butterfly'
import { buildHoneybee } from '../honeybee'
import { buildDragonfly } from '../dragonfly'
import type { InsectModel } from '../kit'

const TRIANGLE_BUDGET = 150_000

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

function expectAnchors(model: InsectModel, required: string[]) {
  for (const key of required) {
    expect(model.anchors, `缺少 anchor: ${key}`).toHaveProperty(key)
    expectFiniteVector(model.anchors[key], `anchors.${key}`)
  }
}

/** 收集模型里全部去重材质的 HSL（用 sRGB 色彩空间取值，才是人眼/取色器看到的直观色相）。 */
function collectMaterialHSL(model: InsectModel): { h: number; s: number; l: number }[] {
  const seen = new Set<THREE.Material>()
  const out: { h: number; s: number; l: number }[] = []
  model.group.traverse((obj) => {
    const mesh = obj as THREE.Mesh
    if (!mesh.isMesh) return
    const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
    for (const mat of mats) {
      const m = mat as THREE.MeshPhysicalMaterial
      if (!m || seen.has(m) || !('color' in m) || !m.color) continue
      seen.add(m)
      const hsl = { h: 0, s: 0, l: 0 }
      m.color.getHSL(hsl, THREE.SRGBColorSpace)
      out.push(hsl)
    }
  })
  return out
}

describe('帝王蝶 buildMonarchButterfly', () => {
  it('构建不抛异常，几何体无 NaN，radius 合理', () => {
    const model = buildMonarchButterfly()
    expect(model.radius).toBeGreaterThan(0)

    const s = scan(model)
    expect(s.nanMeshNames, `含 NaN 的 mesh: ${s.nanMeshNames.join(', ')}`).toHaveLength(0)
    expect(s.meshCount).toBeGreaterThan(0)
    console.log(`[monarch] mesh=${s.meshCount} triangles=${Math.round(s.triangles)}`)
    expect(s.triangles).toBeLessThanOrEqual(TRIANGLE_BUDGET)
  })

  it('包围盒比例符合"半展开双翅"体型：翅展横向宽度明显 > 体高', () => {
    const model = buildMonarchButterfly()
    const box = new THREE.Box3().setFromObject(model.group)
    const size = new THREE.Vector3()
    box.getSize(size)

    // 体长（前后，X）约 2.5cm，但翅比身体本身还大幅向后/向外伸出，
    // 整体包围盒的 X 会明显超出单纯体长，容许到个位数厘米内
    expect(size.x).toBeGreaterThan(2)
    expect(size.x).toBeLessThan(7)
    // 翅展目标约 10cm：半展开+上扬姿态下达不到完全展平的全长，
    // 但两侧翅尖间的横向宽度仍应远大于体高，且已是体长的数倍
    expect(size.z).toBeGreaterThan(size.y)
    expect(size.z).toBeGreaterThan(6)
    expect(size.z).toBeGreaterThan(size.x)
  })

  it('anchors 齐全：forewing/hindwing/proboscis/antenna/eye/abdomen', () => {
    expectAnchors(buildMonarchButterfly(), ['forewing', 'hindwing', 'proboscis', 'antenna', 'eye', 'abdomen'])
  })

  // 下面两条是 2026-08 配色/姿态修复补的回归断言。
  // 自检：把翅面色换回旧版的暗红褐、把 tilt 换回旧版的 -13/-7，
  // 这两条会全部失败（旧 tilt 下 box.max.y≈0.80、torsoTop≈-0.26，
  // 差值≈1.06 < 1.5 且 0.80 < 4.3×0.3=1.29）。
  it('翅面配色：橙底饱和明快；翅脉/翅缘黑得足够暗，不会和橙色糊成一块褐色', () => {
    const model = buildMonarchButterfly()
    const hsls = collectMaterialHSL(model)
    // l > 0.35 把翅面橙色和体表那些"同色系但暗得多"的材质（如喙管的
    // 深褐色 #3a2a12，hue 也落在 25~40° 但明度只有 0.15）区分开——
    // 帝王蝶翅面在米色背景下应该是"一眼跳出来"的明快橙色，不是暗色
    const orange = hsls.find((c) => {
      const deg = c.h * 360
      return deg >= 25 && deg <= 40 && c.s > 0.5 && c.l > 0.35
    })
    expect(
      orange,
      `未找到 hue 落在 25~40°、饱和度 > 0.5 且明快(l>0.35)的翅面材质；实际材质=${JSON.stringify(
        hsls.map((c) => ({ h: Math.round(c.h * 360), s: +c.s.toFixed(2), l: +c.l.toFixed(2) })),
      )}`,
    ).toBeTruthy()
    const darkest = hsls.reduce((a, b) => (b.l < a.l ? b : a))
    expect(darkest.l, `翅脉/翅缘材质应足够黑（明度 < 0.15），实际最暗明度=${darkest.l}`).toBeLessThan(0.15)
    expect(
      orange!.l - darkest.l,
      '翅面与最暗材质的明度差应足够大，证明黑脉/黑边不会被橙色底糊住',
    ).toBeGreaterThan(0.3)
  })

  it('翅上举成 V 而非标本式平摊：翅面最高点显著高于躯干顶部，包围盒高度不再接近 0', () => {
    const model = buildMonarchButterfly()
    const box = new THREE.Box3().setFromObject(model.group)
    // 复眼锚点紧贴头胸背线，用作"躯干顶部"的参照
    const torsoTop = model.anchors.eye.y
    expect(
      box.max.y - torsoTop,
      '翅尖最高点应比复眼（躯干参照）高出一大截，而非与躯干齐平（平摊姿态）',
    ).toBeGreaterThan(1.5)
    // forewing.length = 4.3（见 monarch-butterfly.ts 内 foreSpec）；半展平摊时
    // 包围盒高度接近 0，上举成 V 后应达到翅长的三成以上
    expect(box.max.y, '翅上举后包围盒高度不应再接近 0').toBeGreaterThan(4.3 * 0.3)
  })
})

describe('西方蜜蜂 buildHoneybee', () => {
  it('构建不抛异常，几何体无 NaN，radius 合理', () => {
    const model = buildHoneybee()
    expect(model.radius).toBeGreaterThan(0)

    const s = scan(model)
    expect(s.nanMeshNames, `含 NaN 的 mesh: ${s.nanMeshNames.join(', ')}`).toHaveLength(0)
    expect(s.meshCount).toBeGreaterThan(0)
    console.log(`[honeybee] mesh=${s.meshCount} triangles=${Math.round(s.triangles)}`)
    expect(s.triangles).toBeLessThanOrEqual(TRIANGLE_BUDGET)
  })

  it('体长量级符合约 1.3cm 的小型社会性蜂', () => {
    const model = buildHoneybee()
    const box = new THREE.Box3().setFromObject(model.group)
    const size = new THREE.Vector3()
    box.getSize(size)

    expect(size.x).toBeGreaterThan(0.8)
    expect(size.x).toBeLessThan(2)
  })

  it('胸部绒毛确实生成了一大批独立的锥体网格（不是只有躯干本体）', () => {
    const model = buildHoneybee()
    let coneCount = 0
    model.group.traverse((obj) => {
      const mesh = obj as THREE.Mesh
      if (mesh.isMesh && mesh.geometry.type === 'ConeGeometry') coneCount++
    })
    expect(coneCount).toBeGreaterThanOrEqual(120)
    expect(coneCount).toBeLessThanOrEqual(220)
  })

  it('anchors 齐全：stinger/pollenBasket/wing/eye/antenna/thorax', () => {
    expectAnchors(buildHoneybee(), ['stinger', 'pollenBasket', 'wing', 'eye', 'antenna', 'thorax'])
  })
})

describe('碧伟蜓 buildDragonfly', () => {
  it('构建不抛异常，几何体无 NaN，radius 合理', () => {
    const model = buildDragonfly()
    expect(model.radius).toBeGreaterThan(0)

    const s = scan(model)
    expect(s.nanMeshNames, `含 NaN 的 mesh: ${s.nanMeshNames.join(', ')}`).toHaveLength(0)
    expect(s.meshCount).toBeGreaterThan(0)
    console.log(`[dragonfly] mesh=${s.meshCount} triangles=${Math.round(s.triangles)}`)
    expect(s.triangles).toBeLessThanOrEqual(TRIANGLE_BUDGET)
  })

  it('体形细长：体长（X）明显大于体高（Y），符合蜻蜓目细长体形', () => {
    const model = buildDragonfly()
    const box = new THREE.Box3().setFromObject(model.group)
    const size = new THREE.Vector3()
    box.getSize(size)

    // 体长约 7cm 量级
    expect(size.x).toBeGreaterThan(5)
    expect(size.x).toBeLessThan(9)
    expect(size.x).toBeGreaterThan(size.y)
    // 翅展约 9cm：完全水平平展的两对翅应把横向宽度撑到接近翅展量级
    expect(size.z).toBeGreaterThan(6)
  })

  it('翅是水平平展而非半展开：翅尖相对胸部的侧向位移远大于垂直位移', () => {
    // 不直接读 spread 角度常量（那只是复述代码），而是几何验证：
    // 完全水平平展（spread≈90°）时，翅尖相对翅基应几乎全部是侧向（Z）偏移，
    // 垂直（Y）偏移应该很小；半展开姿态则会有明显的 Y 偏移。
    const model = buildDragonfly()
    const thorax = model.anchors.thorax
    const forewing = model.anchors.forewing
    const lateralOffset = Math.abs(forewing.z - thorax.z)
    const verticalOffset = Math.abs(forewing.y - thorax.y)
    expect(lateralOffset).toBeGreaterThan(verticalOffset * 4)
  })

  it('anchors 齐全：forewing/hindwing/eye/abdomen/thorax/leg', () => {
    expectAnchors(buildDragonfly(), ['forewing', 'hindwing', 'eye', 'abdomen', 'thorax', 'leg'])
  })
})
