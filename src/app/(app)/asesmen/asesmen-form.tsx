"use client";

import * as React from "react";
import { Field, FieldSet, FormDialog, FormSelect, type Option } from "@/components/forms";
import { Unggah } from "@/components/unggah";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { ActionResult } from "@/lib/action-result";

export type AsesmenInitial = {
  jenis: string;
  mode: "SOAL" | "UPLOAD";
  judul: string;
  instruksi: string;
  semester: string;
  dibuka: string;
  ditutup: string;
  durasiMenit: number | null;
  pertemuanId: number | null;
  lampiran: { id: number; nama: string } | null;
  acakSoal: boolean;
  tampilkanHasil: boolean;
  /** Online ujian: times follow the admin's exam schedule. */
  waktuTerkunci: boolean;
};

function Centang({ name, label, awal }: { name: string; label: string; awal: boolean }) {
  return (
    <label className="flex min-h-11 cursor-pointer items-center gap-2 md:min-h-9">
      <input type="checkbox" name={name} value="ya" defaultChecked={awal} className="size-4 accent-primary" />
      {label}
    </label>
  );
}

function Isian({ initial, pertemuan, baru }: { initial: AsesmenInitial; pertemuan: Option[]; baru: boolean }) {
  const [mode, setMode] = React.useState(initial.mode);
  return (
    <>
      {baru ? (
        <>
          <Field name="jenis" label="Jenis">
            <FormSelect
              name="jenis"
              defaultValue={initial.jenis}
              options={[
                { value: "TUGAS", label: "Tugas" },
                { value: "KUIS", label: "Kuis (untuk ambil nilai)" },
              ]}
            />
          </Field>
          <FieldSet name="mode" legend="Cara mengerjakan">
            {(
              [
                ["SOAL", "Jawab soal di LMS", "Pilihan ganda dinilai otomatis, essay dinilai guru. Bisa diberi batas waktu."],
                ["UPLOAD", "Unggah berkas jawaban", "Siswa mengunggah dokumen jawaban sebelum batas waktu."],
              ] as const
            ).map(([v, l, d]) => (
              <label key={v} className="flex cursor-pointer gap-3 rounded-md border p-3 has-checked:border-primary has-checked:bg-muted">
                <input
                  type="radio"
                  name="mode"
                  value={v}
                  checked={mode === v}
                  onChange={() => setMode(v)}
                  className="mt-1 size-4 shrink-0 accent-primary"
                />
                <span>
                  <span className="block font-semibold">{l}</span>
                  <span className="block text-sm text-muted-foreground">{d}</span>
                </span>
              </label>
            ))}
          </FieldSet>
        </>
      ) : null}
      <Field name="judul" label="Judul">
        <Input name="judul" defaultValue={initial.judul} />
      </Field>
      <Field name="instruksi" label="Instruksi untuk siswa">
        <Textarea name="instruksi" rows={4} defaultValue={initial.instruksi} />
      </Field>
      {mode === "UPLOAD" ? (
        <Field name="lampiranId" label="Lembar soal" hint="Opsional. Dokumen soal yang diunduh siswa.">
          <Unggah name="lampiranId" awal={initial.lampiran} />
        </Field>
      ) : null}
      {initial.waktuTerkunci ? (
        <>
          <input type="hidden" name="dibuka" value={initial.dibuka} />
          <input type="hidden" name="ditutup" value={initial.ditutup} />
          <input type="hidden" name="semester" value={initial.semester} />
          <p className="rounded-md border bg-muted p-3 text-sm">
            Waktu ujian mengikuti jadwal ujian dari admin. Perubahan jam dilakukan di menu Jadwal ujian.
          </p>
        </>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field name="dibuka" label="Dibuka">
              <Input name="dibuka" type="datetime-local" defaultValue={initial.dibuka} />
            </Field>
            <Field name="ditutup" label="Batas waktu (deadline)">
              <Input name="ditutup" type="datetime-local" defaultValue={initial.ditutup} />
            </Field>
          </div>
          <Field name="semester" label="Semester">
            <FormSelect
              name="semester"
              defaultValue={initial.semester}
              options={[
                { value: "GANJIL", label: "Semester 1 (Ganjil)" },
                { value: "GENAP", label: "Semester 2 (Genap)" },
              ]}
            />
          </Field>
          {pertemuan.length ? (
            <Field name="pertemuanId" label="Dari pertemuan" hint="Opsional. Tugas juga tampil di halaman pertemuan itu.">
              <FormSelect
                name="pertemuanId"
                defaultValue={initial.pertemuanId ? String(initial.pertemuanId) : "0"}
                options={[{ value: "0", label: "Tidak dikaitkan" }, ...pertemuan]}
              />
            </Field>
          ) : null}
        </>
      )}
      {mode === "SOAL" ? (
        <>
          <Field
            name="durasiMenit"
            label="Waktu mengerjakan (menit)"
            hint="Dihitung sejak siswa menekan Mulai, dan tidak melewati batas waktu. Kosongkan jika tanpa batas menit."
          >
            <Input name="durasiMenit" type="number" min={1} max={600} defaultValue={initial.durasiMenit ?? ""} />
          </Field>
          <div className="grid">
            <Centang name="acakSoal" label="Acak urutan soal untuk tiap siswa" awal={initial.acakSoal} />
            <Centang name="tampilkanHasil" label="Tampilkan nilai dan pembahasan setelah siswa selesai" awal={initial.tampilkanHasil} />
          </div>
        </>
      ) : (
        <input type="hidden" name="tampilkanHasil" value="ya" />
      )}
    </>
  );
}

export function AsesmenDialog({
  action,
  initial,
  pertemuan,
  baru = false,
}: {
  action: (formData: FormData) => Promise<ActionResult>;
  initial: AsesmenInitial;
  pertemuan: Option[];
  baru?: boolean;
}) {
  return (
    <FormDialog
      trigger={baru ? <Button>Buat tugas atau kuis</Button> : <Button variant="outline">Ubah pengaturan</Button>}
      title={baru ? "Tugas atau kuis baru" : "Pengaturan"}
      description={baru ? "Disimpan sebagai draf. Siswa melihatnya setelah Anda menekan Terbitkan." : undefined}
      action={action}
      submitLabel={baru ? "Buat draf" : "Simpan pengaturan"}
    >
      <Isian initial={initial} pertemuan={pertemuan} baru={baru} />
    </FormDialog>
  );
}
