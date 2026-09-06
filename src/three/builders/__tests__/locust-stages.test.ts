/**
 * 东亚飞蝗生活史两阶段（卵块 / 若虫）的形态验证。
 *
 * 写每一条断言之前的自检只有一句：**把实现改坏，这条会不会红？**
 * 所以下面每条都注了它对着哪一个具体的坏法，而这些坏法多数是本轮实拍
 * 当场抓出来的（腹部被后腿整根遮没、卵糊成一根玉米棒、土柱读成一段巧克力）。
 *
 * 另一条同样贵的教训：**断言量的是数字，人看的是长相，两者可以毫无关系。**
 * 所以「大小」类断言一律上下限齐给，「看得见」类断言一律换算成占画面的比例
 * （取景按 model.radius 归一化，一段跨度 / 画面直径就是它在屏幕上占多少）。
 *
 * 若虫那一组多处拿**成虫**（`buildLocust()`）当参照系而不是写死数字：
 * 「若虫比成虫小」「翅芽比翅短得多」「若虫的眼相对更大」这三件事本来就是
 * 一对比较，写成对比才咬得住——成虫哪天调了尺寸，这里会跟着一起动。
 */
import * as THREE from 'three'
import { describe, expect, it } from 'vitest'
import { buildLocustEgg, POD_H, axisAt, centerShift } from '../stages/locust-egg'
import { buildLocustNymph } from '../stages/locust-nymph'
import { buildLocust } from '../locust'
import type { InsectModel } from '../kit'

const TRIANGLE_BUDGET = 150_000

const egg = buildLocustEgg()
const nymph = buildLocustNymph()
const adult = buildLocust()

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

/** 世界坐标下的全部顶点（模型已 finalize 居中，世界坐标即模型局部坐标） */
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

function boxOf(ms: THREE.Object3D[]): THREE.Box3 {
  const b = new THREE.Box3()
  for (const m of ms) b.union(new THREE.Box3().setFromObject(m))
  return b
}
function sizeOf(ms: THREE.Object3D[]): THREE.Vector3 {
  return boxOf(ms).getSize(new THREE.Vector3())
}

/**
 * 一组顶点的**真实**轴对齐跨度。
 *
 * 为什么不用 `Box3.setFromObject`：它取的是几何体自带包围盒的**八个角**再过一遍
 * 世界矩阵，对转过角度的物体是个放大了的外接盒。一枚倾斜 8° 的卵，
 * 真实横径 0.11，`setFromObject` 量出来 0.25 —— 拿它去判「卵是不是竖着的」
 * 会把一整批倾角都判成横躺。
 */
function spanOf(verts: THREE.Vector3[]): THREE.Vector3 {
  const b = new THREE.Box3()
  for (const v of verts) b.expandByPoint(v)
  return b.getSize(new THREE.Vector3())
}

/**
 * 材质基色的 HSL。**必须显式指定 sRGB**：three 的颜色管理把 hex 转进线性工作
 * 空间，缺省 getHSL 返回的是线性明度，深色会被压扁（阈值全失真）。
 */
