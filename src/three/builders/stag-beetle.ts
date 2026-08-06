/**
 * 中华大锹甲 Dorcus hopei（鞘翅目·锹甲科）
 *
 * 造型要点：
 * - 本种全部辨识度都压在那对鹿角状大颚上：粗壮、有弧度、内缘带齿，
 *   静止时张开成钳形（而非虎甲那种交叉的镰刀）。用 stagMandible()
 *   自写路径——基部先随前伸逐渐外张，后 40% 加速向内钩转，钩转
 *   同时略带上扬，做出真正的"钩"而不是一根直刺；内缘挂 3 枚齿，
 *   中段一枚最大，两侧各配一枚小的。
 * - 锹甲的前胸背板宽而方，与金龟子那种收成梯形尖的前胸不同——
 *   spindle() 的 taperStart/taperEnd 因此都给得很高（0.78~0.82），
 *   让两端半径不收到尖，读成方正的盾板而不是纺锤。
 * - 膝状触角（柄节直伸后急转）末端膨大成栉状小叶，是金龟总科的
 *   通用特征。kit.antenna() 的 'geniculate' 分支只画折线主干、不
 *   加末端小叶（那是 'lamellate' 分支的专利），因此本文件复刻了
 *   kit 内部 geniculate 的肘点/末段方向公式来算出准确的触角尖位置，
 *   再手动贴 3 片小叶——公式来源见 clubbedGeniculateAntenna() 注释。
 * - 体色乌黑发亮，鞘翅刻意比独角仙的更光滑更亮：不走 elytra() 固定
 *   的 gloss=0.74，改用 chitin() 直接把 gloss 提到 0.88，但 clearcoat
 *   仍压在与 elytra() 相同的 0.55 上限——踩过的坑：调高 clearcoat
 *   会在正对光角度整片过曝成灰白。
 */
import * as THREE from 'three'
import {
  antenna,
  chitin,
  finalize,
  legPair,
  loft,
  spindle,
  type AntennaSpec,
  type InsectModel,
  type LegSpec,
  type Section,
} from './kit'

// ---------------------------------------------------------------- 局部工具

/**
 * 鹿角状大颚：基部随前伸缓缓外张，后 40% 加速向内钩转并略带上扬，
 * 内缘挂 3 枚递减齿突（中段一枚最大）。两侧独立生成，天然张开成钳形。
 */
function stagMandible(base: THREE.Vector3, side: 1 | -1, length: number, thickness: number, material: THREE.Material): THREE.Group {
  const g = new THREE.Group()
  const z0 = base.z
  const zFlare = z0 + length * 0.16 // 外张后的峰值半宽
  const zHook = z0 + length * 0.05 // 钩回后的末端半宽——仍与 z0 同号，张而不交叉

  const smooth = (t: number) => {
    const x = Math.min(1, Math.max(0, t))
    return x * x * (3 - 2 * x)
  }

  const steps = 20
  const path: THREE.Vector3[] = []
  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    const widen = smooth(Math.min(1, t / 0.6))
    const curl = t < 0.6 ? 0 : smooth((t - 0.6) / 0.4)
    const zAbs = z0 + (zFlare - z0) * widen - (zFlare - zHook) * curl
    const lift = length * 0.11 * curl // 钩转段同时略微上扬，做出立体的"钩"
    path.push(new THREE.Vector3(base.x + length * t, base.y + lift, side * zAbs))
  }

  const sections: Section[] = path.map((p, i) => {
    const t = i / steps
    const r = thickness * (1 - t * 0.58)
    return { at: p, ry: r * 0.86, rz: r }
  })
  const shaft = new THREE.Mesh(loft(sections, 14), material)
  shaft.name = 'mandible'
  g.add(shaft)

  // 内缘齿突：中段一枚最大，两侧各配一枚较小的，都朝身体中线方向凸出
  for (const [tt, scale] of [
    [0.3, 0.62],
    [0.44, 1.0],
    [0.58, 0.7],
  ] as const) {
    const idx = Math.round(tt * steps)
    const p = path[idx]
    const toothLen = thickness * 1.15 * scale
    const tip = p.clone().add(new THREE.Vector3(toothLen * 0.15, -toothLen * 0.2, -side * toothLen * 1.05))
    g.add(
      new THREE.Mesh(
        loft([{ at: p, ry: thickness * 0.4 * scale, rz: thickness * 0.4 * scale }, { at: tip, ry: 0.004, rz: 0.004 }], 8),
        material,
      ),
    )
  }
  return g
}

