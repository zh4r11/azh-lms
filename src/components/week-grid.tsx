import { HARI_LABEL, HARI_URUT } from "@/lib/labels";
import type { Hari } from "@/generated/prisma/enums";

export type WeekSlot = {
  id: number;
  hari: Hari;
  jamMulai: string;
  jamSelesai: string;
  judul: string;
  keterangan: string;
  aksi?: React.ReactNode;
};

/**
 * Five day columns on wide screens, stacked days on phones. Each day reads top to bottom
 * like the timetable pinned in a classroom.
 */
export function WeekGrid({
  slots,
  emptyDay = "Tidak ada pelajaran",
  dayAction,
}: {
  slots: WeekSlot[];
  emptyDay?: string;
  dayAction?: (hari: Hari) => React.ReactNode;
}) {
  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-5 xl:gap-0 xl:divide-x xl:rounded-lg xl:border xl:bg-card">
      {HARI_URUT.map((hari) => {
        const daySlots = slots
          .filter((s) => s.hari === hari)
          .sort((a, b) => a.jamMulai.localeCompare(b.jamMulai));
        return (
          <section key={hari} aria-labelledby={`hari-${hari}`} className="min-w-0 xl:p-4">
            <h2 id={`hari-${hari}`} className="rule-double mb-3 text-lg font-semibold">
              {HARI_LABEL[hari]}
            </h2>
            {daySlots.length === 0 ? (
              <p className="text-sm text-muted-foreground">{emptyDay}</p>
            ) : (
              <ol className="grid gap-3">
                {daySlots.map((s) => (
                  <li key={s.id} className="rounded-md border bg-background p-3 xl:bg-card">
                    <p className="tabular text-sm text-muted-foreground">
                      {s.jamMulai} – {s.jamSelesai}
                    </p>
                    <p className="font-semibold break-words">{s.judul}</p>
                    <p className="text-sm break-words text-muted-foreground">{s.keterangan}</p>
                    {s.aksi ? <div className="mt-2 flex flex-wrap gap-1">{s.aksi}</div> : null}
                  </li>
                ))}
              </ol>
            )}
            {dayAction ? <div className="mt-3">{dayAction(hari)}</div> : null}
          </section>
        );
      })}
    </div>
  );
}
