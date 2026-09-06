/**
 * 星天牛 · 幼虫（俗称「哈虫」「蛀木虫」）Anoplophora chinensis（完全变态第 2 阶段）
 *
 * ## 天牛幼虫不是蛴螬 —— 这份文件从头到尾都在跟那个误会较劲
 *
 * 同为鞘翅目，`rhinoceros-beetle-larva.ts` 的蛴螬是「C 形蜷曲、三对明显胸足、
 * 中段最粗、褐色硬头壳露在外面」；天牛幼虫**四条全反过来**：身体笔直、
 * 几乎无足、前胸最粗、头缩在前胸里只露一对上颚。抄成蛴螬就等于把
 * 「同一个目里的两种幼虫为什么长得不一样」这件事讲错。
 *
 * ## 招牌结构（做不出就等于没做）
 *
 * 1. **末龄体长 5 厘米，笔直的长圆筒。** 本文件躯干 x 从 +2.52 到 −2.55，
 *    整 5.07（模型单位 1 = 1 厘米），比成虫体长（2~3.9 厘米）还长一截 ——
 *    幼虫要在木质部里啃一到两年，成虫只活一个月，这个量级差本身就是
 *    生活史要讲的内容，绝不为了「好看」缩小。
 *    体轴只在后半段有 0.055 的轻微下垂，其余笔直：**蛴螬才是 C 形**，
 *    天牛幼虫在虫道里就是一根直的（道是它自己啃的，没必要拐弯）。
 * 2. **前胸背板：宽大、扁平、黄褐、带细密颗粒。** 天牛幼虫最好认的一处。
 *    这里做成一块横跨背面 ±66°（几乎占满前胸整个背面）、纵向 0.74 厘米的盾，
 *    比体壁高出 0.05，缀 120 枚颗粒，另有两道纵向浅沟。
 *    **颜色必须真的分得开**：体壁 `#f4ecdb`（明度 0.91）对盾 `#b5822c`
 *    （明度 0.44），差 0.47。这一条是照着第 5 轮那个坑反过来定的 ——
 *    「颜色压深一档」被误解成「越深越保险」，结果大王花金龟前胸的黑白纵条纹
 *    被压成了深灰叠深灰，招牌图案在画面上直接消失。乳白的虫身反过来最危险：
 *    压深就是脏灰，所以体壁真的取到接近白，盾才衬得出来。
 * 3. **头小、缩在前胸里，只露一对深色上颚。** 头壳最宽处（半径 0.205）落在
 *    x=2.50，恰好与前胸前缘罩子在该处的半径（0.203）齐口；再往后 0.05，
 *    罩子就涨到 0.345 把头整个包住。露在外面的只有最前面那 0.15。
 *    真正显眼的是那对**短粗的黑褐上颚** —— 啃木头的凿子，不是捕食用的镰刀，
 *    所以短、厚、末端是横刃而不是针尖（末端仍有 0.082 的垂直厚度）。
 *    ⚠️ 两颚在三维里分得开不等于在屏幕上分得开（黑翅土白蚁兵蚁那一轮的教训），
 *    测试按五个机位的**投影**判 —— 而且第一版正是这么被抓住的，见下面
 *    `mandibles()` 的注释。
 * 4. **几乎无足 + 步泡突（ambulatory calluses）。** 胸足退化成三对 0.07 长的
 *    小突起（`larva-leg-nub`），根本走不了路；真正的运动器官是腹节背面与腹面
 *    各一块**略隆起、带横皱的垫**，撑在虫道壁上一伸一缩地蠕动前进。
 *    本文件在腹部第 1~7 节各做一对（背 7 + 腹 7 = 14 块），每块 4 道横皱。
 *    这是天牛幼虫**为什么不需要腿**的全部解释，删掉它这只虫就没法动了。
 * 5. **分节明显 + 体壁细横皱。** 节间沟深 5.5%（占该处半径），细横皱只有 1.4%
 *    ——两档差 4 倍是有意的：节间沟要数得出 13 节，细皱只负责让体壁不像塑料管。
 *    沟不能再深：超过 9% 就读成松果的鳞片（蛴螬那一轮的红线）。
 *
 * ## 为什么这一阶段不做虫道
 *
 * 卵那一阶段做了整块树皮（卵本身没有可看的结构，语境才是它读得出来的必要条件），
 * 这里反过来：招牌全在虫身上，**把它塞进一段木头里，等于把前胸背板、上颚、
 * 步泡突一起挡掉**。判据跟 `rhinoceros-beetle-pupa.ts` 决定不做土室时是同一条：
 * 哪种做法能让招牌结构被看见。「蛀干」这条线由卵（树皮刻槽）与蛹（木质部蛹室的
 * 姿态）交代，幼虫这一格是特写。
 *
 * ## 材质纪律
 *
 * 体壁**绝不用 `elytra()`**（gloss 0.74 + clearcoat 0.55 是硬鞘翅的档）：
 * 天牛幼虫是软体，`chitin({ gloss: 0.22, clearcoat: 0.04, translucent: true })`
 * ——哑光 + 次表面透光，高光根本没有机会顶到过曝区，基色才敢用真正的乳白。
 * 这一档是 `rhinoceros-beetle-larva.ts` 目视验收过的。
 *
 * 局部坐标系与成虫完全一致：+X 向前（头）、+Y 向上（背）、+Z 向右。
 */
