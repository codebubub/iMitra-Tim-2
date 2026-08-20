import type { GalatApi } from '../api/client'

/**
 * Panel pelanggaran aturan bisnis.
 *
 * Kalimatnya untuk pengguna; badge kode BR di sampingnya untuk penilai dan untuk
 * pelaporan bug. AC-04 mensyaratkan pesan yang menyebut BR-03, dan AC-09
 * mensyaratkan BR-06 — kode itu datang dari field `rule` pada respons API, bukan
 * ditebak di frontend.
 */
export function PanelGalat({ galat }: { galat: GalatApi | null }) {
  if (!galat) return null
  return (
    <div className="panel-galat" role="alert">
      <span>{galat.message}</span>
      {galat.rule && <span className="panel-galat__kode">{galat.rule}</span>}
    </div>
  )
}
