/**
 * @vitest-environment jsdom
 *
 * 分享按钮埋点：点击时上报走的是系统面板还是复制链接。两条路径本身
 * （navigator.share / clipboard）的行为已经在 share.test.tsx 盯着，
 * 这里只加一层「埋点对不对」。
 */
import { cleanup, fireEvent, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { renderZh } from '../../i18n/testing'
import { DetailPanel } from '../DetailPanel'
import { INSECTS } from '../../data/insects.zh'

vi.mock('../../analytics', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../analytics')>()
  return { ...actual, track: vi.fn() }
})

import { EVENTS, track } from '../../analytics'

const trackMock = vi.mocked(track)
const ladybird = INSECTS.find((i) => i.id === 'ladybird')!

afterEach(() => {
  cleanup()
  trackMock.mockClear()
  delete (navigator as unknown as Record<string, unknown>).share
  delete (navigator as unknown as Record<string, unknown>).clipboard
})

describe('分享点击 —— share_click(method)', () => {
  it('没有系统分享面板时走复制链接，method: copy', () => {
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: vi.fn().mockResolvedValue(undefined) },
      configurable: true,
    })
    renderZh(<DetailPanel insect={ladybird} onCompare={vi.fn()} onDiscover={vi.fn()} />)
    fireEvent.click(screen.getByText('复制本页链接'))
    expect(trackMock).toHaveBeenCalledWith(EVENTS.SHARE_CLICK, { method: 'copy' })
  })

  it('有系统分享面板时走系统面板，method: system', () => {
    Object.defineProperty(navigator, 'share', {
      value: vi.fn().mockResolvedValue(undefined),
      configurable: true,
    })
    renderZh(<DetailPanel insect={ladybird} onCompare={vi.fn()} onDiscover={vi.fn()} />)
    fireEvent.click(screen.getByText('分享这只虫'))
    expect(trackMock).toHaveBeenCalledWith(EVENTS.SHARE_CLICK, { method: 'system' })
  })
})
