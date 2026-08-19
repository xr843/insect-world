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
import { EVENTS, track } from '../analytics'

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
    track(EVENTS.SHARE_CLICK, { method: canShare ? 'system' : 'copy' })
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
      {/*
        「看实物照片」为什么放在这里 —— 这是第二次搬家，两次都是被实测推着走的。

        第一次从下面的 meta 区（分布/现状/近缘那三行灰字）搬进按钮组，理由是
        「它是动作不是静态属性，埋在灰字里等于没有」。方向对，但**没解决问题**：
        右栏是独立滚动容器，实测可视 688px、内容 1358px —— 只能看到一半，
        而它作为按钮组最后一项落在 y≈1306，几乎在最底。
        结果是一位专门来找实拍图的老师在 issue #3 里问「如果顺便支持实拍图片
        就更好了」—— 功能一直都在，他只是没滚到。**那不是他的问题，是入口的问题。**
        （见 https://github.com/xr843/insect-world/issues/3）
        
        第二次搬家（贴着总述放）在**中文站**上是对的（y≈332，折叠线内），但只在
        中文站验过 —— 英文总述比中文长 148px，把这一行推到 y≈481，而 1280×720 的
        右栏只看得到 518px，于是英文笔记本上它又落回了折叠线以下。

        所以第三次搬到**总述之前**：位置不再跟着总述长度走，两种语言、任何视口
        高度下都钉在同一格。代价是把两个小胶囊插进了「别称 → 总述」之间，
        但那本来就是标题区结束、正文开始的位置，读起来是「标题—副标题—动作条—正文」，
        不是打断。
        位置也讲得通：程序化模型的写实度有上限，「它真长什么样」是**认这只虫**
        的一部分，属于身份区，不属于底部的动作清单。
        做成紧凑的黄铜小胶囊而不是通栏实底按钮：要显眼，但不能盖过主按钮。
        没有对应 taxon 记录的物种不渲染，见 data/external.ts（63 种里 61 种有）。
      */}
      {/*
        分享跟实物照片外链并排，理由和上面那段是同一条，只是量得更狠：
        分享按钮原先在动作组里、y≈1134，而右栏一次只看得到 688px ——
        **1527 次访问里被点了 4 次**。功能本身是好的（手机调系统分享面板，
        能直达微信；桌面复制规范链接），坏的只有位置。

        搬到这一行是因为这一行已经被证明看得见：实物照片外链就在 y≈332，
        上线当天拿到 133 次点击。语义也对 —— 这两个都是「关于这只虫的次要
        动作」，不是「继续读下去」。

        ⚠️ 是**搬**不是复制。生活史那次保留了旧入口、靠 source 维度分辨；
        这次直接搬走：旧位置在折叠线下本来就没量，留着只会让归因变浑。
        改动后 share_click 涨了就只可能是新位置的功劳。

        ⚠️ 这一行必须能只放一个：中华豆芫菁与猎蝽在 iNat 上只有别的种，
        没有外链（63 种里 61 种有），那两只这里只剩分享。
      */}
      <div className={s.idActions}>
        {photoUrl(insect.id) && (
          <a
            className={s.photoLink}
            href={photoUrl(insect.id) as string}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => track(EVENTS.PHOTO_LINK, { species_id: insect.id })}
          >
            <IconGlobe size={12} />
            {t('detail.photosLink')}
            <IconArrowRight size={11} />
          </a>
        )}
        <button
          className={`${s.photoLink} ${s.shareChip}`}
          onClick={share}
          data-copied={copied || undefined}
        >
          {copied ? <IconCheck size={12} /> : <IconShare size={12} />}
          {copied ? t('detail.linkCopied') : canShare ? t('detail.share') : t('detail.copyLink')}
        </button>
      </div>

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

      {/*
        主按钮做成**栏内吸底**，而不是待在底部的动作组里。

        实测：右栏是独立滚动容器，可视 688px / 内容 1350px —— **只看得到 51%**。
        动作组整块落在 y=1031，也就是折叠线以下 343px；被它上面那 285px 的
        阅读性内容（生态角色 + 你知道吗 + 生活史）推下去的。
        换句话说，这个站最主要的引导入口，多数人可能从没看见过。

        为什么是吸底而不是把它上提：上提要么把 190px 的按钮堆插进身份区
        （盖过内容本身），要么只挪一点点还是落在折叠线下。吸底不动阅读顺序，
        又保证它始终在视野里 —— 代价是滚动途中会盖住一行内容，
        但滚到底时它回到自然位置，什么都不会被永久遮住。

        ≤900px 不吸底：那时布局竖排、右栏不再是独立滚动容器
        （global.css 里 `.detail-panel { height: auto }`），
        再 sticky 就会贴着视口底部乱飘。
      */}
      <div className={s.stickyAction}>
        <button className={s.primary} onClick={() => onDiscover('lesson')}>
          {t('detail.readGuide')}
          <IconArrowRight size={15} />
        </button>
      </div>
    </aside>
  )
}
