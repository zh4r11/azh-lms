/**
 * Dummy data for trying the LMS locally: subjects, teachers, classes, students, timetables,
 * exams, attendance, grades, and linked accounts. All names are invented.
 *
 * Run with `npm run db:dummy`. It WIPES every table except admin accounts first, so never point
 * DATABASE_URL at a real school database when running it.
 */
import "dotenv/config";
import bcrypt from "bcryptjs";
import { buatAdapter } from "../src/lib/adapter";
import { PrismaClient, type Guru, type Kelas, type Prisma } from "../src/generated/prisma/client";
import { buatAsesmen, buatBahanAjar, buatBankSoal, buatPertemuan, kosongkanPenyimpanan } from "./dummy-belajar";
import type {
  Hari,
  JenisKelamin,
  Role,
  StatusKehadiran,
} from "../src/generated/prisma/enums";

const prisma = new PrismaClient({
  adapter: buatAdapter(1),
});

// Passwords for every dummy account. Admin keeps the password from prisma/seed.ts.
const PASSWORD_GURU = "guru12345";
const PASSWORD_SISWA = "siswa12345";
const DOMAIN = "sman12.test";

// Fixed seed so every run produces the same school.
let state = 20261029;
function rand() {
  state = (state + 0x6d2b79f5) | 0;
  let t = Math.imul(state ^ (state >>> 15), 1 | state);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
const pick = <T>(xs: readonly T[]) => xs[Math.floor(rand() * xs.length)];
const between = (min: number, max: number) => min + Math.floor(rand() * (max - min + 1));
function weighted<T>(items: readonly (readonly [T, number])[]): T {
  const total = items.reduce((s, [, w]) => s + w, 0);
  let r = rand() * total;
  for (const [v, w] of items) if ((r -= w) < 0) return v;
  return items[items.length - 1][0];
}
const tanggal = (iso: string) => new Date(`${iso}T00:00:00.000Z`);
const slug = (s: string) => s.toLowerCase().replace(/[^a-z]+/g, ".").replace(/^\.|\.$/g, "");

const NAMA_PRIA = [
  "Andi", "Muhammad", "Ahmad", "Rizky", "Fajar", "Ilham", "Arif", "Reza", "Dimas", "Bayu",
  "Akbar", "Syahrul", "Irfan", "Hendra", "Agus", "Nur", "Fadli", "Rahmat", "Wahyu", "Yusuf",
];
const NAMA_WANITA = [
  "Nurul", "Siti", "Putri", "Aulia", "Dewi", "Rahma", "Indah", "Nabila", "Fitri", "Ayu",
  "Annisa", "Wulan", "Sri", "Nadia", "Rina", "Zahra", "Kartini", "Mutiara", "Salsabila", "Dian",
];
const NAMA_BELAKANG = [
  "Syamsuddin", "Hasanuddin", "Rahman", "Pratama", "Saputra", "Hidayat", "Basri", "Amir",
  "Tahir", "Latif", "Nasir", "Kadir", "Daeng", "Mappasessu", "Paturusi", "Wahid", "Sudirman",
  "Ramadhan", "Hamzah", "Arsyad", "Mahmud", "Anwar", "Salim", "Usman",
];
const KOTA = ["Makassar", "Makassar", "Makassar", "Gowa", "Maros", "Takalar", "Bone", "Pangkep"];
const JALAN = [
  "Jl. Perintis Kemerdekaan", "Jl. Urip Sumoharjo", "Jl. AP Pettarani", "Jl. Sultan Alauddin",
  "Jl. Veteran Selatan", "Jl. Hertasning", "Jl. Racing Centre", "Jl. Antang Raya",
  "Jl. Tamalanrea Raya", "Jl. Sunu", "Jl. Abdullah Daeng Sirua", "Jl. Toddopuli Raya",
];

function orang(jk: JenisKelamin) {
  return `${pick(jk === "PRIA" ? NAMA_PRIA : NAMA_WANITA)} ${pick(NAMA_BELAKANG)}`;
}
const telp = () => `08${pick(["11", "12", "13", "52", "53", "21", "22"])}${String(between(10000000, 99999999))}`;
const alamat = () => `${pick(JALAN)} No. ${between(1, 180)}, ${pick(KOTA)}`;

const PELAJARAN = [
  ["Pendidikan Agama", 3],
  ["Pendidikan Pancasila", 2],
  ["Bahasa Indonesia", 4],
  ["Matematika", 4],
  ["Bahasa Inggris", 3],
  ["Fisika", 3],
  ["Kimia", 3],
  ["Biologi", 3],
  ["Sejarah", 2],
  ["Ekonomi", 3],
  ["Geografi", 2],
  ["Pendidikan Jasmani", 2],
] as const;

// Teachers per subject; heavy subjects get two so parallel classes can be covered.
const GURU_PER_PELAJARAN: Record<string, number> = {
  "Bahasa Indonesia": 2,
  Matematika: 2,
  "Bahasa Inggris": 2,
  "Pendidikan Agama": 2,
};

const KELAS = ["X-1", "X-2", "XI IPA 1", "XI IPS 1", "XII IPA 1", "XII IPS 1"] as const;
const SISWA_PER_KELAS = 20;

const HARI: Hari[] = ["SENIN", "SELASA", "RABU", "KAMIS", "JUMAT"];
const SLOT = [
  ["07:30", "09:00"],
  ["09:15", "10:45"],
  ["11:00", "12:30"],
  ["13:15", "14:45"],
] as const;

const EKSKUL = [
  "Pramuka", "Paskibra", "PMR", "Basket", "Futsal", "Sepak Takraw", "Paduan Suara",
  "Tari Pakarena", "Karya Ilmiah Remaja", "English Club", "Rohis", "Jurnalistik",
];
const PRESTASI = [
  ["Olimpiade Sains", "Juara 2 OSN Matematika tingkat Kota Makassar"],
  ["Olimpiade Sains", "Juara 3 OSN Biologi tingkat Provinsi Sulawesi Selatan"],
  ["Lomba Debat", "Finalis Lomba Debat Bahasa Inggris tingkat Kota"],
  ["Olahraga", "Juara 1 Turnamen Futsal antar SMA se-Makassar"],
  ["Olahraga", "Juara 2 Sepak Takraw Porprov cabang ganda"],
  ["Seni", "Penampil terbaik Festival Tari Tradisional Sulsel"],
  ["Karya Tulis", "Juara 3 Lomba Karya Tulis Ilmiah Remaja tingkat Provinsi"],
  ["Kepramukaan", "Peserta terbaik Jambore Daerah Sulawesi Selatan"],
] as const;

function deskripsiNilai(nama: string, nilai: number, aspek: "pengetahuan" | "keterampilan") {
  const kata =
    nilai >= 92 ? "sangat baik" : nilai >= 83 ? "baik" : nilai >= 75 ? "cukup" : "perlu bimbingan";
  return aspek === "pengetahuan"
    ? `Pemahaman materi ${nama} ${kata}.`
    : `Keterampilan menerapkan materi ${nama} ${kata}.`;
}

function predikat(nilai: number) {
  if (nilai >= 92) return "A";
  if (nilai >= 83) return "B";
  if (nilai >= 75) return "C";
  return "D";
}

async function kosongkan() {
  // Children before parents. Admin accounts stay so the seeded login keeps working.
  await prisma.jawaban.deleteMany();
  await prisma.pengerjaan.deleteMany();
  await prisma.asesmenSoal.deleteMany();
  await prisma.asesmen.deleteMany();
  await prisma.soal.deleteMany();
  await prisma.materi.deleteMany();
  await prisma.bahanAjar.deleteMany();
  await prisma.bobotNilai.deleteMany();
  await prisma.berkas.deleteMany();
  await kosongkanPenyimpanan();
  await prisma.absensi.deleteMany();
  await prisma.pertemuan.deleteMany();
  await prisma.nilai.deleteMany();
  await prisma.nilaiSikap.deleteMany();
  await prisma.nilaiEkstrakurikuler.deleteMany();
  await prisma.nilaiPrestasi.deleteMany();
  await prisma.jadwal.deleteMany();
  await prisma.jadwalUjian.deleteMany();
  await prisma.user.deleteMany({ where: { role: { not: "ADMIN" } } });
  await prisma.siswa.deleteMany();
  await prisma.kelas.deleteMany();
  await prisma.guru.deleteMany();
  await prisma.pelajaran.deleteMany();
}

async function main() {
  await kosongkan();

  const pelajaran = [];
  for (const [nama, jumlahJam] of PELAJARAN) {
    pelajaran.push(await prisma.pelajaran.create({ data: { nama, jumlahJam } }));
  }

  const guru: Guru[] = [];
  let nipUrut = 1;
  for (const p of pelajaran) {
    for (let i = 0; i < (GURU_PER_PELAJARAN[p.nama] ?? 1); i++) {
      const jk: JenisKelamin = rand() < 0.55 ? "WANITA" : "PRIA";
      guru.push(
        await prisma.guru.create({
          data: {
            noInduk: `19${between(70, 92)}${String(between(1, 12)).padStart(2, "0")}${String(nipUrut++).padStart(4, "0")}`,
            nama: orang(jk),
            jk,
            telp: telp(),
            alamat: alamat(),
            pelajaranId: p.id,
          },
        }),
      );
    }
  }

  // Wali kelas: the first six teachers of different subjects.
  const kelas: Kelas[] = [];
  for (const [i, nama] of KELAS.entries()) {
    const tingkat = nama.startsWith("XII") ? "XII" : nama.startsWith("XI") ? "XI" : "X";
    kelas.push(await prisma.kelas.create({ data: { nama, tingkat, waliKelasId: guru[i * 2].id } }));
  }

  const siswa: { id: number; nama: string; kelasId: number }[] = [];
  let urut = 1;
  for (const k of kelas) {
    const angkatan = k.nama.startsWith("XII") ? 2024 : k.nama.startsWith("XI") ? 2025 : 2026;
    const tahunLahir = angkatan - 16;
    const data = Array.from({ length: SISWA_PER_KELAS }, () => {
      const jk: JenisKelamin = rand() < 0.5 ? "PRIA" : "WANITA";
      const bulan = String(between(1, 12)).padStart(2, "0");
      const hari = String(between(1, 28)).padStart(2, "0");
      return {
        noInduk: `${angkatan}${String(urut++).padStart(4, "0")}`,
        nama: orang(jk),
        jk,
        telp: telp(),
        alamat: alamat(),
        tempatLahir: pick(KOTA),
        tanggalLahir: tanggal(`${tahunLahir}-${bulan}-${hari}`),
        kelasId: k.id,
      };
    });
    siswa.push(
      ...(await prisma.siswa.createManyAndReturn({
        data,
        select: { id: true, nama: true, kelasId: true },
      })).map((s) => ({ ...s, kelasId: s.kelasId! })),
    );
  }

  // Timetable: four slots a day; a teacher never teaches two classes in the same slot.
  const sibuk = new Set<string>();
  const pengajar = new Map<string, number>(); // `${kelasId}:${pelajaranId}` -> guruId
  const jadwal = [];
  for (const [ki, k] of kelas.entries()) {
    let putar = ki * 3;
    for (const hari of HARI) {
      for (const [jamMulai, jamSelesai] of SLOT) {
        for (let coba = 0; coba < pelajaran.length; coba++) {
          const p = pelajaran[(putar + coba) % pelajaran.length];
          const kunci = `${k.id}:${p.id}`;
          const calon = pengajar.has(kunci)
            ? guru.filter((g) => g.id === pengajar.get(kunci))
            : guru.filter((g) => g.pelajaranId === p.id);
          const g = calon.find((c) => !sibuk.has(`${c.id}:${hari}:${jamMulai}`));
          if (!g) continue;
          sibuk.add(`${g.id}:${hari}:${jamMulai}`);
          pengajar.set(kunci, g.id);
          jadwal.push({ hari, jamMulai, jamSelesai, pelajaranId: p.id, guruId: g.id, kelasId: k.id });
          putar += coba + 1;
          break;
        }
      }
    }
  }
  await prisma.jadwal.createMany({ data: jadwal });

  // Exams: a finished UTS week and the upcoming UAS week. Every class sits each subject at the
  // same time in its own room ("Ruang 1" to "Ruang 6"), with a different invigilator per room.
  const ujian: Prisma.JadwalUjianCreateManyInput[] = [];
  const pekanUjian = [
    { jenis: "UTS" as const, hari: ["2026-09-21", "2026-09-22", "2026-09-23", "2026-09-24"] },
    { jenis: "UAS" as const, hari: ["2026-11-30", "2026-12-01", "2026-12-02", "2026-12-03"] },
  ];
  const SESI = [
    ["07:30", "09:30"],
    ["10:00", "12:00"],
    ["13:00", "14:30"],
  ] as const;
  let giliran = 0;
  for (const { jenis, hari } of pekanUjian) {
    pelajaran.forEach((p, i) => {
      const [jamMulai, jamSelesai] = SESI[i % SESI.length];
      const tgl = tanggal(hari[Math.floor(i / SESI.length)]);
      kelas.forEach((k, ki) => {
        // Rotate through the staff so nobody guards two rooms in one session.
        const pengawas = guru[(giliran + ki) % guru.length];
        // The last UAS subject is left without invigilators to show the reminder on /ujian.
        const belum = jenis === "UAS" && i === pelajaran.length - 1;
        ujian.push({
          jenis,
          semester: "GANJIL",
          tanggal: tgl,
          jamMulai,
          jamSelesai,
          pelajaranId: p.id,
          kelasId: k.id,
          ruang: `Ruang ${ki + 1}`,
          pengawasId: belum ? null : pengawas.id,
        });
      });
      giliran += kelas.length;
    });
  }
  await prisma.jadwalUjian.createMany({ data: ujian });

  // Bahan ajar first, so each meeting takes its topic as title.
  const admin = await prisma.user.findFirst({ where: { role: "ADMIN" }, select: { id: true } });
  const topik = await buatBahanAjar(prisma, pelajaran, admin?.id ?? null);

  // Meetings: eight per subject per class, with a roll call each.
  const STATUS: (readonly [StatusKehadiran, number])[] = [
    ["HADIR", 88],
    ["SAKIT", 4],
    ["IZIN", 3],
    ["TERLAMBAT", 3],
    ["BERTUGAS_KELUAR", 1],
    ["TANPA_KETERANGAN", 1],
  ];
  const { absensi } = await buatPertemuan(prisma, {
    kelas,
    jadwal: jadwal.map((j) => ({ kelasId: j.kelasId, pelajaranId: j.pelajaranId, guruId: j.guruId, hari: j.hari })),
    siswa,
    judul: topik,
    status: () => weighted(STATUS),
    hariIni: new Date(),
  });

  // Grades for semester ganjil: every student, every subject taught in their class.
  const nilai = [];
  const sikap = [];
  const ekskul = [];
  for (const s of siswa) {
    const kemampuan = between(-6, 8);
    for (const p of pelajaran) {
      const guruId = pengajar.get(`${s.kelasId}:${p.id}`);
      if (!guruId) continue;
      const n = Math.max(60, Math.min(100, 80 + kemampuan + between(-8, 10)));
      nilai.push({
        siswaId: s.id,
        kelasId: s.kelasId,
        guruId,
        pelajaranId: p.id,
        semester: "GANJIL" as const,
        nilai: n,
        predikat: predikat(n),
        deskPengetahuan: deskripsiNilai(p.nama, n, "pengetahuan"),
        deskKeterampilan: deskripsiNilai(p.nama, n, "keterampilan"),
      });
    }
    const pred = kemampuan >= 5 ? "Sangat Baik" : kemampuan >= -2 ? "Baik" : "Cukup";
    sikap.push(
      {
        siswaId: s.id,
        jenis: "SPIRITUAL" as const,
        semester: "GANJIL" as const,
        predikat: pred,
        deskripsi: "Rajin beribadah dan menghormati teman yang berbeda keyakinan.",
      },
      {
        siswaId: s.id,
        jenis: "SOSIAL" as const,
        semester: "GANJIL" as const,
        predikat: weighted([["Sangat Baik", 3], ["Baik", 6], ["Cukup", 1]] as const),
        deskripsi: pick([
          "Santun, jujur, dan bertanggung jawab dalam tugas kelompok.",
          "Disiplin dan aktif membantu teman di kelas.",
          "Peduli lingkungan sekolah, perlu meningkatkan kedisiplinan waktu.",
        ]),
      },
    );
    const jumlahEkskul = weighted([[0, 2], [1, 6], [2, 2]] as const);
    const dipilih = new Set<string>();
    while (dipilih.size < jumlahEkskul) dipilih.add(pick(EKSKUL));
    for (const kegiatan of dipilih) {
      const n = between(75, 96);
      ekskul.push({
        siswaId: s.id,
        kegiatan,
        nilai: n,
        semester: "GANJIL" as const,
        deskripsi: n >= 88 ? `Sangat aktif mengikuti ${kegiatan}.` : `Aktif mengikuti ${kegiatan}.`,
      });
    }
  }
  await prisma.nilai.createMany({ data: nilai });
  await prisma.nilaiSikap.createMany({ data: sikap });
  await prisma.nilaiEkstrakurikuler.createMany({ data: ekskul });

  const berprestasi = [...siswa].sort(() => rand() - 0.5).slice(0, PRESTASI.length);
  await prisma.nilaiPrestasi.createMany({
    data: berprestasi.map((s, i) => ({
      siswaId: s.id,
      jenisKegiatan: PRESTASI[i][0],
      keterangan: PRESTASI[i][1],
      semester: "GANJIL" as const,
    })),
  });

  // Accounts linked to their records. One hash per role keeps the script fast.
  const [hashGuru, hashSiswa] = await Promise.all([
    bcrypt.hash(PASSWORD_GURU, 10),
    bcrypt.hash(PASSWORD_SISWA, 10),
  ]);
  const wali = new Set(kelas.map((k) => k.waliKelasId));
  const dipakai = new Set<string>();
  const email = (nama: string) => {
    const base = slug(nama);
    let e = `${base}@${DOMAIN}`;
    for (let n = 2; dipakai.has(e); n++) e = `${base}${n}@${DOMAIN}`;
    dipakai.add(e);
    return e;
  };
  await prisma.user.createMany({
    data: [
      ...guru.map((g) => ({
        name: g.nama,
        email: email(g.nama),
        role: (wali.has(g.id) ? "WALI_KELAS" : "GURU") as Role,
        passwordHash: hashGuru,
        guruId: g.id,
      })),
      ...siswa.map((s) => ({
        name: s.nama,
        email: email(s.nama),
        role: "SISWA" as Role,
        passwordHash: hashSiswa,
        siswaId: s.id,
      })),
    ],
  });

  // Question bank and Matematika work in the first class.
  const pembuat = new Map<number, number>();
  for (const g of guru) if (g.pelajaranId && !pembuat.has(g.pelajaranId)) pembuat.set(g.pelajaranId, g.id);
  const bank = await buatBankSoal(prisma, { pelajaran, pembuat, acak: rand });
  const mtk = pelajaran.find((p) => p.nama === "Matematika")!;
  const guruMtk = pengajar.get(`${kelas[0].id}:${mtk.id}`)!;
  const akunGuruMtk = await prisma.user.findUnique({ where: { guruId: guruMtk }, select: { id: true } });
  const asesmen = await buatAsesmen(prisma, {
    kelasId: kelas[0].id,
    pelajaranId: mtk.id,
    guruId: guruMtk,
    guruUserId: akunGuruMtk?.id ?? null,
    soal: bank.get("Matematika") ?? [],
    siswa: siswa.filter((x) => x.kelasId === kelas[0].id),
    acak: rand,
    sekarang: new Date(),
  });
  console.log(
    `Belajar: ${topik.size} bahan ajar, ${[...bank.values()].flat().length} soal di bank, ${asesmen} tugas/kuis/ujian online di Matematika ${kelas[0].nama}.`,
  );

  const contoh = await prisma.user.findMany({
    where: { role: { in: ["GURU", "WALI_KELAS", "SISWA"] } },
    distinct: ["role"],
    orderBy: { id: "asc" },
    select: { email: true, role: true },
  });
  console.log(
    `Dummy data: ${pelajaran.length} mata pelajaran, ${guru.length} guru, ${kelas.length} kelas, ` +
      `${siswa.length} siswa, ${jadwal.length} jadwal, ${ujian.length} ujian, ${absensi} absensi, ` +
      `${nilai.length} nilai, ${ekskul.length} ekstrakurikuler, ${berprestasi.length} prestasi.`,
  );
  console.log("Contoh akun (password di prisma/dummy.ts):");
  for (const c of contoh) console.log(`  ${c.role.padEnd(10)} ${c.email}`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
