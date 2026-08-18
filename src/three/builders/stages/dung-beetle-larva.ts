/**
 * 神农洁蜣螂 · 幼虫（蛴螬）Catharsius molossus（完全变态第 2 阶段）
 *
 * ## 贯穿三个阶段的语境：育儿粪梨（brood pear）
 *
 * 蜣螂把粪滚成球、埋进地下、做成一个梨形的育儿室，在梨的窄端产卵，幼虫就在
 * 梨腔里吃着长大、就地化蛹。三个阶段共用这一个语境，它顺手解决了第一批
 * 「卵没有结构就读成珍珠」的问题 —— 招牌不在虫身上时，语境就是招牌。
 *
 * **粪梨做成纵向半剖，不用半透。** 理由与柞蚕茧那件（silk-moth-pupa.ts）同源：
 * 粪梨是不透光的实心团块，半透是好看但假的；而 transmission 隔着 0.45 的壁看
 * 一条乳白的虫，出来只是一团更暗的褐，「里面有条虫」这个唯一看点会直接消失。
 * 剖开则同时留住完整外形：开口只挖掉朝向观众的那 128°，底、远侧壁与整段颈都在，
 * 从后方看仍是一枚完整的梨。
 *
 * ## 粪梨表面：三个尺度叠加，绝不是「磨砂球」
 *
 * 第一批独角仙的卵栽在「一圈大小相近、滚圆、同色的小球」上，读成巧克力球。
 * 粪梨更大更显眼，栽了更难看。真实的粪梨是母虫用足和头压实出来的粗糙团块，
 * 它的辨识特征是**尺度差**，不是「粗糙度」这个标量：
 *
 * 1. **指压痕**：母虫塑形时压出的大凹陷，直径半厘米以上、深一两毫米（DENTS）。
 * 2. **团块**：粪料被抟合时留下的不匀鼓包，格距 0.66 厘米（特征约 1.3 厘米宽）。
 * 3. **纤维颗粒**：草料纤维的细粒，格距 0.17 厘米，且**各向异性**
 *    （轴向格距 0.48，约为周向的 2.8 倍）—— 纤维是顺着抹开的，
 *    各向同性的细噪声出来是砂纸。
 * 再叠一层**干裂纹**（脊线噪声的负向）：埋进土里几天的粪梨表面会失水开裂。
 *
 * 三层的格距 1.75 / 0.66 / 0.17 厘米，两两之比 2.65 与 3.88，**刻意不成整数比**：
 * 整数比会让三层的峰谷周期性地对齐，叠出规则花纹 —— 那正是程序化偷懒的样子。
 * 测试按三个频带分别断言，而且要求三带的能量**相当**（谱形是平的）——
 * 单层噪声把振幅调大时三个下限都能过，它与三层的区别只在谱形：
 * 单层是尖的（中带独大），三层是平的。这条是变异测试逼出来的。
 *
 * ## 这条蛴螬必须跟独角仙那条分得开
 *
 * 同为金龟总科的 C 形幼虫，不做区分的话读者只会觉得「又是同一条虫」。
 * 四处差别都是真实的形态学差异，不是为了不同而不同：
 *
 * | | 独角仙蛴螬 | 本种蛴螬 |
 * | --- | --- | --- |
 * | 体长 | 8~10 厘米（弧长 8.35） | 4~5 厘米（弧长 4.15 + 头 0.42） |
 * | 背部 | 均匀圆筒 | **背中前部一个明显的驼峰**（净凸出 0.24 ≈ 体半径的四成） |
 * | 体型 | 细长（最粗半径 / 弧长 = 0.103） | **短粗**（0.150） |
 * | 蜷曲 | 缺口 70°（端点距 / 弧长 0.228） | **更紧**（缺口 58°，0.178） |
 * | 体色 | 纯乳白 #ecdfc2（饱和度 0.53） | **灰白偏黄** #d9d2bd（饱和度 0.27） |
 * | 头壳 | 宽 = 体最粗处的 0.57 | **相对更小**（0.38） |
 *
 * 这五个数都在 `__tests__/dung-beetle-stages.test.ts` 里**对着独角仙那条实测**，
 * 不是照着注释抄的常数：任何一条退回独角仙那一档，对应断言会红。
 *
 * 驼峰不是装饰：金龟子亚科（蜣螂）幼虫的背中隆起是真实特征，幼虫靠它在粪腔里
 * 支撑身体、用尾端的粪便糊平腔壁。实现上不是「贴一个包」——那会读成一个瘤 ——
 * 而是把中心线本身沿背向外移 h(t)、同时把背腹半径也加 h(t)，于是腹面完全不动、
 * 背面净凸出 2h。峰形前陡后缓（前侧宽 0.10、后侧 0.15），正圆的包会读成机械感。
 *
 * ## 两条会毁掉这只虫的陷阱（都是第一批实撞出来的）
 *
 * 1. **C 形不能靠「把直筒掰弯」蒙混。** 这里沿一条真正的 C 形路径 `loft` 放样，
 *    圆心角 302°、缺口 58°，截面中段最粗、两端收细。
 * 2. **腹端收成尖锥 + 节间沟太深会读成松果**（黑翅土白蚁兵蚁那一轮栽过）。
 *    所以 GROOVE 只有 0.05 且是窄折痕（`cos^6`）而不是宽凹槽，尾端最后 5%
 *    用球冠收口而不是收尖。
 *
 * ## 颜色纪律
 *
 * 乳白 / 灰白的虫是「压深一档」这条经验反过来最危险的一只：压深就是脏灰，
 * 不压又会在 ACES 下过曝成白铬（七星瓢虫、甘薯腊龟甲栽的都是这个）。
 * 解法不是调基色而是**调材质**：体壁绝不用 `elytra()` 那档清漆，
 * 而用 `chitin({ gloss: 0.2, clearcoat: 0.03, translucent: true })` ——
 * 哑光 + 次表面透光，高光根本没有机会顶到过曝区。
 *
 * 局部坐标系与成虫一致：+X 向前、+Y 向上、+Z 向右。粪梨的轴沿 +Y（颈朝上，
 * 真实粪梨就是这么埋的），幼虫的 C 画在 XY（矢状）平面里 —— 默认机位与侧机位
 * 都从 +Z 看过来，剖口也开在 +Z，这样一眼能看到完整的 C。
 */
