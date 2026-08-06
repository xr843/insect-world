import type { Insect } from '../data/types'
import { InsectGlyph } from './InsectGlyph'
import { IconArrowRight, IconBookmark } from './icons'
import s from './LibraryPanel.module.css'

/** 选中项右侧的小标记：一片叶子，替代参考站的心形 */
const LeafMark = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
    <path d="M4.2 20.2c-.5-7.8 4.6-13.3 15.6-13.6.5 8.9-4.4 13.6-12.4 13.6h-2c1.9-3.4 4.6-5.8 8.2-7.4-4.1 1.1-7.2 3.6-9.4 7.4Z" />
  </svg>
)

export function LibraryPanel({
  insects,
  activeId,
  onSelect,
  onViewAll,
}: {
  insects: Insect[]
  activeId: string
  onSelect: (id: string) => void
  onViewAll: () => void
}) {
  return (
    <aside className={`card stage-height ${s.panel} detail-left`}>
      <div className={s.head}>
        <span className="eyebrow">昆虫图鉴</span>
        <button className={s.bookmark} title="收藏夹">
          <IconBookmark size={15} />
        </button>
      </div>

      <div className={s.list}>
        {insects.map((i) => {
          const active = i.id === activeId
          return (
            <button
              key={i.id}
              className={s.item}
              data-active={active}
              onClick={() => onSelect(i.id)}
            >
              <span
                className={s.thumb}
                style={{
                  background: `radial-gradient(circle at 34% 28%, ${i.accent}2e, ${i.accent}12 62%, #fffdf9 100%)`,
                }}
              >
                <InsectGlyph id={i.id} size={26} color={i.accent} />
              </span>
              <span style={{ minWidth: 0 }}>
                <div className={s.name}>{i.name}</div>
                <div className={s.order}>{i.order}</div>
              </span>
              {active && (
                <span className={s.mark}>
                  <LeafMark />
                </span>
              )}
            </button>
          )
        })}
      </div>

      <div className={s.footer}>
        <button className={s.viewAll} onClick={onViewAll}>
          查看全部 {insects.length} 种
          <IconArrowRight size={14} />
        </button>
      </div>
    </aside>
  )
}
