/**
 * 中华虎甲 · 幼虫 Cicindela chinensis（完全变态第 2 阶段）
 *
 * ## 这只幼虫是一台「长在洞口的捕兽夹」
 *
 * 成虫是地表跑得最快的猎手；幼虫反过来一步不走 —— 它在沙土里挖一条垂直的洞，
 * 身体吊在洞里，只把**头和前胸背板**顶在洞口，两块骨片合起来恰好堵满洞口，
 * 平贴地面，像一只盖在洞上的小盘子。蚂蚁、小虫从盘子上走过，它猛地后仰、
 * 上颚一合，把猎物拖进洞里。整个生活史里最值得讲的就是这一格，所以这份文件的
 * 每一个决定都在回答同一个问题：**这几处招牌能不能一眼看见**。
 *
 * ## 招牌结构
 *
 * 1. **头 + 前胸背板 = 一块平的深色金属盘。** 头宽 0.40、前胸背板宽 0.54，
 *    两块首尾相接、顶面平齐（都在 y≈0.12），背腹极扁（头厚 0.17、背板厚 0.12）。
 *    颜色是古铜绿金属（`#56603a`，明度 0.30、金属度 0.55）对苍白虫身
 *    （`#ede3c8`，明度 0.86），差 0.56。**这个明度差本身就是招牌** ——
 *    「越深越保险」害过 10 只里 7 只的招牌，这里反过来也不许为了「金属感」压到近黑：
 *    近黑会把盘面的体积与金属高光一起吃掉。
 * 2. **上颚大、向上弯。** 自头前缘伸出，先向前、再向上翻起、尖端向内收，
 *    长 0.33（头长 0.38 的九成），内缘近基部一枚小齿。蹲在洞口时颚是张开朝天的 ——
 *    那正是它等猎物踩上来的姿态。
 * 3. **头顶几对单眼。** 虎甲幼虫每侧 6 枚单眼，其中背面**两对特别大**
 *    （向上看天空里的猎物与天敌）。本文件每侧做 2 大 2 小，大的直径 0.07。
 *    深色盘面上黑色单眼靠的是**形**（半球凸起 + 高清漆高光），不是颜色。
 * 4. **第 5 腹节背面的驼峰 + 两对前弯钩刺。** 驼峰是体壁本身鼓起来的（放样截面
 *    在那一节向背侧加厚 0.11，与虫身一体，不是贴上去的一块），顶上内侧一对大钩、
 *    外侧一对小钩，都**向前（朝头）弯**。它把驼峰抵进洞壁、钩子扎进去 ——
 *    猎物再大也拖不出洞口。钩子深琥珀色（明度 0.29），在苍白的驼峰上一眼可见。
 * 5. **身体其余部分苍白柔软、S 形弯曲。** 洞是竖的，虫身吊在里面并不笔直：
 *    前胸之后先向下折 90°（盘子是平的、身子是竖的，折角就在中胸），再在腹部
 *    缓缓 S 形摆一下，驼峰顶在洞壁一侧。
 *
 * ## 建模方法：先直着做，再整体弯
 *
 * 所有贴在虫身上的件（体壁、驼峰、钩刺、足、盘、颚、单眼）都先在一个**直的
 * 体坐标系**里做：x = 从尾尖量起的弧长、y = 背侧、z = 右侧。做完后逐顶点映射到
 * 一条弯曲的中心线上（`bend()`，位置与法线一起映射）。这样「驼峰在第 5 腹节
 * 背面」「钩子朝头弯」这类话在代码里就是字面意思，而不必在一条 S 形曲线上
 * 逐件解局部坐标 —— 一旦改了弯曲形状，所有附件自动跟着走，不会有件留在原处穿模。
 *
 * ## 语境：洞口的一圈沙
 *
 * 一圈薄薄的沙面，中间一个与盘子同形的洞，盘子的顶面只比沙面高 0.03。这圈沙刻意
 * 做得很窄（沙沿宽约 0.2）：它只需要说清「盘子堵在洞口、身子吊在地下」，
 * 不许挡住下面的虫身。**不做洞壁**：洞壁会把驼峰、钩刺、S 形整个包起来，
 * 等于把招牌挡掉（判据与 `longhorn-beetle-larva.ts` 不做虫道是同一条）。
 * 顶视机位因此只看得见洞口的盘子 —— 这恰好就是野外从上往下看到的样子。
 *
 * ## 尺寸
 *
 * 末龄体长 2.62 厘米（真实 2~3，模型 1 = 1 厘米），比 1.8~2 厘米的成虫还长。
 *
 * 局部坐标系与成虫一致：+X 向前（头所指的方向）、+Y 向上、+Z 向右。
 */
import * as THREE from 'three'
import { chitin, finalize, loft, type InsectModel, type Section } from '../kit'

