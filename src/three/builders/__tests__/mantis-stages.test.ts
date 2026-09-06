/**
 * 中华大刀螳生活史两阶段（卵鞘 / 若虫）的形态验证。
 *
 * 写每一条之前的自检只有一句：**把实现改坏，这条会不会红？**
 * 所以下面每条断言都注了它对应的是哪一种改坏法 —— 那不是修辞，
 * 是逐条做过变异测试的记录（改坏 → 跑 → 确认红 → 还原）。
 *
 * 另外两条本仓库买来的教训，这份测试通篇按它们写：
 *
 * 1. **断言量的是数字，人看的是长相，两者可以毫无关系。** 双叉犀金龟那支头角
 *    被注释掉之后 3034 条测试全绿（`anchors-have-geometry.test.ts` 的由来）。
 *    所以「大小」类断言一律**上下限齐给**，「看得见」类断言一律换算成
 *    **占画面的比例** —— 取景按 `model.radius` 归一化，一段长度除以画面直径
 *    就是它在屏幕上占多少，比绝对厘米更接近人眼看到的那个量。
 * 2. **有向的断言比「差多少」的断言值钱。** 黑蚱蝉若虫的翅芽比胸背暗 0.119，
 *    「明度差 > 0.08」一路全绿，四个机位却一致把翅芽读成一块深色斑纹。
 *    所以本文件里凡是「A 比 B 亮」这种事，一律写成有向的。
 *
 * 跨阶段的对照（若虫 vs 成虫）直接构建 `buildMantis()` 来量，不写死常数：
 * 「若虫是缩小版成虫」「若虫没有可用的翅」这两句话本来就是关于两者**关系**的，
 * 拿成虫当基准量，成虫改了这里就会跟着报警。
 */
import * as THREE from 'three'
import { describe, expect, it } from 'vitest'
import { buildMantisEgg } from '../stages/mantis-egg'
import { buildMantisNymph } from '../stages/mantis-nymph'
import { buildMantis } from '../mantis'
import type { InsectModel } from '../kit'

const TRIANGLE_BUDGET = 150_000

const egg = buildMantisEgg()
const nymph = buildMantisNymph()
const adult = buildMantis()

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

function boxOf(objs: THREE.Object3D[]): THREE.Box3 {
  const box = new THREE.Box3()
  for (const o of objs) box.union(new THREE.Box3().setFromObject(o))
  return box
}

