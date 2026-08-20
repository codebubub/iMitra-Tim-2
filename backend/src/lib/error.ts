export class ImitraError extends Error {
  constructor(
    public code: string,
    message: string,
    public statusCode: number = 500,
    public rule?: string,
  ) {
    super(message);
    this.name = 'ImitraError';
  }

  toJSON() {
    return {
      error: this.code,
      message: this.message,
      ...(this.rule ? { rule: this.rule } : {}),
    };
  }
}

export class ValidationError extends ImitraError {
  constructor(message: string, fields?: Record<string, string>) {
    super('VALIDASI_GAGAL', message, 400);
    this.name = 'ValidationError';
    this.fields = fields;
  }
  fields?: Record<string, string>;
}

export class AuthError extends ImitraError {
  constructor(message: string = 'Tidak terautentikasi') {
    super('TIDAK_TERAUTENTIKASI', message, 401);
    this.name = 'AuthError';
  }
}

export class ForbiddenError extends ImitraError {
  constructor(message: string = 'Akses ditolak') {
    super('AKSES_DITOLAK', message, 403);
    this.name = 'ForbiddenError';
  }
}

export class BusinessRuleError extends ImitraError {
  constructor(rule: string, message: string) {
    super('ATURAN_BISNIS_DILANGGAR', message, 422, rule);
    this.name = 'BusinessRuleError';
  }
}

export class NotFoundError extends ImitraError {
  constructor(message: string = 'Sumber daya tidak ditemukan') {
    super('TIDAK_DITEMUKAN', message, 404);
    this.name = 'NotFoundError';
  }
}

export class SlikError extends ImitraError {
  constructor(message: string = 'Layanan SLIK tidak tersedia') {
    super('SLIK_TIDAK_TERSEDIA', message, 502);
    this.name = 'SlikError';
  }
}
