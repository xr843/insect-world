/**
 * 红萤 Lycostomus sp.（鞘翅目·红萤科 Lycidae）
 *
 * 造型要点：
 * - 招牌特征是鞘翅表面的"网格状脊纹"：纵向主脊（4 条）沿全长贴合鞘翅
 *   曲面延伸，横向细脊在纵脊之间一段段搭过去，两组交织成一张浮在鞘翅
 *   表面的渔网。做法复用 click-beetle.ts/jewel-beetle.ts 已验证过的
 *   "反推曲面坐标"手法（surfacePoint()：在放样鞘翅用的同一组 Section
 *   上，取固定 theta 角对应的曲面点，法线方向已知）——纵脊是 theta 固定、
 *   沿全部 t（弦长）走一整条；横脊反过来是 t（弦长）固定、theta 在相邻
 *   两条纵脊之间扫一小段。两组都沿各自法线略微向外凸出（+0.011~0.013），
 *   读出来是"浮起"的脊线而不是贴死在壳上的贴花。
 *   __tests__/round5a.test.ts 按此验证：纵脊 mesh 的包围盒 X 跨度必须
 *   明显大于 Z 跨度（沿全长走），横脊则反过来 Z 跨度大于 X 跨度（只在
 *   固定弦长处横跨——同一 t 意味着路径上所有点共享同一个 x，X 跨度只
 *   由管径本身贡献）；删掉任何一组，对应断言就会因为「找不到该名字的
 *   mesh」直接失败。
 * - 鞘翅前窄后宽：红萤科（尤其 Lycostomus/Lycus 一类）鞘翅明显向后展宽，
 *   与吉丁虫那种"前宽后尖"的纺锤（jewel-beetle.ts 的 HULL_PROFILE）正
 *   相反，所以本文件的 WIDEN_PROFILE 是把同一套"控制点+smoothstep"手法
 *   反过来用：宽度从基部到近末端单调递增，只在收口前最后一小段略微收窄
 *   （避免 loft() 端点封口出现尖锥）。
 * - 鞘翅质地柔软：红萤鞘翅比硬壳金龟/吉丁软得多，不用 elytra()（清漆+
 *   金属，硬壳观感），改用低 gloss 的 chitin()，手动把 clearcoat 也压在
 *   0.3 左右（本来就远低于 elytra() 内定的 0.55 上限，不需要也不应该
 *   往上够）。
 * - 警戒色：红萤科是鞘翅目里经典的"红黑警戒色"米勒拟态圈成员之一（与
 *   萤科、部分叩甲互拟），有毒或难吃，鲜红鞘翅+黑色头胸是不可食的信号。
 *   ⚠️ kit.ts 强调 ACES 色调映射会显著提亮去饱和，基色要比"想要的观感"
 *   压深一档——本文件的朱红基色比感觉上"已经够红"的直觉值更深，参照
 *   ladybird.ts 里已经过实机验证的 `#e2382a`（该文件注释记录了从偏暗
 *   酒红调亮到明快朱红的过程），本文件取一个同量级但更偏橙的朱红。
 * - 前胸背板：黑色，中央一道纵脊+两枚浅凹窝，是红萤科前胸背板常见的
 *   表面雕纹；因为不是测试覆盖的特征，坐标直接手动估在前胸背板的大致
 *   表面位置（同 firefly.ts 处理盾片透明窗的精度级别），不做曲面反推。
 * - 锯齿状（栉齿状）触角：kit.AntennaKind 没有专门的"锯齿"类型（kit.ts
 *   文档明确写了这一点），沿用 jewel-beetle.ts 首创的 serrateAntenna()
 *   手法——渐细主干+每节朝外侧凸出一枚小尖齿；红萤触角比吉丁的更长更
 *   显著，length 相应调大。
 * - ⚠️ 返工记录：本轮改了 elytraMat/pronotumMat/pitMat 颜色——上一版鞘翅
 *   壳面被清漆高光冲成苍白色（只剩脊纹还读得出暗红），前胸也误做成黑
 *   色。现在鞘翅/前胸都改回同一档鲜红并压低 clearcoat，详见下方材质
 *   注释。
 */
import * as THREE from 'three'
import {
  chitin,
  compoundEyePair,
  finalize,
  legPair,
  loft,
  spindle,
  type InsectModel,
  type LegSpec,
  type Section,
} from './kit'

// ---------------------------------------------------------------- 局部工具

/** 轮廓控制点：t 沿鞘翅全长 0~1（0=基部/近前胸，1=末端），w 为该处半宽
 * 相对峰值的比例。单调递增到 0.93 附近的峰值，最后一小段略收（避免
 * loft() 端点封口出现尖锥）——红萤"前窄后宽"轮廓的由来。 */
