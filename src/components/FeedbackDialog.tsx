import { useEffect } from 'react'
import s from './FeedbackDialog.module.css'
import { useT } from '../i18n/useT'
import { FeedbackForm } from './FeedbackForm'
import { partOfAnchor } from '../data/parts'
import type { Insect } from '../data/types'

/**
 * 纠错对话框。
 *
 * 比点播墙小一号：它只有一件事要做，而且是从「正在看的这只虫」里长出来的，
 * 不该把人拽进一个跟当前物种无关的大浮层。
 *
 * ── 为什么一定要带上物种与部位 ───────────────────────────────────────
 * 「凤蝶的后翅画错了」能直接落到某个 builder 文件上；「你们网站有个地方
 * 不对」只能存档吃灰。这两样上下文前端本来就握在手里（当前物种 + 当前聚焦的
 * 标注点），让用户再打一遍是白白折损提交率。
 */
export function FeedbackDialog({
  insect,
  focusAnchor,
  onClose,
}: {
  insect: Insect
  /** 展台上当前聚焦的标注点，没有就是 null */
  focusAnchor: string | null
  onClose: () => void
}) {
  const t = useT()

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  // 标注点先归到部位组再落成文案：anchor 是内部键（'hindwing'），
  // 部位组才有中英两套现成的显示名
  const group = focusAnchor ? partOfAnchor(focusAnchor) : null
  const partLabel = group ? t(`stage.part.${group}` as 'stage.part.head') : null
  const context = t('feedback.correction.about', { name: insect.name })

  return (
    <div className={s.backdrop} onMouseDown={onClose}>
      <div className={`card ${s.sheet}`} onMouseDown={(e) => e.stopPropagation()}>
        <div className={s.head}>
          <div>
            <div className={s.title}>{t('feedback.correction.title')}</div>
            <div className={s.sub}>{t('feedback.correction.sub')}</div>
          </div>
          <button className={s.close} onClick={onClose} aria-label={t('common.close')}>
            ×
          </button>
        </div>

        <FeedbackForm
          kind="correction"
          species={insect.id}
          part={group}
          contextLabel={partLabel ? `${context} · ${partLabel}` : context}
          placeholder={t('feedback.correction.placeholder')}
          autoFocus
        />
      </div>
    </div>
  )
}
