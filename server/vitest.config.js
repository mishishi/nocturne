import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.js', 'tests/**/*.test.js'],
    coverage: {
      provider: 'v8',
      include: ['src/services/**/*.js'],
      exclude: ['**/*.test.js', '**/node_modules/**']
    },
    testTimeout: 10000
  }
})
