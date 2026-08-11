/**
 * 萤火虫（山窗萤类型，参照窗萤属 Pyrocoelia 体型）
 *
 * 造型要点：
 * - 发光器（lantern）：腹部末端 2~3 节，位于腹面、乳白偏黄，用
 *   chitin() 的 emissive 做自发光。真实萤科发光器只在腹面可见、
 *   边界清晰，所以做成贴在腹部末节腹面的独立扁球体，而不是把整条
 *   腹部染色（那样背面也会发光，不对）。
 * - 前胸背板向前延伸成半圆形盾片，把头部整个盖住——萤科最好认的
 *   特征，背面视角完全看不到头。盾片上有两个透明"窗"。
 * - 鞘翅软、哑光、有纵棱和绒毛感：用较高 roughness（低 gloss）的
 *   chitin()，不用 elytra() 的强清漆（那是硬壳甲虫的观感）。
 * - 整体扁平（flat>1，dorsoventral 压扁）——萤火虫身体明显比多数
 *   甲虫扁，这样发光器在腹面才够显眼。
 */
import * as THREE from 'three'
import {
  antennaPair,
  chitin,
  compoundEyePair,
  finalize,
  legPair,
  loft,
  spindle,
  type InsectModel,
  type Section,
} from './kit'

/** 鞘翅表面纵棱：沿一条已知的中轴点串，在给定的弦向偏移比例处拉一条细棱 */
function elytronRidge(
  axisPts: THREE.Vector3[],
  widths: number[],
  zFrac: number,
  yLift: number,
  material: THREE.Material,
  tubeR = 0.006,
): THREE.Mesh {
  const sections: Section[] = axisPts.map((p, i) => ({
    at: p.clone().add(new THREE.Vector3(0, yLift, widths[i] * zFrac)),
    ry: tubeR,
    rz: tubeR,
  }))
  return new THREE.Mesh(loft(sections, 5), material)
}

