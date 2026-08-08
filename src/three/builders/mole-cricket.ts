/**
 * 东方蝼蛄 Gryllotalpa orientalis
 *
 * 造型要点：
 * - 挖掘用前足是全部辨识度所在：胫节特化成极度宽扁、末端带 4 个粗壮
 *   指状齿突的铲状构造，像鼹鼠的手。kit.leg()/kit.legPair() 只会生成
 *   粗细均匀的直腿，做不出"从窄圆管突然变成宽扁铲子"的截面突变，
 *   所以前足完全自建（diggingForeleg()，直接沿一条自定义方向放样，
 *   不走 kit.leg() 的髋/膝/踝折线模型）。
 * - 圆筒形身体，前胸背板异常宽大、呈盾形穹顶，几乎盖住头部——
 *   本文件把它建成一个明显比头部大一圈的高鼓 spindle，前缘略压过
 *   头部后半，制造"戴头盔"的观感。
 * - 天鹅绒质感：材质给高 roughness（低 gloss）+ 少量（约 50 根）短毛
 *   几何，不像蜜蜂那样密植（蝼蛄绒毛没那么显著，量少但要有）。
 * - 后足是普通行走足（蝼蛄不擅跳），用 kit.legPair() 常规比例即可，
 *   不能做成蝗虫那种粗大跳跃腿。
 * - 短翅：前翅（覆翅）短小，后翅膜质部分折叠后从腹端伸出两根细长的
 *   "尾丝"——这里用 kit.antenna() 的 filiform 类型复用（它本质就是
 *   一条渐细的弯曲细管，尾丝和触角在几何上是同一回事）。
 */
import * as THREE from 'three'
import {
  antennaPair,
  chitin,
  compoundEyePair,
  finalize,
  legPair,
  loft,
  spindle,
  wingPair,
  type InsectModel,
  type Section,
  type WingSpec,
} from './kit'

// ---------------------------------------------------------------- 局部辅助

function tubeSeg(a: THREE.Vector3, b: THREE.Vector3, r0: number, r1: number, mat: THREE.Material, radial = 12): THREE.Mesh {
  return new THREE.Mesh(loft([{ at: a, ry: r0, rz: r0 }, { at: b, ry: r1, rz: r1 }], radial), mat)
}

/**
 * 挖掘前足（一侧）：短粗的基节+腿节，接一段急剧变宽变扁的铲形胫节，
 * 末端 4 个指状齿突呈扇形分布。side=1/-1 直接决定各方向分量的正负，
 * 不依赖 kit 的镜像机制，方便精确导出 base→tip 的轴线供测试量取宽度。
 */
function diggingForeleg(
  base: THREE.Vector3,
  side: 1 | -1,
  bodyMat: THREE.Material,
  toothMat: THREE.Material,
): { group: THREE.Group; tip: THREE.Vector3 } {
  const g = new THREE.Group()
  const dir = new THREE.Vector3(0.62, -0.34, side * 0.52).normalize()

  // 基节：短粗
  const coxaLen = 0.13
  const coxaEnd = base.clone().addScaledVector(dir, coxaLen)
  g.add(tubeSeg(base, coxaEnd, 0.115, 0.105, bodyMat))

  // 腿节：短，略微增粗，为铲形胫节提供有力的"手腕"
  const femurLen = 0.3
  const femurEnd = coxaEnd.clone().addScaledVector(dir, femurLen)
  g.add(tubeSeg(coxaEnd, femurEnd, 0.105, 0.1, bodyMat))

  // 铲形胫节：沿 dir 继续延伸，rz(宽) 与 ry(厚) 都急剧增大——
  // 铲宽在远端逼近其自身长度的 0.6 倍
  const shovelLen = 0.48
  const steps = 12
  const sections: Section[] = []
  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    const p = femurEnd.clone().addScaledVector(dir, shovelLen * t)
    const widthT = Math.sin(Math.min(1, t / 0.82) * Math.PI * 0.5)
    const ry = THREE.MathUtils.lerp(0.095, 0.15, widthT)
    const rz = THREE.MathUtils.lerp(0.095, 0.29, widthT)
    sections.push({ at: p, ry: Math.max(ry, 0.02), rz: Math.max(rz, 0.02) })
  }
  const shovelMesh = new THREE.Mesh(loft(sections, 14), bodyMat)
  shovelMesh.name = side === 1 ? 'foreleg-shovel-r' : 'foreleg-shovel-l'
  g.add(shovelMesh)
  const palmEnd = femurEnd.clone().addScaledVector(dir, shovelLen)

  // 4 个指状齿突：在铲的远端边缘呈扇形分布，沿"侧向"轴展开
  const upHint = new THREE.Vector3(0, 1, 0)
  const fan = new THREE.Vector3().crossVectors(dir, upHint).normalize() // 展开轴，近似垂直于 dir 与竖直方向
  let farthest = palmEnd.clone()
  for (let i = 0; i < 4; i++) {
    const frac = (i - 1.5) / 1.5 // -1, -1/3, 1/3, 1
    const toothBase = palmEnd.clone().addScaledVector(fan, frac * 0.16)
    const toothTip = toothBase.clone().addScaledVector(dir, 0.17).addScaledVector(fan, frac * 0.045)
    const toothMesh = new THREE.Mesh(
      loft([{ at: toothBase, ry: 0.05, rz: 0.046 }, { at: toothTip, ry: 0.013, rz: 0.013 }], 8),
      toothMat,
    )
    toothMesh.name = side === 1 ? 'foreleg-shovel-r' : 'foreleg-shovel-l'
    g.add(toothMesh)
    if (toothTip.distanceTo(base) > farthest.distanceTo(base)) farthest = toothTip.clone()
  }

  return { group: g, tip: farthest }
}

