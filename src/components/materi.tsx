import { FileTextIcon, VideoIcon, YoutubeLogoIcon } from "@phosphor-icons/react/dist/ssr";
import { ConfirmDelete } from "@/components/forms";
import type { ActionResult } from "@/lib/action-result";

export type MateriView = {
  id: number;
  judul: string;
  deskripsi: string;
  tipe: "DOKUMEN" | "VIDEO";
  url: string | null;
  berkas: { id: number; nama: string; ukuran: number; mime: string } | null;
};

function ukuran(byte: number) {
  return byte >= 1048576 ? `${(byte / 1048576).toFixed(1).replace(".", ",")} MB` : `${Math.max(1, Math.round(byte / 1024))} KB`;
}

function youtubeEmbed(url: string) {
  const id = new URL(url).searchParams.get("v");
  return id ? `https://www.youtube-nocookie.com/embed/${id}` : null;
}

/**
 * One piece of material. With `putar`, videos play in place (uploaded file or YouTube); lists
 * that only need an overview leave it off so a page with many videos stays light.
 */
export function MateriItem({
  m,
  putar = false,
  hapus,
}: {
  m: MateriView;
  putar?: boolean;
  hapus?: () => Promise<ActionResult>;
}) {
  const Ikon = m.url ? YoutubeLogoIcon : m.tipe === "VIDEO" ? VideoIcon : FileTextIcon;
  const href = m.berkas ? `/berkas/${m.berkas.id}` : m.url;
  const embed = m.url ? youtubeEmbed(m.url) : null;
  return (
    <li className="grid gap-3 py-4 first:pt-0 last:pb-0">
      <div className="flex items-start gap-3">
        <Ikon aria-hidden className="mt-0.5 size-6 shrink-0 text-primary" />
        <div className="min-w-0 flex-1">
          <p className="font-semibold break-words">{m.judul}</p>
          <p className="text-sm text-muted-foreground">
            {m.url ? "Video YouTube" : m.tipe === "VIDEO" ? "Video" : "Dokumen"}
            {m.berkas ? ` · ${m.berkas.nama} · ${ukuran(m.berkas.ukuran)}` : null}
          </p>
          {m.deskripsi ? <p className="mt-1 text-pretty">{m.deskripsi}</p> : null}
        </div>
        <div className="flex shrink-0 flex-wrap justify-end gap-2">
          {href && !(putar && m.tipe === "VIDEO") ? (
            <a
              href={href}
              target="_blank"
              rel="noreferrer"
              className="inline-flex min-h-11 items-center rounded-md border px-3 text-sm font-semibold outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 md:min-h-8"
            >
              Buka
            </a>
          ) : null}
          {m.berkas ? (
            <a
              href={`/berkas/${m.berkas.id}?unduh`}
              className="inline-flex min-h-11 items-center rounded-md border px-3 text-sm outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 md:min-h-8"
            >
              Unduh
            </a>
          ) : null}
          {hapus ? (
            <ConfirmDelete action={hapus} title={`Hapus materi ${m.judul}?`} description="Siswa tidak bisa membukanya lagi." />
          ) : null}
        </div>
      </div>
      {putar && m.tipe === "VIDEO" ? (
        embed ? (
          <iframe
            src={embed}
            title={m.judul}
            loading="lazy"
            allow="accelerometer; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="aspect-video w-full rounded-md border"
          />
        ) : m.berkas ? (
          <video controls preload="metadata" src={`/berkas/${m.berkas.id}`} className="aspect-video w-full rounded-md border bg-black">
            Peramban Anda tidak bisa memutar video ini. Gunakan tombol Unduh.
          </video>
        ) : null
      ) : null}
    </li>
  );
}

export function MateriList({
  materi,
  putar,
  hapus,
  kosong,
}: {
  materi: MateriView[];
  putar?: boolean;
  hapus?: (id: number) => () => Promise<ActionResult>;
  kosong: string;
}) {
  if (materi.length === 0) return <p className="text-muted-foreground">{kosong}</p>;
  return (
    <ul className="divide-y">
      {materi.map((m) => (
        <MateriItem key={m.id} m={m} putar={putar} hapus={hapus?.(m.id)} />
      ))}
    </ul>
  );
}

export const pilihMateri = {
  id: true,
  judul: true,
  deskripsi: true,
  tipe: true,
  url: true,
  berkas: { select: { id: true, nama: true, ukuran: true, mime: true } },
} as const;