import * as THREE from 'three'
import { chitin, finalize, legPair, loft, type InsectModel, type Section } from '../kit'

// ================================================================ 通用工具

/** 分段线性 + smoothstep 的关键帧插值 */
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
 * 确定性整数散列。表面起伏必须是**可复现**的随机：同一份代码在任何机器、
 * 任何一次构建里都要长成同一枚粪梨，否则目视验收过的那张图跟用户看到的
 * 不是同一个东西（这条纪律与 surface.ts 的程序贴图一致）。
 */
function hash2(x: number, y: number, seed: number): number {
  let h = Math.imul(x | 0, 0x27d4eb2d) ^ Math.imul(y | 0, 0x165667b1) ^ (seed | 0)
  h = Math.imul(h ^ (h >>> 15), 0x2c1b3c6d)
  h ^= h >>> 12
  h = Math.imul(h, 0x297a2d39)
  h ^= h >>> 15
  return (h >>> 0) / 4294967296
}

/** 二维值噪声，值域 [-1, 1]。格点用 hash2，格内用 smoothstep 插值 */
function valueNoise(x: number, y: number, seed: number): number {
  const xi = Math.floor(x)
  const yi = Math.floor(y)
  const xf = x - xi
  const yf = y - yi
  const u = xf * xf * (3 - 2 * xf)
  const v = yf * yf * (3 - 2 * yf)
  const a = hash2(xi, yi, seed)
  const b = hash2(xi + 1, yi, seed)
  const c = hash2(xi, yi + 1, seed)
  const d = hash2(xi + 1, yi + 1, seed)
  return (a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v) * 2 - 1
}

/**
 * 转过一个角度再取噪声。
 *
 * 值噪声的格子是轴对齐的，直接叠三层会在表面上留下一层横平竖直的方格结构 ——
 * 出图上表现为一圈圈绕着梨身的「年轮」（第一版实撞，顶视里最刺眼）。
 * 每层各转一个互不相同、也不与 90° 成简单比的角度，格子的痕迹就互相抵消了。
 */
function rotNoise(x: number, y: number, deg: number, seed: number): number {
  const a = THREE.MathUtils.degToRad(deg)
  const c = Math.cos(a)
  const s = Math.sin(a)
  return valueNoise(x * c + y * s, -x * s + y * c, seed)
}

// ================================================================ 育儿粪梨

/** 粪梨全高（厘米）。梨体最粗处直径 4.06、颈长约 1.3 —— 真实育儿粪梨的量级 */
const PEAR_H = 5.4

/**
 * 外轮廓关键帧：v（0 = 底极，1 = 颈尖）→ 半径。
 * v ≤ 0.62 是梨体（近球），0.62~0.76 收肩，0.76 以上是那截颈 ——
 * **颈是「梨」与「球」的全部区别**，不能因为它在颈里藏着卵就做短。
 *
 * 颈不是一根锥：0.82~0.96 之间先收一道腰（0.53）再鼓成一个圆头（0.57）。
 * 法布尔画的粪梨窄端就是这样一枚**乳头状的小突**。第一版按单调收细做，
 * 出图（尤其卵那一件只保留颈的时候）整个读成一顶帐篷 —— 一段直锥没有任何
 * 可指认的形状，这道腰是它读成「梨颈」而不是「三角形」的唯一依据。
 */
const PEAR_PROFILE = [
  [0.0, 0.0],
  [0.05, 0.68],
  [0.14, 1.32],
  [0.26, 1.82],
  [0.4, 2.03],
  [0.52, 1.95],
  [0.62, 1.7],
  [0.7, 1.3],
  [0.76, 0.88],
  [0.82, 0.6],
  [0.87, 0.53],
  [0.92, 0.57],
  [0.96, 0.48],
  [0.99, 0.24],
  [1.0, 0.0],
] as const

function pearRadius(v: number): number {
  return keyframe(PEAR_PROFILE, v)
}

/**
 * 剖口：材料保留的方位角区间。窗口中心正对 +Z（展台默认机位 (0.86,0.44,1.25)
 * 与侧机位都在那一侧），半宽 64°。
 *
 * 64° 是算出来的不是拍的：腔半径 1.70，一条水平视线要被壁挡住，侧向偏移得达到
 * `腔半径 × sin(64°) = 1.53`；而蜷起来的幼虫躯干侧向最远只到 1.33。
 * 也就是说这个窗口宽度**恰好让整条虫都露出来**，再窄就开始切掉虫的两侧，
 * 再宽（>150°）整枚梨就要读成一只碗（柞蚕茧那件挖到 155° 时就是这个症状）。
 */
const WINDOW_HALF_DEG = 64
const PHI_START = THREE.MathUtils.degToRad(90 + WINDOW_HALF_DEG)
const PHI_SPAN = THREE.MathUtils.degToRad(360 - 2 * WINDOW_HALF_DEG)

/**
 * 指压痕：母虫塑形时用足与头压出的大凹陷。[v, 方位角°, 深度, 高斯半径(厘米)]。
 * 位置刻意不规整、深浅不一 —— 均匀分布的一圈坑就成了高尔夫球。
 * 方位角集中在 150°~390° 一带，那正是剖开后仍留在画面里的半边。
 */
const DENTS: readonly (readonly [number, number, number, number])[] = [
  [0.2, 205, 0.22, 0.78],
  [0.33, 168, 0.15, 0.52],
  [0.31, 268, 0.26, 0.86],
  [0.47, 232, 0.18, 0.62],
  [0.46, 330, 0.21, 0.72],
  [0.58, 190, 0.13, 0.5],
  [0.61, 300, 0.19, 0.66],
  [0.72, 250, 0.12, 0.44],
  [0.24, 355, 0.16, 0.58],
] as const

