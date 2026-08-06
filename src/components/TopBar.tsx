import { useEffect, useRef, useState } from 'react'
import type { Insect } from '../data/types'
import {
  IconBook,
  IconChevronDown,
  IconCompass,
  IconLayers,
  IconLibrary,
  IconNote,
  IconSearch,
  IconSparkle,
} from './icons'
import s from './TopBar.module.css'

const NAV = [
  { key: 'explore', label: '探索', Icon: IconCompass },
  { key: 'orders', label: '分类', Icon: IconLayers },
  { key: 'lessons', label: '课程', Icon: IconBook },
  { key: 'library', label: '图鉴库', Icon: IconLibrary },
  { key: 'notes', label: '笔记', Icon: IconNote },
] as const

export function TopBar({
  insects,
  onPick,
  onLessons,
}: {
  insects: Insect[]
  onPick: (id: string) => void
  /** 「课程」打开讲解弹窗 —— 参考站的 Lessons 也是这个行为 */
  onLessons: () => void
}) {
  const [active, setActive] = useState<string>('explore')
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)

  // 点击面板外收起搜索结果
  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])

  const q = query.trim().toLowerCase()
  const hits = q
    ? insects.filter(
        (i) =>
          i.name.toLowerCase().includes(q) ||
          i.latin.toLowerCase().includes(q) ||
          i.order.includes(q) ||
          i.epithet.includes(q),
      )
    : []

  return (
    <header className={s.bar}>
      <div className={s.brand}>
        <span className={s.wordmark}>昆虫世界</span>
        <IconSparkle size={13} className={s.spark} />
        <span className={s.tagline}>像博物学家一样观察</span>
      </div>

      <nav className={s.nav}>
        {NAV.map(({ key, label, Icon }) => (
          <button
            key={key}
            className={s.navItem}
            data-active={active === key}
            onClick={() => {
              setActive(key)
              if (key === 'lessons') onLessons()
            }}
          >
            <Icon size={15} />
            {label}
          </button>
        ))}
      </nav>

      <div className={s.right}>
        <div className={s.searchWrap} ref={wrapRef}>
          <div className={s.search}>
            <IconSearch size={15} />
            <input
              value={query}
              placeholder="搜索昆虫、目、特征…"
              onChange={(e) => {
                setQuery(e.target.value)
                setOpen(true)
              }}
              onFocus={() => setOpen(true)}
            />
          </div>
          {open && q.length > 0 && (
            <div className={`card ${s.results}`}>
              {hits.length === 0 ? (
                <div className={s.empty}>没有找到「{query}」</div>
              ) : (
                hits.map((i) => (
                  <button
                    key={i.id}
                    className={s.result}
                    onClick={() => {
                      onPick(i.id)
                      setOpen(false)
                      setQuery('')
                    }}
                  >
                    <span className={s.resultDot} style={{ background: i.accent }} />
                    <span>
                      <div className={s.resultName}>{i.name}</div>
                      <div className={s.resultMeta}>{i.latin}</div>
                    </span>
                  </button>
                ))
              )}
            </div>
          )}
        </div>

        <div className={s.avatar}>
          <span className={s.disc}>昆</span>
          <IconChevronDown size={14} />
        </div>
      </div>
    </header>
  )
}
