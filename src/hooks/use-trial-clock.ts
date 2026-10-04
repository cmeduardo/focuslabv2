"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";

/**
 * Cronometraje de un ensayo, compartido por todas las actividades:
 *
 * - `stampOnset()` se llama en un useLayoutEffect después de que el
 *   estímulo se commitea al DOM: registra el timestamp del
 *   requestAnimationFrame del frame en que realmente se pinta (no el
 *   momento del setState).
 * - Las respuestas usan `event.timeStamp` (misma base que performance.now
 *   y que el timestamp de rAF), no la hora en que corre el handler.
 * - `claim()` acepta una sola respuesta por ensayo (ignora duplicadas).
 * - Si la pestaña pierde visibilidad durante el ensayo, `wasHidden()`
 *   queda en true y el ensayo se guarda como inválido.
 *
 * Todos los tiempos que devuelve son relativos a `origin` (inicio de la
 * ronda).
 */
export function useTrialClock(origin: number) {
  const onsetRef = useRef<number | null>(null);
  const claimedRef = useRef(false);
  const hiddenRef = useRef(false);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === "hidden") hiddenRef.current = true;
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const begin = useCallback(() => {
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    onsetRef.current = null;
    claimedRef.current = false;
    hiddenRef.current = document.visibilityState === "hidden";
  }, []);

  const stampOnset = useCallback((onStamped?: (onset: number) => void) => {
    rafRef.current = requestAnimationFrame((ts) => {
      rafRef.current = null;
      onsetRef.current = ts;
      onStamped?.(ts);
    });
  }, []);

  const claim = useCallback(() => {
    if (claimedRef.current) return false;
    claimedRef.current = true;
    return true;
  }, []);

  const relative = useCallback(
    (absolute: number | null) =>
      absolute === null ? null : Math.round((absolute - origin) * 100) / 100,
    [origin],
  );

  // Objeto estable: los efectos de las actividades dependen de él.
  return useMemo(
    () => ({
      begin,
      stampOnset,
      claim,
      onset: () => onsetRef.current,
      wasHidden: () => hiddenRef.current,
      relative,
    }),
    [begin, stampOnset, claim, relative],
  );
}
