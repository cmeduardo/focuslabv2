"use client";

import { useCallback, useEffect, useRef } from "react";

import type { InputType } from "@/lib/activities/types";

export type ResponseEvent<V extends string> = {
  value: V;
  // event.timeStamp: misma base temporal que performance.now().
  at: number;
  input: InputType;
};

// event.timeStamp es de alta resolución en todos los navegadores modernos;
// si algún navegador viejo lo diera en época Unix, cae a performance.now().
function eventTime(timeStamp: number) {
  const now = performance.now();
  return timeStamp > 0 && timeStamp <= now + 1 ? timeStamp : now;
}

/**
 * Entrada unificada para las actividades: Pointer Events (pointerdown, sin
 * el retraso del click en móviles) para mouse y táctil, más teclas
 * asignadas en laptop. Cada respuesta indica qué medio se usó.
 *
 * `bind(value)` devuelve los props para un área de respuesta.
 * `keys` mapea `KeyboardEvent.code` → valor (p. ej. { Space: "go" }).
 */
export function useResponseInput<V extends string>({
  enabled,
  keys,
  onResponse,
}: {
  enabled: boolean;
  keys: Partial<Record<string, V>>;
  onResponse: (event: ResponseEvent<V>) => void;
}) {
  const handlerRef = useRef(onResponse);
  const keysRef = useRef(keys);
  useEffect(() => {
    handlerRef.current = onResponse;
    keysRef.current = keys;
  });

  useEffect(() => {
    if (!enabled) return;
    const onKeyDown = (e: KeyboardEvent) => {
      const value = keysRef.current[e.code];
      if (value === undefined) return;
      // Evita el scroll con la barra espaciadora y las autorepeticiones de
      // tecla mantenida (no son respuestas nuevas).
      e.preventDefault();
      if (e.repeat) return;
      handlerRef.current({ value, at: eventTime(e.timeStamp), input: "keyboard" });
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [enabled]);

  const bind = useCallback(
    (value: V) => ({
      onPointerDown: (e: React.PointerEvent) => {
        if (!enabled || !e.isPrimary) return;
        // Solo el botón principal del mouse.
        if (e.pointerType === "mouse" && e.button !== 0) return;
        handlerRef.current({
          value,
          at: eventTime(e.timeStamp),
          input: e.pointerType === "mouse" ? "mouse" : "touch",
        });
      },
      onContextMenu: (e: React.MouseEvent) => e.preventDefault(),
    }),
    [enabled],
  );

  return { bind };
}
