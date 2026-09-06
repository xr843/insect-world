/**
 * 七星瓢虫 · 卵 Coccinella septempunctata（完全变态第 1 阶段）
 *
 * 单位与坐标系与成虫（../ladybird.ts）完全一致：1 = 1 厘米真实体长，
 * +X 向前、+Y 向上、+Z 向右。卵直立于叶面，长轴沿 +Y。
 *
 * ## 招牌不是「一粒卵」，是「一片竖着的卵」
 *
 * 一粒 1 毫米的黄椭球，是任何一种昆虫的卵 —— 也可以是一粒小米、一颗花粉。
 * 七星瓢虫的卵之所以在野外一眼认得出，靠的是**产卵方式**：雌虫在蚜虫群附近的
 * 叶面上，一次产 10~50 枚，**枚枚竖立、紧挨成一小片**，像一小撮插在叶子上的
 * 黄色小蜡烛。所以本文件做的是一簇 19 枚，不是一枚 —— 做一枚等于把这个阶段
 * 唯一认得出的东西丢掉了。
 *
 * 这同时解决了另一个问题：`stages.test.ts` 要求 `model.radius` 落在 0.02~12。
 * 单枚卵（半径 0.055）贴着下限，而一簇卵连基座叶面在一起是 0.33 上下，
 * 取景舒服得多。
 *
 * ## 形态依据
 *
 * - **单枚长约 1.1 毫米**（模型 0.11），最宽处直径约 0.52 毫米（半径 0.026）。
 *   纺锤形／长椭圆：两端圆钝、最宽处略偏下、向顶端缓缓收细。
 *   ⚠️ 尺度按真实比例做，不许为了「好看」放大 —— 卵 1 毫米、幼虫 1 厘米、
 *   成虫 0.7 厘米，这个量级差本身就是生活史要讲的内容（`stages.ts` 顶部的硬约定）。
 * - **鲜黄至橙黄**（`#f5b81c`，hue 43°、S 0.92、L 0.54）。刚产下时是浅黄，
 *   一两天后转橙黄，将孵化时透出幼虫的深色。本模型取橙黄这一档 ——
 *   它是三个阶段里唯一的高饱和暖色，与幼虫的石板蓝黑正好构成生活史的色彩对照。
 *   ⚠️ 不往深里压。本仓库栽过一次大跟头：ACES 会提亮去饱和，于是有了「颜色压深
 *   一档」的经验，但它被误解成「越深越保险」之后，10 只里 7 只的招牌图案在画面上
 *   直接消失。这里的黄对齐 `ladybird.ts` 的 `#e2382a`（L 0.53）那一档明度。
 * - **表面极细的纵向脊纹**：每枚 9 条，自基部走到近顶端。真实瓢虫卵的壳面有
 *   细密的纵向网脊，正是「不是塑料珠子」的那点质感。脊只比壳面高出 0.003
 *   （壳半径的 11%）—— 再高就成了一圈刺，那是另一类东西。
 * - **竖立黏在叶面上**：卵基有一小片胶质，本模型让卵基埋进叶面 0.004，
 *   免得卵与叶之间露出一条缝（悬空的卵一眼就假）。
 * - **微微外倾**：真实的一簇卵不是尺子量出来的立正队列，边缘几枚略向外歪。
 *   倾角 2°~10°，方向偏向背离簇心 —— 一排绝对垂直的圆柱读起来像 3D 软件的
 *   阵列复制，那正是要避开的东西。
 *
 * ## 基座
 *
 * 一小片叶。它有两个作用：一是「这是长在叶子上的东西」这个语境，二是尺度参照。
 * 尺寸按帝王蝶那颗卵的教训压住 —— 基座一大，取景被它撑开，卵反而缩成一个点。
 * 这里叶片 0.66 × 0.42，卵簇跨度 0.34，卵簇占画面宽度约 45%，是主角。
 * 不做中脉：中脉沿 X 走，而验收机位里有两个是沿 X 看过去的，一条脊在那两个
 * 机位下缩成紧挨卵基的一道深色短楔，读起来像叶面上的裂痕（帝王蝶卵的原话）。
 *
 * 真实的瓢虫多把卵产在叶**背**，本模型仍让卵朝上立在叶面上：倒挂的一簇卵在
 * 任何机位下都只能看见叶片的背面，等于把主角挡掉。这是为可见性做的取舍，
 * 不是形态错误。
 */