// ---------------------------------------------------------------- 体轴分段（直体坐标 s：尾尖 0 → 头前缘 BODY_LEN）

const BODY_LEN = 2.62
/** 头：2.24 ~ 2.62 */
const HEAD_FROM = 2.24
/** 前胸背板：1.84 ~ 2.30（前缘压在头的后缘下面一点，两块才接得上） */
const PRO_FROM = 1.84
const PRO_TO = 2.3
/** 中胸、后胸各 0.14；腹部 10 节从 1.56 排到尾尖 */
const MESO_FROM = 1.7
const META_FROM = 1.56
/** 腹节分界（从前往后）：A1..A8 各 0.17，A9 0.12，A10 0.08 */
const ABD_BOUNDS = [1.56, 1.39, 1.22, 1.05, 0.88, 0.71, 0.54, 0.37, 0.2, 0.08, 0] as const
/** 第 5 腹节的中点：驼峰所在 */
const A5_MID = (ABD_BOUNDS[4] + ABD_BOUNDS[5]) / 2
/** 虫身放样的前端（藏在头壳里） */
const TRUNK_TO = 2.45

/** 驼峰：比体壁向背侧多鼓出的高度，与沿体轴的半长 */
const HUMP_RISE = 0.11
const HUMP_HALF = 0.1

// ---------------------------------------------------------------- 颜色

/** 虫身：苍白偏奶油（明度 0.86）。不压深 —— 压深就是脏灰 */
const BODY_COLOR = '#ede3c8'
/** 头与前胸背板：古铜绿金属。明度 0.30，与虫身差 0.56 */
const SHIELD_COLOR = '#56603a'
/** 上颚：深琥珀褐，与盘面同一明度档但色相分开（偏红），翘在盘上方靠剪影读 */
const JAW_COLOR = '#6e4220'
/** 单眼：近黑，靠高清漆的高光与半球的形读出来 */
const STEMMA_COLOR = '#141210'
/** 钩刺：深琥珀色（明度 0.29），在苍白驼峰上一眼可见 */
const HOOK_COLOR = '#7a4a1c'
/** 足与触角：浅褐，比虫身深一档 */
const LEG_COLOR = '#c9ab78'
/** 刚毛 */
const SETA_COLOR = '#6b5436'
/** 洞口沙面 */
const SAND_COLOR = '#c2a878'

// ---------------------------------------------------------------- 小工具

/** 分段线性 + smoothstep 的关键帧插值 */
function keyframe(keys: readonly (readonly [number, number])[], t: number): number {
  const x = THREE.MathUtils.clamp(t, keys[0][0], keys[keys.length - 1][0])
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

/** 沿一串点放样一根收尖的管（钩刺、足节、触角、刚毛都用它） */
function tube(pts: THREE.Vector3[], r0: number, r1: number, radial = 10): THREE.BufferGeometry {
  const sections: Section[] = pts.map((at, i) => {
    const r = THREE.MathUtils.lerp(r0, r1, i / (pts.length - 1))
    return { at, ry: r, rz: r }
  })
  return loft(sections, radial)
}

/** 二次贝塞尔采样 */
function bezier(p0: THREE.Vector3, p1: THREE.Vector3, p2: THREE.Vector3, steps: number): THREE.Vector3[] {
  const out: THREE.Vector3[] = []
  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    const u = 1 - t
    out.push(
      new THREE.Vector3()
        .addScaledVector(p0, u * u)
        .addScaledVector(p1, 2 * u * t)
        .addScaledVector(p2, t * t),
    )
  }
  return out
}

// ---------------------------------------------------------------- 弯曲的中心线

/**
 * 中心线切向角 θ(s)（从 +X 逆时针量，度）。
 *
 * - s ≥ BEND_TO（头与前胸背板的前大半）：θ = 0，盘子是平的。
 * - BEND_FROM ~ BEND_TO：θ 从竖直转回 0 —— 中后胸那一折，把竖着的身子接到
 *   平的盘子上。折角有一截落在前胸背板底下：背板是一块刚性的盾，身子在它
 *   下面弯下去，盾本身不跟着弯（见 `bend()` 的 rigidFrom）。
 * - 1.0 ~ 1.6（腹前段）：θ 比 90° 多出 55°，身子一边往下一边**往盘子底下收**。
 *   不收的话（第一版）整条虫在盘子后缘之外 0.5 处垂下去，洞口根本堵不住 ——
 *   盘子成了一块搭在洞边的板。
 * - 腹部：90° 上下叠一个 S 形摆动（幅 28°）。θ > 90° 时往下走偏向 +X（腹侧），
 *   θ < 90° 时偏向 −X（背侧）。相位钉在第 5 腹节：它上方偏腹侧、下方偏背侧，
 *   于是驼峰那一段正好是整条虫**最往背侧（−X）顶出去**的地方 —— 驼峰抵住洞壁。
 */
