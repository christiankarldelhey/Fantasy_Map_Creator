import { defineConfig, mergeConfig } from 'vitest/config'
import viteConfig from './vite.config'

// Test options live here; plugins and aliases are inherited from the Vite
// config so the two never drift.
export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      include: ['src/**/*.test.ts']
    }
  })
)
