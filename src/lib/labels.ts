import type {
  Hari,
  JenisKelamin,
  JenisAsesmen,
  JenisSikap,
  JenisUjian,
  Tingkat,
  Role,
  Semester,
  StatusKehadiran,
} from "@/generated/prisma/enums";

export const ROLE_LABEL: Record<Role, string> = {
  ADMIN: "Admin",
  GURU: "Guru",
  WALI_KELAS: "Wali Kelas",
  SISWA: "Siswa",
};

export const JK_LABEL: Record<JenisKelamin, string> = {
  PRIA: "Laki-laki",
  WANITA: "Perempuan",
};

export const HARI_URUT: Hari[] = ["SENIN", "SELASA", "RABU", "KAMIS", "JUMAT"];
export const HARI_LABEL: Record<Hari, string> = {
  SENIN: "Senin",
  SELASA: "Selasa",
  RABU: "Rabu",
  KAMIS: "Kamis",
  JUMAT: "Jumat",
};

export const SEMESTER_LABEL: Record<Semester, string> = {
  GANJIL: "Semester 1 (Ganjil)",
  GENAP: "Semester 2 (Genap)",
};

export const JENIS_ASESMEN_LABEL: Record<JenisAsesmen, string> = {
  TUGAS: "Tugas",
  KUIS: "Kuis",
  UJIAN: "Ujian",
};

export const TINGKAT_URUT: Tingkat[] = ["X", "XI", "XII"];

export const JENIS_UJIAN_URUT: JenisUjian[] = ["UTS", "UAS", "UJIAN_SEKOLAH"];
export const JENIS_UJIAN_LABEL: Record<JenisUjian, string> = {
  UTS: "UTS",
  UAS: "UAS",
  UJIAN_SEKOLAH: "Ujian Sekolah",
};

/** "UTS Ganjil", "Ujian Sekolah Genap": the short name of an exam period. */
export function namaPeriode(jenis: JenisUjian, semester: Semester) {
  return `${JENIS_UJIAN_LABEL[jenis]} ${semester === "GANJIL" ? "Ganjil" : "Genap"}`;
}

export const STATUS_URUT: StatusKehadiran[] = [
  "HADIR",
  "IZIN",
  "SAKIT",
  "TERLAMBAT",
  "BERTUGAS_KELUAR",
  "TANPA_KETERANGAN",
];
export const STATUS_LABEL: Record<StatusKehadiran, string> = {
  HADIR: "Hadir",
  IZIN: "Izin",
  SAKIT: "Sakit",
  TERLAMBAT: "Terlambat",
  BERTUGAS_KELUAR: "Bertugas keluar",
  TANPA_KETERANGAN: "Tanpa keterangan",
};

export const SIKAP_LABEL: Record<JenisSikap, string> = {
  SPIRITUAL: "Sikap spiritual",
  SOSIAL: "Sikap sosial",
};

export const PREDIKAT_SIKAP = ["Sangat Baik", "Baik", "Cukup", "Kurang"] as const;

/** A 0 to 100 score the Indonesian way: "62,5", "80". */
export function formatNilai(n: number) {
  return (Math.round(n * 10) / 10).toLocaleString("id-ID");
}

/** Same thresholds as the old UjianController. */
export function predikatNilai(nilai: number) {
  if (nilai >= 92) return "A";
  if (nilai >= 83) return "B";
  if (nilai >= 75) return "C";
  return "D";
}

export function parseSemester(value: string | string[] | undefined): Semester {
  return value === "GENAP" ? "GENAP" : "GANJIL";
}

const tanggalFormat = new Intl.DateTimeFormat("id-ID", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});
const hariFormat = new Intl.DateTimeFormat("id-ID", { weekday: "long", timeZone: "UTC" });

export function formatTanggal(date: Date) {
  return tanggalFormat.format(date);
}

export function formatHari(date: Date) {
  return hariFormat.format(date);
}

const witaFormat = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Makassar" });

/** Today's date in Makassar (WITA) as YYYY-MM-DD, so early-morning use is not "yesterday". */
export function hariIniInput() {
  return witaFormat.format(new Date());
}

/** Today in Makassar as the UTC-midnight Date the database stores. */
export function hariIni() {
  return new Date(`${hariIniInput()}T00:00:00.000Z`);
}

/** Value for <input type="date">. Dates are stored as UTC midnight. */
export function toDateInput(date: Date) {
  return date.toISOString().slice(0, 10);
}
