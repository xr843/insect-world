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

// ---------------------------------------------------------------- 对比视图

export function CompareSheet({
  insects,
  leftId,
  rightId,
  onPickRight,
  onClose,
}: {
  insects: Insect[]
  leftId: string
  rightId: string
  onPickRight: (id: string) => void
  onClose: () => void
}) {
  useDismiss(onClose)

  const left = insects.find((i) => i.id === leftId)
  const right = insects.find((i) => i.id === rightId)
  if (!left || !right) return null

  const cols: [Insect, Insect] = [left, right]

  return (
    <div className={s.backdrop} onClick={onClose}>
      <div className={s.sheet} onClick={(e) => e.stopPropagation()}>
        <div className={s.head}>
          <div>
            <h2 className={s.title}>并排对比</h2>
            <div className={s.sub}>
              {left.name} 与 {right.name}
            </div>
          </div>
          <button className={s.close} onClick={onClose} aria-label="关闭">
            ×
          </button>
        </div>

        <div className={s.compareGrid}>
          {cols.map((ins, idx) => (
            <div className={s.compareCol} key={`${ins.id}-${idx}`}>
              <div className={s.compareStage} style={{ display: 'grid', placeItems: 'center' }}>
                <InsectGlyph id={ins.id} size={148} color={ins.accent} />
              </div>
              <div className={s.compareBody}>
                <div className={s.compareName}>{ins.name}</div>
                <div className={s.compareLatin}>{ins.latin}</div>
                <div className={s.compareFact}>
                  <span className={s.compareKey}>目</span>
                  <span>{ins.order}</span>
                </div>
                <div className={s.compareFact}>
                  <span className={s.compareKey}>变态</span>
                  <span>{ins.metamorphosis}</span>
                </div>
                {ins.facts.slice(0, 4).map((f) => (
                  <div className={s.compareFact} key={f.key}>
                    <span className={s.compareKey}>{f.key}</span>
                    <span>{f.value}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className={s.picker}>
          <span style={{ fontSize: 11, color: 'var(--muted)', alignSelf: 'center', marginRight: 4 }}>
            换右边这只：
          </span>
          {insects
            .filter((i) => i.id !== leftId)
            .map((i) => (
              <button
                key={i.id}
                className={s.pick}
                data-active={i.id === rightId}
                onClick={() => onPickRight(i.id)}
              >
                {i.name}
              </button>
            ))}
        </div>
      </div>
    </div>
  )
}