/**
 * 三层起伏的**格距**（厘米），比值 2.65 / 3.88，刻意不成整数比（理由见文件头）。
 *
 * ⚠️ 格距不是波长：值噪声一个完整的起落要跨两格，所以肉眼看到的特征尺寸
 * 约是这里数字的两倍。第一版按「波长」直接填了 3.1 / 1.13 / 0.33，出图上
 * 三层全糊成一片缓坡 —— 最细那层的实际特征已经 0.66 厘米宽，在一枚 4 厘米的
 * 梨上根本不算「颗粒」。所以这组数看着小得反常，是对的。
 */
const GRAIN_COARSE = 1.75
const GRAIN_MID = 0.66
const GRAIN_FINE = 0.17
/** 细层的轴向格距：约为周向的 2.8 倍 = 纤维顺着抹开的方向拉长，不是砂粒 */
const GRAIN_FINE_AXIAL = 0.48

/**
 * 周向坐标用的**参考半径**，不是该处的真实半径。
 *
 * 第一版用 `phi * pearRadius(v)`（真实弧长）当噪声的周向坐标，看着更「正确」，
 * 出图却在梨身上刷出一圈圈年轮：沿 v 走时半径在变，于是同一个 φ 上噪声坐标
 * 同时在两个轴上跑，纹理被拉成了绕轴的环带。用固定参考半径就没有这个耦合，
 * 代价只是颈部的纹理比梨体细一点 —— 而那恰好是对的（窄处的粪料压得更实）。
 */
const GRAIN_REF_R = 1.5

/** 粪梨外表面在 (v, φ) 处相对光滑轮廓的偏移量 */
/**
 * 两极附近的淡出系数。
 *
 * 极点处半径趋于 0，那一圈的方位角采样间距已经小到几分之一毫米：径向位移在
 * 那里既没有意义，还会把细层采成一圈**放射状的锯齿**（顶视里最刺眼，
 * 一眼看去像模型破了）。那是采样不足的假象，不是模型的花纹 ——
 * 按半径淡出即可，代价只是颈尖那一小块更平，而它本来就该更平。
 */
function poleFade(v: number): number {
  return THREE.MathUtils.clamp((pearRadius(v) - 0.12) / 0.7, 0, 1)
}

function pearOffset(v: number, phi: number): number {
  const r = Math.max(pearRadius(v), 0.25)
  const s = v * PEAR_H
  const a = phi * GRAIN_REF_R
  const coarse = rotNoise(s / GRAIN_COARSE, a / GRAIN_COARSE, 27, 0x51a3) * 0.14
  const mid = rotNoise(s / GRAIN_MID, a / GRAIN_MID, -41, 0xa7c1) * 0.075
  // 细层只转 15°：转多了各向异性就被转没了，纤维的方向感是这一层的全部意义
  const fine = rotNoise(s / GRAIN_FINE_AXIAL, a / GRAIN_FINE, 15, 0x3d09) * 0.032

  /*
   * 干裂纹：粪梨埋进土里几天后表面会失水开裂。用「脊线噪声」的负向
   * （1 − |noise| 的高次幂）挖出一条条窄而不规则的沟 —— 与三层起伏叠在一起，
   * 「压实的粗糙团块」才有它最后那一点辨识度。
   */
  const ridge = Math.abs(rotNoise(s / 0.95, a / 0.95, 11, 0x60f7))
  const crack = 0.1 * Math.pow(Math.max(0, 1 - ridge * 6.5), 3)

  let dent = 0
  for (const [dv, deg, depth, sigma] of DENTS) {
    const da = (v - dv) * PEAR_H
    let dphi = phi - THREE.MathUtils.degToRad(deg)
    while (dphi > Math.PI) dphi -= Math.PI * 2
    while (dphi < -Math.PI) dphi += Math.PI * 2
    const db = dphi * r
    dent += depth * Math.exp(-(da * da + db * db) / (sigma * sigma))
  }

  const taper = poleFade(v)
  return (coarse + mid + fine - crack - dent) * taper
}

/**
 * 表面色调的不匀（乘在基色上的明度系数）。
 *
 * 独角仙那颗卵的土室给的教训是「两档深浅不够，土的不匀撑不起来」，那里的解法是
 * 五档材质轮换。这里是一整片连续曲面，轮换材质做不到，改用**顶点色** ——
 * 同一件事的连续版本：凹处压暗、凸处提亮，再叠一层与几何无关的斑驳。
 * 没有它，无论几何多起伏，一整片同色的褐都会读成一颗巧克力。
 */
function pearTint(v: number, phi: number): number {
  const s = v * PEAR_H
  const a = phi * GRAIN_REF_R
  const patch = rotNoise(s / 0.72, a / 0.72, -17, 0x9b22) * 0.18
  const speck = rotNoise(s / 0.2, a / 0.11, 49, 0x2c88) * 0.11
  // 凹下去的地方本来就更暗（环境光被挡）：把几何位移的一部分也算进色调
  const cavityShade = THREE.MathUtils.clamp(pearOffset(v, phi) * 1.1, -0.16, 0.08)
  // 斑驳同样要在两极淡出，否则顶视上那一圈会跟着采样密度闪成放射状的花
  return THREE.MathUtils.clamp(1 + (patch + speck) * poleFade(v) + cavityShade, 0.62, 1.32)
}

function pearOuterRadius(v: number, phi: number): number {
  return Math.max(pearRadius(v) + pearOffset(v, phi), 0.002)
}

/**
 * 梨腔：末龄幼虫已经把内壁啃出一圈圈的凹坑，所以腔壁**不光滑** ——
 * 这是与另外两个阶段的分工：卵所在的孵化室是母虫抹平的（极光滑），
 * 蛹室是幼虫用粪便糊平的（较平），只有正在被吃的这个腔是啃过的。
 * 一枚三个阶段都一样光滑的腔，等于把「幼虫在里面吃」这件事抹掉了。
 */
const CAVITY_Y = 2.15
const CAVITY_HY = 1.76
const CAVITY_HR = 1.7

