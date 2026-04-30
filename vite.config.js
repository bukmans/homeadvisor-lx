import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// For GitHub Pages deployment, set base to your repo name:
// base: '/homeadvisor-lx/'
// For Vercel/Netlify, keep base as '/'

export default defineConfig({
  plugins: [react()],
  base: '/homeadvisor-lx/',
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
  server: {
    port: 5173,
    open: true,
    proxy: {
      '/api/claude': {
        target: 'https://api.anthropic.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/claude/, '/v1/messages'),
      },
    },
  },
})
