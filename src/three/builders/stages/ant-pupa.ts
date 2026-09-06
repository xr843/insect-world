/**
 * 日本弓背蚁 · 蛹（连茧）Camponotus japonicus（完全变态第 3 阶段）
 *
 * 单位与坐标系与成虫（../ant.ts）一致：1 = 1 厘米真实体长，
 * +X 向前（头）、+Y 向上（背）、+Z 向右。
 *
 * ## 主体是**茧**，这正是弓背蚁与许多蚁类的分界
 *
 * 图鉴里这一步写的是「蛹（多结茧）」。蚁科里结不结茧是分亚科的性状之一：
 * 切叶蚁亚科（Myrmicinae，如小家蚁）化裸蛹，不结茧；而弓背蚁所属的
 * 蚁亚科（Formicinae）末龄幼虫吐丝结一枚丝茧再在里面化蛹 ——
 * 民间叫「蚁卵」拿去喂鸟喂鱼的那种米黄色小囊，其实就是这枚茧。
 * 所以这个模型的外形是一枚**丝茧**，不是一只光溜溜的蛹。
 *
 * ## 形态依据
 *
 * 1. **茧长 1.16 厘米、最粗处直径 0.60 厘米**（真值：长 1.0~1.3、宽 0.5~0.7）。
 *    长椭圆/胶囊形，**一端略尖**（模型里 +X 那端半径比 −X 端小两成半）。
 * 2. **丝的哑光**：`gloss 0.15 / clearcoat 0.02`，粗糙度 0.86。
 *    **绝不用 `elytra()`** —— 丝不是甲壳，一上清漆整枚茧就成了塑料胶囊。
 *    基色取米黄褐 `#e3cda2`（明度 0.76）：浅色物件就要真的浅，
 *    「颜色压深一档」被当成「越深越保险」时，三个阶段会一起变成灰坨。
 * 3. **细密的纵向纹理**：30 根沿茧长走的丝索（贴着茧面、方位角只有极小的漂移），
 *    外加 44 根支棱出来的散丝。**丝的质感有一半在剪影上** ——
 *    柞蚕茧那一轮实测过：只有光壳时出图像一只芒果，边缘毛糙了才叫丝。
 * 4. **一端的排泄斑（meconium）**：幼虫在化蛹前把整个幼虫期积存的粪便一次排出，
 *    那团东西留在茧的一端，隔着丝显成一块深色的斑。这是识别蚁茧「哪头是尾」
 *    最直观的记号。本文件做了两件东西：茧内那团**深褐的粪块**本体，
 *    以及茧面上被它染深的一块**斑**（斑在丝索之下，丝索从它上面压过 —— 真实顺序）。
 * 5. **侧壁上剖开一扇椭圆窗**：中段最宽处挖去 80° 的方位角，往两端按椭圆收到 0，
 *    所以茧的**两端仍是合拢的**（顶视与后斜机位看到的就是一枚完整的米黄色茧）。
 *    理由与柞蚕茧完全一样，且更硬：茧不透光，做成半透是好看但假的；
 *    而不剖开的话，画面上只是一颗米色胶囊，读者根本看不出这是「蛹」。
 *    ⚠️ 窗为什么不是「整条长度上挖掉一段方位角」（旋转体的做法）：那样做过一版，
 *    正对机位下近侧的壁从头到尾都没了，整只读成一只**掰开的蚌**。
 *    ⚠️ 剖开的东西有两个坑，这里都躲了：
 *    (a) 壁必须有**厚度**，剖口两端另封两片横断面 —— 否则剖口那侧是一张
 *        没有厚度的纸，`finalize()` 把不透明材质翻双面后自己遮自己，
 *        出图是一个平面的黑洞（蜣螂粪梨与柞蚕茧都撞过）；
 *    (b) 茧腔要另铺一层比外壳**更浅**的内衬，否则腔里是个暗洞，
 *        蛹陷在里面读不出形。
 * 6. **茧里蜷着一只蚂蚁**。蛹长 0.88 厘米，是**离蛹**（exarate）：
 *    足、触角、上颚各自游离地折贴在体表，与鳞翅目被蛹那种「粘死在一层壳里」
 *    完全不同 —— 膜翅目就是这样。三段式的剪影（头 / 胸 / **细腰** / 后腹）
 *    在这一步已经成形，与成虫一比就知道蛹期在干什么。
 *    **复眼先显色**：真实蚁蛹的复眼比躯体先变褐，躯体还是乳白。
 *    这道明度差（眼 0.28 对体 0.90）是让蛹「看着像正在变成一只蚂蚁」的关键。
 *
 * ## 取向
 *
 * 蛹头朝 +X（茧略尖的那端），排泄斑与后腹在 −X —— 这是真实的相对位置。
 * 蛹沿体轴只滚 −22°：滚正了（腹面朝窗）只能看见一堆折起来的足，
 * 而这一阶段最该被看见的是**侧面剪影**上的细腰与三段身体。
 */
