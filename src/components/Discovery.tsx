/**
 * 讲解弹窗（对应参考站的 "Guided discovery"）。
 *
 * 参考站的四个变体都是同一段静态文字，点选项也没有任何反馈。
 * 这里保留它的外壳与视觉，但把内容做实：
 * - 讲解分成 3~4 步，每步可以把 3D 镜头移到对应部位上（onFocusAnchor）
 * - 小测是真能作答的，选完给出对错与解释，并统计得分
 */
import { useCallback, useEffect, useState } from 'react'
import type { Guide, Insect } from '../data/types'
import { InsectGlyph } from './InsectGlyph'
import { IconArrowRight, IconGlobe, IconPlay, IconQuiz, IconSparkle } from './icons'
import s from './Discovery.module.css'

export type DiscoveryKind = 'lesson' | 'motion' | 'quiz' | 'habitat'

const BADGE = {
  lesson: IconSparkle,
  motion: IconPlay,
  quiz: IconQuiz,
  habitat: IconGlobe,
} as const

export function Discovery({
  kind,
  insect,
  guide,
  onClose,
  onFocusAnchor,
}: {
  kind: DiscoveryKind
  insect: Insect
  guide: Guide | undefined
  onClose: () => void
  /** 把镜头移到某个部位；传 null 表示回到全身取景 */
  onFocusAnchor: (anchor: string | null) => void
}) {
  const [step, setStep] = useState(0)
  // 作答槽位按实际题数开，写死长度会在题数不是 2 时错位
  const [picked, setPicked] = useState<(number | null)[]>(() =>
    Array.from({ length: guide?.quiz.length ?? 0 }, () => null),
  )

  // 关弹窗时必须解除镜头锁定，否则 3D 会一直停在最后讲到的部位上
  const close = useCallback(() => {
    onFocusAnchor(null)
    onClose()
  }, [onClose, onFocusAnchor])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close()
    }
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [close])

  const steps = guide?.lesson ?? []
  const current = steps[step]

  // 讲到哪一步，镜头就跟到哪个部位
  useEffect(() => {
    if (kind !== 'lesson') return
    onFocusAnchor(current?.anchor ?? null)
  }, [kind, current, onFocusAnchor])

  const Badge = BADGE[kind]

  const portrait = (
    <span
      className={s.figure}
      style={{
        background: `radial-gradient(circle at 34% 26%, ${insect.accent}33, ${insect.accent}12 60%, var(--glyph-base) 100%)`,
      }}
    >
      <InsectGlyph id={insect.id} size={74} color={insect.accent} />
    </span>
  )

  const shell = (children: React.ReactNode, wide = false) => (
    <div className={s.backdrop} onClick={close}>
      <div className={s.sheet} data-wide={wide} onClick={(e) => e.stopPropagation()}>
        <button className={s.close} onClick={close} aria-label="关闭">
          ×
        </button>
        <span className={s.badge}>
          <Badge size={21} />
        </span>
        <div className={s.kicker}>跟着看</div>
        {children}
      </div>
    </div>
  )

  // ---------------------------------------------------------------- 缺内容兜底
  if (!guide) {
    return shell(
      <>
        <h2 className={s.title}>{insect.name}</h2>
        <p className={s.body}>这一种的讲解内容还在整理中。</p>
        <div className={s.actions}>
          <button className={s.primary} onClick={close}>
            回到标本
            <IconArrowRight size={15} />
          </button>
        </div>
      </>,
    )
  }

  // ---------------------------------------------------------------- 分步讲解
  if (kind === 'lesson') {
    const last = step >= steps.length - 1
    return shell(
      <>
        <h2 className={s.title}>{current?.title ?? insect.name}</h2>
        <div className={s.stepMeta}>
          第 {step + 1} / {steps.length} 步 · {insect.name}
        </div>
        <p className={s.stepBody}>{current?.body}</p>
        {current?.anchor && (
          <span className={s.anchorHint}>
            ◎ 镜头已移到「
            {insect.hotspots.find((h) => h.anchor === current.anchor)?.label ?? current.anchor}」
          </span>
        )}
        <div className={s.steps}>
          {steps.map((st, i) => (
            <span key={st.title} className={s.stepDot} data-on={i === step} />
          ))}
        </div>
        <div className={s.actions}>
          <button className={s.secondary} onClick={() => setStep((i) => i - 1)} disabled={step === 0}>
            上一步
          </button>
          <button
            className={s.primary}
            onClick={() => (last ? close() : setStep((i) => i + 1))}
          >
            {last ? '看完了' : '下一步'}
            <IconArrowRight size={15} />
          </button>
        </div>
      </>,
    )
  }

  // ---------------------------------------------------------------- 小测
  if (kind === 'quiz') {
    const qs = guide.quiz
    const q = qs[step]
    if (!q) {
      return shell(
        <>
          <h2 className={s.title}>{insect.name}小测</h2>
          <p className={s.body}>这一种的题目还在出。</p>
          <div className={s.actions}>
            <button className={s.primary} onClick={close}>
              回到标本
              <IconArrowRight size={15} />
            </button>
          </div>
        </>,
      )
    }
    const chosen = picked[step]
    const answered = chosen !== null
    const done = picked.every((p) => p !== null)
    const score = picked.filter((p, i) => p !== null && p === qs[i]?.answer).length

    return shell(
      <>
        <h2 className={s.title}>{insect.name}小测</h2>
        <div className={s.stepMeta}>
          第 {step + 1} / {qs.length} 题
        </div>
        <p className={s.question}>{q.question}</p>
        <div className={s.options}>
          {q.options.map((opt, i) => {
            let state: string | undefined
            if (answered) {
              if (i === q.answer) state = 'correct'
              else if (i === chosen) state = 'wrong'
              else state = 'dim'
            }
            return (
              <button
                key={opt}
                className={s.option}
                data-state={state}
                disabled={answered}
                onClick={() =>
                  setPicked((prev) => prev.map((p, k) => (k === step ? i : p)))
                }
              >
                {answered && (i === q.answer || i === chosen) && (
                  <span className={s.mark} data-kind={i === q.answer ? 'correct' : 'wrong'}>
                    {i === q.answer ? '✓' : '×'}
                  </span>
                )}
                {opt}
              </button>
            )
          })}
        </div>
        {answered && <div className={s.explain}>{q.explain}</div>}
        {done && (
          <div className={s.score}>
            答对 {score} / {qs.length}
          </div>
        )}
        <div className={s.actions}>
          <button className={s.secondary} onClick={() => setStep((i) => i - 1)} disabled={step === 0}>
            上一题
          </button>
          <button
            className={s.primary}
            onClick={() => (step >= qs.length - 1 ? close() : setStep((i) => i + 1))}
            disabled={!answered}
          >
            {step >= qs.length - 1 ? '结束' : '下一题'}
            <IconArrowRight size={15} />
          </button>
        </div>
      </>,
      true,
    )
  }

  // ---------------------------------------------------------------- 动态演示 / 栖境
  const panel = kind === 'motion' ? guide.motion : guide.habitat
  return shell(
    <>
      <h2 className={s.title}>{panel.title}</h2>
      <p className={s.body}>{panel.body}</p>
      {portrait}
      <div className={s.actions}>
        <button className={s.primary} onClick={close}>
          回到标本
          <IconArrowRight size={15} />
        </button>
      </div>
    </>,
  )
}
