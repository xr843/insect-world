import { render } from '@testing-library/react'
import type { ReactElement } from 'react'
import { getGuide } from '../data/guides.zh'
import { INSECTS } from '../data/insects.zh'
import { LocaleProvider } from './LocaleProvider'
import { en } from './en'
import { zh } from './zh'

/**
 * 组件测试的 render 包装。
 *
 * 组件从 LocaleProvider 拿文案，裸 render 会撞上「缺少 LocaleProvider」。
 * 放在 i18n/ 而不是 __tests__/ 下：它是被测试用的工具，不是测试本身，
 * 搁进 __tests__ 容易让人以为里面有用例。
 */
export function renderZh(ui: ReactElement) {
  const wrap = (node: ReactElement) => (
    <LocaleProvider value={{ locale: 'zh', dict: zh, insects: INSECTS, getGuide }}>{node}</LocaleProvider>
  )
  const result = render(wrap(ui))
  return {
    ...result,
    /**
     * 重新包一层再交给 RTL。
     *
     * RTL 的 rerender 是整棵树替换 —— 直接把裸组件传进去，Provider 就
     * 在重渲染时被丢掉了，组件当场抛「缺少 LocaleProvider」。
     */
    rerender: (node: ReactElement) => result.rerender(wrap(node)),
  }
}

/**
 * 英文版的 render。数据暂时仍是中文那份 —— 英文数据由后续任务产出，
 * 这里只让界面文案走英文字典，足够测「界面层有没有漏译」。
 */
export function renderEn(ui: ReactElement) {
  return render(
    <LocaleProvider value={{ locale: 'en', dict: en, insects: INSECTS, getGuide }}>{ui}</LocaleProvider>,
  )
}
