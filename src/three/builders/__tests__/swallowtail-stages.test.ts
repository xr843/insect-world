/**
 * 玉带凤蝶生活史三阶段（卵 / 幼虫 / 蛹）的形态验证。
 *
 * 自检标准照 monarch-stages.test.ts：**把代码改回出问题的那一版，这条会不会红？**
 * 每条断言都做过变异测试（把对应的形态改错、确认它红了再改回来），注释里写了它钉的是哪种错法。
 * 「大小」类一律上下限齐给；「看得见」类换算成占画面的比例（取景按 model.radius 归一化）。
 *
 * 本物种要讲的三件事，也是三组测试的主干：
 * - 卵：**光滑的圆珠**，与帝王蝶那粒带 23 条纵棱的炮弹形卵是两种长相；
 * - 幼虫：**胸部膨大 + 一对假眼 = 小蛇的头**，假眼是体壁本身的颜色区、不是贴上去的实体；
 * - 蛹：**缢蛹** —— 头朝上、腹面朝枝、一根丝带绕过背面把它斜吊在枝上
 *   （帝王蝶是头朝下倒挂、没有丝带的垂蛹）。
 */
import * as THREE from 'three'
import { describe, expect, it } from 'vitest'
import { buildSwallowtailEgg } from '../stages/swallowtail-egg'
import { buildSwallowtailLarva } from '../stages/swallowtail-larva'
import { buildSwallowtailPupa } from '../stages/swallowtail-pupa'
import { buildSwallowtail } from '../swallowtail'
import type { InsectModel } from '../kit'
import { INSECTS } from '../../../data/insects.zh'

const TRIANGLE_BUDGET = 150_000

const egg = buildSwallowtailEgg()
const larva = buildSwallowtailLarva()
const pupa = buildSwallowtailPupa()

// ---------------------------------------------------------------- 测量工具

function meshesByName(model: InsectModel, ...names: string[]): THREE.Mesh[] {
  const out: THREE.Mesh[] = []
  model.group.updateMatrixWorld(true)
  model.group.traverse((o) => {
    const m = o as THREE.Mesh
    if (m.isMesh && names.includes(m.name)) out.push(m)
  })
  return out
}

function boxOf(meshes: THREE.Object3D[]): THREE.Box3 {
  const box = new THREE.Box3()
  for (const m of meshes) box.union(new THREE.Box3().setFromObject(m))
  return box
}

function vertsOf(meshes: THREE.Mesh[]): THREE.Vector3[] {
  const out: THREE.Vector3[] = []
  for (const mesh of meshes) {
    const pos = mesh.geometry.getAttribute('position')
    for (let i = 0; i < pos.count; i++) {
      out.push(new THREE.Vector3().fromBufferAttribute(pos, i).applyMatrix4(mesh.matrixWorld))
    }
  }
  return out
}

function mean(vs: THREE.Vector3[]): THREE.Vector3 {
  const c = new THREE.Vector3()
  for (const v of vs) c.add(v)
  return c.divideScalar(Math.max(vs.length, 1))
}

/** 材质基色的 sRGB HSL（缺省 getHSL 返回线性明度，深色会被压扁，阈值全失真） */
function hslByName(model: InsectModel, name: string): { h: number; s: number; l: number } {
  const m = meshesByName(model, name)[0]
  expect(m, `找不到名为 ${name} 的网格`).toBeDefined()
  const mat = (Array.isArray(m.material) ? m.material[0] : m.material) as THREE.MeshPhysicalMaterial
  const hsl = { h: 0, s: 0, l: 0 }
  mat.color.getHSL(hsl, THREE.SRGBColorSpace)
  return { h: hsl.h * 360, s: hsl.s, l: hsl.l }
}

function inspect(model: InsectModel): { triangles: number; nan: number; meshes: number } {
  let triangles = 0
  let nan = 0
  let meshes = 0
  model.group.traverse((o) => {
    const m = o as THREE.Mesh
    if (!m.isMesh || !m.geometry) return
    meshes++
    const pos = m.geometry.getAttribute('position')
    triangles += m.geometry.index ? m.geometry.index.count / 3 : pos.count / 3
    const arr = pos.array
    for (let i = 0; i < arr.length; i++) if (!Number.isFinite(arr[i])) nan++
  })
  return { triangles, nan, meshes }
}

/** 两组顶点里逐位重合（1e-6 内）的点数 —— 用来判两块色区是不是同一张皮上切下来的 */
function sharedVertexCount(a: THREE.Mesh[], b: THREE.Mesh[]): number {
  const key = (v: THREE.Vector3) => `${v.x.toFixed(6)},${v.y.toFixed(6)},${v.z.toFixed(6)}`
  const set = new Set(vertsOf(b).map(key))
  let n = 0
  for (const v of vertsOf(a)) if (set.has(key(v))) n++
  return n
}

