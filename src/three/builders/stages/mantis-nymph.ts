/**
 * 中华大刀螳 Tenodera sinensis · 若虫（取中后期龄期，约 5~6 龄）
 *
 * 单位与坐标系同成虫（../mantis.ts）：1 = 1 厘米真实体长，
 * +X 向前（头）、+Y 向上（背）、+Z 向右。
 *
 * ## 这只虫存在的意义：不完全变态的正面教材
 *
 * 螳螂是**不完全变态**：卵鞘 → **若虫** → 成虫，没有蛹，也没有「幼虫」这一步
 * （`stages.ts` 里 `LifeStage` 的注释把这条写死了：把若虫叫成幼虫，
 * 等于把中小学讲昆虫的第一个知识点讲反）。
 *
 * 生活史这一格要讲的知识点只有一句：**若虫就是一只缩小版的成虫。**
 * 这句话必须**在形态上看得见**，不能只写在文案里。所以本文件的每一个部件
 * 都照着 `../mantis.ts` 的成虫做：同样的倒三角头、同样斜举的细长前胸、
 * 同样两把带列刺的捕捉足、同样纤细的中后足。把它和帝王蝶幼虫（一条环节
 * 分明的肉虫，与成虫毫无相似之处）并排放，完全变态与不完全变态的差别
 * 一眼就分得开 —— 这正是这个功能的全部价值。
 *
 * ## 与成虫的三处差别（这三处才是「若虫」这个阶段的内容）
 *
 * 1. **体长 3.54 厘米，成虫 7~9 厘米。** 明显更小，但不是等比缩小（见第 3 条）。
 * 2. **没有可用的翅，只有短小的翅芽（wing pad）。** 中后胸背面各一对短芽，
 *    向后下方贴伏，末端只搭到腹部前 24%（约第 1~2 腹节）。
 *    作为对照，成虫的前翅长达体长的 41%、收拢时盖住整条腹部。
 *    **这一处是与「翅」最本质的分界**：翅芽是一个装着未成形翅的口袋，
 *    没有翅脉分区、不能展开、也飞不起来；六到九次蜕皮之后它才在最后一次
 *    蜕皮时展成真正的翅。做成成虫那样的长翅，这只虫就白做了。
 * 3. **幼体比例：头与复眼相对身体比成虫大，腹部更细，腹端略向上翘。**
 *    这是所有幼体动物的通例（头部先发育、躯干后跟上）。实测：
 *    复眼半径 / 体长 = 0.038，成虫是 0.023 —— 相对大 1.6 倍。
 *    前胸相对更短（占体长 27%，成虫 33%）：那根「脖子」是随龄期一次次拉长的。
 *
 * ## 招牌结构：捕捉足
 *
 * 螳螂目的灵魂器官，若虫一孵出来就有，且已经能用。结构照抄成虫：
 * 基节 → 极长的腿节（腹缘一列长短相间的刺）→ 反折回来的镰刀状胫节。
 * `kit.leg()` 生成的是「膝盖朝一个方向弯」的直腿，表达不了这种折刀式关节，
 * 所以与成虫一样完全自建。**刺列必须是有体积的锥，而不是几片侧立的三角**
 * —— 兰花螳螂的花瓣状腿节在这件事上栽过一次（宽厚比断言一路全绿，
 * 渲染出来整只虫像一只苍白的虾）。
 *
 * ## 配色
 *
 * ACES 色调映射会提亮去饱和，本仓库因此有过「颜色压深一档」的经验，
 * 但它被误解成「越深越保险」之后，招牌图案就在画面上消失了（10 只里 7 只返工）。
 * 这只虫通体草绿，最怕糊成一团绿泥，所以三处招牌一律**拉开明度**：
 *
 * - **腿节刺列**：近白的米色（L 0.886）压在草绿腿节（L 0.463）上，差 0.42。
 * - **复眼里的伪瞳孔**：近黑（L 0.106）落在浅褐复眼（L 0.706）上，差 0.60。
 *   （伪瞳孔是螳螂最好认的特征之一，图鉴的 `mantis-eye` 讲的就是它。）
 * - **翅芽**：比它趴着的胸背**亮**一档（0.625 vs 0.528），外缘再压一道近白的棱。
 *   方向不能反 —— 黑蚱蝉若虫的翅芽曾比胸背暗 0.12，四个机位一致读成
 *   「胸背上的一块深色斑纹」而不是「一片盖上去的芽」。深色块贴在浅色面上，
 *   人眼的第一解释永远是斑纹。
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
  type Section,
} from '../kit'

// ---------------------------------------------------------------- 体轴分段

/** 口器最前端 */
const MOUTH_X = 1.94
/** 头与前胸的交界 */
const HEAD_BASE_X = 1.7
/** 前胸后端（接中后胸） */
const PROTHORAX_BACK_X = 0.75
/** 中后胸后端（接腹部） */
const THORAX_BACK_X = 0.2
/** 腹端 */
/** 口器到腹端 3.54 厘米：成虫 7~9 厘米的 40% 上下，落在「中后期龄期 3~4 厘米」里 */
const ABDOMEN_TIP_X = -1.6

