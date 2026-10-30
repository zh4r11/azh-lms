// Moments (deadlines, exam windows) are stored as real instants and always read and written in
// Makassar time (WITA, UTC+8, no daylight saving), whatever the server's own time zone is.

const WITA = "+08:00";

const jamFormat = new Intl.DateTimeFormat("id-ID", {
  timeZone: "Asia/Makassar",
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

/** "Senin, 30 November 2026 pukul 07.30" in WITA. */
export function formatWaktu(date: Date) {
  return jamFormat.format(date);
}

/** Value of <input type="datetime-local"> ("2026-11-30T07:30") read as WITA. */
export function dariInputWaktu(value: string) {
  return new Date(`${value}:00${WITA}`);
}

/** The reverse: an instant as a datetime-local value in WITA. */
export function keInputWaktu(date: Date) {
  return new Date(date.getTime() + 8 * 3600_000).toISOString().slice(0, 16);
}

/** A stored exam date (UTC midnight) plus "HH:MM" in WITA, as an instant. */
export function tanggalJam(tanggal: Date, jam: string) {
  return dariInputWaktu(`${tanggal.toISOString().slice(0, 10)}T${jam}`);
}

/** "2 jam 5 menit", "45 menit": for durations shown to students. */
export function formatDurasi(menit: number) {
  const j = Math.floor(menit / 60);
  const m = menit % 60;
  return [j ? `${j} jam` : "", m || !j ? `${m} menit` : ""].filter(Boolean).join(" ");
}