import * as THREE from 'three'
import { chitin, finalize, loft, type InsectModel, type Section } from '../kit'

// ---------------------------------------------------------------- 体轴

/** 躯干前端（前胸的前缘罩子顶点） */
const BODY_FRONT_X = 2.52
/** 躯干末端 */
const BODY_REAR_X = -2.55
// 躯干全长 5.07 厘米 —— 末龄 4.5~6 的中间偏上

/** 后半段的下垂量。前半段严格为 0：前胸背板那块盾按「体轴在这一段是直的」摆位 */
const SAG = 0.055
/** 可见体节：前胸 1 节（很长）+ 中后胸 2 节 + 腹部 10 节 = 13 */
const SEGMENTS = 13
/** 前胸在 u 上的终点。天牛幼虫的前胸比其余各节长得多，均分 13 节会把这个特征抹掉 */
const PRO_END = 0.185
/** 节间沟深度（占该处半径）。松果红线是 0.09，这里给 0.055 */
const GROOVE = 0.055
/** 细横皱：每节 4 道，深度只有 1.4% —— 与节间沟差 4 倍，两者才不会糊成一片 */
const WRINKLE_PER_SEG = 4
const WRINKLE_DEPTH = 0.014
/** 放样采样数与径向分段数 */
const BODY_SAMPLES = 420
const BODY_RADIAL = 26
/** 首尾的球冠收口范围（u） */
const FRONT_CAP = 0.03
const REAR_CAP_FROM = 0.955

/**
 * 半径包络：前胸最粗（0.470）→ 前胸后缘缢缩（0.396）→ 腹部平缓（0.42）
 * → 后段渐收（0.215）。
 *
 * 峰值放在前胸而不是腹中段，这一条正是天牛幼虫与蛴螬的分水岭：
 * 蛴螬最粗处在腹前段（那是一只吃腐殖质吃胖的虫），天牛幼虫最粗处在前胸
 * （那是一台顶着盾往木头里钻的推土机）。
 */
const ENVELOPE = [
  [0.03, 0.41],
  [0.06, 0.452],
  [0.11, 0.47],
  [0.17, 0.452],
  [0.2, 0.396],
  [0.245, 0.416],
  [0.31, 0.41],
  [0.39, 0.424],
  [0.52, 0.42],
  [0.64, 0.4],
  [0.76, 0.36],
  [0.86, 0.306],
  [0.93, 0.252],
  [1.0, 0.215],
] as const