function cavityPoint(vc: number, phi: number): { r: number; y: number } {
  const u = 2 * vc - 1
  const y = CAVITY_Y + u * CAVITY_HY
  const shell = Math.sqrt(Math.max(0, 1 - u * u))
  // 底面略宽：幼虫压在腔底，腔不是正椭球
  const base = CAVITY_HR * shell * (1 - 0.06 * u)
  const gnaw =
    (rotNoise(y / 0.8, (phi * GRAIN_REF_R) / 0.8, 19, 0x7712) * 0.075 +
      rotNoise(y / 0.28, (phi * GRAIN_REF_R) / 0.28, -53, 0xbe31) * 0.04) *
    shell
  return { r: Math.max(base + gnaw, 0.004), y }
}

/** 腔壁的色调不匀：比外壁弱一档（腔里本来就暗，斑驳看不太出来），但不能一点没有 */
function cavityTint(vc: number, phi: number): number {
  const y = CAVITY_Y + (2 * vc - 1) * CAVITY_HY
  return THREE.MathUtils.clamp(1 + rotNoise(y / 0.45, (phi * GRAIN_REF_R) / 0.45, 33, 0x4411) * 0.12, 0.8, 1.2)
}

/** 轴线上的细孔半径：剖面多边形沿轴的两段边不能真的落在 r=0 上，否则退化自交 */
const AXIS_R = 0.004

const OUTER_RINGS = 58
const CAVITY_RINGS = 32
const AZIMUTH = 156

/**
 * 旋转面：沿方位角扫过 PHI_SPAN，逐点按各自的位移取半径，并把色调不匀
 * 烘进顶点色（材质那边开 vertexColors 即可，基色仍是材质上那一个）。
 */
function revolve(
  rings: number,
  point: (v: number, phi: number) => { r: number; y: number },
  tint: (v: number, phi: number) => number,
): THREE.BufferGeometry {
  const pos: number[] = []
  const uv: number[] = []
  const col: number[] = []
  const idx: number[] = []
  for (let i = 0; i <= rings; i++) {
    const v = i / rings
    for (let j = 0; j <= AZIMUTH; j++) {
      const phi = PHI_START + (PHI_SPAN * j) / AZIMUTH
      const p = point(v, phi)
      pos.push(p.r * Math.cos(phi), p.y, p.r * Math.sin(phi))
      uv.push(j / AZIMUTH, i / rings)
      const m = tint(v, phi)
      // 亮处偏暖、暗处偏冷：单纯的明度缩放读起来像脏，带一点色温位移才像材料
      col.push(m * (m > 1 ? 1.02 : 0.99), m, m * (m > 1 ? 0.95 : 1.03))
    }
  }
  const row = AZIMUTH + 1
  for (let i = 0; i < rings; i++) {
    for (let j = 0; j < AZIMUTH; j++) {
      const a = i * row + j
      idx.push(a, a + row, a + 1, a + row, a + row + 1, a + 1)
    }
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2))
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3))
  g.setIndex(idx)
  g.computeVertexNormals()
  return g
}

/**
 * 剖面：把某个方位角上的「外轮廓 + 轴 + 腔轮廓 + 轴」围成的多边形填成一片。
 *
 * 关键是这片剖面**用的就是该方位角上位移后的那两条轮廓**，不是光滑轮廓 ——
 * 否则剖口边缘会与外表面差出一整个起伏量，出图上是一道贯穿的裂缝。
 * （柞蚕茧那件用的是 LatheGeometry + 未位移的 ShapeGeometry，能对齐是因为
 * 它的壳面本来就没有位移；这里表面是逐点位移的，必须现算。）
 */
function sectionFace(phi: number, material: THREE.Material): THREE.Mesh {
  const pts: THREE.Vector2[] = []
  for (let i = 0; i <= OUTER_RINGS; i++) {
    const v = i / OUTER_RINGS
    pts.push(new THREE.Vector2(Math.max(pearOuterRadius(v, phi), AXIS_R), v * PEAR_H))
  }
  const top = cavityPoint(1, phi)
  pts.push(new THREE.Vector2(AXIS_R, top.y))
  for (let i = CAVITY_RINGS; i >= 0; i--) {
    const p = cavityPoint(i / CAVITY_RINGS, phi)
    pts.push(new THREE.Vector2(Math.max(p.r, AXIS_R), p.y))
  }
  pts.push(new THREE.Vector2(AXIS_R, 0))

  const geo = new THREE.ShapeGeometry(new THREE.Shape(pts))
  /*
   * 剖面的顶点色：earcut 只用给进去的边界点，所以这里每个顶点都在轮廓上，
   * 按它的高度取一条竖向的斑驳 —— 切开的粪料断面本来就是一层层不匀的。
   * 没有它，两片剖面就是两块平涂的色板，整枚梨读成折纸。
   */
  const fpos = geo.getAttribute('position')
  const fcol: number[] = []
  for (let i = 0; i < fpos.count; i++) {
    const m = THREE.MathUtils.clamp(
      1 + rotNoise(fpos.getY(i) / 0.3, fpos.getX(i) / 0.3, 37, 0xdd41) * 0.13,
      0.82,
      1.18,
    )
    fcol.push(m * 1.01, m, m * 0.97)
  }
  geo.setAttribute('color', new THREE.Float32BufferAttribute(fcol, 3))
  // ShapeGeometry 躺在 XY 平面（x = 半径、y = 轴向高度），按方位角立起来
  const e1 = new THREE.Vector3(Math.cos(phi), 0, Math.sin(phi))
  const e2 = new THREE.Vector3(0, 1, 0)
  const e3 = new THREE.Vector3().crossVectors(e1, e2)
  geo.applyMatrix4(new THREE.Matrix4().makeBasis(e1, e2, e3))
  const mesh = new THREE.Mesh(geo, material)
  mesh.name = 'pear-cut'
  return mesh
}

/** 粪梨（半剖）：外壳 + 腔壁 + 两片剖面 */
function broodPear(shellMat: THREE.Material, cavityMat: THREE.Material, cutMat: THREE.Material): THREE.Group {
  const g = new THREE.Group()

  const shell = new THREE.Mesh(
    revolve(OUTER_RINGS, (v, phi) => ({ r: pearOuterRadius(v, phi), y: v * PEAR_H }), pearTint),
    shellMat,
  )
  shell.name = 'pear-shell'
  g.add(shell)

  const cavity = new THREE.Mesh(revolve(CAVITY_RINGS, cavityPoint, cavityTint), cavityMat)
  cavity.name = 'pear-chamber'
  g.add(cavity)

  g.add(sectionFace(PHI_START, cutMat))
  g.add(sectionFace(PHI_START + PHI_SPAN, cutMat))
  return g
}

