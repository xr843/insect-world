import { IconGithub } from './icons'
import s from './SiteFooter.module.css'
import { useT } from '../i18n/useT'

/**
 * 页面最下端的一行：站名、年份、源码出口。
 *
 * 全站唯一指向 GitHub 的地方 —— 这个项目的卖点之一是「每一只虫都是代码
 * 实时生成的」，看完标本想去看代码的人得有条路走，否则只能靠 README 里
 * 那个链接（而访客根本不会去仓库）。
 *
 * 地址写成常量而不是散在 JSX 里，是为了让 footer.test.tsx 能拿它跟
 * package.json 的 repository.url 对答案 —— 改仓库名时两处必须一起动。
 *
 * 这里曾有点播墙的入口，给不会去开 issue 的老师、家长、孩子留一条路；
 * 墙在 2026-09-23 撤掉了（页脚这个入口 15 天打开 33 次、提交 0 条）。
 * 对具体物种的纠错仍在右栏「这里画得不对？」。
 */
const REPO_URL = 'https://github.com/xr843/insect-world'

export function SiteFooter() {
  const t = useT()
  return (
    <footer className={s.footer}>
      <span>
        {t('brand.name')} © {new Date().getFullYear()}
      </span>
      <span className={s.sep} aria-hidden="true">
        ·
      </span>
      <a className={s.link} href={REPO_URL} target="_blank" rel="noreferrer">
        <IconGithub size={14} />
        GitHub
      </a>
    </footer>
  )
}
