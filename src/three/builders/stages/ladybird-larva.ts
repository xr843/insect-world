/**
 * 七星瓢虫 · 幼虫 Coccinella septempunctata（完全变态第 2 阶段，取末龄 4 龄）
 *
 * 单位与坐标系与成虫（../ladybird.ts）完全一致：1 = 1 厘米真实体长，
 * +X 向前（头）、+Y 向上（背）、+Z 向右。
 *
 * ## 这一阶段要说的那句话：它和成虫一点都不像
 *
 * 成虫是「倒扣的一只碗」—— 底面几乎平、背面高高拱起的半球，红底七黑点。
 * 幼虫是**一条长纺锤、后端渐尖、通身生着成排小瘤的石板蓝黑色小家伙**，
 * 长 1.05 厘米，比 0.7 厘米的成虫还长。两者放在一起没有任何一处对得上，
 * 而这正是完全变态要讲的事：幼虫是「吃」的形态（一只末龄幼虫能吃掉几百头蚜虫），
 * 成虫是「飞与找配偶」的形态，中间隔着一次把身体拆掉重装的蛹期。
 *
 * 常见的画错法是把它画成一条毛虫。所以本文件把三条关键差别做成硬结构：
 *
 * 1. **只有 3 对胸足，没有腹足。** 鞘翅目幼虫的腹部是光的，靠三对分节的胸足
 *    爬行；鳞翅目幼虫才有 4 对肉质腹足 + 1 对尾足（见
 *    `monarch-butterfly-larva.ts` 里那一整套 `fleshyProleg`）。多画一排腹足，
 *    这只虫就从瓢虫幼虫变成了毛虫。测试里有一条专门盯着「腹面之下的几何
 *    只准出现在体前段」。
 * 2. **体表成排的疣突（tubercle）。** 每节背侧一对、体侧一对，共 11 节 × 4 = 44 枚，
 *    每枚是一个由体壁长出来的钝锥，顶端生 3 根短刚毛。这是它最好认的特征，
 *    远看像一条缩小的、长满小鳞棘的鳄鱼。
 *    ⚠️ 疣突必须是**真的凸出来的形**，不是深浅色斑 —— 第一批阶段模型的教训写得
 *    很明白：**深色贴浅色读成斑纹，不是结构**（黑蚱蝉的翅芽比胸背暗一档，
 *    四个机位全读成一块污渍）。区分结构只能靠自由边、边下的净空与投出的阴影。
 * 3. **后端渐尖**。腹部自第 5 腹节起明显收细，末端上翘 —— 半球形的成虫轮廓
 *    在这里一点影子都没有。
 *
 * ## 形态依据
 *
 * - **末龄体长 1.0~1.1 厘米**（模型 1.06，含头与上颚），最宽处 2.1 毫米。
 *   细长比约 5，是「长纺锤」而不是「半球」。
 * - **底色石板蓝黑**（`#25354f`，hue 217°、S 0.36、L 0.23）—— 是**蓝黑，不是纯黑**。
 *   野外看这只虫，通身泛着一层青灰的冷调，那是它与其他甲虫幼虫最直接的区别。
 *   测试里逐项钉住色相在蓝区、饱和度 > 0.18：压成 `#111` 这条当场红。
 * - **第 1、4 腹节两侧各一对显眼橙斑**（另有前胸两侧一对较小的）。真实分布正是
 *   这样：A1 与 A4 的背侧疣突连同周围一小片体壁是橙黄的，其余体节全是蓝黑。
 *   **橙斑是体壁本身的一块颜色，不是加上去的一个件** —— 这一条是目视验收
 *   打回来重做的，详见 `surfaceSpot()` 的注释。斑上那对疣突也一并换成橙色：
 *   真实幼虫的橙就是以疣突为中心铺开的，疣突是从这块颜色里长出来的一个小瘤。
 * - **橙必须真的亮得起来**（`#f4941f`，hue 33°、S 0.91、L 0.54）。
 *   ⚠️ 本仓库栽过的那个大跟头：ACES 色调映射会提亮去饱和，于是有了「颜色压深
 *   一档」的经验，但它被误解成「越深越保险」，结果 10 只里 7 只的招牌图案在
 *   画面上直接消失（红萤的鲜红警戒色被压成了闷暗酱红）。这里的橙对齐
 *   `ladybird.ts` 那枚全仓库目视验收过的朱红 `#e2382a`（L 0.53）的明度档，
 *   与蓝黑体壁的明度差 0.31 —— 测试逐项量。
 * - **头小而深色，具咀嚼式口器**：头壳宽只有胸部的一半，一对镰刀状上颚
 *   （吃蚜虫用的），每侧 3 枚单眼（stemmata，鞘翅目幼虫的眼就是这几粒小黑点，
 *   不是复眼）。上颚**比头壳亮得多** —— 一对深色镰刀糊在深色头上等于没做。
 *
 * ## 两处刻意的取舍
 *
 * - **不另加深色的节间环。** 分节靠两样东西读出来：包络上 7.5% 的节间缢缩
 *   （形），以及每节一圈四枚疣突（形）。再往缢缩里塞一圈深色细环，就正好踩进
 *   「深色贴浅色读成斑纹」那个坑，整条虫会读成一串横纹。
 * - **姿态取爬行时的静止相**：背线中段微拱、腹末上翘。一条笔直的管子会读成
 *   一段塑料软管，这是毛虫那一版目视验收当场抓到的。
 */
