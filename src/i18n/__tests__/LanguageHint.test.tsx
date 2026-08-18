/**
 * @vitest-environment jsdom
 *
 * LanguageHint 的跳转链接要在点击时种下语言选择 cookie，供边缘那层
 * （functions/index.ts）在下一次落地根路径时尊重这个明确选择 ——
 * 这是「不能把人锁死」这条要求的前端一侧，回归了就是用户点了「看中文」
 * 之后再回首页又被弹去英文，体验上等于选择没生效。
 */
import { cleanup, fireEvent, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { LanguageHint } from '../LanguageHint'
import { LOCALE_COOKIE_NAME } from '../edgeLocale'
import { renderEn, renderZh } from '../testing'

function clearLocaleCookie() {
  document.cookie = `${LOCALE_COOKIE_NAME}=; path=/; max-age=0`
}

afterEach(() => {
  cleanup()
  localStorage.clear()
  clearLocaleCookie()
  delete (navigator as unknown as { language?: string }).language
})

function stubBrowserLanguage(tag: string) {
  Object.defineProperty(navigator, 'language', { value: tag, configurable: true })
}

describe('中文页遇到非中文浏览器：提示条出现，点击后写 cookie=en', () => {
  it('点「View in English」种下 iw-locale=en', () => {
    stubBrowserLanguage('en-US')
    renderZh(<LanguageHint speciesId="ladybird" />)

    const link = screen.getByText('View in English →')
    expect(document.cookie).not.toContain(`${LOCALE_COOKIE_NAME}=`)

    fireEvent.click(link)

    expect(document.cookie).toContain(`${LOCALE_COOKIE_NAME}=en`)
  })
})

describe('英文页遇到中文浏览器：提示条出现，点击后写 cookie=zh', () => {
  it('点「查看中文版」种下 iw-locale=zh', () => {
    stubBrowserLanguage('zh-CN')
    renderEn(<LanguageHint speciesId="ladybird" />)

    const link = screen.getByText('查看中文版 →')
    fireEvent.click(link)

    expect(document.cookie).toContain(`${LOCALE_COOKIE_NAME}=zh`)
  })
})

describe('关闭按钮不该写语言 cookie —— 关闭只是不想看，不是选了别的语言', () => {
  it('点 × 只记 dismiss，不碰 iw-locale', () => {
    stubBrowserLanguage('en-US')
    renderZh(<LanguageHint speciesId="ladybird" />)

    fireEvent.click(screen.getByLabelText('Dismiss'))

    expect(document.cookie).not.toContain(`${LOCALE_COOKIE_NAME}=`)
  })
})

describe('浏览器语言与当前页一致：提示条不出现', () => {
  it('中文页 + 中文浏览器，不渲染提示条', () => {
    stubBrowserLanguage('zh-CN')
    renderZh(<LanguageHint speciesId="ladybird" />)

    expect(screen.queryByRole('note')).toBeNull()
  })
})