// ================================================================ 蛴螬

/** 躯干中心线弧长（不含头壳）。加上头壳 0.42 ≈ 4.6 厘米，落在 4~5 的中间 */
const TRUNK_ARC = 4.15
/** 头壳伸出躯干前端的长度 */
const HEAD_OUT = 0.42
/**
 * C 的圆心角 302°，留 58° 缺口 —— 独角仙那条是 290° / 70°。
 *
 * ⚠️ 这个数是**量出来的**，不是拍的。第一版取 330°（缺口 30°）：真实的蜣螂
 * 蛴螬确实卷得这么死，但头壳本身要占掉缺口的 30° 上下，出图上头尾一相接，
 * 整条虫读成一个甜甜圈 —— 「C 形」这个招牌反而没了。按独角仙那轮的剪影判据
 * （从质心射 72 条射线，全被围住就是 O 不是 C）实测：330° 时 71/72 全中，
 * 302° 才落回 C 的区间。缺口仍比独角仙窄，「更紧」这条差别靠 chord/arc
 * （0.15 对 0.23）与整体轮廓维持，不靠把缺口关死。
 * 起点 26° 不能再小：`loft()` 的第一个截面用 ref=(0,1,0) 做平行传输，
 * 起点切向一旦逼近 +Y（|ref·t| > 0.98）它会改用 (0,0,1)，整条虫的截面
 * 会当场转 90°（背腹半径变成左右半径）。26° 时 |ref·t| = 0.899，安全。
 */
const CURL_START_DEG = 26
const CURL_SPAN_DEG = 302
/** 中心线的螺旋量：前段外张、尾段内收各 5%，破掉正圆的机械感 */
const SPIRAL = 0.05
/** 可见体节数：3 胸节 + 10 腹节 */
const SEGMENTS = 13
const SEG_SAMPLES = 8
const RADIAL = 24
/** 节间沟深度（占该处半径的比例）。松果红线：超过 0.09 就开始读成鳞片 */
const GROOVE = 0.05
/** 节内鼓起量：体节的「饱满」靠节中微凸，不靠节间深挖 */
const PLUMP = 0.03
/** 腹端变深的起点（沿弧长的比例）：最后约 2.9 节 */
const DARK_TAIL_FROM = 0.78

/** 驼峰：位置、前后侧宽度、中心线外移量。背面净凸出 = 2 × RISE = 0.24（体最粗半径 0.62 的 39%） */
const HUMP_AT = 0.32
const HUMP_W_FRONT = 0.1
const HUMP_W_BACK = 0.15
const HUMP_RISE = 0.12

// ---------------------------------------------------------------- 颜色

/** 体壁：灰白偏黄。饱和度 0.27，明显低于独角仙蛴螬的乳白 #ecdfc2（0.53） */
const BODY_COLOR = '#d9d2bd'
/** 腹端数节：后肠里的粪料透过体壁显出来的灰褐 */
const TAIL_COLOR = '#8d8571'
/** 头壳：黄褐的骨化壳。比体壁低 0.41 个明度，一眼看得出「头是硬的」 */
const HEAD_COLOR = '#96682f'
/** 大颚：更高度骨化，比头壳更深但不到近黑（近黑会把体积感一起吃掉） */
const MANDIBLE_COLOR = '#4a2c13'
/** 胸足：比体壁略深的蜡黄，否则贴在灰白身上分不出来 */
const LEG_COLOR = '#c6b993'
/** 爪与气门 */
const DARK_POINT_COLOR = '#5a3a1c'
/** 刚毛 */
const SETA_COLOR = '#9c7443'

/**
 * 粪梨的三档颜色。
 *
 * ⚠️ 第一版取 #54402c / #6d5941，**橙味太重**，配上光滑的曲面整枚读成一颗
 * 巧克力 —— 正是独角仙那颗卵栽过的坑（那次是「一圈滚圆同色的小球」，
 * 这次是「一整片同色的暖褐」，同一个病）。粪不是巧克力：它是**灰味**的黄褐，
 * 而且被剖面/腔壁分成明显的三档明度。
 * 也不能反过来压到近黑（#3f3226 那一档在 ACES 下同样读成巧克力，只是黑巧克力）。
 */
const DUNG_COLOR = '#6d6046'
/** 剖面：断面比外壁暗一档（切开的那一面本来就背着光），但仍保留粪料的黄灰 */
const DUNG_CUT_COLOR = '#5b5138'
/** 腔壁：最暗的一档，把乳白的虫衬出来 */
const DUNG_CAVITY_COLOR = '#443c2c'

// ---------------------------------------------------------------- 中心线

const CURL_START = THREE.MathUtils.degToRad(CURL_START_DEG)
const CURL_SPAN = THREE.MathUtils.degToRad(CURL_SPAN_DEG)

/** 驼峰在 t 处把中心线往背向推出多少 */
function hump(t: number): number {
  const w = t < HUMP_AT ? HUMP_W_FRONT : HUMP_W_BACK
  const d = (t - HUMP_AT) / w
  return HUMP_RISE * Math.exp(-d * d)
}

/** 卷曲半径 r0 下的中心线点（驼峰把它沿径向推出去，径向即背向） */
function curlPoint(t: number, r0: number): THREE.Vector3 {
  const phi = CURL_START + CURL_SPAN * t
  const r = r0 * (1 + SPIRAL * Math.cos(Math.PI * t)) + hump(t)
  return new THREE.Vector3(Math.cos(phi) * r, Math.sin(phi) * r, 0)
}

function pathLength(r0: number): number {
  const N = 600
  let len = 0
  let prev = curlPoint(0, r0)
  for (let i = 1; i <= N; i++) {
    const p = curlPoint(i / N, r0)
    len += p.distanceTo(prev)
    prev = p
  }
  return len
}

