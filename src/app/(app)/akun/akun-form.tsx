"use client";

import * as React from "react";
import { Field, FormDialog, FormSelect, type Option } from "@/components/forms";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { ActionResult } from "@/lib/action-result";

const ROLES = [
  { value: "GURU", label: "Guru" },
  { value: "WALI_KELAS", label: "Wali Kelas" },
  { value: "SISWA", label: "Siswa" },
  { value: "ADMIN", label: "Admin" },
];

// Radix select items cannot have an empty value, so "no link" gets its own token.
const TANPA_GURU = "0";

export type AkunInitial = {
  name: string;
  email: string;
  role: string;
  siswaNoInduk?: string;
  guruId?: string;
};

export function AkunDialog({
  action,
  initial,
  guru,
}: {
  action: (formData: FormData) => Promise<ActionResult>;
  initial?: AkunInitial;
  guru: Option[];
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
          <Button>Buat akun</Button>
        )
      }
      title={edit ? `Ubah akun ${initial!.name}` : "Akun baru"}
      description={
        edit
          ? undefined
          : "Berikan email dan password ini kepada pemilik akun. Mereka bisa menggantinya di halaman profil."
      }
      action={action}
      submitLabel={edit ? "Simpan perubahan" : "Buat akun"}
    >
      <Field name="name" label="Nama">
        <Input name="name" defaultValue={initial?.name} autoComplete="off" />
      </Field>
      <Field name="email" label="Email">
        <Input name="email" type="email" defaultValue={initial?.email} autoComplete="off" />
      </Field>
      <PeranFields initial={initial} guru={guru} />
      <Field
        name="password"
        label={edit ? "Password baru" : "Password"}
        hint={edit ? "Kosongkan jika password tidak diganti." : "Minimal 7 karakter."}
      >
        <Input name="password" type="password" autoComplete="new-password" />
      </Field>
    </FormDialog>
  );
}

/** Lives inside the form so the chosen role resets whenever the dialog opens again. */
function PeranFields({ initial, guru }: { initial?: AkunInitial; guru: Option[] }) {
  const [role, setRole] = React.useState(initial?.role ?? "");
  const staf = role === "GURU" || role === "WALI_KELAS";
  return (
    <>
      <Field
        name="role"
        label="Peran"
        hint="Guru: absensi dan jadwal mengajar. Wali kelas: input nilai. Siswa: lihat jadwal dan rapor."
      >
        <FormSelect
          name="role"
          options={ROLES}
          value={role}
          onValueChange={setRole}
          placeholder="Pilih peran"
        />
      </Field>
      {role === "SISWA" ? (
        <Field
          name="siswaNoInduk"
          label="Nomor induk siswa"
          hint="Akun siswa hanya bisa membuka rapor milik nomor induk ini."
        >
          <Input
            name="siswaNoInduk"
            defaultValue={initial?.siswaNoInduk}
            inputMode="numeric"
            autoComplete="off"
          />
        </Field>
      ) : null}
      {staf ? (
        <Field
          name="guruId"
          label="Data guru"
          hint="Jadwal mengajar dan guru penilai langsung terisi dengan guru ini."
        >
          <FormSelect
            name="guruId"
            options={[{ value: TANPA_GURU, label: "Tidak dihubungkan" }, ...guru]}
            defaultValue={initial?.guruId ?? TANPA_GURU}
            placeholder="Pilih guru"
          />
        </Field>
      ) : null}
    </>
  );
}