import * as THREE from 'three'
import { chitin, finalize, loft, type InsectModel, type Section } from '../kit'

// ---------------------------------------------------------------- 尺度

/** 单枚卵的高：真实 1.1 毫米 */
const EGG_HEIGHT = 0.11
/** 单枚卵最宽处的半径：真实直径约 0.52 毫米 */
const EGG_R = 0.026
/** 每枚卵的纵脊条数 */
const RIDGE_COUNT = 9
/** 脊冠高出壳面的量：壳半径的 11%。读得出「有棱」，又不至于长成一圈刺 */
const RIDGE_RISE = 0.003
/** 卵基埋进叶面的深度（胶质黏着处），免得卵与叶之间露出一条缝 */
const EMBED = 0.004

/**
 * 簇的排布：五行六角密排，行内卵数 3-4-5-4-3 = 19 枚（真实一次产 10~50 枚）。
 *
 * 行距取 PITCH×0.866（正六角密排的行距），于是相邻卵的中心距在行内与跨行
 * 上一致，都是 PITCH。PITCH 0.068 减去卵径 0.052 = 0.016 的间隙 ——
 * **紧挨着**，这是这一簇的关键。撒开就成了「掉在叶子上的几粒小米」。
 */
const ROWS: readonly (readonly [number, number])[] = [
  // [该行卵数, 该行的 z]
  [3, -0.118],
  [4, -0.059],
  [5, 0.0],
  [4, 0.059],
  [3, 0.118],
]
const PITCH = 0.068

/** 基座叶片的半长与半宽。压到与卵簇同量级，取景才不会被叶片撑开 */
const LEAF_HALF_LEN = 0.33
const LEAF_HALF_WIDE = 0.21

// ---------------------------------------------------------------- 颜色

/**
 * 卵壳：鲜黄偏橙。高饱和的暖黄是这个阶段唯一的信息，压深一档就成了土黄疙瘩。
 * 明度 0.54，与 `ladybird.ts` 的朱红 `#e2382a`（0.53）同档。
 */
const EGG_COLOR = '#f5b81c'
/** 脊冠：比壳面亮一档。真实的脊是受光的凸起，压成同色等于白做了几何 */
const RIDGE_COLOR = '#ffd968'
/** 叶片：与帝王蝶卵同一档的叶绿，ACES 下仍看得出是活叶子 */
const LEAF_COLOR = '#4e7d38'

// ---------------------------------------------------------------- 随机数

/**
 * 种子化 PRNG（mulberry32）。抖动与倾角必须是**确定性**的：
 * 同一份代码在任何机器上都要长成同一窝卵，否则目视验收过的那张图
 * 跟用户看到的不是同一个东西。
 */
function rng(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// ---------------------------------------------------------------- 卵壳曲线

/**
 * 壳半径的关键帧（占 EGG_R 的比例），t=0 在卵基、t=1 在卵顶。
 *
 * 分段给关键帧而不是写一条解析曲线，是因为这颗卵的形要同时满足三件事：
 * 基部圆钝（有一小片黏着面，不能收成尖）、最宽处**略偏下**（0.42，纺锤形的
 * 重心在下半截）、顶端收成钝尖而不是平截。一条 sin/cos 组合很难三样都对。
 */
const SHELL_KEYS: readonly (readonly [number, number])[] = [
  [0.0, 0.36],
  [0.1, 0.72],
  [0.22, 0.9],
  [0.42, 1.0],
  [0.62, 0.96],
  [0.8, 0.8],
  [0.92, 0.53],
  [1.0, 0.14],
]

/** 关键帧插值（smoothstep 段内缓动） */
function keyframe(keys: readonly (readonly [number, number])[], t: number): number {
  const x = THREE.MathUtils.clamp(t, 0, 1)
  for (let i = 1; i < keys.length; i++) {
    if (x <= keys[i][0]) {
      const [t0, v0] = keys[i - 1]
      const [t1, v1] = keys[i]
      const k = t1 === t0 ? 0 : (x - t0) / (t1 - t0)
      return THREE.MathUtils.lerp(v0, v1, k * k * (3 - 2 * k))
    }
  }
  return keys[keys.length - 1][1]
}

/** 壳面在 t 处的半径。脊纹与壳共用这一条曲线，脊才不会一段陷进壳里、一段浮在空中 */
function shellRadius(t: number): number {
  return Math.max(EGG_R * keyframe(SHELL_KEYS, t), 1e-4)
}

/** 壳面在 t 处的高度。t=0 在叶面之下 EMBED 深处 */
function shellY(t: number): number {
  return -EMBED + t * EGG_HEIGHT
}

// ---------------------------------------------------------------- 部件

/** 一枚卵的壳 */
function shellMesh(material: THREE.Material): THREE.Mesh {
  const sections: Section[] = []
  const steps = 22
  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    const r = shellRadius(t)
    sections.push({ at: new THREE.Vector3(0, shellY(t), 0), ry: r, rz: r })
  }
  const mesh = new THREE.Mesh(loft(sections, 20), material)
  mesh.name = 'egg-shell'
  return mesh
}

