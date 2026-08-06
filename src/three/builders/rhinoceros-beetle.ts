/**
 * 双叉犀金龟（独角仙）Trypoxylus dichotomus
 *
 * 造型要点：头上一支末端分叉的长角、前胸背板一支向前下方弯的短角、
 * 高度隆起的椭圆鞘翅，以及金龟总科特有的鳃叶状触角。
 */
import * as THREE from 'three'
import {
  antennaPair,
  chitin,
  compoundEyePair,
  elytra,
  finalize,
  legPair,
  loft,
  spindle,
  type InsectModel,
  type Section,
} from './kit'

/** 犀角：一根向前上方伸出、末端分叉成两枝的角 */
function hornY(
  base: THREE.Vector3,
  length: number,
  material: THREE.Material,
  opts: { pitch: number; curve: number; thickness: number; forkAngle: number; forkLen: number },
): THREE.Group {
  const g = new THREE.Group()
  const pitch = THREE.MathUtils.degToRad(opts.pitch)

  // 主干：一条向上弧起的曲线
  const steps = 16
  const path: THREE.Vector3[] = []
  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    path.push(
      new THREE.Vector3(
        base.x + Math.cos(pitch) * length * t,
        base.y + Math.sin(pitch) * length * t + opts.curve * length * t * t,
        base.z,
      ),
    )
  }
  const sections: Section[] = path.map((p, i) => {
    const t = i / steps
    const r = opts.thickness * (1 - t * 0.62)
    return { at: p, ry: r, rz: r * 0.78 } // 角略侧扁
  })
  g.add(new THREE.Mesh(loft(sections, 18), material))

  // 末端分叉：两枝向左右上方岔开
  const tip = path[path.length - 1]
  const dir = new THREE.Vector3().subVectors(tip, path[path.length - 3]).normalize()
  const fork = THREE.MathUtils.degToRad(opts.forkAngle)
  for (const side of [1, -1]) {
    const fs: Section[] = []
    const fsteps = 10
    for (let i = 0; i <= fsteps; i++) {
      const t = i / fsteps
      const p = tip
        .clone()
        .addScaledVector(dir, opts.forkLen * t * 0.7)
        .add(new THREE.Vector3(0, opts.forkLen * t * 0.42, side * Math.sin(fork) * opts.forkLen * t))
      fs.push({ at: p, ry: opts.thickness * 0.42 * (1 - t * 0.92), rz: opts.thickness * 0.34 * (1 - t * 0.92) })
    }
    g.add(new THREE.Mesh(loft(fs, 12), material))
  }
  return g
}

