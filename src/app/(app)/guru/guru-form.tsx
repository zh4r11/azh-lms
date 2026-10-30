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

export type GuruInitial = {
  noInduk: string | null;
  nama: string;
  jk: string;
  telp: string;
  alamat: string;
  pelajaranId: number | null;
};

export function GuruDialog({
  action,
  pelajaran,
  initial,
}: {
  action: (formData: FormData) => Promise<ActionResult>;
  pelajaran: Option[];
  initial?: GuruInitial;
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
          <Button>Tambah guru</Button>
        )
      }
      title={edit ? `Ubah data ${initial!.nama}` : "Data guru baru"}
      action={action}
      submitLabel={edit ? "Simpan perubahan" : "Tambahkan guru"}
    >
      <Field name="nama" label="Nama lengkap">
        <Input name="nama" defaultValue={initial?.nama} autoComplete="off" />
      </Field>
      <Field name="noInduk" label="NIP" hint="Boleh dikosongkan untuk guru honorer tanpa NIP.">
        <Input name="noInduk" defaultValue={initial?.noInduk ?? ""} inputMode="numeric" />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field name="jk" label="Jenis kelamin">
          <FormSelect name="jk" options={JK} defaultValue={initial?.jk} />
        </Field>
        <Field name="telp" label="Nomor telepon">
          <Input name="telp" type="tel" defaultValue={initial?.telp} placeholder="08xxxxxxxxxx" />
        </Field>
      </div>
      <Field name="pelajaranId" label="Mata pelajaran yang diampu">
        <FormSelect
          name="pelajaranId"
          options={pelajaran}
          defaultValue={initial?.pelajaranId ? String(initial.pelajaranId) : undefined}
          placeholder={pelajaran.length ? "Pilih mata pelajaran" : "Belum ada mata pelajaran"}
        />
      </Field>
      <Field name="alamat" label="Alamat">
        <Textarea name="alamat" defaultValue={initial?.alamat} rows={2} />
      </Field>
    </FormDialog>
  );
}
