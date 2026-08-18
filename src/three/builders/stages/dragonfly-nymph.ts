/**
 * 碧伟蜓 Anax parthenope · 若虫（水虿）
 *
 * ## 这只虫存在的意义
 *
 * 蜻蜓是**不完全变态**：卵 → **若虫（水虿）** → 成虫。**没有蛹，也没有「幼虫」这一步。**
 * 所以本目录里蜻蜓只有 `dragonfly-egg.ts` 与本文件两个阶段，绝不会出现
 * `dragonfly-larva.ts` / `dragonfly-pupa.ts`（`stages.ts` 的契约闸门会当场红，
 * 而且那等于把中小学讲昆虫的第一个知识点讲反）。
 *
 * 但水虿与蝉若虫（`cicada-nymph.ts`）在「若虫 = 缩小版成虫」这句话上分量不同：
 * 蝉若虫确实就是一只矮胖的小蝉，水虿却**换了一套生活方式** —— 它在水里、用鳃呼吸、
 * 用一副能弹射的下唇捕食，形态与那只在空中悬停的细长成虫反差极大。
 * 这正是它值得单独建一个阶段的理由：不完全变态**不等于**「若虫长得像成虫」，
 * 只等于「没有蛹期、靠逐次蜕皮变过去」。可视证据仍然是背上那两对**翅芽**。
 *
 * ## 招牌结构
 *
 * 1. **可折叠的面罩状下唇（labial mask）** —— 全世界最有名的昆虫捕食结构之一，
 *    也是这只虫的头号招牌。静止时整副下唇**折成一个 Z**：后颏（postmentum）
 *    自头部腹面后缘向**后**伸到中足之间，在那里的铰链处折回，前颏（prementum）
 *    再向**前**伸回来盖住整个头部腹面，末端一对钩状颚叶（labial palps）
 *    探到脸前。捕食时这个 Z 展开、把颚叶弹到猎物身上。
 *
 *    **做这一件事最容易砸的方式，是把它做成「脸上的一块阴影」**：它天然就是
 *    「贴在脸上的一片」，只要比头暗一点点，人眼立刻读成脸的一部分。
 *    `cicada-nymph.ts` 的翅芽在这上面栽过一次（四个机位一致读成「胸背上的
 *    一块深色斑纹」），两个根因这里逐条对着做了：
 *
 *    a. **明度不许排反。** 面罩 40% ≥ 头 32%（实测见 `MASK_*` 材质），
 *       靠**形**被认出来，不靠更暗的颜色。
 *    b. **必须离开脸、投得出阴影缝。** 整副面罩与体表之间处处留 0.07~0.16 的缝
 *       （最窄处也有体长的 1.5%），前缘（自由端）留得最宽 —— 那一端本来就是
 *       张开的。另有一道横跨的**转折棱**压在前缘外侧面上，让面罩的轮廓
 *       在前端自己闭合，而不是与脸渐变成一片。
 *
 *    此外中线一道纵脊（`mask-keel`，真实前颏中央就有一道中缝/隆脊）与两侧的
 *    卷边（`mask-rim`）—— 三道棱一起把这片东西读成「一个装置」，不是一张脸。
 *
 *    注：碧伟蜓属蜓科，面罩是**扁平型**（不像蜻科那种勺形面罩一路盖到复眼下方），
 *    所以这里只盖住头的腹面与前下方，脸的上半仍露着。
 *
 * 2. **两对翅芽**：中胸一对（内侧、略长）+ 后胸一对（外侧、略宽），向后贴伏，
 *    末端只搭到腹部前 25~30%，**不是完整的翅**（成虫前翅有体长的 ~57%）。
 *    做两对而不是一对，是因为成虫有四片翅 —— 只做一对，等于把「四翅」讲丢了；
 *    真实水虿的背上也确实是四片挨在一起的芽。
 *
 *    同样按上面 a/b 两条做：翅芽 42% ≥ 胸背 33%；后缘沿翅芽自身的「上」方向
 *    翘起（`PAD_LIFT`），末端离体表约 0.08~0.12，前段仍埋在胸背里。
 *
 * 3. **腹末三枚三角形尾附器**（肛锥 anal pyramid）：背面一枚肛上板 + 腹侧一对
 *    肛侧板。水虿的鳃在直肠里（直肠鳃，看不见），末端露在外面的就是这三枚尖突，
 *    喷水推进时也靠它们。另有两枚很短的尾须，短到在这个精度下做出来只是噪点，
 *    故不做。
 *
 * 4. **粗短有力的六足**：thickness 0.09，是成虫（0.045~0.055）的两倍，
 *    而且向体侧**撑开**（splay 45~55）—— 水虿是在水底爬的，不是像成虫那样
 *    把六足收成飞行时的「捕虫篮」。
 *
 * 5. **大而分开的复眼**：位于头部前侧角、明显外凸，但**左右分开**——
 *    成虫那对在头顶相接的接眼式（holoptic）巨眼是羽化之后才有的。
 *
 * 6. **腹侧刺**：第 7~9 节侧缘各一枚后指的短刺，蜓科水虿的常见特征，
 *    也让剪影不至于是一条光溜溜的桶。
 *
 * ## 体型（与成虫的反差本身就是内容）
 *
 * 成虫体长约 7.5 厘米、腹部细成一根棍（`dragonfly.ts` 里腹末半径 0.05）；
 * 水虿体长 4.7 厘米却**粗壮扁宽**：最宽处 1.26（长/宽 ≈ 3.7），
 * 而且是**背腹压扁**的（宽/高 ≈ 1.7，`flat = 1.32`）—— 趴在水底的虫都这样。
 * 做细了会读成一条水生的蠼螋或石蝇稚虫，那是这只虫最容易失手的地方，
 * 所以测试里长/宽与宽/高各钉了上下限。
 *
 * ## 颜色
 *
 * 土褐至橄榄褐、哑光、带藻泥感（水底伪装）。明度按档排开（sRGB）：
 * 翅芽 42% > 面罩 40% > 腹部 37% > 胸背 33% > 头 32% > 足 32% > 端钩 10%。
 * 两条要害都是**有向**的：翅芽 ≥ 胸背、面罩 ≥ 头 —— 深色贴浅色只会读成斑纹。
 *
 * 「斑驳」不靠画斑点：程序化的规整斑点是本项目栽过的坑（柞蚕蛾卵的
 * 「奶牛纹土豆」、独角仙卵的「珍珠配巧克力球」）。这里的斑驳来自
 * `surface: 'punctate'` 的刻点法线 + 节间膜自动压暗 35% 的一圈圈软组织，
 * 都是真实结构，不是画上去的。**本文件不使用任何随机数**，
 * 所以也不存在种子漂移导致测试闪烁的问题。
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
  segmentedAbdomen,
  segmentedAbdomenMembranes,
  type InsectModel,
  type Section,
  type SegmentedAbdomenOptions,
} from './../kit'

// ---------------------------------------------------------------- 尺寸常量

/** 腹部起止 x。接上尾端收圆段与肛锥后，体长实测约 4.55（头前缘 2.42 → 尾尖 −2.12） */
const ABDOMEN_FROM = 0.88
const ABDOMEN_TO = -1.48
/**
 * 腹部起止半径与最粗处位置。
 *
 * **第一版栽在这三个数上**：r1 = 0.16、bulge = 0.30 出来是一条从胸部起匀速
 * 收细、末端接两根长刺的锥体 —— 四机位实拍一致读成**衣鱼/石蛃**，不是水虿。
 * 真实水虿的腹是「前中段一路饱满、最后两三节才收」的桶：所以最粗处后移到
 * 0.44，末端半径提到 0.21（末端半宽 0.28，仍有腹部最宽处的 44%），
 * 肛锥也从 0.68 缩到 0.57。剪影这才从「一条带尾刺的鱼」变回「一只趴着的虫」。
 */