/** 分段线性 + smoothstep 的关键帧插值 */
function keyframe(keys: readonly (readonly [number, number])[], t: number): number {
  const x = THREE.MathUtils.clamp(t, keys[0][0], keys[keys.length - 1][0])
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

/** 体轴上 u 处的 X */
function axisX(u: number): number {
  return THREE.MathUtils.lerp(BODY_FRONT_X, BODY_REAR_X, u)
}

/**
 * 体轴上 u 处的 Y。前半段恒为 0 —— 前胸背板的每一条脊都是按「这一段体轴是直的」
 * 摆的（它们各自绕 X 轴转到自己的方位角，group 只能有一个原点），
 * 体轴若在那一段就开始起伏，整块盾会整体偏离体壁。
 */
function axisY(u: number): number {
  return -SAG * THREE.MathUtils.smoothstep(u, 0.5, 1)
}

/**
 * 体节相位：前胸单独占 [0,1]，其余 12 节均分 [1,13]。
 * 节间沟落在整数处，所以前胸后缘那道缢缩自然对齐 ENVELOPE 里 0.2 处的低谷。
 */
function segPhase(u: number): number {
  if (u < PRO_END) return u / PRO_END
  return 1 + ((u - PRO_END) / (1 - PRO_END)) * (SEGMENTS - 1)
}

/**
 * 节间沟 + 细横皱。
 *
 * 沟做成**窄而浅的折痕**（`|cos|^6`）而不是宽而深的凹槽：同样深度下窄折痕
 * 读得更清楚，而宽凹槽在这么粗的软体上会直接读成松果的鳞片。
 * 两端的球冠段把起伏淡出 —— 收口处的几道浅褶正对镜头时会读成一圈圈「切面」。
 */
function ripple(u: number): number {
  const fade =
    THREE.MathUtils.clamp((u - FRONT_CAP) / 0.03, 0, 1) * THREE.MathUtils.clamp((0.94 - u) / 0.1, 0, 1)
  const p = segPhase(u)
  const crease = Math.pow(Math.abs(Math.cos(p * Math.PI)), 6)
  const wrinkle = Math.pow(Math.abs(Math.cos(p * Math.PI * WRINKLE_PER_SEG)), 4)
  return 1 - (GROOVE * crease + WRINKLE_DEPTH * wrinkle) * fade
}

/** 该处的包络半径（含首尾球冠） */
function envelope(u: number): number {
  if (u < FRONT_CAP) {
    const w = 1 - u / FRONT_CAP
    return keyframe(ENVELOPE, FRONT_CAP) * Math.sqrt(Math.max(0, 1 - w * w))
  }
  const base = keyframe(ENVELOPE, u)
  if (u > REAR_CAP_FROM) {
    const w = (u - REAR_CAP_FROM) / (1 - REAR_CAP_FROM)
    return base * Math.sqrt(Math.max(0, 1 - w * w))
  }
  return base
}

/** 背腹半径与左右半径。天牛幼虫的横截面是略扁的圆（宽 > 高），不是正圆 */
function radiiAt(u: number): { ry: number; rz: number } {
  const r = Math.max(envelope(u) * ripple(u), 1e-4)
  return { ry: r * 0.93, rz: r * 1.06 }
}

/** 方位角 θ（0 = 背中线，+ 向 +Z）处的体壁向径 */
function wallR(u: number, theta: number): number {
  const { ry, rz } = radiiAt(u)
  return 1 / Math.hypot(Math.cos(theta) / ry, Math.sin(theta) / rz)
}

// ---------------------------------------------------------------- 颜色

/** 体壁：真正的乳白（明度 0.91）。配哑光 + 半透材质才不会过曝，见文件头「材质纪律」 */
const BODY_COLOR = '#f4ecdb'
/** 前胸背板：黄褐。与体壁差 0.47 个明度 —— 这块盾能不能被看见全靠这个差 */
const PLATE_COLOR = '#b5822c'
/** 盾上的颗粒：一浅一深两档，颗粒感靠明暗交替而不只靠几何 */
const GRANULE_LIGHT = '#c9963c'
const GRANULE_DARK = '#8f6320'
/** 头壳：比盾更深的红褐，但远不到近黑（近黑会把体积感一起吃掉） */
const HEAD_COLOR = '#a8752e'
/** 头壳前缘：高度骨化的一圈深褐 */
const HEAD_MARGIN_COLOR = '#4a2c12'
/** 上颚：最深的一处，仍留出褐色（#3a2616 明度 0.157，不是黑） */
const MANDIBLE_COLOR = '#3a2616'
/** 步泡突：比体壁略深的米色。真实步泡突与体色几乎同色，靠横皱的明暗读出来 */
const CALLUS_COLOR = '#e2d1a6'
const WRINKLE_COLOR = '#cbb589'
/** 退化胸足 */
const NUB_COLOR = '#dcc79c'
/** 气门：深褐小椭圆 */
const SPIRACLE_COLOR = '#8a5a28'

// ---------------------------------------------------------------- 躯干

function bodyGeometry(): THREE.BufferGeometry {
  const sections: Section[] = []
  for (let i = 0; i <= BODY_SAMPLES; i++) {
    const u = i / BODY_SAMPLES
    const { ry, rz } = radiiAt(u)
    sections.push({ at: new THREE.Vector3(axisX(u), axisY(u), 0), ry, rz })
  }
  return loft(sections, BODY_RADIAL)
}

// ---------------------------------------------------------------- 前胸背板

/** 盾覆盖的 u 区间：前胸前缘罩子之后到前胸后缘缢缩之前 */
const PLATE_U0 = 0.038
const PLATE_U1 = 0.183
/**
 * 盾横跨的方位角（从背中线量）。±66° 几乎占满前胸的整个背面，
 * 但侧缘刻意停在体壁最宽处**之内** —— 实测取 ±72° 时盾的侧缘会探出体廓 0.015，
 * 剪影上多出一道细唇，读成「贴了一片东西上去」而不是「体壁本身骨化了一块」。
 */
const PLATE_THETA = THREE.MathUtils.degToRad(66)
/** 盾由多少条纵向脊拼成。17 条时脊心弧距 0.067、脊半宽 0.052，必然互相压叠 */
const PLATE_STRIPS = 17
/** 盾的半厚（脊心到脊冠）。冠面因此高出体壁 0.053 —— 扁平的一块，不是个瘤 */
const PLATE_HALF_T = 0.048
const PLATE_HALF_W = 0.052
/** 两道纵向浅沟所在的方位角，天牛幼虫前胸背板上常见 */
const PLATE_FURROW_DEG = 26

/** 盾在纵向 t 处的收束（前后缘薄、中间厚），同时管厚度与宽度 */
function plateTaper(t: number): number {
  const edge = Math.min(t / 0.12, (1 - t) / 0.14, 1)
  return THREE.MathUtils.lerp(0.22, 1, THREE.MathUtils.smoothstep(edge, 0, 1))
}

/** 盾在方位角 θ 处的厚度系数：中央最厚、侧缘收薄，两道纵沟处再压一档 */
function plateThickness(theta: number): number {
  const k = Math.abs(theta) / PLATE_THETA
  const lateral = 0.45 + 0.55 * Math.cos((k * Math.PI) / 2)
  const d = Math.abs(Math.abs(THREE.MathUtils.radToDeg(theta)) - PLATE_FURROW_DEG)
  const furrow = d < 6 ? THREE.MathUtils.lerp(0.66, 1, d / 6) : 1
  return lateral * furrow
}

/**
 * 前胸背板：17 条沿 X 的纵脊拼成的一块盾。
 *
 * 为什么不用一整片壳：`loft()` 的截面永远是**整个**椭圆，做不出「一段圆弧」；
 * 而手写世界坐标的扁椭圆截面在斜着的体侧上会立不起来（`Section.roll` 只挪 UV
 * 接缝、不转椭圆 —— `rhinoceros-beetle-pupa.ts` 的翅芽栽过这个跟头，
 * 出图是几片悬空的「剪纸」）。这里每条脊单独装进一个绕 X 转到自己方位角的
 * group，组内只写「离体轴多远、多厚、多宽」，脊自然半埋进体壁、宽的一维贴着
 * 体表铺开。相邻脊必然压叠，整块读起来是一块盾而不是一排肋。
 */
function pronotalPlate(material: THREE.Material): THREE.Group {
  const g = new THREE.Group()
  const steps = 18
  for (let j = 0; j < PLATE_STRIPS; j++) {
    const theta = -PLATE_THETA + (2 * PLATE_THETA * j) / (PLATE_STRIPS - 1)
    const holder = new THREE.Group()
    holder.rotation.x = theta
    const sections: Section[] = []
    for (let i = 0; i <= steps; i++) {
      const t = i / steps
      const u = THREE.MathUtils.lerp(PLATE_U0, PLATE_U1, t)
      const taper = plateTaper(t)
      sections.push({
        at: new THREE.Vector3(axisX(u), wallR(u, theta) + 0.005, 0),
        ry: Math.max(PLATE_HALF_T * plateThickness(theta) * taper, 1e-3),
        rz: Math.max(PLATE_HALF_W * THREE.MathUtils.lerp(0.55, 1, taper), 1e-3),
      })
    }
    const mesh = new THREE.Mesh(loft(sections, 12), material)
    mesh.name = 'pronotal-plate'
    holder.add(mesh)
    g.add(holder)
  }
  return g
}

/** 固定种子伪随机（sin-hash）：颗粒的分布每次构建完全一致，不依赖 Math.random */
function hash01(i: number): number {
  const x = Math.sin(i * 12.9898 + 78.233) * 43758.5453
  return x - Math.floor(x)
}

/**
 * 盾面的细密颗粒。
 *
 * 天牛幼虫前胸背板的「细密刻纹」在放大镜下是密排的小颗粒。这里 120 枚、
 * 沿方位角与纵向散开、深浅两档轮换 —— 光靠 `surface: 'punctate'` 的法线贴图
 * 做不到：那是整片均匀铺的，而颗粒区的辨识特征恰恰是**颗粒本身有大小**。
 * 每枚沿径向压扁到 0.5，读成嵌在盾面里的粒而不是粘上去的球。
 */
function plateGranules(light: THREE.Material, dark: THREE.Material): THREE.Group {
  const g = new THREE.Group()
  for (let i = 0; i < 120; i++) {
    const t = 0.06 + hash01(i * 3.1) * 0.88
    const theta = (hash01(i * 3.1 + 1.7) * 2 - 1) * PLATE_THETA * 0.92
    const u = THREE.MathUtils.lerp(PLATE_U0, PLATE_U1, t)
    const rise = PLATE_HALF_T * plateThickness(theta) * plateTaper(t)
    const r = wallR(u, theta) + 0.005 + rise * 0.72
    const size = 0.015 + hash01(i * 5.3 + 2.9) * 0.014
    const m = new THREE.Mesh(new THREE.SphereGeometry(size, 8, 6), i % 3 === 0 ? dark : light)
    m.name = 'pronotal-granule'
    const out = new THREE.Vector3(0, Math.cos(theta), Math.sin(theta))
    const third = new THREE.Vector3(0, -Math.sin(theta), Math.cos(theta))
    m.position.set(axisX(u), r * Math.cos(theta), r * Math.sin(theta))
    m.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(new THREE.Vector3(1, 0, 0), out, third))
    m.scale.set(1, 0.5, 1)
    g.add(m)
  }
  return g
}

