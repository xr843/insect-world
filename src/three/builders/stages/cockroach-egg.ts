/**
 * 德国小蠊 Blattella germanica · 卵鞘（ootheca）—— 不完全变态的第 1 阶段
 *
 * 单位与坐标系同成虫（../cockroach.ts）：1 = 1 厘米真实体长，
 * +X 向前、+Y 向上（接缝脊那一面）、+Z 向右。
 *
 * ## 做的是卵鞘，不是一颗卵
 *
 * 图鉴这一格写的是「卵（卵鞘）」。蜚蠊的卵从不单独出现：雌虫把两排卵
 * 并排码好、外面分泌一层蛋白质硬化成一枚胶囊 —— 卵鞘。人在厨房角落里
 * 捡到的那个「小钱包」就是它。一颗孤零零的卵既不是人能见到的东西，
 * 也讲不出「两排卵装在一只盒子里」这件事。
 *
 * ## 形态依据
 *
 * - **体量**：长 6~9 毫米（本模型 0.80 厘米）、高约 3 毫米、宽约 2.4 毫米。
 *   真实尺寸，不放大 —— 卵鞘 0.8、若虫 0.6、成虫 1.4 厘米，三者的量级关系
 *   本身就是生活史要讲的内容（`stages.ts` 头注释的硬约束）。
 * - **形状**：两侧扁平、四角圆钝的长方「钱包」形，不是橄榄也不是香肠。
 *   横断面用超椭圆（`SIDE_EXP`）做出「平的侧壁 + 圆的棱」，
 *   纵向两端同样用超椭圆包络收成方中带圆的端面（`END_EXP`）。
 *   高略大于宽：卵鞘里的卵是竖着码的，两排卵的长轴都指向接缝脊。
 * - **招牌一：侧面一排横向分节纹。** 每一侧 18 道（`CHAMBERS`），一道对应
 *   里面的一对卵（两排共约 36 枚，德国小蠊的实数是 30~48）。
 *   做成**壳体本身的软起伏 + 体壁颜色区**（顶点色在沟底压暗一档），
 *   不做贴在光壳上的凸环 —— 瓢虫幼虫的斑曾经做成凸出体壁的实体，
 *   出图读成一圈圈塑料环。
 *   起伏是余弦、处处光滑，间距有 ±9% 的缓变（`CHAMBER_WOBBLE`）：
 *   等距锐坎的层纹会读成潮虫壳，这是螳螂卵鞘栽过的坑（见 mantis-egg.ts）。
 *   分节纹只在侧壁上最深，向接缝脊与腹面两侧淡出（`grooveWeight()`）——
 *   顶视因此看到的是一条纵向的脊，而不是一圈圈横箍；这也是它跟潮虫
 *   （背上一道道横节）在剪影上分开的地方。
 * - **招牌二：上缘一道锯齿状的接缝脊（keel）。** 两片壳壁在顶上合拢处
 *   留下的一条窄棱，棱顶每一个卵室对应一枚小齿。若虫孵化时就是从这条缝
 *   顶开出来的 —— 它是卵鞘唯一的门。齿与侧面的分节纹一一对齐。
 * - **略弯**：卵鞘在雌虫体内成形时顺着生殖腔微微弯出一点弧，
 *   直得像车床车出来的反而假。
 *
 * ## 为什么没带一截雌虫的腹端
 *
 * 德国小蠊的特别之处是雌虫会把卵鞘**一直夹在腹端带到孵化前一两天**
 * （美洲大蠊、东方蜚蠊都是早早丢下）。考虑过附一截腹端做上下文，没做：
 * 雌虫腹端宽约 5 毫米，比卵鞘（2.4 毫米）宽一倍，取景会被它撑大、
 * 卵鞘缩成画面一角；而单独切下来的一截腹末，人的第一解释是「截断的虫尸」。
 * 这件事交给文案讲，模型只做卵鞘。
 *
 * ## 配色
 *
 * 全身同一个栗褐色系，靠**明度**把结构分开：
 *
 *   壳面 0.51（浅栗褐） > 沟底（顶点色压到 0.74 倍） > 接缝脊 0.31（深栗）
 *
 * 接缝脊比壳面深而不是浅：浅色贴浅色的分界会糊成一片
 * （飞蝗卵块曾糊成巧克力威化），脊这里要的是一道清楚的深色收边。
 * 也不许「越深越保险」—— 壳面压到 0.3 以下，ACES 之后整只成了一块黑炭，
 * 分节纹那点明暗起伏就读不出来了。
 *
 * 本文件不使用任何随机数。
 */