function pearson(xs: number[], ys: number[]): number {
  const mx = xs.reduce((s, v) => s + v, 0) / xs.length
  const my = ys.reduce((s, v) => s + v, 0) / ys.length
  let sxy = 0
  let sxx = 0
  let syy = 0
  for (let i = 0; i < xs.length; i++) {
    sxy += (xs[i] - mx) * (ys[i] - my)
    sxx += (xs[i] - mx) ** 2
    syy += (ys[i] - my) ** 2
  }
  return sxy / Math.sqrt(sxx * syy)
}

// ---------------------------------------------------------------- 通规

describe('三个阶段的通用契约', () => {
  const all: [string, InsectModel][] = [
    ['卵', egg],
    ['幼虫', larva],
    ['蛹', pupa],
  ]

  it.each(all)('%s：有实体、无 NaN、面数在预算内', (_name, model) => {
    const { triangles, nan, meshes } = inspect(model)
    expect(meshes).toBeGreaterThan(0)
    expect(nan, 'NaN/Inf 顶点会让整个模型静默变成空白').toBe(0)
    expect(triangles).toBeGreaterThan(0)
    expect(triangles).toBeLessThan(TRIANGLE_BUDGET)
  })

  it.each(all)('%s：anchors 都是有限坐标，且落在模型的包围盒内', (_name, model) => {
    const keys = Object.keys(model.anchors)
    expect(keys.length).toBeGreaterThan(0)
    const box = new THREE.Box3().setFromObject(model.group).expandByScalar(model.radius * 0.06)
    for (const k of keys) {
      const v = model.anchors[k]
      expect(Number.isFinite(v.x) && Number.isFinite(v.y) && Number.isFinite(v.z), `anchor ${k} 坐标非有限`).toBe(true)
      expect(box.containsPoint(v), `anchor ${k} 落在模型之外`).toBe(true)
    }
  })

  it.each(all)('%s：锚点名不与成虫撞名（否则成虫的热点卡片会贴到幼期身上）', (_name, model) => {
    /*
     * 展台拿当前模型的 anchors 去配该物种的 hotspot 表，同名就配上。
     * 幼虫的假眼若叫 eye，「复眼：硕大，飞行中辅助识别同类翅纹」就会贴到一块体壁色斑上；
     * 蛹的臀棘若叫 tail，「尾突：延伸如假触角」就贴到了臀棘上。两个名字都写进来当变异样本。
     */
    const adultAnchors = new Set([
      ...Object.keys(buildSwallowtail().anchors),
      ...(INSECTS.find((i) => i.id === 'swallowtail')?.hotspots ?? []).map((h) => h.anchor),
    ])
    expect(adultAnchors.has('eye') && adultAnchors.has('tail'), '成虫的锚点表没取到').toBe(true)
    const clash = Object.keys(model.anchors).filter((k) => adultAnchors.has(k))
    expect(clash, `与成虫同名的锚点：${clash.join('、')}`).toEqual([])
  })
})

// ---------------------------------------------------------------- 卵

