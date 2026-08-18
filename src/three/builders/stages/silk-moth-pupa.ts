/**
 * 柞蚕蛾 Antheraea pernyi · 蛹（连茧）
 *
 * 与成虫 silk-moth.ts 同一套单位与坐标系：1 = 1 厘米，+X 向前（头）、+Y 向上（背）、+Z 向右。
 *
 * ## 表现方式：茧做成纵向剖开的半剖，不用半透材质
 *
 * 题目给了两条路（半透茧 / 剖开一半），这里选剖开，理由三条：
 *
 * 1. **柞蚕茧是不透光的。** 它由粗丝紧密叠压而成，外面还裹一层胶质，
 *    对着太阳也看不见里面的蛹 —— 半透茧是好看但假的。本项目的立场是
 *    「每处形态都能在代码里追溯到形态学依据」，宁可用一个**公开承认是剖面**的
 *    教科书画法，也不编一层现实里不存在的透光丝。
 * 2. **半透在这个尺寸上根本读不出来。** `chitin({translucent:true})` 走的是
 *    transmission 通道（transmission 0.35、thickness 0.6），隔着 0.075 的壁
 *    看一个深褐色的蛹，出来的是一团更暗的褐 —— 「里面是一只蛾」这个看点会直接消失，
 *    而这正是本阶段唯一要讲的事。
 * 3. **剖面同时留住了完整外形。** 开口只挖掉朝向观众上前方的那 155°，
 *    底面与远侧的壳壁都在，所以从上方/后方看仍是一枚完整的长卵形茧；
 *    转到正面才「打开」。一个模型给出两件事，比两者取一强。
 *
 * 为了让人一眼知道那是**丝**而不是一层壳，外壁上另绕了 24 根丝索
 * （沿茧面走的细管，颜色比壳面浅一档），加上一端的**柄状丝索**（茧柄）——
 * 柞蚕结茧时用一束丝把茧系在柞树枝上，末端还绕成一个环。
 * 这个柄是柞蚕茧与家蚕茧最直观的差别，不能省。
 *
 * ## 蛹本体的看点：能看出里面是一只蛾
 *
 * - 纺锤形、长约 3.5 厘米、深褐（真值：柞蚕蛹长 3.5~4.5 厘米，宽 1.5~2 厘米）。
 * - **腹部分节可见**：前半段（头 + 胸）是光滑融合的一整块，后半段 7 个腹节各有环沟。
 *   这个「前光滑后分节」的对比本身就是蛹的识别特征。
 * - **翅芽与触角芽紧贴腹面**：翅芽是从胸侧一直盖到第 4 腹节的一对扁平壳片，
 *   触角芽是腹面正中两侧的一对窄带（雄蛾的羽状触角就折在里面，所以带上刻了横棱）。
 *   两者都做成**贴合体表、边缘有台阶**的壳片 —— 台阶是关键：没有边缘的隆起
 *   只会读成「身上有点鼓」，有边缘才读成「一片盖在身上的壳」。
 * - 翅芽比腹部浅一档是**有意的偏离**：真实蛹上二者色差很小，但在 ACES 下
 *   深褐叠深褐只剩一道 0.05 的台阶，招牌结构会整个消失（第 5 轮 7 只返工的
 *   就是这个病）。要读得出，就得真的给出明度差。
 */
import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { chitin, finalize, loft, type InsectModel, type Section } from '../kit'

// ---------------------------------------------------------------- 茧

/**
 * 茧长 4.35、最粗处半径 1.02（真值：长 4.5~5.5 厘米、直径 2.3~2.8 厘米，取偏小的一档）。
 * 第一版取 5.2 / 1.35，配上 0.68 半径的蛹出图是「一只碗里躺着一小块黑东西」——
 * 真实的茧是**贴着蛹**结的，腔里没有那么多空隙。收小茧、放大蛹之后才对：
 * 现在蛹的最粗处 0.78 对内腔 0.94，四周只剩 0.1 的余量。
 */
const COCOON_LEN = 4.35
const COCOON_R = 1.02
/** 丝壁厚度：真实茧壁约 0.5~1 毫米，取 0.075 —— 剖口上看得见这道厚度才像壳 */
const WALL = 0.075
/** 内腔相对外形的收缩：径向减一个壁厚，轴向两端各减一个壁厚 */
const CAVITY_RAD = 1 - WALL / COCOON_R
const CAVITY_AX = 1 - (2 * WALL) / COCOON_LEN

