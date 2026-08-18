/**
 * 黑蚱蝉生活史两个阶段（卵 / 若虫）的形态断言。
 *
 * ## 写这些断言时的自检标准
 *
 * **把代码改回出问题的版本，这条断言会失败吗？** 不会就等于没写。
 * 下面每条后面都注了它到底拦的是哪一次实拍出来的毛病 —— 这一轮的四机位
 * 目视验收连着打回三次，被拦下的分别是「像小龙虾」「翅芽读成一道划痕」
 * 「腹末是一刀平口」。
 *
 * 还有一条更贵的教训：**断言量的是数字，人看的是长相，两者可以毫无关系。**
 * 兰花螳螂的花瓣状腿节「宽 ≥ 厚 3.5 倍」测出 5.75 全绿，渲染出来却是几片
 * 侧立薄板 —— 因为宽厚比这个数字对「板立着还是躺着」完全不敏感。
 * 所以这里凡是量「粗细/饱满」的地方，一律**不用轴对齐包围盒**
 * （那是斜着放的部件的最大骗子：对角线会把三个维度搅在一起），
 * 而是把顶点投影到垂直于部件自身长轴的平面上，绕一圈量支撑函数，
 * 取其中的最大值与最小值 —— 一块板的这两个值差一个数量级，
 * 一根饱满的纺锤体则相差无几。这个量和人在剪影里看到的是同一件事。
 */
import * as THREE from 'three'
import { describe, expect, it } from 'vitest'
import { buildCicadaEgg } from '../stages/cicada-egg'
import { buildCicadaNymph, FORE_FEMUR_DIR } from '../stages/cicada-nymph'

const TRIANGLE_BUDGET = 60_000

// ---------------------------------------------------------------- 量取工具

function meshesByName(root: THREE.Object3D, name: string): THREE.Mesh[] {
  const out: THREE.Mesh[] = []
  root.traverse((o) => {
    const m = o as THREE.Mesh
    if (m.isMesh && m.name === name) out.push(m)
  })
  return out
}

/** 一个 mesh 的全部顶点，换算到模型局部坐标（= finalize 居中之后的世界坐标） */
function worldPoints(m: THREE.Mesh): THREE.Vector3[] {
  const pos = m.geometry.getAttribute('position')
  const out: THREE.Vector3[] = []
  for (let i = 0; i < pos.count; i++) {
    out.push(new THREE.Vector3(pos.getX(i), pos.getY(i), pos.getZ(i)).applyMatrix4(m.matrixWorld))
  }
  return out
}

function centroid(pts: readonly THREE.Vector3[]): THREE.Vector3 {
  const c = new THREE.Vector3()
  for (const p of pts) c.add(p)
  return c.multiplyScalar(1 / pts.length)
}

/** 协方差矩阵的主特征向量（幂迭代）—— 用于长轴方向未知的部件（中后足各节） */
function dominantAxis(pts: readonly THREE.Vector3[]): THREE.Vector3 {
  const c = centroid(pts)
  const cov = new Array(9).fill(0)
  for (const p of pts) {
    const d = [p.x - c.x, p.y - c.y, p.z - c.z]
    for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) cov[i * 3 + j] += d[i] * d[j]
  }
  let v = new THREE.Vector3(1, 0.3, 0.2).normalize()
  for (let k = 0; k < 60; k++) {
    const nv = new THREE.Vector3(
      cov[0] * v.x + cov[1] * v.y + cov[2] * v.z,
      cov[3] * v.x + cov[4] * v.y + cov[5] * v.z,
      cov[6] * v.x + cov[7] * v.y + cov[8] * v.z,
    )
    if (nv.lengthSq() < 1e-18) break
    v = nv.normalize()
  }
  return v
}