/**
 * 前胸后端的高度与仰角。
 *
 * 螳螂静止时不是趴着的：中后胸与腹部由中后足撑住，拉长的前胸从那里向前上方
 * 斜举，头因此高出腹部一大截。少了这个仰角，再准确的部件也只会读成
 * 「一根横躺的绿枝」（成虫文件的原话）。这里与成虫同取约 36°。
 */
const PROTHORAX_BACK_Y = 0.32
const PROTHORAX_RISE = 0.69
const PROTHORAX_SLOPE = PROTHORAX_RISE / (HEAD_BASE_X - PROTHORAX_BACK_X)
const prothoraxY = (x: number) => PROTHORAX_BACK_Y + (x - PROTHORAX_BACK_X) * PROTHORAX_SLOPE
const HEAD_Y = prothoraxY(HEAD_BASE_X)

// ---------------------------------------------------------------- 局部工具

function taperedTube(points: THREE.Vector3[], radii: number[], material: THREE.Material, radial = 14): THREE.Mesh {
  const sections: Section[] = points.map((at, i) => ({ at, ry: radii[i], rz: radii[i] }))
  return new THREE.Mesh(loft(sections, radial), material)
}

function jointSphere(p: THREE.Vector3, r: number, material: THREE.Material, name: string): THREE.Mesh {
  const m = new THREE.Mesh(new THREE.SphereGeometry(r, 12, 10), material)
  m.position.copy(p)
  m.name = name
  return m
}

function quadBezier(p0: THREE.Vector3, p1: THREE.Vector3, p2: THREE.Vector3, t: number): THREE.Vector3 {
  return p0.clone().lerp(p1, t).lerp(p1.clone().lerp(p2, t), t)
}

// ---------------------------------------------------------------- 腹部

const ABD_FROM = new THREE.Vector3(THORAX_BACK_X, 0.29, 0)
const ABD_CTRL = new THREE.Vector3(-0.75, 0.2, 0)
const ABD_TIP = new THREE.Vector3(ABDOMEN_TIP_X, 0.62, 0)
/** 可见的腹节数 */
const ABD_SEGMENTS = 8
/**
 * 腹部最粗处的半径。乘上下面的扁平系数后横径 0.161 —— 占体长 4.5%，
 * 成虫是 5.0%：**若虫的腹部相对更细**。成虫（尤其雌虫）腹内装着卵巢，
 * 产卵前还会明显膨大，那是性成熟才有的事。
 *
 * 第一版给到 0.128（横径 4.2%），配上一路收到零的锥形包络，出图四个机位
 * 一致读成「一片向后甩出去的柳叶」而不是一条分节的腹部 —— 又细又长又尖，
 * 剪影里它就是一把刀。加粗一档 + 下面那条留中段的包络 + 深一倍的节缢，
 * 才把它拉回「一段有体积、数得出节的躯干」。
 */
const ABD_R = 0.14
/** 背腹压扁：横径 / 竖径 = 1.15²，与成虫腹部同为「宽扁略侧压」的断面 */
const ABD_FLAT = 1.15

const abdomenAxis = (t: number) => quadBezier(ABD_FROM, ABD_CTRL, ABD_TIP, t)

/**
 * 腹部包络 × 逐节缢缩。
 *
 * 逐节起伏 8.5%：腹节靠这道缢缩读出来，缢深了会变成一串珠子，
 * 缢浅了（第一版 5%）在 3.5 厘米的小体量上根本数不出节。
 * 末端 6% 按圆弧收到零 —— 只做包络的话尾端会剩一圈半径，放样封口封出一个
 * 正圆平面，读成「一截锯断的塑料管」（帝王蝶幼虫的尾端栽过这个，
 * 是目视验收当场抓出来的）。
 */
