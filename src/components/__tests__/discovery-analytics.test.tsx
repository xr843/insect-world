/**
 * @vitest-environment jsdom
 *
 * 讲解弹窗五处埋点：打开（带 kind）、讲解翻页、讲解走完最后一步、
 * 小测作答、小测最终得分。用真实数据（getGuide('ladybird')）而不是
 * 造假数据 —— 步数/题数从数据本身取，不写死数字，这样内容改了
 * 测试不用跟着改。
 */
import { cleanup, fireEvent, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { renderZh } from '../../i18n/testing'
import { INSECTS } from '../../data/insects.zh'
import { getGuide } from '../../data/guides.zh'
import { Discovery, type DiscoveryKind } from '../Discovery'

vi.mock('../../analytics', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../analytics')>()
  return { ...actual, track: vi.fn() }
})

import { DISCOVERY_SOURCES, EVENTS, track, type DiscoverySource } from '../../analytics'

const trackMock = vi.mocked(track)
const ladybird = INSECTS.find((i) => i.id === 'ladybird')!
const guide = getGuide('ladybird')!

afterEach(() => {
  cleanup()
  trackMock.mockClear()
})

function mount(kind: DiscoveryKind, source: DiscoverySource = 'card') {
  renderZh(
    <Discovery
      kind={kind}
      insect={ladybird}
      guide={guide}
      onClose={vi.fn()}
      onFocusAnchor={vi.fn()}
      source={source}
      onLifeStage={vi.fn()}
    />,
  )
}

describe('打开 —— discovery_open(kind, source)', () => {
  it.each(['lesson', 'motion', 'quiz', 'habitat'] as const)('kind=%s 一挂载就报一次', (kind) => {
    mount(kind)
    expect(trackMock).toHaveBeenCalledWith(EVENTS.DISCOVERY_OPEN, { kind, source: 'card' })
  })

  /**
   * source 必须原样报上去。
   *
   * 加这一维就是为了回答「生活史没人看，是没人想看还是没人看得见」——
   * 展台入口与卡片入口混在一起，打开数涨了也说不清是新入口起了作用还是
   * 那几天流量本来就高。报错来源会让这次改动**看起来有效而实际无法证伪**。
   */
  it.each(DISCOVERY_SOURCES)('source=%s 原样报上去，不写死', (source) => {
    mount('lifecycle', source)
    expect(trackMock).toHaveBeenCalledWith(EVENTS.DISCOVERY_OPEN, { kind: 'lifecycle', source })
  })
})

describe('分步讲解翻页 —— lesson_step', () => {
  it('点「下一步」报翻到的目标步（1 起数）与总步数', () => {
    mount('lesson')
    trackMock.mockClear()
    fireEvent.click(screen.getByText('下一步'))
    expect(trackMock).toHaveBeenCalledWith(EVENTS.LESSON_STEP, { step: 2, total: guide.lesson.length })
  })

  it('点「上一步」报回退到的那一步', () => {
    mount('lesson')
    fireEvent.click(screen.getByText('下一步')) // 先翻到第 2 步
    trackMock.mockClear()
    fireEvent.click(screen.getByText('上一步'))
    expect(trackMock).toHaveBeenCalledWith(EVENTS.LESSON_STEP, { step: 1, total: guide.lesson.length })
  })
})

describe('讲解走完最后一步 —— lesson_complete', () => {
  it('翻到最后一步点「看完了」才报，中途翻页不会误报它', () => {
    mount('lesson')
    const total = guide.lesson.length
    for (let i = 0; i < total - 1; i++) {
      fireEvent.click(screen.getByText('下一步'))
    }
    trackMock.mockClear()
    fireEvent.click(screen.getByText('看完了'))
    expect(trackMock).toHaveBeenCalledWith(EVENTS.LESSON_COMPLETE, { total })
    expect(trackMock).not.toHaveBeenCalledWith(EVENTS.LESSON_STEP, expect.anything())
  })
})

describe('小测作答 —— quiz_answer(correct)', () => {
  it('选中正确选项，correct: true', () => {
    mount('quiz')
    trackMock.mockClear()
    const q = guide.quiz[0]
    fireEvent.click(screen.getByText(q.options[q.answer]))
    expect(trackMock).toHaveBeenCalledWith(EVENTS.QUIZ_ANSWER, { correct: true })
  })

  it('选中错误选项，correct: false', () => {
    mount('quiz')
    trackMock.mockClear()
    const q = guide.quiz[0]
    const wrongIndex = q.options.findIndex((_, i) => i !== q.answer)
    fireEvent.click(screen.getByText(q.options[wrongIndex]))
    expect(trackMock).toHaveBeenCalledWith(EVENTS.QUIZ_ANSWER, { correct: false })
  })
})

describe('小测最终得分 —— quiz_score', () => {
  it('答完最后一题的那一刻就上报一次最终得分（不用等点「结束」）', () => {
    mount('quiz')
    trackMock.mockClear()
    const total = guide.quiz.length
    for (let i = 0; i < total; i++) {
      const q = guide.quiz[i]
      fireEvent.click(screen.getByText(q.options[q.answer])) // 每题都选对，得分应等于满分
      if (i < total - 1) fireEvent.click(screen.getByText('下一题'))
    }
    expect(trackMock).toHaveBeenCalledWith(EVENTS.QUIZ_SCORE, { score: total, total })
  })

  it('答完前不会提前报分', () => {
    mount('quiz')
    trackMock.mockClear()
    const q = guide.quiz[0]
    fireEvent.click(screen.getByText(q.options[q.answer]))
    if (guide.quiz.length > 1) {
      expect(trackMock).not.toHaveBeenCalledWith(EVENTS.QUIZ_SCORE, expect.anything())
    }
  })
})
