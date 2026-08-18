/**
 * 程序化昆虫建模工具箱
 *
 * 昆虫的形态高度规律：体分头/胸/腹三段，胸部生三对足、两对翅，
 * 头部生一对触角与复眼。本模块把这些通用部件参数化，
 * 各物种 builder 只需给出尺寸、颜色与姿态。
 *
 * 单位约定：1 = 1cm（真实体长），最终由 InsectModel.radius 归一化取景。
 */
import * as THREE from 'three'
import { microRoughnessMap, punctateMaps, striateMaps } from './surface'
import { facetNormalMap } from './eyes'

// ---------------------------------------------------------------- 类型契约

// ---------------------------------------------------------------- 骨架（rig）

/**
 * 可驱动的骨架句柄。动作层（`src/three/motion/`）只写这些节点的 rotation，
 * 绝不碰几何 —— 几何是构建期的产物，动作是渲染期的状态，两者不能混。
 *
 * 为什么不是「每个物种自己声明骨架」：63 个物种里 62 个用的是 kit 的
 * `leg()`/`legPair()`，31 个用 `wing()`/`wingPair()`。部件函数自己给产物打上
 * 标记、`finalize()` 统一收集，物种文件一个字都不用改，将来新增物种也自动带上。
 *
 * `rest` 记的是构建完成时的静止姿态。动作层必须以它为基准做**偏移**，
 * 不能直接写绝对角度 —— 每个物种的腿/翅摆位都是逐只调出来的，写绝对角度
 * 等于把 63 只虫的姿态一起抹平。
 */
export interface WingRig {
  /** 翅的枢轴节点（`wing()` 里那层 pivot），绕它转就是扑翅 */
  pivot: THREE.Object3D
  /** 静止姿态，动作层的基准 */
  rest: THREE.Euler
  /**
   * 静止缩放。羽化展翅要把翅从「皱缩的一小团」放大到全尺寸，
   * 而 `wing()` 会把 `scale.z` 设成 ±1 来做左右镜像 —— 动作层直接
   * `setScalar()` 会把那个负号抹掉，左翅当场翻到对侧去。
   * 记下原值，缩放一律以它为基准做**乘法**。
   */
  restScale: THREE.Vector3
  /** +1 右翅，−1 左翅。⚠️ 左翅的 pivot 带 scale.z = −1，绕 Y/X 的旋转在观感上会反号，动作层要按它取符号 */
  side: 1 | -1
  /** 前翅 / 后翅。物种在 WingSpec 里显式给出才有值，kit 不做猜测 */
  role?: 'fore' | 'hind'
  /** 翅基在模型局部坐标里的位置（已随 finalize 的居中一起平移），供动作层按前后排相位 */
  base: THREE.Vector3
}

/** 一条足的四个可转关节。层级：coxa → femur → tibia → tarsus，每节挂在父节点末端。 */
export interface LegRig {
  /** 体—基节关节：转它 = 整条腿前后摆（步态的主运动） */
  coxa: THREE.Object3D
  /** 基节—腿节关节：转它 = 抬腿/落腿 */
  femur: THREE.Object3D
  /** 膝（腿节—胫节） */
  tibia: THREE.Object3D
  /** 胫—跗关节 */
  tarsus: THREE.Object3D
  rest: { coxa: THREE.Euler; femur: THREE.Euler; tibia: THREE.Euler; tarsus: THREE.Euler }
  /** +1 右腿，−1 左腿。⚠️ 同 WingRig.side，左腿整组带 scale.z = −1 */
  side: 1 | -1
  /** 足基在模型局部坐标里的位置，供动作层判前/中/后足（三角步态要分相位） */
  base: THREE.Vector3
}

export interface InsectRig {
  legs?: LegRig[]
  wings?: WingRig[]
  /** 物种自行登记的可动件：鞘翅、口器、尾须、捕捉足…… 用 `registerPart()` 挂 */
  parts?: Record<string, THREE.Object3D>
}

/** 一个物种模型的产出。局部坐标系：+X 向前(头)，+Y 向上(背)，+Z 向右。 */
export interface InsectModel {
  group: THREE.Group
  /** 热点锚点：key 对应 data 层 hotspot.anchor，值为模型局部坐标 */
  anchors: Record<string, THREE.Vector3>
  /** 包围球半径，供相机自动取景 */
  radius: number
  /**
   * 取景半径覆写（缺省 = radius）。给腿展远大于虫体的物种用：大蚊的六条
   * 5cm 高跷腿把包围球撑到 5.5，按它取景 3cm 的虫体缩成一个点。取景与
   * 落影按 frameRadius，腿尖出画——真实微距摄影对大蚊就是这么裁的。
   * 包围半径本身不动：它仍是「模型有多大」的事实。
   */
  frameRadius?: number
  /**
   * 可驱动骨架。**缺省即静态** —— 没有 rig 的物种和从前完全一样，
   * 现有契约一个字不动。由 `finalize()` 从打过标记的部件里收集。
   */
  rig?: InsectRig
}

/**
 * 骨架标记挂在 `userData` 的这个键下。
 *
 * 用一个不像业务字段的名字是有原因的：物种文件里的 userData 已经很挤了 ——
 * longhorn-beetle 用 `base`/`phase`/`joints`，water-strider 用 `knee`/`tip`，
 * darkling-beetle 用 `hip`，silk-moth 用 `hairCount`。撞名会静默覆盖，
 * 而覆盖掉的那个字段坏了不会报错，只会让某只虫的某处悄悄不对。
 */
const RIG_TAG = '__rig'

/**
 * 标记里**只准放 JSON 安全的纯数据** —— 不许放 Object3D 引用，也不许放
 * THREE.Euler / Vector3 这类带原型的对象。
 *
 * 为什么（2026-08-18 当场撞出来的）：`Object3D.copy()` 是用
 * `JSON.parse(JSON.stringify(source.userData))` 深拷 userData 的。
 * 第一版把四个关节的**对象引用**塞进了标记，于是
 * `userData.__rig.joints.coxa.userData.__rig...` 成了循环结构，
 * `mirrorZ()` 一 clone 就抛 "Converting circular structure to JSON"，
 * 15 个测试文件一起红。
 * 放 Euler 更阴 —— 它能序列化，但 JSON.parse 回来是个没有原型的普通对象，
 * `rest.x` 变成 undefined（Euler 内部字段是 `_x`，靠 getter 暴露 x）。
 * 那不会抛异常，只会让克隆出来的部件安静地动错，正是最难查的一类。
 *
 * 所以：句柄与 rest 都不进 userData，全部由 `collectRig()` 在收集时
 * 按层级重组、按当时的 rotation 取快照。finalize 紧跟在构建之后，
 * 那一刻的姿态就是静止姿态，比在部件函数里提前记更准。
 */
type RigTag =
  | { kind: 'wing'; side: 1 | -1; role?: 'fore' | 'hind' }
  /** 一条腿的根（coxa）。其余三节靠层级关系找，不靠 id —— clone 出来的那条腿自带自己的子树 */
  | { kind: 'leg'; side: 1 | -1 }
  | { kind: 'leg-joint'; role: 'femur' | 'tibia' | 'tarsus' }
  | { kind: 'part'; name: string }

/**
 * 把一个自写部件登记进骨架，动作层就能按名字拿到它转。
 *
 * 给的是 kit 覆盖不到的那些东西：甲虫的鞘翅、螳螂的捕捉足、蝗虫的弹跳后足、
 * 水黾的划水中足。物种文件在 `finalize()` 之前调用即可。
 *
 * 返回传入的对象本身，方便 `g.add(registerPart(elytra, 'elytra-right'))` 这样串写。
 */
export function registerPart<T extends THREE.Object3D>(obj: T, name: string): T {
  obj.userData[RIG_TAG] = { kind: 'part', name } satisfies RigTag
  return obj
}

/**
 * 把一片**自写的**翅登记进骨架。
 *
 * 为什么需要这个出口：普查一跑就露馅了 —— 翅最值得扑的那 17 只
 * （帝王蝶、碧伟蜓、柞蚕蛾、草蛉、齿蛉、大蚊、家蝇、库蚊……）恰恰全是
 * 自己搭翅的。它们要在翅面上做斑纹、镶边、翅室，`wing()` 那片素膜给不了，
 * 所以各自用 `wingGeometry()` 拼了自己的 pivot/blade。
 * 结果就是：只给 `wing()` 打标记的话，能扑的没几只，而**不能扑的那些不会报错，
 * 只会安静地不动** —— 和 D 轮触角那 9 只是同一个坑。
 *
 * 传进来的必须是**枢轴节点本身**（翅基处、绕它转就能扇动的那个 group），
 * 不是翅面 mesh。静止姿态由 `finalize()` 收集时快照，这里不用管顺序。
 */