function abdomenR(t: number): number {
  const rise = 0.72 + 0.28 * THREE.MathUtils.smoothstep(t, 0, 0.2)
  // 收细从 t=0.42 才开始（第一版是 0.25）：中段留住体积，腹部才是躯干不是刀刃
  const fall = 1 - 0.86 * Math.pow(THREE.MathUtils.smoothstep(t, 0.42, 1), 1.35)
  const local = (t * ABD_SEGMENTS) % 1
  const ripple = 1 - 0.085 * Math.pow(Math.abs(Math.cos(local * Math.PI)), 1.4)
  const x = THREE.MathUtils.clamp((t - 0.92) / 0.08, 0, 1)
  const cap = Math.sqrt(Math.max(1 - x * x, 0))
  return Math.max(ABD_R * rise * fall * ripple * cap, 1e-4)
}

function abdomen(material: THREE.Material): THREE.Mesh {
  const steps = 56
  const sections: Section[] = []
  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    const r = abdomenR(t)
    sections.push({ at: abdomenAxis(t), ry: r / ABD_FLAT, rz: r * ABD_FLAT })
  }
  const mesh = new THREE.Mesh(loft(sections, 22), material)
  mesh.name = 'abdomen'
  return mesh
}

/**
 * 节间沟：腹背上一圈紧贴体表的细棱，标出一节与下一节的交界。
 *
 * 为什么光靠包络的缢缩不够：3.5 厘米的若虫，腹部最粗处横径只有 0.161，
 * 8.5% 的缢缩深度是 0.014 厘米 —— 占画面直径 0.3%，720 像素上不到 2 个像素，
 * 出图上腹部就是一根光滑的锥。缢缩再深就成了一串珠子（另一个方向的翻车）。
 * 所以分节交给**沟**：一圈比腹部深一档的细棱，靠明暗转折被看见，
 * 数得出节数，而体型仍然是平顺的。
 */
function abdomenSuture(t: number, material: THREE.Material): THREE.Mesh {
  const at = abdomenAxis(t)
  const tangent = abdomenAxis(Math.min(t + 0.01, 1)).sub(abdomenAxis(Math.max(t - 0.01, 0))).normalize()
  const up = new THREE.Vector3(0, 1, 0).addScaledVector(tangent, -tangent.y).normalize()
  const side = new THREE.Vector3().crossVectors(tangent, up)
  const r = abdomenR(t)
  const steps = 26
  const sections: Section[] = []
  for (let i = 0; i <= steps; i++) {
    const a = (i / steps) * Math.PI * 2
    const p = at
      .clone()
      .addScaledVector(up, (r / ABD_FLAT) * Math.cos(a) * 1.01)
      .addScaledVector(side, r * ABD_FLAT * Math.sin(a) * 1.01)
    sections.push({ at: p, ry: 0.011, rz: 0.011 })
  }
  const m = new THREE.Mesh(loft(sections, 8), material)
  m.name = 'abdomen-suture'
  return m
}

/**
 * 尾须（cercus）：腹端一对短小的分节感觉器，向后下方岔开。
 *
 * 它不只是「多做一个部件」：腹部末端收成一个光秃秃的尖时，剪影读成一把刀；
 * 一对岔开的尾须把那个尖**打断**，腹端才有「这里结束了」的交代。
 * 成虫身上它被收拢的翅盖住了，若虫没有翅，正是看得见尾须的阶段。
 */
function cercus(side: 1 | -1, material: THREE.Material): THREE.Mesh {
  const root = abdomenAxis(0.985)
  const pts: THREE.Vector3[] = []
  const rs: number[] = []
  for (let i = 0; i <= 6; i++) {
    const t = i / 6
    pts.push(root.clone().add(new THREE.Vector3(-0.135 * t, -0.055 * t * t, side * (0.02 + 0.075 * t))))
    rs.push(THREE.MathUtils.lerp(0.017, 0.004, Math.pow(t, 0.7)))
  }
  const m = taperedTube(pts, rs, material, 10)
  m.name = 'cercus'
  return m
}

// ---------------------------------------------------------------- 翅芽

/**
 * 翅芽的扁平面法线自 +Y 向体侧外倾的角度：外缘下垂、内缘压在背中线上，
 * 就是「贴伏」的姿态。
 */
