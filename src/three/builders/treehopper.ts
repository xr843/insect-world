/**
 * 角蝉 Centrotus sp.（半翅目·角蝉科）
 *
 * 造型要点：
 * - 本种存在的全部理由：前胸背板向上向后极度增生成一顶远大于虫体
 *   本身的「头盔」——一对向两侧上方伸出的尖角，加一根向后延伸盖过
 *   腹部的长背脊。kit 里没有任何一个部件是为「体积远超身体本身的
 *   附属结构」设计的（spindle/loft 都是沿一条路径收细的规则体），
 *   因此头盔完全自建：casque（盔基）+ 一对 horn（尖角，loft 出的
 *   细长锥体）+ keel（背脊，loft 出的向后上方扬起再压平延伸的长
 *   条），三者共用 helmetMat，且全部命名 'helmet'，与命名
 *   'bodyCore' 的头/胸/腹三段分开——测试要验的正是这两个命名并集
 *   包围盒的体积对比，建模时就必须让两类部件的 mesh.name 从不混用。
 * - 头盔体积「远大于」身体：不是靠堆网格密度，而是靠角与背脊的
 *   **空间跨度**——两只角左右分得极开（Z 向跨度远超虫体本身宽度），
 *   背脊向后延伸到接近腹部末端（X 向跨度接近整条虫体），角尖又抬得
 *   很高（Y 向远超体高）。包围盒体积看的是这三个方向跨度的乘积，
 *   角本身可以是纤细的尖锥（面数很省），只要跨度撑得够大，包围盒
 *   照样能远超身体本身那个矮而扁的小盒子——这也更符合真实角蝉「盔
 *   体本身多孔轻薄、靠外形唬人」的实况，不是靠堆体积去凑数字。
 * - 头盔表面粗糙、带脊瘤：角与盔基表面贴几颗大小不一的小球模拟瘤
 *   突（同 kit.compoundEye 用小球模拟小眼面facets 是一个思路），
 *   材质给低 gloss、低 clearcoat（哑光粗糙），颜色取褐绿，与树皮/
 *   荆棘拟态呼应。
 * - 身体本体楔形、小而普通：spindle 一次成型即可，头在前、腹在后，
 *   完全被头盔的体积盖过风头——这正是本物种「盔体喧宾夺主」的设计
 *   意图，不需要额外雕琢。
 * - 刺吸式口器直接用 kit.rostrum()（同 cicada.ts），向下后方伸。
 * - 膜翅收在头盔下方两侧：用 kit.wingPair()，spread 取接近侧展的
 *   角度、tilt 压低，让翅贴着体侧收拢，翅尖不出头盔投影范围。
 * - 后足跳跃：三对足都用 kit.legPair()，只有后足 thickness/femur
 *   明显加粗——角蝉受惊后弹跳靠的是这对粗壮的后足腿节。
 */
import * as THREE from 'three'
import {
  antennaPair,
  chitin,
  compoundEyePair,
  finalize,
  legPair,
  loft,
  membrane,
  rostrum,
  spindle,
  wingPair,
  type InsectModel,
  type LegSpec,
  type Section,
  type WingSpec,
} from './kit'

// ---------------------------------------------------------------- 局部辅助：头盔

/**
 * 一只角：从盔基某点出发，向上向外伸出的细长尖锥。
 * base 与 tip 都必须显式乘 side 再镜像——只镜像 tip 会让两只角共用
 * 同一个偏一侧的基点，其中一只角从右侧基点斜穿到左侧角尖，跟
 * hister-beetle.ts 里改掉的触角镜像 bug、以及 kit.ts 对 legPair 的
 * 警告是同一类问题。
 */
function horn(base: THREE.Vector3, side: 1 | -1, tip: THREE.Vector3, baseR: number, material: THREE.Material): THREE.Mesh {
  const steps = 10
  const sections: Section[] = []
  const baseMirrored = new THREE.Vector3(base.x, base.y, base.z * side)
  const tipMirrored = new THREE.Vector3(tip.x, tip.y, tip.z * side)
  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    const r = baseR * (1 - Math.pow(t, 1.3)) // 基部粗，迅速收尖
    sections.push({ at: new THREE.Vector3().lerpVectors(baseMirrored, tipMirrored, t), ry: Math.max(r, 1e-4), rz: Math.max(r, 1e-4) })
  }
  const mesh = new THREE.Mesh(loft(sections, 12), material)
  mesh.name = 'helmet'
  return mesh
}

