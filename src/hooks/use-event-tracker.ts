"use client";

import { useCallback, useEffect, useRef } from "react";

import { createClient } from "@/lib/supabase/client";
import type { InteractionEventType } from "@/lib/types/database";

const IDLE_THRESHOLD_MS = 60_000;
const FLUSH_INTERVAL_MS = 5_000;
const MAX_QUEUE_SIZE = 20;

type PendingEvent = {
  tipo_evento: InteractionEventType;
  datos: Record<string, unknown>;
  ocurrido_en: string;
};

// RF-03: clics, cambios de pestaña e inactividad, enviados en lote.
export function useEventTracker({
  sessionId,
  userId,
}: {
  sessionId: string;
  userId: string;
}) {
  const queueRef = useRef<PendingEvent[]>([]);
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isIdleRef = useRef(false);

  const flush = useCallback(() => {
    if (queueRef.current.length === 0) return;
    const batch = queueRef.current.splice(0, queueRef.current.length);
    const supabase = createClient();
    void supabase
      .from("eventos_interaccion")
      .insert(
        batch.map((event) => ({
          sesion_id: sessionId,
          perfil_id: userId,
          ...event,
        })),
      )
      .then(({ error }) => {
        if (error) {
          console.error(
            `No se pudieron guardar ${batch.length} eventos de interacción.`,
            error.message,
          );
        }
      });
  }, [sessionId, userId]);

  const logEvent = useCallback(
    (eventType: InteractionEventType, payload: Record<string, unknown> = {}) => {
      queueRef.current.push({
        tipo_evento: eventType,
        datos: payload,
        ocurrido_en: new Date().toISOString(),
      });
      if (queueRef.current.length >= MAX_QUEUE_SIZE) {
        flush();
      }
    },
    [flush],
  );

  useEffect(() => {
    function resetIdleTimer() {
      if (isIdleRef.current) {
        isIdleRef.current = false;
        logEvent("idle_end");
      }
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      idleTimerRef.current = setTimeout(() => {
        isIdleRef.current = true;
        logEvent("idle_start");
      }, IDLE_THRESHOLD_MS);
    }

    function handleClick(event: MouseEvent) {
      const target = event.target as HTMLElement | null;
      logEvent("click", {
        tag: target?.tagName,
        id: target?.id || undefined,
      });
      resetIdleTimer();
    }

    function handleVisibilityChange() {
      logEvent("visibility_change", { state: document.visibilityState });
    }

    function handlePageHide() {
      flush();
    }

    document.addEventListener("click", handleClick);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    document.addEventListener("keydown", resetIdleTimer);
    document.addEventListener("mousemove", resetIdleTimer);
    window.addEventListener("pagehide", handlePageHide);

    resetIdleTimer();
    const flushInterval = setInterval(flush, FLUSH_INTERVAL_MS);

    return () => {
      document.removeEventListener("click", handleClick);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      document.removeEventListener("keydown", resetIdleTimer);
      document.removeEventListener("mousemove", resetIdleTimer);
      window.removeEventListener("pagehide", handlePageHide);
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      clearInterval(flushInterval);
      flush();
    };
  }, [logEvent, flush]);

  return { logEvent };
}