const PAD_DROOP = THREE.MathUtils.degToRad(46)
/**
 * 后缘抬离体表的量。0.05 而不是第一版的 0.032 —— 连同加大的外倾角与更向体侧
 * 甩出的片尖，一起解决同一个毛病：第一版的翅芽整片压在胸背的轮廓**之内**，
 * 出图读成「背上贴了两张带浅色边的标签」，而不是两片盖上去的芽。
 * 一个部件要被读成「盖在上面的」，它得有一条自由边、有缝、并且敢探出体廓。
 */
const PAD_LIFT = 0.05
const PAD_LIFT_FROM = 0.55
/** 断面表：[沿芽长的进度, 半厚, 半宽] —— 厚/宽 在最宽处约 0.31，扁而不是纸片 */
const PAD_PROFILE: readonly (readonly [number, number, number])[] = [
  [0.0, 0.022, 0.05],
  [0.2, 0.032, 0.09],
  [0.45, 0.034, 0.103],
  [0.72, 0.026, 0.085],
  [0.9, 0.015, 0.05],
  [1.0, 0.006, 0.02],
]

/** 两对翅芽：中胸（前翅芽）短、后胸（后翅芽）长且盖在前一对之上 */
const PADS: readonly { base: [number, number, number]; tip: [number, number, number]; scale: number }[] = [
  { base: [0.6, 0.44, 0.1], tip: [0.16, 0.36, 0.26], scale: 0.86 },
  { base: [0.36, 0.44, 0.12], tip: [-0.2, 0.34, 0.3], scale: 1.0 },
]

/**
 * 后缘翘起的包络。用 k²（缓入）而不是 smoothstep：smoothstep 在末端把斜率
 * 收回 0，翅芽会以「平行于体表」的姿态结束，看起来像被压住的；
 * k² 的斜率在末端最大，后缘是越翘越开的 —— 那才是一片自由边的样子。
 */
function padLift(t: number): number {
  if (t <= PAD_LIFT_FROM) return 0
  const k = (t - PAD_LIFT_FROM) / (1 - PAD_LIFT_FROM)
  return PAD_LIFT * k * k
}

/**
 * 一枚翅芽。
 *
 * 姿态**显式给三根轴**再 makeBasis，不用 `quaternion.setFromUnitVectors()`：
 * 那个函数只把长度轴对上，绕长度轴的滚转是它自己随便挑的 —— 翅芽的扁平面
 * 朝哪儿是这个部件的全部意义，绝不能交给一个未定义的自由度。
 */
