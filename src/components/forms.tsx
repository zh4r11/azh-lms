"use client";

import * as React from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { ActionResult } from "@/lib/action-result";

export type Option = { value: string; label: string };

/** Radix select that submits with the form; Field passes id and aria props to the trigger. */
export function FormSelect({
  name,
  options,
  defaultValue,
  value,
  onValueChange,
  placeholder = "Pilih…",
  ...triggerProps
}: {
  name: string;
  options: Option[];
  defaultValue?: string;
  value?: string;
  onValueChange?: (value: string) => void;
  placeholder?: string;
  id?: string;
  "aria-invalid"?: boolean;
  "aria-describedby"?: string;
}) {
  return (
    <Select name={name} defaultValue={defaultValue} value={value} onValueChange={onValueChange}>
      <SelectTrigger className="w-full" {...triggerProps}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

type FormState = { pending: boolean; fieldErrors: Record<string, string>; error?: string };
const FormContext = React.createContext<FormState>({ pending: false, fieldErrors: {} });

/**
 * Submits through a server action without React's automatic form reset, so a failed
 * submit keeps what the user typed. Shows field errors inline and the outcome as a toast.
 */
export function ActionForm({
  action,
  children,
  onSuccess,
  resetOnSuccess = false,
  className,
}: {
  action: (formData: FormData) => Promise<ActionResult>;
  children: React.ReactNode;
  onSuccess?: () => void;
  resetOnSuccess?: boolean;
  className?: string;
}) {
  const [pending, startTransition] = React.useTransition();
  const [result, setResult] = React.useState<ActionResult | null>(null);
  // Remounting clears Radix selects too, which form.reset() does not.
  const [formKey, setFormKey] = React.useState(0);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = await action(data);
      // An action that redirected returns nothing; the navigation is already under way.
      if (!res) return;
      setResult(res);
      if (res.ok) {
        toast.success(res.message);
        if (resetOnSuccess) setFormKey((k) => k + 1);
        onSuccess?.();
      } else {
        toast.error(res.error);
      }
    });
  }

  const state: FormState = {
    pending,
    fieldErrors: result && !result.ok ? (result.fieldErrors ?? {}) : {},
    error: result && !result.ok ? result.error : undefined,
  };

  return (
    <FormContext.Provider value={state}>
      <form key={formKey} onSubmit={handleSubmit} noValidate className={cn("grid gap-4", className)}>
        {children}
      </form>
    </FormContext.Provider>
  );
}

export function Field({
  name,
  label,
  hint,
  children,
  className,
}: {
  name: string;
  label: string;
  hint?: string;
  children: React.ReactElement<Record<string, unknown>>;
  className?: string;
}) {
  const { fieldErrors } = React.useContext(FormContext);
  const error = fieldErrors[name];
  const describedBy = error ? `${name}-error` : hint ? `${name}-hint` : undefined;
  return (
    <div className={cn("grid gap-1.5", className)}>
      <Label htmlFor={name}>{label}</Label>
      {React.cloneElement(children, {
        id: name,
        "aria-invalid": error ? true : undefined,
        "aria-describedby": describedBy,
      })}
      {error ? (
        <p id={`${name}-error`} className="text-sm text-destructive">
          {error}
        </p>
      ) : hint ? (
        <p id={`${name}-hint`} className="text-sm text-muted-foreground">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

/** A group of checkboxes (or radios) with one legend and one error line, wired like Field. */
export function FieldSet({
  name,
  legend,
  hint,
  children,
}: {
  name: string;
  legend: string;
  hint?: string;
  children: React.ReactNode;
}) {
  const { fieldErrors } = React.useContext(FormContext);
  const error = fieldErrors[name];
  return (
    <fieldset
      className="grid gap-1.5"
      aria-invalid={error ? true : undefined}
      aria-describedby={error ? `${name}-error` : hint ? `${name}-hint` : undefined}
    >
      <legend className="mb-1.5 text-sm leading-none font-medium">{legend}</legend>
      {children}
      {error ? (
        <p id={`${name}-error`} className="text-sm text-destructive">
          {error}
        </p>
      ) : hint ? (
        <p id={`${name}-hint`} className="text-sm text-muted-foreground">
          {hint}
        </p>
      ) : null}
    </fieldset>
  );
}

export function SubmitButton({
  children,
  pendingLabel = "Menyimpan…",
  className,
  variant,
}: {
  children: React.ReactNode;
  pendingLabel?: string;
  className?: string;
  variant?: "default" | "outline" | "secondary";
}) {
  const { pending } = React.useContext(FormContext);
  return (
    <Button type="submit" disabled={pending} className={className} variant={variant}>
      {pending ? pendingLabel : children}
    </Button>
  );
}

export function FormDialog({
  trigger,
  title,
  description,
  action,
  submitLabel,
  children,
}: {
  trigger: React.ReactNode;
  title: string;
  description?: string;
  action: (formData: FormData) => Promise<ActionResult>;
  submitLabel: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = React.useState(false);
  // Each opening gets a fresh form, so a finished entry does not reappear in the next one.
  const [opening, setOpening] = React.useState(0);
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (next) setOpening((n) => n + 1);
        setOpen(next);
      }}
    >
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description ? <DialogDescription>{description}</DialogDescription> : null}
        </DialogHeader>
        <ActionForm key={opening} action={action} onSuccess={() => setOpen(false)}>
          {children}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Batal
            </Button>
            <SubmitButton>{submitLabel}</SubmitButton>
          </DialogFooter>
        </ActionForm>
      </DialogContent>
    </Dialog>
  );
}

export function ConfirmDelete({
  action,
  title,
  description,
  triggerLabel = "Hapus",
  confirmLabel = "Ya, hapus",
}: {
  action: () => Promise<ActionResult>;
  title: string;
  description: string;
  triggerLabel?: string;
  confirmLabel?: string;
}) {
  const [open, setOpen] = React.useState(false);
  const [pending, startTransition] = React.useTransition();

  function confirm(e: React.MouseEvent) {
    e.preventDefault();
    startTransition(async () => {
      const res = await action();
      if (res.ok) {
        toast.success(res.message);
        setOpen(false);
      } else {
        toast.error(res.error);
      }
    });
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button variant="destructive" size="sm">
          {triggerLabel}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>Batal</AlertDialogCancel>
          <AlertDialogAction
            onClick={confirm}
            disabled={pending}
            className="bg-destructive text-background hover:bg-destructive/90"
          >
            {pending ? "Menghapus…" : confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