// ---------------------------------------------------------------- 头与上颚

/**
 * 头壳剖面（x → 半径）。最宽处 0.205 落在 x=2.50，而前胸前缘罩子在该处的
 * 半径是 0.20 —— 也就是说头的最宽处正好卡在罩子边上，只有 x>2.50 的一小截
 * 露出来。「缩在前胸里」这句话的全部实现就在这几个数上。
 */
const HEAD_PROFILE = [
  [2.22, 0.06],
  [2.3, 0.16],
  [2.4, 0.198],
  [2.5, 0.205],
  [2.58, 0.185],
  [2.64, 0.12],
  [2.67, 0.03],
] as const

function headCapsule(material: THREE.Material): THREE.Mesh {
  const steps = 20
  const sections: Section[] = []
  const x0 = HEAD_PROFILE[0][0]
  const x1 = HEAD_PROFILE[HEAD_PROFILE.length - 1][0]
  for (let i = 0; i <= steps; i++) {
    const x = THREE.MathUtils.lerp(x0, x1, i / steps)
    const r = keyframe(HEAD_PROFILE, x)
    // 头壳横截面略扁（宽 > 高），正圆会读成一颗球
    sections.push({ at: new THREE.Vector3(x, -0.01, 0), ry: r * 0.9, rz: r * 1.06 })
  }
  const mesh = new THREE.Mesh(loft(sections, 20), material)
  mesh.name = 'head-capsule'
  return mesh
}

