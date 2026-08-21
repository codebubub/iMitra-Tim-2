/**
 * Kerangka pemuatan (skeleton).
 *
 * KENAPA BUKAN TULISAN "Memuat...". Teks satu baris membuat tinggi halaman
 * melompat begitu data datang: tombol yang tadi ada di bawah kursor tiba-tiba
 * bergeser, dan ketukan mendarat di tempat lain. Kerangka menahan ruang yang
 * kira-kira akan terisi, sehingga halaman tidak berubah bentuk dua kali.
 *
 * `aria-busy` dan teks tersembunyi ada supaya pembaca layar tetap mendapat
 * kabar — animasi abu-abu tidak berarti apa-apa baginya.
 */
export function Memuat({ baris = 3 }: { baris?: number }) {
  return (
    <div aria-busy="true" aria-live="polite" style={{ marginTop: 'var(--sp-5)' }}>
      <span className="sr-saja">Memuat data...</span>
      {Array.from({ length: baris }, (_, i) => (
        <div
          key={i}
          className="skeleton skeleton--baris"
          // Lebar dibuat bervariasi supaya tidak terlihat seperti tabel kosong
          // yang gagal dimuat, melainkan seperti isi yang sedang datang.
          style={{ width: `${100 - (i % 3) * 12}%` }}
        />
      ))}
    </div>
  )
}