const ABDOMEN_R0 = 0.45
const ABDOMEN_R1 = 0.24
const ABDOMEN_BULGE = 0.62
/**
 * 背腹压扁量（kit 的语义：`ry = r/flat, rz = r*flat`，**>1 = 上下压扁**）。
 * 1.32 → 宽/高 = 1.74，正是「扁宽」的可测形式。趴在水底的虫都这个断面，
 * 而成虫的腹部是近乎圆截面的一根细棍 —— 两者的反差是这个阶段要讲的内容之一。
 */
const ABDOMEN_FLAT = 1.32

/**
 * 翅芽后缘的翘起量：末端沿翅芽自身的「上」方向抬离体表多少（1 = 1 厘米）。
 *
 * 这是「盖片」与「膏药」的分界线，直接抄自 `cicada-nymph.ts` 用四机位实拍
 * 换来的结论：整片贴着体表走、后缘与体表之间没有缝，就投不出阴影，
 * 四个机位会一致读成「胸背上的一块深色斑纹」。真实若虫的翅芽只有基部固定，
 * 后缘是自由的、微微外张。
 *
 * 0.12 是按体长比例从蝉若虫的 0.085 放大来的（3.2 → 4.7 厘米），
 * 末端实测离体表 0.08~0.12：成图里约 10~15 像素的一道缝，看得见，
 * 又不至于翘成兔耳朵。前 45% 不抬 —— 翅芽的前端本来就埋在胸背里。
 */
const PAD_LIFT = 0.12
const PAD_LIFT_FROM = 0.45

// ---------------------------------------------------------------- 躯干断面表

/** 一段躯干的断面表：[x, 中心 y, 背腹半径 ry, 横向半径 rz] */
type Station = readonly [number, number, number, number]

/*
 * 为什么头/前胸/合胸不用 spindle() 而是逐段手写断面表：
 * spindle 的 taperStart/taperEnd 只改写首尾**那一个**截面，与正弦包络的
 * 倒数第二个截面之间会留下一个突跳（成虫 dragonfly.ts 的胸就带着这么一个
 * 喇叭口，那只虫的胸被翅膀盖住了所以看不出来）。水虿的胸背是翅芽的地基、
 * 全裸露在外，任何一处台阶都会被读成「几个分开的鼓包」。
 * 手写断面表还有一个好处：相邻两段的搭接半径由我自己对齐 ——
 * 后一段的端面盖子被前一段包住，接缝彻底看不见。
 */
