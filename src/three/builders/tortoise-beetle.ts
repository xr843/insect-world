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
 *   贴在同一条水平线上），但**两段共用同一条全局包络曲线**（见
 *   carapaceProfile）——前胸背板与鞘翅只是这条曲线在不同 x 区间的
 *   两段截取，且在接缝处 x 上留一小段重叠，因此半径在接缝处必然
 *   连续、不会出现"两个各自独立收尖的鼓包、中间凹一道"的台阶感。
 *   最初的版本让两段各自独立 humpProfile()、且两段 x 范围之间还留了
 *   空隙，实机渲染出来是断开的两颗蛋，这是本文件唯一动过返工的地方。
 *   整条曲线的 maxR 相对全长压得很低（高度/全长 < 0.3），从侧面看
 *   是一条平滑低矮的拱线，而不是瓢虫那种高高隆起的半球。材质上两段
 *   共用同一枚材质对象（同色同光泽，不再是"一深绿一褐"两种色相），
 *   走 elytra() 的金属+清漆路线（clearcoat 由 elytra() 内定 0.55，
 *   不手动加高），叠轻微 iridescence 做出"金绿到琥珀色"随角度漂移
 *   的金属光泽（同 jewel-beetle.ts 的加法）。
 * - 头部完全缩在前胸背板圆顶前缘下方（背板足印覆盖头部足印），六足
 *   短小、splay 角压得很低，紧贴身体收在裙边下方，不越出裙边范围。
 *   身体本体（头+胸腹，命名 trunk）因此始终是画面里最小的一圈，这
 *   正是"裙边远大于身体"的对照组。
 */
import * as THREE from 'three'
import { chitin, compoundEyePair, elytra, finalize, legPair, loft, spindle, type InsectModel, type LegSpec, type Section } from './kit'

// ---------------------------------------------------------------- 局部工具（同 ladybird.ts 的"平底圆顶"手法）

/**
 * 半径包络：从 startR 经 sin 缓动升到 maxR（bulge 处），再经 cos 缓动降到 endR。
 *
 * 前 roundFrac、后 roundFrac（各占背甲全长的一段，默认 20%）两段改用
 * 圆弧收口（sqrt(1-u²)）：半径越接近端点收得越陡，最终以一个不为零的
 * 小半径（startR/endR）收口，而不是匀速甚至加速滑向端点——一条恒定
 * （或持续加速）斜率的锥面会在端点留下一个真正的顶点，看着像水滴/
 * 子弹尖；圆弧收口贴近端点时切线趋于与轴线垂直，像半球盖一样"兜"住
 * 端点，读出来才是钝的。两段圆弧区与中央 bulge 峰值之间用首尾斜率均
 * 为 0 的 S 形缓动（0.5-0.5cos）衔接——峰值本身斜率为 0，圆弧区在肩部
 * 的斜率也钉成 0，因此整条曲线在两个衔接点上都斜率连续，不会留下一圈
 * 突兀的棱；改动因此只集中在真正出问题的头尾两端，中段轮廓基本不变
 * （肩部半径直接取自旧缓动公式在该处的值）。
 */
