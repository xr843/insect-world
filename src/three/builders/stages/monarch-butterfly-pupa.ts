/**
 * 帝王蝶 · 蛹 Danaus plexippus（生活史第 3 阶段）
 *
 * 单位与坐标系与成虫（../monarch-butterfly.ts）完全一致：1 = 1 厘米真实体长，
 * +X 向前、+Y 向上、+Z 向右。
 *
 * **体轴在这一阶段是竖直的**，这不是坐标系换了，是这只虫真的这么挂着：
 * 帝王蝶结**垂蛹**（suspended pupa）—— 末龄幼虫在叶背/枝下吐一小片丝垫，
 * 用尾端的**悬垂器（cremaster）**钩住丝垫，**头朝下**倒挂着化蛹。所以模型里
 * 悬垂器与丝垫在 +Y 顶端，头端在 -Y 底端；蛹的**腹面朝 +X**，翅芽、触角芽、
 * 口器芽这些浅浮雕分区都排在那一面 —— 把它摆平躺着才是把姿态做错了。
 *
 * 形态依据：
 * - **长约 2.5 厘米**（模型 2.34 的蛹体 + 悬垂器约 2.6），短粗的水滴/瓮形：
 *   上段（腹部）向悬垂器收细，最粗处在下 1/3 的翅芽一带，底端钝圆。
 * - **玉绿色**。刚化蛹时是通透的翠绿，靠体壁下的色素与结构共同呈色；
 *   临羽化前会转为透明并透出翅面的橙黑，本模型取化蛹后不久的状态。
 * - **招牌 = 一圈金色斑点**：沿翅芽上缘（腹部与翅芽的交界）绕体一周排开，
 *   头端与悬垂器一带另有几点。「金斑绿蛹」是帝王蝶世界闻名的样子，**这圈金点不能省**；
 *   而且金要真的亮得出来 —— 压深一档会变成一圈土黄疙瘩，那就白做了。
 *   （金斑并非金属，是体壁多层结构的反光，故用高光泽 + 微金属而非纯金属材质：
 *   纯金属没有环境反射时会直接渲染成黑的。）
 * - **表面能看出成虫的分区**：腹面自中线向外依次是口器芽、触角芽、足芽、翅芽，
 *   四组纵向浅浮雕；底端一对复眼隆起。这些是成虫盘在蛹壳下的压印 ——
 *   有了它，人才知道这个绿荚子里装的是一只蝶。
 */
import * as THREE from 'three'
import { chitin, finalize, loft, type InsectModel, type Section } from '../kit'

/**
 * 蛹体纵剖轮廓的控制点 [y, 半径]。自悬垂器一端（+Y）到头端（−Y）。
 * 用样条而不是折线：折线会在剪影上留下可见的折角，而蛹壳是一件浑然的荚。
 */
const PROFILE_POINTS: readonly [number, number][] = [
  [1.06, 0.075],
  [0.99, 0.16],
  [0.9, 0.265],
  [0.78, 0.36],
  [0.62, 0.435],
  [0.42, 0.487],
  [0.2, 0.52], // 金斑环所在的高度：腹部与翅芽的交界
  [-0.02, 0.548],
  [-0.28, 0.556], // 最粗处
  [-0.56, 0.54],
  [-0.82, 0.487],
  [-1.02, 0.398],
  [-1.16, 0.268],
  [-1.24, 0.145],
  [-1.28, 0.025],
]

/** 金斑环的高度 */
const GOLD_RING_Y = 0.2
/** 金斑环上的点数：真实蛹的这一圈通常十余点 */
const GOLD_RING_COUNT = 12

const PROFILE = new THREE.SplineCurve(PROFILE_POINTS.map(([y, r]) => new THREE.Vector2(y, r)))
/** 采样一次存表：蛹壳放样、浮雕分区、金斑落位全查这张表，保证附着物贴着壳面 */
const PROFILE_TABLE: THREE.Vector2[] = Array.from({ length: 97 }, (_, i) => PROFILE.getPoint(i / 96))