const HEAD: readonly Station[] = [
  [2.42, 0.0, 0.07, 0.1],
  [2.34, 0.02, 0.16, 0.26],
  [2.24, 0.04, 0.24, 0.4],
  [2.12, 0.05, 0.28, 0.47], // 复眼所在，头最宽处
  [2.0, 0.05, 0.27, 0.45],
  [1.9, 0.04, 0.22, 0.34],
  [1.82, 0.03, 0.15, 0.22], // 颈：细，插进前胸的领口里
]

const PRONOTUM: readonly Station[] = [
  [1.92, 0.03, 0.17, 0.26], // 端面藏在头里
  [1.84, 0.04, 0.25, 0.4],
  [1.74, 0.05, 0.3, 0.5],
  [1.64, 0.05, 0.31, 0.52],
  [1.54, 0.04, 0.29, 0.48],
]

/** 合胸：中后胸愈合成一块，翅芽与中后足全长在这一段上 */
const SYNTHORAX: readonly Station[] = [
  [1.6, 0.04, 0.27, 0.44], // 端面藏在前胸里
  [1.48, 0.05, 0.34, 0.52],
  [1.34, 0.07, 0.4, 0.57],
  [1.18, 0.08, 0.42, 0.59], // 最高最宽：翅芽的地基
  [1.02, 0.07, 0.42, 0.585],
  [0.9, 0.06, 0.4, 0.56],
  [0.8, 0.05, 0.38, 0.54],
]

/**
 * 面罩（前颏）的中线断面表：[x, 中心 y, 半厚, 半宽]。
 *
 * 后端窄（铰链处）→ 前端展宽成一面盾（真实前颏就是这个三角形），
 * 中心 y 比它下方的体表低 0.07~0.16 —— 那道缝就是「这是一副盖上去的面罩」
 * 而不是「脸的一部分」的全部证据（详见文件头招牌结构第 1 条 b）。
 *
 * y 值刻意**不逐点跟随体表起伏**：面罩是一块硬板，它不会贴着头与胸的每一个
 * 鼓包走。所以缝的宽度沿途是变的，前缘（自由端）最宽 —— 那正是自由边的样子。
 */
const MASK: readonly Station[] = [
  [1.35, -0.46, 0.05, 0.1], // 与后颏的铰链
  [1.55, -0.415, 0.055, 0.15],
  [1.75, -0.4, 0.058, 0.21],
  [1.95, -0.375, 0.058, 0.3],
  [2.14, -0.35, 0.054, 0.36], // 最宽处，正盖在脸下
  [2.28, -0.325, 0.05, 0.345],
  /*
   * 前端这三个站位**向上翘起**，盖住脸的前下方。
   *
   * 这是第二轮目视验收改的：面罩全平地压在腹面时，四个机位里只有正面机位
   * 看得见它的一条边，其余三个都只剩「头下面一根横杠」——招牌结构等于没做。
   * 真实折叠状态下前颏的远端本来就贴着脸向上兜，颚叶再从这里探出去，
   * 所以让它翘起来既是对的、也让「脸罩」这个读法在正面与侧面同时成立。
   */
  [2.4, -0.3, 0.045, 0.31],
  [2.47, -0.235, 0.04, 0.26],
  [2.5, -0.15, 0.028, 0.19], // 前缘：钝，不是刀口
]

/**
 * 后颏：从铰链处继续向**后**折到中足之间。
 *
 * **第一版把前颏一路做到 x=0.56，整副下唇成了一条从头贯到腹的长板**，
 * 侧视实拍读成「一条船的龙骨」而不是「一副折起来的下唇」。
 * 关键不在长短，在**分两截**：一面盖在脸下的宽盾（前颏）+ 一条明显更窄的
 * 后伸带（后颏），中间一个鼓出来的铰链结（`mask-hinge`）。
 * 三件放在一起，人才会读成「这东西是折着的、能弹出去」。
 */
const POSTMENTUM: readonly [number, number, number][] = [
  [1.4, -0.455, 0.0],
  [1.18, -0.47, 0.0],
  [0.96, -0.47, 0.0],
  [0.8, -0.45, 0.0],
]

/**
 * 翅芽沿自身长轴的断面：[t, 半厚(背腹), 半宽(横向)]，半宽会再乘各自的 widthScale。
 *
 * 末端不收成针尖：后缘要能投出一道**有宽度**的阴影缝，尖成一点的末端在成图里
 * 连一条缝都占不满（蝉若虫第一版就栽在这儿）。真实翅芽的末端也是钝圆的一片。
 */
const PAD_PROFILE: readonly (readonly [number, number, number])[] = [
  [0, 0.024, 0.42],
  [0.12, 0.039, 0.72],
  [0.3, 0.039, 0.95],
  [0.52, 0.035, 1.0],
  [0.72, 0.029, 0.9],
  [0.86, 0.023, 0.72],
  [0.95, 0.016, 0.48],
  [1, 0.008, 0.17],
]

