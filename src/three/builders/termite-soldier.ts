/**
 * 台湾乳白蚁兵蚁 Odontotermes formosanus（蜚蠊目 Blattodea，等翅类）—— 头部/大颚返工版
 *
 * 造型要点：
 * - 与身体不成比例的巨大头部是招牌：头部长度、宽度都接近甚至超过
 *   胸腹之和，深褐、高度骨化、呈长方形。**上一版直接用 THREE.BoxGeometry
 *   搭方块**——渲染实拍证明这个选择是错的：BoxGeometry 每个面各有一套
 *   独立顶点、逐面平面着色（flat shading），棱角零倒角，在一群放样出来
 *   的光滑虫子中间像个没做完的占位符（"纸箱拖着一小截身子"）。这版改用
 *   squircleLoft()——沿局部 +X 直线路径放样「超椭圆」（squircle：
 *   |cosθ|^(2/n)·sign 替换 cosθ，n 越大越接近直角矩形）横截面的自建放样
 *   函数：kit.loft() 的横截面写死是纯椭圆（cy=cos(a)*ry 等），出不来
 *   "四面基本是平的、只有棱角收圆"的箱形轮廓，故本文件自建（不改
 *   kit.ts）。头部路径是直线，不需要 kit.loft() 那套给弯曲路径用的平行
 *   传输定架，实现比通用放样简单。两端各留 12% 长度用 smoothstep 缓到
 *   62% 尺寸（不收尖到 0），消掉与胸部/大颚衔接处的直角硬缝，同时包围
 *   盒仍由中段满尺寸处决定——「长宽都接近甚至超过胸腹之和」这条不受
 *   影响。法线不手推解析公式，直接 computeVertexNormals()。
 * - 兵蚁与蚂蚁最大的区别：**没有腰**。ant.ts 的招牌是"petiole 细腰"，
 *   但白蚁是蜚蠊目而非膜翅目，胸腹之间没有那截细柄，胸、腹是宽阔
 *   相连的——本文件因此刻意不做 petiole，thorax 半径与 abdomen 前端
 *   半径相近、平滑过渡。
 * - 大颚：**上一版直接用 kit.mandibles()**——那个通用公式的横截面半径
 *   相对路径的侧向摆幅太小，在深色材质上读成一条弯曲细带（"剪纸"），
 *   不是有体积的镰刀。这版改自建 soldierMandible()：路径是一条二次
 *   贝塞尔（基部 → 中后段控制点 → 末端内钩、越过中线的控制点），半径只
 *   收到基部的约 1/3（不收尖成针，"有厚度"的关键就在这里）。内缘不加
 *   碎齿——兵蚁的颚用于夹断而非咀嚼。仍是用 kit.loft() 这个通用工具
 *   （不是 kit.mandibles() 专用函数），未改 kit.ts。
 *   ⚠️ 大颚这里返工时连踩了三个只有肉眼验收才看得出的坑，vitest 全程
 *   都是绿的（数值断言测不出这类纯感知问题）：
 *   1）第一次调参把"外鼓"幅度、材质 gloss/clearcoat 都取得很大，
 *      preview.tsx 一看，两颚在默认机位下糊成了一整片扁平的深色"瓢铲"
 *      ——强曲面 + 高光泽材质在单一主光源下会把大半段高光连成一整片
 *      亮斑，紧挨的暗部又被 ACES 压得发黑，亮斑与暗部的分界线反而读成
 *      了"瓢铲的边缘"。先把横截面纵横比从 1.52 压到 1.18（更圆润）、
 *      mandibleMat 的 gloss/clearcoat 从 0.7/0.56 降到 0.55/0.38，问题
 *      缓解但没根除。
 *   2）把 ant.ts（目视验收通过的范例）调到同一机位对照渲染，才看出真正
 *      的病根：ant.ts 的两颚之间全程留着一块清晰的负空间（背景色透过
 *      空隙露出来），只在最末梢才收拢、几乎不深入交叠；而本文件当时的
 *      贝塞尔路径控制点 p1 放在长度方向仅 55% 处、z 只比基部略外张，
 *      约 60% 长度处就开始持续内收，两颚间的空隙在到达末梢前早早收窄
 *      到接近 0——中前段就已经紧贴，肉眼完全分不出"两支"。修法是让
 *      "外张"在曲线的大半程占上风：把 mandiblePath() 的控制点 p1 大幅
 *      推后（bendAt）、加大外张幅度（outBulge），crossing 幅度（cross）
 *      相应收小——只求"够越过中线"，不必深入交叠，把两颚贴在一起的那
 *      一小截路径压到最短（详见 mandiblePath() 注释）。
 *   3）光调 1）2）之后仍有余留：两颚基部彼此靠得还是太近。再对照
 *      ant.ts 才发现，那把参照大颚贴着头部的起点就已经外张到接近头宽
 *      （kit.mandibles() 的 spread 项在 t=0 就生效，不是从窄基部慢慢
 *      张开的）。本文件不用 kit.mandibles()，改成直接把大颚基部本身
 *      的 z 坐标推到接近头部半宽。
 *   4）**协调者用真实默认机位实拍复核，指出 1)-3) 全部不够**：三处都改了
 *      之后，两颚在默认机位下依然完全糊成一支圆锥状的喙，看不出"两支"，
 *      比预想的更严重。根本原因是默认机位（InsectCanvas.tsx 的
 *      home=(0.86,0.44,1.25)）Z 分量最大，会把"两颚主要在世界 Z 轴上
 *      分离"这件事投影后大幅压扁——**"世界坐标里分得够开"不等于"看着
 *      分得开"，必须按这个机位的实际投影判断**，这是比前三条更本质的
 *      认识错误。补救优先级也被重新定过：**"看得出是两支"压倒"够粗
 *      壮"**——基部 z 只能推到头部该处半宽以内（不能再靠基部间距硬拉开），
 *      于是让 mandiblePath() 的外张控制点（发生在头部前方、不受头宽
 *      约束）承担更多分离量、横截面大幅收细（基部半径直接砍掉近一半）。
 *      同时补了一条真正按该机位投影判断的断言（见测试文件"投影空隙"一
 *      节）——把两颚顶点投影到 home 方向的成像平面，按颚长切片，断言
 *      中段有连续一段两侧投影包围盒不相交，而不再是只测世界坐标里的
 *      端点位置/横向偏移这类"数字对但不保证看着对"的指标。
 *   教训：这类返工必须真正跑 preview.tsx 用眼睛看，而且最好按应用实际
 *   使用的默认机位（不是随手转到的任意角度）去核对，找已验收的同类范例
 *   摆到同一机位对照渲染更可靠；光靠世界坐标系里的包围盒/顶点数/端点
 *   坐标这类数值断言，测不出"某个特定机位投影后糊成一坨"这种问题——
 *   断言也要按那个机位的投影去写，不能停留在世界坐标。
 * - 无翅、无复眼：兵蚁是盲的，**全文件不调用 kit.compoundEye/
 *   compoundEyePair，也不出现任何名字带 eye 的 mesh**——头两侧只用
 *   两颗极小、颜色贴近头部的凹陷小球暗示"眼点退化处的浅坑"，材质刻意
 *   不给光泽。⚠️ 第一版这颗小球从侧面看仍被协调者实拍认成了复眼——
 *   "不给高光"防不住被认成眼睛，"头壳侧面有一颗独立圆凸起"本身就是
 *   复眼的识别特征；这版把半径再砍半、嵌入深度加大，不再读成独立凸起。
 * - 念珠状短触角：kit.AntennaKind 没有"moniliform"这个选项，因此本文件
 *   自建 beadedAntenna()——沿一条直线串一列渐缩小球，再垫一根细杆连接
 *   避免珠子间露缝——不强行套用 kit.antenna() 的任何一种类型。
 * - 颜色：头部原先压到 #3a2416，ACES 色调映射下几乎读成近黑色，看不出
 *   "褐色"；这版提到 #7a4a26——真正能看出是褐色的档位，与苍白胸腹
 *   （#ecdfc2）形成本种最直观的看点。大颚仍比头部更深（更高度骨化的
 *   天然观感），但同样从 #2c1a10 提到 #4a2c18，避免在近黑材质上把刚
 *   建好的体积感（棱面高光）重新吃掉。
 *
 * 体长约 0.6cm（头前缘到腹末，不计大颚）。
 * anchors：head, mandible, abdomen, antenna, thorax, leg
 */
