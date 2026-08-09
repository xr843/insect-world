import { useEffect, useMemo, useRef, useState } from 'react'
import type { Insect, Order } from '../data/types'
import {
  IconBook,
  IconChevronDown,
  IconCompass,
  IconLayers,
  IconLeafSolid,
  IconLibrary,
  IconNote,
  IconSearch,
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
  onLibrary,
  onNotes,
  onExplore,
  orderFilter,
  onOrderFilter,
  noteCount,
  onCopyNotes,
  onClearNotes,
}: {
  insects: Insect[]
  onPick: (id: string) => void
  /** 「课程」打开讲解弹窗 —— 参考站的 Lessons 也是这个行为 */
  onLessons: () => void
  /** 「图鉴库」打开全部物种总览 */
  onLibrary: () => void
  /** 「笔记」打开观察笔记面板 */
  onNotes: () => void
  /** 「探索」收起所有浮层，回到干净的观察状态 */
  onExplore: () => void
  /** 「分类」当前选中的目，null 表示不过滤 */
  orderFilter: Order | null
  onOrderFilter: (order: Order | null) => void
  noteCount: number
  onCopyNotes: () => void
  onClearNotes: () => void
}) {
  const [active, setActive] = useState<string>('explore')
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  /** 同一时刻只允许一个下拉展开：分类、头像菜单 */
  const [menu, setMenu] = useState<'orders' | 'account' | null>(null)
  const wrapRef = useRef<HTMLDivElement>(null)
  const navRef = useRef<HTMLElement>(null)
  const accountRef = useRef<HTMLDivElement>(null)

  // 点击面板外收起搜索结果
  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])

  // 下拉菜单同样点外面收起；Esc 也收
  useEffect(() => {
    if (!menu) return
    const onDown = (e: MouseEvent) => {
      const host = menu === 'orders' ? navRef.current : accountRef.current
      if (host && !host.contains(e.target as Node)) setMenu(null)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenu(null)
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [menu])

  /** 各目的物种数，「分类」下拉里逐项显示 —— 数字来自真实数据，不写死 */
  const orderCounts = useMemo(() => {
    const m = new Map<Order, number>()
    for (const i of insects) m.set(i.order, (m.get(i.order) ?? 0) + 1)
    return [...m.entries()].sort((a, b) => b[1] - a[1])
  }, [insects])

  const q = query.trim().toLowerCase()
  /**
   * 两档匹配：名称/学名/目/雅称是第一档；第二档在总述与冷知识全文里找。
   * 只有第一档时，搜「萤火虫」「甲虫」这类俗名会一无所获 ——
   * 图鉴用的是「中华黄萤」这样的正式名，俗名只出现在正文里（实测撞到过）。
   * 第二档排在后面并整体截断到 12 条，避免常见字把列表撑爆。
   */
  const primary = q
    ? insects.filter(
        (i) =>
          i.name.toLowerCase().includes(q) ||
          i.latin.toLowerCase().includes(q) ||
          i.order.includes(q) ||
          i.epithet.includes(q),
      )
    : []
  const seen = new Set(primary.map((i) => i.id))
  const secondary =
    q.length >= 2
      ? insects.filter((i) => !seen.has(i.id) && (i.summary.includes(q) || i.trivia.includes(q)))
      : []
  const hits = [...primary, ...secondary].slice(0, 12)

  return (
    <header className={s.bar}>
      <div className={s.brand}>
        <span className={s.wordmark}>昆虫世界</span>
        <span className={s.hall}>标本馆</span>
        <span className={s.tagline}>INSECTA · 十四目 · 六十标本</span>
      </div>

      <nav className={s.nav} ref={navRef}>
        {NAV.map(({ key, label, Icon }) => (
          <button
            key={key}
            className={s.navItem}
            data-active={active === key}
            onClick={() => {
              setActive(key)
              setMenu(null)
              if (key === 'explore') {
                onOrderFilter(null)
                onExplore()
              } else if (key === 'orders') {
                // 「分类」本身不跳转，展开一个按目筛选的下拉
                setMenu((m) => (m === 'orders' ? null : 'orders'))
              } else if (key === 'lessons') {
                onLessons()
              } else if (key === 'library') {
                onLibrary()
              } else if (key === 'notes') {
                onNotes()
              }
            }}
          >
            <Icon size={15} />
            {label}
            {key === 'orders' && orderFilter && <span className={s.dot} />}
            {key === 'notes' && noteCount > 0 && <span className={s.badge}>{noteCount}</span>}
          </button>
        ))}

        {menu === 'orders' && (
          <div className={`card ${s.menu} ${s.orderMenu}`}>
            <button
              className={s.menuItem}
              data-active={orderFilter === null}
              onClick={() => {
                onOrderFilter(null)
                setMenu(null)
              }}
            >
              <span>全部</span>
              <span className={s.menuCount}>{insects.length}</span>
            </button>
            {orderCounts.map(([order, n]) => (
              <button
                key={order}
                className={s.menuItem}
                data-active={orderFilter === order}
                onClick={() => {
                  onOrderFilter(order)
                  setMenu(null)
                }}
              >
                <span>{order}</span>
                <span className={s.menuCount}>{n}</span>
              </button>
            ))}
          </div>
        )}
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

        <div className={s.avatar} ref={accountRef}>
          <button
            className={s.avatarBtn}
            onClick={() => setMenu((m) => (m === 'account' ? null : 'account'))}
            aria-haspopup="menu"
            aria-expanded={menu === 'account'}
            aria-label="观察记录"
            title="观察记录"
          >
            {/*
              这里原来放的是一个「昆」字。圆底 + 单字是头像的写法，
              而本站没有账号体系，点开也不是账号设置而是观察笔记 ——
              一个不存在的登录态不该被画出来。换成叶片标记：
              左栏选中项用的就是它，两处呼应。
            */}
            <span className={s.disc}>
              <IconLeafSolid size={21} />
            </span>
            <IconChevronDown size={14} />
          </button>

          {menu === 'account' && (
            <div className={`card ${s.menu} ${s.accountMenu}`}>
              <div className={s.menuHead}>
                {noteCount > 0 ? `已记录 ${noteCount} 种` : '还没有观察笔记'}
              </div>
              <button
                className={s.menuItem}
                onClick={() => {
                  onNotes()
                  setMenu(null)
                }}
              >
                <span>打开笔记</span>
              </button>
              <button
                className={s.menuItem}
                disabled={noteCount === 0}
                onClick={() => {
                  onCopyNotes()
                  setMenu(null)
                }}
              >
                <span>复制为 Markdown</span>
              </button>
              <button
                className={s.menuItem}
                disabled={noteCount === 0}
                onClick={() => {
                  onClearNotes()
                  setMenu(null)
                }}
              >
                <span className={s.danger}>清空笔记</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
