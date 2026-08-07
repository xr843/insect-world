import { useCallback, useEffect, useMemo, useState } from 'react'
import { INSECTS } from './data/insects'
import { getGuide } from './data/guides'
import { BottomCards } from './components/BottomCards'
import { Discovery, type DiscoveryKind } from './components/Discovery'
import { Gallery } from './components/Gallery'
import { DetailPanel } from './components/DetailPanel'
import { LibraryPanel } from './components/LibraryPanel'
import { Stage } from './components/Stage'
import { TopBar } from './components/TopBar'
import { IconGrid, IconSparkle } from './components/icons'
import { prefetchInsectModel } from './three/registry'

export default function App() {
  const [activeId, setActiveId] = useState(INSECTS[0].id)
  const [galleryOpen, setGalleryOpen] = useState(false)
  const [compareId, setCompareId] = useState<string | null>(null)
  const [discovery, setDiscovery] = useState<DiscoveryKind | null>(null)
  const [focusAnchor, setFocusAnchor] = useState<string | null>(null)

  const insect = useMemo(
    () => INSECTS.find((i) => i.id === activeId) ?? INSECTS[0],
    [activeId],
  )
  const compareWith = useMemo(
    () => (compareId ? INSECTS.find((i) => i.id === compareId) ?? null : null),
    [compareId],
  )

  const select = useCallback((id: string) => {
    setActiveId(id)
    setFocusAnchor(null)
    // 顺手预热相邻物种，用户往下点时几乎无等待
    const idx = INSECTS.findIndex((i) => i.id === id)
    for (const n of [idx + 1, idx - 1]) {
      if (INSECTS[n]) prefetchInsectModel(INSECTS[n].id)
    }
  }, [])

  const step = useCallback(
    (delta: number) => {
      const idx = INSECTS.findIndex((i) => i.id === activeId)
      select(INSECTS[(idx + delta + INSECTS.length) % INSECTS.length].id)
    },
    [activeId, select],
  )

  // 上下键翻图鉴。逐只看过去是这个产品的主要用法，不该每次都回去点列表。
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null
      if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable)) return
      if (galleryOpen || discovery) return
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
  }, [step, galleryOpen, discovery])

  /** 对照物种按当前物种在列表里的位置错开取，保证不会选到自己 */
  const pickPeer = useCallback(
    (offset: number) => {
      const idx = INSECTS.findIndex((i) => i.id === activeId)
      return INSECTS[(idx + offset + INSECTS.length) % INSECTS.length].id
    },
    [activeId],
  )

  const toggleCompare = useCallback(() => {
    setCompareId((cur) => (cur ? null : pickPeer(1)))
  }, [pickPeer])

  const cycleCompare = useCallback(() => {
    setCompareId((cur) => {
      if (!cur) return pickPeer(1)
      const from = INSECTS.findIndex((i) => i.id === cur)
      let next = (from + 1) % INSECTS.length
      if (INSECTS[next].id === activeId) next = (next + 1) % INSECTS.length
      return INSECTS[next].id
    })
  }, [activeId, pickPeer])

  // 换物种时，之前挑的对照对象若正好是新选中的，就顺延一个
  useEffect(() => {
    if (compareId === activeId) setCompareId(pickPeer(1))
  }, [activeId, compareId, pickPeer])

  const surprise = useCallback(() => {
    // 用当前索引推进而非 Math.random：连点两次不会撞回同一只
    const idx = INSECTS.findIndex((i) => i.id === activeId)
    select(INSECTS[(idx * 5 + 3) % INSECTS.length].id)
  }, [activeId, select])

  return (
    <div className="app">
      <TopBar insects={INSECTS} onPick={select} onLessons={() => setDiscovery('lesson')} />

      <main className="workbench">
        <LibraryPanel
          insects={INSECTS}
          activeId={activeId}
          onSelect={select}
          onViewAll={() => setGalleryOpen(true)}
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
        peers={INSECTS}
        onCompare={toggleCompare}
        onDiscover={setDiscovery}
        onExplore={() => setGalleryOpen(true)}
      />

      <div className="rail-float">
        <button onClick={() => setGalleryOpen(true)} title={`全部 ${INSECTS.length} 种`}>
          <IconGrid size={16} />
        </button>
        <button onClick={surprise} title="换一只看看">
          <IconSparkle size={16} />
        </button>
      </div>

      {galleryOpen && (
        <Gallery
          insects={INSECTS}
          activeId={activeId}
          onSelect={select}
          onClose={() => setGalleryOpen(false)}
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
