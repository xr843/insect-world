/**
 * 水黾 Aquarius elongatus · 卵。单粒 1.3 × 0.46 × 0.44 mm，
 * 按黾蝽科 1–1.5 mm 级长卵推算，非本种实测。三粒粘在短水草茎上；
 * 茎仅交代水下植物基质，不加水面大底盘，不改变卵的真实尺度。
 * SphereGeometry 保留外向法线，浅色壳不走法线朝内的 loft。
 * 1 单位 = 1 cm；+X 前，+Y 上，+Z 右。
 */
import * as THREE from 'three'
import { chitin, finalize, type InsectModel } from '../kit'

export function buildWaterStriderEgg(): InsectModel {
  const g = new THREE.Group()
  const shellMat = chitin({ color: '#ded2a4', gloss: 0.28, clearcoat: 0.1 })
  const stemMat = chitin({ color: '#697154', gloss: 0.12 })
  const stem = new THREE.Mesh(new THREE.CapsuleGeometry(0.013, 0.414, 8, 16), stemMat)
  stem.name = 'stem'
  stem.rotation.z = Math.PI / 2
  g.add(stem)

  for (let i = 0; i < 3; i++) {
    const shell = new THREE.Mesh(new THREE.SphereGeometry(1, 40, 24), shellMat)
    shell.name = 'egg-shell'
    shell.scale.set(0.065, 0.023, 0.022)
    shell.position.set((i - 1) * 0.148, 0.034, (i - 1) * 0.002)
    g.add(shell)
  }
  return finalize(g, {
    egg: new THREE.Vector3(0, 0.057, 0),
    substrate: new THREE.Vector3(0.21, 0.013, 0),
  })
}
