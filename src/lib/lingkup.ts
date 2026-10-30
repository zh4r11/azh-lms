import "server-only";
import { cache } from "react";
import { prisma } from "@/lib/prisma";
import { AccessError, type CurrentUser } from "@/lib/auth";
import type { Prisma } from "@/generated/prisma/client";

/**
 * Which classes a signed-in user works with, per feature. `null` means every class (admin).
 *
 * - jadwal: wali kelas sees the class they lead, siswa their own class.
 * - absensi: guru and wali kelas see the classes they teach in the timetable.
 * - ujian: classes they teach (only their subjects), plus a wali kelas's own class (any subject).
 * - wali: sikap, ekstrakurikuler, prestasi, and rapor are the wali kelas's own class only.
 */
export type Fitur = "jadwal" | "absensi" | "ujian" | "wali";

const kelasWali = cache(async (guruId: number | null) => {
  if (!guruId) return [];
  const rows = await prisma.kelas.findMany({ where: { waliKelasId: guruId }, select: { id: true } });
  return rows.map((r) => r.id);
});

const kelasDiajar = cache(async (guruId: number | null) => {
  if (!guruId) return [];
  const rows = await prisma.jadwal.findMany({
    where: { guruId },
    distinct: ["kelasId"],
    select: { kelasId: true },
  });
  return rows.map((r) => r.kelasId);
});

const kelasSiswa = cache(async (siswaId: number | null) => {
  if (!siswaId) return [];
  const s = await prisma.siswa.findUnique({ where: { id: siswaId }, select: { kelasId: true } });
  return s?.kelasId ? [s.kelasId] : [];
});

export async function kelasUntuk(user: CurrentUser, fitur: Fitur): Promise<number[] | null> {
  if (user.role === "ADMIN") return null;
  if (user.role === "WALI_KELAS") {
    if (fitur === "absensi") return kelasDiajar(user.guruId);
    if (fitur === "ujian") {
      const [wali, ajar] = await Promise.all([kelasWali(user.guruId), kelasDiajar(user.guruId)]);
      return [...new Set([...wali, ...ajar])];
    }
    return kelasWali(user.guruId);
  }
  if (user.role === "SISWA") return fitur === "jadwal" ? kelasSiswa(user.siswaId) : [];
  // GURU
  return fitur === "absensi" || fitur === "ujian" ? kelasDiajar(user.guruId) : [];
}

export async function bolehKelas(user: CurrentUser, fitur: Fitur, kelasId: number) {
  const ids = await kelasUntuk(user, fitur);
  return ids === null || ids.includes(kelasId);
}

/** For server actions: the same check as the pages, so a hand-made request is refused too. */
export async function assertKelas(user: CurrentUser, fitur: Fitur, kelasId: number | null) {
  if (kelasId === null || !(await bolehKelas(user, fitur, kelasId))) {
    throw new AccessError("Kelas ini bukan kelas yang Anda pegang.");
  }
}

/**
 * Subjects a teacher may grade in a class: the ones they teach there. `null` means any subject,
 * which is the admin everywhere and the wali kelas in their own class.
 */
export async function pelajaranUntuk(user: CurrentUser, kelasId: number): Promise<number[] | null> {
  if (user.role === "ADMIN" || user.role === "SISWA") return null;
  if (!user.guruId) return [];
  if (user.role === "WALI_KELAS" && (await kelasWali(user.guruId)).includes(kelasId)) return null;
  const rows = await prisma.jadwal.findMany({
    where: { guruId: user.guruId, kelasId },
    distinct: ["pelajaranId"],
    select: { pelajaranId: true },
  });
  return rows.map((r) => r.pelajaranId);
}

/**
 * Exams a user should see: admin all; siswa their class; guru and wali kelas the classes they
 * teach or lead, plus any exam they invigilate.
 */
export async function whereUjian(user: CurrentUser): Promise<Prisma.JadwalUjianWhereInput> {
  if (user.role === "ADMIN") return {};
  if (user.role === "SISWA") return { kelasId: { in: await kelasSiswa(user.siswaId) } };
  const kelas = (await kelasUntuk(user, "ujian")) ?? [];
  return {
    OR: [{ kelasId: { in: kelas } }, ...(user.guruId ? [{ pengawasId: user.guruId }] : [])],
  };
}

