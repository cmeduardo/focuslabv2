"use client";

import { useEffect } from "react";
import { toast } from "sonner";

import { useEventLogger } from "@/components/tracking/event-tracker-provider";
import { flushPendingRuns } from "@/lib/services/activity-runs";
import { createClient } from "@/lib/supabase/client";

// Resultados que no se pudieron guardar por falta de conexión quedan en una
// cola local (ver ActivityShell); al volver a /actividades se reintentan.
export function PendingRunsFlusher() {
  const { userId } = useEventLogger();

  useEffect(() => {
    void flushPendingRuns(createClient(), userId).then((saved) => {
      if (saved > 0) {
        toast.success(
          saved === 1
            ? "Guardamos el resultado que estaba pendiente."
            : `Guardamos ${saved} resultados que estaban pendientes.`,
        );
      }
    });
  }, [userId]);

  return null;
}
