/**
 * 海滨蠼螋 Labidura riparia · 卵（母虫看护的一窝中的小簇）。
 * 1 单位 = 1 cm；+X 前、+Y 上、+Z 右。单卵 1.5 × 1.10 × 1.15 mm。
 * LSU 推广站给本种卵长 1–2 mm；宽厚按卵照片推算。只表现 9 枚，非整窝卵数。
 * 乳白、光滑、宽椭圆，两层错落，保留每粒的轮廓与暗缝。土室仅留一小片土底，
 * 不加高侧壁挡住卵。壳用 SphereGeometry 的外向绕序，避开浅色 loft 的凹坑着色。
 * 资料 URL 与推算范围见 earwig-stages.test.ts。无母虫、无外部模型。
 */
import * as THREE from 'three'
import { chitin, finalize, type InsectModel } from '../kit'

export function buildEarwigEgg(): InsectModel {
  const g = new THREE.Group()
  const shell = chitin({ color: '#e8e2cb', gloss: 0.32, clearcoat: 0.12 })
  const soilMat = chitin({ color: '#746047', gloss: 0.06 })
  const soilGeo = new THREE.SphereGeometry(1, 40, 16)
  const p = soilGeo.getAttribute('position')
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i)
    const a = Math.atan2(z, x)
    const wobble = 1 + 0.055 * Math.sin(a * 5 + 0.8) + 0.025 * Math.sin(a * 9)
    p.setXYZ(i, x * wobble, y * (1 + 0.08 * Math.sin(x * 11 + z * 9)), z * wobble)
  }
  soilGeo.computeVertexNormals()
  const soil = new THREE.Mesh(soilGeo, soilMat)
  soil.scale.set(0.315, 0.018, 0.27)
  soil.name = 'soil'
  g.add(soil)

  // 水平朝向各异、中心不成行。后侧一粒垫高，另两粒卧在相邻卵之间。
  const sites = [
    [0, 0.073, 0, 12],
    [0.144, 0.071, 0.012, -19],
    [0.074, 0.071, 0.130, 48],
    [-0.067, 0.071, 0.132, -28],
    [-0.148, 0.071, -0.006, 18],
    [-0.070, 0.128, -0.110, 56],
    [0.075, 0.071, -0.122, -24],
    [0.062, 0.153, 0.045, -35],
    [-0.060, 0.152, -0.035, 30],
  ]
  for (const [x, y, z, yaw] of sites) {
    const egg = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 20), shell)
    egg.scale.set(0.075, 0.055, 0.0575)
    egg.position.set(x, y, z)
    egg.rotation.y = THREE.MathUtils.degToRad(yaw)
    egg.name = 'egg'
    g.add(egg)
  }
  return finalize(g, {
    egg: new THREE.Vector3(0.062, 0.208, 0.045),
    clutch: new THREE.Vector3(-0.060, 0.207, -0.035),
    soil: new THREE.Vector3(0.27, 0.009, 0.04),
  })
}
