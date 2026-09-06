/**
 * 七星瓢虫 · 蛹 Coccinella septempunctata（完全变态第 3 阶段）
 *
 * 单位与坐标系与成虫（../ladybird.ts）完全一致：1 = 1 厘米真实体长，
 * +X 向前（头）、+Y 向上（背）、+Z 向右。叶面摊在 XZ 平面上，上表面 y=0。
 *
 * ## 这一阶段最好认的不是蛹本身，是它尾巴上挂着的那团旧皮
 *
 * 一枚 4 毫米的橙底黑斑小荚，单看很难说是什么。但七星瓢虫化蛹的方式给了它
 * 一个别的昆虫都没有的标志：末龄幼虫先用腹末把自己**黏死在叶面上**，然后
 * 从头往后蜕最后一次皮 —— 蜕下来的幼虫皮被推到腹末，**皱缩成一小团留在原地
 * 没有掉**。于是野外见到的每一枚瓢虫蛹，尾巴上都拖着一团深蓝黑的旧皮。
 *
 * 这一团旧皮是本文件的重点：
 * - 它是**上一阶段的遗物**，把幼虫（石板蓝黑、成排疣突）和蛹（橙黄黑斑）在
 *   同一张图里接上了 —— 这正是生活史演示要说的那句话；
 * - 旧皮上仍留着幼虫的疣突与一点橙斑（真实的蜕皮就是这样，色斑与瘤突都还在），
 *   所以它一眼认得出是「一条虫的皮」，而不是一块泥；
 * - 少了它，这枚蛹就退回成「一颗橙色的小豆子」。测试里有一条专门盯着它。
 *
 * ## 招牌姿态：腹末黏地、前端上翘
 *
 * 蛹体只有腹末一点黏在叶面上，身体其余部分**离地翘起**（本模型 36°），
 * 头端悬在叶面之上 0.26。受惊时它还能绕这个黏着点把前身猛地弹起来吓退天敌 ——
 * 摆成一枚平躺在叶面上的豆子，这层意思就全没了。
 * 这个角度不是挑好看挑的，是解出来的下限，理由写在 `TILT_DEG` 上。
 *
 * ## 形态依据
 *
 * - **体长 4.4 毫米**（模型 0.44），最宽 3.0 毫米。短而饱满的卵圆形，
 *   最宽处在前部（前胸那一段），向腹末渐细 —— 与半球形的成虫、长纺锤的幼虫
 *   都不一样。上下限齐给，不为了「好看」放大。
 * - **裸蛹（exarate/无茧）**。这一条要写清楚是因为它常被想当然地画错：
 *   蚂蚁、家蚕化蛹时结茧或有薄膜包裹，**瓢虫不结茧**，蛹壳就那么裸露在叶面上。
 *   测试里有一条「没有任何几何体把蛹整个罩住」，专门钉这件事。
 * - **橙黄底带黑斑**（`#f09a22`，hue 35°、S 0.87、L 0.54）。
 *   ⚠️ 不往深里压。本仓库栽过的那个大跟头：ACES 会提亮去饱和，于是有了
 *   「颜色压深一档」的经验，但它被误解成「越深越保险」之后，10 只里 7 只的
 *   招牌图案在画面上直接消失。这里的橙黄对齐 `ladybird.ts` 那枚目视验收过的
 *   朱红 `#e2382a`（L 0.53）的明度档，与黑斑的明度差 0.45。
 * - **黑斑 14 枚**：前胸一对大的、腹部四对侧斑、背中线两对小的，左右严格成对。
 *   **黑斑是壳面本身的一块颜色，不是贴上去的件** —— 这一条是目视验收打回来
 *   重做的（第一版用压扁的小球贴曲面，渲出来读成粘在背上的一串黑珠子），
 *   详见 `surfaceSpot()` 的注释。
 * - **背腹压扁**：截面高 0.24 / 宽 0.32（比 0.74）。第一版给 0.92，接近正圆，
 *   前端那个又大又光滑的橙色圆顶被读成「一只气球」。真实的瓢虫蛹背面明显扁。
 * - **看得出前胸背板的轮廓**：u=0.66 处一道浅缢，缢里再压一圈比腹部横脊更粗的
 *   环。缢之前是腹部、之后隆起成盖住头的前胸背板盾片。少了这道界，整只蛹就是
 *   一个从头滑到尾的光包络 —— 那正是「气球」的由来。
 * - **背面的横向分节**：腹部 5 道横脊，各是一圈**贴着壳面凸出来的细环**。
 *   ⚠️ 分节必须靠形，不靠色。第一批阶段模型的教训写得很明白：
 *   **深色贴浅色读成斑纹，不是结构**（黑蚱蝉的翅芽比胸背暗一档，四个机位全读成
 *   一块污渍）。所以这五道是真凸起的管环，颜色只比壳面深半档做辅助。
 *
 * ## 取舍
 *
 * - **不做翅芽/足芽。** 瓢虫蛹的附肢芽全折在腹面，而验收机位都在上方，做了也
 *   看不见；而这枚蛹的信息量已经由「旧皮 + 上翘 + 橙底黑斑 + 横向分节」占满，
 *   再往腹面堆几条隆脊，只会在少数机位下多出几道读不懂的棱。
 * - 叶片尺寸压到与蛹同量级（0.68 × 0.42）。帝王蝶那颗卵的教训：基座一大，
 *   取景被它撑开，主角反而缩成一个点。
 */