export function buildFirefly(): InsectModel {
  const g = new THREE.Group()

  const shieldMat = chitin({ color: '#e8927a', gloss: 0.42, clearcoat: 0.1 }) // 前胸盾片：粉橙色
  const windowMat = chitin({ color: '#f3ead2', gloss: 0.55, opacity: 0.4, translucent: true }) // 盾片透明窗
  const elytronMat = chitin({ color: '#2a1f16', gloss: 0.16 }) // 软鞘翅：哑光深褐，高 roughness
  const marginMat = chitin({ color: '#cbb896', gloss: 0.3 }) // 鞘翅浅色侧缘边
  const bodyMat = chitin({ color: '#3a2c22', gloss: 0.3 })
  const legMat = chitin({ color: '#2e2319', gloss: 0.35 })
  const eyeMat = { color: '#171310' }
  // 发光器：乳白偏黄，强自发光；emissive 与底色都选浅黄绿，让"灯泡感"更足
  // B 轮半透组：加 translucent，发光器区读出"光透过软组织"的生物学质感；
  // emissive/emissiveIntensity 原样不动。腹部其余部分共用 bodyMat，不碰。
  const lanternMat = chitin({
    color: '#eef7c8',
    gloss: 0.35,
    emissive: '#c8ff8a',
    emissiveIntensity: 3.2,
    translucent: true,
  })

  // ---- 头部：藏在盾片下方，仅体型学占位，实际几乎不可见
  const head = new THREE.Mesh(
    spindle([0.42, 0.02, 0], [0.63, 0.05, 0], 0.1, { bulge: 0.4, flat: 1.1, taperStart: 0.2, taperEnd: 0.55 }),
    bodyMat,
  )
  g.add(head)

  // ---- 前胸背板：一片扁平的半圆形薄盾，而不是两个并排的大椭球！
  // 关键是 flat 取很大的值，让 rz（左右半径）远大于 ry（上下半径）——
  // 这样 spindle() 放样出来的是一片"贴在身体前端上方的指甲盖"，
  // 而不是圆滚滚的球体。taperStart/taperEnd 分别控制盾片后缘（衔接
  // 胸部处，宜稍窄）与前缘（覆盖头部的圆钝边，收窄但不收尖）。
  // 数值来源：目标宽度 0.76（明显小于下方鞘翅最宽处 ~0.96，满足
  // "宽度不超过鞘翅最宽处"）；目标最厚处 0.09（= 0.76/8.4，远小于
  // width/3），即 flat=√(rz/ry)=√(0.38/0.045)≈2.91，radius=√(ry·rz)≈0.131。
  const shieldRadius = 0.131
  const shieldFlat = 2.91
  const shield = new THREE.Mesh(
    spindle([0.15, 0.09, 0], [0.7, 0.13, 0], shieldRadius, {
      bulge: 0.6, // 盾片最宽处偏向前部，符合"半圆形"轮廓
      flat: shieldFlat,
      taperStart: 0.32, // 后缘：衔接胸部，收窄但不为 0
      taperEnd: 0.12, // 前缘：圆钝收边，覆盖头部
    }),
    shieldMat,
  )
  shield.name = 'pronotum-shield'
  g.add(shield)

  // ---- 盾片上的两个透明窗：对称嵌在盾片最宽处附近，尺寸随薄盾缩小
  for (const side of [1, -1]) {
    const win = new THREE.Mesh(new THREE.SphereGeometry(0.05, 14, 10), windowMat)
    win.scale.set(1, 0.5, 0.6)
    win.position.set(0.45, 0.112, side * 0.19)
    win.name = 'pronotum-window'
    g.add(win)
  }

  // ---- 中后胸：短小连接段，衔接盾片与腹部
  g.add(new THREE.Mesh(spindle([0.02, 0.03, 0], [0.14, 0.06, 0], 0.24, { bulge: 0.5, flat: 1.4 }), bodyMat))

  // ---- 腹部：扁平（flat>1 使身体上下压扁、左右加宽），多节收细
  const abdomenFrom = new THREE.Vector3(0.02, -0.02, 0)
  const abdomenTo = new THREE.Vector3(-0.86, 0.02, 0)
  const abdomenMesh = new THREE.Mesh(
    (function abdomen() {
      // 直接用 loft 手搭而非 segmentedAbdomen：末端 2~3 节要单独露出腹面
      // 给发光器贴片，用分节函数会把腹面完全包死，不便叠加发光片。
      const segs = 7
      const perSeg = 4
      const total = segs * perSeg
      const sections: Section[] = []
      for (let i = 0; i <= total; i++) {
        const t = i / total
        const env = t < 0.22 ? THREE.MathUtils.lerp(0.19, 0.24, t / 0.22) : THREE.MathUtils.lerp(0.24, 0.03, (t - 0.22) / 0.78)
        const local = (i % perSeg) / perSeg
        const groove = local > 0.72 ? 1 - 0.12 * Math.sin(((local - 0.72) / 0.28) * Math.PI) : 1
        const r = Math.max(env * groove, 0.006)
        sections.push({
          at: new THREE.Vector3().lerpVectors(abdomenFrom, abdomenTo, t),
          ry: r / 1.55, // flat>1：整体上下压扁
          rz: r * 1.55,
        })
      }
      return loft(sections, 20)
    })(),
    bodyMat,
  )
  abdomenMesh.name = 'abdomen-body'
  g.add(abdomenMesh)

  // ---- 发光器：腹部末 2~3 节的腹面，乳白自发光扁球，边界清晰
  // y 比腹部同一 X 处的腹面更低，让灯体明显凸出在腹面之下——
  // 从侧面看应该是一个清楚探出腹部轮廓外的小鼓包，而不是被腹部盖住。
  for (const [x, y, r] of [
    [-0.6, -0.1, 0.15],
    [-0.75, -0.088, 0.12],
  ] as const) {
    const lantern = new THREE.Mesh(new THREE.SphereGeometry(r, 16, 12), lanternMat)
    lantern.scale.set(1.35, 0.55, 1.05)
    lantern.position.set(x, y, 0)
    lantern.name = 'lantern'
    g.add(lantern)
  }

  // ---- 鞘翅：软质哑光，纵棱 + 浅色侧缘边，覆盖大半个腹部
  const eSteps = 20
  const axisPts: THREE.Vector3[] = []
  const widths: number[] = []
  const elytronSections: Section[] = []
  for (let i = 0; i <= eSteps; i++) {
    const t = i / eSteps
    // 前段稍宽、向后收窄至圆钝端——软鞘翅常见的长卵形轮廓
    const w = Math.sin(Math.pow(t, 0.7) * Math.PI * 0.9) * 0.34
    const axis = new THREE.Vector3(0.1 - 0.98 * t, 0.1 - 0.05 * t * t, 0)
    axisPts.push(axis)
    widths.push(Math.max(w, 0.01))
    elytronSections.push({ at: axis, ry: Math.max(w * 0.5, 0.008), rz: Math.max(w, 0.01) })
  }
  for (const side of [1, -1]) {
    const shell = new THREE.Mesh(loft(elytronSections, 18), elytronMat)
    shell.position.z = side * 0.14
    shell.scale.z = side
    shell.name = 'elytron-shell'
    g.add(shell)

    // 侧缘浅色边：贴着鞘翅最外侧轮廓走一条细边
    const marginPts = axisPts.map((p, i) => p.clone().add(new THREE.Vector3(0, widths[i] * 0.15, widths[i] * 0.98 * side)))
    g.add(
      new THREE.Mesh(
        loft(
          marginPts.map((p) => ({ at: p, ry: 0.012, rz: 0.012 })),
          6,
        ),
        marginMat,
      ),
    )

    // 两条纵棱：软鞘翅特有的细纵向隆起，营造绒毛质感的层次
    for (const zFrac of [0.35, 0.68]) {
      const ridge = elytronRidge(axisPts, widths, zFrac * side, 0.03, elytronMat, 0.007)
      g.add(ridge)
    }
  }

  // ---- 复眼：小而圆，位于头部两侧，从盾片下方略微探出
  g.add(compoundEyePair({ at: [0.56, 0.03, 0.17], radius: 0.065, color: eyeMat.color, flatten: 0.85, stretch: 1.0 }))

  // ---- 触角：丝状/锯齿状，中等长度（用 filiform 近似锯齿状触角的简化版）
  g.add(antennaPair({ base: [0.6, 0.07, 0.1], length: 0.34, kind: 'filiform', pitch: 30, yaw: 34, thickness: 0.012 }, bodyMat))

  // ---- 六足：细长
  g.add(legPair({ base: [0.28, -0.07, 0.16], femur: 0.22, tibia: 0.22, splay: 34, sweep: -30, knee: 72, thickness: 0.02 }, legMat))
  g.add(legPair({ base: [0.06, -0.08, 0.17], femur: 0.24, tibia: 0.24, splay: 32, sweep: 4, knee: 74, thickness: 0.02 }, legMat))
  g.add(legPair({ base: [-0.16, -0.08, 0.16], femur: 0.24, tibia: 0.26, splay: 30, sweep: 34, knee: 76, thickness: 0.02 }, legMat))

  const anchors: Record<string, THREE.Vector3> = {
    lantern: new THREE.Vector3(-0.68, -0.1, 0),
    elytra: new THREE.Vector3(-0.35, 0.1, 0.24),
    eye: new THREE.Vector3(0.58, 0.05, 0.2),
    antenna: new THREE.Vector3(0.62, 0.1, 0.16),
    thorax: new THREE.Vector3(0.14, 0.12, 0),
    leg: new THREE.Vector3(0.1, -0.18, 0.22),
  }

  return finalize(g, anchors)
}
