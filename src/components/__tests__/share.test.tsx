/**
 * @vitest-environment jsdom
 *
 * 详情栏的分享按钮 —— 两条路径：有系统分享面板走 navigator.share，
 * 没有就复制规范链接并短暂显示「已复制」。
 *
 * 为什么值得测：jsdom 里 navigator.share/clipboard 都不存在，真机上
 * 又因浏览器而异 —— 这正是最容易「在我机器上是好的」的一类分支。
 * 分享出去的 URL 必须是规范路径（/s/<id>/），这是与静态壳页共同遵守
 * 的契约，改坏了别人的转发链接会 404。
 */
import { act, cleanup, fireEvent, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { renderEn, renderZh } from '../../i18n/testing'
import { DetailPanel } from '../DetailPanel'
import { INSECTS } from '../../data/insects.zh'

const ladybird = INSECTS.find((i) => i.id === 'ladybird')!

afterEach(() => {
  cleanup()
  vi.useRealTimers()
  // 每条用例自己 defineProperty 的 navigator 扩展要清干净，别串场
  delete (navigator as unknown as Record<string, unknown>).share
  delete (navigator as unknown as Record<string, unknown>).clipboard
})

function mountZh() {
  renderZh(<DetailPanel insect={ladybird} onCompare={vi.fn()} onDiscover={vi.fn()} />)
}

function stubClipboard() {
  const writeText = vi.fn().mockResolvedValue(undefined)
  Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true })
  return writeText
}

describe('没有系统分享面板：复制链接', () => {
  it('按钮写「复制本页链接」，点击把规范路径写进剪贴板', async () => {
    const writeText = stubClipboard()
    mountZh()
    const btn = screen.getByText('复制本页链接')
    await act(async () => {
      fireEvent.click(btn)
    })
    expect(writeText).toHaveBeenCalledWith(`${location.origin}/s/ladybird/`)
  })

  it('复制成功后短暂显示「已复制」，2 秒后还原', async () => {
    vi.useFakeTimers()
    stubClipboard()
    mountZh()
    await act(async () => {
      fireEvent.click(screen.getByText('复制本页链接'))
    })
    expect(screen.getByText('已复制')).toBeTruthy()
    act(() => {
      vi.advanceTimersByTime(2100)
    })
    expect(screen.queryByText('已复制')).toBeNull()
    expect(screen.getByText('复制本页链接')).toBeTruthy()
  })

  it('剪贴板不可用（如非安全上下文）时点击不抛错', () => {
    mountZh()
    expect(() => fireEvent.click(screen.getByText('复制本页链接'))).not.toThrow()
  })

  it('英文版复制的是 /en/ 前缀的路径', async () => {
    const writeText = stubClipboard()
    renderEn(<DetailPanel insect={ladybird} onCompare={vi.fn()} onDiscover={vi.fn()} />)
    await act(async () => {
      fireEvent.click(screen.getByText('Copy page link'))
    })
    expect(writeText).toHaveBeenCalledWith(`${location.origin}/en/s/ladybird/`)
  })
})

describe('有系统分享面板：走 navigator.share', () => {
  it('按钮写「分享这只虫」，点击把物种名和规范链接交给系统面板', () => {
    const share = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'share', { value: share, configurable: true })
    mountZh()
    fireEvent.click(screen.getByText('分享这只虫'))
    expect(share).toHaveBeenCalledWith({
      title: ladybird.name,
      url: `${location.origin}/s/ladybird/`,
    })
  })

  it('用户在面板里点取消（share reject）不抛错', async () => {
    const share = vi.fn().mockRejectedValue(new DOMException('abort', 'AbortError'))
    Object.defineProperty(navigator, 'share', { value: share, configurable: true })
    mountZh()
    await act(async () => {
      fireEvent.click(screen.getByText('分享这只虫'))
    })
    // 走到这里没有未捕获 rejection 即通过；按钮文案也不该变成「已复制」
    expect(screen.queryByText('已复制')).toBeNull()
  })
})
