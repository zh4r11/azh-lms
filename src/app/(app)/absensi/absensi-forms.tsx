"use client";

import { ActionForm, SubmitButton } from "@/components/forms";
import type { ActionResult } from "@/lib/action-result";
import { cn } from "@/lib/utils";

type Status = { value: string; label: string };

export function RollCall({
  action,
  siswa,
  statuses,
}: {
  action: (formData: FormData) => Promise<ActionResult>;
  siswa: { id: number; nama: string; noInduk: string; status: string | null }[];
  statuses: Status[];
}) {
  return (
    <ActionForm action={action} className="gap-6">
      <ol className="divide-y rounded-lg border bg-card">
        {siswa.map((s, i) => (
          <li key={s.id} className="grid gap-3 p-4 md:grid-cols-[minmax(0,14rem)_1fr] md:items-center">
            <div>
              <p className="font-semibold">
                <span className="tabular mr-2 text-muted-foreground">{i + 1}.</span>
                {s.nama}
              </p>
              <p className="tabular text-sm text-muted-foreground">
                {s.noInduk}
                {s.status === null ? " · belum diabsen" : null}
              </p>
            </div>
            <fieldset>
              <legend className="sr-only">Kehadiran {s.nama}</legend>
              <div className="flex flex-wrap gap-2">
                {statuses.map((st) => (
                  <label key={st.value} className="cursor-pointer">
                    <input
                      type="radio"
                      name={`status-${s.id}`}
                      value={st.value}
                      defaultChecked={(s.status ?? "HADIR") === st.value}
                      className="peer sr-only"
                    />
                    <span
                      className={cn(
                        "inline-flex min-h-11 items-center rounded-md border bg-background px-3 text-sm transition-colors md:min-h-9",
                        "peer-checked:border-primary peer-checked:bg-primary peer-checked:font-semibold peer-checked:text-primary-foreground",
                        "peer-focus-visible:ring-3 peer-focus-visible:ring-ring/50 hover:bg-muted peer-checked:hover:bg-primary",
                      )}
                    >
                      {st.label}
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>
          </li>
        ))}
      </ol>
      <div className="sticky bottom-0 -mx-4 border-t bg-background/95 px-4 py-3 sm:mx-0 sm:rounded-lg sm:border">
        <SubmitButton className="w-full sm:w-auto">Simpan absensi</SubmitButton>
        <span className="ml-0 mt-2 block text-sm text-muted-foreground sm:ml-3 sm:mt-0 sm:inline">
          Siswa yang belum diabsen otomatis terpilih “Hadir”.
        </span>
      </div>
    </ActionForm>
  );
}
