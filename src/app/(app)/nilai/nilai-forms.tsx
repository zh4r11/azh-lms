"use client";

import { ActionForm, Field, FormSelect, SubmitButton, type Option } from "@/components/forms";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { ActionResult } from "@/lib/action-result";

type Action = (formData: FormData) => Promise<ActionResult>;

function Semester({ value }: { value: string }) {
  return <input type="hidden" name="semester" value={value} />;
}

export function NilaiUjianForm({
  action,
  semester,
  siswa,
  pelajaran,
  guru,
  guruSaya,
}: {
  action: Action;
  semester: string;
  siswa: Option[];
  pelajaran: Option[];
  guru: Option[];
  /** The signed-in teacher, preselected so they do not have to find their own name. */
  guruSaya?: string;
}) {
  return (
    <ActionForm action={action} resetOnSuccess>
      <Semester value={semester} />
      <Field name="siswaId" label="Siswa">
        <FormSelect name="siswaId" options={siswa} placeholder="Pilih siswa" />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field name="pelajaranId" label="Mata pelajaran">
          <FormSelect name="pelajaranId" options={pelajaran} placeholder="Pilih mata pelajaran" />
        </Field>
        <Field name="guruId" label="Guru penilai">
          <FormSelect name="guruId" options={guru} defaultValue={guruSaya} placeholder="Pilih guru" />
        </Field>
      </div>
      <Field
        name="nilai"
        label="Nilai (0 sampai 100)"
        hint="Predikat dihitung otomatis: A ≥ 92, B ≥ 83, C ≥ 75, di bawahnya D."
      >
        <Input name="nilai" type="number" inputMode="numeric" min={0} max={100} className="sm:w-32" />
      </Field>
      <Field name="deskPengetahuan" label="Deskripsi pengetahuan">
        <Textarea name="deskPengetahuan" rows={2} maxLength={255} />
      </Field>
      <Field name="deskKeterampilan" label="Deskripsi keterampilan">
        <Textarea name="deskKeterampilan" rows={2} maxLength={255} />
      </Field>
      <div>
        <SubmitButton>Simpan nilai</SubmitButton>
      </div>
    </ActionForm>
  );
}

const SIKAP: Option[] = [
  { value: "SPIRITUAL", label: "Sikap spiritual" },
  { value: "SOSIAL", label: "Sikap sosial" },
];

export function NilaiSikapForm({
  action,
  semester,
  siswa,
  predikat,
}: {
  action: Action;
  semester: string;
  siswa: Option[];
  predikat: Option[];
}) {
  return (
    <ActionForm action={action} resetOnSuccess>
      <Semester value={semester} />
      <Field name="siswaId" label="Siswa">
        <FormSelect name="siswaId" options={siswa} placeholder="Pilih siswa" />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field name="jenis" label="Jenis sikap">
          <FormSelect name="jenis" options={SIKAP} placeholder="Pilih jenis" />
        </Field>
        <Field name="predikat" label="Predikat">
          <FormSelect name="predikat" options={predikat} placeholder="Pilih predikat" />
        </Field>
      </div>
      <Field name="deskripsi" label="Deskripsi" hint="Ditulis apa adanya di rapor.">
        <Textarea name="deskripsi" rows={3} maxLength={255} />
      </Field>
      <div>
        <SubmitButton>Simpan nilai sikap</SubmitButton>
      </div>
    </ActionForm>
  );
}

export function EkstrakurikulerForm({
  action,
  semester,
  siswa,
}: {
  action: Action;
  semester: string;
  siswa: Option[];
}) {
  return (
    <ActionForm action={action} resetOnSuccess>
      <Semester value={semester} />
      <Field name="siswaId" label="Siswa">
        <FormSelect name="siswaId" options={siswa} placeholder="Pilih siswa" />
      </Field>
      <div className="grid gap-4 sm:grid-cols-[1fr_8rem]">
        <Field name="kegiatan" label="Kegiatan ekstrakurikuler">
          <Input name="kegiatan" placeholder="Contoh: Pramuka" />
        </Field>
        <Field name="nilai" label="Nilai">
          <Input name="nilai" type="number" inputMode="numeric" min={0} max={100} />
        </Field>
      </div>
      <Field name="deskripsi" label="Deskripsi">
        <Textarea name="deskripsi" rows={2} maxLength={255} />
      </Field>
      <div>
        <SubmitButton>Catat ekstrakurikuler</SubmitButton>
      </div>
    </ActionForm>
  );
}

export function PrestasiForm({
  action,
  semester,
  siswa,
}: {
  action: Action;
  semester: string;
  siswa: Option[];
}) {
  return (
    <ActionForm action={action} resetOnSuccess>
      <Semester value={semester} />
      <Field name="siswaId" label="Siswa">
        <FormSelect name="siswaId" options={siswa} placeholder="Pilih siswa" />
      </Field>
      <Field name="jenisKegiatan" label="Jenis kegiatan">
        <Input name="jenisKegiatan" placeholder="Contoh: Olimpiade Sains Nasional" />
      </Field>
      <Field name="keterangan" label="Keterangan">
        <Textarea name="keterangan" rows={2} maxLength={255} placeholder="Contoh: Juara 2 tingkat kota" />
      </Field>
      <div>
        <SubmitButton>Catat prestasi</SubmitButton>
      </div>
    </ActionForm>
  );
}
