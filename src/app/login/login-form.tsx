"use client";

import { ActionForm, Field, SubmitButton } from "@/components/forms";
import { Input } from "@/components/ui/input";
import { login } from "./actions";

export function LoginForm() {
  return (
    <ActionForm action={login}>
      <Field name="email" label="Email">
        <Input name="email" type="email" autoComplete="email" placeholder="email@contoh.sch.id" />
      </Field>
      <Field name="password" label="Password">
        <Input name="password" type="password" autoComplete="current-password" />
      </Field>
      <SubmitButton pendingLabel="Memeriksa…" className="w-full">
        Masuk ke LMS
      </SubmitButton>
    </ActionForm>
  );
}
