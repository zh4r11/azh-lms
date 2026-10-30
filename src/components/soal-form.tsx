"use client";

import * as React from "react";
import { PlusIcon, XIcon } from "@phosphor-icons/react";
import { Field, FieldSet, FormDialog, FormSelect, type Option } from "@/components/forms";
import { Button } from "@/components/ui/button";
import { RumusInput } from "@/components/rumus-input";
import type { ActionResult } from "@/lib/action-result";

export type SoalInitial = {
  pelajaranId: number;
  tingkat: string;
  tipe: "PG" | "ESSAY";
  pertanyaan: string;
  opsi: string[];
  kunci: number | null;
  pembahasan: string;
};

const HURUF = "ABCDEF";

function Pilihan({ awal, kunciAwal }: { awal: string[]; kunciAwal: number | null }) {
  // Stable keys so removing an option does not shift what was typed in the others.
  const [opsi, setOpsi] = React.useState(() =>
    (awal.length ? awal : ["", "", "", ""]).map((teks, i) => ({ key: i, teks })),
  );
  const [kunci, setKunci] = React.useState<number | null>(kunciAwal);
  const next = React.useRef(opsi.length);
  return (
    <FieldSet name="opsi" legend="Pilihan jawaban" hint="Pilih bulatan di depan jawaban yang benar.">
      <ol className="grid gap-2">
        {opsi.map((o, i) => (
          <li key={o.key} className="flex items-start gap-2">
            <label className="flex min-h-11 shrink-0 cursor-pointer items-center gap-2 md:min-h-9">
              <input
                type="radio"
                name="kunci"
                value={i}
                checked={kunci === i}
                onChange={() => setKunci(i)}
                className="size-4 accent-primary"
                aria-label={`Jawaban benar: pilihan ${HURUF[i]}`}
              />
              <span className="w-4 font-semibold">{HURUF[i]}</span>
            </label>
            <RumusInput
              name="opsi"
              multiline={false}
              value={o.teks}
              onValueChange={(teks) => setOpsi((xs) => xs.map((x) => (x.key === o.key ? { ...x, teks } : x)))}
              aria-label={`Pilihan ${HURUF[i]}`}
              label={`pilihan ${HURUF[i]}`}
            />
            {opsi.length > 2 ? (
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label={`Hapus pilihan ${HURUF[i]}`}
                onClick={() => {
                  setOpsi((xs) => xs.filter((x) => x.key !== o.key));
                  setKunci((k) => (k === i ? null : k !== null && k > i ? k - 1 : k));
                }}
              >
                <XIcon />
              </Button>
            ) : null}
          </li>
        ))}
      </ol>
      {opsi.length < HURUF.length ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="w-fit"
          onClick={() => setOpsi((xs) => [...xs, { key: next.current++, teks: "" }])}
        >
          <PlusIcon />
          Tambah pilihan
        </Button>
      ) : null}
    </FieldSet>
  );
}

function Isian({
  pelajaran,
  initial,
  diAsesmen,
}: {
  pelajaran?: Option[];
  initial?: SoalInitial;
  diAsesmen?: boolean;
}) {
  const [tipe, setTipe] = React.useState<string>(initial?.tipe ?? "PG");
  return (
    <>
      {pelajaran ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-[minmax(0,1fr)_8rem]">
          <Field name="pelajaranId" label="Mata pelajaran">
            <FormSelect
              name="pelajaranId"
              options={pelajaran}
              defaultValue={initial ? String(initial.pelajaranId) : pelajaran.length === 1 ? pelajaran[0].value : undefined}
              placeholder="Pilih mata pelajaran"
            />
          </Field>
          <Field name="tingkat" label="Tingkat">
            <FormSelect
              name="tingkat"
              options={["X", "XI", "XII"].map((t) => ({ value: t, label: `Kelas ${t}` }))}
              defaultValue={initial?.tingkat}
              placeholder="Pilih"
            />
          </Field>
        </div>
      ) : null}
      <Field name="tipe" label="Jenis soal">
        <FormSelect
          name="tipe"
          value={tipe}
          onValueChange={setTipe}
          options={[
            { value: "PG", label: "Pilihan ganda (dinilai otomatis)" },
            { value: "ESSAY", label: "Essay (dinilai guru)" },
          ]}
        />
      </Field>
      <Field name="pertanyaan" label="Pertanyaan">
        <RumusInput name="pertanyaan" rows={4} defaultValue={initial?.pertanyaan} />
      </Field>
      {tipe === "PG" ? <Pilihan awal={initial?.opsi ?? []} kunciAwal={initial?.kunci ?? null} /> : null}
      <Field
        name="pembahasan"
        label={tipe === "PG" ? "Pembahasan" : "Kunci atau pedoman penilaian"}
        hint={tipe === "PG" ? "Ditampilkan ke siswa setelah selesai, jika hasil diizinkan tampil." : "Hanya untuk guru saat menilai."}
      >
        <RumusInput name="pembahasan" rows={3} defaultValue={initial?.pembahasan} />
      </Field>
      {diAsesmen ? (
        <label className="flex min-h-11 cursor-pointer items-center gap-2 md:min-h-9">
          {/* The form keeps the last value per name, so a ticked box overrides this default. */}
          <input type="hidden" name="diBank" value="tidak" />
          <input type="checkbox" name="diBank" value="ya" defaultChecked className="size-4 accent-primary" />
          Simpan juga ke bank soal agar bisa dipakai lagi
        </label>
      ) : null}
    </>
  );
}

export function SoalDialog({
  action,
  pelajaran,
  initial,
}: {
  action: (formData: FormData) => Promise<ActionResult>;
  pelajaran: Option[];
  initial?: SoalInitial;
}) {
  return (
    <FormDialog
      trigger={
        initial ? (
          <Button variant="outline" size="sm">
            Ubah
          </Button>
        ) : (
          <Button>Tulis soal</Button>
        )
      }
      title={initial ? "Ubah soal" : "Soal baru di bank soal"}
      action={action}
      submitLabel={initial ? "Simpan perubahan" : "Simpan soal"}
    >
      <Isian pelajaran={pelajaran} initial={initial} />
    </FormDialog>
  );
}

export function SoalBaruDialog({ action }: { action: (formData: FormData) => Promise<ActionResult> }) {
  return (
    <FormDialog
      trigger={<Button>Tulis soal baru</Button>}
      title="Soal baru"
      description="Mata pelajaran dan tingkat mengikuti kelas tugas ini."
      action={action}
      submitLabel="Tambahkan soal"
    >
      <Isian diAsesmen />
    </FormDialog>
  );
}
