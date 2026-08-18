/**
 * 首帧分段计时（无头 Chromium + 应用内 `?perf=1` 打点通道）
 *
 * 回答的问题只有一个：**从导航到虫子出现在展台上，那几秒到底花在哪一段**。
 * 分段来自 `src/perf.ts` 的打点 + 浏览器自己的 Navigation/Resource Timing，
 * 两边拼成一条时间线。
 *
 * 用法：
 *   npm run build
 *   npx vite preview --port 4179 --strictPort &
 *   npm i --no-save playwright         # 不进 dependencies，同 scripts/shots.mjs 的先例
 *   node scripts/perf-firstframe.mjs                    # 热缓存桌面
 *   node scripts/perf-firstframe.mjs --cold             # 冷缓存
 *   node scripts/perf-firstframe.mjs --mobile --net=4g --cpu=4   # 移动端 4G
 *   node scripts/perf-firstframe.mjs --repeat=5 --json  # 多轮取中位数 + 机读输出
 *
 * ⚠️ **无头环境没有 GPU，走 SwiftShader 软件渲染**（`--use-angle=swiftshader`）。
 * 所以「GPU 那几段」（环境立方体、PMREM、着色器编译、首次 draw）的**绝对值
 * 偏大**，只能当上界与相对结构看；CPU 那几段（网络、解析求值、React 挂载、
 * builder 构建几何）与真机可比。真机数字要在 Windows 的 Chrome 上跑同一个
 * `?perf=1` 页面核对 —— 结论见 docs/perf-notes.md。
 */
import { chromium } from 'playwright'

const args = process.argv.slice(2)
const flag = (name) => args.some((a) => a === `--${name}` || a.startsWith(`--${name}=`))
const val = (name, dflt) => {
  const hit = args.find((a) => a.startsWith(`--${name}=`))
  return hit ? hit.slice(name.length + 3) : dflt
}

const BASE = val('base', process.env.PERF_BASE ?? 'http://localhost:4179/')
const COLD = flag('cold')
const MOBILE = flag('mobile')
const REPEAT = Number(val('repeat', '3'))
const NET = val('net', '')
const CPU = Number(val('cpu', '1'))
const JSON_OUT = flag('json')

/** Chrome DevTools 里「Slow/Fast 4G」的那两档（bytes/s, ms） */
const NET_PRESETS = {
  '4g': { downloadThroughput: (4 * 1024 * 1024) / 8, uploadThroughput: (3 * 1024 * 1024) / 8, latency: 20 },
  'slow4g': { downloadThroughput: (1.6 * 1024 * 1024) / 8, uploadThroughput: (750 * 1024) / 8, latency: 150 },
  '3g': { downloadThroughput: (400 * 1024) / 8, uploadThroughput: (400 * 1024) / 8, latency: 400 },
}

const browser = await chromium.launch({
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
})

const url = `${BASE}${BASE.includes('?') ? '&' : '?'}perf=1`

/**
 * 每轮开一个全新的 context/page，跑完立刻关掉。
 *
 * 第一版是同一个 page 反复 goto，结果 `js-evaluated` 在三轮里读出
 * 63 / 4570 / 7154 ms —— 同一份产物同一台机器差 100 倍，一眼就是测量本身坏了。
 * 原因是上一页的软件渲染（SwiftShader，多线程满负荷）还没退场就开始下一轮，
 * 新页面的主线程被饿着。`docs/model-audit-notes.md` 那条「诊断脚本自己有 bug
 * 会生产一堆假数据」的教训，这里又应验一次：**先怀疑量具**。
 * 热缓存靠 storageState 之外的磁盘缓存跨 context 共享（同一 browser 进程），
 * 所以换 context 不影响冷/热的区分 —— 实测第二轮起 res 里 transferSize=0。
 */
