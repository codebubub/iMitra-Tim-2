/**
 * Bantuan bersama untuk test lapisan api/.
 *
 * Tidak memakai dependensi baru: fetch dan localStorage di-stub manual, bukan
 * lewat jsdom/RTL. Test ini menegakkan KONTRAK — URL, method, isi body, dan
 * bentuk respons yang dibaca layar — bukan render komponen.
 *
 * Yang diuji di sini adalah hal yang lolos typecheck tetapi bisa salah di
 * runtime: NIK di body bukan URL (BR-11), tidak adanya jalur "paksa" pada
 * margin (BR-06), field `rule` yang diteruskan apa adanya (AC-04/AC-09).
 */
import { vi } from 'vitest'

export type PanggilanTercatat = {
  url: string
  method: string
  headers: Record<string, string>
  body: unknown
}

/**
 * Memasang fetch tiruan yang mencatat setiap panggilan dan mengembalikan
 * respons yang ditentukan test. Mengembalikan array panggilan tercatat.
 */
export function pasangFetch(respons: {
  status?: number
  json?: unknown
}): PanggilanTercatat[] {
  const tercatat: PanggilanTercatat[] = []
  const status = respons.status ?? 200

  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string, opsi: RequestInit = {}) => {
      const headers = (opsi.headers ?? {}) as Record<string, string>
      tercatat.push({
        url,
        method: opsi.method ?? 'GET',
        headers,
        body: opsi.body ? JSON.parse(opsi.body as string) : undefined,
      })
      return {
        ok: status >= 200 && status < 300,
        status,
        json: async () => respons.json ?? {},
      } as unknown as Response
    }),
  )

  return tercatat
}

/** localStorage tiruan sederhana, cukup untuk simpan/ambil/hapus token. */
export function pasangLocalStorage(nilaiAwal: Record<string, string> = {}): void {
  const simpanan = new Map<string, string>(Object.entries(nilaiAwal))
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => simpanan.get(k) ?? null,
    setItem: (k: string, v: string) => simpanan.set(k, v),
    removeItem: (k: string) => simpanan.delete(k),
    clear: () => simpanan.clear(),
  })
}
