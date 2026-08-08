/**
 * 中华草蛉 Chrysoperla sinica（脉翅目 Neuroptera，本项目第一个脉翅目物种）
 *
 * 造型要点：
 * - 脉翅目的定义特征是翅脉"密集成网"：kit.wingVeins() 只生成约 7 条纵脉
 *   加两道横脉，稀疏得像蜻蜓/蝉的翅，读不出"网状/蕾丝感"。本文件自写
 *   `netVeins()`：更多纵脉（9 条）从翅基放射，每两条相邻纵脉之间再插
 *   5 排横脉把它们连成网格，翅脉半径也按 spec.width 缩放（否则和其它
 *   大翅物种一样会细到看不见）。所有翅脉网格统一命名 `vein`，供测试
 *   直接清点数量，而不是回头重新构造一遍再数。
 * - 金绿色复眼：kit.compoundEye() 内部把 metalness 写死成 0.1，做不出
 *   草蛉复眼那种强烈的金属金铜色反光。kit.ts 是只读的共享文件，不能为
 *   这一个物种改公共默认值，因此本文件放弃 compoundEye()，改用
 *   kit.chitin()（它的 `metal` 选项是暴露给调用方的）自建一对金属感
 *   复眼，metal 给到 0.6+ 让高光真正读成"金属"而不是普通哑光复眼。
 * - 两对翅"等大"是本科对区别于多数昆虫目（前后翅明显不等大）的特征，
 *   因此前后翅的 length/width 刻意取得很接近。停息时翅屋脊状盖在腹背
 *   上——姿态推导与 cicada.ts 顶部一致（结论：spread 取一个让偏移方向
 *   落在"大幅朝尾 + 略下沉 + 略外扬"象限的负值，配合较大的正 tilt），
 *   此处不重复整段证明，只按同一推导结果标定角度。
 * - 通体嫩草绿、细长丝状触角向前伸、六足纤细——脉翅目整体是纤弱观感，
 *   材质一律低光泽、无清漆，避免读成硬壳甲虫。
 */
import * as THREE from 'three'
import {
  antennaPair,
  chitin,
  finalize,
  legPair,
  loft,
  membrane,
  segmentedAbdomen,
  spindle,
  wingGeometry,
  type InsectModel,
  type Section,
  type WingSpec,
} from './kit'

// ---------------------------------------------------------------- 局部辅助

/**
 * 网状翅脉：longCount 条纵脉从翅基放射到翅缘，每两条相邻纵脉之间再插
 * crossRows 排横脉——这才是"网"而不是"扇"。半径按 spec.width 缩放
 * （kit.wingVeins() 写死的 0.009 绝对值在这个尺寸下也偏细，缩放后更
 * 清晰）。每根脉都命名 `vein`，供测试直接 traverse 清点。
 */
function netVeins(spec: WingSpec, material: THREE.Material, longCount: number, crossRows: number): THREE.Group {
  const g = new THREE.Group()
  const halfW = spec.width * 0.5
  const baseR = spec.width * 0.017
  const veinY = (t: number) => THREE.MathUtils.lerp(halfW * 0.82, -halfW * 0.55, t)
  const veinEndX = (t: number) => spec.length * THREE.MathUtils.lerp(0.55, 0.98, Math.sin(t * Math.PI))

  const paths: THREE.Vector2[][] = []
  for (let i = 0; i < longCount; i++) {
    const t = i / (longCount - 1)
    const endY = veinY(t)
    const endX = veinEndX(t)
    const steps = 8
    const pts: THREE.Vector2[] = []
    const sections: Section[] = []
    for (let k = 0; k <= steps; k++) {
      const s = k / steps
      const x = spec.length * 0.02 + (endX - spec.length * 0.02) * s
      const y = THREE.MathUtils.lerp(0, endY, Math.pow(s, 0.8))
      pts.push(new THREE.Vector2(x, y))
      const r = Math.max(baseR * (1 - s * 0.5), 0.0022)
      sections.push({ at: new THREE.Vector3(x, 0.0011, y), ry: r, rz: r })
    }
    paths.push(pts)
    const vein = new THREE.Mesh(loft(sections, 6), material)
    vein.name = 'vein'
    g.add(vein)
  }

  // 密集横脉：每两条相邻纵脉之间取 crossRows 排连线，织成网格状的蕾丝感
  for (let i = 0; i < longCount - 1; i++) {
    const a = paths[i]
    const b = paths[i + 1]
    for (let r = 1; r <= crossRows; r++) {
      const frac = r / (crossRows + 1)
      const idx = Math.min(a.length - 1, Math.max(1, Math.round(frac * (a.length - 1))))
      const pa = a[idx]
      const pb = b[Math.min(b.length - 1, idx)]
      const cross = new THREE.Mesh(
        loft(
          [
            { at: new THREE.Vector3(pa.x, 0.0011, pa.y), ry: baseR * 0.42, rz: baseR * 0.42 },
            { at: new THREE.Vector3(pb.x, 0.0011, pb.y), ry: baseR * 0.42, rz: baseR * 0.42 },
          ],
          6,
        ),
        material,
      )
      cross.name = 'vein'
      g.add(cross)
    }
  }
  return g
}

