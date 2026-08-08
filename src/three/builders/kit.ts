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

/** 一个物种模型的产出。局部坐标系：+X 向前(头)，+Y 向上(背)，+Z 向右。 */
export interface InsectModel {
  group: THREE.Group
  /** 热点锚点：key 对应 data 层 hotspot.anchor，值为模型局部坐标 */
  anchors: Record<string, THREE.Vector3>
  /** 包围球半径，供相机自动取景 */
  radius: number
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
    m.iridescence = MEMBRANE_IRIDESCENCE
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

/**
 * 分节腹部：一串逐渐收细的体节，节间有环沟。
 * 这是昆虫（尤其蜂、蚁、蜻蜓）腹部辨识度最高的特征。
 */
export function segmentedAbdomen(opts: {
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
}): THREE.BufferGeometry {
  const a = new THREE.Vector3(...opts.from)
  const b = new THREE.Vector3(...opts.to)
  const segs = opts.segments ?? 7
  const groove = opts.groove ?? 0.16
  const flat = opts.flat ?? 1
  const bulge = opts.bulge ?? 0.3
  const perSeg = 5 // 每节采样数，够画出鼓起与收缩

  const sections: Section[] = []
  const total = segs * perSeg
  for (let i = 0; i <= total; i++) {
    const t = i / total
    // 沿全长的包络：从 r0 鼓到最大再收到 r1
    const env =
      t < bulge
        ? THREE.MathUtils.lerp(opts.r0, Math.max(opts.r0, opts.r1) * 1.06, smooth(t / bulge))
        : THREE.MathUtils.lerp(Math.max(opts.r0, opts.r1) * 1.06, opts.r1, smooth((t - bulge) / (1 - bulge)))
    // 节内起伏：每节前段鼓、节末收（环沟）
    const local = (i % perSeg) / perSeg
    const ripple = 1 - groove * Math.pow(Math.sin(local * Math.PI), 6) * 0 - groove * smoothstepDip(local)
    const r = Math.max(env * ripple, 1e-4)
    sections.push({
      at: new THREE.Vector3().lerpVectors(a, b, t),
      ry: r / flat,
      rz: r * flat,
    })
  }
  return loft(sections, 26)
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

  g.add(seg(base, kneePt, th * 1.45, th * 0.92)) // 腿节：基部粗（肌肉所在）
  g.add(seg(kneePt, anklePt, th * 0.9, th * 0.6)) // 胫节
  g.add(seg(anklePt, tipPt, th * 0.55, th * 0.28)) // 跗节

  for (const [p, r] of [
    [base, th * 1.5],
    [kneePt, th * 1.0],
    [anklePt, th * 0.62],
  ] as const) {
    const j = new THREE.Mesh(new THREE.SphereGeometry(r, 12, 10), material)
    j.position.copy(p)
    g.add(j)
  }

  if (spec.spines) {
    const dir = new THREE.Vector3().subVectors(anklePt, kneePt)
    const len = dir.length()
    dir.normalize()
    const side = new THREE.Vector3().crossVectors(dir, new THREE.Vector3(0, 1, 0)).normalize()
    for (let i = 1; i <= 4; i++) {
      const t = i / 5
      const p = kneePt.clone().addScaledVector(dir, len * t)
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
      g.add(s)
    }
  }

  g.userData.tip = tipPt
  g.userData.knee = kneePt
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
 */
export function finalize(group: THREE.Group, anchors: Record<string, THREE.Vector3>): InsectModel {
  const box = new THREE.Box3().setFromObject(group)
  const center = new THREE.Vector3()
  box.getCenter(center)
  group.position.sub(center)

  // 锚点跟着一起平移，保持与几何体的对应关系
  const shifted: Record<string, THREE.Vector3> = {}
  for (const [k, v] of Object.entries(anchors)) shifted[k] = v.clone().sub(center)

  group.traverse((o) => {
    if ((o as THREE.Mesh).isMesh) {
      o.castShadow = true
      o.receiveShadow = true
    }
  })

  return { group, anchors: shifted, radius: boundingRadius(group) }
}

/** 沿 Z 轴镜像复制一个部件（用于成对结构的快捷装配） */
export function mirrorZ(obj: THREE.Object3D): THREE.Group {
  const g = new THREE.Group()
  const clone = obj.clone()
  clone.scale.z *= -1
  g.add(obj, clone)
  return g
}