/** 头壳前缘那圈高度骨化的深褐边：套在头壳外面 0.006，天然成一道干净的分界 */
function headMargin(material: THREE.Material): THREE.Mesh {
  const steps = 8
  const sections: Section[] = []
  for (let i = 0; i <= steps; i++) {
    const x = THREE.MathUtils.lerp(2.555, 2.655, i / steps)
    const r = keyframe(HEAD_PROFILE, x) + 0.006
    sections.push({ at: new THREE.Vector3(x, -0.01, 0), ry: r * 0.9, rz: r * 1.06 })
  }
  const mesh = new THREE.Mesh(loft(sections, 18), material)
  mesh.name = 'head-margin'
  return mesh
}

/**
 * 上颚：一对短粗的深色凿。
 *
 * 啃活树木质部的口器，不是捕食用的镰刀，所以**短、厚、末端是横刃**：
 * 基部 ry 0.115，末端仍有 ry 0.082（垂直方向）而 rz 收到 0.030 ——
 * 这个「高而薄」的末端截面就是凿刃。收成针尖那一档出图会读成两根獠牙。
 *
 * ⚠️ **两颚是向外张开的（±0.12 → ±0.205），不是往前收拢。**
 * 第一版按「合拢的一对钳」做（末端收回 ±0.09），三维里两颚之间明明隔着
 * 0.12，可默认机位的投影间距只有 **0.009** —— 屏幕上就是一坨黑。原因不是
 * 分得不够开，而是两颚沿 X 拉得长、影子顺着视线方向互相滑进对方里去了
 * （黑翅土白蚁兵蚁那一轮栽的就是这个）。改成张开之后默认机位 0.057、
 * 顶视 0.253、前斜 0.252、后斜 0.168。
 * 唯一仍然读不出缝的是 `side` 机位 —— 它几乎正对 +Z，而分离量就在 Z 上，
 * 沿分离轴看过去任何左右对称的一对结构都必然重叠，这是投影的性质，
 * 不是模型的毛病。张着的颚也更符合这一刻的语境：它正在啃木头。
 */
