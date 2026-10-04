// Kontrak API asapify-api v1 yang dipakai UI ini. Sumber kebenaran tipe: src/types.ts.
// origin 'backend' = sudah ada di backend.html; 'fe' = usulan FE, perlu disepakati tim BE.

export interface Txt { id: string; en: string }
export type Origin = 'backend' | 'fe';

export interface Field {
  name: string;
  type: string;
  req: boolean;
  desc: Txt;
  origin?: Origin; // default: origin skema
}

export interface Schema {
  name: string;
  origin: Origin;
  desc: Txt;
  fields: Field[];
}

export type ExampleKey =
  | 'health' | 'meta' | 'grid' | 'clusters' | 'cluster' | 'verifyReq' | 'verifyRes' | 'decisionReq'
  | 'decisionRes' | 'decisionErr' | 'alerts' | 'closeReq' | 'closeRes' | 'peat'
  | 'pixels' | 'gridCompact' | 'night' | 'basemaps';

export interface Endpoint {
  id: string;
  method: 'GET' | 'POST';
  path: string;
  auth: 'public' | 'operator';
  title: Txt;
  purpose: Txt;
  usedBy: Txt | null; // null = belum dipakai UI
  params?: Field[];
  body?: { schema: string; example: ExampleKey };
  responses: { code: number; schema: string; example?: ExampleKey; note?: Txt }[];
  errors: string[];
}

const t = (id: string, en: string): Txt => ({ id, en });

export const STATUS_T = "'SAFE' | 'NO_OBSERVATION' | 'WATCH' | 'AWAS'";
const ISO = 'string · ISO 8601 UTC';
export const PROV_T = "'11' … '19' | '21' | '61' … '65'";

export const CONVENTIONS: { title: Txt; body: Txt }[] = [
  {
    title: t('Basis URL', 'Base URL'),
    body: t(
      'Semua path di bawah diawali `/api/v1`. Produksi: Firebase Hosting meneruskan `/api/**` ke Cloud Run `asapify-api` (same-origin, tanpa CORS). Saat dev, Vite meneruskan `/api` ke `http://localhost:8080`.',
      'Every path below is prefixed with `/api/v1`. Production: Firebase Hosting rewrites `/api/**` to Cloud Run `asapify-api` (same origin, no CORS). In dev, Vite proxies `/api` to `http://localhost:8080`.',
    ),
  },
  {
    title: t('Autentikasi', 'Authentication'),
    body: t(
      'Endpoint `operator` wajib header `Authorization: Bearer <Firebase ID token>` dengan custom claim `role = "operator"`. Token tidak ada atau tidak sah → 401 `UNAUTHENTICATED`; tanpa peran operator → 403 `FORBIDDEN`. Endpoint `public` tanpa header. (Usulan FE — UI masih memakai login demo.)',
      '`operator` endpoints require `Authorization: Bearer <Firebase ID token>` with custom claim `role = "operator"`. Missing or invalid token → 401 `UNAUTHENTICATED`; no operator role → 403 `FORBIDDEN`. `public` endpoints need no header. (FE proposal — the UI still uses a demo login.)',
    ),
  },
  {
    title: t('Waktu', 'Time'),
    body: t(
      'Semua waktu UTC, ISO 8601 dengan akhiran `Z` dan presisi detik, mis. `2023-09-24T15:10:00Z`. Server tidak pernah mengirim jam lokal; UI yang mengubah ke WIB.',
      'All times are UTC, ISO 8601 with a `Z` suffix and second precision, e.g. `2023-09-24T15:10:00Z`. The server never sends local time; the UI converts to WIB.',
    ),
  },
  {
    title: t('Waktu acuan `as_of`', 'Reference time `as_of`'),
    body: t(
      'Semua GET operator menerima `as_of` (UTC) opsional; tanpa itu = sekarang. Replay backtest dan produksi memakai kode yang sama (WORKLOG §10 aturan 7).',
      'Every operator GET accepts an optional `as_of` (UTC); omitted = now. Backtest replay and production run the same code (WORKLOG §10 rule 7).',
    ),
  },
  {
    title: t('Koordinat', 'Coordinates'),
    body: t(
      'GeoJSON selalu `[lon, lat]`. Field angka terpisah ditulis eksplisit (`lat`, `lon`). Satu grid 0,02° untuk Sumatra + Kalimantan; `pixel_id` = `p{baris}_{kolom}` dari asal 94,9° BT / 6,2° LU. Provinsi = kode BPS (11–19, 21 Sumatra; 61–65 Kalimantan).',
      'GeoJSON is always `[lon, lat]`. Separate numeric fields are explicit (`lat`, `lon`). One 0.02° grid for Sumatra + Kalimantan; `pixel_id` = `p{row}_{col}` from origin 94.9° E / 6.2° N. Province = BPS code (11–19, 21 Sumatra; 61–65 Kalimantan).',
    ),
  },
  {
    title: t('Null vs tidak ada', 'Null vs absent'),
    body: t(
      'Semua field di skema selalu dikirim. Nilai yang tidak diketahui = `null` (UI menulis "tidak tersedia"), bukan field dihilangkan. Skor 0–1 dikirim apa adanya (≤ 3 desimal); UI yang membulatkan.',
      'Every schema field is always sent. Unknown values are `null` (the UI shows "not available"), never omitted. Scores 0–1 are sent as-is (≤ 3 decimals); the UI rounds.',
    ),
  },
  {
    title: t('Galat', 'Errors'),
    body: t(
      'Respons non-2xx memakai amplop `{"error": {"code", "message"}}`. `code` stabil (huruf besar, untuk logika UI); `message` Bahasa Indonesia, ditampilkan apa adanya ke operator.',
      'Non-2xx responses use the envelope `{"error": {"code", "message"}}`. `code` is stable (upper case, for UI logic); `message` is in Indonesian and shown to the operator as-is.',
    ),
  },
  {
    title: t('Aturan isi', 'Content rules'),
    body: t(
      'Status hanya dari rule engine; verifikasi agen tidak punya field status atau level. Teks apa pun tidak boleh menyebut AWAS sebagai "kebakaran terkonfirmasi". `finding` dan caption berbahasa Indonesia; ringkasan agen dikirim dua bahasa (`summary_id`, `summary_en`).',
      'Status comes only from the rule engine; agent verification has no status or level field. No text may call AWAS a "confirmed fire". `finding` and captions are in Indonesian; the agent summary is sent in both languages (`summary_id`, `summary_en`).',
    ),
  },
];