import * as THREE from 'three'
import {
  chitin,
  finalize,
  leg,
  loft,
  mirrorZ,
  segmentedAbdomen,
  spindle,
  type InsectModel,
  type Section,
} from './kit'

// ---------------------------------------------------------------- 局部辅助

function smooth(t: number): number {
  const x = Math.min(1, Math.max(0, t))
  return x * x * (3 - 2 * x)
}

interface RadialSection {
  at: THREE.Vector3
  ry: number
  rz: number
}

/**
 * 超椭圆（squircle）放样：沿局部 +X 直线路径放样出「圆角长方体」。
 * 原理与用途见文件头注释。只支持直线路径（每个截面的 u/v 直接取世界
 * +Y/+Z，不做 kit.loft() 那套给弯曲路径用的切线定架）——头部的路径
 * 本就是直线，不需要更通用的实现。radialSegments 建议取 4 的倍数，
 * 保证「四个侧面」在角度采样上左右对称。
 */
function squircleLoft(sections: RadialSection[], squareness = 6, radialSegments = 32): THREE.BufferGeometry {
  const exp = 2 / squareness
  const superCoord = (c: number, r: number) => (c >= 0 ? 1 : -1) * r * Math.pow(Math.abs(c), exp)
  const n = sections.length
  const ring = radialSegments + 1
  const positions: number[] = []
  const uvs: number[] = []
  const indices: number[] = []

  for (let i = 0; i < n; i++) {
    const s = sections[i]
    for (let j = 0; j <= radialSegments; j++) {
      const a = (j / radialSegments) * Math.PI * 2
      positions.push(s.at.x, s.at.y + superCoord(Math.cos(a), s.ry), s.at.z + superCoord(Math.sin(a), s.rz))
      uvs.push(j / radialSegments, i / (n - 1))
    }
  }
  for (let i = 0; i < n - 1; i++) {
    for (let j = 0; j < radialSegments; j++) {
      const a = i * ring + j
      const b = a + ring
      indices.push(a, b, a + 1, b, b + 1, a + 1)
    }
  }
  // 端帽：扇形收到路径端点（做法与 kit.loft() 一致）。profile() 已在两端
  // 预先收窄到 62% 尺寸，端帽因此不大，不会读成突兀的平面。
  for (const end of [0, n - 1] as const) {
    const base = positions.length / 3
    const c = sections[end].at
    positions.push(c.x, c.y, c.z)
    uvs.push(0.5, end === 0 ? 0 : 1)
    const ringStart = end * ring
    for (let j = 0; j < radialSegments; j++) {
      if (end === 0) indices.push(base, ringStart + j + 1, ringStart + j)
      else indices.push(base, ringStart + j, ringStart + j + 1)
    }
  }

  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2))
  g.setIndex(indices)
  g.computeVertexNormals() // 不手推超椭圆的解析法线，直接按共享顶点的相邻面法线求平均
  return g
}

