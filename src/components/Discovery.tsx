/**
 * 讲解弹窗（对应参考站的 "Guided discovery"）。
 *
 * 沿用参考站的外壳与位置，内容按本项目的交互原则做实：
 * - 讲解分成 3~4 步，每步可以把 3D 镜头移到对应部位上（onFocusAnchor）
 * - 小测是真能作答的，选完给出对错与解释，并统计得分
 */
import { useCallback, useEffect, useState } from 'react'
import type { Guide, Insect } from '../data/types'
import { useLabels, useT } from '../i18n/useT'
import { InsectGlyph } from './InsectGlyph'
import { IconArrowRight, IconGlobe, IconPlay, IconQuiz, IconSparkle } from './icons'
import s from './Discovery.module.css'
import { EVENTS, track } from '../analytics'
import { builtStagesOf, metamorphosisOf, type LifeStage } from '../three/stages'

/**
 * 阶段名的兜底键。正常走 `insect.lifecycle` —— 那是 63 种逐条写的、带物种细节的
 * 本地化标签（「幼虫（三龄，8–10个月）」这种）。只有它与路线长度对不上时才落到
 * 这份通用词：错位显示比笼统显示更糟，宁可笼统。
 *
 * 走 i18n 键而不是写死中文 —— `__tests__/no-hardcoded-cjk.test.ts` 会拦，
 * 而且它拦得对：界面层写死中文，英文版就会露出中文。
 */
const STAGE_KEY = {
  egg: 'discovery.stage.egg',
  larva: 'discovery.stage.larva',
  pupa: 'discovery.stage.pupa',
  nymph: 'discovery.stage.nymph',
  adult: 'discovery.stage.adult',
} as const satisfies Record<LifeStage, string>

export type DiscoveryKind = 'lesson' | 'motion' | 'quiz' | 'habitat' | 'lifecycle'

const BADGE = {
  lesson: IconSparkle,
  motion: IconPlay,
  quiz: IconQuiz,
  habitat: IconGlobe,
  lifecycle: IconPlay,
} as const