export const ERRORS: { code: string; http: number; when: Txt }[] = [
  { code: 'UNAUTHENTICATED', http: 401, when: t('Token tidak ada, kedaluwarsa, atau tidak sah', 'Token missing, expired or invalid') },
  { code: 'FORBIDDEN', http: 403, when: t('Pengguna bukan operator', 'User is not an operator') },
  { code: 'NOT_FOUND', http: 404, when: t('Kelompok atau peringatan tidak ada', 'Cluster or alert does not exist') },
  { code: 'VALIDATION', http: 400, when: t('Parameter/body salah bentuk (mis. `as_of` bukan ISO UTC)', 'Malformed parameter/body (e.g. `as_of` is not ISO UTC)') },
  { code: 'ALREADY_DECIDED', http: 409, when: t('Kelompok sudah diterbitkan/ditolak operator lain', 'Cluster already published/rejected by another operator') },
  { code: 'COOLDOWN_ACTIVE', http: 409, when: t('Verifikasi terakhir < 6 jam dan `force` false', 'Last verification < 6 h ago and `force` is false') },
  { code: 'ALREADY_CLOSED', http: 409, when: t('Peringatan sudah ditutup', 'Alert already closed') },
  { code: 'REASON_REQUIRED', http: 422, when: t('Tolak tanpa `reason`', 'Reject without `reason`') },
  { code: 'CAPTION_INVALID', http: 422, when: t('Terbitkan dengan caption kosong atau > 1.024 karakter', 'Publish with an empty caption or > 1,024 characters') },
];

const AS_OF_PARAM: Field = {
  name: 'as_of', type: `query · ${ISO}`, req: false, origin: 'backend',
  desc: t('Waktu acuan; tanpa ini = sekarang.', 'Reference time; omitted = now.'),
};

