import type { Role } from "@/generated/prisma/enums";

// Role groups. Which classes each role sees inside a feature is decided in lib/lingkup.ts.
export const ADMIN: readonly Role[] = ["ADMIN"];
/** Data guru and adding exams. */
export const STAF: readonly Role[] = ["ADMIN", "GURU"];
/** Everyone who teaches: jadwal mengajar, absensi, and nilai ujian. */
export const PENILAI: readonly Role[] = ["ADMIN", "GURU", "WALI_KELAS"];
/** Wali kelas duties for the rapor: sikap, ekstrakurikuler, prestasi. */
export const WALI: readonly Role[] = ["ADMIN", "WALI_KELAS"];
/** Class timetable: a guru reads theirs in Jadwal mengajar instead. */
export const LIHAT_JADWAL: readonly Role[] = ["ADMIN", "WALI_KELAS", "SISWA"];
export const SEMUA: readonly Role[] = ["ADMIN", "GURU", "WALI_KELAS", "SISWA"];

export type NavItem = { href: string; label: string; icon: NavIcon; roles: readonly Role[] };
export type NavGroup = { label: string; items: NavItem[] };
export type NavIcon =
  | "beranda"
  | "belajar"
  | "bahan"
  | "bankSoal"
  | "ringkasan"
  | "akun"
  | "kelas"
  | "siswa"
  | "guru"
  | "pelajaran"
  | "jadwal"
  | "mengajar"
  | "absensi"
  | "ujian"
  | "nilai"
  | "sikap"
  | "ekskul"
  | "prestasi"
  | "rapor";

export const NAV: NavGroup[] = [
  {
    label: "Umum",
    items: [
      { href: "/", label: "Beranda", icon: "beranda", roles: SEMUA },
      { href: "/belajar", label: "Kelas belajar", icon: "belajar", roles: SEMUA },
      { href: "/dashboard", label: "Ringkasan sekolah", icon: "ringkasan", roles: ADMIN },
      { href: "/jadwal", label: "Jadwal pelajaran", icon: "jadwal", roles: LIHAT_JADWAL },
      { href: "/ujian", label: "Jadwal ujian", icon: "ujian", roles: SEMUA },
      { href: "/guru", label: "Data guru", icon: "guru", roles: STAF },
      { href: "/rapor", label: "Rapor siswa", icon: "rapor", roles: SEMUA },
    ],
  },
  {
    label: "Mengajar",
    items: [
      { href: "/jadwal-mengajar", label: "Jadwal mengajar", icon: "mengajar", roles: PENILAI },
      { href: "/bank-soal", label: "Bank soal", icon: "bankSoal", roles: PENILAI },
    ],
  },
  {
    label: "Penilaian",
    items: [
      { href: "/nilai/ujian", label: "Nilai ujian", icon: "nilai", roles: PENILAI },
      { href: "/nilai/sikap", label: "Nilai sikap", icon: "sikap", roles: WALI },
      { href: "/nilai/ekstrakurikuler", label: "Ekstrakurikuler", icon: "ekskul", roles: WALI },
      { href: "/nilai/prestasi", label: "Prestasi", icon: "prestasi", roles: WALI },
    ],
  },
  {
    label: "Administrasi",
    items: [
      { href: "/siswa", label: "Data siswa", icon: "siswa", roles: ADMIN },
      { href: "/kelas", label: "Kelas", icon: "kelas", roles: ADMIN },
      { href: "/pelajaran", label: "Mata pelajaran", icon: "pelajaran", roles: ADMIN },
      { href: "/bahan-ajar", label: "Bahan ajar", icon: "bahan", roles: ADMIN },
      { href: "/akun", label: "Akun pengguna", icon: "akun", roles: ADMIN },
    ],
  },
];

export function navFor(role: Role): NavGroup[] {
  return NAV.map((g) => ({ ...g, items: g.items.filter((i) => i.roles.includes(role)) })).filter(
    (g) => g.items.length > 0,
  );
}