export function Discovery({
  kind,
  insect,
  guide,
  onClose,
  onFocusAnchor,
  onLifeStage,
}: {
  kind: DiscoveryKind
  insect: Insect
  guide: Guide | undefined
  onClose: () => void
  /** 把镜头移到某个部位；传 null 表示回到全身取景 */
  onFocusAnchor: (anchor: string | null) => void
  /**
   * 把展台换成某个生活史阶段的标本；传 null 回到成虫。
   *
   * 与 `onFocusAnchor` 是同一条通路、同一个形状：**弹窗翻页驱动展台，
   * 展台不反过来知道弹窗的存在**。生活史沿用这条既有通路，不另起一套
   * 并行的 UI 架构。
   */
  onLifeStage: (stage: LifeStage | null) => void
}) {
  const t = useT()
  const labels = useLabels()
  const [step, setStep] = useState(0)
  // 作答槽位按实际题数开，写死长度会在题数不是 2 时错位
  const [picked, setPicked] = useState<(number | null)[]>(() =>
    Array.from({ length: guide?.quiz.length ?? 0 }, () => null),
  )

  // 关弹窗时必须解除镜头锁定与阶段替换，否则 3D 会一直停在最后讲到的部位、
  // 或者一直摆着那颗卵 —— 弹窗关了而展台没回位，是最让人摸不着头脑的一种残留
  const close = useCallback(() => {
    onFocusAnchor(null)
    onLifeStage(null)
    onClose()
  }, [onClose, onFocusAnchor, onLifeStage])

  /**
   * 打开埋点：App.tsx 用 `{discovery && <Discovery .../>}` 控制这个组件的
   * 有无，每次打开都是全新挂载、关掉即卸载 —— 挂载的时机就是「打开」这个
   * 动作本身，一次性 effect 精确对应一次打开，不用去 App.tsx 里到处找
   * setDiscovery(...) 的调用点。
   */
  /**
   * 生活史弹窗一打开就要把展台换成**第一步**的标本。
   *
   * 不加这一下的后果是个很隐蔽的 bug：翻页才调 `onLifeStage`，而弹窗是停在
   * 第 0 步打开的 —— 于是文字讲着「卵」，展台上还摆着成虫，要点一次「下一步」
   * 再点回来才对得上。实测抓出来的（端到端里卵的 chunk 从没被下载过）。
   *
   * 放在这里而不是生活史那个分支里：hooks 不能条件调用，分支在渲染函数后半段。
   */
  useEffect(() => {
    if (kind !== 'lifecycle') return
    const route = metamorphosisOf(insect.id)
    const first = route?.[0]
    if (first && first !== 'adult' && builtStagesOf(insect.id).includes(first)) onLifeStage(first)
    // 只在打开时跑一次；后续换步由 goTo 驱动
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    track(EVENTS.DISCOVERY_OPEN, { kind })
    // kind 在这个组件实例的生命周期内不会变（换 kind 走的是整体重新挂载），故意留空依赖
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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

  /**
   * 小测的题目/完成态/得分提到组件顶层算，供下面的埋点 effect 用 ——
   * Hooks 不能塞进 `if (kind === 'quiz')` 里面才调用（换 kind 换 step 数会
   * 打乱调用顺序），所以这几个原本在 quiz 分支局部算的值搬到这里，
   * 与 lesson 分支的 steps/current 同等对待。kind !== 'quiz' 时也会算，
   * 但都是几个数组方法，成本可以忽略。
   */
  const qs = guide?.quiz ?? []
  const quizDone = qs.length > 0 && picked.every((p) => p !== null)
  const score = picked.filter((p, i) => p !== null && p === qs[i]?.answer).length

  // 小测答完（每题都选了）时报一次最终得分；quizDone 从 false 变 true 那一刻只触发一次
  useEffect(() => {
    if (kind === 'quiz' && quizDone) track(EVENTS.QUIZ_SCORE, { score, total: qs.length })
    // score/qs 在 quizDone 变 true 的那一刻已经稳定，不需要单独进依赖
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kind, quizDone])

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
    // 这一层不再吃指针事件（见 Discovery.module.css）：讲解开着时台面照样能转，
    // 所以也没有「点遮罩关闭」了 —— 关闭走右上角 × 或 Esc。
    <div className={s.backdrop}>
      <div className={s.sheet} data-wide={wide}>
        <button className={s.close} onClick={close} aria-label={t('common.close')}>
          ×
        </button>
        <span className={s.badge}>
          <Badge size={21} />
        </span>
        <div className={s.kicker}>{t('discovery.kicker')}</div>
        {children}
        {/*
          AI 声明贴在讲解正下方，而不是塞进页脚 —— 声明离被声明的对象越远
          越没用。这里是全站长篇讲解文字唯一出现的地方，四个变体共用这个
          shell，所以一处插入就覆盖讲解/动态/小测/栖境全部。
        */}
        <p className={s.disclaimer}>{t('discovery.disclaimer')}</p>
      </div>
    </div>
  )

  // ---------------------------------------------------------------- 缺内容兜底
  if (!guide) {
    return shell(
      <>
        <h2 className={s.title}>{insect.name}</h2>
        <p className={s.body}>{t('discovery.noContent')}</p>
        <div className={s.actions}>
          <button className={s.primary} onClick={close}>
            {t('common.backToSpecimen')}
            <IconArrowRight size={15} />
          </button>
        </div>
      </>,
    )
  }

  // ---------------------------------------------------------------- 分步讲解
  if (kind === 'lesson') {
    const last = step >= steps.length - 1
    /**
     * 前进/后退共用这一个：先报「翻到了第几步」（1 起数，目标步而不是
     * 当前步）再真的翻页。track 是普通语句、不放进 setStep 的函数式更新
     * 里 —— 和 App.tsx 里 toggleCompare 那条注释同一个理由，避免 React 18
     * StrictMode 在开发环境重放 updater 时把埋点也重放一遍。
     */
    const goTo = (nextStep: number) => {
      track(EVENTS.LESSON_STEP, { step: nextStep + 1, total: steps.length })
      setStep(nextStep)
    }
    return shell(
      <>
        <h2 className={s.title}>{current?.title ?? insect.name}</h2>
        <div className={s.stepMeta}>
          {t('discovery.stepOf', { cur: step + 1, total: steps.length, name: insect.name })}
        </div>
        <p className={s.stepBody}>{current?.body}</p>
        {current?.anchor && (
          <span className={s.anchorHint}>
            {t('discovery.anchorHint', {
              label: insect.hotspots.find((h) => h.anchor === current.anchor)?.label ?? current.anchor,
            })}
          </span>
        )}
        <div className={s.steps}>
          {steps.map((st, i) => (
            <span key={st.title} className={s.stepDot} data-on={i === step} />
          ))}
        </div>
        <div className={s.actions}>
          <button className={s.secondary} onClick={() => goTo(step - 1)} disabled={step === 0}>
            {t('discovery.back')}
          </button>
          <button
            className={s.primary}
            onClick={() => {
              if (last) {
                track(EVENTS.LESSON_COMPLETE, { total: steps.length })
                close()
              } else {
                goTo(step + 1)
              }
            }}
          >
            {last ? t('discovery.done') : t('discovery.next')}
            <IconArrowRight size={15} />
          </button>
        </div>
      </>,
    )
  }

  // ---------------------------------------------------------------- 生活史
  if (kind === 'lifecycle') {
    /**
     * 阶段序列直接取自 `three/stages.ts` 的路线判定 —— 那边是**按物种实际
     * 做了哪些阶段模型反推**变态类型的（有蛹=完全变态、有若虫=不完全变态），
     * 不另设一张表。表与文件两处都能改，迟早对不上。
     */
    const route = metamorphosisOf(insect.id)
    const built = new Set(builtStagesOf(insect.id))
    if (!route) {
      return shell(
        <>
          <h2 className={s.title}>{t('discovery.lifecycle.title', { name: insect.name })}</h2>
          <p className={s.stepBody}>{t('discovery.noContent')}</p>
        </>,
      )
    }
    /**
     * 阶段名直接用 `insect.lifecycle` —— 它本来就是**按路线顺序排好的、
     * 本地化的、带物种细节的**标签（如「幼虫（三龄，8–10个月）」），
     * 比任何通用词都具体。长度对不上时退回通用词而不是错位显示：
     * 数据是 63 种逐条写的，个别不合拍是可能的，错位比笼统更糟。
     */
    const stageLabels =
      insect.lifecycle.length === route.length
        ? insect.lifecycle
        : route.map((st) => t(STAGE_KEY[st]))
    const cur = route[Math.min(step, route.length - 1)]
    const last = step >= route.length - 1
    /**
     * 成虫也算「台上有标本」—— 它走的是常规物种注册表，不在 `built` 里，
     * 但展台上确确实实摆着它。第一版写成 `cur !== 'adult' && built.has(cur)`，
     * 于是最后一步提示「这一阶段没有立体标本」，而那只成虫就在旁边转着，
     * 自相矛盾（端到端截图里一眼看出来的）。
     */
    const hasModel = cur === 'adult' || built.has(cur)
    const goTo = (next: number) => {
      const target = route[next]
      track(EVENTS.LESSON_STEP, { step: next + 1, total: route.length })
      // 成虫这一步回到常规模型；其余步换成该阶段的标本（没做模型的也回成虫）
      onLifeStage(target === 'adult' || !built.has(target) ? null : target)
      setStep(next)
    }
    return shell(
      <>
        <h2 className={s.title}>{t('discovery.lifecycle.title', { name: insect.name })}</h2>
        <div className={s.stepMeta}>
          {t('discovery.lifecycle.stepOf', {
            cur: step + 1,
            total: route.length,
            type: labels.metamorphosis[insect.metamorphosis],
          })}
        </div>
        <p className={s.stepBody}>{stageLabels[step]}</p>
        <p className={s.stepBody}>
          {t(
            insect.metamorphosis === 'complete'
              ? 'discovery.lifecycle.holoNote'
              : 'discovery.lifecycle.hemiNote',
          )}
        </p>
        <span className={s.anchorHint}>
          {t(hasModel ? 'discovery.lifecycle.onStage' : 'discovery.lifecycle.noModel')}
        </span>
        <div className={s.steps}>
          {route.map((st, i) => (
            <span key={st} className={s.stepDot} data-on={i === step} />
          ))}
        </div>
        <div className={s.actions}>
          <button className={s.secondary} onClick={() => goTo(step - 1)} disabled={step === 0}>
            {t('discovery.back')}
          </button>
          <button
            className={s.primary}
            onClick={() => {
              if (last) {
                track(EVENTS.LESSON_COMPLETE, { total: route.length })
                close()
              } else {
                goTo(step + 1)
              }
            }}
          >
            {last ? t('discovery.done') : t('discovery.next')}
            <IconArrowRight size={15} />
          </button>
        </div>
      </>,
    )
  }

  // ---------------------------------------------------------------- 小测
  if (kind === 'quiz') {
    const q = qs[step]
    if (!q) {
      return shell(
        <>
          <h2 className={s.title}>{t('quiz.title', { name: insect.name })}</h2>
          <p className={s.body}>{t('quiz.noContent')}</p>
          <div className={s.actions}>
            <button className={s.primary} onClick={close}>
              {t('common.backToSpecimen')}
              <IconArrowRight size={15} />
            </button>
          </div>
        </>,
      )
    }
    const chosen = picked[step]
    const answered = chosen !== null

    return shell(
      <>
        <h2 className={s.title}>{t('quiz.title', { name: insect.name })}</h2>
        <div className={s.stepMeta}>{t('quiz.stepOf', { cur: step + 1, total: qs.length })}</div>
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
                onClick={() => {
                  track(EVENTS.QUIZ_ANSWER, { correct: i === q.answer })
                  setPicked((prev) => prev.map((p, k) => (k === step ? i : p)))
                }}
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
        {quizDone && (
          <div className={s.score}>{t('quiz.score', { score, total: qs.length })}</div>
        )}
        <div className={s.actions}>
          <button className={s.secondary} onClick={() => setStep((i) => i - 1)} disabled={step === 0}>
            {t('quiz.back')}
          </button>
          <button
            className={s.primary}
            onClick={() => (step >= qs.length - 1 ? close() : setStep((i) => i + 1))}
            disabled={!answered}
          >
            {step >= qs.length - 1 ? t('quiz.finish') : t('quiz.next')}
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
          {t('common.backToSpecimen')}
          <IconArrowRight size={15} />
        </button>
      </div>
    </>,
  )
}
