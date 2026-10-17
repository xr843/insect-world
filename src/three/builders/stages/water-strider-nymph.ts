/**
 * 水黾 Aquarius elongatus · 中龄若虫，5 龄中的中期表现。
 * 体长 8.1 mm（同科 7–9 mm 记录推算，非本种实测），灰褐、无翅无翅芽。
 * 长中足侧展，略短的后足后掠，短前足抓握；比例接近成虫，绝非六条等长足。
 * 中足 sweep=-8°、后足=53°，使 home 默认斜视下四条长足仍分得开。
 * 膝角 26°/25° 使四个长足末梢落在躯干下方近似共面，避免身体倒挂。
 * 足端用同色细毛示意疏水毛，不能把显微结构夸大成白色刷子。
 * 主体用外向球面几何，腹部软肋直接变形在体壁上，两端连续收圆。
 * 单位 cm，+X 前、+Y 上、+Z 右。
 */
import * as THREE from 'three'
import {
  antennaPair, chitin, compoundEyePair, finalize, leg, loft, mirrorZ, rostrum,
  type InsectModel, type LegSpec,
} from '../kit'

function ellipsoid(name: string, at: [number, number, number], radii: [number, number, number], material: THREE.Material): THREE.Mesh {
  const geo = new THREE.SphereGeometry(1, 40, 28)
  if (name === 'abdomen') {
    const p = geo.getAttribute('position')
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i)
      // 七道浅节沟，幅度仅半径 4%；正弦淡出圆端，避免尾端硬切。
      const ripple = 1 - 0.04 * Math.pow(Math.sin((x + 1) * Math.PI * 3.5), 6) * (1 - x * x)
      p.setXYZ(i, x, p.getY(i) * ripple, p.getZ(i) * ripple)
    }
    geo.computeVertexNormals()
  }
  const m = new THREE.Mesh(geo, material)
  m.name = name
  m.position.set(...at)
  m.scale.set(...radii)
  return m
}

function paddlingLeg(name: string, spec: LegSpec, mat: THREE.Material): THREE.Group {
  const one = leg(spec, mat)
  one.name = name
  const coxa = one.children[0], femur = coxa.children[0], tibia = femur.children[0], tarsus = tibia.children[0]
  for (const [joint, label] of [[femur, 'femur'], [tibia, 'tibia'], [tarsus, 'tarsus']] as const) {
    const parts = joint.children.filter(o => (o as THREE.Mesh).isMesh)
    parts[0].name = label
    for (const m of parts.slice(1)) m.name = 'joint'
  }
  if (name !== 'foreleg') {
    one.updateMatrixWorld(true)
    const tip = one.userData.tip as THREE.Vector3
    const knee = one.userData.knee as THREE.Vector3
    const axis = tip.clone().sub(knee).normalize()
    const lateral = new THREE.Vector3(-axis.z, 0, axis.x).normalize()
    for (let i = 0; i < 5; i++) {
      const end = tip.clone().addScaledVector(axis, 0.035).addScaledVector(lateral, (i - 2) * 0.008)
      const hair = new THREE.Mesh(loft([
        { at: tarsus.worldToLocal(tip.clone()), ry: 0.0012, rz: 0.0012 },
        { at: tarsus.worldToLocal(end.clone()), ry: 0.0003, rz: 0.0003 },
      ], 5), mat)
      hair.name = 'hydrophobic-hair'
      // 随跗关节微动；挂整足根组会使毛簇留在静止足尖位置。
      tarsus.add(hair)
    }
  }
  return one
}

export function buildWaterStriderNymph(): InsectModel {
  const g = new THREE.Group()
  const bodyMat = chitin({ color: '#736b5c', gloss: 0.25, clearcoat: 0.06 })
  const legMat = chitin({ color: '#706759', gloss: 0.22 })
  g.add(ellipsoid('head', [0.35, 0.01, 0], [0.06, 0.048, 0.058], bodyMat))
  g.add(ellipsoid('thorax', [0.135, 0, 0], [0.18, 0.051, 0.061], bodyMat))
  g.add(ellipsoid('abdomen', [-0.19, -0.006, 0], [0.21, 0.043, 0.063], bodyMat))

  const eyes = compoundEyePair({ at: [0.365, 0.022, 0.049], radius: 0.032, color: '#282722', flatten: 0.8 })
  eyes.traverse(o => { if ((o as THREE.Mesh).isMesh) o.name = 'eye' })
  g.add(eyes)
  const ants = antennaPair({ base: [0.399, 0.012, 0.028], length: 0.27, thickness: 0.0045, kind: 'filiform', pitch: 10, yaw: 32 }, legMat)
  ants.traverse(o => { if ((o as THREE.Mesh).isMesh) o.name = 'antenna' })
  g.add(ants)
  const beak = rostrum({ at: [0.385, -0.018, 0], length: 0.125, thickness: 0.008, angle: 70 }, bodyMat)
  beak.traverse(o => { if ((o as THREE.Mesh).isMesh) o.name = 'rostrum' })
  g.add(beak)

  const fore = paddlingLeg('foreleg', {
    base: [0.255, -0.024, 0.041], femur: 0.18, tibia: 0.16, tarsus: 0.065,
    thickness: 0.011, splay: 28, sweep: -48, knee: 65, ankle: 45,
  }, legMat)
  const mid = paddlingLeg('midleg', {
    base: [0.07, -0.025, 0.047], femur: 0.65, tibia: 0.60, tarsus: 0.25,
    thickness: 0.010, splay: 16, sweep: -8, knee: 26, ankle: 10,
  }, legMat)
  const hind = paddlingLeg('hindleg', {
    base: [-0.065, -0.025, 0.045], femur: 0.56, tibia: 0.52, tarsus: 0.22,
    thickness: 0.009, splay: 15, sweep: 53, knee: 25, ankle: 12,
  }, legMat)
  for (const one of [fore, mid, hind]) g.add(mirrorZ(one))

  // 全部复用成虫语义，且取几何表面位置；卵则只用专属键。
  return finalize(g, {
    body: new THREE.Vector3(0.135, 0.051, 0),
    eye: new THREE.Vector3(0.365, 0.022, 0.075),
    antenna: new THREE.Vector3(0.399, 0.012, 0.028),
    foreleg: (fore.userData.tip as THREE.Vector3).clone(),
    midleg: (mid.userData.tip as THREE.Vector3).clone(),
    hindleg: (hind.userData.tip as THREE.Vector3).clone(),
  })
}
