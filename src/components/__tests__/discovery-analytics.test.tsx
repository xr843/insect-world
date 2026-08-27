/**
 * @vitest-environment jsdom
 *
 * 讲解弹窗五处埋点：打开（带 kind）、讲解翻页、讲解走完最后一步、
 * 小测作答、小测最终得分。用真实数据（getGuide('ladybird')）而不是
 * 造假数据 —— 步数/题数从数据本身取，不写死数字，这样内容改了
 * 测试不用跟着改。
 */
import { useRef, useState } from 'react'
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

/**
 * 讲解结尾切小测走的是 `onSwitchKind`，不经过关闭再打开 —— 和 App.tsx 的
 * `openDiscovery` 同一个形状（见那边 `setDiscovery({kind, source})`）。
 * 这里补一层小状态照实模拟同一条通路，否则 onSwitchKind 传不进去，
 * 按钮压根不会出现（组件里 `onSwitchKind &&` 挡着）。
 *
 * key=kind 也照抄 App.tsx 那份：原地换 kind 不经过关闭再打开时 props
 * 更新不会自动重新挂载，Discovery 内部「kind 在实例生命周期内不会变」
 * 的假设（打开埋点的 effect、以及 step 这个状态本身）就不成立了。
 */
function DiscoveryHost({
  kind,
  source,
  onFocusAnchor,
}: {
  kind: DiscoveryKind
  source: DiscoverySource
  /**
   * 不传时内部兜底一个，但要用 useRef 固定住 —— 直接在 JSX 里写
   * `onFocusAnchor={vi.fn()}` 的话，每次 DiscoveryHost 重渲染都会拿到
   * 一个新 mock，换 kind 前后的调用记录接不上，就测不出「切小测那一刻
   * 有没有调用它」这种跨渲染的断言（对应 App.tsx 里 setFocusAnchor 本来
   * 就是同一个引用贯穿整个组件生命周期，不会因为换 kind 重新挂载而变）。
   */
  onFocusAnchor?: (anchor: string | null) => void
}) {
  const [state, setState] = useState({ kind, source })
  const focusAnchorRef = useRef(onFocusAnchor ?? vi.fn())
  return (
    <Discovery
      key={state.kind}
      kind={state.kind}
      insect={ladybird}
      guide={guide}
      onClose={vi.fn()}
      onFocusAnchor={focusAnchorRef.current}
      source={state.source}
      onLifeStage={vi.fn()}
      onSwitchKind={(k, s) => setState({ kind: k, source: s })}
    />
  )
}

function mount(
  kind: DiscoveryKind,
  source: DiscoverySource = 'card',
  onFocusAnchor?: (anchor: string | null) => void,
) {
  renderZh(<DiscoveryHost kind={kind} source={source} onFocusAnchor={onFocusAnchor} />)
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

describe('讲解走完之后接小测', () => {
  it('最后一步给出「做个小测」的入口', () => {
    mount('lesson')
    const steps = guide.lesson.length
    for (let i = 0; i < steps - 1; i++) fireEvent.click(screen.getByText(/下一步/))
    expect(screen.getByText(/小测/), '讲解结尾没有小测入口').toBeTruthy()
  })

  it('点它换到小测，且 discovery_open 只报一次 —— 别手动再报一遍', () => {
    mount('lesson')
    const steps = guide.lesson.length
    for (let i = 0; i < steps - 1; i++) fireEvent.click(screen.getByText('下一步'))
    trackMock.mockClear()
    fireEvent.click(screen.getByText('做个小测'))
    const opens = trackMock.mock.calls.filter(
      (c) => c[0] === EVENTS.DISCOVERY_OPEN && (c[1] as { kind: string }).kind === 'quiz',
    )
    expect(opens, 'discovery_open(quiz) 报了不止一次 —— Discovery 自己已经报过了').toHaveLength(1)
    expect(opens[0][1]).toEqual({ kind: 'quiz', source: 'lesson' })
  })

  /**
   * 补的第五条，不在简报给的四条里：讲解与小测共用同一个 `step` 状态
   * （讲解翻页与小测翻题都是它），原地换 kind 若不强制重新挂载，
   * step 会带着讲解最后一步的下标（本例是 3）直接冲进小测的题目数组
   * （常常只有 2 题），越界取到 undefined，页面上出来的是「题目还在
   * 整理中」的空状态兜底，而不是第一题 —— 展开来的空测试挖出来的，
   * 埋点断言本身不会碰到 DOM，测不出这一层。
   */
  it('切到小测显示的是真正的第一题，不是空状态兜底', () => {
    mount('lesson')
    for (let i = 0; i < guide.lesson.length - 1; i++) fireEvent.click(screen.getByText('下一步'))
    fireEvent.click(screen.getByText('做个小测'))
    expect(screen.getByText(guide.quiz[0].question), '越界摔进了空状态兜底').toBeTruthy()
  })

  it('「看完了」照旧上报 lesson_complete —— 小测是可选的，不是必经的', () => {
    mount('lesson')
    const steps = guide.lesson.length
    for (let i = 0; i < steps - 1; i++) fireEvent.click(screen.getByText('下一步'))
    fireEvent.click(screen.getByText('看完了'))
    expect(trackMock).toHaveBeenCalledWith(EVENTS.LESSON_COMPLETE, { total: steps })
  })

  /**
   * lesson_complete 是这次实验的分母。选小测的人如果不算讲完，这条路径
   * 会平白丢掉分母里的人，看起来像「做了这个功能、完课率反而降了」——
   * 实验会读反。两个出口都要报，且总步数要对得上。
   */
  it('走到最后一步选「做个小测」，同样算讲完了，也报 lesson_complete', () => {
    mount('lesson')
    const steps = guide.lesson.length
    for (let i = 0; i < steps - 1; i++) fireEvent.click(screen.getByText('下一步'))
    trackMock.mockClear()
    fireEvent.click(screen.getByText('做个小测'))
    expect(trackMock).toHaveBeenCalledWith(EVENTS.LESSON_COMPLETE, { total: steps })
  })

  /**
   * 讲解结尾若停在带 anchor 的一步，镜头就锁在那个部位上；换 kind 只是
   * 重新挂载，没人会主动把镜头收回去。不借助某个物种最后一步恰好带
   * anchor 才能测出来 —— 点击前先清空调用记录，只要点击本身触发了一次
   * `onFocusAnchor(null)`，就说明这次切换确实收了镜头，不依赖数据巧合。
   */
  it('切到小测前，先把镜头收回全身取景', () => {
    const onFocusAnchor = vi.fn()
    mount('lesson', 'card', onFocusAnchor)
    const steps = guide.lesson.length
    for (let i = 0; i < steps - 1; i++) fireEvent.click(screen.getByText('下一步'))
    onFocusAnchor.mockClear()
    fireEvent.click(screen.getByText('做个小测'))
    expect(onFocusAnchor).toHaveBeenCalledWith(null)
  })

  it('中间步骤不出现小测入口 —— 它属于「读完了」这个时刻', () => {
    mount('lesson')
    expect(screen.queryByText('做个小测'), '第一步就冒出小测入口').toBeNull()
  })
})
