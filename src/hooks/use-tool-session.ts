"use client";

import { useEffect } from "react";

import { useEventLogger } from "@/components/tracking/event-tracker-provider";

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
