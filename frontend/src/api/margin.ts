import { api } from './client';

export async function getMargin(pengajuanId: string) {
  return api<unknown>(`/api/pengajuan/${pengajuanId}/margin`);
}

export async function setMargin(pengajuanId: string, data: { margin_persen?: number; nisbah_bank_persen?: number }) {
  return api<unknown>(`/api/pengajuan/${pengajuanId}/margin`, { method: 'POST', body: JSON.stringify(data) });
}