/**
 * 膝状触角 + 末端栉状小叶。主干直接复用 kit.antenna({kind:'geniculate'})；
 * 末端小叶位置需要肘点/末段方向，这两个量 kit 内部算完就丢了，
 * 因此这里照抄 kit.ts 里 geniculate 分支的公式重新推一遍（仅用于
 * 定位小叶，不影响主干本身的网格，与主干视觉上严丝合缝）。
 */
function clubbedGeniculateAntenna(spec: AntennaSpec, material: THREE.Material): THREE.Group {
  const g = new THREE.Group()
  g.add(antenna(spec, material))

  const pitch = THREE.MathUtils.degToRad(spec.pitch ?? 32)
  const yaw = THREE.MathUtils.degToRad(spec.yaw ?? 22)
  const base = new THREE.Vector3(...spec.base)
  const dir = new THREE.Vector3(Math.cos(pitch) * Math.cos(yaw), Math.sin(pitch), Math.cos(pitch) * Math.sin(yaw))
  const elbow = base.clone().addScaledVector(dir, spec.length * 0.45)
  const dir2 = new THREE.Vector3(Math.cos(yaw * 1.8), -0.18, Math.sin(yaw * 1.8)).normalize()
  const tip = elbow.clone().addScaledVector(dir2, spec.length * 0.55)

  const up = new THREE.Vector3(0, 1, 0)
  let sideVec = new THREE.Vector3().crossVectors(dir2, up)
  if (sideVec.lengthSq() < 1e-8) sideVec = new THREE.Vector3(0, 0, 1)
  sideVec.normalize()

  for (let i = 0; i < 3; i++) {
    const plate = new THREE.Mesh(new THREE.SphereGeometry(spec.length * 0.11, 10, 8), material)
    plate.scale.set(1, 0.18, 0.56)
    plate.position.copy(tip).addScaledVector(dir2, i * spec.length * 0.05).addScaledVector(sideVec, spec.length * 0.045)
    plate.rotation.z = Math.PI * 0.12
    g.add(plate)
  }
  return g
}

function clubbedGeniculateAntennaPair(spec: AntennaSpec, material: THREE.Material): THREE.Group {
  const g = new THREE.Group()
  g.add(clubbedGeniculateAntenna(spec, material))
  g.add(clubbedGeniculateAntenna({ ...spec, base: [spec.base[0], spec.base[1], -spec.base[2]], yaw: -(spec.yaw ?? 22) }, material))
  return g
}