async function once() {
  const context = await browser.newContext(
    MOBILE
      ? { viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true }
      : { viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 },
  )
  await context.addInitScript(() => {
    window.__longtasks = []
    try {
      new PerformanceObserver((list) => {
        for (const e of list.getEntries()) window.__longtasks.push({ t: e.startTime, dur: e.duration })
      }).observe({ type: 'longtask', buffered: true })
    } catch {
      /* 不支持就算了 */
    }
  })
  const page = await context.newPage()
  const cdp = await context.newCDPSession(page)
  await cdp.send('Network.enable')
  if (COLD) await cdp.send('Network.clearBrowserCache')
  if (NET) {
    const preset = NET_PRESETS[NET]
    if (!preset) throw new Error(`未知网络档位 ${NET}，可选：${Object.keys(NET_PRESETS).join(' / ')}`)
    await cdp.send('Network.emulateNetworkConditions', { offline: false, ...preset })
  }
  if (CPU > 1) await cdp.send('Emulation.setCPUThrottlingRate', { rate: CPU })

  await page.goto(url, { waitUntil: 'commit' })
  await page.waitForFunction(() => window.__perf && window.__perf.firstFrame !== null, {
    timeout: 180_000,
  })
  // 等按需渲染收敛，把入场动画那几帧也收进 renders
  await page.waitForTimeout(1500)
  const out = await page.evaluate(() => {
    const nav = performance.getEntriesByType('navigation')[0]
    const res = performance.getEntriesByType('resource').map((r) => ({
      name: r.name.split('/').pop(),
      start: r.startTime,
      end: r.responseEnd,
      transfer: r.transferSize,
      decoded: r.decodedBodySize,
      cached: r.transferSize === 0 && r.decodedBodySize > 0,
    }))
    const paint = Object.fromEntries(
      performance.getEntriesByType('paint').map((p) => [p.name, p.startTime]),
    )
    const p = window.__perf
    return {
      nav: {
        responseStart: nav.responseStart,
        responseEnd: nav.responseEnd,
        domContentLoaded: nav.domContentLoadedEventEnd,
        load: nav.loadEventEnd,
      },
      paint,
      res,
      longtasks: window.__longtasks ?? [],
      marks: p.marks,
      spans: p.spans,
      renders: p.renders,
      info: p.info,
      firstFrame: p.firstFrame,
    }
  })
  await context.close()
  return out
}

/**
 * 先跑一轮不计数的预热。
 *
 * `vite preview` 对每个 chunk 的**第一次**请求要现做压缩，实测把物种 chunk
 * 的下载读成 800~8800ms（同一轮里其余数字正常）—— 那是量具的噪声，不是产物的
 * 性能。热缓存档位下这一轮同时也把浏览器磁盘缓存填上。`--warmup=0` 可关掉。
 */
const runs = []
const WARMUP = Number(val('warmup', '1'))
for (let i = 0; i < WARMUP; i++) await once()

for (let i = 0; i < REPEAT; i++) {
  // 第一轮之后浏览器已有磁盘缓存；--cold 每轮都清
  runs.push(await once())
  // 让上一轮的软件渲染线程彻底退场，别把下一轮的主线程饿着
  await new Promise((r) => setTimeout(r, 1500))
}

const median = (xs) => {
  const s = [...xs].sort((a, b) => a - b)
  return s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2
}
const mark = (r, name) => r.marks.find((m) => m.name === name)?.t ?? null
const spanSum = (r, prefix) =>
  r.spans.filter((s) => s.name.startsWith(prefix)).reduce((a, s) => a + s.dur, 0)