import * as THREE from 'three'
import { chitin, finalize, legPair, loft, mandibles, type InsectModel, type Section } from '../kit'

// ---------------------------------------------------------------- 体轴与体节

/** 体躯（不含头壳）前端 X */
const BODY_FRONT_X = 0.435
/** 体躯末端 X */
const BODY_REAR_X = -0.505
/** 体节数：3 胸节 + 9 腹节。疣突、足与橙斑的位置全按它切分 */
const SEGMENTS = 12
/** 背腹压扁：真实幼虫略扁，`ry < rz` */
const RY = 0.92
const RZ = 1.06

/** 关键帧插值（段内 smoothstep 缓动），体轴与包络共用 */
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
 * 背线高度。胸部微拱（那是六条足撑起来的地方）、腹中段缓降、**腹末上翘** ——
 * 爬行中的瓢虫幼虫尾端确实是翘起来不拖地的，而一条笔直的管子会读成塑料软管。
 */
const AXIS_Y_KEYS: readonly (readonly [number, number])[] = [
  [0.0, 0.01],
  [0.22, 0.045],
  [0.5, 0.032],
  [0.78, 0.01],
  [1.0, 0.03],
]

/**
 * 体半径包络：前端略细 → 胸部最粗（0.098，即体宽 2.1 毫米）→ 自第 5 腹节起
 * 明显收细 → 末端收到近乎一点。
 *
 * 「后端渐尖」是这只虫与半球形成虫最直白的对比，所以后半段的下降必须真的陡：
 * u=0.55 处还有 0.082，u=0.86 只剩 0.042，u=1 收到 0.004。
 */
const GIRTH_KEYS: readonly (readonly [number, number])[] = [
  [0.0, 0.06],
  [0.1, 0.086],
  [0.22, 0.098],
  [0.38, 0.094],
  [0.55, 0.082],
  [0.72, 0.064],
  [0.86, 0.042],
  [0.95, 0.022],
  [1.0, 0.004],
]

function axis(u: number): THREE.Vector3 {
  return new THREE.Vector3(
    THREE.MathUtils.lerp(BODY_FRONT_X, BODY_REAR_X, THREE.MathUtils.clamp(u, 0, 1)),
    keyframe(AXIS_Y_KEYS, u),
    0,
  )
}

/**
 * 体半径 = 包络 × 逐节缢缩。
 *
 * 缢缩 7.5%：比帝王蝶毛虫那条（5.5%）深一档。毛虫的分节还有黑黄白色带帮着读，
 * 这只虫通体一色，分节全靠形，缢浅了整条虫就成了一根光管；再深就成了一串珠子。
 */
function girth(u: number): number {
  const env = keyframe(GIRTH_KEYS, u)
  const local = (THREE.MathUtils.clamp(u, 0, 1) * SEGMENTS) % 1
  const ripple = 1 - 0.075 * Math.pow(Math.abs(Math.cos(local * Math.PI)), 1.4)
  return Math.max(env * ripple, 1e-4)
}

