/** Tipula sp. 皮夹克幼虫。成熟长36mm，径4.8mm（直径推算）。
 * 无足、灰褐坚韧、缩头；尾端六肉突围双气门。+X前、+Y上、+Z右，单位cm。
 * 尾盘略向背侧倾斜，展示气门；肉突为肉质短锥而非硬刺，不作白点斑纹。
 */
import * as THREE from 'three'
import { chitin, finalize, type InsectModel } from '../kit'

export function buildCraneFlyLarva(): InsectModel {
  const group = new THREE.Group()
  const skinMat = chitin({ color: '#716d61', gloss: 0.17, clearcoat: 0, surface: 'punctate' })
  const lobeMat = chitin({ color: '#686457', gloss: 0.18, clearcoat: 0 })
  const darkMat = chitin({ color: '#24251f', gloss: 0.28, clearcoat: 0 })
  const profile: THREE.Vector2[] = []
  for (let i = 0; i <= 240; i++) {
    const t = i / 240
    // 长躯干近等粗，仅两端各约10%圆钝收束。细浅环褶不做珠串。
    const rear = Math.sqrt(Math.max(0, 1 - Math.pow(Math.max(0, 1 - t / 0.085), 2)))
    const front = Math.sqrt(Math.max(0, 1 - Math.pow(Math.max(0, (t - 0.9) / 0.1), 2)))
    const r = 0.24 * rear * front * (1 - 0.035 * (0.5 + 0.5 * Math.cos(t * Math.PI * 24)))
    profile.push(new THREE.Vector2(r, (t - 0.5) * 3.6))
  }
  const skin = new THREE.Mesh(new THREE.LatheGeometry(profile, 32), skinMat)
  skin.rotation.z = -Math.PI / 2
  skin.name = 'larva-skin'
  group.add(skin)
  const head = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 14), darkMat)
  head.name = 'retracted-head'; head.scale.set(0.07, 0.045, 0.065); head.position.set(1.74, 0, 0)
  group.add(head)

  // 后背侧末端的气门场；六肉突的根部与圆钝尾体相接。
  const tail = new THREE.Group()
  tail.position.set(-1.62, 0.125, 0)
  tail.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(-0.38, 0.925, 0).normalize())
  group.add(tail)
  const disc = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 20), lobeMat)
  disc.name = 'spiracular-disc'; disc.scale.set(0.165, 0.045, 0.18); disc.position.y = 0.025
  tail.add(disc)
  for (let i = 0; i < 6; i++) {
    const a = Math.PI * 2 * (i + 0.5) / 6
    const from = new THREE.Vector3(Math.cos(a) * 0.13, 0, Math.sin(a) * 0.14)
    const to = new THREE.Vector3(Math.cos(a) * 0.255, 0.075, Math.sin(a) * 0.265)
    const axis = to.clone().sub(from)
    const points = Array.from({ length: 17 }, (_, j) => {
      const t = j / 16
      return new THREE.Vector2(0.062 * Math.pow(Math.sin(Math.PI * t), 0.7), axis.length() * (t - 0.5))
    })
    const lobe = new THREE.Mesh(new THREE.LatheGeometry(points, 16), lobeMat)
    lobe.name = 'tail-lobe'; lobe.position.copy(from).add(to).multiplyScalar(0.5)
    lobe.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), axis.normalize())
    tail.add(lobe)
  }
  for (const side of [-1, 1]) {
    const rim = new THREE.Mesh(new THREE.SphereGeometry(1, 22, 14), skinMat)
    rim.name = 'spiracle-rim'; rim.scale.set(0.052, 0.017, 0.052); rim.position.set(0, 0.064, side * 0.08); tail.add(rim)
    const pore = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 16), darkMat)
    pore.name = 'spiracle'; pore.scale.set(0.038, 0.012, 0.038); pore.position.set(0, 0.077, side * 0.08); tail.add(pore)
  }
  group.updateMatrixWorld(true)
  return finalize(group, { tailDisc: tail.localToWorld(new THREE.Vector3(0, 0.07, 0)) })
}
