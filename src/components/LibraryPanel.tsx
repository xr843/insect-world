import { useEffect, useRef, type UIEvent } from 'react'
import type { Insect } from '../data/types'
import { InsectGlyph } from './InsectGlyph'
import { IconArrowRight, IconBookmark, IconLeafSolid } from './icons'
import { fitName } from './fitName'
import s from './LibraryPanel.module.css'
import { useLabels, useLocale, useT } from '../i18n/useT'
import { pinyinOf } from '../data/pinyin'
import { EVENTS, track } from '../analytics'

/** 滚动深度节流窗口：滚动中最多这么频地上报一次，见组件内注释 */
const SCROLL_REPORT_THROTTLE_MS = 1200

export function LibraryPanel({
  insects,
  activeId,
  onSelect,
  onViewAll,
  totalCount,
  filterLabel,
  onClearFilter,
  notedOnly,
  onToggleNotedOnly,
  noteCount,
}: {
  insects: Insect[]
  activeId: string
  onSelect: (id: string) => void
  onViewAll: () => void
  /** 全部物种数（不随筛选变化），用于底部按钮的文案 */
  totalCount: number
  /** 当前生效的筛选说明（如「鞘翅目」），无筛选时为 null */
  filterLabel: string | null
  onClearFilter: () => void
  /** 书签按钮：只看记过笔记的物种 */
  notedOnly: boolean
  onToggleNotedOnly: () => void
  noteCount: number
}) {
  const t = useT()
  const labels = useLabels()
  const zh = useLocale() === 'zh'
  /**
   * 让选中项跟着走。
   *
   * 方向键翻图鉴（App.tsx 的 step）只改 activeId，没人负责把新的选中项
   * 滚进视野 —— 实测按 9 下之后高亮已经在列表下边缘之外 143px 处，而
   * 3D 展台照常换标本。于是症状看起来像「方向键坏了」，其实是列表没跟上。
   *
   * nearest 是关键：已经可见就一动不动，只在真的看不见时滚最小距离。
   * 换成 center/start 会让每一次点击都把列表（连带整页）拽一下。
   * block 管桌面端的竖列，inline 管手机上那条横向滑条，两个轴都得给。
   *
   * behavior 用 auto（瞬时）而不是 smooth，是实测之后改回来的：
   * 平滑滚动由 rAF 驱动，在后台标签页里一次都不跑（实测 1.5 秒纹丝不动，
   * 同一刻 auto 立刻到位）；连按方向键时动画又会被反复打断重启，列表
   * 追不上高亮 —— 正好复现用户报的那个症状。「选中项可见」是正确性，
   * 不该架在动画上。顺带也就天然合了 prefers-reduced-motion。
   */
  const activeRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    // 选中项被筛掉时没有这个节点，不滚 —— 展台仍显示它，但列表里没有它的位置
    if (!activeRef.current) return
    activeRef.current.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'auto' })
  }, [activeId, insects])

  /**
   * 左栏滚动深度埋点 —— 首页①号问题（63 种里人均只翻到 5~6 种，且是
   * 同样的那几种）直接量的就是这条曲线，所以专门做了节流 + 兜底补报，
   * 不能因为「怕吵」把最深的那一次滚动漏报了。
   *
   * maxDepthRef 记的是本轮列表里滚到过的最深名次，只增不减 —— 往回滚
   * 不撤销「曾经到过第 N 只」这个事实。节流窗口内只更新这个记录、不
   * 发请求；窗口过了才真发。窗口内产生的「更深」由 flushTimer 在窗口
   * 结束后补发一次 —— 否则「快速滑到底就停手」这种典型手势，最深的
   * 名次会被节流直接吞掉、永远上报不出去。
   *
   * 手机上 `.list` 被 CSS 改成横向滑条（见 module.css 的 900px 分支），
   * 所以两个轴都要判：谁有溢出量就用谁。
   */
  const maxDepthRef = useRef(0)
  const lastSentRef = useRef({ index: 0, at: 0 })
  const flushTimerRef = useRef<number>()

  // 换筛选（换目、切「只看笔记」）时分母变了，旧的深度记录不能带过去
  useEffect(() => {
    maxDepthRef.current = 0
    lastSentRef.current = { index: 0, at: 0 }
    window.clearTimeout(flushTimerRef.current)
  }, [insects])

  useEffect(() => () => window.clearTimeout(flushTimerRef.current), [])

  const onListScroll = (e: UIEvent<HTMLDivElement>) => {
    if (insects.length === 0) return
    const el = e.currentTarget
    const vScroll = el.scrollHeight - el.clientHeight
    const hScroll = el.scrollWidth - el.clientWidth
    let frac: number
    if (vScroll > 0) frac = (el.scrollTop + el.clientHeight) / el.scrollHeight
    else if (hScroll > 0) frac = (el.scrollLeft + el.clientWidth) / el.scrollWidth
    // 一屏放得下，没有滚动可言
    else return

    const index = Math.min(insects.length, Math.max(1, Math.ceil(frac * insects.length)))
    if (index <= maxDepthRef.current) return
    maxDepthRef.current = index

    const now = Date.now()
    if (now - lastSentRef.current.at >= SCROLL_REPORT_THROTTLE_MS) {
      lastSentRef.current = { index, at: now }
      track(EVENTS.LIBRARY_SCROLL_DEPTH, { index, total: insects.length })
      return
    }
    // 节流窗口内：先不发，窗口结束后如果没有更新的深度顶替它，就把这次补上去
    window.clearTimeout(flushTimerRef.current)
    flushTimerRef.current = window.setTimeout(() => {
      if (maxDepthRef.current > lastSentRef.current.index) {
        lastSentRef.current = { index: maxDepthRef.current, at: Date.now() }
        track(EVENTS.LIBRARY_SCROLL_DEPTH, { index: maxDepthRef.current, total: insects.length })
      }
    }, SCROLL_REPORT_THROTTLE_MS)
  }

  return (
    <aside className={`card stage-height ${s.panel} detail-left`}>
      <div className={s.head}>
        <span className="eyebrow">{t('library.title')}</span>
        <button
          className={s.bookmark}
          data-active={notedOnly}
          onClick={onToggleNotedOnly}
          title={notedOnly ? t('library.showAllTitle') : t('library.notedOnlyTitle', { n: noteCount })}
          aria-pressed={notedOnly}
        >
          <IconBookmark size={15} />
        </button>
      </div>

      {filterLabel && (
        <button className={s.filter} onClick={onClearFilter} title={t('library.clearFilterTitle')}>
          <span>{filterLabel}</span>
          <span className={s.filterX}>×</span>
        </button>
      )}

      <div className={s.list} onScroll={onListScroll}>
        {insects.length === 0 && (
          <div className={s.none}>
            {notedOnly ? t('library.emptyNoted') : t('library.emptyFiltered')}
          </div>
        )}
        {insects.map((i) => {
          const active = i.id === activeId
          return (
            <button
              key={i.id}
              ref={active ? activeRef : undefined}
              className={s.item}
              data-active={active}
              onClick={() => {
                track(EVENTS.SPECIES_SWITCH, { source: 'list', species_id: i.id, order: i.order })
                onSelect(i.id)
              }}
            >
              <span
                className={s.thumb}
                style={{
                  background: `radial-gradient(circle at 34% 28%, ${i.accent}2e, ${i.accent}12 62%, var(--glyph-base) 100%)`,
                }}
              >
                <InsectGlyph id={i.id} size={26} color={i.accent} />
              </span>
              <span style={{ minWidth: 0 }}>
                <div className={s.name} {...fitName(i.name)}>
                  {i.name}
                </div>
                {/* 拼音夹在名字与目名之间：小孩要先念得出名字，才知道该点哪一只 */}
                {zh && pinyinOf(i.id) && <div className={s.pinyin}>{pinyinOf(i.id)}</div>}
                <div className={s.order}>{labels.order[i.order]}</div>
              </span>
              {active && (
                <span className={s.mark}>
                  {/* 选中项的小标记：一片叶子，替代参考站的心形 */}
                  <IconLeafSolid size={15} />
                </span>
              )}
            </button>
          )
        })}
      </div>

      <div className={s.footer}>
        {/* 数的是全部物种，不是过滤后的列表 —— 这个按钮打开的始终是完整总览 */}
        <button className={s.viewAll} onClick={onViewAll}>
          {t('library.viewAll', { n: totalCount })}
          <IconArrowRight size={14} />
        </button>
      </div>
    </aside>
  )
}
