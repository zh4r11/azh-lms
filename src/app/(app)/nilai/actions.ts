"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { AccessError, assertRole } from "@/lib/auth";
import { PENILAI, WALI } from "@/lib/access";
import { assertKelas, pelajaranUntuk } from "@/lib/lingkup";
import { PREDIKAT_SIKAP, predikatNilai } from "@/lib/labels";
import { formValues, run, zId, zSemester, zWajib } from "@/lib/action";

const zNilai = z.coerce
  .number({ message: "Isi nilai 0 sampai 100." })
  .int("Nilai harus bilangan bulat.")
  .min(0, "Nilai paling kecil 0.")
  .max(100, "Nilai paling besar 100.");

const zDesk = (label: string) => zWajib(label).max(255, `${label} maksimal 255 karakter.`);

/** Checks the student really sits in this class before anything is written for them. */
async function siswaDiKelas(siswaId: number, kelasId: number) {
  const s = await prisma.siswa.findFirst({ where: { id: siswaId, kelasId } });
  if (!s) {
    throw new z.ZodError([
      { code: "custom", path: ["siswaId"], message: "Siswa ini tidak ada di kelas ini.", input: "" },
    ]);
  }
  return s;
}

function revalidate(jenis: string, kelasId: number) {
  revalidatePath(`/nilai/${jenis}/${kelasId}`);
  revalidatePath("/rapor");
}

export async function simpanNilaiUjian(kelasId: number, formData: FormData) {
  return run(async () => {
    const user = await assertRole(PENILAI);
    await assertKelas(user, "ujian", kelasId);
    const d = z
      .object({
        siswaId: zId("siswa"),
        pelajaranId: zId("mata pelajaran"),
        guruId: zId("guru"),
        semester: zSemester,
        nilai: zNilai,
        deskPengetahuan: zDesk("Deskripsi pengetahuan"),
        deskKeterampilan: zDesk("Deskripsi keterampilan"),
      })
      .parse(formValues(formData));
    const boleh = await pelajaranUntuk(user, kelasId);
    if (boleh && !boleh.includes(d.pelajaranId)) {
      throw new AccessError("Anda hanya bisa mengisi nilai mata pelajaran yang Anda ajar di kelas ini.");
    }
    // Grading only their own subjects means grading as themself, whatever the form sent.
    if (boleh) d.guruId = user.guruId!;
    const siswa = await siswaDiKelas(d.siswaId, kelasId);
    const data = { ...d, kelasId, predikat: predikatNilai(d.nilai) };
    const key = { siswaId: d.siswaId, pelajaranId: d.pelajaranId, semester: d.semester };
    const existing = await prisma.nilai.findUnique({ where: { siswaId_pelajaranId_semester: key } });
    await prisma.nilai.upsert({
      where: { siswaId_pelajaranId_semester: key },
      update: data,
      create: data,
    });
    revalidate("ujian", kelasId);
    return `${existing ? "Nilai diperbarui" : "Nilai disimpan"}: ${siswa.nama}, ${d.nilai} (${data.predikat}).`;
  });
}

export async function simpanNilaiSikap(kelasId: number, formData: FormData) {
  return run(async () => {
    const user = await assertRole(WALI);
    await assertKelas(user, "wali", kelasId);
    const d = z
      .object({
        siswaId: zId("siswa"),
        jenis: z.enum(["SPIRITUAL", "SOSIAL"], { message: "Pilih jenis sikap." }),
        semester: zSemester,
        predikat: z.enum(PREDIKAT_SIKAP, { message: "Pilih predikat." }),
        deskripsi: zDesk("Deskripsi"),
      })
      .parse(formValues(formData));
    const siswa = await siswaDiKelas(d.siswaId, kelasId);
    const key = { siswaId: d.siswaId, jenis: d.jenis, semester: d.semester };
    await prisma.nilaiSikap.upsert({
      where: { siswaId_jenis_semester: key },
      update: d,
      create: d,
    });
    revalidate("sikap", kelasId);
    return `Nilai sikap ${siswa.nama} disimpan.`;
  });
}

export async function simpanEkstrakurikuler(kelasId: number, formData: FormData) {
  return run(async () => {
    const user = await assertRole(WALI);
    await assertKelas(user, "wali", kelasId);
    const d = z
      .object({
        siswaId: zId("siswa"),
        semester: zSemester,
        kegiatan: zWajib("Nama kegiatan", 2),
        nilai: zNilai,
        deskripsi: zDesk("Deskripsi"),
      })
      .parse(formValues(formData));
    const siswa = await siswaDiKelas(d.siswaId, kelasId);
    await prisma.nilaiEkstrakurikuler.create({ data: d });
    revalidate("ekstrakurikuler", kelasId);
    return `${d.kegiatan} dicatat untuk ${siswa.nama}.`;
  });
}

export async function simpanPrestasi(kelasId: number, formData: FormData) {
  return run(async () => {
    const user = await assertRole(WALI);
    await assertKelas(user, "wali", kelasId);
    const d = z
      .object({
        siswaId: zId("siswa"),
        semester: zSemester,
        jenisKegiatan: zWajib("Jenis kegiatan", 2),
        keterangan: zDesk("Keterangan"),
      })
      .parse(formValues(formData));
    const siswa = await siswaDiKelas(d.siswaId, kelasId);
    await prisma.nilaiPrestasi.create({ data: d });
    revalidate("prestasi", kelasId);
    return `Prestasi ${siswa.nama} dicatat.`;
  });
}

const pilihSiswa = { siswaId: true, siswa: { select: { kelasId: true } } } as const;
const tabel = {
  ujian: {
    cari: (id: number) =>
      prisma.nilai.findUniqueOrThrow({ where: { id }, select: { ...pilihSiswa, pelajaranId: true } }),
    hapus: (id: number) => prisma.nilai.delete({ where: { id } }),
  },
  sikap: {
    cari: (id: number) => prisma.nilaiSikap.findUniqueOrThrow({ where: { id }, select: pilihSiswa }),
    hapus: (id: number) => prisma.nilaiSikap.delete({ where: { id } }),
  },
  ekstrakurikuler: {
    cari: (id: number) => prisma.nilaiEkstrakurikuler.findUniqueOrThrow({ where: { id }, select: pilihSiswa }),
    hapus: (id: number) => prisma.nilaiEkstrakurikuler.delete({ where: { id } }),
  },
  prestasi: {
    cari: (id: number) => prisma.nilaiPrestasi.findUniqueOrThrow({ where: { id }, select: pilihSiswa }),
    hapus: (id: number) => prisma.nilaiPrestasi.delete({ where: { id } }),
  },
};

export async function hapusNilai(jenis: keyof typeof tabel, id: number, kelasId: number) {
  return run(async () => {
    const user = await assertRole(jenis === "ujian" ? PENILAI : WALI);
    // Check the class the student actually sits in, not the one the caller claims.
    const row = await tabel[jenis].cari(id);
    await assertKelas(user, jenis === "ujian" ? "ujian" : "wali", row.siswa.kelasId);
    const { pelajaranId } = row as { pelajaranId?: number };
    if (pelajaranId !== undefined) {
      const boleh = row.siswa.kelasId ? await pelajaranUntuk(user, row.siswa.kelasId) : null;
      if (boleh && !boleh.includes(pelajaranId)) {
        throw new AccessError("Anda hanya bisa menghapus nilai mata pelajaran yang Anda ajar.");
      }
    }
    await tabel[jenis].hapus(id);
    revalidate(jenis, kelasId);
    return "Catatan nilai dihapus.";
  });
}
