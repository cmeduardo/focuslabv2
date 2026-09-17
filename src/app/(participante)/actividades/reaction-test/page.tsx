"use client";

import { Zap } from "lucide-react";

import { ActivityIntro } from "@/components/activities/activity-intro";
import { ActivityLayout } from "@/components/activities/activity-layout";
import { ActivityResult } from "@/components/activities/activity-result";
import { ReactionTestGame } from "@/components/activities/reaction-test-game";
import { useActivityResult } from "@/hooks/use-activity-result";

export default function ReactionTestPage() {
  const { phase, result, start, finish, reset } =
    useActivityResult("reaction_test");

  return (
    <ActivityLayout title="Reaction Test" icon={Zap} backHref="/actividades">
      {phase === "intro" && (
        <ActivityIntro
          title="Reaction Test"
          description="Tiempo de reacción y puntería, en una grilla de 9 celdas, durante 90 segundos."
          instructions={[
            "En cada instante aparece un círculo violeta o un cuadrado coral en alguna de las 9 celdas — cambia de lugar y de ritmo cada vez.",
            "Hacé clic justo sobre el círculo violeta apenas lo veas — con cada acierto seguido se achica y vale más puntos.",
            "Si es el cuadrado coral (poco frecuente), no hagas nada — dejalo pasar.",
            "Un clic en la celda equivocada, o sin que haya nada para responder, corta tu racha.",
          ]}
          onStart={start}
        />
      )}
      {phase === "playing" && <ReactionTestGame onFinish={finish} />}
      {(phase === "saving" || phase === "done") && result && (
        <ActivityResult
          saving={phase === "saving"}
          backHref="/actividades"
          onRetry={reset}
          stats={[
            { label: "Puntaje", value: `${Number(result.metrics.score)}` },
            {
              label: "Racha máxima",
              value: `${Number(result.metrics.bestStreak)}`,
            },
            { label: "Precisión", value: `${result.accuracy ?? 0}%` },
            {
              label: "Tiempo promedio",
              value: `${Number(result.metrics.avgReactionMs)} ms`,
            },
            {
              label: "Variabilidad (DE)",
              value: `${Number(result.metrics.reactionRtSD)} ms`,
            },
            {
              label: "Arranques en falso",
              value: `${Number(result.metrics.falseStarts)}`,
            },
            {
              label: "Comisiones",
              value: `${Number(result.metrics.commissions)}`,
            },
          ]}
        />
      )}
    </ActivityLayout>
  );
}
