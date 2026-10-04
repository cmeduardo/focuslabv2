"use client";

import { useEffect } from "react";

// Evita que la pantalla del celular se apague durante una actividad (las
// esperas del Reaction Test pueden llegar a 10 s sin tocar nada). Si la API
// no existe o el navegador la rechaza, sigue sin error. El navegador suelta
// el bloqueo al ocultar la pestaña, así que se vuelve a pedir al regresar.
export function useWakeLock(active: boolean) {
  useEffect(() => {
    if (!active || !("wakeLock" in navigator)) return;
    let sentinel: WakeLockSentinel | null = null;
    let cancelled = false;

    const request = async () => {
      try {
        const s = await navigator.wakeLock.request("screen");
        if (cancelled) void s.release();
        else sentinel = s;
      } catch {
        // Sin permiso o batería baja: se continúa sin bloqueo.
      }
    };

    const onVisibility = () => {
      if (document.visibilityState === "visible") void request();
    };

    void request();
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisibility);
      void sentinel?.release().catch(() => undefined);
    };
  }, [active]);
}