/**
 * 剖口的方位。旋转编排见 `cocoonPoint()`：方位角 φ 对应的外法方向是
 * (0, −sinφ, cosφ)，所以 φ=0 朝 +Z（正对观众）、φ=270° 朝 +Y（上）。
 * 保留 37°~292°（底面 + 远侧壁 + 上壁），挖掉的 105° 正对展台默认机位
 * （InsectCanvas.tsx 的 home ≈ (0.86,0.44,1.25)，即右前上方）。
 *
 * 开口宽度是调过的：第一版挖了 155°，出图整只茧读成一只「碗」——
 * 近侧的壁全没了，剩下的一片弧看不出是个封闭的容器。收到 105° 才成为一个**窗口**：
 * 上下都还留着壳，弧线在蛹的上方合拢，「蛹在茧里面」这件事才立得住。
 */
const PHI_START = THREE.MathUtils.degToRad(37)
const PHI_LEN = THREE.MathUtils.degToRad(255)

/** 沿茧长的外半径。v=0 是后端、v=1 是前端（茧柄那端）。 */
function cocoonRadius(v: number): number {
  const t = THREE.MathUtils.clamp(v, 0, 1)
  // 指数 0.86 把最粗处推到 v≈0.45（略偏后），0.62 次幂把椭球撑成更饱满的长卵形
  const shape = Math.pow(Math.sin(Math.PI * Math.pow(t, 0.86)), 0.62)
  return Math.max(COCOON_R * shape, 0.05)
}

/**
 * 茧面上一点，**直接给最终坐标**（茧壳几何是先绕 Y 轴旋成再整体转 90° 得到的，
 * 这个函数把那次旋转的结果写死，免得丝索与壳面用两套坐标各算各的）。
 */
function cocoonPoint(v: number, phi: number, swell = 1, out = new THREE.Vector3()): THREE.Vector3 {
  const u = -COCOON_LEN / 2 + v * COCOON_LEN
  const r = cocoonRadius(v) * swell
  return out.set(u, -r * Math.sin(phi), r * Math.cos(phi))
}

/**
 * 旋转母线：外轮廓走一遍、内轮廓（缩一个壁厚）反着走回来，首尾相接成一条闭合折线。
 * 闭合是必须的 —— 开着的话旋出来是一张没有厚度的纸，剖口处看不到壁厚。
 * 内轮廓两端强制收到轴上（半径 0），否则茧的两个尖端会留下一个小孔。
 */
function shellProfile(): THREE.Vector2[] {
  const N = 44
  const pts: THREE.Vector2[] = []
  for (let i = 0; i <= N; i++) {
    const v = i / N
    pts.push(new THREE.Vector2(cocoonRadius(v), -COCOON_LEN / 2 + v * COCOON_LEN))
  }
  const inner: THREE.Vector2[] = []
  for (let i = N; i >= 0; i--) {
    const v = i / N
    inner.push(new THREE.Vector2(cocoonRadius(v) * CAVITY_RAD, (-COCOON_LEN / 2 + v * COCOON_LEN) * CAVITY_AX))
  }
  inner[0].x = 0
  inner[inner.length - 1].x = 0
  pts.push(...inner, pts[0].clone())
  return pts
}

/** 剖口两端的封边：把母线围出的截面填成实心的一片，看过去就是一道丝壁的横断面 */
function cutFace(profile: THREE.Vector2[], phi: number): THREE.BufferGeometry {
  const shape = new THREE.Shape(profile.slice(0, -1).map((p) => p.clone()))
  const geo = new THREE.ShapeGeometry(shape)
  // ShapeGeometry 躺在 XY 平面（x = 半径、y = 轴向），按方位角 φ 立起来
  const e1 = new THREE.Vector3(Math.sin(phi), 0, Math.cos(phi))
  const e2 = new THREE.Vector3(0, 1, 0)
  const e3 = new THREE.Vector3().crossVectors(e1, e2)
  geo.applyMatrix4(new THREE.Matrix4().makeBasis(e1, e2, e3))
  return geo
}

