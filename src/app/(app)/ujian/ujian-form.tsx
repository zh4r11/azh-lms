"use client";

import { Field, FieldSet, FormDialog, FormSelect, type Option } from "@/components/forms";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { ActionResult } from "@/lib/action-result";

const JENIS: Option[] = [
  { value: "UTS", label: "UTS" },
  { value: "UAS", label: "UAS" },
  { value: "UJIAN_SEKOLAH", label: "Ujian Sekolah" },
];
const SEMESTER: Option[] = [
  { value: "GANJIL", label: "Semester 1 (Ganjil)" },
  { value: "GENAP", label: "Semester 2 (Genap)" },
];
// Radix select items cannot have an empty value, so "no invigilator yet" gets its own token.
const TANPA_PENGAWAS = "0";

export type UjianInitial = {
  jenis: string;
  semester: string;
  tanggal: string;
  jamMulai: string;
  jamSelesai: string;
  pelajaranId: number;
  kelasId: number;
  ruang: string;
  pengawasId: number | null;
};

export function UjianDialog({
  action,
  pelajaran,
  kelas,
  guru,
  initial,
  periode,
}: {
  action: (formData: FormData) => Promise<ActionResult>;
  pelajaran: Option[];
  kelas: Option[];
  guru: Option[];
  /** Present when editing one class's exam. */
  initial?: UjianInitial;
  /** The period being viewed, so a new exam lands in it by default. */
  periode?: { jenis: string; semester: string };
}) {
  const edit = Boolean(initial);
  return (
    <FormDialog
      trigger={
        edit ? (
          <Button variant="outline" size="sm">
            Ubah
          </Button>
        ) : (
          <Button>Jadwalkan ujian</Button>
        )
      }
      title={edit ? "Ubah jadwal ujian" : "Jadwal ujian baru"}
      description={
        edit
          ? "Hari dihitung otomatis dari tanggal."
          : "Satu mata pelajaran untuk beberapa kelas sekaligus. Ruang dan pengawas tiap kelas bisa diatur sesudahnya lewat Ubah."
      }
      action={action}
      submitLabel={edit ? "Simpan perubahan" : "Simpan jadwal ujian"}
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field name="jenis" label="Jenis ujian">
          <FormSelect
            name="jenis"
            options={JENIS}
            defaultValue={initial?.jenis ?? periode?.jenis}
            placeholder="Pilih jenis"
          />
        </Field>
        <Field name="semester" label="Semester">
          <FormSelect
            name="semester"
            options={SEMESTER}
            defaultValue={initial?.semester ?? periode?.semester}
            placeholder="Pilih semester"
          />
        </Field>
      </div>
      <Field name="pelajaranId" label="Mata pelajaran">
        <FormSelect
          name="pelajaranId"
          options={pelajaran}
          defaultValue={initial ? String(initial.pelajaranId) : undefined}
          placeholder={pelajaran.length ? "Pilih mata pelajaran" : "Belum ada mata pelajaran"}
        />
      </Field>
      {edit ? (
        <Field name="kelasId" label="Kelas">
          <FormSelect
            name="kelasId"
            options={kelas}
            defaultValue={String(initial!.kelasId)}
            placeholder="Pilih kelas"
          />
        </Field>
      ) : (
        <FieldSet name="kelasId" legend="Kelas" hint="Centang semua kelas yang ikut ujian ini.">
          <div className="grid grid-cols-2 gap-x-4 sm:grid-cols-3">
            {kelas.map((k) => (
              <label
                key={k.value}
                className="flex min-h-11 cursor-pointer items-center gap-2 rounded-md px-1 hover:bg-muted md:min-h-9"
              >
                <input
                  type="checkbox"
                  name="kelasId"
                  value={k.value}
                  className="size-4 accent-primary"
                />
                {k.label}
              </label>
            ))}
          </div>
        </FieldSet>
      )}
      <Field name="tanggal" label="Tanggal">
        <Input name="tanggal" type="date" defaultValue={initial?.tanggal} />
      </Field>
      <div className="grid grid-cols-2 gap-4">
        <Field name="jamMulai" label="Jam mulai">
          <Input name="jamMulai" type="time" defaultValue={initial?.jamMulai ?? "07:30"} />
        </Field>
        <Field name="jamSelesai" label="Jam selesai">
          <Input name="jamSelesai" type="time" defaultValue={initial?.jamSelesai ?? "09:30"} />
        </Field>
      </div>
      <Field
        name="ruang"
        label="Ruang"
        hint={edit ? "Kosongkan untuk memakai ruang kelasnya sendiri." : "Kosongkan agar tiap kelas ujian di ruang kelasnya sendiri."}
      >
        <Input name="ruang" defaultValue={initial?.ruang} autoComplete="off" />
      </Field>
      <Field name="pengawasId" label="Pengawas" hint={edit ? undefined : "Hanya bisa dipilih jika satu kelas."}>
        <FormSelect
          name="pengawasId"
          options={[{ value: TANPA_PENGAWAS, label: "Belum ditentukan" }, ...guru]}
          defaultValue={initial?.pengawasId ? String(initial.pengawasId) : TANPA_PENGAWAS}
          placeholder="Pilih pengawas"
        />
      </Field>
    </FormDialog>
  );
}

/** The subject teacher picks how an admin-scheduled exam runs online. */
export function SiapkanOnlineDialog({ action }: { action: (formData: FormData) => Promise<ActionResult> }) {
  return (
    <FormDialog
      trigger={
        <Button variant="outline" size="sm">
          Siapkan online
        </Button>
      }
      title="Jadikan ujian online"
      description="Waktu dibuka dan ditutup mengikuti jadwal ini. Siswa hanya bisa mengerjakan di jam ujian."
      action={action}
      submitLabel="Lanjut"
    >
      <FieldSet name="mode" legend="Bentuk ujian">
        {(
          [
            ["SOAL", "Soal di LMS", "Pilihan ganda dan essay dengan timer, seperti kuis."],
            ["UPLOAD", "Unggah hasil", "Siswa mengunggah lembar jawaban sebelum jam ujian selesai."],
          ] as const
        ).map(([v, l, d], i) => (
          <label key={v} className="flex cursor-pointer gap-3 rounded-md border p-3 has-checked:border-primary has-checked:bg-muted">
            <input type="radio" name="mode" value={v} defaultChecked={i === 0} className="mt-1 size-4 shrink-0 accent-primary" />
            <span>
              <span className="block font-semibold">{l}</span>
              <span className="block text-sm text-muted-foreground">{d}</span>
            </span>
          </label>
        ))}
      </FieldSet>
    </FormDialog>
  );
}
