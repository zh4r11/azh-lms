import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div role="status" aria-live="polite">
      <p className="mb-6 text-muted-foreground">Memuat data dari database sekolah…</p>
      <Skeleton className="mb-4 h-10 w-2/3 max-w-md" />
      <Skeleton className="h-48 w-full" />
    </div>
  );
}
