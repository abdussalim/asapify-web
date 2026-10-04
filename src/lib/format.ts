import type { Lang } from '../i18n';

// Simpan UTC, tampilkan WIB (WORKLOG §10 aturan 8).
const TZ = 'Asia/Jakarta';

function parts(iso: string, lang: Lang) {
  const f = new Intl.DateTimeFormat(lang === 'id' ? 'id-ID' : 'en-US', {
    timeZone: TZ, day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  });
  const p: Record<string, string> = {};
  for (const x of f.formatToParts(new Date(iso))) p[x.type] = x.value;
  return { day: p.day, month: p.month.replace('.', ''), hour: p.hour, minute: p.minute };
}

const sep = (lang: Lang) => (lang === 'id' ? '.' : ':');

export function fmtTime(iso: string, lang: Lang): string {
  const p = parts(iso, lang);
  return `${p.hour}${sep(lang)}${p.minute}`;
}

export function fmtDate(iso: string, lang: Lang): string {
  const p = parts(iso, lang);
  return `${p.day} ${p.month}`;
}

/** "24 Sep 22.10 WIB" */
export function fmtSlot(iso: string, lang: Lang): string {
  return `${fmtDate(iso, lang)} ${fmtTime(iso, lang)} WIB`;
}

/** Malam YYYY-MM-DD (tanggal WIB saat malam dimulai) → "Min, 24 Sep 2023" / "Sun, 24 Sep 2023". */
export function fmtNight(night: string, lang: Lang): string {
  // en-US: "Sep" (en-GB kini menulis "Sept"); urutan dirakit sendiri di bawah.
  const f = new Intl.DateTimeFormat(lang === 'id' ? 'id-ID' : 'en-US', { timeZone: 'UTC', weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
  const p: Record<string, string> = {};
  for (const x of f.formatToParts(new Date(`${night}T12:00:00Z`))) p[x.type] = x.value;
  return `${p.weekday.replace('.', '')}, ${p.day} ${p.month.replace('.', '')} ${p.year}`;
}

export function fmtNum(n: number, digits: number, lang: Lang): string {
  return n.toLocaleString(lang === 'id' ? 'id-ID' : 'en-US', {
    minimumFractionDigits: digits, maximumFractionDigits: digits,
  });
}

export function fmtCoord(lon: number, lat: number): string {
  return `${lat.toFixed(2)}, ${lon.toFixed(2)}`;
}