import * as THREE from 'three'
import { chitin, finalize, loft, type InsectModel, type Section } from '../kit'

// ---------------------------------------------------------------- 尺度与姿态

/** 蛹体长（沿体轴）：真实 4.4 毫米 */
const PUPA_LEN = 0.44
/** 最宽处半径：体宽 3.0 毫米 */
const R_MAX = 0.152
/**
 * 背腹 / 左右的截面比：高 0.78 / 宽 1.06，即截面高宽比 0.74 —— **明显扁**。
 *
 * 第一版给的是 0.97 / 1.05（比值 0.92，几乎是正圆），目视验收打回：
 * 前端那个又大又光滑的橙色圆顶读成「一只气球」。真实的瓢虫蛹背面是扁的，
 * 压扁之后侧影里才有蛹该有的那道低平的背线。
 */
const RY = 0.78
const RZ = 1.06
/**
 * 体轴自叶面抬起的角度。前端上翘是这一阶段的招牌姿态。
 *
 * 36° 不是挑好看挑出来的，是算出来的**下限**：蛹体最粗处半径 0.152，
 * 腹末黏在叶面上时，体轴抬得不够整个腹面就会陷进叶片里
 * （第一版给 26°，腹部第 3 节的腹面扎进叶面 0.054 深，侧视读成
 * 「半只蛹埋在叶子里」）。逐点解 `y(u) = 0.44u·sinθ − RY·cosθ·r(u) ≥ 0`
 * 之后，θ ≥ 35° 才能让**腹末那一点**成为全身最低处 —— 也就是「只有腹末着地」
 * 这句话在几何上真的成立。36° 下腹部前几节离叶面 0.002~0.007，
 * 正好贴着叶面掠过去，那道窄缝里的接触阴影就是真实照片里的样子。
 */
const TILT_DEG = 36
/** 腹末黏着点（叶面上）。整只蛹只有这一点接触叶面 */
const ATTACH = new THREE.Vector3(-0.16, 0.01, 0)

/** 基座叶片的半长与半宽 */
const LEAF_HALF_LEN = 0.34
const LEAF_HALF_WIDE = 0.21

// ---------------------------------------------------------------- 颜色

