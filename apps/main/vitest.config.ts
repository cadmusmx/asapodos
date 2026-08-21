import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      include: ['src/lib/tenant-settings/**/*.ts']
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@gaso/shared': path.resolve(__dirname, '../../packages/shared/src'),
      '@gaso/shared/*': path.resolve(__dirname, '../../packages/shared/src/*'),
      '@/lib/prisma': path.resolve(__dirname, '../../packages/shared/src/lib/prisma'),
      '@/lib/prisma-helpers': path.resolve(__dirname, '../../packages/shared/src/lib/prisma-helpers'),
      '@/lib/tenant-context': path.resolve(__dirname, '../../packages/shared/src/lib/tenant-context'),
      '@/lib/audit/catalog': path.resolve(__dirname, '../../packages/shared/src/lib/audit/catalog'),
      '@/lib/audit/transaction-log': path.resolve(__dirname, '../../packages/shared/src/lib/audit/transaction-log'),
      '@/lib/auth/require-admin': path.resolve(__dirname, '../../packages/shared/src/lib/auth/require-admin'),
      '@/libs/auth': path.resolve(__dirname, '../../packages/shared/src/lib/auth/nextauth-config'),
      '@/types/me': path.resolve(__dirname, '../../packages/shared/src/types/me'),
      '@/types/tenant-settings': path.resolve(__dirname, '../../packages/shared/src/types/tenant-settings'),
      '@/lib/audit/diff': path.resolve(__dirname, '../../packages/shared/src/lib/audit/diff')
    }
  }
})
