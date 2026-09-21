"use client";

import { useEffect } from "react";
import { toast } from "sonner";

import { useEventLogger } from "@/components/tracking/event-tracker-provider";
import { createClient } from "@/lib/supabase/client";

// Reemplaza el autorreporte por-actividad (se sintió repetitivo, feedback
// directo 2026-08-28): un pulso liviano a nivel de sesión, cada 3
// actividades completadas — un toast con emojis, no una pantalla que
// bloquea. Vive en /actividades (el momento "entre actividades"), nunca
// interrumpe mientras se está jugando. No renderiza nada visible por sí
// mismo — dispara el toast como efecto secundario.
const MILESTONE_INTERVAL = 3;
const EMOJIS = [
  { value: 1, emoji: "😞", label: "Nada concentrado" },
  { value: 2, emoji: "😕", label: "Poco concentrado" },
  { value: 3, emoji: "😐", label: "Más o menos" },
  { value: 4, emoji: "🙂", label: "Bastante concentrado" },
  { value: 5, emoji: "😄", label: "Muy concentrado" },
];

export function SessionPulseCheck() {
  const { sessionId, userId, logEvent } = useEventLogger();

  useEffect(() => {
    let cancelled = false;

    async function check() {
      const supabase = createClient();
      const { count } = await supabase
        .from("activity_results")
        .select("id", { count: "exact", head: true })
        .eq("session_id", sessionId);
      if (cancelled || !count) return;

      const milestone = Math.floor(count / MILESTONE_INTERVAL);
      if (milestone < 1) return;

      const storageKey = `focuslab-pulse-${sessionId}`;
      const lastShown = Number(sessionStorage.getItem(storageKey) ?? 0);
      if (milestone <= lastShown) return;
      sessionStorage.setItem(storageKey, String(milestone));

      toast.custom(
        (id) => (
          <div className="flex items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3 shadow-lg ring-1 ring-foreground/10">
            <p className="text-sm text-foreground">
              ¿Cómo te sentiste concentrándote hasta ahora?
            </p>
            <div className="flex gap-1">
              {EMOJIS.map((e) => (
                <button
                  key={e.value}
                  type="button"
                  onClick={() => {
                    logEvent("session_pulse", {
                      rating: e.value,
                      completedCount: count,
                      milestone,
                    });
                    toast.dismiss(id);
                  }}
                  aria-label={e.label}
                  className="text-2xl leading-none transition-transform hover:scale-125 active:scale-95"
                >
                  {e.emoji}
                </button>
              ))}
            </div>
          </div>
        ),
        {
          duration: 15_000,
          onAutoClose: () => {
            logEvent("session_pulse", {
              rating: null,
              completedCount: count,
              milestone,
            });
          },
        },
      );
    }

    void check();
    return () => {
      cancelled = true;
    };
  }, [sessionId, userId, logEvent]);

  return null;
}
