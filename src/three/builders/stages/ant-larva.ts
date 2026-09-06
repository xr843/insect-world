/**
 * 日本弓背蚁 · 幼虫 Camponotus japonicus（完全变态第 2 阶段）
 *
 * 单位与坐标系与成虫（../ant.ts）一致：1 = 1 厘米真实体长，
 * +X 向前、+Y 向上、+Z 向右。
 *
 * ## 这一阶段要讲的事：幼虫与成虫**没有一处相同**
 *
 * 成虫是三段式、细腰、六足、膝状触角、黑亮外骨骼；末龄幼虫是一条乳白的
 * C 形蛆，**没有足、没有眼、没有腰**，连体节都得凑近了才数得出来。
 * 完全变态最反直觉的一课就在这个对比里。
 *
 * ## 形态依据
 *
 * 1. **无足**。膜翅目幼虫**彻底无足** —— 既没有鞘翅目蛴螬的 3 对胸足，
 *    也没有鳞翅目毛虫的胸足 + 腹足。给它加一对腿就是换了一个目。
 *    本文件里除体壁、头壳、上颚与钩毛之外**一根附肢都没有**，测试按
 *    「所有顶点到体轴的距离都不超过 0.21」看着这件事：最粗处体半径 0.125、
 *    钩毛长 0.055，全模型实测最远的一个顶点是 0.167（某根钩毛的尖），
 *    而 kit 的一条足光股节就有 0.3，加上去立刻越界。
 * 2. **C 形蛆状体**。体轴是一段 165° 的弧（曲率半径 0.39，前端再紧一档），
 *    实测弧长 1.06、弦长 0.70、切线总转角 188° —— 末龄体长约 1.06 厘米
 *    （真值 0.8~1.2）；「弯成 C」量的则是弧长/弦长 = 1.52 与那 188°。
 *    ⚠️ 弧长才是「体长」：把它拉直成一根管，长度不变而形态全废，
 *    所以测试量的是**弧长 / 弦长**与**切线总转角**，不是包围盒。
 *    弯的方向：凹面（腹面）朝上、头尾两端翘起 —— 膜翅目幼虫向腹面蜷曲，
 *    工蚁把它挂在巢壁上时就是这个姿势。
 * 3. **前细后粗**。头端体半径只有 0.026，最粗处 0.125 落在 u≈0.6（偏后），
 *    尾端收圆。「前端细成一条颈、后段鼓成一个囊」是膜翅目幼虫的剪影特征，
 *    与两端等粗的蝇蛆、纺锤形的蛴螬都不同。
 * 4. **分节明显**。13 节，节间是**窄而浅的折痕**（|cos|^6、深 5.5%）；
 *    折痕一深就读成松果（白蚁兵蚁与蛴螬那两轮栽过）。乳白体壁上单靠几何
 *    起伏在漫射光下读不出来，所以每道节间另加一圈**略深一档的窄环**
 *    （明度差 0.09）—— 这是「看得见的分节」与「量得到的分节」的差别。
 * 5. **稀疏的短钩毛**。46 根，末端弯成钩。工蚁靠这些钩毛把幼虫叼起来、
 *    或把它挂在巢室壁上（Camponotus 的幼虫就是这样成串挂着的）。
 *    **钩必须是弯的**：直毛是刺，是另一类结构；测试逐根量弧长/弦长。
 * 6. **头小、色略深、带一对小上颚**。头壳只有轻度骨化，取浅琥珀
 *    （明度 0.73 对体壁 0.91）—— 再压深就成了「戴了顶帽子」。
 *    上颚小而实用：幼虫靠它咬工蚁反哺的食物团，不是捕猎器官。
 * 7. **体壁半透**。`chitin({ translucent: true })` 走 transmission 通道，
 *    隐约透出内部 —— 真实的蚁幼虫能看见肠道里的食物。
 *    基色取真正接近白的乳白 `#f4ecdc`，**不压深**：三个阶段都是浅色物件，
 *    一压就全成灰坨（本仓库栽过的「越深越保险」）。
 *
 * ## 姿态
 *
 * C 形所在的平面绕 X 轴倾 35°。平面正对 +Z 时，顶视机位只看得到一根条；
 * 倾过来之后顶 / 侧 / 前斜 / 展台默认四个机位与该平面的法线夹角是
 * 48° / 20° / 63° / 36°，四个都读得出这是一条弯的虫。
 */
