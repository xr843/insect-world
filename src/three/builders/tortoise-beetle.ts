/**
 * 甘薯腊龟甲 Cassida circumdata（鞘翅目·叶甲科·龟甲亚科）
 *
 * 造型要点：
 * - 本种存在的理由就是那圈半透明"裙边"：前胸背板与鞘翅的外缘向
 *   四周大幅扩展成一圈扁平薄檐（explanate margin），把头、足、身体
 *   全部罩在下面——从正上方看像一顶扣着的小玻璃罩。这与常规甲虫
 *   "外壳=身体轮廓本身"完全不同：外壳（裙边）必须明显大于身体，
 *   身体则整个缩在里面。因此建模顺序反过来做——先各自独立建出
 *   「藏在下面的小身体」（头/胸腹/足，命名 trunk）与「远大于身体的
 *   薄檐」（命名 margin），两者只在 finalize() 之前用同一套局部坐标
 *   系装配在一起，从不共享网格，方便测试直接量两者的渲染包围盒
 *   对比宽度。
 * - 裙边用 kit.wingGeometry() 同款手法自建：ExtrudeGeometry 沿一圈
 *   闭合的卵圆轮廓拉伸出极薄的实体，再 rotateX(90°) 摊平到 XZ 平面
 *   ——这是"一整片薄檐"该有的形状，kit.loft()/spindle() 那类沿路径
 *   放样的圆顶做不出"外缘比中心宽得多、且中心还要另外隆起"的双层
 *   轮廓。裙边材质 opacity 压到 0.42 且启用 translucent（三维透光），
 *   读出来是真正半透明而不是普通哑光色。
 * - 中央拱起部分（前胸背板+鞘翅）复用 ladybird.ts 的"平底圆顶"手法
 *   （domeSections/humpProfile：路径中心 y 随半径同步抬升，底边始终
 *   贴在同一条水平线上）——但把 maxR 相对路径长度压得更低，做出比
 *   瓢虫扁得多的、更接近"微微拱起"而非"高高隆起"的丘状轮廓，且其
 *   足印（XZ 范围）必须明显小于裙边，好让裙边从四周探出来。材质走
 *   elytra() 的金属+清漆路线（clearcoat 由 elytra() 内定 0.55，不
 *   手动加高），另加轻微 iridescence 做出"金绿到琥珀色"随角度漂移
 *   的金属光泽（同 jewel-beetle.ts 的加法）。
 * - 头部完全缩在前胸背板圆顶前缘下方（背板足印覆盖头部足印），六足
 *   短小、splay 角压得很低，紧贴身体收在裙边下方，不越出裙边范围。
 *   身体本体（头+胸腹，命名 trunk）因此始终是画面里最小的一圈，这
 *   正是"裙边远大于身体"的对照组。
 */
import * as THREE from 'three'
import { chitin, compoundEyePair, elytra, finalize, legPair, loft, spindle, type InsectModel, type LegSpec, type Section } from './kit'

// ---------------------------------------------------------------- 局部工具（同 ladybird.ts 的"平底圆顶"手法）

/** 半径包络：从 startR 经 sin 缓动升到 maxR（bulge 处），再经 cos 缓动降到 endR */
function humpProfile(bulge: number, startR: number, maxR: number, endR: number): (t: number) => number {
  return (t: number) => {
    if (t <= bulge) {
      const k = bulge <= 1e-6 ? 1 : Math.min(1, t / bulge)
      return THREE.MathUtils.lerp(startR, maxR, Math.sin(k * Math.PI * 0.5))
    }
    const k = Math.min(1, (t - bulge) / (1 - bulge))
    return THREE.MathUtils.lerp(maxR, endR, 1 - Math.cos(k * Math.PI * 0.5))
  }
}

/** "平底圆顶"截面组：底边始终贴在 groundY，只有顶部随半径起伏 */
function domeSections(xFrom: number, xTo: number, groundY: number, profile: (t: number) => number, aspect: number, steps: number): Section[] {
  const sections: Section[] = []
  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    const r = Math.max(profile(t), 1e-4)
    sections.push({ at: new THREE.Vector3(THREE.MathUtils.lerp(xFrom, xTo, t), groundY + r, 0), ry: r, rz: r * aspect })
  }
  return sections
}

/** 圆顶最高点（theta=0，正背中线）的位置，用于取 anchor */
function domeTop(xFrom: number, xTo: number, groundY: number, profile: (t: number) => number, t: number): THREE.Vector3 {
  const r = profile(t)
  return new THREE.Vector3(THREE.MathUtils.lerp(xFrom, xTo, t), groundY + r * 2, 0)
}

/**
 * 半透明裙边：闭合卵圆轮廓 + 极薄挤出，同 kit.wingGeometry() 的
 * "摊平到 XZ 平面"手法。前端（头侧）略窄，后端（腹侧）略宽更圆，
 * 保留一点前后方向感而不是纯正圆。
 */
function marginGeometry(halfLength: number, halfWidth: number, thickness: number): THREE.BufferGeometry {
  const steps = 40
  const pts: THREE.Vector2[] = []
  for (let i = 0; i < steps; i++) {
    const a = (i / steps) * Math.PI * 2
    const rx = halfLength * (Math.cos(a) >= 0 ? 0.9 : 1.0)
    const rz = halfWidth * (0.86 + 0.14 * Math.abs(Math.sin(a)))
    pts.push(new THREE.Vector2(Math.cos(a) * rx, Math.sin(a) * rz))
  }
  const shape = new THREE.Shape()
  shape.setFromPoints(pts)
  const g = new THREE.ExtrudeGeometry(shape, {
    depth: thickness,
    bevelEnabled: true,
    bevelSize: thickness * 0.5,
    bevelThickness: thickness * 0.4,
    bevelSegments: 2,
    curveSegments: 22,
  })
  g.rotateX(Math.PI / 2) // 摊平到 XZ 平面（同 kit.wingGeometry 注释）
  return g
}

