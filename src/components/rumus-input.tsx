"use client";

import * as React from "react";
import type { MathfieldElement } from "mathlive";
import { FunctionIcon } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { TeksRumus } from "@/components/teks-rumus";
import { adaRumus, pecahRumus, rumusHtml } from "@/lib/rumus";
import { cn } from "@/lib/utils";

// [what is inserted, what the button shows, its spoken name]. "#0" keeps the current selection,
// "#?" is an empty box the cursor jumps to, "#@" takes the item just before the cursor.
type Tombol = [string, string, string];

const KELOMPOK: { judul: string; tombol: Tombol[] }[] = [
  {
    judul: "Bentuk",
    tombol: [
      ["\\frac{#@}{#?}", "\\frac{a}{b}", "Pecahan"],
      ["#@^{#?}", "x^n", "Pangkat"],
      ["#@_{#?}", "x_n", "Indeks bawah"],
      ["\\sqrt{#0}", "\\sqrt{x}", "Akar kuadrat"],
      ["\\sqrt[#?]{#0}", "\\sqrt[n]{x}", "Akar pangkat n"],
      ["\\left(#0\\right)", "(x)", "Kurung"],
      ["\\left|#0\\right|", "|x|", "Nilai mutlak"],
      ["\\vec{#0}", "\\vec{v}", "Vektor"],
      ["\\overline{#0}", "\\overline{x}", "Garis atas"],
      ["\\log_{#?}#0", "\\log_a x", "Logaritma"],
      ["\\lim_{#?\\to #?}", "\\lim_{x\\to a}", "Limit"],
      ["\\sum_{#?}^{#?}", "\\sum_{i=1}^{n}", "Sigma"],
      ["\\int_{#?}^{#?}", "\\int_a^b", "Integral"],
      ["\\begin{pmatrix}#?&#?\\\\#?&#?\\end{pmatrix}", "\\begin{pmatrix}a&b\\\\c&d\\end{pmatrix}", "Matriks dua kali dua"],
    ],
  },
  {
    judul: "Simbol",
    tombol: [
      ["\\times", "\\times", "Kali"],
      ["\\div", "\\div", "Bagi"],
      ["\\pm", "\\pm", "Plus minus"],
      ["\\cdot", "\\cdot", "Titik kali"],
      ["\\le", "\\le", "Kurang dari sama dengan"],
      ["\\ge", "\\ge", "Lebih dari sama dengan"],
      ["\\ne", "\\ne", "Tidak sama dengan"],
      ["\\approx", "\\approx", "Kira-kira"],
      ["\\infty", "\\infty", "Tak hingga"],
      ["^{\\circ}", "30^{\\circ}", "Derajat"],
      ["\\sin", "\\sin", "Sinus"],
      ["\\cos", "\\cos", "Kosinus"],
      ["\\tan", "\\tan", "Tangen"],
      ["\\rightarrow", "\\rightarrow", "Panah kanan"],
      ["\\Rightarrow", "\\Rightarrow", "Maka"],
      ["\\angle", "\\angle", "Sudut"],
      ["\\perp", "\\perp", "Tegak lurus"],
      ["\\parallel", "\\parallel", "Sejajar"],
    ],
  },
  {
    judul: "Huruf Yunani",
    tombol: (
      [
        ["alpha", "alfa"], ["beta", "beta"], ["gamma", "gamma"], ["delta", "delta"], ["theta", "teta"],
        ["lambda", "lambda"], ["mu", "mu"], ["pi", "pi"], ["rho", "rho"], ["sigma", "sigma"],
        ["omega", "omega"], ["Delta", "Delta besar"], ["Sigma", "Sigma besar"], ["Phi", "Phi besar"], ["Omega", "Omega besar"],
      ] as const
    ).map(([k, nama]) => [`\\${k}`, `\\${k}`, nama] as Tombol),
  },
];

