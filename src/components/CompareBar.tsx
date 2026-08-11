import type { Insect } from '../data/types'
import { InsectGlyph } from './InsectGlyph'
import { IconReset } from './icons'
import s from './CompareBar.module.css'
import { useLabels, useT } from '../i18n/useT'

/** 取某条 fact 的值，找不到就退到别的字段，保证对比条不出现空栏 */
function factOf(insect: Insect, icon: string, fallback: string): string {
  return insect.facts.find((f) => f.icon === icon)?.value ?? fallback
}

export function CompareBar({
  left,
  right,
  onCycle,
  onClose,
}: {
  left: Insect
  right: Insect
  onCycle: () => void
  onClose: () => void
}) {
  const t = useT()
  const labels = useLabels()
  return (
    <div className={s.bar}>
      <div className={s.side}>
        <span
          className={s.thumb}
          style={{ background: `radial-gradient(circle at 34% 26%, ${left.accent}33, var(--glyph-base) 100%)` }}
        >
          <InsectGlyph id={left.id} size={22} color={left.accent} />
        </span>
        <span style={{ minWidth: 0 }}>
          <div className={s.eyebrow}>{t('compare.current')}</div>
          <div className={s.name}>{left.name}</div>
          <div className={s.order}>{labels.order[left.order]}</div>
        </span>
      </div>

      <span className={s.vs}>vs.</span>

      <div className={s.side}>
        <span
          className={s.thumb}
          style={{ background: `radial-gradient(circle at 34% 26%, ${right.accent}33, var(--glyph-base) 100%)` }}
        >
          <InsectGlyph id={right.id} size={22} color={right.accent} />
        </span>
        <span style={{ minWidth: 0 }}>
          <div className={s.eyebrow}>{t('compare.comparison')}</div>
          <div className={s.name}>{right.name}</div>
          <div className={s.order}>{labels.order[right.order]}</div>
        </span>
      </div>

      <div className={s.fields}>
        <div className={s.field}>
          <div className={s.fieldKey}>{t('compare.length')}</div>
          <div className={s.fieldVal}>{factOf(left, 'size', '—')}</div>
          <div className={s.fieldVal}>{factOf(right, 'size', '—')}</div>
        </div>
        <div className={s.field}>
          <div className={s.fieldKey}>{t('compare.metamorphosis')}</div>
          <div className={s.fieldVal}>{labels.metamorphosis[left.metamorphosis]}</div>
          <div className={s.fieldVal}>{labels.metamorphosis[right.metamorphosis]}</div>
        </div>
        <div className={s.field}>
          <div className={s.fieldKey}>{t('compare.diet')}</div>
          <div className={s.fieldVal}>{factOf(left, 'food', '—')}</div>
          <div className={s.fieldVal}>{factOf(right, 'food', '—')}</div>
        </div>
      </div>

      <div className={s.tools}>
        <button className={s.cycle} onClick={onCycle} title={t('compare.switchTitle')}>
          <IconReset size={14} />
        </button>
        <button className={s.close} onClick={onClose} aria-label={t('compare.closeLabel')}>
          ×
        </button>
      </div>
    </div>
  )
}