/**
 * 反解卷曲半径，让中心线弧长正好等于 TRUNK_ARC。
 *
 * 驼峰是个**绝对量**（不随 r0 缩放），所以不能像独角仙那条那样「按 r0=1 量一遍
 * 再等比放大」，只能二分。之所以还要较这个真：体长是这个阶段的招牌之一
 * （4~5 厘米，比独角仙那条短一半），改了圆心角或驼峰就悄悄变了长度的话，
 * 招牌得靠人肉维护。
 */
const CURL_R = (() => {
  let lo = 0.1
  let hi = 3
  for (let i = 0; i < 40; i++) {
    const mid = (lo + hi) / 2
    if (pathLength(mid) < TRUNK_ARC) lo = mid
    else hi = mid
  }
  return (lo + hi) / 2
})()

/**
 * 躯干半径包络：颈细 → 胸渐粗 → **腹前中段最粗（0.55）** → 缓缓收到尾端。
 * 最粗半径 / 弧长 = 0.150，独角仙那条是 0.103 —— 这就是「更短粗」的实际含义。
 */
const ENVELOPE = [
  [0.0, 0.2],
  [0.05, 0.33],
  [0.12, 0.44],
  [0.22, 0.51],
  [0.4, 0.55],
  [0.55, 0.53],
  [0.7, 0.47],
  [0.82, 0.4],
  [0.92, 0.32],
  [1.0, 0.26],
] as const

/** 尾端最后这一段用球冠收口，不收尖 —— 「尾端圆钝」的实现就在这一行 */
const TIP_ROUND_FROM = 0.95

function envelope(t: number): number {
  const base = keyframe(ENVELOPE, t)
  if (t <= TIP_ROUND_FROM) return base
  const u = (t - TIP_ROUND_FROM) / (1 - TIP_ROUND_FROM)
  return base * Math.sqrt(Math.max(0, 1 - u * u))
}

/** 节间起伏：窄折痕（`|cos|^6`）+ 节中微凸。宽凹槽在这么粗的软体上会读成松果 */
function ripple(t: number): number {
  const local = t * SEGMENTS - Math.floor(t * SEGMENTS)
  const crease = Math.pow(Math.abs(Math.cos(local * Math.PI)), 6)
  const fade = THREE.MathUtils.clamp((0.94 - t) / 0.12, 0, 1)
  return 1 - GROOVE * crease * fade + PLUMP * Math.sin(local * Math.PI) * fade
}

/**
 * 该处的背腹半径与左右半径。
 *
 * 驼峰同时做两件事：中心线外移 h（见 curlPoint）与背腹半径 +h（这里）。
 * 两者合起来 → 背面凸出 2h、**腹面纹丝不动**（(R+h) − (r+h) = R − r）。
 * 只做其中一件都不对：只推中心线是整段身体被抬起来（腹面跟着凹进去），
 * 只加半径是上下一起鼓（肚子也胖一圈），两种都不是驼峰。
 */
function radiiAt(t: number): { ry: number; rz: number } {
  const r = Math.max(envelope(t) * ripple(t), 1e-4)
  return { ry: r + hump(t), rz: r * 1.02 }
}

interface Frame {
  pos: THREE.Vector3
  forward: THREE.Vector3
  dorsal: THREE.Vector3
  lateral: THREE.Vector3
  ry: number
  rz: number
}

const LATERAL = new THREE.Vector3(0, 0, 1)

function frameAt(t: number): Frame {
  const h = 1e-3
  const a = curlPoint(Math.max(0, t - h), CURL_R)
  const b = curlPoint(Math.min(1, t + h), CURL_R)
  const tangent = new THREE.Vector3().subVectors(b, a).normalize() // 指向尾端
  const dorsal = new THREE.Vector3().crossVectors(tangent, LATERAL).normalize()
  const { ry, rz } = radiiAt(t)
  return { pos: curlPoint(t, CURL_R), forward: tangent.clone().negate(), dorsal, lateral: LATERAL.clone(), ry, rz }
}

/** 把一个 group 摆到体轴的某个标架上（局部 +X = 朝头、+Y = 背、+Z = 右） */
function orient(obj: THREE.Object3D, f: Frame): void {
  obj.position.copy(f.pos)
  obj.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(f.forward, f.dorsal, f.lateral))
}

// ---------------------------------------------------------------- 部件

/** 躯干：沿 C 形路径放样。offset > 0 时整体外扩，用来做腹端那层深色外壳 */
function trunkGeometry(from: number, to: number, offset: number): THREE.BufferGeometry {
  const total = Math.round((to - from) * SEGMENTS * SEG_SAMPLES)
  const sections: Section[] = []
  for (let i = 0; i <= total; i++) {
    const t = from + ((to - from) * i) / total
    const { ry, rz } = radiiAt(t)
    sections.push({ at: curlPoint(t, CURL_R), ry: ry + offset, rz: rz + offset })
  }
  return loft(sections, RADIAL)
}

/**
 * 头壳：一枚比躯干窄得多的骨化圆囊。
 * 最粗处半径 0.22（×1.08 的横向 = 0.238），头宽只有体最粗处的 0.38 倍 ——
 * 独角仙那条是 0.57 倍，「头壳相对更小」的实际含义就是这个数。
 * 后端 0.22 塞进躯干里，接缝天然被躯干包住。
 */
const HEAD_PROFILE = [
  [0.0, 0.14],
  [0.22, 0.19],
  [0.45, 0.22],
  [0.7, 0.2],
  [0.88, 0.15],
  [1.0, 0.05],
] as const

function headCapsule(material: THREE.Material): THREE.Mesh {
  const back = -0.22
  const span = 0.22 + HEAD_OUT
  const steps = 22
  const sections: Section[] = []
  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    const r = keyframe(HEAD_PROFILE, t)
    sections.push({ at: new THREE.Vector3(back + span * t, 0, 0), ry: r * 0.94, rz: r * 1.08 })
  }
  const mesh = new THREE.Mesh(loft(sections, 20), material)
  mesh.name = 'larva-head'
  return mesh
}

/**
 * 大颚：一对短粗的深色钳。啃粪料的口器不是捕食用的镰刀，所以短、钝、厚。
 *
 * ⚠️ 路径中段刻意外鼓（控制点 z = ±0.17），末端才收回到 ±0.07。
 * 这是黑翅土白蚁兵蚁那一轮用四次返工换来的：两颚在世界坐标里分得开，
 * 不等于在屏幕上分得开。分离量集中在颚的中段，顶视投影下两颚才真的不相交。
 */
