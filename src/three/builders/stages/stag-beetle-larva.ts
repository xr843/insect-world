/**
 * 中华大锹甲 · 幼虫 Dorcus hopei（完全变态第 2 阶段）
 *
 * ## 同是 C 形蛴螬，要看得出不是独角仙那一只
 *
 * 锹甲科与金龟科（独角仙）的幼虫都是朽木 / 腐殖质里的 C 形乳白蛴螬，
 * 外行一眼看去是同一种东西。`rhinoceros-beetle-larva.ts` 那只已经在图鉴里了，
 * 这只要是照抄参数换个颜色，两张卡片并排就是同一条虫 —— 把「锹甲吃朽木、
 * 独角仙吃腐殖土，幼虫也各有各的样子」这件事讲丢了。
 * 所以本文件每一处与独角仙幼虫不同的地方，都是照着**真实的科间区别**定的：
 *
 * | 部位 | 独角仙幼虫（金龟科） | 本种（锹甲科） |
 * |---|---|---|
 * | 体长 | 8~10 cm，比成虫大 | 老熟 5~6 cm（本文件 5.5） |
 * | 体色 | 乳黄、哑光 | **更白、略有光泽**（体壁紧绷发亮） |
 * | 头壳 | 红褐 | **橙黄至黄褐** |
 * | 上颚 | 短钝、深褐 | **大、黑、末端尖而内弯** |
 * | 体表毛 | 较密的红褐刚毛 | **稀疏、短、浅色** |
 * | 背面小环 | 每节 3 道 | **每节 2 道**（见 `ripple`） |
 * | 腹端 | 后肠透出大片深灰 | 腹端**更圆**、深色只有末端一小截、偏浅 |
 * | 肛门 | 横裂（「一」字） | **纵裂**（「丨」字）—— 分科检索表的经典特征 |
 * | 最粗处 | 腹前段 | **腹后段**，身体越往后越饱满 |
 *
 * ## 招牌结构（做不出就等于没做）
 *
 * 1. **C 形蜷曲。** 蛴螬的定义姿态，向**腹面**卷。沿一条真正的 C 形路径放样
 *    （见 curlPoint），圆心角 275°，缺口朝 +X，头端在上前方、腹端在下前方。
 * 2. **头壳橙黄、坚硬、有高光；上颚又大又黑。** 这是离远了唯一的深色块，
 *    也是锹甲幼虫照片里最抢眼的一处。头壳与体壁的明度差（0.45 对 0.91）
 *    表达「头是骨化的、身子是软的」；上颚几乎是黑的（0.08），再叠在橙色头壳上，
 *    两层对比读得出「头上长着一对黑钳」。
 * 3. **三对胸足，腹部无足。** 蛴螬与毛虫的分界线。锹甲幼虫的胸足相对更长更细。
 * 4. **体侧一排气门**，深褐小椭圆，每侧 9 枚（前胸 1 + 腹部 8）。
 * 5. **肛门纵裂。** 腹端圆顶正中一道**竖着的**深色短缝。锹甲科与金龟科幼虫
 *    的分科检索头一条就看这里（金龟科是横裂或弧形）。腹端极点朝向 C 的缺口
 *    （+X），前斜机位正对着它，看得最清楚。
 *
 * ## 材质纪律
 *
 * - 体壁绝不用 `elytra()`（gloss 0.74 + clearcoat 0.55 是硬鞘翅的档）。
 *   比独角仙幼虫稍亮一档（gloss 0.36 / clearcoat 0.08）表达「紧绷发亮」，
 *   但高光依然宽而软，不会顶进 ACES 的过曝区。
 * - **不开 `translucent`**：星天牛幼虫那一轮的真因 —— transmission 在长条体上
 *   把整只虫变成一块透镜，出图糊成一团褐色，46 条断言全绿。独角仙幼虫开着
 *   看起来还行，是因为它更黄更暗、卷得更紧；这只更白，折射出来的背景色
 *   会直接盖掉体节阴影。乳白的「软」靠哑光 + 明度差 + 形体阴影表达。
 *
 * 局部坐标系与成虫完全一致：+X 向前（头）、+Y 向上（背）、+Z 向右。
 * C 形蜷曲画在 XY（矢状）平面里 —— 默认机位与侧机位都从 +Z 方向看过来。
 */