import * as THREE from 'three'
import { chitin, finalize, loft, mandibles, type InsectModel, type Section } from '../kit'

// ---------------------------------------------------------------- 体轴

/** 体轴弧的基准曲率半径。0.39 是反解出来的：跨 165° 的弧配上前端收紧后，
 *  实测弧长恰好 1.06 —— 弧长才是「体长」，不是包围盒的跨度 */
const ARC_R = 0.39
/** 弧的起止方位角：跨 165°。不取正对称的 [352.5°, 187.5°] 是有原因的 ——
 *  那样 u=0 处的切线几乎正对 +Y，撞上 loft() 平行传输的退化分支（|ref·t|>0.98），
 *  截面标架会在第一环整体换轴。形状仍对，但换轴这件事没必要凭运气。 */
const PHI0 = THREE.MathUtils.degToRad(340)
const PHI1 = THREE.MathUtils.degToRad(175)
/** C 形平面绕 X 轴的倾角：四个机位都读得出弯度（理由见文件头「姿态」） */
const PLANE_TILT = THREE.MathUtils.degToRad(-35)

/**
 * 体轴上一点。u=0 头端、u=1 尾端。
 *
 * 半径随 u 收小（前端弯得更紧）：这不只是曲率变化，还把头端**往弧心里拉**，
 * 正是膜翅目幼虫「前端向腹面勾进去」的那个体态。一段等曲率的圆弧读起来
 * 像一节水管弯头。
 */
function axisPoint(u: number): THREE.Vector3 {
  const t = THREE.MathUtils.clamp(u, 0, 1)
  const phi = THREE.MathUtils.lerp(PHI0, PHI1, t)
  const r = ARC_R * (1 - 0.2 * Math.pow(1 - t, 2.2))
  return new THREE.Vector3(Math.cos(phi) * r, Math.sin(phi) * r, 0)
}

/** 体节数：3 胸节 + 10 腹节，蚁幼虫可辨的横褶数与之一致 */
const SEGMENTS = 13
/** 节间折痕深度（占该处体半径的比例）。超过 0.1 就开始读成松果 */
const GROOVE = 0.055
/** 节内微鼓：体节的「饱满」靠节中微凸，不靠节间深挖 */
const PLUMP = 0.02
/** 最粗处体半径：体宽 2.5 毫米，与 1.06 厘米的体长配成「粗壮的蛆」而不是「一条线虫」 */
const BODY_R = 0.125

/**
 * 体半径包络。u=0 头端细（一条颈）、u≈0.6 最粗、u=1 收圆封口。
 * 峰值刻意偏后 —— 膜翅目幼虫的体重都堆在后半段。
 */
const BODY_PROFILE = [
  [0.0, 0.21],
  [0.05, 0.34],
  [0.13, 0.5],
  [0.28, 0.78],
  [0.45, 0.94],
  [0.6, 1.0],
  [0.74, 0.97],
  [0.85, 0.86],
  [0.94, 0.58],
  [1.0, 0.08],
] as const

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

/** 节间折痕 + 节中微鼓。窄折痕（|cos|^6）而不是宽凹槽，同样深度下读得更清楚 */
function ripple(u: number): number {
  const local = u * SEGMENTS - Math.floor(u * SEGMENTS)
  const crease = Math.pow(Math.abs(Math.cos(local * Math.PI)), 6)
  // 两端各淡出一节：收口处再刻横褶会读成一圈圈的「切面」
  const fade = THREE.MathUtils.clamp(Math.min(u, 1 - u) / 0.07, 0, 1)
  return 1 - GROOVE * crease * fade + PLUMP * Math.sin(local * Math.PI) * fade
}

