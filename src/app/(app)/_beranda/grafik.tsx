"use client";

import * as React from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

/**
 * Charts for the dashboards. One hue (the chalkboard green, --chart-1) on a quiet track: every
 * chart here measures one thing, so colour carries magnitude only and labels carry identity.
 */

export type Batang = {
  key: string | number;
  label: string;
  /** Position on the 0..maks scale; null draws an empty track ("belum ada data"). */
  nilai: number | null;
  tampil: string;
  rincian?: string[];
  href?: string;
};

/** Horizontal bars with the value written at the end, a hover/focus card for the breakdown. */
export function DaftarBatang({
  judul,
  rows,
  maks = 100,
  garis,
}: {
  judul: string;
  rows: Batang[];
  maks?: number;
  /** A reference line such as the passing grade, drawn across every track. */
  garis?: { nilai: number; label: string };
}) {
  const [aktif, setAktif] = React.useState<Batang["key"] | null>(null);
  return (
    <div>
      <ul className="grid gap-1" aria-label={judul}>
        {rows.map((r) => {
          const lebar = r.nilai === null ? 0 : Math.max(0, Math.min(100, (r.nilai / maks) * 100));
          const isi = (
            <>
              <span className="truncate text-sm">{r.label}</span>
              <span className="relative h-2.5 rounded-sm bg-muted" aria-hidden>
                <span
                  className="absolute inset-y-0 left-0 rounded-r-[4px] bg-chart-1 transition-[filter] group-hover:brightness-110"
                  style={{ width: `${lebar}%` }}
                />
                {garis ? (
                  <span
                    className="absolute -inset-y-1 w-px bg-foreground/50"
                    style={{ left: `${(garis.nilai / maks) * 100}%` }}
                  />
                ) : null}
              </span>
              <span className="tabular text-right text-sm font-semibold">{r.tampil}</span>
            </>
          );
          const kelas =
            "group grid min-h-11 grid-cols-[minmax(0,7rem)_minmax(0,1fr)_3.5rem] items-center gap-3 rounded-md px-2 outline-none hover:bg-muted/60 focus-visible:ring-3 focus-visible:ring-ring/50 sm:grid-cols-[minmax(0,9rem)_minmax(0,1fr)_4rem] md:min-h-9";
          const props = {
            onPointerEnter: () => setAktif(r.key),
            onPointerLeave: () => setAktif((k) => (k === r.key ? null : k)),
            onFocus: () => setAktif(r.key),
            onBlur: () => setAktif((k) => (k === r.key ? null : k)),
            "aria-label": `${r.label}: ${r.tampil}${r.rincian?.length ? `. ${r.rincian.join(", ")}` : ""}`,
          };
          return (
            <li key={r.key} className="relative">
              {r.href ? (
                <Link href={r.href} className={kelas} {...props}>
                  {isi}
                </Link>
              ) : (
                <div tabIndex={r.rincian?.length ? 0 : undefined} className={kelas} {...props}>
                  {isi}
                </div>
              )}
              {aktif === r.key && r.rincian?.length ? (
                <div
                  aria-hidden
                  className="pointer-events-none absolute bottom-full left-1/3 z-10 mb-1 min-w-44 rounded-md border bg-popover px-3 py-2 text-sm text-popover-foreground shadow-md"
                >
                  <p className="font-semibold">{r.tampil}</p>
                  <p className="mb-1 text-muted-foreground">{r.label}</p>
                  {r.rincian.map((x) => (
                    <p key={x} className="tabular">
                      {x}
                    </p>
                  ))}
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>
      {garis ? (
        <p className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
          <span aria-hidden className="inline-block h-3 w-px bg-foreground/50" />
          {garis.label}
        </p>
      ) : null}
    </div>
  );
}

export type Titik = { label: string; labelPanjang: string; nilai: number | null; rincian: string[] };

/**
 * A line over time with a crosshair that snaps to the nearest point. Arrow keys move the same
 * crosshair, and a hidden table carries every value for screen readers.
 */
export function GrafikTren({ judul, titik, satuan = "%" }: { judul: string; titik: Titik[]; satuan?: string }) {
  const wadah = React.useRef<HTMLDivElement>(null);
  const [lebar, setLebar] = React.useState(0);
  const [aktif, setAktif] = React.useState<number | null>(null);

  React.useEffect(() => {
    const el = wadah.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setLebar(e.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const tinggi = 180;
  const pad = { kiri: 36, kanan: 12, atas: 12, bawah: 26 };
  const nilai = titik.map((t) => t.nilai).filter((n): n is number => n !== null);
  // Attendance sits in the 80s and 90s; starting the scale at 0 would flatten every change.
  const yMin = nilai.length ? Math.max(0, Math.floor((Math.min(...nilai) - 5) / 10) * 10) : 0;
  const yMax = 100;
  const w = Math.max(lebar - pad.kiri - pad.kanan, 1);
  const h = tinggi - pad.atas - pad.bawah;
  const x = (i: number) => pad.kiri + (titik.length > 1 ? (i / (titik.length - 1)) * w : w / 2);
  const y = (v: number) => pad.atas + (1 - (v - yMin) / (yMax - yMin)) * h;
  const garisY = [yMin, (yMin + yMax) / 2, yMax];

  const jalur = titik
    .map((t, i) => (t.nilai === null ? null : `${x(i).toFixed(1)},${y(t.nilai).toFixed(1)}`))
    .filter(Boolean)
    .join(" ");
  // Label every point when they fit, otherwise every other one.
  const loncat = lebar && titik.length * 56 > w ? 2 : 1;

  const terdekat = (clientX: number) => {
    const kotak = wadah.current?.getBoundingClientRect();
    if (!kotak || !titik.length) return null;
    const px = clientX - kotak.left;
    let best = 0;
    for (let i = 1; i < titik.length; i++) if (Math.abs(x(i) - px) < Math.abs(x(best) - px)) best = i;
    return best;
  };
  const t = aktif !== null ? titik[aktif] : null;

  return (
    <div>
      <div
        ref={wadah}
        role="group"
        aria-roledescription="grafik"
        aria-label={`${judul}. Gunakan panah kiri dan kanan untuk membaca tiap titik.`}
        tabIndex={0}
        className="relative rounded-md outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        style={{ height: tinggi }}
        onPointerMove={(e) => setAktif(terdekat(e.clientX))}
        onPointerLeave={() => setAktif(null)}
        onBlur={() => setAktif(null)}
        onKeyDown={(e) => {
          if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
          e.preventDefault();
          setAktif((a) => {
            const awal = a ?? (e.key === "ArrowLeft" ? titik.length : -1);
            return Math.max(0, Math.min(titik.length - 1, awal + (e.key === "ArrowRight" ? 1 : -1)));
          });
        }}
      >
        {lebar ? (
          <svg width={lebar} height={tinggi} aria-hidden className="block overflow-visible">
            {garisY.map((g) => (
              <g key={g}>
                <line x1={pad.kiri} x2={pad.kiri + w} y1={y(g)} y2={y(g)} className="stroke-border" strokeDasharray="2 4" />
                <text x={pad.kiri - 6} y={y(g)} dy="0.32em" textAnchor="end" className="fill-muted-foreground text-[11px]">
                  {g}
                  {satuan}
                </text>
              </g>
            ))}
            {titik.map((p, i) =>
              // The last label always shows, so the one just before it gives way when they would touch.
              i === titik.length - 1 || (i % loncat === 0 && titik.length - 1 - i >= loncat) ? (
                <text
                  key={i}
                  x={x(i)}
                  y={tinggi - 6}
                  textAnchor={titik.length > 1 && i === titik.length - 1 ? "end" : i === 0 && titik.length > 1 ? "start" : "middle"}
                  className="fill-muted-foreground text-[11px]"
                >
                  {p.label}
                </text>
              ) : null,
            )}
            {aktif !== null ? (
              <line x1={x(aktif)} x2={x(aktif)} y1={pad.atas} y2={pad.atas + h} className="stroke-foreground/40" />
            ) : null}
            <polyline points={jalur} fill="none" strokeWidth={2} strokeLinejoin="round" className="stroke-chart-1" />
            {titik.map((p, i) =>
              p.nilai === null ? null : (
                <circle
                  key={i}
                  cx={x(i)}
                  cy={y(p.nilai)}
                  r={aktif === i ? 5 : 4}
                  strokeWidth={2}
                  className={cn("stroke-card", aktif === i ? "fill-foreground" : "fill-chart-1")}
                />
              ),
            )}
          </svg>
        ) : null}
        {t && aktif !== null ? (
          <div
            className="pointer-events-none absolute top-0 z-10 min-w-40 rounded-md border bg-popover px-3 py-2 text-sm text-popover-foreground shadow-md"
            style={x(aktif) > lebar / 2 ? { right: lebar - x(aktif) + 10 } : { left: x(aktif) + 10 }}
            aria-live="polite"
          >
            <p className="font-semibold tabular">{t.nilai === null ? "Belum ada data" : `${t.nilai.toFixed(1).replace(".", ",")}${satuan}`}</p>
            <p className="mb-1 text-muted-foreground">{t.labelPanjang}</p>
            {t.rincian.map((r) => (
              <p key={r} className="tabular">
                {r}
              </p>
            ))}
          </div>
        ) : null}
      </div>
      <table className="sr-only">
        <caption>{judul}</caption>
        <tbody>
          {titik.map((p) => (
            <tr key={p.labelPanjang}>
              <th scope="row">{p.labelPanjang}</th>
              <td>{p.nilai === null ? "Belum ada data" : `${p.nilai.toFixed(1)}${satuan}`}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
