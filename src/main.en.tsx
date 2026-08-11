import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { INSECTS } from './data/insects.en'
import { getGuide } from './data/guides.en'
import { LocaleProvider } from './i18n/LocaleProvider'
import { en } from './i18n/en'
import './styles/global.css'

/**
 * 英文入口。
 *
 * 与 main.tsx 同构，只是换了 locale、字典和数据。走两个真入口而不是
 * 运行时切语言，是为了让 /en/ 有自己的 lang / title / og —— 搜索引擎
 * 看到的是一张真正的英文页；顺带 Rollup 会按入口分包，中文访客一个
 * 字节的英文数据都不下载。
 */
const el = document.getElementById('root')
if (!el) throw new Error('missing #root')

createRoot(el).render(
  <StrictMode>
    <LocaleProvider value={{ locale: 'en', dict: en, insects: INSECTS, getGuide }}>
      <App />
    </LocaleProvider>
  </StrictMode>,
)
