"use client";

import * as React from "react";
import { ActionForm, Field, FieldSet, FormDialog, SubmitButton } from "@/components/forms";
import { Unggah } from "@/components/unggah";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { ActionResult } from "@/lib/action-result";
import { TeksRumus } from "@/components/teks-rumus";

type Action = (formData: FormData) => Promise<ActionResult>;

/** Ticks questions from the bank (same subject and grade) to add to this tugas. */
export function AmbilBankDialog({
  action,
  soal,
}: {
  action: Action;
  soal: { id: number; tipe: "PG" | "ESSAY"; pertanyaan: string; pembuat: string }[];
}) {
  const [cari, setCari] = React.useState("");
  const tampil = soal.filter((s) => s.pertanyaan.toLowerCase().includes(cari.toLowerCase()));
  return (
    <FormDialog
      trigger={<Button variant="outline">Ambil dari bank soal</Button>}
      title="Ambil dari bank soal"
      description={`${soal.length} soal di bank untuk mata pelajaran dan tingkat ini yang belum dipakai di tugas ini.`}
      action={action}
      submitLabel="Tambahkan yang dicentang"
    >
      <div className="grid gap-1.5">
        <label htmlFor="cari-bank" className="text-sm font-medium">
          Cari
        </label>
        <Input id="cari-bank" value={cari} onChange={(e) => setCari(e.target.value)} />
      </div>
      <FieldSet name="soalId" legend="Soal">
        {soal.length === 0 ? (
          <p className="text-muted-foreground">Bank soal kosong untuk mata pelajaran dan tingkat ini.</p>
        ) : (
          <ul className="grid max-h-[50dvh] gap-2 overflow-y-auto pr-1">
            {soal.map((s) => (
              <li key={s.id} hidden={!tampil.includes(s)}>
                <label className="flex cursor-pointer gap-3 rounded-md border p-3 has-checked:border-primary has-checked:bg-muted">
                  <input type="checkbox" name="soalId" value={s.id} className="mt-1 size-4 shrink-0 accent-primary" />
                  <span className="min-w-0">
                    <span className="line-clamp-3 whitespace-pre-wrap"><TeksRumus teks={s.pertanyaan} /></span>
                    <span className="block text-sm text-muted-foreground">
                      {s.tipe === "PG" ? "Pilihan ganda" : "Essay"} · {s.pembuat}
                    </span>
                  </span>
                </label>
              </li>
            ))}
          </ul>
        )}
      </FieldSet>
    </FormDialog>
  );
}

export function BobotForm({ action, bobot }: { action: Action; bobot: number }) {
  return (
    <ActionForm action={action} className="flex items-end gap-2">
      <Field name="bobot" label="Bobot" className="w-20">
        <Input name="bobot" type="number" min={1} max={100} defaultValue={bobot} />
      </Field>
      <SubmitButton variant="outline">Simpan</SubmitButton>
    </ActionForm>
  );
}

export function KumpulBerkasForm({ action, ada }: { action: Action; ada: { id: number; nama: string } | null }) {
  return (
    <ActionForm action={action} className="gap-4">
      <Field name="berkasId" label={ada ? "Ganti berkas jawaban" : "Berkas jawaban"} hint="PDF, Word, gambar, atau ZIP, maksimal 25 MB.">
        <Unggah name="berkasId" />
      </Field>
      <SubmitButton className="w-fit">{ada ? "Kumpulkan ulang" : "Kumpulkan"}</SubmitButton>
    </ActionForm>
  );
}