function wingPad(
  spec: (typeof PADS)[number],
  side: 1 | -1,
  padMaterial: THREE.Material,
  rimMaterial: THREE.Material,
): THREE.Group {
  const base = new THREE.Vector3(spec.base[0], spec.base[1], spec.base[2] * side)
  const tip = new THREE.Vector3(spec.tip[0], spec.tip[1], spec.tip[2] * side)
  const len = base.distanceTo(tip)
  const g = new THREE.Group()

  const sample = (t: number, col: 1 | 2): number => {
    for (let i = 0; i < PAD_PROFILE.length - 1; i++) {
      const a = PAD_PROFILE[i]
      const b = PAD_PROFILE[i + 1]
      if (t >= a[0] && t <= b[0]) return THREE.MathUtils.lerp(a[col], b[col], (t - a[0]) / (b[0] - a[0])) * spec.scale
    }
    return PAD_PROFILE[PAD_PROFILE.length - 1][col] * spec.scale
  }
  const halfThick = (t: number) => sample(t, 1)
  const halfWidth = (t: number) => sample(t, 2)

  // 局部几何沿 +X 长出：loft 的标架在这个走向下 ry→局部 +Y（厚）、rz→局部 +Z（宽），
  // 于是扁平面的法线就是局部 +Y，正好交给下面的 makeBasis 去指方向
  const stations = 16
  const sections: Section[] = []
  for (let i = 0; i <= stations; i++) {
    const t = i / stations
    sections.push({ at: new THREE.Vector3(t * len, padLift(t), 0), ry: halfThick(t), rz: halfWidth(t) })
  }
  const blade = new THREE.Mesh(loft(sections, 20), padMaterial)
  blade.name = 'wing-pad'
  g.add(blade)

  /*
   * 两条边**不对称**：外缘（局部 −Z，落在体侧那一边）是翅芽唯一自由的边，
   * 用近白的浅色、做粗一档，压在芽面的中面上 —— 那是它在剪影里的位置；
   * 内缘（局部 +Z，掖在背中线下面）只用芽面自己的材质做一道细棱。
   *
   * 两边都用浅色会读成「一枚椭圆徽章」：一圈亮边围着一块暗地，
   * 人眼的第一解释是凹进去的碟，不是盖上去的片（黑蚱蝉若虫踩过）。
   */
  for (const [edge, mat, r0, yk] of [
    [-1, rimMaterial, 0.016, 0.05],
    [1, padMaterial, 0.011, 0.4],
  ] as const) {
    const pts: THREE.Vector3[] = []
    const rs: number[] = []
    for (let i = 0; i <= 12; i++) {
      const t = 0.06 + (i / 12) * 0.9
      pts.push(new THREE.Vector3(t * len, padLift(t) + halfThick(t) * yk, edge * halfWidth(t) * 0.96))
      rs.push(r0 * (1 - t * 0.45))
    }
    const rim = taperedTube(pts, rs, mat, 8)
    rim.name = 'pad-rim'
    g.add(rim)
  }

  // 两条翅脉：从基部向末端扇开 —— 这是「里面确实装着一副没长成的翅」的可视证据
  for (const k of [-0.55, 0.55]) {
    const pts: THREE.Vector3[] = []
    const rs: number[] = []
    for (let i = 0; i <= 10; i++) {
      const t = 0.2 + (i / 10) * 0.7
      pts.push(new THREE.Vector3(t * len, padLift(t) + halfThick(t) * 0.85, k * halfWidth(t) * 1.1))
      // 细：翅脉是「里面装着一副翅」的旁证，不是芽面上的装饰。粗了会连同外缘
      // 一起把这片芽画成一枚镶边的徽章 —— 那正是黑蚱蝉若虫第一版的病
      rs.push(0.007 * (1 - t * 0.4))
    }
    const vein = taperedTube(pts, rs, rimMaterial, 6)
    vein.name = 'pad-vein'
    g.add(vein)
  }

  const xAxis = tip.clone().sub(base).normalize()
  const n = new THREE.Vector3(0, Math.cos(PAD_DROOP), Math.sin(PAD_DROOP) * side)
  const yAxis = n.addScaledVector(xAxis, -n.dot(xAxis)).normalize()
  const zAxis = new THREE.Vector3().crossVectors(xAxis, yAxis)
  g.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(xAxis, yAxis, zAxis))
  g.position.copy(base)
  return g
}

// ---------------------------------------------------------------- 捕捉足

/** 捕捉足着生点（前胸腹面靠前处，两把刀因此悬在头的下前方） */
const FORE_BASE = new THREE.Vector3(1.55, prothoraxY(1.55) - 0.1, 0.085)
const FORE_COXA_LEN = 0.16
const FORE_COXA_DIR = new THREE.Vector3(0.3, 0.6, 0.5).normalize()
const FORE_FEMUR_LEN = 0.9
const FORE_FEMUR_DIR = new THREE.Vector3(0.92, 0.32, -0.08).normalize()
const FORE_TIBIA_LEN = 0.72
/** 腿节腹缘的刺数（长短相间） */
const FORE_SPINES = 7

/**
 * 捕捉足（只建 z 为正的一侧，调用处用 mirrorZ() 复制出另一侧）。
 *
 * 与成虫同一套骨架，尺寸按 0.42 缩放。三段的关系是这个器官的全部：
 * 腿节向前上方伸出（「举起前臂」的祈祷姿态），胫节从腿节末端**弧形反折回来**、
 * 扣进腿节腹缘的刺列凹槽，末端收成尖钩。折刀合上时刺列正好咬住猎物。
 * 把胫节做成向前继续伸的一根直棍，这就成了一条普通的行走足。
 */
