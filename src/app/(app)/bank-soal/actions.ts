"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { AccessError, assertRole, type CurrentUser } from "@/lib/auth";
import { PENILAI } from "@/lib/access";
import { assertKelola, pelajaranGuru } from "@/lib/lingkup";
import { fieldError, formValues, run, zId, zWajib } from "@/lib/action";

const schema = z.object({
  pelajaranId: zId("mata pelajaran"),
  tingkat: z.enum(["X", "XI", "XII"], { message: "Pilih tingkat." }),
  tipe: z.enum(["PG", "ESSAY"], { message: "Pilih jenis soal." }),
  pertanyaan: zWajib("Pertanyaan", 5).max(4000, "Pertanyaan maksimal 4000 karakter."),
  pembahasan: z.string().max(4000, "Pembahasan maksimal 4000 karakter."),
  kunci: z.string().optional(),
  diBank: z.string().optional(),
});

/**
 * Reads a question from the form. PG options arrive as repeated "opsi" fields; empty ones are
 * dropped and the answer key ("kunci", the option's position in the form) is remapped.
 */
async function bacaSoal(user: CurrentUser, formData: FormData) {
  const d = schema.parse(formValues(formData));
  const boleh = await pelajaranGuru(user);
  if (boleh && !boleh.includes(d.pelajaranId)) {
    fieldError("pelajaranId", "Anda hanya bisa membuat soal untuk mata pelajaran yang Anda ajar.");
  }
  let opsi: string[] = [];
  let kunci: number | null = null;
  if (d.tipe === "PG") {
    const isi = formData.getAll("opsi").map((v) => String(v).trim());
    const terisi = isi.map((teks, i) => ({ teks, i })).filter((o) => o.teks);
    if (terisi.length < 2) fieldError("opsi", "Pilihan ganda butuh paling sedikit dua pilihan jawaban.");
    opsi = terisi.map((o) => o.teks);
    const pos = terisi.findIndex((o) => String(o.i) === d.kunci);
    // Shown under the options group, which is where the key is chosen.
    if (pos < 0) fieldError("opsi", "Tandai satu pilihan sebagai jawaban benar.");
    kunci = pos;
  }
  return {
    pelajaranId: d.pelajaranId,
    tingkat: d.tingkat,
    tipe: d.tipe,
    pertanyaan: d.pertanyaan,
    pembahasan: d.pembahasan,
    opsi,
    kunci,
    diBank: d.diBank !== "tidak",
  };
}

async function soalMilik(user: CurrentUser, id: number) {
  const s = await prisma.soal.findUniqueOrThrow({ where: { id } });
  if (user.role !== "ADMIN" && s.pembuatId !== user.guruId) {
    throw new AccessError("Hanya pembuat soal atau admin yang bisa mengubahnya.");
  }
  return s;
}

export async function createSoal(formData: FormData) {
  return run(async () => {
    const user = await assertRole(PENILAI);
    const data = await bacaSoal(user, formData);
    await prisma.soal.create({ data: { ...data, diBank: true, pembuatId: user.guruId } });
    revalidatePath("/bank-soal");
    return "Soal disimpan ke bank soal.";
  });
}

export async function updateSoal(id: number, formData: FormData) {
  return run(async () => {
    const user = await assertRole(PENILAI);
    const lama = await soalMilik(user, id);
    const data = await bacaSoal(user, formData);
    await prisma.soal.update({ where: { id }, data: { ...data, diBank: lama.diBank || data.diBank } });
    revalidatePath("/bank-soal");
    revalidatePath("/asesmen", "layout");
    return "Soal diperbarui.";
  });
}

/** A question already used in a tugas or ujian is only taken out of the bank, never erased. */
export async function deleteSoal(id: number) {
  return run(async () => {
    const user = await assertRole(PENILAI);
    await soalMilik(user, id);
    const dipakai = await prisma.asesmenSoal.count({ where: { soalId: id } });
    if (dipakai) {
      await prisma.soal.update({ where: { id }, data: { diBank: false } });
      revalidatePath("/bank-soal");
      return "Soal dikeluarkan dari bank. Soal tetap ada di tugas yang sudah memakainya.";
    }
    await prisma.soal.delete({ where: { id } });
    revalidatePath("/bank-soal");
    return "Soal dihapus.";
  });
}

