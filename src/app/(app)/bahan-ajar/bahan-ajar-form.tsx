"use client";

import { Field, FormDialog } from "@/components/forms";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { ActionResult } from "@/lib/action-result";

export function BahanAjarDialog({
  action,
  initial,
}: {
  action: (formData: FormData) => Promise<ActionResult>;
  initial: { urutan: number; judul?: string; deskripsi?: string };
}) {
  const edit = initial.judul !== undefined;
  return (
    <FormDialog
      trigger={
        edit ? (
          <Button variant="outline" size="sm">
            Ubah
          </Button>
        ) : (
          <Button>Tambah pertemuan</Button>
        )
      }
      title={edit ? `Ubah pertemuan ke-${initial.urutan}` : "Bahan ajar pertemuan baru"}
      description="Materi (dokumen atau video) ditambahkan sesudah pertemuan ini dibuat."
      action={action}
      submitLabel={edit ? "Simpan perubahan" : "Buat"}
    >
      <div className="grid grid-cols-[6rem_minmax(0,1fr)] gap-4">
        <Field name="urutan" label="Ke-">
          <Input name="urutan" type="number" min={1} max={60} defaultValue={initial.urutan} />
        </Field>
        <Field name="judul" label="Topik">
          <Input name="judul" defaultValue={initial.judul} placeholder="Contoh: Persamaan linear" />
        </Field>
      </div>
      <Field name="deskripsi" label="Ringkasan untuk guru dan siswa" hint="Tujuan belajar atau kegiatan pertemuan ini. Opsional.">
        <Textarea name="deskripsi" rows={4} defaultValue={initial.deskripsi} />
      </Field>
    </FormDialog>
  );
}
