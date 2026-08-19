/**
 * 羽化 GIF：刚出蛹的翅从皱缩的一小团撑开成全尺寸。
 *
 * 为什么非得是动图：这之前 README 里放的是一张静帧（docs/screenshots/09-emerge.jpg，
 * 已随本次改动删掉），而这一段的全部内容就是**过程本身**
 * （先快后慢、边展开边从下垂抬起）。静帧只能证明
 * 「有大有小两个状态」，证明不了中间那条曲线 —— 而那条曲线正是这段动画
 * 唯一的技术含量。
 *
 * 用法：
 *   npm run build && npx vite preview --port 5402 --strictPort &
 *   node scripts/make-emerge-gif.mjs                    # 默认帝王蝶
 *   node scripts/make-emerge-gif.mjs silk-moth
 *
 * 输出 docs/promo/emerge-<id>.gif，一次性生成并提交，不进构建链。
 *
 * ## 两个坑，都跟「按需渲染」有关
 *
 * 1. **不能开 reducedMotion。** make-og-species.mjs 与生活史长图都开着它
 *    （展台因此不自转、姿态可复现），但 InsectCanvas 在 reduced 下**直接
 *    跳过整段羽化**（见那边 REDUCED_MOTION 的判断）。开着录，录到的是一只
 *    一动不动的蝴蝶。代价是自转会开着，所以下面要手动点掉「旋转」——
 *    一边转一边展翅，读者分不清哪个是重点。
 *
 * 2. **不能用 page.screenshot() 逐帧采。** 羽化一旦跑起来就每帧 invalidate，
 *    96 帧（3.2 秒 × 30）在墙上时钟里大约 6 秒就走完了；而 SwiftShader 下
 *    一次 `page.screenshot()` 要将近一秒 —— **整段动画只采得到 7 帧**（踩过，
 *    量出来的：内容外接框 188→251→275→279 之后就不动了，动画其实跑得好好的，
 *    是采样跟不上）。
 *
 *    改用 CDP 的 `Page.startScreencast`：帧由渲染器那边推过来，合成器出一帧
 *    推一帧，没有每帧一次往返的开销，这正是它被设计出来干的事。
 */
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const OUT_DIR = path.join(ROOT, 'docs/promo')
const TMP = path.join(OUT_DIR, '.gifframes')
const BASE = process.env.GIF_BASE ?? 'http://localhost:5402/'

const SIZE = 560
/** 3.2 秒 × 每帧 1/30 秒 —— 与 InsectCanvas 的 EMERGE_SECONDS 对齐 */
const FRAMES = 96
/**
 * 「多久没有新帧就认为动画收尾了」。
 *
 * ⚠️ 这里必须按**时间**判，不能按「连续采到多少张重复图」判。SwiftShader
 * 下实测每渲一帧要将近一秒，而截图只要几十毫秒 —— 按次数判的话，两次真实
 * 渲染之间就能攒够几十张重复图，整段动画会在第 7 帧被判成「停了」（踩过）。
 */
const IDLE_MS = 25_000
/** 整段上限：96 帧 × 约 1 秒/帧，留足余量 */
const DEADLINE_MS = 6 * 60 * 1000

const speciesId = process.argv[2] ?? 'monarch-butterfly'
const { INSECTS: ZH } = await import('../src/data/insects.zh.ts')
const insect = ZH.find((i) => i.id === speciesId)

function die(msg) {
  console.error(`✗ ${msg}`)
  process.exit(1)
}

if (!insect) die(`认不出的物种 id：${speciesId}`)
try {
  execFileSync('ffmpeg', ['-version'], { stdio: 'ignore' })
} catch {
  die('缺 ffmpeg —— 拼 GIF 要用它（palettegen/paletteuse），先安装再来')
}
try {
  await fetch(BASE, { signal: AbortSignal.timeout(3000) })
} catch {
  die(`${BASE} 不通 —— 先 npm run build && npx vite preview --port 5402 --strictPort`)
}

rmSync(TMP, { recursive: true, force: true })
mkdirSync(TMP, { recursive: true })

