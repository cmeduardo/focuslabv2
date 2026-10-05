"use client";

import { useCallback, useEffect, useLayoutEffect, useRef } from "react";

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
 * `trigger: "click"` es para respuestas sin cronometraje fino dentro de
 * zonas con scroll (Deep Read): en pointerdown, empezar a desplazar el
 * texto con el dedo encima de un botón contaba como pulsarlo.
 * `keys` mapea `KeyboardEvent.code` → valor (p. ej. { Space: "go" }).
 */
export function useResponseInput<V extends string>({
  enabled,
  keys,
  onResponse,
  trigger = "pointerdown",
}: {
  enabled: boolean;
  trigger?: "pointerdown" | "click";
  keys: Partial<Record<string, V>>;
  onResponse: (event: ResponseEvent<V>) => void;
}) {
  const handlerRef = useRef(onResponse);
  const keysRef = useRef(keys);
  // Tipo del último pointerdown: en Safari el click de un toque llega con
  // pointerType "mouse", así que sin esto se guardaba como mouse.
  const lastPointerRef = useRef<{ type: string; at: number } | null>(null);
  // useLayoutEffect y no useEffect: el handler nuevo queda listo antes del
  // pintado, así un toque justo después de un cambio de fase no llega al
  // handler de la fase anterior (que lo descartaría).
  useLayoutEffect(() => {
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
    (value: V) => {
      if (trigger === "click") {
        return {
          onPointerDown: (e: React.PointerEvent) => {
            lastPointerRef.current = { type: e.pointerType, at: e.timeStamp };
          },
          onClick: (e: React.MouseEvent) => {
            if (!enabled) return;
            // detail 0 = activado con teclado (Enter/Espacio sobre el botón).
            // Si no, manda el pointerdown que originó el click; el
            // pointerType del click es el respaldo.
            const native = e.nativeEvent as Partial<PointerEvent> & MouseEvent;
            const recent =
              lastPointerRef.current && e.timeStamp - lastPointerRef.current.at < 2000
                ? lastPointerRef.current.type
                : null;
            const pointerType = recent ?? native.pointerType;
            const input: InputType =
              native.detail === 0
                ? "keyboard"
                : pointerType === "touch" || pointerType === "pen"
                  ? "touch"
                  : "mouse";
            handlerRef.current({ value, at: eventTime(e.timeStamp), input });
          },
        };
      }
      return {
        onPointerDown: (e: React.PointerEvent) => {
          if (!enabled) return;
          // Solo el botón principal del mouse. En táctil no se filtra por
          // isPrimary: un toque mientras otro dedo sigue apoyado (p. ej. la
          // palma o el otro pulgar) llega como no primario y es una
          // respuesta real.
          if (e.pointerType === "mouse" && (!e.isPrimary || e.button !== 0)) return;
          handlerRef.current({
            value,
            at: eventTime(e.timeStamp),
            input: e.pointerType === "mouse" ? "mouse" : "touch",
          });
        },
        onContextMenu: (e: React.MouseEvent) => e.preventDefault(),
      };
    },
    [enabled, trigger],
  );

  return { bind };
}
