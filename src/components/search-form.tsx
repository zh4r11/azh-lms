import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/** Plain GET form so search works and stays in the URL, even before JS loads. */
export function SearchForm({
  action,
  label,
  placeholder,
  defaultValue,
  active = Boolean(defaultValue),
  children,
}: {
  action: string;
  label: string;
  placeholder: string;
  defaultValue?: string;
  /** Whether any filter is applied, which shows the reset link. */
  active?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <form action={action} className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end" role="search">
      <div className="grid flex-1 gap-1.5">
        <Label htmlFor="q">{label}</Label>
        <Input id="q" name="q" defaultValue={defaultValue} placeholder={placeholder} />
      </div>
      {children}
      <div className="flex gap-2">
        <Button type="submit" variant="secondary">
          Cari
        </Button>
        {active ? (
          <Button asChild variant="ghost">
            <Link href={action}>Hapus pencarian</Link>
          </Button>
        ) : null}
      </div>
    </form>
  );
}