/**
 * 体壁曲面上某点的位置与外法线。
 * `theta` 自背中线量起，向 +Z 侧为正；90° 即体侧最宽处。
 *
 * ## 截面必须垂直于**体轴切线**，不是垂直于 X 轴
 *
 * 这是补橙斑时量出来的一个真 bug。`kit.loft()` 把每个截面放在垂直于路径切线的
 * 平面里（平行传输标架）；而第一版这里直接写成 `(a.x, a.y + ry·cosθ, rz·sinθ)`，
 * 即垂直于 X 轴的平面。体轴不是水平的 —— 胸部那一段背线在爬升，切线偏离 X 轴
 * 8.5°，于是两套截面错开了 r·sin8.5° ≈ 0.010 的轴向距离；而那一段体径正以
 * 0.28/单位长的斜率在变粗，0.010 的错位就换算成 **0.003 的半径差**。
 * 结果：按这个函数采样出来的橙斑，在胸部整片探出体壁 3 毫米的百分之三 ——
 * 测量「斑离体壁多远」时怎么加密网格都降不下去，就是这个原因。
 *
 * 现在按 `loft()` 的同一套标架构造：切线 t 数值求出，Z 轴给周向的 v，
 * 平面内垂直于 t 的方向给 u。法线同样按椭圆截面的半径倒数加权
 * （与 `kit.loft()` 内部同一条公式），于是斑与体壁的着色也是连续的。
 */
function surfaceAt(u: number, thetaDeg: number): { pos: THREE.Vector3; normal: THREE.Vector3 } {
  const a = axis(u)
  const r = girth(u)
  const ry = r * RY
  const rz = r * RZ
  const th = THREE.MathUtils.degToRad(thetaDeg)
  // 体轴切线（数值中心差分）。路径整个落在 XY 平面里，所以标架恒为
  // { 平面内垂直于切线的 up, ±Z }，与 loft() 的平行传输结果逐点相同
  const h = 1e-4
  const t = axis(Math.min(u + h, 1)).sub(axis(Math.max(u - h, 0)))
  if (t.lengthSq() < 1e-12) t.set(-1, 0, 0)
  t.normalize()
  const up = new THREE.Vector3(t.y, -t.x, 0).normalize()
  const side = new THREE.Vector3(0, 0, 1)
  const pos = a
    .clone()
    .addScaledVector(up, ry * Math.cos(th))
    .addScaledVector(side, rz * Math.sin(th))
  const normal = up
    .clone()
    .multiplyScalar((Math.cos(th) / ry) * rz)
    .addScaledVector(side, (Math.sin(th) / rz) * ry)
    .normalize()
  return { pos, normal }
}

// ---------------------------------------------------------------- 颜色

/**
 * 体壁：石板蓝黑。**是蓝黑，不是黑** —— 色相 217°、饱和度 0.36 是这只虫
 * 在野外的样子，压成中性黑就丢了它最直接的辨识特征。
 */
const BODY_COLOR = '#25354f'
/** 疣突：比体壁再深一档，锥体的受光面才与体壁分得开（结构本身靠形，颜色只是助攻） */
const TUBERCLE_COLOR = '#1b2942'
/** 刚毛：暖灰。做成体壁同色的话，44 × 3 根毛在深底上一根都看不见 */
const SETA_COLOR = '#9a8b70'
/** 橙斑：真饱和的暖橙，明度对齐 ladybird.ts 的 `#e2382a`（0.53） */
const SPOT_COLOR = '#f4941f'
/** 头壳：高度骨化，近黑带蓝 */
const HEAD_COLOR = '#161d28'
/** 上颚：比头壳亮得多。深色镰刀糊在深色头上 = 没做 */
const MANDIBLE_COLOR = '#7d6a4e'
/** 胸足：略比体壁深，关节处的球体才不会糊成一段 */
const LEG_COLOR = '#1d2735'

/**
 * 橙斑离体壁的法向外移量。只为避开 z-fighting，不是为了「凸出来」——
 * 0.001 是体径的 1%，且大于体壁放样多边形的弦高（0.0003），
 * 于是斑既不陷进体壁、也不构成任何可见的隆起（实测最外顶点离面 0.0015）。
 */
const SPOT_LIFT = 0.001

// ---------------------------------------------------------------- 部件

/**
 * 一枚疣突：由体壁长出来的钝锥，顶端略收但不收成针（真实疣突的顶是钝的，
 * 刚毛才是尖的）。基部沿法线**反向**埋进体壁 0.25 倍高度，
 * 免得锥底与体壁之间露出一圈缝。
 */