function mandibles(material: THREE.Material): THREE.Group {
  const g = new THREE.Group()
  for (const side of [1, -1] as const) {
    const p0 = new THREE.Vector3(2.5, -0.015, side * 0.12)
    const p1 = new THREE.Vector3(2.7, -0.08, side * 0.2)
    const p2 = new THREE.Vector3(2.83, -0.14, side * 0.205)
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
      sections.push({
        at,
        ry: THREE.MathUtils.lerp(0.115, 0.082, Math.pow(t, 0.9)),
        rz: THREE.MathUtils.lerp(0.088, 0.03, Math.pow(t, 0.75)),
      })
    }
    const m = new THREE.Mesh(loft(sections, 14), material)
    m.name = 'larva-mandible'
    g.add(m)
  }
  return g
}

// ---------------------------------------------------------------- 步泡突

/** 带步泡突的腹节（腹部第 1~7 节，即 12 节里的第 3~9 节） */
const CALLUS_SEGMENTS = [3, 4, 5, 6, 7, 8, 9] as const
/** 每块垫的纵向半长（u） */
const CALLUS_HALF_U = 0.026
/** 每块垫上的横皱数 */
const CALLUS_WRINKLES = 4

/** 第 k 节（12 节编号）的中点 u */
function segCenterU(k: number): number {
  return PRO_END + ((k - 0.5) / (SEGMENTS - 1)) * (1 - PRO_END)
}

/**
 * 一块步泡突：略隆起、带横皱的垫。
 *
 * 摆位方式跟前胸背板的脊一样 —— 整组绕 X 转到「组的局部 +Y = 该处体壁外法线」，
 * 组内只写「离体轴多远、多厚、多宽」。于是垫天然半埋在体壁里、宽的那一维
 * 贴着体表铺开，而不是一片浮在体侧的斜板。
 *
 * 隆起量 0.03（垫心比体壁高 0.03、半厚 0.05，所以有 0.02 埋进去）：
 * 步泡突是**撑在虫道壁上的垫**，隆起得太高就成了一排疣，看不出是「垫」。
 */