/** 蛹壳：橙黄。明度对齐 ladybird.ts 的朱红 `#e2382a`（0.53），不压深 */
const SHELL_COLOR = '#f09a22'
/** 黑斑：近黑带一点暖调，与蛹壳的明度差 0.45 */
const SPOT_COLOR = '#161314'
/** 横脊：只比壳面深半档。分节靠凸起的形读出来，颜色只是助攻 */
const RIDGE_COLOR = '#c9761a'
/** 蜕下的幼虫皮：与幼虫体壁同一族的石板蓝黑，干缩后再暗一点 */
const SKIN_COLOR = '#242f42'
/** 旧皮上残留的疣突 */
const SKIN_TUBERCLE_COLOR = '#1a2333'
/** 旧皮上残留的橙斑 —— 幼虫身上那对 A1 橙斑，蜕皮之后仍在皮上 */
const SKIN_SPOT_COLOR = '#d9832a'
/** 叶片 */
const LEAF_COLOR = '#4e7d38'

/**
 * 黑斑离壳面的法向外移量。只为避开 z-fighting，不是为了「凸出来」——
 * 0.001 大于壳面放样多边形的弦高（0.0004），
 * 于是斑既不陷进壳里、也不构成任何可见的隆起（实测最外顶点离面 0.0018）。
 */
const SPOT_LIFT = 0.001

// ---------------------------------------------------------------- 随机数

/**
 * 种子化 PRNG（mulberry32）。旧皮的皱褶必须是**确定性**的：
 * 同一份代码在任何机器上都要皱成同一团，否则目视验收过的那张图
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

// ---------------------------------------------------------------- 体形包络

/** 关键帧插值（段内 smoothstep 缓动） */
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

/**
 * 体半径包络（占 R_MAX 的比例），u=0 在腹末黏着点、u=1 在头端。
 *
 * 最宽处在 u=0.78（前胸背板），向腹末一路收细到 0.10 —— 前胖后细正是瓢虫蛹
 * 的侧影。**腹末收得这么细是有原因的**：末几个腹节是真正的细颈，蛹就靠它
 * 从旧皮里探出来黏在叶上；粗腹末在 36° 的仰角下会直接杵进叶面（见 TILT_DEG）。
 * 两端都以密集关键帧圆钝地收口：只做包络的话放样封口会封出一个正圆平面，
 * 四个机位下都读成「一截锯断的塑料管」（帝王蝶毛虫尾端的原话）。
 */
const GIRTH_KEYS: readonly (readonly [number, number])[] = [
  [0.0, 0.1],
  [0.08, 0.24],
  [0.18, 0.44],
  [0.3, 0.66],
  [0.44, 0.84],
  [0.58, 0.94],
  [0.66, 0.88], // 前胸背板后缘：一道浅缢，把腹部与盾片分开
  [0.78, 1.0], // 前胸背板最宽处
  [0.88, 0.88],
  [0.95, 0.6],
  [0.98, 0.4],
  [1.0, 0.12],
]

/** 前胸背板后缘那道缢的位置。缢 + 一圈略粗的环 = 看得出盾片的轮廓 */
const PRONOTUM_U = 0.66

function girth(u: number): number {
  return Math.max(R_MAX * keyframe(GIRTH_KEYS, u), 1e-4)
}

/** 蛹体局部坐标：体轴沿 +X，u=0 在腹末。整组稍后绕 Z 抬 TILT_DEG 再平移到黏着点 */
function localAxisX(u: number): number {
  return u * PUPA_LEN
}

/**
 * 壳面上某点的位置与外法线（蛹体局部坐标）。
 * `theta` 自背中线（+Y）量起，向 +Z 侧为正；90° 即体侧最宽处。
 * 法线按椭圆截面的半径倒数加权，斑块才会真的贴平在曲面上。
 */
function surfaceAt(u: number, thetaDeg: number): { pos: THREE.Vector3; normal: THREE.Vector3 } {
  const r = girth(u)
  const ry = r * RY
  const rz = r * RZ
  const th = THREE.MathUtils.degToRad(thetaDeg)
  const pos = new THREE.Vector3(localAxisX(u), ry * Math.cos(th), rz * Math.sin(th))
  const normal = new THREE.Vector3(0, (Math.cos(th) / ry) * rz, (Math.sin(th) / rz) * ry).normalize()
  return { pos, normal }
}