describe('卵：柑橘叶尖上的一粒光滑圆珠', () => {
  const shell = meshesByName(egg, 'egg-shell')
  const leaf = meshesByName(egg, 'leaf')
  const shellBox = boxOf(shell)
  const s = shellBox.getSize(new THREE.Vector3())

  it('直径约 1.2 毫米，且近球形 —— 不是帝王蝶那种高大于宽的炮弹形', () => {
    const d = Math.max(s.x, s.z)
    expect(d).toBeGreaterThan(0.1)
    expect(d).toBeLessThan(0.14)
    // 帝王蝶卵高宽比 1.33；这里 0.92（底部黏着略扁）。1.1 以上就读成米粒了
    const ratio = s.y / d
    expect(ratio, '高宽比').toBeGreaterThan(0.82)
    expect(ratio).toBeLessThan(1.08)
    expect(Math.abs(s.x - s.z), '水平截面是圆的').toBeLessThan(0.004)
  })

  it('卵壳光滑：卵上没有任何棱、纹、精孔一类的附着件', () => {
    // 除叶片与中脉外，只准有卵壳本身这一个网格。照搬帝王蝶卵的纵棱，这条就红
    const others: string[] = []
    egg.group.traverse((o) => {
      const m = o as THREE.Mesh
      if (m.isMesh && !['egg-shell', 'leaf', 'leaf-midrib'].includes(m.name)) others.push(m.name)
    })
    expect(others).toEqual([])
    expect(shell).toHaveLength(1)
  })

  it('淡乳黄，且在深绿叶面上跳得出来', () => {
    const e = hslByName(egg, 'egg-shell')
    const l = hslByName(egg, 'leaf')
    expect(e.h, '黄区').toBeGreaterThan(38)
    expect(e.h).toBeLessThan(60)
    expect(e.l, '淡：压深成土黄就不是新产的卵了').toBeGreaterThan(0.65)
    expect(e.l, '也不能白成一粒珍珠').toBeLessThan(0.9)
    expect(e.s).toBeGreaterThan(0.45)
    expect(e.l - l.l, '卵与叶的明度差').toBeGreaterThan(0.3)
    expect(l.h, '叶是绿的').toBeGreaterThan(85)
    expect(l.h).toBeLessThan(135)
  })

  it('黏在叶面上：卵底略埋进叶面，不悬空、不沉底', () => {
    const leafTop = boxOf(leaf).max.y
    expect(shellBox.min.y, '卵底必须低于叶面（黏着处）').toBeLessThan(leafTop)
    expect(leafTop - shellBox.min.y, '但只埋进去一点点').toBeLessThan(0.012)
    // 卵整个落在叶片的水平范围之内
    const lb = boxOf(leaf)
    expect(shellBox.min.x).toBeGreaterThan(lb.min.x)
    expect(shellBox.max.x).toBeLessThan(lb.max.x)
    expect(shellBox.min.z).toBeGreaterThan(lb.min.z)
    expect(shellBox.max.z).toBeLessThan(lb.max.z)
  })

  it('叶片是尺度参照件：与卵同量级，且是一片尖头的叶尖', () => {
    const lb = boxOf(leaf)
    const ls = lb.getSize(new THREE.Vector3())
    const ratio = ls.x / s.x
    // 叶片太大，卵在画面上缩成一个点；太小，读不出它是叶
    expect(ratio).toBeGreaterThan(2)
    expect(ratio).toBeLessThan(5)
    // 叶尖：最前 8% 长度内的横宽不到最宽处的三成（圆头的叶片过不了这一条）
    const verts = vertsOf(leaf)
    const tip = verts.filter((v) => v.x > lb.max.x - ls.x * 0.08)
    const tipW = Math.max(...tip.map((v) => v.z)) - Math.min(...tip.map((v) => v.z))
    expect(tipW / ls.z).toBeLessThan(0.3)
  })

  it('卵在屏幕上占得住（卵径 / 画面直径 20%~45%）', () => {
    // 下限：叶片放大到把卵挤成一个点；上限：叶片小到只剩卵底下一块绿垫，读不出是叶
    const r = Math.max(s.x, s.z) / (2 * egg.radius)
    expect(r).toBeGreaterThan(0.2)
    expect(r).toBeLessThan(0.45)
  })
})

// ---------------------------------------------------------------- 幼虫