interface PadSpec {
  /** 着生点（埋在胸背里）与末端（搭在腹部前段上） */
  base: readonly [number, number, number]
  tip: readonly [number, number, number]
  /** 扁平面法线绕自身长轴从 +Y 向外倾多少度 —— 「贴伏」的姿态 */
  droop: number
  /** 半宽的缩放：后翅芽基部更宽（成虫的后翅基部也更宽，见 dragonfly.ts 的 hindOutline） */
  width: number
}

/**
 * 两对翅芽。中胸的一对在内侧（贴背中线）、略长；后胸的一对在外侧、略宽。
 * z 上刻意留一条缝（内对最外 ≈0.30，外对最内 ≈0.28 附近相接），
 * 四片才读得出是四片，而不是背上糊成一块的甲。
 */
const PADS: readonly PadSpec[] = [
  { base: [1.36, 0.42, 0.16], tip: [0.15, 0.36, 0.24], droop: 30, width: 0.15 },
  { base: [1.14, 0.28, 0.42], tip: [0.24, 0.16, 0.52], droop: 44, width: 0.16 },
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

/** 一串点之间的渐变管（后颏、尾附器、腹侧刺都用它） */
function taperedTube(
  points: readonly THREE.Vector3[],
  radii: readonly (readonly [number, number])[],
  material: THREE.Material,
  radial = 12,
): THREE.Mesh {
  const sections: Section[] = points.map((p, i) => ({ at: p.clone(), ry: radii[i][0], rz: radii[i][1] }))
  return new THREE.Mesh(loft(sections, radial), material)
}

/** 沿面罩断面表插值 */
function sampleMask(x: number): { cy: number; ht: number; hw: number } {
  const first = MASK[0]
  const last = MASK[MASK.length - 1]
  if (x <= first[0]) return { cy: first[1], ht: first[2], hw: first[3] }
  if (x >= last[0]) return { cy: last[1], ht: last[2], hw: last[3] }
  for (let i = 0; i < MASK.length - 1; i++) {
    const a = MASK[i]
    const b = MASK[i + 1]
    if (x < a[0] || x > b[0]) continue
    const t = (x - a[0]) / (b[0] - a[0])
    return {
      cy: THREE.MathUtils.lerp(a[1], b[1], t),
      ht: THREE.MathUtils.lerp(a[2], b[2], t),
      hw: THREE.MathUtils.lerp(a[3], b[3], t),
    }
  }
  return { cy: last[1], ht: last[2], hw: last[3] }
}

/**
 * 后缘翘起的包络：t 沿翅芽长轴（0 基部 / 1 末端），返回沿局部 +Y 抬起的量。
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
 * 姿态**显式给三根轴**，不用 `quaternion.setFromUnitVectors()`：那个函数只把
 * 长度轴对上，绕长度轴的滚转是它自己随便挑的 —— 兰花螳螂的花瓣状腿节就是
 * 这么变成几片侧立薄板的（宽厚比断言一路全绿，渲染出来整只虫像一只苍白的虾）。
 * 翅芽的扁平面朝哪儿是这个部件的全部意义，绝不能交给一个未定义的自由度。
 */
function wingPad(spec: PadSpec, side: 1 | -1, padMat: THREE.Material, veinMat: THREE.Material): THREE.Group {
  const base = new THREE.Vector3(spec.base[0], spec.base[1], spec.base[2] * side)
  const tip = new THREE.Vector3(spec.tip[0], spec.tip[1], spec.tip[2] * side)
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
  const halfWidth = (t: number) => sample(t, 2) * spec.width

  /*
   * 局部几何沿 +X 长出：loft 的标架在这个走向下是 ry→+Y（厚）、rz→+Z（宽），
   * 所以扁平面的法线就是局部 +Y，正好交给下面的 makeBasis 去指方向。
   *
   * 站位加密到 16 个：中心线是弯的（padLift），8 个站位会把这条弧折成几段直线，
   * 翘起来那一段会出现两道假棱。断面形状仍只由 PAD_PROFILE 定义。
   */
  const STATIONS = 16
  const sections: Section[] = []
  for (let i = 0; i <= STATIONS; i++) {
    const t = i / STATIONS
    sections.push({ at: new THREE.Vector3(t * len, padLift(t), 0), ry: halfThick(t), rz: halfWidth(t) })
  }
  const blade = new THREE.Mesh(loft(sections, 20), padMat)
  blade.name = 'wing-pad'
  g.add(blade)

  /*
   * 翅缘。两条边**不对称**：
   * - 外缘（局部 −Z，落在体侧那一边）是自由的前缘，用浅一档的翅脉色、做粗一档，
   *   并压在芽面的中面上（y≈0）—— 那是它在剪影里的位置。
   * - 内缘（局部 +Z，压在背中线那一边）只用翅芽自己的材质做一道细棱。
   * 两边都用浅色会读成「一枚椭圆徽章」：一圈亮边围着一块暗地，人眼读成凹碟。
   */
  for (const [edge, mat, r0, yk] of [
    [-1, veinMat, 0.024, 0.06],
    [1, padMat, 0.016, 0.4],
  ] as const) {
    const pts: THREE.Vector3[] = []
    const rs: [number, number][] = []
    for (let i = 0; i <= 12; i++) {
      const t = 0.06 + (i / 12) * 0.9
      pts.push(new THREE.Vector3(t * len, padLift(t) + halfThick(t) * yk, edge * halfWidth(t) * 0.97))
      const r = r0 * (1 - t * 0.45)
      rs.push([r, r])
    }
    const rim = taperedTube(pts, rs, mat, 8)
    rim.name = 'pad-rim'
    g.add(rim)
  }

  /*
   * 肩棱：一道横跨芽面的隆脊，位置就在翅芽**钻出胸背的那一处**（实测 t≈0.27）。
   * 没有它，露头处是芽面与胸背两个曲面相切着渐变出来的一条软边，读不出边界。
   * 高度取 halfThick×0.95 + 管半径：必须真的探出芽面的脊才看得见 ——
   * 「几何写了但埋在别的几何里」是本项目反复踩的坑。
   * 刻意用翅芽自己的材质：这道棱要靠明暗转折被看见，画一条亮线就又退回靠色不靠形。
   */
  {
    const t0 = 0.27
    const w = halfWidth(t0)
    const pts: THREE.Vector3[] = []
    const rs: [number, number][] = []
    for (let i = 0; i <= 10; i++) {
      const u = -1 + (i / 10) * 2
      pts.push(new THREE.Vector3(t0 * len - (1 - u * u) * 0.05, padLift(t0) + halfThick(t0) * 0.95, u * w * 0.92))
      const r = 0.026 * (1 - Math.abs(u) * 0.35)
      rs.push([r, r])
    }
    const shoulder = taperedTube(pts, rs, padMat, 10)
    shoulder.name = 'pad-shoulder'
    g.add(shoulder)
  }

  // 三条翅脉：从基部向末端扇开 —— 「里面装的确实是一副翅」的可视证据
  for (const k of [-1, 0, 1]) {
    const pts: THREE.Vector3[] = []
    const rs: [number, number][] = []
    for (let i = 0; i <= 10; i++) {
      const t = 0.2 + (i / 10) * 0.72
      const spread = THREE.MathUtils.lerp(0.02, 0.075, (t - 0.2) / 0.72)
      pts.push(new THREE.Vector3(t * len, padLift(t) + halfThick(t) * 0.86, k * spread))
      const r = 0.013 * (1 - t * 0.4)
      rs.push([r, r])
    }
    const vein = taperedTube(pts, rs, veinMat, 6)
    vein.name = 'pad-vein'
    g.add(vein)
  }

  const xAxis = tip.clone().sub(base).normalize()
  // 扁平面法线：从 +Y 向外侧倾 droop 度 —— 外缘下垂、内缘压在背上，就是「贴伏」。
  // 后缘的翘起（padLift）沿的是**这根 yAxis**，不是世界 +Y：翅芽要离开的是
  // 它自己趴着的那个面，而那个面是斜的。
  const d = THREE.MathUtils.degToRad(spec.droop)
  const n = new THREE.Vector3(0, Math.cos(d), Math.sin(d) * side)
  const yAxis = n.addScaledVector(xAxis, -n.dot(xAxis)).normalize()
  const zAxis = new THREE.Vector3().crossVectors(xAxis, yAxis)
  g.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(xAxis, yAxis, zAxis))
  g.position.copy(base)
  return g
}