/** 蛹体局部坐标 → 模型坐标（绕 Z 抬 TILT_DEG，再平移到黏着点） */
function toModel(v: THREE.Vector3): THREE.Vector3 {
  return v.clone().applyEuler(new THREE.Euler(0, 0, THREE.MathUtils.degToRad(TILT_DEG))).add(ATTACH)
}

// ---------------------------------------------------------------- 部件

/**
 * 一道横向体节脊：沿壳面截面椭圆走一整圈的细管环。
 *
 * 用 `loft()` 绕椭圆走一圈，而不是拿 `TorusGeometry` 缩放 —— 圆环与椭圆截面
 * 差着 ±4% 的体径，正好和管径同量级，会出现「一段浮起、一段陷进去」的环。
 * 管心落在壳面上，于是外侧一半凸出、内侧一半埋进去，边下有净空，
 * 侧光下才有那道读得出「分节」的阴影缝。
 */
function segmentRidge(u: number, material: THREE.Material, tube = 0.0085, name = 'segment-ridge'): THREE.Mesh {
  const r = girth(u)
  const ry = r * RY
  const rz = r * RZ
  const sections: Section[] = []
  const N = 26
  for (let i = 0; i <= N; i++) {
    const a = (i / N) * Math.PI * 2
    sections.push({
      at: new THREE.Vector3(localAxisX(u), ry * Math.cos(a), rz * Math.sin(a)),
      ry: tube,
      rz: tube,
    })
  }
  const mesh = new THREE.Mesh(loft(sections, 8), material)
  mesh.name = name
  return mesh
}

/**
 * 壳面上的一块黑斑。
 *
 * ## 为什么不是「压扁的小球贴在曲面上」
 *
 * 第一版用的就是那一招（`ladybird.ts` 给成虫那七个黑点用的 `spotPatch`）。
 * 目视验收当场打回：压扁的球是一个**独立的实体** —— 有自己的厚度、轮廓边、
 * 投影和一圈朝内的背面，渲出来读成**粘在背上的一串黑珠子**。**斑是色，不是件。**
 *
 * ## 正确的办法仓库里已经有
 *
 * `monarch-butterfly-larva.ts` 的 `bandRing()`：把体躯切成 52 段分别上色，
 * 相邻两段共用同一个 u 边界，半径与轴心完全对齐、表面连续，于是色块边界锐利
 * 而两色真分得开（本仓库零贴图资产，斑纹只能靠几何）。
 *
 * 这里要的是斑块不是横带，办法是同一个：这一小片曲面用**与壳面完全同一个
 * 参数方程** `surfaceAt(u, θ)` 采样出来，边界是 (u, θ) 参数域里的一个椭圆
 * （所以斑的轮廓是随体形走的卵圆，不是一块长方形贴纸）。
 *
 * 与壳面唯一的差别是沿法线外移 `SPOT_LIFT` = 0.001，只为避开 z-fighting；
 * 它大于壳面放样多边形的弦高（周向 44 段 0.0004、轴向 72 段 0.0004），
 * 所以斑既不陷进壳里、也不构成任何可见的隆起：实测斑上最外的顶点离壳面
 * 0.0018（压扁小球那一版是 0.019）。测试里有一条专门量它，改回球会当场红。
 */