function sizeOf(objs: THREE.Object3D[]): THREE.Vector3 {
  return boxOf(objs).getSize(new THREE.Vector3())
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

/**
 * 材质基色的 HSL。**必须显式指定 sRGB**：three 的颜色管理把 hex 转进线性
 * 工作空间，缺省 getHSL 返回的是线性明度，深色会被压扁（#241c12 线性 L≈0.01），
 * 阈值全失真。
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
 * 锚点离实体有多远（占包围半径的比例），判据与全站闸门
 * `src/three/__tests__/anchors-have-geometry.test.ts` 完全一致 ——
 * 那条闸门只跑 `knownSpecies()`（成虫），阶段模型不在它的覆盖里，
 * 所以这里把同一把尺子搬过来自己量一遍。
 * 取 min(到最近顶点, 到最近网格包围盒)：只用顶点会冤枉埋在实心部件内部的锚点，
 * 只用包围盒又对细长斜置的部件太松。
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
    const pos = mesh.geometry.getAttribute('position') as THREE.BufferAttribute
    const step = pos.count > 600 ? Math.ceil(pos.count / 600) : 1
    for (let i = 0; i < pos.count; i += step) {
      v.fromBufferAttribute(pos, i)
      mesh.localToWorld(v)
      best = Math.min(best, v.distanceTo(anchor))
    }
  })
  return best / Math.max(model.radius, 1e-6)
}

/**
 * 从一根放样管里还原中轴线：`loft()` 的顶点是逐截面、每截面 radialSegments+1 个，
 * 取每一环的平均即得该处轴心（末尾两个封口中心点凑不满一环，整除时自然落掉）。
 *
 * 与「量包围盒」相比，这个量的是**弧**：包围盒分不出一根直刺和一把镰刀，
 * 而「胫节是反折回来的镰刀」正是捕捉足的形态学要点。
 */
function centerline(mesh: THREE.Mesh, radialSegments: number): THREE.Vector3[] {
  const ring = radialSegments + 1
  const pos = mesh.geometry.getAttribute('position')
  const rings = Math.floor(pos.count / ring)
  const out: THREE.Vector3[] = []
  const p = new THREE.Vector3()
  for (let r = 0; r < rings; r++) {
    const c = new THREE.Vector3()
    for (let j = 0; j < ring; j++) {
      p.fromBufferAttribute(pos, r * ring + j)
      c.add(p)
    }
    out.push(c.divideScalar(ring).applyMatrix4(mesh.matrixWorld))
  }
  return out
}

function arcLength(pts: THREE.Vector3[]): number {
  let sum = 0
  for (let i = 1; i < pts.length; i++) sum += pts[i].distanceTo(pts[i - 1])
  return sum
}

/** 一根放样管每一环的等效半径（环上各点到环心的平均距离）—— 量「这根管有多粗」 */
function tubeRadii(mesh: THREE.Mesh, radialSegments: number): number[] {
  const ring = radialSegments + 1
  const pos = mesh.geometry.getAttribute('position')
  const rings = Math.floor(pos.count / ring)
  const out: number[] = []
  const p = new THREE.Vector3()
  for (let r = 0; r < rings; r++) {
    const c = new THREE.Vector3()
    for (let j = 0; j < ring; j++) {
      p.fromBufferAttribute(pos, r * ring + j)
      c.add(p)
    }
    c.divideScalar(ring)
    let sum = 0
    for (let j = 0; j < ring; j++) {
      p.fromBufferAttribute(pos, r * ring + j)
      sum += p.distanceTo(c)
    }
    out.push(sum / ring)
  }
  return out
}

/**
 * 一片翅芽逐截面的厚与宽（局部坐标，几何沿局部 +X 长出，+Y 是厚、+Z 是宽）。
 *
 * 为什么不能直接取局部包围盒的 y 跨度当厚度：翅芽的后半段是**翘起来**的，
 * 那个抬升量会被算进「厚」里，一片薄芽会量成厚芽 —— 于是「扁不扁」这条断言
 * 就被自己的姿态糊弄过去了。逐环量则只看断面。
 */
function padSections(mesh: THREE.Mesh, radialSegments: number): { thick: number; width: number }[] {
  const ring = radialSegments + 1
  const pos = mesh.geometry.getAttribute('position')
  const rings = Math.floor(pos.count / ring)
  const out: { thick: number; width: number }[] = []
  const p = new THREE.Vector3()
  for (let r = 0; r < rings; r++) {
    let y0 = Infinity
    let y1 = -Infinity
    let z0 = Infinity
    let z1 = -Infinity
    for (let j = 0; j < ring; j++) {
      p.fromBufferAttribute(pos, r * ring + j)
      y0 = Math.min(y0, p.y)
      y1 = Math.max(y1, p.y)
      z0 = Math.min(z0, p.z)
      z1 = Math.max(z1, p.z)
    }
    out.push({ thick: y1 - y0, width: z1 - z0 })
  }
  return out
}

/**
 * kit 的复眼球面（`compoundEye()` 那层 dome）—— 靠材质指纹认，不靠命名：
 * 成虫文件里这对眼睛是匿名的，而「若虫的复眼相对更大」这句话必须拿成虫当基准量，
 * 写死一个常数就等于把两边的联系切断了（成虫改小，这条照样绿）。
 * dome 的材质参数在 kit 里是唯一的：roughness 0.12 / metalness 0.1 / clearcoat 1
 * （facets 叠加层是 0.22 / 0.05 / 0.9，不会误收）。
 */
function eyeDomes(model: InsectModel): THREE.Mesh[] {
  const out: THREE.Mesh[] = []
  model.group.updateMatrixWorld(true)
  model.group.traverse((o) => {
    const m = o as THREE.Mesh
    const mat = m.material as THREE.MeshPhysicalMaterial
    if (m.isMesh && mat && !Array.isArray(mat) && mat.clearcoat === 1 && mat.roughness === 0.12 && mat.metalness === 0.1) {
      out.push(m)
    }
  })
  return out
}

// ---------------------------------------------------------------- 通规

describe('两个阶段的通用契约', () => {
  const all: [string, InsectModel][] = [
    ['卵鞘', egg],
    ['若虫', nymph],
  ]

  it.each(all)('%s：有实体、无 NaN、面数在预算内', (_name, model) => {
    const { triangles, nan, meshes } = inspect(model)
    expect(meshes).toBeGreaterThan(0)
    expect(nan, 'NaN/Inf 顶点会让整个模型静默变成空白').toBe(0)
    expect(triangles).toBeGreaterThan(0)
    expect(triangles).toBeLessThan(TRIANGLE_BUDGET)
  })

  it.each(all)('%s：每个标注点底下都真的有几何体', (_name, model) => {
    const keys = Object.keys(model.anchors)
    expect(keys.length, '一个锚点都没有').toBeGreaterThan(0)
    const box = new THREE.Box3().setFromObject(model.group).expandByScalar(model.radius * 0.06)
    const floating: string[] = []
    for (const k of keys) {
      const v = model.anchors[k]
      expect(Number.isFinite(v.x) && Number.isFinite(v.y) && Number.isFinite(v.z), `anchor ${k} 坐标非有限`).toBe(true)
      expect(box.containsPoint(v), `anchor ${k} 落在模型之外`).toBe(true)
      // 判据同全站闸门：0.12×半径 ≈ 展台上 30 像素，再远就明显是「圆点指着空气」
      const ratio = detachRatio(model, v)
      if (!(ratio <= 0.12)) floating.push(`${k}（离实体 ${ratio.toFixed(2)}×半径）`)
    }
    expect(floating, `这些标注点浮在空气里：${floating.join('、')}`).toEqual([])
  })
})

// ---------------------------------------------------------------- 卵鞘

describe('卵鞘：糊在枝上的泡沫面包', () => {
  const shell = meshesByName(egg, 'ootheca-shell')
  const band = meshesByName(egg, 'hatch-band')
  const flaps = meshesByName(egg, 'hatch-flap')
  const seams = meshesByName(egg, 'layer-seam')
  const twig = meshesByName(egg, 'twig-bark')
  const shellBox = boxOf(shell)
  const shellSize = shellBox.getSize(new THREE.Vector3())
  const frame = 2 * egg.radius

  it('体量是一枚 3.2 厘米的真实卵鞘，不是被放大了的道具', () => {
    // 中华大刀螳的卵鞘长 2.5~4 厘米、高 1.5~2、宽 1.3~1.8。上下限齐给：
    // 「为了好看放大」是 stages.ts 明令禁止的，各阶段之间的量级差本身就是内容。
    expect(shellSize.x).toBeGreaterThan(2.5)
    expect(shellSize.x).toBeLessThan(4.0)
    expect(shellSize.y).toBeGreaterThan(1.4)
    expect(shellSize.y).toBeLessThan(2.1)
    expect(shellSize.z).toBeGreaterThan(1.2)
    expect(shellSize.z).toBeLessThan(1.9)
    const slender = shellSize.x / shellSize.y
    expect(slender, '长高比 1.6~2.4：再胖就是个球，再瘦就是根香肠').toBeGreaterThan(1.6)
    expect(slender).toBeLessThan(2.4)
    // 高略大于宽 —— 卵鞘的横断面是竖着的椭圆，不是圆管
    expect(shellSize.y).toBeGreaterThan(shellSize.z)
  })

  it('卵鞘自己占满画面，没被那段枝条抢了取景', () => {
    // 取景按 radius 归一化：枝条做长一截，卵鞘在屏幕上就跟着缩小。
    // 主角必须还是主角 —— 这条盯的是「枝条越加越长」这种漂移
    expect(shellSize.x / frame).toBeGreaterThan(0.55)
  })

  it('招牌一：一条纵贯背脊的孵化带，窄、居中、真的凸出于壳面', () => {
    expect(band, '孵化带不见了 —— 卵鞘唯一的门').toHaveLength(1)
    const bandBox = boxOf(band)
    const bandSize = bandBox.getSize(new THREE.Vector3())

    // 纵向：贯穿大半个卵鞘。做成一圈横带的话这条立刻红
    expect(bandSize.x / shellSize.x, '孵化带必须是纵向贯穿的，不是一道横箍').toBeGreaterThan(0.7)
    // 窄：它是一条带，不是把整个背面漆成浅色
    const rel = bandSize.z / shellSize.z
    expect(rel, '带太宽了，成了半个卵鞘的另一种颜色').toBeLessThan(0.35)
    expect(rel, '带太窄了，读不出是一条带').toBeGreaterThan(0.12)
    // 看得见：0.04 的画面占比在 720 像素上约 29 像素
    expect(bandSize.z / frame, '孵化带在屏幕上必须看得见').toBeGreaterThan(0.04)
    // 居中在背中线上
    expect(Math.abs(bandBox.getCenter(new THREE.Vector3()).z)).toBeLessThan(0.02)
    // 在背脊上，不在腹面
    const bandCenterY = bandBox.getCenter(new THREE.Vector3()).y
    expect(bandCenterY).toBeGreaterThan(shellBox.getCenter(new THREE.Vector3()).y + shellSize.y * 0.25)
    // 真的凸出来：埋在壳里等于没做（「几何写了但埋在别的几何里」是本仓库反复踩的坑）
    const rise = boxOf([...band, ...flaps]).max.y - shellBox.max.y
    expect(rise, '孵化带整条埋在壳面以下').toBeGreaterThan(0.02)
    expect(rise, '凸过头就成了一片背鳍').toBeLessThan(0.25)
  })

  it('招牌一之二：带上一列孵化口盖片，片片比带窄、后缘抬离带面', () => {
    expect(flaps.length, '孵化口盖片').toBeGreaterThanOrEqual(10)
    const bandBox = boxOf(band)
    const centers = flaps.map((f) => new THREE.Box3().setFromObject(f).getCenter(new THREE.Vector3()))
    // 一列排开：全都贴在中线上，且沿 x 铺满大半条带
    for (const c of centers) expect(Math.abs(c.z)).toBeLessThan(0.02)
    const xs = centers.map((c) => c.x).sort((a, b) => a - b)
    expect(xs[xs.length - 1] - xs[0]).toBeGreaterThan(bandBox.getSize(new THREE.Vector3()).x * 0.7)
    // 每片都比带窄：盖片是带上的瓦，不是又一条带
    for (const f of flaps) {
      const s = new THREE.Box3().setFromObject(f).getSize(new THREE.Vector3())
      expect(s.z).toBeLessThan(bandBox.getSize(new THREE.Vector3()).z)
    }
    // 后缘抬起：完全贴死的薄片投不出阴影缝，四个机位都只会读成「带上画的横线」
    expect(boxOf(flaps).max.y - bandBox.max.y, '盖片没有一片抬出带面').toBeGreaterThan(0.01)
  })

  it('招牌二：十几道横向层界弧棱，绕过体侧、沿轴等距排开', () => {
    expect(seams.length, '层界弧棱').toBeGreaterThanOrEqual(12)
    const info = seams.map((s) => {
      const b = new THREE.Box3().setFromObject(s)
      return { c: b.getCenter(new THREE.Vector3()), s: b.getSize(new THREE.Vector3()) }
    })
    // 横的：每一道的横向跨度都远大于沿轴跨度。改成纵条纹这条立刻红
    for (const it2 of info) {
      expect(it2.s.z / it2.s.x, '层界必须是横向的弧，不是纵向的棱').toBeGreaterThan(2.2)
    }
    // 真的绕过体侧：中段那些弧的横跨要接近整个卵鞘宽度
    const wide = info.filter((it2) => it2.s.z > shellSize.z * 0.6)
    expect(wide.length, '大多数弧棱只在背上画了一小段，没绕到体侧').toBeGreaterThanOrEqual(8)
    // 沿轴等距、且在屏幕上分得开（0.03 的画面占比 ≈ 720 像素上的 22 像素）
    const xs = info.map((it2) => it2.c.x).sort((a, b) => b - a)
    const gaps = xs.slice(1).map((x, i) => xs[i] - x)
    const mean = gaps.reduce((a, b) => a + b, 0) / gaps.length
    for (const gp of gaps) {
      expect(gp).toBeGreaterThan(mean * 0.6)
      expect(gp).toBeLessThan(mean * 1.6)
    }
    /*
     * **不能等距。** 这一条是目视验收打回来才补的：等距是「工业制品」最强的
     * 一个信号，而卵鞘是雌虫一阵一阵分泌出来的，每一阵的量都不一样。
     * 实测 max/min = 1.64；把 LAYER_WOBBLE 归零（严格等距）这个数变成 1.00，
     * 而此前那一版测试对这种退化**一条都不红**。
     */
    const spread = Math.max(...gaps) / Math.min(...gaps)
    expect(spread, '层界严格等距 —— 读起来是机器压出来的，不是一阵阵分泌出来的').toBeGreaterThan(1.15)
    expect(spread, '层宽乱到没有节奏，那也不是层理了').toBeLessThan(2.5)
    expect(mean / frame, '层界挤成一团，屏幕上数不出层数').toBeGreaterThan(0.03)
  })

  it('招牌二之三：壳面本身是一层层起伏的，而且起伏是圆过去的（泡沫层理，不是瓦楞板）', () => {
    /*
     * 这条盯两种改法，缺一不可：
     *
     * a. **把层叠弧纹压平。** 删掉起伏（SHINGLE=0）之后，弧棱还在、数量还对、
     *    横向也还对，上面那条照样全绿 —— 出图却是一根光滑的管子上箍了十几根橡皮筋。
     * b. **把层界做成锐棱。** 第一版正是这样（叠瓦：每层缓缓收薄、到层界猛地鼓起来，
     *    一道近乎垂直的坎）。离线出图台上「读得出层数」，换到站上真实的 Environment
     *    光下读成一叠塑料片 / 潮虫壳 / 藤编篮 —— 就是不像泡沫硬化出来的层理。
     *    目视验收打回重做。
     *
     * 量的是背脊线（壳面 z=0 那条棱）上的起伏：
     * - 起伏的**道数**用局部极大值数，压平了就只剩包络那一个峰 → 抓 a。
     * - 起伏的**陡峭程度**用「从谷爬到峰用了几个采样」，锐坎那一版恒等于 1，
     *   圆过去的现在中位数是 6 → 抓 b。单看「相邻落差有多大」不够：
     *   卵鞘前段的包络本来就在陡升，那里的落差比任何一道层界都大（实测 0.064）。
     */
    /*
     * 取背脊线：按**方位角**挑，不按 |z|<ε 挑。
     * `lump()` 让壳体左右不再严格对称，`finalize()` 的居中于是把整只沿 z 挪了
     * 一丁点（实测 9.7e-5），原来的 |z|<1e-4 一下只剩 1 个点、这条断言自己先废了。
     * 方位角 0.05 弧度（≈2.9°）比相邻那一列（≈5.3°）窄，只会收到背脊那一列。
     */
    const crest = vertsOf(shell)
      .filter((v) => v.y > 0 && Math.abs(Math.atan2(v.z, v.y)) < 0.05)
      .sort((a, b) => b.x - a.x)
    const line: THREE.Vector3[] = []
    for (const v of crest) if (!line.length || Math.abs(line[line.length - 1].x - v.x) > 1e-6) line.push(v)
    expect(line.length, '背脊线采样太少，下面的判据没有意义').toBeGreaterThan(120)

    const maxima: number[] = []
    const minima: number[] = []
    for (let i = 1; i < line.length - 1; i++) {
      if (line[i].y > line[i - 1].y && line[i].y >= line[i + 1].y) maxima.push(i)
      if (line[i].y < line[i - 1].y && line[i].y <= line[i + 1].y) minima.push(i)
    }
    expect(maxima.length, '背脊上一道层理起伏都没有 —— 壳面被压成了光管子').toBeGreaterThanOrEqual(12)

    const amps: number[] = []
    const flanks: number[] = []
    for (const mi of maxima) {
      const prev = [...minima].reverse().find((k) => k < mi)
      const next = minima.find((k) => k > mi)
      if (prev === undefined || next === undefined) continue
      amps.push(Math.min(line[mi].y - line[prev].y, line[mi].y - line[next].y))
      // 取**较陡**的那一侧：锯齿状的叠瓦只有一侧是坎，另一侧是缓坡，
      // 只量升边或只量降边都会被它蒙混过去（坎朝前朝后是两版实现的差别而已）
      flanks.push(Math.min(mi - prev, next - mi))
    }
    const median = (xs: number[]) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)]
    expect(amps.length).toBeGreaterThanOrEqual(10)

    // 深度：0.033 厘米 ≈ 画面直径的 0.7%。浅了看不见，深了就成了一串套在一起的碗
    expect(median(amps), '层理太浅，出图上读不出层叠').toBeGreaterThan(0.018)
    expect(median(amps), '层理太深，成了一串套在一起的碗').toBeLessThan(0.09)

    // 圆过去：峰的两侧**都**要爬好几个采样。锐坎那一版陡的那一侧恒等于 1
    expect(median(flanks), '层界是一道锐棱而不是圆过去的起伏 —— 出图会读成瓦楞板').toBeGreaterThanOrEqual(3)
    /*
     * 深浅不一。真实卵鞘上有的层界很深、有的几乎看不见 —— 雌虫那一阵分泌多少
     * 全凭当时的状态。深度整齐划一是「机器压出来的」四个破绽之一
     * （另三个：锐边、太深、等距）。只取中段那些峰来比：两端的峰骑在包络的
     * 陡坡上，深浅本来就受包络支配，掺进来会让这条断言恒真。
     */
    const mid = maxima
      .map((mi, i) => ({ x: line[mi].x, a: amps[i] }))
      .filter((o) => Math.abs(o.x) < 0.9 && Number.isFinite(o.a))
      .map((o) => o.a)
    expect(mid.length, '中段的层理峰太少，深浅这条没法判').toBeGreaterThanOrEqual(5)
    expect(Math.max(...mid) / Math.min(...mid), '每一道层界都一样深 —— 读起来是机器压的，不是分泌物').toBeGreaterThan(1.3)

    console.log('[mantis-egg] 层理：峰 %d 个，中位深度 %s，中位陡边跨 %d 个采样，中段深浅比 %s',
      maxima.length, median(amps).toFixed(4), median(flanks), (Math.max(...mid) / Math.min(...mid)).toFixed(2))
  })

  it('挂在枝上：枝条穿过卵鞘、两端伸出，且比卵鞘细得多', () => {
    expect(twig.length, '依托的枝条不见了 —— 「越冬时挂在枝上」就没了着落').toBeGreaterThan(0)
    const tb = boxOf(twig)
    const ts = tb.getSize(new THREE.Vector3())
    expect(tb.min.x, '枝条要从卵鞘后端伸出来').toBeLessThan(shellBox.min.x)
    expect(tb.max.x, '枝条要从卵鞘前端伸出来').toBeGreaterThan(shellBox.max.x)
    expect(ts.z / shellSize.z, '枝比卵鞘还粗的话，主角就成了那根木头').toBeLessThan(0.35)
    // 嵌进泡沫里，不是在旁边并排放着：枝顶必须高过卵鞘腹面
    expect(tb.max.y, '枝条与卵鞘没有交叠，读成两个各自漂着的东西').toBeGreaterThan(shellBox.min.y)
    expect(tb.min.y, '枝条整根埋进泡沫里了，一点也看不见').toBeLessThan(shellBox.min.y)
  })

  it('明度排成四档，全褐色系也不糊成一团泥', () => {
    const bandHsl = hslByName(egg, 'hatch-band')
    const flapHsl = hslByName(egg, 'hatch-flap')
    const shellHsl = hslByName(egg, 'ootheca-shell')
    const seamHsl = hslByName(egg, 'layer-seam')
    const barkHsl = hslByName(egg, 'twig-bark')

    // 「越深越保险」把招牌压没了 —— 第 5 轮 10 只里 7 只返工的头号病因
    expect(bandHsl.l, '孵化带要真的接近白').toBeGreaterThan(0.85)
    expect(barkHsl.l, '树皮要真的接近黑').toBeLessThan(0.3)
    expect(bandHsl.l - shellHsl.l, '孵化带必须明显浅于壳面，否则那道门就没了').toBeGreaterThan(0.2)
    /*
     * 层界只比壳面深一点点。上下限都要给，而且这一条的**上限**才是主角：
     * 目视验收打回的那一版层界深了 0.25，十几道深色细线把整只读成藤编篮 /
     * 潮虫壳。层理本来就该靠形（见上面那条起伏断言），这条深色只在逆光机位
     * 替它兜底 —— 深过 0.2 就又变成画上去的线了。
     */
    expect(shellHsl.l - seamHsl.l, '层界连一点暗都没有，逆光机位层理会整片消失').toBeGreaterThan(0.06)
    expect(shellHsl.l - seamHsl.l, '层界太深，十几道深色细线会把卵鞘读成藤编篮').toBeLessThan(0.2)
    expect(flapHsl.l - shellHsl.l, '盖片也得浅于壳面（它属于孵化带那一套）').toBeGreaterThan(0.1)
    expect(bandHsl.l - barkHsl.l, '最亮与最暗之间的总跨度').toBeGreaterThan(0.55)

    // 壳体是米黄褐：色相落在黄褐区、明度中调（压深就成了一坨泥，提亮就成了石膏）
    expect(shellHsl.h).toBeGreaterThan(25)
    expect(shellHsl.h).toBeLessThan(50)
    expect(shellHsl.l).toBeGreaterThan(0.48)
    expect(shellHsl.l).toBeLessThan(0.72)
    expect(shellHsl.s, '灰掉的话卵鞘会读成一块水泥').toBeGreaterThan(0.25)
  })
})

