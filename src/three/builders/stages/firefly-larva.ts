/**
 * 中华黄萤 · 幼虫 Pyrocoelia（完全变态第 2 阶段）
 *
 * 这一阶段是三个阶段里唯一「不靠光也认得出」的一个，因为它的轮廓本身就是招牌：
 * **一列向后叠压的梯形背板**。萤火虫幼虫看上去像一片会走路的松塔鳞片，
 * 与成虫（软鞘翅 + 粉橙盾片）完全不像 —— 而这正是生活史要讲的那件事。
 *
 * ## 招牌结构（做不出就等于没做）
 *
 * 1. **叠瓦状背板。** 每一节的背板向后盖住下一节的前段，后缘**翘起**，
 *    于是每一片下面都压着一道阴影缝。这条是本文件的全部重点，所以它不是
 *    「把体节涂成深浅相间」——
 *    ⚠️ 第一批的教训写得很明白：**深色贴浅色读成斑纹，不是结构**
 *    （黑蚱蝉的翅芽比胸背暗一档，四个机位全读成「一块污渍」）。
 *    区分结构只能靠形：自由边、边下的净空、投出来的阴影缝。
 *    所以每一片都是**有厚度的独立实体**（上下两层面 + 四条边的立面），
 *    后缘抬到体壁之上 PLATE_RISE，下一片的前段从它底下穿过去 ——
 *    两片之间留下约 0.03 的净空（体高的 15%），那才是「叠瓦」。
 *    把 PLATE_RISE 调成 0 或者取消 X 向的交叠，测试会红。
 * 2. **后侧角向后伸。** 背板不是矩形而是梯形，后侧两个角比中线更向后突出
 *    （REAR_SIDE > REAR_MID），顶视轮廓因此是一排锯齿 —— 这是萤火虫幼虫
 *    在顶视机位下最认得出的一条线。
 * 3. **每片背板后缘两侧一对淡黄粉斑。** 真实特征（Pyrocoelia 幼虫的粉黄侧斑），
 *    同时是通体深褐里唯一的高明度点：斑 0.76 vs 背板 0.23，明度差约 0.53。
 * 4. **腹端一对发光器**，位于腹面偏侧，同时探出腹面与背板侧缘 ——
 *    ⚠️ 四个验收机位全部从上方俯看，纯腹面的东西在图上一点都看不见。
 *    真实发光器确实在腹面，所以做法不是把它挪到背上（那是编），而是让它
 *    **鼓出体侧轮廓之外**：真实幼虫的发光器也是一对外凸的乳突。
 * 5. **极扁。** 高 / 宽 ≈ 0.35。萤火虫幼虫是压扁的，能钻进石缝找蜗牛。
 * 6. 头小、能缩进前胸背板下（本模型取伸出的取食姿态，否则大颚看不见），
 *    一对**镰刀状上颚**（注射消化液吃蜗牛用的），三对短胸足，无腹足。
 *
 * ## 颜色纪律
 *
 * 通体深褐的虫最大的风险不是过曝，而是**压成一团分不出叠瓦的黑**
 * （第 5 轮 10 只里 7 只返工的那个坑，反过来踩）。所以：
 * - 背板 `#4e3927`（明度 0.23）—— 「深褐」的档，不是黑；
 * - 节间与腹面 `#2b211a`（0.135）比背板暗一档，背板才浮得出来；
 * - 侧斑 `#f5c98e`（0.76）真的接近浅色端，对齐 `ladybird.ts` 的「够亮」基准。
 * 三档明度拉开之后，再叠上几何的阴影缝，叠瓦才在图上读得出来。
 *
 * 局部坐标系与成虫（../firefly.ts）完全一致：1 = 1 厘米真实体长，
 * +X 向前（头）、+Y 向上（背）、+Z 向右。
 */
import * as THREE from 'three'
import { chitin, finalize, legPair, loft, type InsectModel, type Section } from '../kit'

// ---------------------------------------------------------------- 尺度

/** 躯干前端（不含探出的头） */
const TRUNK_FRONT = 0.94
/** 躯干末端 */
const TRUNK_BACK = -1.12
const TRUNK_LEN = TRUNK_FRONT - TRUNK_BACK
/** 头壳前端（探出前胸背板 0.12，否则头与大颚全被盾片盖住） */
const HEAD_TIP = 1.14

