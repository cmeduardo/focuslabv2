"use client";

import { useEffect } from "react";

import { useEventLogger } from "@/components/tracking/event-tracker-provider";

/**
 * Emite tool_start/tool_end al motor de captura (RF-06 a RF-09) mientras
 * el participante tiene abierta una herramienta de productividad — igual
 * que activity_start/activity_end en las actividades cognitivas.
 */
export function useToolSession(tool: string) {
  const { logEvent } = useEventLogger();

  useEffect(() => {
    logEvent("tool_start", { tool });
    return () => {
      logEvent("tool_end", { tool });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tool]);
}
