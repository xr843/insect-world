/**
 * 棒䗛（棒䗛属 Ramulus）· 卵（不完全变态第 1 阶段）
 *
 * 单位与坐标系与成虫（../stick-insect.ts）完全一致：1 = 1 厘米真实体长，
 * +X 向前、+Y 向上、+Z 向右。
 *
 * ## 这一格要讲的事：像一粒植物种子的卵
 *
 * 竹节虫的卵以「像种子」出名 —— 一粒硬壳的小桶，一端有盖，壳面有纹。
 * 这不只是长得像：很多竹节虫的卵连**散布方式**都像种子。棒䗛雌虫在枝叶间
 * 边走边产，卵一粒一粒**直接掉到地面**的落叶与土上，在那里越冬。
 * 所以这里做的是**散落在土面上的 3 粒**，各朝各的方向躺着 —— 不是瓢虫那样
 * 竖着黏成一片，也不是螳螂那样包在卵鞘里。三种产卵方式并排放，
 * 本身就是生活史这个视图可以讲的东西。
 *
 * 做 3 粒而不是 1 粒还有两个实际理由：
 * - 同一种卵要同时让人看到**盖、背面的卵孔板、壳面网纹**，一粒卵在任何一个
 *   机位下都只露得出其中一两样；三粒各转一个方向，四个机位都有得看。
 * - `stages.test.ts` 的半径下限是 0.02。一粒 2.6 毫米的卵单独取景没问题，
 *   但三粒加一小片土面（整体半径 0.43）取景更稳，也给了「落在地上」这个语境。
 *
 * ## 形态依据（与委托说明的一处出入，已核对文献）
 *
 * - **单粒长约 2.6 毫米、宽约 1.2 毫米**：长桶形 / 长卵圆，后端圆钝，
 *   前端平截、由卵盖封口。**略侧扁**（高 1.32 > 宽 1.16 毫米）。
 *   棒䗛属各种的卵从「细长」到「亚麻籽形」都有，这里取中间的长桶形。
 * - **卵盖（operculum）**：前端一枚椭圆形的盖，若虫孵化时顶开它钻出来。
 *   盖面比壳面浅一档，盖与壳之间垫一道深色的缝 —— 那道缝就是将来裂开的地方，
 *   也是浅色盖在画面上被读成「一枚盖子」而不是「壳的一截」的关键。
 * - **没有头冠（capitulum）。** 委托说明写的是「卵盖上常有一个小突起」，
 *   那对很多竹节虫成立（如巨人竹节虫），但**棒䗛属恰恰是个反例**：
 *   分类文献把「卵盖无头冠」列为棒䗛这一支（ramuline group）卵的鉴别特征之一。
 *   所以这里的卵盖是一面光滑的浅穹，测试专门盯着它不许长出一个疙瘩。
 * - **卵孔板（micropylar plate）**：卵的背面一块狭长的浅色板，两条长边近乎平行，
 *   **前端圆、后端分成两叶**，两叶之间是卵孔杯（micropylar cup，精子由此进入）。
 *   这块板是竹节虫卵分类上最看重的结构，也是这粒卵最好认的一处。
 *   **它是壳面自己的颜色区，不是贴上去的一块实体**：本仓库栽过「瓢虫幼虫的斑
 *   做成了塑料环」「蛹的斑做成了玻璃珠」，所以这里的板只比壳面高出网纹那么一点，
 *   贴着壳走，测试逐顶点量它离壳面有多远。
 * - **壳面网纹**：卵壳表面一层纤维交织成的网（文献原话是 "an elegant network of
 *   fibres on the capsule"）。做成浅色的网脊围着深色的小格 —— 几何上真的凸起
 *   （约 0.025 毫米），颜色上网脊亮、格心暗。只做几何不做颜色，这层起伏在 ACES
 *   下会被整片抹平；只做颜色不做几何，逆光机位它就是一层印花贴纸。
 * - **颜色**：深褐色的壳、浅棕灰的盖、近米白的卵孔板。深褐不往黑里压 ——
 *   格心的明度仍有 0.29，网脊 0.46（「越深越保险」害过 10 只里 7 只招牌消失）。
 *
 * 尺度按真实比例：卵 2.6 毫米、若虫 4.6 厘米、成虫 10 厘米。不为「好看」放大
 * （`stages.ts` 顶部的硬约定），取景由 `finalize()` 的 radius 归一化。
 *
 * ## 基座
 *
 * 一小片浅灰褐的砂质土面，上面撒几粒更小的砂粒。土色故意取得比卵**浅得多**
 * （0.71 对卵壳 0.29~0.46）：深卵落在深土上会整粒消失。
 * 土面压到与卵群同量级（半径约 0.3），不让它把取景撑开、把卵挤成几个点。
 *
 * ## 锚点
 *
 * 只用卵自己的部位名：`operculum` / `micropylarPlate` / `chorion` / `soil`。
 * 展台会拿当前模型的 anchors 去配成虫的 hotspot 表（成虫用的是
 * `body leg antenna head thorax camouflage`），卵上出现任何一个同名锚点，
 * 成虫那张「足：细长如枝条」的卡片就会贴到一粒卵上。测试把这六个名字列成黑名单。
 */