/** 茧壳：旋转体（缺一段方位角）+ 两片封边，最后整体转到「长轴沿 X」 */
function cocoonShellGeometry(): THREE.BufferGeometry {
  const profile = shellProfile()
  const lathe = new THREE.LatheGeometry(profile, 60, PHI_START, PHI_LEN)
  const parts = [lathe, cutFace(profile, PHI_START), cutFace(profile, PHI_START + PHI_LEN)]
  const merged = mergeGeometries(parts)
  for (const p of parts) p.dispose()
  const geo = merged ?? lathe
  // Lathe 绕的是 Y 轴，茧的长轴要沿 +X：转 −90° 后 (x,y,z) → (y,−x,z)，
  // 与 cocoonPoint() 写死的那套坐标一致。
  geo.rotateZ(-Math.PI / 2)
  return geo
}

/**
 * 茧腔内衬：贴着内壁再铺一层更浅的丝面。
 *
 * 为什么要单独一层：茧腔本来就照不进光，壳用的又是同一份中褐材质，
 * 出图时整个腔是一个暗洞，蛹陷在里面读不出形（第二版实拍就是这个毛病）。
 * 真实茧的内层确实比外层浅 —— 内层丝细密光洁，外层混着胶质与杂质。
 * 换一份浅一档的材质，腔就成了「衬着丝的窝」，深褐的蛹立刻从背景里跳出来。
 */
function innerLiningGeometry(): THREE.BufferGeometry {
  const N = 44
  const pts: THREE.Vector2[] = []
  for (let i = 0; i <= N; i++) {
    const v = i / N
    pts.push(
      new THREE.Vector2(
        Math.max(cocoonRadius(v) * CAVITY_RAD * 0.985, 0.004),
        (-COCOON_LEN / 2 + v * COCOON_LEN) * CAVITY_AX * 0.995,
      ),
    )
  }
  const geo = new THREE.LatheGeometry(pts, 56, PHI_START, PHI_LEN)
  geo.rotateZ(-Math.PI / 2)
  return geo
}

/** 缠在茧面上的丝索：34 根沿茧长走、斜度互相错开的细管，合并成一个网格 */
function silkWrapGeometry(): THREE.BufferGeometry | null {
  const STRANDS = 34
  const geos: THREE.BufferGeometry[] = []
  for (let k = 0; k < STRANDS; k++) {
    const f = k / (STRANDS - 1)
    // 留出剖口两侧各 6% 的边距，丝索不能悬在开口上
    const phi0 = PHI_START + PHI_LEN * (0.06 + 0.88 * f)
    // 斜度要**错开**：全都同向平行的话，出图是一只带棱的橄榄球（第二版实拍如此）。
    // 真实的茧丝是来回的 8 字形叠上去的，彼此交叉才像缠绕。
    const drift = ((k % 3) - 1) * 0.34 + (k % 2 === 0 ? 0.08 : -0.08)
    const vFrom = 0.03 + 0.06 * ((k * 3) % 4) / 3
    const vTo = 0.97 - 0.07 * ((k * 5) % 4) / 3
    const steps = 16
    const sections: Section[] = []
    for (let i = 0; i <= steps; i++) {
      const t = i / steps
      const v = THREE.MathUtils.lerp(vFrom, vTo, t)
      const phi = phi0 + drift * (t - 0.5) * 2
      const r = 0.023 * Math.sin(Math.PI * Math.max(t, 0.06)) // 两端收细，像丝头收进壳里
      sections.push({ at: cocoonPoint(v, phi, 1.012), ry: Math.max(r, 0.005), rz: Math.max(r, 0.005) })
    }
    geos.push(loft(sections, 6))
  }
  const merged = mergeGeometries(geos)
  for (const g of geos) g.dispose()
  return merged
}

/**
 * 散丝：茧面上支棱出来的短丝头。
 *
 * 为什么值得单独做：只有壳面 + 贴面的丝索时，出图是一枚光溜溜的黄褐色果子
 * （第一版实拍就像一只芒果）。**丝的质感有一半在剪影上** —— 边缘毛糙才叫丝，
 * 边缘光滑就只能叫壳。90 根细丝按低差异序列铺开，大体顺着茧长方向斜卧，
 * 把轮廓打毛，代价不到 1000 个三角形。
 */