export function buildStagBeetle(): InsectModel {
  const g = new THREE.Group()

  const bodyMat = chitin({ color: '#0c0c0d', gloss: 0.62, metal: 0.08, clearcoat: 0.4 })
  // 鞘翅比独角仙更光滑更亮：不用 elytra()（gloss 固定 0.74），
  // 直接 chitin() 把 gloss 提到 0.88；clearcoat 仍压在 0.55 的安全上限
  const shellMat = chitin({ color: '#050506', gloss: 0.88, metal: 0.12, clearcoat: 0.55 })
  const mandibleMat = chitin({ color: '#08080a', gloss: 0.72, metal: 0.16, clearcoat: 0.44 })
  const legMat = chitin({ color: '#0a0a0b', gloss: 0.58, metal: 0.1, clearcoat: 0.36 })

  // ---- 腹面体躯：比独角仙更扁更宽（flat 更大）
  const belly = new THREE.Mesh(
    spindle([-2.7, 0.0, 0], [0.05, 0.05, 0], 0.95, { bulge: 0.4, flat: 1.35, taperStart: 0.12, taperEnd: 0.5 }),
    bodyMat,
  )
  belly.name = 'trunk'
  g.add(belly)

  // ---- 鞘翅：宽而扁平（不像金龟子那样高高隆起），光滑发亮
  const eSteps = 22
  const elytronSections: Section[] = []
  for (let i = 0; i <= eSteps; i++) {
    const t = i / eSteps
    const w = Math.sin(Math.pow(t, 0.6) * Math.PI * 0.9) * 0.9
    elytronSections.push({
      at: new THREE.Vector3(0.7 - 3.3 * t, 0.44 - 0.2 * t * t, 0),
      ry: Math.max(w * 0.52, 0.02),
      rz: Math.max(w * 0.5, 0.02),
    })
  }
  for (const side of [1, -1] as const) {
    const shell = new THREE.Mesh(loft(elytronSections, 26), shellMat)
    shell.position.z = side * 0.3
    shell.scale.set(1, 1.0, 1.08) // 宽扁：横向拉宽而非纵向拔高
    g.add(shell)
  }

  // ---- 小盾片
  const scutellum = new THREE.Mesh(
    spindle([0.72, 0.5, 0], [0.2, 0.5, 0], 0.22, { bulge: 0.15, flat: 1.35, taperStart: 0.9, taperEnd: 0.05 }),
    bodyMat,
  )
  g.add(scutellum)

  // ---- 前胸背板：宽而方，taperStart/taperEnd 都拉高，两端不收尖
  const pronotum = new THREE.Mesh(
    spindle([0.5, 0.14, 0], [1.78, 0.28, 0], 0.74, { bulge: 0.5, flat: 1.4, taperStart: 0.82, taperEnd: 0.78 }),
    bodyMat,
  )
  pronotum.scale.set(1, 0.9, 1)
  pronotum.name = 'trunk'
  g.add(pronotum)

  // ---- 头部
  const head = new THREE.Mesh(
    spindle([1.7, 0.2, 0], [2.15, 0.24, 0], 0.4, { bulge: 0.45, flat: 1.05, taperStart: 0.7, taperEnd: 0.5 }),
    bodyMat,
  )
  head.name = 'trunk'
  g.add(head)

  // ---- 鹿角状大颚：长度约体长（不含颚，即 trunk）的 40%
  g.add(stagMandible(new THREE.Vector3(2.1, 0.22, 0.3), 1, 1.9, 0.19, mandibleMat))
  g.add(stagMandible(new THREE.Vector3(2.1, 0.22, 0.3), -1, 1.9, 0.19, mandibleMat))

  // ---- 膝状触角，末端栉状小叶
  g.add(clubbedGeniculateAntennaPair({ base: [2.05, 0.15, 0.22], length: 0.75, kind: 'geniculate', pitch: 15, yaw: 40, thickness: 0.035 }, legMat))

  // ---- 三对粗壮足，前足胫节外缘有齿
  const legSpecs: LegSpec[] = [
    { base: [1.3, -0.12, 0.55], femur: 0.85, tibia: 0.9, thickness: 0.1, splay: 32, sweep: -36, knee: 72, spines: true },
    { base: [0.4, -0.18, 0.62], femur: 0.95, tibia: 1.05, thickness: 0.1, splay: 28, sweep: 6, knee: 76, spines: true },
    { base: [-0.5, -0.18, 0.58], femur: 1.05, tibia: 1.2, thickness: 0.11, splay: 26, sweep: 42, knee: 80, spines: true },
  ]
  const legRigs = legSpecs.map((spec) => legPair(spec, legMat))
  for (const rig of legRigs) g.add(rig)
  const midLegTip = (legRigs[1].children[0] as THREE.Group).userData.tip as THREE.Vector3

  const anchors: Record<string, THREE.Vector3> = {
    mandible: new THREE.Vector3(3.0, 0.28, 0.25),
    elytra: new THREE.Vector3(-1.0, 0.7, 0.4),
    head: new THREE.Vector3(1.92, 0.32, 0),
    antenna: new THREE.Vector3(2.5, 0.35, 0.5),
    leg: midLegTip.clone(),
    pronotum: new THREE.Vector3(1.1, 0.98, 0),
  }

  return finalize(g, anchors)
}
