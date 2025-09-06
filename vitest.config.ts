import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['**/*.{test,spec}.?(c|m)[jt]s?(x)'],
    coverage: {
      reportsDirectory: 'coverage',
      reporter: ['text', 'lcov'],
      include: ['src/**/*.{ts,tsx}', 'functions/src/**/*.ts'],
      exclude: [
        '**/*.test.*', '**/*.spec.*', '**/__tests__/**',
        'src/ai/dev.ts', 'src/stubs/**', 'src/tools/**',
        '**/*.config.ts', '**/*.config.js',
        '.next/**', 'dist/**', 'functions/dist/**', 'coverage/**', 'node_modules/**'
      ]
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
