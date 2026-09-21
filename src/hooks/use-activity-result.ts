"use client";

import { useCallback, useRef, useState } from "react";

import { useEventLogger } from "@/components/tracking/event-tracker-provider";
import { saveActivityResult } from "@/lib/services/activity-results";
import { createClient } from "@/lib/supabase/client";
import type { ActivityType } from "@/lib/types/database";

export type ActivityOutcome = {
  accuracy?: number | null;
  levelReached?: number | null;
  metrics?: Record<string, unknown>;
};

export type ActivityResultData = {
  durationMs: number;
  accuracy: number | null;
  levelReached: number | null;
  metrics: Record<string, unknown>;
};

export type ActivityPhase = "intro" | "playing" | "saving" | "done";

/**
 * Orquesta el ciclo de vida de una actividad cognitiva: temporiza la
 * partida, emite activity_start/activity_end al motor de captura (RF-03) y
 * guarda el resultado estructurado en activity_results (RF-05). Cada juego
 * (*-game.tsx) solo necesita llamar a finish() con su propio resultado.
 *
 * El autorreporte subjetivo (RF: ¿qué tan concentrado se sintió?) NO vive
 * acá — se probó como paso obligatorio después de cada actividad y se
 * sintió repetitivo (feedback directo, 2026-08-28). Ahora es un pulso a
 * nivel de sesión, cada 3 actividades, no bloqueante — ver
 * SessionPulseCheck en /actividades.
 */
export function useActivityResult(activityType: ActivityType) {
  const { sessionId, userId, logEvent } = useEventLogger();
  const startedAtRef = useRef<number | null>(null);
  const [phase, setPhase] = useState<ActivityPhase>("intro");
  const [result, setResult] = useState<ActivityResultData | null>(null);

  const start = useCallback(() => {
    startedAtRef.current = performance.now();
    logEvent("activity_start", { activity_type: activityType });
    setPhase("playing");
  }, [logEvent, activityType]);

  const finish = useCallback(
    async (outcome: ActivityOutcome) => {
      const durationMs = Math.round(
        performance.now() - (startedAtRef.current ?? performance.now()),
      );
      const data: ActivityResultData = {
        durationMs,
        accuracy: outcome.accuracy ?? null,
        levelReached: outcome.levelReached ?? null,
        metrics: outcome.metrics ?? {},
      };

      logEvent("activity_end", {
        activity_type: activityType,
        duration_ms: durationMs,
      });
      setPhase("saving");

      try {
        const supabase = createClient();
        await saveActivityResult(supabase, {
          sessionId,
          userId,
          activityType,
          durationMs: data.durationMs,
          accuracy: data.accuracy,
          levelReached: data.levelReached,
          metrics: data.metrics,
        });
      } catch {
        // El resultado ya se muestra igual; no bloqueamos la experiencia
        // del participante por un fallo de guardado puntual.
      }

      setResult(data);
      setPhase("done");
    },
    [activityType, logEvent, sessionId, userId],
  );

  const reset = useCallback(() => {
    setResult(null);
    setPhase("intro");
  }, []);

  return { phase, result, start, finish, reset };
}