/**
 * 面罩（折叠静止态的下唇）。
 *
 * 全部几何直接放样在**绝对坐标**里、不带任何 group 变换 —— 与蝉若虫的开掘足
 * 同一套写法。这样测试量「面罩表面到体表的垂距」时，顶点坐标与体表在同一套
 * 空间里，不用再穿一遍矩阵；量的方向就是世界 −Y（面罩在腹面，「体外」朝下）。
 */
function labialMask(
  plateMat: THREE.Material,
  ridgeMat: THREE.Material,
  hookMat: THREE.Material,
): { group: THREE.Group; hookTip: THREE.Vector3 } {
  const g = new THREE.Group()

  // ---- 前颏：那面盾。断面表见 MASK
  const plate = new THREE.Mesh(
    loft(
      MASK.map(([x, cy, ht, hw]) => ({ at: new THREE.Vector3(x, cy, 0), ry: ht, rz: hw })),
      24,
    ),
    plateMat,
  )
  plate.name = 'mask-plate'
  g.add(plate)

  // ---- 后颏：向后折到中足之间的那一段。扁带状（半厚 < 半宽），且明显比盾窄
  const post = taperedTube(
    POSTMENTUM.map(([x, y, z]) => new THREE.Vector3(x, y, z)),
    [
      [0.048, 0.085],
      [0.05, 0.088],
      [0.048, 0.082],
      [0.044, 0.072],
    ],
    plateMat,
    14,
  )
  post.name = 'mask-post'
  g.add(post)

  /*
   * 铰链结：前颏与后颏的关节。做成一个略鼓的横向短管 ——
   * 「盾 + 结 + 带」三件连起来才读得出这是一副**折叠的机构**；
   * 少了中间这个结，两截会糊成一条长板（第一版的病）。
   */
  {
    const hinge = new THREE.Mesh(new THREE.SphereGeometry(0.075, 14, 12), ridgeMat)
    hinge.scale.set(0.85, 0.72, 1.35)
    hinge.position.set(1.38, -0.462, 0)
    hinge.name = 'mask-hinge'
    g.add(hinge)
  }

  /*
   * 中线纵脊：真实前颏中央有一道中缝/隆脊。做在**外侧面**（朝下，摄像机看得到
   * 的那一面），高度必须真的探出板面 —— 埋在板里等于没做。
   */
  {
    const pts: THREE.Vector3[] = []
    const rs: [number, number][] = []
    for (let i = 0; i <= 12; i++) {
      const x = THREE.MathUtils.lerp(1.5, 2.3, i / 12)
      const s = sampleMask(x)
      pts.push(new THREE.Vector3(x, s.cy - s.ht * 0.92, 0))
      const r = 0.026 * (1 - Math.abs(i / 12 - 0.5) * 0.7)
      rs.push([r, r * 1.25])
    }
    const keel = taperedTube(pts, rs, plateMat, 10)
    keel.name = 'mask-keel'
    g.add(keel)
  }

  /*
   * 两侧卷边：真实前颏的侧缘是向上（朝头）卷起的一道厚边。做在板的侧棱上，
   * 让这片东西有一圈**闭合的自己的轮廓**，而不是从脸上渐变出来的一块面。
   */
  for (const side of [1, -1] as const) {
    const pts: THREE.Vector3[] = []
    const rs: [number, number][] = []
    for (let i = 0; i <= 14; i++) {
      const x = THREE.MathUtils.lerp(1.45, 2.46, i / 14)
      const s = sampleMask(x)
      pts.push(new THREE.Vector3(x, s.cy + s.ht * 0.15, side * s.hw * 0.95))
      const r = 0.02 + 0.008 * Math.sin((i / 14) * Math.PI)
      rs.push([r, r])
    }
    const rim = taperedTube(pts, rs, ridgeMat, 8)
    rim.name = 'mask-rim'
    g.add(rim)
  }

  /*
   * 前缘的转折棱：一道横跨前缘外侧面的隆脊。
   *
   * 这道棱是「面罩的前缘是一道折转，不是脸的轮廓」这句话的全部几何证据 ——
   * 没有它，前缘就是一条渐变的软边，人眼把整片读成脸的下半部分。
   * 位置压在 x≈2.30（前缘往里一点，正好是自由端开始翘离脸的那条线）。
   */
  {
    const x0 = 2.33
    const s = sampleMask(x0)
    const pts: THREE.Vector3[] = []
    const rs: [number, number][] = []
    for (let i = 0; i <= 12; i++) {
      const u = -1 + (i / 12) * 2
      // 中间略向前鼓：真实前缘是一道弧，不是一根横杠
      pts.push(new THREE.Vector3(x0 + (1 - u * u) * 0.045, s.cy - s.ht * 0.88, u * s.hw * 0.9))
      const r = 0.028 * (1 - Math.abs(u) * 0.3)
      rs.push([r, r])
    }
    const ridge = taperedTube(pts, rs, ridgeMat, 10)
    ridge.name = 'mask-ridge'
    g.add(ridge)
  }

  /*
   * 一对颚叶（labial palp）+ 端钩。
   *
   * 折叠时它们从面罩前缘伸出、在脸前向上内方合拢 —— 这是全副结构里唯一
   * 探到头部轮廓**之外**的部分，也是四个机位里最容易一眼认出「这是一副钳子」
   * 的地方。端钩用近黑的材质：真实的端钩就是骨化加深的，而且它是**尖突**
   * 不是面，深色不会被读成斑（会被读成尖 —— 这一点与翅芽/面罩的明度规则不冲突）。
   */
  let hookTip = new THREE.Vector3()
  for (const side of [1, -1] as const) {
    const p0 = new THREE.Vector3(2.3, -0.33, side * 0.29)
    const p1 = new THREE.Vector3(2.47, -0.28, side * 0.25)
    const p2 = new THREE.Vector3(2.58, -0.18, side * 0.18)
    const palp = taperedTube(
      [p0, p1, p2],
      [
        [0.072, 0.1],
        [0.068, 0.088],
        [0.052, 0.062],
      ],
      plateMat,
      12,
    )
    palp.name = 'mask-palp'
    g.add(palp)

    const h0 = p2.clone()
    const h1 = new THREE.Vector3(2.62, -0.08, side * 0.12)
    const h2 = new THREE.Vector3(2.56, 0.02, side * 0.07)
    const hook = taperedTube(
      [h0, h1, h2],
      [
        [0.042, 0.045],
        [0.028, 0.03],
        [0.007, 0.007],
      ],
      hookMat,
      10,
    )
    hook.name = 'mask-hook'
    g.add(hook)
    if (side === 1) hookTip = h2.clone()
  }

  return { group: g, hookTip }
}

