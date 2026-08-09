// 主题引导：在首帧渲染前把 <html data-theme> 设好，双向消除主题闪变
// （默认浅色，选过深色的回深色）。CSP 定的是 script-src 'self' 且全站
// 无内联脚本 —— 所以这段必须是同源小文件、同步加载（放 <head> 里阻塞
// 解析正是目的：晚一步就闪）。App.tsx 挂载后接管同一份 localStorage 键。
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