function surfaceSpot(uc: number, thetaC: number, uHalf: number, thHalf: number, material: THREE.Material): THREE.Mesh {
  const NU = 18
  const NT = 20
  const position: number[] = []
  const normal: number[] = []
  const index: number[] = []
  for (let i = 0; i <= NU; i++) {
    const s = -1 + (2 * i) / NU
    // 半宽随 s 按 √(1−s²) 收 —— (u, θ) 参数域里的一个正椭圆，斑因此是卵圆的
    const halfW = thHalf * Math.sqrt(Math.max(0, 1 - s * s))
    const u = THREE.MathUtils.clamp(uc + uHalf * s, 0, 1)
    for (let j = 0; j <= NT; j++) {
      const t = -1 + (2 * j) / NT
      const { pos, normal: n } = surfaceAt(u, thetaC + halfW * t)
      pos.addScaledVector(n, SPOT_LIFT)
      position.push(pos.x, pos.y, pos.z)
      normal.push(n.x, n.y, n.z)
    }
  }
  const row = NT + 1
  for (let i = 0; i < NU; i++) {
    for (let j = 0; j < NT; j++) {
      const a = i * row + j
      index.push(a, a + row, a + 1, a + row, a + row + 1, a + 1)
    }
  }
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.Float32BufferAttribute(position, 3))
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(normal, 3))
  geo.setIndex(index)
  const mesh = new THREE.Mesh(geo, material)
  mesh.name = 'pupa-spot'
  return mesh
}

/**
 * 一片皱缩的皮：把球面顶点用几组正弦揉皱、再各轴独立压扁。
 *
 * 为什么不用光滑的椭球拼：一团光滑的球读成「一堆巧克力豆」，而蜕下来的皮是
 * **塌陷的薄壳**，它的全部信息都在褶皱的高光断续里。揉皱的振幅给到 0.22
 * （半径的两成），侧光下才有真正的明暗碎块。
 */
function crumpledLobe(rand: () => number, scale: THREE.Vector3, material: THREE.Material): THREE.Mesh {
  const geo = new THREE.SphereGeometry(1, 18, 14)
  const pos = geo.getAttribute('position')
  const ph = [rand() * 6.283, rand() * 6.283, rand() * 6.283]
  const p = new THREE.Vector3()
  for (let i = 0; i < pos.count; i++) {
    p.fromBufferAttribute(pos, i)
    const k =
      1 +
      0.22 * Math.sin(4.2 * p.x + ph[0]) * Math.cos(3.1 * p.y + ph[1]) +
      0.15 * Math.sin(5.7 * p.z + ph[2]) -
      0.1 * Math.abs(p.y)
    p.multiplyScalar(k)
    pos.setXYZ(i, p.x * scale.x, p.y * scale.y, p.z * scale.z)
  }
  geo.computeVertexNormals()
  const mesh = new THREE.Mesh(geo, material)
  mesh.name = 'larval-skin'
  return mesh
}

/** 旧皮上残留的一枚幼虫疣突：小钝锥，做法与 ladybird-larva.ts 的疣突同型 */
function skinTubercle(at: THREE.Vector3, dir: THREE.Vector3, h: number, r: number, material: THREE.Material): THREE.Mesh {
  const profile: readonly (readonly [number, number])[] = [
    [-0.3, 1.0],
    [0.15, 0.86],
    [0.6, 0.6],
    [1.0, 0.3],
  ]
  const sections: Section[] = profile.map(([t, k]) => ({
    at: at.clone().addScaledVector(dir, t * h),
    ry: Math.max(r * k, 1e-4),
    rz: Math.max(r * k, 1e-4),
  }))
  const mesh = new THREE.Mesh(loft(sections, 8), material)
  mesh.name = 'skin-tubercle'
  return mesh
}

/**
 * 基座叶面：尖卵形轮廓的薄叶片，上表面正好在 y=0。
 * 与 kit.wingGeometry 同一套约定：形状在 XY 平面挤出后 rotateX(π/2) 摊到 XZ。
 * 倒一点角 —— 不倒角的挤出体侧壁是一圈笔直的立面，渲染出来像一块绿色亚克力板。
 */
