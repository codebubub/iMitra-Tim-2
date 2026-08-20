export function Pengguna() {
  return (
    <div className="konten">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1>Kelola Pengguna</h1>
        <button className="tombol">+ Tambah pengguna</button>
      </div>
      <div className="kartu" style={{ padding: 0, overflowX: 'auto' }}>
        <table className="tabel">
          <thead>
            <tr>
              <th>Nama</th>
              <th>Nama pengguna</th>
              <th>Peran</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td colSpan={4} className="redup" style={{ textAlign: 'center' }}>
                Daftar pengguna akan dimuat dari API.
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}
