/**
 * 东亚飞蝗 Locusta migratoria manilensis · 若虫（蝻，取 4~5 龄）
 *
 * ## 这只虫存在的意义：不完全变态里「若虫 = 缩小版成虫」的正例
 *
 * 蝗虫是**不完全变态**：卵 → **若虫（蝻）** → 成虫，5~6 龄逐次蜕皮长大，
 * **没有蛹，也没有「幼虫」这一步**。所以本目录里飞蝗只有 `locust-egg.ts`
 * 与本文件两个阶段，绝不会出现 `locust-larva.ts` / `locust-pupa.ts`
 * （`stages.ts` 的契约闸门会当场红，而且那等于把中小学讲昆虫的第一个知识点讲反）。
 *
 * 同为不完全变态，这一只与本目录另外两只若虫分工不同：
 * 水虿（`dragonfly-nymph.ts`）换了一整套生活方式，形态与成虫反差极大；
 * 知了猴（`cicada-nymph.ts`）在地下，前足特化成挖掘足。
 * **蝻是三者里最纯粹的那个「缩小版成虫」**——同样的马鞍形前胸背板、
 * 同样粗壮的跳跃后足、同样的丝状触角，把它和 `locust.ts` 并排放，
 * 一眼认得出是同一种虫。它的全部教学价值就落在两处差别上：
 *
 * 1. **小**。体长 2.76 厘米对成虫的 4.9 厘米（图鉴写的 35~55 毫米是成虫）。
 *    这一条本身就是内容——若虫靠蜕皮一次次长大，不是一步变过去的。
 *    所以尺度绝不许为了「好看」放大到成虫大小（`stages.ts` 顶部的硬约定）。
 * 2. **翅芽而不是翅**，而且是**倒转**的翅芽。见下。
 *
 * ## 招牌结构
 *
 * 1. **倒转的翅芽（reversed wing pads）** —— 这一只最值得做出来的细节。
 *
 *    成虫的前翅（革质覆翅）盖在膜质后翅**之上、之外**；而蝗蝻从 3 龄起，
 *    翅芽在背侧**翻转**过来：**后翅芽跑到前翅芽的上方与外侧**，两对芽的尖端
 *    一齐朝**上、朝后**翘起。野外分龄就是靠这个——翅芽翻转了、且盖到腹部
 *    第几节，直接读出龄期。所以这里 `wing-pad-hind` 的中心比
 *    `wing-pad-fore` 高（0.35 对 0.285）、也更靠外（|z| 0.153 对 0.113），
 *    两对芽的尖端都比自己的基部高 0.23~0.30。把这两处摆回成虫的顺序，
 *    这只虫就退化成「一只翅没长齐的小成虫」，那个知识点就丢了。
 *
 *    **长度是第二条硬线**：芽尖只搭到腹部前一节多一点（末端 x = −0.08，
 *    腹部起点 0.34、每节 0.20），全长 0.57 = 体长的 21%；
 *    作为对照，成虫的前翅有体长的 59%（`locust.ts` 里 2.9 / 4.9）。
 *
 *    黑蚱蝉若虫在翅芽上栽过一次，两个根因这里逐条对着做了：
 *    a. **明度不许排反**：翅芽 55% ≥ 胸背 43%。深色块贴在浅色面上，
 *       人眼的第一解释永远是「斑纹」，不是「盖在上面的一片东西」。
 *    b. **必须离开体表、投得出阴影缝**：芽的下缘翘到腹背之上 0.12~0.16
 *       （体长的 4%~6%），后半段是自由的。贴着走的芽只会读成一块膏药。
 *
 * 2. **跳跃后足** —— 与成虫同一套构造，也是「缩小版成虫」这句话的主要证据。
 *    腿节（股节）内藏跳跃肌，纺锤形而**侧扁**，最粗处背腹深 0.36 = 体长的 13%，
 *    表面一排人字形加固棱；胫节细长、外缘两列各 8 枚刺；整条腿在膝部反折成 Λ。
 *    与前中足的粗细差要一眼看得出来（腿节 0.181 对步行足 0.054，差 3.4 倍）——
 *    `kit.leg()` 的比例是给普通步行足设计的，做不出这种极端对比，所以和成虫
 *    一样直接用 `loft()` 手搭。
 *
 *    **这一条第一版做砸了，而且砸得很彻底**：腿节取 / 5.0（半径 0.236，
 *    与腹部一样粗）、方向又抬得太平（仰角只有 23°），四个机位一致把腹部
 *    **整根遮没**，出图上这只虫是「一团绿加两片叶子」，分节的腹部一节都看不见。
 *    三处一起改才修好：腿节收细到 / 5.8、横向压扁到 0.78、方向抬到仰角 33°。
 *    当时的形态断言全绿——「断言量的是数字，人看的是长相」，
 *    本仓库栽过很多次，这是又一次。
 *
 * 3. **马鞍形前胸背板**：中段收窄下凹、前后端略高，中央一条纵脊。
 *    直翅目最好认的背影，成虫与若虫共有。
 *
 * 4. **相对更大的头与复眼**：幼体比例。复眼直径 0.21 = 体长的 7.6%，
 *    成虫是 5.7%（`locust.ts` 里 radius 0.14 / 体长 4.9）。
 *    「头大身子小」是所有昆虫若虫共同的观感，也是最省的一笔幼体感。
 *
 * ## 颜色：偏绿一档
 *
 * 散居型偏绿、群居型偏黄褐带黑斑；这里取**散居型的绿**，好处是与成虫
 * （`locust.ts` 的黄绿褐 #6a7a3d，明度 36%）拉得开——若虫 43%，更绿更亮。
 * 明度按档排开（sRGB）：翅脉 68% > 翅芽 55% > 后足腿节 53% > 步行足 48% >
 * 胸腹 43% > 复眼 20% > 纵脊/人字纹 16% > 胫节刺 10%。
 *
 * 后足腿节比躯干亮一档（53% 对 43%）也是实拍逼出来的：第一版两者只差 3%，
 * 腿节与腹部糊成同一块绿，连轮廓都分不出。真实蝗蝻的腿节本来就比体侧浅一档、
 * 上面还压着深色人字纹，一明一暗两层对比才让它从身子上跳出来。
 *
 * 要害那一对是**翅芽 ≥ 胸背**（见招牌结构第 1 条 b）。翅芽靠更高的 gloss
 * 与更浅的一档明度和胸背分开，不靠压深——「越深越保险」是本仓库栽过的大跟头
 * （榆蓝叶甲的金属蓝绿被 ACES 压成近黑，招牌图案在画面上直接消失）。
 *
 * 本文件不使用任何随机数。
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
  mandibles,
  segmentedAbdomen,
  segmentedAbdomenMembranes,
  type InsectModel,
  type Section,
  type SegmentedAbdomenOptions,
} from './../kit'

// ---------------------------------------------------------------- 尺寸常量

/** 躯干前后端。头前缘 1.32 → 腹末 −1.44，实测体长 2.76 厘米（成虫 4.9） */
const HEAD_FRONT = 1.32
const HEAD_BACK = 0.8
const ABDOMEN_FROM = 0.34
const ABDOMEN_TO = -1.3
/** 腹末收圆段的末端。不收的话 segmentedAbdomen 的封口盘就是一刀平口的管子 */
const TAIL_TO = -1.44