function thetaDeg(s: number): number {
  const ss = THREE.MathUtils.smoothstep
  const sway = -28 * Math.sin(((s - A5_MID) / 1.4) * Math.PI * 2) * ss(s, 0.05, 0.5)
  const body = 90 + sway * (1 - ss(s, 1.1, 1.4)) + 55 * ss(s, 1.0, 1.3)
  return body * (1 - ss(s, BEND_FROM, BEND_TO))
}

interface Frame {
  c: THREE.Vector3
  t: THREE.Vector3
  n: THREE.Vector3
}

/**
 * 整只虫绕竖轴转 60°，头朝 (+X, −Z) 之间。
 *
 * 身子吊下去之后背面朝盘子的反方向（头朝 +X 时背面朝 −X），驼峰与钩刺就长在
 * 背面。展台默认机位在右前上方 (0.86, 0.44, 1.25)，头若正朝 +X，驼峰整个背对
 * 镜头，只剩两根钩尖从剪影边上露出来（交付前补渲 home 机位时看到的）。
 * 转 60° 之后背面朝 (−0.5, 0, 0.87)：home 与侧视机位都斜对着驼峰；盘子是水平的，
 * 怎么转都不影响从上面看它。洞里的虫没有「前方」可言，这个转角不改任何形态。
 */
const YAW_DEG = 60

/** 中后胸那一折的起止（弧长 s） */
const BEND_FROM = 1.7
const BEND_TO = 2.02

const CURVE_STEPS = 1200

/** 从头前缘（原点）往尾积分出整条中心线。头前缘放在原点，盘子的高度由它定 */
const CURVE: Frame[] = (() => {
  const frames: Frame[] = new Array(CURVE_STEPS + 1)
  const ds = BODY_LEN / CURVE_STEPS
  let c = new THREE.Vector3(0, 0, 0)
  for (let i = CURVE_STEPS; i >= 0; i--) {
    const s = i * ds
    const th = THREE.MathUtils.degToRad(thetaDeg(s))
    const t = new THREE.Vector3(Math.cos(th), Math.sin(th), 0)
    const n = new THREE.Vector3(-Math.sin(th), Math.cos(th), 0)
    frames[i] = { c: c.clone(), t, n }
    // 往尾走 = 沿 −t 走
    c = c.addScaledVector(t, -ds)
  }
  return frames
})()

function frameAt(s: number): Frame {
  const u = THREE.MathUtils.clamp(s / BODY_LEN, 0, 1) * CURVE_STEPS
  const i = Math.min(Math.floor(u), CURVE_STEPS - 1)
  const k = u - i
  const a = CURVE[i]
  const b = CURVE[i + 1]
  const f: Frame = {
    c: a.c.clone().lerp(b.c, k),
    t: a.t.clone().lerp(b.t, k).normalize(),
    n: a.n.clone().lerp(b.n, k).normalize(),
  }
  // 越出两端时沿端点切向直线外推（上颚伸出头前缘之外就走这条）
  if (s > BODY_LEN) f.c.addScaledVector(f.t, s - BODY_LEN)
  if (s < 0) f.c.addScaledVector(f.t, s)
  return f
}

/** 直体坐标 → 弯曲后的模型坐标 */
function bendPoint(p: THREE.Vector3): THREE.Vector3 {
  const f = frameAt(p.x)
  return f.c.clone().addScaledVector(f.n, p.y).add(new THREE.Vector3(0, 0, p.z))
}

/**
 * 把一件在直体坐标里做好的几何整体弯过去：位置按中心线映射，法线按同一标架转。
 *
 * `rigidFrom`：给刚性骨片用。s 小于它的部分不跟着中心线弯，而是沿 rigidFrom
 * 处的切向直线外推 —— 前胸背板的后缘伸进了折角区，它是一块硬盾，
 * 身子在它下面折下去，盾自己仍是平的。
 */
function bend(geo: THREE.BufferGeometry, rigidFrom = -Infinity): THREE.BufferGeometry {
  const pos = geo.getAttribute('position')
  const nor = geo.getAttribute('normal')
  const p = new THREE.Vector3()
  const n = new THREE.Vector3()
  for (let i = 0; i < pos.count; i++) {
    p.fromBufferAttribute(pos, i)
    const f = frameAt(Math.max(p.x, rigidFrom))
    if (p.x < rigidFrom) f.c.addScaledVector(f.t, p.x - rigidFrom)
    const q = f.c.clone().addScaledVector(f.n, p.y)
    pos.setXYZ(i, q.x, q.y, p.z)
    if (nor) {
      n.fromBufferAttribute(nor, i)
      const m = new THREE.Vector3().addScaledVector(f.t, n.x).addScaledVector(f.n, n.y)
      m.z += n.z
      m.normalize()
      nor.setXYZ(i, m.x, m.y, m.z)
    }
  }
  pos.needsUpdate = true
  if (nor) nor.needsUpdate = true
  geo.computeBoundingBox()
  geo.computeBoundingSphere()
  return geo
}

