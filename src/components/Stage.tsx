import { useCallback, useEffect, useState } from 'react'
import type { Insect } from '../data/types'
import { InsectCanvas, type ViewMode } from '../three/InsectCanvas'
import {
  IconBox,
  IconIsolate,
  IconLayers,
  IconReset,
  IconRotate,
  IconSection,
  IconSparkle,
  IconZoom,
} from './icons'
import s from './Stage.module.css'

export function Stage({
  insect,
  onCompare,
}: {
  insect: Insect
  onCompare: () => void
}) {
  const [mode, setMode] = useState<ViewMode>('normal')
  const [spin, setSpin] = useState(true)
  const [openHotspot, setOpenHotspot] = useState<string | null>(null)
  const [noteVisible, setNoteVisible] = useState(true)
  const [zoomNonce, setZoomNonce] = useState(0)
  const [resetNonce, setResetNonce] = useState(0)
  const [status, setStatus] = useState<{ loading: boolean; error: string | null }>({
    loading: true,
    error: null,
  })

  // 换物种时收起上一只虫的标注卡
  useEffect(() => {
    setOpenHotspot(null)
    setMode('normal')
  }, [insect.id])

  const onStatus = useCallback((next: { loading: boolean; error: string | null }) => {
    setStatus(next)
  }, [])

  /**
   * 加载提示延迟 180ms 再露面：模型按 id 缓存，切回看过的物种是瞬时的，
   * 立刻显示会让「正在生成…」闪一下就消失，比不显示更让人分神。
   */
  const [showLoading, setShowLoading] = useState(false)
  useEffect(() => {
    if (!status.loading) {
      setShowLoading(false)
      return
    }
    const t = window.setTimeout(() => setShowLoading(true), 180)
    return () => window.clearTimeout(t)
  }, [status.loading])

  const toggleMode = (m: ViewMode) => setMode((cur) => (cur === m ? 'normal' : m))

  return (
    <section className={`card stage-height ${s.stage}`}>
      <div className={s.canvasWrap}>
        <InsectCanvas
          insect={insect}
          mode={mode}
          spin={spin}
          openHotspot={openHotspot}
          onToggleHotspot={setOpenHotspot}
          zoomNonce={zoomNonce}
          resetNonce={resetNonce}
          onStatus={onStatus}
        />
      </div>

      <div className={s.orderTag}>
        <span className={s.orderDot} style={{ background: insect.accent }} />
        {insect.order}
        <span style={{ color: 'var(--muted)' }}>·</span>
        <span style={{ color: 'var(--muted)' }}>{insect.metamorphosis}</span>
      </div>

      <div className={s.rail}>
        <button className={s.tool} data-active={spin} onClick={() => setSpin((v) => !v)}>
          <IconRotate size={17} />
          <span className={s.toolLabel}>旋转</span>
        </button>
        <button className={s.tool} onClick={() => setZoomNonce((n) => n + 1)}>
          <IconZoom size={17} />
          <span className={s.toolLabel}>放大</span>
        </button>
        <button
          className={s.tool}
          data-active={mode === 'isolate'}
          onClick={() => toggleMode('isolate')}
        >
          <IconIsolate size={17} />
          <span className={s.toolLabel}>聚焦</span>
        </button>
        <button
          className={s.tool}
          data-active={mode === 'section'}
          onClick={() => toggleMode('section')}
        >
          <IconSection size={17} />
          <span className={s.toolLabel}>剖切</span>
        </button>
        <button
          className={s.tool}
          data-active={mode === 'layers'}
          onClick={() => toggleMode('layers')}
        >
          <IconLayers size={17} />
          <span className={s.toolLabel}>分层</span>
        </button>
        <button className={s.tool} onClick={onCompare}>
          <IconBox size={17} />
          <span className={s.toolLabel}>对比</span>
        </button>
        <div className={s.railSplit} />
        <button
          className={s.tool}
          onClick={() => {
            setResetNonce((n) => n + 1)
            setMode('normal')
            setOpenHotspot(null)
          }}
        >
          <IconReset size={17} />
          <span className={s.toolLabel}>复位</span>
        </button>
      </div>

      {noteVisible && (
        <div className={s.note}>
          <button className={s.noteClose} onClick={() => setNoteVisible(false)} aria-label="收起提示">
            ×
          </button>
          <div className={s.noteHead}>
            <IconSparkle size={12} />
            观察提示
          </div>
          <div className={s.noteBody}>
            <span>拖动可以转动虫体</span>
            <span>滚轮拉近细看</span>
            <span>点彩色圆点认识部位</span>
          </div>
        </div>
      )}

      <div className={s.caption}>
        <div className={s.captionEyebrow}>3D 标本 · 点击圆点探索</div>
        <div className={s.captionLatin}>{insect.latin}</div>
      </div>

      <button className={s.autoRotate} onClick={() => setSpin((v) => !v)}>
        <IconRotate size={13} />
        自动旋转
        <span className={s.switch} data-on={spin} />
      </button>

      {(showLoading || status.error) && (
        <div className={s.status}>
          {status.error ? (
            <div className={s.error}>
              这只虫的模型没能建起来：{status.error}
            </div>
          ) : (
            <div className={s.spinner}>
              <span className={s.spinnerRing} />
              正在生成 {insect.name} 的立体标本…
            </div>
          )}
        </div>
      )}
    </section>
  )
}
