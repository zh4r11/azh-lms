import Link from "next/link";
import { SEMESTER_LABEL } from "@/lib/labels";
import { cn } from "@/lib/utils";
import type { Semester } from "@/generated/prisma/enums";

export function SemesterSwitch({ basePath, current }: { basePath: string; current: Semester }) {
  return (
    <nav aria-label="Pilih semester" className="inline-flex rounded-md border bg-card p-1">
      {(["GANJIL", "GENAP"] as const).map((s) => (
        <Link
          key={s}
          href={`${basePath}?semester=${s}`}
          aria-current={s === current ? "page" : undefined}
          className={cn(
            "inline-flex min-h-11 items-center rounded-sm px-3 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50 md:min-h-8",
            s === current ? "bg-primary font-semibold text-primary-foreground" : "hover:bg-muted",
          )}
        >
          {SEMESTER_LABEL[s]}
        </Link>
      ))}
    </nav>
  );
}