function flossGeometry(): THREE.BufferGeometry | null {
  const N = 90
  const geos: THREE.BufferGeometry[] = []
  for (let i = 0; i < N; i++) {
    // 黄金比的低差异序列：比随机数分布更匀，且完全确定
    const u = (i * 0.6180339887) % 1
    const w = (i * 0.3819660113) % 1
    const v = 0.05 + 0.9 * u
    const phi = PHI_START + PHI_LEN * (0.04 + 0.92 * w)
    const root = cocoonPoint(v, phi, 1.004)
    const radial = new THREE.Vector3(0, -Math.sin(phi), Math.cos(phi))
    const along = i % 2 === 0 ? 1 : -1
    const dir = radial.clone().multiplyScalar(0.42).add(new THREE.Vector3(along * 0.88, 0, 0)).normalize()
    const jitter = Math.abs(Math.sin(i * 12.9898) * 43758.5453) % 1
    const len = 0.16 + 0.2 * jitter
    const geo = new THREE.ConeGeometry(0.009, len, 4)
    const m = new THREE.Matrix4().makeRotationFromQuaternion(
      new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir),
    )
    m.setPosition(root.clone().addScaledVector(dir, len * 0.42))
    geo.applyMatrix4(m)
    geos.push(geo)
  }
  const merged = mergeGeometries(geos)
  for (const g of geos) g.dispose()
  return merged
}

/**
 * 茧柄：柞蚕把茧系在柞树枝上的那束丝，末端绕成一个环。
 * 4 股丝绕着一条微微上翘的轴螺旋而上 —— 一根光溜溜的锥会读成「一根刺」，
 * 绞起来才读成「一束丝」。
 */
function peduncleGroup(silkMat: THREE.Material): THREE.Group {
  const g = new THREE.Group()
  const from = new THREE.Vector3(COCOON_LEN / 2 - 0.12, 0, 0)
  const to = new THREE.Vector3(COCOON_LEN / 2 + 1.75, 0.62, 0)
  const STRANDS = 4
  const geos: THREE.BufferGeometry[] = []
  for (let k = 0; k < STRANDS; k++) {
    const steps = 18
    const sections: Section[] = []
    for (let i = 0; i <= steps; i++) {
      const t = i / steps
      const axis = new THREE.Vector3().lerpVectors(from, to, t)
      // 轴略带上凸的弧
      axis.y += 0.16 * Math.sin(Math.PI * t)
      const twist = (k / STRANDS) * Math.PI * 2 + t * Math.PI * 2.6
      const spread = THREE.MathUtils.lerp(0.16, 0.05, t)
      axis.y += Math.cos(twist) * spread * 0.7
      axis.z += Math.sin(twist) * spread
      const r = THREE.MathUtils.lerp(0.05, 0.026, t)
      sections.push({ at: axis, ry: r, rz: r })
    }
    geos.push(loft(sections, 7))
  }
  const merged = mergeGeometries(geos)
  for (const geo of geos) geo.dispose()
  if (merged) {
    const strands = new THREE.Mesh(merged, silkMat)
    strands.name = 'peduncle'
    g.add(strands)
  }

  // 末端的环：真实茧柄末端绕枝一圈再折回，这里就用一个环表示「套在枝上」
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.045, 8, 20), silkMat)
  ring.name = 'peduncle-loop'
  ring.position.copy(to).add(new THREE.Vector3(0.06, 0.12, 0))
  ring.rotation.y = Math.PI / 2 // 环面含 X 轴，枝条从 Z 方向穿过
  g.add(ring)
  return g
}

// ---------------------------------------------------------------- 蛹本体

/** 蛹长 3.5（真值 3.5~4.5 厘米），最粗处半径 0.78（宽约 1.6 厘米） */
const PUPA_LEN = 3.5
const PUPA_R = 0.78
/** 腹部从这里开始分节：前 36% 是头 + 胸融合的一整块，这个前后对比本身就是蛹的识别特征 */
const ABD_START = 0.36
/** 可见的腹节数 */
const ABD_SEGS = 7

/** p ∈ [0,1]，0 = 头端（+X），1 = 尾端 */
const pupaX = (p: number) => PUPA_LEN * (0.5 - p)

