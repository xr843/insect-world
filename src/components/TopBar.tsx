import { useEffect, useMemo, useRef, useState } from 'react'
import type { Insect, Order } from '../data/types'
import { EVENTS, track } from '../analytics'
import { useLabels, useLocale, useT } from '../i18n/useT'
import { hrefForLocale } from '../i18n/hrefForLocale'
import { LOCALE_AUTONYM } from '../i18n/locales'
import { matchesPinyin } from '../data/pinyin'
import {
  IconBook,
  IconChevronDown,
  IconCompass,
  IconLayers,
  IconLeafSolid,
  IconLibrary,
  IconMoon,
  IconNote,
  IconSearch,
  IconSparkle,
  IconSun,
} from './icons'
import s from './TopBar.module.css'

const NAV = [
  { key: 'explore', labelKey: 'nav.explore', Icon: IconCompass },
  { key: 'orders', labelKey: 'nav.orders', Icon: IconLayers },
  { key: 'lessons', labelKey: 'nav.lessons', Icon: IconBook },
  { key: 'library', labelKey: 'nav.library', Icon: IconLibrary },
  { key: 'notes', labelKey: 'nav.notes', Icon: IconNote },
] as const

export function TopBar({
  insects,
  activeId,
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
  theme,
  onToggleTheme,
}: {
  insects: Insect[]
  /** 当前物种 —— 切语言时带进地址，免得回到第一只 */
  activeId: string
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
  theme: 'dark' | 'light'
  onToggleTheme: () => void
  onCopyNotes: () => void
  onClearNotes: () => void
}) {
  const t = useT()
  const labels = useLabels()
  const locale = useLocale()
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
   * 图鉴用的是「山窗萤」这样的正式名，俗名只出现在正文里（实测撞到过）。
   * 第二档排在后面并整体截断到 12 条，避免常见字把列表撑爆。
   *
   * 拼音也算第一档（仅中文版）：「棒䗛、水黾、海滨蠼螋」这些字多数
   * 成年人打不出来，全拼（shuimin）或首字母（hbqs）是唯一能敲进
   * 搜索框的形态。英文版不接 —— 英文读者面对的本来就是英文名。
   */
  const primary = q
    ? insects.filter(
        (i) =>
          i.name.toLowerCase().includes(q) ||
          i.latin.toLowerCase().includes(q) ||
          labels.order[i.order].toLowerCase().includes(q) ||
          i.epithet.includes(q) ||
          (locale === 'zh' && matchesPinyin(i.id, q)),
      )
    : []
  const seen = new Set(primary.map((i) => i.id))
  const secondary =
    q.length >= 2
      ? insects.filter((i) => !seen.has(i.id) && (i.summary.includes(q) || i.trivia.includes(q)))
      : []
  const hits = [...primary, ...secondary].slice(0, 12)

  /**
   * 搜索埋点：等输入停顿再报一次「发起了一次搜索」，不追每个按键 ——
   * 按键就报的话，敲「瓢虫」两个字会在 Umami 里炸出两条，且这批用不上
   * 那种密度。只报「有没有结果」这一个布尔，绝不上报 query 本身：
   * 搜索词是用户主动打的自由文本，最接近个人输入痕迹，隐私上不能报。
   */
  useEffect(() => {
    if (!q) return
    const timer = window.setTimeout(() => {
      track(EVENTS.SEARCH, { has_results: hits.length > 0 })
    }, 500)
    return () => window.clearTimeout(timer)
    // hits 由 q 与 insects 派生，随 q 变化必然重新求值，不需要单独进依赖
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q])

  return (
    <header className={s.bar}>
      <div className={s.brand}>
        <span className={s.wordmark}>{t('brand.name')}</span>
        <IconSparkle size={13} className={s.spark} />
        <span className={s.tagline}>{t('brand.tagline')}</span>
      </div>

      <nav className={s.nav} ref={navRef}>
        {NAV.map(({ key, labelKey, Icon }) => (
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
            {t(labelKey)}
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
              <span>{t('orders.all')}</span>
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
                <span>{labels.order[order]}</span>
                <span className={s.menuCount}>{n}</span>
              </button>
            ))}
          </div>
        )}
      </nav>

      <div className={s.right}>
        {/*
          用真 <a href> 而不是 onClick：中键、右键「新标签页打开」、
          复制链接地址都得能用 —— 这是个跨页面跳转，不是页内状态切换。
        */}
        <div className={s.langToggle}>
          {(['zh', 'en'] as const).map((code) => (
            <a
              key={code}
              className={s.langItem}
              data-active={locale === code}
              href={locale === code ? undefined : hrefForLocale(code, activeId)}
              aria-current={locale === code ? 'true' : undefined}
              lang={code === 'zh' ? 'zh-Hans' : 'en'}
              onClick={() => {
                // 当前语言那个 <a> 没有 href，点了也不会跳转，不该记一次「切换」
                if (locale !== code) track(EVENTS.LANGUAGE_SWITCH, { to: code })
              }}
            >
              {LOCALE_AUTONYM[code]}
            </a>
          ))}
        </div>
        <button
          className={s.themeToggle}
          onClick={onToggleTheme}
          aria-label={theme === 'dark' ? t('theme.toLight') : t('theme.toDark')}
          title={theme === 'dark' ? t('theme.light') : t('theme.dark')}
        >
          {theme === 'dark' ? <IconSun size={16} /> : <IconMoon size={16} />}
        </button>
        <div className={s.searchWrap} ref={wrapRef}>
          <div className={s.search}>
            <IconSearch size={15} />
            <input
              value={query}
              placeholder={t('search.placeholder')}
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
                <div className={s.empty}>{t('search.noResults', { query })}</div>
              ) : (
                hits.map((i) => (
                  <button
                    key={i.id}
                    className={s.result}
                    onClick={() => {
                      track(EVENTS.SPECIES_SWITCH, { source: 'search', species_id: i.id, order: i.order })
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
            aria-label={t('account.observationLog')}
            title={t('account.observationLog')}
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
                {noteCount > 0 ? t('notes.recorded', { n: noteCount }) : t('notes.empty')}
              </div>
              <button
                className={s.menuItem}
                onClick={() => {
                  onNotes()
                  setMenu(null)
                }}
              >
                <span>{t('notes.open')}</span>
              </button>
              <button
                className={s.menuItem}
                disabled={noteCount === 0}
                onClick={() => {
                  onCopyNotes()
                  setMenu(null)
                }}
              >
                <span>{t('notes.copyMarkdown')}</span>
              </button>
              <button
                className={s.menuItem}
                disabled={noteCount === 0}
                onClick={() => {
                  onClearNotes()
                  setMenu(null)
                }}
              >
                <span className={s.danger}>{t('notes.clear')}</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
