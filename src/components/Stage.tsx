import { Component, useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import type { Insect } from '../data/types'
import { InsectCanvas, type ViewMode } from '../three/InsectCanvas'
import { prefetchInsectModel } from '../three/registry'
import { webglAvailable } from '../three/webgl'
import { EVENTS, track, type StageTool } from '../analytics'
import { pmark } from '../perf'
import { CompareBar } from './CompareBar'
import { InsectGlyph } from './InsectGlyph'
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
import { useLabels, useT } from '../i18n/useT'

/**
 * 3D 画布的错误边界。
 *
 * webglAvailable() 只挡得住「探测得到」的不可用；还有一类是探测通过、
 * 真建的时候才炸（显存耗尽、上下文数量到顶），three 的构造器直接 throw，
 * 函数组件接不住，只有 class 边界能接。接住后通知 Stage 换剪影兜底 ——
 * 没有这层，整个 React 树连着右栏的图鉴文字一起白屏。
 */
class CanvasBoundary extends Component<{ onFail: () => void; children: ReactNode }> {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  componentDidCatch() {
    this.props.onFail()
  }
  render() {
    return this.state.failed ? null : this.props.children
  }
}

export function Stage({
  insect,
  compareWith,
  onCompareToggle,
  onCompareCycle,
  focusAnchor = null,
  theme = 'dark',
}: {
  insect: Insect
  /** 非 null 时展台底部浮出对比条 */
  compareWith: Insect | null
  onCompareToggle: () => void
  onCompareCycle: () => void
  /** 讲解弹窗下发的镜头指令 */
  focusAnchor?: string | null
  /** 明暗主题：透传给 3D 场景定轮廓光档位与落影颜色 */
  theme?: 'dark' | 'light'
}) {
  const t = useT()
  const labels = useLabels()
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
   * WebGL 兜底两件套：
   * webglDead —— 建不起上下文（远程桌面、驱动黑名单、关了硬件加速），
   *   一次性判定 + 错误边界补漏，展台改摆该物种的 SVG 剪影；
   * glLost —— 建起来之后半路丢了（GPU 重置、移动端后台挤占），canvas
   *   保持挂载等浏览器发恢复事件，其间盖一层提示，恢复即撤。
   */
  const [webglDead, setWebglDead] = useState(() => !webglAvailable())
  const [glLost, setGlLost] = useState(false)

  /**
   * 首屏物种的 chunk 下载与几何构建，在 Stage **第一次渲染时**就发起，不等 WebGL 上下文。
   *
   * 原先这件事挂在 Scene 的 effect 上，也就是排在「React 挂载完 → r3f 量到容器尺寸
   * → 建 WebGL 上下文 → onCreated」**之后**（实测这一段 300~380ms）。而 chunk 下载
   * 是纯网络等待，本来可以和那一段重叠。实测「GL 就绪→模型就绪」这一段
   * 桌面热缓存 186→5ms、移动 slow-4G 冷缓存 1066→42ms，端到端首帧桌面热缓存
   * 约 1.6s→1.2s（方法与全部分段见 docs/perf-notes.md）。
   *
   * ⚠️ 几何构建本身是同步的主线程活儿，提前只是换了个位置、省不掉 —— 这里省的是
   * **网络那一段**加上等上下文时的一点主线程空转，别指望它能把 builder 变快。
   *
   * 放在 webglDead 判定之后：建不起上下文的机器只会看到 SVG 剪影兜底页，
   * 没必要为它下载并构建两万多面的几何。useState 的惰性初始化 = 只在首次渲染跑一次，
   * registry 自带按 id 去重与在途合并，稍后 Scene 再要同一只虫拿到的是同一个 promise。
   */
  useState(() => {
    if (!webglDead) prefetchInsectModel(insect.id)
    return null
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
   *
   * ⚠️ **首屏这一次不延迟**（`first.current`）。首屏必然要等一秒以上
   * （线上实测热缓存约 2.2s、冷缓存约 3.7s，分段见 docs/perf-notes.md），
   * 延迟只是让空展台多空 180ms。第二只虫起才有「可能瞬时」这回事。
   */
  const first = useRef(true)
  const [showLoading, setShowLoading] = useState(false)
  useEffect(() => {
    if (!status.loading) {
      first.current = false
      setShowLoading(false)
      return
    }
    if (first.current) {
      setShowLoading(true)
      pmark('stage-placeholder')
      return
    }
    const timer = window.setTimeout(() => setShowLoading(true), 180)
    return () => window.clearTimeout(timer)
  }, [status.loading])

  const toggleMode = (m: ViewMode) => setMode((cur) => (cur === m ? 'normal' : m))

  /** 工具条六个按钮共用同一条埋点，「对比」不算在内 —— 它换的是物种，
      走 App.tsx 里的 species_switch(source:'compare')，见 analytics.ts 的注释 */
  const clickTool = (tool: StageTool) => track(EVENTS.STAGE_TOOL, { tool })

  return (
    <section className={`card stage-height ${s.stage}`}>
      {/* 无障碍名挂在包装层：r3f v8 的 Canvas 会把未知 props 当 root 配置吞掉，
          挂上去整个 3D 子树都不渲染（实测踩过）。
          剪影兜底时不挂 role="img"：那个 aria-label 承诺「可拖动可缩放」，
          兜底页做不到，让可见文字自己说话。 */}
      <div
        className={s.canvasWrap}
        ref={wrapRef}
        {...(webglDead
          ? {}
          : { role: 'img', 'aria-label': t('stage.canvasLabel', { name: insect.name }) })}
      >
        {webglDead ? (
          <div className={s.glyphFallback}>
            <InsectGlyph id={insect.id} size={120} color={insect.accent} />
            <p className={s.fallbackNote}>{t('stage.noWebgl')}</p>
          </div>
        ) : (
          <CanvasBoundary onFail={() => setWebglDead(true)}>
            <InsectCanvas
              active={inView}
              insect={insect}
              mode={mode}
              spin={spin}
              openHotspot={openHotspot}
              onToggleHotspot={(id) => {
                // 只有真的打开了某个标注点才算一次点击；传 null 是关掉
                // （再点一次同一个点、或点在模型外），不该也记一条
                if (id) {
                  const anchor = insect.hotspots.find((h) => h.id === id)?.anchor ?? id
                  track(EVENTS.HOTSPOT_CLICK, { anchor })
                }
                setOpenHotspot(id)
              }}
              zoomNonce={zoomNonce}
              resetNonce={resetNonce}
              focusAnchor={focusAnchor}
              theme={theme}
              onStatus={onStatus}
              onContextLoss={setGlLost}
            />
          </CanvasBoundary>
        )}
      </div>

      <div className={s.orderTag}>
        <span className={s.orderDot} style={{ background: insect.accent }} />
        {labels.order[insect.order]}
        <span style={{ color: 'var(--muted)' }}>·</span>
        <span style={{ color: 'var(--muted)' }}>{labels.metamorphosis[insect.metamorphosis]}</span>
      </div>

      {/* 工具条整条随 WebGL 一起撤：旋转/剖切/聚焦全是对着 canvas 说话的，
          兜底页上留一排按不动的按钮比没有更糟（本站原则：不留只有样子的按钮） */}
      {!webglDead && <div className={s.rail}>
        <button
          className={s.tool}
          data-active={spin}
          onClick={() => {
            clickTool('rotate')
            setSpin((v) => !v)
          }}
        >
          <IconRotate size={17} />
          <span className={s.toolLabel}>{t('stage.tool.rotate')}</span>
        </button>
        <button
          className={s.tool}
          onClick={() => {
            clickTool('zoom')
            setZoomNonce((n) => n + 1)
          }}
        >
          <IconZoom size={17} />
          <span className={s.toolLabel}>{t('stage.tool.zoom')}</span>
        </button>
        <button
          className={s.tool}
          data-active={mode === 'isolate'}
          onClick={() => {
            clickTool('focus')
            toggleMode('isolate')
          }}
        >
          <IconIsolate size={17} />
          <span className={s.toolLabel}>{t('stage.tool.focus')}</span>
        </button>
        <button
          className={s.tool}
          data-active={mode === 'section'}
          onClick={() => {
            clickTool('section')
            toggleMode('section')
          }}
        >
          <IconSection size={17} />
          <span className={s.toolLabel}>{t('stage.tool.section')}</span>
        </button>
        <button
          className={s.tool}
          data-active={mode === 'layers'}
          onClick={() => {
            clickTool('layers')
            toggleMode('layers')
          }}
        >
          <IconLayers size={17} />
          <span className={s.toolLabel}>{t('stage.tool.layers')}</span>
        </button>
        <button className={s.tool} data-active={compareWith !== null} onClick={onCompareToggle}>
          <IconBox size={17} />
          <span className={s.toolLabel}>{t('stage.tool.compare')}</span>
        </button>
        <div className={s.railSplit} />
        <button
          className={s.tool}
          onClick={() => {
            clickTool('reset')
            setResetNonce((n) => n + 1)
            setMode('normal')
            setOpenHotspot(null)
          }}
        >
          <IconReset size={17} />
          <span className={s.toolLabel}>{t('stage.tool.reset')}</span>
        </button>
      </div>}

      <div className={s.caption}>
        <div className={s.captionLatin}>{insect.latin}</div>
        {/* 「拖动旋转 · 滚轮细看」在剪影兜底页上是一句谎话，撤掉；学名照留 */}
        {!webglDead && <div className={s.captionHint}>{t('stage.captionHint')}</div>}
      </div>

      {compareWith && (
        <CompareBar
          left={insect}
          right={compareWith}
          onCycle={onCompareCycle}
          onClose={onCompareToggle}
        />
      )}

      {/* 兜底页上不转加载圈：canvas 压根没挂载，status 永远停在 loading */}
      {!webglDead && (showLoading || status.error) && (
        <div className={s.status}>
          {status.error ? (
            <div className={s.error}>{t('stage.error', { error: status.error })}</div>
          ) : (
            /**
             * 加载态先摆一张该物种的剪影 —— 不是装饰，是本轮性能测量的结论。
             *
             * 首帧真实耗时压不到一秒以内：线上热缓存约 2.2s、冷缓存约 3.7s，
             * 其中网络 ~0.9s 与 builder ~0.5s 都动不了（分段见 docs/perf-notes.md）。
             * 既然等待去不掉，就别让展台在这一两秒里**完全空着** —— 剪影跟着首屏
             * 内容一起就位：「展台上第一次出现这只虫的形状」实测从 1592ms 提到
             * 220ms（无头桌面热缓存），真机上落在 542ms。立体标本长出来就换掉它。
             * 用的是 InsectGlyph 里现成的 24×24 剪影，零新增资产。
             */
            <div className={s.spinner}>
              <span className={s.developing}>
                <InsectGlyph id={insect.id} size={96} color={insect.accent} />
              </span>
              {t('stage.loading', { name: insect.name })}
            </div>
          )}
        </div>
      )}

      {/* 上下文丢失：canvas 还挂着（等浏览器发恢复事件），先盖一层说明。
          恢复不是必然会来的 —— 有的驱动崩掉就不吭声了，所以给一个重载按钮 */}
      {!webglDead && glLost && (
        <div className={s.status}>
          <div className={s.lostCard}>
            {t('stage.glLost')}
            <button className={s.reload} onClick={() => location.reload()}>
              {t('stage.reload')}
            </button>
          </div>
        </div>
      )}
    </section>
  )
}