import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { chitin, finalize, loft, mandibles, type InsectModel, type Section } from '../kit'

// ---------------------------------------------------------------- 茧的形状

/** 茧长：真值 1.0~1.3 厘米 */
const COCOON_LEN = 1.16
/** 茧最粗处半径：直径 0.60 厘米（真值 0.5~0.7） */
const COCOON_R = 0.3
/**
 * 丝壁厚度。真实茧壁只有 0.1~0.2 毫米，这里给 0.32 毫米 —— 是**公开的加厚**：
 * 剖口上那道横断面得看得见才像一层壳，0.1 毫米在这个尺度上是 0.01 模型单位，
 * 出图后剖口是一条亚像素的线，观感回到「一张纸」。
 */
const WALL = 0.032
/**
 * 方位角约定：φ 对应的外法方向是 (0, −sinφ, cosφ) ——
 * φ=0 朝 +Z（正对观众）、φ=270° 朝 +Y（上）。剖口的位置与大小见 WINDOW_*。
 */

/**
 * 沿茧长的外半径。v=0 是后端（排泄斑那头，钝），v=1 是前端（略尖）。
 * 指数随 v 从 0.34 抬到 0.52：同一条正弦母线，前端因此收得更快 ——
 * 「一端略尖」这件事就是这么来的，不是两端各拍一个数。
 */
function cocoonRadius(v: number): number {
  const t = THREE.MathUtils.clamp(v, 0, 1)
  const shape = Math.pow(Math.sin(Math.PI * Math.pow(t, 0.92)), THREE.MathUtils.lerp(0.34, 0.52, t))
  return Math.max(COCOON_R * shape, 0.004)
}

/** 茧面上一点（已按最终坐标给出：长轴沿 X，φ 的定义见上） */
function cocoonPoint(v: number, phi: number, swell = 1, out = new THREE.Vector3()): THREE.Vector3 {
  const x = -COCOON_LEN / 2 + v * COCOON_LEN
  const r = cocoonRadius(v) * swell
  return out.set(x, -r * Math.sin(phi), r * Math.cos(phi))
}

/**
 * 茧壁的内外两张面 —— 不用 LatheGeometry，自己铺参数网格。
 *
 * 为什么换掉旋转体：旋转体只能挖掉**整条长度上**的一段方位角，
 * 第一版就是这么做的（保留 35°~310°），出图后正对机位下整只读成一只
 * **掰开的蚌** —— 近侧的壁从头到尾都没了，剩下的一片弧撑不起「这是个闭合的囊」。
 * 现在把剖口做成参数面 (v, φ) 上的一枚**椭圆窗**：中段开、两端合拢，
 * 于是顶 / 后斜机位看到的是一枚完整的茧，侧 / 前斜 / 默认机位从窗里看得见蛹。
 *
 * 法线**解析给出**，不走 computeVertexNormals()：φ 绕满一圈时首尾顶点重合，
 * 按面平均出来的法线会在那道缝上留一条硬边（茧面是大片光滑曲面，一条缝很显眼）。
 * P(v,φ) = (x(v), −r sinφ, r cosφ)，∂P/∂φ × ∂P/∂v 化简后外法线 ∝ (−r′, −L sinφ, L cosφ)。
 */
