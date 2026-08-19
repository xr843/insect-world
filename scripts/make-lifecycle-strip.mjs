/**
 * 生活史长图：把一个物种的各个阶段并排排成一条，模型出镜、界面全撤。
 *
 * 为什么要单独做一张：这之前 README 里放的是四张整页截图拼的 2×2
 * （docs/screenshots/08-lifecycle.jpg，已随本次改动删掉）——
 * 作为文档能看懂，**作为传播物完全不能用**：界面占了九成，模型只有
 * 指甲盖大，缩到社交平台的缩略图就什么都没有了。而生活史恰恰是这个项目
 * 最难被别处复制的东西（参数化几何能做、扫描 GLB 做不到的那一类）。
 *
 * 这张图讲的是**完全变态**：卵→幼虫→蛹→成虫，四格缺一不可。少掉卵那格
 * 就退化成「虫的三个样子」，而「中间要经过一个不吃不动的蛹期」正是中小学
 * 讲昆虫的第一课，也是做这批阶段模型的理由。
 *
 * 用法：
 *   npm run build && npx vite preview --port 5402 --strictPort &
 *   node scripts/make-lifecycle-strip.mjs                 # 默认双叉犀金龟
 *   node scripts/make-lifecycle-strip.mjs monarch-butterfly
 *
 * 输出 docs/promo/lifecycle-<id>.png，一次性生成并提交，不进构建链。
 *
 * 无头渲染的姿势沿用 make-og-species.mjs（SwiftShader 软渲染慢但稳、
 * reducedMotion 让展台不自转所以姿态可复现、界面靠遍历 DOM 而不是猜类名
 * 来藏）。那边是一物种一张卡，这边是一物种一条带，共用的是同一套经验而
 * 不是同一份代码 —— scripts/ 下每个出图任务各自独立，是这个目录的既有体例。
 */
