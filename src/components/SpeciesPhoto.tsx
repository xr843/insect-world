import s from './SpeciesPhoto.module.css'
import { useT } from '../i18n/useT'
import { licenseLabel } from '../data/photoPolicy'
import { localPhotoSrc, photoOf } from '../data/photos'
import { EVENTS, track } from '../analytics'
import { IconArrowRight } from './icons'

/**
 * 一只虫的实拍对照图。
 *
 * ── 为什么做这个 ─────────────────────────────────────────────────────
 * `photo_link`（「在 iNaturalist 上看实物图」）30 天被点 660 次 —— 比小测(71)
 * 加分享(69)加笔记(14) 还多四倍，是站上量最大的未满足需求。而这 660 次每一次
 * 都是访客**离开这个站**去看真虫长什么样。程序化模型的写实度有上限，
 * 「它真长什么样」这个问题本来就该在站内被回答。
 *
 * 这也是 issue #3 那位老师的诉求（要实拍图才敢拿去上课），以及点播墙上
 * 「配上实拍对照图」那个候选项。三条线索指向同一件事。
 *
 * ── 署名不是装饰，是许可条件 ─────────────────────────────────────────
 * 用的全是 CC 授权照片，而 CC 的 BY 就是署名要求 —— 摄影者、许可证、
 * 回原页的链接三样缺一不可。所以 figcaption **不可省略**，也不做成
 * hover 才出现：那等于对不用鼠标的人隐藏了许可信息。
 */
export function SpeciesPhoto({ insectId, name }: { insectId: string; name: string }) {
  const t = useT()
  const photo = photoOf(insectId)

  // 61 种有 taxon 记录，其中 59 种挑得出授权合适的照片。剩下两种整块不显示 ——
  // 一个空框比没有框难看得多
  if (!photo) return null

  return (
    <figure className={s.figure}>
      <img
        className={s.img}
        src={localPhotoSrc(insectId)}
        alt={t('photo.alt', { name })}
        loading="lazy"
        decoding="async"
        // 原始宽高写死在标签上：不写的话图片加载完成的一瞬间会把下面的正文
        // 整体推下去（CLS）。这里的比例是版面比例、不是原图比例（object-fit
        // 负责裁切），所以直接给版面值而不是 photo.width/height
        width={640}
        height={400}
      />
      <figcaption className={s.caption}>
        <span className={s.credit}>
          {t('photo.credit', { name: photo.photographer })}
          <span className={s.sep} aria-hidden="true">
            ·
          </span>
          <span className={s.license}>{licenseLabel(photo.license)}</span>
        </span>
        {/*
          ⚠ 这条链接仍然上报 PHOTO_LINK，但**语义变了**：搬进图注之前它是
          「我想看真虫长什么样」，现在图就在上面，点它的意思是「我还想看更多」。
          所以带上 from=caption —— 跨这次改动直接比较 photo_link 的总量会得出
          错误结论，两个时期必须靠这个维度分开。
        */}
        <a
          className={s.more}
          href={photo.inatUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => track(EVENTS.PHOTO_LINK, { species_id: insectId, from: 'caption' })}
        >
          {t('photo.more')}
          <IconArrowRight size={11} />
        </a>
      </figcaption>
    </figure>
  )
}
