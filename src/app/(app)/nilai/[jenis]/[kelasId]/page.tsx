import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { PENILAI } from "@/lib/access";
import { kelasUntuk, pelajaranUntuk } from "@/lib/lingkup";
import { PREDIKAT_SIKAP, SEMESTER_LABEL, SIKAP_LABEL, parseSemester } from "@/lib/labels";
import { EmptyState, PageHeader, SectionTitle, TableBox } from "@/components/page";
import { SemesterSwitch } from "@/components/semester-switch";
import { ConfirmDelete } from "@/components/forms";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  hapusNilai,
  simpanEkstrakurikuler,
  simpanNilaiSikap,
  simpanNilaiUjian,
  simpanPrestasi,
} from "../../actions";
import {
  EkstrakurikulerForm,
  NilaiSikapForm,
  NilaiUjianForm,
  PrestasiForm,
} from "../../nilai-forms";
import { JENIS_NILAI, isJenis, type JenisNilai } from "../../jenis";
import type { Semester } from "@/generated/prisma/enums";

export const metadata: Metadata = { title: "Input nilai" };

type Ctx = { kelasId: number; semester: Semester; siswaIds: number[]; pelajaranIds: number[] | null };

function Hapus({ jenis, id, kelasId, label }: { jenis: JenisNilai; id: number; kelasId: number; label: string }) {
  return (
    <ConfirmDelete
      action={hapusNilai.bind(null, jenis, id, kelasId)}
      title="Hapus catatan ini?"
      description={`${label}. Catatan ini tidak lagi muncul di rapor.`}
    />
  );
}

async function UjianSection({ kelasId, semester, siswaIds, pelajaranIds }: Ctx) {
  const rows = await prisma.nilai.findMany({
    where: {
      siswaId: { in: siswaIds },
      semester,
      ...(pelajaranIds ? { pelajaranId: { in: pelajaranIds } } : {}),
    },
    include: { siswa: true, pelajaran: true, guru: true },
    orderBy: [{ siswa: { nama: "asc" } }, { pelajaran: { nama: "asc" } }],
  });
  if (!rows.length) return <Kosong />;
  return (
    <TableBox>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Siswa</TableHead>
            <TableHead>Mata pelajaran</TableHead>
            <TableHead className="text-right">Nilai</TableHead>
            <TableHead>Predikat</TableHead>
            <TableHead className="w-0" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r) => (
            <TableRow key={r.id}>
              <TableCell className="font-semibold">{r.siswa.nama}</TableCell>
              <TableCell>
                {r.pelajaran.nama}
                <span className="block text-sm text-muted-foreground">{r.guru?.nama ?? "Guru dihapus"}</span>
              </TableCell>
              <TableCell className="tabular text-right">{r.nilai}</TableCell>
              <TableCell>{r.predikat}</TableCell>
              <TableCell>
                <Hapus jenis="ujian" id={r.id} kelasId={kelasId} label={`${r.siswa.nama}, ${r.pelajaran.nama}`} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableBox>
  );
}

async function SikapSection({ kelasId, semester, siswaIds }: Ctx) {
  const rows = await prisma.nilaiSikap.findMany({
    where: { siswaId: { in: siswaIds }, semester },
    include: { siswa: true },
    orderBy: [{ siswa: { nama: "asc" } }, { jenis: "asc" }],
  });
  if (!rows.length) return <Kosong />;
  return (
    <TableBox>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Siswa</TableHead>
            <TableHead>Jenis</TableHead>
            <TableHead>Predikat</TableHead>
            <TableHead>Deskripsi</TableHead>
            <TableHead className="w-0" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r) => (
            <TableRow key={r.id}>
              <TableCell className="font-semibold">{r.siswa.nama}</TableCell>
              <TableCell>{SIKAP_LABEL[r.jenis]}</TableCell>
              <TableCell>{r.predikat}</TableCell>
              <TableCell className="max-w-72 whitespace-normal">{r.deskripsi}</TableCell>
              <TableCell>
                <Hapus jenis="sikap" id={r.id} kelasId={kelasId} label={`${r.siswa.nama}, ${SIKAP_LABEL[r.jenis]}`} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableBox>
  );
}

async function EkskulSection({ kelasId, semester, siswaIds }: Ctx) {
  const rows = await prisma.nilaiEkstrakurikuler.findMany({
    where: { siswaId: { in: siswaIds }, semester },
    include: { siswa: true },
    orderBy: [{ siswa: { nama: "asc" } }, { kegiatan: "asc" }],
  });
  if (!rows.length) return <Kosong />;
  return (
    <TableBox>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Siswa</TableHead>
            <TableHead>Kegiatan</TableHead>
            <TableHead className="text-right">Nilai</TableHead>
            <TableHead className="w-0" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r) => (
            <TableRow key={r.id}>
              <TableCell className="font-semibold">{r.siswa.nama}</TableCell>
              <TableCell>
                {r.kegiatan}
                <span className="block max-w-72 text-sm whitespace-normal text-muted-foreground">{r.deskripsi}</span>
              </TableCell>
              <TableCell className="tabular text-right">{r.nilai}</TableCell>
              <TableCell>
                <Hapus jenis="ekstrakurikuler" id={r.id} kelasId={kelasId} label={`${r.siswa.nama}, ${r.kegiatan}`} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableBox>
  );
}

