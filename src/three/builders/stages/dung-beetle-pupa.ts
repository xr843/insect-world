/**
 * 神农洁蜣螂 · 蛹 Catharsius molossus（完全变态第 3 阶段）
 *
 * ## 这只蛹的全部价值：头端已经能看出成虫那把「铲」
 *
 * 幼虫是一条灰白的胖虫，成虫是一只乌黑的推粪球的甲虫 —— 中间隔着的就是它。
 * 神农洁蜣螂的头部前缘特化成一片扁平宽阔的**半圆铲**（切粪、推粪全靠它），
 * 这片铲在蛹上已经成形，只是还厚、还钝、齿还没长开。它跟独角仙蛹上的角雏形
 * 是同一类看点：**能看出它要变成谁**。所以本文件里别的都可以简化，这片铲不行。
 *
 * 分寸拿捏（每一条都对着一个会毁掉它的做法）：
 * - **铲必须比头宽**：铲连倒角宽 0.92 对头宽 0.61，比值 1.51（成虫是 1.37）。
 *   做得跟头一样宽就只是「头前面鼓了一块」，看不出是铲。
 * - **但它是雏形，不是小一号的成虫铲**：厚度 / 半宽 = 0.42，成虫是 0.21。
 *   蛹的附肢都还裹在薄壳里，边缘是圆钝的隆起；照成虫比例做成薄刃，
 *   这个阶段就没有教育价值了（独角仙蛹第一版把角照成虫比例做，读成了虾钳）。
 * - **齿只做低而圆的五个鼓包**，不是尖齿。成虫铲缘那五枚切割齿此刻还在壳下。
 * - 铲要**探出头的轮廓之外**：靠形（轮廓转折 + 边下的阴影缝）来读，不靠颜色。
 *   第一批黑蚱蝉的翅芽比它趴着的胸背还暗，四个机位全读成「一块污渍」——
 *   **深色贴浅色是斑纹，不是结构**。这里铲比体色深不到一档，靠的是它自己的边。
 *
 * ## 其余形态
 *
 * - **前足的开掘齿已成形**：成虫的前足胫节外缘有四枚耙齿（挖土、切粪块用）。
 *   蛹期它们已经在足芽的外缘鼓出来，贴在体侧。做成**贴合体表、边缘有台阶的
 *   壳片 + 齿突**，不是几片悬空的扁椭圆（兰花螳螂的花瓣腿节栽过那个跟头）。
 * - **腹部分节可见**：`segmentedAbdomen` 6 节 + `segmentedAbdomenMembranes` 的
 *   节间膜环。⚠️ 两者的 `membraneRatio` 必须**不同**（体节 0.86 / 膜环 0.93），
 *   否则膜环与体节交界处的收缩半径分毫不差地重合，整圈膜环要么被埋掉、
 *   要么与体壁打架。`groove` 只给 0.07：kit 默认的 0.15 叠上膜收缩，
 *   交界处半径一口气掉三成，背缘剪影会成一排锯齿（松果病）。
 * - **前胸背板是全身最宽的一块盾**（宽 1.64 对腹部 1.29）——鞘翅目的蛹都这样，
 *   腹部占七成、背板只是个小疙瘩的话，剪影会读成一只虾。
 * - **姿态绕 X 轴滚 −45°**：腹面（铲、足芽、翅芽全在那一侧）转向 +Z，
 *   也就是剖口与展台默认机位所在的那一侧。不滚的话这一整套东西任何机位都看不见。
 *
 * ## 蛹室：被幼虫用粪便糊平的那一层
 *
 * 三个阶段共用育儿粪梨这个语境，而**腔壁的粗糙度是三件里唯一按阶段变化的量**：
 * 卵期的孵化室是母虫抹平抛光的（极光滑）、幼虫期的腔正在被啃（最粗糙）、
 * 蛹期的腔壁被末龄幼虫用自己的粪便糊过一遍（较平、起伏只剩长波）。
 * 同时这一腔比幼虫期更大、外壁更薄 —— 那一圈粪被幼虫吃掉了。
 * 三张图并排看，就是「幼虫把自己的家吃出来、再糊好」这件事。
 *
 * 局部坐标系与成虫一致：+X 向前（头）、+Y 向上（背）、+Z 向右。
 * 粪梨的轴沿 +Y（颈朝上），纵剖口开在 +Z 一侧。
 */