function humpProfile(bulge: number, startR: number, maxR: number, endR: number, roundFrac = 0.2): (t: number) => number {
  const noseCut = roundFrac
  const tailCut = 1 - roundFrac

  // S 形缓动：k 从 0→1，输出从 a 缓动到 b，且在 k=0 与 k=1 处斜率均为 0
  const sCurve = (k: number, a: number, b: number) =>
    THREE.MathUtils.lerp(a, b, 0.5 - 0.5 * Math.cos(Math.PI * THREE.MathUtils.clamp(k, 0, 1)))

  // 圆弧收口：tau=0 在肩部（shoulder，斜率 0，接 S 形缓动），tau=1 在端点
  // （tip），越接近 tau=1 收得越陡，是"圆钝"而非"锥形尖"的关键
  const arcClose = (tau: number, shoulder: number, tip: number) => {
    const c = THREE.MathUtils.clamp(tau, 0, 1)
    return tip + (shoulder - tip) * Math.sqrt(Math.max(0, 1 - c * c))
  }

  // 两处"肩部"半径：圆弧区与 S 形缓动区的交界值，直接取旧（未加圆弧
  // 收口时）缓动曲线在交界处的值，让中段尽量维持原有轮廓
  const noseShoulder = THREE.MathUtils.lerp(startR, maxR, Math.sin((noseCut / bulge) * Math.PI * 0.5))
  const tailShoulder = THREE.MathUtils.lerp(maxR, endR, 1 - Math.cos(((tailCut - bulge) / (1 - bulge)) * Math.PI * 0.5))

  return (t: number) => {
    if (t <= noseCut) return arcClose(1 - t / noseCut, noseShoulder, startR)
    if (t <= bulge) return sCurve((t - noseCut) / (bulge - noseCut), noseShoulder, maxR)
    if (t <= tailCut) return sCurve((t - bulge) / (tailCut - bulge), maxR, tailShoulder)
    return arcClose((t - tailCut) / (1 - tailCut), tailShoulder, endR)
  }
}

/** "平底圆顶"截面组：底边始终贴在 groundY，只有顶部随半径起伏 */
/**
 * @param width 半宽包络。**必须与高度包络分开给**——2026-08-12 的教训：
 * 原先只有一个 aspect 系数，宽度等于「高度曲线 × 常数」。而高度曲线两端收得
 * 很尖（0.012→0.06→0.016，因为侧面看龟甲是一条低矮拱线），横向一拉就成了
 * 前后尖、中间鼓的**梭形**，不是龟甲俯视该有的近圆轮廓。
 * 先前把 aspect 从 1.3 提到 3.1，只是把一条又窄又尖的脊背换成了一条又宽又尖的，
 * 用户一眼还是说不像。宽度自己有包络，才能做出「近圆盘 + 低拱」这个真实组合。
 */
