/**
 * 碧伟蜓生活史两个阶段（卵 / 若虫水虿）的形态断言。
 *
 * ## 写这些断言时的自检标准
 *
 * **把代码改回出问题的版本，这条断言会失败吗？** 不会就等于没写。
 * 下面每条后面都注了它拦的是哪一次实拍出来的毛病 —— 这一轮四机位目视验收
 * 打回了五次，被拦下的分别是「像衣鱼」「面罩读成一条船的龙骨」
 * 「刻痕读成贴了几片深色叶子」「翅芽后缘埋进腹部」「front 机位只剩一根绿管」。
 *
 * ## 两条结构性的教训，直接继承自 `cicada-stages.test.ts`
 *
 * 1. **断言量的是数字，人看的是长相，两者可以毫无关系。** 兰花螳螂的花瓣状腿节
 *    「宽 ≥ 厚 3.5 倍」测出 5.75 全绿，渲染出来却是几片侧立薄板。所以凡是量
 *    「粗细/饱满」的地方一律不用轴对齐包围盒，而是把顶点投影到垂直于部件自身
 *    长轴的平面上绕一圈量支撑函数。
 * 2. **只量部件自己，量不出「它是不是贴在体表上的一块斑」。** 蝉若虫的翅芽断言
 *    曾全绿而四机位一致读成污渍，因为没有一条量**部件与体表之间的关系**。
 *    所以这里凡是「盖片」类结构（面罩、翅芽）都必量两件事：
 *    **离体表的有符号间隙**（下限拦贴死、上限拦飘走）与**明度的方向**
 *    （盖片不许比它盖着的那个面暗 —— 深色贴浅色只会读成斑纹）。
 */
import * as THREE from 'three'
import { describe, expect, it } from 'vitest'
import { buildDragonflyNymph } from '../stages/dragonfly-nymph'
import { STEM_DIR, STEM_R, buildDragonflyEgg } from '../stages/dragonfly-egg'
import { HEMIMETABOLOUS, builtStagesOf, metamorphosisOf } from '../../stages'

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

function boxOfNames(root: THREE.Object3D, names: readonly string[]): THREE.Box3 {
  const box = new THREE.Box3()
  for (const n of names) for (const m of meshesByName(root, n)) box.union(new THREE.Box3().setFromObject(m))
  return box
}

function sizeOf(box: THREE.Box3): THREE.Vector3 {
  const s = new THREE.Vector3()
  box.getSize(s)
  return s
}

function localSize(m: THREE.Mesh): THREE.Vector3 {
  m.geometry.computeBoundingBox()
  const s = new THREE.Vector3()
  m.geometry.boundingBox!.getSize(s)
  return s
}

/**
 * 一片沿自身 +X 长出的薄板：长、宽，以及**逐片量出来的厚**。
 *
 * 厚不能直接取局部包围盒的 y 跨度：翅芽的后半段是翘起来的，中心线本身有一段
 * 高度差，包围盒的 y 跨度里混着这段抬升 —— 越翘就越「厚」，而那跟人看到的
 * 「扁不扁」毫无关系。所以沿长轴切 24 片，每片内部的 y 跨度才是那一处自己的厚度。
 */
function bladeSize(m: THREE.Mesh): { length: number; thick: number; width: number } {
  const pos = m.geometry.getAttribute('position')
  let x0 = Infinity
  let x1 = -Infinity
  let z0 = Infinity
  let z1 = -Infinity
  for (let i = 0; i < pos.count; i++) {
    x0 = Math.min(x0, pos.getX(i))
    x1 = Math.max(x1, pos.getX(i))
    z0 = Math.min(z0, pos.getZ(i))
    z1 = Math.max(z1, pos.getZ(i))
  }
  const SLICES = 24
  const lo = new Array<number>(SLICES).fill(Infinity)
  const hi = new Array<number>(SLICES).fill(-Infinity)
  for (let i = 0; i < pos.count; i++) {
    const k = Math.min(SLICES - 1, Math.max(0, Math.floor(((pos.getX(i) - x0) / (x1 - x0)) * SLICES)))
    lo[k] = Math.min(lo[k], pos.getY(i))
    hi[k] = Math.max(hi[k], pos.getY(i))
  }
  let thick = 0
  for (let k = 0; k < SLICES; k++) if (hi[k] > lo[k]) thick = Math.max(thick, hi[k] - lo[k])
  return { length: x1 - x0, thick, width: z1 - z0 }
}

/**
 * 一个点相对体表的**有符号**高度，沿 `up` 方向量：正 = 浮在体表之外，负 = 埋在体表里。
 *
 * 从这个点沿 `up` 走很远，再往回打一条射线，取第一次撞到体表的距离减去那个高度。
 * 一次射线同时覆盖「浮着」与「埋着」两种情况（埋着时命中点在射线原点与该点之间，
 * 差值自然为负），也不用先判断点在体内还是体外 —— 判断内外本身就容易写错。
 * `up` 传的是「在这个位置上体外朝哪边」：背侧结构传 +Y 向，腹侧的面罩传 −Y 向。
 *
 * `finalize()` 给不透明材质统一开了双面，所以射线从哪一侧打都能命中体表。
 */
function heightAboveBody(
  p: THREE.Vector3,
  up: THREE.Vector3,
  body: readonly THREE.Mesh[],
  rc: THREE.Raycaster,
): number | null {
  const H = 6
  rc.set(p.clone().addScaledVector(up, H), up.clone().negate())
  rc.near = 0
  rc.far = 3 * H
  const hits = rc.intersectObjects(body as THREE.Mesh[], false)
  return hits.length ? hits[0].distance - H : null
}

