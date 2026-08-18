/**
 * 底部扩展卡
 *
 * 参考站这一排卡片用的是水彩插图。这里没有图片资产，改为
 * 用数据本身生成图形：小眼面网格、体长对比条、生活史流程、
 * 观察要点、栖息地剖面。信息量比装饰性插图更高。
 */
import { useMemo } from 'react'
import type { Insect } from '../data/types'
import type { DiscoveryKind } from './Discovery'
import { builtStagesOf } from '../three/stages'
import {
  IconArrowRight,
  IconDocument,
  IconGrid,
  IconLeaf,
  IconMicroscope,
  IconPlay,
  IconShare,
  IconSparkle,
} from './icons'
import s from './BottomCards.module.css'
import { useLabels, useT } from '../i18n/useT'
import type { OrderKey } from '../data/types'
import { lengthOf } from '../data/length'

const TONE = ['var(--coral)', 'var(--lavender)', 'var(--sage)', 'var(--amber)'] as const

/** 复眼小眼面：蜂窝密排的小圆，用两层渐变做出球面隆起感 */
function FacetDisc({ color }: { color: string }) {
  const dots = useMemo(() => {
    const out: { cx: number; cy: number; r: number }[] = []
    const step = 9
    for (let row = 0; row * (step * 0.87) < 112; row++) {
      const y = row * step * 0.87
      const offset = row % 2 ? step / 2 : 0
      for (let col = 0; col * step + offset < 116; col++) {
        const x = col * step + offset
        const dx = x - 53
        const dy = y - 53
        const d = Math.sqrt(dx * dx + dy * dy)
        if (d > 54) continue
        // 边缘的小眼面因球面透视而变小
        out.push({ cx: x, cy: y, r: step * 0.44 * (1 - Math.pow(d / 62, 2) * 0.45) })
      }
    }
    return out
  }, [])

  return (
    <div className={s.facetDisc}>
      <svg viewBox="0 0 106 106" width="100%" height="100%">
        <defs>
          <radialGradient id="facetBg" cx="34%" cy="28%">
            <stop offset="0%" stopColor={color} stopOpacity="0.95" />
            <stop offset="55%" stopColor={color} stopOpacity="0.62" />
            <stop offset="100%" stopColor="#2b2320" stopOpacity="0.86" />
          </radialGradient>
          <radialGradient id="facetGloss" cx="30%" cy="24%">
            <stop offset="0%" stopColor="#fff" stopOpacity="0.62" />
            <stop offset="42%" stopColor="#fff" stopOpacity="0" />
          </radialGradient>
        </defs>
        <rect width="106" height="106" fill="url(#facetBg)" />
        <g fill="none" stroke="#1a1412" strokeOpacity="0.34" strokeWidth="0.9">
          {dots.map((d, i) => (
            <circle key={i} cx={d.cx} cy={d.cy} r={Math.max(d.r, 0.6)} />
          ))}
        </g>
        <rect width="106" height="106" fill="url(#facetGloss)" />
      </svg>
    </div>
  )
}

/** 栖息地剖面：地平线 + 植被剪影，按物种主题色调色 */
function HabitatFigure({ color, order }: { color: string; order: OrderKey }) {
  /** 蜻蜓与半翅多在水边、树冠层活动，剪影换成高植被 */
  const canopy = order === 'odonata' || order === 'hemiptera'
  return (
    <div className={s.habitat}>
      <svg viewBox="0 0 220 108" width="100%" height="100%" preserveAspectRatio="xMidYMid slice">
        <defs>
          <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" style={{ stopColor: 'var(--sky-a)' }} />
            <stop offset="100%" style={{ stopColor: 'var(--sky-b)' }} />
          </linearGradient>
        </defs>
        <rect width="220" height="108" fill="url(#sky)" />
        {/* 远山/远树轮廓 */}
        <path d="M0 74 Q34 52 62 70 Q92 46 122 68 Q154 44 186 66 Q206 54 220 64 V108 H0Z" fill={color} opacity="0.16" />
        {/* 中景灌丛 */}
        <path d="M0 88 Q30 70 58 86 Q86 68 116 84 Q148 66 178 84 Q202 72 220 82 V108 H0Z" fill={color} opacity="0.3" />
        {/* 前景地面 */}
        <path d="M0 98 Q56 90 110 97 Q166 104 220 96 V108 H0Z" fill={color} opacity="0.52" />
        {canopy ? (
          // 水边/树冠：几根挺水植物
          <g stroke={color} strokeOpacity="0.62" strokeWidth="2" strokeLinecap="round" fill="none">
            <path d="M32 96 C30 78 34 66 38 56" />
            <path d="M44 97 C43 82 47 72 52 63" />
            <path d="M182 96 C184 80 180 70 175 60" />
          </g>
        ) : (
          // 林地：几株草叶
          <g fill={color} fillOpacity="0.55">
            <path d="M28 97 C24 84 30 76 36 70 C33 80 32 88 33 97Z" />
            <path d="M186 96 C192 84 187 76 181 70 C184 80 185 88 184 96Z" />
          </g>
        )}
      </svg>
    </div>
  )
}