/** 可见背板数：3 胸节 + 9 腹节 */
const PLATE_COUNT = 12
/** 背板节距 */
const PLATE_PITCH = 0.165
/** 前胸背板（第 0 片）的中线前缘 */
const PLATE0_FRONT = 1.02
/** 中线处后缘伸出的节距倍数：1.35 = 盖住下一片的前 35% */
const REAR_MID = 1.35
/** 后侧角再往后伸 —— 顶视的锯齿轮廓靠这个差值 */
const REAR_SIDE = 1.72
/** 前缘贴着体壁的余量（这一段塞在前一片下面，不能悬空） */
const PLATE_BASE = 0.006
/** 后缘翘起量。叠瓦的全部：翘起才有净空，有净空才有阴影缝 */
const PLATE_RISE = 0.05
/** 侧缘外扩量：背板边缘略离体壁，侧视才有一条边下的暗线 */
const PLATE_EDGE_LIFT = 0.01
/** 背板厚度（中线处；侧角更薄） */
const PLATE_THICK = 0.02
/** 背板绕体轴的包裹角（度）。93° 略过体侧最宽处，边缘因此微微向下扣住身体 */
const PLATE_WRAP = 93

// ---------------------------------------------------------------- 颜色

/**
 * 背板：深褐。压到近黑就分不出片了 —— 这是本文件最大的风险。
 * 出图实测：第一版 `#5c4630` 在 ACES 下被提亮成「牛奶巧克力」，比成虫
 * （鞘翅 `#2a1f16`，出图近黑）浅太多，读不出「深褐至黑」；往下压一档到
 * 这里之后仍然明显是褐色，而叠瓦与侧斑都不依赖基色明度，压得起。
 */
const PLATE_COLOR = '#4e3927'
/** 节间膜与腹面：比背板暗一档，背板才「浮」得出来 */
const BODY_COLOR = '#2b211a'
/** 后侧斑：淡黄偏粉。全身唯一的高明度点，务必够亮 */
const SPOT_COLOR = '#f5c98e'
/** 头壳：高度骨化，近黑但带褐 */
const HEAD_COLOR = '#2a201a'
/** 上颚：比头壳亮得多，否则一对镰刀糊在黑头上完全看不见 */
const MANDIBLE_COLOR = '#8a6234'
/** 胸足 */
const LEG_COLOR = '#3d2e22'

/** 发光器底色与自发光，沿用成虫 firefly.ts 那一套（乳白偏黄 + 黄绿自发光） */
const LANTERN_COLOR = '#eef7c8'
const LANTERN_EMISSIVE = '#c8ff8a'
/**
 * 幼虫发光器亮度。三个阶段的亮度排序必须真实：**幼虫 > 蛹 ≈ 卵**。
 * 成虫求偶闪光最亮（3.2），幼虫的是持续的警戒光，取 2.8；
 * 卵与蛹只是微光，各 0.75 / 0.95（见各自文件）。
 */
const LANTERN_INTENSITY = 2.8

// ---------------------------------------------------------------- 体形包络

/** 分段线性 + smoothstep 的关键帧插值（与 rhinoceros-beetle-larva.ts 同一套写法） */
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
 * 半宽包络：肩（前胸）已经很宽，最宽处在前 1/3，往后缓缓收细。
 * 最宽 0.30（体宽 0.60），最高 0.10（体高 0.20）—— 高 / 宽 = 0.34，
 * 「扁平」这条招牌就在这两组数字里，测试卡的是它们的比值。
 */
const HALF_WIDTH = [
  [0.0, 0.215],
  [0.06, 0.245],
  [0.18, 0.285],
  [0.34, 0.3],
  [0.55, 0.285],
  [0.72, 0.245],
  [0.86, 0.185],
  [0.95, 0.115],
  [1.0, 0.05],
] as const

