import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    // Test unit menguji domain/ tanpa database; test integrasi memerlukannya.
    // Keduanya dipisah supaya `npm run test:unit` bisa jalan di mana saja.
    include: ['tests/**/*.spec.ts'],
    environment: 'node',
    globals: false,
    testTimeout: 15000,

    /**
     * Satu berkas test pada satu waktu, TIDAK paralel.
     *
     * Dua alasan, keduanya nyata dan keduanya sudah kami tabrak:
     *
     * 1. Setiap berkas test integrasi mengimpor `lib/prisma.ts`, dan setiap
     *    worker adalah proses sendiri — jadi paralel berarti satu Prisma Client
     *    (beserta engine dan pool-nya) PER BERKAS. Menjalankannya paralel di
     *    Windows mengakhiri proses dengan segmentation fault, bukan dengan
     *    kegagalan test yang bisa dibaca.
     *
     * 2. Anggaran koneksi database bersama kami 20 TOTAL untuk enam orang
     *    (docs/DATABASE.md bagian 2). Lima berkas test paralel di satu laptop
     *    sudah cukup untuk memunculkan "too many connections" di laptop ORANG
     *    LAIN, dan gejalanya muncul jauh dari sebabnya.
     *
     * Biayanya kecil: seluruh test integrasi selesai di bawah 15 detik.
     */
    fileParallelism: false,
  },
})
