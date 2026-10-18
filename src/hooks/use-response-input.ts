"use client";

import { useCallback, useEffect, useLayoutEffect, useRef } from "react";

import type { InputType } from "@/lib/activities/types";

export type ResponseEvent<V extends string> = {
  value: V;
  // event.timeStamp: misma base temporal que performance.now().
  at: number;
  input: InputType;
};

// Navegadores viejos dan timeStamp en época Unix: se usa performance.now().
function eventTime(timeStamp: number) {
  const now = performance.now();
  return timeStamp > 0 && timeStamp <= now + 1 ? timeStamp : now;
}

// `trigger: "click"` es para zonas con scroll (Deep Read): con pointerdown, desplazar
// el texto con el dedo sobre un botón contaba como pulsarlo.
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
  // Safari reporta el click de un toque con pointerType "mouse".
  const lastPointerRef = useRef<{ type: string; at: number } | null>(null);
  // useLayoutEffect: el handler nuevo queda listo antes del pintado.
  useLayoutEffect(() => {
    handlerRef.current = onResponse;
    keysRef.current = keys;
  });

  useEffect(() => {
    if (!enabled) return;
    const onKeyDown = (e: KeyboardEvent) => {
      const value = keysRef.current[e.code];
      if (value === undefined) return;
      // Sin scroll con la barra espaciadora ni autorepeticiones.
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
            // detail 0 = activado con teclado.
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
          // En táctil no se filtra por isPrimary: un toque con otro dedo apoyado es una respuesta real.
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