import * as THREE from 'three'
import { chitin, finalize, legPair, loft, type InsectModel, type Section } from '../kit'

// ---------------------------------------------------------------- 尺度常量

/** 躯干中心线弧长（不含头壳）。加上头壳 0.5 ≈ 5.5 厘米，落在老熟幼虫 5~6 的中间 */
const TRUNK_ARC = 5.0
/** 头壳伸出躯干前端的长度 */
const HEAD_OUT = 0.5
/** C 的圆心角。比独角仙的 290° 略松：锹甲幼虫后段更粗，卷太紧两端会撞上 */
const CURL_START_DEG = 40
const CURL_SPAN_DEG = 275
/** 中心线的螺旋量：前段外张、尾段内收，破掉正圆的机械感 */
const SPIRAL = 0.05
/** 可见体节数：3 胸节 + 10 腹节 */
const SEGMENTS = 13
/** 每节的放样采样数 */
const SEG_SAMPLES = 8
/** 放样径向分段数 */
const RADIAL = 26
/** 节间沟深度（占该处半径）。松果红线是 0.09 */
const GROOVE = 0.055
/** 节中那道次级小环的深度 —— 背面每节 2 道小环（金龟科是 3 道） */
const ANNULET = 0.022
/** 节内鼓起量 */
const PLUMP = 0.025
/** 腹端变深的起点（沿躯干弧长）。0.86 ≈ 最后 1.8 节 —— 比独角仙（0.755）短一大截 */
const DARK_TAIL_FROM = 0.86
/** 尾端圆顶的起点：这一段按球冠收口。长度 ≈ 该处半径，腹端才是「圆」的 */
const TIP_ROUND_FROM = 0.89

// ---------------------------------------------------------------- 颜色

/** 体壁：比独角仙（#ecdfc2）更白、更不黄 */
const BODY_COLOR = '#f3ecdc'
/** 腹端：后肠内容物透出的浅灰褐。比独角仙的 #9a8868 浅一档 —— 锹甲幼虫腹端没那么黑 */
const TAIL_COLOR = '#b5a68a'
/** 头壳：橙黄褐。锹甲幼虫最好认的颜色 */
const HEAD_COLOR = '#c47a2c'
/** 上颚：近黑 */
const MANDIBLE_COLOR = '#17110d'
/** 胸足：浅黄褐 */
const LEG_COLOR = '#d8b27a'
/** 爪与气门、肛裂：深褐 */
const DARK_POINT_COLOR = '#5a3217'
/** 刚毛：稀疏、浅色 */
const SETA_COLOR = '#d6bd8a'

// ---------------------------------------------------------------- 中心线

const CURL_START = THREE.MathUtils.degToRad(CURL_START_DEG)
const CURL_SPAN = THREE.MathUtils.degToRad(CURL_SPAN_DEG)

function curlPoint(t: number, r0: number): THREE.Vector3 {
  const phi = CURL_START + CURL_SPAN * t
  const r = r0 * (1 + SPIRAL * Math.cos(Math.PI * t))
  return new THREE.Vector3(Math.cos(phi) * r, Math.sin(phi) * r, 0)
}

