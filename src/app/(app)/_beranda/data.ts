import "server-only";
import { Prisma } from "@/generated/prisma/client";
import type { Hari, StatusKehadiran } from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import { HARI_URUT, hariIni } from "@/lib/labels";

// ---------------------------------------------------------------------------------------------
// Period filter shared by every dashboard

export type Periode = "7" | "30" | "semester";
export const PERIODE_LABEL: Record<Periode, string> = { "7": "7 hari", "30": "30 hari", semester: "Semester ini" };

const HARI_MS = 86_400_000;

export type Rentang = { periode: Periode; dari: Date; sampai: Date; sebelum: { dari: Date; sampai: Date } | null };

export function parsePeriode(v: string | string[] | undefined): Periode {
  return v === "7" || v === "semester" ? v : "30";
}

/** Inclusive date range in the database's UTC-midnight dates, plus the equally long one before it. */
export function rentang(periode: Periode): Rentang {
  const sampai = hariIni();
  if (periode === "semester") {
    const y = sampai.getUTCFullYear();
    const dari = new Date(Date.UTC(y, sampai.getUTCMonth() >= 6 ? 6 : 0, 1));
    return { periode, dari, sampai, sebelum: null };
  }
  const n = Number(periode);
  const dari = new Date(sampai.getTime() - (n - 1) * HARI_MS);
  return {
    periode,
    dari,
    sampai,
    sebelum: { dari: new Date(dari.getTime() - n * HARI_MS), sampai: new Date(dari.getTime() - HARI_MS) },
  };
}

export function semesterSekarang() {
  return hariIni().getUTCMonth() >= 6 ? ("GANJIL" as const) : ("GENAP" as const);
}

export function hariSekarang(): Hari | null {
  const d = hariIni().getUTCDay(); // 1 = Monday
  return d >= 1 && d <= 5 ? HARI_URUT[d - 1] : null;
}

// ---------------------------------------------------------------------------------------------
// Attendance. "Present" counts late arrivals and official duty away, like the rapor does.

const HADIR: StatusKehadiran[] = ["HADIR", "TERLAMBAT", "BERTUGAS_KELUAR"];

export type Rekap = { total: number; hadir: number; per: Partial<Record<StatusKehadiran, number>> };
const kosong = (): Rekap => ({ total: 0, hadir: 0, per: {} });
export const persen = (r: Rekap) => (r.total ? (r.hadir / r.total) * 100 : null);

/** Which attendance rows a dashboard may see. */
export type Cakupan =
  | { semua: true }
  | { kelasIds: number[] }
  | { kursus: { kelasId: number; pelajaranId: number }[] }
  | { siswaId: number };

function filterSql(c: Cakupan): Prisma.Sql {
  if ("semua" in c) return Prisma.sql`TRUE`;
  if ("siswaId" in c) return Prisma.sql`a."siswaId" = ${c.siswaId}`;
  if ("kelasIds" in c)
    return c.kelasIds.length ? Prisma.sql`p."kelasId" IN (${Prisma.join(c.kelasIds)})` : Prisma.sql`FALSE`;
  if (!c.kursus.length) return Prisma.sql`FALSE`;
  return Prisma.sql`(p."kelasId", p."pelajaranId") IN (${Prisma.join(
    c.kursus.map((k) => Prisma.sql`(${k.kelasId}, ${k.pelajaranId})`),
  )})`;
}

type Baris = { kunci: number | Date; status: StatusKehadiran; n: bigint };

function tambah(r: Rekap, status: StatusKehadiran, n: number) {
  r.total += n;
  r.per[status] = (r.per[status] ?? 0) + n;
  if (HADIR.includes(status)) r.hadir += n;
}

/** Totals for the range, overall and per class. */
export async function rekapKehadiran(c: Cakupan, dari: Date, sampai: Date) {
  const rows = await prisma.$queryRaw<Baris[]>`
    SELECT p."kelasId" AS kunci, a.status, COUNT(*) AS n
    FROM "Absensi" a JOIN "Pertemuan" p ON p.id = a."pertemuanId"
    WHERE p.tanggal BETWEEN ${dari} AND ${sampai} AND ${filterSql(c)}
    GROUP BY 1, 2`;
  const semua = kosong();
  const perKelas = new Map<number, Rekap>();
  for (const r of rows) {
    const n = Number(r.n);
    tambah(semua, r.status, n);
    const id = r.kunci as number;
    if (!perKelas.has(id)) perKelas.set(id, kosong());
    tambah(perKelas.get(id)!, r.status, n);
  }
  return { semua, perKelas };
}

/** Attendance rate per day (short ranges) or per week starting Monday (long ones). */
export async function trenKehadiran(c: Cakupan, dari: Date, sampai: Date) {
  const harian = sampai.getTime() - dari.getTime() < 14 * HARI_MS;
  const unit = harian ? Prisma.sql`'day'` : Prisma.sql`'week'`;
  const rows = await prisma.$queryRaw<Baris[]>`
    SELECT date_trunc(${unit}, p.tanggal)::date AS kunci, a.status, COUNT(*) AS n
    FROM "Absensi" a JOIN "Pertemuan" p ON p.id = a."pertemuanId"
    WHERE p.tanggal BETWEEN ${dari} AND ${sampai} AND ${filterSql(c)}
    GROUP BY 1, 2 ORDER BY 1`;
  const per = new Map<number, Rekap>();
  for (const r of rows) {
    const t = (r.kunci as Date).getTime();
    if (!per.has(t)) per.set(t, kosong());
    tambah(per.get(t)!, r.status, Number(r.n));
  }
  return {
    satuan: harian ? ("hari" as const) : ("pekan" as const),
    titik: [...per.entries()].map(([t, r]) => ({ tanggal: new Date(t), rekap: r })),
  };
}

/** Students of the given classes with the most unexplained absences and late arrivals. */
export async function siswaAbsenTerbanyak(kelasIds: number[], dari: Date, sampai: Date) {
  if (!kelasIds.length) return [];
  const rows = await prisma.$queryRaw<{ siswaId: number; alpa: bigint; telat: bigint }[]>`
    SELECT a."siswaId",
      COUNT(*) FILTER (WHERE a.status = 'TANPA_KETERANGAN') AS alpa,
      COUNT(*) FILTER (WHERE a.status = 'TERLAMBAT') AS telat
    FROM "Absensi" a JOIN "Pertemuan" p ON p.id = a."pertemuanId"
    WHERE p.tanggal BETWEEN ${dari} AND ${sampai} AND p."kelasId" IN (${Prisma.join(kelasIds)})
    GROUP BY 1`;
  return rows.map((r) => ({ siswaId: r.siswaId, alpa: Number(r.alpa), telat: Number(r.telat) }));
}