import * as THREE from 'three'
import {
  chitin,
  finalize,
  loft,
  segmentedAbdomen,
  segmentedAbdomenMembranes,
  spindle,
  type InsectModel,
  type SegmentedAbdomenOptions,
  type Section,
} from '../kit'

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

/** 确定性整数散列：同一份代码在任何机器上都要长成同一枚粪梨 */
function hash2(x: number, y: number, seed: number): number {
  let h = Math.imul(x | 0, 0x27d4eb2d) ^ Math.imul(y | 0, 0x165667b1) ^ (seed | 0)
  h = Math.imul(h ^ (h >>> 15), 0x2c1b3c6d)
  h ^= h >>> 12
  h = Math.imul(h, 0x297a2d39)
  h ^= h >>> 15
  return (h >>> 0) / 4294967296
}

/** 二维值噪声，值域 [-1, 1] */
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

/** 转过一个角度再取噪声：值噪声的格子是轴对齐的，不转会在表面留下方格结构 */
function rotNoise(x: number, y: number, deg: number, seed: number): number {
  const a = THREE.MathUtils.degToRad(deg)
  const c = Math.cos(a)
  const s = Math.sin(a)
  return valueNoise(x * c + y * s, -x * s + y * c, seed)
}

// ================================================================ 育儿粪梨

/** 粪梨全高（厘米），与另两个阶段同一条轮廓 */
const PEAR_H = 5.4

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

/** 剖口：材料保留的方位角区间，窗口中心正对 +Z，半宽 64°（与幼虫那件一致） */
const WINDOW_HALF_DEG = 64
const PHI_START = THREE.MathUtils.degToRad(90 + WINDOW_HALF_DEG)
const PHI_SPAN = THREE.MathUtils.degToRad(360 - 2 * WINDOW_HALF_DEG)

/** 指压痕：[v, 方位角°, 深度, 高斯半径(厘米)]。与幼虫那件同一枚梨，压痕位置相同 */
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
 * 三层起伏的**格距**（厘米），比值 2.65 / 3.88，刻意不成整数比。
 * 格距不是波长：值噪声一个完整起落跨两格，肉眼看到的特征约是这些数的两倍。
 */
const GRAIN_COARSE = 1.75
const GRAIN_MID = 0.66
const GRAIN_FINE = 0.17
/** 细层的轴向格距：约为周向的 2.8 倍 = 纤维顺着抹开的方向拉长，不是砂粒 */
const GRAIN_FINE_AXIAL = 0.48
/** 周向坐标用固定参考半径而不是该处真实半径，否则纹理会被拉成绕轴的环带 */
const GRAIN_REF_R = 1.5

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

  // 干裂纹：脊线噪声的负向，挖出一条条窄而不规则的沟
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

/** 表面色调的不匀（乘在基色上的明度系数）。没有它，一整片同色的褐会读成巧克力 */
function pearTint(v: number, phi: number): number {
  const s = v * PEAR_H
  const a = phi * GRAIN_REF_R
  const patch = rotNoise(s / 0.72, a / 0.72, -17, 0x9b22) * 0.18
  const speck = rotNoise(s / 0.2, a / 0.11, 49, 0x2c88) * 0.11
  const shade = THREE.MathUtils.clamp(pearOffset(v, phi) * 1.1, -0.16, 0.08)
  // 斑驳同样要在两极淡出，否则顶视上那一圈会跟着采样密度闪成放射状的花
  return THREE.MathUtils.clamp(1 + (patch + speck) * poleFade(v) + shade, 0.62, 1.32)
}

function pearOuterRadius(v: number, phi: number): number {
  return Math.max(pearRadius(v) + pearOffset(v, phi), 0.002)
}

// ---------------------------------------------------------------- 蛹室

/**
 * 蛹室：比幼虫期的腔更大（那一圈粪被吃掉了，外壁只剩 0.25 厚），
 * 而且**被糊平过** —— 末龄幼虫化蛹前用自己的粪便把腔壁抹了一遍。
 * 起伏只留长波（格距 1.1）、振幅 0.022，是幼虫期啃痕的四分之一。
 */
