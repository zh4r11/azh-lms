import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { PENILAI } from "@/lib/access";
import { pelajaranGuru } from "@/lib/lingkup";
import { TINGKAT_URUT } from "@/lib/labels";
import { EmptyState, PageHeader } from "@/components/page";
import { ConfirmDelete } from "@/components/forms";
import { NativeSelect } from "@/components/native-select";
import { SoalDialog } from "@/components/soal-form";
import { SoalIsi } from "@/components/soal-view";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Prisma } from "@/generated/prisma/client";
import type { Tingkat, TipeSoal } from "@/generated/prisma/enums";
import { createSoal, deleteSoal, updateSoal } from "./actions";

export const metadata: Metadata = { title: "Bank soal" };

const PER_HALAMAN = 30;

export default async function BankSoal({ searchParams }: PageProps<"/bank-soal">) {
  const user = await requireRole(PENILAI);
  const sp = await searchParams;
  const boleh = await pelajaranGuru(user);
  const pelajaran = await prisma.pelajaran.findMany({
    where: boleh ? { id: { in: boleh } } : undefined,
    orderBy: { nama: "asc" },
  });
  const opsiPelajaran = pelajaran.map((p) => ({ value: String(p.id), label: p.nama }));

  const mapel = pelajaran.find((p) => String(p.id) === sp.mapel)?.id;
  const tingkat = TINGKAT_URUT.find((t) => t === sp.tingkat) as Tingkat | undefined;
  const tipe = (["PG", "ESSAY"] as const).find((t) => t === sp.tipe) as TipeSoal | undefined;
  const q = String(sp.q ?? "").trim();
  const halaman = Math.max(1, Number(sp.hal) || 1);

  const where: Prisma.SoalWhereInput = {
    diBank: true,
    pelajaranId: mapel ?? { in: pelajaran.map((p) => p.id) },
    ...(tingkat ? { tingkat } : {}),
    ...(tipe ? { tipe } : {}),
    ...(q ? { pertanyaan: { contains: q, mode: "insensitive" } } : {}),
    ...(sp.saya === "1" && user.guruId ? { pembuatId: user.guruId } : {}),
  };
  const [jumlah, soal] = await Promise.all([
    prisma.soal.count({ where }),
    prisma.soal.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      skip: (halaman - 1) * PER_HALAMAN,
      take: PER_HALAMAN,
      include: { pelajaran: true, pembuat: true, _count: { select: { asesmen: true } } },
    }),
  ]);
  const halamanTerakhir = Math.max(1, Math.ceil(jumlah / PER_HALAMAN));
  const params = (n: number) => {
    const u = new URLSearchParams(Object.entries(sp).filter(([k, v]) => k !== "hal" && typeof v === "string") as [string, string][]);
    u.set("hal", String(n));
    return `/bank-soal?${u}`;
  };

  return (
    <>
      <PageHeader
        title="Bank soal"
        mark="Bank soal"
        description="Soal yang bisa dipakai ulang di tugas, kuis, dan ujian online. Soal di sini dibagikan ke semua guru mata pelajaran yang sama."
        actions={pelajaran.length ? <SoalDialog action={createSoal} pelajaran={opsiPelajaran} /> : null}
      />

      <form action="/bank-soal" className="mb-8 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_8rem_10rem_auto] lg:items-end">
        <div className="grid gap-1.5">
          <Label htmlFor="q">Cari pertanyaan</Label>
          <Input id="q" name="q" defaultValue={q} />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="mapel">Mata pelajaran</Label>
          <NativeSelect id="mapel" name="mapel" defaultValue={mapel ?? ""}>
            <option value="">Semua</option>
            {pelajaran.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nama}
              </option>
            ))}
          </NativeSelect>
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="tingkat">Tingkat</Label>
          <NativeSelect id="tingkat" name="tingkat" defaultValue={tingkat ?? ""}>
            <option value="">Semua</option>
            {TINGKAT_URUT.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </NativeSelect>
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="tipe">Jenis</Label>
          <NativeSelect id="tipe" name="tipe" defaultValue={tipe ?? ""}>
            <option value="">Semua</option>
            <option value="PG">Pilihan ganda</option>
            <option value="ESSAY">Essay</option>
          </NativeSelect>
        </div>
        <Button type="submit" variant="secondary">
          Saring
        </Button>
        {user.guruId ? (
          <label className="flex min-h-11 items-center gap-2 sm:col-span-2 lg:col-span-5 md:min-h-9">
            <input type="checkbox" name="saya" value="1" defaultChecked={sp.saya === "1"} className="size-4 accent-primary" />
            Hanya soal buatan saya
          </label>
        ) : null}
      </form>

      {pelajaran.length === 0 ? (
        <EmptyState title="Belum ada mata pelajaran yang Anda ajar">
          Bank soal mengikuti mata pelajaran di jadwal mengajar Anda. Minta admin menghubungkan akun ke data guru dan menyusun jadwal.
        </EmptyState>
      ) : soal.length === 0 ? (
        <EmptyState title={q || mapel || tingkat || tipe ? "Tidak ada soal yang cocok" : "Bank soal masih kosong"}>
          {q || mapel || tingkat || tipe
            ? "Coba kata kunci lain atau longgarkan saringan."
            : "Tulis soal dengan tombol Tulis soal, atau centang Simpan ke bank soal saat membuat soal di tugas."}
        </EmptyState>
      ) : (
        <>
          <p className="mb-4 text-sm text-muted-foreground">
            {jumlah} soal{halamanTerakhir > 1 ? `, halaman ${halaman} dari ${halamanTerakhir}` : ""}
          </p>
          <ul className="flex flex-col gap-4">
            {soal.map((s) => {
              const milik = user.role === "ADMIN" || s.pembuatId === user.guruId;
              return (
                <li key={s.id} className="rounded-lg border bg-card p-5">
                  <p className="mb-3 text-sm text-muted-foreground">
                    {s.pelajaran.nama} · kelas {s.tingkat} · {s.tipe === "PG" ? "Pilihan ganda" : "Essay"} ·{" "}
                    {s.pembuat?.nama ?? "Pembuat tidak tercatat"}
                    {s._count.asesmen ? ` · dipakai di ${s._count.asesmen} tugas` : ""}
                  </p>
                  <SoalIsi s={s} />
                  {milik ? (
                    <div className="mt-4 flex justify-end gap-2">
                      <SoalDialog
                        action={updateSoal.bind(null, s.id)}
                        pelajaran={opsiPelajaran}
                        initial={{
                          pelajaranId: s.pelajaranId,
                          tingkat: s.tingkat,
                          tipe: s.tipe,
                          pertanyaan: s.pertanyaan,
                          opsi: s.opsi,
                          kunci: s.kunci,
                          pembahasan: s.pembahasan,
                        }}
                      />
                      <ConfirmDelete
                        action={deleteSoal.bind(null, s.id)}
                        title="Hapus soal ini dari bank?"
                        description={
                          s._count.asesmen
                            ? "Soal sudah dipakai, jadi hanya dikeluarkan dari bank. Tugas yang memakainya tidak berubah."
                            : "Soal dihapus permanen."
                        }
                      />
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
          {halamanTerakhir > 1 ? (
            <nav aria-label="Halaman soal" className="mt-6 flex justify-between gap-4">
              {halaman > 1 ? (
                <Button asChild variant="outline">
                  <Link href={params(halaman - 1)}>Sebelumnya</Link>
                </Button>
              ) : (
                <span />
              )}
              {halaman < halamanTerakhir ? (
                <Button asChild variant="outline">
                  <Link href={params(halaman + 1)}>Berikutnya</Link>
                </Button>
              ) : null}
            </nav>
          ) : null}
        </>
      )}
    </>
  );
}
