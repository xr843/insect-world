/**
 * 逐物种分享卡（1200×630）：真 3D 模型出镜 + 中英名与学名，输出到
 * public/og/species/<id>.png，中英壳页共用一套（所以卡上双语都写全）。
 *
 * 这是一次性生成并提交的资产，不进构建链 —— 壳页脚本
 * （make-species-pages.mjs）发现哪个物种有图就用哪张，没有的回落全站卡。
 * 改了某只虫的模型想更新它的卡，跑 `node scripts/make-og-species.mjs <id>`
 * 重生成那一张再提交即可。
 *
 * 用法：
 *   npm run build && npx vite preview --port 5402 --strictPort &
 *   npm i --no-save playwright                # 与 shots.mjs 同一套做法
 *   npx playwright install chromium           # 本机没有缓存过才需要
 *   node scripts/make-og-species.mjs          # 全部 60 张，约 40 分钟
 *   node scripts/make-og-species.mjs ladybird firefly   # 只重做这几张
 *
 * 调机位时设 OG_KEEP_RAW=1 会在输出旁多留一份未压缩的 .rawcopy.png。
 * 只能对着中文入口跑（OG_BASE 默认值就是）——脚本靠「复位」按钮文案
 * 找重取景按钮，英文入口找不到它。
 *
 * 依赖 ImageMagick 的 convert 做调色板量化 —— 1200×630 的全彩 PNG 普遍
 * 300–800KB，量化到 ≤256 色后普遍 <150KB，肉眼看不出差别（分享平台还会
 * 再压一道）。没装 ImageMagick 会在开头就报错退出。
 *
 * 无头渲染的姿势沿用 shots.mjs 的经验：SwiftShader 软渲染慢但稳；
 * 上下文开 reducedMotion:'reduce'，Stage 会因此不开自动旋转，姿态可复现，
 * 省去点「旋转」按钮那一步。
 */