function raptorialLeg(material: THREE.Material, spineMat: THREE.Material, clawMat: THREE.Material): THREE.Group {
  const g = new THREE.Group()

  // 基节：短粗，把整条捕捉足从前胸端部撑起、略向外抬升
  const coxaTip = FORE_BASE.clone().addScaledVector(FORE_COXA_DIR, FORE_COXA_LEN)
  const coxa = taperedTube([FORE_BASE.clone(), coxaTip], [0.063, 0.055], material)
  coxa.name = 'fore-coxa'
  g.add(coxa)
  g.add(jointSphere(FORE_BASE.clone(), 0.067, material, 'fore-joint'))

  // 腿节：捕捉足最长最粗壮的一节，也是这只虫全身最粗的附肢
  const femurTip = coxaTip.clone().addScaledVector(FORE_FEMUR_DIR, FORE_FEMUR_LEN)
  const femur = taperedTube([coxaTip.clone(), coxaTip.clone().lerp(femurTip, 0.5), femurTip.clone()], [0.072, 0.061, 0.03], material)
  femur.name = 'fore-femur'
  g.add(femur)
  g.add(jointSphere(coxaTip.clone(), 0.075, material, 'fore-joint'))

  // 腹侧方向：垂直于腿节走向、指向身体腹面一侧 —— 刺列与胫节折入的凹槽都朝这一侧
  const ventral = new THREE.Vector3(0, -1, 0)
    .addScaledVector(FORE_FEMUR_DIR, -new THREE.Vector3(0, -1, 0).dot(FORE_FEMUR_DIR))
    .normalize()

  /*
   * 腿节腹缘的刺列：长短相间，捕猎时扎入并卡住猎物体壁。
   * 刺是**有体积的锥**（根部直径 0.038、长 0.076~0.128，长/径 ≥ 2），
   * 不是几片侧立的窄三角 —— 后者通过形态断言，渲染出来是剪纸。
   * 刺尖向后倾（−FORE_FEMUR_DIR 方向的分量）：猎物一挣扎就往刺里陷得更深。
   */
  for (let i = 0; i < FORE_SPINES; i++) {
    const t = 0.12 + (i / (FORE_SPINES - 1)) * 0.8
    const p = coxaTip.clone().lerp(femurTip, t)
    const long = i % 2 === 0
    const len = long ? 0.128 : 0.076
    const tip = p.clone().addScaledVector(ventral, len).addScaledVector(FORE_FEMUR_DIR, -len * 0.35)
    const spine = taperedTube([p, p.clone().lerp(tip, 0.55), tip], [0.019, 0.013, 0.003], spineMat, 8)
    spine.name = 'fore-spine'
    g.add(spine)
  }

  /*
   * 胫节：镰刀状，从腿节末端弧形反折回来，末端收成尖钩。
   * 用一条二次贝塞尔弯出这个反折，比两段直线更像「镰刀」——
   * 而且弧长明显大于弦长，测试正是拿这个比值咬住「它真的是弯的」。
   */
  const ctrl = femurTip
    .clone()
    .addScaledVector(FORE_FEMUR_DIR, FORE_TIBIA_LEN * 0.42)
    .addScaledVector(ventral, FORE_TIBIA_LEN * 0.62)
  const hookTip = femurTip
    .clone()
    .addScaledVector(FORE_FEMUR_DIR, -FORE_TIBIA_LEN * 0.55)
    .addScaledVector(ventral, FORE_TIBIA_LEN * 0.2)
  const steps = 18
  const path: THREE.Vector3[] = []
  const radii: number[] = []
  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    path.push(quadBezier(femurTip, ctrl, hookTip, t))
    radii.push(THREE.MathUtils.lerp(0.038, 0.004, Math.pow(t, 0.8)))
  }
  const tibia = taperedTube(path, radii, material)
  tibia.name = 'fore-tibia'
  g.add(tibia)
  g.add(jointSphere(femurTip.clone(), 0.04, material, 'fore-joint'))

  // 端爪：胫节尖上的一枚深色小钩，扎进猎物的最后一点
  const claw = new THREE.Mesh(new THREE.SphereGeometry(0.014, 8, 6), clawMat)
  claw.position.copy(hookTip)
  claw.name = 'fore-claw'
  g.add(claw)

  return g
}

// ---------------------------------------------------------------- 主体

