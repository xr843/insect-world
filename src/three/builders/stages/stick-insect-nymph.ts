/**
 * 棒䗛（棒䗛属 Ramulus）· 若虫（取中龄，约 3~4 龄）
 *
 * 单位与坐标系同成虫（../stick-insect.ts）：1 = 1 厘米真实体长，
 * +X 向前（头）、+Y 向上（背）、+Z 向右。
 *
 * ## 这只虫存在的意义：「若虫就是缩小版成虫」的最极端例子
 *
 * 棒䗛是**不完全变态**：卵 → **若虫** → 成虫，没有蛹，也没有「幼虫」这一步
 * （`stages.ts` 的 `LifeStage` 注释把这条写死了）。
 *
 * 本目录另外几只若虫各有一处「成虫没有的东西」可讲：螳螂和蝗虫的若虫有**翅芽**，
 * 水虿换了一整套水下生活，知了猴长着挖掘足。**棒䗛若虫连这一处都没有** ——
 * 棒䗛属的成虫本来就**无翅**，所以若虫身上也没有翅芽可长。它从卵盖里钻出来
 * 那一刻起就是一截小枯枝，之后只是**一次次蜕皮、一截截拉长**。
 * 这让它成了「若虫 = 缩小版成虫」这句话最干净的正例：把它和 `stick-insect.ts`
 * 并排放，每一个部件都一一对得上 —— 同样 11 节的竹节状躯干、同样向前伸直
 * 夹住头部的前足（拟态枯枝的标志姿势）、同样斜撑的中后足、同样的丝状触角。
 * 所以本文件的部件全部照成虫的结构做，差别只落在下面三处。
 *
 * ## 与成虫的三处差别
 *
 * 1. **体长 4.6 厘米，成虫约 10 厘米。** 中龄若虫，不到成虫的一半。
 *    尺度不为「好看」放大 —— 取景按 radius 归一化，真实大小交给界面用文字说。
 * 2. **幼体比例：头相对大，躯干相对短粗。** 所有幼体动物的通例（头先长、身子后跟上）：
 *    - 头长占体长 8.9%，成虫 5.5%；头宽占体长 4.1%，成虫 2.8%（实测）。
 *    - 体长 / 最粗处体径 ≈ 20:1，成虫 ≈ 28:1。**仍然是一根细枝**，只是没有成虫那么
 *      极端 —— 竹节虫的躯干是随龄期一节节拉长的，最后几次蜕皮拉得最多。
 * 3. **颜色更绿更嫩。** 很多棒䗛若虫是嫩绿色的，之后随龄期逐渐转成褐绿、灰褐
 *    （成虫图鉴卡「体色和体表纹理随蜕皮变化，贴近所栖息植物的颜色」讲的正是这个）。
 *    成虫是「枯枝褐 ↔ 苔藓绿」逐节斑驳，若虫取一身均匀的嫩枝绿，
 *    只在节间留很小的明度抖动 —— 它模拟的是一根**新抽的嫩枝**，不是一截老枯枝。
 *
 * ## 配色（ACES 会提亮去饱和；「越深越保险」害过 10 只里 7 只）
 *
 * 躯干嫩绿 L≈0.47、头 0.48、腿略黄一点 0.55、节环 0.59、复眼深褐 0.17。躯干的节环（竹节）
 * 靠几何的凸棱 + 比节身略浅一档的颜色读出来，不靠深色描边 —— 深色描边在
 * 4.6 厘米的细枝上会读成一串黑色的箍。
 *
 * ## 锚点：哪些与成虫同名、为什么
 *
 * 展台会拿当前模型的 anchors 去配成虫的 hotspot 表，**同名即把成虫的卡片贴过来**。
 * 成虫的六张卡片（body / leg / antenna / head / thorax / camouflage）逐张核对过，
 * 讲的都是若虫身上同样成立的事：棍棒状体躯与节、可自切逃生的细长足
 * （若虫自切后还能在下次蜕皮时再生，成虫反而不能）、丝状触角、小而不显眼的头、
 * 着生三对足的延长胸节、随蜕皮变化的拟态体色 —— 所以六个全部沿用，
 * 且每个都落在若虫的对应部位上。这正是「缩小版成虫」在界面上的样子：
 * 切到若虫，同一批标注点还在同一批部位上。
 */
import * as THREE from 'three'
import {
  antennaPair,
  chitin,
  compoundEyePair,
  finalize,
  leg,
  loft,
  mirrorZ,
  spindle,
  type InsectModel,
  type LegSpec,
  type Section,
} from '../kit'

