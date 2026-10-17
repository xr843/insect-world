/**
 * 豆娘（水虿）Ischnura sp.：不完全变态的水生稚虫，无蛹。
 * +X 前、+Y 背、+Z 右；cm。体长 15.5 mm（同属推算），含鳃约 21.5 mm。
 * 头宽 3.05、腹首/末节宽 1.51/0.82、翅芽约 3.5、尾鳃约 6 mm，
 * 参照 I. chingaza 末龄实测；叶片宽比约 4:1 参照 I. elegans。
 * 正中鳃竖向、成对侧鳃斜向张开，避免默认 home 机位叠成一条尾巴。
 * 可折叠的下唇伏于头胸腹面，前缘一对短颚叶；不把它做成伸出的铁丝。
 */
import * as THREE from 'three'
import { chitin, finalize, loft, type Section, type InsectModel } from '../kit'

/** 只在本模型修正 loft 绕向，保留 kit 的椭圆外法线。 */
function solid(sections: Section[], radial = 16) {
  const geo = loft(sections, radial)
  const idx = geo.index!
  for (let i = 0; i < idx.count; i += 3) {
    const a = idx.getX(i)
    idx.setX(i, idx.getX(i + 1)); idx.setX(i + 1, a)
  }
  return geo
}

export function buildDamselflyNymph(): InsectModel {
  const g = new THREE.Group()
  const bodyMat = chitin({ color: '#777553', gloss: 0.16, surface: 'punctate' })
  const headMat = chitin({ color: '#706c4e', gloss: 0.19 })
  const padMat = chitin({ color: '#8a8865', gloss: 0.28 })
  const gillMat = chitin({ color: '#929575', gloss: 0.17 })
  const veinMat = chitin({ color: '#7a8062', gloss: 0.16 })
  const eyeMat = chitin({ color: '#494a36', gloss: 0.38 })
  const maskMat = chitin({ color: '#89805c', gloss: 0.26 })
  function ellipsoid(name: string, at: [number, number, number], radii: [number, number, number], mat: THREE.Material) {
    const m = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 14), mat)
    m.name = name; m.position.set(...at); m.scale.set(...radii); g.add(m)
    return m
  }
  function tube(name: string, points: [number, number, number][], r: number, mat: THREE.Material, parent: THREE.Group = g) {
    const curve = new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(...p)))
    const m = new THREE.Mesh(new THREE.TubeGeometry(curve, 16, r, 8, false), mat)
    m.name = name; parent.add(m)
    return m
  }
  ellipsoid('head', [0.7625, 0.015, 0], [0.0875, 0.060, 0.115], headMat)
  for (const side of [1, -1]) {
    ellipsoid('eye', [0.784, 0.028, side * 0.1115], [0.054, 0.052, 0.041], eyeMat)
    tube('antenna', [[0.807, 0.052, side * 0.060], [0.877, 0.077, side * 0.073], [0.990, 0.088, side * 0.088]], 0.0035, bodyMat)
  }
  ellipsoid('thorax', [0.48, 0, 0], [0.22, 0.067, 0.087], bodyMat)
  // 腹部保留平台状中段及末节真实宽度，十节之间细环沟。
  const widths = [0.151, 0.158, 0.156, 0.151, 0.142, 0.133, 0.122, 0.109, 0.095, 0.082]
  for (let i = 0; i < 10; i++) {
    const x = 0.33 - i * 0.103
    const r = widths[i] / 2
    const sections: Section[] = [
      { at: [x, 0, 0], ry: r * 0.66, rz: r * 0.91 },
      { at: [x - 0.020, 0, 0], ry: r * 0.73, rz: r },
      { at: [x - 0.072, 0, 0], ry: r * 0.70, rz: r * 0.98 },
      { at: [x - 0.100, 0, 0], ry: r * 0.62, rz: r * 0.89 },
    ]
    if (i === 9) sections.push(
      { at: [x - 0.105, 0, 0], ry: r * 0.48, rz: r * 0.68 },
      { at: [x - 0.112, 0, 0], ry: r * 0.20, rz: r * 0.30 },
      { at: [x - 0.115, 0, 0], ry: 0.001, rz: 0.001 },
    )
    const segment = new THREE.Mesh(solid(sections), bodyMat)
    segment.name = 'abdomen'; g.add(segment)
  }
  // 六足皆从胸部出发，膝/胫有真实折转，色泽与体壁一致。
  for (const side of [1, -1]) {
    for (let i = 0; i < 3; i++) {
      const x = 0.60 - i * 0.12
      tube('leg', [[x, -0.025, side * 0.065], [x + 0.07 - i * 0.08, -0.09, side * (0.23 + i * 0.04)], [x + 0.17 - i * 0.22, -0.20, side * (0.34 + i * 0.06)], [x + 0.20 - i * 0.23, -0.22, side * (0.38 + i * 0.06)]], 0.010 + i * 0.001, bodyMat)
    }
    for (const hind of [false, true]) {
      const x = hind ? 0.38 : 0.46
      const z = side * (hind ? 0.083 : 0.044)
      const sections: Section[] = [
        { at: [x, 0.060, z], ry: 0.012, rz: 0.017 },
        { at: [x - 0.08, 0.085, z], ry: 0.019, rz: 0.035 },
        { at: [x - 0.23, 0.090, z + side * 0.012], ry: 0.016, rz: 0.030 },
        { at: [x - 0.355, 0.083, z + side * 0.016], ry: 0.001, rz: 0.002 },
      ]
      const pad = new THREE.Mesh(solid(sections), padMat)
      pad.name = 'wing-pad'; g.add(pad)
      tube('pad-vein', [[x - 0.025, 0.078, z], [x - 0.15, 0.109, z + side * 0.006], [x - 0.32, 0.094, z + side * 0.014]], 0.002, veinMat)
    }
  }
  // 面罩为渐宽前颏+后折的基部，不伸出一条捕食长杆。
  const mask = new THREE.Mesh(solid([
    { at: [0.57, -0.061, 0], ry: 0.010, rz: 0.024 },
    { at: [0.64, -0.074, 0], ry: 0.014, rz: 0.037 },
    { at: [0.74, -0.069, 0], ry: 0.016, rz: 0.069 },
    { at: [0.789, -0.050, 0], ry: 0.012, rz: 0.079 },
  ]), maskMat)
  mask.name = 'mask'; g.add(mask)
  ellipsoid('mask-hinge', [0.57, -0.060, 0], [0.023, 0.018, 0.029], maskMat)
  for (const side of [1, -1]) {
    tube('mask-palp', [[0.781, -0.051, side * 0.069], [0.836, -0.035, side * 0.061], [0.850, -0.024, side * 0.030]], 0.011, maskMat)
  }
  // 三鳃：侧片稍张，正中片直立。鳃基窄、中央宽、末端圆滑尖收。
  for (const side of [0, 1, -1]) {
    const leaf = new THREE.Group()
    leaf.rotation.order = 'ZYX'
    leaf.position.set(-0.685, 0.003, side * 0.018)
    leaf.rotation.y = side * 0.48
    leaf.rotation.z = side === 0 ? -0.70 : 0
    leaf.rotation.x = side === 0 ? Math.PI / 2 : side * 0.18
    const sections: Section[] = []
    for (let i = 0; i <= 24; i++) {
      const t = i / 24
      const w = 0.075 * Math.pow(Math.sin(Math.PI * t), 0.85)
      sections.push({ at: [-0.60 * t, side === 0 ? 0 : -0.025 * t, 0], ry: Math.max(0.001, 0.009 * Math.sin(Math.PI * t)), rz: Math.max(0.001, w) })
    }
    const lamella = new THREE.Mesh(solid(sections, 20), gillMat)
    lamella.name = 'gill'; leaf.add(lamella)
    tube('gill-vein', [[-0.025, 0.009, 0], [-0.29, 0.010 - (side === 0 ? 0 : 0.012), 0], [-0.565, 0.004 - (side === 0 ? 0 : 0.024), 0]], 0.002, veinMat, leaf)
    g.add(leaf)
  }
  return finalize(g, {
    eye: new THREE.Vector3(0.784, 0.055, 0.132),
    thorax: new THREE.Vector3(0.55, 0.05, 0),
    abdomen: new THREE.Vector3(-0.20, 0.045, 0),
    leg: new THREE.Vector3(0.10, -0.22, 0.50),
    antenna: new THREE.Vector3(0.877, 0.077, 0.073),
    gill: new THREE.Vector3(-0.9145, 0.1963, 0.009),
    mask: new THREE.Vector3(0.74, -0.075, 0),
    wingPad: new THREE.Vector3(0.25, 0.105, 0.05),
  })
}