/** 反解卷曲半径：按目标弧长等比放大，改圆心角 / 螺旋量时体长不会悄悄变 */
const CURL_R = (() => {
  const N = 600
  let len = 0
  let prev = curlPoint(0, 1)
  for (let i = 1; i <= N; i++) {
    const p = curlPoint(i / N, 1)
    len += p.distanceTo(prev)
    prev = p
  }
  return TRUNK_ARC / len
})()

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
 * 躯干半径包络：颈部细 → 胸部渐粗 → 腹部缓缓继续变粗 → **腹后段最粗（0.6）**
 * → 圆顶收口。
 *
 * 与独角仙幼虫恰好相反：那只峰值在 t≈0.42（腹前段），这只在 t≈0.74。
 * 锹甲幼虫侧面看是「前细后粗的一只口袋」，这是两者轮廓上最大的差别。
 */
const ENVELOPE = [
  [0.0, 0.2],
  [0.05, 0.3],
  [0.12, 0.41],
  [0.25, 0.48],
  [0.45, 0.53],
  [0.62, 0.58],
  [0.76, 0.6],
  [0.89, 0.575],
  [1.0, 0.54],
] as const

function envelope(t: number): number {
  const base = keyframe(ENVELOPE, t)
  if (t <= TIP_ROUND_FROM) return base
  const u = (t - TIP_ROUND_FROM) / (1 - TIP_ROUND_FROM)
  return base * Math.sqrt(Math.max(0, 1 - u * u))
}

/**
 * 节间起伏：节间一道窄折痕（`|cos|^6`）+ 节中一道更浅的次级小环 + 节内微凸。
 *
 * 次级小环就是「每节 2 道背面小环」的表达（金龟科是 3 道）。它只有主折痕的
 * 四成深，看起来是「每节中间有一道细线」而不是「节数翻倍」。
 */
function ripple(t: number): number {
  const local = t * SEGMENTS - Math.floor(t * SEGMENTS)
  const crease = Math.pow(Math.abs(Math.cos(local * Math.PI)), 6)
  const annulet = Math.pow(Math.abs(Math.sin(local * Math.PI)), 14)
  // 腹端圆顶光滑无褶：最后一段把起伏淡出
  const fade = THREE.MathUtils.clamp((0.87 - t) / 0.1, 0, 1)
  return 1 - (GROOVE * crease + ANNULET * annulet) * fade + PLUMP * Math.sin(local * Math.PI) * fade
}

/** 该处的背腹半径与左右半径。横截面近圆、略宽于高 */
function radiiAt(t: number): { ry: number; rz: number } {
  const r = Math.max(envelope(t) * ripple(t), 1e-4)
  return { ry: r * 0.97, rz: r * 1.05 }
}

/**
 * 体轴局部标架。中心线在 XY 平面里，侧向恒为 +Z，
 * 背向 = 切向 × 侧向（= 卷曲的外侧：蛴螬向腹面卷，C 的内侧是肚子）。
 */
interface Frame {
  pos: THREE.Vector3
  forward: THREE.Vector3
  dorsal: THREE.Vector3
  lateral: THREE.Vector3
  ry: number
  rz: number
}

const LATERAL = new THREE.Vector3(0, 0, 1)

function frameAt(t: number): Frame {
  const h = 1e-3
  const a = curlPoint(Math.max(0, t - h), CURL_R)
  const b = curlPoint(Math.min(1, t + h), CURL_R)
  const tangent = new THREE.Vector3().subVectors(b, a).normalize() // 指向尾端
  const dorsal = new THREE.Vector3().crossVectors(tangent, LATERAL).normalize()
  const { ry, rz } = radiiAt(t)
  return { pos: curlPoint(t, CURL_R), forward: tangent.clone().negate(), dorsal, lateral: LATERAL.clone(), ry, rz }
}

/** 把一个 group 摆到体轴的某个标架上（局部 +X = 朝头、+Y = 背、+Z = 右） */
function orient(obj: THREE.Object3D, f: Frame): void {
  obj.position.copy(f.pos)
  obj.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(f.forward, f.dorsal, f.lateral))
}

// ---------------------------------------------------------------- 部件