// ---------------------------------------------------------------- 尺度

/** 胸腹总长（头另算）：加上头部得体长约 4.6 厘米 */
const TRUNK_LENGTH = 4.2
/** 头与前胸的衔接处 */
const TRUNK_FRONT_X = 2.1
/** 头长：占体长 8.9%（成虫 5.5%） */
const HEAD_LEN = 0.39
/**
 * 胸部最粗处半径。含节环凸起的直径 0.23，体长 / 体径 ≈ 20:1（成虫 ≈ 28:1）。
 * 幼体躯干相对短粗，但仍是一根细枝。
 */
const R_THORAX = 0.094
const R_ABDOMEN_TIP = 0.05
/** 头半径：相对体长比成虫大 1.5 倍上下 —— 幼体「头大」的直接证据 */
const R_HEAD = 0.095

/**
 * 11 节躯干各节的长度比例：胸 2 节 + 腹 9 节。与成虫同一份节律，
 * 只把腹部后几节压短一点：竹节虫的腹部是随龄期一节节拉长的，
 * 中龄若虫的腹节还没长到成虫的比例。
 */
const SEG_LEN_FRAC_RAW = [0.72, 0.86, 1.0, 1.04, 1.06, 1.04, 0.98, 0.92, 0.86, 0.76, 0.56]

// ---------------------------------------------------------------- 局部工具

/** 固定种子伪随机：节间的明度抖动必须每次构建都一样 */
function hash01(i: number): number {
  const x = Math.sin(i * 12.9898 + 78.233) * 43758.5453
  return x - Math.floor(x)
}

function smoothstep(t: number): number {
  const x = Math.min(1, Math.max(0, t))
  return x * x * (3 - 2 * x)
}

/**
 * 一节躯干：与成虫的 bodySegment 同一套做法（成虫文件里那个函数没导出，
 * 这里照抄一份，保持两者的节形一致）—— 近似圆柱，起始处一圈指数衰减的凸棱
 * 就是「竹节」，相邻两节在棱处半径不连续，那道台阶就是节间分界线。
 *
 * 节棱另外用一圈比节身浅一档的细环压在台阶上：4.6 厘米的若虫，0.02 的凸起
 * 在 720 像素的画面上只有 2~3 像素，光靠几何的明暗转折读不出节来。
 */
function bodySegment(
  from: THREE.Vector3,
  to: THREE.Vector3,
  r0: number,
  r1: number,
  material: THREE.Material,
  nodeBulge = 0.22,
): THREE.Mesh {
  const steps = 7
  const sections: Section[] = []
  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    const base = THREE.MathUtils.lerp(r0, r1, t)
    const r = base * (1 + nodeBulge * Math.exp(-t * 10))
    sections.push({ at: new THREE.Vector3().lerpVectors(from, to, t), ry: r, rz: r })
  }
  const mesh = new THREE.Mesh(loft(sections, 12), material)
  mesh.name = 'trunk-segment'
  return mesh
}

/** 节环：压在每节起点那道凸棱上的一圈细环，比节身浅 —— 竹节在画面上靠它数得出来 */
function nodeRing(x: number, r: number, material: THREE.Material): THREE.Mesh {
  const sections: Section[] = []
  const steps = 24
  for (let i = 0; i <= steps; i++) {
    const a = (i / steps) * Math.PI * 2
    sections.push({ at: new THREE.Vector3(x, r * Math.cos(a), r * Math.sin(a)), ry: r * 0.12, rz: r * 0.12 })
  }
  const mesh = new THREE.Mesh(loft(sections, 6), material)
  mesh.name = 'trunk-node'
  return mesh
}

/**
 * 一对足。用 leg() + mirrorZ() 而不是 legPair()：mirrorZ 对整条腿的**绝对坐标**
 * 几何做一次镜像，左右才是精确对称的（成虫文件的长注释讲过为什么「先把 base.z
 * 取反再镜像」在又长又贴体的竹节虫腿上会歪到对侧）；mirrorZ 还会同步翻骨架侧别。
 */
function legPairOf(spec: LegSpec, material: THREE.Material): THREE.Group {
  const one = leg(spec, material)
  one.traverse((o) => {
    if ((o as THREE.Mesh).isMesh) o.name = 'leg'
  })
  return mirrorZ(one)
}

// ---------------------------------------------------------------- 主体