function bentMesh(geo: THREE.BufferGeometry, material: THREE.Material, name: string, rigidFrom?: number): THREE.Mesh {
  const m = new THREE.Mesh(bend(geo, rigidFrom), material)
  m.name = name
  return m
}

// ---------------------------------------------------------------- 虫身

/** 体壁半径（圆截面）。腹中段最粗，胸部收细，前端钻进头壳里 */
const TRUNK_R = [
  [0.0, 0.07],
  [0.1, 0.105],
  [0.25, 0.14],
  [0.5, 0.165],
  [0.8, 0.172],
  [1.2, 0.162],
  [1.5, 0.148],
  [1.65, 0.138],
  [1.8, 0.128],
  [1.95, 0.112],
  [2.2, 0.1],
  [2.35, 0.08],
  [2.45, 0.05],
] as const

/** 体节分界：腹部 10 节 + 中胸/后胸前缘 */
const SEG_BOUNDS = [...ABD_BOUNDS.slice(1, 10), META_FROM, MESO_FROM, PRO_FROM]

/**
 * 节间沟：窄而浅的折痕，数得出节、又不读成松果鳞片（蛴螬那一轮的红线是 9%）。
 */
const GROOVE = 0.075
function groove(s: number): number {
  let g = 0
  for (const b of SEG_BOUNDS) {
    const d = (s - b) / 0.035
    if (Math.abs(d) < 1) g = Math.max(g, Math.pow(Math.cos((d * Math.PI) / 2), 2))
  }
  return 1 - GROOVE * g
}

/** 驼峰在 s 处的鼓起量（0 ~ HUMP_RISE） */
function humpAt(s: number): number {
  const d = (s - A5_MID) / HUMP_HALF
  return Math.abs(d) < 1 ? HUMP_RISE * Math.pow(Math.cos((d * Math.PI) / 2), 1.5) : 0
}

function trunkRadius(s: number): number {
  let r = keyframe(TRUNK_R, s) * groove(s)
  // 尾端球冠
  if (s < 0.06) r *= Math.sqrt(Math.max(0, 1 - Math.pow(1 - s / 0.06, 2)))
  return Math.max(r, 1e-4)
}

/** 直体坐标下虫身的背面高度（驼峰顶也算）：钩刺、刚毛按它落位 */
function dorsalY(s: number): number {
  return trunkRadius(s) + humpAt(s)
}

/**
 * 虫身：圆截面放样，第 5 腹节处截面中心向背侧抬 hump/2、背腹半径加 hump/2 ——
 * 于是腹面不动、背面鼓起一个驼峰，与体壁是**同一张面**，没有接缝。
 */
function trunkGeometry(): THREE.BufferGeometry {
  const steps = 300
  const sections: Section[] = []
  for (let i = 0; i <= steps; i++) {
    const s = (i / steps) * TRUNK_TO
    const r = trunkRadius(s)
    const h = humpAt(s)
    sections.push({ at: new THREE.Vector3(s, h / 2, 0), ry: r + h / 2, rz: r })
  }
  return loft(sections, 28)
}

// ---------------------------------------------------------------- 头盘：头 + 前胸背板

/** 前胸背板半宽剖面：前窄后宽再收，最宽 0.27 */
const PRO_HALF_W = [
  [1.84, 0.14],
  [1.9, 0.23],
  [2.0, 0.27],
  [2.16, 0.265],
  [2.26, 0.2],
  [2.3, 0.1],
] as const
/** 前胸背板截面中心高与半厚：顶面在 0.125，盖住下面半径 0.11 的胸部 */
const PRO_Y = 0.065
const PRO_HALF_T = 0.06

/** 头的半宽剖面：最宽 0.2（头宽 0.40，比前胸背板窄一圈） */
const HEAD_HALF_W = [
  [2.24, 0.13],
  [2.3, 0.18],
  [2.42, 0.2],
  [2.52, 0.19],
  [2.59, 0.14],
  [2.62, 0.05],
] as const
const HEAD_Y = 0.035
/** 头的半厚随宽度走，但整体极扁 */
function headHalfT(s: number): number {
  return 0.03 + 0.3 * keyframe(HEAD_HALF_W, s)
}
/** 头顶面高度（单眼按它落位） */
function headTop(s: number, z: number): number {
  const w = keyframe(HEAD_HALF_W, s)
  const k = Math.min(Math.abs(z) / w, 0.999)
  return HEAD_Y + headHalfT(s) * Math.sqrt(1 - k * k)
}