/** 前胸背板（马鞍）的前后端与基准半径。前端 0.98 压在头壳后半截上，接缝藏进头里 */
const PRONOTUM_FRONT = new THREE.Vector3(0.98, 0.14, 0)
const PRONOTUM_BACK = new THREE.Vector3(0.52, 0.11, 0)
const PRONOTUM_R = 0.255
/** 马鞍的凹陷深度：中段比两端窄 24%。给 0 就是一根圆管，直翅目的背影没了 */
const SADDLE_DIP = 0.24

/** 跳跃后足：髋、腿节方向/长度、胫节、跗节 */
const HIP: readonly [number, number, number] = [0.32, -0.06, 0.2]
/**
 * 腿节方向。第一版是 (−0.84, 0.36, 0.24)：抬得太平，整条腿正好压在腹部上，
 * 四个机位一致把腹部**整根遮没**——出图上这只虫是「一团绿加两片叶子」，
 * 分节的腹部一节都看不见。抬到 0.52 之后腿节的背缘高出腹背 0.15，
 * 腹部从它下面露出来，剪影才有「胸—腹—后腿」三块。
 */
const FEMUR_DIR: readonly [number, number, number] = [-0.8, 0.52, 0.22]
const FEMUR_LEN = 1.05
/**
 * 腿节最粗处半径 = 全长 / 5.8（0.181，背腹深 0.36 = 体长的 14%）。
 *
 * 第一版取 / 5.0（0.236，直径与腹部一样粗），实拍是一片**比身体还大的绿叶子**。
 * 真实蝗虫腿节的背腹深约为体长的 12%，成虫 `locust.ts` 那一档是 16%（偏壮），
 * 这里取中间：既比步行足粗 3.4 倍（一眼看出是跳跃腿），又不至于把虫吃掉。
 * 横向半径另乘 0.78——真实腿节是**侧扁**的，从上往下看才不是一根圆棍。
 */