export function registerWing<T extends THREE.Object3D>(
  pivot: T,
  opts: { side: 1 | -1; role?: 'fore' | 'hind' },
): T {
  pivot.userData[RIG_TAG] = { kind: 'wing', side: opts.side, role: opts.role } satisfies RigTag
  return pivot
}

export type InsectBuilder = () => InsectModel

/** 放样截面：沿路径某处的一个椭圆环 */
export interface Section {
  /** 截面中心 */
  at: THREE.Vector3 | [number, number, number]
  /** 上下半径（Y 方向） */
  ry: number
  /** 左右半径（Z 方向） */
  rz: number
  /** 绕路径切线的扭转（弧度），默认 0 */
  roll?: number
}

// ---------------------------------------------------------------- 材质

// 绒面 / 虹彩的默认档 —— 目视验收时的调节旋钮（贴图侧的旋钮在 surface.ts 顶部）。
/** 绒面 sheen 的粗糙度：0.55 是「细密短绒」，往 0.7 走会更像蓬松长毛 */
const VELVET_SHEEN_ROUGHNESS = 0.55
/** 绒面 sheenColor 相对基色的提亮量（HSL 的 L 偏移）：绒毛边缘散射比基色亮一档 */
const VELVET_SHEEN_LIGHTEN = 0.1
/** 鞘翅薄膜干涉：低 IOR + 宽厚度区间 = 随视角在绿金紫间缓慢流转，不闪成肥皂泡 */
const ELYTRA_IRIDESCENCE_IOR = 1.3
const ELYTRA_IRIDESCENCE_THICKNESS: readonly [number, number] = [120, 420]
/**
 * 开虹彩时清漆的上限。虹彩与清漆是两层叠加的角度高光，同满档必过曝——
 * 这条从属于本项目铁律：elytra 清漆上限 0.55，ACES 下颜色宁深勿浅。
 */
const ELYTRA_IRIDESCENT_CLEARCOAT = 0.35
/** 翅膜虹彩：强度刻意压低，只在掠射角泛出一点淡彩（真实豆娘/蜻蜓翅膜即如此） */
const MEMBRANE_IRIDESCENCE = 0.45
const MEMBRANE_IRIDESCENCE_IOR = 1.25
const MEMBRANE_IRIDESCENCE_THICKNESS: readonly [number, number] = [140, 380]

/**
 * C 轮·体节间膜（intersegment membrane）默认档——硬甲片之间露出的一圈软组织。
 * 与上面的翅膜虹彩常量是两回事，别混：这组管的是 segmentedAbdomen() 节间环。
 */
/** 节间膜半径相对该处体节包络半径的收缩比例：0.8 = 陷进去约 20%，「略缩」而非挖穿 */
const MEMBRANE_RING_RATIO = 0.8
/** 节间膜材质光泽：≤0.2 读作「哑光软组织」，明显低于甲片默认 gloss 0.45（见 ChitinOptions.gloss 注释） */
const MEMBRANE_RING_GLOSS = 0.12
/** membraneColor/color 都未给时的通用深色兜底——多数昆虫节间膜实际都偏暗棕黑，不依赖具体物种色 */
const MEMBRANE_RING_FALLBACK_COLOR = '#231e1b'
/** membraneColor 缺省但给了 color（体节基色）时：压暗 ~35% 的推导系数（乘法而非 HSL 偏移，深色基色也不会算漂） */
const MEMBRANE_RING_DARKEN = 0.65

/**
 * 表面微观结构档位：
 * - `undefined`（缺省）= 挂一张极轻的微颗粒粗糙度图，只打破「整片均匀」的
 *   塑料高光，强度低到不改变已逐只验收过的观感（旋钮见 surface.ts）；
 * - `'smooth'` = 什么都不挂，留给真正光学级光滑的表面；
 * - `'punctate'` = 刻点：随机圆坑法线 + 坑内更糙的粗糙度图（甲虫头 / 前胸背板）；
 * - `'striate'` = 鞘翅纵沟纹；
 * - `'velvet'` = 绒面 sheen（大王花金龟前胸、蛾蝶体毛）。
 */
export type ChitinSurface = 'smooth' | 'punctate' | 'striate' | 'velvet'

export interface ChitinOptions {
  /** 基色 */
  color: THREE.ColorRepresentation
  /** 0 = 哑光绒毛，1 = 镜面外骨骼。默认 0.45 */
  gloss?: number
  /** 金属感，甲虫可给 0.15~0.4。默认 0 */
  metal?: number
  /** 清漆层强度，硬质鞘翅给 0.6+。默认 0 */
  clearcoat?: number
  /** 半透明（膜翅、蝉翼）。默认 1 = 不透明 */
  opacity?: number
  /** 次表面透光感（薄翅、幼虫体壁、白蚁软腹） */
  translucent?: boolean
  /** 表面微观结构，档位含义见 ChitinSurface。node 测试环境无 Canvas，贴图为 null 时静默跳过 */
  surface?: ChitinSurface
  /** 自发光（萤火虫发光器） */
  emissive?: THREE.ColorRepresentation
  emissiveIntensity?: number
  side?: THREE.Side
}

/** 几丁质外骨骼材质。昆虫体壁的关键观感是「清漆层下的色素」，故用 physical。 */
export function chitin(o: ChitinOptions): THREE.MeshPhysicalMaterial {
  const transparent = (o.opacity ?? 1) < 1
  const m = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(o.color),
    roughness: 1 - (o.gloss ?? 0.45) * 0.92,
    metalness: o.metal ?? 0,
    clearcoat: o.clearcoat ?? 0,
    clearcoatRoughness: 0.18,
    transparent,
    opacity: o.opacity ?? 1,
    side: o.side ?? THREE.FrontSide,
    depthWrite: !transparent,
  })
  if (o.translucent) {
    // transmission 走 three 的透射渲染通道，不依赖 transparent 排序；
    // depthWrite 保持 true（除非显式 opacity<1），否则体节会互相看穿、排序打架。
    m.transmission = 0.35
    m.thickness = 0.6
    m.ior = 1.42
  }
  if (o.emissive) {
    m.emissive = new THREE.Color(o.emissive)
    m.emissiveIntensity = o.emissiveIntensity ?? 1
  }
  applySurface(m, o.surface)
  return m
}

/**
 * 把表面微观层落到材质上。生成器在 node（vitest）下返回 null——
 * 那就什么都不挂，材质的标量参数不受影响，测试照常可断言。
 * 贴图是全局共享缓存（见 surface.ts 头注释），这里只挂引用，绝不 dispose。
 */
function applySurface(m: THREE.MeshPhysicalMaterial, surface: ChitinSurface | undefined): void {
  if (surface === 'smooth') return
  if (surface === 'punctate' || surface === 'striate') {
    const maps = surface === 'punctate' ? punctateMaps() : striateMaps()
    if (maps) {
      m.normalMap = maps.normal
      m.roughnessMap = maps.roughness
    }
    return
  }
  if (surface === 'velvet') {
    m.sheen = 1
    m.sheenRoughness = VELVET_SHEEN_ROUGHNESS
    // 绒毛的边缘散射比基色亮一档：取基色提亮而不另配色，保持已验收的色相
    m.sheenColor.copy(m.color).offsetHSL(0, 0, VELVET_SHEEN_LIGHTEN)
  }
  // 缺省与 velvet 都挂极轻微颗粒图：绒面同样不该有「整片均匀」的高光
  const micro = microRoughnessMap()
  if (micro) m.roughnessMap = micro
}

export interface ElytraOptions {
  /** 表面微观结构：刻点或纵沟（含配套粗糙度图），档位含义见 ChitinSurface */
  surface?: 'punctate' | 'striate'
  /**
   * 薄膜干涉结构色（吉丁、铜绿丽金龟、金属叶甲）：随视角在色相间流转。
   * 开启时清漆自动压到 ELYTRA_IRIDESCENT_CLEARCOAT（≤0.35）——
   * 虹彩本身就是一层强角度高光，与满档清漆叠加必过曝。
   */
  iridescent?: boolean
}

/**
 * 鞘翅/甲壳专用：清漆 + 微金属，模拟甲虫的釉质光泽。
 *
 * 清漆强度刻意压在 0.55：更高的值配上 Environment 的面光源后，
 * 正对光源的角度会整片过曝成灰白，把固有色和隆起的体积感一起吃掉
 * （深褐的独角仙曾因此从正面看像两个白球）。开虹彩时进一步压到 0.35，
 * 理由同上——两层角度高光不可叠满。铁律不变：上限 0.55，ACES 下宁深勿浅。
 */
