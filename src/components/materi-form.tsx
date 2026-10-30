"use client";

import * as React from "react";
import { Field, FieldSet, FormDialog, FormSelect } from "@/components/forms";
import { Unggah } from "@/components/unggah";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { ActionResult } from "@/lib/action-result";

function Isian() {
  const [tipe, setTipe] = React.useState("DOKUMEN");
  const [sumber, setSumber] = React.useState("berkas");
  return (
    <>
      <Field name="judul" label="Judul materi">
        <Input name="judul" autoComplete="off" placeholder="Contoh: Ringkasan bab 2" />
      </Field>
      <Field name="tipe" label="Jenis">
        <FormSelect
          name="tipe"
          value={tipe}
          onValueChange={setTipe}
          options={[
            { value: "DOKUMEN", label: "Dokumen (PDF, Word, PowerPoint, gambar)" },
            { value: "VIDEO", label: "Video" },
          ]}
        />
      </Field>
      {tipe === "VIDEO" ? (
        <FieldSet name="sumber" legend="Sumber video">
          <div className="flex flex-wrap gap-x-6">
            {[
              ["berkas", "Unggah file video"],
              ["youtube", "Link YouTube"],
            ].map(([v, l]) => (
              <label key={v} className="flex min-h-11 cursor-pointer items-center gap-2 md:min-h-9">
                <input
                  type="radio"
                  name="sumber"
                  value={v}
                  checked={sumber === v}
                  onChange={() => setSumber(v)}
                  className="size-4 accent-primary"
                />
                {l}
              </label>
            ))}
          </div>
        </FieldSet>
      ) : (
        <input type="hidden" name="sumber" value="berkas" />
      )}
      {tipe === "VIDEO" && sumber === "youtube" ? (
        <Field name="url" label="Link YouTube">
          <Input name="url" type="url" inputMode="url" placeholder="https://youtu.be/..." />
        </Field>
      ) : (
        <Field
          name="berkasId"
          label={tipe === "VIDEO" ? "File video" : "Berkas"}
          hint={tipe === "VIDEO" ? "MP4, WebM, atau MOV, maksimal 50 MB." : "Maksimal 25 MB."}
        >
          <Unggah key={tipe} name="berkasId" jenis={tipe === "VIDEO" ? "video" : "dokumen"} />
        </Field>
      )}
      <Field name="deskripsi" label="Keterangan untuk siswa" hint="Opsional, misalnya bagian yang perlu dibaca.">
        <Textarea name="deskripsi" rows={3} />
      </Field>
    </>
  );
}

export function MateriDialog({
  action,
  label = "Tambah materi",
  variant = "outline",
}: {
  action: (formData: FormData) => Promise<ActionResult>;
  label?: string;
  variant?: "default" | "outline";
}) {
  return (
    <FormDialog
      trigger={<Button variant={variant}>{label}</Button>}
      title="Materi baru"
      description="Dokumen atau video yang bisa dibuka siswa."
      action={action}
      submitLabel="Simpan materi"
    >
      <Isian />
    </FormDialog>
  );
}