/** 给定高度的蛹壳半径（表上线性插值；越界时取端点） */
function shellRadiusAt(y: number): number {
  const t = PROFILE_TABLE
  if (y >= t[0].x) return t[0].y
  if (y <= t[t.length - 1].x) return t[t.length - 1].y
  for (let i = 0; i < t.length - 1; i++) {
    if (y <= t[i].x && y >= t[i + 1].x) {
      const k = (t[i].x - y) / Math.max(t[i].x - t[i + 1].x, 1e-6)
      return THREE.MathUtils.lerp(t[i].y, t[i + 1].y, k)
    }
  }
  return t[t.length - 1].y
}

/**
 * 贴在蛹壳表面的一块浅浮雕（翅芽 / 触角芽 / 口器芽 / 足芽 / 复眼）。
 *
 * 为什么自己拉一张参数曲面而不是拿椭球去戳：椭球只在正对处凸出一小片透镜形，
 * 想让隆起铺满整个翅芽的范围，椭球就得又大又鼓，成了一个瘤。这里按
 * (高度 × 方位角) 打网格、半径 = 壳面半径 + 中间高四缘归零的隆起，
 * 得到的才是「贴着壳、边缘平滑没入」的浅浮雕。
 *
 * **轮廓必须是梭形，不能是矩形。** 第一版直接把方位角跨度取成常数，
 * 于是每块浮雕都带着上下两条笔直的横边 —— 目视验收里读成「贴了一张长方形贴纸」，
 * 而且平直的网格边缘一旦擦到壳面还会闪出摩尔纹。现在方位角半跨随高度按
 * sin^waist 收放，两端自然收尖，边界是一条闭合的梭形曲线。
 *
 * lift 是边缘处仍留的抬高（0.012 = 0.12 毫米）：贴太近会与壳面共面而闪烁。
 */
function surfacePatch(opts: {
  y0: number
  y1: number
  /** 浮雕的中心方位角（0 = 腹面正中 +X） */
  center: number
  /** 最宽处的方位角半跨 */
  halfSpan: number
  rise: number
  /** 轮廓收尖的快慢：越小两端越钝，越大越尖 */
  waist?: number
  rows?: number
  cols?: number
  lift?: number
}): THREE.BufferGeometry {
  const rows = opts.rows ?? 26
  const cols = opts.cols ?? 16
  const lift = opts.lift ?? 0.012
  const waist = opts.waist ?? 0.42
  const pos: number[] = []
  const idx: number[] = []
  for (let i = 0; i <= rows; i++) {
    const ti = i / rows
    const y = THREE.MathUtils.lerp(opts.y0, opts.y1, ti)
    const base = shellRadiusAt(y)
    const span = opts.halfSpan * Math.pow(Math.sin(Math.PI * ti), waist)
    for (let j = 0; j <= cols; j++) {
      const tj = j / cols
      const a = opts.center + (tj * 2 - 1) * span
      // 指数 0.55 让隆起在中段就接近满高、只在边缘迅速归零 —— 浮雕才有清楚的轮廓，
      // 而不是一个从中心慢慢摊平的圆包
      const bump = Math.pow(Math.sin(Math.PI * ti), 0.55) * Math.pow(1 - (tj * 2 - 1) ** 2, 0.55)
      const r = base + lift + opts.rise * bump
      pos.push(r * Math.cos(a), y, r * Math.sin(a))
    }
  }
  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < cols; j++) {
      const a = i * (cols + 1) + j
      const b = a + 1
      const c = a + cols + 1
      const d = c + 1
      // 绕向取「法线朝壳外」的那一种，否则整片浮雕会按背面着色，看着是暗的
      idx.push(a, b, c, b, d, c)
    }
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  g.setIndex(idx)
  g.computeVertexNormals()
  return g
}

/**
 * 一枚金斑：贴着壳面的小扁球 —— 读作「壳上鼓起的一点金」，而不是粘上去的一颗豆。
 *
 * 压扁方向取**当地表面法线**而不是水平指向体轴：金斑环所在的高度上壳面正在收细，
 * 母线是斜的，按水平方向压扁会让斑的上缘翘起、下缘陷进壳里。
 * 法线由轮廓表上的 dr/dy 数值求得（母线切向 (dr, dy) 转 90° 即得）。
 */
