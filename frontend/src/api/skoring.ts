import { api } from './client';

export async function getSkoring(pengajuanId: string) {
  return api<any>(`/api/pengajuan/${pengajuanId}/skoring`);
}

export async function runSkoring(pengajuanId: string) {
  return api<any>(`/api/pengajuan/${pengajuanId}/skoring`, { method: 'POST' });
}

export async function overrideSkoring(pengajuanId: string, data: { grade_final: number; alasan: string }) {
  return api<any>(`/api/pengajuan/${pengajuanId}/skoring/override`, { method: 'POST', body: JSON.stringify(data) });
}
