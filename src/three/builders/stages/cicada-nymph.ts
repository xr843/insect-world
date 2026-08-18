/**
 * 黑蚱蝉 Cryptotympana atrata · 若虫（俗称「知了猴」）
 *
 * ## 这只虫存在的意义：不完全变态的对照组
 *
 * 蝉是**不完全变态**：卵 → **若虫** → 成虫。**没有蛹，也没有「幼虫」这一步。**
 * 所以本目录里蝉只有 `cicada-egg.ts` 与本文件两个阶段，绝不会出现
 * `cicada-larva.ts` / `cicada-pupa.ts`（`stages.ts` 的契约闸门会当场红，
 * 而且那等于把中小学讲昆虫的第一个知识点讲反）。
 *
 * 若虫与幼虫的区别要**在形态上看得见**，不能只写在文案里：
 * **若虫就是一只缩小版的成虫，只是翅还停在「芽」的阶段。**
 * 所以这只的躯干分区（宽头 + 宽前胸 + 隆起的中胸 + 钝圆的桶形腹）
 * 是照成虫 `cicada.ts` 的楔形轮廓做的，一眼能认出是同一种虫；
 * 唯一「还没长好」的就是背上那对短翅芽。这一点做不出来，
 * 这只虫就白做了 —— 它全部的教学价值都在那对芽上。
 *
 * ## 招牌结构
 *
 * 1. **开掘前足**：前足腿节极度膨大成一枚纺锤形的「肌肉块」，腹缘生 3 枚粗齿突；
 *    胫节短而弯、末端一枚黑钩，静止时折回腿节腹面，像一把合起来的折刀。
 *    中后足则是普通的细行走足 —— **前足与中后足的粗细差要一眼看得出来**
 *    （实测腿节最粗处半径 0.266，中后足 0.097，差 2.7 倍）。
 *    这一处最容易做砸的方式是把腿节做成「一块加粗的平板」：兰花螳螂的花瓣状
 *    腿节栽过一模一样的跟头（宽厚比测出 5.75 全绿，渲染出来是几片侧立薄板）。
 *    所以腿节的横截面在两个方向上都实打实地撑开（垂直于自身长轴量，
 *    最粗 0.266 / 最细 0.196，比值 0.74 —— 一块板的这个比值只有 0.1 上下），
 *    齿突也是有体积的锥，不是三角片。
 * 2. **翅芽（wing pad）**：中后胸背侧一对短而扁的芽状突起，向后贴伏，
 *    末端只搭到腹部前 39%（约第 2~3 节），**不是完整的翅**；
 *    作为对照，成虫的前翅有体长的 ~87% 长（`cicada.ts` 里 2.75）。
 *
 *    **第一版栽在这里，而且栽得很彻底**：四个机位一致把它读成「胸背上的一块
 *    深色斑纹」，不是「一片翘起来的芽」。当时归因给「侧视角度与 40° 外倾的折中」，
 *    是错的。真正的两个根因都不是角度：
 *
 *    a. **明度排反了。** 翅芽 27% 比它趴着的那个面（胸背 38%）还暗。
 *       深色块贴在浅色面上，人眼的第一解释永远是「斑纹/污渍」，不是
 *       「盖在上面的一片东西」—— 顶视机位角度最有利，照样读成两道深色条纹，
 *       这条就足以排除角度的嫌疑。真实蝉若虫的翅芽与胸背是**同一个褐色系、
 *       明度相当**，靠形被认出来，不靠色。所以现在翅芽 41% ≥ 胸背 38%，
 *       **区分一律交给形**。
 *    b. **整片贴着体表走，末端与体表之间没有缝。** 实测末端到腹部表面的
 *       间隙是 −0.01（即末端正埋在腹部表面里），一条阴影缝都投不出来，
 *       那当然只能读成一块贴上去的膏药。真实若虫的翅芽后缘是**自由的**、
 *       微微外张。所以现在后半段沿自身「上」方向翘起（见 `padLift`），
 *       末端离体表约 0.06。
 *
 *    翅缘与三条翅脉的浅色（61%）保留 —— 顶视之所以还勉强读得出形状全靠它，
 *    这说明「靠形」这条路本来就是通的，只是芽面主体没跟上。翅缘另外挪到了
 *    芽面的上棱上，从「画在面上的一条亮线」变成一道**有明暗转折的棱**；
 *    基部再加一道横跨的肩棱，翅芽才有自己闭合的轮廓，不是从胸背上渐变出来的。
 * 3. **刺吸式喙**：半翅目的口器，从头部腹面向后贴着腹面伸到中足之间。
 * 4. **膨大的后唇基**：额前那个带横向沟纹的大鼓包，里面是抽树汁的唧筒肌肉，
 *    是蝉（成虫与若虫都有）最好认的头部特征之一。
 * 5. **蜕裂线**：背中线上一道深色纵脊 —— 「金蝉脱壳」时壳就是从这里裂开的。
 *
 * ## 体型比例（第一版栽在这里）
 *
 * 知了猴是**矮胖**的：实测体长 3.18、体宽 1.15、体高 0.99，长/宽 = 2.76。
 * 第一版把断面做窄了（长/宽 3.9），四个机位出图一致读成「小龙虾」——
 * 一条细长带环节的躯干拖着一条锥形尾，前面两把钳子，全是螯虾的语汇。
 * 修法不是改颜色也不是加细节，是把整条躯干**加深加宽**、把腹部**缩短**并
 * 收成钝圆：胸最宽处半径从 0.45 提到 0.58、腹部从 0.42 提到 0.47、
 * 末端半径从 0.10 提到 0.31（再接一小段收圆），腹长从 1.86 缩到 1.63。
 * 这一改之后剪影才从「虾」变回「虫」。
 *
 * ## 颜色
 *
 * 通体土褐（地下待数年、体表挂泥），最大的风险是压成一团分不出结构的深棕。
 * 所以明度是按档排的（sRGB 空间）：翅脉/翅缘 61% > 开掘足 52% > 腹部 44% >
 * 翅芽 41% > 唇基 41% > 胸背 38% > 中后足 37% > 头 36% > 蜕裂线 19% > 齿突与爪 11%。
 * 开掘足比躯干**亮**是有依据的：常年掘土磨得发亮，实物就是琥珀色的光面，
 * 顺带让招牌结构从土褐的躯干上跳出来。
 * 翅芽与胸背**同档**（41% vs 38%，还略亮一点点）是这一版最要紧的一处改动，
 * 理由见上面招牌结构第 2 条 —— 「比背景更暗」只会把一个凸起读成一块斑。
 * 它靠低一档的饱和度（32% vs 胸背 52%）和更高的 gloss 与胸背分开：
 * 芽面是光的，胸背是挂泥的 punctate，两者在同一束光下的反应本就不一样。
 * 泥土质感靠 `surface: 'punctate'`（随机圆坑法线 + 坑内更糙）+ 极低 gloss。
 *
 * 单位与坐标系同成虫：1 = 1 厘米真实体长，+X 向前（头）、+Y 向上（背）、+Z 向右。
 */
