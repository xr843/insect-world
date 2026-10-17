/** 家蝇卵：单粒 1.2 mm 白色香蕉形。1 = 1 cm，+X 前、+Y 上、+Z 右。 */
import * as THREE from 'three'
import { chitin, finalize, type InsectModel } from '../kit'

export function buildHouseFlyEgg(): InsectModel {
  const group = new THREE.Group()
  // 原生球面绕向朝外；弯曲中心线使腹侧略凹，避免直米粒与 loft 凹坑光照。
  const geometry = new THREE.SphereGeometry(1, 40, 48)
  const p = geometry.getAttribute('position')
  for (let i = 0; i < p.count; i++) {
    const t = p.getY(i)
    p.setXYZ(i, t * 0.06, -p.getX(i) * 0.012 + 0.014 * (1 - t * t), p.getZ(i) * 0.014)
  }
  geometry.computeVertexNormals()
  const shell = new THREE.Mesh(geometry, chitin({ color: '#f6f1e5', gloss: 0.46, clearcoat: 0.08, surface: 'smooth' }))
  shell.name = 'egg-shell'
  group.add(shell)
  return finalize(group, { egg: new THREE.Vector3(0, 0.026, 0) })
}