const browser = await chromium.launch({
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
})
// 故意不设 reducedMotion —— 设了整段羽化会被跳过，见文件头
const context = await browser.newContext({ viewport: { width: SIZE, height: SIZE } })
const page = await context.newPage()
page.setDefaultTimeout(180_000)
page.setDefaultNavigationTimeout(180_000)

const ISOLATE_CSS = `
  section[class*='stage'] {
    position: fixed !important; inset: 0 !important; z-index: 999999 !important;
    height: 100vh !important; max-height: none !important;
    border-radius: 0 !important; box-shadow: none !important;
    background: linear-gradient(#f6f8f2, #e0e5da) !important;
  }
  section[class*='stage'] [class*='rail'],
  section[class*='stage'] [class*='orderTag'],
  section[class*='stage'] [class*='lifeCue'],
  section[class*='stage'] [class*='caption'],
  .hotspot-dot { display: none !important; }
  body { overflow: hidden !important; }
`

async function waitForStage() {
  await page.waitForFunction(
    () => {
      const c = document.querySelector('canvas')
      return c && c.width > window.SIZE_GUARD && !document.querySelector("[class*='spinner']")
    },
    { timeout: 150_000 },
  )
  await page.waitForTimeout(2600)
}

const clickByText = (text) =>
  page.evaluate(
    (t) => [...document.querySelectorAll('button')].find((b) => b.textContent?.trim() === t)?.click(),
    text,
  )

/**
 * 「canvas 已铺开」的判据阈值。
 *
 * ⚠️ 取的是视口的七成，不是视口本身：`canvas.width` 是**后备存储**的宽度
 * （CSS 宽 × devicePixelRatio），这里 deviceScaleFactor 是 1，所以它恰好等于
 * SIZE —— 用 `> SIZE` 判永远为假，会一直等到超时。生活史长图那个脚本
 * deviceScaleFactor 开了 2 才碰巧躲过这一条。
 */
await page.addInitScript((n) => {
  window.SIZE_GUARD = n
}, Math.round(SIZE * 0.7))
await page.goto(`${BASE.replace(/\/$/, '')}/s/${speciesId}/`, { waitUntil: 'domcontentloaded' })
await page.addStyleTag({ content: ISOLATE_CSS })
await waitForStage()

// 自转点掉：一边转一边展翅，读者分不清哪个才是重点
await clickByText('旋转')
await page.waitForTimeout(600)

// 取景：复位（相机适配按布局里的小展台算过，铺满视口后要重算）+ 拖出 3/4 视角
await clickByText('复位')
await page.waitForTimeout(1000)
await page.mouse.move(SIZE / 2, SIZE / 2)
await page.mouse.down()
await page.mouse.move(SIZE / 2 - 46, SIZE / 2 - 20, { steps: 16 })
await page.mouse.up()
await page.waitForTimeout(1400)

// 生活史入口 → 翻到蛹那一步
await page.evaluate(() =>
  [...document.querySelectorAll('button')].find((b) => /个阶段/.test(b.textContent ?? ''))?.click(),
)
await page.waitForTimeout(1800)
await page.evaluate(() => {
  const stage = document.querySelector("section[class*='stage']")
  for (const el of document.body.querySelectorAll('*')) {
    if (el === stage || stage.contains(el) || el.contains(stage)) continue
    if (el.tagName === 'SCRIPT' || el.tagName === 'STYLE' || el.tagName === 'LINK') continue
    el.style.setProperty('display', 'none', 'important')
  }
})

const route = await page.evaluate(
  () => document.body.innerText.match(/第 \d \/ (\d) 个阶段/)?.[1] ?? '4',
)
const toPupa = Number(route) - 2 // 蛹（或若虫）是倒数第二步
for (let i = 0; i < toPupa; i++) {
  await clickByText('下一步')
  await page.waitForTimeout(1500)
  await waitForStage()
}
console.log(`  已停在第 ${toPupa + 1} / ${route} 阶段（蛹）`)

/**
 * 用 CDP 的屏幕投送收帧 —— 理由见文件头第 2 条。
 *
 * 合成器每出一帧推一帧过来，而羽化每渲染一帧正好推进 1/30 秒，所以收到的
 * 序列本身就是标准 30fps，不需要再对齐时间轴。仍然去重：页面静止时投送会
 * 重复推同一帧。
 */