import * as THREE from 'three'
import {
  antennaPair,
  chitin,
  compoundEyePair,
  finalize,
  legPair,
  loft,
  rostrum,
  segmentedAbdomen,
  segmentedAbdomenMembranes,
  type InsectModel,
  type Section,
  type SegmentedAbdomenOptions,
} from './../kit'

// ---------------------------------------------------------------- 尺寸常量

/** 腹部起止 x。加上腹末收圆段后体长实测 3.18（头前缘 1.86 → 腹末 −1.29），落在 3~3.5 厘米区间 */
const ABDOMEN_FROM = 0.34
const ABDOMEN_TO = -0.92

/** 开掘前足腿节：起点、方向、长度、最粗处半径 —— 测试要靠这三样算「到轴线的垂距」，故导出 */
export const FORE_FEMUR_START: readonly [number, number, number] = [1.257, -0.308, 0.52]
export const FORE_FEMUR_DIR: readonly [number, number, number] = [0.8232, -0.391, 0.4116]
export const FORE_FEMUR_LENGTH = 0.78
/** 腿节最粗处的「半径基准」。实际截面是 ry = r×1.12（背腹深）、rz = r×0.86（横向宽） */
const FEMUR_R = 0.23

/** 翅芽：着生点（中胸背侧）、末端（搭在腹部前段）、以及绕自身长轴的外倾角 */
const PAD_BASE: readonly [number, number, number] = [0.92, 0.34, 0.33]
const PAD_TIP: readonly [number, number, number] = [-0.24, 0.23, 0.47]
const PAD_DROOP = THREE.MathUtils.degToRad(40)

/**
 * 后缘翘起量：末端沿翅芽自身的「上」方向抬离体表多少（单位同全局，1 = 1 厘米）。
 *
 * 这是「盖片」与「膏药」的分界线。第一版这个量是 0 —— 整片翅芽贴着体表走，
 * 末端实测甚至埋进腹部表面 0.01，于是它与体表之间一条阴影缝都没有，
 * 四个机位一致读成一块深色斑纹。真实若虫的翅芽只有基部固定在胸上，
 * 后缘是自由的、微微外张，「掀起一角」才是它的正确长相。
 *
 * 0.085 是按「投得出阴影、又不至于翘成兔耳朵」定的：末端间隙约 0.06，
 * 在 3.2 厘米长的虫上是体长的 2%，成图里约 10 像素宽的一道缝 —— 看得见，
 * 又不会让翅芽脱离躯干飘在空中。前 45% 不抬（PAD_LIFT_FROM），
 * 因为翅芽的前端本来就是长在胸背上的，抬起来就成了浮在背上的一块板。
 */
const PAD_LIFT = 0.085
/** 从翅芽长度的百分之几处开始翘 —— 之前仍贴合胸背 */
const PAD_LIFT_FROM = 0.45

// ---------------------------------------------------------------- 躯干断面表

/** 一段躯干的断面表：[x, 中心 y, 背腹半径 ry, 横向半径 rz] */
type Station = readonly [number, number, number, number]