const CHAMBER_Y = 2.15
const CHAMBER_HY = 1.86
const CHAMBER_HR = 1.78
/** 糊平后残留的起伏。给 0 会读成一只塑料碗，0.022 是「抹过但仍是粪」的那一档 */
const CHAMBER_ROUGH = 0.022

function chamberPoint(vc: number, phi: number): { r: number; y: number } {
  const u = 2 * vc - 1
  const y = CHAMBER_Y + u * CHAMBER_HY
  const shell = Math.sqrt(Math.max(0, 1 - u * u))
  const base = CHAMBER_HR * shell * (1 - 0.05 * u)
  const smeared = rotNoise(y / 1.1, (phi * GRAIN_REF_R) / 1.1, 19, 0x7712) * CHAMBER_ROUGH * shell
  return { r: Math.max(base + smeared, 0.004), y }
}

/** 腔壁的色调不匀：糊过的面比外壁匀得多，但不能一点没有 */
function chamberTint(vc: number, phi: number): number {
  const y = CHAMBER_Y + (2 * vc - 1) * CHAMBER_HY
  return THREE.MathUtils.clamp(1 + rotNoise(y / 0.7, (phi * GRAIN_REF_R) / 0.7, 33, 0x4411) * 0.08, 0.86, 1.14)
}

// ---------------------------------------------------------------- 网格

/** 轴线上的细孔半径：剖面多边形沿轴的两段边不能真的落在 r=0 上，否则退化自交 */
const AXIS_R = 0.004
const OUTER_RINGS = 58
const CHAMBER_RINGS = 32
const AZIMUTH = 156

/** 把色调系数写成一个略带色温位移的顶点色：单纯的明度缩放读起来像脏 */
function tintColor(m: number): [number, number, number] {
  return [m * (m > 1 ? 1.02 : 0.99), m, m * (m > 1 ? 0.95 : 1.03)]
}

/** 旋转面：沿方位角扫过 PHI_SPAN，逐点取半径，并把色调不匀烘进顶点色 */
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
      col.push(...tintColor(tint(v, phi)))
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
 * 用的是该方位角上**位移后**的轮廓 —— 否则剖口边缘会与外表面差出一整个起伏量，
 * 出图上是一道贯穿的裂缝。
 */
function sectionFace(phi: number, material: THREE.Material): THREE.Mesh {
  const pts: THREE.Vector2[] = []
  for (let i = 0; i <= OUTER_RINGS; i++) {
    const v = i / OUTER_RINGS
    pts.push(new THREE.Vector2(Math.max(pearOuterRadius(v, phi), AXIS_R), v * PEAR_H))
  }
  pts.push(new THREE.Vector2(AXIS_R, chamberPoint(1, phi).y))
  for (let i = CHAMBER_RINGS; i >= 0; i--) {
    const p = chamberPoint(i / CHAMBER_RINGS, phi)
    pts.push(new THREE.Vector2(Math.max(p.r, AXIS_R), p.y))
  }
  pts.push(new THREE.Vector2(AXIS_R, 0))

  const geo = new THREE.ShapeGeometry(new THREE.Shape(pts))
  // earcut 只用给进去的边界点，所以这里每个顶点都在轮廓上，按高度刷一层竖向斑驳
  const fpos = geo.getAttribute('position')
  const fcol: number[] = []
  for (let i = 0; i < fpos.count; i++) {
    const m = THREE.MathUtils.clamp(1 + rotNoise(fpos.getY(i) / 0.3, fpos.getX(i) / 0.3, 37, 0xdd41) * 0.13, 0.82, 1.18)
    fcol.push(m * 1.01, m, m * 0.97)
  }
  geo.setAttribute('color', new THREE.Float32BufferAttribute(fcol, 3))
  const e1 = new THREE.Vector3(Math.cos(phi), 0, Math.sin(phi))
  const e2 = new THREE.Vector3(0, 1, 0)
  const e3 = new THREE.Vector3().crossVectors(e1, e2)
  geo.applyMatrix4(new THREE.Matrix4().makeBasis(e1, e2, e3))
  const mesh = new THREE.Mesh(geo, material)
  mesh.name = 'pear-cut'
  return mesh
}