function grubMandibles(material: THREE.Material): THREE.Group {
  const g = new THREE.Group()
  for (const side of [1, -1] as const) {
    const p0 = new THREE.Vector3(0.24, -0.04, side * 0.09)
    const p1 = new THREE.Vector3(0.37, -0.11, side * 0.17)
    const p2 = new THREE.Vector3(0.45, -0.16, side * 0.07)
    const steps = 12
    const sections: Section[] = []
    for (let i = 0; i <= steps; i++) {
      const t = i / steps
      const inv = 1 - t
      const at = new THREE.Vector3(
        inv * inv * p0.x + 2 * inv * t * p1.x + t * t * p2.x,
        inv * inv * p0.y + 2 * inv * t * p1.y + t * t * p2.y,
        inv * inv * p0.z + 2 * inv * t * p1.z + t * t * p2.z,
      )
      const r = THREE.MathUtils.lerp(0.062, 0.03, Math.pow(t, 0.85))
      sections.push({ at, ry: r, rz: r * 0.86 })
    }
    const m = new THREE.Mesh(loft(sections, 12), material)
    m.name = 'larva-mandible'
    g.add(m)
  }
  return g
}

/**
 * 三对胸足，全部长在紧靠头部的三节上（腹部一根附肢都没有 ——
 * 这是蛴螬与鳞翅目毛虫的分界线，画上腹足就是另一个目的虫）。
 *
 * 蜣螂幼虫的胸足**退化得比独角仙的更短**（它一辈子不用爬，就在粪梨里转身），
 * 所以 femur/tibia 只有独角仙那条的一半上下。
 */
const LEG_SPECS = [
  { t: 0.5 / SEGMENTS, femur: 0.26, tibia: 0.21, tarsus: 0.11, sweep: -28 },
  { t: 1.5 / SEGMENTS, femur: 0.3, tibia: 0.24, tarsus: 0.12, sweep: -6 },
  { t: 2.5 / SEGMENTS, femur: 0.34, tibia: 0.27, tarsus: 0.13, sweep: 14 },
] as const

function thoracicLegs(legMat: THREE.Material, clawMat: THREE.Material): THREE.Group {
  const g = new THREE.Group()
  for (const spec of LEG_SPECS) {
    const f = frameAt(spec.t)
    const holder = new THREE.Group()
    orient(holder, f)

    const pair = legPair(
      {
        base: [0, -0.5 * f.ry, 0.72 * f.rz],
        femur: spec.femur,
        tibia: spec.tibia,
        tarsus: spec.tarsus,
        splay: 16,
        sweep: spec.sweep,
        knee: 100,
        thickness: 0.068,
        spines: false,
      },
      legMat,
    )
    for (const child of pair.children) child.name = 'larva-leg'

    // 爪：跗节末端的一枚深色小钩。kit.leg() 把绝对端点留在 userData 里，
    // 左腿是 scale.z = −1 的镜像，故 z 取负。
    const one = pair.children[0]
    const tip = one.userData.tip as THREE.Vector3
    const knee = one.userData.knee as THREE.Vector3
    const dir = new THREE.Vector3().subVectors(tip, knee).normalize()
    for (const s of [1, -1] as const) {
      const a = new THREE.Vector3(tip.x, tip.y, tip.z * s)
      const b = a.clone().addScaledVector(new THREE.Vector3(dir.x, dir.y, dir.z * s), 0.06)
      const claw = new THREE.Mesh(
        loft([{ at: a, ry: 0.024, rz: 0.024 }, { at: b, ry: 0.004, rz: 0.004 }], 8),
        clawMat,
      )
      claw.name = 'larva-claw'
      pair.add(claw)
    }

    holder.add(pair)
    g.add(holder)
  }
  return g
}

/** 体侧一排气门：每节一对，贴着体壁压扁。立起来的小球会读成一排疣，不是气孔 */
function spiracles(material: THREE.Material): THREE.Group {
  const g = new THREE.Group()
  const theta = THREE.MathUtils.degToRad(76)
  for (let seg = 0; seg < 10; seg++) {
    const t = (seg + 0.42) / SEGMENTS
    const f = frameAt(t)
    for (const side of [1, -1] as const) {
      const out = new THREE.Vector3()
        .addScaledVector(f.dorsal, Math.cos(theta))
        .addScaledVector(f.lateral, side * Math.sin(theta))
        .normalize()
      const third = new THREE.Vector3().crossVectors(f.forward, out).normalize()
      const m = new THREE.Mesh(new THREE.SphereGeometry(0.05, 10, 6), material)
      m.name = 'larva-spiracle'
      // 圆心正落在体壁上（系数 1.0）：独角仙那条取 0.95「陷进去一点」，
      // 压扁后整排气门全埋进体壁，渲染出来一颗都看不见。
      m.position
        .copy(f.pos)
        .addScaledVector(f.dorsal, Math.cos(theta) * f.ry)
        .addScaledVector(f.lateral, side * Math.sin(theta) * f.rz)
      m.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(f.forward, out, third))
      m.scale.set(1, 0.42, 0.62)
      g.add(m)
    }
  }
  return g
}

/** 稀疏刚毛：每节一横排，向后斜伏（直立会读成海胆） */
function setae(material: THREE.Material): THREE.Group {
  const g = new THREE.Group()
  const angles = [36, 96, -36, -96].map((d) => THREE.MathUtils.degToRad(d))
  for (let seg = 0; seg < SEGMENTS; seg++) {
    const t = (seg + 0.46) / SEGMENTS
    if (t > 0.99) continue
    const f = frameAt(t)
    for (const a of angles) {
      const out = new THREE.Vector3()
        .addScaledVector(f.dorsal, Math.cos(a))
        .addScaledVector(f.lateral, Math.sin(a))
        .normalize()
      const root = new THREE.Vector3()
        .copy(f.pos)
        .addScaledVector(f.dorsal, Math.cos(a) * f.ry * 0.96)
        .addScaledVector(f.lateral, Math.sin(a) * f.rz * 0.96)
      const dir = out.clone().multiplyScalar(0.77).addScaledVector(f.forward, -0.64).normalize()
      const tip = root.clone().addScaledVector(dir, 0.12)
      const seta = new THREE.Mesh(
        loft([{ at: root, ry: 0.015, rz: 0.015 }, { at: tip, ry: 0.002, rz: 0.002 }], 6),
        material,
      )
      seta.name = 'larva-seta'
      g.add(seta)
    }
  }
  return g
}

