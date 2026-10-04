"use client";

import { useTransition } from "react";

import { Button } from "@/components/ui/button";

import { retryReportAction } from "./retry-report-action";

export function RetryReportButton({ sessionId }: { sessionId: string }) {
  const [pending, startTransition] = useTransition();

  return (
    <Button
      variant="outline"
      size="sm"
      disabled={pending}
      onClick={() => startTransition(() => retryReportAction(sessionId))}
    >
      {pending ? "Reintentando…" : "Reintentar informe"}
    </Button>
  );
}
