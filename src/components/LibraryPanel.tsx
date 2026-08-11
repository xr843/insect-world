import { useEffect, useRef } from 'react'
import type { Insect } from '../data/types'
import { InsectGlyph } from './InsectGlyph'
import { IconArrowRight, IconBookmark, IconLeafSolid } from './icons'
import s from './LibraryPanel.module.css'
import { useLabels, useT } from '../i18n/useT'

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

      <div className={s.list}>
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
              onClick={() => onSelect(i.id)}
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
                <div className={s.name}>{i.name}</div>
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
