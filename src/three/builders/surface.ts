/**
 * 程序化表面微观贴图 —— 材质层的「显微镜下那一层」
 *
 * 真实甲虫的外骨骼在微距下从不均匀：鞘翅有纵沟（striae）与刻点
 * （punctures），体表有细颗粒的粗糙度起伏。「整片均匀的高光」正是
 * 程序生成感的最大来源，本模块负责把高光打碎。
 *
 * 三条设计原则（改动前先读）：
 *
 * 1. **零贴图文件**。全部贴图运行时用 Canvas 2D 现画（CanvasTexture），
 *    仓库里一张图片都没有——这是本项目的护城河，别往 public/ 塞贴图。
 *    噪声与格点全部走种子化 PRNG，同参数在任何机器上生成同一张图。
 *
 * 2. **node（vitest）环境没有 Canvas 2D**。每个生成器入口先查
 *    `typeof document`，node 下一律返回 null；材质函数拿到 null 就跳过
 *    贴图，几何与材质参数逻辑照常可测。这条守卫放在缓存查询**之前**，
 *    保证 node 下的行为与缓存内容无关（测试里 mock 过 document 也不会
 *    让后续 node 调用捡到缓存里的假纹理）。
 *
 * 3. **按参数键全局缓存，共享贴图永不 dispose——这是设计，不是泄漏**。
 *    同一预设的贴图全体物种共享同一份 THREE.Texture。registry.ts 的
 *    LRU 逐出会对材质调用 material.dispose()，而 three 的
 *    material.dispose() 不会连带 dispose 它引用的纹理——正合我们的意：
 *    纹理是跨物种的全局缓存，不随任何单个物种材质的生命周期走。
 *    总量固定为「每种参数组合一份」（256²/512² 各几张，合计 <8MB
 *    显存），不随物种数增长，也就不需要逐出。
 */
import * as THREE from 'three'

// ---------------------------------------------------------------- 验收旋钮
// 目视验收时的调节旋钮全部集中在此。数值哲学：默认档要**轻**——
// 只消掉「塑料手办感」，不改变各物种已逐只验收过的固有色与光泽档位。

/**
 * 默认微颗粒粗糙度图的起伏幅度（0~1）。挂在所有未指定 surface 的
 * chitin() 上，是「消塑料感」的总闸门：像素值取 1 − 幅度×噪声，
 * 均值 ≈ 1 − 幅度/2（乘法图，1 = 完全不改材质自身粗糙度）。
 * 观感应只在侧光的高光边缘里察觉得到，正视几乎不可见。
 * 目视验收时的调节旋钮：还嫌塑料 → 往 0.18 提；发闷起砂 → 往 0.08 压。
 */
export const MICRO_ROUGHNESS_VARIATION = 0.12
/** 微颗粒噪声基础格数（越大颗粒越细；三个倍频程为 1×/2×/4×） */
const MICRO_BASE_CELLS = 48

/** 刻点默认密度（整张贴图上的坑数）与坑半径（UV 比例，0~1） */
const PUNCTATE_DENSITY = 260
const PUNCTATE_SIZE = 0.016
/** 刻点坑深（高度场振幅 0~1）与法线强度（Sobel 梯度放大倍数） */
const PUNCTATE_PIT_DEPTH = 0.6
const PUNCTATE_NORMAL_STRENGTH = 2.2
/** 刻点粗糙度图：坑外基面的抛光量（乘法图向下偏离 1 的幅度），坑内拉满到 1（更糙） */
const PUNCTATE_FIELD_POLISH = 0.1

/** 纵沟默认条数（沿 u 一整圈的沟数，loft 的 u 环绕整个截面）与法线强度 */
const STRIATE_COUNT = 9
const STRIATE_DEPTH = 1.5
/** 沟槽半宽（占半个周期的比例）与沟间隆起的高度（真实鞘翅沟间区微凸） */
const STRIATE_GROOVE_HALFWIDTH = 0.3
const STRIATE_INTERVAL_DOME = 0.16
/** 沟纹沿体轴的微小摆动幅度（u 方向偏移量），破掉激光刻般的死直线 */
const STRIATE_WOBBLE = 0.006
/** 纵沟粗糙度图：沟间基面的抛光量，沟底拉满到 1 */
const STRIATE_FIELD_POLISH = 0.08

/** 贴图边长：微观细节 256 够用，刻点特征更小更密，给到 512 */
const MICRO_TEX_SIZE = 256
const STRIATE_TEX_SIZE = 256
const PUNCTATE_TEX_SIZE = 512

/** 各向异性过滤：掠射角看鞘翅时沟纹不糊 */
const TEX_ANISOTROPY = 4

// ---------------------------------------------------------------- 缓存

