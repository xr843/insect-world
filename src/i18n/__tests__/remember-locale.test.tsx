/**
 * @vitest-environment jsdom
 *
 * 「明确选过的语言」必须被记住 —— 站内**每一处**切语言的入口都要种下
 * 边缘分流读的那个 cookie。
 *
 * 这条测试的由来是一个跨任务交界的 bug：边缘分流与埋点是两路并行做的，
 * 各自任务内都对 —— 分流那边给提示条加了写 cookie，埋点那边给顶栏加了上报，
 * 而**顶栏这个主入口没人给它加写 cookie**。合流时才露出来。
 *
 * 症状为什么难发现：漏掉 cookie 不影响当次跳转（跳转是 `<a href>` 干的），
 * 用户点完立刻就看到目标语言，一切正常；只有等他下次重新落地 `/`，才会被
 * 边缘按浏览器语言弹回去 —— 表现成「我明明选过中文，它怎么又变英文了」，
 * 而那次点击当时看起来完全没问题。
 *
 * 所以这里按**行为**验（点了之后 cookie 在不在），不按源码扫描验。
 */
import { cleanup, fireEvent, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { renderZh } from '../testing'
import { TopBar } from '../../components/TopBar'
import { LanguageHint } from '../LanguageHint'
import { INSECTS } from '../../data/insects.zh'
import { LOCALE_COOKIE_NAME } from '../edgeLocale'

function clearCookie() {
  document.cookie = `${LOCALE_COOKIE_NAME}=; path=/; max-age=0`
}

beforeEach(clearCookie)
afterEach(() => {
  cleanup()
  clearCookie()
})

/** cookie 串里当前记着的语言（没有就是 null） */
function storedLocale(): string | null {
  return document.cookie.match(new RegExp(`(?:^|;\\s*)${LOCALE_COOKIE_NAME}=([^;]*)`))?.[1] ?? null
}

describe('顶栏的中 / EN 切换', () => {
  function mountTopBar() {
    renderZh(
      <TopBar
        insects={INSECTS}
        activeId={INSECTS[0].id}
        onPick={vi.fn()}
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
      />,
    )
  }

  it('点 EN 会记下 en —— 这就是当初漏掉的那处', () => {
    mountTopBar()
    expect(storedLocale()).toBeNull()
    fireEvent.click(screen.getByText('EN'))
    expect(storedLocale()).toBe('en')
  })

  it('点当前语言不记 —— 那个 <a> 没有 href，本来就不会跳转', () => {
    mountTopBar()
    fireEvent.click(screen.getByText('中'))
    expect(storedLocale()).toBeNull()
  })
})

describe('语言提示条的切换链接', () => {
  it('点「查看中文版 / View in English」会记下目标语言', () => {
    // 中文页 + 非中文浏览器语言，提示条才会出现
    vi.spyOn(navigator, 'language', 'get').mockReturnValue('en-US')
    renderZh(<LanguageHint speciesId={INSECTS[0].id} />)
    fireEvent.click(screen.getByText(/View in English/))
    expect(storedLocale()).toBe('en')
  })
})
