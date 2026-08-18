/**
 * 双叉犀金龟 · 幼虫（蛴螬）Trypoxylus dichotomus（完全变态第 2 阶段）
 *
 * 这个阶段是整条生活史的价值所在：**乳白肥胖的蛴螬 → 黑亮带角的甲虫**，
 * 「这两个是同一种虫」的反差全靠它。所以每一处形态都是照着「让人一眼认出
 * 这是蛴螬」来定的，而不是照着「好看」。
 *
 * ## 招牌结构（做不出就等于没做）
 *
 * 1. **末龄体长 8~10 厘米，比成虫还大。** 本文件躯干中心线弧长 8.35 + 头壳
 *    0.66 ≈ 9.0（模型单位 1 = 1 厘米）。成虫连角不过 6.5 —— 这个量级差
 *    正是生活史要讲的内容，绝不为了「好看」缩小。
 * 2. **C 形蜷曲。** 蛴螬的定义姿态：身体向**腹面**卷成 C。做直了就是一条蛆。
 *    实现上不是「把直筒掰弯」，而是让 `loft()` 沿一条真正的 C 形路径放样
 *    （见 curlPoint）：圆心角 290°，两端留 70° 的缺口，缺口朝 +X（头端在
 *    上前方、腹端在下前方，两端隔空相对）。中心线还带一点螺旋
 *    （SPIRAL），前段外张、尾段内收 —— 正圆读起来像个机械的环，
 *    真实的蛴螬前松后紧。
 * 3. **中段最粗、尾端圆钝、节间只是浅褶。** 这三条是一体的：腹端收成尖锥 +
 *    节间沟太深，整只虫会读成一枚松果（黑翅土白蚁兵蚁那一轮栽过同类跟头）。
 *    所以 GROOVE 只有 0.055（半径的 5.5%），而且做成**窄而浅的折痕**
 *    （`cos^6`）而不是宽而深的凹槽 —— 窄折痕在同样深度下读得更清楚；
 *    尾端最后 4.5% 用圆球冠收口（`√(1-u²)`），不是锥形收尖。
 * 4. **只有 3 对胸足，腹部没有足。** 这是蛴螬与鳞翅目毛虫的关键区别，
 *    画上腹足就是另一个目的虫了。三对足全部落在紧靠头部的前三节
 *    （t ≤ 0.20），腹部整段一根附肢都没有。
 * 5. **头壳明显更硬更深 + 一对深色大颚。** 头壳红褐（#8a4a22）、有清漆高光；
 *    体壁乳白（#ecdfc2）、哑光。这一处明度差（HSL L 0.34 vs 0.84）是整只虫
 *    最强的对比，也是「头是骨化的、身子是软的」这件事的全部表达。
 * 6. **腹端数节偏深偏灰。** 后肠里的腐殖质透过半透明体壁显出来 —— 真实特征，
 *    也是让它「像蛴螬」而不是「像白香肠」的关键。实现为一截外扩 0.01
 *    套在躯干外面的独立深色壳（见 DARK_TAIL_FROM），覆盖最后约 3 节。
 * 7. 体侧一排气门、体表稀疏刚毛。两者都很小，但缺了就少了「活体」的密度。
 *
 * ## 颜色纪律（第 5 轮 10 只里 7 只返工的那个坑，反过来踩）
 *
 * ACES 会提亮去饱和，于是有了「颜色要压深一档」的经验；但它被误解成
 * 「越深越保险」。**乳白色的虫是反过来最危险的一只**：压深就是脏灰，
 * 不压又会过曝成白铬（七星瓢虫、甘薯腊龟甲栽的就是这个）。
 * 这里的解法不是调基色，而是**调材质**：
 * - 体壁绝不用 `elytra()`（gloss 0.74 + clearcoat 0.55，那是硬鞘翅的档），
 *   而用 `chitin({ gloss: 0.22, clearcoat: 0.04, translucent: true })` ——
 *   蛴螬是软体不是硬壳，哑光 + 次表面透光，高光根本没有机会顶到过曝区。
 * - 基色因此可以放心用真正的乳白 `#ecdfc2`（termite-soldier.ts 目视验收过
 *   的那一档），不必为了「保险」压成灰。
 *
 * 局部坐标系与成虫完全一致：+X 向前（头）、+Y 向上（背）、+Z 向右。
 * C 形蜷曲画在 XY（矢状）平面里 —— 默认机位与侧机位都从 +Z 方向看过来，
 * 这样才能一眼看到完整的 C；卷在别的平面里会被视线方向压扁成一根香肠。
 */