/** 躯干：沿 C 形路径整条放样（uv 的 v 恰好等于体轴参数 t，腹端上色靠它） */
function trunkGeometry(): THREE.BufferGeometry {
  const total = SEGMENTS * SEG_SAMPLES
  const sections: Section[] = []
  for (let i = 0; i <= total; i++) {
    const t = i / total
    const { ry, rz } = radiiAt(t)
    sections.push({ at: curlPoint(t, CURL_R), ry, rz })
  }
  return loft(sections, RADIAL)
}

/**
 * 头壳：圆而略方的骨化头囊。锹甲幼虫的头比独角仙的相对更大、更「方」，
 * 横截面宽于高（rz/ry = 1.16）。后端 0.25 塞进躯干里，接缝天然被躯干包住。
 */
const HEAD_PROFILE = [
  [0.0, 0.17],
  [0.18, 0.36],
  [0.4, 0.42],
  [0.66, 0.4],
  [0.86, 0.31],
  [1.0, 0.1],
] as const

function headCapsule(material: THREE.Material): THREE.Mesh {
  const back = -0.25
  const span = -back + HEAD_OUT
  const steps = 24
  const sections: Section[] = []
  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    const r = keyframe(HEAD_PROFILE, t)
    sections.push({ at: new THREE.Vector3(back + span * t, 0, 0), ry: r * 0.93, rz: r * 1.08 })
  }
  const mesh = new THREE.Mesh(loft(sections, 24), material)
  mesh.name = 'larva-head'
  return mesh
}

/**
 * 上颚：一对**大而黑、末端尖而内弯**的颚。独角仙幼虫那对是短钝的凿子
 * （长 0.4、末端半径 0.055），这对长 0.62、末端收到 0.035 —— 锹甲幼虫的上颚
 * 在头壳前面明显伸出来一截，是它最好认的一处。
 *
 * 路径中段外鼓（z = ±0.36）、末端才内弯到 ±0.1：分离量放在颚的中段，
 * 顶视投影下两颚才真的不相交（白蚁兵蚁四次返工换来的写法）。
 */
function larvalMandibles(material: THREE.Material): THREE.Group {
  const g = new THREE.Group()
  for (const side of [1, -1] as const) {
    const p0 = new THREE.Vector3(0.34, -0.06, side * 0.2)
    const p1 = new THREE.Vector3(0.74, -0.14, side * 0.36)
    const p2 = new THREE.Vector3(0.9, -0.26, side * 0.1)
    const steps = 14
    const sections: Section[] = []
    for (let i = 0; i <= steps; i++) {
      const t = i / steps
      const inv = 1 - t
      const at = new THREE.Vector3(
        inv * inv * p0.x + 2 * inv * t * p1.x + t * t * p2.x,
        inv * inv * p0.y + 2 * inv * t * p1.y + t * t * p2.y,
        inv * inv * p0.z + 2 * inv * t * p1.z + t * t * p2.z,
      )
      const r = THREE.MathUtils.lerp(0.12, 0.035, Math.pow(t, 0.9))
      sections.push({ at, ry: r, rz: r * 0.82 })
    }
    const m = new THREE.Mesh(loft(sections, 14), material)
    m.name = 'larva-mandible'
    g.add(m)
  }
  return g
}

/**
 * 三对胸足：比独角仙幼虫的相对更长更细（锹甲幼虫的中后足之间还有发音器，
 * 这个尺度下做不出来，略去）。全部长在前三节（t = 0.5/13、1.5/13、2.5/13）。
 * 着生点在腹侧偏外，腿从体侧探出、再在膝处折向腹面。
 */
const LEG_SPECS = [
  { t: 0.5 / SEGMENTS, femur: 0.34, tibia: 0.3, tarsus: 0.15, sweep: -30 },
  { t: 1.5 / SEGMENTS, femur: 0.38, tibia: 0.33, tarsus: 0.16, sweep: -8 },
  { t: 2.5 / SEGMENTS, femur: 0.42, tibia: 0.36, tarsus: 0.17, sweep: 12 },
] as const

