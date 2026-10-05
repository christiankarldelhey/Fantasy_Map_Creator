import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// Served by the story-engine at /studio (ADR 0002). In dev the API is
// proxied to the running story-engine; STUDIO_AUTH="user:pass" makes the
// proxy sign requests itself (headless checks), otherwise the browser asks.
const auth = process.env.STUDIO_AUTH

export default defineConfig({
  base: '/studio/',
  plugins: [vue()],
  server: {
    port: 5180,
    proxy: {
      '/studio/api': {
        target: 'http://localhost:8001',
        changeOrigin: true,
        headers: auth
          ? { Authorization: `Basic ${Buffer.from(auth).toString('base64')}` }
          : undefined,
      },
    },
  },
})
