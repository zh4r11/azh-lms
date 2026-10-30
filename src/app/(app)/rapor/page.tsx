import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { SEMUA } from "@/lib/access";
import { alasanKosong, kelasUntuk } from "@/lib/lingkup";
import {
  JK_LABEL,
  SEMESTER_LABEL,
  STATUS_LABEL,
  formatTanggal,
  parseSemester,
} from "@/lib/labels";
import { EmptyState, PageHeader } from "@/components/page";
import { NativeSelect } from "@/components/native-select";
import { PrintButton } from "@/components/print-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Semester } from "@/generated/prisma/enums";

export const metadata: Metadata = { title: "Rapor siswa" };

function RaporHeading({
  huruf,
  children,
}: {
  huruf: string;
  children: React.ReactNode;
}) {
  return (
    <h2 className="rule-double mt-10 mb-4 text-xl font-semibold">
      <span className="mr-2 text-muted-foreground">{huruf}.</span>
      {children}
    </h2>
  );
}

function Kosong({ children }: { children: React.ReactNode }) {
  return <p className="text-muted-foreground italic">{children}</p>;
}

/** Plain bordered table: this page is meant to look like, and print as, a paper report. */
function RaporTable({
  head,
  rows,
}: {
  head: string[];
  rows: React.ReactNode[][];
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-left text-[0.95rem]">
        <thead>
          <tr>
            {head.map((h) => (
              <th key={h} className="border bg-muted px-3 py-2 font-semibold">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>
              {r.map((c, j) => (
                <td key={j} className="border px-3 py-2 align-top">
                  {c}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

async function Rapor({
  where,
  kelasIds = null,
  semester,
}: {
  where: { noInduk: string } | { id: number };
  /** Limits the lookup to these classes (a wali kelas); null means any class. */
  kelasIds?: number[] | null;
  semester: Semester;
}) {
  const siswa = await prisma.siswa.findFirst({
    where: { ...where, ...(kelasIds ? { kelasId: { in: kelasIds } } : {}) },
    include: {
      kelas: { include: { waliKelas: true } },
      nilai: {
        where: { semester },
        include: { pelajaran: true },
        orderBy: { pelajaran: { nama: "asc" } },
      },
      nilaiSikap: { where: { semester } },
      nilaiEkstrakurikuler: {
        where: { semester },
        orderBy: { kegiatan: "asc" },
      },
      nilaiPrestasi: { where: { semester }, orderBy: { createdAt: "asc" } },
      absensi: { select: { status: true } },
    },
  });

  if (!siswa) {
    return (
      <EmptyState
        title={
          "noInduk" in where
            ? `Nomor induk ${where.noInduk} tidak ditemukan`
            : "Data siswa tidak ditemukan"
        }
      >
        {kelasIds
          ? "Wali kelas hanya bisa membuka rapor siswa di kelasnya. Pilih siswa dari daftar di atas."
          : "Periksa lagi nomor induk siswa. Nomor induk tercatat di Data siswa dan di kartu pelajar."}
      </EmptyState>
    );
  }

  const sikap = (jenis: "SPIRITUAL" | "SOSIAL") =>
    siswa.nilaiSikap.find((s) => s.jenis === jenis);
  const hitung = (status: keyof typeof STATUS_LABEL) =>
    siswa.absensi.filter((a) => a.status === status).length;
  const tidakHadir = [
    "SAKIT",
    "IZIN",
    "BERTUGAS_KELUAR",
    "TERLAMBAT",
    "TANPA_KETERANGAN",
  ] as const;

  return (
    <article className="rounded-lg border bg-card p-5 sm:p-8 print:border-0 print:p-0">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm text-muted-foreground">
            Capaian hasil belajar · SMA Negeri Prabsky 02 Konoha
          </p>
          <h2 className="mt-1 text-3xl font-semibold">{siswa.nama}</h2>
        </div>
        <PrintButton />
      </header>
      <dl className="mt-6 grid gap-x-8 gap-y-2 sm:grid-cols-2">
        {[
          ["Nomor induk", siswa.noInduk],
          ["Kelas", siswa.kelas?.nama ?? "Tanpa kelas"],
          ["Semester", SEMESTER_LABEL[semester]],
          ["Wali kelas", siswa.kelas?.waliKelas?.nama ?? "Belum ditentukan"],
          ["Jenis kelamin", JK_LABEL[siswa.jk]],
          [
            "Tempat, tanggal lahir",
            `${siswa.tempatLahir}, ${formatTanggal(siswa.tanggalLahir)}`,
          ],
        ].map(([k, v]) => (
          <div key={k} className="flex gap-2 border-b border-dotted py-1">
            <dt className="w-40 shrink-0 text-muted-foreground">{k}</dt>
            <dd className="font-semibold">{v}</dd>
          </div>
        ))}
      </dl>

      <RaporHeading huruf="A">Sikap</RaporHeading>
      <RaporTable
        head={["Aspek", "Predikat", "Deskripsi"]}
        rows={(["SPIRITUAL", "SOSIAL"] as const).map((j) => {
          const s = sikap(j);
          return [
            j === "SPIRITUAL" ? "Sikap spiritual" : "Sikap sosial",
            s?.predikat ?? "–",
            s?.deskripsi ?? <Kosong>Belum diisi wali kelas</Kosong>,
          ];
        })}
      />

      <RaporHeading huruf="B">Pengetahuan</RaporHeading>
      {siswa.nilai.length ? (
        <RaporTable
          head={["No", "Mata pelajaran", "Nilai", "Predikat", "Deskripsi"]}
          rows={siswa.nilai.map((n, i) => [
            i + 1,
            n.pelajaran.nama,
            <span key="n" className="tabular">
              {n.nilai}
            </span>,
            n.predikat,
            n.deskPengetahuan,
          ])}
        />
      ) : (
        <Kosong>Belum ada nilai mata pelajaran untuk semester ini.</Kosong>
      )}

      <RaporHeading huruf="C">Keterampilan</RaporHeading>
      {siswa.nilai.length ? (
        <RaporTable
          head={["No", "Mata pelajaran", "Nilai", "Predikat", "Deskripsi"]}
          rows={siswa.nilai.map((n, i) => [
            i + 1,
            n.pelajaran.nama,
            <span key="n" className="tabular">
              {n.nilai}
            </span>,
            n.predikat,
            n.deskKeterampilan,
          ])}
        />
      ) : (
        <Kosong>Belum ada nilai mata pelajaran untuk semester ini.</Kosong>
      )}

      <RaporHeading huruf="D">Ekstrakurikuler</RaporHeading>
      {siswa.nilaiEkstrakurikuler.length ? (
        <RaporTable
          head={["No", "Kegiatan", "Nilai", "Deskripsi"]}
          rows={siswa.nilaiEkstrakurikuler.map((e, i) => [
            i + 1,
            e.kegiatan,
            e.nilai,
            e.deskripsi,
          ])}
        />
      ) : (
        <Kosong>Tidak ada kegiatan ekstrakurikuler tercatat.</Kosong>
      )}

      <RaporHeading huruf="E">Prestasi</RaporHeading>
      {siswa.nilaiPrestasi.length ? (
        <RaporTable
          head={["No", "Jenis kegiatan", "Keterangan"]}
          rows={siswa.nilaiPrestasi.map((p, i) => [
            i + 1,
            p.jenisKegiatan,
            p.keterangan,
          ])}
        />
      ) : (
        <Kosong>Tidak ada prestasi tercatat.</Kosong>
      )}

      <RaporHeading huruf="F">Ketidakhadiran</RaporHeading>
      <RaporTable
        head={tidakHadir.map((s) => STATUS_LABEL[s])}
        rows={[
          tidakHadir.map((s) => (
            <span key={s} className="tabular">
              {hitung(s)} kali
            </span>
          )),
        ]}
      />
      <p className="mt-2 text-sm text-muted-foreground">
        Dihitung dari seluruh pertemuan yang tercatat di absensi (
        {siswa.absensi.length} pertemuan, {hitung("HADIR")} kali hadir).
      </p>
    </article>
  );
}

function SemesterField({ semester }: { semester: Semester }) {
  return (
    <div className="grid gap-1.5 sm:w-56">
      <Label htmlFor="semester">Semester</Label>
      <NativeSelect id="semester" name="semester" defaultValue={semester}>
        <option value="GANJIL">{SEMESTER_LABEL.GANJIL}</option>
        <option value="GENAP">{SEMESTER_LABEL.GENAP}</option>
      </NativeSelect>
    </div>
  );
}

/** A student account sees only the rapor of the siswa record linked to it. */
async function RaporSaya({
  siswaId,
  semester,
}: {
  siswaId: number | null;
  semester: Semester;
}) {
  return (
    <>
      <div className="print:hidden">
        <PageHeader
          title="Rapor saya"
          mark="Rapor"
          description="Nilai sikap, pengetahuan, keterampilan, ekstrakurikuler, prestasi, dan ketidakhadiran Anda."
        />
        {siswaId ? (
          <form
            action="/rapor"
            className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end"
          >
            <SemesterField semester={semester} />
            <Button type="submit">Tampilkan semester ini</Button>
          </form>
        ) : null}
      </div>
      {siswaId ? (
        <Rapor where={{ id: siswaId }} semester={semester} />
      ) : (
        <EmptyState title="Akun Anda belum terhubung ke data siswa">
          Minta admin menghubungkan akun ini ke nomor induk Anda di menu Akun
          pengguna. Setelah itu rapor tampil di halaman ini.
        </EmptyState>
      )}
    </>
  );
}

export default async function RaporPage({ searchParams }: PageProps<"/rapor">) {
  const user = await requireRole(SEMUA);
  const sp = await searchParams;
  const semester = parseSemester(sp.semester);
  if (user.role === "SISWA")
    return <RaporSaya siswaId={user.siswaId} semester={semester} />;
  const noInduk = String(sp.no ?? "").trim();
  const kelasIds =
    user.role === "WALI_KELAS" ? await kelasUntuk(user, "wali") : null;
  // A wali kelas picks from their own students instead of typing any number.
  const siswaKelas = kelasIds
    ? await prisma.siswa.findMany({
        where: { kelasId: { in: kelasIds } },
        orderBy: { nama: "asc" },
        select: { noInduk: true, nama: true },
      })
    : [];

  return (
    <>
      <div className="print:hidden">
        <PageHeader
          title="Rapor siswa"
          mark="Rapor"
          description={
            kelasIds
              ? "Rapor siswa di kelas perwalian Anda: sikap, pengetahuan, keterampilan, ekstrakurikuler, prestasi, dan ketidakhadiran."
              : "Masukkan nomor induk siswa untuk melihat nilai sikap, pengetahuan, keterampilan, ekstrakurikuler, prestasi, dan ketidakhadiran."
          }
        />
        {kelasIds && siswaKelas.length === 0 ? (
          <EmptyState title="Belum ada siswa untuk ditampilkan">
            {alasanKosong(user, "wali") ??
              "Kelas perwalian Anda belum punya siswa."}
          </EmptyState>
        ) : (
          <form
            action="/rapor"
            className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end"
          >
            {kelasIds ? (
              <div className="grid gap-1.5 sm:w-80">
                <Label htmlFor="no">Siswa</Label>
                <NativeSelect id="no" name="no" defaultValue={noInduk} required>
                  <option value="" disabled>
                    Pilih siswa
                  </option>
                  {siswaKelas.map((s) => (
                    <option key={s.noInduk} value={s.noInduk}>
                      {s.nama} ({s.noInduk})
                    </option>
                  ))}
                </NativeSelect>
              </div>
            ) : (
              <div className="grid gap-1.5 sm:w-64">
                <Label htmlFor="no">Nomor induk siswa</Label>
                <Input
                  id="no"
                  name="no"
                  defaultValue={noInduk}
                  inputMode="numeric"
                  required
                />
              </div>
            )}
            <SemesterField semester={semester} />
            <Button type="submit">Tampilkan rapor</Button>
          </form>
        )}
      </div>
      {noInduk ? (
        <Rapor where={{ noInduk }} kelasIds={kelasIds} semester={semester} />
      ) : kelasIds && siswaKelas.length === 0 ? null : (
        <p className="text-muted-foreground">
          {kelasIds
            ? "Rapor tampil di sini setelah siswa dipilih."
            : "Rapor tampil di sini setelah nomor induk dimasukkan."}
        </p>
      )}
    </>
  );
}