/*
 * 取材质基色的明度。**必须显式指定 sRGB 空间**：three 默认的 working color space
 * 是线性的，`getHSL()` 不传第二参数拿到的是线性明度 —— 数值比设计时看的十六进制
 * 小一大截，各档之间的差被压扁，阈值要么全过要么全挂，都跟人眼看到的对不上。
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

// ---------------------------------------------------------------- 路线闸门

describe('碧伟蜓走的是不完全变态这条路线', () => {
  it('有卵、有若虫，且绝不许出现幼虫或蛹', () => {
    const stages = builtStagesOf('dragonfly')
    expect(stages, '缺卵 —— 生活史从卵讲起').toContain('egg')
    expect(stages, '缺若虫 —— 水虿是这一阶段的全部内容').toContain('nymph')
    /*
     * 这两条不是重复 `stages.test.ts` 的通用闸门，而是把**这一只**的知识点钉死：
     * 蜻蜓没有蛹期。有人若是顺手加了 dragonfly-larva.ts / dragonfly-pupa.ts，
     * 通用闸门会红在「路线自洽」上，而这里会直接指出是碧伟蜓这只错了。
     */
    expect(stages, '蜻蜓是不完全变态，没有「幼虫」这一步').not.toContain('larva')
    expect(stages, '蜻蜓是不完全变态，没有蛹期').not.toContain('pupa')
    expect(metamorphosisOf('dragonfly')).toBe(HEMIMETABOLOUS)
  })
})

// ---------------------------------------------------------------- 若虫（水虿）

