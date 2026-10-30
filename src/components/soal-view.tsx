import { cn } from "@/lib/utils";
import { TeksRumus } from "@/components/teks-rumus";

export type SoalView = {
  tipe: "PG" | "ESSAY";
  pertanyaan: string;
  opsi: string[];
  kunci: number | null;
  pembahasan: string;
};

const HURUF = "ABCDEF";

/** A question as teachers see it: answer key marked, pembahasan folded away. */
export function SoalIsi({ s, nomor }: { s: SoalView; nomor?: number }) {
  return (
    <div className="grid gap-3">
      <p className="whitespace-pre-wrap text-pretty">
        {nomor ? <span className="tabular mr-2 font-semibold">{nomor}.</span> : null}
        <TeksRumus teks={s.pertanyaan} />
      </p>
      {s.tipe === "PG" ? (
        <ol className="grid gap-1">
          {s.opsi.map((o, i) => (
            <li
              key={i}
              className={cn("flex gap-2 rounded-md px-2 py-1", i === s.kunci && "bg-highlight font-semibold")}
            >
              <span className="w-4 shrink-0">{HURUF[i]}.</span>
              <span className="min-w-0 break-words"><TeksRumus teks={o} /></span>
              {i === s.kunci ? <span className="sr-only">(jawaban benar)</span> : null}
            </li>
          ))}
        </ol>
      ) : null}
      {s.pembahasan ? (
        <details className="text-sm">
          <summary className="inline-flex min-h-11 cursor-pointer items-center text-muted-foreground md:min-h-0">
            {s.tipe === "PG" ? "Pembahasan" : "Pedoman penilaian"}
          </summary>
          <p className="mt-1 whitespace-pre-wrap"><TeksRumus teks={s.pembahasan} /></p>
        </details>
      ) : null}
    </div>
  );
}