function goldSpot(y: number, azimuth: number, radius: number, material: THREE.Material): THREE.Mesh {
  const h = 0.02
  const slope = (shellRadiusAt(y + h) - shellRadiusAt(y - h)) / (2 * h)
  const cos = Math.cos(azimuth)
  const sin = Math.sin(azimuth)
  const n = new THREE.Vector3(cos, -slope, sin).normalize()
  const base = new THREE.Vector3(shellRadiusAt(y) * cos, y, shellRadiusAt(y) * sin)
  const spot = new THREE.Mesh(new THREE.SphereGeometry(radius, 14, 10), material)
  spot.position.copy(base).addScaledVector(n, radius * 0.22)
  spot.lookAt(spot.position.clone().sub(n)) // 局部 +Z 指向壳内，随后沿 z 压扁 = 顺着壳面摊平
  spot.scale.set(1, 0.9, 0.55)
  spot.name = 'gold-spot'
  return spot
}

export function buildMonarchButterflyPupa(): InsectModel {
  const g = new THREE.Group()

  /*
   * 玉绿：hue≈140°、S≈0.39、L≈0.46。ACES 会提亮去饱和，取值已按这一点压过一档，
   * 但没有压过头 —— 蛹是**亮**绿的，压成墨绿就不是帝王蝶的蛹了。
   * 金斑用高光泽 + 0.2 的微金属：金属度越高越依赖环境反射，满档在没有环境贴图的场合直接发黑，
   * 而这一圈金正是本阶段的招牌，不能赌环境光。
   */
  const shellMat = chitin({ color: '#3faa63', gloss: 0.62, clearcoat: 0.42 })
  const padMat = chitin({ color: '#329158', gloss: 0.55, clearcoat: 0.35 })
  const seamMat = chitin({ color: '#256f43', gloss: 0.4 })
  const goldMat = chitin({ color: '#ffd449', gloss: 0.9, metal: 0.2, clearcoat: 0.55 })
  const cremasterMat = chitin({ color: '#241a12', gloss: 0.5, clearcoat: 0.25 })
  const silkMat = chitin({ color: '#e2dac8', gloss: 0.2 })

  // ---- 蛹壳
  const sections: Section[] = PROFILE_TABLE.map((p) => ({
    at: new THREE.Vector3(0, p.x, 0),
    ry: Math.max(p.y, 1e-4),
    rz: Math.max(p.y, 1e-4),
  }))
  const shell = new THREE.Mesh(loft(sections, 28), shellMat)
  shell.name = 'pupa-shell'
  g.add(shell)

  // ---- 腹面的四组纵向浮雕：自中线向外 口器芽 → 触角芽 → 足芽 → 翅芽。
  // 这个排列顺序不是随手排的，它就是成虫躯体在蛹壳下的实际压印次序。
  const deg = THREE.MathUtils.degToRad
  const proboscis = new THREE.Mesh(
    surfacePatch({ y0: 0.02, y1: -1.06, center: 0, halfSpan: deg(5.5), rise: 0.022, waist: 0.22, cols: 8 }),
    padMat,
  )
  proboscis.name = 'proboscis-pad'
  g.add(proboscis)
  for (const side of [1, -1] as const) {
    const antennaPad = new THREE.Mesh(
      surfacePatch({
        y0: 0.05,
        y1: -1.03,
        center: side * deg(10.5),
        halfSpan: deg(4.5),
        rise: 0.02,
        waist: 0.22,
        cols: 8,
      }),
      padMat,
    )
    antennaPad.name = 'antenna-pad'
    g.add(antennaPad)

    const legPad = new THREE.Mesh(
      surfacePatch({
        y0: 0.02,
        y1: -0.98,
        center: side * deg(20),
        halfSpan: deg(4.5),
        rise: 0.016,
        waist: 0.22,
        cols: 8,
      }),
      padMat,
    )
    legPad.name = 'leg-pad'
    g.add(legPad)

    // 翅芽：腹面最大的一块，上缘正抵着金斑环 —— 那圈金点排的就是这条界线
    const wingPad = new THREE.Mesh(
      surfacePatch({
        y0: 0.14,
        y1: -0.86,
        center: side * deg(58),
        halfSpan: deg(34),
        rise: 0.042,
        waist: 0.42,
        rows: 28,
        cols: 20,
      }),
      padMat,
    )
    wingPad.name = 'wing-pad'
    g.add(wingPad)

    // 复眼隆起：在翅芽之下、蛹体底端的头区，一对明显的鼓包
    const eyePad = new THREE.Mesh(
      surfacePatch({
        y0: -0.84,
        y1: -1.1,
        center: side * deg(52),
        halfSpan: deg(22),
        rise: 0.032,
        waist: 0.6,
        rows: 14,
        cols: 14,
      }),
      padMat,
    )
    eyePad.name = 'eye-pad'
    g.add(eyePad)
  }

  // ---- 腹节界线：上段（腹部）还能扭动，节界在壳上是几道浅棱
  for (const y of [0.42, 0.62, 0.8, 0.93]) {
    const seam = new THREE.Mesh(new THREE.TorusGeometry(shellRadiusAt(y) + 0.003, 0.0075, 6, 30), seamMat)
    seam.rotation.x = Math.PI / 2
    seam.position.y = y
    seam.name = 'segment-seam'
    g.add(seam)
  }

  // ---- 金斑：翅芽上缘一整圈，另加头端与悬垂器一带的几点
  for (let i = 0; i < GOLD_RING_COUNT; i++) {
    g.add(goldSpot(GOLD_RING_Y, (i / GOLD_RING_COUNT) * Math.PI * 2, 0.05, goldMat))
  }
  for (const [y, a, r] of [
    [-0.88, 22, 0.033],
    [-0.88, -22, 0.033],
    [-0.88, 52, 0.031],
    [-0.88, -52, 0.031],
    [0.86, 96, 0.03],
    [0.86, -96, 0.03],
  ] as const) {
    g.add(goldSpot(y, deg(a), r, goldMat))
  }

  // ---- 悬垂器 + 丝垫：垂蛹靠这一小段黑色的钩状器挂在丝垫上，整只蛹的重量都在这里
  const cremaster = new THREE.Mesh(
    loft(
      [
        { at: new THREE.Vector3(0, 1.0, 0), ry: 0.11, rz: 0.11 },
        { at: new THREE.Vector3(0, 1.14, 0), ry: 0.062, rz: 0.062 },
        { at: new THREE.Vector3(0, 1.28, 0), ry: 0.05, rz: 0.05 },
      ],
      14,
    ),
    cremasterMat,
  )
  cremaster.name = 'cremaster'
  g.add(cremaster)

  const silk = new THREE.Mesh(new THREE.SphereGeometry(0.17, 18, 12), silkMat)
  silk.scale.set(1, 0.2, 0.92)
  silk.position.set(0, 1.32, 0)
  silk.name = 'silk-pad'
  g.add(silk)

  const anchors: Record<string, THREE.Vector3> = {
    goldRing: new THREE.Vector3(shellRadiusAt(GOLD_RING_Y) + 0.05, GOLD_RING_Y, 0),
    wingPad: new THREE.Vector3(
      (shellRadiusAt(-0.33) + 0.04) * Math.cos(deg(55)),
      -0.33,
      (shellRadiusAt(-0.33) + 0.04) * Math.sin(deg(55)),
    ),
    cremaster: new THREE.Vector3(0, 1.24, 0),
    silkPad: new THREE.Vector3(0, 1.35, 0),
    eye: new THREE.Vector3(
      (shellRadiusAt(-0.95) + 0.04) * Math.cos(deg(54)),
      -0.95,
      (shellRadiusAt(-0.95) + 0.04) * Math.sin(deg(54)),
    ),
  }

  return finalize(g, anchors)
}