/**
 * 一条纵脊：贴着壳面走的一根极细的管。
 *
 * 管心比壳面外移 RIDGE_RISE 的四分之一，于是管的内侧埋进壳里、外侧凸出来 ——
 * 这样脊与壳之间不会露缝（悬在壳外的一圈细管，侧光下会看成九根胡须）。
 * 两端各收细：脊在基部才隆起，近顶端又并拢收细，不然顶端九根管会挤成一个疙瘩。
 */
function ridgeRib(azimuth: number, material: THREE.Material): THREE.Mesh {
  const sections: Section[] = []
  const steps = 12
  for (let i = 0; i <= steps; i++) {
    const t = THREE.MathUtils.lerp(0.05, 0.95, i / steps)
    const r = shellRadius(t) + RIDGE_RISE * 0.25
    const thick =
      RIDGE_RISE *
      0.7 *
      (0.5 + 0.5 * THREE.MathUtils.smoothstep(t, 0.05, 0.2)) *
      (1 - 0.7 * THREE.MathUtils.smoothstep(t, 0.7, 0.95))
    sections.push({
      at: new THREE.Vector3(r * Math.cos(azimuth), shellY(t), r * Math.sin(azimuth)),
      ry: Math.max(thick, 1e-4),
      rz: Math.max(thick, 1e-4),
    })
  }
  const mesh = new THREE.Mesh(loft(sections, 6), material)
  mesh.name = 'egg-ridge'
  return mesh
}

/**
 * 一枚完整的卵（壳 + 纵脊），装在一个以**卵基**为原点的 group 里。
 *
 * 原点放在卵基而不是卵心，是为了让倾斜绕着黏着点转 —— 绕卵心转的话，
 * 一歪整枚卵就从叶面上抬起来一角，那是「掉在叶子上」而不是「黏在叶子上」。
 */
function eggUnit(shellMat: THREE.Material, ridgeMat: THREE.Material): THREE.Group {
  const g = new THREE.Group()
  g.add(shellMesh(shellMat))
  for (let i = 0; i < RIDGE_COUNT; i++) {
    g.add(ridgeRib((i / RIDGE_COUNT) * Math.PI * 2, ridgeMat))
  }
  return g
}

/**
 * 基座叶面：尖卵形轮廓的薄叶片，上表面正好在 y=0。
 *
 * 与 kit.wingGeometry 同一套约定：形状在 XY 平面挤出后 rotateX(π/2) 摊平到 XZ，
 * 厚度落到 −Y。倒一点角 —— 不倒角的挤出体侧壁是一圈笔直的立面，
 * 渲染出来像一块绿色亚克力板。
 */
