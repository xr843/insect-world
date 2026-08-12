/**
 * 把 60 个物种在调试台里逐个渲染成图，用于**肉眼验收形态**。
 *
 * 为什么需要它：本项目所有自动化测试量的都是数字 —— 几何合法性、包围盒比例、
 * 面数预算、对称性。这些全绿并不能保证「看着像那只虫」。阎甲就是活例子：
 * 几何完全合法、测试全绿，渲染出来是个黑盒子。
 *
 * 这个脚本不做判断，只负责把 60 张图整整齐齐摆出来，判断交给人（或有视觉的模型）。
 *
 * 用法：
 *   npm run build && npx vite preview --port 4179 --strictPort &
 *   node scripts/audit-shots.mjs
 *   # 图落在 /tmp 下的 audit-shots/，不进仓库
 */
import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'

const BASE = process.env.SHOTS_BASE ?? 'http://localhost:4179/'
const OUT = process.env.AUDIT_OUT ?? '/tmp/audit-shots'
mkdirSync(OUT, { recursive: true })

const browser = await chromium.launch({
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
})
const page = await browser.newPage({ viewport: { width: 900, height: 760 }, deviceScaleFactor: 1 })

await page.goto(BASE + 'preview.html', { waitUntil: 'load' })
await page.waitForSelector('canvas', { timeout: 60_000 })
await page.waitForTimeout(3000)

const species = await page.evaluate(() =>
  [...document.querySelectorAll('div > button')]
    .filter((b) => b.style.textAlign === 'left')
    .map((b) => b.textContent.trim()),
)
console.log('待拍', species.length, '个')

let i = 0
for (const name of species) {
  i++
  await page.evaluate((n) => {
    const b = [...document.querySelectorAll('div > button')].find((x) => x.textContent.trim() === n)
    b?.click()
  }, name)
  // 模型是按需 import 的，首次切换要等分包下载 + 构建 + 首帧
  await page.waitForTimeout(4200)
  const file = `${OUT}/${String(i).padStart(2, '0')}-${name.replace(/[^一-龥A-Za-z0-9]/g, '')}.png`
  await page.screenshot({ path: file, clip: { x: 210, y: 0, width: 690, height: 760 } })
  console.log('✓', i, name)
}

await browser.close()
console.log('完成，图在', OUT)