/** 垂直于 axis 的平面上，绕一圈量支撑半径：返回 { max, min, length }。 */
function crossSection(
  pts: readonly THREE.Vector3[],
  axis: THREE.Vector3,
  anchor: THREE.Vector3,
): { max: number; min: number; length: number } {
  const a = axis.clone().normalize()
  // 垂直平面的一组正交基
  const seed = Math.abs(a.x) < 0.9 ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 1, 0)
  const e1 = new THREE.Vector3().crossVectors(a, seed).normalize()
  const e2 = new THREE.Vector3().crossVectors(a, e1).normalize()

  const perp: [number, number][] = []
  let lo = Infinity
  let hi = -Infinity
  const d = new THREE.Vector3()
  for (const p of pts) {
    d.subVectors(p, anchor)
    const along = d.dot(a)
    lo = Math.min(lo, along)
    hi = Math.max(hi, along)
    perp.push([d.dot(e1), d.dot(e2)])
  }

  let max = 0
  let min = Infinity
  const STEPS = 180 // 每 1° 一个方向：椭圆截面下取到的就是长半轴与短半轴
  for (let i = 0; i < STEPS; i++) {
    const th = (i / STEPS) * Math.PI
    const cx = Math.cos(th)
    const cy = Math.sin(th)
    let support = 0
    for (const [u, v] of perp) support = Math.max(support, Math.abs(u * cx + v * cy))
    max = Math.max(max, support)
    min = Math.min(min, support)
  }
  return { max, min, length: hi - lo }
}

function boxOfNames(root: THREE.Object3D, names: readonly string[]): THREE.Box3 {
  const box = new THREE.Box3()
  for (const n of names) for (const m of meshesByName(root, n)) box.union(new THREE.Box3().setFromObject(m))
  return box
}

function localSize(m: THREE.Mesh): THREE.Vector3 {
  m.geometry.computeBoundingBox()
  const s = new THREE.Vector3()
  m.geometry.boundingBox!.getSize(s)
  return s
}

/*
 * 取材质基色的明度。**必须显式指定 sRGB 空间**：three 默认的
 * working color space 是线性的，`getHSL()` 不传第二参数拿到的是线性明度 ——
 * 数值比设计时看的十六进制小一大截（#946230 的 L 从 38% 变成 16%），
 * 于是各档之间的差被压扁，阈值要么全过、要么全挂，都跟人眼看到的对不上。
 */
function lightnessOf(m: THREE.Mesh): number {
  const hsl = { h: 0, s: 0, l: 0 }
  ;(m.material as THREE.MeshStandardMaterial).color.getHSL(hsl, THREE.SRGBColorSpace)
  return hsl.l
}

function healthOf(root: THREE.Object3D): { triangles: number; nan: number; meshes: number } {
  let triangles = 0
  let nan = 0
  let meshes = 0
  root.traverse((o) => {
    const m = o as THREE.Mesh
    if (!m.isMesh || !m.geometry) return
    meshes++
    const pos = m.geometry.getAttribute('position')
    triangles += m.geometry.index ? m.geometry.index.count / 3 : pos.count / 3
    const arr = pos.array as ArrayLike<number>
    for (let i = 0; i < arr.length; i++) if (!Number.isFinite(arr[i])) nan++
  })
  return { triangles: Math.round(triangles), nan, meshes }
}

// ---------------------------------------------------------------- 若虫