const WINDOW_V_C = 0.47
const WINDOW_V_R = 0.37
/** 窗心方位：−14° 即右上前方，正对展台默认机位 (0.86,0.44,1.25) 与侧 / 前斜两个机位 */
const WINDOW_PHI_C = THREE.MathUtils.degToRad(-14)
/**
 * 窗最宽处的半角：中段开 72°，往两端按椭圆收到 0。
 * 92° 那一版出图仍偏「敞」（近侧只剩一道窄边）；72° 又收过了头 ——
 * 蛹的头正好被近侧的窗沿挡掉，射线实测朝向相机的蛹面只剩 37% 露着。
 * 80° 是两者之间的那一档：出图里整只蚂蚁（后腹—细腰—胸—头—复眼）都在窗里，
 * 实测露出 52%，而茧仍读得出是一个闭合的囊。
 */
const WINDOW_PHI_R = THREE.MathUtils.degToRad(40)

/** 窗在该处的半角宽（v 落在窗外时为 0 = 该圈茧壁是完整的） */
function windowHalfWidth(v: number): number {
  const d = (v - WINDOW_V_C) / WINDOW_V_R
  if (Math.abs(d) >= 1) return 0
  return WINDOW_PHI_R * Math.sqrt(1 - d * d)
}

/** 内壁半径：外半径减一个壁厚，两端收到 0（茧尖是实心的一小段） */
const innerRadius = (v: number) => Math.max(cocoonRadius(v) - WALL, 0)

const NV = 60
const NPHI = 64

/** 茧壁的一张面。kind='outer' 外壁、'inner' 内壁（法线朝腔内） */
function shellSurfaceGeometry(kind: 'outer' | 'inner'): THREE.BufferGeometry {
  const rAt = kind === 'outer' ? cocoonRadius : innerRadius
  const positions: number[] = []
  const normals: number[] = []
  const indices: number[] = []
  const sign = kind === 'outer' ? 1 : -1
  const h = 1 / (NV * 4)
  for (let i = 0; i <= NV; i++) {
    const v = i / NV
    const w = windowHalfWidth(v)
    const span = Math.PI * 2 - 2 * w
    const r = rAt(v)
    const v0 = Math.max(0, v - h)
    const v1 = Math.min(1, v + h)
    const dr = (rAt(v1) - rAt(v0)) / (v1 - v0)
    const x = -COCOON_LEN / 2 + v * COCOON_LEN
    for (let j = 0; j <= NPHI; j++) {
      const phi = WINDOW_PHI_C + w + span * (j / NPHI)
      const sn = Math.sin(phi)
      const cs = Math.cos(phi)
      positions.push(x, -r * sn, r * cs)
      const n = new THREE.Vector3(-dr, -COCOON_LEN * sn, COCOON_LEN * cs).normalize().multiplyScalar(sign)
      normals.push(n.x, n.y, n.z)
    }
  }
  const row = NPHI + 1
  for (let i = 0; i < NV; i++) {
    for (let j = 0; j < NPHI; j++) {
      const a = i * row + j
      const b = a + row
      if (kind === 'outer') indices.push(a, b, a + 1, b, b + 1, a + 1)
      else indices.push(a, a + 1, b, b, a + 1, b + 1)
    }
  }
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3))
  geo.setIndex(indices)
  return geo
}

/**
 * 窗沿：把内外两张面在窗的边界上连起来的一条窄带 —— 它就是那道**丝壁的横断面**。
 *
 * ⚠️ 这条带子不能省。剖开的东西少了它，剖口那侧就是一张没有厚度的纸；
 * `finalize()` 把不透明材质翻成双面之后，那张纸在阴影贴图里自己遮自己，
 * 出图是一个平面的黑洞（蜣螂粪梨与柞蚕茧上各撞过一次）。
 */