function thoracicLegs(legMat: THREE.Material, clawMat: THREE.Material): THREE.Group {
  const g = new THREE.Group()
  for (const spec of LEG_SPECS) {
    const f = frameAt(spec.t)
    const holder = new THREE.Group()
    orient(holder, f)

    const pair = legPair(
      {
        base: [0, -0.5 * f.ry, 0.72 * f.rz],
        femur: spec.femur,
        tibia: spec.tibia,
        tarsus: spec.tarsus,
        splay: 14,
        sweep: spec.sweep,
        knee: 100,
        thickness: 0.058,
        spines: false,
      },
      legMat,
    )
    for (const child of pair.children) child.name = 'larva-leg'

    // 爪：跗节末端一枚深色小钩（kit.leg() 的绝对端点约定，左腿 z 取负）
    const one = pair.children[0]
    const tip = one.userData.tip as THREE.Vector3
    const knee = one.userData.knee as THREE.Vector3
    const dir = new THREE.Vector3().subVectors(tip, knee).normalize()
    for (const s of [1, -1] as const) {
      const a = new THREE.Vector3(tip.x, tip.y, tip.z * s)
      const b = a.clone().addScaledVector(new THREE.Vector3(dir.x, dir.y, dir.z * s), 0.07)
      const claw = new THREE.Mesh(
        loft([{ at: a, ry: 0.026, rz: 0.026 }, { at: b, ry: 0.004, rz: 0.004 }], 8),
        clawMat,
      )
      claw.name = 'larva-claw'
      pair.add(claw)
    }

    holder.add(pair)
    g.add(holder)
  }
  return g
}

/**
 * 体侧一排气门：前胸 1 枚 + 腹部 1~8 节各 1 枚，每侧 9 枚。
 * 沿体轴拉长、贴着体壁压扁的深褐小椭圆；圆心正落在体壁上（系数 1.0）——
 * 独角仙幼虫第一版取 0.95「陷进去一点」，整排全埋进体壁里看不见。
 */
const SPIRACLE_SEGMENTS = [0, 3, 4, 5, 6, 7, 8, 9, 10] as const

function spiracles(material: THREE.Material): THREE.Group {
  const g = new THREE.Group()
  const theta = THREE.MathUtils.degToRad(76)
  for (const seg of SPIRACLE_SEGMENTS) {
    const t = (seg + 0.45) / SEGMENTS
    const f = frameAt(t)
    for (const side of [1, -1] as const) {
      const out = new THREE.Vector3()
        .addScaledVector(f.dorsal, Math.cos(theta))
        .addScaledVector(f.lateral, side * Math.sin(theta))
        .normalize()
      const third = new THREE.Vector3().crossVectors(f.forward, out).normalize()
      const m = new THREE.Mesh(new THREE.SphereGeometry(0.06, 12, 8), material)
      m.name = 'larva-spiracle'
      m.position
        .copy(f.pos)
        .addScaledVector(f.dorsal, Math.cos(theta) * f.ry)
        .addScaledVector(f.lateral, side * Math.sin(theta) * f.rz)
      m.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(f.forward, out, third))
      m.scale.set(1, 0.42, 0.6)
      g.add(m)
    }
  }
  return g
}

/**
 * 稀疏短毛：每节只有 4 根（独角仙幼虫 6 根）、长 0.07（独角仙 0.18）、浅色。
 * 锹甲幼虫体表看上去几乎是光的，这几根只负责让近看时不像一根塑料香肠。
 */
