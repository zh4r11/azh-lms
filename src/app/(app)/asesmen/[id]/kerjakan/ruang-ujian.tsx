"use client";

import * as React from "react";
import { CaretLeftIcon, CaretRightIcon, FlagIcon } from "@phosphor-icons/react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { ActionResult } from "@/lib/action-result";
import { TeksRumus } from "@/components/teks-rumus";

type Soal = {
  id: number;
  tipe: "PG" | "ESSAY";
  pertanyaan: string;
  opsi: string[];
  bobot: number;
  pilihan: number | null;
  teks: string;
  ragu: boolean;
};
type Perubahan = { pilihan?: number | null; teks?: string | null; ragu?: boolean };

const HURUF = "ABCDEF";

function terjawab(s: Soal) {
  return s.tipe === "PG" ? s.pilihan !== null : s.teks.trim() !== "";
}

function jamMenit(ms: number) {
  const t = Math.max(0, Math.floor(ms / 1000));
  const j = Math.floor(t / 3600);
  const m = Math.floor((t % 3600) / 60);
  const d = t % 60;
  const dua = (n: number) => String(n).padStart(2, "0");
  return j ? `${j}:${dua(m)}:${dua(d)}` : `${dua(m)}:${dua(d)}`;
}

/**
 * The exam screen: one question at a time, a number map with answered and "ragu-ragu" marks,
 * a countdown from the server's deadline, and every change saved as it happens.
 */
