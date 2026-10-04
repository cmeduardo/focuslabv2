"use client";

import { Printer } from "lucide-react";

import { Button } from "@/components/ui/button";

// El PDF se genera con el diálogo de impresión del navegador ("Guardar como
// PDF"): sin dependencias de servidor y con el mismo diseño que la página.
export function PrintButton() {
  return (
    <Button className="h-10 gap-1.5" onClick={() => window.print()}>
      <Printer className="size-4" />
      Descargar PDF
    </Button>
  );
}