/** 粪梨（半剖）：外壳 + 腔壁 + 两片剖面 */
function broodPear(shellMat: THREE.Material, chamberMat: THREE.Material, cutMat: THREE.Material): THREE.Group {
  const g = new THREE.Group()
  const shell = new THREE.Mesh(
    revolve(OUTER_RINGS, (v, phi) => ({ r: pearOuterRadius(v, phi), y: v * PEAR_H }), pearTint),
    shellMat,
  )
  shell.name = 'pear-shell'
  g.add(shell)
  const chamber = new THREE.Mesh(revolve(CHAMBER_RINGS, chamberPoint, chamberTint), chamberMat)
  chamber.name = 'pear-chamber'
  g.add(chamber)
  g.add(sectionFace(PHI_START, cutMat))
  g.add(sectionFace(PHI_START + PHI_SPAN, cutMat))
  return g
}

// ================================================================ 蛹

/** 腹面朝向 +Z（剖口与展台默认机位都在那一侧）需要绕 X 轴滚这么多度 */
const SUPINE_DEG = -45
/**
 * 再绕 Y 轴偏 −28°，把头端转向剖口。
 *
 * 不偏的话蛹是横躺着的，头端正好顶在剖口的边缘上：铲一半被梨壁挡住、
 * 一半落在壁的阴影里，出图上四个机位没有一个看得出它是一片铲。
 * 偏 28° 之后头端离观众更近、也吃得到主光，而蛹在腔里仍然放得下
 * （半长 1.5 斜过来占 X 1.3 / Z 0.7，腔半径 1.78）。
 */
const YAW_DEG = -28

/** 蛹体：橙褐。与 ladybird.ts 的 #e2382a（目视验收过的「够亮」基准）同一亮度带 */
const BODY_COLOR = '#bd6f2e'
/** 铲与足芽：比体色深一档（骨化程度更高的观感），但远不到近黑 */
const PAD_COLOR = '#a55c25'
/** 齿与气门的深色小点 */
const DARK_COLOR = '#5d2f10'

/** 粪梨外壁：灰味的黄褐。橙味重一档就读成巧克力 */
const DUNG_COLOR = '#6d6046'
/** 剖面：断面比外壁暗一点（切开的那一面本来就背着光） */
const DUNG_CUT_COLOR = '#5b5138'
/** 腔壁：糊平后更暗更匀，把橙褐的蛹衬出来 */
const DUNG_CHAMBER_COLOR = '#4a4130'

interface SpindleSpec {
  from: [number, number, number]
  to: [number, number, number]
  radius: number
  bulge: number
  flat: number
  taperStart: number
  taperEnd: number
}

/**
 * 腹部：6 节，前粗后细。前端塞进前胸背板里（x=0.30 处背板半径 0.60 > 腹部 r0 0.58），
 * 两段的可见表面自然交接 —— 谁都罩不住谁的话，两个放样封口盘会双双露在外面，
 * 渲染出来是躯干中间一道明晃晃的圆盘（独角仙蛹第一版实撞，而顶点数、包围盒、
 * NaN 检查全是绿的）。
 */
const ABDOMEN: SegmentedAbdomenOptions = {
  from: [0.3, 0.02, 0],
  to: [-1.25, 0.08, 0],
  r0: 0.58,
  r1: 0.26,
  segments: 6,
  groove: 0.07,
  membraneRatio: 0.86,
  flat: 1.06,
  bulge: 0.22,
  color: BODY_COLOR,
}
/** 膜环单独用一个更大的比例，才不会与体节自身的收缩重合 */
const MEMBRANE_RING_RATIO = 0.93

/** 前胸背板：全身最宽的一块盾，半宽 0.75 对腹部的 0.62 */
const THORAX: SpindleSpec = {
  from: [-0.3, 0.04, 0],
  to: [0.98, 0.1, 0],
  radius: 0.72,
  bulge: 0.62,
  flat: 1.14,
  // taperStart 0.05：后端几乎收成一点，整个藏进腹部里，不留封口盘
  taperStart: 0.05,
  // taperEnd 0.2：前端封口盘半径 0.132，小于头部在该处的半径，才不会露出一圈硬边
  taperEnd: 0.2,
}

/** 头：小而低垂，铲从它的前缘长出来 */
const HEAD: SpindleSpec = {
  from: [0.72, -0.02, 0],
  to: [1.34, -0.1, 0],
  radius: 0.3,
  bulge: 0.6,
  flat: 1.02,
  taperStart: 0.5,
  taperEnd: 0.3,
}