export function RuangUjian({
  judul,
  sub,
  batas,
  serverNow,
  soal: awal,
  simpan,
  kumpulkan,
}: {
  judul: string;
  sub: string;
  batas: string;
  serverNow: string;
  soal: Soal[];
  simpan: (soalId: number, j: Perubahan) => Promise<ActionResult>;
  kumpulkan: () => Promise<ActionResult>;
}) {
  const [soal, setSoal] = React.useState(awal);
  const [aktif, setAktif] = React.useState(() => Math.max(0, awal.findIndex((s) => !terjawab(s))));
  const [menyimpan, setMenyimpan] = React.useState(0);
  const [galat, setGalat] = React.useState<string | null>(null);
  const [konfirmasi, setKonfirmasi] = React.useState(false);
  const [mengumpulkan, startKumpul] = React.useTransition();
  const [peta, setPeta] = React.useState(false);

  const akhir = new Date(batas).getTime();
  // First paint uses the server clock only, so server and browser render the same text.
  const [sisa, setSisa] = React.useState(() => akhir - new Date(serverNow).getTime());
  const [pengumuman, setPengumuman] = React.useState("");

  const kirim = React.useCallback(
    async (soalId: number, j: Perubahan) => {
      setMenyimpan((n) => n + 1);
      try {
        const res = await simpan(soalId, j);
        if (res && !res.ok) setGalat(res.error);
        else setGalat(null);
      } catch {
        setGalat("Koneksi terputus. Jawaban terakhir belum tersimpan; ulangi pilihan Anda.");
      } finally {
        setMenyimpan((n) => n - 1);
      }
    },
    [simpan],
  );

  const selesai = React.useCallback(() => {
    startKumpul(async () => {
      await kumpulkan();
    });
  }, [kumpulkan]);

  React.useEffect(() => {
    // Count down against the server clock, so a wrong device clock cannot add time.
    const selisih = new Date(serverNow).getTime() - Date.now();
    const t = setInterval(() => {
      const s = akhir - (Date.now() + selisih);
      setSisa(s);
      if (s <= 5 * 60_000 && s > 5 * 60_000 - 1000) setPengumuman("Sisa waktu 5 menit.");
      if (s <= 60_000 && s > 59_000) setPengumuman("Sisa waktu 1 menit.");
      if (s <= 0) {
        clearInterval(t);
        setPengumuman("Waktu habis. Jawaban dikumpulkan.");
        selesai();
      }
    }, 1000);
    return () => clearInterval(t);
  }, [akhir, serverNow, selesai]);

  // Essays save a moment after typing stops, and immediately when leaving the question.
  const tundaEssay = React.useRef<{ id: number; teks: string; t: ReturnType<typeof setTimeout> } | null>(null);
  const kirimEssaySekarang = React.useCallback(() => {
    const t = tundaEssay.current;
    if (!t) return;
    clearTimeout(t.t);
    tundaEssay.current = null;
    void kirim(t.id, { teks: t.teks });
  }, [kirim]);

  function ubah(id: number, j: Perubahan, segera = true) {
    setSoal((xs) =>
      xs.map((s) =>
        s.id === id
          ? { ...s, ...(j.pilihan !== undefined ? { pilihan: j.pilihan } : {}), ...(j.teks !== undefined ? { teks: j.teks ?? "" } : {}), ...(j.ragu !== undefined ? { ragu: j.ragu } : {}) }
          : s,
      ),
    );
    if (segera) void kirim(id, j);
  }

  function pindah(i: number) {
    kirimEssaySekarang();
    setAktif(Math.min(soal.length - 1, Math.max(0, i)));
    setPeta(false);
    document.getElementById("soal-aktif")?.focus();
  }

  const s = soal[aktif];
  const jumlahJawab = soal.filter(terjawab).length;
  const jumlahRagu = soal.filter((x) => x.ragu).length;
  const kritis = sisa <= 5 * 60_000;

  return (
    <div className="flex flex-col gap-6">
      {/* Sits right under the app header (h-15 on phones, h-13 from md) so the timer stays in view. */}
      <div className="sticky top-15 z-20 -mx-4 -mt-8 flex flex-wrap items-center justify-between gap-3 border-b bg-background px-4 py-3 sm:-mx-6 sm:px-6 md:top-13 lg:-mx-10 lg:-mt-10 lg:px-10">
        <div className="min-w-0">
          <p className="truncate font-semibold">{judul}</p>
          <p className="text-sm text-muted-foreground">
            {sub} ·{" "}
            <span aria-live="polite">
              {galat ? (
                <span className="font-semibold text-destructive">{galat}</span>
              ) : menyimpan ? (
                "Menyimpan…"
              ) : (
                "Semua jawaban tersimpan"
              )}
            </span>
          </p>
        </div>
        <div
          role="timer"
          aria-label="Sisa waktu"
          className={cn(
            "tabular rounded-md border px-3 py-1.5 text-xl font-semibold",
            kritis ? "border-destructive text-destructive" : "bg-card",
          )}
        >
          {jamMenit(sisa)}
        </div>
        <p className="sr-only" aria-live="assertive">
          {pengumuman}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_17rem]">
        <section aria-labelledby="judul-soal" className="min-w-0">
          <div id="soal-aktif" tabIndex={-1} className="rounded-lg border bg-card p-5 outline-none sm:p-8">
            <h2 id="judul-soal" className="mb-4 flex items-baseline justify-between gap-4">
              <span className="text-lg font-semibold">
                Soal {aktif + 1} <span className="text-base font-normal text-muted-foreground">dari {soal.length}</span>
              </span>
              <span className="text-sm text-muted-foreground">
                {s.tipe === "PG" ? "Pilihan ganda" : "Essay"} · bobot {s.bobot}
              </span>
            </h2>
            <p className="mb-6 text-lg leading-relaxed whitespace-pre-wrap text-pretty"><TeksRumus teks={s.pertanyaan} /></p>

            {s.tipe === "PG" ? (
              <fieldset>
                <legend className="sr-only">Pilih jawaban soal {aktif + 1}</legend>
                <div className="grid gap-3">
                  {s.opsi.map((o, i) => (
                    <label
                      key={`${s.id}-${i}`}
                      className="flex min-h-14 cursor-pointer items-center gap-4 rounded-lg border bg-background p-3 hover:bg-muted has-checked:border-primary has-checked:bg-primary has-checked:text-primary-foreground has-focus-visible:ring-3 has-focus-visible:ring-ring/50"
                    >
                      <input
                        type="radio"
                        name={`soal-${s.id}`}
                        checked={s.pilihan === i}
                        onChange={() => ubah(s.id, { pilihan: i })}
                        className="sr-only"
                      />
                      <span aria-hidden className="flex size-9 shrink-0 items-center justify-center rounded-full border border-current font-semibold">
                        {HURUF[i]}
                      </span>
                      <span className="min-w-0 break-words"><TeksRumus teks={o} /></span>
                    </label>
                  ))}
                </div>
              </fieldset>
            ) : (
              <div className="grid gap-1.5">
                <label htmlFor={`essay-${s.id}`} className="text-sm font-medium">
                  Jawaban Anda
                </label>
                <Textarea
                  key={s.id}
                  id={`essay-${s.id}`}
                  rows={10}
                  defaultValue={s.teks}
                  onChange={(e) => {
                    const teks = e.target.value;
                    ubah(s.id, { teks }, false);
                    if (tundaEssay.current) clearTimeout(tundaEssay.current.t);
                    tundaEssay.current = { id: s.id, teks, t: setTimeout(kirimEssaySekarang, 1000) };
                  }}
                  onBlur={kirimEssaySekarang}
                />
              </div>
            )}
          </div>

          <div className="mt-4 grid grid-cols-[auto_1fr_auto] items-center gap-3">
            <Button variant="outline" onClick={() => pindah(aktif - 1)} disabled={aktif === 0} aria-label="Soal sebelumnya">
              <CaretLeftIcon />
              <span className="hidden sm:inline">Sebelumnya</span>
            </Button>
            <label
              className={cn(
                "mx-auto inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-md border px-3 font-semibold has-focus-visible:ring-3 has-focus-visible:ring-ring/50",
                s.ragu ? "border-highlight bg-highlight text-foreground" : "bg-background",
              )}
            >
              <input type="checkbox" checked={s.ragu} onChange={(e) => ubah(s.id, { ragu: e.target.checked })} className="sr-only" />
              <FlagIcon aria-hidden weight={s.ragu ? "fill" : "regular"} />
              Ragu-ragu
            </label>
            {aktif < soal.length - 1 ? (
              <Button onClick={() => pindah(aktif + 1)} aria-label="Soal berikutnya">
                <span className="hidden sm:inline">Berikutnya</span>
                <CaretRightIcon />
              </Button>
            ) : (
              <Button onClick={() => (kirimEssaySekarang(), setKonfirmasi(true))}>Selesai</Button>
            )}
          </div>
        </section>

        <aside aria-labelledby="judul-peta" className="lg:sticky lg:top-24 lg:self-start">
          <div className="flex items-center justify-between lg:block">
            <h2 id="judul-peta" className="font-semibold lg:mb-3">
              Nomor soal
              <span className="ml-2 text-sm font-normal text-muted-foreground">
                {jumlahJawab}/{soal.length} dijawab
              </span>
            </h2>
            <Button variant="outline" size="sm" className="lg:hidden" aria-expanded={peta} aria-controls="peta-soal" onClick={() => setPeta((v) => !v)}>
              {peta ? "Tutup" : "Lihat semua"}
            </Button>
          </div>
          <div id="peta-soal" className={cn("mt-3 lg:mt-0 lg:block", peta ? "block" : "hidden")}>
            <ol className="grid grid-cols-6 gap-2 sm:grid-cols-10 lg:grid-cols-5">
              {soal.map((x, i) => (
                <li key={x.id}>
                  <button
                    type="button"
                    onClick={() => pindah(i)}
                    aria-current={i === aktif ? "step" : undefined}
                    aria-label={`Soal ${i + 1}${terjawab(x) ? ", sudah dijawab" : ", belum dijawab"}${x.ragu ? ", ragu-ragu" : ""}`}
                    className={cn(
                      "tabular flex size-11 items-center justify-center rounded-md border text-sm font-semibold outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                      x.ragu ? "border-highlight bg-highlight text-foreground" : terjawab(x) ? "border-primary bg-primary text-primary-foreground" : "bg-background hover:bg-muted",
                      i === aktif && "ring-2 ring-foreground ring-offset-2 ring-offset-background",
                    )}
                  >
                    {i + 1}
                  </button>
                </li>
              ))}
            </ol>
            <ul className="mt-4 grid gap-1 text-sm text-muted-foreground">
              <li className="flex items-center gap-2">
                <span aria-hidden className="size-3 rounded-sm bg-primary" /> Sudah dijawab
              </li>
              <li className="flex items-center gap-2">
                <span aria-hidden className="size-3 rounded-sm bg-highlight" /> Ragu-ragu
              </li>
              <li className="flex items-center gap-2">
                <span aria-hidden className="size-3 rounded-sm border" /> Belum dijawab
              </li>
            </ul>
            <Button variant="outline" className="mt-6 w-full" onClick={() => (kirimEssaySekarang(), setKonfirmasi(true))}>
              Selesai dan kumpulkan
            </Button>
          </div>
        </aside>
      </div>

      <AlertDialog open={konfirmasi} onOpenChange={setKonfirmasi}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Kumpulkan jawaban sekarang?</AlertDialogTitle>
            <AlertDialogDescription>
              {jumlahJawab} dari {soal.length} soal dijawab
              {soal.length - jumlahJawab ? `, ${soal.length - jumlahJawab} belum dijawab` : ""}
              {jumlahRagu ? `, ${jumlahRagu} masih ditandai ragu-ragu` : ""}. Setelah dikumpulkan, jawaban tidak bisa diubah.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Periksa lagi</AlertDialogCancel>
            <AlertDialogAction
              disabled={mengumpulkan || menyimpan > 0}
              onClick={(e) => {
                e.preventDefault();
                selesai();
              }}
            >
              {mengumpulkan ? "Mengumpulkan…" : menyimpan ? "Menunggu simpan…" : "Ya, kumpulkan"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