function leafPatch(material: THREE.Material): THREE.Mesh {
  const pts: THREE.Vector2[] = []
  const N = 22
  // sin^0.72 让两端收成叶尖而不是圆头
  const edge = (s: number) => LEAF_HALF_WIDE * Math.pow(Math.sin(Math.PI * s), 0.72)
  for (let i = 0; i <= N; i++) {
    const s = i / N
    pts.push(new THREE.Vector2(THREE.MathUtils.lerp(-LEAF_HALF_LEN, LEAF_HALF_LEN, s), edge(s)))
  }
  for (let i = N; i >= 0; i--) {
    const s = i / N
    pts.push(new THREE.Vector2(THREE.MathUtils.lerp(-LEAF_HALF_LEN, LEAF_HALF_LEN, s), -edge(s)))
  }
  const geo = new THREE.ExtrudeGeometry(new THREE.Shape(pts), {
    depth: 0.012,
    bevelEnabled: true,
    bevelSize: 0.005,
    bevelThickness: 0.003,
    bevelSegments: 2,
    curveSegments: 14,
  })
  geo.rotateX(Math.PI / 2)
  const mesh = new THREE.Mesh(geo, material)
  mesh.name = 'leaf'
  return mesh
}

// ---------------------------------------------------------------- 建模主体

export function buildLadybirdEgg(): InsectModel {
  const g = new THREE.Group()

  const shellMat = chitin({ color: EGG_COLOR, gloss: 0.5, clearcoat: 0.3 })
  const ridgeMat = chitin({ color: RIDGE_COLOR, gloss: 0.55, clearcoat: 0.3 })
  const leafMat = chitin({ color: LEAF_COLOR, gloss: 0.4, surface: 'velvet' })

  g.add(leafPatch(leafMat))

  const rand = rng(0x7c1a3b)
  let centerEgg: THREE.Group | null = null

  for (const [count, z0] of ROWS) {
    for (let i = 0; i < count; i++) {
      // 行内居中排开
      const x0 = (i - (count - 1) / 2) * PITCH
      // 抖动：位置 ±0.006 / ±0.005。规整的阵列一眼就是「复制粘贴」
      const x = x0 + (rand() - 0.5) * 0.012
      const z = z0 + (rand() - 0.5) * 0.01

      const unit = eggUnit(shellMat, ridgeMat)
      unit.position.set(x, 0, z)

      /*
       * 倾角：基础 2° + 随距簇心的距离线性增到约 8°，再加 ±1.5° 的随机。
       * 倾斜方向偏向**背离簇心**（真实的一簇卵边缘就是向外微微张开的），
       * 再叠 ±25° 的方向抖动，免得张成一朵规整的花。
       */
      const distFromCenter = Math.hypot(x, z)
      const tilt = THREE.MathUtils.degToRad(2 + 26 * distFromCenter + (rand() - 0.5) * 3)
      const dir = Math.atan2(z, x) + (rand() - 0.5) * THREE.MathUtils.degToRad(50)
      // 绕水平轴 (sin d, 0, −cos d) 旋转，使 +Y 朝 (cos d, 0, sin d) 方向倾倒
      unit.quaternion.setFromAxisAngle(new THREE.Vector3(Math.sin(dir), 0, -Math.cos(dir)), tilt)

      if (Math.abs(x0) < 1e-6 && Math.abs(z0) < 1e-6) centerEgg = unit
      g.add(unit)
    }
  }

  /*
   * 锚点必须落在真有几何的位置上。
   * - cluster：正中那枚卵的顶端（壳面上的一点）；
   * - ridge：同一枚卵中段、方位角 0 那条脊的**脊冠**上；
   * - leaf：叶面上远离卵簇的一点。
   * 三个都取簇心那枚卵 —— 它的倾角基础值只有 2°，忽略倾斜带来的偏移
   * 最大不过 0.11×sin2° ≈ 0.004，远在「贴着实体」的容差之内。
   */
  const center = centerEgg ? centerEgg.position.clone() : new THREE.Vector3()
  const anchors: Record<string, THREE.Vector3> = {
    cluster: center.clone().add(new THREE.Vector3(0, shellY(0.96), 0)),
    ridge: center.clone().add(new THREE.Vector3(shellRadius(0.42) + RIDGE_RISE, shellY(0.42), 0)),
    leaf: new THREE.Vector3(-LEAF_HALF_LEN * 0.72, 0, 0),
  }

  return finalize(g, anchors)
}