/** 该处的体半径（含节间折痕） */
function bodyRadius(u: number): number {
  return Math.max(BODY_R * keyframe(BODY_PROFILE, u) * ripple(u), 1e-4)
}

interface Frame {
  pos: THREE.Vector3
  /** 沿体轴向尾的方向 */
  forward: THREE.Vector3
  /** 体轴所在平面内、垂直于体轴（背腹向） */
  normal: THREE.Vector3
  /** 垂直于体轴平面（左右向） */
  lateral: THREE.Vector3
  r: number
}

function frameAt(u: number): Frame {
  const h = 1e-3
  const a = axisPoint(Math.max(0, u - h))
  const b = axisPoint(Math.min(1, u + h))
  const forward = new THREE.Vector3().subVectors(b, a).normalize()
  const lateral = new THREE.Vector3(0, 0, 1)
  const normal = new THREE.Vector3().crossVectors(forward, lateral).normalize()
  return { pos: axisPoint(u), forward, normal, lateral, r: bodyRadius(u) }
}

/** 虫体：沿 C 形体轴放样。横截面近圆、左右略宽（贴着巢壁挂久了本就不是正圆） */
function bodyGeometry(): THREE.BufferGeometry {
  const steps = SEGMENTS * 8
  const sections: Section[] = []
  for (let i = 0; i <= steps; i++) {
    const u = i / steps
    const r = bodyRadius(u)
    sections.push({ at: axisPoint(u), ry: r * 0.99, rz: r * 1.03 })
  }
  return loft(sections, 22)
}

/**
 * 节间的浅色环带：12 道，卡在体节交界上。
 *
 * 为什么不能只靠几何折痕：乳白体壁 + 漫射光下，5.5% 的半径起伏在出图里
 * 几乎读不出来（柞蚕蛾蛹那一轮同样的问题，解法也一样）。补一圈比体壁
 * 深一档（明度差 0.09）的窄环，任何角度都看得见分节；再深就成了一串箍。
 */
function annulusMeshes(mat: THREE.Material): THREE.Mesh[] {
  const out: THREE.Mesh[] = []
  const half = 0.006
  for (let k = 1; k < SEGMENTS; k++) {
    const u0 = k / SEGMENTS
    const sections: Section[] = []
    for (const du of [-half, 0, half]) {
      const u = THREE.MathUtils.clamp(u0 + du, 0, 1)
      const r = bodyRadius(u) * 1.008
      sections.push({ at: axisPoint(u), ry: r * 0.99, rz: r * 1.03 })
    }
    const m = new THREE.Mesh(loft(sections, 20, false), mat)
    m.name = 'larva-annulus'
    out.push(m)
  }
  return out
}

// ---------------------------------------------------------------- 钩毛

/** 钩毛根数：稀疏（真实幼虫体表的毛是数得清的），46 根 */
const HOOK_COUNT = 46
/**
 * 钩毛长基准 0.55 毫米，逐根在 0.47~0.66 毫米之间抖动。
 * 真实值 0.2~0.7 毫米，这里取上限那一档 —— 再短出图里就只剩一层白噪点，
 * 而「工蚁靠这些毛把幼虫叼起来」正是这一阶段的看点之一。占画面约 5%。
 */
const HOOK_LEN = 0.055
/** 黄金角布点：沿体轴与方位同时铺开，不成行成列 */
const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5))

/** 一根钩毛的中心曲线：基部在体壁上，毛干向后外方，末端甩向侧方成钩 */
function hookCurve(u: number, azimuth: number, len: number): THREE.QuadraticBezierCurve3 {
  const f = frameAt(u)
  const out = new THREE.Vector3()
    .addScaledVector(f.normal, Math.cos(azimuth))
    .addScaledVector(f.lateral, Math.sin(azimuth))
    .normalize()
  const base = f.pos.clone().addScaledVector(out, f.r * 0.96)
  // 毛干向后（朝尾端）斜卧，这是真实体毛的倒伏方向
  const dir = out.clone().addScaledVector(f.forward, 0.38).normalize()
  // 钩的弯向：与毛干、体轴都垂直的那一侧
  const bend = new THREE.Vector3().crossVectors(dir, f.forward).normalize()
  const ctrl = base.clone().addScaledVector(dir, len * 0.72)
  const tip = base.clone().addScaledVector(dir, len * 0.62).addScaledVector(bend, len * 0.6)
  return new THREE.QuadraticBezierCurve3(base, ctrl, tip)
}

