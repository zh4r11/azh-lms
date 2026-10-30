"use client";

import { Field, FormDialog, FormSelect, type Option } from "@/components/forms";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { ActionResult } from "@/lib/action-result";

const JK: Option[] = [
  { value: "PRIA", label: "Laki-laki" },
  { value: "WANITA", label: "Perempuan" },
];

export type SiswaInitial = {
  noInduk: string;
  nama: string;
  jk: string;
  telp: string;
  kelasId: number | null;
  alamat: string;
  tempatLahir: string;
  tanggalLahir: string;
};

export function SiswaDialog({
  action,
  kelas,
  initial,
}: {
  action: (formData: FormData) => Promise<ActionResult>;
  kelas: Option[];
  initial?: SiswaInitial;
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
          <Button>Tambah siswa</Button>
        )
      }
      title={edit ? `Ubah data ${initial!.nama}` : "Data siswa baru"}
      action={action}
      submitLabel={edit ? "Simpan perubahan" : "Tambahkan siswa"}
    >
      <Field name="nama" label="Nama lengkap">
        <Input name="nama" defaultValue={initial?.nama} autoComplete="off" />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field name="noInduk" label="Nomor induk (NIS/NISN)">
          <Input name="noInduk" defaultValue={initial?.noInduk} inputMode="numeric" />
        </Field>
        <Field name="kelasId" label="Kelas">
          <FormSelect
            name="kelasId"
            options={kelas}
            defaultValue={initial?.kelasId ? String(initial.kelasId) : undefined}
            placeholder={kelas.length ? "Pilih kelas" : "Belum ada kelas"}
          />
        </Field>
        <Field name="jk" label="Jenis kelamin">
          <FormSelect name="jk" options={JK} defaultValue={initial?.jk} />
        </Field>
        <Field name="telp" label="Nomor telepon">
          <Input name="telp" type="tel" defaultValue={initial?.telp} placeholder="08xxxxxxxxxx" />
        </Field>
        <Field name="tempatLahir" label="Tempat lahir">
          <Input name="tempatLahir" defaultValue={initial?.tempatLahir} />
        </Field>
        <Field name="tanggalLahir" label="Tanggal lahir">
          <Input name="tanggalLahir" type="date" defaultValue={initial?.tanggalLahir} />
        </Field>
      </div>
      <Field name="alamat" label="Alamat">
        <Textarea name="alamat" defaultValue={initial?.alamat} rows={2} />
      </Field>
    </FormDialog>
  );
}
