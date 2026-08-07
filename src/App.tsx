import { useCallback, useEffect, useMemo, useState } from 'react'
import { INSECTS } from './data/insects'
import type { Order } from './data/types'
import { getGuide } from './data/guides'
import { notesToMarkdown, useFieldNotes } from './hooks/useFieldNotes'
import { NotesPanel } from './components/NotesPanel'
import { BottomCards } from './components/BottomCards'
import { Discovery, type DiscoveryKind } from './components/Discovery'
import { Gallery } from './components/Gallery'
import { DetailPanel } from './components/DetailPanel'
import { LibraryPanel } from './components/LibraryPanel'
import { Stage } from './components/Stage'
import { TopBar } from './components/TopBar'
import { IconGrid, IconSparkle } from './components/icons'
import { isKnownSpecies, prefetchInsectModel } from './three/registry'

/**
 * 只保留建模文件确实在产物里的物种。数据层与建模层是分头推进的，
 * 中途某一侧领先很正常 —— 这道过滤保证界面永远不会列出一个点开只会
 * 转圈的物种。`three/__tests__/integration.test.ts` 会在开发期把这种
 * 不一致大声报出来，这里是生产环境的兜底。
 */
const SPECIES = INSECTS.filter((i) => isKnownSpecies(i.id))

export default function App() {
  const [activeId, setActiveId] = useState(SPECIES[0].id)
  const [galleryOpen, setGalleryOpen] = useState(false)
  const [notesOpen, setNotesOpen] = useState(false)
  const [compareId, setCompareId] = useState<string | null>(null)
  const [discovery, setDiscovery] = useState<DiscoveryKind | null>(null)
  const [focusAnchor, setFocusAnchor] = useState<string | null>(null)
  const [orderFilter, setOrderFilter] = useState<Order | null>(null)
  const [notedOnly, setNotedOnly] = useState(false)

  const { notes, write, clear } = useFieldNotes()
  const noteCount = Object.keys(notes).length

  const insect = useMemo(
    () => SPECIES.find((i) => i.id === activeId) ?? SPECIES[0],
    [activeId],
  )

  /**
   * 左栏列表按「分类」与书签两个条件过滤。
   *
   * 注意只影响列表，不影响 activeId —— 筛掉当前选中的那只时，
   * 展台仍然显示它，否则用户会觉得自己正在看的东西被筛没了。
   */
  const listed = useMemo(() => {
    let out = SPECIES
    if (orderFilter) out = out.filter((i) => i.order === orderFilter)
    if (notedOnly) out = out.filter((i) => i.id in notes)
    return out
  }, [orderFilter, notedOnly, notes])

  /** 顶栏「探索」：收起所有浮层，回到干净的观察状态 */
  const backToExplore = useCallback(() => {
    setGalleryOpen(false)
    setNotesOpen(false)
    setDiscovery(null)
    setCompareId(null)
    setNotedOnly(false)
    setFocusAnchor(null)
  }, [])

  const copyNotes = useCallback(() => {
    const md = notesToMarkdown(notes, (id) => SPECIES.find((i) => i.id === id)?.name)
    void navigator.clipboard?.writeText(md).catch(() => {
      /* 剪贴板被拒就算了，不打断用户 */
    })
  }, [notes])
  const compareWith = useMemo(
    () => (compareId ? SPECIES.find((i) => i.id === compareId) ?? null : null),
    [compareId],
  )

  const select = useCallback((id: string) => {
    setActiveId(id)
    setFocusAnchor(null)
    // 顺手预热相邻物种，用户往下点时几乎无等待
    const idx = SPECIES.findIndex((i) => i.id === id)
    for (const n of [idx + 1, idx - 1]) {
      if (SPECIES[n]) prefetchInsectModel(SPECIES[n].id)
    }
  }, [])

  /**
   * 方向键在**可见列表**里走，不在全量列表里走 —— 筛到蜚蠊目还按全量翻，
   * 一按 ↓ 就跳到鞘翅目去了，筛选等于白设（实测撞到过）。
   * 当前物种被筛掉时，从列表第一/最后一项进入。
   */
  const step = useCallback(
    (delta: number) => {
      const pool = listed.length > 0 ? listed : SPECIES
      const idx = pool.findIndex((i) => i.id === activeId)
      const next = idx === -1 ? (delta > 0 ? 0 : pool.length - 1) : (idx + delta + pool.length) % pool.length
      select(pool[next].id)
    },
    [activeId, select, listed],
  )

  // 上下键翻图鉴。逐只看过去是这个产品的主要用法，不该每次都回去点列表。
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null
      if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable)) return
      if (galleryOpen || discovery || notesOpen) return
      if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
        e.preventDefault()
        step(1)
      } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
        e.preventDefault()
        step(-1)
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [step, galleryOpen, discovery, notesOpen])

  /** 对照物种按当前物种在列表里的位置错开取，保证不会选到自己 */
  const pickPeer = useCallback(
    (offset: number) => {
      const idx = SPECIES.findIndex((i) => i.id === activeId)
      return SPECIES[(idx + offset + SPECIES.length) % SPECIES.length].id
    },
    [activeId],
  )

  const toggleCompare = useCallback(() => {
    setCompareId((cur) => (cur ? null : pickPeer(1)))
  }, [pickPeer])

  const cycleCompare = useCallback(() => {
    setCompareId((cur) => {
      if (!cur) return pickPeer(1)
      const from = SPECIES.findIndex((i) => i.id === cur)
      let next = (from + 1) % SPECIES.length
      if (SPECIES[next].id === activeId) next = (next + 1) % SPECIES.length
      return SPECIES[next].id
    })
  }, [activeId, pickPeer])

  // 换物种时，之前挑的对照对象若正好是新选中的，就顺延一个
  useEffect(() => {
    if (compareId === activeId) setCompareId(pickPeer(1))
  }, [activeId, compareId, pickPeer])

  const surprise = useCallback(() => {
    // 用当前索引推进而非 Math.random：连点两次不会撞回同一只
    const idx = SPECIES.findIndex((i) => i.id === activeId)
    select(SPECIES[(idx * 5 + 3) % SPECIES.length].id)
  }, [activeId, select])

  return (
    <div className="app">
      <TopBar
        insects={SPECIES}
        onPick={select}
        onLessons={() => setDiscovery('lesson')}
        onLibrary={() => setGalleryOpen(true)}
        onNotes={() => setNotesOpen(true)}
        onExplore={backToExplore}
        orderFilter={orderFilter}
        onOrderFilter={setOrderFilter}
        noteCount={noteCount}
        onCopyNotes={copyNotes}
        onClearNotes={clear}
      />

      <main className="workbench">
        <LibraryPanel
          insects={listed}
          activeId={activeId}
          onSelect={select}
          onViewAll={() => setGalleryOpen(true)}
          totalCount={SPECIES.length}
          filterLabel={orderFilter}
          onClearFilter={() => setOrderFilter(null)}
          notedOnly={notedOnly}
          onToggleNotedOnly={() => setNotedOnly((v) => !v)}
          noteCount={noteCount}
        />
        <Stage
          insect={insect}
          compareWith={compareWith}
          onCompareToggle={toggleCompare}
          onCompareCycle={cycleCompare}
          focusAnchor={focusAnchor}
        />
        <DetailPanel insect={insect} onCompare={toggleCompare} onDiscover={setDiscovery} />
      </main>

      <BottomCards
        insect={insect}
        peers={SPECIES}
        onCompare={toggleCompare}
        onDiscover={setDiscovery}
        onExplore={() => setGalleryOpen(true)}
      />

      <div className="rail-float">
        <button onClick={() => setGalleryOpen(true)} title={`全部 ${SPECIES.length} 种`}>
          <IconGrid size={16} />
        </button>
        <button onClick={surprise} title="换一只看看">
          <IconSparkle size={16} />
        </button>
      </div>

      {galleryOpen && (
        <Gallery
          insects={SPECIES}
          activeId={activeId}
          onSelect={select}
          onClose={() => setGalleryOpen(false)}
        />
      )}

      {notesOpen && (
        <NotesPanel
          insect={insect}
          insects={SPECIES}
          notes={notes}
          onWrite={write}
          onSelect={select}
          onClose={() => setNotesOpen(false)}
        />
      )}

      {discovery && (
        <Discovery
          kind={discovery}
          insect={insect}
          guide={getGuide(insect.id)}
          onClose={() => setDiscovery(null)}
          onFocusAnchor={setFocusAnchor}
        />
      )}
    </div>
  )
}
