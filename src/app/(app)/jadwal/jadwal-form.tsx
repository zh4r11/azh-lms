"use client";

import * as React from "react";
import { Field, FormDialog, FormSelect, type Option } from "@/components/forms";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { ActionResult } from "@/lib/action-result";

const HARI: Option[] = [
  { value: "SENIN", label: "Senin" },
  { value: "SELASA", label: "Selasa" },
  { value: "RABU", label: "Rabu" },
  { value: "KAMIS", label: "Kamis" },
  { value: "JUMAT", label: "Jumat" },
];

export type GuruOption = { value: string; label: string; pelajaranId: number | null };

export type JadwalInitial = {
  hari: string;
  jamMulai: string;
  jamSelesai: string;
  pelajaranId: number;
  guruId: number | null;
};

/**
 * Picking a subject narrows the teacher list to the teachers of that subject,
 * like the old AJAX endpoint did. "Semua guru" stays available for substitutes.
 */
function PelajaranGuruFields({
  pelajaran,
  guru,
  initial,
}: {
  pelajaran: Option[];
  guru: GuruOption[];
  initial?: JadwalInitial;
}) {
  const [pelajaranId, setPelajaranId] = React.useState(
    initial ? String(initial.pelajaranId) : "",
  );
  const [guruId, setGuruId] = React.useState(initial?.guruId ? String(initial.guruId) : "none");
  const [semua, setSemua] = React.useState(false);

  const cocok = guru.filter((g) => String(g.pelajaranId) === pelajaranId);
  const pilihan = semua || cocok.length === 0 ? guru : cocok;

  return (
    <>
      <Field name="pelajaranId" label="Mata pelajaran">
        <FormSelect
          name="pelajaranId"
          options={pelajaran}
          value={pelajaranId}
          onValueChange={(v) => {
            setPelajaranId(v);
            setGuruId("none");
          }}
          placeholder={pelajaran.length ? "Pilih mata pelajaran" : "Belum ada mata pelajaran"}
        />
      </Field>
      <Field
        name="guruId"
        label="Guru pengajar"
        hint={
          pelajaranId && cocok.length === 0
            ? "Belum ada guru untuk mata pelajaran ini, jadi semua guru ditampilkan."
            : undefined
        }
      >
        <FormSelect
          name="guruId"
          options={[{ value: "none", label: "Belum ditentukan" }, ...pilihan]}
          value={guruId}
          onValueChange={setGuruId}
        />
      </Field>
      {pelajaranId && cocok.length > 0 ? (
        <label className="-mt-2 flex min-h-11 items-center gap-2 text-sm md:min-h-0">
          <input
            type="checkbox"
            checked={semua}
            onChange={(e) => setSemua(e.target.checked)}
            className="size-4 accent-primary"
          />
          Tampilkan semua guru (untuk guru pengganti)
        </label>
      ) : null}
    </>
  );
}

export function JadwalDialog({
  action,
  pelajaran,
  guru,
  initial,
  defaultHari,
}: {
  action: (formData: FormData) => Promise<ActionResult>;
  pelajaran: Option[];
  guru: GuruOption[];
  initial?: JadwalInitial;
  defaultHari?: string;
}) {
  const edit = Boolean(initial);
  return (
    <FormDialog
      trigger={
        edit ? (
          <Button variant="ghost" size="sm">
            Ubah
          </Button>
        ) : (
          <Button>Tambah slot jadwal</Button>
        )
      }
      title={edit ? "Ubah slot jadwal" : "Slot jadwal baru"}
      action={action}
      submitLabel={edit ? "Simpan perubahan" : "Tambahkan ke jadwal"}
    >
      <Field name="hari" label="Hari">
        <FormSelect name="hari" options={HARI} defaultValue={initial?.hari ?? defaultHari} />
      </Field>
      <div className="grid grid-cols-2 gap-4">
        <Field name="jamMulai" label="Jam mulai">
          <Input name="jamMulai" type="time" defaultValue={initial?.jamMulai ?? "07:30"} />
        </Field>
        <Field name="jamSelesai" label="Jam selesai">
          <Input name="jamSelesai" type="time" defaultValue={initial?.jamSelesai ?? "09:00"} />
        </Field>
      </div>
      <PelajaranGuruFields pelajaran={pelajaran} guru={guru} initial={initial} />
    </FormDialog>
  );
}