function RumusDialog({
  open,
  onOpenChange,
  awal,
  ubah,
  onSimpan,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  awal: string;
  ubah: boolean;
  onSimpan: (latex: string) => void;
}) {
  const wadah = React.useRef<HTMLDivElement>(null);
  const mf = React.useRef<MathfieldElement | null>(null);
  const [siap, setSiap] = React.useState(false);

  React.useEffect(() => {
    if (!open) return;
    let batal = false;
    let el: MathfieldElement | null = null;
    // MathLive touches the DOM on import, so it only loads in the browser and only when needed.
    import("mathlive").then(({ MathfieldElement }) => {
      if (batal || !wadah.current) return;
      // The KaTeX stylesheet loaded by the app already declares the same fonts.
      MathfieldElement.fontsDirectory = null;
      MathfieldElement.soundsDirectory = null;
      el = new MathfieldElement();
      el.mathVirtualKeyboardPolicy = "manual";
      el.setAttribute("aria-label", "Rumus");
      wadah.current.append(el);
      // These setters need the element in the document.
      el.menuItems = [];
      el.value = awal;
      mf.current = el;
      setSiap(true);
      requestAnimationFrame(() => el?.focus());
    });
    return () => {
      batal = true;
      el?.remove();
      mf.current = null;
      setSiap(false);
    };
  }, [open, awal]);

  const sisip = (latex: string) => {
    mf.current?.executeCommand(["insert", latex, { focus: true, selectionMode: "placeholder" }]);
    mf.current?.focus();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{ubah ? "Ubah rumus" : "Sisipkan rumus"}</DialogTitle>
          <DialogDescription>
            Ketik langsung atau pakai tombol di bawah. Pintasan: / untuk pecahan, ^ untuk pangkat, _ untuk indeks, sqrt
            untuk akar, pi atau alpha untuk huruf Yunani.
          </DialogDescription>
        </DialogHeader>
        <div ref={wadah} className="kotak-rumus min-h-16">
          {siap ? null : <p className="py-4 text-muted-foreground">Menyiapkan editor rumus…</p>}
        </div>
        {KELOMPOK.map((k) => (
          <section key={k.judul} aria-label={k.judul}>
            <p className="mb-1.5 text-sm font-semibold">{k.judul}</p>
            <div className="flex flex-wrap gap-1.5">
              {k.tombol.map(([isi, tampil, nama]) => (
                <Button
                  key={nama}
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={!siap}
                  aria-label={nama}
                  title={nama}
                  className="min-w-11 px-2 md:min-w-10"
                  onClick={() => sisip(isi)}
                >
                  <span aria-hidden dangerouslySetInnerHTML={{ __html: rumusHtml(tampil) }} />
                </Button>
              ))}
            </div>
          </section>
        ))}
        <DialogFooter>
          {ubah ? (
            <Button
              type="button"
              variant="ghost"
              className="sm:mr-auto"
              onClick={() => {
                onSimpan("");
                onOpenChange(false);
              }}
            >
              Hapus rumus
            </Button>
          ) : null}
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Batal
          </Button>
          <Button
            type="button"
            disabled={!siap}
            onClick={() => {
              onSimpan(mf.current?.getValue("latex-expanded") ?? "");
              onOpenChange(false);
            }}
          >
            {ubah ? "Simpan rumus" : "Sisipkan"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * A text field whose formulas are written in a visual editor. The text keeps them as $...$ LaTeX;
 * with the cursor inside one, the button edits that formula instead of adding a new one.
 */
export function RumusInput({
  name,
  defaultValue = "",
  value,
  onValueChange,
  multiline = true,
  rows = 4,
  label,
  ...attr
}: {
  name: string;
  defaultValue?: string;
  value?: string;
  onValueChange?: (value: string) => void;
  multiline?: boolean;
  rows?: number;
  /** Names the field in the formula button's spoken label, for rows of similar fields. */
  label?: string;
  id?: string;
  "aria-label"?: string;
  "aria-invalid"?: boolean;
  "aria-describedby"?: string;
}) {
  const [sendiri, setSendiri] = React.useState(defaultValue);
  const teks = value ?? sendiri;
  const ref = React.useRef<HTMLTextAreaElement & HTMLInputElement>(null);
  const [kursor, setKursor] = React.useState<[number, number]>([teks.length, teks.length]);
  const [buka, setBuka] = React.useState(false);

  const ganti = (v: string) => {
    setSendiri(v);
    onValueChange?.(v);
  };
  const ingat = (e: React.SyntheticEvent<HTMLTextAreaElement | HTMLInputElement>) =>
    setKursor([e.currentTarget.selectionStart ?? 0, e.currentTarget.selectionEnd ?? 0]);
  const sasaran = pecahRumus(teks).find((p) => p.rumus && kursor[0] > p.mulai && kursor[1] < p.akhir) ?? null;

  const simpan = (latex: string) => {
    const [a, b] = sasaran ? [sasaran.mulai, sasaran.akhir] : kursor;
    const sisip = latex.trim() ? `$${latex.trim()}$` : "";
    ganti(teks.slice(0, a) + sisip + teks.slice(b));
    const pos = a + sisip.length;
    setKursor([pos, pos]);
    requestAnimationFrame(() => {
      ref.current?.focus();
      ref.current?.setSelectionRange(pos, pos);
    });
  };

  const umum = {
    ref,
    name,
    value: teks,
    onChange: (e: React.ChangeEvent<HTMLTextAreaElement | HTMLInputElement>) => {
      ganti(e.target.value);
      ingat(e);
    },
    onSelect: ingat,
    onKeyUp: ingat,
    onClick: ingat,
    ...attr,
  };
  const judulTombol = sasaran ? "Ubah rumus" : "Sisipkan rumus";

  return (
    <div className="grid min-w-0 flex-1 gap-1.5">
      <div className={cn("flex gap-2", multiline ? "flex-col" : "items-center")}>
        {multiline ? <Textarea rows={rows} {...umum} /> : <Input {...umum} />}
        {multiline ? (
          <Button type="button" variant="outline" size="sm" className="w-fit" onClick={() => setBuka(true)}>
            <FunctionIcon />
            {judulTombol}
          </Button>
        ) : (
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label={label ? `${judulTombol} di ${label}` : judulTombol}
            title={judulTombol}
            onClick={() => setBuka(true)}
          >
            <FunctionIcon />
          </Button>
        )}
      </div>
      {adaRumus(teks) ? (
        <div className="rounded-md border border-dashed bg-muted/40 px-3 py-2" aria-live="polite">
          <span className="sr-only">Pratinjau: </span>
          <span className="whitespace-pre-wrap break-words">
            <TeksRumus teks={teks} />
          </span>
        </div>
      ) : null}
      <RumusDialog open={buka} onOpenChange={setBuka} awal={sasaran?.isi ?? ""} ubah={!!sasaran} onSimpan={simpan} />
    </div>
  );
}