export function elytra(
  color: THREE.ColorRepresentation,
  metal = 0.25,
  opts: ElytraOptions = {},
): THREE.MeshPhysicalMaterial {
  const m = chitin({
    color,
    gloss: 0.74,
    metal,
    clearcoat: opts.iridescent ? ELYTRA_IRIDESCENT_CLEARCOAT : 0.55,
    surface: opts.surface,
  })
  if (opts.iridescent) {
    m.iridescence = 1
    m.iridescenceIOR = ELYTRA_IRIDESCENCE_IOR
    m.iridescenceThicknessRange = [...ELYTRA_IRIDESCENCE_THICKNESS] // 拷贝：数组是引用，别让多份材质共享可变范围
  }
  return m
}

export interface MembraneOptions {
  /** 极轻薄膜虹彩：掠射角下的淡彩流转（豆娘/蜻蜓翅膜在真实世界就有）。默认关 */
  iridescent?: boolean
  /**
   * 虹彩强度覆写（0~1）。缺省用 MEMBRANE_IRIDESCENCE(0.45) —— 蜻蜓定标档；
   * 小翅昆虫（食蚜蝇）满档会显闹，B 轮实测需要一个更轻的档位。
   */
  iridescenceStrength?: number
}

/** 膜翅：半透明、双面、极薄 */
export function membrane(
  color: THREE.ColorRepresentation = '#eef1f4',
  opacity = 0.32,
  opts: MembraneOptions = {},
): THREE.MeshPhysicalMaterial {
  const m = chitin({ color, gloss: 0.7, opacity, side: THREE.DoubleSide })
  m.transmission = 0.55
  m.thickness = 0.05
  m.ior = 1.33
  m.roughness = 0.22
  if (opts.iridescent) {
    m.iridescence = opts.iridescenceStrength ?? MEMBRANE_IRIDESCENCE
    m.iridescenceIOR = MEMBRANE_IRIDESCENCE_IOR
    m.iridescenceThicknessRange = [...MEMBRANE_IRIDESCENCE_THICKNESS]
  }
  return m
}

// ---------------------------------------------------------------- 放样核心

const _v = new THREE.Vector3()

function toVec(p: THREE.Vector3 | [number, number, number]): THREE.Vector3 {
  return Array.isArray(p) ? new THREE.Vector3(p[0], p[1], p[2]) : p.clone()
}

/**
 * 沿一串截面放样出封闭实体 —— 昆虫身体、腿节、触角节都由它生成。
 *
 * 相邻截面之间用切线定向，避免扭曲；首尾用极点封口（半径为 0 的截面自动退化）。
 */
export function loft(sections: Section[], radialSegments = 24, capEnds = true): THREE.BufferGeometry {
  if (sections.length < 2) throw new Error('loft 至少需要 2 个截面')

  const pts = sections.map((s) => toVec(s.at))
  const n = sections.length
  const positions: number[] = []
  const normals: number[] = []
  const uvs: number[] = []
  const indices: number[] = []

  // 每个截面的局部标架：tangent 沿路径，normal/binormal 张成截面
  const frames: { t: THREE.Vector3; u: THREE.Vector3; v: THREE.Vector3 }[] = []
  let ref = new THREE.Vector3(0, 1, 0)
  for (let i = 0; i < n; i++) {
    const t = new THREE.Vector3()
    if (i === 0) t.subVectors(pts[1], pts[0])
    else if (i === n - 1) t.subVectors(pts[n - 1], pts[n - 2])
    else t.subVectors(pts[i + 1], pts[i - 1])
    if (t.lengthSq() < 1e-12) t.set(1, 0, 0)
    t.normalize()

    // 用上一段的参考向量做平行传输，防止截面沿路径翻滚
    if (Math.abs(ref.dot(t)) > 0.98) ref = new THREE.Vector3(0, 0, 1)
    const v = new THREE.Vector3().crossVectors(t, ref).normalize()
    const u = new THREE.Vector3().crossVectors(v, t).normalize()
    ref = u.clone()
    frames.push({ t, u, v })
  }

  for (let i = 0; i < n; i++) {
    const s = sections[i]
    const { u, v } = frames[i]
    const roll = s.roll ?? 0
    for (let j = 0; j <= radialSegments; j++) {
      const a = (j / radialSegments) * Math.PI * 2 + roll
      const cy = Math.cos(a) * s.ry
      const cz = Math.sin(a) * s.rz
      _v.copy(pts[i]).addScaledVector(u, cy).addScaledVector(v, cz)
      positions.push(_v.x, _v.y, _v.z)
      // 椭圆法线需按半径倒数加权，否则扁截面的光照会失真
      const nx = (Math.cos(a) / Math.max(s.ry, 1e-6)) * (s.rz || 1)
      const nz = (Math.sin(a) / Math.max(s.rz, 1e-6)) * (s.ry || 1)
      _v.set(0, 0, 0).addScaledVector(u, nx).addScaledVector(v, nz).normalize()
      normals.push(_v.x, _v.y, _v.z)
      uvs.push(j / radialSegments, i / (n - 1))
    }
  }

  const ring = radialSegments + 1
  for (let i = 0; i < n - 1; i++) {
    for (let j = 0; j < radialSegments; j++) {
      const a = i * ring + j
      const b = a + ring
      indices.push(a, b, a + 1, b, b + 1, a + 1)
    }
  }

  if (capEnds) {
    for (const end of [0, n - 1] as const) {
      const base = positions.length / 3
      const c = pts[end]
      positions.push(c.x, c.y, c.z)
      const nrm = frames[end].t.clone().multiplyScalar(end === 0 ? -1 : 1)
      normals.push(nrm.x, nrm.y, nrm.z)
      uvs.push(0.5, end === 0 ? 0 : 1)
      const ringStart = end * ring
      for (let j = 0; j < radialSegments; j++) {
        if (end === 0) indices.push(base, ringStart + j + 1, ringStart + j)
        else indices.push(base, ringStart + j, ringStart + j + 1)
      }
    }
  }

  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  g.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3))
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2))
  g.setIndex(indices)
  return g
}

/**
 * 纺锤体：给定起止点与最粗处半径，生成两端收尖的椭球体。
 * 昆虫的头、胸、各腹节几乎都是这个形状。
 * @param bulge 最粗处在路径上的位置 0~1，默认 0.45
 * @param flat  扁平度。⚠️ 语义与直觉相反，实现是 `ry = r/flat, rz = r*flat`：
 *              **>1 = 上下（背腹）压扁**，越大越扁平宽阔（花金龟、蠼螋）；
 *              **<1 = 左右（侧向）压扁**，越小越侧扁高耸（螳螂腹）。
 *              各物种文件都按这个实际行为标定过，`__tests__/mirror.test.ts`
 *              钉住了它，别顺手「修正」—— 改了会让一批虫的体型一起翻转。
 */
export function spindle(
  from: [number, number, number],
  to: [number, number, number],
  radius: number,
  opts: { bulge?: number; flat?: number; steps?: number; taperStart?: number; taperEnd?: number } = {},
): THREE.BufferGeometry {
  const a = new THREE.Vector3(...from)
  const b = new THREE.Vector3(...to)
  const bulge = opts.bulge ?? 0.45
  const flat = opts.flat ?? 1
  const steps = opts.steps ?? 18
  const ts = opts.taperStart ?? 0
  const te = opts.taperEnd ?? 0

  const sections: Section[] = []
  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    // 以 bulge 为峰的非对称正弦鼓包
    const k = t < bulge ? t / bulge : (1 - t) / (1 - bulge)
    let r = radius * Math.sin(Math.min(1, Math.max(0, k)) * Math.PI * 0.5)
    r = r * (1 - t) + r * t // 保持形状，占位以便未来加噪声
    if (t === 0) r = radius * ts
    if (t === 1) r = radius * te
    sections.push({
      at: new THREE.Vector3().lerpVectors(a, b, t),
      ry: Math.max(r / flat, 1e-4),
      rz: Math.max(r * flat, 1e-4),
    })
  }
  return loft(sections, 28)
}

export interface SegmentedAbdomenOptions {
  from: [number, number, number]
  to: [number, number, number]
  /** 起始处半径 */
  r0: number
  /** 末端处半径 */
  r1: number
  /** 体节数，通常 6~9 */
  segments?: number
  /** 环沟深度 0~0.4，越大分节越明显 */
  groove?: number
  /** 扁平度，>1 左右扁 */
  flat?: number
  /** 最粗处位置 0~1，默认 0.3（多数昆虫腹基部粗） */
  bulge?: number
  /**
   * C 轮新增：是否在相邻体节交界处插入节间膜（陷进去一点 + 独立深色哑光材质，
   * 见 segmentedAbdomenMembranes）。默认 true——全员受益的默认升级，
   * 不想要就显式传 false（比如某物种腹部本就该看起来是一整块硬壳）。
   * 只影响 segmentedAbdomen() 自身的一圈很窄的局部收缩（不加顶点、不改体节数/包络/长度），
   * 真正带独立材质的膜环网格由 segmentedAbdomenMembranes() 另外生成。
   */
  membrane?: boolean
  /** 节间膜陷入比例，覆盖 MEMBRANE_RING_RATIO（0.8）。同时控制 body 上的局部收缩幅度与膜环半径。 */
  membraneRatio?: number
  /** 节间膜颜色，覆盖自动推导（见 segmentedAbdomenMembranes 顶部注释）。只被 segmentedAbdomenMembranes 使用，body geometry 本身不含材质。 */
  membraneColor?: THREE.ColorRepresentation
  /**
   * 体节材质基色（可选，仅用于推导 membraneColor 的默认深色：压暗 ~35%）。
   * 只读取数值派生一个新 THREE.Color，绝不 mutate 调用方传入的材质/颜色对象——
   * 有物种给腹部挂了 B 轮半透/绒面材质（白蚁/草蛉等），那个材质对象必须原样不动。
   */
  color?: THREE.ColorRepresentation
}

