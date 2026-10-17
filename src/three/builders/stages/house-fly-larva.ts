/**
 * 家蝇三龄蛆：体长 10 mm；头端 +X 尖细，无足、无外露头壳。
 * 后端 -X 圆滑过渡到略倾斜的钝截面，成对 D 形气门板各有三道裂隙。单位 cm。
 */
import * as THREE from 'three'
import { chitin, finalize, type InsectModel } from '../kit'

export function buildHouseFlyLarva(): InsectModel {
  const group = new THREE.Group()
  const length = 1.0
  const groove = 0.065
  const bodyRadius = 0.116
  const taperStart = 0.66
  const rearRoundLength = 0.06
  const tailTilt = 0.12
  // 旋转曲面的截面含真实浅环沟，不是套上独立圆环或串成珠子。
  const profile = [new THREE.Vector2(0, -length / 2)]
  for (let i = 0; i <= 264; i++) {
    const t = i / 264
    // 后约2/3近圆柱，前约1/3才收细。后端内圈留给气门面，外圈用椭圆圆角接到体壁。
    const q = Math.max(0, (t - taperStart) / (1 - taperStart))
    const barrel = bodyRadius * (1 - 0.04 * THREE.MathUtils.smoothstep(t, rearRoundLength, taperStart))
    const envelope = t < rearRoundLength
      ? 0.075 + (bodyRadius - 0.075) * Math.sqrt(Math.max(0, 1 - ((rearRoundLength - t) / rearRoundLength) ** 2))
      : barrel * (1 - 0.86 * q * q)
    const r = envelope * (1 - groove * THREE.MathUtils.smoothstep(t, rearRoundLength, 0.12) * (0.5 - 0.5 * Math.cos(t * 22 * Math.PI)))
    profile.push(new THREE.Vector2(r, (t - 0.5) * length))
  }
  profile.push(new THREE.Vector2(0, length / 2))
  const geometry = new THREE.LatheGeometry(profile, 32)
  geometry.rotateZ(-Math.PI / 2)
  const skin = new THREE.Mesh(geometry, chitin({ color: '#f0e5c9', gloss: 0.65, clearcoat: 0.22, surface: 'smooth' }))
  skin.name = 'larva-skin'
  group.add(skin)

  const hookMat = chitin({ color: '#30241c', gloss: 0.55, surface: 'smooth' })
  for (const side of [-1, 1]) {
    const z = side * 0.013
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0.455, -0.003, z),
      new THREE.Vector3(0.482, -0.004, z),
      new THREE.Vector3(0.504, -0.005, z),
      new THREE.Vector3(0.509, -0.011, z * 0.92),
    ])
    const hook = new THREE.Mesh(new THREE.TubeGeometry(curve, 14, 0.0025, 8, false), hookMat)
    hook.name = 'mouth-hook'
    group.add(hook)
  }

  const plateMat = chitin({ color: '#483022', gloss: 0.35, surface: 'smooth' })
  const slitMat = chitin({ color: '#b49362', gloss: 0.25, surface: 'smooth' })
  for (const side of [-1, 1]) {
    // D 的直边朝内、弧边朝外。板微微浮出平截面，而不是两个伸出的气门管。
    const shape = new THREE.Shape()
    shape.moveTo(0, -0.025)
    shape.lineTo(0, 0.025)
    for (let j = 0; j <= 24; j++) {
      const a = Math.PI / 2 - j * Math.PI / 24
      shape.lineTo(side * 0.029 * Math.cos(a), 0.025 * Math.sin(a))
    }
    shape.closePath()
    const plate = new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth: 0.003, bevelEnabled: false, curveSegments: 24 }), plateMat)
    plate.rotation.y = -Math.PI / 2
    plate.position.set(-0.501, 0.016, side * 0.025)
    plate.name = 'posterior-spiracle'
    group.add(plate)
    for (let j = 0; j < 3; j++) {
      const slit = new THREE.Mesh(new THREE.CapsuleGeometry(0.0016, 0.016, 4, 6), slitMat)
      slit.position.set(-0.505, 0.002 + j * 0.014, side * 0.037)
      slit.rotation.x = side * Math.PI / 2
      slit.name = 'spiracular-slit'
      group.add(slit)
    }
  }
  // 同一变换作用于尾壳、气门板和裂隙，保持贴面；前躯不受倾斜影响。
  group.traverse(o => {
    if (!(o instanceof THREE.Mesh)) return
    o.updateMatrix()
    const inverse = o.matrix.clone().invert()
    const p = o.geometry.getAttribute('position'), v = new THREE.Vector3()
    for (let i = 0; i < p.count; i++) {
      v.fromBufferAttribute(p, i).applyMatrix4(o.matrix)
      v.x += tailTilt * v.y * (1 - THREE.MathUtils.smoothstep(v.x, -0.44, -0.36))
      v.applyMatrix4(inverse)
      p.setXYZ(i, v.x, v.y, v.z)
    }
    o.geometry.computeVertexNormals()
  })
  return finalize(group, {
    larvalSegments: new THREE.Vector3(-0.15, 0.11, 0),
    mouthHooks: new THREE.Vector3(0.51, -0.009, 0.012),
    rearSpiracles: new THREE.Vector3(-0.504 + tailTilt * 0.016, 0.016, 0.038),
  })
}