import * as THREE from 'three'
import { chitin, finalize, legPair, loft, type InsectModel, type Section } from '../kit'

// ---------------------------------------------------------------- 尺度常量

/** 躯干中心线弧长（不含头壳）。加上头壳 0.66 ≈ 9.0 厘米，落在末龄 8~10 的中间 */
const TRUNK_ARC = 8.35
/** 头壳伸出躯干前端的长度 */
const HEAD_OUT = 0.66
/** C 的圆心角。290° 留 70° 缺口：再大两端会撞上，再小就读成香蕉不是 C */
const CURL_START_DEG = 35
const CURL_SPAN_DEG = 290
/** 中心线的螺旋量：前段外张 +9%、尾段内收 −9%，破掉正圆的机械感 */
const SPIRAL = 0.09
/** 可见体节数：3 胸节 + 10 腹节 */
const SEGMENTS = 13
/** 每节的放样采样数 */
const SEG_SAMPLES = 8
/** 放样径向分段数。测试按 uv 的 v 分环反推中心线，与这个值无关，但保持 26 与全库一致 */
const RADIAL = 26
/** 节间沟深度（占该处半径的比例）。松果红线：超过 0.09 就开始读成鳞片 */
const GROOVE = 0.055
/** 节内鼓起量：体节要「饱满」，靠的是节中微凸而不是节间深挖 */
const PLUMP = 0.03
/** 腹端变深的起点（沿躯干弧长的比例）。0.755 ≈ 最后 3.2 节 */
const DARK_TAIL_FROM = 0.755

// ---------------------------------------------------------------- 颜色

/** 体壁：真正的乳白，不压深。搭配哑光 + 半透材质才不会过曝（见文件头「颜色纪律」） */
const BODY_COLOR = '#ecdfc2'
/** 腹端数节：后肠内容物透出体壁的灰褐。比体壁低约 0.35 个明度，肉眼一看就分得出 */
const TAIL_COLOR = '#9a8868'
/** 头壳：红褐至深褐的骨化壳。#8a4a22 是「真能看出是褐色」的档 —— 再深就近黑（termite-soldier 的教训） */
const HEAD_COLOR = '#8a4a22'
/** 大颚：比头壳更深（更高度骨化），但同样不到近黑，否则体积感被吃掉 */
const MANDIBLE_COLOR = '#4a2a14'
/** 胸足：比体壁略深的蜡黄，否则贴在乳白身上完全分不出来 */
const LEG_COLOR = '#d3bc8d'
/** 爪与气门：深褐小点 */
const DARK_POINT_COLOR = '#5f3418'
/** 刚毛：稀疏的红褐色硬毛 */
const SETA_COLOR = '#a2703c'

// ---------------------------------------------------------------- 中心线

const CURL_START = THREE.MathUtils.degToRad(CURL_START_DEG)
const CURL_SPAN = THREE.MathUtils.degToRad(CURL_SPAN_DEG)

/** 单位卷曲半径下的中心线点。R0 由弧长反解（见 CURL_R） */
function curlPoint(t: number, r0: number): THREE.Vector3 {
  const phi = CURL_START + CURL_SPAN * t
  const r = r0 * (1 + SPIRAL * Math.cos(Math.PI * t))
  return new THREE.Vector3(Math.cos(phi) * r, Math.sin(phi) * r, 0)
}

/**
 * 反解卷曲半径：先按 r0 = 1 量一遍折线长，再按目标弧长等比放大。
 * 直接拍一个半径的话，改了螺旋量或圆心角，体长就悄悄变了 ——
 * 而「幼虫比成虫长」是这个阶段的招牌，不能靠人肉维护。
 */
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
 * 躯干半径包络：颈部细 → 胸部渐粗 → **腹中段最粗（0.82）** → 缓缓收到尾端。
 * 峰值刻意放在 t≈0.42 而不是中点：真实蛴螬最粗处偏前（腹前段），
 * 放中点会读成一根两头一样的腊肠。
 */
