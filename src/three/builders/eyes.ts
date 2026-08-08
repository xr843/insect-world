/**
 * 复眼「小眼面」（六边形蜂窝）材质模块 —— 独立于 kit.ts。
 *
 * kit.ts 的 compoundEye() 目前只是一层光滑的 MeshPhysicalMaterial 球体，
 * 复眼是昆虫辨识度最高的器官，也是玩家凑近观察的第一焦点，缺一层「密排
 * 小眼面」的表面细节会很明显。本模块用程序生成的法线贴图补上这层细节，
 * 产出可以直接换掉 compoundEye() 里手写材质的 facetedEyeMaterial()。
 *
 * 刻意自包含：不 import kit.ts 的任何导出，也不修改它——接入 compoundEye()
 * 是主线的活，这里只负责把材质做对、做好测试。
 */
import * as THREE from 'three'

const SIZE = 512

// ---------------------------------------------------------------- 六边形高度场（纯数值，无 canvas 依赖）

/**
 * 六边形蜂窝高度场：小眼面中心微凸（趋近 1），格间棱线微凹（略小于 0），
 * 纯数值实现、不依赖 canvas，可在 node 下直接单测。
 *
 * 原理：把小眼面中心排成等边三角格（间距 a），其 Voronoi 图恰好就是正
 * 六边形网格——不用手写六边形 SDF，只要「找最近的格点、算距离」即可
 * 稳妥地得到六边形分区，不必担心六边形公式本身的边界情形写错。
 *
 * @param width  贴图宽（像素）
 * @param height 贴图高（像素）
 * @param cells  横向小眼数，内部会 clamp 到 >=3 并取整
 */
export function facetHeightField(width: number, height: number, cells: number): Float32Array {
  const cols = Math.max(3, Math.round(cells))
  const a = width / cols // 同行相邻小眼面间距；cols 整除 width，水平方向精确无缝
  const idealRowSpacing = (a * Math.sqrt(3)) / 2
  // 强制偶数行数：隔行错位（三角格）的奇偶模式在纵向 wrap 回第 0 行时才能对上，
  // 否则贴图上下拼接处蜂窝会错位出一条接缝。
  const rows = Math.max(4, Math.round(height / idealRowSpacing / 2) * 2)
  const rowSpacing = height / rows // rows 整除 height，纵向方向也精确无缝
  const apothem = a / 2 // 三角格 Voronoi = 正六边形，内切半径（中心到边中点）= 格距一半

  const out = new Float32Array(width * height)
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      out[y * width + x] = facetHeightAt(x + 0.5, y + 0.5, a, apothem, rowSpacing, rows)
    }
  }
  return out
}

/** 单像素高度：找三角格里最近的小眼面中心，按到它的距离算凸起/凹槽 */
function facetHeightAt(px: number, py: number, a: number, apothem: number, rowSpacing: number, rows: number): number {
  const rowGuess = Math.floor(py / rowSpacing)
  let best = Infinity
  // 三角格的 6 个最近邻分布在上下相邻行 + 本行左右，查 3 行 × 每行 3 列足够覆盖
  for (let dr = -1; dr <= 1; dr++) {
    const r = rowGuess + dr
    // 用 wrap 后的行号取奇偶，决定这一行是否整体右移半格（三角格错位）；
    // r 本身可以越界（负数/超过 rows），centerY 故意不 wrap，
    // 这样贴图边缘像素也能「看见」wrap 到对侧的格点，天然无缝。
    const parity = (((r % rows) + rows) % rows) % 2
    const offsetX = parity === 1 ? a / 2 : 0
    const centerY = (r + 0.5) * rowSpacing
    const colGuess = Math.round((px - offsetX) / a)
    for (let dc = -1; dc <= 1; dc++) {
      const centerX = (colGuess + dc) * a + offsetX
      const dx = px - centerX
      const dy = py - centerY
      const d = Math.hypot(dx, dy)
      if (d < best) best = d
    }
  }
  return facetBumpProfile(best / apothem)
}

/**
 * u=0 在小眼面正中心，u=1 恰好在格间棱线（六边形边中点）上。
 * 中心凸起（bump，1→0），紧贴棱线处叠一圈浅凹槽（groove，制造「细缝」感），
 * 六边形角点处 u 略大于 1（三角格外接/内切半径之比 2/√3），凹槽随之变浅——
 * 读出来是深浅有致的缝网，而不是刻板的等宽线条。
 */
function facetBumpProfile(u: number): number {
  const bump = Math.max(0, 1 - u * u)
  const grooveWidth = 0.22
  const grooveDepth = 0.18
  const groove = Math.exp(-(((u - 1) / grooveWidth) ** 2)) * grooveDepth
  return bump - groove
}

// ---------------------------------------------------------------- 高度场 → 法线贴图（需要 canvas）

/** Sobel 算子把高度场转成切线空间法线，环绕采样保证贴图边缘也能无缝平铺 */
function paintNormalMap(ctx: CanvasRenderingContext2D, size: number, cells: number): void {
  const heights = facetHeightField(size, size, cells)
  const img = ctx.createImageData(size, size)
  const data = img.data
  const strength = 2.2 // 法线强度：贴图本身已经很密，太大在小尺寸复眼上会闪摩尔纹

  const at = (x: number, y: number): number => {
    const wx = ((x % size) + size) % size
    const wy = ((y % size) + size) % size
    return heights[wy * size + wx]
  }

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const gx = at(x + 1, y - 1) - at(x - 1, y - 1) + 2 * (at(x + 1, y) - at(x - 1, y)) + at(x + 1, y + 1) - at(x - 1, y + 1)
      const gy = at(x - 1, y + 1) - at(x - 1, y - 1) + 2 * (at(x, y + 1) - at(x, y - 1)) + at(x + 1, y + 1) - at(x + 1, y - 1)

      const nx = -gx * strength
      const ny = -gy * strength
      const nz = 1
      const len = Math.hypot(nx, ny, nz)

      const i = (y * size + x) * 4
      data[i] = ((nx / len) * 0.5 + 0.5) * 255
      data[i + 1] = ((ny / len) * 0.5 + 0.5) * 255
      data[i + 2] = ((nz / len) * 0.5 + 0.5) * 255
      data[i + 3] = 255
    }
  }
  ctx.putImageData(img, 0, 0)
}

