"use client";

import * as React from "react";
import { FileArrowUpIcon, XIcon } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";

type Hasil = { id: number; nama: string; ukuran: number };

const TERIMA = {
  dokumen: ".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.jpg,.jpeg,.png,.zip",
  video: ".mp4,.webm,.mov",
};

function ukuran(byte: number) {
  return byte >= 1048576 ? `${(byte / 1048576).toFixed(1).replace(".", ",")} MB` : `${Math.max(1, Math.round(byte / 1024))} KB`;
}

/**
 * Uploads the chosen file straight away (with progress) to /api/unggah and keeps only its id in
 * a hidden input, so the surrounding form stays a small server-action submit. Field passes id
 * and aria props, which land on the file input.
 */
export function Unggah({
  name,
  jenis = "dokumen",
  awal,
  id,
  ...aria
}: {
  name: string;
  jenis?: "dokumen" | "video";
  awal?: { id: number; nama: string } | null;
  id?: string;
  "aria-invalid"?: boolean;
  "aria-describedby"?: string;
}) {
  const [berkas, setBerkas] = React.useState<{ id: number; nama: string; ukuran?: number } | null>(awal ?? null);
  const [persen, setPersen] = React.useState<number | null>(null);
  const [galat, setGalat] = React.useState<string | null>(null);
  const input = React.useRef<HTMLInputElement>(null);

  function gagal(pesan: string) {
    setPersen(null);
    setGalat(pesan);
  }

  function selesai(res: Partial<Hasil> & { error?: string }, ok: boolean) {
    setPersen(null);
    if (ok && res.id) setBerkas({ id: res.id, nama: res.nama!, ukuran: res.ukuran });
    else setGalat(res.error ?? "Gagal mengunggah. Coba lagi.");
  }

  /**
   * Asks for a ticket first. In production that is a signed Supabase Storage URL the file goes to
   * directly; locally the server answers "lokal" and the file body goes to /api/unggah.
   */
  async function unggah(file: File) {
    setGalat(null);
    setPersen(0);
    let siap: { lokal?: boolean; url?: string; mime?: string; tiket?: string; error?: string };
    try {
      const r = await fetch("/api/unggah/tiket", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ nama: file.name, ukuran: file.size, jenis }),
      });
      siap = await r.json();
      if (!r.ok) return gagal(siap.error ?? "Gagal menyiapkan unggahan. Coba lagi.");
    } catch {
      return gagal("Koneksi terputus saat mengunggah. Coba lagi.");
    }

    const xhr = new XMLHttpRequest();
    xhr.upload.onprogress = (e) => e.lengthComputable && setPersen(Math.round((e.loaded / e.total) * 100));
    xhr.onerror = () => gagal("Koneksi terputus saat mengunggah. Coba lagi.");
    if (siap.lokal) {
      xhr.open("POST", "/api/unggah");
      xhr.setRequestHeader("x-nama", encodeURIComponent(file.name));
      xhr.setRequestHeader("x-jenis", jenis);
      xhr.onload = () => selesai(JSON.parse(xhr.responseText || "{}"), xhr.status === 200);
    } else {
      xhr.open("PUT", siap.url!);
      xhr.setRequestHeader("content-type", siap.mime!);
      xhr.setRequestHeader("x-upsert", "false");
      xhr.onload = async () => {
        if (xhr.status < 200 || xhr.status >= 300) return gagal("Penyimpanan menolak berkas ini. Coba lagi.");
        try {
          const r = await fetch("/api/unggah/selesai", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ tiket: siap.tiket }),
          });
          selesai(await r.json(), r.ok);
        } catch {
          gagal("Koneksi terputus saat mengunggah. Coba lagi.");
        }
      };
    }
    xhr.send(file);
  }

  return (
    <div className="grid gap-2">
      <input type="hidden" name={name} value={berkas?.id ?? ""} />
      <input
        ref={input}
        type="file"
        accept={TERIMA[jenis]}
        className="sr-only"
        tabIndex={-1}
        aria-hidden
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) unggah(f);
          e.target.value = "";
        }}
      />
      {berkas ? (
        <div className="flex min-h-11 items-center justify-between gap-3 rounded-md border bg-background px-3 py-2">
          <span className="min-w-0 truncate">
            {berkas.nama}
            {berkas.ukuran ? <span className="text-muted-foreground"> · {ukuran(berkas.ukuran)}</span> : null}
          </span>
          <Button type="button" variant="ghost" size="icon-sm" aria-label={`Lepas ${berkas.nama}`} onClick={() => setBerkas(null)}>
            <XIcon />
          </Button>
        </div>
      ) : persen !== null ? (
        <div className="grid gap-1" role="status">
          <div className="h-2 overflow-hidden rounded-full bg-muted">
            <div className="h-full bg-primary transition-[width]" style={{ width: `${persen}%` }} />
          </div>
          <span className="text-sm text-muted-foreground">Mengunggah {persen}%</span>
        </div>
      ) : (
        // The label from Field points here, so the button is the one keyboard stop.
        <Button
          type="button"
          variant="outline"
          className="justify-start"
          id={id}
          {...aria}
          onClick={() => input.current?.click()}
        >
          <FileArrowUpIcon />
          Pilih {jenis === "video" ? "video" : "berkas"}
        </Button>
      )}
      {galat ? <p className="text-sm text-destructive">{galat}</p> : null}
    </div>
  );
}