/** 复刻 kit.spindle 的半径包络，供腹面附属物按体壁定位（不重复造几何） */
function spindleRadius(spec: SpindleSpec, x: number): { axisY: number; ry: number; rz: number } | null {
  const span = spec.to[0] - spec.from[0]
  const t = (x - spec.from[0]) / span
  if (t < 0 || t > 1) return null
  const k = t < spec.bulge ? t / spec.bulge : (1 - t) / (1 - spec.bulge)
  let r = spec.radius * Math.sin(THREE.MathUtils.clamp(k, 0, 1) * Math.PI * 0.5)
  if (t === 0) r = spec.radius * spec.taperStart
  if (t === 1) r = spec.radius * spec.taperEnd
  return {
    axisY: THREE.MathUtils.lerp(spec.from[1], spec.to[1], t),
    ry: r / spec.flat,
    rz: r * spec.flat,
  }
}

function makeSpindle(spec: SpindleSpec, material: THREE.Material, name: string): THREE.Mesh {
  const mesh = new THREE.Mesh(
    spindle(spec.from, spec.to, spec.radius, {
      bulge: spec.bulge,
      flat: spec.flat,
      taperStart: spec.taperStart,
      taperEnd: spec.taperEnd,
    }),
    material,
  )
  mesh.name = name
  return mesh
}

/**
 * 唇基铲的雏形：一片半圆的厚板，弧背朝前（+X）、直边贴着头。
 *
 * 与成虫 dung-beetle.ts 的 `clypeusShovel()` 同一手法（ExtrudeGeometry 画半圆轮廓
 * 再 rotateX(90°) 摊平），但**厚得多、圆得多**：厚度 / 半径 = 0.36 对成虫的 0.21，
 * 倒角也放大到厚度的 0.42（成虫是 0.30）。蛹的附肢都还裹在一层薄壳里，
 * 边缘是圆钝的隆起而不是刃 —— 这一档比例就是「雏形」与「小一号的成虫」的分界。
 */
function shovelRudiment(
  center: THREE.Vector3,
  radius: number,
  thickness: number,
  material: THREE.Material,
): THREE.Mesh {
  const shape = new THREE.Shape()
  shape.moveTo(0, -radius)
  shape.absarc(0, 0, radius, -Math.PI / 2, Math.PI / 2, false)
  shape.lineTo(0, -radius)
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: thickness,
    bevelEnabled: true,
    bevelSize: thickness * 0.42,
    bevelThickness: thickness * 0.34,
    bevelSegments: 3,
    curveSegments: 26,
  })
  geo.rotateX(Math.PI / 2)
  geo.translate(center.x, center.y + thickness / 2, center.z)
  const mesh = new THREE.Mesh(geo, material)
  mesh.name = 'pupa-shovel'
  return mesh
}

/**
 * 铲缘的五个齿雏形：低而圆的鼓包，不是尖齿。
 * 成虫那五枚切割齿此刻还在壳下 —— 做成尖的就等于把蛹画成了成虫。
 */
function shovelTeeth(
  center: THREE.Vector3,
  radius: number,
  thickness: number,
  material: THREE.Material,
): THREE.Group {
  const g = new THREE.Group()
  for (const deg of [-52, -26, 0, 26, 52]) {
    const a = THREE.MathUtils.degToRad(deg)
    const rim = new THREE.Vector3(
      center.x + radius * 0.96 * Math.cos(a),
      center.y + thickness * 0.52,
      center.z + radius * 0.96 * Math.sin(a),
    )
    const bump = new THREE.Mesh(new THREE.SphereGeometry(thickness * 0.5, 12, 8), material)
    bump.name = 'pupa-shovel-tooth'
    bump.position.copy(rim)
    // 沿半径方向拉长、上下压扁：贴着铲缘的一枚圆突，而不是插上去的一颗珠子
    bump.scale.set(1.25, 0.66, 1)
    g.add(bump)
  }
  return g
}

/**
 * 贴在体侧的一片芽（翅芽 / 足芽）。
 *
 * ⚠️ 不是手写世界坐标的扁椭圆 —— 那样做出来侧视是几片悬空的「剪纸」
 * （兰花螳螂的花瓣状腿节栽的就是这个）。这里整组先绕 X 转到
 * 「组的局部 +Y = 该处体壁的外法线方向」，再按「离体轴多远、多厚、多宽」摆截面，
 * 芽自然半埋在体壁里，边缘留一道台阶 —— **有边缘才读成一片盖在身上的壳**。
 */
