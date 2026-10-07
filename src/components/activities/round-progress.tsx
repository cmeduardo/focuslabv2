"use client";

import { useEffect } from "react";

import { playMilestone } from "@/lib/audio/beep";

const MILESTONES = [
  { at: 0.5, text: "¡Vas a la mitad!" },
  { at: 0.8, text: "¡Último tramo!" },
] as const;

// Solo rondas largas: en la práctica (3-6 ensayos) los hitos estorban.
const MIN_TRIALS_FOR_MILESTONES = 8;

// Hito vigente: se muestra durante unos pocos ensayos tras cruzarlo. Se
// deriva de `current` (sin estado propio) para no depender de efectos.
function activeMilestone(current: number, total: number) {
  if (total < MIN_TRIALS_FOR_MILESTONES) return null;
  const span = Math.max(1, Math.round(total * 0.04));
  return (
    MILESTONES.find((m) => {
      const from = Math.ceil(m.at * total);
      return current >= from && current < from + span;
    }) ?? null
  );
}

// Avance de la ronda: barra + "n de N" + hitos de ánimo. No revela
// aciertos ni errores.
export function RoundProgress({
  current,
  total,
  label,
  milestones = true,
}: {
  current: number;
  total: number;
  label?: string;
  milestones?: boolean;
}) {
  const pct = total > 0 ? Math.min(100, (current / total) * 100) : 0;
  const milestone = milestones ? activeMilestone(current, total) : null;

  useEffect(() => {
    if (milestone) playMilestone();
  }, [milestone]);

  return (
    <div className="w-full max-w-xs">
      <div className="h-1.5 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary transition-[width] duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>
      {/* El hito reemplaza por un momento al "n de N": misma línea, sin
          mover el resto de la pantalla. */}
      {milestone ? (
        <p
          key={milestone.text}
          data-testid="round-milestone"
          role="status"
          className="mt-1 animate-pop text-center text-xs font-semibold text-primary"
        >
          {milestone.text}
        </p>
      ) : (
        <p className="mt-1 text-center text-xs text-muted-foreground">
          {label ?? `${Math.min(current + 1, total)} de ${total}`}
        </p>
      )}
    </div>
  );
}
