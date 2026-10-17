/** Tipula sp. 黑亮长椭圆卵，1×0.4mm。1单位=1cm；+X前，+Y上，+Z右。
 * 单粒展示，不放大、不添加遮挡卵的土块。SphereGeometry 保持外向法线。
 */
import * as THREE from 'three'
import { chitin, finalize, type InsectModel } from '../kit'
export function buildCraneFlyEgg(): InsectModel {
  const group = new THREE.Group()
  const shell = new THREE.Mesh(new THREE.SphereGeometry(1, 40, 24), chitin({ color: '#181916', gloss: 0.48, clearcoat: 0.12 }))
  shell.name = 'egg-shell'
  shell.scale.set(0.05, 0.02, 0.02)
  group.add(shell)
  return finalize(group, { egg: new THREE.Vector3(0, 0.02, 0) })
}