const cdp = await context.newCDPSession(page)
const seen = new Set()
const buffers = []
let lastNew = Date.now()
cdp.on('Page.screencastFrame', async ({ data, sessionId }) => {
  const buf = Buffer.from(data, 'base64')
  const h = createHash('sha1').update(buf).digest('hex')
  if (!seen.has(h)) {
    seen.add(h)
    buffers.push(buf)
    lastNew = Date.now()
  }
  // 不回执的话投送会在几帧之后自己停下
  await cdp.send('Page.screencastFrameAck', { sessionId }).catch(() => {})
})
await cdp.send('Page.startScreencast', { format: 'png', everyNthFrame: 1 })

await clickByText('下一步') // 蛹 → 成虫，正是羽化那一刻
const t0 = Date.now()
while (Date.now() - lastNew < IDLE_MS && Date.now() - t0 < DEADLINE_MS) {
  await page.waitForTimeout(400)
}
await cdp.send('Page.stopScreencast').catch(() => {})
await browser.close()

/**
 * 掐头去尾 + 统一裁切。
 *
 * 投送过来的一串里有三段：点「下一步」之后成虫模型还没建好、台上还是蛹的
 * 那几帧；羽化本身；以及羽化走完后仍在跑的静息微动（触角与足的小幅摆动，
 * 它会一直推新帧过来，不掐掉的话 GIF 末尾要停半天）。
 *
 * 第一版用「内容外接框的高度」判，失败了 —— 投送帧的背景渐变让 `-trim`
 * 在低 fuzz 下几乎剪不动（量出来 526/558，几乎就是整幅）。改用**相邻帧的
 * RMSE 差异**：蛹→成虫那一下是全片最大的一次跳变，羽化期间差异持续显著，
 * 静息微动则小一个量级。这个判据不依赖背景长什么样。
 *
 * 蛹那一段**故意留 6 帧**（约 0.4 秒）：GIF 是循环播的，从蛹起手，读者一眼
 * 就知道这是「从蛹里出来」而不是「一只蝴蝶在扇翅膀」。
 */
mkdirSync(TMP, { recursive: true })
const raws = buffers.map((buf, i) => {
  const f = path.join(TMP, `raw${String(i).padStart(4, '0')}.png`)
  writeFileSync(f, buf)
  return f
})

/** 相邻帧差异（RMSE）。compare 有差异时退出码非 0，度量值在 stderr 上 */
function rmse(a, b) {
  try {
    execFileSync('compare', ['-metric', 'RMSE', a, b, 'null:'], { stdio: ['ignore', 'ignore', 'pipe'] })
    return 0
  } catch (e) {
    const m = String(e.stderr ?? '').match(/\(([\d.]+)\)/)
    return m ? Number(m[1]) : 0
  }
}
const diff = raws.map((f, i) => (i === 0 ? 0 : rmse(raws[i - 1], f)))

const swap = diff.indexOf(Math.max(...diff)) // 蛹 → 成虫那一下
const post = diff.slice(swap + 1)
const thresh = Math.max(...post, 0) * 0.08
let end = swap
for (let i = swap + 1; i < diff.length; i++) if (diff[i] > thresh) end = i
const start = Math.max(0, swap - 1)

/**
 * 首尾各定格一下。
 *
 * **不能靠「多录几帧蛹」来做首帧定格** —— 屏幕投送只在合成器真出新帧时才推，
 * 而台上摆着一只不动的蛹时根本不出新帧，等再久也只有那一帧。所以直接把首帧
 * 复制若干份写出去。
 *
 * 首帧留 0.8 秒：GIF 是循环播的，蛹只闪一下的话读者根本没看清起点是什么。
 * 末帧留 0.6 秒：翅全开是这段的落点，立刻跳回蛹会显得像卡带。
 * 帧数按「后面要隔帧丢一半、最终 15fps」换算，所以是秒数 × 30。
 */
const HEAD_HOLD = Math.round(0.8 * 30)
const TAIL_HOLD = Math.round(0.6 * 30)