export interface SurfaceMapSet {
  /** 切线空间法线图（OpenGL 约定，Y+ 朝上） */
  normal: THREE.CanvasTexture
  /** 配套粗糙度图（灰度乘法图；three 实际采样绿通道） */
  roughness: THREE.CanvasTexture
}

/** 同参数的贴图全体物种共享一份；node 下生成失败（null）不入缓存 */
const cache = new Map<string, THREE.CanvasTexture | SurfaceMapSet>()

function cached<T extends THREE.CanvasTexture | SurfaceMapSet>(key: string, make: () => T | null): T | null {
  const hit = cache.get(key)
  if (hit !== undefined) return hit as T
  const made = make()
  if (made !== null) cache.set(key, made)
  return made
}

// ---------------------------------------------------------------- 基础设施

/** mulberry32：够快够散的种子化 PRNG——贴图必须可复现，不用 Math.random */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** FNV-1a：把参数键变成 PRNG 种子，不同预设图案彼此无关 */
function hashSeed(key: string): number {
  let h = 2166136261
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

function smooth01(t: number): number {
  return t * t * (3 - 2 * t)
}

/**
 * 周期化 value noise：cells×cells 随机格点 + smoothstep 双线性插值。
 * 格点索引按模运算回绕，所以整张图天然无缝平铺（RepeatWrapping 不露缝）。
 */
function valueNoiseField(size: number, cells: number, rng: () => number): Float32Array {
  const n = Math.max(2, Math.min(size, Math.round(cells)))
  const lattice = new Float32Array(n * n)
  for (let i = 0; i < lattice.length; i++) lattice[i] = rng()
  const out = new Float32Array(size * size)
  for (let y = 0; y < size; y++) {
    const gy = (y / size) * n
    const y0 = Math.floor(gy) % n
    const y1 = (y0 + 1) % n
    const fy = smooth01(gy - Math.floor(gy))
    for (let x = 0; x < size; x++) {
      const gx = (x / size) * n
      const x0 = Math.floor(gx) % n
      const x1 = (x0 + 1) % n
      const fx = smooth01(gx - Math.floor(gx))
      const v00 = lattice[y0 * n + x0]
      const v10 = lattice[y0 * n + x1]
      const v01 = lattice[y1 * n + x0]
      const v11 = lattice[y1 * n + x1]
      const top = v00 + (v10 - v00) * fx
      const bot = v01 + (v11 - v01) * fx
      out[y * size + x] = top + (bot - top) * fy
    }
  }
  return out
}

/** 一维周期噪声（长度 size，按 cells 个格点插值），给沟纹做沿体轴的摆动 */
function periodicNoise1D(size: number, cells: number, rng: () => number): Float32Array {
  const n = Math.max(2, cells)
  const lattice = new Float32Array(n)
  for (let i = 0; i < n; i++) lattice[i] = rng()
  const out = new Float32Array(size)
  for (let y = 0; y < size; y++) {
    const g = (y / size) * n
    const i0 = Math.floor(g) % n
    const i1 = (i0 + 1) % n
    const f = smooth01(g - Math.floor(g))
    out[y] = lattice[i0] + (lattice[i1] - lattice[i0]) * f
  }
  return out
}

interface CanvasTarget {
  canvas: HTMLCanvasElement
  ctx: CanvasRenderingContext2D
}

/**
 * node（vitest）没有 DOM：返回 null，调用方直接放弃这张贴图。
 * jsdom 装了但没装 canvas 包时 getContext 返回 null，同样降级。
 */
function makeCanvas(size: number): CanvasTarget | null {
  if (typeof document === 'undefined') return null
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  if (!ctx) return null
  return { canvas, ctx }
}

/** 统一收尾：平铺 + 各向异性。法线/粗糙度是数据图，保持线性色彩空间（默认即是） */
function toTexture(canvas: HTMLCanvasElement): THREE.CanvasTexture {
  const t = new THREE.CanvasTexture(canvas)
  t.wrapS = THREE.RepeatWrapping
  t.wrapT = THREE.RepeatWrapping
  t.anisotropy = TEX_ANISOTROPY
  return t
}

/** 灰度值场 → ImageData（r=g=b；three 的 roughnessMap 采样绿通道，灰度天然兼容） */
function grayImage(ctx: CanvasRenderingContext2D, values: Float32Array, size: number): ImageData {
  const img = ctx.createImageData(size, size)
  const d = img.data
  for (let i = 0; i < values.length; i++) {
    const v = Math.round(Math.min(1, Math.max(0, values[i])) * 255)
    const o = i * 4
    d[o] = v
    d[o + 1] = v
    d[o + 2] = v
    d[o + 3] = 255
  }
  return img
}

/**
 * 高度场 → 切线空间法线图，Sobel 算子求导，索引回绕保证平铺无缝。
 *
 * 符号约定：CanvasTexture 默认 flipY，画布 y 向下、贴图 v 向上，
 * 所以 ∂h/∂v = −∂h/∂y(画布)，法线 = normalize(−s·∂h/∂u, +s·∂h/∂y, 1)。
 * 若目视验收发现「坑看着像鼓包」，翻这里 ny 的符号即可（一行旋钮）。
 */
function heightToNormalImage(
  ctx: CanvasRenderingContext2D,
  height: Float32Array,
  size: number,
  strength: number,
): ImageData {
  const img = ctx.createImageData(size, size)
  const d = img.data
  const at = (x: number, y: number) => height[(((y % size) + size) % size) * size + (((x % size) + size) % size)]
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx =
        (at(x + 1, y - 1) + 2 * at(x + 1, y) + at(x + 1, y + 1) - at(x - 1, y - 1) - 2 * at(x - 1, y) - at(x - 1, y + 1)) / 8
      const dy =
        (at(x - 1, y + 1) + 2 * at(x, y + 1) + at(x + 1, y + 1) - at(x - 1, y - 1) - 2 * at(x, y - 1) - at(x + 1, y - 1)) / 8
      const nx = -strength * dx
      const ny = strength * dy
      const inv = 1 / Math.hypot(nx, ny, 1)
      const o = (y * size + x) * 4
      d[o] = Math.round((nx * inv * 0.5 + 0.5) * 255)
      d[o + 1] = Math.round((ny * inv * 0.5 + 0.5) * 255)
      d[o + 2] = Math.round((inv * 0.5 + 0.5) * 255)
      d[o + 3] = 255
    }
  }
  return img
}

