"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { assertRole } from "@/lib/auth";
import { PENILAI } from "@/lib/access";
import { assertKelola } from "@/lib/lingkup";
import { STATUS_URUT } from "@/lib/labels";
import { formValues, run } from "@/lib/action";
import type { StatusKehadiran } from "@/generated/prisma/enums";

/** Saves the whole roll call in one go; each student is one `status-<siswaId>` radio group. */
export async function simpanAbsensi(pertemuanId: number, formData: FormData) {
  return run(async () => {
    const user = await assertRole(PENILAI);
    const pertemuan = await prisma.pertemuan.findUniqueOrThrow({
      where: { id: pertemuanId },
      include: { kelas: { include: { siswa: { select: { id: true } } } } },
    });
    await assertKelola(user, pertemuan.kelasId, pertemuan.pelajaranId);
    const siswaIds = new Set(pertemuan.kelas.siswa.map((s) => s.id));

    const entries: { siswaId: number; status: StatusKehadiran }[] = [];
    for (const [key, value] of Object.entries(formValues(formData))) {
      const m = /^status-(\d+)$/.exec(key);
      if (!m) continue;
      const siswaId = Number(m[1]);
      if (!siswaIds.has(siswaId) || !STATUS_URUT.includes(value as StatusKehadiran)) continue;
      entries.push({ siswaId, status: value as StatusKehadiran });
    }

    await prisma.$transaction(
      entries.map((e) =>
        prisma.absensi.upsert({
          where: { pertemuanId_siswaId: { pertemuanId, siswaId: e.siswaId } },
          // A teacher changing an online check-in to another status makes it their record.
          update: { status: e.status, ...(e.status === "HADIR" ? {} : { online: false }) },
          create: { pertemuanId, siswaId: e.siswaId, status: e.status },
        }),
      ),
    );
    revalidatePath(`/belajar/${pertemuan.kelasId}/${pertemuan.pelajaranId}`, "layout");
    return `Absensi ${entries.length} siswa disimpan.`;
  });
}
