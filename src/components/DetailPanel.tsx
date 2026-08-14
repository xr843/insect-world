import { useEffect, useRef, useState } from 'react'
import type { Insect } from '../data/types'
import type { DiscoveryKind } from './Discovery'
import { InsectGlyph } from './InsectGlyph'
import {
  FactIcon,
  IconArrowRight,
  IconBox,
  IconCheck,
  IconGlobe,
  IconLeaf,
  IconPlay,
  IconQuiz,
  IconShare,
  IconSparkle,
} from './icons'
import { fitName } from './fitName'
import s from './DetailPanel.module.css'
import { useT, useLocale } from '../i18n/useT'
import { canonicalPath } from '../i18n/hrefForLocale'
import { photoUrl } from '../data/external'
import { pinyinOf } from '../data/pinyin'

export function DetailPanel({
  insect,
  onCompare,
  onDiscover,
}: {
  insect: Insect
  onCompare: () => void
  onDiscover: (kind: DiscoveryKind) => void
}) {
  const t = useT()
  const locale = useLocale()
  // 拼音只在中文版有意义：英文读者要的是学名，注音反而是噪声
  const pinyin = locale === 'zh' ? pinyinOf(insect.id) : null

  /**
   * 分享当前物种。有系统分享面板（手机、部分桌面浏览器）就用它 ——
   * 那是能直达微信/短信的路；没有就复制规范链接并在按钮上亮 2 秒确认。
   * 分享的地址用 location.origin 拼规范路径，而不是照抄 location.href：
   * 当前地址可能带着 ?pdb=1 这类调试参数，别把它们转发出去。
   */
  const canShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function'
  const [copied, setCopied] = useState(false)
  const copyTimer = useRef<number>()
  useEffect(() => () => window.clearTimeout(copyTimer.current), [])
  const share = () => {
    const url = location.origin + canonicalPath(locale, insect.id)
    if (canShare) {
      // 用户在系统面板里点了取消会 reject（AbortError），不是故障，安静吞掉
      void navigator.share({ title: insect.name, url }).catch(() => {})
      return
    }
    void navigator.clipboard?.writeText(url).then(
      () => {
        setCopied(true)
        window.clearTimeout(copyTimer.current)
        copyTimer.current = window.setTimeout(() => setCopied(false), 2000)
      },
      () => {
        /* 剪贴板被拒就算了，不打断用户 */
      },
    )
  }
  return (
    <aside className={`card stage-height ${s.panel} detail-panel`} key={insect.id}>
      {/*
        标本印章挪到展签这一行 —— 名字要独占整行宽度才排得下。
        原先印章跟标题并排，留给标题的只有 160px，「双叉犀金龟」在 40px 下断成两行。
      */}
      <div className={s.head}>
        <div className={s.eyebrow}>
          <IconLeaf size={12} />
          {t('detail.eyebrow')}
        </div>
        <span
          className={s.portrait}
          style={{
            background: `radial-gradient(circle at 34% 26%, ${insect.accent}33, ${insect.accent}14 58%, var(--glyph-base) 100%)`,
          }}
        >
          <InsectGlyph id={insect.id} size={42} color={insect.accent} />
        </span>
      </div>

      <h1 className={s.title} {...fitName(insect.name)}>
        {insect.name}
      </h1>

      {/*
        名称拼音 —— 起因是「有拼音的话小孩子就可以自己看了」。
        放在大标题正下方、别称之上，那是读完名字视线自然落到的地方。
        只注名字不注正文：正文 7.2 万字，多音字自动判读必错（见 data/pinyin.ts）。
      */}
      {pinyin && <div className={s.pinyin}>{pinyin}</div>}
      <div className={s.epithet}>{insect.epithet}</div>
      <p className={s.summary}>{insect.summary}</p>

      <div className={s.rule} />
      <div className="eyebrow">{t('detail.facts')}</div>

      <div className={s.factList}>
        {insect.facts.map((f) => (
          <div className={s.fact} key={f.key}>
            <span className={s.factIcon}>
              <FactIcon kind={f.icon} size={13} />
            </span>
            <span className={s.factKey}>{f.key}</span>
            <span className={s.factValue}>{f.value}</span>
          </div>
        ))}
      </div>

      <div className={s.aside}>
        <span className={s.asideIcon}>
          <IconGlobe size={13} />
        </span>
        <span className={s.asideBody}>
          <div className={s.asideTitle}>{t('detail.ecology')}</div>
          <div className={s.asideText}>{insect.ecology}</div>
        </span>
      </div>

      <div className={s.aside}>
        <span className={s.asideIcon} style={{ color: 'var(--lavender)' }}>
          <IconSparkle size={13} />
        </span>
        <span className={s.asideBody}>
          <div className={s.asideTitle}>{t('detail.trivia')}</div>
          <div className={s.asideText}>{insect.trivia}</div>
        </span>
      </div>

      <div className={s.cycle}>
        {insect.lifecycle.map((step, i) => (
          <span key={step} style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
            <span className={s.cycleStep}>{step}</span>
            {i < insect.lifecycle.length - 1 && <span className={s.cycleArrow}>→</span>}
          </span>
        ))}
      </div>

      <div className={s.actions}>
        <button className={s.primary} onClick={() => onDiscover('lesson')}>
          {t('detail.readGuide')}
          <IconArrowRight size={15} />
        </button>
        <div className={s.pairRow}>
          <button className={s.ghost} onClick={() => onDiscover('motion')}>
            <IconPlay size={13} />
            {t('detail.motionDemo')}
          </button>
          <button className={s.ghost} onClick={() => onDiscover('quiz')}>
            <IconQuiz size={13} />
            {t('detail.quiz')}
          </button>
        </div>
        {/* 对比原先借用的是分享图标 —— 真的分享按钮来了，把它还回去，改用
            与展台工具条「对比」一致的方盒图标，免得两个按钮长一个样 */}
        <button className={`${s.ghost} ${s.wide}`} onClick={onCompare}>
          <IconBox size={13} />
          {t('detail.compareOthers')}
        </button>
        <button className={`${s.ghost} ${s.wide} ${s.share}`} onClick={share} data-copied={copied || undefined}>
          {copied ? <IconCheck size={13} /> : <IconShare size={13} />}
          {copied ? t('detail.linkCopied') : canShare ? t('detail.share') : t('detail.copyLink')}
        </button>
        {/*
          实物照片放在按钮组而不是下面的 meta 区：那三行（分布/现状/近缘）是静态属性，
          这一条是**动作**，性质不同。而且本项目的模型是程序生成的、写实度有上限，
          「想看真长什么样」是真实需求（linux.do 佬友明确提过），埋在灰字里等于没有。
          用 --brass 与站内按钮区分，配外链箭头，让人点之前就知道会离开本站。
          没有对应 taxon 记录的物种不渲染此按钮，见 data/external.ts。
        */}
        {photoUrl(insect.id) && (
          <a
            className={`${s.ghost} ${s.wide} ${s.external}`}
            href={photoUrl(insect.id) as string}
            target="_blank"
            rel="noopener noreferrer"
          >
            <IconGlobe size={13} />
            {t('detail.photosLink')}
            <IconArrowRight size={12} />
          </a>
        )}
      </div>

      <div className={s.meta}>
        <div className={s.metaRow}>
          <span className={s.metaKey}>{t('detail.range')}</span>
          <span className={s.metaValue}>{insect.range}</span>
        </div>
        <div className={s.metaRow}>
          <span className={s.metaKey}>{t('detail.status')}</span>
          <span className={s.metaValue}>{insect.status}</span>
        </div>
        <div className={s.metaRow}>
          <span className={s.metaKey}>{t('detail.relatives')}</span>
          <span className={s.metaValue}>{insect.relatives.join(' · ')}</span>
        </div>
      </div>
    </aside>
  )
}