// ================================================================ 装配

export function buildDungBeetleLarva(): InsectModel {
  const g = new THREE.Group()

  /*
   * 粪梨：哑光、无清漆（粪是最不反光的东西之一），并且**开顶点色** ——
   * 色调的不匀已经烘进几何的 color 属性里，材质基色只提供那一档基准。
   * kit.chitin() 不带这个开关，在这里补一句即可（materialOf 断言读的仍是基色）。
   */
  const dungMat = chitin({ color: DUNG_COLOR, gloss: 0.1, clearcoat: 0 })
  const cavityMat = chitin({ color: DUNG_CAVITY_COLOR, gloss: 0.12, clearcoat: 0 })
  const cutMat = chitin({ color: DUNG_CUT_COLOR, gloss: 0.08, clearcoat: 0 })
  for (const m of [dungMat, cavityMat, cutMat]) m.vertexColors = true
  g.add(broodPear(dungMat, cavityMat, cutMat))

  // ---- 蛴螬
  // 体壁：哑光 + 次表面透光。**绝不是 elytra()**（理由见文件头「颜色纪律」）
  const bodyMat = chitin({ color: BODY_COLOR, gloss: 0.2, clearcoat: 0.03, translucent: true })
  /*
   * 腹端数节：哑光**不透光**。体壁开 transmission 是为了「软」，这一截若也开，
   * 深色壳会把底下那层灰白躯干透出来、把刚做出的明暗界限自己抹掉 ——
   * 要表达的是「内容物已经把这一段染暗了」，不是「这一段是块毛玻璃」。
   */
  const tailMat = chitin({ color: TAIL_COLOR, gloss: 0.18, clearcoat: 0.03 })
  const headMat = chitin({ color: HEAD_COLOR, gloss: 0.58, clearcoat: 0.42, surface: 'punctate' })
  const mandibleMat = chitin({ color: MANDIBLE_COLOR, gloss: 0.5, clearcoat: 0.32 })
  const legMat = chitin({ color: LEG_COLOR, gloss: 0.32, clearcoat: 0.1 })
  const darkMat = chitin({ color: DARK_POINT_COLOR, gloss: 0.38, clearcoat: 0.18 })
  const setaMat = chitin({ color: SETA_COLOR, gloss: 0.3, clearcoat: 0 })

  const larva = new THREE.Group()
  larva.name = 'larva-pose'

  const trunk = new THREE.Mesh(trunkGeometry(0, 1, 0), bodyMat)
  trunk.name = 'larva-body'
  larva.add(trunk)

  /*
   * 腹端的深色外壳：整体外扩 0.008 套在躯干外面的一层。
   * 不拆成两段是有理由的：拆段会让两段共用同一个截面而表面重合打架，
   * 而且测试要靠**一条完整的中心线**量弧长与驼峰，拼接处的误差正好落在
   * 最需要精确的地方。外扩一个恒定量天然把接缝藏成一道干净的横界 ——
   * 后肠内容物的界限在真实蛴螬身上本来就是这么一道横界。
   */
  const tail = new THREE.Mesh(trunkGeometry(DARK_TAIL_FROM, 1, 0.008), tailMat)
  tail.name = 'larva-abdomen-dark'
  larva.add(tail)

  const head = new THREE.Group()
  orient(head, frameAt(0))
  head.add(headCapsule(headMat))
  head.add(grubMandibles(mandibleMat))
  larva.add(head)

  larva.add(thoracicLegs(legMat, darkMat))
  larva.add(spiracles(darkMat))
  larva.add(setae(setaMat))

  /*
   * 把蜷好的虫放进腔里：比腔心略低（虫是躺在腔底的，不是悬在正中），
   * 净空最紧的一处在驼峰顶（外缘 1.42 对腔壁 1.55）—— 真实的末龄幼虫
   * 就是把腔撑满的，留太多空隙会读成「一颗球里丢了条虫」。
   */
  larva.position.set(0, CAVITY_Y - 0.12, 0)
  g.add(larva)

  const toWorld = (v: THREE.Vector3) => v.clone().add(larva.position)
  const headFrame = frameAt(0)
  const midFrame = frameAt(0.5)
  const tailFrame = frameAt(0.9)
  const legFrame = frameAt(LEG_SPECS[1].t)
  const humpFrame = frameAt(HUMP_AT)

  const anchors: Record<string, THREE.Vector3> = {
    head: toWorld(headFrame.pos.clone().addScaledVector(headFrame.forward, 0.3).addScaledVector(headFrame.dorsal, 0.14)),
    mandible: toWorld(headFrame.pos.clone().addScaledVector(headFrame.forward, 0.5).addScaledVector(headFrame.dorsal, -0.12)),
    hump: toWorld(humpFrame.pos.clone().addScaledVector(humpFrame.dorsal, humpFrame.ry * 1.05)),
    body: toWorld(midFrame.pos.clone().addScaledVector(midFrame.dorsal, midFrame.ry * 1.05)),
    abdomenTip: toWorld(tailFrame.pos.clone().addScaledVector(tailFrame.dorsal, tailFrame.ry * 1.05)),
    thoracicLeg: toWorld(
      legFrame.pos
        .clone()
        .addScaledVector(legFrame.dorsal, -legFrame.ry * 0.5)
        .addScaledVector(legFrame.lateral, legFrame.rz + 0.3),
    ),
    chamber: new THREE.Vector3(0, CAVITY_Y + CAVITY_HY * 0.72, 0),
    pear: new THREE.Vector3(-pearRadius(0.4) * 0.86, 0.4 * PEAR_H, 0),
  }

  return finalize(g, anchors)
}