interface PadSpec {
  /** 沿体轴的起止 x */
  x0: number
  x1: number
  /** 绕体轴的方位角（度）：0 = 正腹面，正值转向 +Z 一侧 */
  angleDeg: number
  /** 半宽（沿体表切向） */
  halfWidth: number
  /** 厚度（离体表） */
  thickness: number
  name: string
}

function abdomenRadius(x: number): { axisY: number; ry: number; rz: number } | null {
  const span = ABDOMEN.to[0] - ABDOMEN.from[0]
  const t = (x - ABDOMEN.from[0]) / span
  if (t < 0 || t > 1) return null
  const peak = Math.max(ABDOMEN.r0, ABDOMEN.r1!) * 1.06
  const bulge = ABDOMEN.bulge ?? 0.3
  const sm = (k: number) => k * k * (3 - 2 * k)
  const r =
    t < bulge
      ? THREE.MathUtils.lerp(ABDOMEN.r0, peak, sm(t / bulge))
      : THREE.MathUtils.lerp(peak, ABDOMEN.r1!, sm((t - bulge) / (1 - bulge)))
  const flat = ABDOMEN.flat ?? 1
  return {
    axisY: THREE.MathUtils.lerp(ABDOMEN.from[1], ABDOMEN.to[1], t),
    ry: r / flat,
    rz: r * flat,
  }
}

/**
 * 体表在 x 处的半径 —— 三段（腹 / 胸 / 头）里**取最外的那一段**。
 *
 * ⚠️ 第一版让每片芽各自指定「贴在哪一段上」，于是芽只要跨过段界就有一段
 * x 落在该段之外，`spindleRadius` 返回 null，整片芽被 `if (pad) pose.add(pad)`
 * 静默丢掉 —— 出图上翅芽、足芽、中后足芽**一片都没有**，而测试（当时还没写
 * 到这几条）、typecheck、面数统计全是绿的。芽本来就是从胸盖到腹的，
 * 按段查半径这个设计本身就是错的。
 *
 * 三段都不含 x 时返回 null（真的在体外），调用方仍要处理。
 */
function bodyRadius(x: number): { axisY: number; ry: number; rz: number } | null {
  const all = [abdomenRadius(x), spindleRadius(THORAX, x), spindleRadius(HEAD, x)].filter(
    (v): v is { axisY: number; ry: number; rz: number } => v !== null,
  )
  if (!all.length) return null
  return all.reduce((a, b) => (b.rz > a.rz ? b : a))
}

function flankPad(pad: PadSpec, material: THREE.Material): THREE.Mesh | null {
  const steps = 16
  const sections: Section[] = []
  const angle = THREE.MathUtils.degToRad(pad.angleDeg)
  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    const x = THREE.MathUtils.lerp(pad.x0, pad.x1, t)
    const at = bodyRadius(x)
    if (!at) return null
    // 两端收细：芽片是纺锤形的，方头方脑的一块会读成贴上去的胶布
    const taper = Math.sin(Math.PI * (0.12 + 0.76 * t))
    const out = Math.hypot(at.ry * Math.cos(angle), at.rz * Math.sin(angle))
    const depth = out - pad.thickness * 0.35
    sections.push({
      at: new THREE.Vector3(x, at.axisY - depth * Math.cos(angle), depth * Math.sin(angle)),
      ry: pad.thickness * taper,
      rz: pad.halfWidth * taper,
      // 截面绕体轴转到该处的法向：不转的话芽片是平躺的，贴不上圆的体壁
      roll: -angle,
    })
  }
  const mesh = new THREE.Mesh(loft(sections, 18), material)
  mesh.name = pad.name
  return mesh
}

/**
 * 前足芽外缘的开掘齿：成虫前足胫节外缘那四枚耙齿的雏形。
 *
 * 齿必须**凸出足芽表面**（净凸出 ≥ 半径的一半），否则就是「芽上颜色深一点」——
 * 深色贴浅色是斑纹不是结构，第一批黑蚱蝉的翅芽栽的正是这条。
 */