// ---------------------------------------------------------------- 主体

export function buildTortoiseBeetle(): InsectModel {
  const g = new THREE.Group()

  // 中央拱起：金属光泽，金绿到琥珀色。elytra() 内定 clearcoat=0.55，不手动加高。
  const pronotumMat = elytra('#a8842f', 0.6) // 偏琥珀的暖金
  const elytraMat = elytra('#7d8f2e', 0.55) // 偏绿的金属光泽
  elytraMat.iridescence = 0.4
  elytraMat.iridescenceIOR = 1.8
  elytraMat.iridescenceThicknessRange = [250, 500]

  // 半透明裙边：opacity 压到 0.42（<0.75）+ translucent，读出来是真正的半透明薄檐
  const marginMat = chitin({ color: '#dce6ab', gloss: 0.55, opacity: 0.42, translucent: true, side: THREE.DoubleSide })

  const bodyMat = chitin({ color: '#3a3222', gloss: 0.4, metal: 0.1 })
  const legMat = chitin({ color: '#2c2618', gloss: 0.35 })

  const groundY = -0.02 // 身体（头/胸腹）的底边基准线
  const domeBaseY = 0.035 // 中央拱起的底边基准线（比身体略高，架在身体上方）

  // ---- 身体本体（藏在裙边下面）：头 + 胸腹，统一命名 trunk，供测试量取
  // "裙边远大于身体"的对照宽度。足不计入 trunk（见文件头注释）。
  const torso = new THREE.Mesh(
    spindle([0.1, groundY, 0], [-0.19, groundY - 0.01, 0], 0.085, { bulge: 0.35, flat: 1.1, taperStart: 0.25, taperEnd: 0.12 }),
    bodyMat,
  )
  torso.name = 'trunk'
  g.add(torso)

  const headMesh = new THREE.Mesh(
    spindle([0.09, groundY + 0.02, 0], [0.19, groundY + 0.025, 0], 0.05, { bulge: 0.4, flat: 1.0, taperStart: 0.6, taperEnd: 0.2 }),
    bodyMat,
  )
  headMesh.name = 'trunk'
  g.add(headMesh)

  // ---- 六足：短小，splay 压得很低，紧贴身体收在裙边下方
  const legSpecs: LegSpec[] = [
    { base: [0.1, groundY - 0.01, 0.06], femur: 0.05, tibia: 0.045, tarsus: 0.02, thickness: 0.008, splay: 18, sweep: -20, knee: 55, ankle: 50 },
    { base: [-0.02, groundY - 0.01, 0.07], femur: 0.055, tibia: 0.048, tarsus: 0.02, thickness: 0.008, splay: 16, sweep: 4, knee: 56, ankle: 50 },
    { base: [-0.15, groundY - 0.01, 0.06], femur: 0.05, tibia: 0.045, tarsus: 0.02, thickness: 0.008, splay: 20, sweep: 30, knee: 58, ankle: 52 },
  ]
  const legRigs = legSpecs.map((spec) => legPair(spec, legMat))
  for (const rig of legRigs) g.add(rig)
  const midLegTip = (legRigs[1].children[0] as THREE.Group).userData.tip as THREE.Vector3

  // ---- 复眼：极小，藏在头部两侧（头又藏在前胸背板下方，正上方看不见）
  g.add(compoundEyePair({ at: [0.155, groundY + 0.035, 0.035], radius: 0.014, color: '#0b0908', flatten: 0.85, facets: false }))

  // ---- 前胸背板：中央拱起，前缘盖住头部（足印覆盖头部足印，正背面看不见头）
  const pronotumProfile = humpProfile(0.55, 0.018, 0.1, 0.03)
  const pronotumDome = new THREE.Mesh(loft(domeSections(0.22, -0.01, domeBaseY, pronotumProfile, 1.3, 18), 26), pronotumMat)
  pronotumDome.name = 'pronotum'
  g.add(pronotumDome)

  // ---- 鞘翅：中央拱起，覆盖胸腹大部
  const elytraProfile = humpProfile(0.4, 0.045, 0.135, 0.02)
  const elytraDome = new THREE.Mesh(loft(domeSections(0.02, -0.27, domeBaseY, elytraProfile, 1.25, 22), 28), elytraMat)
  elytraDome.name = 'elytra'
  g.add(elytraDome)

  // ---- 半透明裙边：一整片扁平薄檐，足印明显大于两枚拱起圆顶（更远大于 trunk）
  const marginMesh = new THREE.Mesh(marginGeometry(0.31, 0.27, 0.014), marginMat)
  marginMesh.position.set(0.0, 0.03, 0)
  marginMesh.name = 'margin'
  g.add(marginMesh)

  const pronotumTop = domeTop(0.22, -0.01, domeBaseY, pronotumProfile, 0.45)
  const elytraTop = domeTop(0.02, -0.27, domeBaseY, elytraProfile, 0.4)

  const anchors: Record<string, THREE.Vector3> = {
    margin: new THREE.Vector3(0.0, 0.03, 0.27), // 裙边外缘上
    elytra: elytraTop,
    head: new THREE.Vector3(0.13, groundY + 0.03, 0),
    eye: new THREE.Vector3(0.155, groundY + 0.04, 0.035),
    leg: midLegTip.clone(),
    pronotum: pronotumTop,
  }

  return finalize(g, anchors)
}
