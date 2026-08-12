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
        {/*
          实物照片：本项目的模型是程序生成的，写实度有上限，想看真长什么样得去看照片。
          不内置图片而是外链 —— 昆虫照片都有版权，60 张 CC 图要逐张署名、核对协议，
          做漏一张就是侵权；而学名恰好是本图鉴唯一可靠的字段（AI 文案未经核校，
          README 里写明了），正好拿它去指向真实观察记录。
          taxon id 在构建期解析并校验过，见 data/external.ts；查不到的物种不渲染此行。
        */}
        {photoUrl(insect.id) && (
          <div className={s.metaRow}>
            <span className={s.metaKey}>{t('detail.photos')}</span>
            <span className={s.metaValue}>
              <a
                className={s.metaLink}
                href={photoUrl(insect.id) as string}
                target="_blank"
                rel="noopener noreferrer"
              >
                {t('detail.photosLink')}
                <IconArrowRight size={11} />
              </a>
            </span>
          </div>
        )}
      </div>
    </aside>
  )
}