/*
 * 为什么头/前胸/中后胸不用 spindle() 而是逐段手写断面表：
 * spindle 的 taperStart/taperEnd 只改写首尾**那一个**截面，与正弦包络的
 * 倒数第二个截面之间会留下一个突跳（成虫 cicada.ts 的中胸就带着这么一个
 * 喇叭口）。这只若虫的躯干是连续渐变的一条，任何一处台阶都会让它读成
 * 「几个分开的鼓包」（东方蝼蛄 2026-08-12 修过同样的病）。
 * 手写断面表还有一个好处：相邻两段的搭接半径由我自己对齐 ——
 * 后一段的端面盖子被前一段包住，接缝彻底看不见。
 */
const HEAD: readonly Station[] = [
  [1.86, 0.02, 0.05, 0.06],
  [1.8, 0.03, 0.135, 0.19],
  [1.72, 0.05, 0.205, 0.31],
  [1.64, 0.07, 0.25, 0.39],
  [1.56, 0.08, 0.26, 0.42], // 复眼所在，头最宽处
  [1.48, 0.09, 0.245, 0.39],
  [1.4, 0.09, 0.2, 0.29],
  [1.34, 0.09, 0.15, 0.2], // 颈：细，插进前胸的领口里
]

const PRONOTUM: readonly Station[] = [
  [1.46, 0.09, 0.17, 0.25], // 端面藏在头里
  [1.36, 0.1, 0.27, 0.4],
  [1.24, 0.11, 0.36, 0.5],
  [1.1, 0.11, 0.42, 0.56], // 前胸背板最宽 —— 比头还宽，蝉科若虫的特征
  [0.98, 0.1, 0.41, 0.55],
  [0.86, 0.09, 0.38, 0.52],
]

const MESONOTUM: readonly Station[] = [
  [0.98, 0.09, 0.33, 0.45], // 端面藏在前胸里
  [0.86, 0.08, 0.42, 0.53],
  [0.74, 0.08, 0.46, 0.565],
  [0.62, 0.07, 0.48, 0.58], // 中胸最高：翅芽与飞行肌的地基（蝼蛄没有这个隆起）
  [0.48, 0.06, 0.48, 0.575],
  [0.36, 0.05, 0.47, 0.565],
  [0.24, 0.04, 0.46, 0.555],
]

/** 后唇基：额前的大鼓包，抽树汁的唧筒肌肉住在里面 */
const CLYPEUS: readonly Station[] = [
  [1.44, -0.15, 0.13, 0.13],
  [1.53, -0.14, 0.2, 0.19],
  [1.62, -0.12, 0.23, 0.215],
  [1.71, -0.09, 0.215, 0.2],
  [1.79, -0.05, 0.16, 0.145],
  [1.86, -0.02, 0.07, 0.06],
]

/**
 * 翅芽沿自身长轴的断面：[t, 半厚(背腹), 半宽(横向)]。基部窄 → 中段最宽 → 末端收成钝圆。
 *
 * 末端不收成针尖（第一版末端半宽只有 0.026）：后缘要能投出一道有宽度的阴影缝，
 * 尖成一点的末端在成图里连一条缝都占不满。真实的翅芽末端也是钝圆的一片。
 */
const PAD_PROFILE: readonly (readonly [number, number, number])[] = [
  [0, 0.04, 0.085],
  [0.12, 0.068, 0.19],
  [0.28, 0.066, 0.262],
  [0.5, 0.058, 0.278],
  [0.72, 0.046, 0.246],
  [0.86, 0.036, 0.198],
  [0.95, 0.026, 0.132],
  [1, 0.012, 0.046],
]

// ---------------------------------------------------------------- 局部工具

/** 按断面表放样一段躯干 */
function trunk(stations: readonly Station[], material: THREE.Material, name: string): THREE.Mesh {
  const sections: Section[] = stations.map(([x, cy, ry, rz]) => ({
    at: new THREE.Vector3(x, cy, 0),
    ry,
    rz,
  }))
  const m = new THREE.Mesh(loft(sections, 26), material)
  m.name = name
  return m
}

/** 断面表在任意 x 处的线性插值；落在表外返回 null */
function sampleStation(stations: readonly Station[], x: number): { cy: number; ry: number; rz: number } | null {
  const first = stations[0][0]
  const last = stations[stations.length - 1][0]
  const lo = Math.min(first, last)
  const hi = Math.max(first, last)
  if (x < lo || x > hi) return null
  for (let i = 0; i < stations.length - 1; i++) {
    const a = stations[i]
    const b = stations[i + 1]
    if ((x - a[0]) * (x - b[0]) > 0) continue
    const t = Math.abs(b[0] - a[0]) < 1e-9 ? 0 : (x - a[0]) / (b[0] - a[0])
    return {
      cy: THREE.MathUtils.lerp(a[1], b[1], t),
      ry: THREE.MathUtils.lerp(a[2], b[2], t),
      rz: THREE.MathUtils.lerp(a[3], b[3], t),
    }
  }
  return null
}

/** 背中线在 x 处的高度 —— 蜕裂线要贴着这条走，所以直接从断面表算，不另抄一份数字 */
function dorsalTop(x: number): number {
  let best = -Infinity
  for (const stations of [HEAD, PRONOTUM, MESONOTUM]) {
    const s = sampleStation(stations, x)
    if (s) best = Math.max(best, s.cy + s.ry)
  }
  return best
}

