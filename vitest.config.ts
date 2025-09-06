import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx', 'src/**/*.spec.ts', 'src/**/*.spec.tsx'],
    coverage: {
      reporter: ['text', 'lcov'],
      reportsDirectory: 'coverage',
      include: ['src/**/*.{ts,tsx}', 'functions/src/**/*.ts'],
      exclude: ['**/*.test.*', '**/*.spec.*', '.next/**', 'dist/**', 'functions/dist/**', 'coverage/**', 'node_modules/**']
    }
  }
})