/** 沿体长的半径包络（不含腹节环沟） */
function pupaEnvelope(p: number): number {
  const t = THREE.MathUtils.clamp(p, 0, 1)
  if (t < 0.12) return Math.max(0.54 * Math.sqrt(Math.max(0, 1 - Math.pow((0.12 - t) / 0.12, 2))), 0.012) // 圆头
  if (t < 0.34) return THREE.MathUtils.lerp(0.54, PUPA_R, smooth((t - 0.12) / 0.22)) // 胸部鼓起
  if (t < 0.6) return THREE.MathUtils.lerp(PUPA_R, PUPA_R * 0.92, smooth((t - 0.34) / 0.26))
  if (t < 0.9) return THREE.MathUtils.lerp(PUPA_R * 0.92, 0.32, smooth((t - 0.6) / 0.3))
  return Math.max(0.32 * Math.sqrt(Math.max(0, 1 - Math.pow((t - 0.9) / 0.1, 2))), 0.012) // 圆尾
}

/** 含腹节环沟的实际半径 */
function pupaRadius(p: number): number {
  const e = pupaEnvelope(p)
  if (p < ABD_START) return e
  const local = (((p - ABD_START) / (1 - ABD_START)) * ABD_SEGS) % 1
  const dip = Math.pow(Math.abs(Math.cos(Math.PI * local)), 6)
  return e * (1 - 0.115 * dip)
}

function smooth(t: number): number {
  const x = THREE.MathUtils.clamp(t, 0, 1)
  return x * x * (3 - 2 * x)
}

/** 蛹体表一点。theta 由背中线（+Y）起算朝 +Z 转，180° = 腹中线。 */
function pupaPoint(p: number, theta: number, lift = 0, out = new THREE.Vector3()): THREE.Vector3 {
  const r = pupaEnvelope(p) + lift
  return out.set(pupaX(p), Math.cos(theta) * r, Math.sin(theta) * r)
}

function pupaBodyGeometry(): THREE.BufferGeometry {
  const steps = 130
  const sections: Section[] = []
  for (let i = 0; i <= steps; i++) {
    const p = i / steps
    const r = pupaRadius(p)
    sections.push({ at: new THREE.Vector3(pupaX(p), 0, 0), ry: r, rz: r })
  }
  return loft(sections, 24)
}

/**
 * 腹节间的深色窄环：6 道，卡在腹节沟里。
 * 「腹部分节可见」是本阶段的硬指标，而蛹陷在茧腔的阴影里，
 * 光靠 11% 的半径起伏在漫射光下读不出来 —— 补一圈更深的颜色，任何角度都在。
 * （与幼虫文件的 `segmentRings()` 同一个思路。）
 */
function pupaSegmentRings(mat: THREE.Material): THREE.Mesh[] {
  const out: THREE.Mesh[] = []
  const half = 0.006
  for (let i = 1; i < ABD_SEGS; i++) {
    const p0 = ABD_START + ((1 - ABD_START) * i) / ABD_SEGS
    const sections: Section[] = []
    for (const dp of [-half, 0, half]) {
      const r = pupaRadius(p0 + dp) * 1.012
      sections.push({ at: new THREE.Vector3(pupaX(p0 + dp), 0, 0), ry: r, rz: r })
    }
    const m = new THREE.Mesh(loft(sections, 22, false), mat)
    m.name = 'pupa-segment-ring'
    out.push(m)
  }
  return out
}

/**
 * 贴合体表的壳片（翅芽 / 触角芽 / 足芽都用它）。
 *
 * 关键在 `lift` 的分布：片内是**平台**（恒定抬起），只在边缘 18% 处落回体表，
 * 于是四周出现一道台阶。没有台阶的隆起只会读成「身上有点鼓」，
 * 有台阶才读成「一片盖在身上的壳」—— 这是本阶段最容易做砸的一处。
 *
 * @param center 片的中心线角度：a=0（前端）到 a=1（后端）的两个 theta
 * @param halfWidth 片的半角宽：随 a 变化，两端收窄成尖，中段最宽
 */
function budPatch(
  pFrom: number,
  pTo: number,
  center: (a: number) => number,
  halfWidth: (a: number) => number,
  lift: number,
  side: 1 | -1,
): THREE.BufferGeometry {
  const NA = 26
  const NB = 14
  const positions: number[] = []
  const indices: number[] = []
  const p = new THREE.Vector3()
  for (let i = 0; i <= NA; i++) {
    const a = i / NA
    const pp = THREE.MathUtils.lerp(pFrom, pTo, a)
    const c = center(a)
    const w = halfWidth(a)
    for (let j = 0; j <= NB; j++) {
      const b = j / NB
      const theta = (c + (b * 2 - 1) * w) * side
      const edge = Math.min(smooth(Math.min(a, 1 - a) / 0.18), smooth(Math.min(b, 1 - b) / 0.18))
      pupaPoint(pp, theta, lift * edge, p)
      positions.push(p.x, p.y, p.z)
    }
  }
  const row = NB + 1
  for (let i = 0; i < NA; i++) {
    for (let j = 0; j < NB; j++) {
      const q = i * row + j
      indices.push(q, q + row, q + 1, q + 1, q + row, q + row + 1)
    }
  }
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geo.setIndex(indices)
  geo.computeVertexNormals()
  return geo
}

