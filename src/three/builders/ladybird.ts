/**
 * 七星瓢虫 Coccinella septempunctata
 *
 * 造型要点：
 * - 瓢虫的轮廓不是"两端收尖的纺锤"，而是"底面几乎平、背面高高拱起"的
 *   半球——像倒扣的一只碗。kit.spindle()/segmentedAbdomen() 生成的都是
 *   围绕路径中心对称的椭圆截面，两端必然收尖，做不出这种"平底圆顶"。
 *   本文件因此不借助 spindle()，而是直接向 kit.loft() 喂自建的截面：
 *   让路径点的 y 随半径同步升高（bottom = groundY 恒定，top = groundY+2r
 *   随半径起伏），这样无论鞘翅有多鼓，底边都贴在同一条水平线上——
 *   这正是"倒扣的碗"这一形状的关键（见 domeSections/humpProfile）。
 * - 七个黑点位置遵照七星瓢虫的经典分布：每片鞘翅 3 枚（前外侧/中内侧/
 *   后外侧）+ 跨中缝小盾片处 1 枚共享点 = 3+3+1。每个点都用"沿鞘翅
 *   曲面法线方向压扁的小球"贴出来（domeSurfacePoint 算出曲面上的位置
 *   与法线，spotPatch 把小球压扁并顺着法线方向贴上去），不是漂浮的球。
 * - 前胸背板同样用 domeSections 建出一个更小的圆顶，黑底 + 两枚白斑，
 *   是本种最重要的鉴别特征之一。
 * - 六足短、少展、多半藏进腹面那片"平底"下方；触角短而膨大成棒
 *   （kind: 'clavate'，近似瓢虫的锤状触角）。
 *
 * 体长按真实尺度写（约 0.7cm），不为了"看起来正常"而放大——
 * finalize() 会用包围球半径统一归一化取景，绝对数值不影响呈现。
 */
import * as THREE from 'three'
import {
  antennaPair,
  chitin,
  compoundEyePair,
  elytra,
  finalize,
  leg,
  loft,
  mirrorZ,
  spindle,
  type InsectModel,
  type Section,
} from './kit'
import { punctateMaps } from './surface'

// ---------------------------------------------------------------- 局部辅助

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

/**
 * "平底圆顶"截面组：路径中心的 y 随半径同步抬升，使椭圆截面的底边
 * 始终贴在 groundY 这条线上——只有顶部随半径起伏，这就是半球状轮廓
 * 而非纺锤状轮廓的由来。
 */
function domeSections(xFrom: number, xTo: number, groundY: number, profile: (t: number) => number, aspect: number, steps: number): Section[] {
  const sections: Section[] = []
  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    const r = Math.max(profile(t), 1e-4)
    sections.push({ at: new THREE.Vector3(THREE.MathUtils.lerp(xFrom, xTo, t), groundY + r, 0), ry: r, rz: r * aspect })
  }
  return sections
}

/** 圆顶曲面上某一点的位置与法线：theta=0 为正背中线最高点，theta 越大越靠外侧 */
function domeSurfacePoint(
  xFrom: number,
  xTo: number,
  groundY: number,
  profile: (t: number) => number,
  aspect: number,
  t: number,
  thetaDeg: number,
): { pos: THREE.Vector3; normal: THREE.Vector3 } {
  const r = profile(t)
  const theta = THREE.MathUtils.degToRad(thetaDeg)
  const cx = THREE.MathUtils.lerp(xFrom, xTo, t)
  const cy = groundY + r
  const pos = new THREE.Vector3(cx, cy + r * Math.cos(theta), r * aspect * Math.sin(theta))
  const normal = new THREE.Vector3(0, Math.cos(theta), Math.sin(theta)).normalize()
  return { pos, normal }
}

/** 贴合曲面的斑点：把小球沿法线方向压扁，紧贴在曲面上，而不是悬浮的圆球 */
function spotPatch(pos: THREE.Vector3, normal: THREE.Vector3, radius: number, thinness: number, material: THREE.Material): THREE.Mesh {
  const m = new THREE.Mesh(new THREE.SphereGeometry(radius, 14, 10), material)
  m.position.copy(pos).addScaledVector(normal, radius * thinness * 0.5 + 0.003)
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), normal)
  m.scale.set(1, 1, thinness)
  return m
}

// ---------------------------------------------------------------- 主体