export const SCHEMAS: Schema[] = [
  {
    name: 'Health', origin: 'fe',
    desc: t('Cek hidup layanan.', 'Liveness check.'),
    fields: [
      { name: 'status', type: "'ok'", req: true, desc: t('Selalu "ok" bila layanan hidup.', 'Always "ok" when the service is up.') },
      { name: 'version', type: 'string', req: true, desc: t('Versi image yang berjalan.', 'Running image version.') },
      { name: 'time', type: ISO, req: true, desc: t('Jam server.', 'Server time.') },
    ],
  },
  {
    name: 'Meta', origin: 'fe',
    desc: t('Keadaan data terakhir; mengisi banner dan pita malam di peta.', 'Latest data state; fills the banner and night ribbon on the map.'),
    fields: [
      { name: 'as_of', type: ISO, req: true, desc: t('Waktu acuan. Produksi = sekarang; replay = waktu yang diputar.', 'Reference time. Production = now; replay = replayed time.') },
      { name: 'last_slot', type: ISO, req: true, desc: t('Slot malam terakhir yang sudah dievaluasi rule engine (≤ as_of).', 'Latest night slot evaluated by the rule engine (≤ as_of).') },
      { name: 'is_night', type: 'boolean', req: true, desc: t('true bila as_of di 20.00–04.00 WIB. false → UI menampilkan "siang hari".', 'true when as_of is within 20:00–04:00 WIB. false → UI shows "daytime".') },
      { name: 'replay', type: 'boolean', req: true, desc: t('true bila data adalah replay backtest (banner biru).', 'true when data is a backtest replay (blue banner).') },
      { name: 'n_sat', type: '0 | 1 | 2', req: true, desc: t('Jumlah satelit yang tersedia di last_slot.', 'Number of satellites available at last_slot.') },
      { name: 'sats.himawari', type: 'SatState', req: true, desc: t('Keadaan Himawari-9.', 'Himawari-9 state.') },
      { name: 'sats.gk2a', type: 'SatState', req: true, desc: t('Keadaan GK2A.', 'GK2A state.') },
    ],
  },
  {
    name: 'SatState', origin: 'fe',
    desc: t('Ketersediaan satu satelit.', 'Availability of one satellite.'),
    fields: [
      { name: 'last_slot', type: `${ISO} | null`, req: true, desc: t('Slot terakhir yang filenya ada di bucket. null = belum ada malam ini.', 'Latest slot whose file is in the bucket. null = none tonight.') },
      { name: 'delay_min', type: 'number | null', req: true, desc: t('Keterlambatan file (menit). UI menandai "terlambat" bila > 40.', 'File delay in minutes. UI marks "late" when > 40.') },
    ],
  },
  {
    name: 'GridFeature', origin: 'backend',
    desc: t('Satu piksel gambut dalam FeatureCollection<Point>. UI mengubah titik jadi kotak 0,02°.', 'One peat pixel inside a FeatureCollection<Point>. The UI turns the point into a 0.02° square.'),
    fields: [
      { name: 'geometry.coordinates', type: '[lon, lat]', req: true, desc: t('Pusat piksel.', 'Pixel centre.') },
      { name: 'properties.pixel_id', type: 'string', req: true, desc: t('`p{baris}_{kolom}`.', '`p{row}_{col}`.') },
      { name: 'properties.status', type: STATUS_T, req: true, desc: t('Status rule engine pada last_slot.', 'Rule-engine status at last_slot.') },
      { name: 'properties.utility', type: 'number 0–1 | null', req: true, desc: t('U; null bila NO_OBSERVATION.', 'U; null when NO_OBSERVATION.') },
      { name: 'properties.n_sat', type: '0 | 1 | 2', req: true, desc: t('Satelit cerah untuk piksel ini.', 'Clear-sky satellites for this pixel.') },
      { name: 'properties.cluster_id', type: 'string | null', req: true, origin: 'fe', desc: t('ID kelompok AWAS aktif bila piksel anggota; UI menggambar garis kelompok dari sini.', 'Active AWAS cluster id if the pixel is a member; the UI draws cluster outlines from it.') },
      { name: 'properties.province', type: PROV_T, req: true, origin: 'fe', desc: t('Kode BPS provinsi; dipakai filter provinsi.', 'BPS province code; used by the province filter.') },
    ],
  },
  {
    name: 'PixelIndex', origin: 'fe',
    desc: t('Daftar piksel gambut statis, diunduh sekali per versi (cache lewat ETag). Urutannya = indeks sel di GridCompact dan NightCompact. Per 10 ribu sel ≈ 120 KB mentah, jauh lebih kecil setelah gzip.', 'Static peat pixel list, downloaded once per version (cache via ETag). Its order = the cell index in GridCompact and NightCompact. Per 10k cells ≈ 120 KB raw, far smaller once gzipped.'),
    fields: [
      { name: 'version', type: 'string', req: true, desc: t('Berubah hanya bila peat mask dibangun ulang (asapify-build).', 'Changes only when the peat mask is rebuilt (asapify-build).') },
      { name: 'origin', type: '[lon, lat]', req: true, desc: t('Pojok kiri atas grid gabungan: [94.9, 6.2].', 'Top-left corner of the combined grid: [94.9, 6.2].') },
      { name: 'step', type: 'number', req: true, desc: t('Ukuran sel derajat: 0.02.', 'Cell size in degrees: 0.02.') },
      { name: 'rows', type: 'integer[]', req: true, desc: t('Baris tiap sel (dari utara).', 'Row of each cell (from the north).') },
      { name: 'cols', type: 'integer[]', req: true, desc: t('Kolom tiap sel (dari barat).', 'Column of each cell (from the west).') },
      { name: 'province', type: 'integer[]', req: true, desc: t('Kode BPS provinsi per sel, mis. 16 = Sumatera Selatan, 62 = Kalimantan Tengah.', 'BPS province code per cell, e.g. 16 = South Sumatra, 62 = Central Kalimantan.') },
    ],
  },
  {
    name: 'GridCompact', origin: 'fe',
    desc: t('Status semua sel pada satu slot dalam bentuk ringkas; dipakai peta. Diukur untuk 10 ribu sel: ≈ 23 KB mentah / 11 KB gzip, vs GeoJSON ≈ 1,9 MB mentah / 83 KB gzip — dan jauh lebih ringan di-parse di HP.', 'Status of every cell at one slot, compact; used by the map. Measured for 10k cells: ≈ 23 KB raw / 11 KB gzip, vs GeoJSON ≈ 1.9 MB raw / 83 KB gzip — and far lighter to parse on phones.'),
    fields: [
      { name: 'pixels_version', type: 'string', req: true, desc: t('Harus sama dengan PixelIndex.version; bila beda, UI mengunduh ulang indeks.', 'Must equal PixelIndex.version; if not, the UI re-downloads the index.') },
      { name: 'slot', type: ISO, req: true, desc: t('Slot yang ditampilkan (≤ as_of).', 'Slot shown (≤ as_of).') },
      { name: 'n_sat', type: '0 | 1 | 2', req: true, desc: t('Satelit tersedia di slot ini.', 'Satellites available at this slot.') },
      { name: 'status', type: 'string', req: true, desc: t('Satu huruf per sel: `S` SAFE, `N` NO_OBSERVATION, `W` WATCH, `A` AWAS.', 'One letter per cell: `S` SAFE, `N` NO_OBSERVATION, `W` WATCH, `A` AWAS.') },
      { name: 'utility', type: 'string (base64)', req: true, desc: t('Uint8 per sel: round(U × 250); 255 = null.', 'Uint8 per cell: round(U × 250); 255 = null.') },
      { name: 'clusters', type: 'Record<cluster_id, integer[]>', req: true, desc: t('Indeks sel anggota tiap kelompok AWAS aktif; UI menggambar garis kelompok dari sini.', 'Member cell indices of each active AWAS cluster; the UI draws cluster outlines from it.') },
    ],
  },
  {
    name: 'NightCompact', origin: 'fe',
    desc: t('Status per slot untuk satu malam; satu permintaan untuk pemutar slot (54 string status, ±530 KB mentah untuk 10 ribu sel). Gzip sangat efektif karena status jarang berubah antar slot.', 'Status per slot for one night; one request for the slot player (54 status strings, ≈ 530 KB raw for 10k cells). Gzip is very effective because status rarely changes between slots.'),
    fields: [
      { name: 'pixels_version', type: 'string', req: true, desc: t('Sama seperti GridCompact.', 'Same as GridCompact.') },
      { name: 'night', type: 'string · YYYY-MM-DD', req: true, desc: t('Tanggal WIB saat malam dimulai (night_id).', 'WIB date the night starts (night_id).') },
      { name: 'slots', type: `${ISO}[54]`, req: true, desc: t('13.00–21.50 UTC, tiap 10 menit.', '13:00–21:50 UTC, every 10 minutes.') },
      { name: 'status', type: '(string | null)[54]', req: true, desc: t('Format sama dengan GridCompact.status; null = slot belum dievaluasi atau tidak ada data.', 'Same format as GridCompact.status; null = slot not evaluated yet or no data.') },
      { name: 'n_sat', type: '(0 | 1 | 2 | null)[54]', req: true, desc: t('Satelit per slot.', 'Satellites per slot.') },
    ],
  },
  {
    name: 'Basemap', origin: 'fe',
    desc: t('Satu pilihan peta dasar raster dari BE (mis. citra satelit). Peta jalan dan polos disediakan FE.', 'One raster basemap option from the BE (e.g. satellite imagery). Street and plain maps are provided by the FE.'),
    fields: [
      { name: 'id', type: 'string', req: true, desc: t('ID unik, mis. `viirs`.', 'Unique id, e.g. `viirs`.') },
      { name: 'label_id', type: 'string', req: true, desc: t('Label Bahasa Indonesia di kontrol layer.', 'Indonesian label in the layer control.') },
      { name: 'label_en', type: 'string', req: true, desc: t('Label Inggris.', 'English label.') },
      { name: 'tiles', type: 'string[]', req: true, desc: t('Template URL XYZ dengan {z}/{x}/{y}; boleh signed URL.', 'XYZ URL templates with {z}/{x}/{y}; may be signed URLs.') },
      { name: 'tile_size', type: '256 | 512', req: true, desc: t('Ukuran tile piksel.', 'Tile size in pixels.') },
      { name: 'maxzoom', type: 'integer', req: true, desc: t('Zoom tertinggi yang tersedia; di atasnya tile diperbesar.', 'Highest available zoom; tiles are upscaled beyond it.') },
      { name: 'attribution', type: 'string', req: true, desc: t('Atribusi wajib sumber citra.', 'Required imagery attribution.') },
    ],
  },
  {
    name: 'ProvinceBoundary', origin: 'fe',
    desc: t('Berkas statis `layers/provinces.geojson` di bucket publik (bukan endpoint API): 15 provinsi Sumatra + Kalimantan, disederhanakan ±90 KB (±30 KB gzip). Sumber geoBoundaries IDN ADM1 (ODbL, © OpenStreetMap contributors).', 'Static file `layers/provinces.geojson` in the public bucket (not an API endpoint): the 15 Sumatra + Kalimantan provinces, simplified ≈ 90 KB (≈ 30 KB gzip). Source geoBoundaries IDN ADM1 (ODbL, © OpenStreetMap contributors).'),
    fields: [
      { name: 'features[].properties.code', type: PROV_T, req: true, desc: t('Kode BPS provinsi.', 'BPS province code.') },
      { name: 'features[].properties.name', type: 'string', req: true, desc: t('Nama provinsi (label peta).', 'Province name (map label).') },
      { name: 'features[].geometry', type: 'MultiPolygon', req: true, desc: t('Batas provinsi.', 'Province boundary.') },
    ],
  },
  {
    name: 'ClusterSummary', origin: 'backend',
    desc: t('Satu baris di daftar kelompok AWAS.', 'One row in the AWAS cluster list.'),
    fields: [
      { name: 'id', type: 'string', req: true, desc: t('`C-{MMDD}-{nnn}`; tetap sama selama kelompok tumpang tindih dengan yang aktif.', '`C-{MMDD}-{nnn}`; kept while it overlaps an active cluster.') },
      { name: 'state', type: "'active' | 'closed'", req: true, desc: t('Ditutup setelah 3 malam valid tanpa piksel AWAS.', 'Closed after 3 valid nights without AWAS pixels.') },
      { name: 'province', type: PROV_T, req: true, desc: t('Provinsi piksel perwakilan; menentukan grup Telegram.', 'Province of the representative pixel; selects the Telegram group.') },
      { name: 'rep_pixel', type: 'string', req: true, desc: t('pixel_id dengan U tertinggi.', 'pixel_id with the highest U.') },
      { name: 'centroid', type: '[lon, lat]', req: true, desc: t('Titik tengah kelompok; target zoom peta dan caption.', 'Cluster centre; map zoom target and caption.') },
      { name: 'pixels', type: 'string[]', req: true, desc: t('Semua pixel_id anggota.', 'All member pixel_ids.') },
      { name: 'trigger_slot', type: ISO, req: true, desc: t('Slot yang memicu verifikasi terakhir.', 'Slot that triggered the latest verification.') },
      { name: 'utility_score', type: 'number 0–1', req: true, desc: t('U piksel perwakilan di trigger_slot.', 'U of the representative pixel at trigger_slot.') },
      { name: 'neighbour_support', type: 'number 0–1', req: true, desc: t('u_N = k/8 tetangga dengan U0 ≥ 0,5.', 'u_N = k/8 neighbours with U0 ≥ 0.5.') },
      { name: 'n_sat', type: '0 | 1 | 2', req: true, desc: t('Satelit di trigger_slot (AWAS selalu 2).', 'Satellites at trigger_slot (always 2 for AWAS).') },
      { name: 'verification', type: 'VerificationSummary | null', req: true, desc: t('Verifikasi agen terakhir; null bila belum.', 'Latest agent verification; null if none yet.') },
      { name: 'decision', type: 'Decision | null', req: true, desc: t('Keputusan operator; null = belum diputuskan (tetap dipantau).', 'Operator decision; null = undecided (still monitored).') },
    ],
  },
  {
    name: 'VerificationSummary', origin: 'backend',
    desc: t('Ringkas hasil agen untuk daftar.', 'Compact agent result for the list.'),
    fields: [
      { name: 'result', type: "'strong_evidence' | 'inconclusive'", req: true, desc: t('Tidak ada nilai negatif: tidak terlihat asap = inconclusive.', 'There is no negative value: no visible smoke = inconclusive.') },
      { name: 'viirs_within_2km_48h', type: 'integer ≥ 0', req: true, desc: t('> 0 mewajibkan strong_evidence.', '> 0 forces strong_evidence.') },
      { name: 'tool_calls', type: 'integer ≤ 8', req: true, desc: t('Jumlah panggilan tool agen.', 'Number of agent tool calls.') },
      { name: 'at', type: ISO, req: true, desc: t('Waktu verifikasi tersimpan.', 'When the verification was saved.') },
    ],
  },
  {
    name: 'Decision', origin: 'fe',
    desc: t('Keputusan operator atas satu kelompok (sekali per kelompok).', 'Operator decision on one cluster (once per cluster).'),
    fields: [
      { name: 'action', type: "'publish' | 'reject'", req: true, desc: t('Terbitkan ke grup peringatan atau tolak.', 'Publish to the alert group or reject.') },
      { name: 'by', type: 'string (email)', req: true, desc: t('Email operator.', 'Operator email.') },
      { name: 'at', type: ISO, req: true, desc: t('Waktu keputusan.', 'Decision time.') },
      { name: 'reason', type: 'string | null', req: true, desc: t('Wajib untuk reject; null untuk publish.', 'Required for reject; null for publish.') },
      { name: 'alert_id', type: 'string | null', req: true, desc: t('`A-{MMDD}-{nnn}` bila publish.', '`A-{MMDD}-{nnn}` when published.') },
    ],
  },
  {
    name: 'ClusterDetail', origin: 'backend',
    desc: t('ClusterSummary + isi halaman detail. `verification` di sini berbentuk VerificationDetail.', 'ClusterSummary + detail page content. `verification` here is a VerificationDetail.'),
    fields: [
      { name: '…ClusterSummary', type: '—', req: true, desc: t('Semua field ClusterSummary.', 'All ClusterSummary fields.') },
      { name: 'attributes', type: 'Record<u_H|u_G|u_LST|u_SAT|u_T, number | null>', req: true, desc: t('Atribut MAUT di trigger_slot; null = tidak tersedia (mis. satelit berawan). u_N = neighbour_support.', 'MAUT attributes at trigger_slot; null = not available (e.g. cloudy satellite). u_N = neighbour_support.') },
      { name: 'series', type: 'SeriesPoint[]', req: true, desc: t('Semua slot 3 malam valid terakhir untuk rep_pixel, urut waktu.', 'Every slot of the last 3 valid nights for rep_pixel, in time order.') },
      { name: 'neighbours', type: 'Neighbour[8]', req: true, origin: 'fe', desc: t('8 tetangga rep_pixel untuk mini-grid 3 × 3.', 'The 8 neighbours of rep_pixel for the 3 × 3 mini grid.') },
      { name: 'verification', type: 'VerificationDetail | null', req: true, desc: t('Hasil agen lengkap.', 'Full agent result.') },
    ],
  },
  {
    name: 'SeriesPoint', origin: 'backend',
    desc: t('Satu slot di grafik utility.', 'One slot on the utility chart.'),
    fields: [
      { name: 'slot', type: ISO, req: true, desc: t('Slot 10 menit, 13.00–20.50 UTC.', '10-minute slot, 13:00–20:50 UTC.') },
      { name: 'U', type: 'number 0–1 | null', req: true, origin: 'fe', desc: t('null = NO_OBSERVATION (diarsir di grafik).', 'null = NO_OBSERVATION (hatched on the chart).') },
      { name: 'status', type: STATUS_T, req: true, desc: t('Status slot itu.', 'Status at that slot.') },
    ],
  },
  {
    name: 'Neighbour', origin: 'fe',
    desc: t('Satu sel tetangga.', 'One neighbour cell.'),
    fields: [
      { name: 'dir', type: "'nw'|'n'|'ne'|'w'|'e'|'sw'|'s'|'se'", req: true, desc: t('Arah dari rep_pixel.', 'Direction from rep_pixel.') },
      { name: 'state', type: "'anomaly'|'normal'|'cloud'|'non_peat'", req: true, desc: t('anomaly = U0 ≥ 0,5 (dihitung ke u_N).', 'anomaly = U0 ≥ 0.5 (counts toward u_N).') },
      { name: 'u0', type: 'number 0–1 | null', req: true, desc: t('null untuk cloud dan non_peat.', 'null for cloud and non_peat.') },
    ],
  },
  {
    name: 'VerificationDetail', origin: 'backend',
    desc: t('VerificationSummary + isi kartu verifikasi (skema agent/schema.py).', 'VerificationSummary + verification card content (agent/schema.py).'),
    fields: [
      { name: '…VerificationSummary', type: '—', req: true, desc: t('Semua field VerificationSummary.', 'All VerificationSummary fields.') },
      { name: 'smoke_visible', type: 'boolean | null', req: true, desc: t('null = citra tidak bisa dinilai.', 'null = imagery could not be assessed.') },
      { name: 'evidence', type: 'Evidence[] (≥ 1)', req: true, desc: t('Bukti dengan waktu dan umur.', 'Evidence with time and age.') },
      { name: 'summary_id', type: 'string ≤ 500', req: true, desc: t('Ringkasan Bahasa Indonesia.', 'Indonesian summary.') },
      { name: 'summary_en', type: 'string ≤ 500', req: true, desc: t('Ringkasan Inggris (untuk juri).', 'English summary (for judges).') },
      { name: 'tool_trace', type: 'ToolCall[]', req: true, origin: 'fe', desc: t('Urutan tool agen; tampil di ToolTrace dan video.', 'Agent tool sequence; shown in ToolTrace and the video.') },
      { name: 'images', type: 'EvidenceImg[]', req: true, origin: 'fe', desc: t('Citra VIIRS + Himawari berdampingan.', 'VIIRS + Himawari images side by side.') },
      { name: 'viirs', type: 'ViirsDetection[]', req: true, origin: 'fe', desc: t('Deteksi VIIRS ≤ 10 km, 48 jam, urut jarak.', 'VIIRS detections ≤ 10 km, 48 h, by distance.') },
    ],
  },
  {
    name: 'Evidence', origin: 'backend',
    desc: t('Satu bukti dari agen.', 'One piece of agent evidence.'),
    fields: [
      { name: 'source', type: "'rule_engine'|'viirs_firms'|'viirs_image'|'himawari_image'", req: true, desc: t('Asal bukti.', 'Evidence source.') },
      { name: 'finding', type: 'string ≤ 200', req: true, desc: t('Temuan, Bahasa Indonesia. Angka harus ada di hasil tool.', 'Finding, in Indonesian. Every number must exist in a tool result.') },
      { name: 'observed_at', type: `${ISO} | null`, req: true, desc: t('Waktu pengamatan bukti.', 'When the evidence was observed.') },
      { name: 'age_h', type: 'number | null', req: true, desc: t('Umur bukti terhadap trigger_slot (jam).', 'Evidence age relative to trigger_slot (hours).') },
    ],
  },
  {
    name: 'ToolCall', origin: 'fe',
    desc: t('Satu panggilan tool agen.', 'One agent tool call.'),
    fields: [
      { name: 'tool', type: 'string', req: true, desc: t('get_pixel_context, get_latest_viirs, fetch_viirs_image, fetch_himawari_image, save_verification.', 'get_pixel_context, get_latest_viirs, fetch_viirs_image, fetch_himawari_image, save_verification.') },
      { name: 'args', type: 'object', req: true, desc: t('Argumen tool (tanpa rahasia).', 'Tool arguments (no secrets).') },
      { name: 'duration_ms', type: 'integer', req: true, desc: t('Durasi panggilan.', 'Call duration.') },
      { name: 'ok', type: 'boolean', req: true, desc: t('false bila tool galat.', 'false when the tool errored.') },
    ],
  },
  {
    name: 'EvidenceImg', origin: 'fe',
    desc: t('Citra crop ±0,2° di sekitar centroid.', '±0.2° crop around the centroid.'),
    fields: [
      { name: 'source', type: "'viirs_image' | 'himawari_image'", req: true, desc: t('Jenis citra.', 'Image kind.') },
      { name: 'url', type: 'string (URL)', req: true, desc: t('Signed URL crops/… berlaku ≥ 1 jam.', 'Signed URL to crops/…, valid ≥ 1 h.') },
      { name: 'layer', type: 'string', req: true, desc: t('Nama layer GIBS atau kanal Himawari.', 'GIBS layer or Himawari channel name.') },
      { name: 'observed_at', type: ISO, req: true, desc: t('Waktu citra.', 'Image time.') },
      { name: 'age_h', type: 'number', req: true, desc: t('Umur citra (jam).', 'Image age (hours).') },
      { name: 'marker_drawn', type: 'boolean', req: true, desc: t('true bila penanda 5 km sudah digambar di PNG; false → UI menggambarnya.', 'true when the 5 km marker is drawn on the PNG; false → the UI draws it.') },
    ],
  },
  {
    name: 'ViirsDetection', origin: 'fe',
    desc: t('Satu titik FIRMS dari get_latest_viirs.', 'One FIRMS point from get_latest_viirs.'),
    fields: [
      { name: 'src', type: 'string', req: true, desc: t('mis. VIIRS_NOAA20_NRT / _SP.', 'e.g. VIIRS_NOAA20_NRT / _SP.') },
      { name: 'time_utc', type: ISO, req: true, desc: t('Waktu akuisisi.', 'Acquisition time.') },
      { name: 'distance_km', type: 'number', req: true, desc: t('Jarak ke centroid; ≤ 2 ditebalkan.', 'Distance to centroid; ≤ 2 is emphasised.') },
      { name: 'confidence', type: 'string', req: true, desc: t('l / n / h dari FIRMS.', 'l / n / h from FIRMS.') },
      { name: 'frp', type: 'number', req: true, desc: t('Fire radiative power (MW).', 'Fire radiative power (MW).') },
      { name: 'lat', type: 'number', req: true, desc: t('Lintang titik (layer peta viirs).', 'Point latitude (viirs map layer).') },
      { name: 'lon', type: 'number', req: true, desc: t('Bujur titik.', 'Point longitude.') },
    ],
  },
  {
    name: 'DecisionRequest', origin: 'backend',
    desc: t('Body keputusan operator.', 'Operator decision body.'),
    fields: [
      { name: 'action', type: "'publish' | 'reject'", req: true, desc: t('Pilihan operator. Tidak ada level.', 'Operator choice. There are no levels.') },
      { name: 'caption_id', type: 'string ≤ 1024 | null', req: true, desc: t('Wajib untuk publish: caption Telegram (HTML), boleh disunting operator.', 'Required for publish: Telegram caption (HTML), editable by the operator.') },
      { name: 'reason', type: 'string | null', req: true, desc: t('Wajib untuk reject.', 'Required for reject.') },
    ],
  },
  {
    name: 'DecisionResponse', origin: 'fe',
    desc: t('Decision yang tersimpan + hasil kirim Telegram. Menggantikan `published_by/published_at` di contoh backend.html supaya sama dengan field `decision` di detail.', 'Saved Decision + Telegram send result. Replaces `published_by/published_at` from the backend.html example so it matches the `decision` field in the detail.'),
    fields: [
      { name: '…Decision', type: '—', req: true, desc: t('Semua field Decision.', 'All Decision fields.') },
      { name: 'telegram', type: "{status: 'sent'|'failed', message_id: number|null} | null", req: true, desc: t('null untuk reject. Gagal kirim tetap 201; keputusan tersimpan.', 'null for reject. A failed send is still 201; the decision is saved.') },
    ],
  },
  {
    name: 'VerifyRequest', origin: 'backend',
    desc: t('Minta verifikasi ulang.', 'Request re-verification.'),
    fields: [
      { name: 'force', type: 'boolean', req: false, desc: t('Default false. true melewati jeda 6 jam.', 'Default false. true skips the 6 h cooldown.') },
    ],
  },
  {
    name: 'VerifyResponse', origin: 'fe',
    desc: t('Permintaan diteruskan ke asapify-agent (asinkron).', 'Request forwarded to asapify-agent (asynchronous).'),
    fields: [
      { name: 'verification_id', type: 'string', req: true, desc: t('ID verifikasi yang akan dibuat agen.', 'Id of the verification the agent will create.') },
      { name: 'cluster_id', type: 'string', req: true, desc: t('Kelompok yang diverifikasi.', 'Cluster being verified.') },
      { name: 'status', type: "'queued'", req: true, desc: t('Hasil muncul di detail kelompok setelah agen selesai.', 'The result appears in the cluster detail once the agent finishes.') },
    ],
  },
  {
    name: 'Alert', origin: 'fe',
    desc: t('Peringatan yang sudah diterbitkan ke grup Telegram.', 'Alert published to the Telegram group.'),
    fields: [
      { name: 'id', type: 'string', req: true, desc: t('`A-{MMDD}-{nnn}`.', '`A-{MMDD}-{nnn}`.') },
      { name: 'cluster_id', type: 'string', req: true, desc: t('Kelompok asal.', 'Source cluster.') },
      { name: 'province', type: PROV_T, req: true, desc: t('Grup peringatan tujuan.', 'Target alert group.') },
      { name: 'caption_id', type: 'string', req: true, desc: t('Caption yang terkirim (atau terakhir disunting).', 'Caption sent (or last edited).') },
      { name: 'published_by', type: 'string (email)', req: true, desc: t('Operator penerbit.', 'Publishing operator.') },
      { name: 'published_at', type: ISO, req: true, desc: t('Waktu terbit.', 'Publish time.') },
      { name: 'status', type: "'active' | 'closed'", req: true, desc: t('closed = caption diedit diawali SELESAI.', 'closed = caption edited to start with SELESAI.') },
      { name: 'closed_at', type: `${ISO} | null`, req: true, desc: t('Waktu ditutup.', 'Close time.') },
      { name: 'closed_by', type: "string | 'system' | null", req: true, desc: t("Email operator, atau 'system' bila kelompok ditutup otomatis.", "Operator email, or 'system' when the cluster closed automatically.") },
      { name: 'telegram', type: "{status: 'sent'|'failed'|'edited', message_id: number|null, error: string|null}", req: true, desc: t('Status pesan di grup.', 'Message status in the group.') },
    ],
  },
  {
    name: 'CloseRequest', origin: 'fe',
    desc: t('Tutup peringatan lebih awal.', 'Close an alert early.'),
    fields: [
      { name: 'reason', type: 'string | null', req: false, desc: t('Catatan untuk audit_log.', 'Note for audit_log.') },
    ],
  },
  {
    name: 'PeatBoundary', origin: 'backend',
    desc: t('Berkas statis `layers/peat_pixels.geojson` di bucket publik (bukan endpoint API).', 'Static file `layers/peat_pixels.geojson` in the public bucket (not an API endpoint).'),
    fields: [
      { name: 'features[].geometry', type: 'Polygon | MultiPolygon', req: true, desc: t('Batas gambut yang diproses (KHG ∩ 15 provinsi − area terbangun), sudah disederhanakan.', 'Processed peat boundary (KHG ∩ 15 provinces − built-up), simplified.') },
    ],
  },
  {
    name: 'Error', origin: 'backend',
    desc: t('Amplop semua respons galat.', 'Envelope for every error response.'),
    fields: [
      { name: 'error.code', type: 'string', req: true, desc: t('Kode stabil, lihat tabel galat.', 'Stable code, see the error table.') },
      { name: 'error.message', type: 'string', req: true, desc: t('Pesan untuk operator (Bahasa Indonesia).', 'Message for the operator (Indonesian).') },
    ],
  },
];