async function PrestasiSection({ kelasId, semester, siswaIds }: Ctx) {
  const rows = await prisma.nilaiPrestasi.findMany({
    where: { siswaId: { in: siswaIds }, semester },
    include: { siswa: true },
    orderBy: [{ siswa: { nama: "asc" } }, { createdAt: "asc" }],
  });
  if (!rows.length) return <Kosong />;
  return (
    <TableBox>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Siswa</TableHead>
            <TableHead>Jenis kegiatan</TableHead>
            <TableHead>Keterangan</TableHead>
            <TableHead className="w-0" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r) => (
            <TableRow key={r.id}>
              <TableCell className="font-semibold">{r.siswa.nama}</TableCell>
              <TableCell>{r.jenisKegiatan}</TableCell>
              <TableCell className="max-w-72 whitespace-normal">{r.keterangan}</TableCell>
              <TableCell>
                <Hapus jenis="prestasi" id={r.id} kelasId={kelasId} label={`${r.siswa.nama}, ${r.jenisKegiatan}`} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableBox>
  );
}

function Kosong() {
  return (
    <p className="rounded-lg border border-dashed bg-card p-6 text-muted-foreground">
      Belum ada catatan untuk semester ini. Isi formulir di samping; hasilnya langsung muncul di sini.
    </p>
  );
}

export default async function InputNilai({
  params,
  searchParams,
}: PageProps<"/nilai/[jenis]/[kelasId]">) {
  const user = await requireRole(PENILAI);
  const { jenis, kelasId: rawId } = await params;
  if (!isJenis(jenis)) notFound();
  const kelasId = Number(rawId);
  if (!Number.isInteger(kelasId)) notFound();
  const semester = parseSemester((await searchParams).semester);
  const cfg = JENIS_NILAI[jenis];
  if (!cfg.roles.includes(user.role)) redirect("/");
  const ids = await kelasUntuk(user, cfg.fitur);
  if (ids && !ids.includes(kelasId)) notFound();
  // A guru grades only the subjects they teach in this class.
  const pelajaranIds = jenis === "ujian" ? await pelajaranUntuk(user, kelasId) : null;

  const kelas = await prisma.kelas.findUnique({
    where: { id: kelasId },
    include: { siswa: { orderBy: { nama: "asc" }, select: { id: true, nama: true, noInduk: true } } },
  });
  if (!kelas) notFound();

  const opsiSiswa = kelas.siswa.map((s) => ({ value: String(s.id), label: `${s.nama} (${s.noInduk})` }));
  const ctx: Ctx = { kelasId, semester, siswaIds: kelas.siswa.map((s) => s.id), pelajaranIds };

  let form: React.ReactNode;
  let section: React.ReactNode;
  if (jenis === "ujian") {
    const [pelajaran, guru] = await Promise.all([
      prisma.pelajaran.findMany({
        where: pelajaranIds ? { id: { in: pelajaranIds } } : undefined,
        orderBy: { nama: "asc" },
      }),
      // Outside their own class a teacher grades as themself; admin and the wali kelas of this
      // class may pick the subject teacher.
      prisma.guru.findMany({
        where: pelajaranIds ? { id: user.guruId ?? -1 } : undefined,
        orderBy: { nama: "asc" },
      }),
    ]);
    form =
      pelajaran.length && guru.length ? (
        <NilaiUjianForm
          action={simpanNilaiUjian.bind(null, kelasId)}
          semester={semester}
          siswa={opsiSiswa}
          pelajaran={pelajaran.map((p) => ({ value: String(p.id), label: p.nama }))}
          guru={guru.map((g) => ({ value: String(g.id), label: g.nama }))}
          guruSaya={user.guruId ? String(user.guruId) : undefined}
        />
      ) : (
        <p className="rounded-md border bg-card p-4">
          Nilai ujian membutuhkan data mata pelajaran dan guru. Minta admin melengkapinya dulu.
        </p>
      );
    section = <UjianSection {...ctx} />;
  } else if (jenis === "sikap") {
    form = (
      <NilaiSikapForm
        action={simpanNilaiSikap.bind(null, kelasId)}
        semester={semester}
        siswa={opsiSiswa}
        predikat={PREDIKAT_SIKAP.map((p) => ({ value: p, label: p }))}
      />
    );
    section = <SikapSection {...ctx} />;
  } else if (jenis === "ekstrakurikuler") {
    form = (
      <EkstrakurikulerForm action={simpanEkstrakurikuler.bind(null, kelasId)} semester={semester} siswa={opsiSiswa} />
    );
    section = <EkskulSection {...ctx} />;
  } else {
    form = <PrestasiForm action={simpanPrestasi.bind(null, kelasId)} semester={semester} siswa={opsiSiswa} />;
    section = <PrestasiSection {...ctx} />;
  }

  return (
    <>
      <PageHeader
        title={`${cfg.judul}, kelas ${kelas.nama}`}
        mark={kelas.nama}
        back={ids?.length === 1 ? undefined : { href: `/nilai/${jenis}`, label: "Pilih kelas lain" }}
        description={cfg.deskripsi}
        actions={<SemesterSwitch basePath={`/nilai/${jenis}/${kelasId}`} current={semester} />}
      />
      {kelas.siswa.length === 0 ? (
        <EmptyState title="Kelas ini belum punya siswa">
          Nilai bisa diisi setelah admin memasukkan siswa ke kelas {kelas.nama}.
        </EmptyState>
      ) : (
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,24rem)_minmax(0,1fr)]">
          <section aria-labelledby="h-isi">
            <SectionTitle>
              <span id="h-isi">Isi untuk {SEMESTER_LABEL[semester].toLowerCase()}</span>
            </SectionTitle>
            {form}
          </section>
          <section aria-labelledby="h-tercatat" className="min-w-0">
            <SectionTitle>
              <span id="h-tercatat">Sudah tercatat</span>
            </SectionTitle>
            {section}
          </section>
        </div>
      )}
    </>
  );
}
