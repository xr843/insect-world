/**
 * ID 图定位：找出「看着不对的那片像素」到底属于哪个网格。
 *
 * 做法：同一机位先渲一张正常图，再把每个 mesh 换成唯一色的无光照材质渲一张
 * ID 图；在正常图里找出最白的一片像素，用同样坐标去 ID 图取色，反查网格。
 * 两种结果都给信息 —— 命中鞘翅就排除「有洞露出后面」，命中别的就直接抓到真凶。
 */
import { chromium } from 'playwright'

const SPECIES = process.argv[2] ?? '七星瓢虫'
const b = await chromium.launch({
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
})
const p = await b.newPage({ viewport: { width: 900, height: 760 } })
await p.goto('http://localhost:4179/preview.html', { waitUntil: 'load' })
await p.waitForSelector('canvas', { timeout: 60000 })
await p.waitForTimeout(3000)
await p.evaluate((n) => {
  ;[...document.querySelectorAll('div > button')].find((x) => x.textContent.trim() === n)?.click()
}, SPECIES)
await p.waitForTimeout(4500)

// 转到问题机位
await p.mouse.move(560, 380)
await p.mouse.down()
await p.mouse.move(410, 320, { steps: 20 })
await p.mouse.up()
await p.waitForTimeout(2500)

const CLIP = { x: 210, y: 0, width: 690, height: 760 }
await p.screenshot({ path: '/tmp/audit-shots/id-lit.png', clip: CLIP })

// 换成 ID 材质
const legend = await p.evaluate(() => {
  const { scene, gl, camera } = window.__preview
  // ID 图必须绕开色调映射与色彩空间转换，否则读到的像素不等于写入的 ID 色
  // （ACES + sRGB 会把 (53,97,151) 映射成别的值，这正是第一次比对只命中 2609
  // 个像素、且全是足的原因）。
  gl.toneMapping = 0 // THREE.NoToneMapping
  gl.outputColorSpace = 'srgb-linear'
  const rows = []
  let i = 0
  scene.traverse((o) => {
    if (!o.isMesh || !o.material || Array.isArray(o.material)) return
    i++
    const r = (i * 53) % 256
    const g = (i * 97) % 256
    const bl = (i * 151) % 256
    const orig = o.material
    const c = orig.color ? '#' + orig.color.getHexString() : '?'
    o.geometry.computeBoundingBox()
    const bb = o.geometry.boundingBox
    const size = [
      ((bb.max.x - bb.min.x) * o.scale.x).toFixed(3),
      ((bb.max.y - bb.min.y) * o.scale.y).toFixed(3),
      ((bb.max.z - bb.min.z) * o.scale.z).toFixed(3),
    ].join('×')
    // 克隆再改：多个 mesh 常共用同一份材质（七个黑点就共用 spotMat），
    // 不克隆会让它们拿到同一个 ID 色，失去区分意义。
    const m = orig.clone()
    if (m.color) m.color.setRGB(0, 0, 0)
    if (m.emissive) {
      m.emissive.setRGB(r / 255, g / 255, bl / 255)
      m.emissiveIntensity = 1
    }
    m.metalness = 0
    m.roughness = 1
    if ('clearcoat' in m) m.clearcoat = 0
    if ('iridescence' in m) m.iridescence = 0
    m.envMapIntensity = 0
    m.map = null
    m.normalMap = null
    m.roughnessMap = null
    m.emissiveMap = null
    m.needsUpdate = true
    o.material = m
    rows.push({ idx: i, rgb: [r, g, bl], name: o.name || '(无名)', origColor: c, size })
  })
  return rows
})
await p.evaluate(() => {
  const { scene, gl, camera } = window.__preview
  gl.render(scene, camera)
})
await p.waitForTimeout(800)
await p.screenshot({ path: '/tmp/audit-shots/id-pass.png', clip: CLIP })
console.log(JSON.stringify(legend))
await b.close()