// ---------------------------------------------------------------- 若虫

describe('若虫：一只缩小版的成虫，只是翅还停在芽的阶段', () => {
  const pads = meshesByName(nymph, 'wing-pad')
  const abd = meshesByName(nymph, 'abdomen')
  const head = meshesByName(nymph, 'head')
  const thorax = meshesByName(nymph, 'thorax')
  const prothorax = meshesByName(nymph, 'prothorax')
  const spines = meshesByName(nymph, 'fore-spine')
  const foreFemur = meshesByName(nymph, 'fore-femur')
  const foreTibia = meshesByName(nymph, 'fore-tibia')
  const pupils = meshesByName(nymph, 'pseudopupil')
  const abdBox = boxOf(abd)
  const bodyLength = boxOf(head).max.x - abdBox.min.x
  const frame = 2 * nymph.radius

  it('体长 3~4 厘米，明显小于成虫的 7~9 厘米', () => {
    expect(bodyLength).toBeGreaterThan(3.0)
    expect(bodyLength).toBeLessThan(4.0)
    // 与成虫的量级差 —— 这条盯的是「按好看调尺度」。放大到成虫量级立刻红
    const rel = nymph.radius / adult.radius
    expect(rel, '这只若虫和成虫一样大了').toBeLessThan(0.55)
    expect(rel, '这只若虫小得像刚孵化的一龄，不是中后期龄期').toBeGreaterThan(0.3)
  })

  it('招牌：两对短小的翅芽 —— 不是翅，也没有一片 kit 意义上的翅', () => {
    expect(pads, '中胸、后胸各一对，共 4 枚').toHaveLength(4)
    // kit 的 wing()/wingPair() 会往 rig 里注册翅。若虫身上一片都不该有：
    // 顺手改用 wingPair() 做「大一点的翅芽」时，这条会当场拦住
    expect(nymph.rig?.wings, '若虫身上出现了 kit 的翅 —— 那是成虫才有的东西').toBeUndefined()

    // 扁而不薄：厚/宽 逐环量（不能用包围盒，后缘的翘起会被算进厚里）
    for (const p of pads) {
      const secs = padSections(p, 20)
      const flat = Math.max(...secs.map((s) => s.thick)) / Math.max(...secs.map((s) => s.width))
      expect(flat, `翅芽厚/宽 ${flat.toFixed(2)}，厚成了一根香肠`).toBeLessThan(0.45)
      expect(flat, `翅芽厚/宽 ${flat.toFixed(2)}，薄成了一张纸片`).toBeGreaterThan(0.12)
    }
  })

  it('招牌：翅芽在画面上远短于成虫的翅，末端只搭到腹部前段', () => {
    /*
     * 「若虫没有可用的翅」这句话是这个阶段的全部内容，所以拿成虫直接比。
     * 两个模型各自按自己的 radius 取景，所以比的是**屏幕上的占比** ——
     * 用户在生活史里来回切阶段时，看到的正是这两个数。
     * 实测：翅芽 12.2% vs 成虫前翅 30.4%，比值 0.40。
     */
    const padLen = Math.max(
      ...pads.map((p) => {
        const pos = p.geometry.getAttribute('position')
        const b = new THREE.Box3()
        const v = new THREE.Vector3()
        for (let i = 0; i < pos.count; i++) b.expandByPoint(v.fromBufferAttribute(pos, i))
        return b.getSize(new THREE.Vector3()).x
      }),
    )
    const wings = adult.rig?.wings ?? []
    expect(wings.length, '成虫身上找不到翅，这条测试选错了基准').toBeGreaterThan(0)
    const adultWing = Math.max(
      ...wings.map((w) => {
        const s = new THREE.Box3().setFromObject(w.pivot).getSize(new THREE.Vector3())
        return Math.max(s.x, s.y, s.z)
      }),
    )
    const ratio = padLen / frame / (adultWing / (2 * adult.radius))
    expect(ratio, `翅芽占画面 ${((padLen / frame) * 100).toFixed(1)}%，已经是一副翅而不是芽`).toBeLessThan(0.55)
    expect(padLen / frame, '翅芽小到屏幕上看不见，那这个阶段就没东西可讲了').toBeGreaterThan(0.06)

    // 末端搭到腹部，但只搭到前段。做成成虫那样盖住整条腹部时立刻红
    const into = (abdBox.max.x - boxOf(pads).min.x) / (abdBox.max.x - abdBox.min.x)
    expect(into, '翅芽根本没搭到腹部，停在胸上了').toBeGreaterThan(0.05)
    expect(into, `翅芽盖到腹部 ${(into * 100).toFixed(0)}% 处，那已经是成虫的翅了`).toBeLessThan(0.4)
  })

  it('翅芽不许比它趴着的胸背暗 —— 有向的一条', () => {
    // 黑蚱蝉若虫的翅芽曾比胸背暗 0.119，「差 > 0.08」一路全绿，
    // 四个机位却一致读成「胸背上的一块深色斑纹」。深色块贴在浅色面上，
    // 人眼的第一解释永远是斑纹，不是盖上去的一片东西。
    const pad = hslByName(nymph, 'wing-pad')
    const notum = hslByName(nymph, 'thorax')
    expect(pad.l, '翅芽比胸背还暗，会读成一块斑纹').toBeGreaterThanOrEqual(notum.l)
    const rim = hslByName(nymph, 'pad-rim')
    expect(rim.l, '外缘那道棱要近白，翅芽才有自己闭合的轮廓').toBeGreaterThan(0.8)
  })

  it('招牌：捕捉足 —— 粗壮的腿节 + 腹缘刺列 + 反折回来的镰刀胫节', () => {
    expect(spines, '腿节腹缘的刺列，左右各 7 枚').toHaveLength(14)
    expect(foreFemur).toHaveLength(2)
    expect(foreTibia).toHaveLength(2)

    // 刺是有体积的锥，不是几片侧立的窄三角（兰花螳螂的花瓣状腿节栽过这个跟头）
    const shapes = spines.map((s) => {
      const cl = centerline(s, 8)
      const r0 = tubeRadii(s, 8)[0]
      return { len: arcLength(cl), r0, base: cl[0], tip: cl[cl.length - 1] }
    })
    expect(Math.max(...shapes.map((s) => s.len / (2 * s.r0))), '最长的刺也不够尖细').toBeGreaterThan(3)
    for (const s of shapes) {
      expect(s.len / (2 * s.r0), '有刺短得成了一颗疙瘩').toBeGreaterThan(1.7)
      // 刺朝腹面（下方）：朝背面的话它就不是「捕猎时扎进猎物」的那排刺了
      expect(s.tip.y, '刺尖必须朝腹面').toBeLessThan(s.base.y)
    }

    // 捕捉足的腿节必须明显比中后足粗 —— 「把捕捉足换成普通足」的正面拦截
    const walkFemurs = (nymph.rig?.legs ?? []).map((l) => l.femur.children.find((c) => (c as THREE.Mesh).isMesh) as THREE.Mesh)
    expect(walkFemurs.length, '中后足应是 kit 的分节足（有骨架句柄）').toBe(4)
    const foreR = Math.max(...tubeRadii(foreFemur[0], 14))
    const walkR = Math.max(...walkFemurs.flatMap((m) => tubeRadii(m, 12)))
    expect(foreR / walkR, '捕捉足的腿节和走路的腿一样细，那就是四条普通足').toBeGreaterThan(1.8)

    // 胫节反折：末端要落回腿节末端的**后方**，而且是一条弧不是一根直棍
    const fcl = centerline(foreFemur[0], 14)
    const tcl = centerline(foreTibia[0], 14)
    const femurTip = fcl[fcl.length - 1]
    const hookTip = tcl[tcl.length - 1]
    expect(femurTip.x - hookTip.x, '胫节没有折回来，成了继续向前伸的一根棍').toBeGreaterThan(0.15)
    expect(arcLength(tcl) / tcl[0].distanceTo(hookTip), '胫节是镰刀，不是折线').toBeGreaterThan(1.3)
  })

  it('幼体比例：复眼相对成虫更大，头宽扁 —— 倒三角靠的就是这对眼', () => {
    const nd = eyeDomes(nymph)
    const ad = eyeDomes(adult)
    expect(nd, '若虫的复眼').toHaveLength(2)
    expect(ad, '成虫的复眼（基准）').toHaveLength(2)
    const nEye = sizeOf([nd[0]]).z / frame
    const aEye = sizeOf([ad[0]]).z / (2 * adult.radius)
    expect(nEye / aEye, `复眼占画面 ${(nEye * 100).toFixed(1)}%，成虫 ${(aEye * 100).toFixed(1)}% —— 幼体的头该更大`).toBeGreaterThan(1.35)

    // 头是宽扁的倒三角，不是一颗球
    const hs = sizeOf(head)
    expect(hs.z / hs.y, '头宽必须明显大于头高').toBeGreaterThan(1.4)
    // 复眼顶在头的上后角：加上眼之后整个头部才撑开
    const withEyes = sizeOf([...head, ...nd]).z
    expect(withEyes / hs.z, '复眼没把头撑宽，倒三角就无从谈起').toBeGreaterThan(1.4)
  })

  it('复眼里那个近黑的伪瞳孔，是全身对比最强的一笔', () => {
    expect(pupils, '左右各一枚伪瞳孔').toHaveLength(2)
    const p = hslByName(nymph, 'pseudopupil')
    const e = hslOf(eyeDomes(nymph)[0])
    expect(p.l, '伪瞳孔要真的接近黑').toBeLessThan(0.2)
    expect(e.l - p.l, '伪瞳孔与眼色差不开，这颗大眼睛就死了').toBeGreaterThan(0.45)
    // 看得见：占画面 1% 在 720 像素上约 7 像素
    const d = Math.max(...pupils.map((m) => new THREE.Box3().setFromObject(m).getSize(new THREE.Vector3()).length()))
    expect(d / frame).toBeGreaterThan(0.01)
    /*
     * 得真长在眼球上，不是浮在脸前。伪瞳孔按定义就在复眼**表面**，
     * 所以判据不是「离眼心近」而是「不超出眼球本身的范围」——
     * 量它到最近那颗眼球球心的距离，与那颗眼球的最大半轴比。
     * 实测 0.90；挪到脸前 0.1 厘米这个数就过 1.1，标注也会跟着指错地方。
     */
    for (const m of pupils) {
      const c = new THREE.Box3().setFromObject(m).getCenter(new THREE.Vector3())
      const rel = Math.min(
        ...eyeDomes(nymph).map((dome) => {
          const b = new THREE.Box3().setFromObject(dome)
          const half = b.getSize(new THREE.Vector3()).divideScalar(2)
          return c.distanceTo(b.getCenter(new THREE.Vector3())) / Math.max(half.x, half.y, half.z)
        }),
      )
      expect(rel, '伪瞳孔离开了眼球，浮在脸前').toBeLessThan(1.1)
    }
  })

  it('腹部比胸细、末端上翘、尾端收细成尖', () => {
    const as = abdBox.getSize(new THREE.Vector3())
    const ts = sizeOf(thorax)
    const rel = as.z / ts.z
    expect(rel, '腹部比胸还宽，那是成虫（尤其抱卵的雌虫）的体型').toBeLessThan(0.9)
    expect(rel, '腹部细成一根线了').toBeGreaterThan(0.5)

    // 上翘：中轴末端明显高于起点，而且中间是先沉后翘的一条弧
    const axis = centerline(abd[0], 22)
    const first = axis[0]
    const last = axis[axis.length - 1]
    expect(last.y - first.y, '腹端没有上翘').toBeGreaterThan(0.15)
    expect(Math.min(...axis.map((v) => v.y)), '腹部是直着斜上去的，不是先沉后翘的弧').toBeLessThan(first.y - 0.005)

    // 尾端收细：只做包络时放样封口会封出一个正圆平面，读成「一截锯断的塑料管」
    const verts = vertsOf(abd)
    const xMin = Math.min(...verts.map((v) => v.x))
    const maxR = Math.max(...verts.map((v) => Math.abs(v.z)))
    const tailR = Math.max(...verts.filter((v) => v.x <= xMin + as.x * 0.02).map((v) => Math.abs(v.z)))
    expect(tailR / maxR, '尾端必须收细成尖').toBeLessThan(0.3)
  })

  it('体型确实是缩小版成虫：头在最前、腹在最后、前胸拉成一根长杆', () => {
    expect(boxOf(head).getCenter(new THREE.Vector3()).x).toBeGreaterThan(boxOf(prothorax).getCenter(new THREE.Vector3()).x)
    expect(boxOf(prothorax).getCenter(new THREE.Vector3()).x).toBeGreaterThan(boxOf(thorax).getCenter(new THREE.Vector3()).x)
    expect(boxOf(thorax).getCenter(new THREE.Vector3()).x).toBeGreaterThan(abdBox.getCenter(new THREE.Vector3()).x)

    // 拉长的前胸是螳螂的招牌（图鉴 `mantis-prothorax` 讲的就是它）。
    // 若虫的相对更短（那根「脖子」随龄期一次次拉长），但仍占体长四分之一以上
    const pl = sizeOf(prothorax).x / bodyLength
    expect(pl, '前胸短得不像螳螂了').toBeGreaterThan(0.24)
    expect(pl, '前胸比成虫还长，若虫的比例就反了').toBeLessThan(0.36)
    expect(sizeOf(prothorax).x / sizeOf(thorax).x, '前胸必须明显长于中后胸').toBeGreaterThan(1.5)

    // 斜举的体态：头明显高过腹部。少了这个仰角只会读成一根横躺的绿枝
    expect(boxOf(head).getCenter(new THREE.Vector3()).y - abdBox.getCenter(new THREE.Vector3()).y).toBeGreaterThan(0.4)
  })

  it('通体草绿，招牌的三处都从绿底上跳出来', () => {
    const body = hslByName(nymph, 'head')
    expect(body.h, '体色的色相要落在绿区').toBeGreaterThan(60)
    expect(body.h).toBeLessThan(140)
    expect(body.s, '饱和度掉了就成了一只灰虫').toBeGreaterThan(0.25)
    expect(body.l, '压深一档不是压成墨绿').toBeGreaterThan(0.42)
    expect(body.l).toBeLessThan(0.68)

    const spine = hslByName(nymph, 'fore-spine')
    const femur = hslByName(nymph, 'fore-femur')
    expect(spine.l, '刺列要真的接近白').toBeGreaterThan(0.8)
    expect(spine.l - femur.l, '刺列与腿节的明度差 —— 差没了，那排刺就在画面上消失了').toBeGreaterThan(0.3)
  })
})