const FEMUR_R = FEMUR_LEN / 5.8
/** 腿节的横向压扁比。侧扁是蝗虫腿节的真实断面，也让顶视里它不至于占满画面 */
const FEMUR_FLAT = 0.78
const TIBIA_DIR: readonly [number, number, number] = [0.1, -0.97, -0.12]
const TIBIA_LEN = 1.16
const TARSUS_DIR: readonly [number, number, number] = [0.55, -0.42, -0.05]
const TARSUS_LEN = 0.28
/** 胫节外缘每列的刺数（成虫 8~11 枚，若虫略少） */
const TIBIA_SPINES = 8

/**
 * 翅芽：基部（埋在中后胸里）与末端（翘在腹背之上）。
 *
 * **后翅芽在前翅芽的上方与外侧**——这就是「倒转」，见文件头招牌结构第 1 条。
 * 两对芽的末端 y 都明显高于自己的基部 y：尖端朝上朝后翻。
 */
const FORE_PAD_BASE: readonly [number, number, number] = [0.46, 0.17, 0.1]
const FORE_PAD_TIP: readonly [number, number, number] = [0.04, 0.4, 0.125]
const HIND_PAD_BASE: readonly [number, number, number] = [0.42, 0.2, 0.135]
const HIND_PAD_TIP: readonly [number, number, number] = [-0.08, 0.5, 0.17]
/**
 * 翅芽扁平面法线相对 +Y 的外倾角。60° = 芽面基本立在体侧、只微微朝上——
 * 蝗蝻的翅芽是贴在腹侧上方的一对立片，不是盖在背上的两块板。
 */
const PAD_DROOP = THREE.MathUtils.degToRad(60)

/** 翅芽沿自身长轴的断面 [t, 半厚, 半宽]。基部窄 → 中段最宽 → 末端钝圆 */
const PAD_PROFILE: readonly (readonly [number, number, number])[] = [
  [0, 0.016, 0.038],
  [0.14, 0.024, 0.066],
  [0.32, 0.024, 0.081],
  [0.55, 0.021, 0.085],
  [0.75, 0.017, 0.075],
  [0.9, 0.012, 0.052],
  [1, 0.005, 0.017],
]

// ---------------------------------------------------------------- 配色

/** 散居型的绿。成虫是 #6a7a3d（明度 36%），这里 43%——更绿更亮一档 */
const BODY_COLOR = '#7d9e3c'
/** 翅芽：比胸背亮一档（55% 对 43%）。压暗就退回「胸背上的一块斑」了 */
const PAD_COLOR = '#9fbf5b'
/** 翅脉与外缘：比芽面亮一档，但不能亮成白——第一版 #d3e0a6 出图是一片羽毛 */
const PAD_VEIN_COLOR = '#bed08a'
/**
 * 后足腿节比躯干亮一档（53% 对 43%）。
 *
 * 第一版给的是 #8fb149（49%）——与躯干（当时 45%）只差 4%，实拍里腿节与腹部糊成同一块绿，
 * 完全分不出哪儿是腿哪儿是身子。真实蝗蝻的后足腿节本来就比体侧浅一档、
 * 上面还有深色人字纹，靠的正是这一明一暗两层对比。
 */
const FEMUR_COLOR = '#98bf4e'
const LEG_COLOR = '#88a84c'
const DARK_COLOR = '#2f3a17'
const SPINE_COLOR = '#1e2410'
const EYE_COLOR = '#4a3a1a'

// ---------------------------------------------------------------- 局部工具

/** 三次平滑阶跃，用于腿节两端「收细但不收尖」的过渡包络 */
function smoothstep01(t: number): number {
  const x = THREE.MathUtils.clamp(t, 0, 1)
  return x * x * (3 - 2 * x)
}

/** 一串点之间的渐变圆管 */
function taperedTube(
  points: readonly THREE.Vector3[],
  radii: readonly number[],
  material: THREE.Material,
  radial = 10,
): THREE.Mesh {
  const sections: Section[] = points.map((p, i) => ({ at: p.clone(), ry: radii[i], rz: radii[i] }))
  return new THREE.Mesh(loft(sections, radial), material)
}

