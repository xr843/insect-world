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

const TONE = ['#eb7c6b', '#8d6bcc', '#769d74', '#c8944a'] as const

/** 从「体长 30–55 毫米」这类描述里取出毫米数，取上限值 */
function parseLengthMm(text: string): number | null {
  const cm = /([\d.]+)\s*(?:[–\-~至])?\s*([\d.]+)?\s*厘米/.exec(text)
  const mm = /([\d.]+)\s*(?:[–\-~至])?\s*([\d.]+)?\s*(?:毫米|mm)/i.exec(text)
  const pick = (m: RegExpExecArray, scale: number) => {
    const hi = m[2] ? parseFloat(m[2]) : parseFloat(m[1])
    return Number.isFinite(hi) ? hi * scale : null
  }
  if (cm) return pick(cm, 10)
  if (mm) return pick(mm, 1)
  return null
}

function lengthOf(insect: Insect): number | null {
  const f = insect.facts.find((x) => x.icon === 'size')
  return f ? parseLengthMm(f.value) : null
}

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
function HabitatFigure({ color, order }: { color: string; order: string }) {
  const canopy = order === '蜻蜓目' || order === '半翅目'
  return (
    <div className={s.habitat}>
      <svg viewBox="0 0 220 108" width="100%" height="100%" preserveAspectRatio="xMidYMid slice">
        <defs>
          <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#fffdf8" />
            <stop offset="100%" stopColor="#f2e8da" />
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
}: {
  insect: Insect
  peers: Insect[]
  onCompare: () => void
  onDiscover: (kind: DiscoveryKind) => void
}) {
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
      `${insect.metamorphosis}，一生经历 ${insect.lifecycle.length} 个阶段`,
      insect.hotspots[0] ? `留意${insect.hotspots[0].label}：${insect.hotspots[0].note}` : '',
      `分布于${insect.range}`,
      insect.status,
      insect.hotspots[1] ? `${insect.hotspots[1].label}是识别要点` : '',
    ].filter(Boolean),
    [insect],
  )

  return (
    <div className={s.row}>
      <div className={`card ${s.quote}`}>
        <IconSparkle size={18} className={s.quoteMark} />
        <div className={s.quoteText}>
          看得越久，
          <br />
          看见得越多。
        </div>
        <div className={s.quoteLink}>继续观察 →</div>
      </div>

      <article className={`card ${s.card}`}>
        <div className={s.head}>
          <div>
            <div className={s.kicker}>显微视角</div>
            <div className={s.subject}>复眼的小眼面</div>
          </div>
          <IconMicroscope size={15} className={s.headIcon} />
        </div>
        <div className={s.figure}>
          <FacetDisc color={insect.accent} />
        </div>
        <button className={s.foot} onClick={() => onDiscover('lesson')}>
          放大看结构
          <IconArrowRight size={13} />
        </button>
      </article>

      <article className={`card ${s.card}`}>
        <div className={s.head}>
          <div>
            <div className={s.kicker}>体型对比</div>
            <div className={s.subject}>它在昆虫里有多大</div>
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
                        background: b.insect.id === insect.id ? insect.accent : '#755b4633',
                      }}
                    />
                  </span>
                  <span className={s.barVal}>{b.mm >= 10 ? `${(b.mm / 10).toFixed(1)} cm` : `${b.mm} mm`}</span>
                </div>
              ))}
            </div>
          ) : (
            <span style={{ fontSize: 11, color: 'var(--muted)' }}>体长数据待补</span>
          )}
        </div>
        <button className={s.foot} onClick={onCompare}>
          打开对比视图
          <IconArrowRight size={13} />
        </button>
      </article>

      <article className={`card ${s.card}`}>
        <div className={s.head}>
          <div>
            <div className={s.kicker}>生活史</div>
            <div className={s.subject}>{insect.metamorphosis}</div>
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
        <button className={s.foot} onClick={() => onDiscover('motion')}>
          播放发育动画
          <IconArrowRight size={13} />
        </button>
      </article>

      <article className={`card ${s.card}`}>
        <div className={s.head}>
          <div>
            <div className={s.kicker}>野外笔记</div>
            <div className={s.subject}>观察要点</div>
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
          查看全部笔记
          <IconArrowRight size={13} />
        </button>
      </article>

      <article className={`card ${s.card}`}>
        <div className={s.head}>
          <div>
            <div className={s.kicker}>它生活在哪</div>
            <div className={s.subject}>{insect.order}的栖境</div>
          </div>
          <IconLeaf size={15} className={s.headIcon} />
        </div>
        <div className={s.figure}>
          <HabitatFigure color={insect.accent} order={insect.order} />
        </div>
        <button className={s.foot} onClick={() => onDiscover('habitat')}>
          看这一目的成员
          <IconShare size={13} />
        </button>
      </article>
    </div>
  )
}