function setae(material: THREE.Material): THREE.Group {
  const g = new THREE.Group()
  const angles = [40, 100, -40, -100].map((d) => THREE.MathUtils.degToRad(d))
  for (let seg = 0; seg < SEGMENTS - 1; seg++) {
    const t = (seg + 0.5) / SEGMENTS
    const f = frameAt(t)
    for (const a of angles) {
      const out = new THREE.Vector3()
        .addScaledVector(f.dorsal, Math.cos(a))
        .addScaledVector(f.lateral, Math.sin(a))
        .normalize()
      const root = new THREE.Vector3()
        .copy(f.pos)
        .addScaledVector(f.dorsal, Math.cos(a) * f.ry * 0.97)
        .addScaledVector(f.lateral, Math.sin(a) * f.rz * 0.97)
      const dir = out.clone().multiplyScalar(0.7).addScaledVector(f.forward, -0.71).normalize()
      const tip = root.clone().addScaledVector(dir, 0.07)
      const seta = new THREE.Mesh(
        loft([{ at: root, ry: 0.012, rz: 0.012 }, { at: tip, ry: 0.002, rz: 0.002 }], 5),
        material,
      )
      seta.name = 'larva-seta'
      g.add(seta)
    }
  }
  return g
}

/**
 * 肛门纵裂：腹端圆顶正中一道**竖着的**深色短缝。
 *
 * 缝沿圆顶表面的**背中线 → 尾极 → 腹中线**走，每个采样点直接取该 t 处
 * 体壁上的点（`pos ± dorsal·ry`），所以严丝合缝地贴着真实表面。
 * ⚠️ 第一版把圆顶近似成一个以 `TIP_ROUND_FROM` 标架为轴的半椭球，但尾端
 * 这一段本身是弯的（C 形还在卷），近似出来的缝有一半悬在圆顶外面，
 * 侧视读成腹端上翘着一根黑钩。
 * 外扩 0.012 让缝浮在体壁之上一点，不被体壁吃掉。
 */
const SLIT_FROM = 0.993

function analSlit(material: THREE.Material): THREE.Mesh {
  const steps = 8
  const pts: THREE.Vector3[] = []
  // 背侧：t 从 SLIT_FROM 走到 1（尾极）；腹侧：再从 1 走回 SLIT_FROM
  for (const side of [1, -1] as const) {
    for (let i = 0; i <= steps; i++) {
      const k = side === 1 ? i : steps - i
      if (side === -1 && k === steps) continue // 尾极只取一次
      const t = THREE.MathUtils.lerp(SLIT_FROM, 1, Math.min(k / steps, 0.999))
      const f = frameAt(t)
      const out = f.dorsal.clone().multiplyScalar(side)
      // 贴近尾极时 ry → 0，法向改由切向接管：外扩沿「朝尾」方向
      const w = k / steps
      const normal = out.multiplyScalar(1 - w).addScaledVector(f.forward, -w).normalize()
      pts.push(f.pos.clone().addScaledVector(f.dorsal, side * f.ry).addScaledVector(normal, 0.012))
    }
  }
  const n = pts.length
  const sections: Section[] = pts.map((at, i) => {
    // 两端收细：缝是一道裂口，不是一根等粗的棍
    const r = 0.024 * Math.sqrt(Math.max(0.2, 1 - Math.pow((2 * i) / (n - 1) - 1, 2)))
    return { at, ry: r, rz: r }
  })
  const mesh = new THREE.Mesh(loft(sections, 8), material)
  mesh.name = 'larva-anal-slit'
  return mesh
}

/**
 * 腹端变深：**体壁自身的颜色区**，按顶点色从乳白渐变到浅灰褐。
 *
 * 独角仙幼虫那一版是外扩 0.01 套一层深色外壳，交界是一道硬边，读成
 * 「尾巴套了只袜子」；而后肠内容物透过体壁显出来，本来就是一片渐变的阴影，
 * 不是一截另外的东西（瓢虫幼虫的斑做成凸出实体后变成「塑料环」，同一个坑）。
 * 渐变带宽 0.05（约 0.65 节）：再窄就又是硬边，再宽就糊成整条虫发灰。
 *
 * 顶点色是乘在材质基色上的（线性空间），所以这里存的是 TAIL/BODY 的逐通道比值；
 * 腹端之外全是 1，材质基色即体壁色 —— 测试量材质色就知道体壁够不够白。
 */
