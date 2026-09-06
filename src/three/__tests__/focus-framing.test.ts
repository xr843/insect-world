/**
 * 全物种系统性闸门：**按「聚焦」之后，画面上认得出这是只什么虫。**
 *
 * 由来（2026-09-06）：聚焦距离原本写死成 `radius * 0.62`，`radius` 是整只虫的
 * 包围球半径。这条规则拿全局尺度定**局部**取景，对细长的虫（螳螂、蜻蜓、竹节虫）
 * 很好，对紧实的圆虫（七星瓢虫、阎甲、甘薯腊龟甲、白星花金龟）会把相机怼到一面
 * 光滑大曲面上 —— 满屏一片单色。实拍的七星瓢虫是一整块暗红，除了两个标注点圆点
 * 什么也没有。
 *
 * ## 判据为什么是「占了画面多大」
 *
 * 这个缺陷的形状就是**画面被虫体铺满、看不见轮廓**。所以直接量它：把模型表面按
 * 面积均匀采样成点云，投影到视口的粗网格上数格子。这条判据同时咬住相反的那一头
 * （相机对准一根细尖、虫体基本出画，同样认不出），两种形态一条线管。
 *
 * ## 阈值 0.45 是先量后定的
 *
 * 旧规则实测：378 个标注点（63 种 × 各自的标注点）里 **165 个超过 0.45**，最大 0.93。
 * 新规则把全部 378 个压进 0.04~0.32，**没有一个超过 0.45**。也就是说这道线目前有
 * 一整档的余量，不是贴着当前实现划的；退回旧规则会有 165 处一起红。
 *
 * ⚠️ 这条闸门只保证「画面里有虫、且不是一堵墙」，不保证好看。真正判定好不好看的
 * 那一步是**看渲染图** —— 定阈值时按全体中位数取过一次 0.55，数字完全在「合理范围」
 * 内，渲染出来还是一堵红墙；中位数里混着一半糊掉的样本。判据只能从取景本来就好的
 * 那批里取。
 */
import { describe, expect, it } from 'vitest'
import * as THREE from 'three'
import { knownSpecies, loadInsectModel } from '../registry'
import { INSECTS } from '../../data/insects.zh'
import { coverage, focusDistance, surfaceSamples, HOME_DIR } from '../framing'

/** 铺满画面的上限。实测新规则最大 0.32，退回旧规则有 165 处会越过这条线。 */
const MAX_COVERAGE = 0.45
/**
 * 空到看不见虫的下限 —— 抓的是「相机飞了、画面上什么都没有」，不是替细部件
 * 规定必须多大。
 *
 * 0.03 这个数看着低，但它是照着**最细的那个物种**定的：姬蜂通体是一根线加两片
 * 透明翅，把镜头对准虫体中心、退到全身取景距离，占比也只有 **0.056** —— 这就是
 * 它的天花板。对准产卵器尖端时实测 0.04，已经贴着天花板了（渲染图上虫体确实在
 * 画面里）。拿别的物种的手感给它划线只会得到一条永远红的闸门。
 */
const MIN_COVERAGE = 0.03

/** 展台的两种典型画幅：桌面横着、手机竖着。竖屏水平视场更窄，取景距离会不一样。 */
const ASPECTS: [string, number][] = [
  ['桌面 1.55', 1.55],
  ['手机竖屏 0.75', 0.75],
]

describe('聚焦取景（63 种全覆盖）', () => {
  const ids = knownSpecies()

  it('每个标注点聚焦后，虫体既没铺满画面、也没从画面里消失', { timeout: 300_000 }, async () => {
    const tooFull: string[] = []
    const tooEmpty: string[] = []
    let checked = 0

    for (const id of ids) {
      const model = await loadInsectModel(id)
      const insect = INSECTS.find((i) => i.id === id)
      if (!insect) continue
      const samples = surfaceSamples(model)
      const radius = model.frameRadius ?? model.radius

      for (const spot of insect.hotspots) {
        const anchor = model.anchors[spot.anchor]
        if (!anchor) continue
        for (const [label, aspect] of ASPECTS) {
          const cam = new THREE.PerspectiveCamera(34, aspect, 0.01, 100)
          const dist = focusDistance(cam, model, anchor, HOME_DIR, radius)
          cam.position.copy(anchor).addScaledVector(HOME_DIR, dist)
          cam.lookAt(anchor)
          cam.updateMatrixWorld(true)
          const cov = coverage(samples, cam)
          checked++
          const where = `${id}/${spot.anchor}（${label}）占 ${cov.toFixed(2)}`
          if (cov > MAX_COVERAGE) tooFull.push(where)
          if (cov < MIN_COVERAGE) tooEmpty.push(where)
        }
      }
    }

    expect(checked, '一个标注点都没量到，闸门是空的').toBeGreaterThan(300)
    expect(tooFull, '聚焦后画面被虫体铺满 —— 认不出是什么虫').toEqual([])
    expect(tooEmpty, '聚焦后画面上几乎没有虫').toEqual([])
  })

  it('点云是定序的 —— 同一个物种独立构建两次，采样必须一模一样', async () => {
    /**
     * 直接调 builder 而不是 `loadInsectModel`：后者带缓存，两次拿到的是同一个
     * group、`surfaceSamples` 直接命中缓存，比的是同一个引用，改成 `Math.random()`
     * 也照样绿。构建两次才有两个不同的 group，才真的各采样一次。
     */
    const { buildLadybird } = await import('../builders/ladybird')
    const a = surfaceSamples(buildLadybird())
    const b = surfaceSamples(buildLadybird())
    expect(a.length, '采样点云是空的').toBeGreaterThan(0)
    expect(Array.from(a)).toEqual(Array.from(b))
  })

  it('聚焦距离不会缩到最近端 —— 占比对距离并不单调', async () => {
    const model = await loadInsectModel('honeybee')
    const radius = model.frameRadius ?? model.radius
    const cam = new THREE.PerspectiveCamera(34, 1.55, 0.01, 100)
    /**
     * 锚点落在细长凸出物尖端时（蜜蜂的喙），凑得越近画面里越只剩一根针 ——
     * 占比随距离**上升**。二分会一路收敛到最近端，把「虫体出画」判成最优。
     * 这条钉的就是那个退化：结果不许贴着下界。
     */
    // 蜜蜂的第一个标注点就是螫针 —— 一根极细的尖，正是这个退化的典型入口
    const anchor = model.anchors['stinger']
    expect(anchor, '蜜蜂没有螫针这个锚点，测试选错了对象').toBeTruthy()
    const dist = focusDistance(cam, model, anchor, HOME_DIR, radius)
    expect(dist).toBeGreaterThan(radius * 0.5 * 1.05)
  })
})