/** 一串点之间的渐变圆管（腿节/胫节/齿突都用它） */
function taperedTube(
  points: readonly THREE.Vector3[],
  radii: readonly number[],
  material: THREE.Material,
  radial = 12,
): THREE.Mesh {
  const sections: Section[] = points.map((p, i) => ({ at: p.clone(), ry: radii[i], rz: radii[i] }))
  return new THREE.Mesh(loft(sections, radial), material)
}

/**
 * 开掘前足腿节的半径包络：两端收细、最粗处偏后（t = 0.44）。
 * 齿突要落在腿节表面上，所以它和放样共用这一份，不各算各的。
 */
function femurRadius(t: number): number {
  const peak = 0.44
  const k = t < peak ? t / peak : (1 - t) / (1 - peak)
  const s = Math.sin(Math.max(0, Math.min(1, k)) * Math.PI * 0.5)
  const endR = t < peak ? 0.52 : 0.36 // 基端接基节、末端接胫节，各自收到最粗处的一半左右
  return FEMUR_R * (endR + (1 - endR) * s)
}

/**
 * 一条开掘前足（side = 1 右 / −1 左）。
 *
 * 全部几何直接放样在**绝对坐标**里、不带任何 mesh 变换 —— 与东方蝼蛄的
 * 挖掘足同一套写法。这样测试量「齿突尖到腿节轴线的垂距」时，
 * 顶点坐标与导出的轴线常量在同一套空间里，不用再穿一遍矩阵。
 * 也不走 kit.leg()：那个函数画的是粗细均匀的三段折线，做不出
 * 「窄基节 → 骤然膨大的纺锤腿节 → 短而弯的钩状胫节」这种截面突变。
 */
function diggingForeleg(
  side: 1 | -1,
  legMaterial: THREE.Material,
  toothMaterial: THREE.Material,
): { group: THREE.Group; clawTip: THREE.Vector3 } {
  const g = new THREE.Group()
  const z = (v: number) => v * side

  // ---- 基节：短而粗，从前胸腹侧斜向前下外方伸出
  const base = new THREE.Vector3(1.18, -0.2, z(0.32))
  const femurStart = new THREE.Vector3(FORE_FEMUR_START[0], FORE_FEMUR_START[1], z(FORE_FEMUR_START[2]))
  const coxa = taperedTube([base, femurStart], [0.15, 0.13], legMaterial, 14)
  coxa.name = 'fore-coxa'
  g.add(coxa)

  const dir = new THREE.Vector3(FORE_FEMUR_DIR[0], FORE_FEMUR_DIR[1], z(FORE_FEMUR_DIR[2]))

  /*
   * 腿节：整条腿的招牌。
   * 截面刻意做成 ry(背腹深) = r×1.12、rz(横向宽) = r×0.86 —— 两个方向都实打实
   * 撑开，比值只有 1.3，绝不是「一块加粗的平板」；深大于宽是因为掘土的力
   * 沿背腹方向传递，实物的腿节也是这个方向更厚。
   */
  const steps = 16
  const femurSections: Section[] = []
  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    const r = femurRadius(t)
    femurSections.push({
      at: femurStart.clone().addScaledVector(dir, FORE_FEMUR_LENGTH * t),
      ry: r * 1.12,
      rz: r * 0.86,
    })
  }
  const femur = new THREE.Mesh(loft(femurSections, 22), legMaterial)
  femur.name = 'fore-femur'
  g.add(femur)

  /*
   * 腹缘齿突：3 枚，位置取 t = 0.28 / 0.52 / 0.76。
   * 「腹缘」= 垂直于腿节轴、指向腹侧的那个方向，正好是放样标架里 u 的反向；
   * 齿尖到轴线的距离一律取「该处腿节半径 + 0.15~0.16」，
   * 也就是**必定探出腿节最粗处的轮廓之外**（0.258）——
   * 这一条正是「齿突要真的凸出来」的可测形式：不探出去的齿在剪影里根本不存在。
   */
  const up = new THREE.Vector3(0, 1, 0)
  const lateral = new THREE.Vector3().crossVectors(dir, up).normalize()
  const dorsal = new THREE.Vector3().crossVectors(lateral, dir).normalize() // ≈ +Y
  const ventral = dorsal.clone().negate()
  for (const [t, out] of [
    [0.28, 0.15],
    [0.52, 0.16],
    [0.76, 0.15],
  ] as const) {
    const onAxis = femurStart.clone().addScaledVector(dir, FORE_FEMUR_LENGTH * t)
    const surfaceR = femurRadius(t) * 1.12
    const root = onAxis.clone().addScaledVector(ventral, surfaceR * 0.72)
    const tip = onAxis
      .clone()
      .addScaledVector(ventral, surfaceR + out)
      .addScaledVector(dir, 0.06) // 齿尖略向前倾，掘土时才咬得住土
    const mid = root.clone().lerp(tip, 0.45)
    const tooth = taperedTube([root, mid, tip], [0.062, 0.046, 0.009], toothMaterial, 12)
    tooth.name = 'fore-tooth'
    g.add(tooth)
  }

  // ---- 膝关节球：填住腿节与胫节的折角，避免破面
  const femurEnd = femurStart.clone().addScaledVector(dir, FORE_FEMUR_LENGTH)
  const knee = new THREE.Mesh(new THREE.SphereGeometry(0.09, 14, 12), legMaterial)
  knee.position.copy(femurEnd)
  knee.name = 'fore-knee'
  g.add(knee)

  /*
   * 胫节 + 端爪：短、弯、末端成钩，静止时折回腿节腹面（合起来的折刀）。
   * 这个折叠姿态是知了猴最好认的剪影之一 —— 它把前足读成「一对小挖掘机爪」，
   * 而不是「两根伸出去的棍」。
   */
  const off = (dx: number, dy: number, dz: number) => femurEnd.clone().add(new THREE.Vector3(dx, dy, z(dz)))
  const tibiaPts = [femurEnd.clone(), off(-0.07, -0.19, 0.055), off(-0.22, -0.3, 0.09), off(-0.41, -0.3, 0.08)]
  const tibia = taperedTube(tibiaPts, [0.086, 0.075, 0.055, 0.033], legMaterial, 14)
  tibia.name = 'fore-tibia'
  g.add(tibia)

  const clawTip = off(-0.53, -0.23, 0.055)
  const claw = taperedTube([tibiaPts[3], off(-0.47, -0.28, 0.07), clawTip], [0.035, 0.022, 0.007], toothMaterial, 10)
  claw.name = 'fore-claw'
  g.add(claw)

  return { group: g, clawTip }
}