function pronotumGeometry(): THREE.BufferGeometry {
  const steps = 24
  const sections: Section[] = []
  for (let i = 0; i <= steps; i++) {
    const s = THREE.MathUtils.lerp(PRO_FROM, PRO_TO, i / steps)
    const edge = Math.min((s - PRO_FROM) / 0.05, (PRO_TO - s) / 0.04, 1)
    sections.push({
      at: new THREE.Vector3(s, PRO_Y, 0),
      ry: Math.max(PRO_HALF_T * (0.4 + 0.6 * edge), 1e-3),
      rz: keyframe(PRO_HALF_W, s),
    })
  }
  return loft(sections, 32)
}

function headGeometry(): THREE.BufferGeometry {
  const steps = 22
  const sections: Section[] = []
  for (let i = 0; i <= steps; i++) {
    const s = THREE.MathUtils.lerp(HEAD_FROM, BODY_LEN, i / steps)
    sections.push({ at: new THREE.Vector3(s, HEAD_Y, 0), ry: headHalfT(s), rz: keyframe(HEAD_HALF_W, s) })
  }
  return loft(sections, 32)
}

/**
 * 上颚：先向前、再向上翻、尖端向内收。
 * 张开朝天是它守在洞口等猎物的姿态；做成平伸的一对钳，剪影就跟成虫的
 * 镰刀颚没有区别了 —— 「向上弯」是幼虫颚的辨识点。
 */
function jawGeometries(): THREE.BufferGeometry[] {
  const out: THREE.BufferGeometry[] = []
  for (const side of [1, -1] as const) {
    // 控制点压在基部正前上方：颚一出头壳就开始往上翻。第一版先平伸 0.2 再翻，
    // 平伸那一截钻到了洞口沙面底下，顶视里两颚像两枚断开的逗号躺在沙上
    const pts = bezier(
      new THREE.Vector3(2.57, 0.05, side * 0.1),
      new THREE.Vector3(2.76, 0.1, side * 0.16),
      new THREE.Vector3(2.74, 0.36, side * 0.05),
      16,
    )
    out.push(tube(pts, 0.045, 0.006, 12))
    // 内缘近基部一枚小齿
    const base = pts[5]
    out.push(
      tube([base.clone(), base.clone().add(new THREE.Vector3(0.02, 0.04, -side * 0.06))], 0.018, 0.004, 8),
    )
  }
  return out
}

/** 单眼：每侧 2 大 2 小。[s, 离中线, 半径] */
const STEMMATA: readonly (readonly [number, number, number])[] = [
  [2.44, 0.115, 0.036],
  [2.35, 0.15, 0.031],
  [2.51, 0.16, 0.017],
  [2.29, 0.175, 0.015],
]

function stemmaGeometries(): THREE.BufferGeometry[] {
  const out: THREE.BufferGeometry[] = []
  for (const [s, zAbs, r] of STEMMATA) {
    for (const side of [1, -1] as const) {
      const geo = new THREE.SphereGeometry(r, 16, 10)
      geo.scale(1, 0.62, 1)
      geo.translate(s, headTop(s, zAbs) - r * 0.12, side * zAbs)
      out.push(geo)
    }
  }
  return out
}

/** 触角：4 节短触角，自头前侧斜向前上方伸出 */
function antennaGeometries(): THREE.BufferGeometry[] {
  const out: THREE.BufferGeometry[] = []
  for (const side of [1, -1] as const) {
    const pts = [
      new THREE.Vector3(2.55, 0.05, side * 0.17),
      new THREE.Vector3(2.6, 0.08, side * 0.21),
      new THREE.Vector3(2.64, 0.11, side * 0.24),
      new THREE.Vector3(2.67, 0.13, side * 0.26),
      new THREE.Vector3(2.69, 0.145, side * 0.275),
    ]
    out.push(tube(pts, 0.02, 0.008, 8))
  }
  return out
}

/** 盘面沿前缘与侧缘的一排短刚毛：真实的头与前胸背板边缘都生着一圈毛 */
function shieldSetae(): THREE.BufferGeometry[] {
  const out: THREE.BufferGeometry[] = []
  for (let i = 0; i < 7; i++) {
    const s = THREE.MathUtils.lerp(1.9, 2.26, i / 6)
    const w = keyframe(PRO_HALF_W, s)
    for (const side of [1, -1] as const) {
      const base = new THREE.Vector3(s, PRO_Y + 0.01, side * (w - 0.01))
      out.push(tube([base, base.clone().add(new THREE.Vector3(0.01, 0.05, side * 0.03))], 0.006, 0.002, 5))
    }
  }
  return out
}

// ---------------------------------------------------------------- 驼峰钩刺

/**
 * 第 5 腹节背面的两对钩刺：内侧一对大、外侧一对小，都自驼峰顶竖起、
 * 向前（+s，朝头）弯下去，尖端略朝下 —— 是扎进洞壁的倒钩，不是朝天的角。
 */
