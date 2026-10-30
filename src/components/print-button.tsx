"use client";

import { PrinterIcon } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";

export function PrintButton({ label = "Cetak rapor" }: { label?: string }) {
  return (
    <Button variant="outline" onClick={() => window.print()} className="print:hidden">
      <PrinterIcon className="size-5" aria-hidden />
      {label}
    </Button>
  );
}