export const ENDPOINTS: Endpoint[] = [
  {
    id: 'health', method: 'GET', path: '/health', auth: 'public',
    title: t('Cek hidup', 'Health check'),
    purpose: t('Untuk uptime check Cloud Run dan smoke test deploy.', 'For Cloud Run uptime checks and deploy smoke tests.'),
    usedBy: null,
    responses: [{ code: 200, schema: 'Health', example: 'health' }],
    errors: [],
  },
  {
    id: 'meta', method: 'GET', path: '/meta', auth: 'public',
    title: t('Keadaan data', 'Data state'),
    purpose: t('Slot terakhir per satelit, malam/siang, dan status replay.', 'Latest slot per satellite, night/day and replay status.'),
    usedBy: t('Peta → banner data (DataBanner), baris H/G dan slot terbaru di pemutar slot; keadaan "satu satelit", "siang", "replay".', 'Map → data banner (DataBanner), H/G rows and latest slot in the slot player; "single satellite", "daytime", "replay" states.'),
    params: [AS_OF_PARAM],
    responses: [{ code: 200, schema: 'Meta', example: 'meta' }],
    errors: ['VALIDATION'],
  },
  {
    id: 'pixels', method: 'GET', path: '/operator/pixels', auth: 'operator',
    title: t('Indeks piksel gambut', 'Peat pixel index'),
    purpose: t('Geometri grid statis, diunduh sekali lalu di-cache (kirim ETag + Cache-Control). Respons ringkas lain merujuk sel lewat urutan di sini.', 'Static grid geometry, downloaded once then cached (send ETag + Cache-Control). Other compact responses refer to cells by this order.'),
    usedBy: t('Peta → geometri semua kotak piksel (dibangun sekali), pencarian ID piksel/koordinat, inspektur piksel.', 'Map → geometry of every pixel square (built once), pixel id / coordinate search, pixel inspector.'),
    responses: [{ code: 200, schema: 'PixelIndex', example: 'pixels' }],
    errors: ['UNAUTHENTICATED', 'FORBIDDEN'],
  },
  {
    id: 'grid', method: 'GET', path: '/operator/grid', auth: 'operator',
    title: t('Status piksel gambut', 'Peat pixel status'),
    purpose: t('Semua piksel gambut untuk slot malam terakhir ≤ as_of. Dua format: GeoJSON titik (default, sesuai backend.html, untuk alat lain/debug) dan `format=compact` (dipakai UI).', 'Every peat pixel for the latest night slot ≤ as_of. Two formats: GeoJSON points (default, as in backend.html, for other tools/debugging) and `format=compact` (used by the UI).'),
    usedBy: t('Peta (format=compact) → warna + ikon status, garis kelompok, inspektur, keadaan "tertutup awan" (> 50% N).', 'Map (format=compact) → status colours + icons, cluster outlines, inspector, "cloud covered" state (> 50% N).'),
    params: [
      AS_OF_PARAM,
      { name: 'format', type: "query · 'geojson' | 'compact'", req: false, origin: 'fe', desc: t('Default geojson. UI selalu mengirim compact.', 'Default geojson. The UI always sends compact.') },
      { name: 'province', type: `query · ${PROV_T}`, req: false, origin: 'fe', desc: t('Hanya untuk geojson (opsional); UI memfilter di klien.', 'geojson only (optional); the UI filters client-side.') },
    ],
    responses: [
      { code: 200, schema: 'GridCompact', example: 'gridCompact', note: t('format=compact. String panjang dipotong di contoh.', 'format=compact. Long strings are trimmed in the example.') },
      { code: 200, schema: 'GridFeature', example: 'grid', note: t('format=geojson: FeatureCollection<Point, GridFeature.properties>, contoh dipotong jadi 2 fitur.', 'format=geojson: FeatureCollection<Point, GridFeature.properties>, trimmed to 2 features.') },
    ],
    errors: ['UNAUTHENTICATED', 'FORBIDDEN', 'VALIDATION'],
  },
  {
    id: 'night', method: 'GET', path: '/operator/grid/night', auth: 'operator',
    title: t('Status per slot satu malam', 'Per-slot status for one night'),
    purpose: t('54 string status (format ringkas) untuk satu malam; satu permintaan menggantikan 54 × /operator/grid. Slot setelah as_of = null.', '54 status strings (compact format) for one night; one request replaces 54 × /operator/grid. Slots after as_of = null.'),
    usedBy: t('Peta → pemutar slot (pita malam: baris ▲ jumlah AWAS per slot), riwayat 54 slot di inspektur piksel.', 'Map → slot player (night ribbon: ▲ row = AWAS count per slot), 54-slot history in the pixel inspector.'),
    params: [
      { name: 'night', type: 'query · YYYY-MM-DD', req: true, origin: 'fe', desc: t('night_id (tanggal WIB malam dimulai).', 'night_id (WIB date the night starts).') },
      AS_OF_PARAM,
    ],
    responses: [{ code: 200, schema: 'NightCompact', example: 'night', note: t('Contoh dipotong.', 'Example trimmed.') }],
    errors: ['UNAUTHENTICATED', 'FORBIDDEN', 'VALIDATION'],
  },
  {
    id: 'basemaps', method: 'GET', path: '/operator/basemaps', auth: 'operator',
    title: t('Pilihan peta dasar', 'Basemap options'),
    purpose: t('Basemap raster yang disediakan BE (mis. citra satelit tanggal as_of). Sumbernya keputusan BE; FE hanya memasang template tile.', 'Raster basemaps provided by the BE (e.g. satellite imagery for the as_of date). The source is the BE\'s choice; the FE only mounts the tile template.'),
    usedBy: t('Peta → kontrol layer, pilihan "satelit".', 'Map → layer control, "satellite" option.'),
    params: [AS_OF_PARAM],
    responses: [{ code: 200, schema: 'Basemap', example: 'basemaps', note: t('Basemap[]. Array kosong = hanya peta jalan dan polos.', 'Basemap[]. Empty array = street and plain maps only.') }],
    errors: ['UNAUTHENTICATED', 'FORBIDDEN'],
  },
  {
    id: 'clusters', method: 'GET', path: '/operator/clusters', auth: 'operator',
    title: t('Daftar kelompok AWAS', 'AWAS cluster list'),
    purpose: t('Kelompok AWAS + verifikasi terakhir + keputusan. Respons berupa array langsung (usulan FE).', 'AWAS clusters + latest verification + decision. The response is a bare array (FE proposal).'),
    usedBy: t('Peta → panel daftar kelompok (urut utility), keadaan "kosong".', 'Map → cluster list panel (sorted by utility), "empty" state.'),
    params: [
      { name: 'state', type: "query · 'active' | 'closed'", req: false, origin: 'backend', desc: t('Default active. UI memakai active.', 'Default active. The UI uses active.') },
      AS_OF_PARAM,
    ],
    responses: [{ code: 200, schema: 'ClusterSummary', example: 'clusters', note: t('ClusterSummary[].', 'ClusterSummary[].') }],
    errors: ['UNAUTHENTICATED', 'FORBIDDEN', 'VALIDATION'],
  },
  {
    id: 'cluster', method: 'GET', path: '/operator/clusters/{id}', auth: 'operator',
    title: t('Detail kelompok', 'Cluster detail'),
    purpose: t('Deret utility 3 malam, atribut MAUT slot pemicu, tetangga, verifikasi lengkap + jejak tool, signed URL citra.', '3-night utility series, MAUT attributes at the trigger slot, neighbours, full verification + tool trace, signed image URLs.'),
    usedBy: t('Detail kelompok → UtilityChart, AttributeBars, NeighbourGrid, kartu verifikasi, ToolTrace, caption DecisionPanel; peta → titik VIIRS untuk kelompok terpilih.', 'Cluster detail → UtilityChart, AttributeBars, NeighbourGrid, verification card, ToolTrace, DecisionPanel caption; map → VIIRS points for the selected cluster.'),
    params: [
      { name: 'id', type: 'path · string', req: true, origin: 'backend', desc: t('ID kelompok, mis. C-0924-002.', 'Cluster id, e.g. C-0924-002.') },
      AS_OF_PARAM,
    ],
    responses: [{ code: 200, schema: 'ClusterDetail', example: 'cluster' }],
    errors: ['UNAUTHENTICATED', 'FORBIDDEN', 'NOT_FOUND'],
  },
  {
    id: 'verify', method: 'POST', path: '/operator/clusters/{id}/verify', auth: 'operator',
    title: t('Verifikasi ulang', 'Re-verify'),
    purpose: t('Teruskan ke asapify-agent POST /verify. Hormati jeda 6 jam kecuali force = true.', 'Forward to asapify-agent POST /verify. Respect the 6 h cooldown unless force = true.'),
    usedBy: null,
    params: [{ name: 'id', type: 'path · string', req: true, origin: 'backend', desc: t('ID kelompok.', 'Cluster id.') }],
    body: { schema: 'VerifyRequest', example: 'verifyReq' },
    responses: [{ code: 202, schema: 'VerifyResponse', example: 'verifyRes' }],
    errors: ['UNAUTHENTICATED', 'FORBIDDEN', 'NOT_FOUND', 'COOLDOWN_ACTIVE'],
  },
  {
    id: 'decision', method: 'POST', path: '/operator/clusters/{id}/decision', auth: 'operator',
    title: t('Terbitkan / tolak', 'Publish / reject'),
    purpose: t('Publish: simpan keputusan, bot mengirim foto + caption ke grup peringatan provinsi. Reject: simpan alasan. Sekali per kelompok; semuanya masuk audit_log. UI memuat ulang detail setelah 201.', 'Publish: save the decision; the bot sends photo + caption to the provincial alert group. Reject: save the reason. Once per cluster; everything goes to audit_log. The UI reloads the detail after 201.'),
    usedBy: t('Detail kelompok → DecisionPanel (tombol Terbitkan ke grup / Tolak).', 'Cluster detail → DecisionPanel (Publish to group / Reject buttons).'),
    params: [{ name: 'id', type: 'path · string', req: true, origin: 'backend', desc: t('ID kelompok.', 'Cluster id.') }],
    body: { schema: 'DecisionRequest', example: 'decisionReq' },
    responses: [
      { code: 201, schema: 'DecisionResponse', example: 'decisionRes' },
      { code: 409, schema: 'Error', example: 'decisionErr', note: t('UI menampilkan message lalu memuat ulang detail.', 'The UI shows the message, then reloads the detail.') },
    ],
    errors: ['UNAUTHENTICATED', 'FORBIDDEN', 'NOT_FOUND', 'ALREADY_DECIDED', 'REASON_REQUIRED', 'CAPTION_INVALID'],
  },
  {
    id: 'alerts', method: 'GET', path: '/operator/alerts', auth: 'operator',
    title: t('Daftar peringatan', 'Alert list'),
    purpose: t('Peringatan yang terbit + status kirim Telegram.', 'Published alerts + Telegram send status.'),
    usedBy: null,
    params: [
      { name: 'status', type: "query · 'active' | 'closed'", req: false, origin: 'backend', desc: t('Tanpa ini = semua.', 'Omitted = all.') },
      AS_OF_PARAM,
    ],
    responses: [{ code: 200, schema: 'Alert', example: 'alerts', note: t('Alert[].', 'Alert[].') }],
    errors: ['UNAUTHENTICATED', 'FORBIDDEN', 'VALIDATION'],
  },
  {
    id: 'close', method: 'POST', path: '/operator/alerts/{id}/close', auth: 'operator',
    title: t('Tutup peringatan', 'Close alert'),
    purpose: t('Tutup lebih awal oleh operator: caption pesan yang sama diedit jadi diawali SELESAI (editMessageCaption). Penutupan otomatis lewat agent /cluster-closed.', 'Early close by an operator: the same message caption is edited to start with SELESAI (editMessageCaption). Automatic closing goes through agent /cluster-closed.'),
    usedBy: null,
    params: [{ name: 'id', type: 'path · string', req: true, origin: 'backend', desc: t('ID peringatan, mis. A-0924-001.', 'Alert id, e.g. A-0924-001.') }],
    body: { schema: 'CloseRequest', example: 'closeReq' },
    responses: [{ code: 200, schema: 'Alert', example: 'closeRes' }],
    errors: ['UNAUTHENTICATED', 'FORBIDDEN', 'NOT_FOUND', 'ALREADY_CLOSED'],
  },
];