function hookGeometries(): { hooks: THREE.BufferGeometry[]; setae: THREE.BufferGeometry[] } {
  const hooks: THREE.BufferGeometry[] = []
  const plan = [
    // [基部 s 偏移, 离中线, 竖起高度, 前弯量, 基部半径]
    [0.0, 0.05, 0.12, 0.14, 0.03],
    [-0.035, 0.115, 0.075, 0.09, 0.022],
  ] as const
  for (const [ds, zAbs, rise, reach, r0] of plan) {
    for (const side of [1, -1] as const) {
      const s0 = A5_MID + ds
      // 基部落在驼峰表面：驼峰截面在 z 处的高度
      const top = dorsalY(s0)
      const rr = trunkRadius(s0) + humpAt(s0) / 2
      const y0 = humpAt(s0) / 2 + rr * Math.sqrt(Math.max(0, 1 - Math.pow(zAbs / trunkRadius(s0), 2))) - 0.01
      const p0 = new THREE.Vector3(s0, Math.min(y0, top), side * zAbs)
      const p1 = p0.clone().add(new THREE.Vector3(-0.01, rise * 1.25, side * 0.01))
      const p2 = p0.clone().add(new THREE.Vector3(reach, rise * 0.75, side * 0.015))
      hooks.push(tube(bezier(p0, p1, p2, 14), r0, 0.004, 10))
    }
  }
  // 驼峰上的几根刚毛
  const setae: THREE.BufferGeometry[] = []
  for (const [ds, zAbs] of [
    [-0.07, 0.03],
    [0.06, 0.08],
    [-0.02, 0.15],
  ] as const) {
    for (const side of [1, -1] as const) {
      const s0 = A5_MID + ds
      const base = new THREE.Vector3(s0, dorsalY(s0) - 0.02 - zAbs * 0.4, side * zAbs)
      setae.push(tube([base, base.clone().add(new THREE.Vector3(-0.02, 0.08, side * 0.03))], 0.006, 0.002, 5))
    }
  }
  return { hooks, setae }
}

// ---------------------------------------------------------------- 足

/**
 * 三对胸足：细长、分节，腹面伸出。虎甲幼虫的足能用（挖洞时撑壁、爬出洞化蛹前后），
 * 但在洞里吊着时只是收在腹侧 —— 这里做成半收的姿态。
 */
function legGeometries(): THREE.BufferGeometry[] {
  const out: THREE.BufferGeometry[] = []
  const at = [2.06, MESO_FROM + 0.085, META_FROM + 0.085]
  for (const s of at) {
    const r = trunkRadius(s)
    for (const side of [1, -1] as const) {
      const coxa = new THREE.Vector3(s, -r * 0.55, side * r * 0.72)
      const knee = coxa.clone().add(new THREE.Vector3(0.06, -0.08, side * 0.14))
      const ankle = knee.clone().add(new THREE.Vector3(-0.1, -0.12, side * 0.02))
      const tip = ankle.clone().add(new THREE.Vector3(-0.07, -0.02, side * -0.01))
      out.push(tube([coxa, coxa.clone().lerp(knee, 0.5), knee], 0.03, 0.022, 8))
      out.push(tube([knee, knee.clone().lerp(ankle, 0.5), ankle], 0.022, 0.016, 8))
      out.push(tube([ankle, tip], 0.015, 0.005, 8))
      const kneeBall = new THREE.SphereGeometry(0.024, 8, 6)
      kneeBall.translate(knee.x, knee.y, knee.z)
      out.push(kneeBall)
    }
  }
  return out
}

// ---------------------------------------------------------------- 洞口沙面

/**
 * 洞口一圈沙：外缘不规则的薄片，中间的洞**按盘子的轮廓挖**（盘子外扩 0.025）。
 *
 * 第一、二版挖的是椭圆洞：盘子是前窄（头）后宽（前胸背板）的葫芦形，椭圆罩不住
 * 头前的两角，头的前缘连同颚基一起钻到沙面底下，顶视里两颚成了两枚断开的逗号；
 * 椭圆在盘子后缘又多出一大块空，露出底下苍白的折角 —— 洞口「堵不满」。
 * 按轮廓挖之后，盘子与洞口之间只剩一道窄缝：这才是「堵满洞口」。
 *
 * 盘子是刚性、沿 +X 平放的，头前缘在原点，所以直体坐标 s 在世界里就是 x = s − BODY_LEN。
 * 沙面比盘顶低 0.03：盘子「平贴地面」，但齐平的两个面在渲染里会糊成一片。
 */
function plateHalfWidth(s: number): number {
  let w = 0
  if (s >= PRO_FROM && s <= PRO_TO) w = Math.max(w, keyframe(PRO_HALF_W, s))
  if (s >= HEAD_FROM && s <= BODY_LEN) w = Math.max(w, keyframe(HEAD_HALF_W, s))
  return w
}

