/**
 * 中华黄萤三个生活史阶段（卵 / 幼虫 / 蛹）的形态断言。
 *
 * ## 这份测试的自检标准
 *
 * **把代码改回出问题的版本，这条断言会不会红？** 不会就等于没写。
 * 每一条都对着一个真出过的问题（多数是本轮出图时当场撞到的）：
 *
 * | 退化 | 该红的断言 |
 * | --- | --- |
 * | 背板压平（PLATE_RISE=0） | 叠瓦：后缘翘起量 / 相邻两片的净空 |
 * | 背板不再交叠（REAR_MID=1） | 叠瓦：窗口里取不到下一片的顶点 |
 * | 后侧角取消（REAR_SIDE=REAR_MID） | 梯形：侧角比中线更靠后 |
 * | 背板压成近黑 | 背板明度带 + 与体壁的明度差 |
 * | 侧斑与背板同色 | 斑与背板的明度差 ≥ 0.35 |
 * | 幼虫做成圆筒 | 高 / 宽 落在 0.25~0.5 之外 |
 * | 足挪到腹部 | 六足全在 x > 0.35 |
 * | 两颚并拢到中线 | 顶视投影最小间距 |
 * | 任一阶段去掉 emissive | 三个阶段都得有自发光 |
 * | 三个阶段亮度拉平 | 幼虫 > 蛹 ≈ 卵 的排序 |
 * | 卵放大 / 只剩一粒 | 粒径 0.09~0.115、簇 4~6 粒 |
 * | 土做成一圈同样大的滚圆小球 | 粒径离散度 ≥ 4、非球形比例、多档土色 |
 * | 蛹缺触角芽 / 足芽 | 三套芽各自的数量 |
 * | 蛹的芽压成贴片 | 芽必须凸出体壁 ≥ 0.015 且圆心埋在壁内 |
 * | 蛹摆平（ROLL_DEG=0） | 芽的朝向与顶 / 侧机位的夹角 |
 *
 * ## 量的是「人看见的那个量」
 *
 * 老教训：断言量的是数字，人看的是长相，两者可以毫无关系（兰花螳螂的宽厚比
 * 测出 5.75 是绿的，渲染出来是几片侧立的薄板）。所以叠瓦不靠「背板数 = 12」
 * 一条，而是量**相邻两片之间在画面上留没留出那道缝**；两支大颚不比三维距离，
 * 而是比顶视投影的最小间距（白蚁兵蚁那一轮换来的写法）。
 */
import * as THREE from 'three'
import { describe, expect, it } from 'vitest'
import { buildFirefly } from '../firefly'
import { buildFireflyEgg } from '../stages/firefly-egg'
import { buildFireflyLarva } from '../stages/firefly-larva'
import { buildFireflyPupa } from '../stages/firefly-pupa'
import type { InsectModel } from '../kit'
import { HOLOMETABOLOUS, builtStagesOf, metamorphosisOf } from '../../stages'

/** 三个阶段都远低于这个预算；上限只防「某次改动让面数失控」 */
const TRIANGLE_BUDGET = 60_000

/** 验收机位（与 scripts/new-species-shots.mjs 一致） */
const VIEWS: Record<string, THREE.Vector3> = {
  top: new THREE.Vector3(0.18, 1, 0.14).normalize(),
  side: new THREE.Vector3(0.12, 0.28, 1).normalize(),
  front: new THREE.Vector3(1, 0.32, 0.4).normalize(),
  rear: new THREE.Vector3(-0.85, 0.42, -0.7).normalize(),
}

// ---------------------------------------------------------------- 通用工具

function meshesNamed(model: InsectModel, ...names: string[]): THREE.Mesh[] {
  const out: THREE.Mesh[] = []
  model.group.updateMatrixWorld(true)
  model.group.traverse((o) => {
    const m = o as THREE.Mesh
    if (m.isMesh && names.includes(m.name)) out.push(m)
  })
  return out
}

function verticesOfMesh(mesh: THREE.Mesh): THREE.Vector3[] {
  const pos = mesh.geometry.getAttribute('position')
  const out: THREE.Vector3[] = []
  for (let i = 0; i < pos.count; i++) {
    out.push(new THREE.Vector3().fromBufferAttribute(pos, i).applyMatrix4(mesh.matrixWorld))
  }
  return out
}

function verticesOf(model: InsectModel, ...names: string[]): THREE.Vector3[] {
  return meshesNamed(model, ...names).flatMap(verticesOfMesh)
}

function boxOf(model: InsectModel, ...names: string[]): THREE.Box3 {
  const box = new THREE.Box3()
  for (const m of meshesNamed(model, ...names)) box.union(new THREE.Box3().setFromObject(m))
  return box
}

function triangleCount(model: InsectModel): number {
  let n = 0
  model.group.traverse((o) => {
    const m = o as THREE.Mesh
    if (!m.isMesh) return
    const g = m.geometry
    n += g.index ? g.index.count / 3 : g.getAttribute('position').count / 3
  })
  return n
}

function hasNonFinite(model: InsectModel): boolean {
  let bad = false
  model.group.traverse((o) => {
    const m = o as THREE.Mesh
    if (!m.isMesh) return
    const arr = m.geometry.getAttribute('position').array
    for (let i = 0; i < arr.length; i++) if (!Number.isFinite(arr[i])) bad = true
  })
  return bad
}