function hslOf(mesh: THREE.Mesh): { h: number; s: number; l: number } {
  const mat = (Array.isArray(mesh.material) ? mesh.material[0] : mesh.material) as THREE.MeshPhysicalMaterial
  const hsl = { h: 0, s: 0, l: 0 }
  mat.color.getHSL(hsl, THREE.SRGBColorSpace)
  return { h: hsl.h * 360, s: hsl.s, l: hsl.l }
}
function hslByName(model: InsectModel, name: string) {
  const m = meshesByName(model, name)[0]
  expect(m, `找不到名为 ${name} 的网格`).toBeDefined()
  return hslOf(m)
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

/**
 * 放样体逐环的「环心」与「到环心的最远距离」。
 *
 * `loft(sections, n)` 每环有 n+1 个顶点，末尾两个封口中心点凑不满一环、整除时
 * 自然落掉（`SphereGeometry(r, w, h)` 每行同样是 w+1 个，所以球也能用同一套量）。
 * 取**最远**而不是平均：椭圆截面的最远距离就是它的半长轴，也就是人看到的
 * 「这根有多粗」；取平均会把侧扁的腿节量小一档。
 *
 * ⚠️ 环心只能对 `ring - 1` 个顶点求平均：每环的**最后一个顶点与第一个重合**
 * （角度 0 与 2π 采了两次）。把它一起平均进去，环心会朝角度 0 那个方向偏
 * `半径 / ring`——腿节实测偏了 0.011，于是「人字纹凸出腿节表面」量出来恒为负，
 * 那条断言就永远抓不到「棱埋在腿里」这个真 bug。第一版正是这么写的。
 */
function rings(mesh: THREE.Mesh, ring: number): { center: THREE.Vector3; maxR: number }[] {
  const pos = mesh.geometry.getAttribute('position')
  const count = Math.floor(pos.count / ring)
  const out: { center: THREE.Vector3; maxR: number }[] = []
  for (let r = 0; r < count; r++) {
    const pts: THREE.Vector3[] = []
    const c = new THREE.Vector3()
    for (let j = 0; j < ring; j++) {
      const p = new THREE.Vector3().fromBufferAttribute(pos, r * ring + j).applyMatrix4(mesh.matrixWorld)
      pts.push(p)
      if (j < ring - 1) c.add(p)
    }
    c.divideScalar(ring - 1)
    out.push({ center: c, maxR: Math.max(...pts.map((p) => p.distanceTo(c))) })
  }
  return out
}
function maxSectionRadius(mesh: THREE.Mesh, ring: number): number {
  return Math.max(...rings(mesh, ring).map((r) => r.maxR))
}

/** 一组点绕给定中心的方位角排序后，相邻两点之间的最大角间隙（度）。判「剖没剖开」 */
function maxAzimuthGap(points: THREE.Vector3[], cx: number, cz: number): { deg: number; dir: THREE.Vector3 } {
  const BINS = 72
  const bins = new Array(BINS).fill(false)
  for (const p of points) {
    const a = Math.atan2(p.z - cz, p.x - cx)
    bins[Math.floor((((a + Math.PI * 2) % (Math.PI * 2)) / (Math.PI * 2)) * BINS) % BINS] = true
  }
  let best = 0
  let bestStart = 0
  for (let s = 0; s < BINS; s++) {
    let run = 0
    while (run < BINS && !bins[(s + run) % BINS]) run++
    if (run > best) {
      best = run
      bestStart = s
    }
  }
  const mid = ((bestStart + best / 2) / BINS) * Math.PI * 2
  return { deg: (best * 360) / BINS, dir: new THREE.Vector3(Math.cos(mid), 0, Math.sin(mid)) }
}

/**
 * 锚点离实体有多远，取 min(到最近顶点, 到最近网格包围盒) / 包围半径。
 * 与全站闸门 `src/three/__tests__/anchors-have-geometry.test.ts` 同一套判据 ——
 * 那道闸门只跑成虫，阶段模型得自己带一份，否则「招牌部件被删掉」照样全绿。
 */
function detachRatio(model: InsectModel, anchor: THREE.Vector3): number {
  model.group.updateMatrixWorld(true)
  const v = new THREE.Vector3()
  const box = new THREE.Box3()
  let best = Infinity
  model.group.traverse((o) => {
    const mesh = o as THREE.Mesh
    if (!mesh.isMesh || !mesh.geometry) return
    box.setFromObject(mesh)
    best = Math.min(best, box.distanceToPoint(anchor))
    const pos = mesh.geometry.getAttribute('position')
    const step = pos.count > 600 ? Math.ceil(pos.count / 600) : 1
    for (let i = 0; i < pos.count; i += step) {
      v.fromBufferAttribute(pos, i)
      mesh.localToWorld(v)
      const d = v.distanceTo(anchor)
      if (d < best) best = d
    }
  })
  return best / Math.max(model.radius, 1e-6)
}

// ---------------------------------------------------------------- 通规

describe('两个阶段的通用契约', () => {
  const all: [string, InsectModel][] = [
    ['卵块', egg],
    ['若虫', nymph],
  ]

  it.each(all)('%s：有实体、无 NaN、面数在预算内', (_n, model) => {
    const { triangles, nan, meshes } = inspect(model)
    expect(meshes).toBeGreaterThan(0)
    expect(nan, 'NaN/Inf 顶点会让整个模型静默变成空白').toBe(0)
    expect(triangles).toBeGreaterThan(0)
    expect(triangles).toBeLessThan(TRIANGLE_BUDGET)
  })

  it.each(all)('%s：尺度落在昆虫量级里（1 = 1 厘米）', (_n, model) => {
    expect(model.radius).toBeGreaterThan(0.02)
    expect(model.radius).toBeLessThan(12)
  })

  it.each(all)('%s：每个标注点底下都真有几何体', (_n, model) => {
    const entries = Object.entries(model.anchors)
    expect(entries.length, '一个锚点都没有').toBeGreaterThan(2)
    const floating: string[] = []
    for (const [name, a] of entries) {
      expect(Number.isFinite(a.x) && Number.isFinite(a.y) && Number.isFinite(a.z), `anchor ${name} 非有限`).toBe(true)
      const ratio = detachRatio(model, a)
      if (!(ratio <= 0.12)) floating.push(`${name}（离实体 ${ratio.toFixed(2)}×半径）`)
    }
    expect(floating, `这些标注点浮在空气里：${floating.join('、')}`).toEqual([])
  })
})

// ---------------------------------------------------------------- 卵块

describe('卵：土里的一整个卵囊', () => {
  const wall = meshesByName(egg, 'pod-wall')
  const cavity = meshesByName(egg, 'pod-cavity')
  const cuts = meshesByName(egg, 'pod-cut')
  const eggs = meshesByName(egg, 'egg')
  const bubbles = meshesByName(egg, 'foam-bubble')
  const foam = meshesByName(egg, 'foam-bubble', 'foam-core')
  const soil = meshesByName(egg, 'soil', 'soil-cut')
  const shift = centerShift(egg.anchors)
  /** 建模帧的高度 y → 模型坐标里的轴线点 */
  const axis = (y: number) => axisAt(y).add(shift)
  /** 模型坐标里的高度 → 建模帧的高度 */
  const modelY = (y: number) => y - shift.y

  it('卵囊是一根 4~7 厘米、上粗下细的棒（不是球也不是块）', () => {
    const s = sizeOf(wall)
    // 上下限齐给：真实卵囊 4~7 厘米，为「好看」缩小是 stages.ts 明令禁止的
    expect(s.y).toBeGreaterThan(4)
    expect(s.y).toBeLessThan(7)
    expect(s.y).toBeCloseTo(POD_H, 1)
    const slender = s.y / Math.max(s.x, s.z)
    expect(slender, '细长比 < 4 就不是「一根棒」了').toBeGreaterThan(4)
    expect(slender, '细长比 > 12 会细成一根线，卵在画面上看不清').toBeLessThan(12)
  })

  it('50~80 枚卵，每一枚都是 6~7 毫米的细长米粒', () => {
    expect(eggs.length).toBeGreaterThanOrEqual(50)
    expect(eggs.length).toBeLessThanOrEqual(80)
    for (const e of eggs) {
      const s = spanOf(vertsOf([e]))
      const long = s.y
      const across = Math.max(s.x, s.z)
      // 上下限齐给：把卵放大到「好看」是这一档最常见的错法
      expect(long, `卵长 ${long.toFixed(3)} 越界（真实 6~7 毫米）`).toBeGreaterThan(0.58)
      expect(long).toBeLessThan(0.78)
      expect(across).toBeGreaterThan(0.08)
      expect(across).toBeLessThan(0.17)
      expect(long / across, '长径比 4~8 才是米粒形（球是 1）').toBeGreaterThan(4)
      expect(long / across).toBeLessThan(8)
    }
  })

  it('卵是**竖排**的：每一枚的长轴都近乎与囊轴平行', () => {
    // 腔内径只有 4.8 毫米、卵长 6.6 毫米，横过来根本塞不进去——
    // 「竖排」是被腔径逼出来的事实，不是画法选择。把卵转 90° 这条立刻红
    for (const e of eggs) {
      const s = spanOf(vertsOf([e]))
      expect(s.y / Math.max(s.x, s.z), '卵横躺了').toBeGreaterThan(3)
    }
  })

  it('每一枚卵都待在囊腔里，没有捅穿囊壁', () => {
    // 只量水平距离：卵是竖的，捅穿只可能是横向捅出去
    let worst = 0
    for (const v of vertsOf(eggs)) {
      const c = axis(modelY(v.y))
      worst = Math.max(worst, Math.hypot(v.x - c.x, v.z - c.z))
    }
    // 该高度段的腔半径约 0.24~0.27；0.26 是「卵尖刚好还在腔里」的线
    expect(worst, `有卵探到离轴线 ${worst.toFixed(3)} 处，已经戳出囊壁`).toBeLessThan(0.26)
  })

  it('卵集中在下段、泡沫塞在上段（不是搅在一起）', () => {
    const eggBox = boxOf(eggs)
    const foamBox = boxOf(foam)
    const eggMid = eggBox.getCenter(new THREE.Vector3()).y
    const foamMid = foamBox.getCenter(new THREE.Vector3()).y
    expect(foamMid - eggMid, '泡沫塞必须明显在卵之上').toBeGreaterThan(1.2)
    expect(foamBox.min.y, '泡沫塞不许一路塞到卵堆底下').toBeGreaterThan(eggBox.min.y + 2)
    // 泡沫塞占卵囊上段的多少：真实卵囊约 1/4~1/3
    const frac = foamBox.getSize(new THREE.Vector3()).y / sizeOf(wall).y
    expect(frac).toBeGreaterThan(0.15)
    expect(frac).toBeLessThan(0.45)
  })

  it('泡沫塞真的是「泡沫」：≥40 枚气泡，轮廓凹凸不平', () => {
    expect(bubbles.length, '气泡太少，整团会读成一串葡萄').toBeGreaterThanOrEqual(40)
    for (const b of bubbles) {
      const d = spanOf(vertsOf([b])).length() / Math.sqrt(3)
      expect(d, '气泡直径越界').toBeGreaterThan(0.08)
      expect(d).toBeLessThan(0.32)
    }
    /*
     * 「凹凸」的可测形式：在泡沫塞中段切一薄层，按方位角分 24 格，
     * 每格取最外一点的半径，比最大格与最小格。
     * 一根光滑的柱子这个比值恒等于 1 —— 把气泡换成柱子，这一条立刻红。
     */
    const fv = vertsOf(foam)
    const ys = fv.map((v) => v.y)
    const mid = (Math.min(...ys) + Math.max(...ys)) / 2
    const slab = fv.filter((v) => Math.abs(v.y - mid) < 0.12)
    const c = axis(modelY(mid))
    const bins = new Array(24).fill(0)
    for (const v of slab) {
      const a = Math.atan2(v.z - c.z, v.x - c.x)
      const k = Math.floor((((a + Math.PI * 2) % (Math.PI * 2)) / (Math.PI * 2)) * 24) % 24
      bins[k] = Math.max(bins[k], Math.hypot(v.x - c.x, v.z - c.z))
    }
    const used = bins.filter((b) => b > 0)
    expect(used.length).toBeGreaterThan(12)
    expect(Math.max(...used) / Math.min(...used), '泡沫塞的轮廓是圆的 —— 那是根柱子，不是一团泡沫').toBeGreaterThan(1.25)
  })

  it('卵与泡沫塞在画面上真的分得开（明度 + 饱和度两条路）', () => {
    const e = hslOf(eggs[0])
    const f = hslByName(egg, 'foam-bubble')
    expect(e.h, '卵是淡黄褐，色相在 35~60°').toBeGreaterThan(35)
    expect(e.h).toBeLessThan(60)
    expect(e.l, '卵必须是画面里最亮的东西').toBeGreaterThan(0.7)
    expect(e.s, '压灰了就成了一堆小土豆').toBeGreaterThan(0.55)
    // 两条都要：只靠明度差时一旦有人把泡沫调亮，那根棒就成了一坨均匀的土色
    expect(e.l - f.l, '卵与泡沫塞的明度差').toBeGreaterThan(0.08)
    expect(e.s - f.s, '卵与泡沫塞的饱和度差').toBeGreaterThan(0.35)
  })

  it('明度按档排开：卵 > 泡沫 > 腔壁 > 剖面 > 囊壁 > 土', () => {
    const ladder = [
      ['卵', hslOf(eggs[0]).l],
      ['泡沫塞', hslByName(egg, 'foam-core').l],
      ['腔壁', hslByName(egg, 'pod-cavity').l],
      ['剖面', hslByName(egg, 'pod-cut').l],
      ['囊壁', hslByName(egg, 'pod-wall').l],
      ['土', hslByName(egg, 'soil').l],
    ] as const
    for (let i = 1; i < ladder.length; i++) {
      expect(
        ladder[i - 1][1] - ladder[i][1],
        `${ladder[i - 1][0]}(${ladder[i - 1][1].toFixed(2)}) 没有比 ${ladder[i][0]}(${ladder[i][1].toFixed(2)}) 亮`,
      ).toBeGreaterThan(0.02)
    }
    // 「越深越保险」是本仓库栽过的大跟头：整根棒压成近黑，卵和泡沫像浮在黑洞里
    expect(ladder[ladder.length - 1][1], '土压得太深，整根棒会读成一块黑巧克力').toBeGreaterThan(0.22)
  })

  it('卵囊被纵向剖开：囊壁沿周向留出 ≥120° 的缺口，**而且缺口正对机位**', () => {
    const y = modelY(2.4)
    const c = axis(2.4)
    const slab = vertsOf(wall).filter((v) => Math.abs(v.y - (y + shift.y)) < 0.15)
    expect(slab.length).toBeGreaterThan(20)
    const gap = maxAzimuthGap(slab, c.x, c.z)
    expect(gap.deg, `最大缺口只有 ${gap.deg}° —— 没剖开，里面的卵谁也看不见`).toBeGreaterThanOrEqual(120)
    // 缺口开对方向才算数：开反 180° 时缺口一样大，却背着人开
    // （展台默认机位 (2,1,3)；侧机位 (0.12,0.28,1)）
    for (const [name, d] of [
      ['展台默认', [2, 1, 3]],
      ['侧', [0.12, 0.28, 1]],
      ['前斜', [1, 0.32, 0.4]],
    ] as const) {
      const v = new THREE.Vector3(...d).normalize()
      const dot = new THREE.Vector3(v.x, 0, v.z).normalize().dot(gap.dir)
      expect(dot, `${name}机位与剖口方向的夹角 ${((Math.acos(dot) * 180) / Math.PI).toFixed(0)}° —— 开反了`).toBeGreaterThan(0.3)
    }
  })

  it('剖口露出的是有厚度的囊壁，不是一张纸的边', () => {
    expect(cuts).toHaveLength(2)
    expect(cavity).toHaveLength(1)
    for (const cut of cuts) {
      const verts = vertsOf([cut])
      /*
       * 剖面就是「外轮廓与腔轮廓之间的那一圈」，所以它在某个高度上的径向宽度
       * 正是**囊壁厚**（该处实测 0.07）。给 0.04 的下限：低于这个数，
       * 剖口上就只剩一条线，整件读成「一张卷起来的纸」而不是「一根被切开的棒」。
       */
      const c = axis(2.4)
      const slab = verts.filter((v) => Math.abs(v.y - c.y) < 0.2)
      expect(slab.length, '这一片剖面在这个高度上没有顶点').toBeGreaterThan(3)
      const rs = slab.map((v) => Math.hypot(v.x - c.x, v.z - c.z))
      expect(Math.max(...rs) - Math.min(...rs), '剖面在这个高度上没有宽度 —— 囊壁成了一张纸').toBeGreaterThan(0.04)
    }
    // 腔壁必须真的在囊壁里面：同高度的最大半径要比囊壁小一圈
    const c = axis(2.4)
    const radial = (ms: THREE.Mesh[]) => {
      const s = vertsOf(ms).filter((v) => Math.abs(v.y - c.y) < 0.1)
      return Math.max(...s.map((v) => Math.hypot(v.x - c.x, v.z - c.z)))
    }
    const wallR = radial(wall)
    const cavR = radial(cavity)
    expect(wallR - cavR, `壁厚只有 ${(wallR - cavR).toFixed(3)}，剖口上看不出厚度`).toBeGreaterThan(0.03)
  })

  it('有一小块土壤剖面托着，「土壤中越冬」读得出来', () => {
    expect(soil.length).toBeGreaterThan(0)
    const soilBox = boxOf(soil)
    const wallBox = boxOf(wall)
    // 土柱要包住卵囊的绝大部分高度，只垫一小块在底下不算「埋在土里」
    const overlap = Math.min(soilBox.max.y, wallBox.max.y) - Math.max(soilBox.min.y, wallBox.min.y)
    expect(overlap / wallBox.getSize(new THREE.Vector3()).y).toBeGreaterThan(0.9)
    // 土面上要有颗粒，否则那是个塑料底座
    expect(meshesByName(egg, 'soil-grain').length).toBeGreaterThanOrEqual(8)
  })
})

// ---------------------------------------------------------------- 若虫

describe('若虫（蝻）：缩小版成虫 + 倒转的翅芽', () => {
  const bodyMeshes = meshesByName(nymph, 'head-capsule', 'pronotum-saddle', 'thorax', 'abdomen')
  const bodyLen = sizeOf(bodyMeshes).x
  const forePads = meshesByName(nymph, 'wing-pad-fore')
  const hindPads = meshesByName(nymph, 'wing-pad-hind')
  const femurs = meshesByName(nymph, 'hind-femur')
  const walkLegs = meshesByName(nymph, 'walk-leg')
  const chevrons = meshesByName(nymph, 'femur-chevron')
  const spines = meshesByName(nymph, 'tibia-spine')
  const abdomen = meshesByName(nymph, 'abdomen')
  const eyes = meshesByName(nymph, 'eye')

  it('体长 2.4~3.1 厘米，且明显小于成虫 —— 这一条本身就是这一阶段的内容', () => {
    expect(bodyLen).toBeGreaterThan(2.4)
    expect(bodyLen).toBeLessThan(3.1)
    const ratio = nymph.radius / adult.radius
    expect(ratio, `若虫 / 成虫 = ${ratio.toFixed(2)} —— 放大到成虫大小就白讲了`).toBeLessThan(0.62)
    // 下限同样要给：缩成一粒芝麻也不对，5 龄蝻是成虫的一半上下
    expect(ratio).toBeGreaterThan(0.35)
  })

  it('没有翅，只有翅芽：骨架里一片翅都没有，芽长只有体长的 14~30%', () => {
    // 成虫的前翅走 kit.wingPair()，会在 rig 里登记成 4 片翅
    expect(adult.rig?.wings, '成虫应当有 4 片翅（参照系）').toHaveLength(4)
    expect(nymph.rig?.wings, '若虫身上出现了 kit 的翅 —— 那是成虫才有的东西').toBeUndefined()

    expect(forePads).toHaveLength(2)
    expect(hindPads).toHaveLength(2)
    for (const [what, pads] of [
      ['前翅芽', forePads],
      ['后翅芽', hindPads],
    ] as const) {
      const len = spanOf(vertsOf([pads[0]])).length()
      const frac = len / bodyLen
      // 成虫前翅是体长的 59%（locust.ts 里 2.9 / 4.9）。做到 30% 以上就成了「翅」
      expect(frac, `${what}长 ${(frac * 100).toFixed(0)}% 体长 —— 那已经是翅不是芽了`).toBeLessThan(0.3)
      expect(frac, `${what}短得看不出是一片芽`).toBeGreaterThan(0.14)
    }
    // 芽尖只搭到腹部前几节：腹部 8 节、全长约 1.64，三节 = 0.61
    const abdBox = boxOf(abdomen)
    const padFront = boxOf([...forePads, ...hindPads])
    expect(
      padFront.min.x - abdBox.min.x,
      '翅芽一路盖到腹末了 —— 那是成虫收拢的翅，不是中期若虫的芽',
    ).toBeGreaterThan(abdBox.getSize(new THREE.Vector3()).x * 0.55)
  })

  it('**翅芽是倒转的**：后翅芽在前翅芽的上方与外侧（与成虫相反）', () => {
    const fore = boxOf(forePads).getCenter(new THREE.Vector3())
    const hind = boxOf(hindPads).getCenter(new THREE.Vector3())
    expect(hind.y - fore.y, '后翅芽没有压在前翅芽上方 —— 倒转这个知识点就丢了').toBeGreaterThan(0.03)
    const foreZ = Math.max(...vertsOf(forePads).map((v) => Math.abs(v.z)))
    const hindZ = Math.max(...vertsOf(hindPads).map((v) => Math.abs(v.z)))
    expect(hindZ - foreZ, '后翅芽没有落在前翅芽的外侧').toBeGreaterThan(0.02)
  })

  it('两对翅芽的尖端都朝上朝后翻', () => {
    for (const [what, pads] of [
      ['前翅芽', forePads],
      ['后翅芽', hindPads],
    ] as const) {
      const verts = vertsOf([pads[0]])
      // 基部在最靠前（+x）那一端，末端在最靠后那一端
      const xs = verts.map((v) => v.x)
      const xMin = Math.min(...xs)
      const xMax = Math.max(...xs)
      const front = verts.filter((v) => v.x >= xMax - 0.05)
      const back = verts.filter((v) => v.x <= xMin + 0.05)
      const meanY = (vs: THREE.Vector3[]) => vs.reduce((s, v) => s + v.y, 0) / vs.length
      expect(meanY(back) - meanY(front), `${what}的尖端没有比基部高 —— 那是向后垂着的芽`).toBeGreaterThan(0.15)
      expect(xMax - xMin, `${what}没有向后伸`).toBeGreaterThan(0.25)
    }
  })

  it('翅芽离开体表、投得出阴影缝（不是贴在背上的一块膏药）', () => {
    // 黑蚱蝉若虫的翅芽实撞过：整片贴着体表走，末端埋进腹部表面 0.01，
    // 一条阴影缝都投不出来，四个机位一致读成「胸背上的一块深色斑纹」
    const abdVerts = vertsOf(abdomen)
    for (const [what, pads] of [
      ['前翅芽', forePads],
      ['后翅芽', hindPads],
    ] as const) {
      const pv = vertsOf([pads[0]]).filter((v) => v.z > 0)
      const xs = pv.map((v) => v.x)
      const tipX = Math.min(...xs)
      const near = pv.filter((v) => v.x <= tipX + 0.12)
      const padLow = Math.min(...near.map((v) => v.y))
      const padZ = near.reduce((s, v) => s + v.z, 0) / near.length
      /*
       * 底下那块体表要按**翅芽自己的 z** 取，不能拿腹部的背中线来比：
       * 翅芽长在体侧上方，腹背中线比它下面那一片体表高出一大截，
       * 拿中线去比会把缝算小一半（第一版就这么写的，前翅芽因此误判为没有缝）。
       */
      const under = abdVerts.filter((v) => Math.abs(v.x - tipX) < 0.12 && Math.abs(v.z - padZ) < 0.06)
      expect(under.length, '翅芽末端底下取不到腹部表面').toBeGreaterThan(3)
      const abdTop = Math.max(...under.map((v) => v.y))
      const gap = padLow - abdTop
      // 换算成占画面的比例：0.02×体长在 720 像素的成图上约 10 像素，看得见的一道缝
      expect(gap / bodyLen, `${what}末端离腹背只有 ${gap.toFixed(3)}，投不出阴影缝`).toBeGreaterThan(0.02)
    }
  })

  it('跳跃后足：腿节明显比步行足粗，长度也够', () => {
    expect(femurs).toHaveLength(2)
    const femurR = maxSectionRadius(femurs[0], 17)
    const walkR = Math.max(...walkLegs.map((m) => maxSectionRadius(m, 13)))
    expect(walkR).toBeGreaterThan(0)
    expect(
      femurR / walkR,
      `后足腿节只有步行足的 ${(femurR / walkR).toFixed(1)} 倍 —— 跳跃腿与步行腿分不出来了`,
    ).toBeGreaterThan(2.8)
    // 上限也给：腿节粗到和腹部一样就会把整只虫遮没（第一版实拍就是这样）
    const abdR = maxSectionRadius(abdomen[0], 27)
    expect(femurR / abdR, '腿节粗得跟腹部一样，整根腹部会被它遮没').toBeLessThan(0.85)

    const c = rings(femurs[0], 17)
    const femurLen = c[0].center.distanceTo(c[c.length - 1].center)
    expect(femurLen / bodyLen, '后足腿节长 / 体长').toBeGreaterThan(0.3)
    expect(femurLen / bodyLen).toBeLessThan(0.52)
  })

  it('腿节上有人字纹，而且真的凸出腿节表面', () => {
    expect(chevrons.length, '人字纹太少').toBeGreaterThanOrEqual(8)
    const axisRings = rings(femurs[0], 17)
    // 只查右腿那一侧的纹（z > 0）
    const right = chevrons.filter((m) => new THREE.Box3().setFromObject(m).getCenter(new THREE.Vector3()).z > 0)
    expect(right.length).toBeGreaterThanOrEqual(4)
    for (const ch of right) {
      let best = 0
      for (const v of vertsOf([ch])) {
        // 找最近的一环，用那一环的半径当「该处腿节有多粗」
        let near = axisRings[0]
        for (const r of axisRings) if (v.distanceTo(r.center) < v.distanceTo(near.center)) near = r
        best = Math.max(best, v.distanceTo(near.center) - near.maxR)
      }
      // 「几何写了但埋在别的几何里」是本仓库反复踩的坑，这一条正对着它
      expect(best, '这条人字纹整个埋在腿节里，等于没做').toBeGreaterThan(0)
    }
  })

  it('胫节外缘两列刺，每条腿 ≥12 枚', () => {
    expect(spines.length).toBeGreaterThanOrEqual(24)
    for (const s of spines) {
      const d = spanOf(vertsOf([s])).length()
      expect(d, '刺长越界').toBeGreaterThan(0.02)
      expect(d).toBeLessThan(0.16)
    }
  })

  it('马鞍形前胸背板：中段收窄，前后端略高', () => {
    const pron = meshesByName(nymph, 'pronotum-saddle')[0]
    const rs = rings(pron, 21).map((r) => r.maxR)
    const mid = rs[Math.floor(rs.length / 2)]
    const max = Math.max(...rs)
    // 一根圆管这个比值是 1.0；马鞍实测 0.83
    expect(mid / max, `中段 / 最粗 = ${(mid / max).toFixed(2)} —— 没有马鞍，直翅目的背影就没了`).toBeLessThan(0.9)
    expect(mid / max, '收得太狠就断成两截了').toBeGreaterThan(0.6)
  })

  it('头与复眼相对成虫更大（幼体比例）', () => {
    expect(eyes).toHaveLength(2)
    const eyeD = Math.max(...spanOf(vertsOf([eyes[0]])).toArray())
    const frac = eyeD / bodyLen
    // 成虫实测 0.31 / 4.95 = 0.063（locust.ts 的 compoundEyePair radius 0.14、stretch 1.1）
    expect(frac, `复眼 / 体长 = ${frac.toFixed(3)}，没比成虫的 0.063 大`).toBeGreaterThan(0.07)
    expect(frac, '眼大到这个份上就成了蜻蜓').toBeLessThan(0.11)
    // 复眼要真的凸出头壳，不是画在头上的一个点
    const head = meshesByName(nymph, 'head-capsule')[0]
    const eyeZ = Math.max(...vertsOf([eyes[0]]).map((v) => Math.abs(v.z)))
    const headZ = Math.max(...vertsOf([head]).map((v) => Math.abs(v.z)))
    expect(eyeZ - headZ, '复眼没有凸出头壳轮廓').toBeGreaterThan(0.03)
  })

  it('体色偏绿，且比成虫更绿更亮 —— 散居型蝻与成虫拉开一档', () => {
    const n = hslByName(nymph, 'pronotum-saddle')
    const a = hslOf(meshesByName(adult, 'pronotum-saddle')[0])
    expect(n.h, '若虫的体色要落在绿区').toBeGreaterThan(65)
    expect(n.h).toBeLessThan(100)
    expect(n.s, '压灰了就成了土色，与成虫的黄绿褐分不开').toBeGreaterThan(0.3)
    expect(n.l - a.l, `若虫 ${n.l.toFixed(2)} 对成虫 ${a.l.toFixed(2)} —— 没有拉开一档`).toBeGreaterThan(0.04)
  })

  it('翅芽不许比胸背暗，后足腿节不许与躯干同色', () => {
    const pad = hslByName(nymph, 'wing-pad-hind')
    const body = hslByName(nymph, 'thorax')
    const femur = hslByName(nymph, 'hind-femur')
    const vein = hslByName(nymph, 'pad-vein')
    /*
     * 深色块贴在浅色面上，人眼的第一解释永远是「斑纹」，不是「盖在上面的一片东西」——
     * 黑蚱蝉若虫的翅芽做暗了 14 个百分点，四个机位一致读成「胸背上的一块污渍」。
     */
    expect(pad.l - body.l, '翅芽比胸背暗 —— 它会读成一块斑纹，不是一片芽').toBeGreaterThan(0.06)
    expect(vein.l - pad.l, '翅脉要比芽面亮，芽的形才看得出来').toBeGreaterThan(0.06)
    expect(vein.l, '翅脉亮成白就成了一片羽毛').toBeLessThan(0.8)
    // 腿节与躯干同色时，实拍里后腿与腹部糊成同一块绿，连轮廓都分不出
    expect(femur.l - body.l, '后足腿节与躯干同色 —— 出图上它会和腹部糊成一块').toBeGreaterThan(0.05)
  })
})