const frames = []
const push = (buf) => {
  const f = path.join(TMP, `f${String(frames.length).padStart(4, '0')}.png`)
  writeFileSync(f, buf)
  frames.push(f)
}
for (let i = 0; i < HEAD_HOLD; i++) push(buffers[start])
for (let i = start + 1; i <= end; i++) push(buffers[i])
for (let i = 0; i < TAIL_HOLD; i++) push(buffers[end])
console.log(
  `  投送 ${buffers.length} 帧 → 蛹在第 ${swap} 帧脱壳，取 [${start}, ${end}]；` +
    `首尾定格后共 ${frames.length} 帧`,
)

/**
 * 统一裁切：相机是按成虫的包围球取的景，而羽化过程中翅还没撑开，虫在画面里
 * 只占一小块 —— 直接出图等于一整片空背景里有个小点。
 *
 * 取「蛹那一帧」与「翅全开那一帧」外接框的并集，四周留 30 像素，**全部帧
 * 用同一个框**：逐帧各裁各的会让虫在画面里跳来跳去，而且把「翅在长大」这件
 * 唯一要看的事抵消掉。fuzz 用 30% —— 低于这个值剪不动背景渐变（量过：
 * 5% 时 560×558，几乎整幅）。
 */
function box(file) {
  try {
    const [w, h, x, y] = execFileSync(
      'convert', [file, '-fuzz', '30%', '-trim', '-format', '%w %h %X %Y', 'info:'],
      { stdio: ['ignore', 'pipe', 'ignore'] },
    ).toString().replace(/\+/g, '').trim().split(' ').map(Number)
    return w > 20 && h > 20 ? { x, y, w, h } : null
  } catch {
    return null
  }
}
const ends = [box(frames[0]), box(frames[frames.length - 1])].filter(Boolean)
if (ends.length) {
  const PAD = 30
  const x0 = Math.max(0, Math.min(...ends.map((b) => b.x)) - PAD)
  const y0 = Math.max(0, Math.min(...ends.map((b) => b.y)) - PAD)
  const x1 = Math.max(...ends.map((b) => b.x + b.w)) + PAD
  const y1 = Math.max(...ends.map((b) => b.y + b.h)) + PAD
  // GIF 编码要求偶数边长，向下取偶
  const crop = `${(x1 - x0) & ~1}x${(y1 - y0) & ~1}+${x0}+${y0}`
  for (const f of frames) execFileSync('convert', [f, '-crop', crop, '+repage', f])
  console.log(`  统一裁切 ${crop}`)
}

if (frames.length < 20)
  die(`只取到 ${frames.length} 帧 —— 羽化多半没跑起来，先确认没开 reducedMotion`)

/**
 * 两遍法出 GIF：先按整段内容生成一张自适应调色板，再用它量化。
 * 单遍的默认 web 安全色板会把翅面的渐变打成一片色块。
 */
const out = path.join(OUT_DIR, `emerge-${speciesId}.gif`)
const palette = path.join(TMP, 'palette.png')
/**
 * 隔帧丢一半：96 帧的 GIF 轻松破 5MB，README 里加载起来是灾难。
 * 丢一半后约 48 帧 / 15fps —— 这段动作本身慢，15fps 看不出跳。
 * 宽度 400：裁切后原始宽度本来就只有三百多，放大没有意义，`-1` 保比例。
 */
const vf = `select='not(mod(n\\,2))',scale=400:-1:flags=lanczos`
execFileSync('ffmpeg', ['-y', '-framerate', '30', '-i', path.join(TMP, 'f%04d.png'),
  '-vf', `${vf},palettegen=max_colors=128:stats_mode=full`, palette], { stdio: 'ignore' })
execFileSync('ffmpeg', ['-y', '-framerate', '30', '-i', path.join(TMP, 'f%04d.png'), '-i', palette,
  '-lavfi', `${vf}[x];[x][1:v]paletteuse=dither=bayer:bayer_scale=3`,
  '-r', '15', '-loop', '0', out], { stdio: 'ignore' })
if (!process.env.GIF_KEEP) rmSync(TMP, { recursive: true, force: true })

const kb = (readFileSync(out).length / 1024).toFixed(0)
console.log(`✓ ${path.relative(ROOT, out)}（${kb} KB）`)
