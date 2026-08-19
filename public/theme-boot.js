// 首帧引导：两件必须**赶在第一次绘制之前**做完的事。
// CSP 定的是 script-src 'self' 且全站无内联脚本 —— 所以这段必须是同源小文件、
// 同步加载（放 <head> 里阻塞解析正是目的：晚一步就闪）。

// ① 主题：把 <html data-theme> 设好，双向消除主题闪变（默认浅色，选过深色的
// 回深色）。App.tsx 挂载后接管同一份 localStorage 键。
document.documentElement.dataset.theme =
  (function () {
    try {
      return localStorage.getItem('iw-theme')
    } catch (e) {
      return null
    }
  })() === 'dark'
    ? 'dark'
    : 'light'

// ② SEO 静态正文：默认不给用户看，只有在应用迟迟不来时才放出来。
//
// 构建期往 `#root` 里注入了整篇可爬正文（见 scripts/make-species-pages.mjs），
// 那是给不执行 JS 的爬虫看的。但 `createRoot().render()` 首次渲染会清空容器，
// 于是真人看到的是**一整屏文字闪一下就没了** —— 实测热缓存下只闪 87ms、
// 冷缓存 736ms，快到读不出内容，只读得出「这页有毛病」。
//
// 所以这里先用一条 CSS 把它藏起来，2 秒后撤掉这条规则：
//   - 应用正常挂载（实测 0.3~1.5 秒）→ 容器早被清空，这条规则从头到尾没匹配到
//     任何东西，用户一眼都看不到，也就没有闪；
//   - 网络很慢或主包挂了 → 2 秒后正文露出来，那正是它作为兜底该干的事。
//
// 为什么是 JS 加规则而不是写死在 CSS 里：**不执行 JS 的爬虫压根跑不到这一行**，
// 拿到的就是一篇正常可见的正文。给爬虫和给用户的是同一份内容，只有显示时机
// 不同 —— 不是把内容藏起来给爬虫看的那种做法。
//
// 为什么用 display 而不是 visibility：visibility 仍然占位，藏着的时候页面会先
// 撑出一条几屏高的滚动条，应用接管后又缩回去。
;(function () {
  var HOLD_MS = 2000
  var style = document.createElement('style')
  style.textContent = '#root > article { display: none }'
  document.head.appendChild(style)
  setTimeout(function () {
    if (style.parentNode) style.parentNode.removeChild(style)
  }, HOLD_MS)
})()