/**
 * 后缘翘起的包络：t 是沿翅芽长轴的参数（0 基部 / 1 末端），返回沿局部 +Y 抬起的量。
 *
 * 用 k²（缓入）而不是 smoothstep：smoothstep 在末端把斜率收回 0，翅芽会以
 * 「平行于体表」的姿态结束，看起来像被压住的；k² 的斜率在末端最大，
 * 后缘是越翘越开的 —— 那才是一片自由边的样子。起点处斜率为 0，
 * 所以贴合段与翘起段之间不会出现一道折角。
 */
function padLift(t: number): number {
  if (t <= PAD_LIFT_FROM) return 0
  const k = (t - PAD_LIFT_FROM) / (1 - PAD_LIFT_FROM)
  return PAD_LIFT * k * k
}

/**
 * 一枚翅芽（side = 1 右 / −1 左）。
 *
 * 姿态**显式给三根轴**，不用 `quaternion.setFromUnitVectors()`：
 * 那个函数只把长度轴对上，绕长度轴的滚转是它自己随便挑的 ——
 * 兰花螳螂的花瓣状腿节就是这么变成几片侧立薄板的（宽厚比断言一路全绿，
 * 渲染出来整只虫像一只苍白的虾）。翅芽的扁平面朝哪儿是这个部件的全部意义，
 * 绝不能交给一个未定义的自由度。
 */