/**
 * 分节腹部沿全长的半径包络（不含节内起伏）：从 r0 鼓到最大再收到 r1。
 * segmentedAbdomen() 与 segmentedAbdomenMembranes() 共用同一份，保证膜环与体节表面对齐；
 * 也解了 ant.ts 曾经的痛点（那里为了算这条包络，自己抄了一遍这个公式，见该文件顶部注释）。
 */
export function abdomenEnvelope(t: number, r0: number, r1: number, bulge = 0.3): number {
  const peak = Math.max(r0, r1) * 1.06
  return t < bulge
    ? THREE.MathUtils.lerp(r0, peak, smooth(t / bulge))
    : THREE.MathUtils.lerp(peak, r1, smooth((t - bulge) / (1 - bulge)))
}

/**
 * 分节腹部：一串逐渐收细的体节，节间有环沟。
 * 这是昆虫（尤其蜂、蚁、蜻蜓）腹部辨识度最高的特征。
 *
 * 返回值只是几何体（历来如此，调用方自己套 material）——C 轮加入的节间膜因此拆成两半：
 * 这里只做「陷进去一点」的纯几何局部收缩（默认开启，不加顶点、不改变长度/包络，
 * 50 个已有调用点零改动即可拿到），真正带独立深色哑光材质的膜环网格是
 * 下面 segmentedAbdomenMembranes() 的活——它按需要额外 new THREE.Mesh，
 * 调用方要拿到膜环必须显式调它并把返回的 mesh 加进自己的 group。
 */
export function segmentedAbdomen(opts: SegmentedAbdomenOptions): THREE.BufferGeometry {
  const a = new THREE.Vector3(...opts.from)
  const b = new THREE.Vector3(...opts.to)
  const segs = opts.segments ?? 7
  const groove = opts.groove ?? 0.16
  const flat = opts.flat ?? 1
  const bulge = opts.bulge ?? 0.3
  const perSeg = 5 // 每节采样数，够画出鼓起与收缩
  const membraneOn = opts.membrane !== false
  const membraneRatio = THREE.MathUtils.clamp(opts.membraneRatio ?? MEMBRANE_RING_RATIO, 0.05, 0.98)

  const sections: Section[] = []
  const total = segs * perSeg
  for (let i = 0; i <= total; i++) {
    const t = i / total
    // 沿全长的包络：从 r0 鼓到最大再收到 r1
    const env = abdomenEnvelope(t, opts.r0, opts.r1, bulge)
    // 节内起伏：每节前段鼓、节末收（环沟）
    const local = (i % perSeg) / perSeg
    // 节间膜：只在体节真正的交界采样点（每节起点，且不是腹部本身的头尾两端）
    // 额外收一口——不加采样点、不碰长度和包络，50 个既有调用点零改动就直接吃到这个效果。
    const atInternalJoint = membraneOn && i % perSeg === 0 && i !== 0 && i !== total
    const ripple =
      1 - groove * Math.pow(Math.sin(local * Math.PI), 6) * 0 - groove * smoothstepDip(local) - (atInternalJoint ? 1 - membraneRatio : 0)
    const r = Math.max(env * ripple, 1e-4)
    sections.push({
      at: new THREE.Vector3().lerpVectors(a, b, t),
      ry: r / flat,
      rz: r * flat,
    })
  }
  return loft(sections, 26)
}

/**
 * 节间膜环：C 轮新增，与 segmentedAbdomen() 共用同一套 from/to/r0/r1/segments/flat/bulge，
 * 在每个体节交界处（内部 segments-1 个，不含腹部本身的头尾两端）另外生成一圈很窄的
 * 独立几何——深色哑光材质（基色压暗 ~35%、gloss ≤ 0.2、无 clearcoat），
 * 视觉上是「硬甲片之间露出的一圈软组织」。
 *
 * opts.membrane === false 或体节数 < 2 时返回空数组（没有节间可言）。
 * 面数很省：每环只有 2 段 loft（3 个截面、20 个径向分段、不封口），约数十个三角形。
 *
 * 不会改动调用方传入的任何材质/颜色对象——membraneColor 缺省时只读取 opts.color 的
 * 数值派生一个新 THREE.Color；同一批膜环共享一个新建的 chitin() 材质实例，
 * 与 body 用的材质完全独立（这也是为什么白蚁/草蛉那些腹部挂了 B 轮半透/绒面材质的
 * 物种，即便将来接入这个函数，原本的材质对象也不会被这里碰一下）。
 *
 * 目前没有任何物种文件调用它（50 个既有调用点保持零改动）——这是它还没被接入
 * 具体物种前，kit 层面独立可用、独立测试的新能力；接入需要各物种文件自己加一行
 * `g.add(...segmentedAbdomenMembranes(sameOpts))`，不在本轮范围内。
 */
export function segmentedAbdomenMembranes(opts: SegmentedAbdomenOptions): THREE.Mesh[] {
  const segs = opts.segments ?? 7
  if (opts.membrane === false || segs < 2) return []

  const a = new THREE.Vector3(...opts.from)
  const b = new THREE.Vector3(...opts.to)
  const flat = opts.flat ?? 1
  const bulge = opts.bulge ?? 0.3
  const membraneRatio = THREE.MathUtils.clamp(opts.membraneRatio ?? MEMBRANE_RING_RATIO, 0.05, 0.98)
  const perSeg = 5 // 与 segmentedAbdomen() 的采样密度对齐，环宽取半个采样间隔，肉眼是一条窄带而非宽带
  const halfWidth = 1 / (segs * perSeg) / 2

  const color = opts.membraneColor ?? deriveMembraneColor(opts.color)
  const material = chitin({ color, gloss: MEMBRANE_RING_GLOSS, clearcoat: 0 })

  const rings: THREE.Mesh[] = []
  for (let j = 1; j < segs; j++) {
    const t = j / segs
    const env = abdomenEnvelope(t, opts.r0, opts.r1, bulge)
    const r = Math.max(env * membraneRatio, 1e-4)
    const sections: Section[] = [
      { at: new THREE.Vector3().lerpVectors(a, b, Math.max(t - halfWidth, 0)), ry: r / flat, rz: r * flat },
      { at: new THREE.Vector3().lerpVectors(a, b, t), ry: r / flat, rz: r * flat },
      { at: new THREE.Vector3().lerpVectors(a, b, Math.min(t + halfWidth, 1)), ry: r / flat, rz: r * flat },
    ]
    const mesh = new THREE.Mesh(loft(sections, 20, false), material)
    mesh.name = 'membrane-ring'
    rings.push(mesh)
  }
  return rings
}

/** membraneColor 缺省时的推导：有 color 就压暗 ~35%，否则退到通用深色兜底。只读，绝不 mutate 传入的 color。 */
function deriveMembraneColor(base: THREE.ColorRepresentation | undefined): THREE.Color {
  if (base === undefined) return new THREE.Color(MEMBRANE_RING_FALLBACK_COLOR)
  return new THREE.Color(base).multiplyScalar(MEMBRANE_RING_DARKEN)
}

function smooth(t: number): number {
  const x = Math.min(1, Math.max(0, t))
  return x * x * (3 - 2 * x)
}
/** 节末环沟：只在每节最后 25% 处下凹 */
function smoothstepDip(local: number): number {
  if (local < 0.75) return 0
  const t = (local - 0.75) / 0.25
  return Math.sin(t * Math.PI)
}

// ---------------------------------------------------------------- 附肢

export interface LegSpec {
  /** 基节着生点（胸部表面） */
  base: [number, number, number]
  /** 腿节(股节)长 */
  femur: number
  /** 胫节长 */
  tibia: number
  /** 跗节长（末端着地段），默认 femur*0.35 */
  tarsus?: number
  /** 粗细，默认 0.055 */
  thickness?: number
  /** 向外张开角（度）：0 = 贴体，90 = 完全侧展 */
  splay: number
  /** 前后摆角（度）：负值向前伸，正值向后蹬 */
  sweep: number
  /** 膝关节弯曲角（度），越大越蹲伏，默认 70 */
  knee?: number
  /** 胫跗关节角（度），默认 55 */
  ankle?: number
  /** 是否加胫节刺（多数昆虫有） */
  spines?: boolean
}