/**
 * 半高包络。末端**不收成针尖**：t=1 处仍留 0.05 / 0.038（见 HALF_WIDTH）。
 * ⚠️ 第一版收到 0.02/0.012，后视机位下末片背板拱在一根细尖之上，
 * 板与体壁之间那道本该是阴影缝的净空成了一个**贯通的黑洞**
 * （七星瓢虫「壳裂开露白」、甘薯腊龟甲尾端黑洞是同一类病）。
 * 尾端做成圆钝的堵头，洞就没了 —— 真实幼虫的腹末本来也是钝的。
 */
const HALF_HEIGHT = [
  [0.0, 0.07],
  [0.12, 0.092],
  [0.35, 0.1],
  [0.62, 0.092],
  [0.82, 0.072],
  [0.94, 0.052],
  [1.0, 0.038],
] as const

/** 体轴参数：0 = 躯干前端，1 = 末端。背板会伸到躯干之外，故 clamp */
function axisT(x: number): number {
  return THREE.MathUtils.clamp((TRUNK_FRONT - x) / TRUNK_LEN, 0, 1)
}

function halfWidth(x: number): number {
  return keyframe(HALF_WIDTH, axisT(x))
}

function halfHeight(x: number): number {
  return keyframe(HALF_HEIGHT, axisT(x))
}

// ---------------------------------------------------------------- 背板

interface PlateSpec {
  index: number
  /** 中线处的前缘 x */
  front: number
  /** 前缘随 |v| 后掠的量（前胸背板取大值 = 半圆形盾片前缘） */
  bow: number
  rearMid: number
  rearSide: number
  /** 包裹角（度） */
  wrap: number
  /** 后缘翘起量。末几片要收 —— 见 TAIL_RISE_FADE */
  rise: number
}

/**
 * 末几片背板的翘起量衰减系数。
 *
 * ⚠️ 出图实测（后视机位）：末片按满档翘起时，板下那道净空在收细的腹末上
 * 变成一个**贯通的黑洞**，整只虫读成一截空心管子。真实的萤火虫幼虫也是
 * 越往后背板越平伏，所以这不是权宜之计。
 */
const TAIL_RISE_FADE = [1, 1, 1, 1, 1, 1, 1, 1, 0.92, 0.72, 0.48, 0.26] as const

const PLATES: PlateSpec[] = Array.from({ length: PLATE_COUNT }, (_, i) => ({
  index: i,
  front: PLATE0_FRONT - i * PLATE_PITCH,
  // 前胸背板是半圆形的盾（与成虫那片盾片同一个语汇），其余各片前缘只微微后掠
  bow: i === 0 ? 0.1 : 0.02,
  /*
   * 末片要一直盖到腹末。⚠️ 出图实测（诊断色渲染确认）：末片只盖到 −1.02、
   * 腹末的深色体壁从它后面露出 0.1 时，那一小块在背光侧读成一个**黑洞**，
   * 整只虫像一截空心管子 —— 与颜色无关，是「深色体壁被浅色背板框住」的
   * 观感问题。让末片包住尾端（真实幼虫的末背板也是罩住腹末的）就没了。
   */
  rearMid: i === 0 ? 1.5 : i === PLATE_COUNT - 1 ? 1.9 : i === PLATE_COUNT - 2 ? 1.5 : REAR_MID,
  rearSide: i === 0 ? 1.62 : i === PLATE_COUNT - 1 ? 1.95 : i === PLATE_COUNT - 2 ? 1.8 : REAR_SIDE,
  wrap: i === 0 ? 99 : PLATE_WRAP,
  rise: PLATE_RISE * TAIL_RISE_FADE[i],
}))

interface PlatePoint {
  mid: THREE.Vector3
  normal: THREE.Vector3
  thick: number
}

/**
 * 背板曲面上的一点。
 *
 * u：0 = 前缘（塞在前一片下面），1 = 后缘（翘起的自由边）
 * v：−1 = 左侧角，0 = 背中线，+1 = 右侧角
 *
 * 做法上的关键：截面**贴着该 x 处体壁的椭圆**取点，再沿椭圆外法线抬起 lift(u,v)。
 * 这样背板天然「骑」在身体上，不会出现一段陷进体内、一段飘在空中
 * （独角仙蛹第一版手写世界坐标的翅芽栽的就是这个，读成几片悬空的剪纸）。
 */