/**
 * 头部半径包络：中段维持满尺寸（"方大硬"的分量来源），只在前 12%
 * （唇基 → 大颚衔接处）与后 12%（→ 胸部衔接处）用 smoothstep 缓入缓出
 * 到 62% 尺寸——足够消掉直角硬接缝，又不至于收成尖角。包围盒由中段
 * 满尺寸处决定，两端收窄不会缩小它。
 */
function headRadiusProfile(t: number, ryMax: number, rzMax: number): { ry: number; rz: number } {
  // 前后肩不再对称 —— 2026-08-13 改。原先两端都只收到 62%，后端于是以一堵
  // 直径 0.62 的平墙撞上身体，接头像机加工出来的。后端改成收到 34% 并把收窄
  // 段拉长（0.12→0.26），头壳后缘圆钝地缩进前胸里，接头就看不见了。
  const minScale = 0.62
  const backEase = smooth(Math.min(1, t / 0.26))
  const frontEase = smooth(Math.min(1, (1 - t) / 0.12))
  const back = 0.34 + (1 - 0.34) * backEase
  const front = minScale + (1 - minScale) * frontEase
  const scale = Math.min(back, front)
  // 前窄后宽 —— 2026-08-13 加。原先 ry/rz 全程等比缩放，横截面的宽高比从头到尾
  // 恒定，整颗头读成一段等径的管子；真兵蚁的头壳最宽处在中后段，向大颚关节
  // 那一侧缓缓收窄。收窄只发生在 t>0.3 之后，所以包围盒尺寸不变（体积断言不受影响）。
  const taper = 1 - 0.16 * smooth(Math.max(0, (t - 0.3) / 0.7))
  return { ry: ryMax * scale * (0.94 + 0.06 * taper), rz: rzMax * scale * taper }
}

