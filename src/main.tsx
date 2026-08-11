import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { INSECTS } from './data/insects'
import { getGuide } from './data/guides'
import { LocaleProvider } from './i18n/LocaleProvider'
import { zh } from './i18n/zh'
import './styles/global.css'

const el = document.getElementById('root')
if (!el) throw new Error('缺少 #root 挂载点')

createRoot(el).render(
  <StrictMode>
    <LocaleProvider value={{ locale: 'zh', dict: zh, insects: INSECTS, getGuide }}>
      <App />
    </LocaleProvider>
  </StrictMode>,
)