function callus(k: number, dorsal: boolean, padMat: THREE.Material, wrinkleMat: THREE.Material): THREE.Group {
  const u0 = segCenterU(k)
  const theta = dorsal ? 0 : Math.PI
  const g = new THREE.Group()
  g.position.y = axisY(u0)
  g.rotation.x = theta

  const steps = 12
  const sections: Section[] = []
  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    const u = u0 + (t * 2 - 1) * CALLUS_HALF_U
    const shape = Math.sqrt(Math.max(0, 1 - Math.pow(t * 2 - 1, 2)))
    sections.push({
      at: new THREE.Vector3(axisX(u), wallR(u, theta) - 0.02, 0),
      ry: Math.max(0.05 * (0.35 + 0.65 * shape), 1e-3),
      rz: Math.max(0.21 * (0.3 + 0.7 * Math.pow(shape, 0.55)), 1e-3),
    })
  }
  const pad = new THREE.Mesh(loft(sections, 16), padMat)
  pad.name = 'larva-callus'
  g.add(pad)

  /*
   * 横皱：每块垫上 4 道横向小棱。步泡突不是一块光垫 ——「带皱纹」是它区别于
   * 普通隆起的地方，也是它在画面上唯一读得出来的细节（颜色几乎与体壁同色）。
   * 沿 Z 放样时 loft 的标架恰好是 ry→Y、rz→X（见 kit.loft 的平行传输），
   * 所以 rz 给的是这道棱沿体轴的宽度。
   */
  for (let w = 0; w < CALLUS_WRINKLES; w++) {
    const t = (w + 0.5) / CALLUS_WRINKLES
    const u = u0 + (t * 2 - 1) * CALLUS_HALF_U * 0.78
    const half = 0.17 * Math.sqrt(Math.max(0.05, 1 - Math.pow(t * 2 - 1, 2)))
    const rBase = wallR(u, theta) + 0.028
    const bar: Section[] = []
    const zSteps = 8
    for (let i = 0; i <= zSteps; i++) {
      const z = -half + (2 * half * i) / zSteps
      // 棱要跟着垫面弯，直棱在这么圆的体侧上两端会扎进去
      const drop = rBase * (1 - Math.sqrt(Math.max(0, 1 - Math.pow(z / (rBase + 1e-6), 2))))
      bar.push({ at: new THREE.Vector3(axisX(u), rBase - drop, z), ry: 0.014, rz: 0.028 })
    }
    const ridge = new THREE.Mesh(loft(bar, 8), wrinkleMat)
    ridge.name = 'larva-callus-wrinkle'
    g.add(ridge)
  }
  return g
}

// ---------------------------------------------------------------- 退化胸足与气门

/** 三对退化胸足所在的体节中点（前胸取 0.09，中后胸各取自己的节中） */
const NUB_U = [0.09, segCenterU(1), segCenterU(2)] as const
/** 胸足着生的方位角（从背中线量）：腹侧偏外 */
const NUB_THETA = THREE.MathUtils.degToRad(148)

/**
 * 退化的胸足：三对 0.07 长的小锥突。
 *
 * 天牛幼虫**没有能走路的足**（`Anoplophora` 的胸足退化到几乎看不出来），
 * 移动全靠步泡突。这里保留可辨的一点点突起而不是干脆删掉，是因为
 * 「退化」跟「没有」在教学上是两件事：它还在那儿，只是不管用了。
 * ⚠️ 千万别改成 `kit.legPair()` —— 那会给这只虫装上三对分节的真足，
 * 当场变成一只蛴螬（测试专门盯着 `rig.legs` 是否存在）。
 */
function legNubs(material: THREE.Material): THREE.Group {
  const g = new THREE.Group()
  for (const u of NUB_U) {
    for (const side of [1, -1] as const) {
      const theta = NUB_THETA * side
      const holder = new THREE.Group()
      holder.position.y = axisY(u)
      holder.rotation.x = theta
      const base = wallR(u, theta) - 0.02
      const nub = new THREE.Mesh(
        loft(
          [
            { at: new THREE.Vector3(axisX(u), base, 0), ry: 0.055, rz: 0.055 },
            { at: new THREE.Vector3(axisX(u) + 0.012, base + 0.05, 0), ry: 0.038, rz: 0.038 },
            { at: new THREE.Vector3(axisX(u) + 0.02, base + 0.075, 0), ry: 0.012, rz: 0.012 },
          ],
          10,
        ),
        material,
      )
      nub.name = 'larva-leg-nub'
      holder.add(nub)
      g.add(holder)
    }
  }
  return g
}

/**
 * 体侧一排气门：中胸 + 腹部第 1~8 节共 9 对。
 * 圆心正落在体壁上（系数 1.0，不是 0.95）—— 内陷 5% 在这个粗细上就是 0.02，
 * 而压扁后的半厚只有 0.018，整排气门会全埋进体壁里（`rhinoceros-beetle-larva.ts`
 * 出图才发现的一类问题：几何合法、按坐标写的断言也绿）。
 */
function spiracles(material: THREE.Material): THREE.Group {
  const g = new THREE.Group()
  const theta0 = THREE.MathUtils.degToRad(84)
  const us = [segCenterU(1), ...CALLUS_SEGMENTS.map(segCenterU), segCenterU(10)]
  for (const u of us) {
    for (const side of [1, -1] as const) {
      const theta = theta0 * side
      const r = wallR(u, theta)
      const out = new THREE.Vector3(0, Math.cos(theta), Math.sin(theta))
      const third = new THREE.Vector3(0, -Math.sin(theta), Math.cos(theta))
      const m = new THREE.Mesh(new THREE.SphereGeometry(0.045, 10, 8), material)
      m.name = 'larva-spiracle'
      m.position.set(axisX(u), axisY(u) + r * Math.cos(theta), r * Math.sin(theta))
      m.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(new THREE.Vector3(1, 0, 0), out, third))
      m.scale.set(0.85, 0.4, 1.35)
      g.add(m)
    }
  }
  return g
}