/** Empty-list message that tells the user why they see no class, instead of a bare "no class". */
export function alasanKosong(user: CurrentUser, fitur: Fitur) {
  if (user.role === "ADMIN") return null;
  if (user.role === "SISWA") {
    return user.siswaId
      ? "Anda belum dimasukkan ke kelas. Hubungi admin sekolah."
      : "Akun Anda belum terhubung ke data siswa. Hubungi admin sekolah.";
  }
  if (!user.guruId) return "Akun Anda belum terhubung ke data guru. Minta admin menghubungkannya di menu Akun pengguna.";
  if (user.role === "WALI_KELAS" && fitur !== "absensi") {
    return "Anda belum ditetapkan sebagai wali kelas mana pun. Admin mengaturnya di menu Kelas.";
  }
  return fitur === "absensi" || fitur === "ujian"
    ? "Anda belum punya jam mengajar di jadwal pelajaran. Admin menyusunnya di menu Jadwal pelajaran."
    : null;
}

export type Akses = "kelola" | "lihat" | null;
export type Kursus = { kelasId: number; pelajaranId: number };

/**
 * A "kursus" is one subject taught in one class, taken from the timetable. Manage rights go to
 * the admin and to whoever teaches it; the wali kelas and the class's students may look.
 */
export async function aksesKursus(user: CurrentUser, kelasId: number, pelajaranId: number): Promise<Akses> {
  if (user.role === "ADMIN") return "kelola";
  const ada = await prisma.jadwal.findFirst({
    where: { kelasId, pelajaranId },
    select: { id: true },
  });
  if (!ada) return null;
  if (user.role === "SISWA") {
    return (await kelasSiswa(user.siswaId)).includes(kelasId) ? "lihat" : null;
  }
  if (!user.guruId) return null;
  const mengajar = await prisma.jadwal.findFirst({
    where: { kelasId, pelajaranId, guruId: user.guruId },
    select: { id: true },
  });
  if (mengajar) return "kelola";
  if (user.role === "WALI_KELAS" && (await kelasWali(user.guruId)).includes(kelasId)) return "lihat";
  return null;
}

/** For server actions on a kursus: only the teacher (or admin) may change it. */
export async function assertKelola(user: CurrentUser, kelasId: number, pelajaranId: number) {
  if ((await aksesKursus(user, kelasId, pelajaranId)) !== "kelola") {
    throw new AccessError("Hanya guru pengampu mata pelajaran ini yang bisa mengubahnya.");
  }
}

/** Every kursus a user can open, for the "Kelas belajar" list. */
export async function daftarKursus(user: CurrentUser): Promise<(Kursus & { kelola: boolean })[]> {
  const pasang = (where: Prisma.JadwalWhereInput) =>
    prisma.jadwal.findMany({
      where,
      distinct: ["kelasId", "pelajaranId"],
      select: { kelasId: true, pelajaranId: true },
    });
  if (user.role === "ADMIN") return (await pasang({})).map((k) => ({ ...k, kelola: true }));
  if (user.role === "SISWA") {
    const kelas = await kelasSiswa(user.siswaId);
    return (await pasang({ kelasId: { in: kelas } })).map((k) => ({ ...k, kelola: false }));
  }
  if (!user.guruId) return [];
  const ajar = await pasang({ guruId: user.guruId });
  const kunci = new Set(ajar.map((k) => `${k.kelasId}:${k.pelajaranId}`));
  const wali = user.role === "WALI_KELAS" ? await pasang({ kelasId: { in: await kelasWali(user.guruId) } }) : [];
  return [
    ...ajar.map((k) => ({ ...k, kelola: true })),
    ...wali.filter((k) => !kunci.has(`${k.kelasId}:${k.pelajaranId}`)).map((k) => ({ ...k, kelola: false })),
  ];
}

/** Subjects a teacher may write questions for: the ones they teach, plus their own subject. */
export async function pelajaranGuru(user: CurrentUser): Promise<number[] | null> {
  if (user.role === "ADMIN") return null;
  if (!user.guruId) return [];
  const [ajar, guru] = await Promise.all([
    prisma.jadwal.findMany({ where: { guruId: user.guruId }, distinct: ["pelajaranId"], select: { pelajaranId: true } }),
    prisma.guru.findUnique({ where: { id: user.guruId }, select: { pelajaranId: true } }),
  ]);
  return [...new Set([...ajar.map((j) => j.pelajaranId), ...(guru?.pelajaranId ? [guru.pelajaranId] : [])])];
}