import { execFileSync } from 'node:child_process'
import { copyFileSync, existsSync, mkdirSync, statSync, unlinkSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const OUT_DIR = path.join(ROOT, 'public/og/species')
const BASE = process.env.OG_BASE ?? 'http://localhost:5402/'
const SIZE_LIMIT = 150 * 1024

const { INSECTS: ZH } = await import('../src/data/insects.zh.ts')
const { INSECTS: EN } = await import('../src/data/insects.en.ts')
const enById = new Map(EN.map((i) => [i.id, i]))

const picked = process.argv.slice(2)
const list = picked.length ? ZH.filter((i) => picked.includes(i.id)) : ZH
if (picked.length && list.length !== picked.length) {
  console.error(`有认不出的物种 id：${picked.filter((p) => !ZH.some((i) => i.id === p)).join(' ')}`)
  process.exit(1)
}

// 两个前置条件先验清楚，跑到一半才死最浪费时间
try {
  execFileSync('convert', ['-version'], { stdio: 'ignore' })
} catch {
  console.error('缺 ImageMagick（convert）——量化压缩要用它，先安装再来')
  process.exit(1)
}
try {
  await fetch(BASE, { signal: AbortSignal.timeout(3000) })
} catch {
  console.error(`${BASE} 不通 —— 先 npm run build && npx vite preview --port 5402 --strictPort`)
  process.exit(1)
}

mkdirSync(OUT_DIR, { recursive: true })

const browser = await chromium.launch({
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
})
const context = await browser.newContext({
  viewport: { width: 1200, height: 630 },
  deviceScaleFactor: 1, // 出图即目标尺寸，不再缩放
  reducedMotion: 'reduce',
})
const page = await context.newPage()
// SwiftShader 软渲染下重模型一帧就要好几秒，并行跑多个实例时更挤 ——
// 30s 的 playwright 默认超时会在 page.screenshot 上误杀（实测）
page.setDefaultTimeout(120_000)
page.setDefaultNavigationTimeout(120_000)

/** 把展台铺满视口、藏掉全部界面件，只留 3D 本体 */
const ISOLATE_CSS = `
  section[class*='stage'] {
    position: fixed !important; inset: 0 !important; z-index: 999999 !important;
    /* stage-height 的 clamp 会把画布压回 520px，明确铺满视口 */
    height: 100vh !important; max-height: none !important;
    border-radius: 0 !important; box-shadow: none !important;
    /* 展台自己的底色带透明度，铺一层不透明的纸底
       （与 make-og.sh 的全站卡同一对颜色），顺带当卡片背景 */
    background: linear-gradient(#f6f8f2, #e0e5da) !important;
  }
  section[class*='stage'] [class*='rail'],
  section[class*='stage'] [class*='orderTag'],
  section[class*='stage'] [class*='caption'],
  .hotspot-dot { display: none !important; }
  body { overflow: hidden !important; }
`

/**
 * 藏掉展台之外的一切。光靠 CSS 猜类名藏不干净 —— 详情栏/观察要点各有
 * 自己的堆叠上下文，z-index 压不住就会从卡片底部透出来。直接遍历：
 * 不是展台的祖先也不在展台子树里的，一律 display:none。
 * 必须等展台渲染完成后再跑（那时全部面板都已挂载，不会再冒出新的）。
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

/** 等 3D 真渲出来：canvas 拿到真实尺寸且转圈消失（同 shots.mjs） */
async function waitForStage() {
  await page.waitForFunction(
    () => {
      const c = document.querySelector('canvas')
      return c && c.width > 900 && !document.querySelector("[class*='spinner']")
    },
    { timeout: 90_000 },
  )
  await page.waitForTimeout(2500) // 入场动画 + 按需渲染收敛
}

/**
 * 取景分三步：复位（相机适配是按布局里的小展台算的，铺满视口后要重算，
 * 按钮藏着不影响程序化 click）→ 拖 ~24° 出 3/4 立体感 → 按实拍推近。
 *
 * 为什么要按实拍自适应：fitDistance 按**包围球**取景，而螳螂举着前臂、
 * 蜻蜓展着翅，包围球比可见躯体大一倍多，固定机位下瘦长物种小得像标本盒
 * 角落里的一粒。截一帧下来用 ImageMagick fuzz-trim 量出实际画面占位
 * （连地面阴影一起量，它本来就是构图的一部分），差多少倍就滚多少格 ——
 * OrbitControls 每个滚轮事件缩放 0.95^zoomSpeed(0.8)。
 */
async function frameModel(raw) {
  await page.evaluate(() => {
    ;[...document.querySelectorAll('button')]
      .find((b) => b.textContent?.trim() === '复位')
      ?.click()
  })
  await page.waitForTimeout(900)
  await page.mouse.move(600, 315)
  await page.mouse.down()
  await page.mouse.move(550, 291, { steps: 18 }) // ≈24°，换算见 shots.mjs
  await page.mouse.up()
  await page.waitForTimeout(1200) // 阻尼余摆收敛

  await page.screenshot({ path: raw })
  // fuzz 25% 恰好把纸底、柔光和地面阴影盘全剔掉，只剩躯体（实测拐点：
  // 15% 时阴影盘还在、20% 残留顶部柔光）；浅色物种可能整张被剔空，
  // 那就退回 15% 用「躯体+阴影盘」的包络配一组保守目标
  const measure = (fuzz) => {
    try {
      const [w, h] = execFileSync(
        'convert', [raw, '-fuzz', `${fuzz}%`, '-trim', '-format', '%w %h', 'info:'],
        { stdio: ['ignore', 'pipe', 'ignore'] },
      ).toString().trim().split(' ').map(Number)
      return w > 0 && h > 0 ? { w, h } : null
    } catch {
      return null
    }
  }
  let body = measure(25)
  let factor
  if (body && body.w >= 40 && body.h >= 30) {
    // 好看的基准（校准自七星瓢虫）：躯体高 ~200±，宽不超过 700
    factor = Math.min(700 / body.w, 230 / body.h)
  } else {
    body = measure(15)
    factor = body ? Math.min(880 / body.w, 430 / body.h) : 1
  }
  factor = Math.max(0.7, Math.min(factor, 2.6))
  const perEvent = Math.log(1 / 0.95 ** 0.8) // ≈0.041/事件
  const n = Math.round(Math.log(factor) / perEvent)
  for (let i = 0; i < Math.abs(n); i++) {
    await page.mouse.wheel(0, n > 0 ? -100 : 100)
    await page.waitForTimeout(60)
  }
  if (n !== 0) await page.waitForTimeout(1400) // 缩放阻尼收敛
}

/** 名称与品牌角标压在画面上；字体等加载齐了再拍，免得截到兜底字形 */
async function overlayCard(zh, en) {
  await page.evaluate(
    async ({ name, enName, latin, sizePx }) => {
      document.getElementById('og-card')?.remove()
      const el = document.createElement('div')
      el.id = 'og-card'
      el.style.cssText =
        'position:fixed;inset:0;z-index:2147483000;pointer-events:none;font-kerning:normal'
      el.innerHTML = `
        <div style="position:absolute;left:0;right:0;bottom:0;height:250px;
          background:linear-gradient(to bottom, rgba(246,248,242,0) 0%, rgba(246,248,242,.82) 62%, rgba(246,248,242,.96) 100%)"></div>
        <div style="position:absolute;left:64px;bottom:44px;max-width:820px">
          <div style="font-family:'Noto Serif SC',serif;font-weight:600;font-size:${sizePx}px;
            line-height:1.15;color:#23282a">${name}</div>
          <div style="font-family:'Playfair Display',Georgia,serif;font-weight:500;font-size:30px;
            color:#3c4446;margin-top:10px">${enName}</div>
          <div style="font-family:'Playfair Display',Georgia,serif;font-style:italic;font-size:25px;
            color:#3f5199;margin-top:6px">${latin}</div>
        </div>
        <div style="position:absolute;right:56px;bottom:48px;display:flex;align-items:center;gap:14px">
          <img src="/favicon.svg" width="52" height="52" style="display:block" alt="" />
          <div style="font-family:'Noto Serif SC',serif;font-weight:500;font-size:22px;
            color:#3c4446;line-height:1.45">昆虫世界<br/>
            <span style="font-family:'Playfair Display',Georgia,serif;font-size:17px;
              letter-spacing:.12em;color:#6a7274">INSECT WORLD</span></div>
        </div>`
      document.body.appendChild(el)
      await Promise.all(
        [
          document.fonts.load(`600 ${sizePx}px 'Noto Serif SC'`, name),
          document.fonts.load("500 30px 'Playfair Display'", enName),
          document.fonts.load("italic 400 25px 'Playfair Display'", latin),
        ].map((p) => p.catch(() => {})),
      )
      await document.fonts.ready
    },
    {
      name: zh.name,
      enName: en.name,
      latin: zh.latin,
      // 名字越长字号越收，全都排一行；阈值照顾到最长的中文名
      sizePx: zh.name.length <= 5 ? 64 : zh.name.length <= 7 ? 54 : 44,
    },
  )
  await page.waitForTimeout(300) // 字体切换后的重排一帧
}

/**
 * 全彩截图 → 调色板量化到 ≤150KB；256 色不够小就逐级降。
 * 抖动用 Riemersma 不用 FloydSteinberg：误差扩散的噪点几乎不可压缩，
 * 同一张卡 FS 出 236KB、Riemersma 123KB，观感没有肉眼可辨的差别。
 */
function compressTo(raw, out) {
  if (process.env.OG_KEEP_RAW) copyFileSync(raw, out.replace(/\.png$/, '.rawcopy.png'))
  for (const colors of [255, 192, 128, 96]) {
    execFileSync('convert', [
      raw, '-dither', 'Riemersma', '-colors', String(colors), '-depth', '8', '-strip', out,
    ])
    if (statSync(out).size <= SIZE_LIMIT) return
  }
  console.warn(`  ⚠ ${path.basename(out)} 量化到 96 色仍超 150KB，先留着，回头人工看`)
}

let done = 0
const failed = []
for (const insect of list) {
  const t0 = Date.now()
  const out = path.join(OUT_DIR, `${insect.id}.png`)
  const raw = path.join(OUT_DIR, `.raw-${insect.id}.png`)
  try {
    await page.goto(`${BASE}?s=${insect.id}`, { waitUntil: 'load' })
    await page.addStyleTag({ content: ISOLATE_CSS })
    await waitForStage()
    await hideEverythingElse()
    await frameModel(raw)
    await overlayCard(insect, enById.get(insect.id))
    await page.screenshot({ path: raw })
    compressTo(raw, out)
    done++
    console.log(
      `✓ ${insect.id}.png ${(statSync(out).size / 1024).toFixed(0)}KB ` +
        `(${((Date.now() - t0) / 1000).toFixed(1)}s, ${done}/${list.length})`,
    )
  } catch (e) {
    // 单张翻车（多为负载高峰时超时）不拖垮整批，收尾统一报出来重跑
    failed.push(insect.id)
    console.error(`✗ ${insect.id}: ${e.message?.split('\n')[0]}`)
  } finally {
    if (existsSync(raw)) unlinkSync(raw)
  }
}

await browser.close()
console.log(`完成 ${done}/${list.length} 张 → public/og/species/`)
if (failed.length) {
  console.error(`失败 ${failed.length} 张，重跑：node scripts/make-og-species.mjs ${failed.join(' ')}`)
  process.exit(1)
}
