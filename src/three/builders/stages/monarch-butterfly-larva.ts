/**
 * 帝王蝶 · 幼虫（毛虫）Danaus plexippus（生活史第 2 阶段，取末龄 5 龄）
 *
 * 单位与坐标系与成虫（../monarch-butterfly.ts）完全一致：1 = 1 厘米真实体长，
 * +X 向前（头）、+Y 向上（背）、+Z 向右。
 *
 * 形态依据：
 * - **体长 4.5~5 厘米**（模型 4.75），圆筒形，头壳 + 13 个体节（3 胸节 + 10 腹节）。
 *   末龄幼虫比成虫的体躯还长 —— 幼虫是「吃」的形态，成虫是「飞与找配偶」的形态，
 *   两者不是同一具身体的放大缩小，这正是完全变态要讲的事。
 * - **招牌 = 黑 / 黄 / 白三色横环带**，逐节一组、环绕全身。本文件每节按
 *   宽黑 → 白 → 宽黄 → 白 排布（比例 0.33 / 0.14 / 0.38 / 0.15）。
 *   这是警戒色（aposematism）：幼虫取食马利筋，把强心苷（cardenolides）
 *   积存体内，鸟一次就学会不碰这套配色。
 *   **三色必须真的分得开** —— 第 5 轮 10 只里 7 只返工，头号病因就是把黑白对比
 *   压成了深灰叠深灰（见 docs/roadmap.md 第 3 条）。所以这里黑近全黑、白近全白、
 *   黄是真饱和的黄，测试逐对量明度差。
 * - **前后各一对肉质丝状突起（tentacle）**：胸部（T2）一对长、腹端（A8）一对短，
 *   长短比约 2:1，均向后弯曲。它们**不是触角**（触角在头壳上，只有一两毫米），
 *   是无骨骼的肉质突起，受惊时能摆动，所以做成柔软的弧线而非直刺。
 * - **三种附肢，形态完全不同**，这是鳞翅目幼虫的分类学基本功：
 *   · 3 对**胸足**（T1~T3）—— 真正的足，分节、尖细、末端带爪，将来发育成成虫的足；
 *   · 4 对**腹足**（A3~A6）—— 肉质无节的疣状突起，末端是带趾钩（crochets）的吸盘状趾面；
 *   · 1 对**尾足**（A10）—— 腹足的最后一对，略大且向后倾。
 *   腹足与尾足之间空着 A7~A9 三节不长足，这段明显的空档是肉眼可辨的科普点。
 * - **体侧一排气门**（T1 与 A1~A8，共 9 对）：小而深色的椭圆，落在浅色带上。
 */
import * as THREE from 'three'
import { chitin, finalize, legPair, loft, mandibles, type InsectModel, type Section } from '../kit'

// ---------------------------------------------------------------- 体轴与体节

/** 体躯（不含头壳）前端 X */
const BODY_FRONT_X = 2.02
/** 体躯末端 X */
const BODY_REAR_X = -2.38
/** 体节数：3 胸节 + 10 腹节。腹足间距、气门间距、色带宽度全按它切分 */
const SEGMENTS = 13

/**
 * 每节的三色带：宽黑 → 白 → 宽黄 → 白，四段占比之和为 1。
 *
 * 白带在真实幼虫身上是黑黄之间的过渡细线，第一版按 0.11/0.12 给，渲染出来
 * 细到只剩一条灰线，整只虫读成「黑黄两色」—— 三色里丢了一色。加宽到 0.14/0.15
 * 后三色才都数得出来。再宽就走向另一个极端：三色一平均，整条虫会发灰。
 *
 * **黑带排在每节最前**也是目视验收改出来的：白带打头时，紧贴头壳后方就是一圈白，
 * 正面机位下黑头壳成了「白球上的一块黑」；而真实幼虫头壳之后正是一条黑带，
 * 与黑头壳连成一片，读起来才是一只虫而不是一颗球。
 */
