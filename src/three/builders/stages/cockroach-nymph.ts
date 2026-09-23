/**
 * 德国小蠊 Blattella germanica · 若虫（取中龄，约 4 龄，体长 6 毫米）
 *
 * 单位与坐标系同成虫（../cockroach.ts）：1 = 1 厘米真实体长，
 * +X 向前（头）、+Y 向上（背）、+Z 向右。
 *
 * ## 这只虫存在的意义：「若虫 = 缩小版成虫」的又一个正例
 *
 * 蜚蠊是**不完全变态**：卵鞘 → **若虫** → 成虫，6 龄左右逐次蜕皮长大，
 * 没有蛹，也没有「幼虫」这一步。所以本目录里德国小蠊只有 `cockroach-egg.ts`
 * 与本文件两个阶段。
 *
 * 「缩小版成虫」必须在形态上看得见。所以本文件的身体构件一律照着
 * `../cockroach.ts` 的成虫做：同样平底圆顶的**扁盾**断面（`shieldSections()`，
 * 做法同成虫）、同样把头盖在底下的前胸背板、同样超过体长的丝状长触角
 * （同一条后掠弧线的缩小版）、同样一对分节尾须、同样多刺的疾走足。
 * 把它跟成虫并排放，一眼认得出是同一种虫。
 *
 * ## 与成虫的差别（这几处才是「若虫」这一格的内容）
 *
 * 1. **小**：体长 0.62 厘米，成虫 1.4。
 * 2. **没有翅**：成虫盖住整个腹部的那对革质前翅在若虫身上还不存在，
 *    中龄只有中后胸背板后侧角微微向后延出的一点（`NOTUM_LOBE`），
 *    不做成独立的翅芽 —— 德国小蠊若虫的翅芽要到末龄才明显。
 *    于是**腹部的一节节背板是露在外面的**，这是若虫与成虫在背视上最大的不同。
 * 3. **颜色反过来**：成虫是浅琥珀底上两条深纹；若虫通体深褐近黑，
 *    **背中央一条浅色纵带**从前胸一直贯穿到腹部后段 —— 这是德国小蠊若虫
 *    最好认的特征（野外判断「是不是德国小蠊的小若虫」就看这一条）。
 *    前胸背板上仍是成虫那套图案的雏形：浅色中带两侧各一条宽的深色纵带、
 *    外缘浅色 —— 成虫的「前胸双纹」就是从这里来的。
 * 4. **幼体比例**：头相对更大（头宽 / 体长 0.24，成虫 0.13），腹部相对更短胖。
 *
 * ## 招牌做法：颜色区是体壁本身，不是贴上去的条
 *
 * 浅色纵带与前胸背板的深浅纵纹全部做成**体壁本身的颜色区**：
 * 同一根放样管按环向分段分给不同材质（`zonedLoft()`），相邻两区共用同一圈顶点，
 * 表面完全连续、分界锐利。不做凸出体壁的实体条 —— 瓢虫幼虫的斑曾经做成
 * 凸起的实体，出图读成一圈圈塑料环；这里的纹一丝都不高出体表。
 * 思路同帝王蝶幼虫的 `bandRing()`（那边是沿长度切段上色，这里是沿环向）。
 *
 * ## 配色
 *
 * 明度（sRGB HSL）：浅纵带 0.77 ≫ 足 0.47 > 体色 0.29 > 触角 0.25 > 前胸深纹 0.15。
 * 招牌那条带与底色差 0.48。体色的材质明度看着不低，但扁盾的背面在出图台上
 * 本来就吃光少，实拍出来已是深褐近黑 —— 再压一档（第一版 #3d2918）整只成了一块炭。体色不压到纯黑：ACES 之后纯黑的体壁连高光带
 * 都读不出形，腹节的起伏会整片消失（「越深越保险」害过 10 只里 7 只）。
 * 足取浅茶褐：真实若虫的足就比身体浅得多，也正好让六条腿从深色的身子上跳出来。
 *
 * 本文件不使用任何随机数。
 */
import * as THREE from 'three'
import { chitin, compoundEyePair, finalize, leg, loft, mirrorZ, spindle, type InsectModel, type LegSpec, type Section } from '../kit'

// ---------------------------------------------------------------- 分区放样

