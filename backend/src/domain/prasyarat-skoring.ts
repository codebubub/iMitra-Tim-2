export function prasyaratSkoringTerpenuhi(params: {
  adaDokumenTerverifikasi: boolean;
  adaSurveiValid: boolean;
  adaHasilSlikOk: boolean;
}): boolean {
  const { adaDokumenTerverifikasi, adaSurveiValid, adaHasilSlikOk } = params;
  return adaDokumenTerverifikasi && adaSurveiValid && adaHasilSlikOk;
}