/** Endpoint internal asapify-agent — bukan untuk UI, dicatat agar tim BE tahu batasnya. */
export const INTERNAL: { method: string; path: string; desc: Txt }[] = [
  { method: 'POST', path: '/verify', desc: t('OIDC sa-jobs / sa-api. Body {cluster_id, trigger_slot, force}. 202 + verification_id.', 'OIDC sa-jobs / sa-api. Body {cluster_id, trigger_slot, force}. 202 + verification_id.') },
  { method: 'POST', path: '/cluster-closed', desc: t('OIDC sa-jobs. Body {cluster_id}. Edit caption jadi SELESAI bila ada alert terbit.', 'OIDC sa-jobs. Body {cluster_id}. Edits the caption to SELESAI if an alert was published.') },
];

/** Contoh statis untuk endpoint yang tidak punya fixture mock. */
export const STATIC_EXAMPLES: Partial<Record<ExampleKey, unknown>> = {
  health: { status: 'ok', version: '0.1.0', time: '2023-09-24T15:10:03Z' },
  verifyReq: { force: false },
  verifyRes: { verification_id: 'V-0924-002-1510', cluster_id: 'C-0924-002', status: 'queued' },
  decisionReq: {
    action: 'publish',
    caption_id: '<b>AWAS · Dugaan gambut membara</b>\n📍 Kalimantan Tengah · -2.21, 113.92 · 4 piksel\n…',
    reason: null,
  },
  decisionRes: {
    action: 'publish', by: 'operator@contoh.id', at: '2023-09-24T15:30:00Z', reason: null,
    alert_id: 'A-0924-001', telegram: { status: 'sent', message_id: 812 },
  },
  decisionErr: { error: { code: 'ALREADY_DECIDED', message: 'Kelompok ini sudah diterbitkan oleh operator lain.' } },
  alerts: [{
    id: 'A-0923-001', cluster_id: 'C-0923-001', province: '62',
    caption_id: '<b>AWAS · Dugaan gambut membara</b>\n📍 Kalimantan Tengah · -2.05, 113.69 · 6 piksel\n…',
    published_by: 'operator@contoh.id', published_at: '2023-09-23T17:02:00Z',
    status: 'active', closed_at: null, closed_by: null,
    telegram: { status: 'sent', message_id: 640, error: null },
  }],
  closeReq: { reason: 'Kelompok sudah padam menurut BPBD Kalteng' },
  closeRes: {
    id: 'A-0923-001', cluster_id: 'C-0923-001', province: '62',
    caption_id: 'SELESAI · <b>AWAS · Dugaan gambut membara</b>\n…',
    published_by: 'operator@contoh.id', published_at: '2023-09-23T17:02:00Z',
    status: 'closed', closed_at: '2023-09-26T02:00:00Z', closed_by: 'operator@contoh.id',
    telegram: { status: 'edited', message_id: 640, error: null },
  },
};