interface MandibleOpts {
  length: number
  /** 控制点 p1 在长度方向的位置（0~1）。越靠后，"外张"越能在曲线的大半程
   * 压住"末端内钩"的拉力，两颚中前段的间隙才留得住——见 mandiblePath() 注释。 */
  bendAt: number
  /** 中段控制点的 z（本侧绝对值）。略大于基部 z，撑出镰刀的外弧。 */
  midZ: number
  /** 末端越过中线的深度（正值即交叉）。乳白蚁兵蚁的镰刀颚本就交叉，这点是对的。 */
  crossZ: number
  /**
   * 两颚末端在 Y 上的错开量 —— **这是 2026-08-12 返工的关键**。
   *
   * 上一版两颚共面（droop 相同）、中段外张 0.12（头半宽才 0.1，等于向外撑到
   * 头宽两倍）、末端又相接，镜像之后整体围成一个闭合椭圆环，渲染出来像个
   * 手提包。而 vitest 全绿：几何合法、无 NaN、面数达标、anchor 齐全，连
   * 「两颚投影之间要有空隙」那条都过了 —— 因为环的中间恰好就是空的。
   * 断言问对了方向，却没问到末端。
   *
   * 真实的兵蚁两颚交叉时一上一下错开，不在同一平面。让 side 直接参与 Y 偏移，
   * 两颚就成了剪刀式交错，一眼能数出是两把，而不是熔成一个圈。
   */
  scissor: number
  droop: number
  baseR: { ry: number; rz: number }
  tipR: { ry: number; rz: number }
}

/**
 * 大颚中心路径（二次贝塞尔）：基部 → 中后段向外鼓的控制点 → 末端向内钩、
 * 越过中线的控制点。
 *
 * p1（外鼓控制点）刻意放在长度方向靠后处（bendAt，本文件取 0.9）、z 方向
 * 外张一大截（outBulge）——p1 落在头部前方，不受"基部间距≤头部半宽"这条
 * 约束，因此可以把大半的左右分离量都记在这里，让"外张"在曲线的大半程
 * 压住"末端内钩"（cross）的拉力——
 * 二次贝塞尔的形状由三个控制点共同决定，p1 越靠后、外张越多，两颚间的
 * 空隙就能保持到接近末梢才收窄，读起来才是"中前段像镊子一样分开、只在
 * 末梢交叠"，而不是从中段就开始持续内收、紧贴成一片（返工过程中的踩坑
 * 记录见文件头注释）。真正说了算的判据是"按默认机位投影后中段是否有
 * 连续空隙"（见测试文件），不是这里的世界坐标数字——世界坐标里"分得开"
 * 只是必要条件，不是充分条件。
 */
function mandiblePath(base: { x: number; y: number; z: number }, side: 1 | -1, opts: MandibleOpts, steps: number): THREE.Vector3[] {
  const p0 = new THREE.Vector3(base.x, base.y, side * base.z)
  const p1 = new THREE.Vector3(
    base.x + opts.length * opts.bendAt,
    base.y - opts.droop * opts.bendAt * 0.6,
    side * opts.midZ,
  )
  const p2 = new THREE.Vector3(
    base.x + opts.length,
    base.y - opts.droop + side * opts.scissor,
    -side * opts.crossZ,
  )
  const pts: THREE.Vector3[] = []
  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    const a = p0.clone().lerp(p1, t)
    const b = p1.clone().lerp(p2, t)
    pts.push(a.lerp(b, t))
  }
  return pts
}