function platePoint(spec: PlateSpec, u: number, v: number): PlatePoint {
  const front = spec.front - spec.bow * v * v
  const rear = spec.front - PLATE_PITCH * THREE.MathUtils.lerp(spec.rearMid, spec.rearSide, Math.pow(Math.abs(v), 1.6))
  // 末几片的后侧角会伸过躯干末端，夹住不许越界（否则尾端外面浮着几个角）
  const x = Math.max(THREE.MathUtils.lerp(front, rear, u), TRUNK_BACK + 0.015)
  const w = halfWidth(x)
  const h = halfHeight(x)
  const th = THREE.MathUtils.degToRad(spec.wrap) * v
  const normal = new THREE.Vector3(0, Math.cos(th) / h, Math.sin(th) / w).normalize()
  const lift = PLATE_BASE + spec.rise * THREE.MathUtils.smoothstep(u, 0.32, 1) + PLATE_EDGE_LIFT * v * v
  const mid = new THREE.Vector3(x, h * Math.cos(th), w * Math.sin(th)).addScaledVector(normal, lift)
  // 侧角削薄：等厚的板边缘是一圈笔直的立面，剪影里读成塑料片
  return { mid, normal, thick: PLATE_THICK * (1 - 0.45 * Math.pow(Math.abs(v), 3)) }
}

const PLATE_NU = 9
const PLATE_NV = 16

/**
 * 一片背板：上表面 + 下表面 + 四条边的立面，是**有厚度的实体**。
 *
 * 为什么不用 loft()：loft 的截面椭圆恒以路径标架的 u/v 为轴，做不出「贴着体壁
 * 弯曲、还带自由边」的板。这里手搭网格，法线自己给（上面 +n、下面 −n、
 * 四条边各给自己的切向），**不走 computeVertexNormals**——
 * 顶点法线平均会把自由边磨圆，而这条边的硬转折正是「叠瓦」读得出来的原因。
 */
function plateGeometry(spec: PlateSpec): THREE.BufferGeometry {
  const positions: number[] = []
  const normals: number[] = []
  const uvs: number[] = []
  const indices: number[] = []

  const push = (p: THREE.Vector3, n: THREE.Vector3, uu: number, vv: number): number => {
    positions.push(p.x, p.y, p.z)
    normals.push(n.x, n.y, n.z)
    uvs.push(uu, vv)
    return positions.length / 3 - 1
  }

  const grid: PlatePoint[][] = []
  for (let i = 0; i <= PLATE_NU; i++) {
    const row: PlatePoint[] = []
    for (let j = 0; j <= PLATE_NV; j++) row.push(platePoint(spec, i / PLATE_NU, (j / PLATE_NV) * 2 - 1))
    grid.push(row)
  }

  const top: number[][] = []
  const bot: number[][] = []
  for (let i = 0; i <= PLATE_NU; i++) {
    const tr: number[] = []
    const br: number[] = []
    for (let j = 0; j <= PLATE_NV; j++) {
      const p = grid[i][j]
      const half = p.thick / 2
      tr.push(push(p.mid.clone().addScaledVector(p.normal, half), p.normal, j / PLATE_NV, i / PLATE_NU))
      br.push(
        push(p.mid.clone().addScaledVector(p.normal, -half), p.normal.clone().negate(), j / PLATE_NV, i / PLATE_NU),
      )
    }
    top.push(tr)
    bot.push(br)
  }

  for (let i = 0; i < PLATE_NU; i++) {
    for (let j = 0; j < PLATE_NV; j++) {
      // 上表面：(a, +u, +v) 的绕向法线朝外（+u ≈ −X、+v ≈ +Z，叉积 = +Y）
      indices.push(top[i][j], top[i + 1][j], top[i][j + 1])
      indices.push(top[i + 1][j], top[i + 1][j + 1], top[i][j + 1])
      // 下表面绕向相反
      indices.push(bot[i][j], bot[i][j + 1], bot[i + 1][j])
      indices.push(bot[i + 1][j], bot[i][j + 1], bot[i + 1][j + 1])
    }
  }

  /** 一条边的立面：顶点另存一份、法线给这条边自己的朝外切向，边才是硬转折 */
  const rim = (pairs: readonly (readonly [PlatePoint, THREE.Vector3])[], flip: boolean): void => {
    const a: number[] = []
    const b: number[] = []
    for (let k = 0; k < pairs.length; k++) {
      const [p, n] = pairs[k]
      const half = p.thick / 2
      a.push(push(p.mid.clone().addScaledVector(p.normal, half), n, k / (pairs.length - 1), 0))
      b.push(push(p.mid.clone().addScaledVector(p.normal, -half), n, k / (pairs.length - 1), 1))
    }
    for (let k = 0; k < pairs.length - 1; k++) {
      if (flip) {
        indices.push(a[k], b[k], a[k + 1], b[k], b[k + 1], a[k + 1])
      } else {
        indices.push(a[k], a[k + 1], b[k], b[k], a[k + 1], b[k + 1])
      }
    }
  }

  /** 边界外法线用有限差分求：沿边界向外一小步的方向，去掉法线分量后归一化 */
  const outward = (p: PlatePoint, du: number, dv: number, u: number, v: number): THREE.Vector3 => {
    const ahead = platePoint(spec, THREE.MathUtils.clamp(u + du, 0, 1), THREE.MathUtils.clamp(v + dv, -1, 1))
    const d = new THREE.Vector3().subVectors(p.mid, ahead.mid)
    d.addScaledVector(p.normal, -d.dot(p.normal))
    return d.lengthSq() < 1e-12 ? p.normal.clone() : d.normalize()
  }

  const ustep = 1 / PLATE_NU
  const vstep = 2 / PLATE_NV
  // 前缘（u=0）与后缘（u=1）
  rim(
    grid[0].map((p, j) => [p, outward(p, ustep, 0, 0, (j / PLATE_NV) * 2 - 1)] as const),
    false,
  )
  rim(
    grid[PLATE_NU].map((p, j) => [p, outward(p, -ustep, 0, 1, (j / PLATE_NV) * 2 - 1)] as const),
    true,
  )
  // 左右侧缘
  rim(
    grid.map((row, i) => [row[0], outward(row[0], 0, vstep, i / PLATE_NU, -1)] as const),
    true,
  )
  rim(
    grid.map((row, i) => [row[PLATE_NV], outward(row[PLATE_NV], 0, -vstep, i / PLATE_NU, 1)] as const),
    false,
  )

  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3))
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2))
  geo.setIndex(indices)
  return geo
}