const BANDS: readonly { frac: number; kind: 'white' | 'black' | 'yellow' }[] = [
  { frac: 0.33, kind: 'black' },
  { frac: 0.14, kind: 'white' },
  { frac: 0.38, kind: 'yellow' },
  { frac: 0.15, kind: 'white' },
]

/**
 * 体轴：u=0 在体躯前端、u=1 在末端。
 * 背线中段微拱、前端略抬 —— 取食/静止时毛虫就是这个体态，
 * 一条笔直的管子会读成塑料软管。
 */
function axis(u: number): THREE.Vector3 {
  const x = THREE.MathUtils.lerp(BODY_FRONT_X, BODY_REAR_X, u)
  const y = 0.14 * Math.sin(Math.PI * Math.min(u * 1.05, 1)) + 0.1 * Math.pow(1 - u, 2.2)
  return new THREE.Vector3(x, y, 0)
}

/**
 * 体半径：整体包络（前细 → 中粗 → 尾收）× 逐节起伏 × 末端封口。
 *
 * 逐节起伏只有 5.5%，是节间的浅缢缩 —— 毛虫的分节靠这道缢缩和色带一起读出来，
 * 缢得深了会变成一串珠子。
 *
 * 末端封口这一项是目视验收补上的：只做包络时尾端还剩 0.15 的半径，
 * 放样封口封出一个正圆的平面，四个机位里都读成「一截锯断的塑料管」。
 * 最后 8% 按圆弧 √(1−x²) 收到零，尾端才是钝圆的（真实毛虫的尾端也是钝圆的）。
 */
function girth(u: number): number {
  const env = 0.2 + 0.1 * THREE.MathUtils.smoothstep(u, 0, 0.3) - 0.14 * THREE.MathUtils.smoothstep(u, 0.62, 1)
  const local = (u * SEGMENTS) % 1
  const ripple = 1 - 0.055 * Math.pow(Math.abs(Math.cos(local * Math.PI)), 1.4)
  const x = THREE.MathUtils.clamp((u - 0.92) / 0.08, 0, 1)
  const cap = Math.sqrt(Math.max(1 - x * x, 0))
  return Math.max(env * ripple * cap, 1e-4)
}

/**
 * 一条色带：体躯从 u0 到 u1 的一小段管。
 *
 * 为什么把体躯切成 52 段分别上色，而不是在一整根管子上贴斑纹：
 * 这个仓库不放任何贴图资产，斑纹只能靠几何。而只要相邻两段共用同一个 u 边界，
 * 半径与轴心就完全对齐，表面是连续的 —— 换来的是**边界锐利、色块真分得开**的横带，
 * 正是这只虫的招牌。中间段不封口（相邻段互相抵住），只有全身的头尾两段封。
 */
function bandRing(u0: number, u1: number, material: THREE.Material, name: string, cap: boolean): THREE.Mesh {
  const sections: Section[] = []
  const steps = 3
  for (let i = 0; i <= steps; i++) {
    const u = THREE.MathUtils.lerp(u0, u1, i / steps)
    const a = axis(u)
    const r = girth(u)
    sections.push({ at: a, ry: r, rz: r * 1.02 })
  }
  const mesh = new THREE.Mesh(loft(sections, 20, cap), material)
  mesh.name = name
  return mesh
}

// ---------------------------------------------------------------- 附属结构

/**
 * 肉质丝状突起：一条二次贝塞尔曲线放样成的锥管。
 * 用曲线而不是直线段，是因为它「柔软」这件事只能靠弧度表达 ——
 * 直的就成了刺，而刺是另一类结构（毛虫的刺有骨质基座，帝王蝶没有）。
 */
function filament(
  base: THREE.Vector3,
  ctrl: THREE.Vector3,
  tip: THREE.Vector3,
  thick: [number, number],
  material: THREE.Material,
  name: string,
): THREE.Mesh {
  const curve = new THREE.QuadraticBezierCurve3(base, ctrl, tip)
  const steps = 18
  const sections: Section[] = []
  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    const r = THREE.MathUtils.lerp(thick[0], thick[1], Math.pow(t, 0.85))
    sections.push({ at: curve.getPoint(t), ry: r, rz: r })
  }
  const mesh = new THREE.Mesh(loft(sections, 10), material)
  mesh.name = name
  return mesh
}