describe('黑蚱蝉若虫（知了猴） buildCicadaNymph', () => {
  const model = buildCicadaNymph()
  model.group.updateMatrixWorld(true)

  const TRUNK = ['head', 'clypeus', 'pronotum', 'mesonotum', 'abdomen'] as const
  const trunkBox = boxOfNames(model.group, TRUNK)
  const trunkSize = new THREE.Vector3()
  trunkBox.getSize(trunkSize)

  const femurAxis = new THREE.Vector3(...FORE_FEMUR_DIR).normalize()
  const femurs = meshesByName(model.group, 'fore-femur')
  const rightFemur = femurs.filter((m) => centroid(worldPoints(m)).z > 0)[0]
  const femurPts = worldPoints(rightFemur)
  const femurAnchor = centroid(femurPts)
  const femurCS = crossSection(femurPts, femurAxis, femurAnchor)

  it('基础健壮：无 NaN、面数在预算内、半径落在昆虫量级', () => {
    const h = healthOf(model.group)
    // eslint-disable-next-line no-console
    console.log(`[cicada-nymph] triangles=${h.triangles} meshes=${h.meshes} radius=${model.radius.toFixed(3)}`)
    expect(h.nan, `发现 ${h.nan} 个 NaN/Inf 顶点`).toBe(0)
    expect(h.triangles).toBeLessThanOrEqual(TRIANGLE_BUDGET)
    expect(model.radius).toBeGreaterThan(0.02)
    expect(model.radius).toBeLessThan(12)
  })

  it('体长 3~3.5 厘米，且是「矮胖」不是「细长」', () => {
    // eslint-disable-next-line no-console
    console.log(
      `[cicada-nymph] trunk = ${trunkSize.x.toFixed(3)} × ${trunkSize.y.toFixed(3)}(高) × ${trunkSize.z.toFixed(3)}(宽)` +
        ` 长/宽 = ${(trunkSize.x / Math.max(trunkSize.y, trunkSize.z)).toFixed(2)}`,
    )
    expect(trunkSize.x, `体长 ${trunkSize.x.toFixed(2)} 应落在 2.9~3.6（1 单位 = 1 厘米）`).toBeGreaterThan(2.9)
    expect(trunkSize.x).toBeLessThan(3.6)

    /*
     * 这条拦的是第一版：长/宽 3.9，四个机位一致读成「小龙虾」——
     * 一条细长的分节躯干拖着锥形尾、前面两把钳子，全是螯虾的语汇。
     * 知了猴实测长/宽 ≈ 2.7。上限 3.4 拦细长，下限 2.2 拦「做成一个球」。
     */
    const slender = trunkSize.x / Math.max(trunkSize.y, trunkSize.z)
    expect(slender, `躯干长/宽 ${slender.toFixed(2)} 太细长了，会读成小龙虾而不是知了猴`).toBeLessThan(3.4)
    expect(slender, `躯干长/宽 ${slender.toFixed(2)} 太短粗，不成虫形`).toBeGreaterThan(2.2)

    /*
     * 上面那条量的是整条躯干的最大宽度，而最大宽度可能来自腹部 ——
     * 变异测试实测：只把胸部收窄、腹部不动，上面那条照样是绿的。
     * 所以再单独钉一条中胸：知了猴的胸是全身最宽处，宽/体长 ≈ 0.36。
     */
    const thorax = new THREE.Vector3()
    boxOfNames(model.group, ['mesonotum']).getSize(thorax)
    const thoraxRel = thorax.z / trunkSize.x
    // eslint-disable-next-line no-console
    console.log(`[cicada-nymph] 中胸宽 ${thorax.z.toFixed(3)} / 体长 = ${thoraxRel.toFixed(3)}`)
    expect(thoraxRel, `中胸宽只有体长的 ${(thoraxRel * 100).toFixed(0)}%，胸不够壮，整只会读成细长的虾`).toBeGreaterThan(0.3)
    expect(thoraxRel).toBeLessThan(0.5)
  })

  it('腹部是钝圆的桶，不是收成尖的虾尾', () => {
    /*
     * 「像小龙虾」被打回三次，除了整体太细长，另一半原因就是腹部：
     * 第一版从胸部起一路匀速收细、末端还是个平切口，那是螯虾腹的语汇。
     * 知了猴的腹是**桶形**：先鼓着走大半段，最后一小段才收圆。
     * 这里沿 x 切 24 片量每片的最大 |z|，看包络掉得有多快 ——
     * 匀速收尖的锥体在 70% 处只剩三成，桶形则还有七成以上。
     */
    const pts: THREE.Vector3[] = []
    for (const m of meshesByName(model.group, 'abdomen')) pts.push(...worldPoints(m))
    let lo = Infinity
    let hi = -Infinity
    for (const p of pts) {
      lo = Math.min(lo, p.x)
      hi = Math.max(hi, p.x)
    }
    const SLICES = 24
    const w = new Array(SLICES).fill(0)
    for (const p of pts) {
      // t = 0 在腹基（靠胸一侧，x 大），t = 1 在腹末
      const t = (hi - p.x) / (hi - lo)
      const i = Math.min(SLICES - 1, Math.max(0, Math.floor(t * SLICES)))
      w[i] = Math.max(w[i], Math.abs(p.z))
    }
    const peak = Math.max(...w)
    const at70 = w[Math.floor(0.7 * SLICES)]
    // eslint-disable-next-line no-console
    console.log(
      `[cicada-nymph] 腹部包络 峰值半宽=${peak.toFixed(3)}，70% 处=${at70.toFixed(3)}（${((at70 / peak) * 100).toFixed(0)}%），` +
        `末片=${w[SLICES - 1].toFixed(3)}`,
    )
    expect(at70 / peak, `腹部在 70% 处只剩峰值的 ${((at70 / peak) * 100).toFixed(0)}%，收得像虾尾了`).toBeGreaterThan(0.6)
    // 末端也不能是一刀平口：最后一片必须已经收下来（钝圆，不是切断的管子）
    expect(w[SLICES - 1] / peak, '腹末没收圆，是一刀平口的管子').toBeLessThan(0.55)
    expect(w[SLICES - 1] / peak, '腹末收成尖了，知了猴的腹末是钝圆的').toBeGreaterThan(0.04)
  })

  it('前足腿节最粗处显著粗于中后足 —— 三对腿一样粗就等于没做开掘足', () => {
    let walkMax = 0
    for (const w of meshesByName(model.group, 'walk-leg')) {
      const pts = worldPoints(w)
      walkMax = Math.max(walkMax, crossSection(pts, dominantAxis(pts), centroid(pts)).max)
    }
    expect(walkMax, '找不到 walk-leg（中后足）').toBeGreaterThan(0)
    const ratio = femurCS.max / walkMax
    // eslint-disable-next-line no-console
    console.log(
      `[cicada-nymph] 前足腿节最粗半径 ${femurCS.max.toFixed(4)} / 中后足最粗半径 ${walkMax.toFixed(4)} = ${ratio.toFixed(2)}`,
    )
    // 下限：差 2.2 倍以下，在成图里看不出「一对小挖掘机爪 + 四条细腿」的对比。
    // 上限：超过 6 倍就不是腿了，是挂了两个球（天蛾的喙只给下限、长成标枪，是同一类事故）。
    expect(ratio, `前足腿节只有中后足的 ${ratio.toFixed(2)} 倍，粗细差一眼看不出来`).toBeGreaterThanOrEqual(2.2)
    expect(ratio, `前足腿节到了中后足的 ${ratio.toFixed(2)} 倍，膨大过头`).toBeLessThanOrEqual(6)
  })

  it('开掘足腿节是三维饱满的纺锤体，不是一块加粗的平板', () => {
    /*
     * 兰花螳螂的坑：宽厚比 5.75 全绿，渲染出来是几片侧立的薄板。
     * 所以这里量的不是轴对齐包围盒（腿节是斜着放的，AABB 会把长度混进粗细里），
     * 而是把顶点投到垂直于腿节自身长轴的平面上、绕一圈取支撑半径的最大与最小值。
     * 一块板：min/max ≈ 0.1；一个饱满的椭圆截面：≈ 0.77。
     */
    const fatness = femurCS.min / femurCS.max
    const aspect = femurCS.length / (femurCS.max * 2)
    // eslint-disable-next-line no-console
    console.log(
      `[cicada-nymph] 腿节截面 max=${femurCS.max.toFixed(4)} min=${femurCS.min.toFixed(4)} min/max=${fatness.toFixed(3)}` +
        ` 长=${femurCS.length.toFixed(3)} 长/粗=${aspect.toFixed(2)}`,
    )
    expect(fatness, `腿节截面 min/max = ${fatness.toFixed(3)}，这是一块板不是一个纺锤体`).toBeGreaterThanOrEqual(0.55)
    expect(fatness).toBeLessThanOrEqual(1.0)
    // 长/粗同时给上下限：太小是个球，太大就退回成普通的细腿了
    expect(aspect, `腿节长/粗 ${aspect.toFixed(2)}，短得像个球`).toBeGreaterThanOrEqual(1.2)
    expect(aspect, `腿节长/粗 ${aspect.toFixed(2)}，细得不像膨大的开掘腿节`).toBeLessThanOrEqual(3.0)
  })

  it('腿节腹缘的齿突真的凸出到腿节最粗处轮廓之外，而且是锥不是片', () => {
    const teeth = meshesByName(model.group, 'fore-tooth')
    expect(teeth.length, '齿突数量应是每侧 3 枚、共 6 枚').toBe(6)

    const right = teeth.filter((m) => centroid(worldPoints(m)).z > 0)
    expect(right.length).toBe(3)
    for (const [i, t] of right.entries()) {
      const pts = worldPoints(t)
      // 到腿节轴线的最大垂距 —— 这正是「在剪影里探出去多少」
      let reach = 0
      const d = new THREE.Vector3()
      for (const p of pts) {
        d.subVectors(p, femurAnchor).addScaledVector(femurAxis, -d.clone().subVectors(p, femurAnchor).dot(femurAxis))
        reach = Math.max(reach, d.length())
      }
      const out = reach - femurCS.max
      // 齿突自身的截面：也要是有体积的锥，不是三角片
      const own = crossSection(pts, dominantAxis(pts), centroid(pts))
      // eslint-disable-next-line no-console
      console.log(
        `[cicada-nymph] 齿突#${i} 到腿节轴线 ${reach.toFixed(3)}（腿节最粗 ${femurCS.max.toFixed(3)}，探出 ${out.toFixed(3)}）` +
          ` 自身截面 min/max=${(own.min / own.max).toFixed(2)}`,
      )
      expect(out, `齿突#${i} 只探出腿节轮廓 ${out.toFixed(3)}，在剪影里根本看不见`).toBeGreaterThan(0.05)
      expect(out, `齿突#${i} 探出 ${out.toFixed(3)}，长成了一排尖刺而不是齿突`).toBeLessThan(0.3)
      expect(own.min / own.max, `齿突#${i} 是一片扁片，不是有体积的齿`).toBeGreaterThan(0.6)
    }
  })

  it('翅芽存在、扁而不薄，且只搭到腹部前段 —— 不是一副完整的翅', () => {
    const pads = meshesByName(model.group, 'wing-pad')
    expect(pads.length, '翅芽应是一对').toBe(2)

    // 翅芽的几何是沿自身 +X 建的，局部包围盒就是 (长, 厚, 宽)，不需要再投影
    const s = localSize(pads[0])
    const flat = s.y / s.z
    // eslint-disable-next-line no-console
    console.log(`[cicada-nymph] 翅芽 长=${s.x.toFixed(3)} 厚=${s.y.toFixed(3)} 宽=${s.z.toFixed(3)} 厚/宽=${flat.toFixed(3)}`)
    expect(flat, `翅芽厚/宽 ${flat.toFixed(2)}，太厚了，读不出「扁芽」`).toBeLessThanOrEqual(0.45)
    expect(flat, `翅芽厚/宽 ${flat.toFixed(2)}，薄成一张纸片了`).toBeGreaterThanOrEqual(0.12)

    // 长度：完整的成虫前翅是体长的 ~87%（cicada.ts 里前翅 2.75 / 体长 ~3.2）。
    // 翅芽必须明显短于它，否则「翅还是芽」这句话在画面上不成立。
    const rel = s.x / trunkSize.x
    expect(rel, `翅芽长 = 体长的 ${(rel * 100).toFixed(0)}%，太长了，已经是一副翅而不是芽`).toBeLessThanOrEqual(0.45)
    expect(rel, `翅芽长 = 体长的 ${(rel * 100).toFixed(0)}%，短到看不出是翅`).toBeGreaterThanOrEqual(0.22)

    /*
     * 末端位置：这一条才是「不完全变态」的可视证据。
     * 量的是翅芽尖在腹部上落到百分之几处 —— 要真的搭到腹部（不是停在胸上），
     * 又绝不能盖过腹部一半（那就是成虫的翅了）。
     */
    const padBox = boxOfNames(model.group, ['wing-pad'])
    const abBox = boxOfNames(model.group, ['abdomen'])
    const abLen = abBox.max.x - abBox.min.x
    const into = (abBox.max.x - padBox.min.x) / abLen
    // eslint-disable-next-line no-console
    console.log(
      `[cicada-nymph] 翅芽末端 x=${padBox.min.x.toFixed(3)}，腹部 x∈[${abBox.min.x.toFixed(3)}, ${abBox.max.x.toFixed(3)}]，` +
        `落在腹部前 ${(into * 100).toFixed(0)}%`,
    )
    expect(into, '翅芽根本没搭到腹部，停在胸部上了').toBeGreaterThan(0.1)
    expect(into, `翅芽盖到腹部 ${(into * 100).toFixed(0)}% 处，那已经是成虫的翅了`).toBeLessThan(0.5)
  })

  it('刺吸式喙存在，向后贴伏在腹面，不是向下扎的一根标枪', () => {
    const beak = meshesByName(model.group, 'rostrum')
    expect(beak.length, '找不到 rostrum').toBe(1)
    const box = new THREE.Box3().setFromObject(beak[0])
    const dx = box.max.x - box.min.x
    const dy = box.max.y - box.min.y
    const slope = dy / dx
    const trunkMidY = (trunkBox.min.y + trunkBox.max.y) / 2
    // eslint-disable-next-line no-console
    console.log(
      `[cicada-nymph] 喙 x 跨度 ${dx.toFixed(3)}、y 落差 ${dy.toFixed(3)}、落差/跨度 ${slope.toFixed(2)}，` +
        `最高点 y=${box.max.y.toFixed(3)}（躯干中线 y=${trunkMidY.toFixed(3)}）`,
    )
    expect(dx, `喙的前后跨度只有 ${dx.toFixed(2)}，短得不像蝉的喙`).toBeGreaterThan(0.8)
    expect(dx, `喙的前后跨度 ${dx.toFixed(2)}，长过头了`).toBeLessThan(1.6)
    /*
     * 「贴伏腹面」的可测形式：落差/跨度。
     * 竖着往下扎的喙（蚊子的姿态、或天蛾那根「标枪」）这个比值 ≥ 1；
     * 贴着腹面向后伸的蝉喙 ≈ 0.28。上限 0.55 拦立起来，下限 0.05 拦「水平一根针」。
     */
    expect(slope, `喙的落差/跨度 ${slope.toFixed(2)}，立起来了，那是蚊子的刺吸姿态不是蝉的`).toBeLessThan(0.55)
    expect(slope).toBeGreaterThan(0.05)
    expect(box.max.y, '喙整根都应在躯干中线以下（腹面）').toBeLessThan(trunkMidY)
  })

  it('通体土褐，但翅芽与开掘足必须靠明度差与胸背分得开', () => {
    /*
     * 第 5 轮 10 只里 7 只返工，一半原因是「颜色压过了头」：招牌图案压成
     * 深灰叠深灰，在画面上直接消失，而断言只看基色 HSL 一路全绿。
     * 这只通体土褐，正是最容易糊成一团的那种配色，所以把明度差本身钉住。
     */
    const l = (n: string) => lightnessOf(meshesByName(model.group, n)[0])
    const thorax = l('mesonotum')
    const pad = l('wing-pad')
    const femur = l('fore-femur')
    const vein = l('pad-vein')
    // eslint-disable-next-line no-console
    console.log(
      `[cicada-nymph] 明度 胸背=${thorax.toFixed(3)} 翅芽=${pad.toFixed(3)} 开掘足=${femur.toFixed(3)} 翅脉=${vein.toFixed(3)}`,
    )
    expect(Math.abs(thorax - pad), '翅芽与胸背的明度差太小，会在土褐里糊成一片').toBeGreaterThan(0.08)
    expect(Math.abs(thorax - femur), '开掘足与胸背的明度差太小，招牌结构会消失').toBeGreaterThan(0.08)
    expect(Math.abs(vein - pad), '翅脉与翅芽的明度差太小，翅芽会读成一块黑斑').toBeGreaterThan(0.15)
  })

  it('anchors 齐备且无 NaN', () => {
    const keys = Object.keys(model.anchors).sort()
    expect(keys).toEqual(['abdomen', 'eye', 'foreleg', 'head', 'rostrum', 'wingPad'])
    for (const k of keys) {
      const v = model.anchors[k]
      expect(Number.isFinite(v.x) && Number.isFinite(v.y) && Number.isFinite(v.z), `anchor ${k} 含 NaN`).toBe(true)
    }
  })
})