/**
 * 后侧斑：贴在背板后缘两侧的一对扁圆斑。
 *
 * 位置在 u=0.82（后缘之前一点，斑本身要留在板上而不是挂在边外）、
 * v=±0.62（侧角与中线之间），沿板面法线压扁，浮在板面之上 0.004 ——
 * 数值大了会读成两颗珠子，小了会与板面 z-fight。
 */
function spotMesh(spec: PlateSpec, side: 1 | -1, material: THREE.Material): THREE.Mesh {
  const u = 0.82
  const v = 0.62 * side
  const p = platePoint(spec, u, v)
  const along = new THREE.Vector3().subVectors(platePoint(spec, u + 0.1, v).mid, platePoint(spec, u - 0.1, v).mid)
  if (along.lengthSq() < 1e-10) along.set(-1, 0, 0)
  along.normalize()
  const lateral = new THREE.Vector3().crossVectors(along, p.normal).normalize()

  const mesh = new THREE.Mesh(new THREE.SphereGeometry(0.05, 10, 8), material)
  mesh.name = 'larva-spot'
  mesh.userData.plate = spec.index
  mesh.position.copy(p.mid).addScaledVector(p.normal, p.thick / 2 + 0.004)
  mesh.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(along, p.normal, lateral))
  // 沿体轴短、沿板面横向长、法线方向压扁 —— 是「斑」不是「疣」
  mesh.scale.set(0.5, 0.14, 0.92)
  return mesh
}

// ---------------------------------------------------------------- 躯干 / 头 / 附肢

/**
 * 躯干：沿 X 放样的扁椭圆管，节间有一道浅沟。
 *
 * 半径比 halfWidth/halfHeight 略小（groove），背板是照未收缩的包络摆的，
 * 于是板与体壁之间天然有一线余量，不会打架。
 */