/**
 * 一根钩毛：基部立在体壁上，向后外方伸出，**末端弯成钩**。
 *
 * 钩这件事必须做在几何里：直的一根是刺（刺有骨质基座，是另一类结构），
 * 弯的才是钩。用二次贝塞尔，控制点落在毛干方向上、终点甩向侧方，
 * 于是弧长比弦长长约 20% —— 测试逐根量这个比值。
 */
function hookMesh(curve: THREE.QuadraticBezierCurve3, mat: THREE.Material): THREE.Mesh {
  const steps = 8
  const sections: Section[] = []
  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    const r = THREE.MathUtils.lerp(0.0055, 0.0016, Math.pow(t, 0.8))
    sections.push({ at: curve.getPoint(t), ry: r, rz: r })
  }
  const m = new THREE.Mesh(loft(sections, 6), mat)
  m.name = 'larva-hook'
  return m
}

// ---------------------------------------------------------------- 头

/**
 * 头壳：体轴前端再往外延一小截的球冠。
 *
 * 沿**同一条体轴的切向**延伸而不是另摆一个球，头与颈之间才不会露缝；
 * 半径 0.026 → 0.037 → 收尖，读作「细颈上顶着一颗小头」。
 * 真实蚁幼虫的头壳直径不到 0.8 毫米，比最粗处的体径小三倍还多。
 */
function headGeometry(): { geo: THREE.BufferGeometry; tip: THREE.Vector3; forward: THREE.Vector3 } {
  const f = frameAt(0)
  const forward = f.forward.clone().multiplyScalar(-1) // 朝头端（离开虫体）
  const HEAD_LEN = 0.075
  const profile = [
    [0.0, 0.026],
    [0.25, 0.034],
    [0.5, 0.037],
    [0.75, 0.032],
    [0.92, 0.02],
    [1.0, 0.004],
  ] as const
  const sections: Section[] = profile.map(([t, r]) => ({
    at: f.pos.clone().addScaledVector(forward, t * HEAD_LEN),
    ry: r,
    rz: r,
  }))
  return {
    geo: loft(sections, 18),
    tip: f.pos.clone().addScaledVector(forward, HEAD_LEN),
    forward,
  }
}

// ---------------------------------------------------------------- 颜色

/** 体壁：真正接近白的乳白（明度 0.91）。不压深，防过曝靠哑光 + 次表面透光 */
const BODY_COLOR = '#f4ecdc'
/** 节间环：比体壁深一档（明度 0.82），差 0.09 —— 看得见分节，又不成一串箍 */
const ANNULUS_COLOR = '#e6d9bd'
/** 头壳：浅琥珀（明度 0.73）。轻度骨化，再压深就成了「戴帽子」 */
const HEAD_COLOR = '#dcc397'
/** 上颚：小而实用，深一档的琥珀褐才看得出是硬的口器 */
const MANDIBLE_COLOR = '#8f6b3a'
/** 钩毛：比体壁深一档（明度 0.78），否则白毛落在白身上等于没做 */
const HOOK_COLOR = '#dfd0ae'

// ---------------------------------------------------------------- 装配