function wingPad(side: 1 | -1, padMaterial: THREE.Material, veinMaterial: THREE.Material): THREE.Group {
  const base = new THREE.Vector3(PAD_BASE[0], PAD_BASE[1], PAD_BASE[2] * side)
  const tip = new THREE.Vector3(PAD_TIP[0], PAD_TIP[1], PAD_TIP[2] * side)
  const len = base.distanceTo(tip)

  const g = new THREE.Group()

  const sample = (t: number, col: 1 | 2): number => {
    for (let i = 0; i < PAD_PROFILE.length - 1; i++) {
      const a = PAD_PROFILE[i]
      const b = PAD_PROFILE[i + 1]
      if (t >= a[0] && t <= b[0]) return THREE.MathUtils.lerp(a[col], b[col], (t - a[0]) / (b[0] - a[0]))
    }
    return PAD_PROFILE[PAD_PROFILE.length - 1][col]
  }
  const halfThick = (t: number) => sample(t, 1)
  const halfWidth = (t: number) => sample(t, 2)

  /*
   * 局部几何沿 +X 长出：loft 的标架在这个走向下是 ry→+Y（厚）、rz→+Z（宽），
   * 所以扁平面的法线就是局部 +Y，正好交给下面的 makeBasis 去指方向。
   *
   * 站位数从 PAD_PROFILE 的 8 个加密到 16 个：中心线现在是弯的（padLift），
   * 8 个站位会把这条弧折成几段直线，翘起来那一段会出现两道假棱。
   * 断面形状仍然只由 PAD_PROFILE 定义，这里只是重采样。
   */
  const STATIONS = 16
  const sections: Section[] = []
  for (let i = 0; i <= STATIONS; i++) {
    const t = i / STATIONS
    sections.push({ at: new THREE.Vector3(t * len, padLift(t), 0), ry: halfThick(t), rz: halfWidth(t) })
  }
  const blade = new THREE.Mesh(loft(sections, 20), padMaterial)
  blade.name = 'wing-pad'
  g.add(blade)

  /*
   * 翅缘。两条边**不对称**，这一点很要紧：
   *
   * - 外缘（局部 −Z，落在体侧那一边）是真正的**前缘**，也是翅芽唯一自由的
   *   那条边。它用浅色、做粗一档，并且压在芽面的中面上（y ≈ 0）——
   *   那是它在剪影里的位置。
   * - 内缘（局部 +Z，压在背中线那一边）只用**翅芽自己的材质**做一道细棱。
   *
   * 第一版两边都用浅色、都架在上棱上，出图读成「一枚椭圆徽章」：一圈亮边
   * 围着一块暗地，人眼的第一解释是凹进去的碟，不是盖上去的片。
   * 真实的翅芽也只有外缘是加厚发亮的一条，内缘是掖在背中线下面的。
   */
  for (const [edge, mat, r0, yk] of [
    [-1, veinMaterial, 0.025, 0.06],
    [1, padMaterial, 0.017, 0.4],
  ] as const) {
    const pts: THREE.Vector3[] = []
    const rs: number[] = []
    for (let i = 0; i <= 12; i++) {
      const t = 0.06 + (i / 12) * 0.9
      pts.push(new THREE.Vector3(t * len, padLift(t) + halfThick(t) * yk, edge * halfWidth(t) * 0.97))
      rs.push(r0 * (1 - t * 0.45))
    }
    const rim = taperedTube(pts, rs, mat, 8)
    rim.name = 'pad-rim'
    g.add(rim)
  }

  /*
   * 前缘的肩棱：一道横跨芽面的隆脊，位置就在翅芽**钻出胸背的那一处**。
   *
   * 翅芽的基部四分之一是埋在中胸里的（真实若虫也是这样：翅芽从前胸背板的
   * 后缘底下长出来），所以人眼看到的「翅芽从哪儿开始」不在 t=0，
   * 而在它露头的那条线上 —— 实测在 t ≈ 0.25。没有这道棱，露头处是芽面与
   * 胸背两个曲面相切着**渐变**出来的一条软边，读不出边界；
   * 有了它，翅芽的轮廓在前端闭合，成了一片有边界的盖片。
   *
   * 高度取 halfThick×0.95 + 管半径：必须真的**探出芽面的脊**才看得见。
   * 第一版放在 halfThick×0.42 处，整条棱藏在芽面内部，等于没做
   * ——「几何写了但埋在别的几何里」是这个项目反复踩的坑（东方蝼蛄的挖掘足、
   * 蝉卵的卵室底都栽过），改完一定要回到出图上确认它真的露出来了。
   *
   * 刻意用翅芽自己的材质而不是浅色翅缘色 —— 这道棱要靠明暗转折被看见，
   * 画一条亮线就又退回「靠色不靠形」了。
   */
  {
    const t0 = 0.27
    const w = halfWidth(t0)
    const pts: THREE.Vector3[] = []
    const rs: number[] = []
    for (let i = 0; i <= 10; i++) {
      const u = -1 + (i / 10) * 2
      // 中间略向前（−x）鼓一点：真实翅芽的前缘是一道弧，不是一根横杠
      pts.push(
        new THREE.Vector3(t0 * len - (1 - u * u) * 0.05, padLift(t0) + halfThick(t0) * 0.95, u * w * 0.92),
      )
      rs.push(0.027 * (1 - Math.abs(u) * 0.35))
    }
    const shoulder = taperedTube(pts, rs, padMaterial, 10)
    shoulder.name = 'pad-shoulder'
    g.add(shoulder)
  }

  // 三条翅脉：从基部向末端扇开 —— 这是「里面装的确实是一副翅」的可视证据
  for (const k of [-1, 0, 1]) {
    const pts: THREE.Vector3[] = []
    const rs: number[] = []
    for (let i = 0; i <= 10; i++) {
      const t = 0.2 + (i / 10) * 0.72
      const spread = THREE.MathUtils.lerp(0.02, 0.072, (t - 0.2) / 0.72)
      pts.push(new THREE.Vector3(t * len, padLift(t) + halfThick(t) * 0.86, k * spread))
      rs.push(0.014 * (1 - t * 0.4))
    }
    const vein = taperedTube(pts, rs, veinMaterial, 6)
    vein.name = 'pad-vein'
    g.add(vein)
  }

  const xAxis = tip.clone().sub(base).normalize()
  /*
   * 扁平面法线：从 +Y 向外侧倾 40°（PAD_DROOP）—— 外缘下垂、内缘压在背上，
   * 就是「贴伏」的姿态。这个角度保留：第一版把翅芽读不出来的账算在它头上，
   * 是算错了（顶视机位角度最有利、照样读成条纹，见文件头招牌结构第 2 条），
   * 真正的两个根因是明度排反与后缘没缝，都跟外倾几度无关。
   * 40° 时翅芽的外缘在侧视里探出腹部轮廓约 0.15，顶视也还能看到整片芽面。
   *
   * 注意后缘的翘起（padLift）是沿**这根 yAxis** 抬的，不是沿世界 +Y：
   * 翅芽要离开的是它自己趴着的那个面，而那个面是斜的。
   */
  const n = new THREE.Vector3(0, Math.cos(PAD_DROOP), Math.sin(PAD_DROOP) * side)
  const yAxis = n.addScaledVector(xAxis, -n.dot(xAxis)).normalize()
  const zAxis = new THREE.Vector3().crossVectors(xAxis, yAxis)
  g.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(xAxis, yAxis, zAxis))
  g.position.copy(base)
  return g
}

