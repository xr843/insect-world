/**
 * 标注点卡片出屏回归检查。
 *
 * 这条 bug 是几何属性（.hotspot-card 的 left/right 相对视口的位置），
 * jsdom 没有真布局，vitest 量不出来——只能用真浏览器量，跑法与
 * scripts/audit-shots.mjs 同一套：
 *
 *   npm run build && npx vite preview --port 4207 --strictPort --host 127.0.0.1 &
 *   node scripts/verify-hotspot-bounds.mjs
 *
 * 对每个「物种 × 视口宽 × 主题」组合，把该物种全部标注点逐个用
 * el.click() 直接点开（绕开 data-behind 淡出时 pointer-events:none 挡手——
 * 转台在 reducedMotion 下停在加载时的固定角度，有些点天生背对镜头，
 * 真实点击够不到，但卡片出不出屏是纯几何问题，跟这一点关不关掉、
 * 淡到多暗无关，直接调 DOM 的 click() 一样能测出卡片位置），量
 * .hotspot-card 的 getBoundingClientRect()，断言 left>=0 且 right<=视口宽。
 *
 * 额外做一次**真实**（非 el.click()）的 Playwright 点击验「新按钮点得动」：
 * 若按钮几何上真出了屏或被别的元素挡住，Playwright 的可操作性检查会直接
 * 超时失败——这一步专门验收标准里「按钮点得动」那半句，几何检查本身
 * 只能证明「按钮的框在屏幕内」，证不了「按钮真能被点到」。
 *
 * 退出码非 0 = 有卡片出屏，或真实点击验证失败。
 */
import { chromium } from 'playwright'

const BASE = process.env.VERIFY_BASE ?? 'http://127.0.0.1:4207/'
const SPECIES = (process.env.VERIFY_SPECIES ?? 'mantis').split(',').filter(Boolean)
const VIEWPORTS = (process.env.VERIFY_VIEWPORTS ?? '390x844,360x800,1440x900')
  .split(',')
  .map((s) => {
    const [width, height] = s.split('x').map(Number)
    return { width, height, label: `${width}×${height}` }
  })
const THEMES = (process.env.VERIFY_THEMES ?? 'dark,light').split(',')
/** 额外真实点击「看别的虫的 X →」按钮的物种/视口——只需覆盖一次，不必全矩阵重复 */
const CLICK_CHECK = { species: 'mantis', width: 390, height: 844 }

const browser = await chromium.launch({
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
})

const rows = []
let failures = 0

for (const theme of THEMES) {
  for (const vp of VIEWPORTS) {
    for (const id of SPECIES) {
      const page = await browser.newPage({
        viewport: { width: vp.width, height: vp.height },
        reducedMotion: 'reduce',
      })
      // 主题走真实路径：写 localStorage 再导航，theme-boot.js 首帧就按它设好
      // <html data-theme>，不是导航后再拍脑袋改属性
      await page.addInitScript(
        (t) => localStorage.setItem('iw-theme', t),
        theme === 'dark' ? 'dark' : 'light',
      )
      await page.goto(`${BASE}s/${id}/`, { waitUntil: 'load' })
      await page.waitForSelector('canvas', { timeout: 30_000 })
      // 首次加载要等 chunk 下载 + 几何构建 + 首帧；reducedMotion 下转台不转，
      // 稳定后各标注点的屏幕位置不会再变
      await page.waitForTimeout(2600)

      const count = await page.locator('.hotspot-dot').count()
      for (let i = 0; i < count; i++) {
        await page.evaluate((idx) => {
          document.querySelectorAll('.hotspot-dot')[idx].click()
        }, i)
        await page.waitForTimeout(220) // fade-up 0.18s + 一帧翻面判定

        const label = (await page.locator('.hotspot-title').textContent())?.trim() ?? '?'
        const box = await page.locator('.hotspot-card').boundingBox()
        if (!box) {
          rows.push({ id, vp: vp.label, theme, label, note: '卡片没量到（未展开?)' })
          failures++
        } else {
          const right = box.x + box.width
          const ok = box.x >= -0.5 && right <= vp.width + 0.5
          if (!ok) failures++
          rows.push({
            id,
            vp: vp.label,
            theme,
            label,
            left: Number(box.x.toFixed(1)),
            right: Number(right.toFixed(1)),
            innerWidth: vp.width,
            ok,
          })
        }

        // 关掉这张卡再翻下一个点：不关的话下一个点可能被当前卡片挡住，
        // 真实点击点不到（这里虽用 el.click() 不受挡手影响，但card 残留
        // 会让下一次 boundingBox 的 z-index/布局判断混进上一张的状态）
        await page.evaluate((idx) => {
          document.querySelectorAll('.hotspot-dot')[idx].click()
        }, i)
        await page.waitForTimeout(80)
      }

      // 真实点击验「按钮点得动」：只在指定的一个组合上做，其余矩阵格子
      // 只验几何，避免真点击的鼠标移动/可操作性等待把整个矩阵拖慢
      if (id === CLICK_CHECK.species && vp.width === CLICK_CHECK.width && vp.height === CLICK_CHECK.height) {
        await page.evaluate(() => document.querySelectorAll('.hotspot-dot')[0].click())
        await page.waitForTimeout(220)
        const jumpBtn = page.locator('.hotspot-jump')
        try {
          await jumpBtn.waitFor({ state: 'visible', timeout: 3000 })
          await jumpBtn.click({ timeout: 3000 })
          console.log(`✓ 真实点击 .hotspot-jump 成功（${theme}, ${vp.label}）`)
        } catch (e) {
          failures++
          console.log(`✗ 真实点击 .hotspot-jump 失败（${theme}, ${vp.label}）：${e.message.split('\n')[0]}`)
        }
      }

      await page.close()
    }
  }
}

console.log('\n物种\t视口\t主题\t标注点\tleft\tright\tinnerWidth\t结果')
for (const r of rows) {
  if (r.note) {
    console.log(`${r.id}\t${r.vp}\t${r.theme}\t${r.label}\t-\t-\t-\t${r.note}`)
  } else {
    console.log(
      `${r.id}\t${r.vp}\t${r.theme}\t${r.label}\t${r.left}\t${r.right}\t${r.innerWidth}\t${r.ok ? 'OK' : 'OVERFLOW'}`,
    )
  }
}
console.log(`\n共 ${rows.length} 条，${failures} 条失败`)

await browser.close()
process.exit(failures > 0 ? 1 : 0)
