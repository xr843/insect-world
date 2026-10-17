/** 浏览器回归检查：先 npm run build，再 npm run test:browser。 */
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { setTimeout as delay } from 'node:timers/promises'
import { chromium } from 'playwright'

const base = 'http://127.0.0.1:4179'
const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'preview', '--host', '127.0.0.1', '--port', '4179', '--strictPort'], { stdio: 'pipe' })
let serverOutput = ''
server.stdout.on('data', (chunk) => { serverOutput += chunk })
server.stderr.on('data', (chunk) => { serverOutput += chunk })
let browser
let checks = 0
async function testPage(options = {}) {
  const page = await browser.newPage(options)
  page.setDefaultTimeout(15000)
  // 回归检查不向正式统计写入测试流量，也不依赖第三方脚本的存储行为。
  await page.route('https://analytics.fojin.app/**', (route) => route.abort())
  return page
}
try {
  let ready = false
  for (let attempt = 0; attempt < 100; attempt++) {
    if (server.exitCode !== null) throw new Error(`预览服务启动失败：${serverOutput}`)
    try { ready = (await fetch(base)).ok } catch { /* 等待服务监听 */ }
    if (ready) break
    await delay(100)
  }
  assert.ok(ready, '预览服务未就绪')
  browser = await chromium.launch({ headless: true })

  // 中文、英文与长物种名，覆盖身份区和生活史入口曾经重叠的窄屏。
  for (const path of ['/', '/en/', '/en/s/swallowtail/']) {
    for (const width of [320, 390, 640]) {
      const page = await testPage({ viewport: { width, height: 844 } })
      const errors = []
      page.on('pageerror', (error) => errors.push(error.message))
      await page.goto(`${base}${path}`)
      await page.locator('.stage-height canvas').waitFor()
      await page.evaluate(() => document.fonts.ready)
      const layout = await page.evaluate(() => {
        const identity = document.querySelector('[class*="identity"]')
        const labels = identity ? [...identity.children].map((node) => node.getBoundingClientRect()) : []
        const cue = document.querySelector('[class*="lifeCue"]')?.getBoundingClientRect()
        return {
          overflow: document.documentElement.scrollWidth > innerWidth,
          overlap: cue && labels.some((label) => label.left < cue.right && label.right > cue.left && label.top < cue.bottom && label.bottom > cue.top),
          touchSize: cue ? Math.min(cue.width, cue.height) : 0,
        }
      })
      assert.equal(layout.overflow, false, `${path} ${width}px 横向溢出`)
      assert.equal(layout.overlap, false, `${path} ${width}px 物种名与入口重叠`)
      assert.ok(layout.touchSize >= 44, `${path} ${width}px 生活史入口触控区域不足`)
      assert.deepEqual(errors, [], `${path} ${width}px 页面异常`)
      await page.close()
      checks++
    }
  }

  const page = await testPage({ viewport: { width: 1440, height: 1000 } })
  await page.goto(`${base}/s/tiger-beetle/`)
  const button = page.getByTitle('换一只看看')
  await button.waitFor()
  const before = await page.title()
  await button.click()
  await page.waitForFunction((title) => document.title !== title, before)
  checks++
  await page.close()

  // 真实浏览器禁用 Storage，包括 getter 抛错与读写抛错两种情况。
  for (const failure of ['getter', 'methods']) {
    const blocked = await testPage({ locale: 'en-US' })
    const errors = []
    blocked.on('pageerror', (error) => errors.push(error.message))
    await blocked.addInitScript((mode) => {
      const denied = () => { throw new DOMException('Storage blocked', 'SecurityError') }
      if (mode === 'getter') Object.defineProperty(window, 'localStorage', { get: denied })
      else { Storage.prototype.getItem = denied; Storage.prototype.setItem = denied }
    }, failure)
    await blocked.goto(base)
    await blocked.getByLabel('切换到深色主题').click()
    await blocked.getByLabel('切换到浅色主题').waitFor()
    await blocked.getByLabel('Dismiss').click()
    assert.equal(await blocked.getByRole('note').count(), 0)
    assert.deepEqual(errors, [], `Storage ${failure} 被拒绝时页面异常`)
    await blocked.close()
    checks++
  }
  // 来源证据范围、中英文窄屏，以及未确认收件时保留反馈草稿。
  for (const [path, heading, count, date, abstractLabel] of [
    ['/', '来源与核校', 3, '2026-09-30', null],
    ['/en/', 'Sources and checks', 3, '2026-09-30', null],
    ['/s/ladybird/', '来源与核校', 4, '2026-10-01', '已读摘要（未读全文）'],
    ['/en/s/ladybird/', 'Sources and checks', 4, '2026-10-01', 'Abstract read; full text not read'],
    ['/s/honeybee/', '来源与核校', 3, '2026-10-01', null],
    ['/en/s/honeybee/', 'Sources and checks', 3, '2026-10-01', null],
    ['/s/mantis/', '来源与核校', 2, '2026-10-01', null],
    ['/en/s/mantis/', 'Sources and checks', 2, '2026-10-01', null],
    ['/s/monarch-butterfly/', '来源与核校', 5, '2026-10-17', null],
    ['/en/s/monarch-butterfly/', 'Sources and checks', 5, '2026-10-17', null],
    ['/s/locust/', '来源与核校', 4, '2026-10-17', null],
    ['/en/s/locust/', 'Sources and checks', 4, '2026-10-17', null],
    ['/s/tiger-beetle/', '来源与核校', 4, '2026-10-17', null],
    ['/en/s/tiger-beetle/', 'Sources and checks', 4, '2026-10-17', null],
    ['/s/swallowtail/', '来源与核校', 3, '2026-10-17', null],
    ['/en/s/swallowtail/', 'Sources and checks', 3, '2026-10-17', null],
    ['/s/stag-beetle/', '来源与核校', 4, '2026-10-17', null],
    ['/en/s/stag-beetle/', 'Sources and checks', 4, '2026-10-17', null],
    ['/s/mole-cricket/', '来源与核校', 4, '2026-10-17', null],
    ['/en/s/mole-cricket/', 'Sources and checks', 4, '2026-10-17', null],
    ['/s/dragonfly/', '来源与核校', 6, '2026-10-17', null],
    ['/en/s/dragonfly/', 'Sources and checks', 6, '2026-10-17', null],
    ['/s/ant/', '来源与核校', 5, '2026-10-17', null],
    ['/en/s/ant/', 'Sources and checks', 5, '2026-10-17', null],
    ['/s/cicada/', '来源与核校', 7, '2026-10-17', null],
    ['/en/s/cicada/', 'Sources and checks', 7, '2026-10-17', null],
    ['/s/longhorn-beetle/', '来源与核校', 5, '2026-10-17', null],
    ['/en/s/longhorn-beetle/', 'Sources and checks', 5, '2026-10-17', null],
  ]) {
    const sourcePage = await testPage({ viewport: { width: 320, height: 844 } })
    await sourcePage.goto(`${base}${path}`)
    const sources = sourcePage.getByRole('region', { name: heading })
    await sources.scrollIntoViewIfNeeded()
    assert.equal(await sources.getByRole('link').count(), count)
    assert.ok((await sources.textContent()).includes(date))
    if (abstractLabel) await sources.getByText(abstractLabel).waitFor()
    assert.equal(await sourcePage.evaluate(() => document.documentElement.scrollWidth > innerWidth), false)
    await sourcePage.close()
    checks++
  }
  const draftPage = await testPage()
  const draftRequests = []
  await draftPage.route('**/api/feedback', route => {
    draftRequests.push(route.request().postDataJSON())
    return route.fulfill(draftRequests.length === 1
      ? { status: 200, contentType: 'text/html', body: '<html>fallback</html>' }
      : { status: 200, contentType: 'application/json', body: '{"ok":true}' })
  })
  await draftPage.goto(base)
  await draftPage.locator('button[class*="reportError"]').click()
  const dialog = draftPage.getByRole('dialog')
  const text = dialog.locator('textarea')
  await text.fill('这段反馈需要保留')
  await dialog.getByRole('button', { name: '发送', exact: true }).click()
  await dialog.getByRole('status').waitFor()
  assert.equal(await text.inputValue(), '这段反馈需要保留')
  assert.equal(await dialog.getByRole('button', { name: '发送', exact: true }).isEnabled(), true)
  await dialog.getByRole('button', { name: '发送', exact: true }).click()
  await dialog.locator('textarea').waitFor({ state: 'hidden' })
  assert.match(draftRequests[0].requestId, /^[0-9a-f-]{36}$/)
  assert.deepEqual(draftRequests[1], draftRequests[0])
  await dialog.getByRole('button', { name: '再说一条', exact: true }).click()
  await dialog.locator('textarea').fill('这段反馈需要保留')
  await dialog.getByRole('button', { name: '发送', exact: true }).click()
  await dialog.locator('textarea').waitFor({ state: 'hidden' })
  assert.notEqual(draftRequests[2].requestId, draftRequests[0].requestId)
  await draftPage.close()
  checks++
  // 在实际R3F场景中持有模型，加载压力不得逐出正在展示的成虫/卵。
  const cachePage = await testPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })
  await cachePage.addInitScript(() => {
    window.__probeReleases = 0
    const getContext = HTMLCanvasElement.prototype.getContext
    HTMLCanvasElement.prototype.getContext = function(kind, ...args) {
      const context = getContext.call(this, kind, ...args)
      if (kind === 'webgl2' && context && !this.isConnected) {
        const getExtension = context.getExtension.bind(context)
        context.getExtension = name => {
          const extension = getExtension(name)
          if (name !== 'WEBGL_lose_context' || !extension) return extension
          return new Proxy(extension, { get(target, key) {
            if (key === 'loseContext') return () => { window.__probeReleases++; target.loseContext() }
            const value = Reflect.get(target, key)
            return typeof value === 'function' ? value.bind(target) : value
          } })
        }
      }
      return context
    }
  })
  await cachePage.goto(`${base}/?perf=1`)
  await cachePage.waitForFunction(() => window.__perf?.firstFrame != null)
  assert.ok(await cachePage.evaluate(() => window.__probeReleases >= 1), '临时探测上下文未释放')
  assert.equal(await cachePage.evaluate(() => window.__perf.debug.gl.getContext().isContextLost()), false)
  await cachePage.evaluate(async () => {
    const debug = window.__perf.debug
    const current = await debug.loadInsectModel('rhinoceros-beetle')
    let disposals = 0
    const resources = new Set()
    current.group.traverse(mesh => {
      if (!mesh.isMesh) return
      resources.add(mesh.geometry)
      for (const material of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) resources.add(material)
    })
    for (const resource of resources) resource.addEventListener('dispose', () => { disposals++ })
    for (const id of debug.knownSpecies().filter(id => id !== 'rhinoceros-beetle').slice(0, 20)) {
      const lease = debug.acquireInsectModel(id)
      try { await lease.promise } finally { lease.release() }
    }
    if (disposals || !debug.cacheStats().ids.includes('rhinoceros-beetle') || debug.cacheStats().size > 12) throw new Error('展示成虫被逐出或dispose')
  })
  await cachePage.locator('button[class*="lifeCue"]').click()
  await cachePage.waitForFunction(() => window.__perf.marks.filter(mark => mark.name === 'model-committed').length >= 2)
  const cacheEvidence = await cachePage.evaluate(async () => {
    const debug = window.__perf.debug
    const reservation = debug.acquireStageModel('rhinoceros-beetle', 'egg')
    const current = await reservation.promise
    reservation.release() // 接下来的保护必须来自真实Scene，而不是本测试的额外引用。
    let disposals = 0
    const resources = new Set()
    current.group.traverse(mesh => {
      if (!mesh.isMesh) return
      resources.add(mesh.geometry)
      for (const material of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) resources.add(material)
    })
    for (const resource of resources) resource.addEventListener('dispose', () => { disposals++ })
    const pairs = debug.speciesWithStages().flatMap(id => debug.builtStagesOf(id).map(stage => [id, stage]))
    const sizes = []
    for (let lap = 0; lap < 2; lap++) {
      for (const [id, stage] of pairs) {
        const lease = debug.acquireStageModel(id, stage)
        try { await lease.promise } finally { lease.release() }
        if (debug.stageCacheStats().size > 12) throw new Error('阶段缓存没有回落到12')
      }
      const buffers = new Set()
      for (const key of debug.stageCacheStats().keys) {
        const [, id, stage] = key.match(/^(.*)-(egg|larva|pupa|nymph)$/)
        const lease = debug.acquireStageModel(id, stage)
        try {
          const model = await lease.promise
          model.group.traverse(mesh => {
            if (!mesh.isMesh) return
            const geometry = mesh.geometry
            for (const attribute of Object.values(geometry.attributes)) buffers.add(attribute.array.buffer)
            if (geometry.index) buffers.add(geometry.index.array.buffer)
          })
        } finally { lease.release() }
      }
      sizes.push([...buffers].reduce((bytes, buffer) => bytes + buffer.byteLength, 0))
    }
    if (disposals || !debug.stageCacheStats().keys.includes('rhinoceros-beetle-egg')) throw new Error('展示卵被逐出或dispose')
    if (sizes[1] !== sizes[0]) throw new Error('相同遍历后几何缓存持续增长')
    return { stages: pairs.length, cache: debug.stageCacheStats().size, geometryBytes: sizes, activeDisposals: disposals }
  })
  console.log('✓ 模型缓存压力检查', JSON.stringify(cacheEvidence))
  // 此交互不导航；每一步以实际模型提交为完成条件。
  for (let step = 0; step < 3; step++) {
    const committed = await cachePage.evaluate(() => window.__perf.marks.filter(mark => mark.name === 'model-committed').length)
    await cachePage.getByRole('button', { name: /下一步/ }).click({ noWaitAfter: true })
    await cachePage.waitForFunction(count => window.__perf.marks.filter(mark => mark.name === 'model-committed').length > count, committed, { timeout: 30000 })
  }
  await cachePage.getByRole('button', { name: /看完了/ }).click({ noWaitAfter: true })
  await cachePage.getByRole('button', { name: /看完了/ }).waitFor({ state: 'hidden' })
  await cachePage.close()
  checks++
  const previewPage = await testPage({ viewport: { width: 1440, height: 1000 } })
  const previewErrors = []
  previewPage.on('pageerror', error => previewErrors.push(error.message))
  await previewPage.goto(`${base}/preview.html`)
  await previewPage.waitForFunction(() => window.__preview?.model && window.__preview.model.group.parent)
  const originalModel = await previewPage.evaluateHandle(() => window.__preview.model)
  await previewPage.getByRole('button', { name: '中华大刀螳', exact: true }).click()
  await previewPage.waitForFunction(original => window.__preview?.model && window.__preview.model !== original && window.__preview.model.group.parent, originalModel)
  await originalModel.dispose()
  assert.deepEqual(previewErrors, [])
  await previewPage.close()
  checks++
  const webgl1Page = await testPage({ viewport: { width: 390, height: 844 } })
  let selectedBuilderRequests = 0
  webgl1Page.on('request', request => { if (/rhinoceros-beetle-[^/]+\.js/.test(request.url())) selectedBuilderRequests++ })
  await webgl1Page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext
    HTMLCanvasElement.prototype.getContext = function(kind, ...args) {
      if (kind === 'webgl2') return null
      if (kind === 'webgl') return {}
      return original.call(this, kind, ...args)
    }
  })
  await webgl1Page.goto(base)
  await webgl1Page.getByText(/WebGL 不可用/).waitFor()
  assert.equal(await webgl1Page.locator('.stage-height canvas').count(), 0)
  assert.equal(selectedBuilderRequests, 0)
  await webgl1Page.getByRole('heading', { name: '双叉犀金龟', exact: true }).waitFor()
  await webgl1Page.close()
  checks++
  console.log(`✓ 浏览器回归 ${checks} 个场景通过（窄屏布局、换虫、存储故障、来源、反馈草稿、模型缓存、调试台与WebGL1兜底）`)
} finally {
  try { await browser?.close() } finally { server.kill('SIGTERM') }
}
