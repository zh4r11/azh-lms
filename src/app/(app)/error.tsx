"use client";

import { Button } from "@/components/ui/button";

export default function AppError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div role="alert" className="rounded-lg border border-destructive/40 bg-card p-6">
      <h1 className="text-2xl font-semibold">Halaman ini gagal dimuat</h1>
      <p className="mt-2 max-w-xl text-muted-foreground">
        Biasanya karena database lokal belum berjalan. Pastikan <code>npm run db:start</code> masih
        aktif, lalu coba lagi.
      </p>
      <Button className="mt-4" onClick={reset}>
        Coba muat ulang
      </Button>
    </div>
  );
}