function digTeeth(pad: PadSpec, material: THREE.Material, count: number): THREE.Group {
  const g = new THREE.Group()
  const angle = THREE.MathUtils.degToRad(pad.angleDeg)
  for (let i = 0; i < count; i++) {
    const t = 0.2 + (i / (count - 1)) * 0.62
    const x = THREE.MathUtils.lerp(pad.x0, pad.x1, t)
    const at = bodyRadius(x)
    if (!at) continue
    const taper = Math.sin(Math.PI * (0.12 + 0.76 * t))
    const out = Math.hypot(at.ry * Math.cos(angle), at.rz * Math.sin(angle))
    const depth = out - pad.thickness * 0.35
    // 齿长在芽片**外缘**（离体中线更远的那一侧），不是长在芽的正中
    const edge = pad.halfWidth * taper * 0.86
    // 体表在该方位角的外法向与切向。芽片的截面就是按这两个轴摆的（roll = −angle）
    const nrm = new THREE.Vector3(0, -Math.cos(angle), Math.sin(angle))
    const tan = new THREE.Vector3(0, Math.sin(angle), Math.cos(angle))
    const base = new THREE.Vector3(x, at.axisY, 0).addScaledVector(nrm, depth).addScaledVector(tan, edge)
    /*
     * ⚠️ 齿要**斜着往外**长（法向 0.8 + 切向 0.6），不能纯沿切向。
     * 第一版纯沿切向：齿从芽缘出发绕着体表滑过去，而体表是圆的，
     * 于是整排齿有一大半埋进了躯干里 —— 实测齿尖只比胸背轮廓凸出 0.02，
     * 出图上根本看不出是齿，只是芽缘颜色深了一道。
     * 深色贴浅色是斑纹不是结构（黑蚱蝉翅芽那条），凸出量必须是真的。
     */
    const dir = nrm.clone().multiplyScalar(0.8).addScaledVector(tan, 0.6).normalize()
    const tip = base.clone().addScaledVector(dir, 0.13).add(new THREE.Vector3(0.03, 0, 0))
    const tooth = new THREE.Mesh(
      loft([{ at: base, ry: 0.055, rz: 0.055 }, { at: tip, ry: 0.016, rz: 0.016 }], 10),
      material,
    )
    tooth.name = 'pupa-foreleg-tooth'
    g.add(tooth)
  }
  return g
}

/** 腹节侧缘的成对小突（ampullae）：蛹靠它在室里扭动，也让侧剪影不至于是一条光滑的锥 */
function ampullae(material: THREE.Material): THREE.Group {
  const g = new THREE.Group()
  for (let i = 0; i < 5; i++) {
    const x = THREE.MathUtils.lerp(0.05, -1.0, i / 4)
    const at = abdomenRadius(x)
    if (!at) continue
    for (const side of [1, -1] as const) {
      const m = new THREE.Mesh(new THREE.SphereGeometry(0.062, 10, 8), material)
      m.name = 'pupa-ampulla'
      m.position.set(x, at.axisY + at.ry * 0.16, side * at.rz * 0.97)
      m.scale.set(1.3, 0.7, 0.55)
      g.add(m)
    }
  }
  return g
}

// ================================================================ 装配