describe('幼虫：胸部膨大、一对假眼的「小蛇头」绿虫', () => {
  const SKIN = [
    'body',
    'eyespot-pupil',
    'eyespot-glint',
    'eyespot-iris',
    'eyespot-rim',
    'eyespot-bridge',
    'saddle-band',
    'saddle-spot',
    'oblique-bar',
    'oblique-edge',
    'spiracle',
  ]
  const skin = meshesByName(larva, ...SKIN)
  const body = meshesByName(larva, 'body')
  const skinVerts = vertsOf(skin)
  const skinBox = boxOf(skin)
  const bodyLen = skinBox.max.x - skinBox.min.x
  const frontX = skinBox.max.x
  /** 某段 x 区间里体壁的最大半宽 */
  const halfWidthIn = (x0: number, x1: number) =>
    Math.max(...skinVerts.filter((v) => v.x >= x0 && v.x <= x1).map((v) => Math.abs(v.z)))
  const segX = (seg: number) => frontX - (seg / 13) * bodyLen

  const pupil = meshesByName(larva, 'eyespot-pupil')
  const iris = meshesByName(larva, 'eyespot-iris')
  const rim = meshesByName(larva, 'eyespot-rim')
  const side = (meshes: THREE.Mesh[], sign: 1 | -1) => vertsOf(meshes).filter((v) => v.z * sign > 0)

  it('体长 4.3~4.7 厘米（5 龄可达 45~46 毫米）', () => {
    expect(bodyLen).toBeGreaterThan(4.3)
    expect(bodyLen).toBeLessThan(4.7)
  })

  it('胸部膨大：T2~T3 比腹部宽 2~6 成 —— 从背面看是一个「头大」的蛇形', () => {
    const thorax = halfWidthIn(segX(2.6), segX(1.2))
    const abdomen = halfWidthIn(segX(9), segX(6))
    const r = thorax / abdomen
    expect(r, '胸不比腹粗，就只是一条普通的绿毛虫').toBeGreaterThan(1.2)
    expect(r, '粗过头就成了一只蝌蚪').toBeLessThan(1.6)
  })

  it('一对假眼：左右各一，镜像对称，落在 T2~T3 的背侧', () => {
    const r = mean(side(pupil, 1))
    const l = mean(side(pupil, -1))
    expect(side(pupil, 1).length).toBeGreaterThan(0)
    expect(side(pupil, -1).length).toBeGreaterThan(0)
    expect(r.distanceTo(new THREE.Vector3(l.x, l.y, -l.z)), '两眼镜像对称').toBeLessThan(0.01)
    // 位置：后胸前半 —— 眼长在腹部，蛇头就成了蛇腰
    expect(r.x).toBeLessThan(segX(1.4))
    expect(r.x).toBeGreaterThan(segX(3))
    // 背侧：自背中线偏开 25°~70°。正背上的一对会挤成一只，正体侧的一对从上面看不见
    const axisY = (halfYAt: number) => halfYAt
    const bandVerts = skinVerts.filter((v) => Math.abs(v.x - r.x) < 0.02)
    const yTop = Math.max(...bandVerts.map((v) => v.y))
    const yBot = Math.min(...bandVerts.map((v) => v.y))
    const cy = axisY((yTop + yBot) / 2)
    const ang = (Math.atan2(r.z, r.y - cy) * 180) / Math.PI
    expect(ang).toBeGreaterThan(25)
    expect(ang).toBeLessThan(70)
  })

  it('假眼是一层层同心的：黑瞳孔在浅虹圈里、虹圈在黑眼缘里', () => {
    for (const sign of [1, -1] as const) {
      const p = mean(side(pupil, sign))
      expect(mean(side(iris, sign)).distanceTo(p), '虹圈与瞳孔同心').toBeLessThan(0.03)
      expect(mean(side(rim, sign)).distanceTo(p), '眼缘与瞳孔同心').toBeLessThan(0.03)
      const bp = new THREE.Box3().setFromPoints(side(pupil, sign))
      const bi = new THREE.Box3().setFromPoints(side(iris, sign))
      const br = new THREE.Box3().setFromPoints(side(rim, sign))
      expect(bi.containsBox(bp), '虹圈包住瞳孔').toBe(true)
      expect(br.containsBox(bi), '眼缘包住虹圈').toBe(true)
    }
    // 瞳孔里一点反光：没有它，一块黑斑读不成「一只在看你的眼睛」
    const glint = meshesByName(larva, 'eyespot-glint')
    expect(glint).toHaveLength(1)
    const g = new THREE.Box3().setFromPoints(side(glint, 1))
    expect(new THREE.Box3().setFromPoints(side(rim, 1)).containsBox(g)).toBe(true)
  })

  it('假眼在屏幕上够大（眼径 / 画面直径 4%~15%）', () => {
    const b = new THREE.Box3().setFromPoints(side(rim, 1)).getSize(new THREE.Vector3())
    const d = b.x
    // 太小读不出是眼；太大就不是「小蛇的眼」而是一对车灯了
    expect(d / (2 * larva.radius)).toBeGreaterThan(0.04)
    expect(d / (2 * larva.radius)).toBeLessThan(0.15)
  })

  it('假眼是体壁本身的颜色区：不凸出体壁，与四周共用同一圈边界顶点', () => {
    /*
     * 瓢虫幼虫的斑点做成凸出的实体，渲出来是一圈「塑料环」；蛹上的黑斑成了「玻璃珠」。
     * 两件事一起量：
     * - 眼斑的每个顶点都不比同一处的体壁更靠外（凸出 0.002 = 0.02 毫米就红）；
     * - 眼缘外圈与底色共用顶点（贴上去的实体与体壁不可能逐位共点）。
     */
    const eye = [...pupil, ...iris, ...rim]
    const ex = vertsOf(eye)
    const x0 = Math.min(...ex.map((v) => v.x))
    const x1 = Math.max(...ex.map((v) => v.x))
    const localBody = vertsOf(body).filter((v) => v.x >= x0 - 0.03 && v.x <= x1 + 0.03)
    const bodyMaxZ = Math.max(...localBody.map((v) => Math.abs(v.z)))
    const bodyMaxY = Math.max(...localBody.map((v) => v.y))
    expect(Math.max(...ex.map((v) => Math.abs(v.z)))).toBeLessThan(bodyMaxZ + 0.002)
    expect(Math.max(...ex.map((v) => v.y))).toBeLessThan(bodyMaxY + 0.002)
    expect(sharedVertexCount(rim, body), '眼缘与底色必须共边').toBeGreaterThan(40)
    expect(sharedVertexCount(pupil, iris), '瞳孔与虹圈必须共边').toBeGreaterThan(20)
  })

  it('眼斑的黑与周围的绿拉得开 —— 绿虫最怕糊成一团绿泥', () => {
    const b = hslByName(larva, 'body')
    const p = hslByName(larva, 'eyespot-pupil')
    const i = hslByName(larva, 'eyespot-iris')
    const r = hslByName(larva, 'eyespot-rim')
    const g = hslByName(larva, 'eyespot-glint')
    expect(b.h, '底色是绿的').toBeGreaterThan(80)
    expect(b.h).toBeLessThan(130)
    expect(b.s).toBeGreaterThan(0.4)
    // 嫩绿：压成墨绿（ACES 下「越深越保险」）招牌就没了；太亮又成了荧光绿
    expect(b.l).toBeGreaterThan(0.38)
    expect(b.l).toBeLessThan(0.6)
    expect(p.l, '瞳孔近黑').toBeLessThan(0.12)
    expect(r.l, '眼缘近黑').toBeLessThan(0.12)
    expect(b.l - p.l, '瞳孔与底绿的明度差').toBeGreaterThan(0.3)
    expect(i.l - p.l, '虹圈与瞳孔的明度差').toBeGreaterThan(0.6)
    expect(i.l - b.l, '虹圈比底绿亮得多').toBeGreaterThan(0.25)
    expect(g.l, '反光近白').toBeGreaterThan(0.9)
  })

  it('T3/A1 之间一条深褐横带：在眼后、跨过背中线、带里夹浅紫蓝斑', () => {
    const band = meshesByName(larva, 'saddle-band')
    const spots = meshesByName(larva, 'saddle-spot')
    expect(band).toHaveLength(1)
    const bv = vertsOf(band)
    const bc = mean(bv)
    expect(bc.x, '横带在眼斑之后').toBeLessThan(mean(side(pupil, 1)).x - 0.15)
    expect(bc.x).toBeGreaterThan(segX(3.8))
    // 横跨背面：带上有点落在背中线附近，且左右都有
    expect(bv.some((v) => Math.abs(v.z) < 0.02)).toBe(true)
    expect(Math.max(...bv.map((v) => v.z))).toBeGreaterThan(0.3)
    expect(Math.min(...bv.map((v) => v.z))).toBeLessThan(-0.3)
    // 横带是横的：沿体轴的厚度远小于横跨
    const bs = boxOf(band).getSize(new THREE.Vector3())
    expect(bs.x / bs.z).toBeLessThan(0.4)

    const bh = hslByName(larva, 'saddle-band')
    const sh = hslByName(larva, 'saddle-spot')
    expect(bh.l, '深色带').toBeLessThan(0.25)
    expect(sh.l - bh.l, '带里的斑要浅得跳出来').toBeGreaterThan(0.45)
    expect(sh.h, '浅紫蓝').toBeGreaterThan(220)
    expect(sh.h).toBeLessThan(275)
    // 斑都在带里
    expect(boxOf(band).expandByScalar(0.005).containsBox(boxOf(spots))).toBe(true)
  })

  it('腹部斜带：白芯黑边、斜着从体侧下前方走向背面上后方', () => {
    const bars = meshesByName(larva, 'oblique-bar')
    const edges = meshesByName(larva, 'oblique-edge')
    expect(bars).toHaveLength(1)
    expect(edges).toHaveLength(1)
    const right = vertsOf(bars).filter((v) => v.z > 0)
    // 两对斜带分开量（第一对 A3→A4、第二对在 A5），混在一起量，两条之间的错位会冲掉相关性
    const split = segX(7.05)
    const first = right.filter((v) => v.x > split)
    const second = right.filter((v) => v.x <= split)
    expect(first.length).toBeGreaterThan(0)
    expect(second.length).toBeGreaterThan(0)
    // 斜：越往后（x 越小）越高（y 越大），x 与 y 强负相关。竖带、横带都在 0 附近
    for (const bar of [first, second]) {
      const r = pearson(
        bar.map((v) => v.x),
        bar.map((v) => v.y),
      )
      expect(r, '斜带必须是斜的').toBeLessThan(-0.6)
    }
    // 第一对长、第二对短
    const len = (vs: THREE.Vector3[]) => new THREE.Box3().setFromPoints(vs).getSize(new THREE.Vector3()).length()
    expect(len(first) / len(second), "第一对长、第二对「much shorter」").toBeGreaterThan(1.25)
    // 落在腹部 A3~A5，不在胸部
    const c = mean(right)
    expect(c.x).toBeLessThan(segX(4.8))
    expect(c.x).toBeGreaterThan(segX(8.3))
    expect(hslByName(larva, 'oblique-bar').l, '白芯').toBeGreaterThan(0.85)
    expect(hslByName(larva, 'oblique-edge').l, '黑边').toBeLessThan(0.15)
    expect(sharedVertexCount(edges, body), '斜带同样是体壁的颜色区').toBeGreaterThan(40)
  })

  it('臭角：前胸前缘翻出的一枚 Y 形橙红肉管，两支向前上方张开', () => {
    const osm = meshesByName(larva, 'osmeterium')
    expect(osm, '一根短干 + 两支').toHaveLength(3)
    const h = hslByName(larva, 'osmeterium')
    expect(h.h < 25 || h.h > 350, '橙红').toBe(true)
    expect(h.s).toBeGreaterThan(0.6)
    const ov = vertsOf(osm)
    const ob = boxOf(osm)
    // 在前端：比眼斑还靠前，且高过头壳
    expect(ob.min.x, '臭角长在前胸前缘').toBeGreaterThan(mean(side(pupil, 1)).x)
    expect(ob.max.y).toBeGreaterThan(boxOf(meshesByName(larva, 'head-capsule')).max.y + 0.2)
    // Y 形：两支末梢左右分开
    const tipR = ov.filter((v) => v.z > 0).reduce((a, v) => (v.z > a.z ? v : a))
    const tipL = ov.filter((v) => v.z < 0).reduce((a, v) => (v.z < a.z ? v : a))
    expect(tipR.z - tipL.z, '两支张开成 Y').toBeGreaterThan(0.5)
    // 长度上下限：真实翻出时约 5~8 毫米，做成触角那么长就喧宾夺主
    expect(ob.max.x - ob.min.x).toBeGreaterThan(0.3)
    expect(ob.max.x - ob.min.x).toBeLessThan(0.9)
  })

  it('头壳小、黄褐、缩在前胸下方 —— 那对「眼」根本不在头上', () => {
    const head = boxOf(meshesByName(larva, 'head-capsule'))
    const hs = head.getSize(new THREE.Vector3())
    const thorax = 2 * halfWidthIn(segX(2.6), segX(1.2))
    expect(hs.z / thorax, '头壳远比膨大的胸部窄').toBeLessThan(0.4)
    expect(hs.z / thorax).toBeGreaterThan(0.15)
    const hc = head.getCenter(new THREE.Vector3())
    expect(hc.x, '头在最前').toBeGreaterThan(segX(0.3))
    // 在前胸下方：头心低于体壁前端的中高
    const front = skinVerts.filter((v) => v.x > frontX - 0.1)
    const midY = (Math.max(...front.map((v) => v.y)) + Math.min(...front.map((v) => v.y))) / 2
    expect(hc.y).toBeLessThan(midY)
    const h = hslByName(larva, 'head-capsule')
    expect(h.h).toBeGreaterThan(25)
    expect(h.h).toBeLessThan(50)
  })

  it('附肢：3 对分节胸足 + 4 对腹足 + 1 对尾足；体侧 9 对气门', () => {
    expect(larva.rig?.legs).toHaveLength(6)
    expect(meshesByName(larva, 'proleg')).toHaveLength(8)
    expect(meshesByName(larva, 'clasper')).toHaveLength(2)
    // 气门是体壁的颜色区（一个网格），按左右与 x 聚类数个数
    const xs = vertsOf(meshesByName(larva, 'spiracle'))
      .filter((v) => v.z > 0)
      .map((v) => v.x)
      .sort((a, b) => a - b)
    let clusters = xs.length ? 1 : 0
    for (let i = 1; i < xs.length; i++) if (xs[i] - xs[i - 1] > 0.1) clusters++
    // 9 对，不是 13 对：中后胸没有气门
    expect(clusters, '右侧 9 个气门').toBe(9)
  })

  it('尾端收细封口，不是一截锯断的管子', () => {
    const xMin = skinBox.min.x
    const tail = skinVerts.filter((v) => v.x <= xMin + bodyLen * 0.01)
    const tailR = Math.max(...tail.map((v) => Math.abs(v.z)))
    expect(tailR / halfWidthIn(segX(9), segX(6))).toBeLessThan(0.35)
  })

  it('锚点：假眼的标注点就落在假眼上', () => {
    expect(larva.anchors.eyespot.distanceTo(mean(side(pupil, 1)))).toBeLessThan(0.2)
    expect(larva.anchors.osmeterium).toBeDefined()
  })
})

