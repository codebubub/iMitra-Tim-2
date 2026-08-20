import { api } from './client';

export async function getSlikHistory(pengajuanId: string) {
  return api<any[]>(`/api/pengajuan/${pengajuanId}/slik`);
}

export async function runSlikCheck(pengajuanId: string) {
  return api<any>(`/api/pengajuan/${pengajuanId}/slik-check`, { method: 'POST' });
}
