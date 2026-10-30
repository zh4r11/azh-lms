"use client";

import { ActionForm, Field, FormDialog, SubmitButton } from "@/components/forms";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { ActionResult } from "@/lib/action-result";

type Action = (formData: FormData) => Promise<ActionResult>;

export function PertemuanDialog({
  action,
  initial,
}: {
  action: Action;
  initial: { judul: string; tanggal: string; urutan: number };
}) {
  return (
    <FormDialog
      trigger={<Button>Tambah pertemuan</Button>}
      title="Pertemuan baru"
      description="Bahan ajar sekolah untuk nomor pertemuan ini langsung tampil, dan absensinya bisa diisi di dalamnya."
      action={action}
      submitLabel="Buat pertemuan"
    >
      <PertemuanIsian initial={initial} />
    </FormDialog>
  );
}

export function UbahPertemuanDialog({ action, initial }: { action: Action; initial: { judul: string; tanggal: string; urutan: number } }) {
  return (
    <FormDialog
      trigger={
        <Button variant="outline" size="sm">
          Ubah
        </Button>
      }
      title="Ubah pertemuan"
      action={action}
      submitLabel="Simpan perubahan"
    >
      <PertemuanIsian initial={initial} />
    </FormDialog>
  );
}

function PertemuanIsian({ initial }: { initial: { judul: string; tanggal: string; urutan: number } }) {
  return (
    <>
      <div className="grid grid-cols-[6rem_minmax(0,1fr)] gap-4">
        <Field name="urutan" label="Ke-">
          <Input name="urutan" type="number" min={1} max={60} defaultValue={initial.urutan} />
        </Field>
        <Field name="tanggal" label="Tanggal">
          <Input name="tanggal" type="date" defaultValue={initial.tanggal} />
        </Field>
      </div>
      <Field name="judul" label="Judul" hint="Biasanya topik yang dibahas.">
        <Input name="judul" defaultValue={initial.judul} />
      </Field>
    </>
  );
}

/** Opens online check-in for a number of minutes. */
export function BukaAbsenForm({ action }: { action: Action }) {
  return (
    <ActionForm action={action} className="flex flex-col gap-3 sm:flex-row sm:items-end">
      <Field name="menit" label="Lama dibuka (menit)" className="sm:w-48">
        <Input name="menit" type="number" min={5} max={600} defaultValue={30} />
      </Field>
      <SubmitButton>Buka absen online</SubmitButton>
    </ActionForm>
  );
}

/** A single-button action form, for things like "Tutup absen" or "Saya hadir". */
export function TombolAksi({
  action,
  children,
  variant = "default",
}: {
  action: () => Promise<ActionResult>;
  children: React.ReactNode;
  variant?: "default" | "outline";
}) {
  return (
    <ActionForm action={() => action()}>
      <SubmitButton variant={variant}>{children}</SubmitButton>
    </ActionForm>
  );
}