function paintTail(geo: THREE.BufferGeometry): void {
  const body = new THREE.Color(BODY_COLOR)
  const tail = new THREE.Color(TAIL_COLOR)
  const ratio = [tail.r / body.r, tail.g / body.g, tail.b / body.b]
  const uv = geo.getAttribute('uv')
  const colors = new Float32Array(uv.count * 3)
  for (let i = 0; i < uv.count; i++) {
    const k = THREE.MathUtils.smoothstep(uv.getY(i), DARK_TAIL_FROM - 0.025, DARK_TAIL_FROM + 0.025)
    for (let c = 0; c < 3; c++) colors[i * 3 + c] = THREE.MathUtils.lerp(1, ratio[c], k)
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3))
}

// ---------------------------------------------------------------- 装配

export function buildStagBeetleLarva(): InsectModel {
  const g = new THREE.Group()

  // 体壁：乳白、略有光泽、**不开 translucent**（理由见文件头「材质纪律」）
  const bodyMat = chitin({ color: BODY_COLOR, gloss: 0.36, clearcoat: 0.08 })
  // 头壳：高度骨化 —— 高光泽 + 清漆 + 刻点
  const headMat = chitin({ color: HEAD_COLOR, gloss: 0.62, clearcoat: 0.42, surface: 'punctate' })
  const mandibleMat = chitin({ color: MANDIBLE_COLOR, gloss: 0.6, clearcoat: 0.4 })
  const legMat = chitin({ color: LEG_COLOR, gloss: 0.4, clearcoat: 0.14 })
  const darkMat = chitin({ color: DARK_POINT_COLOR, gloss: 0.4, clearcoat: 0.2 })
  const setaMat = chitin({ color: SETA_COLOR, gloss: 0.3, clearcoat: 0 })

  const trunkGeo = trunkGeometry()
  paintTail(trunkGeo)
  bodyMat.vertexColors = true
  const trunk = new THREE.Mesh(trunkGeo, bodyMat)
  trunk.name = 'larva-body'
  g.add(trunk)

  const head = new THREE.Group()
  orient(head, frameAt(0))
  head.add(headCapsule(headMat))
  head.add(larvalMandibles(mandibleMat))
  g.add(head)

  g.add(thoracicLegs(legMat, darkMat))
  g.add(spiracles(darkMat))
  g.add(setae(setaMat))
  g.add(analSlit(darkMat))

  const headFrame = frameAt(0)
  const midFrame = frameAt(0.5)
  const legFrame = frameAt(LEG_SPECS[1].t)
  const tip = curlPoint(1, CURL_R)

  /*
   * 锚点名刻意避开成虫 hotspot 表里的 mandible / head / leg：展台按名字把成虫卡片
   * 贴到当前模型上，同名就会把「内缘有齿、用来打架」那张卡贴到幼虫啃木头的颚上。
   */
  const anchors: Record<string, THREE.Vector3> = {
    headCapsule: headFrame.pos.clone().addScaledVector(headFrame.forward, 0.3).addScaledVector(headFrame.dorsal, 0.3),
    larvalMandible: headFrame.pos.clone().addScaledVector(headFrame.forward, 0.8).addScaledVector(headFrame.dorsal, -0.18),
    body: midFrame.pos.clone().addScaledVector(midFrame.dorsal, midFrame.ry * 1.05),
    thoracicLeg: legFrame.pos
      .clone()
      .addScaledVector(legFrame.dorsal, -legFrame.ry * 0.5)
      .addScaledVector(legFrame.lateral, legFrame.rz + 0.35),
    spiracle: midFrame.pos.clone().addScaledVector(midFrame.lateral, midFrame.rz * 1.05),
    analSlit: tip.clone(),
  }

  return finalize(g, anchors)
}
