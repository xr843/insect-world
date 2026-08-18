/**
 * @vitest-environment jsdom
 *
 * 图鉴库总览点一个物种 —— species_switch(source: gallery)。
 */
import { cleanup, fireEvent } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { renderZh } from '../../i18n/testing'
import { Gallery } from '../Gallery'
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

describe('图鉴库点一张卡片 —— species_switch(source: gallery)', () => {
  it('点某个物种：既调用 onSelect 与 onClose，也带物种 id 与目上报', () => {
    const onSelect = vi.fn()
    const onClose = vi.fn()
    const target = INSECTS.find((i) => i.id === 'ladybird')!
    const { container } = renderZh(
      <Gallery insects={INSECTS} activeId={INSECTS[0].id} onSelect={onSelect} onClose={onClose} />,
    )
    const btn = Array.from(container.querySelectorAll('button')).find((b) =>
      b.textContent?.includes(target.name),
    )
    expect(btn, `没找到「${target.name}」这张卡`).toBeTruthy()
    fireEvent.click(btn!)

    expect(onSelect).toHaveBeenCalledWith('ladybird')
    expect(onClose).toHaveBeenCalledTimes(1)
    expect(trackMock).toHaveBeenCalledWith(EVENTS.SPECIES_SWITCH, {
      source: 'gallery',
      species_id: 'ladybird',
      order: target.order,
    })
  })
})
