/**
 * @vitest-environment jsdom
 *
 * 生活史讲解：弹窗翻页驱动展台换标本。
 *
 * 这条通路的形状与讲解弹窗的 `onFocusAnchor` 完全一致 —— **弹窗驱动展台，
 * 展台不知道弹窗的存在**。所以这里验的是弹窗那一侧发出的指令序列对不对，
 * 3D 那一侧只要照着指令加载即可（`three/__tests__/stages.test.ts` 管模型本身）。
 *
 * 两个只有实跑才撞得出的 bug 都在下面钉住了：
 * 1. 打开时停在第 0 步而只有翻页才发指令 —— 文字讲着「卵」，展台还摆着成虫；
 * 2. 最后一步（成虫）提示「这一阶段没有立体标本」，而那只成虫就在台上转着。
 */
import { cleanup, fireEvent, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { renderZh } from '../../i18n/testing'
import { Discovery } from '../Discovery'
import { BottomCards } from '../BottomCards'
import { INSECTS } from '../../data/insects.zh'
import { getGuide } from '../../data/guides.zh'
import { builtStagesOf, metamorphosisOf } from '../../three/stages'

afterEach(cleanup)

/** 一只做了阶段模型的（完全变态）与一只没做的 */
const WITH_STAGES = 'rhinoceros-beetle'
const WITHOUT_STAGES = 'ladybird'
const insectOf = (id: string) => INSECTS.find((i) => i.id === id)!

function mountLifecycle(id: string) {
  const onLifeStage = vi.fn()
  const onClose = vi.fn()
  renderZh(
    <Discovery
      kind="lifecycle"
      insect={insectOf(id)}
      guide={getGuide(id)}
      onClose={onClose}
      onFocusAnchor={vi.fn()}
      onLifeStage={onLifeStage}
    />,
  )
  return { onLifeStage, onClose }
}

describe('前置：这几只确实做了阶段模型', () => {
  it('独角仙有卵/幼虫/蛹且判为完全变态；瓢虫一个阶段都没有', () => {
    expect(builtStagesOf(WITH_STAGES).sort()).toEqual(['egg', 'larva', 'pupa'])
    expect(metamorphosisOf(WITH_STAGES)).toEqual(['egg', 'larva', 'pupa', 'adult'])
    expect(builtStagesOf(WITHOUT_STAGES)).toEqual([])
    expect(metamorphosisOf(WITHOUT_STAGES)).toBeNull()
  })
})

describe('打开即换标本', () => {
  it('弹窗一挂载就把展台换成第一步（卵），不用先翻一页', () => {
    const { onLifeStage } = mountLifecycle(WITH_STAGES)
    expect(
      onLifeStage,
      '只在翻页时发指令的话，文字讲着「卵」而展台还摆着成虫',
    ).toHaveBeenCalledWith('egg')
  })

  it('没有阶段模型的物种不发任何换台指令', () => {
    const { onLifeStage } = mountLifecycle(WITHOUT_STAGES)
    expect(onLifeStage).not.toHaveBeenCalled()
  })
})

describe('逐步翻页的指令序列', () => {
  it('卵 → 幼虫 → 蛹 → 成虫（成虫回落到 null，即常规模型）', () => {
    const { onLifeStage } = mountLifecycle(WITH_STAGES)
    for (let i = 0; i < 3; i++) fireEvent.click(screen.getByRole('button', { name: /下一步/ }))
    expect(onLifeStage.mock.calls.map((c) => c[0])).toEqual(['egg', 'larva', 'pupa', null])
  })

  it('关闭时把展台放回成虫 —— 弹窗关了而台上还摆着卵，是最让人摸不着头脑的残留', () => {
    const { onLifeStage, onClose } = mountLifecycle(WITH_STAGES)
    // 翻到最后一步（成虫），此时主按钮变成「看完了」
    for (let i = 0; i < 3; i++) fireEvent.click(screen.getByRole('button', { name: /下一步/ }))
    onLifeStage.mockClear()
    fireEvent.click(screen.getByRole('button', { name: /看完了/ }))
    expect(onLifeStage).toHaveBeenLastCalledWith(null)
    expect(onClose).toHaveBeenCalled()
  })
})

describe('台上到底有没有标本，提示要说对', () => {
  it('第一步（卵）说「已换成这一阶段」', () => {
    mountLifecycle(WITH_STAGES)
    expect(screen.getByText(/展台已换成这一阶段/)).toBeTruthy()
  })

  it('最后一步（成虫）也说「已换成」—— 成虫走常规注册表，但它确实在台上', () => {
    mountLifecycle(WITH_STAGES)
    for (let i = 0; i < 3; i++) fireEvent.click(screen.getByRole('button', { name: /下一步/ }))
    expect(screen.getByText(/展台已换成这一阶段/)).toBeTruthy()
    expect(screen.queryByText(/还没有立体标本/)).toBeNull()
  })
})

describe('底部卡片的入口', () => {
  function mountCards(id: string) {
    const onDiscover = vi.fn()
    renderZh(
      <BottomCards
        insect={insectOf(id)}
        peers={INSECTS}
        onDiscover={onDiscover}
        onCompare={vi.fn()}
        onExplore={vi.fn()}
      />,
    )
    return onDiscover
  }

  it('有阶段模型的走 lifecycle', () => {
    const onDiscover = mountCards(WITH_STAGES)
    fireEvent.click(screen.getByRole('button', { name: /播放发育动画/ }))
    expect(onDiscover).toHaveBeenCalledWith('lifecycle')
  })

  it('没有阶段模型的退回原来的文本面板 —— 不给用户一个点开只有字的「生活史」', () => {
    const onDiscover = mountCards(WITHOUT_STAGES)
    fireEvent.click(screen.getByRole('button', { name: /播放发育动画/ }))
    expect(onDiscover).toHaveBeenCalledWith('motion')
  })
})