/**
 * 按环向把一根放样管分给几种材质：几何就是 `loft()` 本身（法线、绕向、封口
 * 全都一样，着色与全仓库的 loft 件一致），只是把索引按区重排、挂成 geometry groups，
 * 配 `mesh.material = [区0, 区1, …]`。
 *
 * `zoneOf(ring, seg)`：第 ring 段（截面 ring 与 ring+1 之间）的第 seg 个环向格。
 * 环向格 seg 的角度中心是 (seg+0.5)/radial·2π，角度 0 是背中线（+Y）。
 * 封口三角归 0 区。
 */
function zonedLoft(
  sections: Section[],
  radial: number,
  zones: number,
  zoneOf: (ring: number, seg: number) => number,
): THREE.BufferGeometry {
  const g = loft(sections, radial, true)
  const src = g.getIndex()!.array
  const buckets: number[][] = Array.from({ length: zones }, () => [])
  const body = (sections.length - 1) * radial * 6
  for (let q = 0; q < body; q += 6) {
    const quad = q / 6
    const ring = Math.floor(quad / radial)
    const seg = quad % radial
    const z = zoneOf(ring, seg)
    for (let k = 0; k < 6; k++) buckets[z].push(src[q + k])
  }
  for (let q = body; q < src.length; q++) buckets[0].push(src[q])
  const idx: number[] = []
  g.clearGroups()
  for (let z = 0; z < zones; z++) {
    g.addGroup(idx.length, buckets[z].length, z)
    idx.push(...buckets[z])
  }
  g.setIndex(idx)
  return g
}

/** 环向格 seg 的中心角离背中线多少度（0~180，左右对称） */
function segAngle(seg: number, radial: number): number {
  const a = (((seg + 0.5) / radial) * 360) % 360
  return a > 180 ? 360 - a : a
}

// ---------------------------------------------------------------- 扁盾（同成虫）

interface ShieldSpec {
  xFrom: number
  xTo: number
  baseY: number
  /** 沿长度 t∈[0,1] 的半高 / 半宽 */
  h: (t: number) => number
  w: (t: number) => number
}

/** 平底圆顶的扁盾截面：底边贴 baseY，只有背面随高度起伏（成虫 `shieldSections()` 的同一做法） */
function shieldSections(s: ShieldSpec, steps: number): Section[] {
  const out: Section[] = []
  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    const h = Math.max(s.h(t), 1e-4)
    const w = Math.max(s.w(t), 1e-4)
    out.push({ at: new THREE.Vector3(THREE.MathUtils.lerp(s.xFrom, s.xTo, t), s.baseY + h, 0), ry: h, rz: w })
  }
  return out
}

/** sin 缓入缓出的三键包络（同成虫的 `shieldProfile()`） */
function ease3(t: number, peakAt: number, a: number, m: number, b: number): number {
  if (t <= peakAt) return THREE.MathUtils.lerp(a, m, Math.sin(Math.min(1, t / peakAt) * Math.PI * 0.5))
  const k = (t - peakAt) / (1 - peakAt)
  return THREE.MathUtils.lerp(m, b, 1 - Math.cos(Math.min(1, k) * Math.PI * 0.5))
}

// ---------------------------------------------------------------- 尺寸

/** 腹面基准：贴地的扁平肚皮 */
const BASE_Y = -0.05

/** 躯干（中胸 + 后胸 + 腹部）前后端 */
const TRUNK_FRONT = 0.17
const TRUNK_REAR = -0.3

/**
 * 背板分界的 X（自前向后）：中胸、后胸、腹部 8 节可见背板。
 * 腹节自前向后一节比一节短（0.052 → 0.036），不等距 —— 等距的一排节会读成潮虫。
 */
const TERGITE_EDGES: readonly number[] = [
  0.17, 0.105, 0.035, -0.017, -0.069, -0.119, -0.166, -0.209, -0.248, -0.281, -0.3,
]
/** 中后胸的节数（TERGITE_EDGES 的前两段） */
const THORACIC_TERGITES = 2

/**
 * 背板的软起伏深度（占半径比例）。每块背板后缘略鼓、下一块的前缘略凹 ——
 * 一块压一块的叠瓦感，但用余弦，处处光滑，没有一道锐坎。
 * 0.04 × 半宽 0.15 ≈ 0.006 厘米，占画面直径 0.9%。
 */
