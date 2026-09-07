# PRD — BalapKetik

## 1. Ringkasan

BalapKetik adalah game typing race multiplayer yang terinspirasi dari [TypeRacer](https://play.typeracer.com/), tetapi berfokus pada balapan privat bersama teman. Pemain membuat atau bergabung ke room, membaca potongan lagu berbahasa Indonesia, lalu berlomba mengetik teks tersebut secepat dan setepat mungkin.

## 2. Tujuan Produk

- Memungkinkan teman membuat dan memainkan typing race privat dengan cepat.
- Memberikan pengalaman lobby dan room yang sederhana, jelas, dan menyenangkan.
- Menampilkan leaderboard top score untuk mendorong replayability.
- Menggunakan potongan lagu bahasa Indonesia sebagai konten utama permainan.

### Non-goals untuk MVP

- Matchmaking publik/random.
- Sistem ranking global yang kompleks.
- Chat suara, voice room, atau fitur sosial di luar room.
- Mobile app native; MVP diprioritaskan untuk web responsif.

## 3. Target Pengguna

Pengguna yang ingin bermain bersama teman dalam sesi singkat, terutama pelajar, komunitas, streamer, dan grup pertemanan yang membutuhkan game kompetitif ringan.

## 4. User Stories

- Sebagai pengguna, saya dapat login dengan Google agar tidak perlu membuat akun manual.
- Sebagai host, saya dapat membuat room dan membagikan link kepada teman.
- Sebagai pemain, saya dapat bergabung ke room melalui link atau kode room.
- Sebagai host, saya dapat mengubah pengaturan room dan menutup room.
- Sebagai pemain, saya dapat melihat siapa saja yang sudah masuk di lobby.
- Sebagai pemain, saya dapat mengobrol dengan peserta room sebelum dan selama race.
- Sebagai host, saya dapat memulai race ketika peserta sudah siap.
- Sebagai pemain, saya dapat melihat progres, kecepatan, akurasi, dan hasil race.
- Sebagai pengguna, saya dapat melihat 10 skor terbaik di dashboard.

## 5. Ruang Lingkup MVP

### 5.1 Login dengan Google

- Tombol “Login dengan Google” pada halaman login.
- Pengguna baru otomatis dibuatkan profil minimal: nama, foto, email, dan waktu pendaftaran.
- Pengguna yang sudah login diarahkan ke dashboard.
- Sesi login harus bertahan ketika halaman direfresh.
- Logout tersedia dari menu profil.

### 5.2 Dashboard utama

Dashboard menampilkan:

- Tombol “Create Room”.
- Input atau tombol “Join Room” menggunakan kode/link room.
- Daftar top score 10 besar.
- Identitas pemain yang sedang login.

Kolom top score minimal:

1. Peringkat
2. Nama pemain
3. WPM
4. Akurasi
5. Judul lagu/teks
6. Tanggal skor

Urutan default berdasarkan WPM tertinggi, dengan akurasi sebagai tie-breaker.

### 5.3 Create room

Host dapat membuat room dengan pengaturan:

- Nama room, opsional; default menggunakan nama host.
- Jumlah pemain maksimum, default 5 dan dapat dikonfigurasi sampai batas sistem.
- Mode room: privat melalui link/kode.
- Pilihan durasi atau jumlah teks, jika diperlukan oleh desain final.

Setelah room dibuat, host masuk ke halaman lobby dan memperoleh:

- Link undangan.
- Kode room.
- Tombol “Copy Link”.
- Tombol “Edit Room”.
- Tombol “Close Room”.

### 5.4 Lobby room

Lobby berisi:

- Nama dan status room.
- Daftar pemain yang bergabung, termasuk avatar dan status siap.
- Penanda host.
- Room chat.
- Tombol “Ready” untuk pemain.
- Tombol “Start Race” khusus host.
- Tombol copy link, edit room, dan close room khusus host.

Aturan MVP:

- Pemain tidak dapat masuk setelah race dimulai.
- Host hanya dapat memulai race jika minimal 2 pemain sudah siap.
- Jika host keluar, room ditutup atau host dipindahkan ke pemain lain; keputusan final perlu ditetapkan sebelum implementasi.
- Room otomatis kedaluwarsa setelah tidak aktif selama periode yang ditentukan, misalnya 30 menit.

### 5.5 Room chat

- Chat real-time per room.
- Menampilkan nama, avatar, waktu, dan isi pesan.
- Pesan dibatasi panjangnya, misalnya 200 karakter.
- Pesan kosong, spam berlebihan, dan karakter berbahaya harus ditangani.
- Riwayat chat hanya berlaku selama room aktif pada MVP.
- Host memiliki opsi moderasi minimal: menghapus pesan dan/atau mengeluarkan pemain pada fase lanjutan.

### 5.6 Join race dan start race

Alur race:

1. Host menekan “Start Race”.
2. Server memilih satu potongan lagu bahasa Indonesia.
3. Semua pemain menerima teks yang sama dan countdown tersinkronisasi.
4. Race dimulai setelah countdown selesai.
5. Pemain mengetik pada input race.
6. Sistem memperbarui progres pemain secara real-time.
7. Race selesai ketika pemain menyelesaikan teks atau waktu habis.
8. Semua pemain melihat halaman hasil.

Halaman race menampilkan:

- Teks target dengan penanda karakter benar/salah.
- Input ketikan.
- Countdown atau timer.
- WPM.
- Akurasi.
- Progres penyelesaian.
- Posisi/progres lawan secara real-time.
- Chat room yang tetap dapat dibuka jika tidak mengganggu fokus mengetik.

### 5.7 Hasil dan top score

Hasil race menampilkan:

- Peringkat pemain.
- WPM bersih dan/atau kotor, sesuai definisi yang dipilih.
- Akurasi.
- Jumlah karakter benar, salah, dan total.
- Waktu penyelesaian.
- Teks/lagu yang digunakan.
- Tombol “Race Again” dan “Back to Dashboard”.

Skor masuk top score hanya jika memenuhi kriteria validasi server, misalnya race selesai normal dan tidak terdeteksi manipulasi progres.

## 6. Konten Potongan Lagu

- Teks race berasal dari potongan lagu berbahasa Indonesia.
- Setiap item konten memiliki judul lagu, artis, teks, panjang karakter, dan status publikasi.
- Teks perlu melalui proses kurasi, normalisasi tanda baca, dan pengecekan panjang.
- Produk harus memastikan hak penggunaan/lisensi teks lagu sebelum dirilis publik.
- Hindari menampilkan lirik penuh; gunakan potongan pendek sesuai hak penggunaan yang tersedia.
- Admin/content owner membutuhkan cara untuk menambah, mengedit, mengarsipkan, dan mengaktifkan teks.

## 7. Persyaratan Fungsional

- Autentikasi Google melalui OAuth.
- Room memiliki ID/kode unik dan token/link undangan.
- Hanya host yang dapat mengedit pengaturan dan menutup room.
- Room, lobby, chat, countdown, progres, dan hasil harus sinkron melalui koneksi real-time.
- Server menjadi sumber kebenaran untuk waktu mulai, teks terpilih, progres tervalidasi, dan skor.
- Pengguna yang tidak login tidak dapat membuat atau mengikuti race.
- Link room yang tidak valid, kedaluwarsa, atau sudah ditutup menampilkan pesan yang jelas.
- Sistem menangani reconnect dan memberi status koneksi kepada pemain.

## 8. Persyaratan Non-fungsional

- Responsif untuk desktop dan mobile browser.
- Target waktu tampil dashboard kurang dari 3 detik pada koneksi normal.
- Pembaruan progres terasa real-time dengan target latensi UI maksimal sekitar 500 ms.
- Validasi skor dilakukan di server.
- Data email dan identitas pengguna tidak ditampilkan kepada pemain lain kecuali diperlukan.
- Chat dan input race harus dilindungi dari XSS/injection.
- Logging untuk pembuatan room, mulai race, selesai race, error koneksi, dan penutupan room.

## 9. Model Data Awal

### User

`id`, `google_id`, `name`, `avatar_url`, `email`, `created_at`, `last_seen_at`

### Room

`id`, `code`, `name`, `host_user_id`, `status`, `max_players`, `invite_token`, `created_at`, `started_at`, `closed_at`, `expires_at`

### RoomMember

`room_id`, `user_id`, `is_ready`, `joined_at`, `left_at`, `connection_status`

### SongText

`id`, `title`, `artist`, `text`, `language`, `license_note`, `is_active`, `created_at`

### Race

`id`, `room_id`, `song_text_id`, `status`, `countdown_started_at`, `started_at`, `ended_at`

### RaceResult

`id`, `race_id`, `user_id`, `wpm`, `accuracy`, `correct_chars`, `incorrect_chars`, `elapsed_ms`, `rank`, `is_valid`

### ChatMessage

`id`, `room_id`, `user_id`, `message`, `created_at`

## 10. Halaman Utama

1. Login
2. Dashboard
3. Create/Edit Room
4. Lobby Room
5. Race
6. Hasil Race
7. Error/Room Expired

## 11. Acceptance Criteria MVP

- Pengguna dapat login/logout dengan Google.
- Pengguna dapat membuat room dan masuk ke lobby.
- Host dapat menyalin link, mengedit room, dan menutup room.
- Teman dapat bergabung melalui link/kode room.
- Pemain dapat melihat dan mengirim pesan di room chat.
- Host dapat memulai race dengan minimal dua pemain siap.
- Semua pemain menerima teks dan waktu mulai yang sama.
- Progres, WPM, dan akurasi tampil selama race.
- Hasil seluruh pemain tampil setelah race selesai.
- Skor tervalidasi tersimpan dan top score 10 besar tampil di dashboard.
- Room yang ditutup/kedaluwarsa tidak dapat digunakan untuk bergabung.
- Reconnect atau refresh tidak menyebabkan race menghasilkan skor yang tidak valid.

## 12. Metrik Keberhasilan

- Persentase login sukses.
- Persentase room yang berhasil dimulai setelah dibuat.
- Waktu dari room dibuat sampai race dimulai.
- Persentase race yang selesai tanpa error koneksi.
- Jumlah race ulang per pengguna.
- Persentase pengguna yang kembali bermain dalam 7 hari.
- Jumlah skor valid yang masuk leaderboard.

## 13. Tahapan Implementasi

### Fase 1 — Fondasi

Autentikasi Google, model user, dashboard dasar, dan navigasi.

### Fase 2 — Room dan lobby

Create/join room, link/kode, edit room, close room, daftar pemain, dan status ready.

### Fase 3 — Real-time race

WebSocket/real-time channel, countdown, teks lagu, input typing, progres, timer, dan hasil.

### Fase 4 — Chat dan leaderboard

Room chat, validasi penyimpanan skor, top score 10 besar, dan empty/error states.

### Fase 5 — Hardening

Reconnect, rate limiting, sanitasi chat, validasi skor server, observability, responsive QA, dan pengujian beban race.

## 14. Keputusan yang Perlu Dikunci Sebelum Development

- Batas maksimum pemain per room.
- Apakah host boleh ikut race.
- Kebijakan saat host keluar.
- Durasi kedaluwarsa room.
- Definisi WPM: kotor, bersih, atau keduanya.
- Apakah leaderboard global atau hanya skor terbaik sepanjang waktu.
- Sumber konten lagu dan status lisensinya.
- Stack autentikasi dan real-time yang akan digunakan.

## Profil dan Statistik Pemain

Pengguna memiliki halaman profil dengan total race, race selesai, kemenangan, win rate, WPM rata-rata/tertinggi, akurasi rata-rata/terbaik, serta total karakter benar dan salah.

Riwayat race menampilkan tanggal, judul lagu/teks, room, jumlah peserta, posisi akhir, WPM, akurasi, durasi, dan status hasil. Pengguna dapat melihat detail race, memfilter berdasarkan tanggal/status, dan melihat grafik perkembangan WPM. Statistik hanya dihitung dari race yang selesai dan tervalidasi server.

Tambahan model data `PlayerStats`: `user_id`, `total_races`, `completed_races`, `wins`, `average_wpm`, `best_wpm`, `average_accuracy`, `best_accuracy`, `total_correct_chars`, `total_incorrect_chars`, `updated_at`.

Acceptance criteria tambahan: setiap race tervalidasi tercatat di riwayat pemain; statistik diperbarui setelah race; profil menampilkan total race, kemenangan, WPM, akurasi, dan detail hasil; grafik WPM menampilkan data yang tersedia.

## Tech Stack MVP

- Frontend: Next.js dan TypeScript
- UI: Tailwind CSS
- Authentication: Supabase Auth dengan Google OAuth
- Database: Supabase PostgreSQL
- Real-time: Supabase Realtime untuk lobby, room chat, countdown, progres race, dan hasil
- Hosting: Vercel untuk aplikasi web
- Validasi skor: server-side API/route handler agar WPM dan hasil race tidak hanya dipercaya dari client

Arsitektur MVP: `Next.js ? Supabase Auth / PostgreSQL / Realtime ? Vercel`.

Penggunaan Supabase perlu dikontrol dengan batas jumlah pemain per room, rate limit chat, pembersihan room kedaluwarsa, dan pembatasan frekuensi race agar tetap efisien terhadap kuota.