/**
 * 腹足 / 尾足：无节的肉质疣状突起，末端是略膨大的趾面 + 一圈趾钩。
 *
 * 与胸足的差别必须做出来而不是说出来：胸足是分节的锥体、末端收成爪尖；
 * 腹足是一根粗短的肉柱、末端反而更宽（那圈趾钩就是靠它抓住叶面的）。
 * 画成一样就等于把「鳞翅目幼虫为什么看起来有十条腿」这件事讲错了。
 */
function fleshyProleg(
  u: number,
  side: 1 | -1,
  opts: { radius: number; drop: number; lean: number; name: string },
  wallMat: THREE.Material,
  soleMat: THREE.Material,
): THREE.Group {
  const g = new THREE.Group()
  const a = axis(u)
  const gr = girth(u)
  const z0 = side * gr * 0.6
  const y0 = a.y - gr * 0.78
  const r = opts.radius
  // 由体壁向下、略向外张；lean 让尾足向后倾（尾足在真实幼虫身上就是向后撑的）
  const profile: [number, number, number][] = [
    [0.0, 0.06, 1.0],
    [0.28, -0.04, 1.06],
    [0.55, -0.13, 1.12],
    [0.82, -0.2, 1.16],
    [1.0, -0.24, 1.18],
  ]
  const radii = [r, r * 0.95, r * 0.9, r * 0.95, r * 0.74]
  const path = profile.map(
    ([t, dy, zk]) => new THREE.Vector3(a.x - opts.lean * t, y0 + dy * (opts.drop / 0.24), z0 * zk),
  )
  const sections: Section[] = path.map((at, i) => ({ at, ry: radii[i], rz: radii[i] }))
  const wall = new THREE.Mesh(loft(sections, 16), wallMat)
  wall.name = opts.name
  g.add(wall)

  // 趾钩环：趾面外缘一圈小钩，毛虫就靠它挂在叶背上
  const sole = new THREE.Mesh(new THREE.TorusGeometry(r * 0.68, r * 0.15, 8, 18), soleMat)
  sole.rotation.x = Math.PI / 2
  sole.position.copy(path[path.length - 1]).add(new THREE.Vector3(0, -0.008, 0))
  sole.name = `${opts.name}-sole`
  g.add(sole)
  return g
}

/**
 * 头壳上的浅色纵纹：自头顶（两侧纹在此辐辏）向前下方分开，正面看成一个「人」字。
 * 帝王蝶幼虫的头壳是黑底 + 浅黄白纵纹，与体节的三色带同属一套警戒配色。
 */
function headStripe(
  center: THREE.Vector3,
  radius: number,
  side: 1 | -1,
  psi: [number, number],
  material: THREE.Material,
): THREE.Mesh {
  const sections: Section[] = []
  const steps = 12
  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    // φ 自头顶向前下方扫，ψ 随之向体侧张开：φ=0 处所有纹汇于头顶那一点
    const phi = THREE.MathUtils.degToRad(THREE.MathUtils.lerp(4, 104, t))
    const ang = side * THREE.MathUtils.degToRad(THREE.MathUtils.lerp(psi[0], psi[1], t))
    const dir = new THREE.Vector3(Math.sin(phi) * Math.cos(ang), Math.cos(phi), Math.sin(phi) * Math.sin(ang))
    // 纹要细：目视验收第一版给到 0.03，四条纹把黑头壳盖成了一颗白球
    const r = 0.022 * (1 - 0.25 * t)
    sections.push({ at: center.clone().addScaledVector(dir, radius + 0.004), ry: r, rz: r })
  }
  const mesh = new THREE.Mesh(loft(sections, 8), material)
  mesh.name = 'head-stripe'
  return mesh
}

// ---------------------------------------------------------------- 建模主体