/**
 * 跳跃腿腿节的半径包络：28%~74% 之间保持在最粗处，两端各平滑收细到
 * 0.34× / 0.24×。
 *
 * 沿用成虫 `locust.ts` 的宽平台包络，不用纯 sin 鼓包：sin 的两端都收到接近 0，
 * 腿节在贴近基节/膝关节处骤然收细成一个点，视觉上读成「细腿中间鼓了一小坨」
 * 而不是「整根粗壮的股节」。真实蝗虫股节的肌肉腹几乎占满全长。
 */
function femurEnvelope(t: number): number {
  const startK = 0.34
  const endK = 0.24
  if (t < 0.28) return startK + (1 - startK) * smoothstep01(t / 0.28)
  if (t > 0.74) return 1 - (1 - endK) * smoothstep01((t - 0.74) / 0.26)
  return 1
}

/**
 * 一条跳跃后足（side = 1 右 / −1 左）：髋 → 腿节 → 胫节 → 跗节，膝部反折成 Λ。
 *
 * 全部几何直接放样在**绝对坐标**里，与成虫 `locust.ts` 同一套写法：
 * 测试量「腿节最粗处半径」时顶点坐标与这里的常量在同一套空间里，不用穿矩阵。
 */
function jumpingLeg(
  side: 1 | -1,
  legMaterial: THREE.Material,
  femurMaterial: THREE.Material,
  darkMaterial: THREE.Material,
  spineMaterial: THREE.Material,
): { group: THREE.Group; knee: THREE.Vector3 } {
  const g = new THREE.Group()
  const z = (v: number) => v * side

  const hip = new THREE.Vector3(HIP[0], HIP[1], z(HIP[2]))
  const femurDir = new THREE.Vector3(FEMUR_DIR[0], FEMUR_DIR[1], z(FEMUR_DIR[2])).normalize()
  const knee = hip.clone().addScaledVector(femurDir, FEMUR_LEN)
  const tibiaDir = new THREE.Vector3(TIBIA_DIR[0], TIBIA_DIR[1], z(TIBIA_DIR[2])).normalize()
  const ankle = knee.clone().addScaledVector(tibiaDir, TIBIA_LEN)
  const tarsusDir = new THREE.Vector3(TARSUS_DIR[0], TARSUS_DIR[1], z(TARSUS_DIR[2])).normalize()
  const tip = ankle.clone().addScaledVector(tarsusDir, TARSUS_LEN)

  // ---- 腿节：纺锤形，最粗处直径 = 全长 / 2.5，一眼看出里面是跳跃肌
  const steps = 20
  const femurPath: THREE.Vector3[] = []
  const femurSections: Section[] = []
  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    const p = hip.clone().addScaledVector(femurDir, FEMUR_LEN * t)
    const r = FEMUR_R * femurEnvelope(t)
    femurPath.push(p)
    femurSections.push({ at: p, ry: Math.max(r, 0.008), rz: Math.max(r * FEMUR_FLAT, 0.008) })
  }
  const femur = new THREE.Mesh(loft(femurSections, 16), femurMaterial)
  femur.name = 'hind-femur' // 供测试逐环量最粗处半径，不止是重算一遍公式
  g.add(femur)

  /*
   * 人字形加固棱：沿长轴每隔一段画一对斜向短棱，左右交叉成「人」字。
   * 这是蝗虫后足腿节最好认的表面特征，成虫与若虫都有。
   * 棱脊必须**探出**腿节表面（起点取 0.94× 该处半径、向外再走一段），
   * 埋在里面就等于没做——「几何写了但埋在别的几何里」是本仓库反复踩的坑。
   */
  const upHint = new THREE.Vector3(0, 1, 0)
  const lateral = new THREE.Vector3().crossVectors(femurDir, upHint).normalize()
  const dorsal = new THREE.Vector3().crossVectors(lateral, femurDir).normalize()
  for (let i = 1; i <= 5; i++) {
    const t = 0.18 + (i / 6) * 0.62
    const idx = Math.round(t * steps)
    const center = femurPath[idx]
    const localR = femurSections[idx].ry
    for (const s of [1, -1] as const) {
      const a = center.clone().addScaledVector(dorsal, localR * 0.94)
      const b = a
        .clone()
        .addScaledVector(femurDir, -FEMUR_LEN * 0.055)
        .addScaledVector(lateral, s * FEMUR_LEN * 0.062)
      const chevron = taperedTube([a, b], [0.014, 0.005], darkMaterial, 6)
      chevron.name = 'femur-chevron'
      g.add(chevron)
    }
  }

  // ---- 胫节：细长渐收，外缘两列刺
  const tSteps = 14
  const tibiaPath: THREE.Vector3[] = []
  const tibiaSections: Section[] = []
  for (let i = 0; i <= tSteps; i++) {
    const t = i / tSteps
    const p = knee.clone().addScaledVector(tibiaDir, TIBIA_LEN * t)
    const r = THREE.MathUtils.lerp(0.038, 0.019, t)
    tibiaPath.push(p)
    tibiaSections.push({ at: p, ry: r, rz: r })
  }
  const tibia = new THREE.Mesh(loft(tibiaSections, 12), legMaterial)
  tibia.name = 'hind-tibia'
  g.add(tibia)

  const tLateral = new THREE.Vector3().crossVectors(tibiaDir, upHint).normalize()
  const tDorsal = new THREE.Vector3().crossVectors(tLateral, tibiaDir).normalize()
  for (const rowSign of [1, -1] as const) {
    for (let i = 1; i <= TIBIA_SPINES; i++) {
      const t = i / (TIBIA_SPINES + 1)
      const idx = Math.min(tSteps, Math.round(t * tSteps))
      const p = tibiaPath[idx]
      const r = THREE.MathUtils.lerp(0.038, 0.019, t)
      const base = p.clone().addScaledVector(tDorsal, r * 0.85).addScaledVector(tLateral, rowSign * r * 0.5)
      const spineTip = base.clone().addScaledVector(tDorsal, 0.055).addScaledVector(tibiaDir, -0.03)
      const spine = taperedTube([base, spineTip], [0.009, 0.0015], spineMaterial, 5)
      spine.name = 'tibia-spine'
      g.add(spine)
    }
  }

  // ---- 跗节
  const tarsus = taperedTube(
    [ankle, ankle.clone().lerp(tip, 0.5), tip],
    [0.018, 0.012, 0.006],
    legMaterial,
    8,
  )
  tarsus.name = 'hind-tarsus'
  g.add(tarsus)

  /*
   * 关节球：半径跟着腿节两端的实际粗细算，避免「球比腿还细」的断层——
   * 髋球比腿节起点（0.34×maxR）略粗、膝球比末端（0.24×maxR）略粗。
   */
  for (const [p, r] of [
    [hip, FEMUR_R * 0.34 * 1.15],
    [knee, FEMUR_R * 0.24 * 1.25],
    [ankle, 0.024],
  ] as const) {
    const j = new THREE.Mesh(new THREE.SphereGeometry(r, 10, 8), legMaterial)
    j.position.copy(p)
    j.name = 'hind-joint'
    g.add(j)
  }

  return { group: g, knee }
}

