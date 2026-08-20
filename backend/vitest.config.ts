import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    // Test unit menguji domain/ tanpa database; test integrasi memerlukannya.
    // Keduanya dipisah supaya `npm run test:unit` bisa jalan di mana saja.
    include: ['tests/**/*.spec.ts'],
    environment: 'node',
    globals: false,
    testTimeout: 15000,
  },
})
