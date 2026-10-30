import { pecahRumus, rumusHtml } from "@/lib/rumus";

/** Plain text with $...$ formulas typeset by KaTeX. Works in server and client components. */
export function TeksRumus({ teks }: { teks: string }) {
  return pecahRumus(teks).map((p) =>
    p.rumus ? (
      <span key={p.mulai} className="rumus" dangerouslySetInnerHTML={{ __html: rumusHtml(p.isi) }} />
    ) : (
      p.isi
    ),
  );
}