// ---------------------------------------------------------------- 主体

export function buildDragonflyNymph(): InsectModel {
  const g = new THREE.Group()

  /*
   * 材质：明度按档排开（见文件头「颜色」）。两条要害是**有向**的 ——
   * 翅芽 ≥ 胸背、面罩 ≥ 头。深色贴浅色只会读成斑纹，不会读成盖在上面的一片。
   * 藻泥感靠 punctate（随机圆坑法线 + 坑内更糙）+ 极低 gloss。
   */
  const abdomenColor = '#a68e4f' // L≈48%
  const abdomenMat = chitin({ color: abdomenColor, gloss: 0.12, surface: 'punctate' })
  const thoraxMat = chitin({ color: '#9a8449', gloss: 0.14, surface: 'punctate' }) // L≈45%
  const headMat = chitin({ color: '#8f7a45', gloss: 0.16, surface: 'punctate' }) // L≈42%
  /*
   * 翅芽 L≈42%，比胸背（33%）亮一档。这一条是 cicada-nymph 用四机位实拍换来的：
   * 翅芽此前 27% 比胸背 38% 还暗，于是四个机位一致读成「胸背上的一块深色斑纹」。
   * 饱和度压低、gloss 提到 0.3 且不上 punctate：芽面是光的、胸背是挂泥的，
   * 同一束光下两者的反应不一样 —— 这是**质感差**，不是明度差。
   */
  const padMat = chitin({ color: '#b09a5e', gloss: 0.3, clearcoat: 0.12 }) // L≈53%
  const padVeinMat = chitin({ color: '#ddd0a0', gloss: 0.25 }) // 勾轮廓的浅色，L≈75%
  const maskMat = chitin({ color: '#ab9553', gloss: 0.32, clearcoat: 0.14 }) // L≈50% ≥ 头 42%
  const maskRidgeMat = chitin({ color: '#c4b076', gloss: 0.35, clearcoat: 0.16 })
  const hookMat = chitin({ color: '#33290f', gloss: 0.5, clearcoat: 0.3 }) // 端钩：骨化加深的尖突
  const legMat = chitin({ color: '#98833f', gloss: 0.18, surface: 'punctate' })
  const spineMat = chitin({ color: '#7a6733', gloss: 0.24 })

  // ---- 躯干：头 → 前胸 → 合胸，三段搭接，端面互相藏进对方体内
  g.add(trunk(HEAD, headMat, 'head'))
  g.add(trunk(PRONOTUM, thoraxMat, 'pronotum'))
  g.add(trunk(SYNTHORAX, thoraxMat, 'synthorax'))

  // ---- 腹部：扁宽、10 节、节间沟浅（水虿的腹是软的，蜕皮前还要胀大）
  const abdomenOpts: SegmentedAbdomenOptions = {
    from: [ABDOMEN_FROM, 0.06, 0],
    to: [ABDOMEN_TO, 0.1, 0],
    r0: ABDOMEN_R0,
    r1: ABDOMEN_R1,
    segments: 10,
    groove: 0.11,
    flat: ABDOMEN_FLAT,
    bulge: ABDOMEN_BULGE,
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
   * 腹末收圆：segmentedAbdomen() 的最后一个截面是被平切封口的，直接留着就是
   * 「一刀平口的管子」（东方蝼蛄与知了猴都记过这个病）。所以续一小段自己的
   * 断面表收圆，起始半径略大于腹末以吞掉那个平口盖子。
   */
  g.add(
    trunk(
      [
        [ABDOMEN_TO + 0.02, 0.1, 0.188, 0.324],
        [ABDOMEN_TO - 0.05, 0.1, 0.178, 0.306],
        [ABDOMEN_TO - 0.12, 0.1, 0.146, 0.252],
        [ABDOMEN_TO - 0.18, 0.1, 0.08, 0.138],
      ],
      abdomenMat,
      'abdomen',
    ),
  )

  /*
   * 肛锥：背面一枚肛上板 + 腹侧一对肛侧板，三枚三角形尖突。
   * 直肠鳃长在体内（呼吸与喷水推进都在直肠里完成），所以外面看到的**只有**
   * 这三枚尖突 —— 把「尾鳃」做成豆娘那样三片外露的叶片是另一个亚目的事，
   * 差在这一点上整只虫就认错了目下的亚目。
   *
   * 断面刻意做扁（ry ≠ rz）：三枚都是三角形的**片**，不是三根针。
   */
  const CAUDAL: readonly {
    from: readonly [number, number, number]
    to: readonly [number, number, number]
    r: readonly [number, number]
  }[] = [
    { from: [-1.52, 0.15, 0], to: [-2.12, 0.19, 0], r: [0.062, 0.1] },
    { from: [-1.52, 0.0, 0.1], to: [-2.08, -0.06, 0.15], r: [0.085, 0.058] },
    { from: [-1.52, 0.0, -0.1], to: [-2.08, -0.06, -0.15], r: [0.085, 0.058] },
  ]
  for (const c of CAUDAL) {
    const a = new THREE.Vector3(...c.from)
    const b = new THREE.Vector3(...c.to)
    const pts: THREE.Vector3[] = []
    const rs: [number, number][] = []
    for (let i = 0; i <= 8; i++) {
      const t = i / 8
      pts.push(new THREE.Vector3().lerpVectors(a, b, t))
      // 起点略收（钻出腹末的那一处），中段最粗，末端收成尖 —— 三角形的侧影
      const k = t < 0.12 ? 0.72 + (t / 0.12) * 0.28 : Math.pow(1 - (t - 0.12) / 0.88, 0.85)
      rs.push([Math.max(c.r[0] * k, 0.003), Math.max(c.r[1] * k, 0.003)])
    }
    const spine = taperedTube(pts, rs, abdomenMat, 12)
    spine.name = 'caudal-spine'
    g.add(spine)
  }

  /*
   * 腹侧刺：第 7~9 节侧缘各一枚后指的短刺（蜓科水虿的常见特征）。
   * 位置直接按 kit 的腹部包络算出来，不另抄一份数字 —— 抄了迟早对不上，
   * 刺会有的浮空、有的埋进腹里。
   */
  for (const [x, len] of [
    [-0.62, 0.1],
    [-0.92, 0.09],
    [-1.2, 0.075],
  ] as const) {
    const t = (ABDOMEN_FROM - x) / (ABDOMEN_FROM - ABDOMEN_TO)
    const peak = Math.max(ABDOMEN_R0, ABDOMEN_R1) * 1.06
    const s = THREE.MathUtils.smoothstep((t - ABDOMEN_BULGE) / (1 - ABDOMEN_BULGE), 0, 1)
    const env = THREE.MathUtils.lerp(peak, ABDOMEN_R1, s)
    const halfWidth = env * ABDOMEN_FLAT
    const cy = THREE.MathUtils.lerp(0.06, 0.1, t)
    for (const side of [1, -1] as const) {
      const root = new THREE.Vector3(x, cy - 0.03, side * halfWidth * 0.9)
      const tip = new THREE.Vector3(x - len * 0.85, cy - 0.05, side * (halfWidth + len * 0.5))
      const spine = taperedTube(
        [root, root.clone().lerp(tip, 0.5), tip],
        [
          [0.05, 0.04],
          [0.032, 0.026],
          [0.005, 0.005],
        ],
        spineMat,
        10,
      )
      spine.name = 'lateral-spine'
      g.add(spine)
    }
  }

  /*
   * 复眼：大、明显外凸于头的前侧角，但**左右分开** ——
   * 成虫那对在头顶相接的接眼式巨眼（dragonfly.ts 里半径 0.42、两眼重叠）
   * 是羽化之后才有的。水虿在浑水里视距有限，眼没那么夸张。
   */
  g.add(
    compoundEyePair({
      at: [2.12, 0.13, 0.34],
      radius: 0.235,
      color: '#55441f',
      flatten: 0.86,
      stretch: 1.06,
      facets: false,
    }),
  )

  // ---- 触角：短、丝状、7 节。水虿的触角比成虫那对刚毛状的相对长些，但仍很短
  g.add(
    antennaPair(
      { base: [2.3, 0.1, 0.2], length: 0.36, kind: 'filiform', pitch: 10, yaw: 42, thickness: 0.026 },
      headMat,
    ),
  )

  // ---- 面罩：本阶段的头号招牌
  const mask = labialMask(maskMat, maskRidgeMat, hookMat)
  g.add(mask.group)

  // ---- 翅芽：本阶段的教学重点（「已经背着四片翅的芽了，但还没有蛹这一步」）
  for (const spec of PADS) {
    g.add(wingPad(spec, 1, padMat, padVeinMat), wingPad(spec, -1, padMat, padVeinMat))
  }

  /*
   * 六足：粗短、向体侧撑开。thickness 0.09 是成虫（0.045~0.055）的两倍 ——
   * 水虿在水底爬、在水草上抓，而成虫的六足只用来在空中兜住猎物。
   * splay 给到 45~55 是「撑开趴着」的姿态；成虫那三对 splay 25~32、
   * sweep 全为负（向前收拢成捕虫篮），两者摆在一起就是同一物种的两种活法。
   */
  for (const spec of [
    { base: [1.5, -0.2, 0.44] as [number, number, number], femur: 0.62, tibia: 0.6, tarsus: 0.24, splay: 46, sweep: -14, knee: 78 },
    { base: [1.3, -0.18, 0.5] as [number, number, number], femur: 0.76, tibia: 0.74, tarsus: 0.28, splay: 52, sweep: 14, knee: 76 },
    { base: [0.98, -0.16, 0.52] as [number, number, number], femur: 0.94, tibia: 0.92, tarsus: 0.32, splay: 54, sweep: 44, knee: 74 },
  ]) {
    const pair = legPair({ ...spec, thickness: 0.075, spines: true }, legMat)
    pair.traverse((o) => {
      if ((o as THREE.Mesh).isMesh) o.name = 'walk-leg'
    })
    g.add(pair)
  }

  const anchors: Record<string, THREE.Vector3> = {
    mask: new THREE.Vector3(2.14, -0.42, 0),
    palp: mask.hookTip.clone(),
    wingPad: new THREE.Vector3(0.7, 0.56, 0.25),
    eye: new THREE.Vector3(2.14, 0.16, 0.55),
    abdomen: new THREE.Vector3(-0.3, 0.44, 0),
    caudal: new THREE.Vector3(-2.24, 0.2, 0),
    leg: new THREE.Vector3(0.7, -0.42, 1.0),
  }

  return finalize(g, anchors)
}