import * as THREE from 'three'
import { chitin, finalize, loft, type InsectModel, type Section } from '../kit'

// ---------------------------------------------------------------- 体量

/** 前端（雌虫生殖腔那一端）与后端 X —— 全长 0.80 厘米 */
const FRONT_X = 0.4
const REAR_X = -0.4
/** 最宽处的半高 / 半宽：高 0.29、宽 0.235。高 > 宽，是侧扁的 */
const HALF_H = 0.145
const HALF_W = 0.118
/** 横断面超椭圆指数：2 = 椭圆，越大越方。3.1 = 平侧壁 + 圆棱 */
const SIDE_EXP = 3.1
/** 纵向两端的超椭圆指数：端面方中带圆，不收成尖 */
const END_EXP = 5
/** 纵向微弯的拱高（中段比两端高出的量） */
const BOW = 0.018
/** 腹面比背面略收窄一点：卵鞘底边是圆的、顶上合拢成脊 */
const TOP_PINCH = 0.14

// ---------------------------------------------------------------- 卵室分节

/** 每侧的卵室数（一道分节纹 = 一对卵） */
export const CHAMBERS = 18
/** 分节纹覆盖的 u 区间：两端各留一小截光的端面 */
const CH_U0 = 0.07
const CH_U1 = 0.93
/**
 * 分节纹的深度（占该处半宽的比例）。谷底到峰顶 0.05 × 0.118 ≈ 0.006 厘米，
 * 占画面直径 1.3%。归零则侧面是一块光板；翻倍则成了一排瓦楞 / 潮虫壳。
 */
const GROOVE = 0.05
/** 卵室间距的缓变幅度（单位：室）。0 = 严格等距 —— 人造感最强的信号 */
const CHAMBER_WOBBLE = 0.09
/** 沟底顶点色的压暗量：1 − 0.26 = 0.74 倍 */
const GROOVE_DARKEN = 0.26

/** 室坐标 c ∈ [0, CHAMBERS] → u。带缓变的非等距映射（单调：幅度 0.09 < 周期/2π） */
function uOfChamber(c: number): number {
  const wob = CHAMBER_WOBBLE * Math.sin((2 * Math.PI * c) / 6.7 + 0.8)
  return THREE.MathUtils.lerp(CH_U0, CH_U1, (c + wob) / CHAMBERS)
}

/** u → 室坐标（数值反解；uOfChamber 单调，二分即可） */
function chamberOfU(u: number): number {
  if (u <= CH_U0) return -1
  if (u >= CH_U1) return CHAMBERS + 1
  let lo = -0.5
  let hi = CHAMBERS + 0.5
  for (let k = 0; k < 40; k++) {
    const mid = (lo + hi) / 2
    if (uOfChamber(mid) < u) lo = mid
    else hi = mid
  }
  return (lo + hi) / 2
}

/**
 * 沟的形状：c 为整数处（两个卵室的交界）最深，室中最鼓。余弦，一阶导数处处连续 ——
 * 不许有锐坎（螳螂卵鞘第一版的锐坎读成了瓦楞板）。
 * 分节区两端 0.5 室内淡出，免得在光端面上戛然切出一道台阶。
 */
function groove(u: number): number {
  const c = chamberOfU(u)
  if (c < 0 || c > CHAMBERS) return 0
  const edge = Math.min(1, c / 0.5, (CHAMBERS - c) / 0.5)
  return (0.5 + 0.5 * Math.cos(2 * Math.PI * c)) * THREE.MathUtils.smoothstep(edge, 0, 1)
}

/**
 * 分节纹在环向上的权重：侧壁最深，向顶上的接缝脊与腹面中线淡出。
 * φ=0 顶、π/2 右侧、π 腹面。腹面保留 35%：真实卵鞘的分节纹绕到底面上仍看得出，
 * 只有顶上合拢成脊的那一段是光的。
 */
function grooveWeight(phi: number): number {
  const s = Math.abs(Math.sin(phi))
  const belly = Math.cos(phi) < 0 ? 0.35 * Math.pow(-Math.cos(phi), 2) : 0
  return Math.min(1, Math.pow(s, 1.6) + belly)
}

