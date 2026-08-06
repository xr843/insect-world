import { useCallback, useEffect, useMemo, useState } from 'react'
import { INSECTS } from './data/insects'
import { BottomCards } from './components/BottomCards'
import { CompareSheet, Gallery } from './components/Gallery'
import { DetailPanel } from './components/DetailPanel'
import { LibraryPanel } from './components/LibraryPanel'
import { Stage } from './components/Stage'
import { TopBar } from './components/TopBar'
import { IconGrid, IconSparkle } from './components/icons'
import { prefetchInsectModel } from './three/registry'

export default function App() {
  const [activeId, setActiveId] = useState(INSECTS[0].id)
  const [galleryOpen, setGalleryOpen] = useState(false)
  const [compareWith, setCompareWith] = useState<string | null>(null)

  const insect = useMemo(
    () => INSECTS.find((i) => i.id === activeId) ?? INSECTS[0],
    [activeId],
  )

  const select = useCallback((id: string) => {
    setActiveId(id)
    // 顺手预热相邻物种，用户往下点时几乎无等待
    const idx = INSECTS.findIndex((i) => i.id === id)
    for (const n of [idx + 1, idx - 1]) {
      if (INSECTS[n]) prefetchInsectModel(INSECTS[n].id)
    }
  }, [])

  const openCompare = useCallback(() => {
    const other = INSECTS.find((i) => i.id !== activeId)
    setCompareWith(other ? other.id : null)
  }, [activeId])

  const step = useCallback(
    (delta: number) => {
      const idx = INSECTS.findIndex((i) => i.id === activeId)
      const next = INSECTS[(idx + delta + INSECTS.length) % INSECTS.length]
      select(next.id)
    },
    [activeId, select],
  )

  // 上下键翻图鉴。逐只看过去是这个产品的主要用法，不该每次都回去点列表。
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null
      if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable)) return
      if (galleryOpen || compareWith) return
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
  }, [step, galleryOpen, compareWith])

  const surprise = useCallback(() => {
    const others = INSECTS.filter((i) => i.id !== activeId)
    // 用当前索引推进而非 Math.random：连点两次不会撞回同一只
    const pick = others[(INSECTS.findIndex((i) => i.id === activeId) * 5 + 3) % others.length]
    select(pick.id)
  }, [activeId, select])

  return (
    <div className="app">
      <TopBar insects={INSECTS} onPick={select} />

      <main className="workbench">
        <LibraryPanel
          insects={INSECTS}
          activeId={activeId}
          onSelect={select}
          onViewAll={() => setGalleryOpen(true)}
        />
        <Stage insect={insect} onCompare={openCompare} />
        <DetailPanel
          insect={insect}
          onCompare={openCompare}
          onLesson={() => setGalleryOpen(true)}
        />
      </main>

      <BottomCards
        insect={insect}
        peers={INSECTS}
        onCompare={openCompare}
        onLesson={() => setGalleryOpen(true)}
      />

      <div className="rail-float">
        <button onClick={() => setGalleryOpen(true)} title="全部 12 种">
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

      {compareWith && (
        <CompareSheet
          insects={INSECTS}
          leftId={activeId}
          rightId={compareWith}
          onPickRight={setCompareWith}
          onClose={() => setCompareWith(null)}
        />
      )}
    </div>
  )
}
