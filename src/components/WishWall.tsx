import { useEffect } from 'react'
import s from './WishWall.module.css'
import { useLocale, useT } from '../i18n/useT'
import { useWall } from '../hooks/useWall'
import { FeedbackForm } from './FeedbackForm'
import type { WallWish } from '../feedback/types'

/** 关掉弹层的通用行为：Esc 键 + 打开时锁住背景滚动（与 NotesPanel 同一套） */
function useDismiss(onClose: () => void) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [onClose])
}

/**
 * 点播墙。
 *
 * ── 为什么是投票而不是留言板 ─────────────────────────────────────────
 * 站上三个「让访客产出点什么」的功能都是死的（观察笔记月 14 次，而那还是
 * 私密、零社交成本的）。写一句话和点一下按钮的门槛差两个数量级，所以这面墙
 * 的主体是投票：它保证墙上永远有东西看，人气感来自聚合数字而不是等人写作文。
 * 留言在下半截，且**只有作者精选过的才出现** —— 详见
 * docs/superpowers/specs/2026-09-07-feedback-wall-design.md。
 */
export function WishWall({ onClose }: { onClose: () => void }) {
  useDismiss(onClose)
  const t = useT()
  const locale = useLocale()
  const { state, data, voted, vote, retry } = useWall(locale, true)

  // 条形长度按最高票归一。全是 0 票时（刚播种的墙）分母取 1，避免 0/0
  const top = Math.max(1, ...data.wishes.map((w) => w.votes))

  return (
    <div className={s.backdrop} onMouseDown={onClose}>
      <div className={`card ${s.sheet}`} onMouseDown={(e) => e.stopPropagation()}>
        <div className={s.head}>
          <div>
            <div className={s.title}>{t('wall.title')}</div>
            <div className={s.sub}>{t('wall.sub')}</div>
          </div>
          <button className={s.close} onClick={onClose} aria-label={t('common.close')}>
            ×
          </button>
        </div>

        {state === 'loading' && <div className={s.note}>{t('wall.loading')}</div>}

        {state === 'offline' && (
          <div className={s.note}>
            {t('wall.offline')}{' '}
            <button className={s.retry} onClick={retry}>
              {t('wall.retry')}
            </button>
          </div>
        )}

        {state === 'ready' && (
          <>
            <ul className={s.list}>
              {data.wishes.map((w) => (
                <WishRow key={w.id} wish={w} top={top} voted={voted.has(w.id)} onVote={() => void vote(w.id)} />
              ))}
            </ul>

            <div className={s.block}>
              <div className={s.blockTitle}>{t('wall.wishOwn')}</div>
              <FeedbackForm kind="wish" placeholder={t('feedback.wish.placeholder')} />
            </div>

            {/* 一条精选都没有时整块不出现 —— 一个空着的「编辑选了几句」比没有更难看 */}
            {data.featured.length > 0 && (
              <div className={s.block}>
                <div className={s.blockTitle}>{t('wall.featuredTitle')}</div>
                <ul className={s.quotes}>
                  {data.featured.map((m) => (
                    <li key={`${m.at}-${m.body.slice(0, 8)}`} className={s.quote}>
                      {m.body}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

/**
 * 一个候选项。
 *
 * 整行就是投票按钮，而不是行尾挂一个小按钮 —— 这面墙唯一的低门槛动作就是
 * 投票，任何多出来的瞄准成本都直接折损参与率。条形是行的背景填充，
 * 所以「看见排名」和「点下去」用的是同一块面积。
 *
 * 行尾那个位置零票时显示「投一票」而不是「0 票」。开张第一天九个候选项
 * 全是零票，满屏的「0 票」等于替这面墙宣布「没人投」—— 正是它本来要避免的
 * 那种空场感（真机上看才发现的）。换成动作词，同一块面积顺带成了
 * 「这行可以点」的提示。
 *
 * 投过之后是「✓ n 票」而不是单独一个「已投」：票数才是这面墙的信息本体，
 * 把它换掉等于让投过票的人（也就是最投入、最会回来看的那批）永远看不见
 * 自己关心那项现在排到哪儿了。勾号负责确认，数字继续负责信息。
 *
 * 行里**不显示** wish.kind。真机上一看就露馅：候选项标题本来就自带类别
 * （「玉带凤蝶的生活史」后面再缀一个「生活史」、"…life cycle" 后面再缀
 * 一个 "Life cycle"），标签一个字的新信息都没加。kind 仍然留在 API 与库里 ——
 * 它在 `npm run inbox` 分拣时有用，只是不该占用户的一行宽度。
 */
function WishRow({
  wish,
  top,
  voted,
  onVote,
}: {
  wish: WallWish
  top: number
  voted: boolean
  onVote: () => void
}) {
  const t = useT()
  return (
    <li>
      <button
        className={s.row}
        onClick={onVote}
        disabled={voted}
        aria-pressed={voted}
        title={voted ? t('wall.voted') : t('wall.vote')}
      >
        <span className={s.bar} style={{ width: `${(wish.votes / top) * 100}%` }} aria-hidden="true" />
        <span className={s.rowText}>
          <span className={s.rowTitle}>{wish.title}</span>
        </span>
        <span className={s.count} data-zero={!voted && wish.votes === 0}>
          {voted && <span className={s.check} aria-label={t('wall.voted')}>✓</span>}
          {voted || wish.votes > 0 ? t('wall.votes', { n: wish.votes }) : t('wall.vote')}
        </span>
      </button>
    </li>
  )
}