function sandCollar(top: number): THREE.BufferGeometry {
  const MARGIN = 0.025
  const cx = (PRO_FROM + BODY_LEN) / 2 - BODY_LEN
  const shape = new THREE.Shape()
  const N = 56
  for (let i = 0; i <= N; i++) {
    const a = (i / N) * Math.PI * 2
    const r = 0.5 + 0.04 * Math.sin(a * 3 + 0.4) + 0.03 * Math.sin(a * 7 - 1.1)
    const x = cx + Math.cos(a) * r * 1.25
    const y = Math.sin(a) * r
    if (i === 0) shape.moveTo(x, y)
    else shape.lineTo(x, y)
  }
  // 洞：沿盘子右缘从后往前、再沿左缘从前往后；两端各补一个圆头
  const pts: THREE.Vector2[] = []
  const M = 40
  const s0 = PRO_FROM - MARGIN
  const s1 = BODY_LEN + MARGIN
  for (let i = 0; i <= M; i++) {
    const t = i / M
    const sArc = THREE.MathUtils.lerp(s0, s1, t)
    const w = plateHalfWidth(THREE.MathUtils.clamp(sArc, PRO_FROM, BODY_LEN)) + MARGIN
    // 两端 8% 收成圆头，不然洞的前后缘是两刀直切
    const end = Math.min(t, 1 - t) / 0.08
    const round = end < 1 ? Math.sqrt(Math.max(0.05, 1 - Math.pow(1 - end, 2))) : 1
    pts.push(new THREE.Vector2(sArc - BODY_LEN, w * round))
  }
  for (let i = M; i >= 0; i--) pts.push(new THREE.Vector2(pts[i].x, -pts[i].y))
  shape.holes.push(new THREE.Path(pts))
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: 0.03,
    bevelEnabled: true,
    bevelSize: 0.012,
    bevelThickness: 0.01,
    bevelSegments: 2,
    curveSegments: 8,
  })
  // XY 平面 → XZ 平面（形状的 y 落到 +Z），厚度朝 −Y；再把斜角的上沿对到 top
  geo.rotateX(Math.PI / 2)
  geo.translate(0, top - 0.01, 0)
  return geo
}

// ---------------------------------------------------------------- 绕向

/**
 * 让每个三角面的绕向与它的顶点法线一致（空操作之外只翻 loft 的侧面）。
 * 缘由见 `tiger-beetle-egg.ts` 同名函数：kit.loft() 的侧面绕向与外法线相反，
 * 配上 finalize() 的 DoubleSide，loft 件都按朝内的法线受光。苍白光滑的虫身上
 * 这会让体积感整个反过来（受光面发暗），所以本文件在 finalize 前自行校正。
 */
function orientFaces(root: THREE.Object3D): void {
  const a = new THREE.Vector3()
  const b = new THREE.Vector3()
  const c = new THREE.Vector3()
  const n = new THREE.Vector3()
  root.traverse((o) => {
    const mesh = o as THREE.Mesh
    if (!mesh.isMesh) return
    const geo = mesh.geometry
    const idx = geo.index
    const pos = geo.getAttribute('position')
    const nor = geo.getAttribute('normal')
    if (!idx || !nor) return
    for (let i = 0; i < idx.count; i += 3) {
      const i0 = idx.getX(i)
      const i1 = idx.getX(i + 1)
      const i2 = idx.getX(i + 2)
      a.fromBufferAttribute(pos, i0)
      b.fromBufferAttribute(pos, i1).sub(a)
      c.fromBufferAttribute(pos, i2).sub(a)
      const face = b.cross(c)
      n.fromBufferAttribute(nor, i0)
        .add(a.fromBufferAttribute(nor, i1))
        .add(a.fromBufferAttribute(nor, i2))
      if (face.dot(n) < 0) {
        idx.setX(i + 1, i2)
        idx.setX(i + 2, i1)
      }
    }
    idx.needsUpdate = true
  })
}

// ---------------------------------------------------------------- 装配