/**
 * 一枚翅芽。
 *
 * 姿态**显式给三根轴**，不用 `quaternion.setFromUnitVectors()`：那个函数只把
 * 长度轴对上，绕长度轴的滚转是它自己随便挑的——兰花螳螂的花瓣状腿节就是这么
 * 变成几片侧立薄板的（宽厚比断言一路全绿，渲染出来整只虫像一只苍白的虾）。
 * 翅芽的扁平面朝哪儿是这个部件的全部意义，绝不能交给一个未定义的自由度。
 */
function wingPad(
  base: readonly [number, number, number],
  tip: readonly [number, number, number],
  side: 1 | -1,
  name: string,
  padMaterial: THREE.Material,
  veinMaterial: THREE.Material,
): THREE.Group {
  const b = new THREE.Vector3(base[0], base[1], base[2] * side)
  const t = new THREE.Vector3(tip[0], tip[1], tip[2] * side)
  const len = b.distanceTo(t)
  const g = new THREE.Group()

  const sample = (u: number, col: 1 | 2): number => {
    for (let i = 0; i < PAD_PROFILE.length - 1; i++) {
      const a = PAD_PROFILE[i]
      const c = PAD_PROFILE[i + 1]
      if (u >= a[0] && u <= c[0]) return THREE.MathUtils.lerp(a[col], c[col], (u - a[0]) / (c[0] - a[0]))
    }
    return PAD_PROFILE[PAD_PROFILE.length - 1][col]
  }
  const halfThick = (u: number) => sample(u, 1)
  const halfWidth = (u: number) => sample(u, 2)

  // 局部几何沿 +X 长出：loft 的标架在这个走向下是 ry→+Y（厚）、rz→+Z（宽），
  // 于是扁平面的法线正好是局部 +Y，交给下面的 makeBasis 去指方向
  const STATIONS = 14
  const sections: Section[] = []
  for (let i = 0; i <= STATIONS; i++) {
    const u = i / STATIONS
    sections.push({ at: new THREE.Vector3(u * len, 0, 0), ry: halfThick(u), rz: halfWidth(u) })
  }
  const blade = new THREE.Mesh(loft(sections, 16), padMaterial)
  blade.name = name
  g.add(blade)

  /*
   * 外缘（局部 −Z，落在体侧那一边）是翅芽唯一自由的那条边：浅色、粗一档、
   * 压在芽面的中面上（那是它在剪影里的位置）。内缘只用翅芽自己的材质做一道细棱。
   *
   * 两边都用浅色会读成「一枚椭圆徽章」——一圈亮边围着一块暗地，人眼的第一
   * 解释是凹进去的碟，不是盖上去的片（黑蚱蝉若虫的翅芽实撞过）。
   */
  for (const [edge, mat, r0, yk] of [
    [-1, veinMaterial, 0.011, 0.05],
    [1, padMaterial, 0.008, 0.4],
  ] as const) {
    const pts: THREE.Vector3[] = []
    const rs: number[] = []
    for (let i = 0; i <= 10; i++) {
      const u = 0.08 + (i / 10) * 0.86
      pts.push(new THREE.Vector3(u * len, halfThick(u) * yk, edge * halfWidth(u) * 0.96))
      rs.push(r0 * (1 - u * 0.45))
    }
    const rim = taperedTube(pts, rs, mat, 8)
    rim.name = 'pad-rim'
    g.add(rim)
  }

  // 三条翅脉：从基部向末端扇开——「里面装的确实是一副翅」的可视证据
  for (const k of [-1, 0, 1]) {
    const pts: THREE.Vector3[] = []
    const rs: number[] = []
    for (let i = 0; i <= 8; i++) {
      const u = 0.18 + (i / 8) * 0.7
      const spread = THREE.MathUtils.lerp(0.008, 0.03, (u - 0.18) / 0.7)
      pts.push(new THREE.Vector3(u * len, halfThick(u) * 0.85, k * spread))
      rs.push(0.006 * (1 - u * 0.4))
    }
    const vein = taperedTube(pts, rs, veinMaterial, 5)
    vein.name = 'pad-vein'
    g.add(vein)
  }

  const xAxis = t.clone().sub(b).normalize()
  const n = new THREE.Vector3(0, Math.cos(PAD_DROOP), Math.sin(PAD_DROOP) * side)
  const yAxis = n.addScaledVector(xAxis, -n.dot(xAxis)).normalize()
  const zAxis = new THREE.Vector3().crossVectors(xAxis, yAxis)
  g.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(xAxis, yAxis, zAxis))
  g.position.copy(b)
  return g
}

