/**
 * 生活史阶段的契约闸门。
 *
 * 阶段模型是多路并行做出来的（照过去物种轮次的作业法），所以这份测试要在
 * **合流之前**就把约定钉死：命名、导出、单位、路线自洽。契约不钉，8 只虫会
 * 各写各的，合流时全是冲突 —— 而且冲突里最难查的那类是「各自都对、放一起不对」。
 *
 * 第一条尤其重要：阶段文件绝不能被当成物种注册进去。`registry.ts` 的 glob
 * 是 `./builders/*.ts`，`*` 不跨 `/`，所以放在 `builders/stages/` 下天然安全 ——
 * 但这件事值得有条断言看着，因为一旦有人把 glob 改成 `**`，症状是图鉴列表里
 * 凭空多出「monarch-butterfly-larva」这样的物种，而它没有图鉴数据，
 * 表现为点开转圈。
 */
import { describe, expect, it } from 'vitest'
import {
  BUILT_STAGES,
  HEMIMETABOLOUS,
  HOLOMETABOLOUS,
  builtStagesOf,
  hasStage,
  loadStageModel,
  metamorphosisOf,
  speciesWithStages,
  type LifeStage,
} from '../stages'
import { knownSpecies } from '../registry'
import { INSECTS } from '../../data/insects.zh'

const SPECIES_IDS = new Set(INSECTS.map((i) => i.id))

describe('阶段文件不污染物种注册表', () => {
  it('knownSpecies() 里没有任何带阶段后缀的条目', () => {
    const bad = knownSpecies().filter((id) => /-(egg|larva|pupa|nymph)$/.test(id))
    expect(
      bad,
      `这些阶段文件被当成物种注册了：${bad.join('、')}。` +
        'registry.ts 的 glob 必须保持 ./builders/*.ts（* 不跨 /），别改成 **。',
    ).toEqual([])
  })

  it('每个阶段文件的物种 id 都是图鉴里真有的虫', () => {
    const orphan = speciesWithStages().filter((id) => !SPECIES_IDS.has(id))
    expect(orphan, `这些 id 不在图鉴里：${orphan.join('、')}`).toEqual([])
  })
})

/**
 * 还没有任何阶段文件时，`it.each([])` 会让 vitest 报「suite 里没有测试」。
 * 用 runIf 空转过去 —— 第一个阶段文件放进 `builders/stages/` 的那一刻，
 * 下面两组闸门自动开始生效，不用回来改这里。
 */
const HAS_STAGES = speciesWithStages().length > 0

describe.runIf(HAS_STAGES)('变态路线自洽', () => {
  it.each(speciesWithStages())('%s 的阶段组合是一条真实的路线', (id) => {
    const route = metamorphosisOf(id)
    expect(route, `${id} 既没有蛹也没有若虫，判不出变态路线`).not.toBeNull()
    const stages = builtStagesOf(id)

    if (route === HOLOMETABOLOUS) {
      // 完全变态：有蛹就必须有幼虫 —— 只有蛹没有幼虫，演示会从卵直接跳到蛹
      expect(stages, `${id} 有蛹却没有幼虫`).toContain('larva')
      expect(stages, `${id} 同时有蛹和若虫 —— 这两个词是互斥的`).not.toContain('nymph')
    } else {
      expect(route).toBe(HEMIMETABOLOUS)
      expect(stages, `${id} 有若虫却又有幼虫/蛹`).not.toContain('larva')
      expect(stages, `${id} 有若虫却又有蛹`).not.toContain('pupa')
    }

    // 卵是两条路线共有的第一步，做了阶段就该有它
    expect(stages, `${id} 缺卵 —— 生活史从卵讲起`).toContain('egg')
  })
})

describe.runIf(HAS_STAGES)('每个阶段模型都满足与成虫同一套契约', () => {
  const all: [string, LifeStage][] = speciesWithStages().flatMap((id) =>
    builtStagesOf(id).map((s) => [id, s] as [string, LifeStage]),
  )

  it.each(all)('%s / %s 能构建，且尺度、几何、命名都对', async (id, stage) => {
    const model = await loadStageModel(id, stage)

    // 有实体
    let meshes = 0
    let verts = 0
    model.group.traverse((o) => {
      const m = o as { isMesh?: boolean; geometry?: { getAttribute: (n: string) => { count: number } } }
      if (m.isMesh && m.geometry) {
        meshes++
        verts += m.geometry.getAttribute('position').count
      }
    })
    expect(meshes, `${id}-${stage} 一个网格都没有`).toBeGreaterThan(0)
    expect(verts, `${id}-${stage} 顶点数为 0`).toBeGreaterThan(0)

    // 走过 finalize：半径有效、模型已居中
    expect(model.radius, `${id}-${stage} 半径无效`).toBeGreaterThan(0)
    expect(Number.isFinite(model.radius)).toBe(true)

    /*
     * 单位是 1 = 1 厘米真实体长，所以半径必须落在昆虫的量级里。
     * 上限 12：最大的成虫（竹节虫）半径约 6.8，幼虫可能更长，留一倍余量。
     * 下限 0.02：卵通常 0.5~2 毫米，半径 0.02 已经是很小的卵。
     * 越界基本只有一个原因 —— 作者按「好看」调了尺度而不是按真实大小，
     * 而各阶段之间的量级差正是生活史要讲的内容。
     */
    expect(model.radius, `${id}-${stage} 半径 ${model.radius} 超出昆虫量级，是不是没按真实尺寸建模`).toBeLessThan(12)
    expect(model.radius, `${id}-${stage} 半径 ${model.radius} 小得不像昆虫`).toBeGreaterThan(0.02)

    // NaN 会让整个模型静默变成空白，专门查一遍
    let nan = 0
    model.group.traverse((o) => {
      const m = o as { isMesh?: boolean; geometry?: { getAttribute: (n: string) => { array: ArrayLike<number> } } }
      if (!m.isMesh || !m.geometry) return
      const arr = m.geometry.getAttribute('position').array
      for (let i = 0; i < arr.length; i++) if (!Number.isFinite(arr[i])) nan++
    })
    expect(nan, `${id}-${stage} 有 ${nan} 个 NaN/Inf 顶点`).toBe(0)
  })
})

describe('注册表本身', () => {
  it('目前有阶段模型的物种（数量随进度增长，这条只做可见性）', () => {
    expect(Array.isArray(speciesWithStages())).toBe(true)
  })

  it('BUILT_STAGES 不含成虫 —— 成虫永远走 registry.ts', () => {
    expect(BUILT_STAGES).not.toContain('adult')
  })

  it('两条路线都以卵开头、成虫收尾', () => {
    for (const route of [HOLOMETABOLOUS, HEMIMETABOLOUS]) {
      expect(route[0]).toBe('egg')
      expect(route[route.length - 1]).toBe('adult')
    }
  })

  it('没做阶段的物种一律报 null，不瞎猜', () => {
    expect(metamorphosisOf('ladybird-不存在')).toBeNull()
    expect(hasStage('ladybird-不存在', 'egg')).toBe(false)
    expect(builtStagesOf('ladybird-不存在')).toEqual([])
  })

  it('加载未注册的阶段会明确报错，不静默返回空模型', async () => {
    await expect(loadStageModel('ladybird-不存在', 'egg')).rejects.toThrow(/未注册的生活史阶段/)
  })
})
