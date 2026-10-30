"use client";

import * as React from "react";
import { ActionForm, Field, SubmitButton } from "@/components/forms";
import { Input } from "@/components/ui/input";
import type { ActionResult } from "@/lib/action-result";

export function BobotRaporForm({
  action,
  semester,
  awal,
}: {
  action: (formData: FormData) => Promise<ActionResult>;
  semester: string;
  awal: { tugas: number; kuis: number; ujian: number };
}) {
  const [b, setB] = React.useState(awal);
  const total = b.tugas + b.kuis + b.ujian;
  return (
    <ActionForm action={action} className="gap-4">
      <input type="hidden" name="semester" value={semester} />
      <div className="grid grid-cols-3 gap-4">
        {(["tugas", "kuis", "ujian"] as const).map((k) => (
          <Field key={k} name={k} label={`Bobot ${k} (%)`}>
            <Input
              name={k}
              type="number"
              min={0}
              max={100}
              value={b[k]}
              onChange={(e) => setB((x) => ({ ...x, [k]: Number(e.target.value) || 0 }))}
            />
          </Field>
        ))}
      </div>
      <p className={total === 100 ? "text-sm text-muted-foreground" : "text-sm font-semibold text-destructive"} aria-live="polite">
        Jumlah {total}%{total === 100 ? "" : ", harus 100%"}
      </p>
      <SubmitButton className="w-fit">Hitung dan isi nilai rapor</SubmitButton>
    </ActionForm>
  );
}
