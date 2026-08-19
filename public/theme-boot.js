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
// 所以这里先用一条 CSS 把它藏起来，2 秒后再放出来：
//   - 应用正常挂载（实测不限速 0.8~1.9 秒）→ 容器早被清空，这条规则从头到尾
//     没匹配到任何东西，用户一眼都看不到，也就没有闪；
//   - 网络很慢或主包挂了（实测 Fast 3G 3.8 秒、Slow 3G 12.8 秒）→ 2 秒后正文
//     露出来，那正是它作为兜底该干的事。
//
// ⚠️ 放出来时**必须是淡入，不能是硬切**。阈值两侧各有一段「露一下就被抹掉」的
// 窄带：挂载时间落在 2.0~2.5 秒之间的那些访问，硬切出来还是一闪。而且这段窄带
// 挪不掉 —— 阈值抬到 3 秒，不限速的安全了，Fast 3G 那 3.8 秒就正好掉进去。
// 既然坏区间消不掉，就让它**不难看**：450ms 淡入，被抹掉时用户最多瞥见一层
// 两成透明度的影子，而真慢的时候这点淡入根本察觉不到。
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
    // 换规则而不是删规则：删掉是硬切，换成淡入才有上面说的那层缓冲
    style.textContent =
      '@keyframes iw-seo-in { from { opacity: 0 } }' +
      '#root > article { animation: iw-seo-in .45s ease both }'
  }, HOLD_MS)
})()
