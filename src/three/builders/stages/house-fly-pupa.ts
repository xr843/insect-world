/**
 * 家蝇围蛹：8 mm 红褐色桶壳，是末龄幼虫皮硬化而成，外无足、触角、翅芽。
 * +X 前、+Y 上、+Z 右；1 = 1 cm。浅环沟留在同一层封闭壳面。
 */
import * as THREE from 'three'
import { chitin, finalize, type InsectModel } from '../kit'

export function buildHouseFlyPupa(): InsectModel {
  const group = new THREE.Group()
  const length = 0.8
  const groove = 0.045
  const profile: THREE.Vector2[] = []
  for (let i = 0; i <= 264; i++) {
    const t = i / 264
    // 超椭圆纵剖面：两端圆钝，中央近乎等宽，避免橄榄球或胡萝卜。
    const r = 0.15 * Math.sqrt(Math.max(0, 1 - Math.pow(2 * t - 1, 6))) *
      (1 - groove * (0.5 - 0.5 * Math.cos(t * 22 * Math.PI)))
    profile.push(new THREE.Vector2(r, (t - 0.5) * length))
  }
  const geometry = new THREE.LatheGeometry(profile, 32)
  geometry.rotateZ(-Math.PI / 2)
  const shell = new THREE.Mesh(geometry, chitin({ color: '#612e20', gloss: 0.25, clearcoat: 0.04, surface: 'smooth' }))
  shell.name = 'puparium'
  group.add(shell)

  const scarMat = chitin({ color: '#392117', gloss: 0.25, surface: 'smooth' })
  for (const side of [-1, 1]) {
    const shape = new THREE.Shape()
    shape.moveTo(0, -0.018); shape.lineTo(0, 0.018)
    for (let j = 0; j <= 20; j++) {
      const a = Math.PI / 2 - j * Math.PI / 20
      shape.lineTo(side * 0.021 * Math.cos(a), 0.018 * Math.sin(a))
    }
    shape.closePath()
    const scar = new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth: 0.002, bevelEnabled: false }), scarMat)
    scar.rotation.y = -Math.PI / 2
    // 圆钝尾端上的扁气门残痕；贴面、不长出附肢。
    scar.position.set(-0.399, 0, side * 0.026)
    scar.name = 'spiracle-scar'
    group.add(scar)
  }
  return finalize(group, {
    puparium: new THREE.Vector3(0, 0.15, 0),
    spiracleScar: new THREE.Vector3(-0.401, 0, 0.036),
  })
}