/**
 * 一条昆虫足：基节→腿节→胫节→跗节，四段折线。
 * 关节处用球体填充，避免折角处出现破面。
 *
 * ## 为什么是嵌套的骨架，而不是一堆绝对坐标的线段
 *
 * 原先这里把 kneePt / anklePt / tipPt 三个**绝对坐标**算出来，再在点之间画锥管，
 * 全部塞进一个扁平 group。几何是对的，但**没有关节，所以转不动** —— 想让虫走路，
 * 只能整条腿重算重建。D 轮触角摆能靠 `userData.base` 在展台侧重新锚定绕过去，
 * 那招对单段触角行，对三段折线的腿不行。
 *
 * 现在改成 `coxa → femur → tibia → tarsus` 的嵌套：每一节挂在父节点的末端，
 * 几何在各自的关节局部坐标里，摆姿靠**转 group** 而不是重算端点。
 * 62/63 个物种用的是这个函数（只有淡色库蚊自写腿），所以这一处改动 = 62 只虫同时能动。
 *
 * ## 静止姿态必须逐像素不变
 *
 * 姿态仍然烘在几何里（四个关节的 rotation 静止时全是零位），所以默认渲染结果
 * 与改前完全一致 —— 这不是「应该差不多」，是硬门禁：`__tests__/leg-rig.test.ts`
 * 里带着改前那版的参考实现逐顶点比对，`__tests__/rig-invariance.test.ts` 拿
 * 63 只虫的顶点统计/包围半径/锚点对基线。改坏了这两处会红。
 *
 * 之所以这么较真：63 只虫的形态是逐只目视调出来的，一次悄悄的整体漂移，
 * 所有形态断言照样全绿（断言量的是数字，人看的是长相 —— 这个跟头本项目栽过多次）。
 *
 * ## 返回结构的兼容性
 *
 * 返回的仍是那个 position 为零、几何在绝对坐标语义下的外层 group，
 * `userData.tip` / `userData.knee` 仍是**绝对坐标**（water-strider、jewel-beetle 等
 * 13 个物种按 `legPair().children[0].userData.tip` 取值）。
 * 外层 group 保持在原点尤其关键：`legPair()` 是在这一层翻 `scale.z = -1` 做镜像的，
 * 若把它挪到 base 上，镜像面就从体中线变成了该腿的基节，左腿会整条飞到错的地方。
 */
export function leg(spec: LegSpec, material: THREE.Material): THREE.Group {
  const g = new THREE.Group()
  const th = spec.thickness ?? 0.055
  const tarsusLen = spec.tarsus ?? spec.femur * 0.35
  const splay = THREE.MathUtils.degToRad(spec.splay)
  const sweep = THREE.MathUtils.degToRad(spec.sweep)
  const knee = THREE.MathUtils.degToRad(spec.knee ?? 70)
  const ankle = THREE.MathUtils.degToRad(spec.ankle ?? 55)

  const base = new THREE.Vector3(...spec.base)
  // 腿节方向：先侧展，再前后摆，整体略向上抬（昆虫腿从体侧上方伸出）
  const dirFemur = new THREE.Vector3(
    Math.sin(sweep) * Math.cos(splay) * -1,
    Math.sin(splay) * 0.35 + 0.25,
    Math.cos(sweep) * Math.cos(splay),
  ).normalize()
  const kneePt = base.clone().addScaledVector(dirFemur, spec.femur)

  // 胫节：在腿节方向基础上向下折
  const down = new THREE.Vector3(0, -1, 0)
  const dirTibia = dirFemur.clone().lerp(down, Math.sin(knee) * 0.85).normalize()
  const anklePt = kneePt.clone().addScaledVector(dirTibia, spec.tibia)

  // 跗节：接近水平贴地
  const dirTarsus = dirTibia
    .clone()
    .lerp(new THREE.Vector3(-Math.sin(sweep), -0.35, Math.cos(sweep) * 0.3).normalize(), Math.sin(ankle) * 0.9)
    .normalize()
  const tipPt = anklePt.clone().addScaledVector(dirTarsus, tarsusLen)

  const seg = (a: THREE.Vector3, b: THREE.Vector3, r0: number, r1: number) => {
    const steps = 8
    const sections: Section[] = []
    for (let i = 0; i <= steps; i++) {
      const t = i / steps
      const r = THREE.MathUtils.lerp(r0, r1, t)
      sections.push({ at: new THREE.Vector3().lerpVectors(a, b, t), ry: r, rz: r })
    }
    return new THREE.Mesh(loft(sections, 12), material)
  }

  // 每一节在自己关节的局部坐标里，从原点指向下一个关节。
  // 三条向量都是**差值**，与绝对位置无关 —— loft() 的平行传输只看切向量，
  // 纯平移不改截面标架，所以局部放样与原来的绝对放样得到的是同一个形状。
  const femurVec = new THREE.Vector3().subVectors(kneePt, base)
  const tibiaVec = new THREE.Vector3().subVectors(anklePt, kneePt)
  const tarsusVec = new THREE.Vector3().subVectors(tipPt, anklePt)
  const ORIGIN = new THREE.Vector3()

  // coxa 与 femur 同处基节点、分成两层，是为了给动作层两个独立的自由度：
  // coxa 管前后摆（步态的主运动，三角步态就靠它），femur 管抬腿落腿。
  // 合成一层的话，两种运动会互相污染对方的旋转轴。
  const coxa = new THREE.Group()
  coxa.position.copy(base)
  const femurJ = new THREE.Group()
  const tibiaJ = new THREE.Group() // 膝
  tibiaJ.position.copy(femurVec)
  const tarsusJ = new THREE.Group() // 胫跗关节
  tarsusJ.position.copy(tibiaVec)
  coxa.add(femurJ)
  femurJ.add(tibiaJ)
  tibiaJ.add(tarsusJ)
  g.add(coxa)

  femurJ.add(seg(ORIGIN, femurVec, th * 1.45, th * 0.92)) // 腿节：基部粗（肌肉所在）
  tibiaJ.add(seg(ORIGIN, tibiaVec, th * 0.9, th * 0.6)) // 胫节
  tarsusJ.add(seg(ORIGIN, tarsusVec, th * 0.55, th * 0.28)) // 跗节

  // 关节球：各自落在所属关节的原点上（改前是 base / kneePt / anklePt 三个绝对点）
  for (const [joint, r] of [
    [femurJ, th * 1.5],
    [tibiaJ, th * 1.0],
    [tarsusJ, th * 0.62],
  ] as const) {
    joint.add(new THREE.Mesh(new THREE.SphereGeometry(r, 12, 10), material))
  }

  if (spec.spines) {
    // 胫节刺挂进 tibiaJ，坐标随之改成以膝为原点。方向向量与叉积都是差值运算，
    // 平移不变，所以刺的形状与朝向和改前一模一样。
    const dir = tibiaVec.clone()
    const len = dir.length()
    dir.normalize()
    const side = new THREE.Vector3().crossVectors(dir, new THREE.Vector3(0, 1, 0)).normalize()
    for (let i = 1; i <= 4; i++) {
      const t = i / 5
      const p = new THREE.Vector3().addScaledVector(dir, len * t)
      const tip = p.clone().addScaledVector(side, th * 1.8).addScaledVector(dir, th * 0.6)
      const s = new THREE.Mesh(
        loft(
          [
            { at: p, ry: th * 0.3, rz: th * 0.3 },
            { at: tip, ry: 0.004, rz: 0.004 },
          ],
          8,
        ),
        material,
      )
      tibiaJ.add(s)
    }
  }

  g.userData.tip = tipPt
  g.userData.knee = kneePt

  /**
   * 骨架标记挂在 coxa 上而不是外层 g：`collectRig()` 取的是节点的世界位置，
   * 挂在 g 上会得到模型原点，动作层就没法按前/中/后足分相位了。
   *
   * 其余三节各自打 leg-joint 标记，`collectRig()` 顺着 coxa 的子树认领 ——
   * **不用 id 配对**，因为 `mirrorZ()` 会整条腿 clone，id 会跟着复制，
   * 两条腿的关节就串到一起去了。层级天然是分开的。
   *
   * side 先按 leg() 自身的固有手性记为 +1（内部算出的腿节方向 z 分量恒为正，
   * 单独调用 leg() 拿到的永远是「右腿」形态）；`legPair()` / `mirrorZ()` 会翻成 −1。
   */
  coxa.userData[RIG_TAG] = { kind: 'leg', side: 1 } satisfies RigTag
  femurJ.userData[RIG_TAG] = { kind: 'leg-joint', role: 'femur' } satisfies RigTag
  tibiaJ.userData[RIG_TAG] = { kind: 'leg-joint', role: 'tibia' } satisfies RigTag
  tarsusJ.userData[RIG_TAG] = { kind: 'leg-joint', role: 'tarsus' } satisfies RigTag
  return g
}

