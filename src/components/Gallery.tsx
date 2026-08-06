import { useEffect, useMemo } from 'react'
import type { Insect, Order } from '../data/types'
import { InsectGlyph } from './InsectGlyph'
import s from './Gallery.module.css'

/** 关掉弹层的通用行为：Esc 键 + 打开时锁住背景滚动 */
function useDismiss(onClose: () => void) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [onClose])
}

export function Gallery({
  insects,
  activeId,
  onSelect,
  onClose,
}: {
  insects: Insect[]
  activeId: string
  onSelect: (id: string) => void
  onClose: () => void
}) {
  useDismiss(onClose)

  // 按目分组，让目录呈现分类学结构而不是一片平铺
  const groups = useMemo(() => {
    const map = new Map<Order, Insect[]>()
    for (const i of insects) {
      const arr = map.get(i.order) ?? []
      arr.push(i)
      map.set(i.order, arr)
    }
    return [...map.entries()].sort((a, b) => b[1].length - a[1].length)
  }, [insects])

  return (
    <div className={s.backdrop} onClick={onClose}>
      <div className={s.sheet} onClick={(e) => e.stopPropagation()}>
        <div className={s.head}>
          <div>
            <h2 className={s.title}>全部 {insects.length} 种</h2>
            <div className={s.sub}>按目排列 · 共 {groups.length} 个目</div>
          </div>
          <button className={s.close} onClick={onClose} aria-label="关闭">
            ×
          </button>
        </div>

        {groups.map(([order, list]) => (
          <div key={order}>
            <div className={s.groupTitle}>
              <span className="eyebrow">{order}</span>
              <span className={s.groupLine} />
              <span className="eyebrow">{list.length}</span>
            </div>
            <div className={s.grid}>
              {list.map((i) => (
                <button
                  key={i.id}
                  className={s.tile}
                  data-active={i.id === activeId}
                  onClick={() => {
                    onSelect(i.id)
                    onClose()
                  }}
                >
                  <span
                    className={s.tileThumb}
                    style={{
                      background: `radial-gradient(circle at 34% 26%, ${i.accent}33, ${i.accent}12 60%, #fffdf9 100%)`,
                    }}
                  >
                    <InsectGlyph id={i.id} size={30} color={i.accent} />
                  </span>
                  <span style={{ minWidth: 0 }}>
                    <div className={s.tileName}>{i.name}</div>
                    <div className={s.tileLatin}>{i.latin}</div>
                  </span>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