describe('碧伟蜓若虫（水虿） buildDragonflyNymph', () => {
  const model = buildDragonflyNymph()
  model.group.updateMatrixWorld(true)

  const TRUNK = ['head', 'pronotum', 'synthorax', 'abdomen'] as const
  /** 体长量到肛锥尖：三枚尾附器是身体的一部分，不是附肢 */
  const bodyBox = boxOfNames(model.group, [...TRUNK, 'caudal-spine'])
  const bodySize = sizeOf(bodyBox)
  const trunkBox = boxOfNames(model.group, TRUNK)
  const body: THREE.Mesh[] = [...TRUNK, 'abdomen-membrane'].flatMap((n) => meshesByName(model.group, n))

  it('基础健壮：无 NaN、面数在预算内、半径落在昆虫量级', () => {
    const h = healthOf(model.group)
    // eslint-disable-next-line no-console
    console.log(`[dragonfly-nymph] triangles=${h.triangles} meshes=${h.meshes} radius=${model.radius.toFixed(3)}`)
    expect(h.nan, `发现 ${h.nan} 个 NaN/Inf 顶点`).toBe(0)
    expect(h.triangles).toBeLessThanOrEqual(TRIANGLE_BUDGET)
    expect(model.radius).toBeGreaterThan(0.02)
    expect(model.radius).toBeLessThan(12)
    expect(body.length, '找不到躯干网格').toBeGreaterThan(3)
  })

  it('体长 4.5~5 厘米，而且是「粗壮扁宽」不是「细长」', () => {
    const slender = bodySize.x / bodySize.z
    const flatness = bodySize.z / bodySize.y
    // eslint-disable-next-line no-console
    console.log(
      `[dragonfly-nymph] 体长 ${bodySize.x.toFixed(3)} × 高 ${bodySize.y.toFixed(3)} × 宽 ${bodySize.z.toFixed(3)}` +
        ` 长/宽=${slender.toFixed(2)} 宽/高=${flatness.toFixed(2)}`,
    )
    expect(bodySize.x, `体长 ${bodySize.x.toFixed(2)}，末龄水虿是 4.5~5 厘米（1 单位 = 1 厘米）`).toBeGreaterThan(4.4)
    expect(bodySize.x).toBeLessThan(5.15)

    /*
     * 长/宽：上限拦「做细了」。第一版腹部末端半径 0.16、最粗处在 30%，
     * 出来是一条匀速收细的锥体，四机位一致读成**衣鱼**。
     * 成虫的对照是长/宽 ≈ 7.5（细成一根棍），水虿必须明显比它壮。
     * 下限拦另一头：短粗成一颗蚕豆同样不是水虿。
     */
    expect(slender, `长/宽 ${slender.toFixed(2)} 太细长，会读成衣鱼/石蝇稚虫而不是水虿`).toBeLessThan(4.4)
    expect(slender, `长/宽 ${slender.toFixed(2)} 太短粗，不成虫形`).toBeGreaterThan(2.8)

    /*
     * 宽/高：这一条量的是「背腹压扁」。趴在水底的虫都是扁的，而成虫的腹部
     * 是近乎圆截面（宽/高 ≈ 1）的一根细棍 —— 两者的反差是这一阶段的内容之一。
     * 只量整体包围盒不够（翅芽会把高度撑起来），所以单独再量腹部。
     */
    const ab = sizeOf(boxOfNames(model.group, ['abdomen']))
    const abFlat = ab.z / ab.y
    // eslint-disable-next-line no-console
    console.log(`[dragonfly-nymph] 腹部 ${ab.x.toFixed(3)} × ${ab.y.toFixed(3)}(高) × ${ab.z.toFixed(3)}(宽) 宽/高=${abFlat.toFixed(2)}`)
    expect(abFlat, `腹部宽/高 ${abFlat.toFixed(2)}，做成圆管了，读不出「扁宽」`).toBeGreaterThan(1.4)
    expect(abFlat, `腹部宽/高 ${abFlat.toFixed(2)}，压成一张饼了`).toBeLessThan(2.4)
  })

  it('腹部是饱满的桶，最后两三节才收 —— 不是一路收细的锥', () => {
    /*
     * 「像衣鱼」被打回时，整体长/宽其实还在范围内 —— 病在**包络的形状**：
     * 从胸后就开始匀速收细。所以这里沿 x 切 24 片量每片的最大 |z|，
     * 看包络掉得有多快。匀速收尖的锥体在 70% 处只剩三成，
     * 真实水虿的腹在 70% 处还有七成以上。
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
      const t = (hi - p.x) / (hi - lo) // t=0 在腹基（靠胸一侧），t=1 在腹末
      w[Math.min(SLICES - 1, Math.max(0, Math.floor(t * SLICES)))] = Math.max(
        w[Math.min(SLICES - 1, Math.max(0, Math.floor(t * SLICES)))],
        Math.abs(p.z),
      )
    }
    const peak = Math.max(...w)
    const at70 = w[Math.floor(0.7 * SLICES)]
    const at85 = w[Math.floor(0.85 * SLICES)]
    // eslint-disable-next-line no-console
    console.log(
      `[dragonfly-nymph] 腹部包络 峰值半宽=${peak.toFixed(3)}，70% 处=${at70.toFixed(3)}（${((at70 / peak) * 100).toFixed(0)}%），` +
        `85% 处=${at85.toFixed(3)}（${((at85 / peak) * 100).toFixed(0)}%），末片=${w[SLICES - 1].toFixed(3)}`,
    )
    expect(at70 / peak, `腹部在 70% 处只剩峰值的 ${((at70 / peak) * 100).toFixed(0)}%，收得像衣鱼的尾了`).toBeGreaterThan(0.6)
    /*
     * 85% 这条探针是变异测试补的：只把末端半径从 0.21 收到 0.08（正是「读成衣鱼」
     * 的那种退化），70% 处的包络几乎不动 —— 因为最粗处在 62%，收细全发生在
     * 最后三成。落在收细段里的这条探针才量得到那件事。
     */
    expect(at85 / peak, `腹部在 85% 处只剩峰值的 ${((at85 / peak) * 100).toFixed(0)}%，最后几节收成锥了`).toBeGreaterThan(0.5)
    expect(w[SLICES - 1] / peak, '腹末没收下来，是一刀平口的管子').toBeLessThan(0.62)
    expect(w[SLICES - 1] / peak, '腹末收成针尖了').toBeGreaterThan(0.08)
  })

  it('面罩是一副盖在脸上的独立结构：整片离开体表、投得出阴影缝，又没飘走', () => {
    const plate = meshesByName(model.group, 'mask-plate')
    expect(plate.length, '找不到面罩前颏（mask-plate）').toBe(1)

    /*
     * 量的方向是世界 −Y：面罩在腹面，「体外」朝下。
     * 全部顶点都打一遍，取 min/max —— 面罩是硬板，不贴着头与胸的每个鼓包走，
     * 所以缝的宽度沿途本来就是变的，两头都要钉住：
     *
     * - min 的**下限** 0.05：低于这个数成图里投不出一条看得见的缝
     *   （体长 4.6 的虫，0.05 约 6~7 像素），面罩就退回「脸上的一块阴影」。
     *   把面罩整体上移贴死在脸上，这条当场红。
     * - min 的**上限** 0.16：面罩必须**处处贴着**脸走，最窄处不能也张开老远。
     *   把面罩整体下移 0.1（读成「吊在下巴底下的一块板」）时，min 会跳过 0.16。
     *   这一条是上下限一起给的老规矩（天蛾的喙只给下限，长成了一根标枪）。
     * - max 的上限 0.45：拦「一头翘上天」。
     */
    const rc = new THREE.Raycaster()
    const up = new THREE.Vector3(0, -1, 0)
    const pts = worldPoints(plate[0])
    let px0 = Infinity
    let px1 = -Infinity
    for (const p of pts) {
      px0 = Math.min(px0, p.x)
      px1 = Math.max(px1, p.x)
    }
    /*
     * 分成 6 段沿轴的窄带，每段各取一个最小间隙。
     *
     * 第一版只取全片的 min，**拦不住「整片下移」**：变异测试把整副面罩沉下去
     * 0.12（读成「吊在下巴底下的一块板」），前端翘起那一段恰好还从头的前缘
     * 底下擦过去，全片 min 照样很小，断言一路全绿。按段取最小再看这些
     * 最小值的**中位数**，量的才是「整片贴不贴着脸走」这件事本身。
     */
    const BANDS = 6
    const bandMin = new Array<number>(BANDS).fill(Infinity)
    let n = 0
    let max = -Infinity
    for (const p of pts) {
      const h = heightAboveBody(p, up, body, rc)
      if (h === null) continue
      n++
      max = Math.max(max, h)
      const k = Math.min(BANDS - 1, Math.max(0, Math.floor(((p.x - px0) / (px1 - px0)) * BANDS)))
      bandMin[k] = Math.min(bandMin[k], h)
    }
    expect(n, '面罩上一个采样点都没打到体表 —— 它根本不在头下面').toBeGreaterThan(40)
    const mins = bandMin.filter((v) => Number.isFinite(v)).sort((a, b) => a - b)
    expect(mins.length, '面罩沿轴的窄带里有太多段一个采样点都没打到体表').toBeGreaterThanOrEqual(4)
    const min = mins[0]
    const med = mins[Math.floor(mins.length / 2)]
    // eslint-disable-next-line no-console
    console.log(
      `[dragonfly-nymph] 面罩离体表 逐段最小值=${mins.map((v) => v.toFixed(3)).join(', ')} 中位=${med.toFixed(3)} max=${max.toFixed(3)}（n=${n}）`,
    )
    expect(min, `面罩最窄处离体表只有 ${min.toFixed(3)}，投不出缝，会读成脸上的一块阴影`).toBeGreaterThan(0.05)
    expect(med, `面罩逐段最小间隙的中位数 ${med.toFixed(3)}，整片吊在下巴底下，不是「盖在脸上」`).toBeLessThan(0.2)
    expect(max, `面罩最远处离体表 ${max.toFixed(3)}，一头翘上天了`).toBeLessThan(0.45)

    // 面罩必须整片都在躯干中线以下（腹面）：翻到背上去就成了另一种虫
    const trunkMidY = (trunkBox.min.y + trunkBox.max.y) / 2
    expect(new THREE.Box3().setFromObject(plate[0]).max.y, '面罩跑到躯干中线以上去了').toBeLessThan(trunkMidY)
  })

  it('面罩是折成两截的机构：宽盾 + 明显更窄的后伸带 + 中间的铰链', () => {
    /*
     * 这一条拦的是第一版：前颏一路做到 x=0.56，前后一样宽，整副下唇成了一块
     * 从头贯到腹的长板，侧视实拍读成「一条船的龙骨」。
     * 「折叠机构」这个读法靠的是**两截的宽度差**，所以这里量的就是那个比值。
     */
    const plate = meshesByName(model.group, 'mask-plate')[0]
    const post = meshesByName(model.group, 'mask-post')
    expect(post.length, '找不到后颏（mask-post）—— 少了它就看不出下唇是折起来的').toBe(1)
    expect(meshesByName(model.group, 'mask-hinge').length, '找不到铰链结（mask-hinge）').toBe(1)

    const plateW = sizeOf(new THREE.Box3().setFromObject(plate)).z
    const postW = sizeOf(new THREE.Box3().setFromObject(post[0])).z
    const ratio = postW / plateW
    // eslint-disable-next-line no-console
    console.log(`[dragonfly-nymph] 前颏宽=${plateW.toFixed(3)} 后颏宽=${postW.toFixed(3)} 后/前=${ratio.toFixed(2)}`)
    expect(ratio, `后颏有前颏的 ${ratio.toFixed(2)} 倍宽，两截一样粗，会糊成一块长板`).toBeLessThan(0.6)
    expect(ratio, `后颏只有前颏的 ${ratio.toFixed(2)} 倍宽，细成一根线了`).toBeGreaterThan(0.12)

    // 后颏必须真的伸到前颏**后面**去（折回来的那一段），不是缩在盾底下
    const plateBox = new THREE.Box3().setFromObject(plate)
    const postBox = new THREE.Box3().setFromObject(post[0])
    expect(postBox.min.x, '后颏没有向后伸出前颏之外，看不出「折了一道」').toBeLessThan(plateBox.min.x - 0.15)

    // 颚叶与端钩：一对，且必须探到头部轮廓之外（那是四个机位里最好认的一处）
    expect(meshesByName(model.group, 'mask-palp').length, '颚叶应是一对').toBe(2)
    const hooks = meshesByName(model.group, 'mask-hook')
    expect(hooks.length, '端钩应是一对').toBe(2)
    const headFront = boxOfNames(model.group, ['head']).max.x
    /*
     * 量**重心**不是包围盒最前点：变异测试把端钩整根缩回脸后面时，
     * 它与颚叶相接的那一端仍留在原处，包围盒的最前点照样越过头前缘 ——
     * 「有一个顶点探出去」和「这对钩子长在脸前面」不是一回事。
     */
    const hookMid = centroid(hooks.flatMap((m) => worldPoints(m))).x
    // eslint-disable-next-line no-console
    console.log(`[dragonfly-nymph] 端钩重心 x=${hookMid.toFixed(3)}，头前缘 x=${headFront.toFixed(3)}`)
    expect(hookMid, '端钩没探到头前缘之外，被脸挡住就等于没做').toBeGreaterThan(headFront)
    // 左右对称
    const zs = hooks.map((m) => centroid(worldPoints(m)).z).sort((a, b) => a - b)
    expect(Math.abs(zs[0] + zs[1]), `一对端钩不对称（z=${zs.map((v) => v.toFixed(3)).join(', ')}）`).toBeLessThan(0.02)
  })

  it('面罩绝不许比头暗 —— 深色贴浅色只会读成脸上的一块阴影', () => {
    /*
     * 有向的一条。写成 |头 − 面罩| > 阈值 是个结构性错误：那只管差多少、
     * 不管谁亮，而「比自己盖着的那个面更暗」正是把凸起读成斑纹的直接原因
     * （蝉若虫的翅芽 27% vs 胸背 38%，四个机位一致读成污渍，断言却一路全绿）。
     * 上限 0.14 拦另一头：亮成一块白斑同样是靠色不靠形。
     */
    const head = lightnessOf(meshesByName(model.group, 'head')[0])
    const mask = lightnessOf(meshesByName(model.group, 'mask-plate')[0])
    const hook = lightnessOf(meshesByName(model.group, 'mask-hook')[0])
    // eslint-disable-next-line no-console
    console.log(
      `[dragonfly-nymph] 明度 头=${head.toFixed(3)} 面罩=${mask.toFixed(3)}（差 ${(mask - head >= 0 ? '+' : '') + (mask - head).toFixed(3)}） 端钩=${hook.toFixed(3)}`,
    )
    expect(
      mask - head,
      `面罩(${mask.toFixed(3)})比头(${head.toFixed(3)})暗了 ${(head - mask).toFixed(3)}：深色贴浅色只会读成斑纹`,
    ).toBeGreaterThanOrEqual(0)
    expect(mask - head, `面罩比头亮 ${(mask - head).toFixed(3)}，成了一块白斑，还是在靠色不靠形`).toBeLessThan(0.14)
    // 端钩是**尖突**不是面，深色读成尖不会读成斑 —— 但也不能跟面罩糊在一起
    expect(mask - hook, '端钩没比面罩暗出一档，那对钩子会糊进面罩里').toBeGreaterThan(0.2)
  })

  it('两对翅芽：四片、左右对称、扁而不薄，只搭到腹部前段', () => {
    const pads = meshesByName(model.group, 'wing-pad')
    /*
     * 四片不是凑数：成虫有四片翅，只做一对翅芽等于把「四翅」讲丢了，
     * 而真实水虿背上也确实是前后两对挨在一起的芽。
     */
    expect(pads.length, '翅芽应是两对共四片（中胸一对 + 后胸一对）').toBe(4)
    const zs = pads.map((m) => centroid(worldPoints(m)).z)
    expect(zs.filter((z) => z > 0).length, '左右各两片').toBe(2)
    expect(zs.filter((z) => z < 0).length, '左右各两片').toBe(2)
    const right = zs.filter((z) => z > 0).sort((a, b) => a - b)
    const left = zs.filter((z) => z < 0).sort((a, b) => b - a)
    for (let i = 0; i < 2; i++) {
      expect(Math.abs(right[i] + left[i]), '左右翅芽不对称').toBeLessThan(0.02)
    }

    const abBox = boxOfNames(model.group, ['abdomen'])
    const abLen = abBox.max.x - abBox.min.x
    for (const pad of pads.filter((m) => centroid(worldPoints(m)).z > 0)) {
      const s = bladeSize(pad)
      const flat = s.thick / s.width
      const rel = s.length / bodySize.x
      const padBox = new THREE.Box3().setFromObject(pad)
      const into = (abBox.max.x - padBox.min.x) / abLen
      // eslint-disable-next-line no-console
      console.log(
        `[dragonfly-nymph] 翅芽 长=${s.length.toFixed(3)} 厚=${s.thick.toFixed(3)} 宽=${s.width.toFixed(3)}` +
          ` 厚/宽=${flat.toFixed(2)} 长/体长=${(rel * 100).toFixed(0)}% 搭到腹部前 ${(into * 100).toFixed(0)}%`,
      )
      expect(flat, `翅芽厚/宽 ${flat.toFixed(2)}，太厚，读不出「扁芽」`).toBeLessThanOrEqual(0.45)
      expect(flat, `翅芽厚/宽 ${flat.toFixed(2)}，薄成一张纸片了`).toBeGreaterThanOrEqual(0.1)

      /*
       * 长度与末端位置这两条才是「不完全变态」的可视证据：翅芽必须真的搭到
       * 腹部（不是停在胸上），又绝不能盖过腹部一半 —— 那就是成虫的翅了。
       * 成虫的对照：前翅 4.3 / 体长 7.5 ≈ 57%（dragonfly.ts）。
       */
      expect(rel, `翅芽长 = 体长的 ${(rel * 100).toFixed(0)}%，已经是一副翅而不是芽`).toBeLessThanOrEqual(0.42)
      expect(rel, `翅芽长 = 体长的 ${(rel * 100).toFixed(0)}%，短到看不出是翅`).toBeGreaterThanOrEqual(0.15)
      expect(into, '翅芽根本没搭到腹部，停在胸部上了').toBeGreaterThan(0.1)
      expect(into, `翅芽盖到腹部 ${(into * 100).toFixed(0)}% 处，那已经是成虫的翅了`).toBeLessThan(0.5)
    }
  })

  it('翅芽是掀起一角的盖片：后缘离开体表、前端仍埋在胸背里', () => {
    /*
     * 与面罩同一条道理，量的是**部件与体表的关系**。
     * 方向取翅芽**自身的「上」**而不是世界 +Y：翅芽要离开的是它自己趴着的
     * 那个面，而那个面是斜的（外倾 30°/48°），用世界 +Y 量会把「向外张开」
     * 误当成「抬起来」。
     */
    const rc = new THREE.Raycaster()
    const pads = meshesByName(model.group, 'wing-pad').filter((m) => centroid(worldPoints(m)).z > 0)
    expect(pads.length).toBe(2)
    for (const [k, pad] of pads.entries()) {
      const up = new THREE.Vector3(0, 1, 0).transformDirection(pad.matrixWorld).normalize()
      const pos = pad.geometry.getAttribute('position')
      let lx0 = Infinity
      let lx1 = -Infinity
      for (let i = 0; i < pos.count; i++) {
        lx0 = Math.min(lx0, pos.getX(i))
        lx1 = Math.max(lx1, pos.getX(i))
      }
      const heights = (from: number, to: number): number[] => {
        const out: number[] = []
        for (let i = 0; i < pos.count; i++) {
          const t = (pos.getX(i) - lx0) / (lx1 - lx0)
          if (t < from || t > to) continue
          const p = new THREE.Vector3(pos.getX(i), pos.getY(i), pos.getZ(i)).applyMatrix4(pad.matrixWorld)
          const h = heightAboveBody(p, up, body, rc)
          if (h !== null) out.push(h)
        }
        return out
      }
      const rear = heights(0.95, 1)
      const front = heights(0, 0.2)
      expect(rear.length, `翅芽#${k} 后缘一个采样点都没打到体表`).toBeGreaterThan(8)
      expect(front.length, `翅芽#${k} 前段一个采样点都没打到体表`).toBeGreaterThan(8)
      const rearMin = Math.min(...rear)
      const rearMax = Math.max(...rear)
      /*
       * 前段量的是 **max** 不是 min：翅芽的内缘天生深埋在背中线里，min 一直是
       * 个很负的数，于是「把整片翅芽平移着抬起来」这种退化照样能过。
       * max 才是「这一段里最露头的那个点」，它贴着体表，整片才是贴着体表的。
       */
      const frontMax = Math.max(...front)
      // eslint-disable-next-line no-console
      console.log(
        `[dragonfly-nymph] 翅芽#${k} 后缘离体表 ${rearMin.toFixed(3)}~${rearMax.toFixed(3)}（沿自身法向），前段最露头处 ${frontMax.toFixed(3)}`,
      )
      // 下限 0.045：低于这个数成图里投不出一条看得见的缝，翅芽退回「贴在背上的一块斑」
      expect(rearMin, `翅芽#${k} 后缘离体表只有 ${rearMin.toFixed(3)}，投不出缝，会读成背上的一块斑`).toBeGreaterThan(0.045)
      // 上限 0.22：再高就脱离躯干飘起来了 —— 那是兔耳朵不是贴伏的翅芽
      expect(rearMax, `翅芽#${k} 后缘翘到 ${rearMax.toFixed(3)}，脱离躯干了`).toBeLessThan(0.22)
      expect(frontMax, `翅芽#${k} 前段离体表 ${frontMax.toFixed(3)}，整片浮起来了，不是长在胸背上的芽`).toBeLessThan(0.04)
    }
  })

  it('翅芽绝不许比胸背暗，翅脉要比翅芽亮出一档', () => {
    const thorax = lightnessOf(meshesByName(model.group, 'synthorax')[0])
    const pad = lightnessOf(meshesByName(model.group, 'wing-pad')[0])
    const vein = lightnessOf(meshesByName(model.group, 'pad-vein')[0])
    // eslint-disable-next-line no-console
    console.log(
      `[dragonfly-nymph] 明度 胸背=${thorax.toFixed(3)} 翅芽=${pad.toFixed(3)}（差 ${(pad - thorax >= 0 ? '+' : '') + (pad - thorax).toFixed(3)}） 翅脉=${vein.toFixed(3)}`,
    )
    expect(
      pad - thorax,
      `翅芽(${pad.toFixed(3)})比胸背(${thorax.toFixed(3)})暗了 ${(thorax - pad).toFixed(3)}：深色块贴在浅色面上只会读成斑纹`,
    ).toBeGreaterThanOrEqual(0)
    expect(pad - thorax, `翅芽比胸背亮 ${(pad - thorax).toFixed(3)}，成了一块白斑，还是在靠色不靠形`).toBeLessThan(0.14)
    expect(vein - pad, '翅脉没比翅芽亮出一档，翅芽的轮廓与翅脉会一起糊掉').toBeGreaterThan(0.15)
  })

  it('腹末三枚三角形尾附器：数量、对称、都朝后、长度合适', () => {
    const spines = meshesByName(model.group, 'caudal-spine')
    /*
     * 三枚：背面一枚肛上板 + 腹侧一对肛侧板。多了少了都不对 ——
     * 做成豆娘那样三片外露的尾鳃是另一个亚目（束翅亚目）的事，
     * 差在这一点上整只虫就认错了亚目。
     */
    expect(spines.length, '肛锥应是三枚尖突').toBe(3)

    const info = spines.map((m) => {
      const pts = worldPoints(m)
      let tip = pts[0]
      let root = pts[0]
      for (const p of pts) {
        if (p.x < tip.x) tip = p
        if (p.x > root.x) root = p
      }
      return { c: centroid(pts), tip, root, len: root.x - tip.x }
    })
    const mid = info.filter((i) => Math.abs(i.c.z) < 0.03)
    const side = info.filter((i) => Math.abs(i.c.z) >= 0.03).sort((a, b) => a.c.z - b.c.z)
    // eslint-disable-next-line no-console
    console.log(
      `[dragonfly-nymph] 尾附器 z=${info.map((i) => i.c.z.toFixed(3)).join(', ')} 长=${info.map((i) => i.len.toFixed(3)).join(', ')}`,
    )
    expect(mid.length, '缺背面中央那一枚肛上板').toBe(1)
    expect(side.length, '腹侧应是左右一对肛侧板').toBe(2)
    expect(Math.abs(side[0].c.z + side[1].c.z), '一对肛侧板左右不对称').toBeLessThan(0.02)
    expect(Math.abs(side[0].c.z), '一对肛侧板挤在中线上，看不出是「一对」').toBeGreaterThan(0.05)

    for (const i of info) {
      expect(i.tip.x, '尾附器没朝后指').toBeLessThan(i.root.x)
      const rel = i.len / bodySize.x
      expect(rel, `尾附器长 = 体长的 ${(rel * 100).toFixed(0)}%，短到看不见`).toBeGreaterThan(0.07)
      expect(rel, `尾附器长 = 体长的 ${(rel * 100).toFixed(0)}%，长成了三根尾丝（那是蜉蝣稚虫）`).toBeLessThan(0.2)
    }
  })

  it('六足粗短撑开：明显向体侧张开，不是成虫那种向前收拢的捕虫篮', () => {
    const legs = meshesByName(model.group, 'walk-leg')
    expect(legs.length, '找不到 walk-leg').toBeGreaterThan(6)
    const legSpan = sizeOf(boxOfNames(model.group, ['walk-leg'])).z
    const ratio = legSpan / bodySize.z
    // eslint-disable-next-line no-console
    console.log(`[dragonfly-nymph] 六足横向跨度 ${legSpan.toFixed(3)} / 体宽 ${bodySize.z.toFixed(3)} = ${ratio.toFixed(2)}`)
    expect(ratio, `六足跨度只有体宽的 ${ratio.toFixed(2)} 倍，腿贴着身子，读不出「趴在水底」`).toBeGreaterThan(1.6)
    expect(ratio, `六足跨度到了体宽的 ${ratio.toFixed(2)} 倍，长成蜘蛛了`).toBeLessThan(3.2)

    /*
     * 再逐条量一遍。只量总跨度是拦不住「只把中足收回去」这种局部退化的：
     * 最外那对后足一撑，总跨度照样达标（变异测试实测漏网）。
     * 句柄走 kit 的骨架（`legPair` 给每条腿打了 rig 标记，`finalize` 收集成
     * `model.rig.legs`），比按名字猜网格属于哪条腿可靠。
     */
    const rigLegs = model.rig?.legs ?? []
    expect(rigLegs.length, '六足应各自有骨架句柄').toBe(6)
    const halfWidth = bodySize.z / 2
    const reaches = rigLegs.map((leg) => {
      const b = new THREE.Box3().setFromObject(leg.coxa)
      return Math.max(Math.abs(b.min.z), Math.abs(b.max.z)) / halfWidth
    })
    // eslint-disable-next-line no-console
    console.log(`[dragonfly-nymph] 逐条腿的横向伸展 / 体半宽 = ${reaches.map((v) => v.toFixed(2)).join(', ')}`)
    for (const [i, r] of reaches.entries()) {
      expect(
        r,
        `第 ${i} 条腿只伸到体半宽的 ${r.toFixed(2)} 倍 —— 这条腿是收着的，不是撑开趴着的`,
      ).toBeGreaterThan(1.45)
    }

    /*
     * 再钉一条**方向**：没有哪条腿可以向前伸得比向外还多。
     *
     * 这是「水虿在水底爬」与「成虫把六足收成捕虫篮」的分界线，也是变异测试
     * 逼出来的：只把中足改成成虫那种姿态（sweep −70）时，总跨度与逐条的
     * 横向伸展都还勉强达标（1.53 倍体半宽），但那条腿其实已经指向正前方了。
     * 腿节向量直接从骨架取：`tibia`（膝关节）挂在 `coxa` 之下，
     * 它的局部 position 就是腿节向量，不用再去猜哪个网格属于哪条腿。
     * x>0 = 向前（+X 是头的方向）。
     */
    for (const [i, leg] of rigLegs.entries()) {
      const femurVec = leg.tibia.position
      const forwardness = femurVec.x / Math.max(Math.abs(femurVec.z), 1e-6)
      expect(
        forwardness,
        `第 ${i} 条腿的腿节向前分量是向外分量的 ${forwardness.toFixed(2)} 倍 —— 这是成虫捕虫篮的姿态，不是水虿趴着的姿态`,
      ).toBeLessThan(0.6)
    }
  })

  it('复眼大而**分开** —— 成虫那对在头顶相接的接眼式巨眼是羽化后才有的', () => {
    const eyes: THREE.Mesh[] = []
    model.group.traverse((o) => {
      const m = o as THREE.Mesh
      // 复眼由 kit.compoundEyePair 生成，没有名字；靠几何类型认
      if (m.isMesh && m.geometry?.type === 'SphereGeometry' && m.name === '') eyes.push(m)
    })
    const heads = eyes.filter((m) => centroid(worldPoints(m)).x > trunkBox.max.x - 1.0)
    expect(heads.length, '找不到一对复眼').toBeGreaterThanOrEqual(2)
    const rightEye = heads.filter((m) => centroid(worldPoints(m)).z > 0)
    const leftEye = heads.filter((m) => centroid(worldPoints(m)).z < 0)
    expect(rightEye.length, '右侧复眼缺失').toBeGreaterThan(0)
    expect(leftEye.length, '左侧复眼缺失').toBeGreaterThan(0)
    const rBox = new THREE.Box3()
    for (const m of rightEye) rBox.union(new THREE.Box3().setFromObject(m))
    const gap = rBox.min.z * 2 // 右眼内缘到左眼内缘（对称）
    const headW = sizeOf(boxOfNames(model.group, ['head'])).z
    // eslint-disable-next-line no-console
    console.log(`[dragonfly-nymph] 两眼内缘间距 ${gap.toFixed(3)}，头宽 ${headW.toFixed(3)}`)
    expect(gap, '两眼在头顶相接了 —— 那是成虫的接眼式，若虫的复眼是分开的').toBeGreaterThan(0.04)
    // 眼要够大：外缘必须探出头的轮廓（水虿的复眼在头前侧角明显外凸）
    expect(rBox.max.z, '复眼没凸出头的轮廓，读不出「大而外凸」').toBeGreaterThan(headW / 2)
  })

  it('anchors 齐备且无 NaN', () => {
    const keys = Object.keys(model.anchors).sort()
    expect(keys).toEqual(['abdomen', 'caudal', 'eye', 'leg', 'mask', 'palp', 'wingPad'])
    for (const k of keys) {
      const v = model.anchors[k]
      expect(Number.isFinite(v.x) && Number.isFinite(v.y) && Number.isFinite(v.z), `anchor ${k} 含 NaN`).toBe(true)
    }
  })
})