function trunkGeometry(): THREE.BufferGeometry {
  const steps = 84
  const sections: Section[] = []
  for (let i = 0; i <= steps; i++) {
    const x = THREE.MathUtils.lerp(TRUNK_FRONT, TRUNK_BACK, i / steps)
    const phase = (TRUNK_FRONT - x) / PLATE_PITCH
    const local = phase - Math.floor(phase)
    // 窄折痕：节间只是一道浅沟，深挖会读成松果（独角仙蛴螬那一轮的教训）
    const groove = 1 - 0.05 * Math.pow(Math.abs(Math.cos(local * Math.PI)), 6)
    // 末端球冠收口，不收尖
    const t = axisT(x)
    const cap = t > 0.96 ? Math.sqrt(Math.max(0, 1 - Math.pow((t - 0.96) / 0.04, 2))) : 1
    sections.push({
      at: new THREE.Vector3(x, 0, 0),
      ry: Math.max(halfHeight(x) * groove * cap, 1e-4),
      rz: Math.max(halfWidth(x) * groove * cap, 1e-4),
    })
  }
  return loft(sections, 28)
}

/**
 * 头壳：一枚小而窄的骨化囊，从前胸背板下探出 0.12。
 * 真实的萤火虫幼虫头能整个缩进前胸背板下面（捕食蜗牛时才伸出来），
 * 这里取伸出的取食姿态 —— 缩进去的话大颚也一起没了，等于把招牌藏起来。
 */
function headGeometry(): THREE.BufferGeometry {
  const profile = [
    [0.0, 0.3],
    [0.25, 0.85],
    [0.55, 1.0],
    [0.8, 0.86],
    [1.0, 0.42],
  ] as const
  const back = 0.82
  const steps = 18
  const sections: Section[] = []
  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    const r = keyframe(profile, t) * 0.088
    sections.push({
      at: new THREE.Vector3(THREE.MathUtils.lerp(back, HEAD_TIP, t), -0.018, 0),
      ry: Math.max(r * 0.78, 1e-4),
      rz: Math.max(r, 1e-4),
    })
  }
  return loft(sections, 20)
}

/**
 * 一对镰刀状上颚：细、长、向内下方弯，末端尖 —— 萤火虫幼虫靠它刺进蜗牛
 * 注射消化液。与蛴螬那对啃木头的钝凿是两种东西，末端必须收尖。
 *
 * 两支各自留在自己一侧（z 全程同号）、末端相距 0.038，
 * 顶视机位下一眼看得出是两支（白蚁兵蚁那一轮的教训：三维距离不算数，
 * 要按屏幕投影分得开）。
 */
function mandibles(material: THREE.Material): THREE.Group {
  const g = new THREE.Group()
  for (const side of [1, -1] as const) {
    const p0 = new THREE.Vector3(1.08, -0.025, side * 0.06)
    const p1 = new THREE.Vector3(1.25, -0.05, side * 0.078)
    const p2 = new THREE.Vector3(1.3, -0.075, side * 0.019)
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
      const r = THREE.MathUtils.lerp(0.028, 0.005, Math.pow(t, 0.8))
      sections.push({ at, ry: r, rz: r * 0.82 })
    }
    const m = new THREE.Mesh(loft(sections, 12), material)
    m.name = 'larva-mandible'
    g.add(m)
  }
  return g
}

/** 三对短胸足，全部长在前三节（腹部一根附肢都没有 —— 有腹足就成毛虫了） */
const LEG_SPECS = [
  { x: 0.88, sweep: -28 },
  { x: 0.71, sweep: 0 },
  { x: 0.54, sweep: 28 },
] as const

function thoracicLegs(material: THREE.Material): THREE.Group {
  const g = new THREE.Group()
  for (const spec of LEG_SPECS) {
    const pair = legPair(
      {
        base: [spec.x, -0.045, 0.17],
        femur: 0.15,
        tibia: 0.14,
        tarsus: 0.07,
        splay: 38,
        sweep: spec.sweep,
        knee: 88,
        thickness: 0.028,
        spines: false,
      },
      material,
    )
    for (const child of pair.children) child.name = 'larva-leg'
    g.add(pair)
  }
  return g
}

/** 发光器着生的体轴位置（第 8 腹节的腹面，真实位置） */
const LANTERN_X = -0.8

