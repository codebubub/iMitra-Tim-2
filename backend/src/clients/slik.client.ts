type SlikKolektibilitas = 1 | 2 | 3 | 4 | 5;

export interface SlikResponse {
  nik: string;
  nama: string;
  kolektibilitas: SlikKolektibilitas;
  jumlahFasilitasAktif: number;
  totalBakiDebet: bigint;
  tanggalData: string;
  referenceId: string;
}

export type SlikStatusPanggilan = 'OK' | 'NOT_FOUND' | 'UNAVAILABLE' | 'TIMEOUT';

export interface SlikResult {
  status: SlikStatusPanggilan;
  data?: SlikResponse;
  error?: string;
}

export class SlikClient {
  constructor(private baseUrl: string, private inquiryPath: string, private timeoutMs: number) {}

  async inquiry(nik: string): Promise<SlikResult> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const res = await fetch(`${this.baseUrl}${this.inquiryPath}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nik }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (res.status === 200) {
        const data = await res.json();
        return {
          status: 'OK',
          data: {
            ...data,
            totalBakiDebet: typeof data.totalBakiDebet === 'number' ? BigInt(data.totalBakiDebet) : data.totalBakiDebet,
          } as SlikResponse,
        };
      }

      if (res.status === 404) {
        return { status: 'NOT_FOUND', error: 'NIK_NOT_FOUND' };
      }

      if (res.status === 503) {
        return { status: 'UNAVAILABLE', error: 'SERVICE_UNAVAILABLE' };
      }

      return { status: 'UNAVAILABLE', error: `HTTP_${res.status}` };
    } catch (err: any) {
      clearTimeout(timeoutId);
      if (err.name === 'AbortError') {
        return { status: 'TIMEOUT', error: 'Timeout after ' + this.timeoutMs + 'ms' };
      }
      return { status: 'UNAVAILABLE', error: err.message || 'Network error' };
    }
  }
}