/** 大颚路径的末端点（t=1，即贝塞尔的 p2），复刻 mandiblePath() 内部公式，供 anchor 用。 */
function mandibleTipPoint(base: { x: number; y: number; z: number }, side: 1 | -1, opts: MandibleOpts): THREE.Vector3 {
  return new THREE.Vector3(
    base.x + opts.length,
    base.y - opts.droop + side * opts.scissor,
    -side * opts.crossZ,
  )
}

/** 兵蚁大颚（一侧）：有厚度的弯钩，基部粗、向末端渐收但不收尖成针，内缘光滑不加碎齿。 */
function soldierMandible(base: { x: number; y: number; z: number }, side: 1 | -1, opts: MandibleOpts, material: THREE.Material): THREE.Mesh {
  const steps = 40 // 这版弯曲更陡（bendAt=0.9 附近急转），站数加倍让曲面过渡更平滑，面数仍在预算内
  const pts = mandiblePath(base, side, opts, steps)
  const sections: Section[] = pts.map((p, i) => {
    const t = i / steps
    const k = Math.pow(t, 0.8) // 前段收得慢、近末端收得快，更接近真实镰刀轮廓
    return {
      at: p,
      ry: THREE.MathUtils.lerp(opts.baseR.ry, opts.tipR.ry, k),
      rz: THREE.MathUtils.lerp(opts.baseR.rz, opts.tipR.rz, k),
    }
  })
  const mesh = new THREE.Mesh(loft(sections, 16), material)
  mesh.name = 'mandible'
  return mesh
}

/**
 * 念珠状（moniliform）触角：kit.AntennaKind 没有这个类型，自建。
 * 沿一条直线串一列渐缩小球模拟念珠状节间，再垫一根细杆把珠子连起来，
 * 避免珠子之间露出缝隙。
 */
function beadedAntenna(
  base: THREE.Vector3,
  opts: { length: number; beads: number; pitchDeg: number; yawDeg: number; thickness: number },
  material: THREE.Material,
): THREE.Group {
  const g = new THREE.Group()
  g.name = 'antenna'
  g.userData.base = [base.x, base.y, base.z]
  const pitch = THREE.MathUtils.degToRad(opts.pitchDeg)
  const yaw = THREE.MathUtils.degToRad(opts.yawDeg)
  const dir = new THREE.Vector3(Math.cos(pitch) * Math.cos(yaw), Math.sin(pitch), Math.cos(pitch) * Math.sin(yaw))

  const steps = opts.beads * 2
  const sections: Section[] = []
  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    const p = base.clone().addScaledVector(dir, opts.length * t)
    const r = opts.thickness * 0.38 * (1 - t * 0.4)
    sections.push({ at: p, ry: Math.max(r, 0.0025), rz: Math.max(r, 0.0025) })
  }
  g.add(new THREE.Mesh(loft(sections, 8), material))

  for (let i = 0; i < opts.beads; i++) {
    const t = (i + 0.5) / opts.beads
    const p = base.clone().addScaledVector(dir, opts.length * t)
    const r = opts.thickness * (1 - t * 0.45)
    const bead = new THREE.Mesh(new THREE.SphereGeometry(Math.max(r, 0.004), 8, 6), material)
    bead.position.copy(p)
    g.add(bead)
  }

  g.userData.tip = base.clone().addScaledVector(dir, opts.length)
  return g
}

function beadedAntennaPair(
  base: [number, number, number],
  opts: { length: number; beads: number; pitchDeg: number; yawDeg: number; thickness: number },
  material: THREE.Material,
): THREE.Group {
  const g = new THREE.Group()
  const right = beadedAntenna(new THREE.Vector3(...base), opts, material)
  const left = beadedAntenna(new THREE.Vector3(base[0], base[1], -base[2]), { ...opts, yawDeg: -opts.yawDeg }, material)
  g.add(right, left)
  g.userData.tipRight = right.userData.tip
  return g
}

// ---------------------------------------------------------------- 主体

