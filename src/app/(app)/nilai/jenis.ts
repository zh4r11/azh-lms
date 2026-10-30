import { PENILAI, WALI } from "@/lib/access";

export const JENIS_NILAI = {
  ujian: {
    judul: "Nilai ujian",
    mark: "ujian",
    roles: PENILAI,
    fitur: "ujian",
    deskripsi: "Nilai pengetahuan dan keterampilan per mata pelajaran. Satu nilai per mata pelajaran per semester.",
  },
  sikap: {
    judul: "Nilai sikap",
    mark: "sikap",
    roles: WALI,
    fitur: "wali",
    deskripsi: "Predikat sikap spiritual dan sosial untuk rapor. Satu catatan per jenis sikap per semester.",
  },
  ekstrakurikuler: {
    judul: "Nilai ekstrakurikuler",
    mark: "ekstrakurikuler",
    roles: WALI,
    fitur: "wali",
    deskripsi: "Kegiatan ekstrakurikuler yang diikuti siswa beserta nilainya.",
  },
  prestasi: {
    judul: "Prestasi siswa",
    mark: "Prestasi",
    roles: WALI,
    fitur: "wali",
    deskripsi: "Lomba dan penghargaan yang diraih siswa, dicetak di rapor.",
  },
} as const;

export type JenisNilai = keyof typeof JENIS_NILAI;

export function isJenis(v: string): v is JenisNilai {
  return v in JENIS_NILAI;
}
