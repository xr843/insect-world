// defineConfig 从 vitest/config 引：同一份配置里要写 test 块（vite 的类型不认识它）
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: { port: 5178, host: true },
  build: {
    rollupOptions: {
      // preview.html 是模型调试台，与主站一起构建以免它悄悄失效
      input: { main: 'index.html', en: 'en/index.html', preview: 'preview.html' },
    },
  },
  test: {
    // 只收 src/ 下的测试。vitest 默认 glob 整个仓库的 *.test.*，而并行 agent 的
    // git worktree 挂在 .claude/worktrees/ 下、各带一整份 src 副本 —— 默认规则会把
    // 几份测试套件一起吞进来（实测 236 文件），相对 cwd 读文件的测试
    // （no-hardcoded-cjk 等）随即大面积串扰误报。
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
  },
})