import { execFileSync } from 'node:child_process'
import { mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const OUT_DIR = path.join(ROOT, 'docs/promo')
const TMP = path.join(OUT_DIR, '.frames')
const BASE = process.env.STRIP_BASE ?? 'http://localhost:5402/'

/** 单格渲染尺寸。SwiftShader 下每帧都是秒级，别为了清晰度随手翻倍 */
const CELL = 620

const speciesId = process.argv[2] ?? 'rhinoceros-beetle'

const { INSECTS: ZH } = await import('../src/data/insects.zh.ts')
const insect = ZH.find((i) => i.id === speciesId)

/**
 * 变态路线。
 *
 * 判据与 `src/three/stages.ts` 的 `metamorphosisOf()` 一模一样（有蛹＝完全变态、
 * 有若虫＝不完全变态），但**不能直接 import 它** —— 那个模块用 `import.meta.glob`
 * 登记阶段文件，那是 Vite 的东西，Node 里跑不起来。所以改问文件系统，问的还是
 * 同一批文件，不新设一张「哪个物种什么变态」的表。
 */
const HOLO = ['egg', 'larva', 'pupa', 'adult']
const HEMI = ['egg', 'nymph', 'adult']
const built = new Set(
  readdirSync(path.join(ROOT, 'src/three/builders/stages'))
    .map((f) => f.match(new RegExp(`^${speciesId}-(egg|larva|pupa|nymph)\\.ts$`))?.[1])
    .filter(Boolean),
)
const route = built.has('pupa') ? HOLO : built.has('nymph') ? HEMI : null

function die(msg) {
  console.error(`✗ ${msg}`)
  process.exit(1)
}

if (!insect) die(`认不出的物种 id：${speciesId}`)
if (!route) die(`${insect.name} 没做阶段模型 —— 有哪些见 src/three/builders/stages/`)

/**
 * 每格的说明文字直接取 `insect.lifecycle`：它本来就是按路线顺序排好的、
 * 本地化的、带物种细节的标签（「幼虫（三龄，8–10个月）」比「幼虫」有信息量
 * 得多）。长度对不上时退回通用词而不是错位显示 —— 63 种是逐条写的，
 * 个别不合拍是可能的，而错位比笼统更糟。这条判断与生活史弹窗里的一致。
 */
const GENERIC = { egg: '卵', larva: '幼虫', pupa: '蛹', nymph: '若虫', adult: '成虫' }
const labels =
  insect.lifecycle.length === route.length ? insect.lifecycle : route.map((s) => GENERIC[s])

try {
  execFileSync('convert', ['-version'], { stdio: 'ignore' })
} catch {
  die('缺 ImageMagick（convert）—— 末尾要用它压一道，先安装再来')
}
try {
  await fetch(BASE, { signal: AbortSignal.timeout(3000) })
} catch {
  die(`${BASE} 不通 —— 先 npm run build && npx vite preview --port 5402 --strictPort`)
}

mkdirSync(TMP, { recursive: true })

const browser = await chromium.launch({
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
})
const context = await browser.newContext({
  viewport: { width: CELL, height: CELL },
  deviceScaleFactor: 2,
  reducedMotion: 'reduce', // 展台因此不自转，四格姿态一致
})
const page = await context.newPage()
page.setDefaultTimeout(180_000)
page.setDefaultNavigationTimeout(180_000)

/** 展台铺满视口、界面件撤掉，只留 3D 本体与纸底 */
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

/**
 * 藏掉展台之外的一切。光靠 CSS 猜类名藏不干净 —— 各面板有自己的堆叠上下文，
 * z-index 压不住就会从底下透出来。直接遍历 DOM。
 *
 * ⚠️ 生活史弹窗也会被藏掉，但下面翻页用的是 `element.click()`（程序化点击
 * 不看可见性），所以藏了照样能翻 —— 这正是要的：翻页驱动展台换标本，而
 * 镜头里只剩标本。
 */
async function hideEverythingElse() {
  await page.evaluate(() => {
    const stage = document.querySelector("section[class*='stage']")
    for (const el of document.body.querySelectorAll('*')) {
      if (el === stage || stage.contains(el) || el.contains(stage)) continue
      if (el.tagName === 'SCRIPT' || el.tagName === 'STYLE' || el.tagName === 'LINK') continue
      el.style.setProperty('display', 'none', 'important')
    }
  })
}

/** 等 3D 真渲出来：canvas 有真实尺寸且转圈消失 */
async function waitForStage() {
  await page.waitForFunction(
    () => {
      const c = document.querySelector('canvas')
      // 阈值取自 window.CELL_GUARD（addInitScript 提前塞的）—— 这个回调在页面
      // 上下文里跑，外面的 CELL 进不去闭包
      return c && c.width > window.CELL_GUARD && !document.querySelector("[class*='spinner']")
    },
    { timeout: 150_000 },
  )
  await page.waitForTimeout(2600) // 入场缩放 + 按需渲染收敛
}

/** 文字找按钮（程序化点击，不受 display:none 影响） */
const clickByText = (text) =>
  page.evaluate(
    (t) => [...document.querySelectorAll('button')].find((b) => b.textContent?.trim() === t)?.click(),
    text,
  )

/**
 * 取景：复位（相机适配按布局里的小展台算过，铺满视口后要重算）→ 拖约 24°
 * 出 3/4 立体感。
 *
 * 与 make-og-species.mjs 的区别：**这里不做按实拍推近的自适应**。那张是
 * 一物种一张卡，每张自己好看就行；这条带子上四格并排，各自推近会把「卵是
 * 一小撮、蛴螬是一大条」这个真实的体型差抹平 —— 而那正是这张图要讲的事。
 * 四格统一用展台自己的包围球取景，比例关系是模型自己的。
 */
async function frame() {
  await clickByText('复位')
  await page.waitForTimeout(900)
  await page.mouse.move(CELL / 2, CELL / 2)
  await page.mouse.down()
  await page.mouse.move(CELL / 2 - 50, CELL / 2 - 24, { steps: 18 })
  await page.mouse.up()
  await page.waitForTimeout(1400) // 阻尼余摆收敛
}

await page.addInitScript((n) => {
  window.CELL_GUARD = n
}, CELL)
await page.goto(BASE, { waitUntil: 'domcontentloaded' })
await page.addStyleTag({ content: ISOLATE_CSS })
await waitForStage()

// 换到目标物种：地址栏直达比在名录里找可靠（名录会因筛选/滚动位置而变）
if (speciesId !== (await page.evaluate(() => location.pathname))) {
  await page.goto(`${BASE.replace(/\/$/, '')}/s/${speciesId}/`, { waitUntil: 'domcontentloaded' })
  await page.addStyleTag({ content: ISOLATE_CSS })
  await waitForStage()
}

// 展台右上角的生活史入口 → 弹窗停在第 1 阶段，展台同时换成那一阶段的标本
await page.evaluate(() =>
  [...document.querySelectorAll('button')].find((b) => /个阶段/.test(b.textContent ?? ''))?.click(),
)
await page.waitForTimeout(1800)
await hideEverythingElse()

const shots = []
for (let i = 0; i < route.length; i++) {
  await waitForStage()
  await frame()
  const f = path.join(TMP, `${speciesId}-${i}.png`)
  await page.screenshot({ path: f })
  shots.push(f)
  console.log(`  ${i + 1}/${route.length} ${route[i]} ${labels[i]}`)
  if (i < route.length - 1) {
    await clickByText('下一步')
    await page.waitForTimeout(1200)
  }
}

/**
 * 四格共用一个裁切框，把上方的空白去掉。
 *
 * 展台按包围球取景，模型普遍落在画面中下部，头顶留着一大片空 —— 四格并排
 * 时这片空占了整条图的三成。
 *
 * 关键是**四格必须用同一个框**：逐格各裁各的会把「卵是一小撮、蛴螬是一大条」
 * 这个真实的体型差抹平，而那正是这张图要讲的事。所以先量出每格内容的外接框，
 * 取并集，再拿这一个框去裁四格 —— 去掉的只有四格共同的空白。
 *
 * 量不出来的格子（浅色物种整格可能被 fuzz 剔空）不参与并集，但照样按并集裁：
 * 宁可它多留一点边，也不能让它自己缩放。
 */
function contentBox(file) {
  try {
    const g = execFileSync('convert', [file, '-fuzz', '18%', '-trim', '-format', '%w %h %X %Y', 'info:'], {
      stdio: ['ignore', 'pipe', 'ignore'],
    })
      .toString()
      .trim()
      .replace(/\+/g, '')
      .split(' ')
      .map(Number)
    const [w, h, x, y] = g
    return w > 40 && h > 30 ? { x, y, w, h } : null
  } catch {
    return null
  }
}

const boxes = shots.map(contentBox).filter(Boolean)
if (boxes.length) {
  const PAD = 26
  const px = (v) => Math.round(v)
  const x0 = Math.max(0, px(Math.min(...boxes.map((b) => b.x)) - PAD))
  const y0 = Math.max(0, px(Math.min(...boxes.map((b) => b.y)) - PAD))
  const x1 = px(Math.max(...boxes.map((b) => b.x + b.w)) + PAD)
  const y1 = px(Math.max(...boxes.map((b) => b.y + b.h)) + PAD)
  const crop = `${x1 - x0}x${y1 - y0}+${x0}+${y0}`
  for (const f of shots) execFileSync('convert', [f, '-crop', crop, '+repage', f])
  console.log(`  统一裁切 ${crop}（原 ${CELL * 2}×${CELL * 2}）`)
}

/**
 * 排版在浏览器里做，不用 ImageMagick 画字：这个浏览器已经把站点的字体
 * （Playfair Display / Noto Serif SC）下下来了，排出来与站点同一副面孔；
 * 而 convert -annotate 要现指定字体文件，本机只有一个 Droid Sans Fallback，
 * 出来是另一套观感。图片以 data URI 内嵌，不碰文件协议的跨域限制。
 */
const b64 = (f) => `data:image/png;base64,${readFileSync(f).toString('base64')}`
const PANEL = 560
const html = `<!doctype html><html lang="zh-Hans"><head><meta charset="utf-8">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@500&family=Noto+Serif+SC:wght@400;600&display=swap" rel="stylesheet">
<style>
  * { margin:0; padding:0; box-sizing:border-box }
  body { width:${PANEL * route.length + 40 * (route.length - 1) + 96}px;
         background:linear-gradient(#f6f8f2,#e6eae0); padding:44px 48px 40px;
         font-family:'Noto Serif SC',Georgia,serif; color:#23282a }
  header { display:flex; align-items:baseline; justify-content:space-between; margin-bottom:26px }
  h1 { font-size:34px; font-weight:600; letter-spacing:.01em }
  .sub { font-size:19px; color:#7d6128; margin-left:14px }
  .site { font-size:18px; color:#5c6566; letter-spacing:.03em }
  .row { display:flex; gap:40px; align-items:flex-start }
  figure { width:${PANEL}px; position:relative }
  img { width:${PANEL}px; height:auto; display:block; border-radius:14px;
        border:1px solid #3d4a3f2b }
  .n { position:absolute; left:14px; top:14px; width:30px; height:30px; border-radius:50%;
       background:#7d6128; color:#f6f8f2; font-size:16px; line-height:30px; text-align:center }
  figcaption { margin-top:14px; font-size:21px; line-height:1.35 }
  .arrow { align-self:center; margin-top:-34px; color:#7d6128; font-size:30px }
</style></head><body>
<header>
  <div><h1 style="display:inline">${insect.name}的一生</h1><span class="sub">完全变态 · ${route.length} 个阶段</span></div>
  <div class="site">insect-world.pages.dev</div>
</header>
<div class="row">
${route
  .map(
    (_, i) =>
      `<figure><img src="${b64(shots[i])}"><span class="n">${i + 1}</span>` +
      `<figcaption>${labels[i]}</figcaption></figure>` +
      (i < route.length - 1 ? '<div class="arrow">→</div>' : ''),
  )
  .join('\n')}
</div></body></html>`

const composeFile = path.join(TMP, 'compose.html')
writeFileSync(composeFile, html)
const composer = await context.newPage()
await composer.goto(`file://${composeFile}`, { waitUntil: 'networkidle' })
await composer.waitForTimeout(1500) // 字体落位
const raw = path.join(TMP, 'strip-raw.png')
await composer.screenshot({ path: raw, fullPage: true })
await browser.close()

const out = path.join(OUT_DIR, `lifecycle-${speciesId}.png`)
// 缩到 2400 宽（README 与各平台都够用）再量化：3D 渲染出来的渐变色阶多，
// 不量化的话这张图轻松破 2MB
execFileSync('convert', [raw, '-resize', '2400x', '-colors', '250', '-strip', out])
rmSync(TMP, { recursive: true, force: true })

const kb = (readFileSync(out).length / 1024).toFixed(0)
console.log(`✓ ${path.relative(ROOT, out)}（${kb} KB）`)