const WIDEN_PROFILE: [number, number][] = [
  [0, 0.16],
  [0.16, 0.26],
  [0.38, 0.46],
  [0.62, 0.7],
  [0.83, 0.94],
  [0.93, 1.0],
  [1, 0.76],
]

function profileWidth(t: number): number {
  for (let i = 0; i < WIDEN_PROFILE.length - 1; i++) {
    const [t0, w0] = WIDEN_PROFILE[i]
    const [t1, w1] = WIDEN_PROFILE[i + 1]
    if (t >= t0 && t <= t1) {
      const f = (t - t0) / (t1 - t0 || 1)
      const s = f * f * (3 - 2 * f)
      return THREE.MathUtils.lerp(w0, w1, s)
    }
  }
  return WIDEN_PROFILE[WIDEN_PROFILE.length - 1][1]
}

/** 反推鞘翅放样截面上某点（固定 theta 角）的世界坐标与法线，供纵脊/横脊共用。 */
function surfacePoint(
  sections: Section[],
  centers: THREE.Vector3[],
  zSideOffset: number,
  theta: number,
  i: number,
): { pos: THREE.Vector3; normal: THREE.Vector3 } {
  const sec = sections[i]
  const c = centers[i]
  const nx = (Math.cos(theta) / Math.max(sec.ry, 1e-6)) * sec.rz
  const nz = (Math.sin(theta) / Math.max(sec.rz, 1e-6)) * sec.ry
  const normal = new THREE.Vector3(0, nx, nz).normalize()
  const pos = new THREE.Vector3(c.x, c.y + Math.cos(theta) * sec.ry, zSideOffset + Math.sin(theta) * sec.rz)
  return { pos, normal }
}

/** 纵脊："经线"——固定 theta，沿鞘翅全长走一整条，略凸出表面。 */
function ridgeLong(
  sections: Section[],
  centers: THREE.Vector3[],
  zSideOffset: number,
  theta: number,
  tubeR: number,
  material: THREE.Material,
  iFrom: number,
  iTo: number,
): THREE.Mesh {
  const pts: Section[] = []
  for (let i = iFrom; i <= iTo; i++) {
    const { pos, normal } = surfacePoint(sections, centers, zSideOffset, theta, i)
    pts.push({ at: pos.addScaledVector(normal, 0.013), ry: tubeR, rz: tubeR })
  }
  const m = new THREE.Mesh(loft(pts, 6), material)
  m.name = 'ridge-long'
  return m
}

/** 横脊："纬线"——固定弦长位置 i，在相邻两条纵脊的 theta 之间扫一小段，
 * 路径上所有点共享同一个 x，X 跨度只由管径贡献，Z 跨度则来自 theta 扫过
 * 的弧长，天然就是"横跨"的形状。 */
function ridgeCross(
  sections: Section[],
  centers: THREE.Vector3[],
  zSideOffset: number,
  thetaFrom: number,
  thetaTo: number,
  i: number,
  tubeR: number,
  material: THREE.Material,
): THREE.Mesh {
  const steps = 5
  const pts: Section[] = []
  for (let k = 0; k <= steps; k++) {
    const theta = THREE.MathUtils.lerp(thetaFrom, thetaTo, k / steps)
    const { pos, normal } = surfacePoint(sections, centers, zSideOffset, theta, i)
    pts.push({ at: pos.addScaledVector(normal, 0.011), ry: tubeR, rz: tubeR })
  }
  const m = new THREE.Mesh(loft(pts, 6), material)
  m.name = 'ridge-cross'
  return m
}

/** 锯齿状触角：渐细主干 + 每节朝外侧凸出的一枚小尖齿（同 jewel-beetle.ts
 * 的 serrateAntenna，kit 没有现成的"锯齿"类型，见文件头注释）。 */
function serrateAntenna(base: THREE.Vector3, side: 1 | -1, length: number, thickness: number, material: THREE.Material): THREE.Group {
  const g = new THREE.Group()
  const segs = 11
  const pitch = THREE.MathUtils.degToRad(24)
  const yaw = side * THREE.MathUtils.degToRad(34)
  const dir = new THREE.Vector3(Math.cos(pitch) * Math.cos(yaw), Math.sin(pitch), Math.cos(pitch) * Math.sin(yaw))

  const path: THREE.Vector3[] = []
  for (let i = 0; i <= segs; i++) path.push(base.clone().addScaledVector(dir, (length * i) / segs))

  const sections: Section[] = path.map((p, i) => {
    const t = i / segs
    const r = thickness * (1 - t * 0.55)
    return { at: p, ry: r, rz: r }
  })
  g.add(new THREE.Mesh(loft(sections, 8), material))

  const up = new THREE.Vector3(0, 1, 0)
  let outSide = new THREE.Vector3().crossVectors(dir, up)
  if (outSide.lengthSq() < 1e-8) outSide = new THREE.Vector3(0, 0, 1)
  outSide.normalize().multiplyScalar(side)

  for (let i = 2; i < segs; i++) {
    const t = i / segs
    const p = path[i]
    const toothLen = thickness * 2.6 * (1 - t * 0.5)
    const tip = p.clone().addScaledVector(outSide, toothLen).addScaledVector(dir, -toothLen * 0.32)
    g.add(
      new THREE.Mesh(loft([{ at: p, ry: thickness * 0.58, rz: thickness * 0.58 }, { at: tip, ry: 0.003, rz: 0.003 }], 6), material),
    )
  }
  return g
}

