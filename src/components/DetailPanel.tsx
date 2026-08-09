import type { Insect } from '../data/types'
import type { DiscoveryKind } from './Discovery'
import { InsectGlyph } from './InsectGlyph'
import {
  FactIcon,
  IconArrowRight,
  IconGlobe,
  IconLeaf,
  IconPlay,
  IconQuiz,
  IconShare,
  IconSparkle,
} from './icons'
import s from './DetailPanel.module.css'

export function DetailPanel({
  insect,
  onCompare,
  onDiscover,
}: {
  insect: Insect
  onCompare: () => void
  onDiscover: (kind: DiscoveryKind) => void
}) {
  return (
    <aside className={`card stage-height ${s.panel} detail-panel`} key={insect.id}>
      <div className={s.eyebrow}>
        <IconLeaf size={12} />
        本期标本
      </div>

      <div className={s.titleRow}>
        <h1 className={s.title}>{insect.name}</h1>
        <span
          className={s.portrait}
          style={{
            background: `radial-gradient(circle at 34% 26%, ${insect.accent}33, ${insect.accent}14 58%, var(--glyph-base) 100%)`,
          }}
        >
          <InsectGlyph id={insect.id} size={42} color={insect.accent} />
        </span>
      </div>

      <div className={s.epithet}>{insect.epithet}</div>
      <p className={s.summary}>{insect.summary}</p>

      <div className={s.rule} />
      <div className="eyebrow">关键数据</div>

      <div className={s.factList}>
        {insect.facts.map((f) => (
          <div className={s.fact} key={f.key}>
            <span className={s.factIcon}>
              <FactIcon kind={f.icon} size={13} />
            </span>
            <span className={s.factKey}>{f.key}</span>
            <span className={s.factValue}>{f.value}</span>
          </div>
        ))}
      </div>

      <div className={s.aside}>
        <span className={s.asideIcon}>
          <IconGlobe size={13} />
        </span>
        <span className={s.asideBody}>
          <div className={s.asideTitle}>生态角色</div>
          <div className={s.asideText}>{insect.ecology}</div>
        </span>
      </div>

      <div className={s.aside}>
        <span className={s.asideIcon} style={{ color: 'var(--lavender)' }}>
          <IconSparkle size={13} />
        </span>
        <span className={s.asideBody}>
          <div className={s.asideTitle}>你知道吗</div>
          <div className={s.asideText}>{insect.trivia}</div>
        </span>
      </div>

      <div className={s.cycle}>
        {insect.lifecycle.map((step, i) => (
          <span key={step} style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
            <span className={s.cycleStep}>{step}</span>
            {i < insect.lifecycle.length - 1 && <span className={s.cycleArrow}>→</span>}
          </span>
        ))}
      </div>

      <div className={s.actions}>
        <button className={s.primary} onClick={() => onDiscover('lesson')}>
          读它的图鉴详解
          <IconArrowRight size={15} />
        </button>
        <div className={s.pairRow}>
          <button className={s.ghost} onClick={() => onDiscover('motion')}>
            <IconPlay size={13} />
            动态演示
          </button>
          <button className={s.ghost} onClick={() => onDiscover('quiz')}>
            <IconQuiz size={13} />
            小测
          </button>
        </div>
        <button className={`${s.ghost} ${s.wide}`} onClick={onCompare}>
          <IconShare size={13} />
          与其他昆虫对比
        </button>
      </div>

      <div className={s.meta}>
        <div className={s.metaRow}>
          <span className={s.metaKey}>分布</span>
          <span className={s.metaValue}>{insect.range}</span>
        </div>
        <div className={s.metaRow}>
          <span className={s.metaKey}>现状</span>
          <span className={s.metaValue}>{insect.status}</span>
        </div>
        <div className={s.metaRow}>
          <span className={s.metaKey}>近缘</span>
          <span className={s.metaValue}>{insect.relatives.join(' · ')}</span>
        </div>
      </div>
    </aside>
  )
}