/**
 * 生成左右对称的一对足。
 *
 * 左腿必须用**与右腿完全相同**的 spec，只在腿这一层翻一次 scale.z。
 * 曾经的写法是「先把 base.z 取负，再翻 scale.z」，那不是镜像：
 * leg() 内部算出的腿节方向 z 分量恒为正、不随 base.z 变号，
 * 于是左腿的基节被翻回右侧，整条腿从右侧根部斜穿过身体中线。
 */
export function legPair(spec: LegSpec, material: THREE.Material): THREE.Group {
  const g = new THREE.Group()
  const right = leg(spec, material)
  const left = leg(spec, material)
  left.scale.z = -1
  // 骨架侧别：leg() 一律按固有手性记 +1，翻过 scale.z 的这条才是左腿。
  // 动作层必须按它取符号 —— 左腿整组带负缩放，绕 Y/X 的旋转在观感上是反的。
  flipRigSide(left)
  g.add(right, left)
  return g
}

export type AntennaKind =
  | 'filiform' // 丝状：蟑螂、蟋蟀
  | 'clavate' // 棒状：蝴蝶
  | 'geniculate' // 膝状：蚂蚁、象甲
  | 'lamellate' // 鳃叶状：金龟子
  | 'pectinate' // 栉齿/羽状：雄蛾
  | 'setaceous' // 刚毛状：蜻蜓（极短）

export interface AntennaSpec {
  base: [number, number, number]
  length: number
  kind: AntennaKind
  /** 上扬角（度） */
  pitch?: number
  /** 外张角（度） */
  yaw?: number
  thickness?: number
  segments?: number
}

/** 触角：按类型生成不同末端形态，这是分目最直观的特征之一 */
export function antenna(spec: AntennaSpec, material: THREE.Material): THREE.Group {
  const g = new THREE.Group()
  /**
   * 命名 + 基点坐标是给展台的「触角微动」用的钩子（D 轮）：
   * 几何在组内是绝对坐标，展台要想绕基部摆动，得先按 userData.base 重新
   * 挂枢轴。这里只留信息，不改任何几何行为。
   */
  g.name = 'antenna'
  g.userData.base = [...spec.base]
  const th = spec.thickness ?? 0.028
  const pitch = THREE.MathUtils.degToRad(spec.pitch ?? 32)
  const yaw = THREE.MathUtils.degToRad(spec.yaw ?? 22)
  const base = new THREE.Vector3(...spec.base)
  const steps = spec.segments ?? 16

  const dir = new THREE.Vector3(Math.cos(pitch) * Math.cos(yaw), Math.sin(pitch), Math.cos(pitch) * Math.sin(yaw))

  const path: THREE.Vector3[] = []
  if (spec.kind === 'geniculate') {
    // 膝状：柄节直伸，然后折向前下
    const elbow = base.clone().addScaledVector(dir, spec.length * 0.45)
    const dir2 = new THREE.Vector3(Math.cos(yaw * 1.8), -0.18, Math.sin(yaw * 1.8)).normalize()
    for (let i = 0; i <= 6; i++) path.push(new THREE.Vector3().lerpVectors(base, elbow, i / 6))
    for (let i = 1; i <= 10; i++)
      path.push(elbow.clone().addScaledVector(dir2, (spec.length * 0.55 * i) / 10))
  } else {
    // 其余类型：一条向外上方弯曲的弧
    for (let i = 0; i <= steps; i++) {
      const t = i / steps
      const droop = spec.kind === 'filiform' ? t * t * spec.length * 0.35 : t * t * spec.length * 0.12
      path.push(
        base
          .clone()
          .addScaledVector(dir, spec.length * t)
          .add(new THREE.Vector3(0, -droop, Math.sin(t * Math.PI * 0.5) * spec.length * 0.12 * Math.sign(yaw || 1))),
      )
    }
  }

  const sections: Section[] = path.map((p, i) => {
    const t = i / (path.length - 1)
    let r = th * (1 - t * 0.55)
    if (spec.kind === 'clavate' && t > 0.78) r = th * (1 + (t - 0.78) * 7) // 末端膨大成棒
    if (spec.kind === 'setaceous') r = th * (1 - t * 0.85)
    return { at: p, ry: r, rz: r }
  })
  g.add(new THREE.Mesh(loft(sections, 10), material))

  if (spec.kind === 'lamellate') {
    // 鳃叶状：末端 3~4 片可展开的薄片
    const tip = path[path.length - 1]
    const prev = path[path.length - 3]
    const fwd = new THREE.Vector3().subVectors(tip, prev).normalize()
    const side = new THREE.Vector3().crossVectors(fwd, new THREE.Vector3(0, 1, 0)).normalize()
    for (let i = 0; i < 4; i++) {
      const plate = new THREE.Mesh(new THREE.SphereGeometry(spec.length * 0.13, 12, 8), material)
      plate.scale.set(1, 0.16, 0.62)
      plate.position.copy(tip).addScaledVector(fwd, i * spec.length * 0.055).addScaledVector(side, spec.length * 0.05)
      plate.rotation.z = Math.PI * 0.12
      g.add(plate)
    }
  }

  if (spec.kind === 'pectinate') {
    // 羽状：主干两侧密生栉齿
    for (let i = 3; i < path.length - 1; i++) {
      const p = path[i]
      const fwd = new THREE.Vector3().subVectors(path[i + 1], path[i - 1]).normalize()
      const side = new THREE.Vector3().crossVectors(fwd, new THREE.Vector3(0, 1, 0)).normalize()
      const t = i / path.length
      const branchLen = spec.length * 0.2 * Math.sin(t * Math.PI)
      for (const s of [1, -1]) {
        const tip = p
          .clone()
          .addScaledVector(side, branchLen * s)
          .addScaledVector(fwd, branchLen * 0.35)
        g.add(
          new THREE.Mesh(
            loft([{ at: p, ry: th * 0.3, rz: th * 0.3 }, { at: tip, ry: 0.002, rz: 0.002 }], 6),
            material,
          ),
        )
      }
    }
  }

  return g
}

export function antennaPair(spec: AntennaSpec, material: THREE.Material): THREE.Group {
  const g = new THREE.Group()
  const r = antenna(spec, material)
  const l = antenna({ ...spec, base: [spec.base[0], spec.base[1], -spec.base[2]], yaw: -(spec.yaw ?? 22) }, material)
  g.add(r, l)
  return g
}

// ---------------------------------------------------------------- 翅

export interface WingSpec {
  /** 翅基着生点 */
  base: [number, number, number]
  /** 翅长（沿翅脉主轴） */
  length: number
  /** 最宽处宽度 */
  width: number
  /**
   * 轮廓控制点，归一化坐标：x 沿翅长 0~1，y 为该处半宽 0~1。
   * 缺省给出一个通用的膜翅卵圆轮廓。
   */
  outline?: [number, number][]
  /**
   * 展开角（度）。语义与直觉不符，各物种文件都是按实测行为标定的：
   * **180 = 向本侧完全展开**（右翅伸向 +z、左翅伸向 −z，通常想要的就是这个），
   * **90 = 沿体轴指向前方**，
   * **0 = 横过身体伸向对侧**（右翅跑到左边去，左右翅交叉，基本不会想要）。
   * 想让翅与体轴成 φ 度时用 `spread = 90 + φ`。
   *
   * ⚠️ 0 与 180 的包围盒在 z 向跨度上完全一样大，只是朝向相反。
   * 所以「侧展对不对」不能靠跨度判断，必须看符号 —— 这份文档一度写作
   * 「0 = 完全侧展」，而当时的测试只比了跨度，两边都过，
   * 于是先后有两位物种作者按错的说明摆姿势、又各自实测一遍才发现。
   * `__tests__/mirror.test.ts` 现在连方向一起钉住了，别顺手「修正」实现 ——
   * 改了会让全部物种的翅膀一起转错方向。
   */
  spread: number
  /** 上扬角（度） */
  tilt?: number
  /** 前后掠角（度），负值前掠 */
  sweep?: number
  /** 厚度，默认 0.012 */
  thickness?: number
  /**
   * 前翅 / 后翅。只影响骨架层（`WingRig.role`）—— 扑翅时后翅要比前翅
   * 差一点相位，真实的四翅昆虫就是这么飞的。不填也能扑，只是四片同相。
   * kit 不猜：翅基的前后位置分不开前后翅（膜翅目两对翅基几乎重合）。
   */
  role?: 'fore' | 'hind'
}