// ---------------------------------------------------------------- 生成器

/**
 * 细颗粒噪声粗糙度图：三个倍频程的周期 value noise，值域
 * [1 − MICRO_ROUGHNESS_VARIATION, 1]（乘法图，只把高光打碎，不整体变糙）。
 * @param scale 颗粒频率倍数，>1 更细。默认 1。
 * @returns node 下返回 null（无 Canvas 2D），材质层跳过即可。
 */
export function microRoughnessMap(scale = 1): THREE.CanvasTexture | null {
  if (typeof document === 'undefined') return null
  const s = Math.max(0.25, scale)
  return cached(`micro:${s}`, () => {
    const target = makeCanvas(MICRO_TEX_SIZE)
    if (!target) return null
    const { canvas, ctx } = target
    const rng = mulberry32(hashSeed(`micro:${s}`))
    const size = MICRO_TEX_SIZE
    const o1 = valueNoiseField(size, MICRO_BASE_CELLS * s, rng)
    const o2 = valueNoiseField(size, MICRO_BASE_CELLS * 2 * s, rng)
    const o3 = valueNoiseField(size, MICRO_BASE_CELLS * 4 * s, rng)
    const values = new Float32Array(size * size)
    for (let i = 0; i < values.length; i++) {
      const n = 0.45 * o1[i] + 0.3 * o2[i] + 0.25 * o3[i]
      values[i] = 1 - MICRO_ROUGHNESS_VARIATION * n
    }
    ctx.putImageData(grayImage(ctx, values, size), 0, 0)
    return toTexture(canvas)
  })
}

/**
 * 刻点（punctures）：随机圆坑高度场 → 法线图 + 配套粗糙度图（坑内更糙）。
 * 甲虫头部、前胸背板与许多鞘翅的标志性微结构。
 * @param density 整张贴图上的坑数。默认 260。
 * @param size    坑半径（UV 比例）。默认 0.016。
 * @returns node 下返回 null。
 */
