import { useEffect, useState } from 'react'
import { hrefForLocale } from './hrefForLocale'
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
 * **只提示，不跳转。** 自动跳转有两个实际害处：Google 爬虫多报 en-US，
 * 会跟着被带到英文版，影响中文版收录；分享出去的链接落地行为也变得
 * 不可预测 —— 同一个地址，不同人打开看到不同语言。
 *
 * 关掉之后记在 localStorage，不再打扰。
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
        onClick={() => track(EVENTS.LANGUAGE_SWITCH, { to: other })}
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
