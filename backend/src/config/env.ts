import { z } from 'zod';
import { ImitraError } from '#lib/error.js';

const envSchema = z.object({
  APP_ENV: z.enum(['development', 'test', 'production']).default('development'),
  TZ: z.string().default('Asia/Jakarta'),
  LOG_LEVEL: z.string().default('info'),
  PORT: z.coerce.number().default(8080),
  DB_HOST: z.string().default('localhost'),
  DB_PORT: z.coerce.number().default(5432),
  DB_NAME: z.string().default('imitra'),
  DB_USER: z.string().default('imitra_app'),
  DB_PASSWORD: z.string().default(''),
  DATABASE_URL: z.string().url(),
  DATABASE_URL_TEST: z.string().url(),
  JWT_SECRET: z.string().min(32),
  JWT_EXPIRES_IN: z.string().default('8h'),
  PASSWORD_HASH_COST: z.coerce.number().default(10),
  SEED_DEFAULT_PASSWORD: z.string().default('Demo1234!'),
  SLIK_BASE_URL: z.string().url(),
  SLIK_INQUIRY_PATH: z.string().default('/slik/inquiry'),
  SLIK_TIMEOUT_MS: z.coerce.number().default(3000),
  SLIK_RETRY: z.coerce.number().default(0),
  SLIK_RESULT_VALID_DAYS: z.coerce.number().default(30),
  UPLOAD_DIR: z.string().default('./uploads'),
  UPLOAD_MAX_BYTES: z.coerce.number().default(5242880),
  UPLOAD_ALLOWED_MIME: z.string().default('image/jpeg,image/png,application/pdf'),
  CORS_ALLOWED_ORIGINS: z.string().default('http://localhost:3000'),
});

export type Env = z.infer<typeof envSchema>;

let cachedEnv: Env | null = null;

export function loadEnv(): Env {
  if (cachedEnv) return cachedEnv;
  const raw = { ...process.env };
  try {
    cachedEnv = envSchema.parse(raw);
    return cachedEnv;
  } catch (err) {
    if (err instanceof z.ZodError) {
      const missing = err.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join('; ');
      throw new ImitraError('KONFIGURASI_TIDAK_VALID', `Variabel lingkungan tidak valid: ${missing}`, 500);
    }
    throw err;
  }
}
