/**
 * Klien HTTP ke backend iMitra.
 *
 * VITE_API_BASE_URL ditanamkan saat build (lihat Dockerfile). Nilainya
 * http://localhost:<port> karena yang memanggil adalah BROWSER di host, bukan
 * container — memakai nama service docker di sini adalah kesalahan.
 */
const BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080'
const KUNCI_TOKEN = 'imitra.token'

export type GalatApi = {
  error: string
  message: string
  /** Kode BR untuk pelanggaran aturan bisnis, mis. "BR-06". */
  rule?: string
  status: number
}

export function simpanToken(token: string): void {
  localStorage.setItem(KUNCI_TOKEN, token)
}
export function ambilToken(): string | null {
  return localStorage.getItem(KUNCI_TOKEN)
}
export function hapusToken(): void {
  localStorage.removeItem(KUNCI_TOKEN)
}

export async function api<T>(path: string, opsi: RequestInit = {}): Promise<T> {
  const token = ambilToken()
  const res = await fetch(`${BASE}${path}`, {
    ...opsi,
    headers: {
      'content-type': 'application/json',
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...(opsi.headers ?? {}),
    },
  })

  if (res.status === 401) {
    hapusToken()
  }

  const body = await res.json().catch(() => ({}))

  if (!res.ok) {
    // Galat diteruskan APA ADANYA termasuk field `rule`, supaya layar bisa
    // menampilkan kode BR di samping pesannya (AC-04, AC-09).
    const galat: GalatApi = {
      error: body.error ?? 'GALAT_TIDAK_DIKENAL',
      message: body.message ?? 'Terjadi kesalahan',
      rule: body.rule,
      status: res.status,
    }
    throw galat
  }

  return body as T
}

export const rupiah = (n: number): string => `Rp ${n.toLocaleString('id-ID')}`
