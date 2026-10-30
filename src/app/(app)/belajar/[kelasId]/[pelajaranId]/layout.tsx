import { PageHeader } from "@/components/page";
import { TabNav } from "@/components/tab-nav";
import { muatKursus } from "../../kursus";

export default async function KursusLayout({ children, params }: LayoutProps<"/belajar/[kelasId]/[pelajaranId]">) {
  const { kelasId, pelajaranId } = await params;
  const k = await muatKursus(kelasId, pelajaranId);
  const siswa = k.user.role === "SISWA";
  return (
    <>
      <PageHeader
        title={`${k.pelajaran.nama} kelas ${k.kelas.nama}`}
        mark={k.pelajaran.nama}
        back={{ href: "/belajar", label: "Kelas belajar" }}
        description={
          k.pengajar.length
            ? `Diajar oleh ${k.pengajar.map((g) => g.nama).join(" dan ")}.`
            : "Guru pengampu belum ditentukan di jadwal."
        }
      />
      <TabNav
        label="Bagian kelas belajar"
        tabs={[
          { href: k.base, label: "Pertemuan dan materi", exact: true, juga: [`${k.base}/pertemuan`] },
          { href: `${k.base}/tugas`, label: "Tugas, kuis, ujian" },
          { href: `${k.base}/nilai`, label: siswa ? "Nilai saya" : "Rekap nilai" },
        ]}
      />
      {children}
    </>
  );
}
