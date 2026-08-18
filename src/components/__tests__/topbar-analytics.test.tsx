/**
 * @vitest-environment jsdom
 *
 * 顶栏三处埋点：搜索结果点击（species_switch, source:'search'）、
 * 输入停顿后的搜索发起（search, has_results）、语言切换点击
 * （language_switch）。track() 本身的防御性另有 analytics.test.ts 覆盖，
 * 这里只管「点了/停顿了会不会调用，调用时事件名与字段对不对」。
 */
import { act, cleanup, fireEvent, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { renderZh } from '../../i18n/testing'
import { TopBar } from '../TopBar'
import { INSECTS } from '../../data/insects.zh'

vi.mock('../../analytics', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../analytics')>()
  return { ...actual, track: vi.fn() }
})

import { EVENTS, track } from '../../analytics'

const trackMock = vi.mocked(track)

afterEach(() => {
  cleanup()
  trackMock.mockClear()
})

function mount(overrides: Partial<Parameters<typeof TopBar>[0]> = {}) {
  const onPick = vi.fn()
  renderZh(
    <TopBar
      insects={INSECTS}
      activeId={INSECTS[0].id}
      onPick={onPick}
      onLessons={vi.fn()}
      onLibrary={vi.fn()}
      onNotes={vi.fn()}
      onExplore={vi.fn()}
      orderFilter={null}
      onOrderFilter={vi.fn()}
      noteCount={0}
      onCopyNotes={vi.fn()}
      onClearNotes={vi.fn()}
      theme="light"
      onToggleTheme={vi.fn()}
      {...overrides}
    />,
  )
  const input = screen.getByPlaceholderText(/搜索昆虫/)
  return { onPick, input }
}

describe('搜索结果点击 —— species_switch(source: search)', () => {
  it('点结果既通知外层选中，也带上物种 id 与目上报', () => {
    const { input, onPick } = mount()
    fireEvent.change(input, { target: { value: '七星瓢虫' } })
    const row = screen
      .queryAllByRole('button')
      .find((b) => b.querySelector('[class*=resultName]')?.textContent === '七星瓢虫')
    expect(row, '没找到七星瓢虫这一行').toBeTruthy()
    fireEvent.click(row!)

    expect(onPick).toHaveBeenCalledWith('ladybird')
    const ladybird = INSECTS.find((i) => i.id === 'ladybird')!
    expect(trackMock).toHaveBeenCalledWith(EVENTS.SPECIES_SWITCH, {
      source: 'search',
      species_id: 'ladybird',
      order: ladybird.order,
    })
  })
})

describe('搜索发起埋点 —— 停顿后报一次，不带查询词原文', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('停顿 500ms 后报一次，has_results 反映确有结果', () => {
    const { input } = mount()
    fireEvent.change(input, { target: { value: '瓢虫' } })
    act(() => vi.advanceTimersByTime(500))
    expect(trackMock).toHaveBeenCalledWith(EVENTS.SEARCH, { has_results: true })
  })

  it('没有结果时 has_results 为 false', () => {
    const { input } = mount()
    fireEvent.change(input, { target: { value: '霸王龙' } })
    act(() => vi.advanceTimersByTime(500))
    expect(trackMock).toHaveBeenCalledWith(EVENTS.SEARCH, { has_results: false })
  })

  it('连续敲键、还没停顿够 500ms 时不报', () => {
    const { input } = mount()
    fireEvent.change(input, { target: { value: '瓢' } })
    act(() => vi.advanceTimersByTime(200))
    fireEvent.change(input, { target: { value: '瓢虫' } })
    act(() => vi.advanceTimersByTime(200))
    expect(trackMock.mock.calls.filter((c) => c[0] === EVENTS.SEARCH)).toHaveLength(0)
  })

  it('敲完停顿够才报，且只报一次 —— 不追每个按键', () => {
    const { input } = mount()
    fireEvent.change(input, { target: { value: '瓢' } })
    act(() => vi.advanceTimersByTime(200))
    fireEvent.change(input, { target: { value: '瓢虫' } })
    act(() => vi.advanceTimersByTime(500))
    expect(trackMock.mock.calls.filter((c) => c[0] === EVENTS.SEARCH)).toHaveLength(1)
  })

  it('上报参数里不出现查询词原文 —— 隐私要求', () => {
    const { input } = mount()
    fireEvent.change(input, { target: { value: '七星瓢虫' } })
    act(() => vi.advanceTimersByTime(500))
    for (const call of trackMock.mock.calls) {
      expect(JSON.stringify(call)).not.toContain('七星瓢虫')
    }
  })
})

describe('语言切换埋点', () => {
  it('点切到英文的链接，上报 to: en', () => {
    mount()
    fireEvent.click(screen.getByText('EN'))
    expect(trackMock).toHaveBeenCalledWith(EVENTS.LANGUAGE_SWITCH, { to: 'en' })
  })

  it('当前语言那个链接点了不上报 —— 它本来就没有 href，点了也不会跳转', () => {
    mount()
    fireEvent.click(screen.getByText('中'))
    expect(trackMock).not.toHaveBeenCalledWith(EVENTS.LANGUAGE_SWITCH, expect.anything())
  })
})
