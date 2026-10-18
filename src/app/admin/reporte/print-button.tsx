"use client";

import { Printer } from "lucide-react";

import { Button } from "@/components/ui/button";

export function PrintButton() {
  return (
    <Button className="h-10 gap-1.5" onClick={() => window.print()}>
      <Printer className="size-4" />
      Descargar PDF
    </Button>
  );
}
