/**
 * @vitest-environment jsdom
 *
 * 顶栏搜索 —— 两档匹配的真实行为。
 *
 * 为什么单独测它：这是全站分支最多、又最容易悄悄退化的一段。
 * 第二档（在总述/冷知识全文里找）是当初实测撞出来才加的 ——
 * 图鉴用「中华黄萤」这样的正式名，而人会搜「萤火虫」。
 * 这条特性没有测试的话，谁顺手改一下过滤条件都不会有人发现它没了。
 *
 * 用真实数据（src/data/insects）而不是造假数据：造的数据只能证明代码
 * 按我以为的方式跑，用真数据才能证明「搜萤火虫真的搜得到」。
 */
import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup } from '@testing-library/react'
import { TopBar } from '../TopBar'
import { INSECTS } from '../../data/insects'

afterEach(cleanup)

function mount(overrides: Partial<Parameters<typeof TopBar>[0]> = {}) {
  const onPick = vi.fn()
  render(
    <TopBar
      insects={INSECTS}
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
  const type = (text: string) => fireEvent.change(input, { target: { value: text } })
  /** 下拉里每条结果的中文名 */
  const names = () =>
    screen
      .queryAllByRole('button')
      .filter((b) => b.querySelector('[class*=resultName]'))
      .map((b) => b.querySelector('[class*=resultName]')!.textContent)
  return { onPick, input, type, names }
}

describe('第一档：名称 / 学名 / 目 / 雅称', () => {
  it('按中文名搜得到', () => {
    const { type, names } = mount()
    type('瓢虫')
    expect(names()).toContain('七星瓢虫')
  })

  it('按拉丁学名搜得到，且不区分大小写', () => {
    const { type, names } = mount()
    type('COCCINELLA')
    expect(names()).toContain('七星瓢虫')
  })

  it('按目搜得到整目（搜「蜻蜓目」应同时列出蜻蜓与豆娘）', () => {
    const { type, names } = mount()
    type('蜻蜓目')
    const hits = names()
    expect(hits).toContain('碧伟蜓')
    expect(hits).toContain('豆娘')
  })
})

describe('第二档：正文兜底 —— 俗名只出现在正文里', () => {
  it('搜俗名「萤火虫」能搜到正式名叫「中华黄萤」的那只', () => {
    const { type, names } = mount()
    const hits = names()
    expect(hits).toHaveLength(0) // 未输入时无结果
    type('萤火虫')
    expect(names()).toContain('中华黄萤')
  })

  it('第二档不重复第一档已命中的物种', () => {
    const { type, names } = mount()
    type('瓢虫')
    const hits = names()
    expect(new Set(hits).size).toBe(hits.length)
  })

  it('单字不触发第二档，两字才触发（否则常见字会把列表撑爆）', () => {
    // 挑「它」是有讲究的：它在 44 个物种的正文里出现，却不在任何
    // 名称/学名/目/雅称中 —— 所以第一档一定为空，能干净地量出第二档的开关。
    // （首版挑了「的」，结果它出现在雅称里，量的其实是第一档，是我的假设错了。）
    const one = mount()
    one.type('它')
    expect(one.names(), '单字不该启动第二档').toHaveLength(0)
    cleanup()

    const two = mount()
    two.type('它的')
    expect(two.names().length, '两字应当启动第二档').toBeGreaterThan(0)
  })

  it('结果整体截断到 12 条', () => {
    const { type, names } = mount()
    type('虫')
    expect(names().length).toBeLessThanOrEqual(12)
  })
})

describe('交互', () => {
  it('点结果把物种 id 交出去（而不是名字 —— 名字会重、id 不会）', () => {
    const { type, onPick } = mount()
    type('七星瓢虫')
    const row = screen
      .queryAllByRole('button')
      .find((b) => b.querySelector('[class*=resultName]')?.textContent === '七星瓢虫')
    expect(row, '没找到七星瓢虫这一行').toBeTruthy()
    fireEvent.click(row!)
    expect(onPick).toHaveBeenCalledWith('ladybird')
  })

  it('搜不到时给一句人话，而不是空白下拉', () => {
    const { type } = mount()
    type('霸王龙')
    expect(screen.getByText(/没有找到|没有|试试/)).toBeTruthy()
  })
})

describe('主题切换钮', () => {
  it('浅色时提供切到深色的入口，反之亦然（aria-label 是盲用户唯一的线索）', () => {
    const light = mount({ theme: 'light' })
    expect(screen.getByLabelText('切换到深色主题')).toBeTruthy()
    cleanup()
    void light

    mount({ theme: 'dark' })
    expect(screen.getByLabelText('切换到浅色主题')).toBeTruthy()
  })

  it('点一下就通知外层切换', () => {
    const onToggleTheme = vi.fn()
    mount({ onToggleTheme })
    fireEvent.click(screen.getByLabelText('切换到深色主题'))
    expect(onToggleTheme).toHaveBeenCalledTimes(1)
  })
})
