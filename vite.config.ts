import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: { port: 5178, host: true },
  build: {
    rollupOptions: {
      // preview.html 是模型调试台，与主站一起构建以免它悄悄失效
      input: { main: 'index.html', preview: 'preview.html' },
    },
  },
})