export function buildStickInsectNymph(): InsectModel {
  const g = new THREE.Group()

  const lenSum = SEG_LEN_FRAC_RAW.reduce((a, b) => a + b, 0)
  const SEG_LEN_FRAC = SEG_LEN_FRAC_RAW.map((f) => f / lenSum)
  const NUM_SEGMENTS = SEG_LEN_FRAC.length
  const jointsX: number[] = [TRUNK_FRONT_X]
  for (const f of SEG_LEN_FRAC) jointsX.push(jointsX[jointsX.length - 1] - f * TRUNK_LENGTH)

  /*
   * 嫩枝绿：色相 88°~96°、饱和 0.34~0.40、明度 0.45~0.49 之间逐节小幅抖动。
   * 抖动幅度只有成虫的三分之一 —— 成虫的斑驳是「老枝上深浅不一的树皮」，
   * 若虫是一根新抽的嫩枝，均匀得多。
   */
  const nodeMat = chitin({ color: '#9dbb72', gloss: 0.3, clearcoat: 0.1 })
  for (let i = 0; i < NUM_SEGMENTS; i++) {
    const t0 = i / NUM_SEGMENTS
    const t1 = (i + 1) / NUM_SEGMENTS
    const r0 = THREE.MathUtils.lerp(R_THORAX, R_ABDOMEN_TIP, smoothstep(t0))
    const r1 = THREE.MathUtils.lerp(R_THORAX, R_ABDOMEN_TIP, smoothstep(t1))
    const color = new THREE.Color().setHSL(
      (88 + hash01(i * 3 + 1) * 8) / 360,
      0.34 + hash01(i * 3 + 3) * 0.06,
      0.45 + hash01(i * 3 + 2) * 0.04,
      THREE.SRGBColorSpace,
    )
    const segMat = chitin({ color, gloss: 0.34, clearcoat: 0.12 })
    g.add(bodySegment(new THREE.Vector3(jointsX[i], 0, 0), new THREE.Vector3(jointsX[i + 1], 0, 0), r0, r1, segMat))
    // 第 0 节的起点是头胸交界，被头盖住，不必再压环
    if (i > 0) g.add(nodeRing(jointsX[i] - 0.012, r0 * 1.12, nodeMat))
  }

  // 腹端一对短尾须：若虫同样有，把尾端那个尖打断，交代「这里是尾」而不是「断了的枝」
  const tailX = jointsX[NUM_SEGMENTS]
  const cercusMat = chitin({ color: '#8fae63', gloss: 0.3 })
  for (const side of [1, -1] as const) {
    const pts: Section[] = []
    for (let i = 0; i <= 5; i++) {
      const t = i / 5
      pts.push({
        at: new THREE.Vector3(tailX + 0.03 - 0.16 * t, 0.012 * t, side * (0.012 + 0.03 * t)),
        ry: THREE.MathUtils.lerp(0.018, 0.005, t),
        rz: THREE.MathUtils.lerp(0.018, 0.005, t),
      })
    }
    const c = new THREE.Mesh(loft(pts, 8), cercusMat)
    c.name = 'cercus'
    g.add(c)
  }

  // ---- 头：与成虫同样是「与身体几乎等粗、前端收圆」的一截，但相对体长更大
  const headMat = chitin({ color: '#82a254', gloss: 0.34, clearcoat: 0.1 })
  const headFrontX = TRUNK_FRONT_X + HEAD_LEN
  const head = new THREE.Mesh(
    spindle([headFrontX, 0, 0], [TRUNK_FRONT_X - 0.02, 0, 0], R_HEAD, { bulge: 0.45, taperStart: 0.55, taperEnd: 1.0 }),
    headMat,
  )
  head.name = 'head-capsule'
  g.add(head)

  // ---- 复眼：小而侧生（竹节虫靠触觉与嗅觉多过靠眼），若虫的相对略大一点
  g.add(
    compoundEyePair({
      at: [headFrontX - 0.12, 0.012, R_HEAD * 0.8],
      radius: 0.034,
      color: '#3a2c1c',
      flatten: 0.75,
      stretch: 0.85,
    }),
  )

  // ---- 丝状触角：与成虫同一种，长度占体长约 24%（成虫 26%）
  const antennaMat = chitin({ color: '#a7bf78', gloss: 0.3 })
  const antennae = antennaPair(
    { base: [headFrontX - 0.02, 0.008, R_HEAD * 0.45], length: 1.1, kind: 'filiform', pitch: 22, yaw: 28, thickness: 0.009 },
    antennaMat,
  )
  antennae.traverse((o) => {
    if ((o as THREE.Mesh).isMesh) o.name = 'antenna'
  })
  g.add(antennae)

  /*
   * ---- 三对足：与成虫同一套姿态参数，长度按体长缩放（成虫 × 0.44）。
   * 若虫的足相对体长与成虫差不多 —— 竹节虫的足与躯干是同步拉长的，
   * 这里只把粗细按幼体比例放一点（细到 0.015 在画面上就断成虚线了）。
   */
  const legMat = chitin({ color: '#96b466', gloss: 0.3, clearcoat: 0.06 })
  const S = 0.44
  // 前足：向正前方伸直、与头和身体连成一线 —— 拟态枯枝的标志姿势，若虫一样会摆
  g.add(
    legPairOf(
      {
        base: [TRUNK_FRONT_X - 0.07, -0.01, R_THORAX * 0.8],
        femur: 2.1 * S,
        tibia: 2.5 * S,
        tarsus: 1.0 * S,
        thickness: 0.02,
        splay: 9,
        sweep: -83,
        knee: 10,
        ankle: 12,
        spines: false,
      },
      legMat,
    ),
  )
  // 中足：向两侧偏后斜撑
  g.add(
    legPairOf(
      {
        base: [jointsX[2], -0.02, R_THORAX * 0.85],
        femur: 1.5 * S,
        tibia: 1.75 * S,
        tarsus: 0.7 * S,
        thickness: 0.021,
        splay: 46,
        sweep: 4,
        knee: 68,
      },
      legMat,
    ),
  )
  // 后足：最长，向后方斜撑
  g.add(
    legPairOf(
      {
        base: [jointsX[3], -0.02, R_THORAX * 0.8],
        femur: 1.9 * S,
        tibia: 2.3 * S,
        tarsus: 0.9 * S,
        thickness: 0.022,
        splay: 40,
        sweep: 40,
        knee: 70,
      },
      legMat,
    ),
  )

  /*
   * 锚点与成虫同名（理由见文件头），位置都取在若虫的对应部位**表面**上：
   * 标注点浮在空气里是本仓库专门有闸门抓的毛病，这里的测试照搬那把尺子。
   */
  const midBodyIdx = Math.floor(NUM_SEGMENTS / 2)
  const midR = THREE.MathUtils.lerp(R_THORAX, R_ABDOMEN_TIP, smoothstep(midBodyIdx / NUM_SEGMENTS))
  const hind = new THREE.Vector3(jointsX[3], -0.02, R_THORAX * 0.8)
  const anchors: Record<string, THREE.Vector3> = {
    body: new THREE.Vector3(jointsX[midBodyIdx], midR, 0),
    head: new THREE.Vector3(headFrontX - HEAD_LEN * 0.45, R_HEAD * 0.9, 0),
    thorax: new THREE.Vector3((jointsX[0] + jointsX[2]) / 2, R_THORAX, 0),
    // 触角中段：沿触角起点按 pitch/yaw 走出 0.4 厘米
    antenna: new THREE.Vector3(headFrontX - 0.02, 0.008, R_HEAD * 0.45).add(
      new THREE.Vector3(
        Math.cos(THREE.MathUtils.degToRad(22)) * Math.cos(THREE.MathUtils.degToRad(28)),
        Math.sin(THREE.MathUtils.degToRad(22)),
        Math.cos(THREE.MathUtils.degToRad(22)) * Math.sin(THREE.MathUtils.degToRad(28)),
      ).multiplyScalar(0.3),
    ),
    // 后足腿节中段：用 leg() 同一套公式算腿节方向
    leg: hind.clone().add(legFemurDir(40, 40).multiplyScalar(1.9 * S * 0.5)),
    camouflage: new THREE.Vector3(jointsX[midBodyIdx + 1], 0, midR),
  }

  return finalize(g, anchors)
}

/** 与 kit.leg() 里腿节方向同一个公式（右侧），给锚点落在腿节上用 */
function legFemurDir(splayDeg: number, sweepDeg: number): THREE.Vector3 {
  const splay = THREE.MathUtils.degToRad(splayDeg)
  const sweep = THREE.MathUtils.degToRad(sweepDeg)
  return new THREE.Vector3(
    Math.sin(sweep) * Math.cos(splay) * -1,
    Math.sin(splay) * 0.35 + 0.25,
    Math.cos(sweep) * Math.cos(splay),
  ).normalize()
}