function materialOf(model: InsectModel, name: string): THREE.MeshPhysicalMaterial {
  const mesh = meshesNamed(model, name)[0]
  expect(mesh, `找不到名为 ${name} 的网格`).toBeTruthy()
  return mesh.material as THREE.MeshPhysicalMaterial
}

/**
 * 材质基色的 HSL —— 明度是「看得出深浅差」的那个量。
 *
 * ⚠️ 必须显式传 `SRGBColorSpace`：three 从 r152 起做颜色管理，
 * `new THREE.Color('#5c4630')` 存的是**线性**值，`getHSL()` 缺省也按线性算，
 * 读出来的明度比源码里写的那个十六进制暗一大截。拿线性值去对阈值，
 * 等于用另一把尺子量（rhino-stages.test.ts 已经踩过一次）。
 */
function hslOf(mat: THREE.MeshPhysicalMaterial): { h: number; s: number; l: number } {
  const out = { h: 0, s: 0, l: 0 }
  mat.color.getHSL(out, THREE.SRGBColorSpace)
  return out
}

/** 两组顶点投到某机位的成像平面上，量画面里两团之间的最小间距 */
function minProjectedGap(a: THREE.Vector3[], b: THREE.Vector3[], dir: THREE.Vector3): number {
  const e1 = new THREE.Vector3().crossVectors(dir, new THREE.Vector3(0, 1, 0)).normalize()
  const e2 = new THREE.Vector3().crossVectors(dir, e1).normalize()
  const pa = a.map((v) => [v.dot(e1), v.dot(e2)] as const)
  const pb = b.map((v) => [v.dot(e1), v.dot(e2)] as const)
  let best = Infinity
  for (const [x0, y0] of pa) {
    for (const [x1, y1] of pb) best = Math.min(best, Math.hypot(x0 - x1, y0 - y1))
  }
  return best
}

/**
 * 一个网格自身的三轴尺寸（几何包围盒 × scale，**不含旋转**）。
 *
 * ⚠️ 不能用世界坐标的 AABB 量「这颗粒扁不扁」：随机滚转会把扁椭球的包围盒
 * 撑回接近立方体（实测 6.8:1 的叶片量出来只有 2.2:1），于是「土粒是不是滚圆的球」
 * 这条断言会被旋转本身冲掉 —— 那正是它要防的那种退化。
 */
function localSize(mesh: THREE.Mesh): THREE.Vector3 {
  mesh.geometry.computeBoundingBox()
  const size = mesh.geometry.boundingBox!.getSize(new THREE.Vector3())
  return new THREE.Vector3(
    size.x * Math.abs(mesh.scale.x),
    size.y * Math.abs(mesh.scale.y),
    size.z * Math.abs(mesh.scale.z),
  )
}

function axisRatio(size: THREE.Vector3): number {
  return Math.max(size.x, size.y, size.z) / Math.max(Math.min(size.x, size.y, size.z), 1e-9)
}

/** 一堆网格的自发光强度（取第一个有 emissive 的） */
function emissiveOf(model: InsectModel, name: string): { color: THREE.Color; intensity: number } {
  const mat = materialOf(model, name)
  return { color: mat.emissive, intensity: mat.emissiveIntensity }
}

// ---------------------------------------------------------------- 共同契约

const STAGES: [string, () => InsectModel][] = [
  ['卵', buildFireflyEgg],
  ['幼虫', buildFireflyLarva],
  ['蛹', buildFireflyPupa],
]

describe('三个阶段的共同契约', () => {
  it.each(STAGES)('%s 能构建、无 NaN、面数在预算内', (label, build) => {
    const model = build()
    expect(hasNonFinite(model), `${label} 顶点里有 NaN/Inf`).toBe(false)
    expect(model.radius).toBeGreaterThan(0)
    expect(Number.isFinite(model.radius)).toBe(true)
    expect(triangleCount(model), `${label} 面数超预算`).toBeLessThan(TRIANGLE_BUDGET)
  })

  it('注册成一条完全变态路线：卵 → 幼虫 → 蛹 →（成虫走 registry）', () => {
    expect(metamorphosisOf('firefly')).toBe(HOLOMETABOLOUS)
    expect(builtStagesOf('firefly')).toEqual(['egg', 'larva', 'pupa'])
  })
})

/**
 * 这一只的贯穿线索：**卵、幼虫、蛹全都发光**（萤科确实如此，不只成虫）。
 * 但亮度排序必须真实 —— 全开到成虫那一档就成了三颗夜灯。
 */