export function buildMonarchButterflyLarva(): InsectModel {
  const g = new THREE.Group()

  /*
   * 三色的取值是这只虫成败所系。ACES 色调映射会提亮去饱和，于是有了「颜色压深
   * 一档」的经验 —— 但它被误解成「越深越保险」之后，招牌图案就在画面上消失了。
   * 这里反过来把三色**拉开**：黑近全黑（L≈0.08）、白近全白（L≈0.93）、
   * 黄是真饱和的暖黄（L≈0.54, S≈0.9, hue≈46°，亮度与 ladybird.ts 的 #e2382a 同档）。
   * 三者逐对的 sRGB 明度差都在 0.35 以上，测试逐对钉住。
   */
  const blackMat = chitin({ color: '#141117', gloss: 0.42, clearcoat: 0.2 })
  const whiteMat = chitin({ color: '#f7f4ec', gloss: 0.38, clearcoat: 0.18 })
  const yellowMat = chitin({ color: '#f4c21e', gloss: 0.4, clearcoat: 0.2 })
  const bandMat = { black: blackMat, white: whiteMat, yellow: yellowMat }

  const legMat = chitin({ color: '#171319', gloss: 0.55, clearcoat: 0.3 })
  const prolegMat = chitin({ color: '#1c171c', gloss: 0.3 })
  const crochetMat = chitin({ color: '#b99b62', gloss: 0.45 })
  const spiracleMat = chitin({ color: '#1b1418', gloss: 0.5 })

  // ---- 体躯：13 节 × 4 条色带 = 52 段，逐段上色
  const total = SEGMENTS * BANDS.length
  let done = 0
  for (let s = 0; s < SEGMENTS; s++) {
    let acc = 0
    for (const band of BANDS) {
      const u0 = (s + acc) / SEGMENTS
      acc += band.frac
      const u1 = (s + acc) / SEGMENTS
      g.add(bandRing(u0, u1, bandMat[band.kind], `band-${band.kind}`, done === 0 || done === total - 1))
      done++
    }
  }

  // ---- 头壳：黑色圆钝的头囊，略小于体躯前端（毛虫的头比身体细，缩在第一节里）
  const headCenter = new THREE.Vector3(2.19, 0.09, 0)
  const headR = 0.185
  const head = new THREE.Mesh(new THREE.SphereGeometry(headR, 26, 20), blackMat)
  head.scale.set(1.06, 1, 0.97)
  head.position.copy(headCenter)
  head.name = 'head-capsule'
  g.add(head)
  for (const side of [1, -1] as const) {
    g.add(headStripe(headCenter, headR, side, [12, 40], whiteMat))
    g.add(headStripe(headCenter, headR, side, [46, 88], whiteMat))
  }
  // 咀嚼式口器：毛虫是啃叶子的，一对大颚在头壳前下方
  g.add(mandibles({ at: [2.3, -0.09, 0.035], length: 0.09, spread: 0.35, curve: 0.55 }, legMat))
  // 头壳上的触角只有一两毫米，与那两对肉质突起完全不是一回事，这里如实做小
  for (const side of [1, -1] as const) {
    const b = new THREE.Vector3(2.32, -0.03, side * 0.062)
    const antenna = new THREE.Mesh(
      loft(
        [
          { at: b, ry: 0.016, rz: 0.016 },
          { at: b.clone().add(new THREE.Vector3(0.045, -0.02, side * 0.012)), ry: 0.005, rz: 0.005 },
        ],
        7,
      ),
      legMat,
    )
    antenna.name = 'head-antenna'
    g.add(antenna)
  }

  // ---- 两对肉质丝状突起：T2 一对长、A8 一对短，都向后弯
  const frontU = 1.45 / SEGMENTS
  const rearU = 10.4 / SEGMENTS
  for (const side of [1, -1] as const) {
    const fb = new THREE.Vector3(axis(frontU).x, axis(frontU).y + girth(frontU) * 0.72, side * 0.085)
    g.add(
      filament(
        fb,
        fb.clone().add(new THREE.Vector3(0.16, 0.5, side * 0.13)),
        fb.clone().add(new THREE.Vector3(-0.72, 0.7, side * 0.3)),
        [0.058, 0.011],
        blackMat,
        'tentacle-front',
      ),
    )
    const rb = new THREE.Vector3(axis(rearU).x, axis(rearU).y + girth(rearU) * 0.72, side * 0.085)
    g.add(
      filament(
        rb,
        rb.clone().add(new THREE.Vector3(0.06, 0.28, side * 0.09)),
        rb.clone().add(new THREE.Vector3(-0.36, 0.4, side * 0.2)),
        [0.042, 0.009],
        blackMat,
        'tentacle-rear',
      ),
    )
  }

  // ---- 3 对胸足：分节、尖细、末端成爪。用 kit.legPair()，与成虫的足同一套骨架。
  // 着生点取在每节的**黄带**上（+0.79 的相位与气门相同）：黑足长在黑带上时
  // 目视验收里整个消失了，而真实幼虫的胸足恰好就在浅色带的位置上。
  const thoracic: [number, number][] = [
    [0.79, -14],
    [1.79, 2],
    [2.79, 18],
  ]
  for (const [seg, sweep] of thoracic) {
    const u = seg / SEGMENTS
    const a = axis(u)
    const gr = girth(u)
    g.add(
      legPair(
        {
          base: [a.x, a.y - gr * 0.72, gr * 0.56],
          femur: 0.175,
          tibia: 0.145,
          tarsus: 0.085,
          thickness: 0.038,
          splay: 40,
          sweep,
          knee: 78,
          ankle: 62,
        },
        legMat,
      ),
    )
  }

  // ---- 4 对腹足（A3~A6）+ 1 对尾足（A10）。A7~A9 三节无足，中间那段空档是可辨认的
  for (const seg of [5.5, 6.5, 7.5, 8.5]) {
    for (const side of [1, -1] as const) {
      g.add(
        fleshyProleg(
          seg / SEGMENTS,
          side,
          { radius: 0.105, drop: 0.24, lean: 0.02, name: 'proleg' },
          prolegMat,
          crochetMat,
        ),
      )
    }
  }
  for (const side of [1, -1] as const) {
    g.add(
      fleshyProleg(
        12.25 / SEGMENTS,
        side,
        { radius: 0.115, drop: 0.26, lean: 0.13, name: 'clasper' },
        prolegMat,
        crochetMat,
      ),
    )
  }

  // ---- 气门：T1 与 A1~A8 共 9 对，落在每节的黄带上（黑带上会看不见）
  for (const seg of [0, 3, 4, 5, 6, 7, 8, 9, 10]) {
    const u = (seg + 0.79) / SEGMENTS
    const a = axis(u)
    const gr = girth(u)
    for (const side of [1, -1] as const) {
      const sp = new THREE.Mesh(new THREE.SphereGeometry(0.034, 10, 8), spiracleMat)
      sp.scale.set(0.55, 1, 0.4)
      sp.position.set(a.x, a.y - gr * 0.3, side * gr * 1.0)
      sp.name = 'spiracle'
      g.add(sp)
    }
  }

  const frontTip = new THREE.Vector3(axis(frontU).x - 0.72, axis(frontU).y + girth(frontU) * 0.72 + 0.7, 0.385)
  const rearTip = new THREE.Vector3(axis(rearU).x - 0.36, axis(rearU).y + girth(rearU) * 0.72 + 0.4, 0.285)
  const prolegU = 6.5 / SEGMENTS

  const anchors: Record<string, THREE.Vector3> = {
    head: headCenter.clone().add(new THREE.Vector3(0.02, headR * 0.9, 0)),
    tentacleFront: frontTip,
    tentacleRear: rearTip,
    band: new THREE.Vector3(axis(0.42).x, axis(0.42).y + girth(0.42), 0),
    proleg: new THREE.Vector3(axis(prolegU).x, axis(prolegU).y - girth(prolegU) * 0.78 - 0.2, 0.13),
    spiracle: new THREE.Vector3(axis(0.29).x, axis(0.29).y - girth(0.29) * 0.3, girth(0.29)),
  }

  return finalize(g, anchors)
}