export function buildLadybird(): InsectModel {
  const g = new THREE.Group()

  const elytraMat = elytra('#e2382a', 0.12) // 明快朱红鞘翅（原 #d0342c 偏暗偏酒红），强清漆光泽，金属感克制
  /*
   * 单独把粗糙度从 elytra() 的默认值抬上来 —— 2026-08-12 定位并修复。
   *
   * 用户两次反馈这只虫「吓人、是不是穿模了」：低侧角下红壳像是裂开、露出一片
   * 浅色。前六轮排查全部落空（前胸宽度 / 白斑材质 / 单面剔除 / 清漆 / 环境反射 /
   * 深色件光泽），因为都在猜「哪里破了」。
   *
   * 真正的定位靠 ID 图：把每个 mesh 换成唯一色的自发光材质渲一张，按像素反查
   * 那片白的归属 —— 结果它**就长在鞘翅自己身上**，占可见鞘翅的 8.8%。既不是洞，
   * 也不是别的东西穿出来。随后按变体逐个量化：
   *   去 roughnessMap 8.6%｜去 normalMap 8.9%｜envMapIntensity=0 8.8%（三者均无效）
   *   roughness 0.319→0.85 则降到 3.3%
   * 即：面光源在过于光滑的大圆顶上打出一大片**过曝到纯白**的直接光高光，
   * 边缘硬，被读成「壳裂开」。
   *
   * 取 0.56：过曝面积减半（8.8%→5.5%），而「亮但未过曝」的像素数几乎不变
   * （12681→12994）—— 只削掉曝掉的部分，光泽照旧。
   * 只改本种：瓢虫是又大又光滑的半球，才会吃到这么大一片高光；扁平的甲虫没这问题，
   * 所以不动 kit.elytra() 的公共值。
   */
  elytraMat.roughness = 0.56
  // B3 刻点组定标：细密刻点。elytra() 的 surface 枚举只给默认密度
  // （260/0.016，见 surface.ts），本种鞘翅是 loft() 单管拼出的"倒扣的
  // 碗"（见文件头注释）——u 坐标环绕整根管子一圈，却只有朝上的大半段
  // 能看见，可见密度天生打对折（surface.ts 头注释的"已知坑"）。这里
  // 手动调高密度、调小坑径，做出"细密"而非默认档的"粗大"；不开浏览器
  // 无法目视定标，数值先按这个方向给——真机偏粗/偏细回这两个参数调
  // （深度/法线强度是 surface.ts 内部常量，不在物种文件能调的范围）。
  const elytraPunctate = punctateMaps(420, 0.011)
  if (elytraPunctate) {
    elytraMat.normalMap = elytraPunctate.normal
    elytraMat.roughnessMap = elytraPunctate.roughness
  }
  const spotMat = chitin({ color: '#15110f', gloss: 0.72, clearcoat: 0.65 })
  const sutureMat = chitin({ color: '#231a17', gloss: 0.5, clearcoat: 0.4 })
  const pronotumMat = chitin({ color: '#181410', gloss: 0.68, clearcoat: 0.5 })
  const pronotumSpotMat = chitin({ color: '#f2ede0', gloss: 0.5, clearcoat: 0.28 })
  const headMat = chitin({ color: '#151110', gloss: 0.58, clearcoat: 0.38 })
  const legMat = chitin({ color: '#241d1a', gloss: 0.4, clearcoat: 0.18 })
  const antennaMat = chitin({ color: '#3a2f28', gloss: 0.35 })

  const groundY = -0.16 // 腹面基准线：六足与身体底边都贴着这条线

  // ---- 鞘翅：从紧邻前胸处一路拱到最高点，再收成圆钝的尾端
  const elytraFrom = 0.06
  const elytraTo = -0.34
  const elytraAspect = 1.05
  const elytraProfile = humpProfile(0.32, 0.2, 0.3, 0.045)
  g.add(new THREE.Mesh(loft(domeSections(elytraFrom, elytraTo, groundY, elytraProfile, elytraAspect, 26), 30), elytraMat))

  // ---- 中缝：一条极细的暗色脊线，暗示两片鞘翅在背中线闭合
  {
    const steps = 22
    const path: THREE.Vector3[] = []
    const radii: number[] = []
    for (let i = 0; i <= steps; i++) {
      const t = 0.02 + (i / steps) * 0.96
      const { pos } = domeSurfacePoint(elytraFrom, elytraTo, groundY, elytraProfile, elytraAspect, t, 1.2)
      path.push(pos)
      radii.push(0.011)
    }
    const sections: Section[] = path.map((p, i) => ({ at: p, ry: radii[i], rz: radii[i] }))
    g.add(new THREE.Mesh(loft(sections, 8), sutureMat))
  }

  // ---- 七个黑点：每侧 3 枚 + 跨中缝共享 1 枚，位置遵照经典七星分布
  const sideSpots = [
    { t: 0.24, theta: 42, r: 0.052 }, // 前外侧
    { t: 0.5, theta: 22, r: 0.058 }, // 中央偏内侧
    { t: 0.74, theta: 48, r: 0.05 }, // 后外侧
  ]
  for (const side of [1, -1] as const) {
    for (const spot of sideSpots) {
      const { pos, normal } = domeSurfacePoint(elytraFrom, elytraTo, groundY, elytraProfile, elytraAspect, spot.t, spot.theta)
      pos.z *= side
      normal.z *= side
      g.add(spotPatch(pos, normal, spot.r, 0.32, spotMat))
    }
  }
  // 跨中缝的小盾片共享点：theta 取极小值，几乎落在背中线正上方
  {
    const { pos, normal } = domeSurfacePoint(elytraFrom, elytraTo, groundY, elytraProfile, elytraAspect, 0.1, 2)
    const scut = new THREE.Mesh(new THREE.SphereGeometry(0.05, 14, 10), spotMat)
    scut.position.copy(pos).addScaledVector(normal, 0.012)
    scut.scale.set(0.9, 0.32, 1.55) // 沿身体左右方向拉宽，视觉上"跨过"中缝
    g.add(scut)
  }

  // ---- 前胸背板：黑底，两枚白斑，与鞘翅前缘平滑重叠衔接
  const pronotumFrom = 0.3
  const pronotumTo = 0.045 // 略伸进鞘翅起点(0.06)内侧，藏住接缝
  const pronotumAspect = 1.1
  const pronotumProfile = humpProfile(0.75, 0.1, 0.205, 0.2)
  g.add(new THREE.Mesh(loft(domeSections(pronotumFrom, pronotumTo, groundY, pronotumProfile, pronotumAspect, 16), 24), pronotumMat))

  for (const side of [1, -1] as const) {
    const { pos, normal } = domeSurfacePoint(pronotumFrom, pronotumTo, groundY, pronotumProfile, pronotumAspect, 0.4, 34)
    pos.z *= side
    normal.z *= side
    g.add(spotPatch(pos, normal, 0.034, 0.32, pronotumSpotMat))
  }

  // ---- 头部：小而黑，大半藏在前胸背板前缘下方
  const headFrom = new THREE.Vector3(0.3, groundY + 0.14, 0)
  const headTo = new THREE.Vector3(0.4, groundY + 0.12, 0)
  g.add(new THREE.Mesh(spindle([headFrom.x, headFrom.y, headFrom.z], [headTo.x, headTo.y, headTo.z], 0.11, { bulge: 0.35, flat: 1.0, taperStart: 0.7, taperEnd: 0.1 }), headMat))

  const eyeAt: [number, number, number] = [0.36, groundY + 0.16, 0.09]
  g.add(compoundEyePair({ at: eyeAt, radius: 0.032, color: '#0b0908', flatten: 0.85, facets: false }))

  const antennaBase: [number, number, number] = [0.38, groundY + 0.14, 0.05]
  g.add(antennaPair({ base: antennaBase, length: 0.12, kind: 'clavate', pitch: 25, yaw: 42, thickness: 0.008 }, antennaMat))

  // ---- 六足：短小，展角克制，大半藏于"平底"下方，只露出跗节支撑地面。
  // 用 leg()+mirrorZ() 而非 legPair() 配对（原因见 mantis.ts 文件头注释：
  // legPair() 的 base 取反与 scale.z 取反会叠加成"同侧起步、腿尖甩开"的
  // 错误镜像，leg()+mirrorZ() 才是严格轴对称的左右腿）。
  const legFront = { base: [0.17, groundY + 0.02, 0.14] as [number, number, number], femur: 0.14, tibia: 0.16, thickness: 0.017, splay: 22, sweep: -8, knee: 68, ankle: 55 }
  const legMid = { base: [-0.02, groundY, 0.16] as [number, number, number], femur: 0.15, tibia: 0.17, thickness: 0.017, splay: 26, sweep: 6, knee: 70, ankle: 54 }
  const legHind = { base: [-0.2, groundY, 0.15] as [number, number, number], femur: 0.16, tibia: 0.18, thickness: 0.017, splay: 24, sweep: 32, knee: 72, ankle: 52 }
  g.add(mirrorZ(leg(legFront, legMat)))
  g.add(mirrorZ(leg(legMid, legMat)))
  g.add(mirrorZ(leg(legHind, legMat)))

  const elytraTop = domeSurfacePoint(elytraFrom, elytraTo, groundY, elytraProfile, elytraAspect, 0.4, 0)
  const pronotumTop = domeSurfacePoint(pronotumFrom, pronotumTo, groundY, pronotumProfile, pronotumAspect, 0.5, 0)
  const midSpot = domeSurfacePoint(elytraFrom, elytraTo, groundY, elytraProfile, elytraAspect, sideSpots[1].t, sideSpots[1].theta)

  const anchors: Record<string, THREE.Vector3> = {
    elytra: elytraTop.pos,
    spot: midSpot.pos,
    head: new THREE.Vector3(headTo.x, headTo.y, 0),
    leg: new THREE.Vector3(legMid.base[0], legMid.base[1] - 0.1, legMid.base[2] + 0.08),
    antenna: new THREE.Vector3(...antennaBase),
    pronotum: pronotumTop.pos,
  }

  return finalize(g, anchors)
}
