import pino from 'pino';

const SENSITIVE_KEYS = ['nik', 'password_hash', 'authorization', 'path_berkas', 'foto_path', 'nama_berkas'];

function redactValue(value: any): any {
  if (typeof value === 'string') return '[REDACTED]';
  if (Array.isArray(value)) return '[REDACTED_ARRAY]';
  if (value && typeof value === 'object') {
    const redacted: any = {};
    for (const key of Object.keys(value)) {
      redacted[key] = SENSITIVE_KEYS.includes(key.toLowerCase()) ? '[REDACTED]' : redactValue(value[key]);
    }
    return redacted;
  }
  return value;
}

export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  redact: {
    paths: SENSITIVE_KEYS,
    censor: '[REDACTED]',
  },
});