import * as THREE from 'three'
import { chitin, finalize, loft, type InsectModel, type Section } from '../kit'

// ---------------------------------------------------------------- 尺度

/** 卵壳（不含卵盖）沿长轴的长度。加上盖高，整粒约 2.6 毫米 */
const CAP_LEN = 0.245
/** 卵盖的穹高 */
const LID_H = 0.016
/** 卵壳最粗处的背腹半径（Y）与左右半径（Z）：略侧扁 */
const RY = 0.066
const RZ = 0.058
/** 壳口（卵盖所在处）的半径占最粗处的比例：前端平截，不收尖 */
const MOUTH = 0.72
/** 卵盖比壳口略大一圈，盖沿压在壳口外，才读得出「一枚盖子」 */
const LID_OVER = 1.06

/**
 * 壳的纵剖轮廓（占最粗处半径的比例），t=0 在后端极点、t=1 在壳口。
 * 后端圆钝（卵是桶，不是纺锤）；最粗处在中段偏前；前端缓收到壳口后平截。
 */
const SHELL_KEYS: readonly (readonly [number, number])[] = [
  [0.0, 0.0],
  [0.03, 0.4],
  [0.09, 0.62],
  [0.22, 0.86],
  [0.42, 0.98],
  [0.55, 1.0],
  [0.72, 0.96],
  [0.88, 0.85],
  [1.0, MOUTH],
]

// ---------------------------------------------------------------- 网纹

/** 网格一圈的格数（周向必须是整数格，网才首尾相接、不留一道接缝） */
const NET_AROUND = 22
/** 网脊凸出壳面的高度：约为壳半径的 4%。再高就成了一层蜂窝状的刺 */
const NET_RISE = 0.0025
/** 网脊的半宽（在壳面上量的弧长） */
const NET_HALF_W = 0.0032
/** 放样分辨率：网脊宽约 0.006，采样间距必须比它细，否则网在几何上根本长不出来 */
const SHELL_STEPS = 84
const SHELL_RADIAL = 120

// ---------------------------------------------------------------- 卵孔板

/** 卵孔板沿壳长的起止（后端两叶的叶尖 / 前端圆头），占壳长的比例 */
const PLATE_T0 = 0.24
const PLATE_T1 = 0.8
/** 卵孔板的半宽（方位角，弧度）：狭长的一条，约占周长的 13% */
const PLATE_HALF_ANGLE = THREE.MathUtils.degToRad(24)
/** 后端两叶之间的缺口深度（占壳长的比例） */
const PLATE_NOTCH = 0.07
/** 卵孔板离开**网脊顶**的量：只够盖住网纹、不让壳面从板下透出来 */
const PLATE_LIFT = 0.0007

// ---------------------------------------------------------------- 颜色（sRGB）