/**
 * 全局缓存：同一个 cells 取值只画一次 canvas、只建一份 CanvasTexture，
 * 此后全局共享同一实例。
 *
 * ⚠️ 故意永不 dispose —— 这是设计，不是遗漏。复眼贴图很小（512×512，
 * 全项目实际只会出现个位数种 cells 取值），多个物种、多次调用复用同一份
 * GPU 纹理，比反复生成/上传/丢弃划算得多。如果未来要支持运行期动态换贴图
 * 或按物种整份卸载资源，这里需要改成引用计数，不能直接加 dispose。
 */
const _normalMapCache = new Map<number, THREE.Texture>()

/**
 * 程序生成六边形蜂窝法线贴图：每个小眼面中心微凸、格间细缝微凹。
 *
 * @param cells 横向小眼数，默认 24——在球面复眼上看起来是致密蜂窝而不是
 *              足球（数字太小会读成多面体棱角，太大在贴图分辨率下糊成噪点）。
 * @returns CanvasTexture；node 环境（没有 canvas 2d）下返回 null。
 *
 * ⚠️⚠️ vitest 跑在 node，没有 canvas 2d：下面这行守卫不能丢、不能改条件。
 * 丢了这条，全项目 2307 个测试会在任何 import 到这个模块的地方（包括未来
 * kit.ts 接入后的物种测试）因 document/canvas 不存在而当场报错。
 */
export function facetNormalMap(cells = 24): THREE.Texture | null {
  if (typeof document === 'undefined') return null

  const key = Math.max(3, Math.round(cells)) // 和 facetHeightField 内部的 clamp 取整口径保持一致，缓存键才对得上实际画出来的内容
  const cached = _normalMapCache.get(key)
  if (cached) return cached

  const canvas = document.createElement('canvas')
  canvas.width = SIZE
  canvas.height = SIZE
  const ctx = canvas.getContext('2d')
  if (!ctx) return null // 极端环境下拿不到 2d context：退化成「没有蜂窝」而不是抛错

  paintNormalMap(ctx, SIZE, key)

  const tex = new THREE.CanvasTexture(canvas)
  tex.wrapS = THREE.RepeatWrapping
  tex.wrapT = THREE.RepeatWrapping
  tex.anisotropy = 4
  tex.needsUpdate = true

  _normalMapCache.set(key, tex)
  return tex
}

// ---------------------------------------------------------------- 复眼材质

export interface FacetedEyeOptions {
  /** 法线贴图横向小眼数，直接透传给 facetNormalMap。默认 24 */
  cells?: number
  /** 「湿润角膜」清漆层。false = 收敛成蛾类绒面复眼的哑光质感。默认 true */
  wet?: boolean
}

/**
 * 六边形小眼面复眼材质。在 kit.ts compoundEye() 的暗色 physical 材质路数上
 * 延伸：多一层法线贴图撑出的小眼面凹凸，以及可关闭的「湿润角膜」清漆层。
 */
export function facetedEyeMaterial(color: string, opts: FacetedEyeOptions = {}): THREE.MeshPhysicalMaterial {
  const wet = opts.wet ?? true
  const cells = opts.cells ?? 24

  /**
   * 基色压深一档：ACES 色调映射会把受光面大幅提亮去饱和——kit.ts 和几乎
   * 每个物种文件都踩过这条（例如 burying-beetle.ts 的橙红警戒带，「想要
   * #d1521f」实测要压到 #a83208 才在渲染里读成橙红：HSL 亮度差约 -0.125、
   * 饱和度差约 +0.17）。那些文件是给固定色标定的一次性手工挑值；这里
   * color 是调用方运行时传入的任意值，没法逐个手挑，改用同方向的
   * offsetHSL 兜底：调低亮度、略调高饱和度防止被清漆高光冲淡。
   */
  const base = new THREE.Color(color).offsetHSL(0, 0.06, -0.12)

  const normalMap = facetNormalMap(cells)

  const m = new THREE.MeshPhysicalMaterial({
    color: base,
    // roughness/metalness 贴着 kit.compoundEye()（0.12 / 0.1）的观感，不跑风格；
    // wet:false 时整体收敛成蛾类绒面复眼——不止清漆，底材质本身也更哑光。
    roughness: wet ? 0.14 : 0.55,
    metalness: wet ? 0.1 : 0.03,
    clearcoat: wet ? 0.9 : 0.15,
    clearcoatRoughness: wet ? 0.12 : 0.6,
  })

  if (normalMap) {
    m.normalMap = normalMap
    m.normalScale = new THREE.Vector2(0.6, 0.6) // 适中：贴图本身密度已经很高，强度不用再加
  }
  // normalMap 为 null（node 环境，或极端情况下 canvas 2d 不可用）时，
  // 材质仍是合法的 MeshPhysicalMaterial，只是没有小眼面凹凸——不抛错，
  // 调用方（含未来接入 kit.ts 的主线）不需要对返回值做 null 检查。

  return m
}