// ---------------------------------------------------------------- 卵

describe('黑蚱蝉卵 buildCicadaEgg', () => {
  const model = buildCicadaEgg()
  model.group.updateMatrixWorld(true)

  it('基础健壮：无 NaN、面数在预算内、半径落在昆虫量级', () => {
    const h = healthOf(model.group)
    // eslint-disable-next-line no-console
    console.log(`[cicada-egg] triangles=${h.triangles} meshes=${h.meshes} radius=${model.radius.toFixed(3)}`)
    expect(h.nan).toBe(0)
    expect(h.triangles).toBeLessThanOrEqual(TRIANGLE_BUDGET)
    expect(model.radius).toBeGreaterThan(0.02)
    expect(model.radius).toBeLessThan(12)
  })

  it('卵是细长梭形：长 2.5 毫米上下、长径比 4~9，横截面是圆的不是扁的', () => {
    const eggs = meshesByName(model.group, 'egg')
    expect(eggs.length, '一个卵室里应有数粒卵').toBeGreaterThanOrEqual(3)

    for (const [i, e] of eggs.entries()) {
      /*
       * 卵的几何沿 +X 建一次、四个 mesh 共用同一份，摆放靠 mesh 变换 ——
       * 所以局部包围盒恰好就是 (长, 直径, 直径)，量长径比时不掺进摆放姿态。
       * （若把卵直接放样到最终位置，斜置会让 x 跨度里混进侧向分量，
       *   量出来的「长径比」和人看到的细长程度就不是同一件事了。）
       */
      const s = localSize(e)
      const dia = Math.max(s.y, s.z)
      const ratio = s.x / dia
      if (i === 0) {
        // eslint-disable-next-line no-console
        console.log(`[cicada-egg] 卵 长=${s.x.toFixed(4)} 直径=${dia.toFixed(4)} 长径比=${ratio.toFixed(2)}`)
      }
      expect(s.x, `卵长 ${s.x.toFixed(3)}，蝉卵约 2.5 毫米（模型 0.25）`).toBeGreaterThan(0.18)
      expect(s.x).toBeLessThan(0.35)
      // 上下限一起给：只给下限的话，卵会越做越像一根针（天蛾的喙就是这么长成标枪的）
      expect(ratio, `卵的长径比 ${ratio.toFixed(2)}，太粗，读成一颗普通的圆卵了`).toBeGreaterThanOrEqual(4)
      expect(ratio, `卵的长径比 ${ratio.toFixed(2)}，细成一根针了`).toBeLessThanOrEqual(9)
      expect(
        Math.abs(s.y - s.z) / dia,
        '卵的横截面被压扁了 —— 梭形卵是圆截面，扁了会读成一片米粒状的贴片',
      ).toBeLessThan(0.1)
    }
  })

  it('卵产在枝条里：有树皮、有剖面木质、有产卵孔，且卵都落在卵室内', () => {
    for (const n of ['twig-bark', 'nest-floor', 'nest-lining', 'wood-face', 'scar']) {
      expect(meshesByName(model.group, n).length, `缺少 ${n}`).toBeGreaterThan(0)
    }
    const nest = boxOfNames(model.group, ['nest-floor'])
    const eggs = boxOfNames(model.group, ['egg'])
    // 卵必须躺在卵室底之上、且横向不越出卵室 —— 否则就是几粒白点浮在枝条外面
    expect(eggs.min.y, '卵陷到卵室底之下去了').toBeGreaterThan(nest.min.y)
    expect(eggs.max.y, '卵浮在卵室上方，没有「产在枝里」').toBeLessThan(nest.max.y + 0.09)
    const nestSize = new THREE.Vector3()
    nest.getSize(nestSize)
    const eggSize = new THREE.Vector3()
    eggs.getSize(eggSize)
    // eslint-disable-next-line no-console
    console.log(
      `[cicada-egg] 卵群包围盒 ${eggSize.toArray().map((v) => v.toFixed(3)).join(' × ')}，` +
        `卵室 ${nestSize.toArray().map((v) => v.toFixed(3)).join(' × ')}`,
    )
    expect(eggSize.x).toBeLessThan(nestSize.x * 1.05)
    expect(eggSize.z).toBeLessThan(nestSize.z * 1.05)
  })

  it('明度阶梯：卵是全画面最亮的东西，绝不会被基座吃掉', () => {
    const l = (n: string) => lightnessOf(meshesByName(model.group, n)[0])
    const egg = l('egg')
    const nest = l('nest-floor')
    const bark = l('twig-bark')
    // eslint-disable-next-line no-console
    console.log(`[cicada-egg] 明度 卵=${egg.toFixed(3)} 卵室=${nest.toFixed(3)} 树皮=${bark.toFixed(3)}`)
    expect(egg, '卵没比卵室底亮出一档，白卵会陷进木色里').toBeGreaterThan(nest + 0.15)
    expect(nest, '卵室底没比树皮亮，剖面读不出「皮在外、木在内」').toBeGreaterThan(bark + 0.08)
  })

  it('anchors 齐备且无 NaN', () => {
    const keys = Object.keys(model.anchors).sort()
    expect(keys).toEqual(['egg', 'nest', 'scar', 'twig'])
    for (const k of keys) {
      const v = model.anchors[k]
      expect(Number.isFinite(v.x) && Number.isFinite(v.y) && Number.isFinite(v.z), `anchor ${k} 含 NaN`).toBe(true)
    }
  })
})
