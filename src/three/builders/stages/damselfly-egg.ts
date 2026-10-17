/**
 * 豆娘 Ischnura sp. 卵：水草茎的教学剖面，不是自然裸露卵群。
 * 同属 I. chingaza 的 0.89×0.18 mm 实测；1 单位 = 1 cm。
 * 三粒卵各自嵌在组织里，上部切开露出。茎长 4 mm、径约 0.9 mm 为推算。
 * 卵采用 SphereGeometry 外法线，避免浅色 loft 壳被双面照明读作凹坑。
 */
import * as THREE from 'three'
import { chitin, finalize, type InsectModel } from '../kit'

export function buildDamselflyEgg(): InsectModel {
  const g = new THREE.Group()
  const skin = chitin({ color: '#526542', gloss: 0.15, surface: 'striate' })
  const tissue = chitin({ color: '#a2ad79', gloss: 0.15 })
  const shell = chitin({ color: '#e5d8b7', gloss: 0.32 })
  const pore = chitin({ color: '#716047', gloss: 0.22 })
  // 下方保留弧形茎皮，整个上半面移除：没有高墙遮挡微小卵。
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.047, 0.40, 28, 6, true, 0, Math.PI), skin)
  stem.rotation.z = -Math.PI / 2
  stem.name = 'stem-skin'
  g.add(stem)
  // 弧形通气组织，纵向有轻微起伏，不用直角矩形板。
  const core = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 16), tissue)
  core.scale.set(0.195, 0.018, 0.037)
  core.position.y = -0.018
  core.name = 'stem-tissue'
  g.add(core)
  for (const x of [-0.12, 0, 0.12]) {
    const egg = new THREE.Mesh(new THREE.SphereGeometry(1, 28, 18), shell)
    egg.scale.set(0.0445, 0.009, 0.009)
    egg.position.set(x, 0.0015, (x === 0 ? -1 : 1) * 0.007)
    egg.name = 'egg'
    g.add(egg)
    const micropyle = new THREE.Mesh(new THREE.SphereGeometry(1, 10, 8), pore)
    micropyle.scale.set(0.0018, 0.0026, 0.0026)
    micropyle.position.copy(egg.position).add(new THREE.Vector3(0.043, 0, 0))
    micropyle.name = 'micropyle'
    g.add(micropyle)
  }
  // 不规则低矮的组织脊，接住卵的下缘；颜色与茎组织协调。
  for (let i = 0; i < 7; i++) {
    const ridge = new THREE.Mesh(new THREE.SphereGeometry(1, 10, 8), tissue)
    ridge.scale.set(0.016, 0.004, 0.005)
    ridge.position.set(-0.165 + i * 0.053, -0.006, (i % 2 ? 1 : -1) * 0.025)
    ridge.name = 'tissue-ridge'
    g.add(ridge)
  }
  return finalize(g, { egg: new THREE.Vector3(0, 0.006, -0.007), plant: new THREE.Vector3(0.08, -0.008, 0.024) })
}
