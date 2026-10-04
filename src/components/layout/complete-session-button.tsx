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
      className="h-10 gap-1.5 sm:h-8"
      disabled={isPending}
      onClick={() => startTransition(() => completeSessionAction(sessionId))}
    >
      <Sparkles className="size-3.5" />
      {isPending ? (
        "Generando…"
      ) : (
        <>
          <span className="sm:hidden">Terminar</span>
          <span className="hidden sm:inline">Terminar sesión</span>
        </>
      )}
    </Button>
  );
}
