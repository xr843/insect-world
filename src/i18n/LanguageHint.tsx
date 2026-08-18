import { useEffect, useState } from 'react'
import { hrefForLocale } from './hrefForLocale'
import { rememberLocaleChoice } from './rememberLocale'
import { useLocale } from './useT'
import s from './LanguageHint.module.css'
import { EVENTS, track } from '../analytics'

const DISMISS_KEY = 'iw-lang-hint-dismissed'

/** 两侧文案都写死在这里，因为它天然是「用对方的语言说给对方听」 */
const HINT = {
  /** 中文页上给非中文访客看的 */
  zh: { text: 'This field guide is also available in English.', cta: 'View in English →' },
  /** 英文页上给中文访客看的 */
  en: { text: '本站也有中文版。', cta: '查看中文版 →' },
} as const

/**
 * 语言提示条：浏览器语言与当前页语言不一致时，顶部出一条可关闭的横幅。
 *
 * **这个组件本身只提示，不跳转。** 自动跳转有两个实际害处：Google 爬虫多报
 * en-US，会跟着被带到英文版，影响中文版收录；分享出去的链接落地行为也变得
 * 不可预测 —— 同一个地址，不同人打开看到不同语言。
 *
 * 真正的自动跳转在别处：`functions/index.ts` 这个 Cloudflare Pages Function
 * 在边缘按 Accept-Language 把根路径 `/` 的非中文访客送去 `/en/`，且专门排除了
 * 爬虫（判定见 `edgeLocale.ts` 的 `isKnownBot`）—— 上面这条"害处"因此不成立。
 * 两层各管各的：边缘管"首次落地进哪个语言"，这条 hint 管"已经进错语言的人
 * 怎么补救"（例如从物种深链 `/s/<id>/` 进来，边缘不碰深链）。
 *
 * 关掉之后记在 localStorage，不再打扰；点了下面的切换链接则额外记一个
 * cookie（见 `rememberLocaleChoice`），供边缘那层尊重这个明确选择。
 */
export function LanguageHint({ speciesId }: { speciesId: string }) {
  const locale = useLocale()
  const [show, setShow] = useState(false)

  useEffect(() => {
    if (localStorage.getItem(DISMISS_KEY) === '1') return
    const prefersZh = navigator.language?.toLowerCase().startsWith('zh') ?? false
    // 中文页遇到非中文浏览器，或英文页遇到中文浏览器，才提示
    setShow(locale === 'zh' ? !prefersZh : prefersZh)
  }, [locale])

  if (!show) return null

  const copy = HINT[locale]
  const other = locale === 'zh' ? 'en' : 'zh'

  return (
    <div className={s.bar} role="note">
      <span className={s.text} lang={locale === 'zh' ? 'en' : 'zh-Hans'}>
        {copy.text}
      </span>
      <a
        className={s.cta}
        href={hrefForLocale(other, speciesId)}
        lang={locale === 'zh' ? 'en' : 'zh-Hans'}
        onClick={() => {
          // 顺序有讲究：先记住明确选择（功能性的，边缘分流靠它），再上报。
          // track() 自己吞异常，但没必要让锦上添花的那一步排在前面。
          rememberLocaleChoice(other)
          track(EVENTS.LANGUAGE_SWITCH, { to: other, from: 'hint' })
        }}
      >
        {copy.cta}
      </a>
      <button
        className={s.close}
        onClick={() => {
          localStorage.setItem(DISMISS_KEY, '1')
          setShow(false)
        }}
        aria-label={locale === 'zh' ? 'Dismiss' : '关闭'}
      >
        ×
      </button>
    </div>
  )
}