export function punctateMaps(density = PUNCTATE_DENSITY, size = PUNCTATE_SIZE): SurfaceMapSet | null {
  if (typeof document === 'undefined') return null
  const count = Math.max(0, Math.round(density))
  return cached(`punctate:${count}:${size}`, () => {
    const normalTarget = makeCanvas(PUNCTATE_TEX_SIZE)
    const roughTarget = makeCanvas(PUNCTATE_TEX_SIZE)
    if (!normalTarget || !roughTarget) return null
    const S = PUNCTATE_TEX_SIZE
    const rng = mulberry32(hashSeed(`punctate:${count}:${size}`))
    const baseR = Math.max(1.5, size * S)

    // 高度场：从 1 起挖坑。余弦碗形剖面；重叠处取 min 而不是连挖，避免冲成尖谷
    const H = new Float32Array(S * S).fill(1)
    for (let p = 0; p < count; p++) {
      const cx = rng() * S
      const cy = rng() * S
      const r = baseR * (0.7 + 0.6 * rng()) // 坑径抖动：真实刻点大小不一
      const reach = Math.ceil(r) + 1
      for (let iy = Math.floor(cy) - reach; iy <= Math.floor(cy) + reach; iy++) {
        for (let ix = Math.floor(cx) - reach; ix <= Math.floor(cx) + reach; ix++) {
          const dist = Math.hypot(ix - cx, iy - cy)
          if (dist >= r) continue
          const bowl = 0.5 + 0.5 * Math.cos((Math.PI * dist) / r) // 1@坑心 → 0@坑缘
          const idx = (((iy % S) + S) % S) * S + (((ix % S) + S) % S) // 回绕：平铺无缝
          H[idx] = Math.min(H[idx], 1 - PUNCTATE_PIT_DEPTH * bowl)
        }
      }
    }

    // 粗糙度：坑外 = 微噪声抛光基面（略亮泽），坑内按深度拉向 1（更糙、吃掉高光）
    const micro = valueNoiseField(S, MICRO_BASE_CELLS * 2, rng)
    const rough = new Float32Array(S * S)
    for (let i = 0; i < rough.length; i++) {
      const pitMask = Math.min(1, (1 - H[i]) / PUNCTATE_PIT_DEPTH)
      const base = 1 - PUNCTATE_FIELD_POLISH * micro[i]
      rough[i] = base + (1 - base) * pitMask
    }

    normalTarget.ctx.putImageData(heightToNormalImage(normalTarget.ctx, H, S, PUNCTATE_NORMAL_STRENGTH), 0, 0)
    roughTarget.ctx.putImageData(grayImage(roughTarget.ctx, rough, S), 0, 0)
    return { normal: toTexture(normalTarget.canvas), roughness: toTexture(roughTarget.canvas) }
  })
}

/**
 * 纵沟纹（striae）：沿 v 方向延伸、沿 u 方向排布的平行沟槽 → 法线图 +
 * 配套粗糙度图。loft 的 u 环绕截面一圈、v 沿体轴，所以这组沟槽在鞘翅上
 * 正好是纵向沟。沟间区按真实鞘翅微微隆起，沟线带极小摆动避免死直。
 * @param count 沿 u 一整圈的沟数（取整保证平铺无缝）。默认 9。
 * @param depth 法线强度（Sobel 梯度放大倍数）。默认 1.5。
 * @returns node 下返回 null。
 */
export function striateMaps(count = STRIATE_COUNT, depth = STRIATE_DEPTH): SurfaceMapSet | null {
  if (typeof document === 'undefined') return null
  const n = Math.max(1, Math.round(count))
  return cached(`striate:${n}:${depth}`, () => {
    const normalTarget = makeCanvas(STRIATE_TEX_SIZE)
    const roughTarget = makeCanvas(STRIATE_TEX_SIZE)
    if (!normalTarget || !roughTarget) return null
    const S = STRIATE_TEX_SIZE
    const rng = mulberry32(hashSeed(`striate:${n}:${depth}`))
    const wobble = periodicNoise1D(S, 5, rng)

    const H = new Float32Array(S * S)
    const notch = new Float32Array(S * S)
    for (let y = 0; y < S; y++) {
      const du = (wobble[y] - 0.5) * 2 * STRIATE_WOBBLE
      for (let x = 0; x < S; x++) {
        const phase = (x / S + du) * n
        const frac = phase - Math.floor(phase)
        const dn = Math.min(frac, 1 - frac) * 2 // 0@沟心 → 1@沟间区中央
        const g = dn < STRIATE_GROOVE_HALFWIDTH ? 0.5 + 0.5 * Math.cos((Math.PI * dn) / STRIATE_GROOVE_HALFWIDTH) : 0
        const dome = 0.5 - 0.5 * Math.cos(Math.PI * dn) // 沟间区平缓隆起
        const i = y * S + x
        notch[i] = g
        H[i] = 0.5 + STRIATE_INTERVAL_DOME * dome - 0.5 * g
      }
    }

    const micro = valueNoiseField(S, MICRO_BASE_CELLS, rng)
    const rough = new Float32Array(S * S)
    for (let i = 0; i < rough.length; i++) {
      const base = 1 - STRIATE_FIELD_POLISH * micro[i]
      rough[i] = base + (1 - base) * notch[i] * 0.9
    }

    normalTarget.ctx.putImageData(heightToNormalImage(normalTarget.ctx, H, S, depth), 0, 0)
    roughTarget.ctx.putImageData(grayImage(roughTarget.ctx, rough, S), 0, 0)
    return { normal: toTexture(normalTarget.canvas), roughness: toTexture(roughTarget.canvas) }
  })
}