function windowRimGeometry(): THREE.BufferGeometry {
  const N = 48
  const positions: number[] = []
  const indices: number[] = []
  for (const side of [1, -1] as const) {
    const base = positions.length / 3
    for (let i = 0; i <= N; i++) {
      const v = WINDOW_V_C + WINDOW_V_R * (2 * (i / N) - 1)
      const phi = WINDOW_PHI_C + side * windowHalfWidth(v)
      const x = -COCOON_LEN / 2 + v * COCOON_LEN
      for (const r of [cocoonRadius(v), innerRadius(v)]) {
        positions.push(x, -r * Math.sin(phi), r * Math.cos(phi))
      }
    }
    for (let i = 0; i < N; i++) {
      const a = base + i * 2
      if (side === 1) indices.push(a, a + 2, a + 1, a + 1, a + 2, a + 3)
      else indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2)
    }
  }
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geo.setIndex(indices)
  geo.computeVertexNormals()
  return geo
}

// ---------------------------------------------------------------- 丝

/** 纵向丝索根数 */
const STRAND_COUNT = 30

/**
 * 缠在茧面上的丝索：**沿茧长走**，方位角只有 ±0.06 弧度的漂移。
 *
 * 与柞蚕茧那 34 根斜向交叉的丝索是两回事：柞蚕茧的丝粗、来回 8 字形叠，
 * 而蚁茧是幼虫在窄小的巢室里绕着自己吐，成品表面是**细密的纵纹**。
 * 漂移仍要留一点（且逐根不同）：完全平行的 30 条线读成一根瓦楞管。
 */
function strandMeshes(mat: THREE.Material): THREE.Mesh[] {
  const out: THREE.Mesh[] = []
  for (let k = 0; k < STRAND_COUNT; k++) {
    const f = k / (STRAND_COUNT - 1)
    // 绕茧一整圈铺开，但避开窗：窗心两侧各让出最宽处的半角 + 4°，
    // 丝索不能悬在窗口上（那读成几根横穿窗户的电线）
    const margin = WINDOW_PHI_R + THREE.MathUtils.degToRad(4)
    const phi0 = WINDOW_PHI_C + margin + (Math.PI * 2 - 2 * margin) * f
    const drift = (((k % 3) - 1) * 0.05 + (k % 2 === 0 ? 0.012 : -0.012)) * 1.2
    const vFrom = 0.035 + 0.05 * (((k * 3) % 4) / 3)
    const vTo = 0.965 - 0.05 * (((k * 5) % 4) / 3)
    const steps = 14
    const sections: Section[] = []
    for (let i = 0; i <= steps; i++) {
      const t = i / steps
      const v = THREE.MathUtils.lerp(vFrom, vTo, t)
      const phi = phi0 + drift * (t - 0.5) * 2
      // 两端收细，像丝头收进壳里
      const r = 0.0075 * Math.sin(Math.PI * Math.max(t, 0.08))
      sections.push({ at: cocoonPoint(v, phi, 1.012), ry: Math.max(r, 0.0018), rz: Math.max(r, 0.0018) })
    }
    const m = new THREE.Mesh(loft(sections, 6), mat)
    m.name = 'silk-strand'
    out.push(m)
  }
  return out
}

/**
 * 散丝：茧面上支棱出来的短丝头，把剪影打毛。
 * 只有光壳与贴面丝索时，出图是一枚光溜溜的米色果子（柞蚕茧第一版实拍就像芒果）。
 * 44 根按黄金比的低差异序列铺开，代价只有几百个三角形。
 */
