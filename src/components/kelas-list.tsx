import Link from "next/link";
import { EmptyState } from "@/components/page";

/**
 * Entry list for every "pick a class first" flow (jadwal, absensi, nilai).
 * Rows, not cards: a school has dozens of classes and they are scanned by name.
 */
export function KelasList({
  kelas,
  hrefFor,
  emptyHint,
}: {
  kelas: { id: number; nama: string; info: string }[];
  hrefFor: (id: number) => string;
  emptyHint: React.ReactNode;
}) {
  if (kelas.length === 0) {
    return <EmptyState title="Belum ada kelas">{emptyHint}</EmptyState>;
  }
  return (
    <ul className="grid gap-x-8 sm:grid-cols-2 lg:grid-cols-3">
      {kelas.map((k) => (
        <li key={k.id} className="border-b">
          <Link
            href={hrefFor(k.id)}
            className="group flex min-h-14 items-center justify-between gap-4 rounded-md px-2 py-3 outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <span className="font-heading text-lg font-semibold group-hover:underline">{k.nama}</span>
            <span className="text-right text-sm text-muted-foreground">{k.info}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
