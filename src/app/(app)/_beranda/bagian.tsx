import Link from "next/link";
import { cn } from "@/lib/utils";
import { formatNilai, formatTanggal } from "@/lib/labels";
import { PERIODE_LABEL, persen, type Periode, type Rekap, type Rentang } from "./data";
import type { Titik } from "./grafik";

/** One row of period links above everything it scopes. */
export function FilterPeriode({ aktif }: { aktif: Periode }) {
  return (
    <nav aria-label="Periode data" className="flex flex-wrap items-center gap-2">
      <span className="text-sm text-muted-foreground">Periode</span>
      <div className="inline-flex rounded-md border bg-card p-0.5">
        {(Object.keys(PERIODE_LABEL) as Periode[]).map((p) => (
          <Link
            key={p}
            href={p === "30" ? "/" : `/?periode=${p}`}
            scroll={false}
            aria-current={p === aktif ? "page" : undefined}
            className={cn(
              "inline-flex min-h-11 items-center rounded-[5px] px-3 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50 md:min-h-8",
              p === aktif ? "bg-primary font-semibold text-primary-foreground" : "hover:bg-muted",
            )}
          >
            {PERIODE_LABEL[p]}
          </Link>
        ))}
      </div>
    </nav>
  );
}

export function keteranganRentang(r: Rentang) {
  return `${formatTanggal(r.dari)} sampai ${formatTanggal(r.sampai)}`;
}

export type Angka = { label: string; nilai: string; catatan?: React.ReactNode; href?: string };

/** The handful of headline numbers, set as one ruled strip rather than a row of cards. */
export function DeretAngka({ items }: { items: Angka[] }) {
  return (
    <dl className="grid grid-cols-2 border-y sm:grid-cols-4 sm:divide-x">
      {items.map((a, i) => {
        const isi = (
          <>
            <dt className="text-sm text-muted-foreground">{a.label}</dt>
            <dd className="tabular font-heading text-3xl font-semibold">{a.nilai}</dd>
            {a.catatan ? <dd className="text-sm text-muted-foreground">{a.catatan}</dd> : null}
          </>
        );
        return (
          <div
            key={a.label}
            className={cn("py-4 sm:px-5 sm:first:pl-0", i % 2 === 1 && "pl-4 max-sm:border-l", i >= 2 && "max-sm:border-t")}
          >
            {a.href ? (
              <Link href={a.href} className="group block rounded-md outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
                {isi}
              </Link>
            ) : (
              isi
            )}
          </div>
        );
      })}
    </dl>
  );
}

/** Change against the previous period of the same length, in percentage points. */
export function Selisih({ kini, dulu }: { kini: number | null; dulu: number | null }) {
  if (kini === null || dulu === null) return <>Belum bisa dibandingkan</>;
  const d = kini - dulu;
  if (Math.abs(d) < 0.05) return <>Sama dengan periode sebelumnya</>;
  return (
    <>
      {d > 0 ? "Naik" : "Turun"} {formatNilai(Math.abs(d))} poin dari periode sebelumnya
    </>
  );
}

export const formatPersen = (n: number | null) => (n === null ? "–" : `${formatNilai(n)}%`);

export function rincianRekap(r: Rekap) {
  const n = (k: keyof Rekap["per"]) => r.per[k] ?? 0;
  return [
    `Hadir ${n("HADIR")}, terlambat ${n("TERLAMBAT")}`,
    `Izin ${n("IZIN") + n("BERTUGAS_KELUAR")}, sakit ${n("SAKIT")}`,
    `Tanpa keterangan ${n("TANPA_KETERANGAN")}`,
  ];
}

const BULAN = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
const tglPendek = (d: Date) => `${d.getUTCDate()} ${BULAN[d.getUTCMonth()]}`;

/** A week that started before the range is labelled from the range's first day, not its Monday. */
export function titikTren(
  tren: { satuan: "hari" | "pekan"; titik: { tanggal: Date; rekap: Rekap }[] },
  dari: Date,
): Titik[] {
  return tren.titik.map(({ tanggal: senin, rekap }) => {
    const tanggal = senin < dari ? dari : senin;
    return {
      label: tglPendek(tanggal),
      labelPanjang: tren.satuan === "pekan" ? `Pekan mulai ${formatTanggal(tanggal)}` : formatTanggal(tanggal),
      nilai: persen(rekap),
      rincian: rincianRekap(rekap),
    };
  });
}

/** A dashboard panel: a titled block with an optional link out to the full page. */
export function Panel({
  id,
  judul,
  keterangan,
  tautan,
  className,
  children,
}: {
  id: string;
  judul: string;
  keterangan?: React.ReactNode;
  tautan?: { href: string; label: string };
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section aria-labelledby={id} className={cn("min-w-0", className)}>
      <div className="rule-double mb-4 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 id={id} className="text-lg font-semibold">
          {judul}
        </h2>
        {tautan ? (
          <Link
            href={tautan.href}
            className="inline-flex min-h-11 items-center text-sm font-semibold text-primary underline-offset-4 hover:underline md:min-h-0"
          >
            {tautan.label}
          </Link>
        ) : null}
      </div>
      {keterangan ? <p className="-mt-2 mb-4 text-sm text-muted-foreground">{keterangan}</p> : null}
      {children}
    </section>
  );
}

export type Slot = { id: number | string; mulai: string; selesai: string; judul: string; sub: string; href?: string };

/** Today's lessons as a timeline; the one running now is marked. */
export function JadwalHariIni({ slots, kosong }: { slots: Slot[]; kosong: string }) {
  if (!slots.length) return <p className="text-muted-foreground">{kosong}</p>;
  const sekarang = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Makassar", hour: "2-digit", minute: "2-digit" }).format(
    new Date(),
  );
  return (
    <ol className="grid gap-1">
      {slots.map((s) => {
        const berjalan = s.mulai <= sekarang && sekarang < s.selesai;
        const isi = (
          <>
            <span className="tabular text-sm text-muted-foreground">
              {s.mulai}
              <span className="block">{s.selesai}</span>
            </span>
            <span className="min-w-0">
              <span className={cn("block font-semibold", s.href && "group-hover:underline")}>{s.judul}</span>
              <span className="block text-sm text-muted-foreground">
                {s.sub}
                {berjalan ? <span className="ml-2 rounded-sm bg-highlight px-1.5 font-semibold text-foreground">Sedang berlangsung</span> : null}
              </span>
            </span>
          </>
        );
        const kelas = cn(
          "group grid grid-cols-[3rem_minmax(0,1fr)] gap-3 rounded-md border-l-2 py-2 pl-3 outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
          berjalan ? "border-primary" : "border-transparent",
        );
        return (
          <li key={s.id}>
            {s.href ? (
              <Link href={s.href} className={kelas}>
                {isi}
              </Link>
            ) : (
              <div className={kelas}>{isi}</div>
            )}
          </li>
        );
      })}
    </ol>
  );
}