export function buildMantisNymph(): InsectModel {
  const g = new THREE.Group()

  /*
   * 配色的明度台阶（sRGB 的 HSL 明度，理由见文件头）：
   *   刺列 0.886 / 翅芽外缘 0.863 ≫ 复眼 0.706 > 翅芽面 0.594 > 体色 0.528 > 捕捉足 0.463 ≫ 伪瞳孔 0.082
   * 招牌的三处（刺列、伪瞳孔、翅芽）与各自的底色都差 0.35 以上。
   */
  const bodyMat = chitin({ color: '#8fae5f', gloss: 0.42, clearcoat: 0.18 })
  const abdomenMat = chitin({ color: '#9ab863', gloss: 0.34, clearcoat: 0.1 })
  const legMat = chitin({ color: '#87a758', gloss: 0.4, clearcoat: 0.16 })
  const raptorialMat = chitin({ color: '#7fa04c', gloss: 0.5, clearcoat: 0.3 })
  const spineMat = chitin({ color: '#f4ead0', gloss: 0.35 })
  const darkMat = chitin({ color: '#241c12', gloss: 0.5, clearcoat: 0.25 })
  const sutureMat = chitin({ color: '#7d9750', gloss: 0.3 })
  const padMat = chitin({ color: '#b0cb74', gloss: 0.46, clearcoat: 0.24 })
  const padRimMat = chitin({ color: '#e8f0c8', gloss: 0.4 })
  const antennaMat = chitin({ color: '#c2a862', gloss: 0.3 })

  /*
   * ---- 头：倒三角轮廓。做法与成虫一致 —— 不是雕一个三角形的头壳，
   * 而是「头壳本身很小、两颗大复眼顶在头的两个上后角」这个组合关系，
   * 复眼才是撑起倒三角的主体。若虫的复眼比成虫**相对更大**，
   * 所以这个倒三角在若虫身上比在成虫身上还明显。
   * 头轴略向前下方倾：螳螂俯视猎物时就是这个姿态。
   */
  const head = new THREE.Mesh(
    spindle([HEAD_BASE_X, HEAD_Y + 0.01, 0], [MOUTH_X, HEAD_Y - 0.06, 0], 0.16, {
      bulge: 0.2,
      flat: 1.3,
      taperStart: 0.55,
      taperEnd: 0.05,
    }),
    bodyMat,
  )
  head.name = 'head'
  g.add(head)

  /*
   * ---- 复眼：顶在头的两个上后角。半径 0.135 = 体长的 3.8%，
   * 成虫是 2.3% —— 相对大 1.6 倍，这是幼体比例的直接证据，测试逐个量。
   * 颜色取浅褐而非甲虫式的纯黑，与活体螳螂的观感一致。
   */
  const EYE_R = 0.135
  const eyeAt: [number, number, number] = [1.74, HEAD_Y + 0.1, 0.2]
  const eyes = compoundEyePair({ at: eyeAt, radius: EYE_R, color: '#d9c88f', flatten: 0.85, stretch: 1.15, facets: true })
  eyes.traverse((o) => {
    if ((o as THREE.Mesh).isMesh) o.name = 'compound-eye'
  })
  g.add(eyes)

  /*
   * 伪瞳孔：复眼里那个跟着视角转的深色小点。它其实是「正对观察者的那些小眼
   * 望进去是暗的」造成的光学错觉，不是真瞳孔 —— 图鉴的 `mantis-eye` 讲的就是它。
   * 近黑压在浅褐复眼上，差 0.62 个明度：这是全身对比最强的一处，
   * 也是让这颗大眼睛「活过来」的唯一一笔。
   */
  for (const side of [1, -1] as const) {
    const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.048, 14, 12), darkMat)
    pupil.scale.set(0.85, 1, 0.85)
    pupil.position.set(eyeAt[0] + 0.096, eyeAt[1] - 0.011, side * (eyeAt[2] + 0.105))
    pupil.name = 'pseudopupil'
    g.add(pupil)
  }

  // ---- 丝状触角：细长，若虫用它探测气流与猎物
  const antennae = antennaPair(
    { base: [MOUTH_X - 0.06, HEAD_Y + 0.02, 0.075], length: 0.72, kind: 'filiform', pitch: 20, yaw: 34, thickness: 0.01 },
    antennaMat,
  )
  antennae.traverse((o) => {
    if ((o as THREE.Mesh).isMesh) o.name = 'antenna'
  })
  g.add(antennae)

  /*
   * ---- 前胸：向前上方斜举的一根细杆，占体长 27%。
   * 成虫是 33% —— 那根「脖子」是随着一次次蜕皮才拉长的，若虫相对更短，
   * 但已经明显长于任何一种普通昆虫的前胸，一眼能认出是螳螂。
   * 靠头端细、靠中后胸端粗（那里是驱动捕捉足的肌肉团）。
   */
  const prothoraxPts = [
    new THREE.Vector3(HEAD_BASE_X, prothoraxY(HEAD_BASE_X), 0),
    new THREE.Vector3(1.38, prothoraxY(1.38) + 0.03, 0),
    new THREE.Vector3(1.0, prothoraxY(1.0) + 0.025, 0),
    new THREE.Vector3(PROTHORAX_BACK_X, PROTHORAX_BACK_Y, 0),
  ]
  const prothorax = taperedTube(prothoraxPts, [0.082, 0.074, 0.08, 0.115], bodyMat, 18)
  prothorax.name = 'prothorax'
  g.add(prothorax)

  // ---- 中后胸：短而粗壮的一段，翅芽与中后足都从这里长出
  const thorax = new THREE.Mesh(
    spindle([PROTHORAX_BACK_X, 0.3, 0], [THORAX_BACK_X, 0.31, 0], 0.19, {
      bulge: 0.35,
      flat: 1.05,
      taperStart: 0.62,
      taperEnd: 0.72,
    }),
    bodyMat,
  )
  thorax.name = 'thorax'
  g.add(thorax)

  // ---- 腹部：分节、背腹略扁、基部粗向后收细，末端略向上翘，腹端一对尾须
  g.add(abdomen(abdomenMat))
  for (let i = 1; i < ABD_SEGMENTS; i++) g.add(abdomenSuture(i / ABD_SEGMENTS, sutureMat))
  for (const side of [1, -1] as const) g.add(cercus(side, abdomenMat))

  // ---- 两对翅芽（中胸 + 后胸），左右共 4 枚
  for (const spec of PADS) {
    for (const side of [1, -1] as const) g.add(wingPad(spec, side, padMat, padRimMat))
  }

  // ---- 捕捉足：胸前「祈祷」折叠，两把刀悬在抬起的前胸下方
  g.add(mirrorZ(raptorialLeg(raptorialMat, spineMat, darkMat)))

  /*
   * ---- 中足、后足：纤细，只负责站立支撑，把身体撑离地面、让腹部悬空。
   * 与成虫同样用 leg()+mirrorZ() 而不是 legPair()：实测 legPair() 在 base 做
   * z 取反的同时又对整条腿 scale.z = −1，两次镜像叠加后左右腿的基节几乎落在
   * 同一侧，效果是「一对腿从同一个点前后叉开」（成虫文件的实现笔记）。
   */
  const midLeg = leg(
    { base: [0.42, 0.16, 0.15], femur: 0.4, tibia: 0.46, thickness: 0.022, splay: 28, sweep: 6, knee: 66, ankle: 55, spines: true },
    legMat,
  )
  const hindLeg = leg(
    { base: [0.18, 0.14, 0.155], femur: 0.46, tibia: 0.55, thickness: 0.022, splay: 25, sweep: 38, knee: 70, ankle: 52, spines: true },
    legMat,
  )
  for (const l of [midLeg, hindLeg]) {
    l.traverse((o) => {
      if ((o as THREE.Mesh).isMesh) o.name = 'walk-leg'
    })
    g.add(mirrorZ(l))
  }

  /*
   * 锚点全部落在真实几何体上（本仓库有一条闸门专门抓「标注点浮在空气里」：
   * `src/three/__tests__/anchors-have-geometry.test.ts`）。
   * 键名与成虫的 hotspot 对齐，生活史视图切换阶段时讲的是同一批部位。
   */
  const foreMid = FORE_BASE.clone()
    .addScaledVector(FORE_COXA_DIR, FORE_COXA_LEN)
    .addScaledVector(FORE_FEMUR_DIR, FORE_FEMUR_LEN * 0.55)
  const padSpec = PADS[1]
  const anchors: Record<string, THREE.Vector3> = {
    head: new THREE.Vector3(1.8, HEAD_Y + 0.01, 0),
    eye: new THREE.Vector3(eyeAt[0] + 0.04, eyeAt[1] + 0.03, eyeAt[2] + 0.02),
    foreleg: foreMid,
    wingPad: new THREE.Vector3(
      (padSpec.base[0] + padSpec.tip[0]) / 2,
      (padSpec.base[1] + padSpec.tip[1]) / 2,
      (padSpec.base[2] + padSpec.tip[2]) / 2,
    ),
    prothorax: new THREE.Vector3(1.2, prothoraxY(1.2) + 0.03, 0),
    abdomen: abdomenAxis(0.4),
  }

  return finalize(g, anchors)
}