/** 由轮廓生成一片翅的几何体（位于 XZ 平面，翅基在原点，向 +X 延伸） */
export function wingGeometry(spec: WingSpec): THREE.BufferGeometry {
  const outline: [number, number][] = spec.outline ?? [
    [0, 0.18],
    [0.12, 0.6],
    [0.3, 0.92],
    [0.55, 1.0],
    [0.78, 0.82],
    [0.92, 0.5],
    [1, 0.12],
  ]
  const shape = new THREE.Shape()
  const pts: THREE.Vector2[] = []
  for (const [x, y] of outline) pts.push(new THREE.Vector2(x * spec.length, y * spec.width * 0.5))
  for (let i = outline.length - 1; i >= 0; i--) {
    const [x, y] = outline[i]
    pts.push(new THREE.Vector2(x * spec.length, -y * spec.width * 0.5 * 0.72)) // 后缘略窄
  }
  shape.setFromPoints(pts)
  const g = new THREE.ExtrudeGeometry(shape, {
    depth: spec.thickness ?? 0.012,
    bevelEnabled: true,
    bevelSize: 0.006,
    bevelThickness: 0.004,
    bevelSegments: 2,
    curveSegments: 24,
  })
  g.rotateX(Math.PI / 2) // 摊平到 XZ 平面
  return g
}

/**
 * 翅脉：沿翅面生成的一组细管。翅脉是鉴定昆虫目最核心的特征，
 * 也是让 3D 翅膀「像真的」的关键细节。
 */
export function wingVeins(spec: WingSpec, material: THREE.Material, count = 7): THREE.Group {
  const g = new THREE.Group()
  const halfW = spec.width * 0.5
  for (let i = 0; i < count; i++) {
    const t = i / (count - 1)
    // 翅脉自翅基呈扇形放射，末端落在前后缘之间
    const endY = THREE.MathUtils.lerp(halfW * 0.86, -halfW * 0.6, t)
    const endX = spec.length * THREE.MathUtils.lerp(0.62, 0.97, Math.sin(t * Math.PI))
    const sections: Section[] = []
    const steps = 12
    for (let k = 0; k <= steps; k++) {
      const s = k / steps
      const x = spec.length * 0.03 + (endX - spec.length * 0.03) * s
      const y = THREE.MathUtils.lerp(0, endY, Math.pow(s, 0.75))
      const r = 0.009 * (1 - s * 0.72) * (i === 0 ? 1.7 : 1) // 前缘脉最粗
      sections.push({ at: new THREE.Vector3(x, 0, y), ry: r, rz: r })
    }
    g.add(new THREE.Mesh(loft(sections, 6), material))
  }
  // 横脉：把纵脉连成网，蜻蜓/蝉尤其明显
  for (let i = 0; i < count - 1; i++) {
    for (const s of [0.42, 0.68]) {
      const t0 = i / (count - 1)
      const t1 = (i + 1) / (count - 1)
      const y0 = THREE.MathUtils.lerp(halfW * 0.86, -halfW * 0.6, t0) * Math.pow(s, 0.75)
      const y1 = THREE.MathUtils.lerp(halfW * 0.86, -halfW * 0.6, t1) * Math.pow(s, 0.75)
      const x = spec.length * s * 0.85
      g.add(
        new THREE.Mesh(
          loft(
            [
              { at: new THREE.Vector3(x, 0, y0), ry: 0.005, rz: 0.005 },
              { at: new THREE.Vector3(x * 1.02, 0, y1), ry: 0.005, rz: 0.005 },
            ],
            5,
          ),
          material,
        ),
      )
    }
  }
  return g
}

/**
 * 一片完整的翅（翅面 + 翅脉），已按 spread/tilt/sweep 摆好姿态。
 * side = 1 右翅，-1 左翅。
 */
export function wing(
  spec: WingSpec,
  faceMat: THREE.Material,
  veinMat?: THREE.Material,
  side: 1 | -1 = 1,
  veinCount = 7,
): THREE.Group {
  const pivot = new THREE.Group()
  const blade = new THREE.Group()
  blade.add(new THREE.Mesh(wingGeometry(spec), faceMat))
  if (veinMat) blade.add(wingVeins(spec, veinMat, veinCount))
  pivot.add(blade)

  pivot.position.set(spec.base[0], spec.base[1], spec.base[2] * side)
  // 翅在体侧展开：绕 Y 转出展角，绕 X 抬起
  pivot.rotation.y = side * (Math.PI / 2 - THREE.MathUtils.degToRad(spec.spread)) + THREE.MathUtils.degToRad(spec.sweep ?? 0)
  pivot.rotation.x = side * THREE.MathUtils.degToRad(spec.tilt ?? 0)
  pivot.scale.z = side
  pivot.userData[RIG_TAG] = { kind: 'wing', side, role: spec.role } satisfies RigTag
  return pivot
}

/** 左右一对翅 */
export function wingPair(
  spec: WingSpec,
  faceMat: THREE.Material,
  veinMat?: THREE.Material,
  veinCount = 7,
): THREE.Group {
  const g = new THREE.Group()
  g.add(wing(spec, faceMat, veinMat, 1, veinCount), wing(spec, faceMat, veinMat, -1, veinCount))
  return g
}

// ---------------------------------------------------------------- 头部器官

/** 复眼：昆虫最有辨识度的器官，用密排小凸起模拟小眼面 */
export function compoundEye(opts: {
  at: [number, number, number]
  radius: number
  color?: THREE.ColorRepresentation
  /** 上下压扁，默认 0.82 */
  flatten?: number
  /** 向前突出方向的拉伸，默认 1 */
  stretch?: number
  /** 是否生成小眼面颗粒（较费面数，主视角昆虫建议开） */
  facets?: boolean
}): THREE.Group {
  const g = new THREE.Group()
  const color = opts.color ?? '#2b2320'
  const mat = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(color),
    roughness: 0.12,
    metalness: 0.1,
    clearcoat: 1,
    clearcoatRoughness: 0.05,
  })
  /**
   * 小眼面：六边形蜂窝法线贴图（eyes.ts，程序生成、全局缓存）。
   * 只挂法线，不换材质 —— 各物种传进来的眼色是逐只目视校准过的，
   * eyes.facetedEyeMaterial 自带的压色逻辑在这里反而会破坏既有观感。
   * node 测试环境无 Canvas 时返回 null，静默跳过，观感回到光滑球。
   */
  const facetMap = facetNormalMap()
  if (facetMap) {
    mat.normalMap = facetMap
    mat.normalScale.set(0.6, 0.6)
  }
  const dome = new THREE.Mesh(new THREE.SphereGeometry(opts.radius, 32, 24), mat)
  dome.scale.set(opts.stretch ?? 1, opts.flatten ?? 0.82, 1)
  dome.position.set(...opts.at)
  g.add(dome)

  if (opts.facets) {
    /**
     * 旧的「低模折面叠加层」：法线贴图版小眼面落地后基本可退休（贴图更细、
     * 面数为零），但个别大眼物种（蜻蜓/豆娘）的折面剪影感仍靠它。
     * 保留原行为，透明度略降 —— 两层小眼面叠满会闪。
     */
    const facetMat = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color(color).clone().offsetHSL(0, 0, 0.06),
      roughness: 0.22,
      metalness: 0.05,
      clearcoat: 0.9,
      flatShading: true,
      transparent: true,
      opacity: 0.4,
    })
    const facets = new THREE.Mesh(new THREE.IcosahedronGeometry(opts.radius * 1.015, 3), facetMat)
    facets.scale.copy(dome.scale)
    facets.position.copy(dome.position)
    g.add(facets)
  }
  return g
}

export function compoundEyePair(
  opts: Parameters<typeof compoundEye>[0],
): THREE.Group {
  const g = new THREE.Group()
  g.add(compoundEye(opts), compoundEye({ ...opts, at: [opts.at[0], opts.at[1], -opts.at[2]] }))
  return g
}

/** 单眼：头顶三枚小点，很多昆虫都有 */
export function ocelli(at: [number, number, number], r: number, spread: number, material: THREE.Material): THREE.Group {
  const g = new THREE.Group()
  for (const dz of [0, spread, -spread]) {
    const m = new THREE.Mesh(new THREE.SphereGeometry(r, 10, 8), material)
    m.position.set(at[0] + (dz === 0 ? r * 0.6 : 0), at[1], at[2] + dz)
    g.add(m)
  }
  return g
}