/**
 * 一对发光器：腹面偏侧的乳突，同时探出腹面与背板侧缘。
 *
 * 沿用成虫 firefly.ts 的做法：`chitin()` 的 emissive + translucent，
 * 「光透过软组织」而不是一块自发光塑料。位置见文件头第 4 条 ——
 * 纯腹面的东西在四个俯视机位下一点都看不见，所以让它鼓出侧轮廓。
 */
function lanterns(material: THREE.Material): THREE.Group {
  const g = new THREE.Group()
  for (const side of [1, -1] as const) {
    const m = new THREE.Mesh(new THREE.SphereGeometry(0.075, 16, 12), material)
    m.name = 'larva-lantern'
    /*
     * z 中心 0.168 + 侧向半径 0.1125 = 0.281，比该处背板侧缘（实测 0.254 ——
     * 背板边缘的抬起量几乎整份加在侧向上，因为体形扁、边缘处的外法线近水平）
     * 多出约 0.027：顶视机位下才有两点光从背板边缘外露出来。
     * 中心仍在体壁半宽（0.191）以内 —— 一半埋着才是乳突，全露就成了挂上去的珠子。
     */
    m.position.set(LANTERN_X, -0.042, side * 0.168)
    m.scale.set(1.45, 0.6, 1.5)
    g.add(m)
  }
  return g
}

// ---------------------------------------------------------------- 装配

export function buildFireflyLarva(): InsectModel {
  const g = new THREE.Group()

  // 背板：哑光 + 一点清漆（幼虫背板是骨化的，但不是甲虫的釉面）
  const plateMat = chitin({ color: PLATE_COLOR, gloss: 0.34, clearcoat: 0.14, surface: 'punctate' })
  // 节间与腹面：软组织，哑光 + 次表面透光
  const bodyMat = chitin({ color: BODY_COLOR, gloss: 0.18, clearcoat: 0.02, translucent: true })
  const spotMat = chitin({ color: SPOT_COLOR, gloss: 0.32, clearcoat: 0.06 })
  const headMat = chitin({ color: HEAD_COLOR, gloss: 0.55, clearcoat: 0.35, surface: 'punctate' })
  const mandibleMat = chitin({ color: MANDIBLE_COLOR, gloss: 0.5, clearcoat: 0.28 })
  const legMat = chitin({ color: LEG_COLOR, gloss: 0.35, clearcoat: 0.08 })
  const lanternMat = chitin({
    color: LANTERN_COLOR,
    gloss: 0.35,
    emissive: LANTERN_EMISSIVE,
    emissiveIntensity: LANTERN_INTENSITY,
    translucent: true,
  })

  const trunk = new THREE.Mesh(trunkGeometry(), bodyMat)
  trunk.name = 'larva-body'
  g.add(trunk)

  const head = new THREE.Mesh(headGeometry(), headMat)
  head.name = 'larva-head'
  g.add(head)
  g.add(mandibles(mandibleMat))

  for (const spec of PLATES) {
    const plate = new THREE.Mesh(plateGeometry(spec), plateMat)
    plate.name = 'larva-tergite'
    // 序号只放纯数字：userData 的深拷走 JSON，放对象引用会成环（kit 顶部的教训）
    plate.userData.plate = spec.index
    g.add(plate)
    for (const side of [1, -1] as const) g.add(spotMesh(spec, side, spotMat))
  }

  g.add(thoracicLegs(legMat))
  g.add(lanterns(lanternMat))

  const anchors: Record<string, THREE.Vector3> = {
    tergite: new THREE.Vector3(0.2, halfHeight(0.2) + PLATE_BASE + PLATE_RISE * 0.6, 0),
    // 取中段那一片的斑当标注点；下标夹住，改 PLATE_COUNT 时不至于直接崩
    spot: spotMesh(PLATES[Math.min(5, PLATES.length - 1)], 1, spotMat).position.clone(),
    lantern: new THREE.Vector3(LANTERN_X, -0.09, 0.16),
    head: new THREE.Vector3(1.05, 0.02, 0),
    mandible: new THREE.Vector3(1.28, -0.075, 0.05),
    leg: new THREE.Vector3(LEG_SPECS[1].x, -0.12, 0.34),
  }

  return finalize(g, anchors)
}