/** 时间线切段：每段 = [起点 mark, 终点 mark] */
function segments(r) {
  const t = (n) => mark(r, n)
  const firstRenderIdx = 0
  const renders = r.renders
  const firstFrameT = r.firstFrame
  // 「首帧之前」的 render 全部算进 GPU 段（环境立方体 + PMREM + 阴影 + 着色器编译）
  const preRenders = renders.filter((x) => x.t + x.dur <= firstFrameT + 0.5)
  const chunk = spanSum(r, 'chunk:')
  const build = spanSum(r, 'build:')
  return {
    '① HTML 响应': [0, r.nav.responseEnd],
    '② JS 网络+解析+求值': [r.nav.responseEnd, t('js-evaluated')],
    '③ React 挂载到 GL 上下文就绪': [t('react-render'), t('gl-created')],
    '④ 物种 chunk 下载+求值': [null, chunk],
    '⑤ builder 构建几何': [null, build],
    '⑥ GL 就绪→模型就绪（并行段）': [t('gl-created'), t('model-ready')],
    '⑦ 模型就绪→虫子出现': [t('model-ready'), firstFrameT],
    '　 展台出剪影占位（观感）': [0, t('stage-placeholder')],
    '  ├ 环境立方体渲染': [null, spanSum(r, 'env-cube-render')],
    '  ├ PMREM 生成': [null, spanSum(r, 'pmrem-from-cubemap')],
    '  └ 首帧前 render 合计': [null, preRenders.reduce((a, x) => a + x.dur, 0)],
    '＝ 导航→虫子出现': [0, firstFrameT],
  }
}

function fmt(n) {
  return n === null || n === undefined || Number.isNaN(n) ? '—' : n.toFixed(0)
}

if (JSON_OUT) {
  console.log(JSON.stringify({ runs, base: BASE, cold: COLD, mobile: MOBILE, net: NET, cpu: CPU }, null, 2))
} else {
  const r0 = runs[0]
  console.log(`\n目标 ${url}`)
  console.log(
    `档位：${MOBILE ? '移动端 390×844 dpr3' : '桌面 1920×1080 dpr1'} · ${COLD ? '冷缓存' : '热缓存'} · 网络 ${NET || '不限'} · CPU ×${CPU} · ${REPEAT} 轮`,
  )
  console.log(`实际生效参数（自证）：${JSON.stringify(r0.info)}`)
  const seg0 = segments(r0)
  const names = Object.keys(seg0)
  const rows = names.map((name) => {
    const vals = runs.map((r) => {
      const [a, b] = segments(r)[name]
      return a === null ? b : b === null ? null : b - a
    })
    return { name, med: median(vals.filter((v) => v !== null)), vals }
  })
  const w = Math.max(...names.map((n) => [...n].reduce((a, c) => a + (c.charCodeAt(0) > 255 ? 2 : 1), 0)))
  for (const row of rows) {
    const pad = w - [...row.name].reduce((a, c) => a + (c.charCodeAt(0) > 255 ? 2 : 1), 0)
    console.log(
      `${row.name}${' '.repeat(pad)}  ${fmt(row.med).padStart(6)} ms   [${row.vals.map(fmt).join(' ')}]`,
    )
  }
  console.log('\n每次 gl.render（耗时 / 累计程序数 / draw calls / 三角面）—— 首帧前的全部 + 之后 3 次：')
  const cut = r0.renders.findIndex((x) => x.t + x.dur === r0.firstFrame)
  for (const x of r0.renders.slice(0, (cut < 0 ? 10 : cut) + 4)) {
    console.log(
      `  t=${fmt(x.t).padStart(6)}  ${fmt(x.dur).padStart(6)} ms  programs=${String(x.programs).padStart(3)}  calls=${String(x.calls).padStart(4)}  tris=${x.tris}`,
    )
  }
  const lt = r0.longtasks.filter((x) => x.dur > 50)
  console.log(`\n长任务（>50ms）合计 ${fmt(lt.reduce((a, x) => a + x.dur, 0))} ms，共 ${lt.length} 个：`)
  for (const x of lt.slice(0, 12)) console.log(`  t=${fmt(x.t).padStart(6)}  ${fmt(x.dur).padStart(6)} ms`)
  console.log('\n首帧前下载的资源（>10KB）：')
  for (const x of r0.res.filter((x) => x.decoded > 10_000 && x.start < r0.firstFrame)) {
    console.log(
      `  ${String(x.name).padEnd(32)} ${fmt(x.start).padStart(6)}→${fmt(x.end).padStart(6)} ms  ${(x.decoded / 1024).toFixed(0)}KB${x.cached ? ' (cache)' : ''}`,
    )
  }
  console.log(`\nFCP=${fmt(r0.paint['first-contentful-paint'])} ms`)
}

await browser.close()