// ---------------------------------------------------------------- 壳面

const xOf = (u: number) => THREE.MathUtils.lerp(FRONT_X, REAR_X, u)
/** 纵向微弯：中段拱起 BOW */
const bowY = (u: number) => BOW * Math.sin(Math.PI * u)

/** 纵向包络：超椭圆，端面方中带圆 */
function envelope(u: number): number {
  const t = Math.abs(2 * u - 1)
  return Math.pow(Math.max(1 - Math.pow(t, END_EXP), 0), 1 / END_EXP)
}

/** 超椭圆的一个分量：sign(c)·|c|^(2/n) */
const se = (c: number) => Math.sign(c) * Math.pow(Math.abs(c), 2 / SIDE_EXP)

/**
 * 壳面上的一点。φ=0 在顶（接缝脊），向 +Z 增大。
 * 上半截向脊收窄 TOP_PINCH：两片壳壁在顶上合拢，横断面是「上窄下圆」的。
 */
export function shellPoint(u: number, phi: number): THREE.Vector3 {
  const e = envelope(u)
  const c = Math.cos(phi)
  const s = Math.sin(phi)
  const pinch = c > 0 ? 1 - TOP_PINCH * Math.pow(c, 2) : 1
  const k = 1 - GROOVE * groove(u) * grooveWeight(phi)
  return new THREE.Vector3(xOf(u), bowY(u) + HALF_H * e * se(c), HALF_W * e * se(s) * pinch * k)
}

/** 纵向站位：分节区内按每室 10 个站位加密，两端的圆端面另给 12 个 */
function stations(): number[] {
  const out: number[] = []
  const endSteps = 12
  for (let i = 0; i < endSteps; i++) out.push(CH_U0 * (1 - Math.cos((i / endSteps) * Math.PI * 0.5)))
  const n = CHAMBERS * 10
  for (let i = 0; i <= n; i++) out.push(uOfChamber((i / n) * CHAMBERS))
  for (let i = 1; i <= endSteps; i++) out.push(CH_U1 + (1 - CH_U1) * Math.sin((i / endSteps) * Math.PI * 0.5))
  return out
}

/** 环向分段数 */
export const SHELL_RADIAL = 56

/**
 * 卵鞘壳体：（纵向站位 × 环向）网格，顶点色把沟底压暗一档。
 *
 * 法线取反 —— 跟 kit `loft()` 的着色方式对齐。原因 mantis-egg.ts 的
 * `oothecaShell()` 末尾写得很清楚：全仓库的 loft 件在 DoubleSide 下是按
 * 「翻过一次」的法线着色的，自建网格不翻，两套着色并存，明暗就对不上。
 * 本只两种都渲过：不取反时壳顶亮一档、带镜面高光，着色方式与全仓库的 loft 件
 * （包括本只的接缝脊）不一致；取反之后与之一致，所以按仓库的约定取反。
 */
function ootheca(): THREE.BufferGeometry {
  const us = stations()
  const cols = SHELL_RADIAL + 1
  const pos: number[] = []
  const col: number[] = []
  const uv: number[] = []
  const idx: number[] = []
  for (let i = 0; i < us.length; i++) {
    const u = us[i]
    const gv = groove(u)
    for (let j = 0; j < cols; j++) {
      const phi = (j / SHELL_RADIAL) * Math.PI * 2
      const p = shellPoint(u, phi)
      pos.push(p.x, p.y, p.z)
      const shade = 1 - GROOVE_DARKEN * gv * grooveWeight(phi)
      col.push(shade, shade, shade)
      uv.push((j / SHELL_RADIAL) * 2, u * 3)
    }
  }
  for (let i = 0; i < us.length - 1; i++) {
    for (let j = 0; j < SHELL_RADIAL; j++) {
      const a = i * cols + j
      const b = a + cols
      idx.push(a, b, a + 1, b, b + 1, a + 1)
    }
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3))
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2))
  g.setIndex(idx)
  g.computeVertexNormals()
  const n = g.getAttribute('normal').array as Float32Array
  for (let i = 0; i < n.length; i++) n[i] *= -1
  return g
}

// ---------------------------------------------------------------- 接缝脊