// ---------------------------------------------------------------- 卵

describe('碧伟蜓卵 buildDragonflyEgg', () => {
  const model = buildDragonflyEgg()
  model.group.updateMatrixWorld(true)

  /** 茎轴：方向由物种文件导出（纯旋转），轴上一点取 anchors.stem（跟着 finalize 一起平移过） */
  const axisPoint = model.anchors.stem.clone()
  const axisDir = STEM_DIR.clone().normalize()
  /** 一点到茎轴的垂距 */
  const radial = (p: THREE.Vector3): number => {
    const d = p.clone().sub(axisPoint)
    return d.clone().addScaledVector(axisDir, -d.dot(axisDir)).length()
  }
  /** 一点沿茎轴的位置（建模帧里的 x） */
  const along = (p: THREE.Vector3): number => p.clone().sub(axisPoint).dot(axisDir)

  it('基础健壮：无 NaN、面数在预算内、半径落在昆虫量级', () => {
    const h = healthOf(model.group)
    // eslint-disable-next-line no-console
    console.log(`[dragonfly-egg] triangles=${h.triangles} meshes=${h.meshes} radius=${model.radius.toFixed(3)}`)
    expect(h.nan).toBe(0)
    expect(h.triangles).toBeLessThanOrEqual(TRIANGLE_BUDGET)
    expect(model.radius).toBeGreaterThan(0.02)
    expect(model.radius).toBeLessThan(12)
  })

  it('卵是细长梭形：长 1.2 毫米上下、长径比 3~7、横截面是圆的', () => {
    const eggs = meshesByName(model.group, 'egg')
    expect(eggs.length, '一段茎里应有数粒卵').toBeGreaterThanOrEqual(3)
    for (const [i, e] of eggs.entries()) {
      /*
       * 卵的几何沿 +X 建一次、三个 mesh 共用同一份，摆放靠 mesh 变换 ——
       * 所以局部包围盒恰好就是 (长, 直径, 直径)，量长径比时不掺进摆放姿态。
       */
      const s = localSize(e)
      const dia = Math.max(s.y, s.z)
      const ratio = s.x / dia
      if (i === 0) {
        // eslint-disable-next-line no-console
        console.log(`[dragonfly-egg] 卵 长=${s.x.toFixed(4)} 直径=${dia.toFixed(4)} 长径比=${ratio.toFixed(2)}`)
      }
      expect(s.x, `卵长 ${s.x.toFixed(3)}，蜻蜓卵约 1.2 毫米（模型 0.12）`).toBeGreaterThan(0.09)
      expect(s.x).toBeLessThan(0.16)
      // 上下限一起给：只给下限的话，卵会越做越像一根针（天蛾的喙就是这么长成标枪的）
      expect(ratio, `卵的长径比 ${ratio.toFixed(2)}，太粗，读成一颗普通的圆卵了`).toBeGreaterThanOrEqual(3)
      expect(ratio, `卵的长径比 ${ratio.toFixed(2)}，细成一根针了`).toBeLessThanOrEqual(7)
      expect(
        Math.abs(s.y - s.z) / dia,
        '卵的横截面被压扁了 —— 梭形卵是圆截面，扁了会读成一片米粒状的贴片',
      ).toBeLessThan(0.1)
    }
  })

  it('卵确实躺在茎的刻痕里：整粒都在茎体之内、都在剖开的窗口段、各有各的凹槽', () => {
    const eggs = meshesByName(model.group, 'egg')
    const slots = meshesByName(model.group, 'egg-slot')
    expect(slots.length, '每粒卵都该有自己那一道凹槽（egg-slot）').toBe(eggs.length)

    let maxRadial = 0
    let minAlong = Infinity
    let maxAlong = -Infinity
    for (const e of eggs) {
      for (const p of worldPoints(e)) {
        maxRadial = Math.max(maxRadial, radial(p))
        minAlong = Math.min(minAlong, along(p))
        maxAlong = Math.max(maxAlong, along(p))
      }
    }
    // eslint-disable-next-line no-console
    console.log(
      `[dragonfly-egg] 卵到茎轴的最大垂距 ${maxRadial.toFixed(4)}（茎半径 ${STEM_R}），沿茎跨度 [${minAlong.toFixed(3)}, ${maxAlong.toFixed(3)}]`,
    )
    /*
     * 这一条就是「确实在茎的刻痕里」的可测形式：**整粒卵都在茎的外表面之内**。
     * 把卵整体抬到茎外（哪怕只抬 0.03，成图里就是「几粒白点浮在茎上」）时，
     * 这条当场红 —— 而只看包围盒是拦不住的，因为茎是斜放的，
     * 轴对齐包围盒里「在茎里」和「贴在茎上」根本分不开。
     */
    expect(maxRadial, `卵探出茎的外表面 ${(maxRadial - STEM_R).toFixed(4)}，成了浮在茎上的几粒白点`).toBeLessThan(STEM_R)
    // 也不能全缩到轴心去：那样剖面里看不见卵，只剩一段空茎
    expect(maxRadial, '卵全缩到茎的轴心了，剖面里看不见').toBeGreaterThan(STEM_R * 0.25)

    // 卵必须落在剖开的那一段里（窗口 |x| ≤ 0.18），否则被完好的茎皮盖住
    expect(minAlong, '有卵跑到完好的茎皮底下去了，看不见').toBeGreaterThan(-0.19)
    expect(maxAlong, '有卵跑到完好的茎皮底下去了，看不见').toBeLessThan(0.19)

    // 卵是**一列**：三粒沿茎轴依次排开，不是挤成一堆
    const centers = eggs.map((e) => along(centroid(worldPoints(e)))).sort((a, b) => a - b)
    for (let i = 1; i < centers.length; i++) {
      const gap = centers[i] - centers[i - 1]
      expect(gap, `相邻两粒卵沿茎只差 ${gap.toFixed(3)}，挤成一堆了`).toBeGreaterThan(0.06)
      expect(gap, `相邻两粒卵沿茎差了 ${gap.toFixed(3)}，散得看不出是一列`).toBeLessThan(0.2)
    }
  })

  it('完好的茎皮上有一列产卵刻痕：数量、都在茎表面、沿茎排开、避开窗口', () => {
    const scars = meshesByName(model.group, 'scar')
    expect(scars.length, '产卵刻痕应是沿茎的一列（≥4 道）').toBeGreaterThanOrEqual(4)
    expect(meshesByName(model.group, 'scar-lip').length, '每道缝两侧各一条被顶开的皮缘').toBe(scars.length * 2)

    const centers: number[] = []
    for (const s of scars) {
      const c = centroid(worldPoints(s))
      const r = radial(c)
      centers.push(along(c))
      // 刻痕必须**贴在茎的外表面上**：陷进茎里或飘在茎外都不是「一道缝」
      expect(Math.abs(r - STEM_R), `刻痕离茎表面 ${(r - STEM_R).toFixed(4)}，没长在皮上`).toBeLessThan(0.03)
      // 且必须落在完好的茎皮上（窗口段已经被剖开，那里没有皮可划）
      expect(Math.abs(along(c)), '刻痕划到剖开的窗口里去了，那一段根本没有茎皮').toBeGreaterThan(0.18)
    }
    centers.sort((a, b) => a - b)
    // eslint-disable-next-line no-console
    console.log(`[dragonfly-egg] 刻痕沿茎位置 ${centers.map((v) => v.toFixed(3)).join(', ')}`)
    // 「一列」的可测形式：沿茎依次排开，相邻间距在一个合理区间内，不是叠在一处
    for (let i = 1; i < centers.length; i++) {
      const gap = centers[i] - centers[i - 1]
      if (Math.abs(centers[i]) < 0.19 || Math.abs(centers[i - 1]) < 0.19) continue
      expect(gap, `相邻两道刻痕差 ${gap.toFixed(3)}，叠在一处了`).toBeGreaterThan(0.03)
    }
  })

  it('明度阶梯：卵是全画面最亮的东西，绝不会被茎吃掉', () => {
    const l = (n: string) => lightnessOf(meshesByName(model.group, n)[0])
    const egg = l('egg')
    const bed = l('egg-bed')
    const slot = l('egg-slot')
    const core = l('stem-core')
    const skin = l('stem-skin')
    const scar = l('scar')
    // eslint-disable-next-line no-console
    console.log(
      `[dragonfly-egg] 明度 卵=${egg.toFixed(3)} 卵床=${bed.toFixed(3)} 卵槽=${slot.toFixed(3)} 通气组织=${core.toFixed(3)} 茎皮=${skin.toFixed(3)} 刻痕=${scar.toFixed(3)}`,
    )
    expect(egg - bed, '卵没比卵床亮出一档，白卵会陷进组织色里').toBeGreaterThan(0.15)
    expect(bed - slot, '卵槽没比卵床暗，那道凹槽读不出是凹的').toBeGreaterThan(0.06)
    expect(core - skin, '通气组织没比茎皮亮，剖面读不出「皮在外、髓在内」').toBeGreaterThan(0.15)
    expect(skin - scar, '刻痕没比茎皮暗，一道缝会消失在皮上').toBeGreaterThan(0.15)
  })

  it('anchors 齐备且无 NaN', () => {
    const keys = Object.keys(model.anchors).sort()
    expect(keys).toEqual(['core', 'egg', 'scar', 'stem'])
    for (const k of keys) {
      const v = model.anchors[k]
      expect(Number.isFinite(v.x) && Number.isFinite(v.y) && Number.isFinite(v.z), `anchor ${k} 含 NaN`).toBe(true)
    }
  })
})