const ENVELOPE = [
  [0.0, 0.26],
  [0.045, 0.4],
  [0.11, 0.58],
  [0.22, 0.72],
  [0.42, 0.82],
  [0.58, 0.8],
  [0.72, 0.71],
  [0.84, 0.6],
  [0.93, 0.5],
  [1.0, 0.42],
] as const

/** 尾端最后这一段用球冠收口，不收尖 —— 「尾端圆钝」的实现就在这一行 */
const TIP_ROUND_FROM = 0.955

function envelope(t: number): number {
  const base = keyframe(ENVELOPE, t)
  if (t <= TIP_ROUND_FROM) return base
  const u = (t - TIP_ROUND_FROM) / (1 - TIP_ROUND_FROM)
  return base * Math.sqrt(Math.max(0, 1 - u * u))
}

/**
 * 节间起伏：窄折痕（`|cos|^6`，只在体节交界处收一口）+ 节中微凸。
 * 与 kit.segmentedAbdomen 的宽凹槽档不同 —— 那一档在这么粗的软体上会
 * 直接读成松果的鳞片。
 */
function ripple(t: number): number {
  const local = t * SEGMENTS - Math.floor(t * SEGMENTS)
  const crease = Math.pow(Math.abs(Math.cos(local * Math.PI)), 6)
  // 肛端那一节是光滑鼓胀的，没有节间沟：最后 12% 把起伏淡出，
  // 否则球冠收口处的几道浅褶会在正对镜头时读成一圈圈的「切面」。
  const fade = THREE.MathUtils.clamp((0.94 - t) / 0.12, 0, 1)
  return 1 - GROOVE * crease * fade + PLUMP * Math.sin(local * Math.PI) * fade
}

/** 该处的背腹半径与左右半径。蛴螬横截面近圆、略宽于高 */
function radiiAt(t: number): { ry: number; rz: number } {
  const r = Math.max(envelope(t) * ripple(t), 1e-4)
  return { ry: r * 0.98, rz: r * 1.05 }
}

/**
 * 体轴局部标架。
 *
 * 中心线画在 XY 平面里，所以侧向恒为 +Z，背向 = 切向 × 侧向（= 卷曲的外侧，
 * 因为蛴螬是向**腹面**卷的 —— C 的内侧就是肚子）。
 * 三个轴按 (forward, dorsal, lateral) 排恰好是右手系，可以直接喂 makeBasis。
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

/** 躯干：沿 C 形路径放样。offset > 0 时整体外扩，用来做腹端那层深色外壳 */
function trunkGeometry(from: number, to: number, offset: number): THREE.BufferGeometry {
  const total = Math.round((to - from) * SEGMENTS * SEG_SAMPLES)
  const sections: Section[] = []
  for (let i = 0; i <= total; i++) {
    const t = from + ((to - from) * i) / total
    const { ry, rz } = radiiAt(t)
    sections.push({ at: curlPoint(t, CURL_R), ry: ry + offset, rz: rz + offset })
  }
  return loft(sections, RADIAL)
}

/**
 * 头壳：一枚比躯干窄得多的骨化圆囊，从躯干前端探出 HEAD_OUT。
 *
 * 后端 0.30 塞进躯干里（半径只有 0.16，远小于该处躯干半径），
 * 所以接缝天然被躯干包住，不用做额外的过渡环。
 * 横截面略宽于高（rz > ry）—— 蛴螬的头壳是「扁圆」的，正圆会读成一颗球。
 */
const HEAD_PROFILE = [
  [0.0, 0.18],
  [0.2, 0.38],
  [0.42, 0.45],
  [0.68, 0.41],
  [0.86, 0.3],
  [1.0, 0.08],
] as const

function headCapsule(material: THREE.Material): THREE.Mesh {
  const back = -0.3
  const span = back * -1 + HEAD_OUT
  const steps = 24
  const sections: Section[] = []
  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    const r = keyframe(HEAD_PROFILE, t)
    sections.push({ at: new THREE.Vector3(back + span * t, 0, 0), ry: r * 0.94, rz: r * 1.08 })
  }
  const mesh = new THREE.Mesh(loft(sections, 24), material)
  mesh.name = 'larva-head'
  return mesh
}

