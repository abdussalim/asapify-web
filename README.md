# asapify-web

Web operator ASAPify (Google Cloud AI Builder Cup 2026): peta status piksel gambut Kalimantan,
detail kelompok `AWAS` (atribut MAUT, tetangga, verifikasi agen), dan keputusan terbitkan/tolak.

- Spesifikasi UI: `../asapify/ui.html` · kontrak API: `../asapify/backend.html` bagian 03–05
- Konsep dan aturan sistem: `../ASAPify_Pitch_Google_AI_Builder_2026/WORKLOG.md` bagian 7–10

## Menjalankan

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # tsc --noEmit + vite build → dist/
```

Salin `.env.example` ke `.env` bila perlu mengganti mode:

| Variabel | Nilai | Arti |
|---|---|---|
| `VITE_API_MODE` | `mock` (default) / `live` | `mock` = data fiktif tanpa backend; `live` = `asapify-api` |
| `VITE_API_BASE` | URL | Basis API untuk mode live; kosong = same-origin (`/api` di-proxy ke `:8080` saat dev) |
| `VITE_PEAT_LAYER_URL` | URL GeoJSON | Layer `peat-boundary` di bucket publik (mode live) |

## Deploy (GitHub → Vercel)

1. Buat repo kosong di GitHub, lalu dari folder ini:
   `git remote add origin <url-repo>` → `git push -u origin main`.
2. Di Vercel: **Add New → Project → Import** repo tersebut. Pengaturan dibaca dari `vercel.json`
   (Vite, `npm ci`, `npm run build`, output `dist/`), jadi tidak perlu diubah.
3. Tanpa environment variable apa pun, situs berjalan dalam **mode mock** (data fiktif + login demo).
   Setelah `asapify-api` siap, isi `VITE_API_MODE=live` dan `VITE_API_BASE=<url asapify-api>`
   di Project Settings → Environment Variables, lalu redeploy (variabel `VITE_*` dibaca saat build).

`vercel.json` juga mengarahkan semua rute ke `index.html` (deep link `/kelompok/C-0924-002` tidak 404)
dan menyajikan `/maplibre/*.mjs` sebagai JavaScript untuk worker peta. Butuh Node ≥ 22.12 (`engines`).

> Login demo tidak melindungi apa pun: siapa saja yang membuka URL bisa masuk. Aman selama datanya fiktif;
> ganti ke Firebase Auth sebelum memakai data asli.

## Mode mock

Replay fiktif backtest Kalteng 24 Sep 2023 22.10 WIB (bbox `113.5,-2.6,114.3,-1.9`), tiga kelompok:
`C-0924-002` (bukti kuat, belum diputuskan), `C-0924-001` (inkonklusif), `C-0923-001` (sudah diterbitkan).
Citra VIIRS diambil langsung dari NASA GIBS (citra asli tanggal itu); crop Himawari berupa ilustrasi SVG.
Keputusan disimpan di memori dan hilang saat halaman dimuat ulang. Login hanya tiruan (tanpa Firebase).

Keadaan layar bisa didemokan dengan `?skenario=` (diingat selama tab terbuka):
`normal` · `kosong` · `awan` · `satu_satelit` · `siang`.

## Kontrak API untuk tim BE

Buka tab **Kontrak API** di aplikasi (`/kontrak-api`, publik, ID/EN). Isinya: konvensi (auth, waktu UTC,
`as_of`, koordinat, galat), tabel kode galat, 9 endpoint `asapify-api` (parameter, body, respons, galat,
layar UI yang memakainya), 23 skema, dan endpoint internal `asapify-agent`. Contoh JSON diambil dari
fixture mock yang sama dengan UI, jadi tidak bisa berbeda dari tampilan.

Sumber datanya `src/contract/spec.ts` (tipe TypeScript tetap di `src/types.ts`). Field bertanda
**usulan FE** belum ada di `backend.html` dan perlu disepakati tim BE.

## Catatan teknis

- MapLibre 6 memuat worker modul dari file terpisah. Plugin `maplibreWorker` di `vite.config.ts`
  menyajikan `maplibre-gl-worker.mjs` + `maplibre-gl-shared.mjs` apa adanya di `/maplibre/`
  (dev) dan menyalinnya ke `dist/maplibre/` (build), lalu `setWorkerUrl` menunjuk ke sana.
- Basemap: OpenFreeMap `positron` (terang) / `dark` (gelap), tanpa API key; ganti tema = `setStyle`
  lalu semua layer data dipasang ulang di `style.load`.
- Huruf IBM Plex dibundel lewat `@fontsource` (tanpa Google Fonts).
