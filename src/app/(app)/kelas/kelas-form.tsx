"use client";

import { Field, FormDialog, FormSelect, type Option } from "@/components/forms";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { ActionResult } from "@/lib/action-result";

export function KelasDialog({
  action,
  guru,
  initial,
}: {
  action: (formData: FormData) => Promise<ActionResult>;
  guru: Option[];
  initial?: { nama: string; tingkat: string; waliKelasId: number | null };
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
          <Button>Tambah kelas</Button>
        )
      }
      title={edit ? `Ubah kelas ${initial!.nama}` : "Kelas baru"}
      action={action}
      submitLabel={edit ? "Simpan perubahan" : "Tambahkan kelas"}
    >
      <Field name="nama" label="Nama kelas">
        <Input name="nama" defaultValue={initial?.nama} placeholder="Contoh: X MIPA 1" />
      </Field>
      <Field name="tingkat" label="Tingkat" hint="Menentukan bahan ajar default yang dipakai kelas ini.">
        <FormSelect
          name="tingkat"
          options={[
            { value: "X", label: "Kelas X" },
            { value: "XI", label: "Kelas XI" },
            { value: "XII", label: "Kelas XII" },
          ]}
          defaultValue={initial?.tingkat}
          placeholder="Pilih tingkat"
        />
      </Field>
      <Field name="waliKelasId" label="Wali kelas" hint="Diambil dari data guru.">
        <FormSelect
          name="waliKelasId"
          options={[{ value: "none", label: "Belum ditentukan" }, ...guru]}
          defaultValue={initial?.waliKelasId ? String(initial.waliKelasId) : "none"}
        />
      </Field>
    </FormDialog>
  );
}