export function buildTigerBeetleLarva(): InsectModel {
  const g = new THREE.Group()

  // 虫身：哑光软体。**不开 translucent** —— 天牛幼虫那一轮，长直体开了透射
  // 整条虫被渲成一块透镜。苍白靠颜色本身，哑光防过曝
  const bodyMat = chitin({ color: BODY_COLOR, gloss: 0.3, clearcoat: 0.06 })
  // 盘：金属 + 适度清漆，刻点法线让盘面在近景有骨片质感
  /*
   * 盘面的掠射反射要压住。侧视与前斜机位几乎贴着盘面看过去（仰角 16°），而盘是
   * 一整块平面：前三版不论怎么降光泽（0.7→0.45）、金属（0.55→0.2）、清漆（0.4→0.1），
   * 掠射角的菲涅耳反射都把整块盘刷成一条灰白带，古铜绿消失，读成苍白虫身的一部分。
   * 病根是菲涅耳而不是光泽，所以直接去掉清漆、把镜面强度压到 0.3 ——
   * 顶视里仍留有金属的暗泽，掠射角下不再发白
   */
  const shieldMat = chitin({ color: SHIELD_COLOR, gloss: 0.55, metal: 0.3, clearcoat: 0, surface: 'punctate' })
  shieldMat.specularIntensity = 0.3
  const jawMat = chitin({ color: JAW_COLOR, gloss: 0.7, metal: 0.2, clearcoat: 0.45 })
  const stemmaMat = chitin({ color: STEMMA_COLOR, gloss: 0.95, clearcoat: 1, surface: 'smooth' })
  const hookMat = chitin({ color: HOOK_COLOR, gloss: 0.68, clearcoat: 0.4 })
  const legMat = chitin({ color: LEG_COLOR, gloss: 0.4, clearcoat: 0.1 })
  const setaMat = chitin({ color: SETA_COLOR, gloss: 0.3 })
  const sandMat = chitin({ color: SAND_COLOR, gloss: 0.12, clearcoat: 0, surface: 'punctate' })

  /*
   * 整只虫（连洞口）绕竖轴转 YAW_DEG，见常量注释。几何全部挂在 pose 里，
   * finalize 的居中与包围球照旧在根 group 上算；锚点套同一个旋转。
   */
  const pose = new THREE.Group()
  pose.name = 'larva-pose'
  pose.rotation.y = THREE.MathUtils.degToRad(YAW_DEG)
  g.add(pose)

  pose.add(bentMesh(trunkGeometry(), bodyMat, 'larva-body'))
  pose.add(bentMesh(pronotumGeometry(), shieldMat, 'head-shield', BEND_TO))
  pose.add(bentMesh(headGeometry(), shieldMat, 'head-shield'))
  for (const geo of jawGeometries()) pose.add(bentMesh(geo, jawMat, 'larva-jaw'))
  for (const geo of stemmaGeometries()) pose.add(bentMesh(geo, stemmaMat, 'stemma'))
  for (const geo of antennaGeometries()) pose.add(bentMesh(geo, legMat, 'larva-antenna'))
  for (const geo of shieldSetae()) pose.add(bentMesh(geo, setaMat, 'seta', BEND_TO))
  const { hooks, setae } = hookGeometries()
  for (const geo of hooks) pose.add(bentMesh(geo, hookMat, 'hump-hook'))
  for (const geo of setae) pose.add(bentMesh(geo, setaMat, 'seta'))
  for (const geo of legGeometries()) pose.add(bentMesh(geo, legMat, 'larva-leg'))

  // 洞口：洞按盘子（头 + 前胸背板）的轮廓挖，沙面比盘顶低 0.03
  const shieldTop = bendPoint(new THREE.Vector3(2.1, PRO_Y + PRO_HALF_T, 0)).y
  const collar = new THREE.Mesh(sandCollar(shieldTop - 0.03), sandMat)
  collar.name = 'burrow-collar'
  pose.add(collar)

  orientFaces(g)

  /*
   * 锚点：全部是新名字。展台拿锚点名去配成虫的 hotspot 表（成虫用了
   * mandible / elytra / eye / leg / antenna / pronotum），同名会把「镰刀状交叉
   * 如剪」「窄于鞘翅基部」这些成虫卡片原样贴到幼虫身上 —— 而幼虫的颚是向上翻的、
   * 前胸背板是宽盘，两张卡都会说错。
   */
  const anchors: Record<string, THREE.Vector3> = {
    headShield: bendPoint(new THREE.Vector3(2.1, PRO_Y + PRO_HALF_T, 0.08)),
    larvaJaw: bendPoint(new THREE.Vector3(2.8, 0.22, 0.07)),
    stemmata: bendPoint(new THREE.Vector3(STEMMATA[0][0], headTop(STEMMATA[0][0], STEMMATA[0][1]) + 0.01, STEMMATA[0][1])),
    hookHump: bendPoint(new THREE.Vector3(A5_MID, dorsalY(A5_MID), 0)),
    larvaBody: bendPoint(new THREE.Vector3(1.2, 0, trunkRadius(1.2))),
    // 沙面上、盘子左后方一点（沙面在 shieldTop − 0.03）
    burrowMouth: new THREE.Vector3(PRO_FROM - BODY_LEN - 0.12, shieldTop - 0.03, 0.3),
  }

  const yaw = new THREE.Euler(0, THREE.MathUtils.degToRad(YAW_DEG), 0)
  for (const v of Object.values(anchors)) v.applyEuler(yaw)

  return finalize(g, anchors)
}
