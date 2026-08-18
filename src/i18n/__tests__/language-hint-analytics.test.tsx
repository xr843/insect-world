/**
 * @vitest-environment jsdom
 *
 * 语言提示条的 CTA 链接也是一处真实的「切语言」入口（顶栏的切换钮是
 * 另一处，已在 topbar-analytics.test.tsx 里测过），点它同样要报
 * language_switch。
 */
import { cleanup, fireEvent, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { renderZh } from '../testing'
import { LanguageHint } from '../LanguageHint'

vi.mock('../../analytics', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../analytics')>()
  return { ...actual, track: vi.fn() }
})

import { EVENTS, track } from '../../analytics'

const trackMock = vi.mocked(track)

const originalLanguage = Object.getOwnPropertyDescriptor(window.navigator, 'language')

afterEach(() => {
  cleanup()
  trackMock.mockClear()
  localStorage.clear()
  if (originalLanguage) Object.defineProperty(window.navigator, 'language', originalLanguage)
})

describe('语言提示条 CTA —— language_switch(to)', () => {
  it('中文页遇到非中文浏览器时出现提示，点「View in English」上报 to: en', () => {
    Object.defineProperty(window.navigator, 'language', { value: 'en-US', configurable: true })
    renderZh(<LanguageHint speciesId="ladybird" />)
    fireEvent.click(screen.getByText(/View in English/))
    expect(trackMock).toHaveBeenCalledWith(EVENTS.LANGUAGE_SWITCH, { to: 'en', from: 'hint' })
  })
})
