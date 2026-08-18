/**
 * 第 7 轮新物种（house-fly / mosquito / cockroach）的多机位目视验收出图。
 *
 * 与 audit-shots.mjs 的差别：那边走 preview.html 的默认单机位，这里要
 * 顶 / 侧 / 前斜 / 后斜 ≥4 个机位——OrbitControls 开着阻尼、外部改相机会被
 * 它盖回去，所以不走 preview 页面，而是从 vite dev server 直接 import
 * builder 模块，在页面里自建一个极简 THREE 场景（灯光、色调映射对齐
 * preview.tsx），相机完全自控。
 *
 * 用法：
 *   npx vite --port 5303 --strictPort &   # dev server（TS 模块由它转译）
 *   node scripts/new-species-shots.mjs [id ...]   # 缺省渲染三只新虫
 *   # 图落在 audit-out/<id>-<view>.png
 */
import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'

const BASE = process.env.SHOTS_BASE ?? 'http://localhost:5303/'
const OUT = process.env.SHOTS_OUT ?? 'audit-out'
const SPECIES = process.argv.slice(2).length ? process.argv.slice(2) : ['house-fly', 'mosquito', 'cockroach']
mkdirSync(OUT, { recursive: true })

/** 机位：名字 → 相机方向（单位化前），相机位于 dir * 取景距离 */
const VIEWS = {
  top: [0.18, 1, 0.14],
  side: [0.12, 0.28, 1],
  front: [1, 0.32, 0.4],
  rear: [-0.85, 0.42, -0.7],
}

const browser = await chromium.launch({
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
})
const page = await browser.newPage({ viewport: { width: 760, height: 660 }, deviceScaleFactor: 1 })
page.on('console', (m) => {
  if (m.type() === 'error') console.error('[page]', m.text())
})
page.on('pageerror', (e) => console.error('[pageerror]', e.message))

// 任意页面都行，只要同源能 import /src/**；用 preview.html 当宿主
await page.goto(BASE + 'preview.html', { waitUntil: 'load' })

for (const id of SPECIES) {
  const camelName = 'build' + id.replace(/(^|-)(\w)/g, (_, __, c) => c.toUpperCase())
  const shots = await page.evaluate(
    async ({ id, camelName, views }) => {
      const THREE = await import('/node_modules/three/build/three.module.js')
      const mod = await import(`/src/three/builders/${id}.ts`)
      const builder = mod[camelName]
      if (!builder) throw new Error(`${id} 未导出 ${camelName}`)
      const model = builder()

      const W = 720, H = 620
      const canvas = document.createElement('canvas')
      canvas.width = W
      canvas.height = H
      const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true })
      renderer.setSize(W, H, false)
      renderer.toneMapping = THREE.ACESFilmicToneMapping
      renderer.toneMappingExposure = 1.02
      renderer.shadowMap.enabled = true

      const scene = new THREE.Scene()
      scene.background = new THREE.Color('#f4ede1') // 近似 preview 台面底色
      scene.add(model.group)

      // 灯光对齐 preview.tsx（Environment 的三块面光源以半球光近似补上）
      scene.add(new THREE.AmbientLight('#fff3e4', 0.72))
      const key = new THREE.DirectionalLight('#fff6ea', 2.35)
      key.position.set(6, 9, 7)
      key.castShadow = true
      // 阴影贴图规格也要对齐 preview.tsx：缺省的 512 无偏移贴图会在贴着体表的
      // 浅浮雕上刷出一层摩尔纹自阴影 —— 那是出图台的病，不是模型的病，
      // 而验收人只看得到图，会照着这个假象去改模型（2026-08-18 帝王蝶蛹上实撞）
      key.shadow.mapSize.set(2048, 2048)
      key.shadow.bias = -0.0006
      key.shadow.normalBias = 0.02
      // 阴影相机也要按模型尺寸收紧：缺省是 10×10 的正交框，罩在毫米级的模型
      // （卵！）上时每个 texel 覆盖模型半径的十几个百分点，出图会刷出一层
      // 被面纹样的噪点 —— 同样是出图台的病不是模型的病，而验收人只看得到图，
      // 会照着这个假象去改模型（2026-08-18 柞蚕蛾卵与萤火虫卵上各撞一次）
      {
        const r = (model.frameRadius ?? model.radius) * 1.6
        const c = key.shadow.camera
        c.left = -r
        c.right = r
        c.top = r
        c.bottom = -r
        c.near = 0.1
        c.far = 40
        c.updateProjectionMatrix()
      }
      scene.add(key)
      const fillA = new THREE.DirectionalLight('#d6e2ff', 0.85)
      fillA.position.set(-8, 3, -4)
      scene.add(fillA)
      const fillB = new THREE.DirectionalLight('#ffe6c8', 1.15)
      fillB.position.set(-1, 5, -9)
      scene.add(fillB)
      scene.add(new THREE.HemisphereLight('#fffaf2', '#cbbba4', 0.5))

      const fov = 34
      const camera = new THREE.PerspectiveCamera(fov, W / H, 0.01, 100)
      const fit = model.frameRadius ?? model.radius
      const d = (fit / Math.sin((fov * Math.PI) / 360)) * 1.08

      const out = {}
      for (const [name, dir] of Object.entries(views)) {
        const v = new THREE.Vector3(...dir).normalize().multiplyScalar(d)
        camera.position.copy(v)
        camera.near = d * 0.02
        camera.far = d * 12
        camera.lookAt(0, 0, 0)
        camera.updateProjectionMatrix()
        renderer.render(scene, camera)
        out[name] = canvas.toDataURL('image/png')
      }
      renderer.dispose()
      return out
    },
    { id, camelName, views: VIEWS },
  )

  for (const [view, dataUrl] of Object.entries(shots)) {
    const b64 = dataUrl.split(',')[1]
    const { writeFileSync } = await import('node:fs')
    writeFileSync(`${OUT}/${id}-${view}.png`, Buffer.from(b64, 'base64'))
    console.log('✓', `${OUT}/${id}-${view}.png`)
  }
}

await browser.close()
console.log('完成')