/** 背脊：从盔基中央向后上方扬起，再压平延伸到腹部上方，末端收尖 */
function keel(base: THREE.Vector3, tailX: number, riseY: number, material: THREE.Material): THREE.Mesh {
  const steps = 16
  const sections: Section[] = []
  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    const x = THREE.MathUtils.lerp(base.x, tailX, t)
    // 先扬起（前 30%）再压平延伸（后 70%），末端下压收尖，贴近腹部背线收尾
    const y = t < 0.3 ? THREE.MathUtils.lerp(base.y, riseY, t / 0.3) : THREE.MathUtils.lerp(riseY, riseY * 0.72, (t - 0.3) / 0.7)
    const r = 0.045 * (1 - Math.pow(t, 1.6)) + 0.004
    sections.push({ at: new THREE.Vector3(x, y, 0), ry: Math.max(r * 0.75, 1e-4), rz: Math.max(r, 1e-4) })
  }
  const mesh = new THREE.Mesh(loft(sections, 14), material)
  mesh.name = 'helmet'
  return mesh
}

/** 盔基/角/背脊表面的瘤突：大小不一的小球贴附在表面 */
function tubercle(at: THREE.Vector3, r: number, material: THREE.Material): THREE.Mesh {
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(r, 8, 6), material)
  mesh.position.copy(at)
  mesh.name = 'helmet'
  return mesh
}

// ---------------------------------------------------------------- 主体