describe('三个阶段都发光，且亮度排序为 幼虫 > 蛹 ≈ 卵', () => {
  const egg = emissiveOf(buildFireflyEgg(), 'egg-shell')
  const larva = emissiveOf(buildFireflyLarva(), 'larva-lantern')
  const pupa = emissiveOf(buildFireflyPupa(), 'pupa-lantern')
  const adult = emissiveOf(buildFirefly(), 'lantern')

  it('三个阶段都真的挂了自发光（去掉任何一个这条就红）', () => {
    for (const [label, e] of [
      ['卵', egg],
      ['幼虫', larva],
      ['蛹', pupa],
    ] as const) {
      expect(e.intensity, `${label} 没有自发光强度`).toBeGreaterThan(0)
      const hsl = { h: 0, s: 0, l: 0 }
      e.color.getHSL(hsl, THREE.SRGBColorSpace)
      expect(hsl.l, `${label} 的 emissive 是黑的，等于没发光`).toBeGreaterThan(0.2)
    }
  })

  it('发光色沿用成虫那一套（同一种虫的光不该三个阶段各一个颜色）', () => {
    for (const [label, e] of [
      ['卵', egg],
      ['幼虫', larva],
      ['蛹', pupa],
    ] as const) {
      expect(e.color.getHexString(), `${label} 的发光色与成虫不一致`).toBe(adult.color.getHexString())
    }
  })

  it('幼虫尾端两点最亮，卵与蛹是微光，且都比成虫暗', () => {
    expect(larva.intensity, '幼虫的发光器不够亮').toBeGreaterThan(2.2)
    expect(larva.intensity, '幼虫比成虫的求偶闪光还亮').toBeLessThan(adult.intensity)
    for (const [label, e] of [
      ['卵', egg],
      ['蛹', pupa],
    ] as const) {
      expect(e.intensity, `${label} 的微光太强（应在 0.5~1.4）`).toBeLessThan(1.4)
      expect(e.intensity, `${label} 的微光太弱，图上看不出在发光`).toBeGreaterThan(0.5)
      expect(larva.intensity / e.intensity, `幼虫没有明显亮过${label}`).toBeGreaterThan(2)
    }
    // 「蛹 ≈ 卵」：两者不许拉开一个数量级
    const ratio = pupa.intensity / egg.intensity
    expect(ratio, `蛹与卵的亮度差了 ${ratio.toFixed(2)} 倍，不再是同一档`).toBeGreaterThan(0.7)
    expect(ratio, `蛹与卵的亮度差了 ${ratio.toFixed(2)} 倍，不再是同一档`).toBeLessThan(1.5)
  })
})

// ---------------------------------------------------------------- 卵

describe('卵', () => {
  const model = buildFireflyEgg()
  const eggs = meshesNamed(model, 'egg-shell')
  const grains = meshesNamed(model, 'soil-grain')

  it('一小簇 4~6 粒，每粒直径 1 毫米量级（上下限一起卡）', () => {
    expect(eggs.length, `卵有 ${eggs.length} 粒，不是一小簇`).toBeGreaterThanOrEqual(4)
    expect(eggs.length, `卵有 ${eggs.length} 粒，不是一小簇`).toBeLessThanOrEqual(6)
    for (const e of eggs) {
      const size = new THREE.Box3().setFromObject(e).getSize(new THREE.Vector3())
      expect(size.x, `卵径 ${size.x.toFixed(3)} 不在 0.09~0.115`).toBeGreaterThan(0.09)
      expect(size.x, `卵径 ${size.x.toFixed(3)} 不在 0.09~0.115`).toBeLessThan(0.115)
      // 球形至扁球：纵径明显小于横径，但不至于成饼
      expect(size.y / size.x, '卵不扁，读成正球').toBeLessThan(0.95)
      expect(size.y / size.x, '卵压成了饼').toBeGreaterThan(0.75)
    }
  })

  it('是一窝挨着的卵，不是撒开的几颗珠子', () => {
    const centers = eggs.map((e) => new THREE.Box3().setFromObject(e).getCenter(new THREE.Vector3()))
    const dia = 0.1
    for (let i = 0; i < centers.length; i++) {
      let nearest = Infinity
      for (let j = 0; j < centers.length; j++) if (i !== j) nearest = Math.min(nearest, centers[i].distanceTo(centers[j]))
      expect(nearest, `有一粒卵离最近的邻居 ${nearest.toFixed(3)}，超过一个卵径 —— 撒开了`).toBeLessThan(dia * 1.35)
    }
  })

  it('卵壳是淡黄不是脏灰，且不上清漆（白铬防线）', () => {
    const mat = materialOf(model, 'egg-shell')
    const l = hslOf(mat).l
    expect(l, `卵壳明度 ${l.toFixed(3)} 被压成了脏灰`).toBeGreaterThan(0.62)
    // 这个亮度的基色一上清漆，ACES 下必过曝成白铬（七星瓢虫、腊龟甲都栽过），
    // 何况它还挂着自发光，余量更小
    expect(mat.clearcoat, '卵壳挂了清漆').toBeLessThanOrEqual(0.12)
    expect(mat.metalness, '卵壳有金属感').toBeLessThanOrEqual(0.05)
  })

  it('土是土：粒径跨度大、按幂律偏细、颗粒不是滚圆的球', () => {
    /*
     * 「一圈大小相近的滚圆小球」是程序化偷懒最典型的样子，独角仙卵第二版
     * 就栽在这里（读成珍珠配巧克力球）。三条一起卡才拦得住：
     * 跨度、分布形状、单粒的形状。
     */
    expect(grains.length, '土粒太少，铺不成一片土').toBeGreaterThan(80)
    const sizes = grains.map(localSize)
    const longest = sizes.map((s) => Math.max(s.x, s.y, s.z))
    const spread = Math.max(...longest) / Math.min(...longest)
    expect(spread, `最大粒 / 最小粒只差 ${spread.toFixed(1)} 倍 —— 一圈大小相近的小球`).toBeGreaterThan(4)

    // 幂律：中位数应当明显偏向下限（细屑多、粗块少），均匀取样做不到
    const sorted = [...longest].sort((a, b) => a - b)
    const median = sorted[Math.floor(sorted.length / 2)]
    expect(median / Math.max(...longest), `粒径中位数落在 ${(median / Math.max(...longest)).toFixed(2)}，分布太均匀`).toBeLessThan(0.55)

    // 单粒不是球：长轴 / 短轴 ≥ 1.4 的至少占一半
    const stretched = sizes.filter((s) => axisRatio(s) >= 1.4).length
    expect(stretched / sizes.length, '土粒基本都是滚圆的球').toBeGreaterThan(0.5)
  })

  it('土色不匀：至少两档明度，且都压得住卵', () => {
    const ls = [...new Set(grains.map((g) => hslOf(g.material as THREE.MeshPhysicalMaterial).l.toFixed(3)))].map(Number)
    expect(ls.length, '所有土粒同一个颜色，明暗不匀这条没做').toBeGreaterThanOrEqual(2)
    expect(Math.max(...ls) - Math.min(...ls), '几档土色之间几乎没有明度差').toBeGreaterThan(0.08)
    const egg = hslOf(materialOf(model, 'egg-shell')).l
    expect(egg - Math.max(...ls), '卵与土的明度拉不开').toBeGreaterThan(0.3)
  })

  it('有苔藓语境：细茎上一圈披针小叶，不是又一堆小球', () => {
    const stems = meshesNamed(model, 'moss-stem')
    const leaves = meshesNamed(model, 'moss-leaf')
    expect(stems.length, '苔藓丛太少，读不出语境').toBeGreaterThanOrEqual(8)
    expect(leaves.length / stems.length, '每丛苔藓的叶片太少').toBeGreaterThan(5)
    // 叶片必须是拉长压扁的披针形；等比小球就退回成「另一种小球」了
    for (const leaf of leaves.slice(0, 20)) {
      expect(axisRatio(localSize(leaf)), '苔藓叶是个球，不是叶').toBeGreaterThan(2.5)
    }
    const green = hslOf(materialOf(model, 'moss-leaf'))
    expect(green.h, '苔藓不是绿的').toBeGreaterThan(0.15)
    expect(green.h, '苔藓不是绿的').toBeLessThan(0.42)
  })

  it('卵没有被土埋掉：每一粒的上半都露在基质之上', () => {
    const soilTop = Math.max(...verticesOf(model, 'soil-mound').map((p) => p.y))
    for (const e of eggs) {
      const pts = verticesOfMesh(e)
      const above = pts.filter((p) => p.y > soilTop).length / pts.length
      expect(above, `有一粒卵只有 ${(above * 100).toFixed(0)}% 露在土面之上`).toBeGreaterThan(0.45)
    }
  })

  it('基质压到与卵簇同量级：不许把取景撑开', () => {
    // 帝王蝶那颗卵的经验：基座一大，卵就缩成一个点
    const cluster = boxOf(model, 'egg-shell').getSize(new THREE.Vector3())
    const all = new THREE.Box3().setFromObject(model.group).getSize(new THREE.Vector3())
    expect(all.x / cluster.x, `基质比卵簇宽 ${(all.x / cluster.x).toFixed(1)} 倍`).toBeLessThan(2.6)
  })
})