function flossGeometry(): THREE.BufferGeometry | null {
  const N = 44
  const geos: THREE.BufferGeometry[] = []
  for (let i = 0; i < N; i++) {
    const u = (i * 0.6180339887) % 1
    const w = (i * 0.3819660113) % 1
    const v = 0.06 + 0.88 * u
    const margin = WINDOW_PHI_R + THREE.MathUtils.degToRad(6)
    const phi = WINDOW_PHI_C + margin + (Math.PI * 2 - 2 * margin) * w
    const root = cocoonPoint(v, phi, 1.006)
    const radial = new THREE.Vector3(0, -Math.sin(phi), Math.cos(phi))
    const along = i % 2 === 0 ? 1 : -1
    const dir = radial
      .clone()
      .multiplyScalar(0.5)
      .add(new THREE.Vector3(along * 0.86, 0, 0))
      .normalize()
    const jitter = Math.abs(Math.sin(i * 12.9898) * 43758.5453) % 1
    const len = 0.035 + 0.045 * jitter
    const geo = new THREE.ConeGeometry(0.0035, len, 4)
    const m = new THREE.Matrix4().makeRotationFromQuaternion(
      new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir),
    )
    m.setPosition(root.clone().addScaledVector(dir, len * 0.4))
    geo.applyMatrix4(m)
    geos.push(geo)
  }
  const merged = mergeGeometries(geos)
  for (const g of geos) g.dispose()
  return merged
}

// ---------------------------------------------------------------- 排泄斑

/**
 * 茧面上被排泄物染深的一块斑：贴着茧面的一片网格，边缘 22% 落回茧面，
 * 中间抬起 0.004（一根头发的高度）—— 只为压在茧面之上不打架，不是一个瘤。
 *
 * 方位取 205°~292°：那一段是**朝上**的茧壁（φ=270° 正朝 +Y），
 * 顶视与前斜机位都看得见；而剖口在 295°~35°，两者正好各占一边不打架。
 */