/** 接缝脊的 u 区间：比分节区略长，脊从端面上就开始 */
const KEEL_U0 = 0.035
const KEEL_U1 = 0.965
/** 脊的半宽（很窄：两片壳壁合拢的一道棱）与基础半高 */
const KEEL_RZ = 0.017
const KEEL_RY = 0.02
/**
 * 齿高：每个卵室一枚小齿，齿顶比齿间高出这么多。
 * 0.013 厘米 = 画面直径的 2.9%。再低就是一根光滑的棱、读不出锯齿；
 * 再高就成了一排背鳍。
 */
const TOOTH = 0.013
/** 脊的环向分段数（测试按环取每环第 0 个顶点 = 脊顶） */
export const KEEL_RADIAL = 12
/** 脊心沉入壳顶的深度：沉一半，露一半 */
const KEEL_SINK = 0.012

/** u 处壳顶（φ=0）的高度 */
const topY = (u: number) => shellPoint(u, 0).y

/**
 * 齿形：室中（c 为半整数）最高，与侧面分节纹的「鼓」对齐。
 *
 * 三角波再取 1.6 次方：齿尖是尖的、齿间是宽而浅的谷 —— 那才叫「锯齿」。
 * 第一版用 |sin|^1.5（齿顶圆、齿间尖），出图是脊上串了一排圆珠子，
 * 读成毛虫背上的一列疣，不是一道带齿的接缝。
 */
function tooth(u: number): number {
  const c = chamberOfU(u)
  if (c < 0 || c > CHAMBERS) return 0
  const f = c - Math.floor(c)
  return Math.pow(1 - Math.abs(2 * f - 1), 1.6)
}

function keel(material: THREE.Material): THREE.Mesh {
  const steps = CHAMBERS * 16
  const sections: Section[] = []
  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    const u = THREE.MathUtils.lerp(KEEL_U0, KEEL_U1, t)
    // 两端收细：脊从端面里长出来，不在两头留一个圆头
    const taper = Math.pow(Math.sin(Math.PI * t), 0.35)
    const ry = (KEEL_RY + TOOTH * tooth(u)) * taper
    // 截面中心随齿抬高一半，齿底仍贴着壳顶
    const cy = topY(u) - KEEL_SINK + (TOOTH * tooth(u) * taper) / 2
    sections.push({ at: new THREE.Vector3(xOf(u), cy, 0), ry: Math.max(ry, 1e-4), rz: Math.max(KEEL_RZ * taper, 1e-4) })
  }
  const mesh = new THREE.Mesh(loft(sections, KEEL_RADIAL), material)
  mesh.name = 'keel'
  return mesh
}

// ---------------------------------------------------------------- 主体

export function buildCockroachEgg(): InsectModel {
  const g = new THREE.Group()

  /*
   * 明度（sRGB HSL）：壳 0.51 > 沟底（顶点色 0.74 倍）> 接缝脊 0.31。
   * 色相全落在 25~35° 的栗褐区 —— 看起来仍是一整只卵鞘，只是层次分得开。
   * 壳面 gloss 0.5 + 薄清漆：新鲜卵鞘是亮的，硬化的蛋白壳有一层漆光，
   * 不是螳螂卵鞘那种海绵质的哑光。
   */
  const shellMat = chitin({ color: '#b98049', gloss: 0.5, clearcoat: 0.25 })
  shellMat.vertexColors = true
  const keelMat = chitin({ color: '#76482a', gloss: 0.45, clearcoat: 0.15 })

  const shell = new THREE.Mesh(ootheca(), shellMat)
  shell.name = 'ootheca-shell'
  g.add(shell)
  g.add(keel(keelMat))

  /*
   * 锚点落在真实几何体上（阶段测试里有一把与全站闸门同判据的尺子）。
   * 键名刻意不与成虫的 hotspot（stripe/head/antenna/wing/cercus/leg）撞名 ——
   * 展台会拿当前模型的 anchors 去配成虫的 hotspot 表，撞名就把「前胸双纹」
   * 的卡片贴到卵鞘上了。
   */
  const midU = uOfChamber(CHAMBERS / 2 + 0.5)
  const anchors: Record<string, THREE.Vector3> = {
    keel: new THREE.Vector3(xOf(midU), topY(midU) + KEEL_RY * 0.5, 0),
    eggChamber: shellPoint(uOfChamber(6.5), Math.PI / 2),
  }

  return finalize(g, anchors)
}