function tubercleMesh(
  pos: THREE.Vector3,
  normal: THREE.Vector3,
  height: number,
  baseR: number,
  material: THREE.Material,
): THREE.Mesh {
  const profile: readonly (readonly [number, number])[] = [
    [-0.25, 1.0],
    [0.1, 0.92],
    [0.45, 0.72],
    [0.75, 0.5],
    [1.0, 0.34],
  ]
  const sections: Section[] = profile.map(([t, k]) => ({
    at: pos.clone().addScaledVector(normal, t * height),
    ry: Math.max(baseR * k, 1e-4),
    rz: Math.max(baseR * k, 1e-4),
  }))
  const mesh = new THREE.Mesh(loft(sections, 10), material)
  mesh.name = 'tubercle'
  return mesh
}

/**
 * 疣突顶端的一根短刚毛：细而略呈锥形的一根小管，自锥顶向外斜伸。
 * 刚毛是「疣突」这件事的一半 —— 光秃秃的小丘读成疙瘩，带毛才读成棘瘤。
 */
function setaMesh(
  tip: THREE.Vector3,
  dir: THREE.Vector3,
  length: number,
  material: THREE.Material,
): THREE.Mesh {
  const sections: Section[] = []
  const steps = 3
  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    const r = THREE.MathUtils.lerp(0.0035, 0.001, Math.pow(t, 0.8))
    sections.push({ at: tip.clone().addScaledVector(dir, length * t), ry: r, rz: r })
  }
  const mesh = new THREE.Mesh(loft(sections, 6), material)
  mesh.name = 'seta'
  return mesh
}

/** 给定法线，造一组与之正交的基（用来把刚毛绕着法线撒开） */
function basisOf(normal: THREE.Vector3): { t1: THREE.Vector3; t2: THREE.Vector3 } {
  const ref = Math.abs(normal.x) < 0.9 ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 1, 0)
  const t1 = new THREE.Vector3().crossVectors(normal, ref).normalize()
  const t2 = new THREE.Vector3().crossVectors(normal, t1).normalize()
  return { t1, t2 }
}

/**
 * 体壁上的一块橙斑。
 *
 * ## 为什么不是「压扁的小球贴在曲面上」
 *
 * 第一版用的就是那一招（`ladybird.ts` 给成虫那七个黑点用的 `spotPatch`，
 * 在又大又光滑的半球鞘翅上没问题）。这只虫身上目视验收当场打回：
 * 压扁的球是一个**独立的实体** —— 它有自己的厚度、自己的轮廓边、自己的投影，
 * 还有一圈朝内的背面。渲出来是「一个凸出体壁的橙色圆盘、中间还有个深色的洞」，
 * 最显眼那两枚活像套在身上的救生圈。**斑是色，不是件。**
 *
 * ## 正确的办法仓库里已经有
 *
 * `monarch-butterfly-larva.ts` 的 `bandRing()`：把体躯切成 52 段分别上色，
 * 相邻两段共用同一个 u 边界，于是半径与轴心完全对齐、表面连续，换来的是
 * **边界锐利、色块真分得开**的横带（本仓库零贴图资产，斑纹只能靠几何）。
 *
 * 这里要的是斑块不是横带，但办法是同一个：这一小片曲面用**与体壁完全同一个
 * 参数方程** `surfaceAt(u, θ)` 采样出来，边界是 (u, θ) 参数域里的一个椭圆
 * （所以斑的轮廓是随体形走的卵圆，不是一块长方形贴纸）。
 *
 * 唯一与体壁的差别是沿法线外移 `SPOT_LIFT` —— 0.001，体径的 1%，
 * 只为让两层共面的三角形不互相闪烁（z-fighting）。这个量大于体壁放样多边形
 * 的弦高（周向 40 段 0.0003、轴向每节 8 段 0.0003），所以斑既不会陷进体壁、
 * 也不构成任何可见的隆起：实测斑上最外的顶点离体壁曲面 0.0015
 * （压扁小球那一版是 0.024，差 16 倍）。测试里有一条专门量它，改回球会当场红。
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
  mesh.name = 'orange-spot'
  return mesh
}

// ---------------------------------------------------------------- 建模主体

/**
 * 长橙斑的体节（0=T1，3=A1，6=A4）：斑心的方位角，以及斑在 (u, θ) 参数域里的
 * 两个半轴。三处的 θ 都取 40°，与该节**背侧那对疣突同一个方位** ——
 * 真实幼虫的橙就是以疣突为中心铺开的，疣突从这块颜色里长出来。
 */