// ---------------------------------------------------------------------------------------------
// Questions inside one tugas, kuis, or ujian

async function asesmenKelola(asesmenId: number) {
  const user = await assertRole(PENILAI);
  const a = await prisma.asesmen.findUniqueOrThrow({ where: { id: asesmenId }, include: { kelas: true } });
  await assertKelola(user, a.kelasId, a.pelajaranId);
  if (a.mode !== "SOAL") throw new AccessError("Tugas ini dikumpulkan sebagai berkas, bukan soal.");
  const dikerjakan = await prisma.pengerjaan.count({ where: { asesmenId } });
  if (dikerjakan) throw new AccessError("Soal tidak bisa diubah karena sudah ada siswa yang mengerjakan.");
  return { user, a };
}

/** Writes a new question straight into a tugas; "diBank" decides whether it is reusable. */
export async function soalBaruUntukAsesmen(asesmenId: number, formData: FormData) {
  return run(async () => {
    const { user, a } = await asesmenKelola(asesmenId);
    formData.set("pelajaranId", String(a.pelajaranId));
    formData.set("tingkat", a.kelas.tingkat);
    const data = await bacaSoal(user, formData);
    const urutan = await prisma.asesmenSoal.count({ where: { asesmenId } });
    await prisma.soal.create({
      data: { ...data, pembuatId: user.guruId, asesmen: { create: { asesmenId, urutan: urutan + 1 } } },
    });
    revalidatePath(`/asesmen/${asesmenId}`);
    return data.diBank ? "Soal ditambahkan dan disimpan ke bank soal." : "Soal ditambahkan.";
  });
}

/** Adds the questions ticked in the bank picker. */
export async function ambilDariBank(asesmenId: number, formData: FormData) {
  return run(async () => {
    const { a } = await asesmenKelola(asesmenId);
    const ids = [...new Set(formData.getAll("soalId").map(Number).filter(Boolean))];
    if (!ids.length) fieldError("soalId", "Centang paling sedikit satu soal.");
    const soal = await prisma.soal.findMany({
      where: { id: { in: ids }, pelajaranId: a.pelajaranId, diBank: true, asesmen: { none: { asesmenId } } },
      select: { id: true },
    });
    const urutan = await prisma.asesmenSoal.count({ where: { asesmenId } });
    await prisma.asesmenSoal.createMany({
      data: soal.map((s, i) => ({ asesmenId, soalId: s.id, urutan: urutan + i + 1 })),
    });
    revalidatePath(`/asesmen/${asesmenId}`);
    return `${soal.length} soal diambil dari bank.`;
  });
}

export async function lepasSoal(asesmenId: number, soalId: number) {
  return run(async () => {
    await asesmenKelola(asesmenId);
    await prisma.asesmenSoal.delete({ where: { asesmenId_soalId: { asesmenId, soalId } } });
    // Renumber so the order stays 1..n.
    const sisa = await prisma.asesmenSoal.findMany({ where: { asesmenId }, orderBy: { urutan: "asc" } });
    await prisma.$transaction(
      sisa.map((s, i) => prisma.asesmenSoal.update({ where: { asesmenId_soalId: { asesmenId, soalId: s.soalId } }, data: { urutan: i + 1 } })),
    );
    revalidatePath(`/asesmen/${asesmenId}`);
    return "Soal dilepas dari tugas ini. Soal di bank tidak terhapus.";
  });
}

export async function ubahBobot(asesmenId: number, soalId: number, formData: FormData) {
  return run(async () => {
    await asesmenKelola(asesmenId);
    const { bobot } = z
      .object({ bobot: z.coerce.number({ message: "Isi bobot." }).int().min(1, "Bobot minimal 1.").max(100, "Bobot maksimal 100.") })
      .parse(formValues(formData));
    await prisma.asesmenSoal.update({ where: { asesmenId_soalId: { asesmenId, soalId } }, data: { bobot } });
    revalidatePath(`/asesmen/${asesmenId}`);
    return `Bobot soal menjadi ${bobot}.`;
  });
}