export function BottomCards({
  insect,
  peers,
  onCompare,
  onDiscover,
  onExplore,
}: {
  insect: Insect
  peers: Insect[]
  onCompare: () => void
  onDiscover: (kind: DiscoveryKind) => void
  /** 引言卡的「继续观察」—— 它带着箭头，就必须真的能点 */
  onExplore: () => void
}) {
  const t = useT()
  /** 这一种有没有做阶段模型 —— 决定「生活史」那张卡片点开是立体标本还是文本 */
  const hasStages = builtStagesOf(insect.id).length > 0
  const labels = useLabels()

  // 体长对比：当前物种 + 三个体型差异明显的同伴，按长度排序
  const bars = useMemo(() => {
    const self = lengthOf(insect)
    if (self == null) return []
    const others = peers
      .filter((p) => p.id !== insect.id)
      .map((p) => ({ insect: p, mm: lengthOf(p) }))
      .filter((x): x is { insect: Insect; mm: number } => x.mm != null)
      .sort((a, b) => Math.abs(Math.log(b.mm / self)) - Math.abs(Math.log(a.mm / self)))
      .slice(0, 3)
    const all = [{ insect, mm: self }, ...others].sort((a, b) => b.mm - a.mm)
    const max = Math.max(...all.map((x) => x.mm))
    return all.map((x) => ({ ...x, pct: (x.mm / max) * 100 }))
  }, [insect, peers])

  const notes = useMemo(
    () => [
      t('cards.note.metamorphosis', {
        type: labels.metamorphosis[insect.metamorphosis],
        n: insect.lifecycle.length,
      }),
      insect.hotspots[0]
        ? t('cards.note.watch', { part: insect.hotspots[0].label, note: insect.hotspots[0].note })
        : '',
      t('cards.note.range', { range: insect.range }),
      insect.status,
      insect.hotspots[1] ? t('cards.note.idKey', { part: insect.hotspots[1].label }) : '',
    ].filter(Boolean),
    [insect, t, labels],
  )

  return (
    <div className={s.row}>
      <div className={`card ${s.quote}`}>
        <IconSparkle size={18} className={s.quoteMark} />
        <div className={s.quoteText}>
          {t('cards.quote.line1')}
          <br />
          {t('cards.quote.line2')}
        </div>
        <button className={s.quoteLink} onClick={onExplore}>
          {t('cards.quote.cta')}
        </button>
      </div>

      <article className={`card ${s.card}`}>
        <div className={s.head}>
          <div>
            <div className={s.kicker}>{t('cards.micro.kicker')}</div>
            <div className={s.subject}>{t('cards.micro.subject')}</div>
          </div>
          <IconMicroscope size={15} className={s.headIcon} />
        </div>
        <div className={s.figure}>
          <FacetDisc color={insect.accent} />
        </div>
        <button className={s.foot} onClick={() => onDiscover('lesson')}>
          {t('cards.micro.foot')}
          <IconArrowRight size={13} />
        </button>
      </article>

      <article className={`card ${s.card}`}>
        <div className={s.head}>
          <div>
            <div className={s.kicker}>{t('cards.size.kicker')}</div>
            <div className={s.subject}>{t('cards.size.subject')}</div>
          </div>
          <IconGrid size={15} className={s.headIcon} />
        </div>
        <div className={s.figure}>
          {bars.length > 0 ? (
            <div className={s.bars}>
              {bars.map((b) => (
                <div className={s.bar} key={b.insect.id}>
                  <span className={s.barName} style={b.insect.id === insect.id ? { color: 'var(--ink)' } : undefined}>
                    {b.insect.name}
                  </span>
                  <span className={s.barTrack}>
                    <span
                      className={s.barFill}
                      style={{
                        width: `${b.pct}%`,
                        background: b.insect.id === insect.id ? insect.accent : '#b08d5733',
                      }}
                    />
                  </span>
                  <span className={s.barVal}>{b.mm >= 10 ? `${(b.mm / 10).toFixed(1)} cm` : `${b.mm} mm`}</span>
                </div>
              ))}
            </div>
          ) : (
            <span style={{ fontSize: 11, color: 'var(--muted)' }}>{t('cards.size.empty')}</span>
          )}
        </div>
        <button className={s.foot} onClick={onCompare}>
          {t('cards.size.foot')}
          <IconArrowRight size={13} />
        </button>
      </article>

      <article className={`card ${s.card}`}>
        <div className={s.head}>
          <div>
            <div className={s.kicker}>{t('cards.lifecycle.kicker')}</div>
            <div className={s.subject}>{labels.metamorphosis[insect.metamorphosis]}</div>
          </div>
          <IconPlay size={15} className={s.headIcon} />
        </div>
        <div className={s.figure}>
          <div className={s.cycleFig}>
            {insect.lifecycle.map((step, i) => (
              <div className={s.cycleItem} key={step}>
                <span className={s.cycleDot} style={{ background: TONE[i % TONE.length] }}>
                  {i + 1}
                </span>
                <span className={s.cycleLabel}>{step}</span>
              </div>
            ))}
          </div>
        </div>
        {/*
          有阶段模型的物种走「生活史」那支 —— 弹窗逐步翻，展台跟着换成
          卵/幼虫/蛹的立体标本。没有阶段模型的仍退回原来的动态演示文本，
          不给用户一个点开只有字的「生活史」。判定直接问注册表
          （`builtStagesOf`），不另设名单：名单与文件两处都能改，迟早对不上。
        */}
        <button
          className={s.foot}
          onClick={() => onDiscover(hasStages ? 'lifecycle' : 'motion')}
        >
          {t('cards.lifecycle.foot')}
          <IconArrowRight size={13} />
        </button>
      </article>

      <article className={`card ${s.card}`}>
        <div className={s.head}>
          <div>
            <div className={s.kicker}>{t('cards.notes.kicker')}</div>
            <div className={s.subject}>{t('cards.notes.subject')}</div>
          </div>
          <IconDocument size={15} className={s.headIcon} />
        </div>
        <div className={s.figure}>
          <div className={s.notes}>
            {notes.map((n) => (
              <div className={s.noteItem} key={n}>
                <span className={s.noteBullet}>◆</span>
                {n}
              </div>
            ))}
          </div>
        </div>
        <button className={s.foot} onClick={() => onDiscover('lesson')}>
          {t('cards.notes.foot')}
          <IconArrowRight size={13} />
        </button>
      </article>

      <article className={`card ${s.card}`}>
        <div className={s.head}>
          <div>
            <div className={s.kicker}>{t('cards.habitat.kicker')}</div>
            <div className={s.subject}>{t('cards.habitat.subject', { order: labels.order[insect.order] })}</div>
          </div>
          <IconLeaf size={15} className={s.headIcon} />
        </div>
        <div className={s.figure}>
          <HabitatFigure color={insect.accent} order={insect.order} />
        </div>
        <button className={s.foot} onClick={() => onDiscover('habitat')}>
          {t('cards.habitat.foot')}
          <IconShare size={13} />
        </button>
      </article>
    </div>
  )
}
