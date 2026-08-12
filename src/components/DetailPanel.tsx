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
import { useT } from '../i18n/useT'
import { photoUrl } from '../data/external'

export function DetailPanel({
  insect,
  onCompare,
  onDiscover,
}: {
  insect: Insect
  onCompare: () => void
  onDiscover: (kind: DiscoveryKind) => void
}) {
  const t = useT()
  return (
    <aside className={`card stage-height ${s.panel} detail-panel`} key={insect.id}>
      <div className={s.eyebrow}>
        <IconLeaf size={12} />
        {t('detail.eyebrow')}
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
      <div className="eyebrow">{t('detail.facts')}</div>

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
          <div className={s.asideTitle}>{t('detail.ecology')}</div>
          <div className={s.asideText}>{insect.ecology}</div>
        </span>
      </div>

      <div className={s.aside}>
        <span className={s.asideIcon} style={{ color: 'var(--lavender)' }}>
          <IconSparkle size={13} />
        </span>
        <span className={s.asideBody}>
          <div className={s.asideTitle}>{t('detail.trivia')}</div>
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
          {t('detail.readGuide')}
          <IconArrowRight size={15} />
        </button>
        <div className={s.pairRow}>
          <button className={s.ghost} onClick={() => onDiscover('motion')}>
            <IconPlay size={13} />
            {t('detail.motionDemo')}
          </button>
          <button className={s.ghost} onClick={() => onDiscover('quiz')}>
            <IconQuiz size={13} />
            {t('detail.quiz')}
          </button>
        </div>
        <button className={`${s.ghost} ${s.wide}`} onClick={onCompare}>
          <IconShare size={13} />
          {t('detail.compareOthers')}
        </button>
        {/*
          实物照片放在按钮组而不是下面的 meta 区：那三行（分布/现状/近缘）是静态属性，
          这一条是**动作**，性质不同。而且本项目的模型是程序生成的、写实度有上限，
          「想看真长什么样」是真实需求（linux.do 佬友明确提过），埋在灰字里等于没有。
          用 --brass 与站内按钮区分，配外链箭头，让人点之前就知道会离开本站。
          没有对应 taxon 记录的物种不渲染此按钮，见 data/external.ts。
        */}
        {photoUrl(insect.id) && (
          <a
            className={`${s.ghost} ${s.wide} ${s.external}`}
            href={photoUrl(insect.id) as string}
            target="_blank"
            rel="noopener noreferrer"
          >
            <IconGlobe size={13} />
            {t('detail.photosLink')}
            <IconArrowRight size={12} />
          </a>
        )}
      </div>

      <div className={s.meta}>
        <div className={s.metaRow}>
          <span className={s.metaKey}>{t('detail.range')}</span>
          <span className={s.metaValue}>{insect.range}</span>
        </div>
        <div className={s.metaRow}>
          <span className={s.metaKey}>{t('detail.status')}</span>
          <span className={s.metaValue}>{insect.status}</span>
        </div>
        <div className={s.metaRow}>
          <span className={s.metaKey}>{t('detail.relatives')}</span>
          <span className={s.metaValue}>{insect.relatives.join(' · ')}</span>
        </div>
      </div>
    </aside>
  )
}