const TERGITE_RIPPLE = 0.04

/** 前胸背板 */
const PRONOTUM_FRONT = 0.345
const PRONOTUM_REAR = 0.145

/**
 * 中后胸背板后侧角向后微微延出的量（中龄的翅芽雏形）。
 * 只是背板外缘多出的一点，不是独立的翅芽 —— 德国小蠊到末龄翅芽才明显。
 */
const NOTUM_LOBE = 0.012

/**
 * 浅色纵带的半角（度）。扁断面上 z = rz·sin(a)：11.25° 对应带宽 ≈ 0.39×半宽，
 * 带宽约为体宽的 20%。环向 64 格，每格 5.625°，所以 11.25° 是整两格。
 */
export const TRUNK_RADIAL = 64
const BAND_HALF_DEG = 11.25
/** 纵带在腹部后段收掉：最后 2 节背板是纯深色（真实若虫的浅带也在腹末前消失） */
const BAND_REAR_X = -0.25
/** 前胸背板：深色纵带外缘所在角度；再往外到腹面都是浅色的外缘 */
const PRONOTUM_DARK_TO_DEG = 50

/** 找 x 落在第几块背板、块内进度 f（0 前缘 → 1 后缘） */
function tergiteAt(x: number): { k: number; f: number } {
  for (let k = 0; k < TERGITE_EDGES.length - 1; k++) {
    const a = TERGITE_EDGES[k]
    const b = TERGITE_EDGES[k + 1]
    if (x <= a && x >= b) return { k, f: (a - x) / (a - b) }
  }
  return { k: TERGITE_EDGES.length - 2, f: 1 }
}

/** 背板起伏乘数：块内后段最鼓、分界处最凹（余弦，一阶导连续） */
function tergiteRipple(x: number): number {
  const { f } = tergiteAt(x)
  // 相位偏到 0.62：后缘比前缘鼓，一块压着下一块
  const fw = f + 0.12 * Math.sin(2 * Math.PI * f)
  return 1 - TERGITE_RIPPLE * (0.5 + 0.5 * Math.cos(2 * Math.PI * (fw - 0.62)))
}

/** 躯干的半宽 / 半高包络（t 自前向后） */
const trunkW = (t: number) => ease3(t, 0.32, 0.118, 0.152, 0.07)
const trunkH = (t: number) => ease3(t, 0.25, 0.046, 0.054, 0.024)

/**
 * 躯干截面。背板起伏乘在宽高上；中后胸两块背板的后侧角再加一点延出（NOTUM_LOBE）。
 * 末端 10% 按圆弧收到零 —— 不然放样封口封出一个平圆盘，读成「锯断的塑料管」。
 */
function trunkSections(steps: number): Section[] {
  const out: Section[] = []
  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    const x = THREE.MathUtils.lerp(TRUNK_FRONT, TRUNK_REAR, t)
    const r = tergiteRipple(x)
    const { k, f } = tergiteAt(x)
    const lobe = k < THORACIC_TERGITES ? NOTUM_LOBE * Math.pow(Math.sin(Math.PI * Math.min(1, f * 1.1)), 2) : 0
    const cx = THREE.MathUtils.clamp((t - 0.9) / 0.1, 0, 1)
    const cap = Math.sqrt(Math.max(1 - cx * cx, 0))
    const h = Math.max(trunkH(t) * r * cap, 1e-4)
    const w = Math.max((trunkW(t) + lobe) * r * cap, 1e-4)
    out.push({ at: new THREE.Vector3(x, BASE_Y + h, 0), ry: h, rz: w })
  }
  return out
}

/** 躯干放样的纵向站位数（每块背板约 12 个站位，起伏才圆得过去） */
const TRUNK_STEPS = 120

// ---------------------------------------------------------------- 附属结构

/** 丝状长触角：成虫同一条后掠弧线的缩小版，弧长超过体长 */
function longAntenna(base: THREE.Vector3, side: 1 | -1, L: number, r0: number, mat: THREE.Material): THREE.Mesh {
  const b = new THREE.Vector3(base.x, base.y, base.z * side)
  const steps = 22
  const sections: Section[] = []
  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    const p = new THREE.Vector3(
      b.x + L * (0.72 * t - 0.18 * t * t),
      b.y + L * (0.16 * t - 0.28 * t * t),
      b.z + side * L * (0.5 * t - 0.06 * t * t),
    )
    const r = r0 * (1 - t * 0.78)
    sections.push({ at: p, ry: Math.max(r, 0.0015), rz: Math.max(r, 0.0015) })
  }
  const m = new THREE.Mesh(loft(sections, 8), mat)
  m.name = 'antenna'
  return m
}

