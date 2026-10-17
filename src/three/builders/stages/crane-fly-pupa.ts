/** Tipula sp. 被蛹，体长27mm、宽5mm（属级图比例推算）。
 * 深灰褐细长，双前胸呼吸角，腹节后缘短刺列。单位cm，+X前、+Y上、+Z右。
 * 仰卧展示：腹面朝+Y；成对足鞘、翅鞘和触角鞘贴体，绝不做自由悬垂长足。
 * 各鞘与体色相邻，不做浅色大关节。几何用外向球/旋转体/Tube，避开loft反面光照。
 */
import * as THREE from 'three'
import { chitin, finalize, type InsectModel } from '../kit'

export function buildCraneFlyPupa(): InsectModel {
  const group = new THREE.Group()
  const skinMat = chitin({ color: '#554c40', gloss: 0.2, clearcoat: 0 })
  const sheathMat = chitin({ color: '#665c4b', gloss: 0.24, clearcoat: 0 })
  const hornMat = chitin({ color: '#756a53', gloss: 0.22, clearcoat: 0 })
  const profile: THREE.Vector2[] = []
  for (let i = 0; i <= 216; i++) {
    const t = i / 216
    const ends = Math.sqrt(Math.max(0, 1 - Math.pow(Math.max(0, 1 - t / 0.13), 2))) * Math.sqrt(Math.max(0, 1 - Math.pow(Math.max(0, (t - 0.92) / 0.08), 2)))
    const envelope = t < 0.65 ? 0.17 + 0.075 * Math.sin(Math.PI * t / 1.3) : 0.245
    const groove = t < 0.65 ? 1 - 0.055 * (0.5 + 0.5 * Math.cos(t * Math.PI * 24)) : 1
    profile.push(new THREE.Vector2(envelope * ends * groove, (t - 0.5) * 2.7))
  }
  const skin = new THREE.Mesh(new THREE.LatheGeometry(profile, 32), skinMat)
  skin.name = 'pupa-skin'; skin.rotation.z = -Math.PI / 2; group.add(skin)
  function tube(name: string, points: number[][], radius: number, material: THREE.Material) {
    const path = new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(p[0], p[1], p[2])))
    const mesh = new THREE.Mesh(new THREE.TubeGeometry(path, 24, radius, 10, false), material)
    mesh.name = name; group.add(mesh); return mesh
  }
  for (const side of [-1, 1]) {
    // 呼吸角自前胸背面（仰卧后的-Y）外伸，弯向前上方，两侧张开但不交叉。
    tube('respiratory-horn', [[1.04, -0.08, side * 0.15], [1.2, 0.02, side * 0.24], [1.35, 0.19, side * 0.32]], 0.035, hornMat)
    // 翅鞘：宽而扁、贴在胸腹交界两侧。与足鞘在Z上分道，不遮住细足鞘。
    const wing = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 18), sheathMat)
    wing.name = 'wing-sheath'; wing.scale.set(0.58, 0.065, 0.1); wing.position.set(0.35, 0.125, side * 0.225); wing.rotation.y = side * 0.08; group.add(wing)
    for (let i = 0; i < 3; i++) {
      const z = side * (0.055 + i * 0.073), y = 0.265 - i * 0.012
      // 三对长足鞘沿腹面向尾直行；略有弯曲但不形成小V或抬高关节。
      tube('leg-sheath', [[0.94 - i * 0.08, 0.215, z], [0.62, y, z], [0.15, y - 0.004, z], [-0.38 - i * 0.19, 0.205 - i * 0.012, z]], 0.026, sheathMat)
    }
    tube('antenna-sheath', [[1.24, 0.105, side * 0.085], [1.05, 0.205, side * 0.12], [0.83, 0.22, side * 0.135]], 0.024, skinMat)
  }
  // 腹部六列，每列十枚短刺；向尾侧倾斜，与皮肤同色。
  for (let row = 0; row < 6; row++) {
    const x = -1.05 + row * 0.245, t = x / 2.7 + 0.5
    const r = (0.17 + 0.075 * Math.sin(Math.PI * t / 1.3)) * 0.985
    for (let j = 0; j < 10; j++) {
      const a = j * Math.PI * 2 / 10, length = 0.065
      const base = new THREE.Vector3(x, Math.cos(a) * r, Math.sin(a) * r)
      const axis = new THREE.Vector3(-0.6, Math.cos(a) * 0.8, Math.sin(a) * 0.8)
      const spine = new THREE.Mesh(new THREE.ConeGeometry(0.018, length, 8), skinMat)
      spine.name = 'abdominal-spine'; spine.position.copy(base).addScaledVector(axis, length / 2)
      spine.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), axis); group.add(spine)
    }
  }
  const horn = group.children.find(o => o.name === 'respiratory-horn') as THREE.Mesh
  const hornSurface = new THREE.Vector3().fromBufferAttribute(horn.geometry.getAttribute('position'), 24 * 11)
  return finalize(group, { breathingHorn: hornSurface })
}
