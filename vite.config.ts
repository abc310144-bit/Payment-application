import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: process.env.GITHUB_PAGES === 'true' ? '/Payment-application/' : '/',
  server: {
    host: '0.0.0.0',
    port: 43141,
    strictPort: true,
  },
  preview: {
    host: '0.0.0.0',
    port: 43141,
    strictPort: true,
  },
})