/** 少量天鹅绒短毛：Fibonacci 螺旋撒点，覆盖前胸盾片的穹顶上半部。数量刻意压低（约 50 根）。 */
function velvetFuzz(center: THREE.Vector3, radii: THREE.Vector3, count: number, material: THREE.Material): THREE.Group {
  const g = new THREE.Group()
  const golden = Math.PI * (3 - Math.sqrt(5))
  for (let i = 0; i < count; i++) {
    const yFrac = 1 - (i + 0.5) / count
    const ringR = Math.sqrt(Math.max(0, 1 - yFrac * yFrac))
    const theta = i * golden
    const nx = Math.cos(theta) * ringR
    const nz = Math.sin(theta) * ringR
    const ny = yFrac
    const p = new THREE.Vector3(center.x + nx * radii.x, center.y + ny * radii.y, center.z + nz * radii.z)
    const n = new THREE.Vector3(nx / radii.x, ny / radii.y, nz / radii.z).normalize()
    const jitter = Math.sin(i * 12.9898) * 43758.5453
    const len = 0.028 + 0.016 * (jitter - Math.floor(jitter))
    const hair = new THREE.Mesh(new THREE.ConeGeometry(0.005, len, 5), material)
    hair.position.copy(p).addScaledVector(n, len * 0.45)
    hair.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), n)
    g.add(hair)
  }
  return g
}

// ---------------------------------------------------------------- 主体

export const FORE_BASE: [number, number, number] = [1.55, -0.08, 0.3]

