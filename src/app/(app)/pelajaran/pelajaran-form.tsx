"use client";

import { Field, FormDialog } from "@/components/forms";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { ActionResult } from "@/lib/action-result";

export function PelajaranDialog({
  action,
  initial,
}: {
  action: (formData: FormData) => Promise<ActionResult>;
  initial?: { nama: string; jumlahJam: number };
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
          <Button>Tambah mata pelajaran</Button>
        )
      }
      title={edit ? `Ubah ${initial!.nama}` : "Mata pelajaran baru"}
      action={action}
      submitLabel={edit ? "Simpan perubahan" : "Tambahkan"}
    >
      <Field name="nama" label="Nama mata pelajaran">
        <Input name="nama" defaultValue={initial?.nama} placeholder="Contoh: Matematika Wajib" />
      </Field>
      <Field name="jumlahJam" label="Jam pelajaran per minggu">
        <Input
          name="jumlahJam"
          type="number"
          inputMode="numeric"
          min={1}
          max={40}
          defaultValue={initial?.jumlahJam}
        />
      </Field>
    </FormDialog>
  );
}