interface WingAssembly {
  pivot: THREE.Group
  blade: THREE.Group
  tipLocal: THREE.Vector3
}

/**
 * spread 推导（与 monarch-butterfly.ts / cicada.ts 顶部一致，不重复整段证明）：
 *   spread = 270 + sweep − φ，φ=0 收拢贴尾，φ=90 完全侧展。
 * 屋脊状停栖姿：取较小的 φ（远离完全侧展，翅向体后收拢）配合较大的正
 * tilt，让偏移量在"大幅朝尾 + 下沉 + 外扬"这个象限，翅从近背中线的
 * 翅基向后下方外扫，两翅相合形成屋顶。
 */
function buildWing(spec: WingSpec, faceMat: THREE.Material, veinMat: THREE.Material, veinCounts: [number, number], side: 1 | -1): WingAssembly {
  const pivot = new THREE.Group()
  const blade = new THREE.Group()
  blade.add(new THREE.Mesh(wingGeometry(spec), faceMat))
  blade.add(netVeins(spec, veinMat, veinCounts[0], veinCounts[1]))
  pivot.add(blade)

  pivot.position.set(spec.base[0], spec.base[1], spec.base[2] * side)
  pivot.rotation.y = side * (Math.PI / 2 - THREE.MathUtils.degToRad(spec.spread)) + THREE.MathUtils.degToRad(spec.sweep ?? 0)
  pivot.rotation.x = side * THREE.MathUtils.degToRad(spec.tilt ?? 0)
  pivot.scale.z = side

  const tipLocal = new THREE.Vector3(spec.length * 0.94, 0, 0)
  return { pivot, blade, tipLocal }
}

/** 金绿色金属复眼：kit.compoundEye() 的 metalness 写死为 0.1，本文件改用 chitin() 自建（见文件顶部注释）。 */
function metallicEye(at: [number, number, number], radius: number, domeMat: THREE.Material, facetMat: THREE.Material): THREE.Group {
  const g = new THREE.Group()
  const dome = new THREE.Mesh(new THREE.SphereGeometry(radius, 24, 18), domeMat)
  dome.scale.set(1.06, 0.86, 1)
  dome.position.set(...at)
  dome.name = 'compound-eye'
  g.add(dome)
  const facets = new THREE.Mesh(new THREE.IcosahedronGeometry(radius * 1.02, 2), facetMat)
  facets.scale.copy(dome.scale)
  facets.position.copy(dome.position)
  facets.name = 'compound-eye'
  g.add(facets)
  return g
}

function metallicEyePair(at: [number, number, number], radius: number, domeMat: THREE.Material, facetMat: THREE.Material): THREE.Group {
  const g = new THREE.Group()
  g.add(metallicEye(at, radius, domeMat, facetMat), metallicEye([at[0], at[1], -at[2]], radius, domeMat, facetMat))
  return g
}

// ---------------------------------------------------------------- 建模主体

