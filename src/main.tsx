import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { INSECTS } from './data/insects.zh'
import { getGuide } from './data/guides.zh'
import { LocaleProvider } from './i18n/LocaleProvider'
import { zh } from './i18n/zh'
import { pmark } from './perf'
import './styles/global.css'

// 首帧分段计时的第一个锚点：ESM 深度优先求值，走到这一行说明 three/react/
// 图鉴数据这些依赖模块的**代码已全部执行完**，此前的时间全归「网络+解析+求值」。
// 默认关闭，?perf=1 才记录，见 src/perf.ts
pmark('js-evaluated')

const el = document.getElementById('root')
if (!el) throw new Error('缺少 #root 挂载点')

pmark('react-render')
createRoot(el).render(
  <StrictMode>
    <LocaleProvider value={{ locale: 'zh', dict: zh, insects: INSECTS, getGuide }}>
      <App />
    </LocaleProvider>
  </StrictMode>,
)