export function buildTermiteSoldier(): InsectModel {
  const g = new THREE.Group()

  const headColor = '#7a4a26' // 真能看出是"褐色"的档位，ACES 下不会压成近黑
  const softColor = '#ecdfc2' // 胸腹：苍白柔软，与头部形成强对比
  const legColor = '#cdbb8e'
  const mandibleColor = '#4a2c18' // 比头部更深（更高度骨化的天然观感），但同样避免近黑

  const headMat = chitin({ color: headColor, gloss: 0.66, clearcoat: 0.52 }) // 高度骨化：高光泽+清漆，圆角放样面上能看出高光渐变
  const softMat = chitin({ color: softColor, gloss: 0.2, clearcoat: 0.03, translucent: true }) // 柔软：低光泽、无清漆；B 轮半透组定标：加 transmission，硬褐头×半透软腹的对比是本种全部看点（头部 headMat 不动）
  const legMat = chitin({ color: legColor, gloss: 0.34, clearcoat: 0.1 })
  const mandibleMat = chitin({ color: mandibleColor, gloss: 0.55, clearcoat: 0.38 }) // 有光泽但不过量：gloss/clearcoat 一旦太高，强曲面在单一主光源下会把整段高光糊成一片亮斑，紧挨着的暗部又被 ACES 压得发黑，两颚在渲染里就读成了一整片扁平的深色"瓢铲"而不是分开的圆润弯钩（返工时肉眼实测发现，见文件头注释）
  const dimpleMat = chitin({ color: '#372111', gloss: 0.06 }) // 眼点退化处的浅坑：颜色取头部本色的暗化版（而非独立的深色），读起来像"同一块头壳上的阴影凹陷"，不是"贴了一颗异色的球"；不给光泽，避免被误读成复眼

  // ---- 沿体轴的关键坐标（+X 向前），体长约 0.6cm，无腰——胸腹宽阔相连
  const headFrontX = 0.3
  const headBackX = 0.04
  const thoraxFrontX = headBackX
  const thoraxBackX = -0.02
  const abdomenFrontX = thoraxBackX
  const abdomenBackX = -0.25
  const headY = 0.09

  // ---- 头部：squircleLoft() 放样出真正的圆角长方体（技术见文件头注释），
  // 长度/宽度都明显超过胸腹之和——这是"一个大头拖着一小截软身子"观感
  // 的全部来源，中段维持满尺寸保证这一点不受两端收窄影响
  const headLen = headFrontX - headBackX // 0.26
  // 0.2×0.17 改成 0.22×0.135 —— 2026-08-13 修。原尺寸配上 0.26 的长度几乎是个
  // 正方体，横截面近圆，超椭圆一倒角就读成一只带倒角的褐色圆桶（大图重扫时
  // 60 只里唯一一只不像虫的）。兵蚁头壳是背腹压扁的，宽高比接近 1.6:1。
  const headWidth = 0.22 // 局部 Z（体宽方向）
  const headHeight = 0.135 // 局部 Y（背腹方向）
  const HEAD_STATIONS = 18
  const headSections: RadialSection[] = []
  for (let i = 0; i < HEAD_STATIONS; i++) {
    const t = i / (HEAD_STATIONS - 1)
    const { ry, rz } = headRadiusProfile(t, headHeight / 2, headWidth / 2)
    headSections.push({ at: new THREE.Vector3(headBackX + t * headLen, headY, 0), ry, rz })
  }
  // squareness 从 6 降到 3.2：指数 6 的超椭圆已经几乎是直角矩形，实拍下整个头
  // 读成一块方砖。3.2 仍明显「长方」（兵蚁头确实方），但棱角圆润下来，配合上面
  // 两端收窄的 profile 才像一枚骨化头壳而不是工业零件。
  // 再从 3.2 降到 2.4 —— 2026-08-13。3.2 配上近圆的横截面，棱线仍然清晰可见，
  // 读成机加工的倒角；压扁之后 2.4 已经足够"长方"，棱角也真正圆钝下来了。
  const headMesh = new THREE.Mesh(squircleLoft(headSections, 2.4, 32), headMat)
  headMesh.name = 'head'
  g.add(headMesh)

  // ---- 眼点退化处的浅坑：绝不是复眼——第四轮返工把它进一步缩小、埋得
  // 更深、颜色也改了：上一轮只缩小了尺寸+嵌入深度，材质仍是独立的深色
  // （#2e1d15，接近黑），协调者从侧面实拍复核时那颗小球依旧读成了
  // "复眼"——教训是，光缩小/藏深防不住被认成眼睛，"头壳侧面有一颗与
  // 周围明显异色的圆凸起"本身就是复眼的识别特征，跟大小无关。这版把
  // 半径再砍一档、嵌入更深，**颜色也从独立的深黑改成头部本色的暗化版**
  // （dimpleMat，见上方定义），让它读起来像"同一块头壳上的一点阴影"，
  // 而不是"贴了一颗异色的球"
  for (const side of [1, -1] as const) {
    const dimple = new THREE.Mesh(new THREE.SphereGeometry(0.008, 8, 6), dimpleMat)
    dimple.name = 'headDimple'
    dimple.scale.set(0.4, 0.7, 0.22)
    dimple.position.set(headFrontX - 0.06, headY + 0.01, side * (headWidth / 2 - 0.035))
    g.add(dimple)
  }

  // ---- 大颚：**第四轮返工**——协调者在默认机位（InsectCanvas.tsx 的
  // home=(0.86,0.44,1.25)，Z 分量最大）实拍确认：前三轮虽然做出了"有厚度
  // 的弯钩"，但两颚从这个机位投影后仍然完全糊成一支圆锥状的喙，看不出
  // "两支"——这个机位会把世界坐标里的左右分离（主要发生在 Z 轴）大幅
  // 压扁，"世界坐标里分得开"不等于"看着分得开"。真正管用的判据是把顶点
  // 投影到该机位的成像平面（见文件底部 §screen-projection 相关测试），
  // 按协调者的明确优先级——"看得出是两支"压倒"够粗壮"——这版三处一起改：
  // 1) 基部 z 只能推到头部该处半宽（0.1）以内、留出安全边际（0.088），
  //    不能像上一版尝试的那样直接推到 0.13+（会让大颚基部飘在头壳外面，
  //    见下方 mandibleBase 的注释）；
  // 2) 但 outBulge（外张的控制点，落在头部前方、不受头宽约束）大幅加大
  //    到 0.12——多数分离量从"基部起点多宽"移到"往前伸多远才外张到多宽"；
  // 3) 横截面大幅收细（基部半径从 0.052/0.044 降到 0.024/0.02，约减半）
  //    ——协调者原话："如果为了留出空隙必须把颚做细一点，就做细"，这条
  //    比"够粗壮"优先级更高。
  // 综合数值验证（见开发时的临时脚本）：按 home 机位投影后，两颚在约
  // 90% 的长度上投影包围盒完全不相交，只在最末梢（越过中线交叉的那一
  // 点，物理上必然相触）有极小的重叠，读起来才是"两支镊子状的颚在末梢
  // 交叠"，不是一整支喙。
  const mandibleBase = {
    x: headFrontX - 0.04, // 头部仍是满尺寸的区段（未进入前 12% 收窄区）
    y: headY - 0.015,
    z: 0.088, // 头部该处半宽是 0.1，留 0.012 安全边际，大颚基部因此仍嵌在头壳里，不会飘在外面
  }
  const mandibleOpts: MandibleOpts = {
    length: 0.3,
    bendAt: 0.5, // 外弧顶点放在中段，做出匀称的镰刀弧，而不是末端急转
    midZ: 0.106, // 只比基部 0.088 略外张。上一版是 0.208 —— 头半宽才 0.1，等于撑到头宽两倍，环形观感主要来自这里
    crossZ: 0.012, // 末端越过中线：兵蚁的颚本就交叉，保留
    scissor: 0.02, // 两颚末端在 Y 上一上一下错开，交叉处不再共面熔成闭环
    droop: 0.014,
    baseR: { ry: 0.026, rz: 0.018 }, // ry>rz：截面竖高横窄，读起来是「刃」而不是圆管
    tipR: { ry: 0.008, rz: 0.005 },
  }
  g.add(soldierMandible(mandibleBase, 1, mandibleOpts, mandibleMat))
  g.add(soldierMandible(mandibleBase, -1, mandibleOpts, mandibleMat))

  // ---- 胸部：小而软，半径与腹部前端相近，平滑过渡——没有蚂蚁式细腰
  const thorax = new THREE.Mesh(
    spindle([thoraxFrontX, headY - 0.02, 0], [thoraxBackX, headY - 0.02, 0], 0.06, { bulge: 0.5, flat: 1.0, taperStart: 0.85, taperEnd: 0.85 }),
    softMat,
  )
  thorax.name = 'thorax'
  g.add(thorax)

  // ---- 腹部：圆胖、分节可见，苍白柔软
  const abdomenFrom = new THREE.Vector3(abdomenFrontX, headY - 0.02, 0)
  const abdomenTo = new THREE.Vector3(abdomenBackX, headY - 0.03, 0)
  const abdomen = new THREE.Mesh(
    segmentedAbdomen({
      from: [abdomenFrom.x, abdomenFrom.y, abdomenFrom.z],
      to: [abdomenTo.x, abdomenTo.y, abdomenTo.z],
      // 2026-08-13 修：原值 r1=0.018 把腹部收成一个尖锥，groove=0.17 又把节间沟
      // 切成一圈锋利的鳍，整段读成松果/螺丝而不是腹部。兵蚁的腹是软而胖的腊肠，
      // 中段最粗、尾端圆钝收口，节间只是浅浅的褶。
      r0: 0.075,
      r1: 0.046,
      segments: 7,
      groove: 0.085,
      bulge: 0.42,
    }),
    softMat,
  )
  abdomen.name = 'abdomen'
  g.add(abdomen)

  // ---- 念珠状短触角
  const antBase: [number, number, number] = [headFrontX - 0.02, headY + 0.05, 0.05]
  const antennae = beadedAntennaPair(antBase, { length: 0.13, beads: 6, pitchDeg: 18, yawDeg: 40, thickness: 0.014 }, legMat)
  g.add(antennae)

  // ---- 六足：短小，用 leg()+mirrorZ()（而非 legPair()）保证左右严格对称
  // ——同 ant.ts/mantis.ts 的踩坑记录，legPair() 会把左右腿基节挤到同侧
  const foreLeg = { base: [0.05, 0.05, 0.05] as [number, number, number], femur: 0.09, tibia: 0.095, tarsus: 0.04, thickness: 0.013, splay: 34, sweep: -28, knee: 62, ankle: 58 }
  const midLeg = { base: [0.0, 0.03, 0.055] as [number, number, number], femur: 0.095, tibia: 0.1, tarsus: 0.042, thickness: 0.013, splay: 36, sweep: 6, knee: 64, ankle: 56 }
  const hindLeg = { base: [-0.06, 0.02, 0.05] as [number, number, number], femur: 0.1, tibia: 0.105, tarsus: 0.045, thickness: 0.013, splay: 32, sweep: 36, knee: 66, ankle: 54 }
  g.add(mirrorZ(leg(foreLeg, legMat)))
  g.add(mirrorZ(leg(midLeg, legMat)))
  g.add(mirrorZ(leg(hindLeg, legMat)))

  const mandibleTip = mandibleTipPoint(mandibleBase, 1, mandibleOpts)
  const abdomenMid = new THREE.Vector3().lerpVectors(abdomenFrom, abdomenTo, 0.42).add(new THREE.Vector3(0, 0.05, 0))

  const anchors: Record<string, THREE.Vector3> = {
    head: new THREE.Vector3(headFrontX - 0.1, headY + headHeight * 0.4, 0),
    mandible: mandibleTip,
    abdomen: abdomenMid,
    antenna: antennae.userData.tipRight as THREE.Vector3,
    thorax: new THREE.Vector3((thoraxFrontX + thoraxBackX) / 2, headY + 0.05, 0),
    leg: new THREE.Vector3(midLeg.base[0], midLeg.base[1] - 0.08, midLeg.base[2] + 0.08),
  }

  return finalize(g, anchors)
}