export function buildAntLarva(): InsectModel {
  const g = new THREE.Group()
  const larva = new THREE.Group()
  larva.name = 'larva'
  larva.rotation.x = PLANE_TILT
  g.add(larva)

  // 体壁：哑光 + 次表面透光。**绝不用 elytra()** —— 幼虫是软体不是硬壳，
  // 乳白配鞘翅那档清漆会整片过曝成白铬（七星瓢虫、甘薯腊龟甲栽过）
  const bodyMat = chitin({ color: BODY_COLOR, gloss: 0.2, clearcoat: 0.03, translucent: true })
  const annulusMat = chitin({ color: ANNULUS_COLOR, gloss: 0.18, clearcoat: 0.02, translucent: true })
  // 头壳压到哑光：第一版给了 gloss 0.3 / clearcoat 0.08，顶视出图里那颗头
  // 读成一粒黄铜珠 —— 幼虫的头壳只是轻度骨化，不该有金属那档高光
  const headMat = chitin({ color: HEAD_COLOR, gloss: 0.2, clearcoat: 0.04 })
  const mandibleMat = chitin({ color: MANDIBLE_COLOR, gloss: 0.45, clearcoat: 0.2 })
  const hookMat = chitin({ color: HOOK_COLOR, gloss: 0.35 })

  const body = new THREE.Mesh(bodyGeometry(), bodyMat)
  body.name = 'larva-body'
  larva.add(body)

  for (const ring of annulusMeshes(annulusMat)) larva.add(ring)

  // ---- 头壳与上颚
  const head = headGeometry()
  const headMesh = new THREE.Mesh(head.geo, headMat)
  headMesh.name = 'larva-head'
  larva.add(headMesh)

  /*
   * 上颚挂在一个按头端朝向摆好的 group 里：kit.mandibles() 是沿 +X 造的，
   * 而头端的朝向随体轴的弧走，不在 +X 上。用基变换而不是硬凑角度，
   * 头再怎么调，上颚都还长在嘴上。
   */
  const jaw = new THREE.Group()
  jaw.name = 'larva-jaw'
  const ex = head.forward.clone()
  const ez = new THREE.Vector3(0, 0, 1)
  const ey = new THREE.Vector3().crossVectors(ez, ex).normalize()
  jaw.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(ex, ey, ez))
  jaw.position.copy(head.tip).addScaledVector(head.forward, -0.022)
  const jawMesh = mandibles({ at: [0, -0.006, 0.012], length: 0.036, spread: 0.42, curve: 0.72 }, mandibleMat)
  jawMesh.traverse((o) => {
    if ((o as THREE.Mesh).isMesh) o.name = 'larva-mandible'
  })
  jaw.add(jawMesh)
  larva.add(jaw)

  // ---- 钩毛：沿体轴与方位同时按黄金角铺开
  const hookCurves: THREE.QuadraticBezierCurve3[] = []
  for (let i = 0; i < HOOK_COUNT; i++) {
    const u = 0.1 + 0.85 * ((i + 0.5) / HOOK_COUNT)
    const azimuth = i * GOLDEN_ANGLE * 2.1
    const len = HOOK_LEN * (0.86 + (0.34 * ((i * 7) % 5)) / 4)
    const curve = hookCurve(u, azimuth, len)
    hookCurves.push(curve)
    larva.add(hookMesh(curve, hookMat))
  }

  // ---- 锚点：一律落在真实几何体表面上
  larva.updateMatrixWorld(true)
  const onLarva = (v: THREE.Vector3) => larva.localToWorld(v.clone())

  const midFrame = frameAt(0.55)
  // 钩毛的锚点取**某一根真实钩毛的中段**，不是「体侧大概那个位置」——
  // 锚点浮在空气里正是这个仓库设过闸门专抓的那类 bug
  const sampleHook = hookCurves[Math.floor(HOOK_COUNT * 0.42)]

  const anchors: Record<string, THREE.Vector3> = {
    // 头壳侧面
    head: onLarva(head.tip.clone().addScaledVector(head.forward, -0.035).add(new THREE.Vector3(0, 0.02, 0.02))),
    // 体壁最粗处的背面
    body: onLarva(midFrame.pos.clone().addScaledVector(midFrame.normal, midFrame.r * 0.95)),
    // 钩毛（取第 19 根的中段）
    hook: onLarva(sampleHook.getPoint(0.5)),
    // 上颚
    mandible: onLarva(head.tip.clone().addScaledVector(head.forward, 0.012)),
  }

  return finalize(g, anchors)
}