/** 触角芽上的横棱：雄蛾的羽状触角就折在这条带子里，刻上横棱才看得出是触角而不是一道疤 */
function antennaBudRidges(side: 1 | -1, mat: THREE.Material): THREE.Mesh | null {
  const geos: THREE.BufferGeometry[] = []
  const COMBS = 13
  for (let k = 0; k < COMBS; k++) {
    const a = (k + 0.5) / COMBS
    const pp = THREE.MathUtils.lerp(0.07, 0.33, a)
    const c = THREE.MathUtils.degToRad(THREE.MathUtils.lerp(170, 156, a))
    const w = THREE.MathUtils.degToRad(11)
    const sections: Section[] = []
    for (let i = 0; i <= 6; i++) {
      const b = i / 6
      const theta = (c + (b * 2 - 1) * w) * side
      sections.push({ at: pupaPoint(pp, theta, 0.05), ry: 0.014, rz: 0.014 })
    }
    geos.push(loft(sections, 6))
  }
  const merged = mergeGeometries(geos)
  for (const g of geos) g.dispose()
  if (!merged) return null
  const m = new THREE.Mesh(merged, mat)
  m.name = 'antenna-bud-ridge'
  return m
}

// ---------------------------------------------------------------- 建模主体

export function buildSilkMothPupa(): InsectModel {
  const g = new THREE.Group()

  // 茧：黄褐。丝索比壳面浅一档，「一层层缠上去的丝」才看得出来
  // 不挂 striate 沟纹图：Lathe 的 UV 沿旋转方向走，那张图会在茧内壁上转成一圈圈
  // 同心线，像一张唱片。丝的质感交给缠上去的丝索与散丝，那是几何、不会跑偏。
  const shellMat = chitin({ color: '#b8863c', gloss: 0.16, clearcoat: 0.03 })
  const silkMat = chitin({ color: '#e0b56d', gloss: 0.24, clearcoat: 0.06 })
  // 内衬：比外壳浅一档（真实茧内层丝更细密光洁），把茧腔从暗洞变成衬着丝的窝
  const liningMat = chitin({ color: '#dcb779', gloss: 0.22, clearcoat: 0.05 })
  // 蛹：栗褐。第一版取 #42250f，蛹陷在茧腔的阴影里直接读成一团黑 ——
  // 「深褐」不等于「近黑」，腔内本来就少光，基色还得再抬一档才看得见形。
  const pupaMat = chitin({ color: '#78481a', gloss: 0.5, clearcoat: 0.3 })
  // 腹节间的深色环
  const ringMat = chitin({ color: '#3a1f08', gloss: 0.4 })
  // 翅芽/触角芽比腹部浅一档（有意偏离，理由见文件顶部）
  const budMat = chitin({ color: '#9a6a2e', gloss: 0.56, clearcoat: 0.38 })
  const darkMat = chitin({ color: '#2a1707', gloss: 0.55, clearcoat: 0.3 })

  // ---- 茧壳
  const shell = new THREE.Mesh(cocoonShellGeometry(), shellMat)
  shell.name = 'cocoon-shell'
  g.add(shell)

  const lining = new THREE.Mesh(innerLiningGeometry(), liningMat)
  lining.name = 'cocoon-lining'
  g.add(lining)

  const wrap = silkWrapGeometry()
  if (wrap) {
    const silk = new THREE.Mesh(wrap, silkMat)
    silk.name = 'silk-wrap'
    g.add(silk)
  }

  const floss = flossGeometry()
  if (floss) {
    const fuzz = new THREE.Mesh(floss, silkMat)
    fuzz.name = 'silk-floss'
    g.add(fuzz)
  }

  g.add(peduncleGroup(silkMat))

  // ---- 蛹本体：单独一个 group，好整体摆进茧腔
  const pupa = new THREE.Group()
  pupa.name = 'pupa'

  const body = new THREE.Mesh(pupaBodyGeometry(), pupaMat)
  body.name = 'pupa-body'
  pupa.add(body)

  for (const ring of pupaSegmentRings(ringMat)) pupa.add(ring)

  for (const side of [1, -1] as const) {
    // 翅芽：从胸侧（a=0，theta≈108°）盖到第 4 腹节的腹面（a=1，theta≈154°），
    // 中段最宽 —— 真实翅芽就是这样一片从肩部斜披到腹面的长壳片
    const wingBud = new THREE.Mesh(
      budPatch(
        0.2,
        0.66,
        (a) => THREE.MathUtils.degToRad(108 + 46 * Math.pow(a, 0.8)),
        (a) => THREE.MathUtils.degToRad(6 + 34 * Math.sqrt(Math.sin(Math.PI * Math.pow(a, 0.7)))),
        0.055,
        side,
      ),
      budMat,
    )
    wingBud.name = 'wing-bud'
    pupa.add(wingBud)

    // 触角芽：腹面正中两侧的一对窄带
    const antBud = new THREE.Mesh(
      budPatch(
        0.06,
        0.34,
        (a) => THREE.MathUtils.degToRad(170 - 14 * a),
        () => THREE.MathUtils.degToRad(12),
        0.045,
        side,
      ),
      budMat,
    )
    antBud.name = 'antenna-bud'
    pupa.add(antBud)

    const ridges = antennaBudRidges(side, darkMat)
    if (ridges) pupa.add(ridges)

    // 足芽：触角芽与翅芽之间的一条窄脊（真实蛹上是三对足的壳，这里只取最显眼的一条）
    const legBud = new THREE.Mesh(
      budPatch(0.17, 0.5, (a) => THREE.MathUtils.degToRad(163 + 8 * a), () => THREE.MathUtils.degToRad(6), 0.035, side),
      budMat,
    )
    legBud.name = 'leg-bud'
    pupa.add(legBud)

    // 复眼芽：头侧的一对小隆起，深色
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.11, 12, 9), darkMat)
    eye.name = 'eye-bud'
    eye.position.copy(pupaPoint(0.11, THREE.MathUtils.degToRad(108) * side, -0.03))
    eye.scale.set(0.9, 1, 0.6)
    pupa.add(eye)

    // 蛹的气门：腹节侧面的一列小黑点，分节感靠它再加一层
    for (let k = 0; k < 5; k++) {
      const pp = ABD_START + 0.07 + (k / 5) * 0.45
      const sp = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 6), darkMat)
      sp.name = 'pupal-spiracle'
      sp.position.copy(pupaPoint(pp, THREE.MathUtils.degToRad(96) * side, -0.015))
      sp.scale.set(1.1, 0.55, 0.5)
      pupa.add(sp)
    }
  }

  /*
   * 摆进茧腔：
   * - 沿体轴滚 −46°，把腹面（翅芽、触角芽所在的那一侧）转向剖口，
   *   否则从默认机位看过去只能看到蛹背，本阶段的看点就废了。
   *   真实的蛹在茧里本来就不分上下，这个滚转不违反任何形态学事实。
   * - 整体下沉 0.3：蛹靠在茧腔底部，而不是悬在正中。
   * - 前移 0.18：蛹头朝茧的前端（茧柄那端），这是真实的取向。
   */
  pupa.rotation.x = THREE.MathUtils.degToRad(-52)
  pupa.position.set(-0.25, 0.0, 0)
  g.add(pupa)

  // ---- anchors（蛹上的锚点要过一遍蛹自己的变换）
  g.updateMatrixWorld(true)
  const onPupa = (p: number, theta: number, lift = 0) => pupa.localToWorld(pupaPoint(p, THREE.MathUtils.degToRad(theta), lift))

  const anchors: Record<string, THREE.Vector3> = {
    cocoon: cocoonPoint(0.45, PHI_START + PHI_LEN * 0.5, 1.0),
    peduncle: new THREE.Vector3(COCOON_LEN / 2 + 1.0, 0.5, 0),
    wingBud: onPupa(0.44, 132, 0.055),
    antennaBud: onPupa(0.18, 164, 0.045),
    abdomen: onPupa(0.72, 0, 0),
  }

  return finalize(g, anchors)
}