export function buildDungBeetlePupa(): InsectModel {
  const g = new THREE.Group()

  // ---- 粪梨（哑光、无清漆，并开顶点色：色调不匀已烘进几何的 color 属性）
  const dungMat = chitin({ color: DUNG_COLOR, gloss: 0.1, clearcoat: 0 })
  const chamberMat = chitin({ color: DUNG_CHAMBER_COLOR, gloss: 0.18, clearcoat: 0.04 })
  const cutMat = chitin({ color: DUNG_CUT_COLOR, gloss: 0.08, clearcoat: 0 })
  for (const m of [dungMat, chamberMat, cutMat]) m.vertexColors = true
  g.add(broodPear(dungMat, chamberMat, cutMat))

  /*
   * 蛹壳：clearcoat 只给 0.18。elytra() 那档（0.55）套在这个亮度的橙褐上，
   * 正对光源的角度会整片过曝成灰白，把固有色和隆起的体积感一起吃掉
   * （深褐的独角仙成虫曾因此从正面看像两个白球）。
   */
  const bodyMat = chitin({ color: BODY_COLOR, gloss: 0.45, clearcoat: 0.18, surface: 'punctate' })
  const padMat = chitin({ color: PAD_COLOR, gloss: 0.4, clearcoat: 0.14 })
  const darkMat = chitin({ color: DARK_COLOR, gloss: 0.42, clearcoat: 0.2 })

  const pose = new THREE.Group()
  pose.name = 'pupa-pose'
  pose.rotation.set(THREE.MathUtils.degToRad(SUPINE_DEG), THREE.MathUtils.degToRad(YAW_DEG), 0, 'YXZ')

  // ---- 腹部（分节）+ 节间膜环
  const abdomen = new THREE.Mesh(segmentedAbdomen(ABDOMEN), bodyMat)
  abdomen.name = 'pupa-abdomen'
  pose.add(abdomen)
  for (const ring of segmentedAbdomenMembranes({ ...ABDOMEN, membraneRatio: MEMBRANE_RING_RATIO })) {
    ring.name = 'membrane-ring'
    pose.add(ring)
  }

  // ---- 前胸背板与头
  pose.add(makeSpindle(THORAX, bodyMat, 'pupa-thorax'))
  pose.add(makeSpindle(HEAD, bodyMat, 'pupa-head'))

  // ---- 铲的雏形（本阶段的招牌）
  const shovelCenter = new THREE.Vector3(1.26, -0.1, 0)
  const shovelRadius = 0.44
  const shovelThickness = 0.115
  pose.add(shovelRudiment(shovelCenter, shovelRadius, shovelThickness, padMat))
  pose.add(shovelTeeth(shovelCenter, shovelRadius, shovelThickness, padMat))

  // ---- 翅芽：一对，从胸侧盖到第 3 腹节
  for (const side of [1, -1] as const) {
    const pad = flankPad(
      { x0: 0.52, x1: -0.62, angleDeg: side * 52, halfWidth: 0.27, thickness: 0.075, name: 'pupa-wing-pad' },
      padMat,
    )
    if (pad) pose.add(pad)
  }

  // ---- 前足芽 + 开掘齿（成虫那四枚耙齿的雏形）
  for (const side of [1, -1] as const) {
    const spec: PadSpec = {
      x0: 1.06,
      x1: 0.3,
      angleDeg: side * 88,
      halfWidth: 0.16,
      thickness: 0.08,
      name: 'pupa-foreleg-pad',
    }
    const pad = flankPad(spec, padMat)
    if (pad) pose.add(pad)
    pose.add(digTeeth(spec, darkMat, 4))
  }

  // ---- 中足、后足芽：更细、更靠腹面
  for (const side of [1, -1] as const) {
    for (const [x0, x1] of [
      [0.62, -0.05],
      [0.34, -0.45],
    ] as const) {
      const pad = flankPad(
        { x0, x1, angleDeg: side * 22, halfWidth: 0.11, thickness: 0.06, name: 'pupa-leg-pad' },
        padMat,
      )
      if (pad) pose.add(pad)
    }
  }

  // ---- 腹节侧突
  pose.add(ampullae(padMat))

  /*
   * 蛹躺在室底：比腔心低 0.3。它的两端离腔壁只剩 0.2 上下 ——
   * 真实的蛹就是把室撑满的，留太多空隙会读成「一颗球里丢了个东西」。
   */
  pose.position.set(0, CHAMBER_Y - 0.3, 0)
  g.add(pose)

  const toWorld = (v: THREE.Vector3) => v.clone().applyEuler(pose.rotation).add(pose.position)

  const anchors: Record<string, THREE.Vector3> = {
    shovel: toWorld(new THREE.Vector3(1.55, 0.02, 0)),
    head: toWorld(new THREE.Vector3(1.1, 0.26, 0)),
    foreleg: toWorld(new THREE.Vector3(0.7, -0.1, 0.78)),
    abdomen: toWorld(new THREE.Vector3(-0.7, 0.5, 0)),
    wingPad: toWorld(new THREE.Vector3(0.1, -0.45, 0.5)),
    chamber: new THREE.Vector3(0, CHAMBER_Y + CHAMBER_HY * 0.76, 0),
    pear: new THREE.Vector3(-pearRadius(0.4) * 0.86, 0.4 * PEAR_H, 0),
  }

  return finalize(g, anchors)
}
