import { useCallback, useEffect, useRef, useState } from 'react'
import type { Insect } from '../data/types'
import { InsectCanvas, type ViewMode } from '../three/InsectCanvas'
import { CompareBar } from './CompareBar'
import {
  IconBox,
  IconIsolate,
  IconLayers,
  IconReset,
  IconRotate,
  IconSection,
  IconZoom,
} from './icons'
import s from './Stage.module.css'

export function Stage({
  insect,
  compareWith,
  onCompareToggle,
  onCompareCycle,
  focusAnchor = null,
}: {
  insect: Insect
  /** 非 null 时展台底部浮出对比条 */
  compareWith: Insect | null
  onCompareToggle: () => void
  onCompareCycle: () => void
  /** 讲解弹窗下发的镜头指令 */
  focusAnchor?: string | null
}) {
  const [mode, setMode] = useState<ViewMode>('normal')
  /**
   * 自动旋转默认开，但访客的系统若声明了「减少动态效果」，就以关闭起步 ——
   * CSS 动画有全局的 prefers-reduced-motion 规则兜着，这个 WebGL 旋转
   * 是 JS 驱动的，媒体查询管不到它，只能在这里问一次。
   * 开关仍在界面上，想看转的随时可以打开。
   */
  const [spin, setSpin] = useState(
    () => !window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  )
  const [openHotspot, setOpenHotspot] = useState<string | null>(null)
  const [zoomNonce, setZoomNonce] = useState(0)
  const [resetNonce, setResetNonce] = useState(0)
  const [status, setStatus] = useState<{ loading: boolean; error: string | null }>({
    loading: true,
    error: null,
  })

  /**
   * 展台滚出视口就停掉渲染循环。
   *
   * 手机上整页竖排，用户在下面读图鉴数据时展台还在每帧画 —— 白烧 GPU，
   * 滚动因此发涩。留 15% 的余量，刚露头就恢复，肉眼看不出启停。
   */
  const wrapRef = useRef<HTMLDivElement>(null)
  const [inView, setInView] = useState(true)
  useEffect(() => {
    const el = wrapRef.current
    if (!el || typeof IntersectionObserver === 'undefined') return
    const ob = new IntersectionObserver(([e]) => setInView(e.isIntersecting), { threshold: 0.15 })
    ob.observe(el)
    return () => ob.disconnect()
  }, [])

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
      {/* 无障碍名挂在包装层：r3f v8 的 Canvas 会把未知 props 当 root 配置吞掉，
          挂上去整个 3D 子树都不渲染（实测踩过） */}
      <div
        className={s.canvasWrap}
        ref={wrapRef}
        role="img"
        aria-label={`${insect.name}的可交互三维标本：拖动旋转，滚轮缩放，点击彩色圆点认识部位`}
      >
        <InsectCanvas
          active={inView}
          insect={insect}
          mode={mode}
          spin={spin}
          openHotspot={openHotspot}
          onToggleHotspot={setOpenHotspot}
          zoomNonce={zoomNonce}
          resetNonce={resetNonce}
          focusAnchor={focusAnchor}
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
        <button className={s.tool} data-active={compareWith !== null} onClick={onCompareToggle}>
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

      <div className={s.caption}>
        <div className={s.captionLatin}>{insect.latin}</div>
        <div className={s.captionHint}>拖动旋转 · 滚轮细看 · 圆点＝观察点</div>
      </div>

      {compareWith && (
        <CompareBar
          left={insect}
          right={compareWith}
          onCycle={onCompareCycle}
          onClose={onCompareToggle}
        />
      )}

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
