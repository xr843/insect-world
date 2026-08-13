/**
 * 定量诊断：在同一机位下，对鞘翅材质做若干变体，测「鞘翅上有多少像素渲成接近白」。
 *
 * 先用 ID 图算出鞘翅的像素掩膜（几何与相机不变，掩膜一次算好可反复用），
 * 之后每个变体只需重渲一张正常图，在掩膜内数白像素。
 * 这样每个实验给出的是一个**数字**，而不是「看着好像差不多」。
 */
import { chromium } from 'playwright'
import { writeFileSync } from 'node:fs'

const b = await chromium.launch({
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
})
const p = await b.newPage({ viewport: { width: 900, height: 760 } })
await p.goto('http://localhost:4179/preview.html', { waitUntil: 'load' })
await p.waitForSelector('canvas', { timeout: 60000 })
await p.waitForTimeout(3000)
await p.evaluate(() => {
  ;[...document.querySelectorAll('div > button')].find((x) => x.textContent.trim() === '七星瓢虫')?.click()
})
await p.waitForTimeout(4500)
await p.mouse.move(560, 380)
await p.mouse.down()
await p.mouse.move(410, 320, { steps: 20 })
await p.mouse.up()
await p.waitForTimeout(2500)

const CLIP = { x: 210, y: 0, width: 690, height: 760 }

// 1) 记下鞘翅 mesh，并保存所有原材质
await p.evaluate(() => {
  const { scene } = window.__preview
  const all = []
  scene.traverse((o) => {
    if (o.isMesh && o.material && !Array.isArray(o.material)) all.push(o)
  })
  window.__all = all
  window.__orig = all.map((o) => o.material)
  // 鞘翅 = 面积最大且原色为 #e2382a 的那个
  window.__elytra = all.find((o) => o.material.color && o.material.color.getHexString() === 'e2382a')
})

// 2) ID 图：只把鞘翅点亮成纯绿，其余全部纯黑 —— 掩膜最干净
await p.evaluate(() => {
  const { scene, gl, camera } = window.__preview
  gl.toneMapping = 0
  gl.outputColorSpace = 'srgb-linear'
  window.__all.forEach((o) => {
    const m = o.material.clone()
    if (m.color) m.color.setRGB(0, 0, 0)
    if (m.emissive) {
      m.emissive.setRGB(o === window.__elytra ? 0 : 0, o === window.__elytra ? 1 : 0, 0)
      m.emissiveIntensity = 1
    }
    m.metalness = 0
    m.roughness = 1
    if ('clearcoat' in m) m.clearcoat = 0
    if ('iridescence' in m) m.iridescence = 0
    m.envMapIntensity = 0
    m.map = m.normalMap = m.roughnessMap = m.emissiveMap = null
    m.needsUpdate = true
    o.material = m
  })
  gl.render(scene, camera)
})
await p.waitForTimeout(700)
await p.screenshot({ path: '/tmp/audit-shots/q-mask.png', clip: CLIP })

// 3) 还原材质与渲染管线
await p.evaluate(() => {
  const { scene, gl, camera } = window.__preview
  window.__all.forEach((o, i) => (o.material = window.__orig[i]))
  gl.toneMapping = 4 // ACESFilmicToneMapping
  gl.outputColorSpace = 'srgb'
  gl.render(scene, camera)
})
await p.waitForTimeout(700)

const variants = [
  ['roughness 0.319（现状）', 0.319],
  ['roughness 0.40', 0.4],
  ['roughness 0.48', 0.48],
  ['roughness 0.56', 0.56],
  ['roughness 0.65', 0.65],
  ['roughness 0.75', 0.75],
]

for (const [name] of variants) {
  const idx = variants.findIndex((v) => v[0] === name)
  await p.evaluate((i) => {
    const { scene, gl, camera } = window.__preview
    const e = window.__elytra
    if (!window.__elyOrig) window.__elyOrig = e.material.clone()
    const m = window.__elyOrig.clone()
    const vals = [0.319, 0.4, 0.48, 0.56, 0.65, 0.75]
    m.roughness = vals[i]
    m.needsUpdate = true
    e.material = m
    gl.render(scene, camera)
  }, idx)
  await p.waitForTimeout(700)
  await p.screenshot({ path: `/tmp/audit-shots/q-${idx}.png`, clip: CLIP })
}

writeFileSync('/tmp/audit-shots/q-names.json', JSON.stringify(variants.map((v) => v[0])))
console.log('done')
await b.close()
