"use client";

import { useTransition } from "react";
import { Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { completeSessionAction } from "@/components/layout/complete-session-action";

export function CompleteSessionButton({ sessionId }: { sessionId: string }) {
  const [isPending, startTransition] = useTransition();

  return (
    <Button
      variant="secondary"
      size="sm"
      className="gap-1.5"
      disabled={isPending}
      onClick={() => startTransition(() => completeSessionAction(sessionId))}
    >
      <Sparkles className="size-3.5" />
      {isPending ? "Generando…" : "Terminar sesión"}
    </Button>
  );
}