/** 网脊：暖褐，比格心亮一大档 —— 网纹靠这个明度差被看见 */
const NET_RIDGE_COLOR = '#977451'
/** 格心：深褐。不往黑里压 */
const NET_CELL_COLOR = '#644630'
/** 卵盖：浅棕灰，比壳亮 —— 深色的缝把它从壳上切出来 */
const LID_COLOR = '#a8957a'
/** 盖缝：近黑的一道 */
const SEAM_COLOR = '#2a1d13'
/** 卵孔板：近米白，全粒卵最亮的一块 */
const PLATE_COLOR = '#ddcba2'
/** 卵孔杯：卵孔板后端两叶之间的小凹，深色 */
const CUP_COLOR = '#3a2a1c'
/** 土面：浅灰褐砂土，比卵浅得多 */
const SOIL_COLOR = '#c7baa2'
const GRAIN_COLORS = ['#a8997f', '#d8cdb6', '#8f8272'] as const

// ---------------------------------------------------------------- 工具

/** 种子化 PRNG（mulberry32）：散落的位置、砂粒必须每次长得一样，目视验收过的图才是用户看到的图 */
function rng(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

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
 * 壳的基准轮廓在 t 处的半径比例。后端极点用圆弧收拢（sqrt），
 * 否则关键帧插值会在极点收成一个尖 —— 卵的后端是圆的。
 */
function shellFrac(t: number): number {
  if (t < 0.09) {
    const k = t / 0.09
    return 0.62 * Math.sqrt(Math.max(1 - (1 - k) * (1 - k), 0))
  }
  return keyframe(SHELL_KEYS, t)
}

/** 基准壳面（无网纹）上 (t, 方位角 a) 处的点，a=0 指向背面 +Y */
function shellPoint(t: number, a: number, lift = 0): THREE.Vector3 {
  const f = shellFrac(t)
  return new THREE.Vector3(t * CAP_LEN, (RY * f + lift) * Math.cos(a), (RZ * f + lift) * Math.sin(a))
}

/**
 * 网纹：壳面上 (沿长弧长, 周向弧长) 平面里的六角网格，返回该点离最近网脊的距离。
 *
 * 用 Voronoi 的「到最近两个格心的距离差 / 2」近似到格界的距离：
 * 六角格的格界正是相邻格心的中垂线。周向必须周期（NET_AROUND 整数格），
 * 否则网在壳背某处会错开一道接缝。
 */
const CIRC = Math.PI * (RY + RZ) // 椭圆周长的近似（用的是平均半径的周长）
const CELL_W = CIRC / NET_AROUND
const CELL_H = CELL_W * 0.866
/**
 * 格心的随机抖动（占格宽的比例）。严格的六角格读成「蜂巢 / 松果 / 机器压花」——
 * 第一版出图就是一排排整齐的蜂窝，像一截印了花的罐头。纤维网是长出来的，格子大小不一。
 */
const NET_JITTER = 0.2

function hash01(i: number): number {
  const x = Math.sin(i * 12.9898 + 78.233) * 43758.5453
  return x - Math.floor(x)
}

function netEdgeDistance(x: number, a: number): number {
  const b = (a / (Math.PI * 2)) * CIRC
  const row0 = Math.round(x / CELL_H)
  let d1 = Infinity
  let d2 = Infinity
  for (let r = row0 - 2; r <= row0 + 2; r++) {
    const cx = r * CELL_H
    const off = (((r % 2) + 2) % 2) * 0.5 * CELL_W
    const k0 = Math.round((b - off) / CELL_W)
    for (let k = k0 - 2; k <= k0 + 2; k++) {
      // 格心抖动：按 (行, 周向格号 mod 一圈) 取哈希，周向照样首尾相接
      const km = ((k % NET_AROUND) + NET_AROUND) % NET_AROUND
      const jx = (hash01(r * 131 + km * 17 + 3) - 0.5) * 2 * NET_JITTER * CELL_W
      const jb = (hash01(r * 71 + km * 29 + 11) - 0.5) * 2 * NET_JITTER * CELL_W
      let db = b - (off + k * CELL_W + jb)
      db -= Math.round(db / CIRC) * CIRC
      const d = Math.hypot(x - cx - jx, db)
      if (d < d1) {
        d2 = d1
        d1 = d
      } else if (d < d2) d2 = d
    }
  }
  return (d2 - d1) / 2
}

/** 网脊的隆起程度 0~1（1 = 脊顶）。两端极点与壳口附近淡出：网在那里会挤成一团 */
function ridge01(t: number, a: number): number {
  const e = netEdgeDistance(t * CAP_LEN, a)
  const fade = THREE.MathUtils.smoothstep(t, 0.04, 0.12) * (1 - THREE.MathUtils.smoothstep(t, 0.93, 0.99))
  return (1 - THREE.MathUtils.smoothstep(e, 0, NET_HALF_W)) * fade
}

/** sRGB hex → 线性空间 RGB（顶点色在着色器里按线性量与材质色相乘） */
function linear(hex: string): THREE.Color {
  return new THREE.Color(hex) // three 的颜色管理开着：构造时已转进线性工作空间
}

// ---------------------------------------------------------------- 部件

/**
 * 卵壳：带网纹的放样体。
 *
 * 网纹做在**几何 + 顶点色**两层上（理由见文件头）。材质基色取网脊色，
 * 格心靠顶点色逐通道压暗到 NET_CELL_COLOR —— 顶点色只能乘、不能提亮，
 * 所以亮的那一档必须放在材质上。测试据此还原格心的实际颜色。
 */
function shellMesh(material: THREE.MeshPhysicalMaterial): THREE.Mesh {
  const sections: Section[] = []
  for (let i = 0; i <= SHELL_STEPS; i++) {
    const t = i / SHELL_STEPS
    const f = shellFrac(t)
    sections.push({ at: new THREE.Vector3(t * CAP_LEN, 0, 0), ry: Math.max(RY * f, 1e-4), rz: Math.max(RZ * f, 1e-4) })
  }
  const geo = loft(sections, SHELL_RADIAL)

  // loft 的截面标架：沿 +X 走时 u = +Y、v = +Z，顶点 j 的方位角 a = 2πj/N 恰好从背面起算
  const pos = geo.getAttribute('position')
  const ridge = linear(NET_RIDGE_COLOR)
  const cell = linear(NET_CELL_COLOR)
  const factor = new THREE.Color(cell.r / ridge.r, cell.g / ridge.g, cell.b / ridge.b)
  const colors = new Float32Array(pos.count * 3)
  const ring = SHELL_RADIAL + 1
  const v = new THREE.Vector3()
  for (let idx = 0; idx < pos.count; idx++) {
    const i = Math.floor(idx / ring)
    const isCap = i > SHELL_STEPS // 两个封口中心点
    const t = isCap ? (idx === pos.count - 2 ? 0 : 1) : i / SHELL_STEPS
    v.fromBufferAttribute(pos, idx)
    const a = Math.atan2(v.z / RZ, v.y / RY)
    const h = isCap ? 0 : ridge01(t, a)
    if (!isCap && h > 0) {
      // 沿截面的外法向（椭圆上按半径加权）把顶点推出去 NET_RISE·h
      const n = new THREE.Vector3(0, Math.cos(a) / RY, Math.sin(a) / RZ).normalize()
      pos.setXYZ(idx, v.x, v.y + n.y * NET_RISE * h, v.z + n.z * NET_RISE * h)
    }
    colors[idx * 3] = THREE.MathUtils.lerp(factor.r, 1, h)
    colors[idx * 3 + 1] = THREE.MathUtils.lerp(factor.g, 1, h)
    colors[idx * 3 + 2] = THREE.MathUtils.lerp(factor.b, 1, h)
  }
  pos.needsUpdate = true
  geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
  // 网脊的起伏只有壳半径的 4%，放样给的椭圆法线足够；重算法线反而会在格点上刷出硬棱
  material.vertexColors = true
  const mesh = new THREE.Mesh(geo, material)
  mesh.name = 'egg-shell'
  return mesh
}

/** 卵盖：壳口上一面浅穹，盖沿比壳口大一圈。**不长头冠**（见文件头） */
function lidMesh(material: THREE.Material): THREE.Mesh {
  const sections: Section[] = []
  const steps = 10
  for (let i = 0; i <= steps; i++) {
    const s = i / steps
    // 盖沿先有一小段竖直的边（0.003），再起穹 —— 那段边在侧光下是一条亮线
    const x = CAP_LEN - 0.003 + (0.003 + LID_H) * s
    const dome = Math.sqrt(Math.max(1 - Math.pow(Math.max(s - 0.15, 0) / 0.85, 2), 0))
    const f = MOUTH * LID_OVER * dome
    sections.push({ at: new THREE.Vector3(x, 0, 0), ry: Math.max(RY * f, 1e-4), rz: Math.max(RZ * f, 1e-4) })
  }
  const mesh = new THREE.Mesh(loft(sections, 40), material)
  mesh.name = 'operculum'
  return mesh
}

/** 盖缝：壳口一圈深色细环，把浅色的盖从壳上切出来（浅贴浅的分界要垫深色缝） */
function seamMesh(material: THREE.Material): THREE.Mesh {
  const sections: Section[] = []
  const steps = 48
  for (let i = 0; i <= steps; i++) {
    const a = (i / steps) * Math.PI * 2
    sections.push({
      at: new THREE.Vector3(CAP_LEN - 0.004, RY * MOUTH * 1.02 * Math.cos(a), RZ * MOUTH * 1.02 * Math.sin(a)),
      ry: 0.0045,
      rz: 0.0045,
    })
  }
  const mesh = new THREE.Mesh(loft(sections, 8), material)
  mesh.name = 'operculum-seam'
  return mesh
}

/**
 * 卵孔板的轮廓：对每个横向位置 w∈[−1,1]（左右缘到中线），给出板沿壳长的起止。
 * - 前端（t1）按圆头收：两侧退后，中线最靠前；
 * - 后端（t0）分两叶：中线处凹进一个缺口，两侧叶尖最靠后，外缘再圆回来。
 */
function plateRange(w: number): [number, number] {
  const edge = 1 - Math.sqrt(Math.max(1 - w * w, 0))
  const t1 = PLATE_T1 - 0.07 * edge
  const t0 = PLATE_T0 + PLATE_NOTCH * Math.exp(-Math.pow(w / 0.32, 2)) + 0.05 * edge
  return [t0, t1]
}

/**
 * 卵孔板：一片贴着壳面走的薄壳。它**就是壳面的一块颜色区**：
 * 高度只比网脊顶多 PLATE_LIFT（0.007 毫米），刚好把网纹盖住，
 * 做成一块凸出来的实体就会读成「粘在卵上的一片塑料」。
 */
function plateMesh(material: THREE.Material): THREE.Mesh {
  const nw = 16
  const nt = 28
  const positions: number[] = []
  const indices: number[] = []
  for (let i = 0; i <= nw; i++) {
    const w = -1 + (2 * i) / nw
    const [t0, t1] = plateRange(w)
    for (let j = 0; j <= nt; j++) {
      const t = THREE.MathUtils.lerp(t0, t1, j / nt)
      const p = shellPoint(t, w * PLATE_HALF_ANGLE, NET_RISE + PLATE_LIFT)
      positions.push(p.x, p.y, p.z)
    }
  }
  for (let i = 0; i < nw; i++) {
    for (let j = 0; j < nt; j++) {
      const a = i * (nt + 1) + j
      const b = a + nt + 1
      indices.push(a, a + 1, b, b, a + 1, b + 1)
    }
  }
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geo.setIndex(indices)
  geo.computeVertexNormals()
  const mesh = new THREE.Mesh(geo, material)
  mesh.name = 'micropylar-plate'
  return mesh
}

/** 卵孔杯：卵孔板后端两叶之间的一个深色小圆斑，同样贴着壳面 */
function cupMesh(material: THREE.Material): THREE.Mesh {
  const tc = PLATE_T0 + PLATE_NOTCH * 0.55
  const r = 0.0075
  const positions: number[] = []
  const indices: number[] = []
  const rings = 5
  const segs = 16
  const center = shellPoint(tc, 0, NET_RISE + PLATE_LIFT * 2)
  positions.push(center.x, center.y, center.z)
  for (let i = 1; i <= rings; i++) {
    for (let k = 0; k < segs; k++) {
      const ang = (k / segs) * Math.PI * 2
      const dx = (r * i * Math.cos(ang)) / rings
      const db = (r * i * Math.sin(ang)) / rings
      const p = shellPoint(tc + dx / CAP_LEN, db / RY, NET_RISE + PLATE_LIFT * 2)
      positions.push(p.x, p.y, p.z)
    }
  }
  for (let k = 0; k < segs; k++) indices.push(0, 1 + k, 1 + ((k + 1) % segs))
  for (let i = 1; i < rings; i++) {
    for (let k = 0; k < segs; k++) {
      const a = 1 + (i - 1) * segs + k
      const b = 1 + (i - 1) * segs + ((k + 1) % segs)
      const c = a + segs
      const d = b + segs
      indices.push(a, c, b, b, c, d)
    }
  }
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geo.setIndex(indices)
  geo.computeVertexNormals()
  const mesh = new THREE.Mesh(geo, material)
  mesh.name = 'micropylar-cup'
  return mesh
}

interface EggMats {
  shell: THREE.MeshPhysicalMaterial
  lid: THREE.Material
  seam: THREE.Material
  plate: THREE.Material
  cup: THREE.Material
}

/**
 * 一粒完整的卵。内层几何都在「卵局部坐标」里（后端极点在原点、长轴沿 +X、
 * 卵孔板朝 +Y），外面包一层 pivot 把卵心挪到原点，姿态转的是 pivot ——
 * 这样测试可以直接拿几何的原始顶点量卵自己的形，与它躺成什么姿势无关。
 */
function eggUnit(m: EggMats): THREE.Group {
  const pivot = new THREE.Group()
  const inner = new THREE.Group()
  inner.position.x = -(CAP_LEN + LID_H) / 2
  inner.add(shellMesh(m.shell), lidMesh(m.lid), seamMesh(m.seam), plateMesh(m.plate), cupMesh(m.cup))
  pivot.add(inner)
  pivot.name = 'egg'
  return pivot
}

/** 土面：不规则的一小片砂土，上表面在 y=0，边缘倒角（直立的侧壁读成一块亚克力板） */
function soilPatch(material: THREE.Material, rand: () => number): THREE.Mesh {
  const pts: THREE.Vector2[] = []
  const N = 28
  for (let i = 0; i < N; i++) {
    const a = (i / N) * Math.PI * 2
    const r = SOIL_R * (0.86 + 0.14 * Math.sin(a * 3 + 0.7) * 0.6 + (rand() - 0.5) * 0.1)
    pts.push(new THREE.Vector2(Math.cos(a) * r * 1.12, Math.sin(a) * r * 0.92))
  }
  const geo = new THREE.ExtrudeGeometry(new THREE.Shape(pts), {
    depth: 0.008,
    bevelEnabled: true,
    bevelSize: 0.014,
    bevelThickness: 0.004,
    bevelSegments: 2,
    curveSegments: 8,
  })
  geo.rotateX(Math.PI / 2)
  const mesh = new THREE.Mesh(geo, material)
  mesh.name = 'soil'
  return mesh
}

/** 土面半径：与三粒卵散开的范围同量级，不把取景撑开 */
const SOIL_R = 0.3

/**
 * 三粒卵的摆放：[x, z, 长轴水平朝向（绕 Y，度）, 绕长轴的滚转（度）]。
 * 滚转决定哪一面朝上：
 * - 第 1 粒滚转 0：卵孔板朝天，俯视机位看得见板与两叶；
 * - 第 2 粒滚转 100：板转到侧面，露出大片网纹壳面；
 * - 第 3 粒长轴朝向机位的斜前方，卵盖冲外，前斜机位正对着盖。
 */
const EGGS: readonly (readonly [number, number, number, number])[] = [
  [-0.09, -0.11, 18, 0],
  [-0.02, 0.14, -30, 100],
  [0.17, 0.0, 70, -35],
]

// ---------------------------------------------------------------- 建模主体

export function buildStickInsectEgg(): InsectModel {
  const g = new THREE.Group()
  const rand = rng(0x5a1c7e)

  const mats: EggMats = {
    shell: chitin({ color: NET_RIDGE_COLOR, gloss: 0.3, clearcoat: 0.1 }),
    lid: chitin({ color: LID_COLOR, gloss: 0.28 }),
    seam: chitin({ color: SEAM_COLOR, gloss: 0.2 }),
    plate: chitin({ color: PLATE_COLOR, gloss: 0.35 }),
    cup: chitin({ color: CUP_COLOR, gloss: 0.3 }),
  }
  const soilMat = chitin({ color: SOIL_COLOR, gloss: 0.08, surface: 'velvet' })

  g.add(soilPatch(soilMat, rand))

  // 砂粒：几粒比卵小得多的扁石子，给「这是土面」与尺度参照。避开卵的位置
  for (let i = 0; i < 9; i++) {
    const a = rand() * Math.PI * 2
    const r = SOIL_R * (0.45 + rand() * 0.45)
    const x = Math.cos(a) * r * 1.1
    const z = Math.sin(a) * r * 0.85
    const size = 0.008 + rand() * 0.012
    const grain = new THREE.Mesh(
      new THREE.IcosahedronGeometry(size, 1),
      chitin({ color: GRAIN_COLORS[i % GRAIN_COLORS.length], gloss: 0.15 }),
    )
    grain.scale.set(1, 0.6, 0.85)
    grain.position.set(x, size * 0.3, z)
    grain.rotation.set(rand() * 3, rand() * 3, rand() * 3)
    grain.name = 'soil-grain'
    g.add(grain)
  }

  const eggs: THREE.Group[] = []
  for (const [x, z, yaw, roll] of EGGS) {
    const egg = eggUnit(mats)
    // 先绕长轴滚（决定哪一面朝上），再绕 Y 转出朝向
    egg.quaternion
      .setFromAxisAngle(new THREE.Vector3(0, 1, 0), THREE.MathUtils.degToRad(yaw))
      .multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), THREE.MathUtils.degToRad(roll)))
    egg.position.set(x, 0, z)
    egg.updateMatrixWorld(true)
    // 躺在土面上：最低点压进土里一点（0.004），悬空的卵一眼就假
    const minY = new THREE.Box3().setFromObject(egg).min.y
    egg.position.y = -minY - 0.004
    g.add(egg)
    eggs.push(egg)
  }

  g.updateMatrixWorld(true)
  const inner = (i: number) => eggs[i].children[0]
  const toWorld = (i: number, p: THREE.Vector3) => inner(i).localToWorld(p.clone())
  const anchors: Record<string, THREE.Vector3> = {
    // 第 3 粒的盖顶（盖冲外的那一粒）
    operculum: toWorld(2, new THREE.Vector3(CAP_LEN + LID_H, 0, 0)),
    // 第 1 粒卵孔板中段（板朝天的那一粒）
    micropylarPlate: toWorld(0, shellPoint((PLATE_T0 + PLATE_T1) / 2, 0, NET_RISE)),
    // 第 2 粒朝上的那一侧壳面（板转到侧面去了，朝上的是网纹）
    chorion: toWorld(1, shellPoint(0.5, -Math.PI / 2 - THREE.MathUtils.degToRad(10), NET_RISE)),
    soil: new THREE.Vector3(-SOIL_R * 0.75, 0, 0.08),
  }

  return finalize(g, anchors)
}
