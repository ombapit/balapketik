# BalapKetik

BalapKetik adalah game balap mengetik multiplayer sederhana untuk bermain bersama teman. Pemain masuk dengan Google, membuat atau bergabung ke room, lalu mengetik potongan lirik lagu Indonesia secepat dan seakurat mungkin.

## Fitur

- Login Google melalui Supabase Auth.
- Room private dengan kode/link, edit room, tutup room, dan room chat realtime.
- Status peserta online memakai Supabase Presence.
- Countdown 10 detik sebelum race, progress mobil realtime antarpeserta, dan input anti-paste.
- Validasi teks harus sama persis sebelum race selesai.
- Perhitungan WPM berdasarkan durasi aktual dan akurasi berdasarkan semua karakter yang pernah diketik.
- Dashboard, leaderboard top WPM per pemain, profil, riwayat race, dan chart perkembangan WPM.
- Sinkronisasi maksimal 10 potongan lirik baru dari LRCLIB lewat endpoint admin.

## Teknologi

- Next.js 14 + React + TypeScript
- Supabase: Auth, Postgres, Realtime, Presence
- CSS native

## Prasyarat

- Node.js 18 atau lebih baru
- Proyek Supabase

## Instalasi lokal

```bash
npm install
```

Salin `.env.example` menjadi `.env`, lalu isi nilainya:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
ADMIN_SYNC_KEY=buat-secret-acak-panjang
```

> Jangan pernah commit file `.env`. File ini sudah diabaikan oleh `.gitignore`.

## Setup Supabase

1. Buka SQL Editor pada proyek Supabase.
2. Jalankan isi file [supabase/migration-idempotent.sql](supabase/migration-idempotent.sql).
3. Di Authentication > Providers, aktifkan Google dan isi OAuth Client ID serta Client Secret.
4. Tambahkan redirect URL lokal berikut:

```text
http://localhost:3000/auth/callback
```

Untuk deployment, tambahkan juga URL callback domain production Anda.

Migrasi bersifat idempotent: aman dijalankan ulang dan akan melewati object yang sudah ada.

## Menjalankan aplikasi

```bash
npm run dev
```

Buka [http://localhost:3000](http://localhost:3000).

Untuk build produksi:

```bash
npm run build
npm run start
```

## Sync lagu

Endpoint sync menambah maksimal 10 lagu Indonesia baru yang belum ada di `song_texts`. Aksesnya dilindungi `ADMIN_SYNC_KEY`:

```text
http://localhost:3000/api/admin/sync-songs?key=ADMIN_SYNC_KEY_ANDA
```

Sistem mengambil lirik dari LRCLIB dan menggunakan paragraf terakhir sebagai potongan teks race. Lagu yang sudah tercatat tidak dimasukkan ulang.

## Alur permainan

1. Login dengan Google.
2. Buat room atau masukkan kode room teman.
3. Peserta klik `Saya siap balapan`.
4. Host klik `Mulai race` setelah minimal dua peserta siap.
5. Setelah countdown selesai, ketik teks hingga sama persis.
6. Lihat hasil, lalu pilih `Tanding lagi` untuk kembali ke lobby dan memulai ronde dengan teks berbeda.

## Script

| Perintah | Kegunaan |
| --- | --- |
| `npm run dev` | Menjalankan development server |
| `npm run build` | Membuat build production |
| `npm run start` | Menjalankan build production |

## Catatan

- Satu host hanya dapat memiliki satu room lobby aktif.
- Saat peserta keluar lewat tombol Dashboard atau menutup koneksi, daftar peserta aktif diperbarui oleh Realtime Presence.
- Browser dapat menyimpan favicon dalam cache; lakukan hard refresh bila favicon belum berubah.