/**
 * 大颚：一对短而粗壮的深色钳。啃食朽木的口器，不是捕食用的镰刀，
 * 所以**短、钝、厚**：全长约 0.4，基部半径 0.115，末端也还有 0.055
 * （不收成针 —— 出图实测收到 0.035 那一档就读成了两根獠牙）。
 *
 * ⚠️ 路径中段刻意**外鼓**（控制点 z = ±0.31），末端才略收回到 ±0.12。
 * 这是黑翅土白蚁兵蚁那一轮用四次返工换来的教训：两颚在世界坐标里分得开，
 * 不等于在屏幕上分得开。这里让分离量集中在颚的中段而不是靠基部间距硬拉，
 * 顶视与前斜视投影下两颚的包围盒才真的不相交（测试按投影量，不按三维距离）。
 */
function grubMandibles(material: THREE.Material): THREE.Group {
  const g = new THREE.Group()
  for (const side of [1, -1] as const) {
    const p0 = new THREE.Vector3(0.46, -0.07, side * 0.17)
    const p1 = new THREE.Vector3(0.68, -0.2, side * 0.31)
    const p2 = new THREE.Vector3(0.8, -0.29, side * 0.12)
    const steps = 12
    const sections: Section[] = []
    for (let i = 0; i <= steps; i++) {
      const t = i / steps
      const inv = 1 - t
      const at = new THREE.Vector3(
        inv * inv * p0.x + 2 * inv * t * p1.x + t * t * p2.x,
        inv * inv * p0.y + 2 * inv * t * p1.y + t * t * p2.y,
        inv * inv * p0.z + 2 * inv * t * p1.z + t * t * p2.z,
      )
      // 蛴螬的颚是啃木头的钝凿，不是吸血的尖牙（末端半径见上方注释）
      const r = THREE.MathUtils.lerp(0.115, 0.055, Math.pow(t, 0.85))
      sections.push({ at, ry: r, rz: r * 0.86 })
    }
    const m = new THREE.Mesh(loft(sections, 14), material)
    m.name = 'larva-mandible'
    g.add(m)
  }
  return g
}

/**
 * 三对胸足。
 *
 * 短而有力，全部长在紧靠头部的三节上（t = 0.5/13、1.5/13、2.5/13，
 * 即前中后胸的节中）。前足最短、后足最长，与成虫同一套比例关系。
 *
 * 着生点用 `legPair` 的 base 给在**腹侧偏外**（−0.52 背腹半径、±0.70 侧半径），
 * 这样 kit.leg() 那点固有的向上分量（sin(splay)·0.35 + 0.25）落在体侧而不是
 * 顶到体内 —— 腿从体侧探出、再在膝处折向腹面，跟正常昆虫的姿势是同一套。
 *
 * `spines: false`：蛴螬的胸足没有成虫那样的胫节挖掘齿。
 */
const LEG_SPECS = [
  { t: 0.5 / SEGMENTS, femur: 0.42, tibia: 0.34, tarsus: 0.18, sweep: -30 },
  { t: 1.5 / SEGMENTS, femur: 0.47, tibia: 0.38, tarsus: 0.2, sweep: -8 },
  { t: 2.5 / SEGMENTS, femur: 0.52, tibia: 0.42, tarsus: 0.22, sweep: 12 },
] as const