// ---------------------------------------------------------------- 主体

export function buildLocustNymph(): InsectModel {
  const g = new THREE.Group()

  const bodyMat = chitin({ color: BODY_COLOR, gloss: 0.36, clearcoat: 0.12 })
  const darkMat = chitin({ color: DARK_COLOR, gloss: 0.45 })
  const padMat = chitin({ color: PAD_COLOR, gloss: 0.44, clearcoat: 0.18 })
  const padVeinMat = chitin({ color: PAD_VEIN_COLOR, gloss: 0.3 })
  const femurMat = chitin({ color: FEMUR_COLOR, gloss: 0.4, clearcoat: 0.14 })
  const legMat = chitin({ color: LEG_COLOR, gloss: 0.34 })
  const spineMat = chitin({ color: SPINE_COLOR, gloss: 0.55 })

  // ---- 头：相对成虫更大更钝（幼体比例），略呈垂直拉长的下口式侧影
  const head = new THREE.Mesh(
    (() => {
      const steps = 18
      const sections: Section[] = []
      for (let i = 0; i <= steps; i++) {
        const t = i / steps
        // 后端收细插进前胸的领口里，前端留一个钝圆的脸面（不收成尖）
        const k = t < 0.45 ? t / 0.45 : (1 - t) / 0.55
        let r = 0.205 * Math.sin(THREE.MathUtils.clamp(k, 0, 1) * Math.PI * 0.5)
        if (t === 0) r = 0.205 * 0.3
        if (t === 1) r = 0.205 * 0.42
        const x = THREE.MathUtils.lerp(HEAD_BACK, HEAD_FRONT, t)
        sections.push({ at: new THREE.Vector3(x, 0.04 + t * 0.02, 0), ry: r / 0.9, rz: r * 0.9 })
      }
      return loft(sections, 22)
    })(),
    bodyMat,
  )
  head.name = 'head-capsule'
  g.add(head)

  // ---- 前胸背板：马鞍形——中段收窄下凹、前后端略高，中央一条纵脊
  const pronotumSections: Section[] = []
  const pSteps = 18
  for (let i = 0; i <= pSteps; i++) {
    const t = i / pSteps
    const p = new THREE.Vector3().lerpVectors(PRONOTUM_FRONT, PRONOTUM_BACK, t)
    // sin 在中点取峰值 → 中段半径最小，两端最大，这就是「马鞍」
    const saddle = 1 - SADDLE_DIP * Math.sin(t * Math.PI)
    const taper = t < 0.08 ? t / 0.08 : t > 0.92 ? (1 - t) / 0.08 : 1
    // 收细的下限 0.45：两端各留一个直径 0.23 的口，正好被头壳与中胸吞掉，
    // 不留放样封口盘（露在外面就是躯干中间一道明晃晃的圆盘）
    const r = PRONOTUM_R * saddle * Math.max(0.45, taper)
    pronotumSections.push({ at: p, ry: r * 0.82, rz: r * 1.2 })
  }
  const pronotum = new THREE.Mesh(loft(pronotumSections, 20), bodyMat)
  pronotum.name = 'pronotum-saddle'
  g.add(pronotum)
  {
    const keelPts = pronotumSections.map((s) => (s.at as THREE.Vector3).clone().add(new THREE.Vector3(0, 0.045, 0)))
    const keel = new THREE.Mesh(
      loft(
        keelPts.map((p) => ({ at: p, ry: 0.016, rz: 0.016 })),
        6,
      ),
      darkMat,
    )
    keel.name = 'pronotum-keel'
    g.add(keel)
  }

  // ---- 中后胸：短，翅芽从它的背侧长出来
  const thorax = new THREE.Mesh(
    (() => {
      const steps = 12
      const sections: Section[] = []
      for (let i = 0; i <= steps; i++) {
        const t = i / steps
        const k = t < 0.45 ? t / 0.45 : (1 - t) / 0.55
        const r = 0.222 * Math.sin(THREE.MathUtils.clamp(k, 0, 1) * Math.PI * 0.5)
        sections.push({
          at: new THREE.Vector3(THREE.MathUtils.lerp(0.32, 0.62, t), THREE.MathUtils.lerp(0.04, 0.1, t), 0),
          ry: Math.max(r, 0.012),
          rz: Math.max(r, 0.012),
        })
      }
      return loft(sections, 20)
    })(),
    bodyMat,
  )
  thorax.name = 'thorax'
  g.add(thorax)

  // ---- 腹部：细长、8 节，直翅目区别于圆胖鞘翅目的体型标志
  const abdomenOpts: SegmentedAbdomenOptions = {
    from: [ABDOMEN_FROM, -0.02, 0],
    to: [ABDOMEN_TO, 0.1, 0],
    r0: 0.225,
    r1: 0.085,
    segments: 8,
    groove: 0.12,
    flat: 0.98,
    bulge: 0.3,
    color: BODY_COLOR,
  }
  const abdomen = new THREE.Mesh(segmentedAbdomen(abdomenOpts), bodyMat)
  abdomen.name = 'abdomen'
  g.add(abdomen)
  for (const m of segmentedAbdomenMembranes(abdomenOpts)) {
    m.name = 'abdomen-membrane'
    g.add(m)
  }
  /*
   * 腹末收圆段：`segmentedAbdomen()` 的最后一个截面是被平切封口的，直接留着
   * 就是「一刀锯断的塑料管」（东方蝼蛄与知了猴都记过这一笔）。
   * 起始半径略大于腹部末端，把那张平口盖子吞掉，再按四分之一椭圆收到近乎一点。
   */
  {
    const steps = 8
    const sections: Section[] = []
    for (let i = 0; i <= steps; i++) {
      const t = i / steps
      const r = 0.092 * Math.cos((t * Math.PI) / 2) + 0.006
      sections.push({
        at: new THREE.Vector3(THREE.MathUtils.lerp(ABDOMEN_TO + 0.03, TAIL_TO, t), THREE.MathUtils.lerp(0.1, 0.13, t), 0),
        ry: r,
        rz: r * 0.95,
      })
    }
    const tail = new THREE.Mesh(loft(sections, 16), bodyMat)
    tail.name = 'abdomen'
    g.add(tail)
  }

  // ---- 咀嚼式大颚
  g.add(mandibles({ at: [1.28, -0.05, 0.06], length: 0.11, spread: 0.4, curve: 0.5 }, bodyMat))

  /*
   * 复眼：直径 0.21 = 体长的 7.6%，成虫只有 5.7%——「头大眼大」是若虫最省的
   * 一笔幼体感。位置在头的两侧偏上，向外凸出头壳轮廓约 0.09。
   */
  const eyes = compoundEyePair({
    at: [1.14, 0.12, 0.145],
    radius: 0.105,
    color: EYE_COLOR,
    flatten: 0.86,
    stretch: 1.06,
    facets: false,
  })
  eyes.traverse((o) => {
    if ((o as THREE.Mesh).isMesh) o.name = 'eye'
  })
  g.add(eyes)

  // ---- 触角：丝状，相对成虫更短（成虫 1.1 / 体长 4.9 = 22%，这里 0.52 / 2.6 = 20%）
  g.add(
    antennaPair(
      { base: [1.24, 0.1, 0.075], length: 0.52, kind: 'filiform', pitch: 10, yaw: 40, thickness: 0.024 },
      bodyMat,
    ),
  )

  /*
   * 前足与中足：普通步行足，细。最粗处约 0.054，与后足腿节的 0.181 差 3.4 倍——
   * 「三对腿不一样粗」这句话的可测形式就是这个比值。
   * 名字统一打成 walk-leg，测试按名字取最粗处与后足对比。
   */
  for (const spec of [
    { base: [0.84, -0.1, 0.155] as [number, number, number], femur: 0.24, tibia: 0.24, tarsus: 0.1, splay: 30, sweep: -30, knee: 70 },
    { base: [0.58, -0.11, 0.165] as [number, number, number], femur: 0.26, tibia: 0.27, tarsus: 0.11, splay: 30, sweep: 6, knee: 72 },
  ]) {
    const pair = legPair({ ...spec, thickness: 0.036 }, legMat)
    pair.traverse((o) => {
      if ((o as THREE.Mesh).isMesh) o.name = 'walk-leg'
    })
    g.add(pair)
  }

  // ---- 跳跃后足：本阶段「若虫 = 缩小版成虫」的主要证据
  const rightHind = jumpingLeg(1, legMat, femurMat, darkMat, spineMat)
  g.add(rightHind.group, jumpingLeg(-1, legMat, femurMat, darkMat, spineMat).group)

  /*
   * 翅芽：本阶段的教学重点。**后翅芽在前翅芽的上方与外侧**（倒转），
   * 两对芽的尖端一齐朝上朝后翘——理由与实测数字见文件头招牌结构第 1 条。
   * 顺序：先加前翅芽，再加后翅芽，后者压在前者外面。
   */
  for (const side of [1, -1] as const) {
    g.add(wingPad(FORE_PAD_BASE, FORE_PAD_TIP, side, 'wing-pad-fore', padMat, padVeinMat))
  }
  for (const side of [1, -1] as const) {
    g.add(wingPad(HIND_PAD_BASE, HIND_PAD_TIP, side, 'wing-pad-hind', padMat, padVeinMat))
  }

  const anchors: Record<string, THREE.Vector3> = {
    wingPad: new THREE.Vector3(
      HIND_PAD_BASE[0] + 0.6 * (HIND_PAD_TIP[0] - HIND_PAD_BASE[0]),
      HIND_PAD_BASE[1] + 0.6 * (HIND_PAD_TIP[1] - HIND_PAD_BASE[1]),
      HIND_PAD_BASE[2] + 0.6 * (HIND_PAD_TIP[2] - HIND_PAD_BASE[2]),
    ),
    hindFemur: rightHind.knee.clone(),
    eye: new THREE.Vector3(1.14, 0.14, 0.24),
    pronotum: new THREE.Vector3(0.75, 0.31, 0),
    head: new THREE.Vector3(1.24, -0.02, 0),
    abdomen: new THREE.Vector3(-0.7, 0.12, 0),
  }

  return finalize(g, anchors)
}