/** 大颚：咀嚼式口器的一对钳状构造 */
export function mandibles(opts: {
  at: [number, number, number]
  length: number
  spread?: number
  curve?: number
}, material: THREE.Material): THREE.Group {
  const g = new THREE.Group()
  const spread = opts.spread ?? 0.35
  const curve = opts.curve ?? 0.5
  for (const side of [1, -1]) {
    const base = new THREE.Vector3(opts.at[0], opts.at[1], opts.at[2] * side)
    const sections: Section[] = []
    const steps = 10
    for (let i = 0; i <= steps; i++) {
      const t = i / steps
      const p = base
        .clone()
        .add(
          new THREE.Vector3(
            opts.length * t,
            -opts.length * 0.12 * t,
            side * opts.length * spread * (1 - t) * (1 - t) - side * opts.length * curve * t * t * 0.5,
          ),
        )
      sections.push({ at: p, ry: opts.length * 0.14 * (1 - t * 0.85), rz: opts.length * 0.1 * (1 - t * 0.85) })
    }
    g.add(new THREE.Mesh(loft(sections, 10), material))
  }
  return g
}

/** 刺吸式口器（蝉、蝽）：一根向下后方伸的喙 */
export function rostrum(opts: {
  at: [number, number, number]
  length: number
  thickness?: number
  /** 向后贴腹的角度（度），蝉约 60 */
  angle?: number
}, material: THREE.Material): THREE.Mesh {
  const th = opts.thickness ?? 0.03
  const a = THREE.MathUtils.degToRad(opts.angle ?? 60)
  const base = new THREE.Vector3(...opts.at)
  const dir = new THREE.Vector3(-Math.sin(a), -Math.cos(a), 0)
  const sections: Section[] = []
  const steps = 8
  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    sections.push({
      at: base.clone().addScaledVector(dir, opts.length * t),
      ry: th * (1 - t * 0.8),
      rz: th * (1 - t * 0.8),
    })
  }
  return new THREE.Mesh(loft(sections, 10), material)
}

// ---------------------------------------------------------------- 装配辅助

/** 计算 group 的包围球半径，用于相机取景 */
export function boundingRadius(obj: THREE.Object3D): number {
  const box = new THREE.Box3().setFromObject(obj)
  if (box.isEmpty()) return 1
  const sphere = new THREE.Sphere()
  box.getBoundingSphere(sphere)
  return sphere.radius
}

/**
 * 收尾：把模型居中到原点、开启阴影，并算出包围半径。
 * 每个 builder 的最后一步都应调用它。
 * opts.frameRadius：取景半径覆写，语义见 InsectModel.frameRadius。
 */
export function finalize(
  group: THREE.Group,
  anchors: Record<string, THREE.Vector3>,
  opts: { frameRadius?: number } = {},
): InsectModel {
  const box = new THREE.Box3().setFromObject(group)
  const center = new THREE.Vector3()
  box.getCenter(center)
  group.position.sub(center)

  // 锚点跟着一起平移，保持与几何体的对应关系
  const shifted: Record<string, THREE.Vector3> = {}
  for (const [k, v] of Object.entries(anchors)) shifted[k] = v.clone().sub(center)

  // 骨架标记在这趟遍历里一并收走 —— 63 个模型的场景图不值得走第二遍。
  const tagged: { node: THREE.Object3D; tag: RigTag }[] = []

  group.traverse((o) => {
    const tag = o.userData[RIG_TAG] as RigTag | undefined
    if (tag) tagged.push({ node: o, tag })
    if ((o as THREE.Mesh).isMesh) {
      o.castShadow = true
      o.receiveShadow = true
      // 不透明材质一律双面 —— 2026-08-13。
      // loft() 的三角面绕向与它自己算出的外法线不一致：凸而闭合的壳看不出来
      // （法线是按椭圆截面单独算的，光照正常，轮廓也一样），但只要两片壳交叠、
      // 或壳有开口，背面剔除就会把该画的面丢掉，露出背景色——用户报的七星瓢虫
      // "壳裂开露白"、甘薯腊龟甲尾端的黑洞、榆蓝叶甲绿壳上的土黄楔形，都是这一个病。
      // 逐只调材质查了很多轮都没找到，因为它根本不是材质参数问题。
      // 只对不透明材质开：半透明件（翅膜、龟甲裙边）自己已按需设过 side，
      // 且双面会打乱它们的绘制顺序。60 个模型都是万级面数的静态几何，代价可忽略。
      const mats = (o as THREE.Mesh).material
      for (const m of Array.isArray(mats) ? mats : [mats]) {
        if (m && !m.transparent) m.side = THREE.DoubleSide
      }
    }
  })

  const model: InsectModel = { group, anchors: shifted, radius: boundingRadius(group) }
  if (opts.frameRadius !== undefined) model.frameRadius = opts.frameRadius

  const rig = collectRig(group, tagged)
  if (rig) model.rig = rig
  return model
}

/**
 * 把遍历到的骨架标记整理成 `InsectRig`。
 *
 * base 位置在**居中之后**才取：`finalize()` 已经把 group 平移过，这里
 * `updateMatrixWorld` 出来的世界坐标就是模型局部坐标，与 `anchors` 同一套空间。
 * 若在居中之前取，动作层按 base 分相位时会整体偏掉半个身长。
 *
 * 一个标记都没有就返回 undefined —— 静态物种的 model 上不该凭空多出一个空 rig，
 * 「有没有 rig」是普查测试的判据。
 */
function collectRig(group: THREE.Group, tagged: { node: THREE.Object3D; tag: RigTag }[]): InsectRig | undefined {
  if (tagged.length === 0) return undefined
  group.updateMatrixWorld(true)

  const wings: WingRig[] = []
  const legs: LegRig[] = []
  const parts: Record<string, THREE.Object3D> = {}

  for (const { node, tag } of tagged) {
    if (tag.kind === 'wing') {
      wings.push({
        pivot: node,
        rest: node.rotation.clone(),
        restScale: node.scale.clone(),
        side: tag.side,
        role: tag.role,
        base: node.getWorldPosition(new THREE.Vector3()),
      })
    } else if (tag.kind === 'leg') {
      const j = legJoints(node)
      // 认不全就整条丢弃：半条腿的句柄比没有更危险 —— 动作层会驱动一半、
      // 另一半僵着，读出来像模型坏了。宁可让普查测试报「这只虫没有腿骨架」。
      if (j) {
        legs.push({
          coxa: node,
          femur: j.femur,
          tibia: j.tibia,
          tarsus: j.tarsus,
          rest: {
            coxa: node.rotation.clone(),
            femur: j.femur.rotation.clone(),
            tibia: j.tibia.rotation.clone(),
            tarsus: j.tarsus.rotation.clone(),
          },
          side: tag.side,
          base: node.getWorldPosition(new THREE.Vector3()),
        })
      }
    } else if (tag.kind === 'part') {
      parts[tag.name] = node
    }
  }

  const rig: InsectRig = {}
  if (legs.length) rig.legs = legs
  if (wings.length) rig.wings = wings
  if (Object.keys(parts).length) rig.parts = parts
  return rig
}

/** 顺着 coxa 的子树认领腿节/胫节/跗节。前序遍历，三节各出现一次且顺序天然正确。 */
function legJoints(coxa: THREE.Object3D) {
  const found: Partial<Record<'femur' | 'tibia' | 'tarsus', THREE.Object3D>> = {}
  coxa.traverse((o) => {
    const t = o.userData[RIG_TAG] as RigTag | undefined
    if (t?.kind === 'leg-joint' && !found[t.role]) found[t.role] = o
  })
  const { femur, tibia, tarsus } = found
  return femur && tibia && tarsus ? { femur, tibia, tarsus } : null
}

/**
 * 把一棵子树里所有骨架标记的侧别翻过来。
 * 给 `legPair()` 与 `mirrorZ()` 用 —— 它们都是靠 `scale.z = -1` 做镜像的，
 * 翻过的那一份在观感上左右相反，动作层必须知道。
 */
function flipRigSide(root: THREE.Object3D): void {
  root.traverse((o) => {
    const tag = o.userData[RIG_TAG] as RigTag | undefined
    if (tag && (tag.kind === 'leg' || tag.kind === 'wing')) tag.side = tag.side === 1 ? -1 : 1
  })
}

/**
 * 沿 Z 轴镜像复制一个部件（用于成对结构的快捷装配）。
 *
 * ⚠️ `Object3D.copy()` 深拷 userData 走的是 `JSON.parse(JSON.stringify(...))`，
 * 所以任何塞进 userData 的东西都必须是 JSON 安全的纯数据 ——
 * 放对象引用会成环直接抛异常，放 Vector3 / Euler 则会静默退化成没有原型的
 * 普通对象（`p.x` 还在，但 `Euler` 的 `.x` 是 getter，克隆后读出来是 undefined）。
 * 骨架标记就是按这条约束设计的。
 */
export function mirrorZ(obj: THREE.Object3D): THREE.Group {
  const g = new THREE.Group()
  const clone = obj.clone()
  clone.scale.z *= -1
  // 镜像出来的那一份左右相反，骨架标记要跟着翻，否则动作层会把它当同侧驱动
  flipRigSide(clone)
  g.add(obj, clone)
  return g
}
