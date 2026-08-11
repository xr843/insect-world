import type { Insect } from '../data/types'
import { InsectGlyph } from './InsectGlyph'
import { IconReset } from './icons'
import s from './CompareBar.module.css'
import { METAMORPHOSIS_LABEL } from '../i18n/orders'

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
          <div className={s.eyebrow}>当前</div>
          <div className={s.name}>{left.name}</div>
          <div className={s.order}>{left.order}</div>
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
          <div className={s.eyebrow}>对照</div>
          <div className={s.name}>{right.name}</div>
          <div className={s.order}>{right.order}</div>
        </span>
      </div>

      <div className={s.fields}>
        <div className={s.field}>
          <div className={s.fieldKey}>体长</div>
          <div className={s.fieldVal}>{factOf(left, 'size', '—')}</div>
          <div className={s.fieldVal}>{factOf(right, 'size', '—')}</div>
        </div>
        <div className={s.field}>
          <div className={s.fieldKey}>变态</div>
          <div className={s.fieldVal}>{METAMORPHOSIS_LABEL.zh[left.metamorphosis]}</div>
          <div className={s.fieldVal}>{METAMORPHOSIS_LABEL.zh[right.metamorphosis]}</div>
        </div>
        <div className={s.field}>
          <div className={s.fieldKey}>食性</div>
          <div className={s.fieldVal}>{factOf(left, 'food', '—')}</div>
          <div className={s.fieldVal}>{factOf(right, 'food', '—')}</div>
        </div>
      </div>

      <div className={s.tools}>
        <button className={s.cycle} onClick={onCycle} title="换一个对照物种">
          <IconReset size={14} />
        </button>
        <button className={s.close} onClick={onClose} aria-label="关闭对比">
          ×
        </button>
      </div>
    </div>
  )
}