// ---------------------------------------------------------------- 幼虫

describe('幼虫', () => {
  const model = buildFireflyLarva()
  const plates = meshesNamed(model, 'larva-tergite').sort(
    (a, b) => (a.userData.plate as number) - (b.userData.plate as number),
  )
  const trunkPts = verticesOf(model, 'larva-body')

  /** 躯干在某个 x 附近的背中线高度（= 该处体壁的顶） */
  function bodyTopAt(x: number): number {
    const near = trunkPts.filter((p) => Math.abs(p.x - x) < 0.03 && Math.abs(p.z) < 0.05)
    expect(near.length, `x=${x.toFixed(2)} 处取不到躯干顶点`).toBeGreaterThan(0)
    return Math.max(...near.map((p) => p.y))
  }

  /** 某片背板落在背中线附近的顶点 */
  function midline(mesh: THREE.Mesh): THREE.Vector3[] {
    return verticesOfMesh(mesh).filter((p) => Math.abs(p.z) < 0.05)
  }

  it('体长 2.0~2.5 厘米，上下限一起卡', () => {
    const size = new THREE.Box3().setFromObject(model.group).getSize(new THREE.Vector3())
    expect(size.x, `全长 ${size.x.toFixed(2)} 不在 2.0~2.5`).toBeGreaterThan(2.0)
    expect(size.x, `全长 ${size.x.toFixed(2)} 不在 2.0~2.5`).toBeLessThan(2.5)
  })

  it('扁平：高 / 宽 落在 0.25~0.5', () => {
    // 萤火虫幼虫是压扁的（能钻石缝找蜗牛）。做成圆筒就是另一类幼虫了。
    const size = new THREE.Box3().setFromObject(model.group).getSize(new THREE.Vector3())
    const flat = size.y / size.z
    expect(flat, `高 / 宽 = ${flat.toFixed(2)}，不够扁`).toBeLessThan(0.5)
    expect(flat, `高 / 宽 = ${flat.toFixed(2)}，压成纸片了`).toBeGreaterThan(0.25)

    const body = boxOf(model, 'larva-body').getSize(new THREE.Vector3())
    const bodyFlat = body.y / body.z
    expect(bodyFlat, `躯干本身的高 / 宽 = ${bodyFlat.toFixed(2)}`).toBeLessThan(0.45)
    expect(bodyFlat, `躯干本身的高 / 宽 = ${bodyFlat.toFixed(2)}`).toBeGreaterThan(0.25)
  })

  it('背板 10~14 片，逐片编号不重不漏', () => {
    expect(plates.length, `背板 ${plates.length} 片`).toBeGreaterThanOrEqual(10)
    expect(plates.length, `背板 ${plates.length} 片`).toBeLessThanOrEqual(14)
    expect(plates.map((p) => p.userData.plate)).toEqual(plates.map((_, i) => i))
  })

  it('叠瓦①：每片后缘都翘在体壁之上（压平这条就红）', () => {
    // 「深色贴浅色 = 斑纹，不是结构」—— 所以叠瓦必须是几何量，不是颜色量。
    for (const plate of plates.slice(0, 8)) {
      const mid = midline(plate)
      const rearX = Math.min(...mid.map((p) => p.x))
      const rearTop = Math.max(...mid.filter((p) => p.x < rearX + 0.02).map((p) => p.y))
      const lift = rearTop - bodyTopAt(rearX)
      expect(lift, `第 ${plate.userData.plate} 片的后缘只高出体壁 ${lift.toFixed(3)}，等于贴平了`).toBeGreaterThan(0.035)
    }
  })

  it('叠瓦②：每片都盖住下一片的前段，两片之间留着一道净空', () => {
    /*
     * 这是本文件最重要的一条，量的是**人看见的那道阴影缝**：
     * 在同一段 x 窗口里，前一片的**底面**必须整个高于后一片的**顶面**。
     * 窗口里必须同时取到两片的顶点 —— 取消 X 向交叠时这个前提直接不成立，
     * 断言会因为「取不到下一片」而红，而不是悄悄退化成空断言。
     */
    for (let i = 0; i < plates.length - 1; i++) {
      const a = midline(plates[i])
      const b = midline(plates[i + 1])
      const rearX = Math.min(...a.map((p) => p.x))
      const inWindow = (arr: THREE.Vector3[]) => arr.filter((p) => p.x >= rearX && p.x <= rearX + 0.02)
      const wa = inWindow(a)
      const wb = inWindow(b)
      expect(wa.length, `第 ${i} 片的后缘窗口里没有顶点`).toBeGreaterThan(0)
      expect(wb.length, `第 ${i} 片的后缘没有压在第 ${i + 1} 片上 —— 两片只是首尾相接，没有叠瓦`).toBeGreaterThan(0)
      const gap = Math.min(...wa.map((p) => p.y)) - Math.max(...wb.map((p) => p.y))
      /*
       * 末两片的翘起量是**故意**衰减的（腹末的背板越往后越平伏，否则板下那道
       * 净空在收细的尾端会读成一个贯通的黑洞 —— 出图实测过），所以那里只要求
       * 「仍然压在上面」，不要求那道 0.012 的缝。交叠本身（窗口里取得到两片）
       * 则一片都不放过。
       */
      const floor = i < plates.length - 2 ? 0.012 : 0.0005
      expect(gap, `第 ${i} 片与第 ${i + 1} 片之间的净空只有 ${gap.toFixed(4)}，缝太窄读不出叠瓦`).toBeGreaterThan(floor)

      /*
       * ⚠️ 光有「窗口里取得到两片」还不够 —— 变异测试当场抓到的盲区：
       * 把 REAR_MID 调成 1.0（两片只首尾相接、完全不交叠）时，下一片的
       * **前缘**恰好落在窗口里，上面那条照样是绿的。所以还要显式量交叠量：
       * 前一片的后缘必须伸到下一片前缘之后，且不少于 20% 个节距。
       */
      const frontA = Math.max(...a.map((p) => p.x))
      const frontB = Math.max(...b.map((p) => p.x))
      const pitch = frontA - frontB
      const overlap = frontB - rearX
      expect(overlap / pitch, `第 ${i} 片只盖住下一片 ${((overlap / pitch) * 100).toFixed(0)}% 个节距 —— 是首尾相接，不是叠瓦`).toBeGreaterThan(0.2)
    }
  })

  it('叠瓦③：梯形 —— 后侧角比中线更向后突出', () => {
    // 顶视的锯齿轮廓靠的就是这个差值；取消它，整只虫读成一根光滑的管子
    for (const plate of plates.slice(1, plates.length - 2)) {
      const pts = verticesOfMesh(plate)
      const maxZ = Math.max(...pts.map((p) => Math.abs(p.z)))
      const corner = Math.min(...pts.filter((p) => Math.abs(p.z) > maxZ * 0.75).map((p) => p.x))
      const mid = Math.min(...pts.filter((p) => Math.abs(p.z) < 0.05).map((p) => p.x))
      expect(mid - corner, `第 ${plate.userData.plate} 片的后侧角只比中线多伸 ${(mid - corner).toFixed(3)}`).toBeGreaterThan(0.02)
    }
  })

  it('背板是深褐不是黑，且比节间体壁亮一档', () => {
    /*
     * 通体深褐的虫最大的风险是压成一团分不出叠瓦的黑（第 5 轮 7 只返工的
     * 那个坑，反过来踩）。上下限一起给：太亮就成了牛奶巧克力（本轮第一版
     * 出图实测），太暗则整只糊死。
     */
    const plate = hslOf(materialOf(model, 'larva-tergite')).l
    const body = hslOf(materialOf(model, 'larva-body')).l
    expect(plate, `背板明度 ${plate.toFixed(3)} 压成了近黑`).toBeGreaterThan(0.18)
    expect(plate, `背板明度 ${plate.toFixed(3)} 太浅，不是深褐`).toBeLessThan(0.4)
    expect(plate - body, '背板与节间体壁的明度差看不出来').toBeGreaterThan(0.08)
  })

  it('每片背板后缘两侧一对淡色斑：数量、位置、明度差', () => {
    const spots = meshesNamed(model, 'larva-spot')
    expect(spots.length, '侧斑不是每片一对').toBe(plates.length * 2)

    const spotL = hslOf(materialOf(model, 'larva-spot')).l
    const plateL = hslOf(materialOf(model, 'larva-tergite')).l
    expect(spotL, `侧斑明度 ${spotL.toFixed(3)} 太暗，压在深褐上就没了`).toBeGreaterThan(0.62)
    expect(spotL - plateL, '侧斑与背板的明度差拉不开').toBeGreaterThan(0.35)

    for (const spot of spots) {
      const c = spot.getWorldPosition(new THREE.Vector3())
      expect(Math.abs(c.z), '侧斑跑到背中线上了 —— 那是一排纽扣不是侧斑').toBeGreaterThan(0.06)
      // 落在自己那片的后半段
      const plate = plates[spot.userData.plate as number]
      const xs = verticesOfMesh(plate).map((p) => p.x)
      const rear = Math.min(...xs)
      const front = Math.max(...xs)
      const u = (front - c.x) / (front - rear)
      expect(u, '侧斑没长在背板后缘一带').toBeGreaterThan(0.45)
    }
  })

  it('只有三对短胸足，腹部一根附肢都没有', () => {
    const legs: THREE.Object3D[] = []
    model.group.traverse((o) => {
      if (o.name === 'larva-leg') legs.push(o)
    })
    expect(legs.length, '胸足不是 6 条').toBe(6)

    /*
     * ⚠️ 不能拿 `leg.getWorldPosition()` 当足的位置：`kit.legPair()` 返回的外层
     * group 留在原点、几何用的是绝对坐标（那一层要留在原点，镜像面才是体中线），
     * 所以它的世界坐标量的是 finalize 的居中偏移，不是足长在哪儿。
     * 这里量**足自己的顶点**，并换算成体轴比例，免得被居中平移带偏。
     */
    const body = boxOf(model, 'larva-body')
    const legPts: THREE.Vector3[] = []
    for (const leg of legs) {
      leg.traverse((o) => {
        const m = o as THREE.Mesh
        if (m.isMesh) legPts.push(...verticesOfMesh(m))
      })
    }
    expect(legPts.length, '足没有几何').toBeGreaterThan(0)
    const rearmost = Math.max(...legPts.map((p) => (body.max.x - p.x) / (body.max.x - body.min.x)))
    expect(rearmost, `最后一条足伸到体轴 ${(rearmost * 100).toFixed(0)}% 处 —— 那已经是腹部了（有腹足就成毛虫）`).toBeLessThan(0.4)
  })

  it('一对镰刀状上颚：顶视投影下分得开，且末端收尖', () => {
    const mand = meshesNamed(model, 'larva-mandible')
    expect(mand.length, '上颚不是一对').toBe(2)
    const r = verticesOfMesh(mand[0]).filter((p) => p.z > 0)
    const l = verticesOfMesh(mand[1]).filter((p) => p.z < 0)
    expect(r.length + l.length, '有顶点跨过了中线 —— 两支已经贴在一起').toBe(
      verticesOfMesh(mand[0]).length + verticesOfMesh(mand[1]).length,
    )
    // 三维距离说「分得开」不算数，要按屏幕投影量（白蚁兵蚁那一轮的教训）
    const gap = minProjectedGap(verticesOfMesh(mand[0]), verticesOfMesh(mand[1]), VIEWS.top)
    expect(gap, `顶视里两颚只隔 ${gap.toFixed(3)}，糊成一根`).toBeGreaterThan(0.02)
    // 比头壳亮得多，否则一对镰刀糊在黑头上完全看不见
    expect(
      hslOf(mand[0].material as THREE.MeshPhysicalMaterial).l - hslOf(materialOf(model, 'larva-head')).l,
      '上颚与头壳的明度差不够，看不见',
    ).toBeGreaterThan(0.15)
  })

  it('腹端一对发光器：在尾端、鼓出体侧与腹面（否则俯视机位一点都看不见）', () => {
    const lanterns = meshesNamed(model, 'larva-lantern')
    expect(lanterns.length, '发光器不是一对').toBe(2)
    const pts = lanterns.flatMap(verticesOfMesh)
    const cx = pts.reduce((s, p) => s + p.x, 0) / pts.length
    const bodyBox = boxOf(model, 'larva-body')
    const tailward = (bodyBox.max.x - cx) / (bodyBox.max.x - bodyBox.min.x)
    expect(tailward, `发光器长在体轴 ${(tailward * 100).toFixed(0)}% 处，不在腹端`).toBeGreaterThan(0.7)

    // 同一段 x 上，发光器必须比背板侧缘更外、比躯干腹面更低
    const slab = (arr: THREE.Vector3[]) => arr.filter((p) => Math.abs(p.x - cx) < 0.06)
    const plateZ = Math.max(...slab(plates.flatMap(verticesOfMesh)).map((p) => Math.abs(p.z)))
    const lanternZ = Math.max(...pts.map((p) => Math.abs(p.z)))
    expect(lanternZ - plateZ, '发光器缩在背板侧缘以内，顶视看不见').toBeGreaterThan(0.02)
    const trunkLow = Math.min(...slab(trunkPts).map((p) => p.y))
    expect(trunkLow - Math.min(...pts.map((p) => p.y)), '发光器没有探出腹面').toBeGreaterThan(0.01)
  })

  it('体壁与背板都不是鞘翅材质：白铬 / 塑料防线', () => {
    for (const name of ['larva-body', 'larva-tergite']) {
      const mat = materialOf(model, name)
      expect(mat.clearcoat, `${name} 的清漆太重`).toBeLessThanOrEqual(0.2)
      expect(mat.metalness, `${name} 有金属感`).toBeLessThanOrEqual(0.05)
      expect(mat.roughness, `${name} 太光滑，软体读成了硬壳`).toBeGreaterThan(0.6)
    }
  })
})