export function buildLacewing(): InsectModel {
  const g = new THREE.Group()

  const bodyMat = chitin({ color: '#8fc25a', gloss: 0.28, clearcoat: 0.06 })
  // B 轮半透组：腹部轻半透。bodyMat 被 head/thorax/abdomen 三处共用，直接加
  // translucent 会连头胸一起变透——单独分一份同色同光泽的 abdomenMat，只挂给
  // 腹部那一个 mesh，头/胸仍用原 bodyMat 不受影响。
  const abdomenMat = chitin({ color: '#8fc25a', gloss: 0.28, clearcoat: 0.06, translucent: true })
  const legMat = chitin({ color: '#7cb04d', gloss: 0.24 })
  const antennaMat = chitin({ color: '#79a848', gloss: 0.26 })
  // B 轮翅膜虹彩组：草蛉翅本来就带虹，加极轻掠射角虹彩（强度由 kit 常量控制）
  const wingFaceMat = membrane('#eef7e0', 0.1, { iridescent: true })
  const veinMat = chitin({ color: '#4f7a34', gloss: 0.3, side: THREE.DoubleSide })
  const eyeDomeMat = chitin({ color: '#c9a23c', gloss: 0.9, metal: 0.68, clearcoat: 0.4 })
  const eyeFacetMat = chitin({ color: '#e0c060', gloss: 0.82, metal: 0.6, clearcoat: 0.3, opacity: 0.82 })

  // ---- 头 / 胸 / 腹：细长柔弱
  const head = new THREE.Mesh(spindle([0.42, 0.02, 0], [0.57, 0.03, 0], 0.09, { bulge: 0.45, taperStart: 0.7, taperEnd: 0.4 }), bodyMat)
  g.add(head)

  const thoraxCenter = new THREE.Vector3(0.25, 0.03, 0)
  const thorax = new THREE.Mesh(spindle([0.08, 0, 0], [0.42, 0.015, 0], 0.1, { bulge: 0.5, flat: 1.0, taperStart: 0.6, taperEnd: 0.6 }), bodyMat)
  g.add(thorax)

  const abdomenFrom = new THREE.Vector3(0.06, -0.01, 0)
  const abdomenTo = new THREE.Vector3(-0.62, 0.01, 0)
  g.add(
    new THREE.Mesh(
      segmentedAbdomen({
        from: [abdomenFrom.x, abdomenFrom.y, abdomenFrom.z],
        to: [abdomenTo.x, abdomenTo.y, abdomenTo.z],
        r0: 0.075,
        r1: 0.012,
        segments: 7,
        groove: 0.16,
        bulge: 0.25,
      }),
      abdomenMat,
    ),
  )

  // ---- 金绿色金属复眼
  const eyeAt: [number, number, number] = [0.52, 0.05, 0.075]
  const eyeRadius = 0.065
  g.add(metallicEyePair(eyeAt, eyeRadius, eyeDomeMat, eyeFacetMat))

  // ---- 长丝状触角，向前伸
  const antBase: [number, number, number] = [0.55, 0.06, 0.045]
  const antLength = 1.15
  const antPitch = 10
  const antYaw = 18
  g.add(antennaPair({ base: antBase, length: antLength, kind: 'filiform', pitch: antPitch, yaw: antYaw, thickness: 0.009 }, antennaMat))

  // ---- 两对等大的网状翅，屋脊状盖在腹背上
  const wingOutline: [number, number][] = [
    [0, 0.1],
    [0.1, 0.5],
    [0.25, 0.82],
    [0.45, 0.98],
    [0.65, 1.0],
    [0.85, 0.78],
    [1, 0.3],
  ]
  const foreSpec: WingSpec = {
    base: [0.16, 0.13, 0.045],
    length: 1.4,
    width: 0.62,
    outline: wingOutline,
    spread: 270 + 0 - 30, // φ=30：明显偏向"收拢贴尾"一侧，但留够侧向落差，屋顶才有可辨的坡度
    tilt: 42,
    sweep: 0,
    thickness: 0.006,
  }
  const hindSpec: WingSpec = {
    base: [0.02, 0.1, 0.04],
    length: 1.3,
    width: 0.6,
    outline: wingOutline,
    spread: 270 - 4 - 28, // φ=28，略收在前翅之下
    tilt: 40,
    sweep: -4,
    thickness: 0.006,
  }

  let foreRight: WingAssembly | null = null
  for (const side of [1, -1] as const) {
    const fw = buildWing(foreSpec, wingFaceMat, veinMat, [9, 5], side)
    const hw = buildWing(hindSpec, wingFaceMat, veinMat, [9, 5], side)
    g.add(fw.pivot, hw.pivot)
    if (side === 1) foreRight = fw
  }

  // ---- 六足：纤细
  const legFront = { base: [0.34, -0.04, 0.09] as [number, number, number], femur: 0.14, tibia: 0.15, thickness: 0.012, splay: 26, sweep: -24, knee: 68 }
  const legMid = { base: [0.2, -0.05, 0.1] as [number, number, number], femur: 0.15, tibia: 0.16, thickness: 0.012, splay: 28, sweep: 6, knee: 70 }
  const legHind = { base: [0.02, -0.05, 0.095] as [number, number, number], femur: 0.16, tibia: 0.17, thickness: 0.012, splay: 26, sweep: 34, knee: 72 }
  g.add(legPair(legFront, legMat))
  g.add(legPair(legMid, legMat))
  g.add(legPair(legHind, legMat))

  // ---- anchor
  g.updateMatrixWorld(true)
  const wingTip = foreRight!.blade.localToWorld(foreRight!.tipLocal.clone())

  // 复刻 kit.antenna() 内 filiform 分支的末梢公式：droop = t²·length·0.35（t=1 时即 length·0.35），
  // z 项 = sin(π/2)·length·0.12·sign(yaw) = length·0.12·sign(yaw)（yaw>0 时取 +）。
  const antPitchRad = THREE.MathUtils.degToRad(antPitch)
  const antYawRad = THREE.MathUtils.degToRad(antYaw)
  const antDir = new THREE.Vector3(Math.cos(antPitchRad) * Math.cos(antYawRad), Math.sin(antPitchRad), Math.cos(antPitchRad) * Math.sin(antYawRad))
  const antennaTip = new THREE.Vector3(...antBase)
    .addScaledVector(antDir, antLength)
    .add(new THREE.Vector3(0, -antLength * 0.35, antLength * 0.12))

  const anchors: Record<string, THREE.Vector3> = {
    wing: wingTip,
    eye: new THREE.Vector3(eyeAt[0], eyeAt[1], eyeAt[2] + eyeRadius),
    antenna: antennaTip,
    thorax: thoraxCenter.clone(),
    abdomen: new THREE.Vector3().lerpVectors(abdomenFrom, abdomenTo, 0.45).add(new THREE.Vector3(0, 0.05, 0)),
    leg: new THREE.Vector3(legMid.base[0], legMid.base[1] - 0.12, legMid.base[2] + 0.1),
  }

  return finalize(g, anchors)
}