function leafPatch(material: THREE.Material): THREE.Mesh {
  const pts: THREE.Vector2[] = []
  const N = 22
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

// ---------------------------------------------------------------- 斑点分布

/**
 * 黑斑分布（左右各一，theta 取 ± 号）。
 * 前胸一对大的 + 腹部四对侧斑 + 背中线两对小的 = 14 枚。
 */
const SPOT_SITES: readonly { u: number; theta: number; uHalf: number; thHalf: number }[] = [
  { u: 0.8, theta: 42, uHalf: 0.11, thHalf: 26 }, // 前胸背板的一对大黑斑
  { u: 0.22, theta: 72, uHalf: 0.06, thHalf: 22 }, // 腹部四对侧斑，随体径一起收
  { u: 0.32, theta: 72, uHalf: 0.07, thHalf: 19 },
  { u: 0.42, theta: 72, uHalf: 0.075, thHalf: 17 },
  { u: 0.52, theta: 72, uHalf: 0.075, thHalf: 16 },
  { u: 0.36, theta: 20, uHalf: 0.055, thHalf: 15 }, // 背中线两侧的小点
  { u: 0.5, theta: 20, uHalf: 0.055, thHalf: 14 },
]

/** 腹部的五道横脊 */
const RIDGE_US: readonly number[] = [0.18, 0.27, 0.36, 0.45, 0.54]

// ---------------------------------------------------------------- 建模主体

export function buildLadybirdPupa(): InsectModel {
  const g = new THREE.Group()

  const shellMat = chitin({ color: SHELL_COLOR, gloss: 0.5, clearcoat: 0.34, surface: 'punctate' })
  const ridgeMat = chitin({ color: RIDGE_COLOR, gloss: 0.45, clearcoat: 0.25 })
  const spotMat = chitin({ color: SPOT_COLOR, gloss: 0.62, clearcoat: 0.5 })
  const skinMat = chitin({ color: SKIN_COLOR, gloss: 0.22, clearcoat: 0.08 })
  const skinTubercleMat = chitin({ color: SKIN_TUBERCLE_COLOR, gloss: 0.28 })
  const skinSpotMat = chitin({ color: SKIN_SPOT_COLOR, gloss: 0.26 })
  const leafMat = chitin({ color: LEAF_COLOR, gloss: 0.4, surface: 'velvet' })

  g.add(leafPatch(leafMat))

  // ---- 蛹体：整组建在体轴沿 +X 的局部坐标里，最后绕 Z 抬起再挪到黏着点
  const pupa = new THREE.Group()
  pupa.rotation.z = THREE.MathUtils.degToRad(TILT_DEG)
  pupa.position.copy(ATTACH)

  {
    const sections: Section[] = []
    // 轴向 72 段（原 40）：理由同幼虫体壁 —— 黑斑按解析曲面采样，轴向段数不够时
    // 前胸背板那道缢附近的割弦矢高有 0.002，斑会从面里探出来
    const steps = 72
    for (let i = 0; i <= steps; i++) {
      const u = i / steps
      const r = girth(u)
      sections.push({
        at: new THREE.Vector3(localAxisX(u), 0, 0),
        ry: Math.max(r * RY, 1e-4),
        rz: Math.max(r * RZ, 1e-4),
      })
    }
    // 周向 44 段（原 30）：多边形弦高降到 0.0004，黑斑那 0.001 的外移才稳稳
    // 落在壳面之外，不会在某些面片中央陷进去闪烁
    const shell = new THREE.Mesh(loft(sections, 44), shellMat)
    shell.name = 'pupa-shell'
    pupa.add(shell)
  }

  for (const u of RIDGE_US) pupa.add(segmentRidge(u, ridgeMat))
  // 前胸背板后缘：那道浅缢里再压一圈略粗的环，盾片的轮廓才读得出来
  pupa.add(segmentRidge(PRONOTUM_U, ridgeMat, 0.011, 'pronotum-margin'))

  for (const site of SPOT_SITES) {
    for (const side of [1, -1] as const) {
      pupa.add(surfaceSpot(site.u, site.theta * side, site.uHalf, site.thHalf, spotMat))
    }
  }

  g.add(pupa)

  /*
   * ---- 蜕下的幼虫皮：皱缩成一小团，仍连在腹末与叶面之间。
   *
   * 摆位直接写在模型坐标里（不进 `pupa` 那一组）—— 旧皮是**塌在叶面上**的，
   * 它不跟着蛹体一起抬起 26°。第一版曾把它塞进 pupa 组里，整团皮跟着翘到了
   * 空中，读起来像蛹尾巴上挂了个坠子。
   *
   * 六片褶：三片压在黏着点周围铺开、两片包住蛹的腹末、一片向后拖出去。
   * 关键是最靠前那两片必须**咬住蛹体腹末**（重叠 0.02 以上），
   * 否则蛹与旧皮之间会露出一条缝，「旧皮还连在身上」这层意思就断了。
   */
  const rand = rng(0x5ad1e7)
  const tailTip = toModel(new THREE.Vector3(localAxisX(0.05), 0, 0))
  const lobes: readonly { at: readonly [number, number, number]; scale: readonly [number, number, number]; rot: number }[] = [
    { at: [tailTip.x + 0.006, 0.062, 0.02], scale: [0.055, 0.038, 0.046], rot: 0.35 },
    { at: [tailTip.x - 0.004, 0.06, -0.026], scale: [0.052, 0.036, 0.042], rot: -0.5 },
    { at: [tailTip.x - 0.046, 0.058, 0.004], scale: [0.06, 0.034, 0.05], rot: 0.2 },
    { at: [tailTip.x - 0.078, 0.052, 0.03], scale: [0.048, 0.028, 0.038], rot: -0.9 },
    { at: [tailTip.x - 0.082, 0.05, -0.03], scale: [0.045, 0.026, 0.036], rot: 0.8 },
    { at: [tailTip.x - 0.104, 0.046, -0.002], scale: [0.04, 0.022, 0.032], rot: 0.1 },
  ]
  for (const lobe of lobes) {
    const mesh = crumpledLobe(rand, new THREE.Vector3(...lobe.scale), skinMat)
    mesh.position.set(...lobe.at)
    mesh.rotation.set(lobe.rot * 0.6, lobe.rot, lobe.rot * 0.4)
    g.add(mesh)
  }

  /*
   * 旧皮上残留的疣突与橙斑。这两样是「它是一条虫的皮」的全部证据 ——
   * 没有它们，这团东西读成一小块泥。位置按幼虫身上的排布来：
   * 疣突成对排在褶的背侧，橙斑落在最大的那片褶上（对应幼虫 A1 的那对）。
   */
  for (const [x, y, z, dy, dz] of [
    [tailTip.x - 0.026, 0.078, 0.026, 0.86, 0.5],
    [tailTip.x - 0.03, 0.076, -0.028, 0.86, -0.5],
    [tailTip.x - 0.074, 0.07, 0.034, 0.8, 0.6],
    [tailTip.x - 0.078, 0.066, -0.036, 0.8, -0.6],
    [tailTip.x - 0.108, 0.058, 0.002, 0.98, 0.2],
  ] as const) {
    g.add(
      skinTubercle(
        new THREE.Vector3(x, y, z),
        new THREE.Vector3(0, dy, dz).normalize(),
        0.024,
        0.017,
        skinTubercleMat,
      ),
    )
  }
  for (const side of [1, -1] as const) {
    const m = new THREE.Mesh(new THREE.SphereGeometry(0.026, 14, 10), skinSpotMat)
    m.position.set(tailTip.x - 0.05, 0.068, side * 0.03)
    m.scale.set(1, 0.42, 1)
    m.name = 'skin-spot'
    g.add(m)
  }

  // ---- 锚点：全部落在真有几何的位置上
  const headEnd = toModel(new THREE.Vector3(localAxisX(0.94), 0, 0))
  const bigSpot = surfaceAt(SPOT_SITES[0].u, SPOT_SITES[0].theta)
  const anchors: Record<string, THREE.Vector3> = {
    head: headEnd,
    tail: tailTip,
    spot: toModel(bigSpot.pos.clone().addScaledVector(bigSpot.normal, SPOT_LIFT)),
    larvalSkin: new THREE.Vector3(tailTip.x - 0.078, 0.056, 0),
    leaf: new THREE.Vector3(LEAF_HALF_LEN * 0.72, 0, 0),
  }

  return finalize(g, anchors)
}