function domeSections(
  xFrom: number,
  xTo: number,
  groundY: number,
  profile: (t: number) => number,
  width: (t: number) => number,
  steps: number,
): Section[] {
  const sections: Section[] = []
  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    const r = Math.max(profile(t), 1e-4)
    sections.push({
      at: new THREE.Vector3(THREE.MathUtils.lerp(xFrom, xTo, t), groundY + r, 0),
      ry: r,
      rz: Math.max(width(t), 1e-4),
    })
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

  // 中央拱起：前胸背板与鞘翅**共用同一枚材质对象**（同色同光泽），
  // 避免"一深绿一褐"两种色相并排读成两个不同物体；同一材质上叠轻微
  // iridescence 做出金绿到琥珀色随角度漂移的金属光泽。
  // elytra() 内定 clearcoat=0.55，不手动加高。
  const carapaceMat = elytra('#8c8438', 0.58)
  carapaceMat.iridescence = 0.4
  carapaceMat.iridescenceIOR = 1.8
  carapaceMat.iridescenceThicknessRange = [250, 500]

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

  // ---- 背甲（前胸背板+鞘翅）：两段共用同一条全局包络 carapaceProfile，
  // 见文件头注释。carapaceProfile 的输入 t 是"背甲全长"上的全局进度：
  // 0 = 背甲最前端（前胸背板前缘），1 = 背甲最后端（鞘翅末端）。峰值
  // 略偏后段（鞘翅区），且整体压得很扁——高度只有全长的一小部分，
  // 符合"从侧面看是一条平滑低矮拱线"的真实龟甲轮廓。
  const carapaceXFront = 0.23
  const carapaceXBack = -0.27
  const carapaceLen = carapaceXFront - carapaceXBack
  const carapaceProfile = humpProfile(0.6, 0.012, 0.06, 0.016)
  const globalT = (x: number) => THREE.MathUtils.clamp((carapaceXFront - x) / carapaceLen, 0, 1)

  // 前胸背板与鞘翅在 x 上各自只覆盖背甲的一段，且在 seamX 两侧留一小段
  // 重叠（overlap）——两段用的是同一个 carapaceProfile，重叠区内两片
  // 曲面完全重合，因此接缝处半径连续、贴紧甚至微微咬合，不会露出缝隙。
  /*
   * 拱顶的**半宽包络** —— 与高度包络彻底分开（见 domeSections 注释）。
   *
   * 龟甲俯视近圆形：从前缘很快展宽，中后段维持最宽，再向尾端圆钝收拢。
   * 这条曲线用 sin 起手保证前缘不是尖角，用 1-t² 收尾保证尾端圆钝而非收尖。
   * 峰值 0.19，裙边半宽 0.27，两侧因此各留约 0.08 的半透明边 —— 中央有色
   * 拱顶占去大部分盘面，透明的只是一圈边，这才是 Cassida 的真实比例。
   */
  const DOME_HALF_WIDTH = 0.19
  const carapaceWidth = (gt: number) => {
    const rise = Math.sin(Math.min(1, gt / 0.22) * Math.PI * 0.5) // 前缘迅速展宽，不留尖角
    const tail = 1 - 0.42 * Math.pow(Math.max(0, (gt - 0.68) / 0.32), 2) // 尾端圆钝收拢
    return DOME_HALF_WIDTH * rise * tail
  }

  const seamX = 0.0
  const overlap = 0.015
  const pronotumXFrom = carapaceXFront
  const pronotumXTo = seamX - overlap
  const elytraXFrom = seamX + overlap
  const elytraXTo = carapaceXBack
  const pronotumProfile = (t: number) => carapaceProfile(globalT(THREE.MathUtils.lerp(pronotumXFrom, pronotumXTo, t)))
  const pronotumWidth = (t: number) => carapaceWidth(globalT(THREE.MathUtils.lerp(pronotumXFrom, pronotumXTo, t)))
  const elytraProfile = (t: number) => carapaceProfile(globalT(THREE.MathUtils.lerp(elytraXFrom, elytraXTo, t)))
  const elytraWidth = (t: number) => carapaceWidth(globalT(THREE.MathUtils.lerp(elytraXFrom, elytraXTo, t)))

  // ---- 前胸背板：前缘盖住头部（足印覆盖头部足印，正背面看不见头）。
  // steps 比初版加密（16→24），三角面预算远没花完，加密换取更平滑的
  // 拱线，也让接缝附近的离散采样点更贴近连续曲线的真实值。
  const pronotumDome = new THREE.Mesh(loft(domeSections(pronotumXFrom, pronotumXTo, domeBaseY, pronotumProfile, pronotumWidth, 24), 26), carapaceMat)
  pronotumDome.name = 'pronotum'
  g.add(pronotumDome)

  // ---- 鞘翅：覆盖胸腹大部（steps 同样加密，22→30）
  const elytraDome = new THREE.Mesh(loft(domeSections(elytraXFrom, elytraXTo, domeBaseY, elytraProfile, elytraWidth, 30), 28), carapaceMat)
  elytraDome.name = 'elytra'
  g.add(elytraDome)

  // ---- 半透明裙边：一整片扁平薄檐，足印明显大于两枚拱起圆顶（更远大于 trunk）
  const marginMesh = new THREE.Mesh(marginGeometry(0.31, 0.27, 0.014), marginMat)
  // y 从 0.03 降到 0.0235 —— 2026-08-12 修。
  // 裙边厚 0.014，原位置顶面在 0.037，而拱顶底边 domeBaseY=0.035：这片半透明
  // 平板从拱顶下缘**切了进去**，交叠处透出一块浅色楔形缺口，像壳上破了个洞。
  // 拱顶加宽后交叠面积变大，这块缺口也更显眼。降到顶面 0.0305 < 0.035，
  // 裙边从拱顶下缘「探出」而不是「切入」。
  marginMesh.position.set(0.0, 0.0235, 0)
  marginMesh.name = 'margin'
  g.add(marginMesh)

  const pronotumTop = domeTop(pronotumXFrom, pronotumXTo, domeBaseY, pronotumProfile, 0.85)
  const elytraTop = domeTop(elytraXFrom, elytraXTo, domeBaseY, elytraProfile, 0.35)

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
