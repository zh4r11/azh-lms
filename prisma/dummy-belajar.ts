/**
 * The learning part of the dummy school: default bahan ajar, meetings with attendance, a
 * question bank, and tugas / kuis / online ujian with student work. Imported by dummy.ts.
 */
import { randomUUID } from "node:crypto";
import type { PrismaClient } from "../src/generated/prisma/client";
import type { Hari, StatusKehadiran, Tingkat } from "../src/generated/prisma/enums";
import { tulisBerkas } from "../src/lib/penyimpanan";

/** A one-page PDF with plain lines of text (ASCII only), enough to open in any viewer. */
function pdf(baris: string[]) {
  const esc = (t: string) => t.replace(/[\\()]/g, (c) => `\\${c}`).replace(/[^\x20-\x7e]/g, "-");
  const isi = `BT /F1 13 Tf 56 780 Td 20 TL ${baris.map((b, i) => `${i ? "T* " : ""}(${esc(b)}) Tj`).join(" ")} ET`;
  const obj = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    `<< /Length ${isi.length} >>\nstream\n${isi}\nendstream`,
  ];
  let out = "%PDF-1.4\n";
  const posisi: number[] = [];
  obj.forEach((o, i) => {
    posisi.push(out.length);
    out += `${i + 1} 0 obj\n${o}\nendobj\n`;
  });
  const xref = out.length;
  out += `xref\n0 ${obj.length + 1}\n0000000000 65535 f \n${posisi.map((p) => `${String(p).padStart(10, "0")} 00000 n \n`).join("")}`;
  out += `trailer\n<< /Size ${obj.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(out, "latin1");
}

async function simpanPdf(prisma: PrismaClient, nama: string, baris: string[], pengunggahId: number | null) {
  const data = pdf(baris);
  const kunci = `${randomUUID()}.pdf`;
  await tulisBerkas(kunci, data, "application/pdf");
  return prisma.berkas.create({ data: { nama, mime: "application/pdf", ukuran: data.length, kunci, pengunggahId } });
}

/** Removes files that belonged to the previous dummy run, on disk or in Supabase Storage. */
export { kosongkanPenyimpanan } from "../src/lib/penyimpanan";

// Real topics for a few subjects; the rest are left empty to show the "belum ada" state.
const TOPIK: Partial<Record<string, Partial<Record<Tingkat, string[]>>>> = {
  Matematika: {
    X: [
      "Eksponen dan bentuk akar",
      "Logaritma",
      "Persamaan dan pertidaksamaan nilai mutlak",
      "Sistem persamaan linear dua variabel",
      "Sistem persamaan linear tiga variabel",
      "Fungsi dan grafiknya",
      "Barisan dan deret aritmetika",
      "Barisan dan deret geometri",
    ],
  },
  "Bahasa Indonesia": {
    X: [
      "Teks laporan hasil observasi",
      "Struktur teks laporan hasil observasi",
      "Teks eksposisi",
      "Menulis teks eksposisi",
      "Teks anekdot",
      "Hikayat",
      "Teks negosiasi",
      "Teks debat",
    ],
  },
  Fisika: {
    X: [
      "Besaran dan satuan",
      "Pengukuran dan angka penting",
      "Vektor",
      "Gerak lurus beraturan",
      "Gerak lurus berubah beraturan",
      "Gerak parabola",
      "Hukum Newton",
      "Usaha dan energi",
    ],
  },
  Biologi: {
    X: [
      "Ruang lingkup biologi",
      "Keanekaragaman hayati",
      "Virus",
      "Bakteri dan archaebacteria",
      "Protista",
      "Jamur",
      "Ekosistem",
      "Perubahan lingkungan",
    ],
  },
};

export async function buatBahanAjar(prisma: PrismaClient, pelajaran: { id: number; nama: string }[], adminId: number | null) {
  const judul = new Map<string, string>(); // `${pelajaranId}:${tingkat}:${urutan}` -> topic
  for (const p of pelajaran) {
    for (const [tingkat, topik] of Object.entries(TOPIK[p.nama] ?? {}) as [Tingkat, string[]][]) {
      for (const [i, t] of topik.entries()) {
        const b = await prisma.bahanAjar.create({
          data: {
            pelajaranId: p.id,
            tingkat,
            urutan: i + 1,
            judul: t,
            deskripsi: `Setelah pertemuan ini siswa mampu menjelaskan dan menggunakan konsep ${t.toLowerCase()}.`,
          },
        });
        const berkas = await simpanPdf(
          prisma,
          `Ringkasan ${p.nama} ${tingkat} - ${i + 1}.pdf`,
          [`${p.nama} kelas ${tingkat}`, `Pertemuan ke-${i + 1}: ${t}`, "", "Ringkasan materi dari sekolah.", "Baca sebelum kelas dimulai."],
          adminId,
        );
        await prisma.materi.create({
          data: { judul: `Ringkasan: ${t}`, tipe: "DOKUMEN", berkasId: berkas.id, bahanAjarId: b.id },
        });
        judul.set(`${p.id}:${tingkat}:${i + 1}`, t);
      }
    }
  }
  return judul;
}

/**
 * Eight weekly meetings per subject per class, on the subject's first timetable day, each with
 * a full roll call. A ninth meeting today keeps online check-in open for the first kursus.
 */
export async function buatPertemuan(
  prisma: PrismaClient,
  opt: {
    kelas: { id: number; tingkat: Tingkat }[];
    jadwal: { kelasId: number; pelajaranId: number; guruId: number; hari: Hari }[];
    siswa: { id: number; kelasId: number }[];
    judul: Map<string, string>;
    status: () => StatusKehadiran;
    hariIni: Date;
  },
) {
  const HARI: Hari[] = ["SENIN", "SELASA", "RABU", "KAMIS", "JUMAT"];
  const absensi: { pertemuanId: number; siswaId: number; status: StatusKehadiran }[] = [];
  const kursus = new Map<string, (typeof opt.jadwal)[number]>();
  for (const j of opt.jadwal) if (!kursus.has(`${j.kelasId}:${j.pelajaranId}`)) kursus.set(`${j.kelasId}:${j.pelajaranId}`, j);
  for (const j of kursus.values()) {
    const tingkat = opt.kelas.find((k) => k.id === j.kelasId)!.tingkat;
    const anggota = opt.siswa.filter((s) => s.kelasId === j.kelasId);
    for (let n = 1; n <= 8; n++) {
      const tanggal = new Date(Date.UTC(2026, 7, 31 + (n - 1) * 7 + HARI.indexOf(j.hari)));
      const p = await prisma.pertemuan.create({
        data: {
          judul: opt.judul.get(`${j.pelajaranId}:${tingkat}:${n}`) ?? `Pertemuan ${n}`,
          tanggal,
          urutan: n,
          kelasId: j.kelasId,
          pelajaranId: j.pelajaranId,
          guruId: j.guruId,
        },
      });
      for (const s of anggota) absensi.push({ pertemuanId: p.id, siswaId: s.id, status: opt.status() });
    }
  }
  await prisma.absensi.createMany({ data: absensi });
  return { kursus: [...kursus.values()], absensi: absensi.length };
}

// ---------------------------------------------------------------------------------------------
// Question bank. Options are written with the right answer first, then shuffled.

const SOAL_PG: Record<string, [string, string[]][]> = {
  Matematika: [
    ["Nilai $x$ yang memenuhi $2x + 5 = 17$ adalah ...", ["$6$", "$5$", "$7$", "$4$"]],
    ["Hasil dari $3^4$ adalah ...", ["$81$", "$12$", "$27$", "$64$"]],
    ["Bentuk sederhana dari $\\sqrt{50}$ adalah ...", ["$5\\sqrt{2}$", "$2\\sqrt{5}$", "$10\\sqrt{5}$", "$25\\sqrt{2}$"]],
    ["Jika $f(x) = 3x - 2$, maka $f(4)$ adalah ...", ["$10$", "$12$", "$14$", "$8$"]],
    ["Gradien garis $y = -2x + 7$ adalah ...", ["$-2$", "$2$", "$7$", "$-7$"]],
    ["Himpunan penyelesaian $x^2 - 9 = 0$ adalah ...", ["$\\{-3, 3\\}$", "$\\{3\\}$", "$\\{9\\}$", "$\\{-9, 9\\}$"]],
    ["Nilai dari $^{2}\\log 32$ adalah ...", ["$5$", "$4$", "$6$", "$16$"]],
    ["Nilai $|-8| + |3|$ adalah ...", ["$11$", "$-5$", "$5$", "$-11$"]],
    ["Jika $3x - y = 7$ dan $x + y = 5$, nilai $x$ adalah ...", ["$3$", "$2$", "$4$", "$1$"]],
    ["Suku ke-10 barisan $2, 5, 8, 11, \\ldots$ adalah ...", ["$29$", "$30$", "$31$", "$32$"]],
  ],
  "Bahasa Indonesia": [
    [
      "Teks yang menyajikan hasil pengamatan suatu objek secara apa adanya disebut ...",
      ["teks laporan hasil observasi", "teks eksposisi", "teks negosiasi", "teks anekdot"],
    ],
    ["Paragraf yang kalimat utamanya terletak di awal disebut paragraf ...", ["deduktif", "induktif", "campuran", "naratif"]],
    ["Penulisan kata baku yang benar adalah ...", ["apotek", "apotik", "nasehat", "resiko"]],
    ["Teks anekdot bertujuan untuk ...", ["mengkritik dengan cara jenaka", "melaporkan kejadian", "membujuk pembeli", "menjelaskan proses"]],
    ["Bagian teks eksposisi yang berisi pendapat penulis disebut ...", ["tesis", "argumentasi", "penegasan ulang", "orientasi"]],
  ],
};
const SOAL_ESSAY: Record<string, [string, string][]> = {
  Matematika: [
    [
      "Selesaikan sistem persamaan $2x + y = 8$ dan $x - y = 1$ dengan metode eliminasi. Tuliskan langkahnya.",
      "$x = 3$, $y = 2$. Skor penuh jika langkah eliminasi dan substitusi lengkap.",
    ],
    [
      "Sebuah barisan aritmetika memiliki suku pertama $a = 4$ dan beda $b = 3$. Tentukan $S_{10}$ dan jelaskan caranya.",
      "$S_{10} = \\frac{10}{2}(2 \\cdot 4 + 9 \\cdot 3) = 175$.",
    ],
  ],
  "Bahasa Indonesia": [
    ["Tuliskan satu paragraf eksposisi tentang pentingnya membaca, lengkap dengan tesis dan argumen.", "Ada tesis, minimal dua argumen, dan penegasan ulang."],
  ],
};

export async function buatBankSoal(
  prisma: PrismaClient,
  opt: { pelajaran: { id: number; nama: string }[]; pembuat: Map<number, number>; acak: () => number },
) {
  const hasil = new Map<string, number[]>(); // mapel nama -> soal ids (PG first, then essay)
  for (const p of opt.pelajaran) {
    const ids: number[] = [];
    for (const [pertanyaan, [benar, ...salah]] of SOAL_PG[p.nama] ?? []) {
      const opsi = [benar, ...salah].map((o) => ({ o, r: opt.acak() })).sort((a, b) => a.r - b.r).map((x) => x.o);
      const s = await prisma.soal.create({
        data: {
          pelajaranId: p.id,
          tingkat: "X",
          tipe: "PG",
          pertanyaan,
          opsi,
          kunci: opsi.indexOf(benar),
          pembahasan: `Jawaban yang benar: ${benar}.`,
          pembuatId: opt.pembuat.get(p.id) ?? null,
        },
      });
      ids.push(s.id);
    }
    for (const [pertanyaan, pedoman] of SOAL_ESSAY[p.nama] ?? []) {
      const s = await prisma.soal.create({
        data: { pelajaranId: p.id, tingkat: "X", tipe: "ESSAY", pertanyaan, pembahasan: pedoman, pembuatId: opt.pembuat.get(p.id) ?? null },
      });
      ids.push(s.id);
    }
    if (ids.length) hasil.set(p.nama, ids);
  }
  return hasil;
}

const WITA = (iso: string) => new Date(`${iso}+08:00`);

/**
 * Work for Matematika in the first class: a closed upload tugas (partly graded), a closed kuis
 * with scores, a kuis open right now, and the UAS made into an online exam.
 */
export async function buatAsesmen(
  prisma: PrismaClient,
  opt: {
    kelasId: number;
    pelajaranId: number;
    guruId: number;
    guruUserId: number | null;
    soal: number[];
    siswa: { id: number; nama: string }[];
    acak: () => number;
    sekarang: Date;
  },
) {
  const pg = opt.soal.slice(0, 10);
  const essay = opt.soal.slice(10);
  const tutupKemarin = new Date(opt.sekarang.getTime() - 3 * 86_400_000);
  const base = { kelasId: opt.kelasId, pelajaranId: opt.pelajaranId, guruId: opt.guruId, semester: "GANJIL" as const, terbit: true };
  const pertemuan = await prisma.pertemuan.findMany({
    where: { kelasId: opt.kelasId, pelajaranId: opt.pelajaranId },
    orderBy: { urutan: "asc" },
  });

  // 1. Upload tugas, closed. 17 hand in, 12 already graded.
  const lembar = await simpanPdf(prisma, "Soal tugas eksponen.pdf", ["Tugas 1: Eksponen dan bentuk akar", "Kerjakan soal 1 sampai 5 di buku paket halaman 12."], opt.guruUserId);
  const tugas = await prisma.asesmen.create({
    data: {
      ...base,
      jenis: "TUGAS",
      mode: "UPLOAD",
      judul: "Tugas 1: Eksponen dan bentuk akar",
      instruksi: "Kerjakan di kertas, foto atau pindai, lalu unggah sebagai PDF.",
      dibuka: WITA("2026-09-01T07:00"),
      ditutup: WITA("2026-09-07T23:59"),
      lampiranId: lembar.id,
      pertemuanId: pertemuan[0]?.id,
    },
  });
  for (const [i, s] of opt.siswa.slice(0, 17).entries()) {
    const berkas = await simpanPdf(prisma, `Jawaban ${s.nama}.pdf`, [`Jawaban tugas 1`, s.nama], null);
    await prisma.pengerjaan.create({
      data: {
        asesmenId: tugas.id,
        siswaId: s.id,
        mulai: WITA("2026-09-05T19:00"),
        batas: tugas.ditutup,
        dikumpulkan: WITA("2026-09-05T19:30"),
        berkasId: berkas.id,
        nilai: i < 12 ? 70 + Math.floor(opt.acak() * 28) : null,
        catatan: i < 12 && i % 4 === 0 ? "Langkah sudah benar, perhatikan penulisan akar." : "",
      },
    });
  }

  // 2. Kuis with questions, closed, scored.
  const kuis = await prisma.asesmen.create({
    data: {
      ...base,
      jenis: "KUIS",
      mode: "SOAL",
      judul: "Kuis 1: Logaritma dan nilai mutlak",
      instruksi: "Kerjakan sendiri. Waktu 20 menit sejak menekan Mulai.",
      dibuka: WITA("2026-09-14T07:00"),
      ditutup: WITA("2026-09-16T23:59"),
      durasiMenit: 20,
      pertemuanId: pertemuan[1]?.id,
      soal: { create: pg.slice(0, 5).map((soalId, i) => ({ soalId, urutan: i + 1 })) },
    },
  });
  const soalKuis = await prisma.soal.findMany({ where: { id: { in: pg.slice(0, 5) } } });
  for (const s of opt.siswa.slice(0, 18)) {
    const pintar = 0.55 + opt.acak() * 0.4;
    const jawab = soalKuis.map((q) => {
      const pilihan = opt.acak() < pintar ? q.kunci! : Math.floor(opt.acak() * q.opsi.length);
      return { soalId: q.id, pilihan, skor: pilihan === q.kunci ? 1 : 0 };
    });
    const benar = jawab.reduce((n, j) => n + j.skor, 0);
    await prisma.pengerjaan.create({
      data: {
        asesmenId: kuis.id,
        siswaId: s.id,
        mulai: WITA("2026-09-15T19:00"),
        batas: WITA("2026-09-15T19:20"),
        dikumpulkan: WITA("2026-09-15T19:16"),
        nilai: Math.round((benar / jawab.length) * 1000) / 10,
        jawaban: { create: jawab },
      },
    });
  }

  // 3. Kuis open now: try it as a student.
  await prisma.asesmen.create({
    data: {
      ...base,
      jenis: "KUIS",
      mode: "SOAL",
      judul: "Kuis 2: Sistem persamaan dan barisan",
      instruksi: "Lima soal pilihan ganda dan satu essay. Jawaban tersimpan otomatis.",
      dibuka: tutupKemarin,
      ditutup: new Date(opt.sekarang.getTime() + 7 * 86_400_000),
      durasiMenit: 30,
      acakSoal: true,
      pertemuanId: pertemuan.at(-1)?.id,
      soal: { create: [...pg.slice(5, 10), ...essay.slice(0, 1)].map((soalId, i) => ({ soalId, urutan: i + 1, bobot: i === 5 ? 3 : 1 })) },
    },
  });

  // 4. The UAS Matematika slot of this class, as an online exam.
  const uas = await prisma.jadwalUjian.findFirst({
    where: { kelasId: opt.kelasId, pelajaranId: opt.pelajaranId, jenis: "UAS" },
  });
  if (uas) {
    const tgl = uas.tanggal.toISOString().slice(0, 10);
    const dibuka = WITA(`${tgl}T${uas.jamMulai}`);
    const ditutup = WITA(`${tgl}T${uas.jamSelesai}`);
    await prisma.asesmen.create({
      data: {
        ...base,
        jenis: "UJIAN",
        mode: "SOAL",
        judul: "UAS Matematika",
        instruksi: "Kerjakan di ruang ujian. Jangan menutup halaman sampai selesai.",
        jadwalUjianId: uas.id,
        dibuka,
        ditutup,
        durasiMenit: Math.round((ditutup.getTime() - dibuka.getTime()) / 60_000),
        tampilkanHasil: false,
        soal: { create: [...pg, ...essay].map((soalId, i) => ({ soalId, urutan: i + 1, bobot: i >= pg.length ? 5 : 1 })) },
      },
    });
  }

  // Teacher material on top of the school's for the first meetings.
  for (const p of pertemuan.slice(0, 3)) {
    const b = await simpanPdf(prisma, `Latihan pertemuan ${p.urutan}.pdf`, [`Latihan soal: ${p.judul}`, "Kerjakan nomor ganjil."], opt.guruUserId);
    await prisma.materi.create({
      data: { judul: `Latihan soal pertemuan ${p.urutan}`, deskripsi: "Dibahas di awal pertemuan berikutnya.", tipe: "DOKUMEN", berkasId: b.id, pertemuanId: p.id },
    });
  }

  // A meeting today with online check-in open for eight hours.
  const hariIni = new Date(`${new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Makassar" }).format(opt.sekarang)}T00:00:00.000Z`);
  await prisma.pertemuan.create({
    data: {
      judul: "Kelas daring: latihan soal SPLDV",
      tanggal: hariIni,
      urutan: (pertemuan.at(-1)?.urutan ?? 0) + 1,
      kelasId: opt.kelasId,
      pelajaranId: opt.pelajaranId,
      guruId: opt.guruId,
      absenOnlineBuka: opt.sekarang,
      absenOnlineTutup: new Date(opt.sekarang.getTime() + 8 * 3_600_000),
    },
  });
  return 4;
}