/**
 * 触角弧线的尺度参数。弧长约为它的 0.66 倍（这条后掠弧线的形状系数，与成虫同一条曲线），
 * 1.0 → 弧长 ≈ 0.66 = 体长的 1.07 倍：真实若虫的触角不短于体长。
 * 再长就不划算：取景按包围半径归一化，触角每长一截，身子在画面上就小一圈。
 */
const ANTENNA_L = 1.0

/** 分节尾须：短锥 + 节间微缩，斜向后外下方（同成虫） */
const CERCUS_DIR = new THREE.Vector3(-0.78, 0.02, 0.62).normalize()
const CERCUS_LEN = 0.1
function cercus(base: THREE.Vector3, side: 1 | -1, mat: THREE.Material): THREE.Mesh {
  const b = new THREE.Vector3(base.x, base.y, base.z * side)
  const dir = CERCUS_DIR.clone().setZ(CERCUS_DIR.z * side)
  const steps = 10
  const sections: Section[] = []
  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    const ripple = 1 - 0.18 * Math.pow(Math.sin(t * Math.PI * 4), 6)
    const r = 0.013 * (1 - t * 0.75) * ripple
    sections.push({ at: b.clone().addScaledVector(dir, CERCUS_LEN * t), ry: Math.max(r, 0.002), rz: Math.max(r, 0.002) })
  }
  const m = new THREE.Mesh(loft(sections, 8), mat)
  m.name = 'cercus'
  return m
}

// ---------------------------------------------------------------- 主体