export function buildRhinocerosBeetle(): InsectModel {
  const g = new THREE.Group()

  // 体色是深栗褐而非纯黑：活体在阳光下偏红棕，纯黑会让所有结构糊成一团剪影。
  // 清漆层压到 0.5 以下，否则米色背景下的高光会盖掉鞘翅的隆起感。
  const bodyMat = chitin({ color: '#4a2c1a', gloss: 0.58, clearcoat: 0.34 })
  const shellMat = elytra('#6d4025', 0.14)
  const hornMat = chitin({ color: '#3d2314', gloss: 0.7, clearcoat: 0.5 })
  const legMat = chitin({ color: '#3a2114', gloss: 0.5, clearcoat: 0.3 })

  // ---- 腹面体躯（被鞘翅覆盖的部分）
  const belly = new THREE.Mesh(
    spindle([-2.55, 0.02, 0], [0.75, 0.1, 0], 0.8, { bulge: 0.4, flat: 1.12, taperStart: 0.12, taperEnd: 0.5 }),
    bodyMat,
  )
  g.add(belly)

  // ---- 鞘翅：两片高度隆起的硬壳，中缝在背中线
  const elytronSections: Section[] = []
  const eSteps = 22
  for (let i = 0; i <= eSteps; i++) {
    const t = i / eSteps
    // 前宽后收的卵圆，末端圆钝
    const w = Math.sin(Math.pow(t, 0.62) * Math.PI * 0.92) * 0.86
    elytronSections.push({
      at: new THREE.Vector3(0.72 - 3.25 * t, 0.5 - 0.24 * t * t, 0),
      // 单片鞘翅的横截面是「外侧高、内侧低」的半个穹顶，不是一个正圆管。
      // 压扁 rz 并把两片靠拢，合起来才读成一个卵圆的背甲；
      // 两片离得太远会各自读成一个球。
      ry: Math.max(w * 0.62, 0.02),
      rz: Math.max(w * 0.42, 0.02),
    })
  }
  for (const side of [1, -1]) {
    const shell = new THREE.Mesh(loft(elytronSections, 26), shellMat)
    shell.position.z = side * 0.29
    shell.scale.set(1, 1.06, 1.05)
    g.add(shell)
  }

  // ---- 小盾片：两鞘翅基部之间的三角形小片，鞘翅目的通用识别点
  const scutellum = new THREE.Mesh(
    spindle([0.74, 0.62, 0], [0.24, 0.6, 0], 0.24, { bulge: 0.15, flat: 1.35, taperStart: 0.9, taperEnd: 0.05 }),
    bodyMat,
  )
  g.add(scutellum)

  // ---- 前胸背板：厚实的梯形盾，是犀金龟最壮的部位
  const pronotum = new THREE.Mesh(
    spindle([0.55, 0.16, 0], [1.72, 0.3, 0], 0.66, { bulge: 0.5, flat: 1.08, taperStart: 0.7, taperEnd: 0.45 }),
    bodyMat,
  )
  pronotum.scale.set(1, 0.92, 1)
  g.add(pronotum)

  // ---- 头部
  const head = new THREE.Mesh(
    spindle([1.68, 0.22, 0], [2.34, 0.28, 0], 0.36, { bulge: 0.5, flat: 1.0, taperStart: 0.8, taperEnd: 0.55 }),
    bodyMat,
  )
  g.add(head)

  // ---- 头角：长，末端分叉（本种得名「双叉」之处）
  // 角是本种的招牌，必须够粗：真实个体的角基直径接近头宽的一半，
  // 细长的角会读成触角而不是武器。弧度也要足，末端要明显向上翘回来。
  const headHorn = hornY(new THREE.Vector3(2.18, 0.4, 0), 2.25, hornMat, {
    pitch: 24,
    curve: 0.52,
    thickness: 0.3,
    forkAngle: 40,
    forkLen: 0.95,
  })
  g.add(headHorn)

  // ---- 胸角：较短，自前胸背板前缘向前伸并向下弯，与头角形成夹钳
  const thoraxHorn = hornY(new THREE.Vector3(1.5, 0.74, 0), 1.05, hornMat, {
    pitch: 4,
    curve: -0.34,
    thickness: 0.21,
    forkAngle: 30,
    forkLen: 0.55,
  })
  g.add(thoraxHorn)

  // ---- 复眼：犀金龟复眼小，被头部侧缘分割
  g.add(
    compoundEyePair({
      at: [2.05, 0.28, 0.3],
      radius: 0.13,
      color: '#171012',
      flatten: 0.86,
      facets: true,
    }),
  )

  // ---- 鳃叶状触角
  g.add(
    antennaPair(
      { base: [2.22, 0.12, 0.18], length: 0.5, kind: 'lamellate', pitch: -8, yaw: 34, thickness: 0.035 },
      hornMat,
    ),
  )

  // ---- 三对足：粗壮，前足胫节有齿（挖掘用）
  g.add(legPair({ base: [1.22, -0.1, 0.5], femur: 0.95, tibia: 1.0, splay: 34, sweep: -38, knee: 74, thickness: 0.09, spines: true }, legMat))
  g.add(legPair({ base: [0.42, -0.16, 0.56], femur: 1.05, tibia: 1.15, splay: 30, sweep: 4, knee: 78, thickness: 0.095, spines: true }, legMat))
  g.add(legPair({ base: [-0.42, -0.16, 0.54], femur: 1.2, tibia: 1.35, splay: 26, sweep: 40, knee: 82, thickness: 0.1, spines: true }, legMat))

  const anchors: Record<string, THREE.Vector3> = {
    horn: new THREE.Vector3(3.9, 1.6, 0),
    thoraxHorn: new THREE.Vector3(2.5, 0.78, 0),
    elytra: new THREE.Vector3(-1.1, 1.05, 0.42),
    eye: new THREE.Vector3(2.1, 0.32, 0.42),
    antenna: new THREE.Vector3(2.5, 0.2, 0.52),
    foreleg: new THREE.Vector3(1.5, -0.75, 1.15),
    pronotum: new THREE.Vector3(1.1, 0.92, 0),
  }

  return finalize(g, anchors)
}