const SPOT_SITES: readonly { seg: number; theta: number; uHalf: number; thHalf: number }[] = [
  { seg: 0, theta: 40, uHalf: 0.034, thHalf: 26 }, // 前胸两侧的小橙斑
  { seg: 3, theta: 40, uHalf: 0.055, thHalf: 32 }, // A1：最显眼的一对
  { seg: 6, theta: 40, uHalf: 0.05, thHalf: 32 }, // A4：第二对
]

/** 长疣突的体节：0~10（末节 A9 已收得太细，再插疣突会读成一撮杂毛） */
const TUBERCLE_SEGMENTS = 11
/** 每节四枚：背侧一对（40°）+ 体侧一对（84°） */
const TUBERCLE_THETAS: readonly number[] = [40, 84]

export function buildLadybirdLarva(): InsectModel {
  const g = new THREE.Group()

  const bodyMat = chitin({ color: BODY_COLOR, gloss: 0.34, clearcoat: 0.16 })
  const tubercleMat = chitin({ color: TUBERCLE_COLOR, gloss: 0.4, clearcoat: 0.2 })
  const setaMat = chitin({ color: SETA_COLOR, gloss: 0.3 })
  const spotMat = chitin({ color: SPOT_COLOR, gloss: 0.42, clearcoat: 0.22 })
  const headMat = chitin({ color: HEAD_COLOR, gloss: 0.6, clearcoat: 0.4, surface: 'punctate' })
  const mandibleMat = chitin({ color: MANDIBLE_COLOR, gloss: 0.6, clearcoat: 0.35 })
  const legMat = chitin({ color: LEG_COLOR, gloss: 0.45, clearcoat: 0.2 })
  const eyeMat = chitin({ color: '#0a0a0c', gloss: 0.8, clearcoat: 0.6 })

  // ---- 体躯：一整根放样管，每节 4 个截面，节间缢缩烘在包络里
  {
    const sections: Section[] = []
    // 每节 8 个截面（原 4）。轴向细分不只是为了光滑：橙斑是按**解析曲面**采样的，
    // 而放样面是截面之间的直纹，两者的偏差 = 直纹割弦的矢高。每节 4 段时节间缢缩
    // 那道正弦让矢高到 0.0011，加上防闪烁的 0.001 外移，斑最外的点离体壁有
    // 0.0033；加密到 8 段后矢高降到 0.0003，斑基本就贴在面上了。
    const steps = SEGMENTS * 8
    for (let i = 0; i <= steps; i++) {
      const u = i / steps
      const a = axis(u)
      const r = girth(u)
      sections.push({ at: a, ry: Math.max(r * RY, 1e-4), rz: Math.max(r * RZ, 1e-4) })
    }
    // 周向 40 段（原 26）：目视验收说背脊上看得出棱。40 段下多边形弦高只剩
    // 0.0003，既抹掉了面片感，也让橙斑那 0.001 的外移稳稳落在体壁之外
    const body = new THREE.Mesh(loft(sections, 40), bodyMat)
    body.name = 'larva-body'
    g.add(body)
  }

  // ---- 橙斑：A1 / A4 的显眼一对 + 前胸的小一对。斑是体壁的一块颜色，疣突从里面长出来
  const spotSet = new Set<string>()
  for (const site of SPOT_SITES) {
    const u = (site.seg + 0.5) / SEGMENTS
    for (const side of [1, -1] as const) {
      g.add(surfaceSpot(u, site.theta * side, site.uHalf, site.thHalf, spotMat))
    }
    spotSet.add(`${site.seg}`)
  }

  // ---- 疣突 + 刚毛：11 节 × (背侧一对 + 体侧一对) = 44 枚
  for (let seg = 0; seg < TUBERCLE_SEGMENTS; seg++) {
    const u = (seg + 0.5) / SEGMENTS
    // 疣突随体躯一起收细：尾段体径只剩三分之一，疣突还按胸部的尺寸长就成了刺猬
    const scale = THREE.MathUtils.clamp(girth(u) / 0.098, 0.55, 1)
    const height = 0.032 * scale
    const baseR = 0.024 * scale
    for (const theta of TUBERCLE_THETAS) {
      for (const side of [1, -1] as const) {
        const { pos, normal } = surfaceAt(u, theta * side)
        // 背侧那对若落在橙斑上，连疣突一起换成橙色
        const mat = theta < 60 && spotSet.has(`${seg}`) ? spotMat : tubercleMat
        g.add(tubercleMesh(pos, normal, height, baseR, mat))

        // 顶端 3 根短刚毛，绕法线撒开 38°
        const tip = pos.clone().addScaledVector(normal, height)
        const { t1, t2 } = basisOf(normal)
        const cone = THREE.MathUtils.degToRad(38)
        for (let k = 0; k < 3; k++) {
          const phi = (k / 3) * Math.PI * 2 + seg * 0.7
          const dir = normal
            .clone()
            .multiplyScalar(Math.cos(cone))
            .addScaledVector(t1, Math.cos(phi) * Math.sin(cone))
            .addScaledVector(t2, Math.sin(phi) * Math.sin(cone))
            .normalize()
          g.add(setaMesh(tip, dir, 0.042 * scale, setaMat))
        }
      }
    }
  }

  // ---- 3 对胸足（T1~T3），**没有腹足**。走 kit.legPair()，与成虫的足同一套骨架
  const thoracic: readonly (readonly [number, number])[] = [
    [0.5, -20],
    [1.5, 4],
    [2.5, 28],
  ]
  for (const [seg, sweep] of thoracic) {
    const u = seg / SEGMENTS
    const a = axis(u)
    const r = girth(u)
    g.add(
      legPair(
        {
          base: [a.x, a.y - r * RY * 0.75, r * RZ * 0.62],
          femur: 0.115,
          tibia: 0.105,
          tarsus: 0.055,
          thickness: 0.016,
          splay: 44,
          sweep,
          knee: 78,
          ankle: 62,
        },
        legMat,
      ),
    )
  }

  // ---- 头壳：小、深、略扁，后半截插进前胸里
  const headCenter = new THREE.Vector3(0.462, axis(0).y + 0.008, 0)
  const headR = 0.055
  const head = new THREE.Mesh(new THREE.SphereGeometry(headR, 24, 18), headMat)
  head.scale.set(1.05, 0.92, 0.95)
  head.position.copy(headCenter)
  head.name = 'head-capsule'
  g.add(head)

  // 单眼（stemmata）：鞘翅目幼虫每侧 3 枚小单眼，不是复眼。做小、做黑、做亮
  for (const side of [1, -1] as const) {
    for (const [dx, dy, dz] of [
      [0.022, 0.012, 0.041],
      [0.03, -0.004, 0.038],
      [0.016, -0.014, 0.042],
    ] as const) {
      const s = new THREE.Mesh(new THREE.SphereGeometry(0.0075, 10, 8), eyeMat)
      s.position.set(headCenter.x + dx, headCenter.y + dy, dz * side)
      s.name = 'stemma'
      g.add(s)
    }
  }

  // 咀嚼式口器：一对镰刀状上颚，吃蚜虫全靠它
  g.add(mandibles({ at: [0.505, headCenter.y - 0.018, 0.02], length: 0.05, spread: 0.4, curve: 0.6 }, mandibleMat))

  // 触角极短（3 节，一两毫米），与上颚完全不是一回事，这里如实做小
  for (const side of [1, -1] as const) {
    const b = new THREE.Vector3(0.505, headCenter.y + 0.005, side * 0.032)
    const antenna = new THREE.Mesh(
      loft(
        [
          { at: b, ry: 0.008, rz: 0.008 },
          { at: b.clone().add(new THREE.Vector3(0.018, 0.004, side * 0.008)), ry: 0.005, rz: 0.005 },
          { at: b.clone().add(new THREE.Vector3(0.032, 0.004, side * 0.014)), ry: 0.0025, rz: 0.0025 },
        ],
        8,
      ),
      mandibleMat,
    )
    antenna.name = 'head-antenna'
    g.add(antenna)
  }

  // ---- 锚点：全部落在真有几何的位置上
  const a1 = surfaceAt((3 + 0.5) / SEGMENTS, 40)
  const tub = surfaceAt((5 + 0.5) / SEGMENTS, 84)
  const tubScale = THREE.MathUtils.clamp(girth((5 + 0.5) / SEGMENTS) / 0.098, 0.55, 1)
  const anchors: Record<string, THREE.Vector3> = {
    head: headCenter.clone().add(new THREE.Vector3(0.01, headR * 0.85, 0)),
    // 疣突锥顶：`tubercleMesh` 的最外一段就落在 pos + normal*height
    tubercle: tub.pos.clone().addScaledVector(tub.normal, 0.032 * tubScale),
    spot: a1.pos.clone().addScaledVector(a1.normal, SPOT_LIFT),
    tail: axis(0.97).clone().add(new THREE.Vector3(0, girth(0.97) * RY, 0)),
  }

  return finalize(g, anchors)
}