function stainGeometry(): THREE.BufferGeometry {
  const NA = 18
  const NB = 14
  const V0 = 0.025
  const V1 = 0.185
  const P0 = THREE.MathUtils.degToRad(212)
  const P1 = THREE.MathUtils.degToRad(288)
  const positions: number[] = []
  const indices: number[] = []
  const p = new THREE.Vector3()
  for (let i = 0; i <= NA; i++) {
    const a = i / NA
    const v = THREE.MathUtils.lerp(V0, V1, a)
    for (let j = 0; j <= NB; j++) {
      const b = j / NB
      const phi = THREE.MathUtils.lerp(P0, P1, b)
      const edge = Math.min(
        THREE.MathUtils.smoothstep(Math.min(a, 1 - a), 0, 0.22),
        THREE.MathUtils.smoothstep(Math.min(b, 1 - b), 0, 0.22),
      )
      cocoonPoint(v, phi, 1 + 0.014 * edge, p)
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

// ---------------------------------------------------------------- 蛹本体

/**
 * 蛹的各段。全部坐标在**蛹自己的局部坐标**里：+X 朝头、+Y 朝背。
 * 蛹长 0.88 厘米（工蚁蛹真值 0.8~1.1），比茧腔短一截 —— 茧是贴着蛹结的，
 * 但两端总留着一点空隙，蛹在里面能微微转动。
 */
const PUPA_PARTS = {
  /** 后腹（gaster）：卵圆、向腹面微蜷 */
  gaster: {
    path: [
      [0.02, -0.018],
      [-0.06, -0.042],
      [-0.14, -0.066],
      [-0.22, -0.081],
      [-0.28, -0.084],
    ],
    radii: [0.045, 0.09, 0.102, 0.08, 0.02],
  },
  /** 胸（alitrunk）：背线拱起 —— 「弓背」在蛹期就已成形 */
  alitrunk: {
    path: [
      [0.1, 0.0],
      [0.16, 0.04],
      [0.23, 0.056],
      [0.3, 0.036],
      [0.34, 0.012],
    ],
    radii: [0.048, 0.068, 0.08, 0.068, 0.05],
  },
  /** 头：略扁的卵形，向腹面低垂（蛹的头是垂着的） */
  head: {
    path: [
      [0.36, 0.0],
      [0.4, -0.014],
      [0.44, -0.03],
      [0.475, -0.05],
    ],
    radii: [0.042, 0.062, 0.064, 0.026],
  },
} as const

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

/**
 * 沿一串点放样、半径逐点给定。
 *
 * ⚠️ 控制点要先过一遍 Catmull-Rom **重采样成 26 段**再放样：
 * 直接拿那 4~5 个控制点当截面，剪影就是一条折线 —— 第一版实拍时后腹读成
 * 一枚六棱水晶、头读成一颗多边形算珠（面数省下的那点代价换来的是「塑料件」观感）。
 * 半径关键帧按控制点的参数位置对齐（CatmullRomCurve3 的 t=i/(n−1) 恰好落在
 * 第 i 个控制点上），所以重采样不改变各段的粗细设计。
 */
function tubeGeometry(
  path: readonly (readonly [number, number])[],
  radii: readonly number[],
  radial = 20,
  steps = 26,
): THREE.BufferGeometry {
  const curve = new THREE.CatmullRomCurve3(
    path.map(([x, y]) => new THREE.Vector3(x, y, 0)),
    false,
    'catmullrom',
    0.5,
  )
  const keys = radii.map((r, i) => [i / (radii.length - 1), r] as const)
  const sections: Section[] = []
  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    const r = Math.max(keyframe(keys, t), 1e-4)
    sections.push({ at: curve.getPoint(t), ry: r, rz: r })
  }
  return loft(sections, radial)
}

/** 一条折贴在体表的附肢（足 / 触角）：二次贝塞尔放样成的细管 */
function appendageGeometry(
  base: THREE.Vector3,
  ctrl: THREE.Vector3,
  tip: THREE.Vector3,
  r0: number,
  r1: number,
): THREE.BufferGeometry {
  const curve = new THREE.QuadraticBezierCurve3(base, ctrl, tip)
  const steps = 14
  const sections: Section[] = []
  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    const r = THREE.MathUtils.lerp(r0, r1, Math.pow(t, 0.8))
    sections.push({ at: curve.getPoint(t), ry: r, rz: r })
  }
  return loft(sections, 12)
}

/** 三对足的着生点（沿胸部腹面从前到后）与折叠幅度 */
const LEG_BASES: readonly (readonly [number, number, number])[] = [
  // [基节 x, 膝的前伸量, 末端的回折量]
  [0.29, 0.085, -0.03],
  [0.22, 0.095, -0.02],
  [0.14, 0.105, 0.0],
]

// ---------------------------------------------------------------- 颜色

/** 茧壳：米黄褐（明度 0.76）。丝的哑光靠 gloss，不靠压深基色 */
const SILK_COLOR = '#e3cda2'
/** 丝索：比壳面亮一档，「一层层缠上去的丝」才看得出来 */
const STRAND_COLOR = '#f1e2c2'
/** 内衬：比外壳浅（真实茧内层更细密光洁），把茧腔从暗洞变成衬着丝的窝 */
const LINING_COLOR = '#ecdcbb'
/** 排泄斑：深褐（明度 0.27）。与茧面差 0.49 个明度 —— 一眼看得出是一块脏斑。
 *  第一版取 #4a3524（0.22），出图后那块斑读成「烧穿的一个洞」，抬亮一档才像污渍 */
const MECONIUM_COLOR = '#5b4530'
/** 蛹体：接近白的乳白（明度 0.90），比内衬亮 0.11 —— 蛹要从茧腔里跳出来 */
const PUPA_COLOR = '#f6f1e6'
/** 复眼：先显色的褐（明度 0.28）。「正在变成一只蚂蚁」全靠这道色差 */
const EYE_COLOR = '#54402c'
/** 上颚：已开始骨化，比躯体深，比复眼浅 */
const JAW_COLOR = '#a98a5c'

// ---------------------------------------------------------------- 装配

export function buildAntPupa(): InsectModel {
  const g = new THREE.Group()

  const shellMat = chitin({ color: SILK_COLOR, gloss: 0.15, clearcoat: 0.02 })
  const strandMat = chitin({ color: STRAND_COLOR, gloss: 0.22, clearcoat: 0.04 })
  const liningMat = chitin({ color: LINING_COLOR, gloss: 0.2, clearcoat: 0.03 })
  const meconiumMat = chitin({ color: MECONIUM_COLOR, gloss: 0.24, clearcoat: 0.04 })
  const pupaMat = chitin({ color: PUPA_COLOR, gloss: 0.24, clearcoat: 0.05, translucent: true })
  const eyeMat = chitin({ color: EYE_COLOR, gloss: 0.5, clearcoat: 0.25 })
  const jawMat = chitin({ color: JAW_COLOR, gloss: 0.45, clearcoat: 0.2 })

  // ---- 茧壁：外壁 + 内衬 + 窗沿（那道横断面）
  const shell = new THREE.Mesh(shellSurfaceGeometry('outer'), shellMat)
  shell.name = 'cocoon-shell'
  g.add(shell)

  /*
   * 内衬直接就是茧壁的内表面，只换一份更浅的材质：茧腔本来就照不进光，
   * 与外壳同色时整个腔是一个暗洞，蛹陷在里面读不出形（柞蚕茧那一轮的实拍病症）。
   * 真实茧的内层确实更细密光洁、更浅。
   */
  const lining = new THREE.Mesh(shellSurfaceGeometry('inner'), liningMat)
  lining.name = 'cocoon-lining'
  g.add(lining)

  const rim = new THREE.Mesh(windowRimGeometry(), shellMat)
  rim.name = 'cocoon-rim'
  g.add(rim)

  // ---- 丝：纵向丝索 + 散丝
  for (const m of strandMeshes(strandMat)) g.add(m)
  const floss = flossGeometry()
  if (floss) {
    const fuzz = new THREE.Mesh(floss, strandMat)
    fuzz.name = 'silk-floss'
    g.add(fuzz)
  }

  // ---- 排泄斑：茧面上的斑（丝索从它上面压过）+ 茧腔里那团粪块本体
  const stain = new THREE.Mesh(stainGeometry(), meconiumMat)
  stain.name = 'meconium-stain'
  g.add(stain)

  const pellet = new THREE.Mesh(new THREE.IcosahedronGeometry(0.046, 1), meconiumMat)
  pellet.name = 'meconium'
  pellet.scale.set(1.15, 0.74, 0.94)
  pellet.position.set(-0.482, -0.026, 0.008)
  g.add(pellet)

  // ---- 蛹本体：单独一个 group，好整体摆进茧腔
  const pupa = new THREE.Group()
  pupa.name = 'pupa'

  const gasterMesh = new THREE.Mesh(
    tubeGeometry(PUPA_PARTS.gaster.path, PUPA_PARTS.gaster.radii),
    pupaMat,
  )
  gasterMesh.name = 'pupa-gaster'
  pupa.add(gasterMesh)

  const alitrunkMesh = new THREE.Mesh(
    tubeGeometry(PUPA_PARTS.alitrunk.path, PUPA_PARTS.alitrunk.radii),
    pupaMat,
  )
  alitrunkMesh.name = 'pupa-alitrunk'
  pupa.add(alitrunkMesh)

  const headMesh = new THREE.Mesh(tubeGeometry(PUPA_PARTS.head.path, PUPA_PARTS.head.radii), pupaMat)
  headMesh.name = 'pupa-head'
  pupa.add(headMesh)

  /*
   * 腰（petiole）：蚂蚁最硬的鉴定特征，蛹期就已经细成这样。
   * 半径 0.026 对胸 0.085、后腹 0.106 —— 不到三分之一。
   * 少了这一截，茧里躺的就只是「一条白虫」，与上一阶段分不开。
   */
  const petiole = new THREE.Mesh(
    tubeGeometry(
      [
        [0.095, -0.004],
        [0.058, -0.011],
        [0.028, -0.017],
      ],
      [0.028, 0.024, 0.032],
      16,
      12,
    ),
    pupaMat,
  )
  petiole.name = 'pupa-petiole'
  pupa.add(petiole)
  // 腰上那枚竖立的鳞片状结节
  const node = new THREE.Mesh(new THREE.SphereGeometry(0.034, 12, 10), pupaMat)
  node.name = 'pupa-petiole-node'
  node.scale.set(0.42, 0.92, 0.62)
  node.position.set(0.06, 0.018, 0)
  pupa.add(node)

  for (const side of [1, -1] as const) {
    // 复眼：先显色的一对褐斑，长在头侧
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.024, 12, 10), eyeMat)
    eye.name = 'pupa-eye'
    eye.scale.set(1.05, 0.86, 0.62)
    eye.position.set(0.42, -0.012, side * 0.05)
    pupa.add(eye)

    // 折贴在体表的足：股节前伸下探，胫跗回折 —— 离蛹的足是一根根游离的管
    for (const [bx, fwd, back] of LEG_BASES) {
      const leg = new THREE.Mesh(
        appendageGeometry(
          new THREE.Vector3(bx, -0.03, side * 0.04),
          new THREE.Vector3(bx + fwd, -0.105, side * 0.08),
          new THREE.Vector3(bx + back, -0.142, side * 0.05),
          0.015,
          0.006,
        ),
        pupaMat,
      )
      leg.name = 'pupa-leg'
      pupa.add(leg)
    }

    // 膝状触角：柄节朝前下、鞭节折回体侧 —— 蚁科的招牌在蛹期就摆在那儿了
    const antenna = new THREE.Mesh(
      appendageGeometry(
        new THREE.Vector3(0.44, -0.042, side * 0.038),
        new THREE.Vector3(0.49, -0.085, side * 0.07),
        new THREE.Vector3(0.26, -0.1, side * 0.08),
        0.012,
        0.006,
      ),
      pupaMat,
    )
    antenna.name = 'pupa-antenna'
    pupa.add(antenna)
  }

  // 上颚：已开始骨化，贴在头前下方
  const jaw = mandibles({ at: [0.465, -0.058, 0.02], length: 0.055, spread: 0.34, curve: 0.5 }, jawMat)
  jaw.traverse((o) => {
    if ((o as THREE.Mesh).isMesh) o.name = 'pupa-mandible'
  })
  pupa.add(jaw)

  /*
   * 摆进茧腔：
   * - 沿体轴滚 −22°：腹面（足、触角那一侧）略转向剖口，同时保住侧面剪影 ——
   *   细腰与三段身体是这一阶段最该被看见的东西，滚正了只剩一堆折叠的足。
   * - 下沉 0.045：蛹靠在茧腔底部，不是悬在正中。
   * - 后移 0.06：头端离茧的尖端留出空隙，尾端给排泄斑让位。
   */
  pupa.rotation.x = THREE.MathUtils.degToRad(-22)
  pupa.position.set(-0.115, -0.018, 0)
  g.add(pupa)

  // ---- 锚点：一律落在真实几何体表面上
  g.updateMatrixWorld(true)
  const onPupa = (v: THREE.Vector3) => pupa.localToWorld(v.clone())

  const anchors: Record<string, THREE.Vector3> = {
    // 茧面（保留侧，方位 200° 在剖口之外）
    silk: cocoonPoint(0.55, THREE.MathUtils.degToRad(180), 1.012),
    // 排泄斑
    meconium: cocoonPoint(0.11, THREE.MathUtils.degToRad(250), 1.012),
    // 蛹的胸背（从窗口看进去正对着的那一处）
    pupa: onPupa(new THREE.Vector3(0.23, 0.056 + 0.08, 0)),
    // 蛹的细腰
    petiole: onPupa(new THREE.Vector3(0.06, 0.048, 0)),
  }

  return finalize(g, anchors)
}