export function buildTreehopper(): InsectModel {
  const g = new THREE.Group()

  const helmetMat = chitin({ color: '#54603a', gloss: 0.24, clearcoat: 0.08 }) // 粗糙哑光，褐绿拟态树皮
  const helmetMat2 = chitin({ color: '#495332', gloss: 0.22, clearcoat: 0.06 }) // 瘤突略深一色，避免纯色平板感
  const bodyMat = chitin({ color: '#8a8358', gloss: 0.42, clearcoat: 0.16 }) // 身体本体：小而普通的浅褐绿
  const legMat = chitin({ color: '#726c46', gloss: 0.38, clearcoat: 0.12 })
  const antennaMat = chitin({ color: '#3a3524', gloss: 0.3 })
  const eyeColor = '#1c1712'
  const wingMat = membrane('#cfd6c2', 0.28)

  // ---- 身体本体：楔形，小而普通——头/胸/腹，统一命名 bodyCore 供测试量取
  // 「虫体本体」包围盒，与命名 helmet 的头盔部件严格分开。
  const headX = 0.38
  const thoraxX = 0.12
  const abdomenTailX = -0.4

  const head = new THREE.Mesh(spindle([headX, 0.0, 0], [thoraxX, 0.01, 0], 0.075, { bulge: 0.4, flat: 1.05, taperStart: 0.4, taperEnd: 0.75 }), bodyMat)
  head.name = 'bodyCore'
  g.add(head)

  const thorax = new THREE.Mesh(spindle([thoraxX, 0.01, 0], [-0.02, 0.02, 0], 0.09, { bulge: 0.5, flat: 1.0, taperStart: 0.85, taperEnd: 0.8 }), bodyMat)
  thorax.name = 'bodyCore'
  g.add(thorax)

  const abdomen = new THREE.Mesh(
    spindle([-0.02, 0.02, 0], [abdomenTailX, 0.0, 0], 0.085, { bulge: 0.2, flat: 1.0, taperStart: 0.7, taperEnd: 0.06 }),
    bodyMat,
  )
  abdomen.name = 'bodyCore'
  g.add(abdomen)

  // ---- 头盔：远大于身体的荒诞构造——盔基 + 一对尖角 + 一根压过腹部的长背脊
  const casqueBase = new THREE.Vector3(0.16, 0.09, 0)
  const casque = new THREE.Mesh(
    spindle([0.26, 0.07, 0], [0.02, 0.1, 0], 0.075, { bulge: 0.45, flat: 1.15, taperStart: 0.4, taperEnd: 0.35 }),
    helmetMat,
  )
  casque.name = 'helmet'
  g.add(casque)

  // 一对尖角：从盔基两侧向上、向外、略向前伸出，跨度远超体宽
  const hornBase = new THREE.Vector3(0.2, 0.13, 0.05)
  const hornTip = new THREE.Vector3(0.12, 0.44, 0.36) // tip.z 会在 horn() 内部按 side 镜像
  for (const side of [1, -1] as const) {
    g.add(horn(hornBase, side, hornTip, 0.052, helmetMat))
    // 角基部一颗瘤突，角尖附近再一颗小的——粗糙感
    g.add(tubercle(new THREE.Vector3(hornBase.x + 0.01, hornBase.y + 0.02, (hornBase.z + 0.06) * side), 0.028, helmetMat2))
    g.add(tubercle(new THREE.Vector3(hornTip.x + 0.03, hornTip.y - 0.07, hornTip.z * side * 0.82), 0.017, helmetMat2))
  }

  // 背脊：从盔基中央扬起，向后延伸盖过腹部大部分长度，末端在腹末之前收尖
  const keelTailX = abdomenTailX + 0.06
  g.add(keel(casqueBase, keelTailX, 0.24, helmetMat))
  // 盔基顶部再点几颗瘤突
  g.add(tubercle(new THREE.Vector3(0.16, 0.16, 0.018), 0.02, helmetMat2))
  g.add(tubercle(new THREE.Vector3(0.08, 0.19, -0.012), 0.016, helmetMat2))
  g.add(tubercle(new THREE.Vector3(0.22, 0.14, 0), 0.014, helmetMat2))

  // ---- 复眼：头部两侧
  const eyeAt: [number, number, number] = [0.32, 0.03, 0.065]
  g.add(compoundEyePair({ at: eyeAt, radius: 0.032, color: eyeColor, flatten: 0.85, facets: false }))

  // ---- 刺吸式口器：向下后方伸
  const rostrumAt: [number, number, number] = [0.34, -0.03, 0]
  const rostrumLen = 0.22
  g.add(rostrum({ at: rostrumAt, length: rostrumLen, thickness: 0.018, angle: 62 }, bodyMat))

  // ---- 触角：短小，藏在头盔投影下方
  const antBase: [number, number, number] = [0.34, 0.03, 0.04]
  g.add(antennaPair({ base: antBase, length: 0.09, kind: 'setaceous', pitch: 10, yaw: 40, thickness: 0.012 }, antennaMat))

  // ---- 膜翅：收在头盔下方两侧，贴体收拢，翅尖不出头盔投影
  const wingSpec: WingSpec = {
    base: [0.02, -0.01, 0.08],
    length: 0.4,
    width: 0.17,
    spread: 6, // 接近侧展，贴着体侧
    tilt: -22, // 略下垂贴体
    sweep: -4,
  }
  g.add(wingPair(wingSpec, wingMat))

  // ---- 六足：前中足普通，后足加粗——受惊弹跳靠这对腿
  const frontLeg: LegSpec = { base: [0.24, -0.05, 0.07], femur: 0.13, tibia: 0.12, tarsus: 0.06, thickness: 0.016, splay: 34, sweep: -26, knee: 62 }
  const midLeg: LegSpec = { base: [0.1, -0.055, 0.075], femur: 0.14, tibia: 0.13, tarsus: 0.065, thickness: 0.017, splay: 32, sweep: 6, knee: 64 }
  const hindLeg: LegSpec = { base: [-0.08, -0.055, 0.075], femur: 0.19, tibia: 0.17, tarsus: 0.07, thickness: 0.026, splay: 30, sweep: 42, knee: 70 }

  g.add(legPair(frontLeg, legMat))
  g.add(legPair(midLeg, legMat))
  const hindRig = legPair(hindLeg, legMat)
  g.add(hindRig)
  const hindLegTip = (hindRig.children[0] as THREE.Group).userData.tip as THREE.Vector3

  const anchors: Record<string, THREE.Vector3> = {
    helmet: new THREE.Vector3(hornTip.x, hornTip.y, 0),
    wing: new THREE.Vector3(wingSpec.base[0] - 0.15, wingSpec.base[1] - 0.02, wingSpec.base[2] + 0.16),
    eye: new THREE.Vector3(eyeAt[0], eyeAt[1] + 0.03, eyeAt[2] + 0.032),
    rostrum: new THREE.Vector3(rostrumAt[0] - rostrumLen * 0.4, rostrumAt[1] - rostrumLen * 0.85, 0),
    hindleg: hindLegTip.clone(),
    abdomen: new THREE.Vector3(abdomenTailX + 0.1, 0.02, 0.03),
  }

  return finalize(g, anchors)
}
