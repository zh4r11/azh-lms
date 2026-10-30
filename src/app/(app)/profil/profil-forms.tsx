"use client";

import { ActionForm, Field, SubmitButton } from "@/components/forms";
import { Input } from "@/components/ui/input";
import { updatePassword, updateProfil } from "./actions";

export function ProfilForm({ name, email }: { name: string; email: string }) {
  return (
    <ActionForm action={updateProfil}>
      <Field name="name" label="Nama">
        <Input name="name" defaultValue={name} autoComplete="name" />
      </Field>
      <Field name="email" label="Email untuk masuk">
        <Input name="email" type="email" defaultValue={email} autoComplete="email" />
      </Field>
      <div>
        <SubmitButton>Simpan profil</SubmitButton>
      </div>
    </ActionForm>
  );
}

export function PasswordForm() {
  return (
    <ActionForm action={updatePassword} resetOnSuccess>
      <Field name="current" label="Password sekarang">
        <Input name="current" type="password" autoComplete="current-password" />
      </Field>
      <Field name="next" label="Password baru" hint="Minimal 7 karakter.">
        <Input name="next" type="password" autoComplete="new-password" />
      </Field>
      <Field name="confirm" label="Ulangi password baru">
        <Input name="confirm" type="password" autoComplete="new-password" />
      </Field>
      <div>
        <SubmitButton>Ganti password</SubmitButton>
      </div>
    </ActionForm>
  );
}