function thoracicLegs(legMat: THREE.Material, clawMat: THREE.Material): THREE.Group {
  const g = new THREE.Group()
  for (const spec of LEG_SPECS) {
    const f = frameAt(spec.t)
    const holder = new THREE.Group()
    orient(holder, f)

    const pair = legPair(
      {
        base: [0, -0.52 * f.ry, 0.7 * f.rz],
        femur: spec.femur,
        tibia: spec.tibia,
        tarsus: spec.tarsus,
        splay: 14,
        sweep: spec.sweep,
        knee: 100,
        thickness: 0.085,
        spines: false,
      },
      legMat,
    )
    for (const child of pair.children) child.name = 'larva-leg'

    // 爪：跗节末端的一枚深色小钩。kit.leg() 把绝对端点留在 userData 里，
    // 直接拿来用（13 个物种已在用这个约定），左腿是 scale.z = −1 的镜像，故 z 取负。
    const one = pair.children[0]
    const tip = one.userData.tip as THREE.Vector3
    const knee = one.userData.knee as THREE.Vector3
    const dir = new THREE.Vector3().subVectors(tip, knee).normalize()
    for (const s of [1, -1] as const) {
      const a = new THREE.Vector3(tip.x, tip.y, tip.z * s)
      const b = a.clone().addScaledVector(new THREE.Vector3(dir.x, dir.y, dir.z * s), 0.1)
      const claw = new THREE.Mesh(
        loft([{ at: a, ry: 0.036, rz: 0.036 }, { at: b, ry: 0.005, rz: 0.005 }], 8),
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
 * 体侧一排气门：每节一对，位于体侧偏背（离背中线 68°）的一枚深褐小椭圆。
 * 沿体轴拉长、贴着体壁压扁 —— 立起来的小球会读成一排疣，不是气孔。
 */
function spiracles(material: THREE.Material): THREE.Group {
  const g = new THREE.Group()
  const theta = THREE.MathUtils.degToRad(74)
  for (let seg = 0; seg < 10; seg++) {
    const t = (seg + 0.42) / SEGMENTS
    const f = frameAt(t)
    for (const side of [1, -1] as const) {
      const out = new THREE.Vector3()
        .addScaledVector(f.dorsal, Math.cos(theta))
        .addScaledVector(f.lateral, side * Math.sin(theta))
        .normalize()
      const third = new THREE.Vector3().crossVectors(f.forward, out).normalize()
      const m = new THREE.Mesh(new THREE.SphereGeometry(0.078, 12, 8), material)
      m.name = 'larva-spiracle'
      /*
       * 圆心正落在体壁上（系数 1.0，不是 0.95）。
       * ⚠️ 第一版取 0.95「陷进去一点」，渲染出来一颗都看不见 —— 压扁后的
       * 半厚只有 0.029，而 5% 的内陷在腹中段就是 0.04，整排气门全埋在体壁里。
       * 这是只有出图才发现得了的一类问题：几何合法、断言（如果按坐标写）也绿。
       */
      m.position
        .copy(f.pos)
        .addScaledVector(f.dorsal, Math.cos(theta) * f.ry)
        .addScaledVector(f.lateral, side * Math.sin(theta) * f.rz)
      m.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(f.forward, out, third))
      m.scale.set(1, 0.42, 0.62)
      g.add(m)
    }
  }
  return g
}

/**
 * 稀疏刚毛：每节一横排，避开背中线与腹中线（真实蛴螬的刚毛也是成横列的）。
 * 向后斜伏，不是直立的针 —— 直立会读成海胆。
 */
function setae(material: THREE.Material): THREE.Group {
  const g = new THREE.Group()
  const angles = [32, 74, 116, -32, -74, -116].map((d) => THREE.MathUtils.degToRad(d))
  for (let seg = 0; seg < SEGMENTS; seg++) {
    const t = (seg + 0.46) / SEGMENTS
    if (t > 0.99) continue
    const f = frameAt(t)
    for (const a of angles) {
      const out = new THREE.Vector3()
        .addScaledVector(f.dorsal, Math.cos(a))
        .addScaledVector(f.lateral, Math.sin(a))
        .normalize()
      const root = new THREE.Vector3()
        .copy(f.pos)
        .addScaledVector(f.dorsal, Math.cos(a) * f.ry * 0.96)
        .addScaledVector(f.lateral, Math.sin(a) * f.rz * 0.96)
      // 向后（−forward）斜伏 40°
      const dir = out.clone().multiplyScalar(0.77).addScaledVector(f.forward, -0.64).normalize()
      const tip = root.clone().addScaledVector(dir, 0.18)
      const seta = new THREE.Mesh(
        loft([{ at: root, ry: 0.022, rz: 0.022 }, { at: tip, ry: 0.002, rz: 0.002 }], 6),
        material,
      )
      seta.name = 'larva-seta'
      g.add(seta)
    }
  }
  return g
}

// ---------------------------------------------------------------- 装配

export function buildRhinocerosBeetleLarva(): InsectModel {
  const g = new THREE.Group()

  // 体壁：哑光 + 次表面透光。**绝不是 elytra()** —— 理由见文件头「颜色纪律」。
  const bodyMat = chitin({ color: BODY_COLOR, gloss: 0.22, clearcoat: 0.04, translucent: true })
  /*
   * 腹端数节：哑光**不透光**。
   * 体壁开了 transmission 是为了「软」，但这一截若也开，深色壳会把底下那层
   * 乳白躯干透出来、把刚做出来的明暗界限自己抹掉 —— 要表达的是「内容物已经
   * 把这一段染暗了」，不是「这一段是块毛玻璃」。
   */
  const tailMat = chitin({ color: TAIL_COLOR, gloss: 0.2, clearcoat: 0.03 })
  // 头壳：高度骨化 —— 高光泽 + 清漆，圆囊面上能看出高光渐变，与软体壁一眼分开
  const headMat = chitin({ color: HEAD_COLOR, gloss: 0.6, clearcoat: 0.45, surface: 'punctate' })
  const mandibleMat = chitin({ color: MANDIBLE_COLOR, gloss: 0.5, clearcoat: 0.34 })
  const legMat = chitin({ color: LEG_COLOR, gloss: 0.34, clearcoat: 0.12 })
  const darkMat = chitin({ color: DARK_POINT_COLOR, gloss: 0.4, clearcoat: 0.2 })
  const setaMat = chitin({ color: SETA_COLOR, gloss: 0.3, clearcoat: 0 })

  // ---- 躯干（整条，含尾端球冠）
  const trunk = new THREE.Mesh(trunkGeometry(0, 1, 0), bodyMat)
  trunk.name = 'larva-body'
  g.add(trunk)

  /*
   * 腹端数节的深色外壳：整体外扩 0.01 套在躯干外面的一层。
   *
   * 为什么是「套一层」而不是「把躯干拆成两段」：拆段的话两段共用同一个
   * 截面，表面重合会打架（z-fighting）；而且测试要靠**一条完整的中心线**
   * 量弧长，拆了就得拼两段，拼接处的误差正好落在最需要精确的地方。
   * 外扩一个恒定量则天然把接缝藏成一道干净的分界线 —— 而这道线本来就该有：
   * 后肠内容物的界限在真实蛴螬身上就是一道清楚的横界。
   */
  const tail = new THREE.Mesh(trunkGeometry(DARK_TAIL_FROM, 1, 0.01), tailMat)
  tail.name = 'larva-abdomen-dark'
  g.add(tail)

  // ---- 头壳与大颚（摆在躯干前端的标架上）
  const head = new THREE.Group()
  orient(head, frameAt(0))
  head.add(headCapsule(headMat))
  head.add(grubMandibles(mandibleMat))
  g.add(head)

  // ---- 三对胸足（腹部一根附肢都没有 —— 这是蛴螬与毛虫的分界线）
  g.add(thoracicLegs(legMat, darkMat))

  // ---- 气门与刚毛
  g.add(spiracles(darkMat))
  g.add(setae(setaMat))

  const headFrame = frameAt(0)
  const midFrame = frameAt(0.45)
  const tailFrame = frameAt(0.88)
  const legFrame = frameAt(LEG_SPECS[1].t)

  const anchors: Record<string, THREE.Vector3> = {
    head: headFrame.pos.clone().addScaledVector(headFrame.forward, 0.42).addScaledVector(headFrame.dorsal, 0.2),
    mandible: headFrame.pos.clone().addScaledVector(headFrame.forward, 0.78).addScaledVector(headFrame.dorsal, -0.2),
    body: midFrame.pos.clone().addScaledVector(midFrame.dorsal, midFrame.ry * 1.05),
    abdomenTip: tailFrame.pos.clone().addScaledVector(tailFrame.dorsal, tailFrame.ry * 1.05),
    thoracicLeg: legFrame.pos
      .clone()
      .addScaledVector(legFrame.dorsal, -legFrame.ry * 0.5)
      .addScaledVector(legFrame.lateral, legFrame.rz + 0.45),
    spiracle: midFrame.pos.clone().addScaledVector(midFrame.lateral, midFrame.rz * 1.05),
  }

  return finalize(g, anchors)
}