// ---------------------------------------------------------------- 蛹

describe('蛹：丝带斜吊在枝上的绿色缢蛹', () => {
  const SKIN = ['pupa-shell', 'dorsal-diamond', 'wing-case', 'wing-seam']
  const shell = meshesByName(pupa, ...SKIN)
  const shellVerts = vertsOf(shell)
  const horns = meshesByName(pupa, 'cephalic-horn')
  const cremaster = meshesByName(pupa, 'cremaster')
  const girdle = meshesByName(pupa, 'girdle')
  const knots = meshesByName(pupa, 'girdle-knot')
  const twig = meshesByName(pupa, 'twig')
  const twigBox = boxOf(twig)
  const twigC = twigBox.getCenter(new THREE.Vector3())
  const twigR = twigBox.getSize(new THREE.Vector3()).x / 2
  const distToTwigAxis = (v: THREE.Vector3) => Math.hypot(v.x - twigC.x, v.z - twigC.z)

  // 体轴：臀棘末端 → 两头角根部的中点
  const cremEnd = vertsOf(cremaster).reduce((a, v) => (distToTwigAxis(v) < distToTwigAxis(a) ? v : a))
  const hornBase = mean(vertsOf(horns))
  const axisDir = hornBase.clone().sub(cremEnd).normalize()

  it('长 3~3.4 厘米（蛹长 31~32 毫米）', () => {
    const len = Math.max(...shellVerts.map((v) => v.clone().sub(cremEnd).dot(axisDir)))
    expect(len).toBeGreaterThan(3.0)
    expect(len).toBeLessThan(3.4)
  })

  it('缢蛹姿态：头朝上、斜着离开枝条 15°~40°（帝王蝶的垂蛹是头朝下倒挂）', () => {
    expect(axisDir.y, '头端必须朝上').toBeGreaterThan(0.7)
    const lean = (Math.acos(axisDir.y) * 180) / Math.PI
    expect(lean).toBeGreaterThan(15)
    expect(lean).toBeLessThan(40)
    // 头端离开枝条、尾端贴着枝条
    expect(distToTwigAxis(hornBase)).toBeGreaterThan(distToTwigAxis(cremEnd) + 1)
  })

  it('臀棘钩在枝上', () => {
    expect(distToTwigAxis(cremEnd), '臀棘末端抵住枝面').toBeLessThan(twigR + 0.03)
    expect(meshesByName(pupa, 'silk-pad')).toHaveLength(1)
  })

  it('丝带：两端固定在枝上，中段绕过蛹的背面 —— 这是「缢」的全部意思', () => {
    expect(girdle).toHaveLength(1)
    expect(knots).toHaveLength(2)
    for (const k of knots) {
      const c = boxOf([k]).getCenter(new THREE.Vector3())
      expect(Math.abs(distToTwigAxis(c) - twigR), '固着点在枝面上').toBeLessThan(0.06)
    }
    const kc = knots.map((k) => boxOf([k]).getCenter(new THREE.Vector3()))
    expect(kc[0].z * kc[1].z, '两个固着点分在枝条左右').toBeLessThan(0)

    // 绕过背面：丝带上离枝最远的点，比同一高度带里蛹壳离枝最远的点还远（在壳外绕过去）。
    // 只连两个固着点、不绕蛹的「丝带」过不了这一条
    const gv = vertsOf(girdle)
    const far = gv.reduce((a, v) => (distToTwigAxis(v) > distToTwigAxis(a) ? v : a))
    const shellBand = shellVerts.filter((v) => Math.abs(v.y - far.y) < 0.08 && Math.abs(v.z) < 0.1)
    const shellFar = Math.max(...shellBand.map(distToTwigAxis))
    expect(distToTwigAxis(far)).toBeGreaterThan(shellFar)
    expect(distToTwigAxis(far) - shellFar, '贴着壳绕，不是远远兜一圈').toBeLessThan(0.1)
    // 绕在胸背隆起之后的腰上：丝带中点在蛹长的 45%~75% 高度（自臀棘算）
    const h = far.clone().sub(cremEnd).dot(axisDir) / 3.18
    expect(h).toBeGreaterThan(0.45)
    expect(h).toBeLessThan(0.75)
  })

  it('丝带在屏幕上看得见，但不是一根绳子（粗 / 画面直径 0.8%~2%）', () => {
    // 管的粗细 = 顶点到曲线的距离 × 2，TubeGeometry 的半径即丝带半径
    const g = girdle[0].geometry as THREE.TubeGeometry
    const d = 2 * g.parameters.radius
    expect(d / (2 * pupa.radius)).toBeGreaterThan(0.008)
    expect(d / (2 * pupa.radius)).toBeLessThan(0.02)
    const silk = hslByName(pupa, 'girdle')
    const sh = hslByName(pupa, 'pupa-shell')
    const tw = hslByName(pupa, 'twig')
    expect(silk.l - sh.l, '白丝在绿蛹上跳得出来').toBeGreaterThan(0.3)
    expect(silk.l - tw.l, '白丝在褐枝上跳得出来').toBeGreaterThan(0.3)
  })

  it('腹面朝枝、背面朝外：翅芽比背斑更靠近枝条', () => {
    const wing = mean(vertsOf(meshesByName(pupa, 'wing-case')))
    const diamond = mean(vertsOf(meshesByName(pupa, 'dorsal-diamond')))
    expect(distToTwigAxis(diamond) - distToTwigAxis(wing)).toBeGreaterThan(0.15)
  })

  it('头端一对头角：短、朝头向伸出、左右分开', () => {
    expect(horns).toHaveLength(2)
    const tips = horns.map((h) => vertsOf([h]).reduce((a, v) => (v.clone().sub(cremEnd).dot(axisDir) > a.clone().sub(cremEnd).dot(axisDir) ? v : a)))
    const top = Math.max(...shellVerts.map((v) => v.clone().sub(cremEnd).dot(axisDir)))
    for (const t of tips) {
      const beyond = t.clone().sub(cremEnd).dot(axisDir) - top
      expect(beyond, '头角伸出头端之外').toBeGreaterThan(0.05)
      expect(beyond, '是短角，不是触角').toBeLessThan(0.3)
    }
    expect(Math.abs(tips[0].z - tips[1].z), '一对，左右分开').toBeGreaterThan(0.15)
  })

  it('侧看有棱角：胸背隆起 → 其后下凹 → 腹部（浑圆的瓮形过不了）', () => {
    /*
     * 沿体轴分段，量每段背面离轴最远的距离（背向 = 离开枝条那一侧）。
     * 隆起处要明显高过它后面那道凹，凹后腹部要再回升一点 —— 这就是「angled in side view」。
     */
    const dorsal = new THREE.Vector3(-axisDir.y, axisDir.x, 0) // 体轴在 XY 平面内转 90°，指向离枝一侧
    if (dorsal.x > 0) dorsal.negate()
    const L = 3.18
    const profile = (a: number, b: number) =>
      Math.max(
        ...shellVerts
          .filter((v) => {
            const s = v.clone().sub(cremEnd).dot(axisDir) / L
            return s >= a && s <= b && Math.abs(v.z) < 0.08
          })
          .map((v) => v.clone().sub(cremEnd).dot(dorsal)),
      )
    const hump = profile(0.72, 0.8)
    const dip = profile(0.6, 0.66)
    const belly = profile(0.47, 0.53)
    expect(hump - dip, '胸背隆起要明显').toBeGreaterThan(0.1)
    expect(hump - dip, '但不是一个瘤').toBeLessThan(0.45)
    expect(belly - dip, '凹后腹部回升').toBeGreaterThan(0.005)
  })

  it('绿色型：嫩绿底、背面一块浅黄菱形斑、翅芽外缘一道深色缝线', () => {
    const sh = hslByName(pupa, 'pupa-shell')
    const dm = hslByName(pupa, 'dorsal-diamond')
    const seam = hslByName(pupa, 'wing-seam')
    expect(sh.h).toBeGreaterThan(80)
    expect(sh.h).toBeLessThan(130)
    expect(sh.l).toBeGreaterThan(0.38)
    expect(sh.l).toBeLessThan(0.6)
    expect(dm.h, '菱形斑是黄的').toBeGreaterThan(48)
    expect(dm.h).toBeLessThan(70)
    expect(dm.l - sh.l, '黄斑要与底绿分得开').toBeGreaterThan(0.15)
    expect(sh.l - seam.l, '缝线要看得出').toBeGreaterThan(0.15)
    // 菱形：两端（沿体轴）收尖 —— 横宽在端部远窄于中部
    const dv = vertsOf(meshesByName(pupa, 'dorsal-diamond'))
    const s = dv.map((v) => v.clone().sub(cremEnd).dot(axisDir))
    const s0 = Math.min(...s)
    const s1 = Math.max(...s)
    const width = (a: number, b: number) => {
      const zs = dv.filter((_, i) => s[i] >= a && s[i] <= b).map((v) => v.z)
      return Math.max(...zs) - Math.min(...zs)
    }
    const mid = (s0 + s1) / 2
    const span = s1 - s0
    expect(width(s1 - span * 0.1, s1) / width(mid - span * 0.05, mid + span * 0.05)).toBeLessThan(0.35)
    // 同样是壳面的颜色区，不是贴上去的
    expect(sharedVertexCount(meshesByName(pupa, 'dorsal-diamond'), meshesByName(pupa, 'pupa-shell'))).toBeGreaterThan(20)
  })
})