// ---------------------------------------------------------------- 装配

export function buildLonghornBeetleLarva(): InsectModel {
  const g = new THREE.Group()

  // 体壁：哑光 + 次表面透光。**绝不是 elytra()** —— 见文件头「材质纪律」
  const bodyMat = chitin({ color: BODY_COLOR, gloss: 0.22, clearcoat: 0.04 })
  // 盾：骨化程度明显高于体壁，所以光泽更高、挂刻点法线；但清漆仍压在 0.22
  const plateMat = chitin({ color: PLATE_COLOR, gloss: 0.5, clearcoat: 0.22, surface: 'punctate' })
  const granuleLightMat = chitin({ color: GRANULE_LIGHT, gloss: 0.55, clearcoat: 0.2 })
  const granuleDarkMat = chitin({ color: GRANULE_DARK, gloss: 0.45, clearcoat: 0.16 })
  const headMat = chitin({ color: HEAD_COLOR, gloss: 0.52, clearcoat: 0.3, surface: 'punctate' })
  const marginMat = chitin({ color: HEAD_MARGIN_COLOR, gloss: 0.55, clearcoat: 0.34 })
  const mandibleMat = chitin({ color: MANDIBLE_COLOR, gloss: 0.6, clearcoat: 0.4 })
  /*
   * 步泡突不开 translucent：体壁开了是为了「软」，垫若也开，它与体壁那 0.14 的
   * 明度差会被互相透光抹平 —— 要表达的是「这一块是撑在虫道壁上的垫」，
   * 不是「这一块是块毛玻璃」。
   */
  const callusMat = chitin({ color: CALLUS_COLOR, gloss: 0.2, clearcoat: 0.03 })
  const wrinkleMat = chitin({ color: WRINKLE_COLOR, gloss: 0.18, clearcoat: 0.02 })
  const nubMat = chitin({ color: NUB_COLOR, gloss: 0.26, clearcoat: 0.06 })
  const spiracleMat = chitin({ color: SPIRACLE_COLOR, gloss: 0.4, clearcoat: 0.2 })

  const body = new THREE.Mesh(bodyGeometry(), bodyMat)
  body.name = 'larva-body'
  g.add(body)

  g.add(pronotalPlate(plateMat))
  g.add(plateGranules(granuleLightMat, granuleDarkMat))

  g.add(headCapsule(headMat))
  g.add(headMargin(marginMat))
  g.add(mandibles(mandibleMat))

  for (const k of CALLUS_SEGMENTS) {
    g.add(callus(k, true, callusMat, wrinkleMat))
    g.add(callus(k, false, callusMat, wrinkleMat))
  }

  g.add(legNubs(nubMat))
  g.add(spiracles(spiracleMat))

  const plateU = (PLATE_U0 + PLATE_U1) / 2
  const callusU = segCenterU(5)
  const midU = 0.5

  const anchors: Record<string, THREE.Vector3> = {
    pronotalPlate: new THREE.Vector3(axisX(plateU), wallR(plateU, 0) + PLATE_HALF_T * 0.6, 0),
    mandible: new THREE.Vector3(2.78, -0.09, 0.13),
    callus: new THREE.Vector3(axisX(callusU), axisY(callusU) + wallR(callusU, 0) + 0.02, 0),
    body: new THREE.Vector3(axisX(midU), axisY(midU), radiiAt(midU).rz * 0.96),
    spiracle: new THREE.Vector3(
      axisX(segCenterU(6)),
      axisY(segCenterU(6)) + wallR(segCenterU(6), THREE.MathUtils.degToRad(84)) * Math.cos(THREE.MathUtils.degToRad(84)),
      wallR(segCenterU(6), THREE.MathUtils.degToRad(84)) * Math.sin(THREE.MathUtils.degToRad(84)),
    ),
    head: new THREE.Vector3(2.6, 0.03, 0),
  }

  return finalize(g, anchors)
}