export function buildCockroachNymph(): InsectModel {
  const g = new THREE.Group()

  const darkMat = chitin({ color: '#6e4828', gloss: 0.55, clearcoat: 0.3 })
  const bandMat = chitin({ color: '#ecd39e', gloss: 0.45, clearcoat: 0.2 })
  const stripeMat = chitin({ color: '#3a2514', gloss: 0.45, clearcoat: 0.2 }) // 前胸深纹
  const marginMat = chitin({ color: '#d2a96c', gloss: 0.45, clearcoat: 0.2 }) // 前胸浅外缘
  const headMat = chitin({ color: '#4a311b', gloss: 0.45 })
  const legMat = chitin({ color: '#a47b4a', gloss: 0.38 })
  const antennaMat = chitin({ color: '#5c3f22', gloss: 0.3 })

  // ---- 躯干：中后胸 + 腹部 8 节背板。背中线一条浅带，其余深色
  const trunkSecs = trunkSections(TRUNK_STEPS)
  const trunk = new THREE.Mesh(
    zonedLoft(trunkSecs, TRUNK_RADIAL, 2, (ring, seg) => {
      const x = (trunkSecs[ring].at as THREE.Vector3).x
      return x > BAND_REAR_X && segAngle(seg, TRUNK_RADIAL) < BAND_HALF_DEG ? 1 : 0
    }),
    [darkMat, bandMat],
  )
  trunk.name = 'trunk'
  g.add(trunk)

  // ---- 前胸背板：前后皆圆的扁盾，前缘罩住头。图案是成虫「前胸双纹」的雏形：
  //      浅中带 | 两侧宽深纹 | 浅外缘。中带与躯干上的浅带首尾相接，连成一条
  const pronotumSpec: ShieldSpec = {
    xFrom: PRONOTUM_FRONT,
    xTo: PRONOTUM_REAR,
    baseY: BASE_Y + 0.035,
    h: (t) => ease3(t, 0.55, 0.012, 0.042, 0.026),
    w: (t) => ease3(t, 0.55, 0.075, 0.138, 0.124),
  }
  const pronotum = new THREE.Mesh(
    zonedLoft(shieldSections(pronotumSpec, 24), TRUNK_RADIAL, 3, (_ring, seg) => {
      const a = segAngle(seg, TRUNK_RADIAL)
      if (a < BAND_HALF_DEG) return 1
      if (a < PRONOTUM_DARK_TO_DEG) return 0
      return 2
    }),
    [stripeMat, bandMat, marginMat],
  )
  pronotum.name = 'pronotum'
  g.add(pronotum)

  // ---- 头：下口式，斜垂在前胸背板前缘之下，背视只露头顶一线（同成虫）
  //      头相对更大：半径 0.062 / 体长 0.62 = 0.10，成虫 0.085 / 1.4 = 0.06
  const HEAD_R = 0.062
  const headTop = new THREE.Vector3(0.352, 0.0, 0)
  const head = new THREE.Mesh(
    spindle([headTop.x, headTop.y, 0], [0.3, -0.07, 0], HEAD_R, { bulge: 0.42, flat: 1.2, taperStart: 0.62, taperEnd: 0.5 }),
    headMat,
  )
  head.name = 'head'
  g.add(head)
  g.add(compoundEyePair({ at: [0.33, -0.018, 0.047], radius: 0.017, color: '#171008', flatten: 1.25, stretch: 0.85 }))

  // ---- 丝状长触角：比身体还长
  const antBase = new THREE.Vector3(0.352, -0.02, 0.022)
  g.add(longAntenna(antBase, 1, ANTENNA_L, 0.0065, antennaMat), longAntenna(antBase, -1, ANTENNA_L, 0.0065, antennaMat))

  // ---- 一对分节尾须：若虫没有翅，尾须直接从最后一节背板下方伸出
  const cercusBase = new THREE.Vector3(-0.285, BASE_Y + 0.012, 0.022)
  g.add(cercus(cercusBase, 1, darkMat), cercus(cercusBase, -1, darkMat))

  // ---- 三对多刺足：成虫同一套低伏疾走姿态，按体长缩到 0.44
  const legSpecs: LegSpec[] = [
    { base: [0.23, BASE_Y + 0.01, 0.07], femur: 0.115, tibia: 0.1, thickness: 0.015, splay: 34, sweep: -35, knee: 74, ankle: 52, spines: true },
    { base: [0.12, BASE_Y + 0.01, 0.085], femur: 0.14, tibia: 0.125, thickness: 0.016, splay: 36, sweep: 8, knee: 74, ankle: 52, spines: true },
    { base: [0.03, BASE_Y + 0.01, 0.085], femur: 0.165, tibia: 0.15, thickness: 0.016, splay: 32, sweep: 38, knee: 76, ankle: 50, spines: true },
  ]
  const legs = legSpecs.map((s) => leg(s, legMat))
  for (const l of legs) {
    // 网格打上名字，测试按名取足来量明度（只改 mesh 名，不碰骨架标记）
    l.traverse((o) => {
      if ((o as THREE.Mesh).isMesh) o.name = 'leg'
    })
    g.add(mirrorZ(l))
  }

  // ---- anchors
  // 头、触角、尾须、足与成虫语义相同，复用成虫的键名，展台会贴成虫的那几张卡；
  // 「stripe」（成虫的前胸双纹）与「wing」（前翅）若虫身上没有，绝不复用。
  const bandProbe = trunkSecs[Math.round(TRUNK_STEPS * 0.3)]
  const bandAt = bandProbe.at as THREE.Vector3
  const pronotumMid = shieldSections(pronotumSpec, 2)[1]
  const pAt = pronotumMid.at as THREE.Vector3
  const a = ANTENNA_L
  const anchors: Record<string, THREE.Vector3> = {
    head: headTop.clone().add(new THREE.Vector3(0.0, 0.02, 0)),
    antenna: new THREE.Vector3(antBase.x + a * (0.72 * 0.3 - 0.18 * 0.09), antBase.y + a * (0.16 * 0.3 - 0.28 * 0.09), antBase.z + a * (0.5 * 0.3 - 0.06 * 0.09)),
    cercus: cercusBase.clone().addScaledVector(CERCUS_DIR, CERCUS_LEN * 0.8),
    leg: (legs[1].userData.knee as THREE.Vector3).clone(),
    dorsalBand: new THREE.Vector3(bandAt.x, bandAt.y + bandProbe.ry, 0),
    pronotum: new THREE.Vector3(pAt.x, pAt.y + pronotumMid.ry, pronotumMid.rz * 0.5),
  }

  return finalize(g, anchors)
}
