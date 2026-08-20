/**
 * Aturan lapisan DITEGAKKAN LINT, bukan hanya disepakati (SDD BAB 2.2).
 * Kesepakatan yang tidak ditegakkan akan dilanggar pada jam ke-7 — biasanya oleh
 * keluaran AI yang menaruh perhitungan di route handler.
 */
module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  parserOptions: { ecmaVersion: 2022, sourceType: 'module' },
  plugins: ['@typescript-eslint', 'import'],
  extends: ['eslint:recommended', 'plugin:@typescript-eslint/recommended'],
  env: { node: true, es2022: true },
  ignorePatterns: ['dist', 'node_modules', '*.cjs'],
  rules: {
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    '@typescript-eslint/no-explicit-any': 'error',
    'no-console': ['warn', { allow: ['warn', 'error'] }],

    'import/no-restricted-paths': [
      'error',
      {
        zones: [
          {
            // domain/ adalah dasar: aturan bisnis murni, tanpa I/O apa pun.
            // Kalau ia boleh mengimpor Prisma, parameter akan dibaca di dua
            // tempat dan ADR-0003 runtuh.
            target: './src/domain',
            from: './src',
            except: ['./domain', './lib/errors.ts'],
            message:
              'domain/ hanya boleh mengimpor lib/errors.ts. Aturan bisnis tidak boleh tahu tentang Prisma, HTTP, atau env (SDD BAB 2.2).',
          },
          {
            target: './src/routes',
            from: './src/repositories',
            message: 'Route tidak boleh mengakses repository langsung. Lewat service (SDD BAB 2.2).',
          },
          {
            target: './src/repositories',
            from: './src/services',
            message: 'Repository tidak boleh memanggil service. Arah ketergantungan hanya ke bawah.',
          },
        ],
      },
    ],

    // Prisma hanya boleh diimpor repositories/ dan lib/prisma.ts sendiri.
    'no-restricted-imports': [
      'error',
      {
        paths: [
          {
            name: '@prisma/client',
            message:
              'Impor Prisma hanya di lib/prisma.ts dan repositories/. Lapisan lain memakai repository.',
          },
        ],
      },
    ],
  },
  overrides: [
    {
      // Berkas yang memang bertugas menyentuh Prisma dan env.
      files: ['src/lib/prisma.ts', 'src/repositories/**/*.ts', 'prisma/**/*.ts', 'src/services/**/*.ts'],
      rules: { 'no-restricted-imports': 'off' },
    },
    {
      // Skrip seed memang berbicara ke terminal: keluarannya adalah satu-satunya
      // cara penilai melihat apa yang tertanam saat `docker compose up`.
      files: ['prisma/**/*.ts'],
      rules: { 'no-console': 'off' },
    },
    {
      files: ['tests/**/*.ts'],
      rules: { '@typescript-eslint/no-explicit-any': 'off' },
    },
  ],
}
