/**
 * 海滨蠼螋 Labidura riparia · 早中龄若虫，无翅。
 * 1 = 1 cm，+X 前、+Y 背、+Z 右。头至腹末约 9.4 mm，尾铗约 1.3 mm，
 * 这是依据本种幼体照片与成虫比例推算的展示个体，不声称精确龄期或实测尺寸。
 * 宽扁分节腹、三对胸足、相对较大的头；淡褐而非成虫的深褐。
 * 尾铗近直且短，仅末梢微向内，不上翘成成虫的弯钳；两侧留缝供 home 机位辨认。
 * 本种照片/尺寸资料在测试文件头。没有沿用成虫文件头的 Anisolabis 异名。
 */
import * as THREE from 'three'
import { antennaPair, chitin, finalize, legPair, loft, type InsectModel, type Section } from '../kit'

export function buildEarwigNymph(): InsectModel {
  const g = new THREE.Group()
  const bodyMat = chitin({ color: '#aa8860', gloss: 0.34, clearcoat: 0.10 })
  const headMat = chitin({ color: '#94714e', gloss: 0.36 })
  const limbMat = chitin({ color: '#b2956c', gloss: 0.29 })
  const pincerMat = chitin({ color: '#96764f', gloss: 0.42 })
  const eyeMat = chitin({ color: '#302b23', gloss: 0.50 })

  /** loft 绕序向内：本阶段局部纠正 index，外法线保持，避免浅色凹陷着色。 */
  function solid(name: string, sections: Section[], mat: THREE.Material, radial = 24): THREE.Mesh {
    const geo = loft(sections, radial)
    const index = geo.index!
    for (let i = 0; i < index.count; i += 3) {
      const b = index.getX(i + 1)
      index.setX(i + 1, index.getX(i + 2))
      index.setX(i + 2, b)
    }
    geo.computeVertexNormals()
    const mesh = new THREE.Mesh(geo, mat)
    mesh.name = name
    g.add(mesh)
    return mesh
  }
  // 腹部绝大部分保持宽度；仅最后 12% 圆收，非整根线性收尖。
  const sections: Section[] = []
  for (let i = 0; i <= 80; i++) {
    const t = i / 80
    const envelope = 0.095 + 0.018 * Math.sin(t * Math.PI) - 0.009 * t
    const groove = 1 - 0.13 * Math.pow(Math.cos(t * Math.PI * 9), 12)
    const end = t > 0.88 ? Math.sqrt(Math.max(0, 1 - Math.pow((t - 0.88) / 0.12, 2))) : 1
    const w = Math.max(0.002, envelope * groove * end)
    sections.push({ at: new THREE.Vector3(0.10 - 0.56 * t, 0, 0), ry: w * 0.42, rz: w })
  }
  solid('abdomen', sections, bodyMat)

  // 胸部三节，每节宽而矮，足全部着生在胸侧；不用浅色关节贴片。
  for (const [front, back, width] of [[0.305, 0.215, 0.088], [0.224, 0.144, 0.082], [0.155, 0.085, 0.086]]) {
    solid('thorax', [
      { at: [front, 0, 0], ry: 0.023, rz: width * 0.79 },
      { at: [front - 0.015, 0.004, 0], ry: 0.034, rz: width },
      { at: [back + 0.014, 0.002, 0], ry: 0.032, rz: width },
      { at: [back, 0, 0], ry: 0.023, rz: width * 0.84 },
    ], bodyMat)
  }
  const head = new THREE.Mesh(new THREE.SphereGeometry(1, 28, 18), headMat)
  head.scale.set(0.093, 0.040, 0.096)
  head.position.set(0.387, 0.006, 0)
  head.name = 'head'
  g.add(head)
  for (const side of [1, -1] as const) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.019, 14, 10), eyeMat)
    eye.scale.set(1.1, 0.9, 0.6)
    eye.position.set(0.407, 0.018, side * 0.086)
    eye.name = 'eye'
    g.add(eye)
    const path: Section[] = []
    for (let i = 0; i <= 16; i++) {
      const t = i / 16
      const r = 0.015 * Math.pow(1 - t, 0.65) + 0.0008
      path.push({ at: [-0.446 - 0.139 * t, 0.003 + 0.003 * t, side * (0.056 - 0.010 * t * t)], ry: r * 0.78, rz: r })
    }
    solid('forceps', path, pincerMat, 14)
  }
  const antennae = antennaPair({ base: [0.445, 0.013, 0.064], length: 0.29, thickness: 0.0055,
    kind: 'filiform', segments: 12, pitch: 12, yaw: 29 }, limbMat)
  g.add(antennae)
  let legTip = new THREE.Vector3()
  for (const [x, sweep] of [[0.275, -34], [0.194, 0], [0.116, 38]]) {
    const pair = legPair({ base: [x, -0.020, 0.075], femur: 0.14, tibia: 0.145, tarsus: 0.058,
      thickness: 0.0095, splay: 48, sweep, knee: 62, spines: false }, limbMat)
    // 统一标记网格供形态检查，保留 kit 的关节层级和 rig tag。
    pair.traverse(o => { if (o instanceof THREE.Mesh) o.name = 'leg' })
    g.add(pair)
    legTip = ((pair.children[0] as THREE.Group).userData.tip as THREE.Vector3).clone()
  }
  // kit 的触角组内主干网格名称是 antenna；不改 rig 标记。
  antennae.traverse(o => { if (o instanceof THREE.Mesh) o.name = 'antenna' })
  return finalize(g, {
    head: new THREE.Vector3(0.387, 0.046, 0),
    abdomen: new THREE.Vector3(-0.15, 0.043, 0),
    forceps: new THREE.Vector3(-0.525, 0.013, 0.051),
    antenna: new THREE.Vector3(0.64, 0.025, 0.18),
    leg: legTip,
  })
}