export function buildMoleCricket(): InsectModel {
  const g = new THREE.Group()

  const bodyMat = chitin({ color: '#8a6a3c', gloss: 0.14, clearcoat: 0.04, surface: 'velvet' }) // 高 roughness，天鹅绒质感；B轮绒面组：通体天鹅绒
  const darkMat = chitin({ color: '#4a3620', gloss: 0.22, surface: 'velvet' })
  const toothMat = chitin({ color: '#3f2d1a', gloss: 0.35 })
  const legMat = chitin({ color: '#7a5c34', gloss: 0.2, surface: 'velvet' })
  const fuzzMat = chitin({ color: '#a4835a', gloss: 0.06 })
  const eyeColor = '#241a10'
  const wingMat = chitin({ color: '#5c4526', gloss: 0.3, clearcoat: 0.1, surface: 'velvet' })
  const veinMat = chitin({ color: '#3a2a16', gloss: 0.25 })

  // ---- 头部：小，大半会被前胸背板盾片盖住
  const headFrontX = 1.85
  const headBackX = 1.55
  const head = new THREE.Mesh(
    spindle([headFrontX, 0.14, 0], [headBackX, 0.16, 0], 0.24, { bulge: 0.45, flat: 1.0, taperStart: 0.5, taperEnd: 0.75 }),
    bodyMat,
  )
  g.add(head)

  // ---- 复眼：小而不显眼（蝼蛄穴居，视觉退化）
  g.add(compoundEyePair({ at: [1.68, 0.18, 0.2], radius: 0.075, color: eyeColor, flatten: 0.85 }))

  // ---- 触角：短-中等丝状
  const antBase: [number, number, number] = [1.86, 0.16, 0.1]
  g.add(antennaPair({ base: antBase, length: 0.85, kind: 'filiform', pitch: 14, yaw: 30, thickness: 0.016 }, darkMat))

  // ---- 前胸背板：特别大且呈盾形，前缘压过头部后半——"戴头盔"的观感来源
  const pronotumFrontX = 1.72
  const pronotumBackX = 0.5
  const pronotum = new THREE.Mesh(
    spindle([pronotumFrontX, 0.22, 0], [pronotumBackX, 0.24, 0], 0.5, {
      bulge: 0.42,
      flat: 1.1,
      taperStart: 0.55,
      taperEnd: 0.4,
    }),
    bodyMat,
  )
  pronotum.name = 'pronotum-shield'
  g.add(pronotum)
  g.add(velvetFuzz(new THREE.Vector3(1.1, 0.34, 0), new THREE.Vector3(0.58, 0.24, 0.42), 50, fuzzMat))

  // ---- 圆筒形身体（腹部）：粗细相对均匀，只在两端略收，符合"圆筒形"而非蝗虫式尖锥腹
  const abdomenFromX = 0.5
  const abdomenTipX = -1.45
  g.add(
    new THREE.Mesh(
      loft(
        (() => {
          const from = new THREE.Vector3(abdomenFromX, 0.16, 0)
          const to = new THREE.Vector3(abdomenTipX, 0.1, 0)
          const steps = 24
          const sections: Section[] = []
          for (let i = 0; i <= steps; i++) {
            const t = i / steps
            const taperEnd = t > 0.78 ? 1 - ((t - 0.78) / 0.22) * 0.72 : 1
            const taperStart = t < 0.06 ? 0.7 + 0.3 * (t / 0.06) : 1
            const r = 0.4 * taperStart * taperEnd
            sections.push({ at: new THREE.Vector3().lerpVectors(from, to, t), ry: r / 1.08, rz: r * 1.08 })
          }
          return sections
        })(),
        24,
      ),
      bodyMat,
    ),
  )

  // ---- 短翅（覆翅）：小，折叠贴在腹部前段背面
  const wingOutline: [number, number][] = [
    [0, 0.3],
    [0.2, 0.75],
    [0.5, 1.0],
    [0.8, 0.7],
    [1, 0.18],
  ]
  const wingSpec: WingSpec = {
    base: [0.45, 0.32, 0.16],
    length: 0.72,
    width: 0.52,
    outline: wingOutline,
    spread: -100,
    tilt: 8,
    sweep: 0,
  }
  g.add(wingPair(wingSpec, wingMat, veinMat, 6))

  // ---- 尾丝：后翅膜质部分折叠后从腹端伸出的两根细长丝，复用 filiform 触角几何
  const cerciBase: [number, number, number] = [abdomenTipX + 0.05, 0.02, 0.1]
  g.add(antennaPair({ base: cerciBase, length: 1.15, kind: 'filiform', pitch: -8, yaw: 22, thickness: 0.018 }, darkMat))

  // ---- 中足、后足：普通行走足，比例克制，不能做成跳跃腿
  g.add(legPair({ base: [0.42, -0.18, 0.42], femur: 0.5, tibia: 0.48, thickness: 0.05, splay: 26, sweep: 6, knee: 68 }, legMat))
  g.add(legPair({ base: [-0.15, -0.18, 0.4], femur: 0.55, tibia: 0.55, thickness: 0.052, splay: 24, sweep: 30, knee: 66 }, legMat))

  // ---- 挖掘前足：全物种的辨识核心
  const foreBaseR = new THREE.Vector3(...FORE_BASE)
  const foreBaseL = new THREE.Vector3(FORE_BASE[0], FORE_BASE[1], -FORE_BASE[2])
  const foreR = diggingForeleg(foreBaseR, 1, bodyMat, toothMat)
  const foreL = diggingForeleg(foreBaseL, -1, bodyMat, toothMat)
  g.add(foreR.group, foreL.group)

  const anchors: Record<string, THREE.Vector3> = {
    foreleg: foreR.tip,
    pronotum: new THREE.Vector3(1.1, 0.58, 0),
    wing: new THREE.Vector3(0.15, 0.55, 0.4),
    abdomen: new THREE.Vector3(-0.6, 0.22, 0),
    eye: new THREE.Vector3(1.68, 0.2, 0.28),
    antenna: new THREE.Vector3(antBase[0] + 0.5, antBase[1] + 0.15, antBase[2] + 0.15),
  }

  return finalize(g, anchors)
}
