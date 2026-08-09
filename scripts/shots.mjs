/**
 * 重拍 README 截图（无头浏览器，不依赖任何人的窗口状态）。
 *
 * 为什么要这个脚本：3D 只在浏览器窗口**可见**时才会挂载 —— 隐藏标签页没有
 * requestAnimationFrame，r3f 的 Canvas 量不到容器尺寸就永远不渲染，
 * 症状是「canvas 在、无报错、永远转圈」。于是「重拍截图」这件小事一度被
 * 卡在「请把 Chrome 调到前台」上。无头 Chromium 里 visibilityState 恒为
 * visible，问题消失，顺带让出图变成可复现的一条命令。
 *
 * 用法：
 *   npm run build && npx vite preview --port 4179 --strictPort &
 *   npx playwright install chromium      # 只需一次（别加 --with-deps，那个要 sudo）
 *   npm i --no-save playwright
 *   node scripts/shots.mjs
 *
 * ⚠️ 无头环境没有 GPU，走的是 SwiftShader 软件渲染。材质与后期都能正确出图，
 * 只是慢（每张几秒），所以下面的等待给得比较宽松。
 */
import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'

const BASE = process.env.SHOTS_BASE ?? 'http://localhost:4179/'
const OUT = 'docs/screenshots'
mkdirSync(OUT, { recursive: true })

const browser = await chromium.launch({
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
})
const page = await browser.newPage({
  viewport: { width: 1600, height: 900 },
  deviceScaleFactor: 2, // 出图用 2×，README 里缩着看才不糊
})

/** 等 3D 真的渲出来：转圈消失 + canvas 被赋了真实尺寸 */
async function waitForStage() {
  await page.waitForFunction(
    () => {
      const c = document.querySelector('canvas')
      return c && c.width > 600 && !document.querySelector('[class*=spinner]')
    },
    { timeout: 60_000 },
  )
  await page.waitForTimeout(2500) // 入场动画 + 按需渲染的收敛
}

/** 关掉自动旋转，姿态才可复现 */
async function freezePose() {
  await page.evaluate(() => {
    const btn = [...document.querySelectorAll('button')].find(
      (b) => b.textContent?.trim() === '旋转' && b.dataset.active === 'true',
    )
    btn?.click()
  })
  await page.waitForTimeout(600)
}

/**
 * 转到 3/4 视角再拍 —— 复位后的默认机位接近正侧，出图像一张平面剪影，
 * 白白丢掉「这是个三维标本」这件唯一值得展示的事。
 * 拖拽量按 OrbitControls 的换算来：方位角 ≈ 2π·dx/容器高·rotateSpeed(0.85)，
 * 容器高约 700 CSS px，故 110px ≈ 48°。竖直方向只给一点点，视线略微俯视。
 */
async function turnToThreeQuarter() {
  const box = await stageBox()
  const cx = box.x + box.width / 2
  const cy = box.y + box.height / 2
  await page.mouse.move(cx, cy)
  await page.mouse.down()
  await page.mouse.move(cx - 110, cy - 26, { steps: 18 })
  await page.mouse.up()
  await page.waitForTimeout(1600) // 阻尼余摆收敛
}

async function shot(name, clip) {
  const path = `${OUT}/${name}.png`
  await page.screenshot({ path, clip })
  console.log('✓', path)
}

/** 展台区域的视口坐标（三栏工作台的中栏） */
async function stageBox() {
  return page.evaluate(() => {
    const el = document.querySelector('section[class*=stage]')
    const r = el.getBoundingClientRect()
    return { x: Math.round(r.x), y: Math.round(r.y), width: Math.round(r.width), height: Math.round(r.height) }
  })
}

// ---- 1. 展台特写（默认浅色主题「标本台」）
await page.goto(BASE, { waitUntil: 'load' })
await page.evaluate(() => localStorage.removeItem('iw-theme'))
await page.reload({ waitUntil: 'load' })
await waitForStage()
await freezePose()
await turnToThreeQuarter()
await shot('02-beetle-closeup', await stageBox())

// ---- 2. 分步讲解弹窗（镜头会移到讲到的部位）
await page.evaluate(() => {
  ;[...document.querySelectorAll('button')].find((b) => b.textContent?.trim() === '课程')?.click()
})
await page.waitForTimeout(2000)
await shot('06-lesson', { x: 0, y: 0, width: 1600, height: 900 })
await page.keyboard.press('Escape')
await page.waitForTimeout(600)

// ---- 3. 展台底部的内联对比条
await page.evaluate(() => {
  ;[...document.querySelectorAll('button')].find((b) => b.textContent?.trim() === '对比')?.click()
})
await page.waitForTimeout(3500)
await shot('07-compare', await stageBox())

// ---- 4. 暗色「博物馆之夜」同机位一张，README 用来并排展示双主题
await page.evaluate(() => localStorage.setItem('iw-theme', 'dark'))
await page.reload({ waitUntil: 'load' })
await waitForStage()
await freezePose()
await turnToThreeQuarter()
await shot('03-dark-stage', await stageBox())

await browser.close()
console.log('全部完成')
