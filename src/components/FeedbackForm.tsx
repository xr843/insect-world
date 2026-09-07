import { useState } from 'react'
import s from './FeedbackForm.module.css'
import { useLocale, useT } from '../i18n/useT'
import { useFeedbackSubmit, type SubmitResult } from '../hooks/useWall'
import { BODY_MAX, BODY_MIN, codePointLength } from '../feedback/rules'
import type { FeedbackKind } from '../feedback/types'

/**
 * 反馈表单 —— 纠错与「我也想看…」共用这一个。
 *
 * 两处的差别只有三样：kind、占位文案、要不要带物种上下文。抽成参数而不是
 * 两个组件，是因为它们的状态机（草稿 / 发送中 / 成功 / 四种失败）完全一样，
 * 复制一份就意味着日后改提示文案要改两处、且必然漏一处。
 */

/** 字数计数器从还剩多少字开始显示。太早显示会让人觉得被盯着写。 */
const COUNTER_FROM = BODY_MAX - 80

type Status = 'idle' | 'sending' | 'done' | SubmitResult

export function FeedbackForm({
  kind,
  species = null,
  part = null,
  contextLabel,
  placeholder,
  autoFocus = false,
  onSent,
}: {
  kind: FeedbackKind
  species?: string | null
  part?: string | null
  /** 「关于 玉带凤蝶 · 后翅」这类上下文提示，纠错时显示 */
  contextLabel?: string
  placeholder: string
  autoFocus?: boolean
  /** 提交成功后的回调（例如让对话框自己关掉）。不传就停在致谢态。 */
  onSent?: () => void
}) {
  const t = useT()
  const locale = useLocale()
  const send = useFeedbackSubmit(locale)

  const [body, setBody] = useState('')
  const [email, setEmail] = useState('')
  /** 蜜罐。真人看不见也 tab 不到，非空即机器人 —— 服务端据此静默丢弃 */
  const [website, setWebsite] = useState('')
  const [status, setStatus] = useState<Status>('idle')

  const len = codePointLength(body.trim())
  const tooShort = len < BODY_MIN
  const tooLong = len > BODY_MAX
  const busy = status === 'sending'

  const submit = async () => {
    if (tooShort || tooLong || busy) return
    setStatus('sending')
    const result = await send({ kind, species, part, body, email: email.trim() || null, website })
    if (result === 'ok') {
      setStatus('done')
      setBody('')
      setEmail('')
      onSent?.()
      return
    }
    setStatus(result)
  }

  if (status === 'done') {
    return (
      <div className={s.thanks}>
        <span className={s.thanksText}>{t('feedback.thanks')}</span>
        <button className={s.again} onClick={() => setStatus('idle')}>
          {t('feedback.thanksAgain')}
        </button>
      </div>
    )
  }

  const error =
    status === 'rate'
      ? t('feedback.err.rate')
      : status === 'invalid'
        ? t('feedback.err.invalid')
        : status === 'net'
          ? t('feedback.err.net')
          : null

  return (
    <div className={s.form}>
      {contextLabel && <div className={s.context}>{contextLabel}</div>}

      <textarea
        className={s.textarea}
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={3}
        placeholder={placeholder}
        autoFocus={autoFocus}
        disabled={busy}
        // Ctrl/⌘+Enter 提交 —— 写完一句话就想发出去的人不必去够按钮
        onKeyDown={(e) => {
          if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) void submit()
        }}
      />

      {/*
        蜜罐。用绝对定位挪出视野而不是 display:none / hidden：越来越多的爬虫
        会跳过明显被隐藏的字段，但很少有爬虫去算元素的最终位置。
        aria-hidden + tabIndex=-1 保证读屏软件与键盘用户都碰不到它。
      */}
      <input
        className={s.honeypot}
        type="text"
        name="website"
        value={website}
        onChange={(e) => setWebsite(e.target.value)}
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
      />

      <input
        className={s.email}
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder={t('feedback.emailPlaceholder')}
        aria-label={t('feedback.email')}
        disabled={busy}
        autoComplete="email"
      />

      <div className={s.foot}>
        <span className={s.hint}>
          {len >= COUNTER_FROM ? `${len} / ${BODY_MAX}` : t('feedback.privacy')}
        </span>
        <button className={s.submit} onClick={() => void submit()} disabled={tooShort || tooLong || busy}>
          {busy ? t('feedback.sending') : t('feedback.submit')}
        </button>
      </div>

      {/* role=status：提交失败要让读屏软件也听见，而不只是视觉上多一行红字 */}
      {error && (
        <div className={s.error} role="status">
          {error}
        </div>
      )}
      {/*
        邮箱说明只在真的动了邮箱框时才出现。两行小字常驻会让这个本来只有
        「写一句话」这一件事的表单看起来像一份要读条款的问卷（真机上看出来的）。
        没填邮箱的人不需要知道邮箱怎么用。
      */}
      {!error && email.trim() !== '' && <div className={s.emailHint}>{t('feedback.emailHint')}</div>}
    </div>
  )
}