// ---------------------------------------------------------------- 主体

export function buildCicadaNymph(): InsectModel {
  const g = new THREE.Group()

  // ---- 材质：明度按档排开（见文件头注释），泥土质感靠 punctate + 极低 gloss
  const abdomenColor = '#a3703c'
  const abdomenMat = chitin({ color: abdomenColor, gloss: 0.14, surface: 'punctate' })
  const thoraxMat = chitin({ color: '#946230', gloss: 0.16, surface: 'punctate' })
  const headMat = chitin({ color: '#8a5a2c', gloss: 0.18, surface: 'punctate' })
  const clypeusMat = chitin({ color: '#9c6a35', gloss: 0.2, surface: 'punctate' })
  const clypeusGrooveMat = chitin({ color: '#6b4520', gloss: 0.18 })
  /*
   * 翅芽：41% 明度，与胸背（38%）同档、还略亮一点点。
   * 这是这一版最关键的一处 —— 它此前是 27%，比自己趴着的那个面还暗，
   * 于是四个机位一致读成「胸背上的一块深色斑纹」（详见文件头）。
   * 饱和度压到 32%（胸背 52%）、gloss 提到 0.3 且不上 punctate：
   * 芽面是光的，胸背是挂泥的，同一束光下两者的反应不一样 ——
   * 这是**质感差**，跟明度差不是一回事，也不会把凸起读成斑。
   */
  const padMat = chitin({ color: '#8d6f46', gloss: 0.3, clearcoat: 0.12 })
  const padVeinMat = chitin({ color: '#c2a074', gloss: 0.25 })
  const foreMat = chitin({ color: '#c08b48', gloss: 0.38, clearcoat: 0.2 }) // 掘土磨亮：全身最亮的结构色
  const toothMat = chitin({ color: '#2a1a0c', gloss: 0.45, clearcoat: 0.25 })
  const legMat = chitin({ color: '#8a5f30', gloss: 0.2, surface: 'punctate' })
  const sutureMat = chitin({ color: '#4a2f16', gloss: 0.24 })

  // ---- 躯干：头 → 前胸 → 中后胸，三段搭接，端面互相藏进对方体内
  g.add(trunk(HEAD, headMat, 'head'))
  g.add(trunk(PRONOTUM, thoraxMat, 'pronotum'))
  g.add(trunk(MESONOTUM, thoraxMat, 'mesonotum'))
  g.add(trunk(CLYPEUS, clypeusMat, 'clypeus'))

  // ---- 后唇基的横向沟纹：4 道环脊。唧筒肌肉一束一束附着在这些脊上，实物沟纹很深
  for (const x of [1.5, 1.6, 1.7, 1.78]) {
    const s = sampleStation(CLYPEUS, x)
    if (!s) continue
    const ring = new THREE.Mesh(new THREE.TorusGeometry(s.rz * 0.97, 0.018, 6, 18), clypeusGrooveMat)
    ring.rotation.y = Math.PI / 2 // 环面法线转到 +X，套在唇基上
    ring.position.set(x, s.cy, 0)
    ring.name = 'clypeus-ridge'
    g.add(ring)
  }

  // ---- 腹部：饱满、8 节、节间沟明显。节间膜由 kit 按体节基色自动压暗推导
  const abdomenOpts: SegmentedAbdomenOptions = {
    from: [ABDOMEN_FROM, 0.02, 0],
    to: [ABDOMEN_TO, 0.1, 0],
    r0: 0.47,
    r1: 0.31,
    segments: 7,
    // 0.13 时侧视里的节间棱偏硬，像一串套在一起的圆环；知了猴的腹是软的、
    // 节间沟只是一道浅浅的凹陷（脱壳前腹部还要胀大），所以浅一档到 0.1
    groove: 0.1,
    flat: 1.02,
    bulge: 0.4,
    color: abdomenColor,
  }
  const abdomen = new THREE.Mesh(segmentedAbdomen(abdomenOpts), abdomenMat)
  abdomen.name = 'abdomen'
  g.add(abdomen)
  for (const m of segmentedAbdomenMembranes(abdomenOpts)) {
    m.name = 'abdomen-membrane'
    g.add(m)
  }
  /*
   * 腹末：segmentedAbdomen() 的最后一个截面是被平切封口的，直接留着就是
   * 「一刀平口的管子」（东方蝼蛄 2026-08-12 记过同样的病）。
   * 但换成一颗球也不行 —— 实测那样是「塞了个软木塞」，球面朝光的一侧亮得
   * 与体节接不上。所以用一小段自己的断面表续着放样收圆：起始半径略大于
   * 腹部末端（把平口盖子吞掉），再按四分之一椭圆收到近乎一点。
   * 知了猴的腹末是钝圆的一个包，不是尖锥、不是切口，也不是塞子。
   */
  const tail = trunk(
    [
      [ABDOMEN_TO + 0.03, 0.1, 0.312, 0.322],
      [ABDOMEN_TO - 0.08, 0.1, 0.298, 0.308],
      [ABDOMEN_TO - 0.19, 0.1, 0.256, 0.265],
      [ABDOMEN_TO - 0.29, 0.1, 0.18, 0.187],
      [ABDOMEN_TO - 0.37, 0.1, 0.062, 0.065],
    ],
    abdomenMat,
    'abdomen',
  )
  g.add(tail)

  /*
   * 蜕裂线：背中线上一道深色纵脊，从头后一直走到中胸末端。
   * 「金蝉脱壳」时壳就是从这条线裂开、成虫从裂口里挤出来的 ——
   * 若虫身上最有文化分量的一处结构，值得单独一条几何。
   * 高度直接从断面表算（dorsalTop），不另抄数字，才不会有的地方浮空、有的地方陷进去。
   */
  {
    const pts: THREE.Vector3[] = []
    const rs: number[] = []
    const xs = [1.4, 1.28, 1.16, 1.04, 0.92, 0.8, 0.68, 0.56, 0.44, 0.32, 0.26]
    for (const [i, x] of xs.entries()) {
      pts.push(new THREE.Vector3(x, dorsalTop(x) - 0.006, 0))
      rs.push(i === 0 || i === xs.length - 1 ? 0.009 : 0.024)
    }
    const suture = new THREE.Mesh(
      loft(
        pts.map((p, i) => ({ at: p, ry: rs[i], rz: rs[i] * 1.15 })),
        10,
      ),
      sutureMat,
    )
    suture.name = 'suture'
    g.add(suture)
  }

  // ---- 复眼：小、略凸而不外突（若虫在地下，视觉用不上；成虫那对大凸眼是羽化后才有的）
  g.add(
    compoundEyePair({
      at: [1.56, 0.13, 0.36],
      radius: 0.1,
      color: '#3d1c12',
      flatten: 0.82,
      stretch: 0.85,
      facets: false,
    }),
  )

  // ---- 触角：短，鞭状，4~5 节。若虫的触角比成虫那对刚毛状的相对长些
  g.add(
    antennaPair(
      { base: [1.76, 0.02, 0.2], length: 0.34, kind: 'filiform', pitch: 8, yaw: 44, thickness: 0.024 },
      headMat,
    ),
  )

  /*
   * 刺吸式喙：从头部腹面（唇基之后）向后下方伸出，贴着胸部腹面一路到中足之间。
   * angle = 81° 让方向几乎是水平向后（dir ≈ (−0.988, −0.156, 0)），
   * 这正是「贴伏腹面」的意思 —— 立起来的喙是蚊子那种刺吸姿态，不是蝉的。
   */
  const beak = rostrum({ at: [1.47, -0.34, 0], length: 1.26, thickness: 0.072, angle: 78 }, headMat)
  beak.name = 'rostrum'
  g.add(beak)

  /*
   * 中足与后足：普通行走足，细。
   * thickness 0.070 → 最粗处约 0.11，与开掘足腿节的 0.266 差 2.4 倍，
   * 这个差值就是「三对腿不一样粗」这句话的可测形式。
   * 从 0.062 提到 0.070 是因为四机位实拍里中后足细得像铁丝、
   * 与躯干的质感脱节；与前足的反差仍然一眼看得出（下限 2.2 还留着余量）。
   * 名字统一打成 walk-leg，测试按名字取「最粗处」与前足对比。
   */
  for (const spec of [
    { base: [0.62, -0.26, 0.44] as [number, number, number], femur: 0.38, tibia: 0.36, tarsus: 0.16, splay: 18, sweep: 14, knee: 82 },
    { base: [0.18, -0.28, 0.43] as [number, number, number], femur: 0.42, tibia: 0.4, tarsus: 0.18, splay: 16, sweep: 38, knee: 84 },
  ]) {
    const pair = legPair({ ...spec, thickness: 0.07 }, legMat)
    pair.traverse((o) => {
      if ((o as THREE.Mesh).isMesh) o.name = 'walk-leg'
    })
    g.add(pair)
  }

  // ---- 开掘前足：本阶段的招牌
  const foreR = diggingForeleg(1, foreMat, toothMat)
  const foreL = diggingForeleg(-1, foreMat, toothMat)
  g.add(foreR.group, foreL.group)

  // ---- 翅芽：本阶段的教学重点（「已经像一只蝉了，只是翅还是芽」）
  g.add(wingPad(1, padMat, padVeinMat), wingPad(-1, padMat, padVeinMat))

  const anchors: Record<string, THREE.Vector3> = {
    foreleg: foreR.clawTip.clone(),
    wingPad: new THREE.Vector3(0.22, 0.44, 0.52),
    rostrum: new THREE.Vector3(0.8, -0.52, 0),
    eye: new THREE.Vector3(1.58, 0.18, 0.46),
    head: new THREE.Vector3(1.66, -0.2, 0),
    abdomen: new THREE.Vector3(-0.72, 0.42, 0),
  }

  return finalize(g, anchors)
}
