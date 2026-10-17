/** 东方蝼蛄 · 中后龄若虫。躯干 14 mm，对照成虫约 33 mm。
 * 1 单位 = 1 厘米；+X 前、+Y 上、+Z 右。无成翅，胸后仅两对小翅芽。
 * 灰黑体壁、短绒毛（去除装饰感过强的实体白斑）；开掘前足保留四齿，后足为普通步行足。
 * 全部球面与 TubeGeometry 保持外法线，避免浅色附肢读成空壳。
 */
import * as THREE from 'three'
import { chitin, finalize, type InsectModel } from '../kit'

export function buildMoleCricketNymph(): InsectModel {
  const g = new THREE.Group()
  const skin = chitin({ color: '#50534d', gloss: 0.12, surface: 'velvet' })
  const legMat = chitin({ color: '#858b80', gloss: 0.18, surface: 'velvet' })
  const pale = chitin({ color: '#cbd0c5', gloss: 0.12 })
  const dark = chitin({ color: '#383b34', gloss: 0.2 })
  const walkMat = chitin({ color: '#666b60', gloss: 0.18, surface: 'velvet' })
  const padMat = chitin({ color: '#55584f', gloss: 0.18, surface: 'velvet' })
  function oval(name: string, at: [number, number, number], radii: [number, number, number], mat: THREE.Material) {
    const m = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 16), mat)
    m.name = name; m.position.set(...at); m.scale.set(...radii); g.add(m)
    return m
  }
  function tube(name: string, pts: THREE.Vector3[], r: number, mat: THREE.Material, taper = 0.8) {
    const curve = new THREE.CatmullRomCurve3(pts)
    const geometry = new THREE.TubeGeometry(curve, 16, r, 8, false)
    // TubeGeometry 是圆管；逐环向中心缩径，保留自然渐尖的触须与齿端。
    const p = geometry.getAttribute('position')
    for (let i = 0; i <= 16; i++) {
      const c = curve.getPointAt(i / 16)
      for (let j = 0; j <= 8; j++) {
        const k = i * 9 + j
        const v = new THREE.Vector3().fromBufferAttribute(p, k).sub(c).multiplyScalar(1 - taper * i / 16).add(c)
        p.setXYZ(k, v.x, v.y, v.z)
      }
    }
    geometry.computeVertexNormals()
    const m = new THREE.Mesh(geometry, mat); m.name = name; g.add(m)
    return m
  }
  oval('abdomen', [-0.23, 0.06, 0], [0.47, 0.15, 0.17], skin)
  oval('thorax', [0.13, 0.07, 0], [0.23, 0.16, 0.17], skin)
  oval('pronotum', [0.36, 0.10, 0], [0.25, 0.18, 0.22], skin)
  oval('head', [0.59, 0.06, 0], [0.11, 0.105, 0.105], legMat)

  const v = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z)
  for (const side of [1, -1] as const) {
    const z = (n: number) => side * n
    oval('eye', [0.62, 0.115, z(0.092)], [0.032, 0.036, 0.025], dark)
    tube('antenna', [v(0.67, 0.09, z(0.055)), v(0.86, 0.14, z(0.15)), v(1.01, 0.11, z(0.22))], 0.009, dark)
    tube('cercus', [v(-0.64, 0.025, z(0.06)), v(-0.81, 0.035, z(0.13)), v(-0.94, 0.015, z(0.19))], 0.012, legMat)
    // 中、后胸背面后缘各一对向后贴伏的舌状芽。前宽后窄，俯视不越出体侧。
    for (const [baseX, baseY, tipY] of [[0.19, 0.209, 0.192], [0.015, 0.185, 0.18]]) {
      const geometry = new THREE.SphereGeometry(1, 32, 20)
      const pos = geometry.getAttribute('position')
      for (let i = 0; i < pos.count; i++) {
        const p = new THREE.Vector3().fromBufferAttribute(pos, i)
        const t = (1 - p.x) / 2 // +X 是着生处，末端沿 -X 向后生长。
        pos.setXYZ(i, baseX - 0.175 * t, baseY + (tipY - baseY) * t + p.y * 0.008,
          z(0.085 + 0.012 * t) + p.z * 0.050 * (1 - 0.7 * t))
      }
      geometry.computeVertexNormals()
      const pad = new THREE.Mesh(geometry, padMat)
      pad.name = 'wing-pad'; g.add(pad)
    }
    // 前足基节、粗短股节与宽扁胫节，掌平面朝上，让 home 机位读得出扇形四齿。
    tube('foreleg-arm', [v(0.45, 0.01, z(0.14)), v(0.53, -0.025, z(0.24)), v(0.63, -0.04, z(0.35))], 0.045, legMat, 0.05)
    oval('shovel', [0.67, -0.04, z(0.37)], [0.125, 0.035, 0.135], legMat)
    for (let i = 0; i < 4; i++) {
      const fan = (i - 1.5) * 0.066
      tube('shovel-tooth', [v(0.75, -0.04, z(0.37 + fan)), v(0.815, -0.045, z(0.37 + fan * 1.1)), v(0.87 - Math.abs(fan) * 0.12, -0.055, z(0.37 + fan * 1.22))], 0.022, dark, 0.85)
    }
    for (const x of [0.10, -0.13]) {
      const knee = v(x - 0.055, -0.07, z(0.36)), ankle = v(x + 0.03, -0.21, z(0.45))
      // 基节半径 0.16 mm，贴体深灰；股节另起，不留浅色粗管口。
      tube('walking-coxa', [v(x, 0, z(0.13)), v(x - 0.006, -0.009, z(0.16)), v(x - 0.012, -0.018, z(0.19))], 0.016, skin, 0.1)
      tube('walking-femur', [v(x - 0.012, -0.018, z(0.19)), v(x - 0.035, -0.035, z(0.26)), knee], 0.022, walkMat, 0.15)
      tube('walking-tibia', [knee, ankle.clone().lerp(knee, 0.5), ankle], 0.018, walkMat, 0.35)
      tube('walking-tarsus', [ankle, v(x + 0.08, -0.23, z(0.47)), v(x + 0.13, -0.23, z(0.48))], 0.012, dark)
    }

  }
  // 短毛在真实椭球表面发根，不把毛埋在盾片里；Fibonacci 点列确定性铺背。
  for (const [cx, cy, rx, ry, rz, count] of [[0.36, 0.10, 0.25, 0.18, 0.22, 56], [-0.23, 0.06, 0.47, 0.15, 0.17, 72]]) {
    for (let i = 0; i < count; i++) {
      const y = 0.24 + 0.75 * (i + 0.5) / count, a = i * 2.3999632297
      const x = Math.sqrt(1 - y * y) * Math.cos(a), z = Math.sqrt(1 - y * y) * Math.sin(a)
      const normal = v(x / rx, y / ry, z / rz).normalize()
      const len = 0.016 + 0.006 * (0.5 + 0.5 * Math.sin(i * 8.3))
      const hair = new THREE.Mesh(new THREE.ConeGeometry(0.002, len, 5), pale)
      hair.name = 'fuzz'; hair.position.set(cx + rx * x, cy + ry * y, rz * z).addScaledVector(normal, len * 0.45)
      hair.quaternion.setFromUnitVectors(v(0, 1, 0), normal)
      // 相邻体节覆盖住的毛不生成，避免有计数却全部埋在盾片/胸部里。
      const buried = g.children.some(o => {
        if (!(o instanceof THREE.Mesh) || !['head', 'pronotum', 'thorax', 'abdomen'].includes(o.name)) return false
        const q = hair.position.clone().sub(o.position).divide(o.scale)
        return q.lengthSq() < 1.02
      })
      if (!buried) g.add(hair)
    }
  }
  return finalize(g, {
    foreleg: v(0.84, -0.05, 0.41), pronotum: v(0.36, 0.28, 0), abdomen: v(-0.23, 0.21, 0),
    antenna: v(0.86, 0.14, 0.15), cercus: v(-0.81, 0.035, 0.13), wingPad: v(-0.08, 0.19, 0.09), eye: v(0.62, 0.13, 0.11),
  })
}
