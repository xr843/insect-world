/** 东方蝼蛄 · 单粒卵。1 单位 = 1 厘米；+X 前、+Y 上、+Z 右。
 * 长 2.5 mm 为同属记录外推，不宣称是东方蝼蛄独立测量。
 * 用外法线正确的球面，避免浅色 loft 看成凹壳；不虚构卵盖或表面花纹。
 */
import * as THREE from 'three'
import { chitin, finalize, type InsectModel } from '../kit'

export function buildMoleCricketEgg(): InsectModel {
  const g = new THREE.Group()
  const shell = new THREE.Mesh(new THREE.SphereGeometry(1, 40, 28), chitin({ color: '#dcded9', gloss: 0.24 }))
  shell.scale.set(0.125, 0.085, 0.085)
  shell.name = 'egg-shell'
  g.add(shell)
  return finalize(g, { egg: new THREE.Vector3(0, 0.085, 0) })
}
