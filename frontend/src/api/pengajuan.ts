import { api, simpanToken } from '../api/client';
import { rupiah } from '../api/client';

export async function getPengajuanList(params?: { status?: string; q?: string; page?: number }) {
  const search = new URLSearchParams();
  if (params?.status) search.set('status', params.status);
  if (params?.q) search.set('q', params.q);
  if (params?.page) search.set('page', String(params.page));
  const qs = search.toString();
  return api<{ data: any[]; total: number }>(`/api/pengajuan${qs ? `?${qs}` : ''}`);
}

export async function getPengajuanDetail(id: string) {
  return api<any>(`/api/pengajuan/${id}`);
}

export async function createPengajuan(data: {
  jenis_nasabah: string;
  akad: string;
  tenor_bulan: number;
  anggota?: Array<{ nasabah_id: string; plafon_diajukan: number }>;
}) {
  return api<any>('/api/pengajuan', { method: 'POST', body: JSON.stringify(data) });
}

export async function submitPengajuan(id: string) {
  return api<any>(`/api/pengajuan/${id}/submit`, { method: 'POST' });
}