// ---------------------------------------------------------------- 蛹

describe('蛹', () => {
  const model = buildFireflyPupa()
  const BODY = ['pupa-abdomen', 'pupa-abdomen-tip', 'pupa-thorax', 'pupa-head', 'pupa-shield'] as const
  const bodyPts = verticesOf(model, ...BODY)

  /**
   * 体轴在某个 x 处的轴心与向径。
   *
   * 姿态是绕 X 滚的，所以**按 x 分层永远有效**，向径也不受姿态影响 ——
   * 这就是这里不去反解姿态角的原因。
   *
   * `rAt(方位角)` 给的是该方位上的体壁向径。⚠️ 必须按方位角问，不能拿整层的
   * 最大向径当体壁：蛹是背腹压扁的，体侧的向径比腹面大一半，用整层最大值去比
   * 会把腹面那几条隆脊全判成「没凸出来」（第一版就是这么误判的）。
   */
  function slab(x: number, pts: THREE.Vector3[]) {
    const near = pts.filter((p) => Math.abs(p.x - x) < 0.05)
    const axis = new THREE.Vector2()
    if (near.length) {
      axis.set(
        near.reduce((s, p) => s + p.y, 0) / near.length,
        near.reduce((s, p) => s + p.z, 0) / near.length,
      )
    }
    const polar = near.map((p) => {
      const dy = p.y - axis.x
      const dz = p.z - axis.y
      return { a: Math.atan2(dz, dy), r: Math.hypot(dy, dz) }
    })
    return {
      axis,
      n: near.length,
      rmax: polar.length ? Math.max(...polar.map((q) => q.r)) : 0,
      rAt(angle: number, halfWidthDeg = 14): number {
        const w = THREE.MathUtils.degToRad(halfWidthDeg)
        const hit = polar.filter((q) => Math.abs(Math.atan2(Math.sin(q.a - angle), Math.cos(q.a - angle))) < w)
        return hit.length ? Math.max(...hit.map((q) => q.r)) : 0
      },
    }
  }

  it('体长 1.2 厘米量级，且明显短于幼虫（化蛹时虫体本来就缩短）', () => {
    const len = boxOf(model, ...BODY).getSize(new THREE.Vector3()).x
    expect(len, `蛹长 ${len.toFixed(2)} 不在 1.05~1.45`).toBeGreaterThan(1.05)
    expect(len, `蛹长 ${len.toFixed(2)} 不在 1.05~1.45`).toBeLessThan(1.45)
    const larvaLen = new THREE.Box3().setFromObject(buildFireflyLarva().group).getSize(new THREE.Vector3()).x
    expect(len, '蛹比幼虫还长').toBeLessThan(larvaLen * 0.75)
  })

  it('三种芽都在：一对翅芽、三对足芽、一对触角芽', () => {
    expect(meshesNamed(model, 'pupa-wing-pad').length, '翅芽不是一对').toBe(2)
    expect(meshesNamed(model, 'pupa-leg-pad').length, '足芽不是三对').toBe(6)
    expect(meshesNamed(model, 'pupa-antenna-pad').length, '触角芽不是一对').toBe(2)
  })

  it('芽是半埋的隆脊，不是贴上去的深色剪纸', () => {
    /*
     * ⚠️「深色贴浅色 = 斑纹，不是结构」（黑蚱蝉翅芽的教训）。所以这里量的是
     * **几何**：芽必须凸出该处体壁 ≥ 0.015，同时又有一部分落在体壁半径以内
     * （= 一半埋进去）。压成贴片、或整枚浮在体外，两种退化都会红。
     */
    for (const pad of meshesNamed(model, 'pupa-wing-pad', 'pupa-leg-pad', 'pupa-antenna-pad')) {
      const pts = verticesOfMesh(pad)
      const cx = pts.reduce((s, p) => s + p.x, 0) / pts.length
      const s = slab(cx, bodyPts)
      expect(s.n, `x=${cx.toFixed(2)} 处取不到体壁`).toBeGreaterThan(0)
      const polar = pts.map((p) => {
        const dy = p.y - s.axis.x
        const dz = p.z - s.axis.y
        return { a: Math.atan2(dz, dy), r: Math.hypot(dy, dz) }
      })
      // 芽自己所在的方位角上的体壁向径
      const mean = Math.atan2(
        polar.reduce((t, q) => t + Math.sin(q.a), 0),
        polar.reduce((t, q) => t + Math.cos(q.a), 0),
      )
      const wall = s.rAt(mean)
      expect(wall, `${pad.name} 所在方位取不到体壁`).toBeGreaterThan(0)
      expect(Math.max(...polar.map((q) => q.r)) - wall, `${pad.name} 没有凸出体壁，读不出是一片芽`).toBeGreaterThan(0.015)
      expect(Math.min(...polar.map((q) => q.r)), `${pad.name} 整枚浮在体外，成了悬空的剪纸`).toBeLessThan(wall)
    }
  })

  it('芽在腹面，而且姿态让它们在顶视与侧视都朝着镜头', () => {
    /*
     * 姿态不是为了好看：四个验收机位全在上方，腹面朝下的话三套芽一个都看不见，
     * 等于白做。把 ROLL_DEG 改回 0，这条会红。
     */
    const dirs = meshesNamed(model, 'pupa-wing-pad', 'pupa-leg-pad', 'pupa-antenna-pad').map((pad) => {
      const pts = verticesOfMesh(pad)
      const c = pts.reduce((s, p) => s.add(p), new THREE.Vector3()).divideScalar(pts.length)
      const { axis } = slab(c.x, bodyPts)
      return new THREE.Vector3(0, c.y - axis.x, c.z - axis.y).normalize()
    })
    const mean = dirs.reduce((s, d) => s.add(d), new THREE.Vector3()).divideScalar(dirs.length).normalize()
    for (const view of ['top', 'side'] as const) {
      const dot = mean.dot(VIEWS[view])
      expect(dot, `${view} 机位下腹面背对镜头（cos = ${dot.toFixed(2)}），三套芽全看不见`).toBeGreaterThan(0.3)
    }

    // 背板在芽的反面 —— 这条钉住「芽长在腹面」而不是随便挂在体侧
    const shield = verticesOf(model, 'pupa-shield')
    const sc = shield.reduce((s, p) => s.add(p), new THREE.Vector3()).divideScalar(shield.length)
    const sAxis = slab(sc.x, bodyPts).axis
    const shieldDir = new THREE.Vector3(0, sc.y - sAxis.x, sc.z - sAxis.y).normalize()
    expect(mean.dot(shieldDir), '芽与前胸背板长在同一侧 —— 芽不在腹面').toBeLessThan(-0.2)
  })

  it('前胸背板是萤科那片阔盾：比胸部更宽', () => {
    /*
     * 量向径不量 AABB：姿态绕 X 滚过之后，包围盒的 y/z 两边被搅在一起，
     * 「宽」这件事在 AABB 上读不出来（第一版就因此把 0.19 的盾片判成比
     * 0.16 的胸部窄）。向径在绕 X 的旋转下是不变量。
     */
    const radial = (...names: string[]) => {
      const pts = verticesOf(model, ...names)
      const cx = pts.reduce((s, p) => s + p.x, 0) / pts.length
      const { axis } = slab(cx, bodyPts)
      return Math.max(...pts.map((p) => Math.hypot(p.y - axis.x, p.z - axis.y)))
    }
    expect(radial('pupa-shield'), '盾片不比胸部阔，读不出萤科').toBeGreaterThan(radial('pupa-thorax') * 1.05)
  })

  it('腹端发光器在末段，且是一对', () => {
    const lanterns = meshesNamed(model, 'pupa-lantern')
    expect(lanterns.length, '发光器不是一对').toBe(2)
    const pts = lanterns.flatMap(verticesOfMesh)
    const cx = pts.reduce((s, p) => s + p.x, 0) / pts.length
    const box = boxOf(model, ...BODY)
    const tailward = (box.max.x - cx) / (box.max.x - box.min.x)
    expect(tailward, `发光器在体轴 ${(tailward * 100).toFixed(0)}% 处，不在腹端`).toBeGreaterThan(0.6)
  })

  it('乳白至淡黄，且哑光不上清漆（白铬防线）', () => {
    /*
     * 乳白的东西反过来最危险：压深就是脏灰，不压又会过曝成白铬。
     * 解法在材质而不在基色 —— 哑光 + 次表面透光，高光顶不到过曝区。
     */
    const mat = materialOf(model, 'pupa-abdomen')
    const l = hslOf(mat).l
    expect(l, `蛹体明度 ${l.toFixed(3)} 被压成了脏灰`).toBeGreaterThan(0.72)
    expect(mat.clearcoat, '蛹体上了清漆').toBeLessThanOrEqual(0.12)
    expect(mat.metalness, '蛹体有金属感').toBeLessThanOrEqual(0.05)
    expect(mat.roughness, '蛹体太光滑，软蛹读成了硬壳').toBeGreaterThan(0.6)
    // 芽比体壁深一档（颜色只是辅助，主要靠上面那条几何断言）
    expect(l - hslOf(materialOf(model, 'pupa-wing-pad')).l, '芽与体壁一个色，边界全靠几何撑').toBeGreaterThan(0.05)
  })

  it('土室只做一层底：蛹躺在土上，芽没有被埋掉', () => {
    const soilTop = Math.max(...verticesOf(model, 'soil-mound').map((p) => p.y))
    const pads = verticesOf(model, 'pupa-wing-pad', 'pupa-leg-pad', 'pupa-antenna-pad')
    const above = pads.filter((p) => p.y > soilTop).length / pads.length
    expect(above, `只有 ${(above * 100).toFixed(0)}% 的芽露在土面之上`).toBeGreaterThan(0.6)
    // 土面也不许把取景撑开
    const bodyLen = boxOf(model, ...BODY).getSize(new THREE.Vector3()).x
    const soilLen = boxOf(model, 'soil-mound').getSize(new THREE.Vector3()).x
    expect(soilLen / bodyLen, '土面比蛹宽出太多，主角缩了').toBeLessThan(1.4)
  })
})