function serrateAntennaPair(base: [number, number, number], length: number, thickness: number, material: THREE.Material): THREE.Group {
  const g = new THREE.Group()
  g.add(serrateAntenna(new THREE.Vector3(...base), 1, length, thickness, material))
  g.add(serrateAntenna(new THREE.Vector3(base[0], base[1], -base[2]), -1, length, thickness, material))
  return g
}

// ---------------------------------------------------------------- 主体

export function buildNetWingedBeetle(): InsectModel {
  const g = new THREE.Group()

  // ⚠️⚠️ 返工记录：上一轮鞘翅压成 #b8341c/gloss 0.42/clearcoat 0.3，实机
  // 渲染里脊纹之间大片平缓壳面被清漆高光+多块柔光板冲成近乎苍白的米白
  // 色（只有脊纹本身还读得出暗红），通体像"红色铁丝网架在一具发白的
  // 躯壳上"——这正是任务描述的"鞘翅悬浮、露出苍白腹部"，其实那片"腹
  // 部"就是被冲淡的鞘翅壳面本身，本文件并没有单独的腹部 mesh。根因：
  // kit.chitin() 的 clearcoatRoughness 写死 0.18、不随 gloss 变化，只要
  // clearcoat > 0 清漆层就总是很锐利，在这种大曲率宽阔壳面上会整片盖
  // 过底色（同 burying-beetle.ts 橙带的教训）。现在双管齐下：基色对齐
  // ladybird.ts 验证过的 #e2382a 亮度档位（同量级、更偏橙），并降低
  // gloss/clearcoat 削弱清漆压制力；前胸背板也从黑改成与鞘翅同档的红。
  // 脊纹材质（ridgeMat）是全模型最成功的部分，原样保留不动。
  const elytraMat = chitin({ color: '#e2482a', gloss: 0.3, clearcoat: 0.16 })
  const ridgeMat = chitin({ color: '#7c2210', gloss: 0.36, clearcoat: 0.26 })
  const pronotumMat = chitin({ color: '#e2482a', gloss: 0.3, clearcoat: 0.16 }) // 与鞘翅同一档的红，不再用黑（见上方返工说明）
  const pitMat = chitin({ color: '#100806', gloss: 0.28, clearcoat: 0.12 }) // 前胸中央保留一小块黑斑（红萤科部分种类的常见细节），不必再压更深
  const headMat = chitin({ color: '#121010', gloss: 0.5, clearcoat: 0.3 })
  const legMat = chitin({ color: '#1c1512', gloss: 0.4, clearcoat: 0.2 })
  const antennaMat = chitin({ color: '#171310', gloss: 0.34 })

  // ---- 鞘翅：前窄后宽，柔软质地（见 WIDEN_PROFILE 注释）
  const elytraFrom = 0.34
  const elytraTo = -0.86
  const eSteps = 30
  const elytronCenters: THREE.Vector3[] = []
  const elytronSections: Section[] = []
  for (let i = 0; i <= eSteps; i++) {
    const t = i / eSteps
    const w = profileWidth(t) * 0.44
    const c = new THREE.Vector3(THREE.MathUtils.lerp(elytraFrom, elytraTo, t), 0.1 + 0.02 * Math.sin(t * Math.PI), 0)
    elytronCenters.push(c)
    elytronSections.push({ at: c, ry: Math.max(w * 0.5, 0.01), rz: Math.max(w * 0.98, 0.01) })
  }

  const zOffset = 0.032
  // 4 条纵脊，对称分布在鞘翅背面（±0.85 接近侧缘，±0.3 偏背中线）
  const thetaRidges = [-0.85, -0.32, 0.28, 0.82]
  for (const side of [1, -1] as const) {
    const shell = new THREE.Mesh(loft(elytronSections, 26), elytraMat)
    shell.position.z = side * zOffset
    shell.name = 'elytra'
    g.add(shell)

    for (const theta of thetaRidges) {
      g.add(ridgeLong(elytronSections, elytronCenters, side * zOffset, theta, 0.012, ridgeMat, 3, eSteps - 2))
    }
    // 横脊：纵脊间的 3 个间隙 × 6 个弦长位置，两组交织成网
    for (let gap = 0; gap < thetaRidges.length - 1; gap++) {
      for (const tFrac of [0.28, 0.42, 0.56, 0.68, 0.78, 0.88]) {
        const idx = Math.round(tFrac * eSteps)
        g.add(ridgeCross(elytronSections, elytronCenters, side * zOffset, thetaRidges[gap], thetaRidges[gap + 1], idx, 0.009, ridgeMat))
      }
    }
  }

  // ---- 前胸背板：黑色，中央一道纵脊 + 两枚浅凹窝（坐标手动估在背板表面附近，
  // 同 firefly.ts 处理盾片透明窗的精度级别——非测试覆盖特征，不做曲面反推）
  const pronotum = new THREE.Mesh(
    spindle([0.64, 0.03, 0], [0.4, 0.055, 0], 0.23, { bulge: 0.45, flat: 1.2, taperStart: 0.55, taperEnd: 0.62 }),
    pronotumMat,
  )
  pronotum.name = 'pronotum'
  g.add(pronotum)

  const ridgeSpine = new THREE.Mesh(
    loft(
      [
        { at: new THREE.Vector3(0.6, 0.135, 0), ry: 0.012, rz: 0.012 },
        { at: new THREE.Vector3(0.5, 0.15, 0), ry: 0.014, rz: 0.014 },
        { at: new THREE.Vector3(0.42, 0.135, 0), ry: 0.01, rz: 0.01 },
      ],
      8,
    ),
    pronotumMat,
  )
  g.add(ridgeSpine)

  for (const side of [1, -1] as const) {
    const pit = new THREE.Mesh(new THREE.SphereGeometry(0.045, 12, 8), pitMat)
    pit.position.set(0.53, 0.125, side * 0.11)
    pit.scale.set(1, 0.4, 0.85)
    g.add(pit)
  }

  // ---- 头部：小，大半藏在前胸背板前缘下方
  const head = new THREE.Mesh(
    spindle([0.62, 0.05, 0], [0.82, 0.08, 0], 0.13, { bulge: 0.4, flat: 1.0, taperStart: 0.7, taperEnd: 0.32 }),
    headMat,
  )
  g.add(head)

  // ---- 复眼
  const eyeAt: [number, number, number] = [0.72, 0.13, 0.12]
  g.add(compoundEyePair({ at: eyeAt, radius: 0.048, color: '#0a0808', flatten: 0.85, facets: true }))

  // ---- 锯齿状触角：比吉丁的更长更显著
  const antennaBase: [number, number, number] = [0.78, 0.15, 0.11]
  g.add(serrateAntennaPair(antennaBase, 0.52, 0.026, antennaMat))

  // ---- 六足：中等长度，splay 适中
  const legSpecs: LegSpec[] = [
    { base: [0.5, -0.05, 0.15], femur: 0.22, tibia: 0.24, tarsus: 0.1, thickness: 0.02, splay: 36, sweep: -26, knee: 64 },
    { base: [0.05, -0.06, 0.17], femur: 0.24, tibia: 0.26, tarsus: 0.11, thickness: 0.021, splay: 33, sweep: 6, knee: 66 },
    { base: [-0.35, -0.06, 0.16], femur: 0.24, tibia: 0.27, tarsus: 0.11, thickness: 0.021, splay: 35, sweep: 32, knee: 68 },
  ]
  const legRigs = legSpecs.map((spec) => legPair(spec, legMat))
  for (const rig of legRigs) g.add(rig)
  const midLegTip = (legRigs[1].children[0] as THREE.Group).userData.tip as THREE.Vector3

  // ---- ridge 锚点：取中段一条纵脊（theta=0.28）在鞘翅中部的曲面点
  const ridgeAnchorIdx = Math.round(0.56 * eSteps)
  const ridgeAnchorPos = surfacePoint(elytronSections, elytronCenters, zOffset, 0.28, ridgeAnchorIdx).pos.clone()

  const anchors: Record<string, THREE.Vector3> = {
    elytra: new THREE.Vector3(-0.4, 0.32, 0.3),
    ridge: ridgeAnchorPos,
    antenna: new THREE.Vector3(antennaBase[0] + 0.3, antennaBase[1] + 0.15, antennaBase[2] + 0.15),
    eye: new THREE.Vector3(eyeAt[0], eyeAt[1] + 0.03, eyeAt[2]),
    pronotum: new THREE.Vector3(0.5, 0.2, 0),
    leg: midLegTip.clone(),
  }

  return finalize(g, anchors)
}
