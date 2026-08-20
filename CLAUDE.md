Lihat [AGENTS.md](AGENTS.md).

---

**Kenapa berkas ini hanya satu baris.** Tool AI membaca nama berkas yang berbeda-beda:
Claude Code membaca `CLAUDE.md`, Cursor membaca `.cursorrules` atau `.cursor/rules/`,
GitHub Copilot membaca `.github/copilot-instructions.md`, dan sebagian tool lain
(termasuk Hermes IDE dan Antigravity) membaca `AGENTS.md` sebagai konvensi bersama.

Cara termudah — dan satu-satunya yang tidak cepat usang — adalah **menjaga satu sumber
aturan di `AGENTS.md`** dan membuat berkas lain hanya menunjuk ke sana. Kalau isinya
disalin, salinan itu akan tertinggal pada perubahan pertama, dan agent yang membaca
salinan usang akan melanggar aturan yang Anda kira sudah Anda tulis.

Kalau ada anggota tim yang memakai tool lain, buat penunjuk serupa (satu baris, isinya
"Lihat AGENTS.md") pada nama berkas yang dibaca tool tersebut. Di sistem yang mendukung
symlink, `ln -s AGENTS.md CLAUDE.md` juga bisa dipakai — tetapi periksa dulu bahwa
tool Anda mengikuti symlink, dan bahwa symlink itu tetap utuh saat repo di-clone di
Windows.
